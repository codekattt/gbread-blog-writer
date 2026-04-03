import { createServer } from "node:http";

import { chromium } from "playwright";

const PORT = Number(process.env.PORT || 4100);
const WORKER_TOKEN = process.env.CAPTURE_WORKER_TOKEN?.trim() || "";
const PLAYWRIGHT_WS_ENDPOINT = process.env.PLAYWRIGHT_WS_ENDPOINT?.trim() || "";
const PLAYWRIGHT_HEADLESS = process.env.PLAYWRIGHT_HEADLESS !== "false";
const PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim() || undefined;
const YOUTUBE_COOKIES_JSON_B64 = process.env.YOUTUBE_COOKIES_JSON_B64?.trim() || "";

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

function decodeInjectedCookies() {
  if (!YOUTUBE_COOKIES_JSON_B64) {
    return [];
  }

  try {
    const decoded = Buffer.from(YOUTUBE_COOKIES_JSON_B64, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);

    if (!Array.isArray(parsed)) {
      throw new Error("cookies payload is not an array");
    }

    return parsed.filter((cookie) => isObject(cookie));
  } catch (error) {
    throw new WorkerError({
      message: "YOUTUBE_COOKIES_JSON_B64 값을 해석하지 못했습니다.",
      code: "INVALID_YOUTUBE_COOKIES",
      status: 500,
      hint: "base64 인코딩된 Playwright cookies JSON 배열인지 확인해주세요.",
      cause: error,
    });
  }
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

    if (
      !isNonEmptyString(moment.label) ||
      !isNonEmptyString(moment.reason) ||
      !isNonNegativeInteger(moment.startSeconds)
    ) {
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
  const avoidIntroOutro =
    isObject(options) && typeof options.avoidIntroOutro === "boolean"
      ? options.avoidIntroOutro
      : true;

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

async function createBrowser() {
  if (PLAYWRIGHT_WS_ENDPOINT) {
    return chromium.connect(PLAYWRIGHT_WS_ENDPOINT, {
      timeout: 30_000,
    });
  }

  return chromium.launch({
    headless: PLAYWRIGHT_HEADLESS,
    executablePath: PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: [
      "--autoplay-policy=no-user-gesture-required",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-setuid-sandbox",
      "--mute-audio",
      "--no-sandbox",
    ],
  });
}

async function clickIfVisible(page, selector) {
  const locator = page.locator(selector).first();
  const count = await locator.count().catch(() => 0);

  if (count === 0) {
    return false;
  }

  const isVisible = await locator.isVisible().catch(() => false);
  if (!isVisible) {
    return false;
  }

  await locator.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(700);
  return true;
}

async function dismissYoutubeInterferences(page) {
  const selectors = [
    'button:has-text("모두 수락")',
    'button:has-text("동의하고 계속")',
    'button:has-text("Accept all")',
    'button:has-text("I agree")',
    'button:has-text("Agree")',
    'button:has-text("나중에")',
    'button:has-text("Not now")',
    'button:has-text("No thanks")',
  ];

  for (const selector of selectors) {
    const clicked = await clickIfVisible(page, selector);
    if (clicked) {
      await page.waitForTimeout(1000);
    }
  }
}

async function waitForVideoReady(page, video) {
  await video.waitFor({
    state: "visible",
    timeout: 12_000,
  });

  await page.waitForFunction(() => {
    const videoElement = document.querySelector("video");
    return Boolean(videoElement && videoElement.readyState >= 2);
  }, {
    timeout: 12_000,
  });
}

async function openYoutubePlaybackPage(page, videoId, canonicalUrl) {
  const candidates = [
    canonicalUrl,
    `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&enablejsapi=1`,
    `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&enablejsapi=1`,
  ];
  const attempts = [];

  for (const candidateUrl of candidates) {
    try {
      await page.goto(candidateUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      await page.waitForTimeout(1500);
      await dismissYoutubeInterferences(page);

      const bodyText = await page.locator("body").innerText().catch(() => "");
      const compactBody = bodyText.replace(/\s+/g, " ").trim().slice(0, 280);

      if (/confirm you.?re not a bot/i.test(bodyText) || /sign in to confirm/i.test(bodyText)) {
        attempts.push(`${candidateUrl} -> bot_check: ${compactBody}`);
        continue;
      }

      if (/video unavailable/i.test(bodyText) || /watch on youtube/i.test(bodyText)) {
        attempts.push(`${candidateUrl} -> unavailable: ${compactBody}`);
        continue;
      }

      const video = page.locator("video.html5-main-video, video").first();
      const count = await video.count().catch(() => 0);

      if (count === 0) {
        attempts.push(`${candidateUrl} -> no_video_tag: ${compactBody}`);
        continue;
      }

      await waitForVideoReady(page, video);
      return { video, sourceUrl: candidateUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const bodyText = await page.locator("body").innerText().catch(() => "");
      const compactBody = bodyText.replace(/\s+/g, " ").trim().slice(0, 280);
      attempts.push(`${candidateUrl} -> ${message}: ${compactBody}`);
    }
  }

  throw new WorkerError({
    message: "브라우저에서 유튜브 video 요소를 찾지 못했습니다.",
    code: "YOUTUBE_VIDEO_ELEMENT_MISSING",
    status: 500,
    hint: "임베드 제한, 봇 확인, 국가 제한 또는 동의 화면 때문에 재생 페이지가 열리지 않았을 수 있습니다.",
    details: attempts.join(" | ").slice(0, 1500),
  });
}

async function createCapturePage(videoId, canonicalUrl) {
  const browser = await createBrowser();
  const context = await browser.newContext({
    viewport: {
      width: 1600,
      height: 900,
    },
    deviceScaleFactor: 2,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    colorScheme: "light",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  });

  const injectedCookies = decodeInjectedCookies();
  if (injectedCookies.length > 0) {
    await context.addCookies(injectedCookies);
  }

  const page = await context.newPage();
  const { video, sourceUrl } = await openYoutubePlaybackPage(page, videoId, canonicalUrl);

  await video.evaluate(async (element) => {
    const videoElement = element;
    videoElement.muted = true;

    try {
      await videoElement.play();
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
    } catch {
      // autoplay can fail on some sessions; seek path below will still try to render the frame.
    }

    videoElement.pause();
  });

  return { browser, context, page, video, sourceUrl };
}

async function seekVideo(page, targetSeconds, durationSeconds) {
  const safeTargetSeconds =
    durationSeconds > 0
      ? Math.max(0, Math.min(targetSeconds, Math.max(durationSeconds - 1, 0)))
      : Math.max(0, targetSeconds);

  await page.locator("video").evaluate(async (element, target) => {
    const videoElement = element;

    await new Promise((resolve, reject) => {
      const cleanup = () => {
        videoElement.removeEventListener("seeked", handleSeeked);
        videoElement.removeEventListener("error", handleError);
        window.clearTimeout(timeoutId);
      };

      const handleSeeked = () => {
        cleanup();
        videoElement.pause();
        resolve();
      };

      const handleError = () => {
        cleanup();
        reject(new Error("video-seek-error"));
      };

      const timeoutId = window.setTimeout(() => {
        cleanup();
        videoElement.pause();
        resolve();
      }, 4000);

      if (Math.abs(videoElement.currentTime - target) < 0.4) {
        cleanup();
        videoElement.pause();
        resolve();
        return;
      }

      videoElement.pause();
      videoElement.addEventListener("seeked", handleSeeked, { once: true });
      videoElement.addEventListener("error", handleError, { once: true });
      videoElement.currentTime = target;
    });
  }, safeTargetSeconds).catch((error) => {
    throw new WorkerError({
      message: "브라우저에서 영상 시점을 이동하지 못했습니다.",
      code: "YOUTUBE_VIDEO_SEEK_FAILED",
      status: 500,
      details: `targetSeconds=${safeTargetSeconds}`,
      cause: error,
    });
  });

  await page.waitForTimeout(700);
}

async function captureVideoFrame(videoLocator) {
  const imageBuffer = await videoLocator.screenshot({
    type: "jpeg",
    quality: 92,
  });

  if (!imageBuffer || imageBuffer.length === 0) {
    throw new WorkerError({
      message: "브라우저 캡처 이미지가 비어 있습니다.",
      code: "BROWSER_CAPTURE_EMPTY",
      status: 500,
    });
  }

  return imageBuffer;
}

async function generateCaptures(payload) {
  const selectedMoments = clampSceneMoments({
    moments: payload.analysis.sceneMoments,
    durationSeconds: payload.video.durationSeconds,
    count: payload.options.count,
    avoidIntroOutro: payload.options.avoidIntroOutro,
  });

  const { browser, context, page, video } = await createCapturePage(
    payload.video.videoId,
    payload.video.canonicalUrl,
  );

  try {
    const captures = [];

    for (const [index, moment] of selectedMoments.entries()) {
      await seekVideo(page, moment.startSeconds, payload.video.durationSeconds);
      const imageBuffer = await captureVideoFrame(video);
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
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
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
    error:
      error instanceof Error ? error.message : "캡처 워커에서 알 수 없는 오류가 발생했습니다.",
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
      mode: PLAYWRIGHT_WS_ENDPOINT ? "remote_browser" : "local_browser",
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

      json(
        response,
        error instanceof WorkerError ? error.status : 500,
        toErrorPayload(error, traceId),
      );
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
