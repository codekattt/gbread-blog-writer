import { spawn } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";

import { AppError } from "@/lib/errors/app-error";

function getFfmpegPath() {
  return process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg";
}

function secondsToLabel(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${paddedMinutes}:${paddedSeconds}`;
  }

  return `${paddedMinutes}:${paddedSeconds}`;
}

export function formatTimestampLabel(totalSeconds: number) {
  return secondsToLabel(totalSeconds);
}

export async function extractThumbnailFromStream({
  streamUrl,
  targetSeconds,
  durationSeconds,
}: {
  streamUrl: string;
  targetSeconds: number;
  durationSeconds: number;
}) {
  const clipDuration = Math.max(4, Math.min(6, durationSeconds || 6));
  const maxStart = Math.max(0, durationSeconds - clipDuration);
  const clipStart = Math.max(0, Math.min(targetSeconds - 2, maxStart));

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    clipStart.toString(),
    "-t",
    clipDuration.toString(),
    "-i",
    streamUrl,
    "-vf",
    "thumbnail=18,scale=1280:-1",
    "-frames:v",
    "1",
    "-q:v",
    "2",
    "-f",
    "image2pipe",
    "-vcodec",
    "mjpeg",
    "pipe:1",
  ];

  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn(getFfmpegPath(), args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const chunks: Buffer[] = [];
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      reject(
        new AppError({
          message: "ffmpeg 실행에 실패했습니다.",
          source: "youtube_capture",
          code: "FFMPEG_SPAWN_FAILED",
          hint: "로컬 또는 서버 환경에 ffmpeg가 설치되어 있는지 확인해주세요.",
          details: `path=${getFfmpegPath()}`,
          cause: error,
        }),
      );
    });

    child.on("close", (code) => {
      if (code !== 0 || chunks.length === 0) {
        reject(
          new AppError({
            message: "영상 대표 장면 캡처에 실패했습니다.",
            source: "youtube_capture",
            code: "FFMPEG_CAPTURE_FAILED",
            hint: "유튜브 스트림 접근이 제한됐거나, 현재 환경에서 영상 캡처를 처리하지 못했습니다.",
            details: stderr || `exitCode=${code}`,
          }),
        );
        return;
      }

      resolve(Buffer.concat(chunks));
    });
  });
}
