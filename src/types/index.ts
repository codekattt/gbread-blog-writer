import type { Analysis } from "@/lib/schemas/analysis";
import type { CaptureItem, CaptureResponse } from "@/lib/schemas/capture";
import type { AppErrorPayload } from "@/lib/errors/app-error";
import type { DraftBody, DraftLengthOption, DraftToneOption } from "@/lib/schemas/draft";
import type { YoutubeMetadata } from "@/lib/youtube/types";

export type {
  Analysis,
  AppErrorPayload,
  CaptureItem,
  DraftLengthOption,
  DraftToneOption,
  YoutubeMetadata,
};

export type AnalysisResult = {
  video: YoutubeMetadata;
  analysis: Analysis;
};

export type AnalyzeResponse = AnalysisResult & {
  transcript: {
    languageCode: string | null;
    characterCount: number;
    mode: "transcript" | "youtube_video";
  };
};

export type DraftResult = DraftBody & {
  selectedTitle: string;
  plainText: string;
};

export type DraftWriteResponse = DraftResult;
export type CaptureGenerateResponse = CaptureResponse;
