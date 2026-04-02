import { NextResponse } from "next/server";
import { z } from "zod";

import { extractThumbnailFromStream, formatTimestampLabel } from "@/lib/capture/thumbnail";
import { AppError } from "@/lib/errors/app-error";
import { formatErrorForLog, toErrorPayload } from "@/lib/errors/app-error";
import { captureRequestSchema, captureResponseSchema } from "@/lib/schemas/capture";
import { normalizeYoutubeInput } from "@/lib/youtube/normalize";
import { extractStoryboardThumbnail } from "@/lib/youtube/storyboard";
import { getYoutubeVideoStreamUrl } from "@/lib/youtube/stream";

export const runtime = "nodejs";
export const maxDuration = 60;

function getCaptureWorkerEndpoint() {
  const baseUrl = process.env.CAPTURE_WORKER_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL("captures", normalizedBaseUrl).toString();
}

async function forwardCaptureRequestToWorker(rawBody: string) {
  const endpoint = getCaptureWorkerEndpoint();

  if (!endpoint) {
    return null;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CAPTURE_WORKER_TOKEN
          ? {
              Authorization: `Bearer ${process.env.CAPTURE_WORKER_TOKEN}`,
            }
          : {}),
      },
      body: rawBody,
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "application/json";
    const payload = await response.text();

    return new NextResponse(payload, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    throw new AppError({
      message: "고화질 캡처 워커에 연결하지 못했습니다.",
      source: "youtube_capture",
      code: "CAPTURE_WORKER_UNAVAILABLE",
      hint: "CAPTURE_WORKER_URL과 워커 서버 상태를 확인해주세요.",
      details: endpoint,
      cause: error,
    });
  }
}

function sanitizeFilenamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function clampSceneMoments({
  moments,
  durationSeconds,
  count,
  avoidIntroOutro,
}: {
  moments: z.infer<typeof captureRequestSchema>["analysis"]["sceneMoments"];
  durationSeconds: number;
  count: number;
  avoidIntroOutro: boolean;
}) {
  const lowerBound = avoidIntroOutro ? 8 : 0;
  const upperBound = avoidIntroOutro ? Math.max(lowerBound, durationSeconds - 10) : durationSeconds;
  const seen = new Set<number>();

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

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const workerResponse = await forwardCaptureRequestToWorker(rawBody);

    if (workerResponse) {
      return workerResponse;
    }

    const body = captureRequestSchema.parse(JSON.parse(rawBody));
    const normalized = normalizeYoutubeInput(body.video.canonicalUrl);

    const selectedMoments = clampSceneMoments({
      moments: body.analysis.sceneMoments,
      durationSeconds: body.video.durationSeconds,
      count: body.options.count,
      avoidIntroOutro: body.options.avoidIntroOutro,
    });

    const captures = [];
    let streamUrl: string | null = null;

    for (const [index, moment] of selectedMoments.entries()) {
      let imageBuffer: Buffer;

      try {
        if (!streamUrl) {
          streamUrl = await getYoutubeVideoStreamUrl(normalized.videoId);
        }

        imageBuffer = await extractThumbnailFromStream({
          streamUrl,
          targetSeconds: moment.startSeconds,
          durationSeconds: body.video.durationSeconds,
        });
      } catch (streamError) {
        imageBuffer = await extractStoryboardThumbnail({
          videoId: normalized.videoId,
          targetSeconds: moment.startSeconds,
          durationSeconds: body.video.durationSeconds,
        });

        if (streamError instanceof Error) {
          console.warn("[api/capture] stream fallback", {
            videoId: normalized.videoId,
            message: streamError.message,
          });
        }
      }

      const timestampLabel = formatTimestampLabel(moment.startSeconds);
      const safeLabel = sanitizeFilenamePart(moment.label) || `capture-${index + 1}`;

      captures.push({
        id: `${normalized.videoId}-${index + 1}`,
        label: moment.label,
        reason: moment.reason,
        timestampSeconds: moment.startSeconds,
        timestampLabel,
        filename: `${String(index + 1).padStart(2, "0")}-${timestampLabel.replaceAll(":", "-")}-${safeLabel}.jpg`,
        dataUrl: `data:image/jpeg;base64,${imageBuffer.toString("base64")}`,
      });
    }

    return NextResponse.json(
      captureResponseSchema.parse({
        source: "scene_moments",
        captures,
      }),
    );
  } catch (error) {
    const traceId = crypto.randomUUID();
    const payload =
      error instanceof z.ZodError
        ? {
            error: "캡처 요청 형식이 올바르지 않습니다.",
            source: "api" as const,
            code: "INVALID_CAPTURE_REQUEST",
            status: 400,
            hint: "영상 분석이 완료된 뒤 다시 시도해주세요.",
            traceId,
          }
        : toErrorPayload(error, traceId, {
            message: "영상 캡처 중 오류가 발생했습니다.",
            source: "api",
            code: "CAPTURE_FAILED",
          });

    console.error("[api/capture]", {
      traceId,
      route: "/api/capture",
      error: formatErrorForLog(error),
    });

    return NextResponse.json(payload, { status: payload.status || 400 });
  }
}
