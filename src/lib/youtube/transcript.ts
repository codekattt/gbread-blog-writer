import {
  fetchTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";

import { AppError } from "@/lib/errors/app-error";
import type { YoutubeTranscriptResult } from "@/lib/youtube/types";

const MAX_TRANSCRIPT_LENGTH = 18000;

export async function fetchYoutubeTranscript(url: string): Promise<YoutubeTranscriptResult> {
  let transcript: Awaited<ReturnType<typeof fetchTranscript>>;
  try {
    transcript = await fetchTranscript(url);
  } catch (error) {
    if (error instanceof YoutubeTranscriptTooManyRequestError) {
      throw new AppError({
        message: "유튜브 transcript 요청이 일시적으로 제한됐습니다.",
        source: "youtube_transcript",
        code: "YOUTUBE_TRANSCRIPT_RATE_LIMITED",
        status: 429,
        hint: "잠시 후 다시 시도하거나 다른 네트워크에서 시도해보세요.",
        details: url,
        cause: error,
      });
    }

    if (error instanceof YoutubeTranscriptVideoUnavailableError) {
      throw new AppError({
        message: "해당 유튜브 영상을 현재 불러올 수 없습니다.",
        source: "youtube_transcript",
        code: "YOUTUBE_VIDEO_UNAVAILABLE",
        hint: "영상이 비공개, 삭제, 연령 제한 상태인지 확인해주세요.",
        details: url,
        cause: error,
      });
    }

    if (error instanceof YoutubeTranscriptDisabledError) {
      throw new AppError({
        message: "이 영상은 자막이 비활성화되어 있습니다.",
        source: "youtube_transcript",
        code: "YOUTUBE_TRANSCRIPT_DISABLED",
        hint: "현재 버전은 transcript가 있는 영상에서 가장 안정적으로 동작합니다.",
        details: url,
        cause: error,
      });
    }

    if (
      error instanceof YoutubeTranscriptNotAvailableError ||
      error instanceof YoutubeTranscriptNotAvailableLanguageError
    ) {
      throw new AppError({
        message: "이 영상에서 사용 가능한 transcript를 찾지 못했습니다.",
        source: "youtube_transcript",
        code: "YOUTUBE_TRANSCRIPT_NOT_AVAILABLE",
        hint: "자동 자막이 없거나 공개 자막이 없는 영상일 수 있습니다.",
        details: url,
        cause: error,
      });
    }

    throw new AppError({
      message: "유튜브 transcript를 가져오는 중 오류가 발생했습니다.",
      source: "youtube_transcript",
      code: "YOUTUBE_TRANSCRIPT_FETCH_FAILED",
      hint: "네트워크 상태나 YouTube 접근 가능 여부를 확인해주세요.",
      details: url,
      cause: error,
    });
  }

  if (!transcript.length) {
    throw new AppError({
      message: "이 영상에서 transcript를 찾지 못했습니다.",
      source: "youtube_transcript",
      code: "EMPTY_TRANSCRIPT",
      hint: "현재 버전은 transcript가 있는 영상에서 가장 안정적으로 동작합니다.",
      details: url,
    });
  }

  const text = transcript.map((entry) => entry.text.trim()).filter(Boolean).join(" ");

  if (!text) {
    throw new AppError({
      message: "transcript 내용이 비어 있습니다.",
      source: "youtube_transcript",
      code: "EMPTY_TRANSCRIPT_TEXT",
      details: url,
    });
  }

  return {
    languageCode: transcript[0]?.lang || null,
    text,
    promptText: text.slice(0, MAX_TRANSCRIPT_LENGTH),
    segments: transcript.map((entry) => ({
      text: entry.text,
      startSeconds: Math.floor(entry.offset / 1000),
      durationSeconds: Math.max(1, Math.round(entry.duration / 1000)),
    })),
  };
}
