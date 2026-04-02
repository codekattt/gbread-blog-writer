import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.PORT || 4100);
const WORKER_TOKEN = process.env.CAPTURE_WORKER_TOKEN?.trim() || "";
const YT_DLP_PATH = process.env.YT_DLP_PATH || "yt-dlp";
const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";

class WorkerError extends Error {
  constructor({ message, code, status = 400, hint, details, cause }) {
    super(message);
    this.name = "WorkerError";
    this.code = code;
    this.status = status;
    this.hint = hint;
    this.details = details;
    this.cause = cause;
  }
}

function json(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function formatTimestampLabel(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function sanitizeFilenamePart(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(chunk);
    });

    request.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(
          new WorkerError({
            message: "캡처 요청 JSON을 해석하지 못했습니다.",
            code: "INVALID_CAPTURE_JSON",
            status: 400,
            hint: "올바른 JSON 형식으로 요청해주세요.",
            cause: error,
          }),
        );
      }
    });

    request.on("error", (error) => {
      reject(
        new WorkerError({
          message: "캡처 요청 본문을 읽지 못했습니다.",
          code: "CAPTURE_REQUEST_READ_FAILED",
          status: 400,
          cause: error,
        }),
      );
    });
  });
}

function parseCapturePayload(payload) {
  if (!isObject(payload)) {
    throw new WorkerError({
      message: "캡처 요청 형식이 올바르지 않습니다.",
      code: "INVALID_CAPTURE_REQUEST",
      status: 400,
    });
  }

  const { video, analysis, options } = payload;

  if (!isObject(video)) {
    throw new WorkerError({
      message: "video 정보가 누락되었습니다.",
      code: "CAPTURE_VIDEO_REQUIRED",
      status: 400,
    });
  }

  if (!isNonEmptyString(video.videoId) || video.videoId.trim().length !== 11) {
    throw new WorkerError({
      message: "유효한 videoId가 필요합니다.",
      code: "CAPTURE_VIDEO_ID_INVALID",
      status: 400,
    });
  }

  if (!isNonEmptyString(video.canonicalUrl)) {
    throw new WorkerError({
      message: "유효한 유튜브 링크가 필요합니다.",
      code: "CAPTURE_VIDEO_URL_INVALID",
      status: 400,
    });
  }

  if (!isNonNegativeInteger(video.durationSeconds)) {
    throw new WorkerError({
      message: "영상 길이 정보가 올바르지 않습니다.",
      code: "CAPTURE_DURATION_INVALID",
      status: 400,
    });
  }

  if (!isObject(analysis) || !Array.isArray(analysis.sceneMoments)) {
    throw new WorkerError({
      message: "sceneMoments 정보가 필요합니다.",
      code: "CAPTURE_SCENE_MOMENTS_REQUIRED",
      status: 400,
    });
  }

  const sceneMoments = analysis.sceneMoments.map((moment, index) => {
    if (!isObject(moment)) {
      throw new WorkerError({
        message: `sceneMoments[${index}] 형식이 올바르지 않습니다.`,
        code: "CAPTURE_SCENE_MOMENT_INVALID",
        status: 400,
      });
    }

    if (!isNonEmptyString(moment.label) || !isNonEmptyString(moment.reason) || !isNonNegativeInteger(moment.startSeconds)) {
      throw new WorkerError({
        message: `sceneMoments[${index}] 값이 올바르지 않습니다.`,
        code: "CAPTURE_SCENE_MOMENT_INVALID",
        status: 400,
      });
    }

    return {
      label: moment.label.trim(),
      reason: moment.reason.trim(),
      startSeconds: moment.startSeconds,
    };
  });

  if (sceneMoments.length < 2 || sceneMoments.length > 12) {
    throw new WorkerError({
      message: "sceneMoments는 2개 이상 12개 이하로 전달해주세요.",
      code: "CAPTURE_SCENE_MOMENT_COUNT_INVALID",
      status: 400,
    });
  }

  const count = isObject(options) && isNonNegativeInteger(options.count) ? options.count : 8;
  const avoidIntroOutro = isObject(options) && typeof options.avoidIntroOutro === "boolean" ? options.avoidIntroOutro : true;

  if (count < 4 || count > 12) {
    throw new WorkerError({
      message: "캡처 개수는 4장 이상 12장 이하만 지원합니다.",
      code: "CAPTURE_COUNT_INVALID",
      status: 400,
    });
  }

  return {
    video: {
      videoId: video.videoId.trim(),
      canonicalUrl: video.canonicalUrl.trim(),
      title: isNonEmptyString(video.title) ? video.title.trim() : "유튜브 영상",
      durationSeconds: video.durationSeconds,
    },
    analysis: {
      sceneMoments,
    },
    options: {
      count,
      avoidIntroOutro,
    },
  };
}

