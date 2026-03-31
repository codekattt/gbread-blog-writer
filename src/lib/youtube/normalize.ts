import type { NormalizedYoutubeInput } from "@/lib/youtube/types";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

function ensureProtocol(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("www.")) {
    return `https://${value}`;
  }

  return value;
}

function extractVideoId(url: URL) {
  if (url.hostname === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] || null;
  }

  const v = url.searchParams.get("v");
  if (v) {
    return v;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const markerIndex = segments.findIndex((segment) => ["shorts", "embed", "v"].includes(segment));

  if (markerIndex >= 0) {
    return segments[markerIndex + 1] || null;
  }

  return null;
}

export function normalizeYoutubeInput(input: string): NormalizedYoutubeInput {
  const trimmed = input.trim();

  if (VIDEO_ID_PATTERN.test(trimmed)) {
    return {
      videoId: trimmed,
      canonicalUrl: `https://www.youtube.com/watch?v=${trimmed}`,
      sourceUrl: trimmed,
    };
  }

  let url: URL;
  try {
    url = new URL(ensureProtocol(trimmed));
  } catch {
    throw new Error("유효한 유튜브 링크를 입력해주세요.");
  }

  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    throw new Error("현재는 유튜브 링크만 지원합니다.");
  }

  const videoId = extractVideoId(url);
  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) {
    throw new Error("유튜브 video id를 찾지 못했습니다.");
  }

  return {
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    sourceUrl: trimmed,
  };
}
