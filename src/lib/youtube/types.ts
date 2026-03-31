export type NormalizedYoutubeInput = {
  videoId: string;
  canonicalUrl: string;
  sourceUrl: string;
};

export type YoutubeMetadata = {
  videoId: string;
  canonicalUrl: string;
  title: string;
  channelName: string;
  description: string;
  durationSeconds: number;
  durationLabel: string;
  keywords: string[];
  thumbnailUrl: string | null;
};

export type YoutubeTranscriptSegment = {
  text: string;
  startSeconds: number;
  durationSeconds: number;
};

export type YoutubeTranscriptResult = {
  languageCode: string | null;
  text: string;
  promptText: string;
  segments: YoutubeTranscriptSegment[];
};