function clampSceneMoments({ moments, durationSeconds, count, avoidIntroOutro }) {
  const lowerBound = avoidIntroOutro ? 8 : 0;
  const upperBound = avoidIntroOutro ? Math.max(lowerBound, durationSeconds - 10) : durationSeconds;
  const seen = new Set();

  const deduped = (avoidIntroOutro
    ? moments.filter((moment) => moment.startSeconds >= lowerBound && moment.startSeconds <= upperBound)
    : moments
  )
    .slice()
    .sort((left, right) => left.startSeconds - right.startSeconds)
    .filter((moment) => {
      const bucket = Math.round(moment.startSeconds / 6);

      if (seen.has(bucket)) {
        return false;
      }

      seen.add(bucket);
      return true;
    });

  if (deduped.length >= count) {
    return deduped.slice(0, count);
  }

  const fillerMoments = [];
  const interval = Math.max(8, Math.floor((upperBound - lowerBound) / (count + 1)));

  for (let index = 1; fillerMoments.length + deduped.length < count; index += 1) {
    const timestamp = Math.min(upperBound, lowerBound + interval * index);
    const bucket = Math.round(timestamp / 6);

    if (seen.has(bucket)) {
      continue;
    }

    seen.add(bucket);
    fillerMoments.push({
      label: `추가 캡처 ${fillerMoments.length + 1}`,
      startSeconds: timestamp,
      reason: "장면 다양성을 넓히기 위해 영상 흐름에서 추가로 보강한 대표 시점입니다.",
    });

    if (timestamp >= upperBound) {
      break;
    }
  }

  return [...deduped, ...fillerMoments]
    .slice()
    .sort((left, right) => left.startSeconds - right.startSeconds)
    .slice(0, count);
}

function commandNotFoundHint(command) {
  if (command === YT_DLP_PATH) {
    return "워커 환경에 yt-dlp가 설치되어 있는지 확인해주세요.";
  }

  return "워커 환경에 ffmpeg가 설치되어 있는지 확인해주세요.";
}

function runCommand(command, args, { binaryStdout = false, cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderrChunks.push(chunk);
    });

    child.on("error", (error) => {
      reject(
        new WorkerError({
          message: `${command} 실행에 실패했습니다.`,
          code: command === YT_DLP_PATH ? "YT_DLP_SPAWN_FAILED" : "FFMPEG_SPAWN_FAILED",
          status: 500,
          hint: commandNotFoundHint(command),
          details: `command=${command}`,
          cause: error,
        }),
      );
    });

    child.on("close", (code) => {
      const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();

      if (code !== 0) {
        reject(
          new WorkerError({
            message: `${command} 처리에 실패했습니다.`,
            code: command === YT_DLP_PATH ? "YT_DLP_FAILED" : "FFMPEG_FAILED",
            status: 500,
            hint: command === YT_DLP_PATH ? "영상 다운로드에 실패했습니다. 연령 제한이나 접근 제한 영상일 수 있습니다." : "프레임 추출에 실패했습니다.",
            details: stderr || `exitCode=${code}`,
          }),
        );
        return;
      }

      resolve({
        stdout: binaryStdout ? Buffer.concat(stdoutChunks) : Buffer.concat(stdoutChunks).toString("utf8"),
        stderr,
      });
    });
  });
}

async function downloadVideoToTempFile({ canonicalUrl, tempDir }) {
  const outputTemplate = join(tempDir, "video.%(ext)s");

  await runCommand(YT_DLP_PATH, [
    "--no-playlist",
    "--no-progress",
    "--no-write-thumbnail",
    "--no-write-info-json",
    "--no-write-comments",
    "--merge-output-format",
    "mp4",
    "-f",
    "bv*[height<=1080]+ba/b[height<=1080]/b",
    "-o",
    outputTemplate,
    canonicalUrl,
  ]);

  const entries = await readdir(tempDir);
  const videoFilename = entries.find(
    (entry) => entry.startsWith("video.") && !entry.endsWith(".part") && !entry.endsWith(".ytdl"),
  );

  if (!videoFilename) {
    throw new WorkerError({
      message: "다운로드된 영상 파일을 찾지 못했습니다.",
      code: "DOWNLOADED_VIDEO_MISSING",
      status: 500,
      details: tempDir,
    });
  }

  return join(tempDir, videoFilename);
}

