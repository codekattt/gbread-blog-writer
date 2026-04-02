import { AppError } from "@/lib/errors/app-error";
import { getYoutubeClient } from "@/lib/youtube/client";

const formatAttempts = [
  { quality: "720p", type: "video+audio" as const, format: "mp4" },
  { quality: "480p", type: "video+audio" as const, format: "mp4" },
  { quality: "best", type: "video+audio" as const, format: "mp4" },
  { quality: "best", type: "video+audio" as const },
  { quality: "best", type: "video" as const, format: "mp4" },
  { quality: "best", type: "video" as const },
  { quality: "bestefficiency", type: "video+audio" as const },
  { quality: "bestefficiency", type: "video" as const },
];

export async function getYoutubeVideoStreamUrl(videoId: string) {
  const client = await getYoutubeClient();

  for (const attempt of formatAttempts) {
    try {
      const format = await client.getStreamingData(videoId, attempt);

      if (format.url) {
        return format.url;
      }
    } catch {
      continue;
    }
  }

  throw new AppError({
    message: "유튜브 영상 스트림 URL을 가져오지 못했습니다.",
    source: "youtube_capture",
    code: "YOUTUBE_STREAM_URL_FAILED",
    hint: "일부 영상은 캡처용 스트림을 바로 가져오지 못할 수 있습니다. 다른 영상으로 먼저 확인해보세요.",
    details: `videoId=${videoId}`,
  });
}
