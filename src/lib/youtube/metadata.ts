import type { YoutubeMetadata } from "@/lib/youtube/types";

const WATCH_PAGE_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

function parseInlineJson(html: string, variableName: string) {
  const prefix = `var ${variableName} = `;
  const start = html.indexOf(prefix);

  if (start === -1) {
    return null;
  }

  const jsonStart = start + prefix.length;
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = jsonStart; index < html.length; index += 1) {
    const character = html[index];

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (character === "\\") {
        escaping = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        const slice = html.slice(jsonStart, index + 1);
        try {
          return JSON.parse(slice) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

async function fetchWatchPage(url: string) {
  const response = await fetch(url, {
    headers: {
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "User-Agent": WATCH_PAGE_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error("유튜브 페이지 메타데이터를 가져오지 못했습니다.");
  }

  return response.text();
}

async function fetchOEmbed(url: string) {
  const response = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
  };

  return {
    title: data.title || "제목 없음",
    channelName: data.author_name || "채널 정보 없음",
    thumbnailUrl: data.thumbnail_url || null,
  };
}

export async function fetchYoutubeMetadata(
  videoId: string,
  canonicalUrl: string,
): Promise<YoutubeMetadata> {
  const html = await fetchWatchPage(canonicalUrl);
  const playerResponse = parseInlineJson(html, "ytInitialPlayerResponse");
  const videoDetails = playerResponse?.videoDetails as
    | {
        title?: string;
        author?: string;
        shortDescription?: string;
        lengthSeconds?: string;
        keywords?: string[];
        thumbnail?: {
          thumbnails?: Array<{ url?: string }>;
        };
      }
    | undefined;

  const fallback = await fetchOEmbed(canonicalUrl);

  const durationSeconds = Number(videoDetails?.lengthSeconds || 0);
  const totalMinutes = Math.floor(durationSeconds / 60);
  const remainingSeconds = durationSeconds % 60;

  return {
    videoId,
    canonicalUrl,
    title: videoDetails?.title || fallback?.title || "제목을 확인하지 못했습니다.",
    channelName: videoDetails?.author || fallback?.channelName || "채널 정보를 확인하지 못했습니다.",
    description: videoDetails?.shortDescription || "",
    durationSeconds,
    durationLabel:
      durationSeconds > 0
        ? `${totalMinutes}:${remainingSeconds.toString().padStart(2, "0")}`
        : "길이 미확인",
    keywords: videoDetails?.keywords || [],
    thumbnailUrl:
      videoDetails?.thumbnail?.thumbnails?.at(-1)?.url || fallback?.thumbnailUrl || null,
  };
}
