import { AppError } from "@/lib/errors/app-error";
import { withYoutubeCookies } from "@/lib/youtube/cookies";
import type {
  YoutubeCaptionTrack,
  YoutubeTranscriptResult,
  YoutubeTranscriptSegment,
} from "@/lib/youtube/types";

const MAX_TRANSCRIPT_LENGTH = 18000;

const TRANSCRIPT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

type Json3Event = {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: Array<{ utf8?: string }>;
};

type Json3Payload = {
  events?: Json3Event[];
};

function pickPreferredTrack(tracks: YoutubeCaptionTrack[]): YoutubeCaptionTrack | null {
  if (tracks.length === 0) {
    return null;
  }

  const byLanguage = (code: string, kind?: "asr" | "standard") =>
    tracks.find((track) => {
      if (!track.languageCode.toLowerCase().startsWith(code)) {
        return false;
      }
      if (kind && track.kind !== kind) {
        return false;
      }
      return true;
    });

  return (
    byLanguage("ko", "standard") ||
    byLanguage("ko") ||
    byLanguage("en", "standard") ||
    byLanguage("en") ||
    tracks.find((track) => track.kind === "standard") ||
    tracks[0]
  );
}

async function fetchTimedTextJson3(baseUrl: string): Promise<Json3Payload> {
  const url = baseUrl.includes("fmt=") ? baseUrl : `${baseUrl}&fmt=json3`;

  let response: Response;
  try {
    response = await fetch(
      url,
      withYoutubeCookies({
        headers: {
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          "User-Agent": TRANSCRIPT_USER_AGENT,
        },
      }),
    );
  } catch (error) {
    throw new AppError({
      message: "유튜브 transcript 데이터를 가져오지 못했습니다.",
      source: "youtube_transcript",
      code: "YOUTUBE_TRANSCRIPT_FETCH_FAILED",
      hint: "네트워크 상태나 YouTube 접근 가능 여부를 확인해주세요.",
      details: url,
      cause: error,
    });
  }

  if (!response.ok) {
    throw new AppError({
      message: "유튜브 transcript 응답이 정상적이지 않습니다.",
      source: "youtube_transcript",
      code: "YOUTUBE_TRANSCRIPT_HTTP_ERROR",
      status: response.status,
      hint:
        response.status === 429
          ? "요청이 너무 많아 일시적으로 제한된 상태일 수 있습니다."
          : "잠시 후 다시 시도해주세요.",
      details: `GET ${url}`,
    });
  }

  const text = await response.text();

  if (!text.trim()) {
    throw new AppError({
      message: "유튜브 transcript 응답이 비어 있습니다.",
      source: "youtube_transcript",
      code: "EMPTY_TRANSCRIPT",
      details: url,
    });
  }

  try {
    return JSON.parse(text) as Json3Payload;
  } catch (error) {
    throw new AppError({
      message: "유튜브 transcript JSON을 해석하지 못했습니다.",
      source: "youtube_transcript",
      code: "INVALID_TRANSCRIPT_JSON",
      details: url,
      cause: error,
    });
  }
}

function eventsToSegments(events: Json3Event[]): YoutubeTranscriptSegment[] {
  const segments: YoutubeTranscriptSegment[] = [];

  for (const event of events) {
    if (!Array.isArray(event.segs)) {
      continue;
    }

    const text = event.segs
      .map((seg) => (typeof seg.utf8 === "string" ? seg.utf8 : ""))
      .join("")
      .replace(/\n+/g, " ")
      .trim();

    if (!text) {
      continue;
    }

    const startMs = typeof event.tStartMs === "number" ? event.tStartMs : 0;
    const durationMs = typeof event.dDurationMs === "number" ? event.dDurationMs : 0;

    segments.push({
      text,
      startSeconds: Math.floor(startMs / 1000),
      durationSeconds: Math.max(1, Math.round(durationMs / 1000)),
    });
  }

  return segments;
}

export async function fetchYoutubeTranscriptFromTracks(
  captionTracks: YoutubeCaptionTrack[],
): Promise<YoutubeTranscriptResult> {
  const track = pickPreferredTrack(captionTracks);

  if (!track) {
    throw new AppError({
      message: "이 영상에서 사용 가능한 transcript를 찾지 못했습니다.",
      source: "youtube_transcript",
      code: "YOUTUBE_TRANSCRIPT_NOT_AVAILABLE",
      hint: "자동 자막이 없거나 공개 자막이 없는 영상일 수 있습니다.",
    });
  }

  const payload = await fetchTimedTextJson3(track.baseUrl);
  const events = Array.isArray(payload.events) ? payload.events : [];
  const segments = eventsToSegments(events);

  if (segments.length === 0) {
    throw new AppError({
      message: "transcript 내용이 비어 있습니다.",
      source: "youtube_transcript",
      code: "EMPTY_TRANSCRIPT_TEXT",
      details: `languageCode=${track.languageCode}`,
    });
  }

  const text = segments.map((segment) => segment.text).join(" ");

  return {
    languageCode: track.languageCode,
    text,
    promptText: text.slice(0, MAX_TRANSCRIPT_LENGTH),
    segments,
  };
}
