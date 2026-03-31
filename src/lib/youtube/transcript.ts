import { fetchTranscript } from "youtube-transcript";

import type { YoutubeTranscriptResult } from "@/lib/youtube/types";

const MAX_TRANSCRIPT_LENGTH = 18000;

export async function fetchYoutubeTranscript(url: string): Promise<YoutubeTranscriptResult> {
  const transcript = await fetchTranscript(url);

  if (!transcript.length) {
    throw new Error("이 영상에서 transcript를 찾지 못했습니다.");
  }

  const text = transcript.map((entry) => entry.text.trim()).filter(Boolean).join(" ");

  if (!text) {
    throw new Error("transcript 내용이 비어 있습니다.");
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
