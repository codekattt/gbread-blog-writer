import type { Analysis } from "@/lib/schemas/analysis";
import type { DraftBody, DraftLengthOption, DraftToneOption } from "@/lib/schemas/draft";
import type { YoutubeMetadata } from "@/lib/youtube/types";

export type { Analysis, DraftLengthOption, DraftToneOption, YoutubeMetadata };

export type AnalysisResult = {
  video: YoutubeMetadata;
  analysis: Analysis;
};

export type AnalyzeResponse = AnalysisResult & {
  transcript: {
    languageCode: string | null;
    characterCount: number;
  };
};

export type DraftResult = DraftBody & {
  selectedTitle: string;
  plainText: string;
};

export type DraftWriteResponse = DraftResult;