async function extractCaptureFromVideo({
  videoPath,
  targetSeconds,
  durationSeconds,
}) {
  const clipDuration = Math.max(4, Math.min(6, durationSeconds || 6));
  const maxStart = Math.max(0, durationSeconds - clipDuration);
  const clipStart = Math.max(0, Math.min(targetSeconds - 2, maxStart));

  const { stdout } = await runCommand(
    FFMPEG_PATH,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      clipStart.toString(),
      "-t",
      clipDuration.toString(),
      "-i",
      videoPath,
      "-vf",
      "thumbnail=18,scale=1280:-2:force_original_aspect_ratio=decrease",
      "-frames:v",
      "1",
      "-q:v",
      "2",
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "pipe:1",
    ],
    { binaryStdout: true },
  );

  if (!stdout || stdout.length === 0) {
    throw new WorkerError({
      message: "프레임 이미지를 생성하지 못했습니다.",
      code: "CAPTURE_BUFFER_EMPTY",
      status: 500,
    });
  }

  return stdout;
}

async function generateCaptures(payload) {
  const selectedMoments = clampSceneMoments({
    moments: payload.analysis.sceneMoments,
    durationSeconds: payload.video.durationSeconds,
    count: payload.options.count,
    avoidIntroOutro: payload.options.avoidIntroOutro,
  });

  const tempDir = await mkdtemp(join(tmpdir(), "gbread-capture-"));

  try {
    const videoPath = await downloadVideoToTempFile({
      canonicalUrl: payload.video.canonicalUrl,
      tempDir,
    });

    const captures = [];

    for (const [index, moment] of selectedMoments.entries()) {
      const imageBuffer = await extractCaptureFromVideo({
        videoPath,
        targetSeconds: moment.startSeconds,
        durationSeconds: payload.video.durationSeconds,
      });

      const timestampLabel = formatTimestampLabel(moment.startSeconds);
      const safeLabel = sanitizeFilenamePart(moment.label) || `capture-${index + 1}`;

      captures.push({
        id: `${payload.video.videoId}-${index + 1}`,
        label: moment.label,
        reason: moment.reason,
        timestampSeconds: moment.startSeconds,
        timestampLabel,
        filename: `${String(index + 1).padStart(2, "0")}-${timestampLabel.replaceAll(":", "-")}-${safeLabel}.jpg`,
        dataUrl: `data:image/jpeg;base64,${imageBuffer.toString("base64")}`,
      });
    }

    return {
      source: "scene_moments",
      captures,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function toErrorPayload(error, traceId) {
  if (error instanceof WorkerError) {
    return {
      error: error.message,
      source: "youtube_capture",
      code: error.code,
      status: error.status,
      hint: error.hint,
      details: error.details,
      traceId,
    };
  }

  return {
    error: error instanceof Error ? error.message : "캡처 워커에서 알 수 없는 오류가 발생했습니다.",
    source: "youtube_capture",
    code: "CAPTURE_WORKER_FAILED",
    status: 500,
    traceId,
  };
}

function isAuthorized(request) {
  if (!WORKER_TOKEN) {
    return true;
  }

  const header = request.headers.authorization || "";
  return header === `Bearer ${WORKER_TOKEN}`;
}

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    json(response, 200, {
      ok: true,
      service: "gbread-capture-worker",
    });
    return;
  }

  if (request.method === "POST" && request.url === "/captures") {
    if (!isAuthorized(request)) {
      json(response, 401, {
        error: "캡처 워커 인증에 실패했습니다.",
        source: "youtube_capture",
        code: "CAPTURE_WORKER_UNAUTHORIZED",
        hint: "CAPTURE_WORKER_TOKEN 설정을 확인해주세요.",
      });
      return;
    }

    try {
      const rawPayload = await readJsonBody(request);
      const payload = parseCapturePayload(rawPayload);
      const result = await generateCaptures(payload);
      json(response, 200, result);
    } catch (error) {
      const traceId = crypto.randomUUID();

      console.error("[capture-worker]", {
        traceId,
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof WorkerError ? error.code : "CAPTURE_WORKER_FAILED",
        details: error instanceof WorkerError ? error.details : undefined,
      });

      json(response, error instanceof WorkerError ? error.status : 500, toErrorPayload(error, traceId));
    }

    return;
  }

  json(response, 404, {
    error: "지원하지 않는 경로입니다.",
    source: "api",
    code: "NOT_FOUND",
  });
});

server.listen(PORT, () => {
  console.log(`[capture-worker] listening on http://0.0.0.0:${PORT}`);
});
