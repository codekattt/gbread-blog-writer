import sharp from "sharp";

import { AppError } from "@/lib/errors/app-error";
import { getYoutubeClient } from "@/lib/youtube/client";

type StoryboardBoard = {
  template_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
  thumbnail_count: number;
  interval: number;
  columns: number;
  rows: number;
  storyboard_count: number;
};

function getBestBoard(boards: StoryboardBoard[]) {
  return boards
    .slice()
    .sort((left, right) => {
      const rightArea = right.thumbnail_width * right.thumbnail_height;
      const leftArea = left.thumbnail_width * left.thumbnail_height;

      if (rightArea !== leftArea) {
        return rightArea - leftArea;
      }

      return right.thumbnail_count - left.thumbnail_count;
    })[0];
}

export async function extractStoryboardThumbnail({
  videoId,
  targetSeconds,
  durationSeconds,
}: {
  videoId: string;
  targetSeconds: number;
  durationSeconds: number;
}) {
  const client = await getYoutubeClient();
  const info = await client.getBasicInfo(videoId);

  if (!info.storyboards || !("boards" in info.storyboards)) {
    throw new AppError({
      message: "이 영상은 storyboard 썸네일을 제공하지 않습니다.",
      source: "youtube_capture",
      code: "YOUTUBE_STORYBOARD_UNAVAILABLE",
      hint: "일부 영상은 storyboard가 없어 직접 캡처가 어려울 수 있습니다.",
      details: `videoId=${videoId}`,
    });
  }

  const board = getBestBoard(info.storyboards.boards as StoryboardBoard[]);

  if (!board) {
    throw new AppError({
      message: "사용 가능한 storyboard 보드를 찾지 못했습니다.",
      source: "youtube_capture",
      code: "YOUTUBE_STORYBOARD_BOARD_MISSING",
      details: `videoId=${videoId}`,
    });
  }

  const thumbnailsPerSheet = board.columns * board.rows;
  const normalizedPosition =
    durationSeconds > 0 ? Math.min(1, Math.max(0, targetSeconds / durationSeconds)) : 0;
  const clampedIndex = Math.max(
    0,
    Math.min(board.thumbnail_count - 1, Math.round(normalizedPosition * Math.max(board.thumbnail_count - 1, 0))),
  );
  const sheetIndex = Math.floor(clampedIndex / thumbnailsPerSheet);
  const cellIndex = clampedIndex % thumbnailsPerSheet;
  const x = (cellIndex % board.columns) * board.thumbnail_width;
  const y = Math.floor(cellIndex / board.columns) * board.thumbnail_height;
  const storyboardUrl = board.template_url.replace("$M", String(sheetIndex));

  const response = await fetch(storyboardUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new AppError({
      message: "storyboard 이미지를 가져오지 못했습니다.",
      source: "youtube_capture",
      code: "YOUTUBE_STORYBOARD_FETCH_FAILED",
      status: response.status,
      hint: "유튜브 storyboard 접근이 일시적으로 막혔을 수 있습니다.",
      details: storyboardUrl,
    });
  }

  const arrayBuffer = await response.arrayBuffer();
  const cropped = await sharp(Buffer.from(arrayBuffer))
    .extract({
      left: x,
      top: y,
      width: board.thumbnail_width,
      height: board.thumbnail_height,
    })
    .resize({
      width: Math.max(board.thumbnail_width * 4, 640),
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    })
    .sharpen()
    .jpeg({ quality: 92 })
    .toBuffer();

  return cropped;
}
