const KEYWORDS = [
  "저당빵 리뷰",
  "저당식품 추천",
  "저당음식 다이어트",
  "그림의빵 리뷰",
  "저당 디저트 추천",
  "키토빵 추천",
  "무설탕 빵 리뷰",
];

const VERCEL_URL = process.env.VERCEL_APP_URL?.replace(/\/$/, "");
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!VERCEL_URL || !DISCORD_WEBHOOK) {
  console.error("VERCEL_APP_URL 또는 DISCORD_WEBHOOK_URL 환경변수가 없습니다.");
  process.exit(1);
}

if (!YOUTUBE_API_KEY) {
  console.error("YOUTUBE_API_KEY 환경변수가 없습니다.");
  process.exit(1);
}

// 날짜 기반으로 키워드 로테이션
const today = new Date();
const keyword = KEYWORDS[today.getDate() % KEYWORDS.length];
console.log(`[daily-blog] 오늘 키워드: "${keyword}"`);

// YouTube Data API v3로 영상 검색
let videoUrl;
try {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", keyword);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", "1");
  searchUrl.searchParams.set("order", "date");
  searchUrl.searchParams.set("key", YOUTUBE_API_KEY);

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) {
    const err = await searchRes.json().catch(() => ({}));
    throw new Error(`YouTube API ${searchRes.status}: ${JSON.stringify(err)}`);
  }

  const searchData = await searchRes.json();
  const videoId = searchData.items?.[0]?.id?.videoId;

  if (!videoId) {
    throw new Error("검색 결과가 없습니다.");
  }

  videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
} catch (error) {
  console.error("[daily-blog] YouTube 검색 실패:", error.message);
  process.exit(1);
}

console.log(`[daily-blog] 영상 URL: ${videoUrl}`);

// 분석 API 호출
console.log("[daily-blog] 분석 중...");
const analyzeRes = await fetch(`${VERCEL_URL}/api/analyze`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: videoUrl }),
});

if (!analyzeRes.ok) {
  const err = await analyzeRes.json().catch(() => ({}));
  console.error("[daily-blog] 분석 실패:", err);
  process.exit(1);
}

const analyzed = await analyzeRes.json();
console.log(`[daily-blog] 분석 완료: "${analyzed.video.title}" (모델: ${analyzed.modelUsed})`);

// 초안 작성 API 호출
console.log("[daily-blog] 초안 작성 중...");
const writeRes = await fetch(`${VERCEL_URL}/api/write`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    video: analyzed.video,
    analysis: analyzed.analysis,
    options: { tone: "blogger", length: "medium", extraPrompt: "" },
  }),
});

if (!writeRes.ok) {
  const err = await writeRes.json().catch(() => ({}));
  console.error("[daily-blog] 초안 작성 실패:", err);
  process.exit(1);
}

const draft = await writeRes.json();
console.log(`[daily-blog] 초안 완료 (모델: ${draft.modelUsed})`);

// Discord 메시지 구성
const videoTitle = analyzed.video.title || "제목 없음";
const channelName = analyzed.video.channelName || "채널 정보 없음";
const summary = (analyzed.analysis.summary || "").slice(0, 500);
const keywords = (analyzed.analysis.keywords || []).map((k) => `#${k}`).join(" ").slice(0, 200);
const plainText = draft.plainText || "";
const draftPreview = plainText.slice(0, 3800);
const isTruncated = plainText.length > 3800;

const dateStr = today.toLocaleDateString("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const payload = {
  username: "GBread 블로그봇",
  avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
  embeds: [
    {
      title: `📹 ${videoTitle}`,
      url: videoUrl,
      description: [
        `**채널:** ${channelName}`,
        `**검색어:** ${keyword}`,
        `**날짜:** ${dateStr}`,
        `**사용 모델:** ${draft.modelUsed}`,
      ].join("\n"),
      color: 0x5865f2,
      fields: [
        {
          name: "📋 영상 요약",
          value: summary || "요약 없음",
        },
        {
          name: "🏷️ 키워드",
          value: keywords || "없음",
        },
      ],
    },
    {
      title: "📝 블로그 초안",
      description: draftPreview + (isTruncated ? "\n\n...(이하 생략, 전체 초안은 링크 영상으로 직접 생성)" : ""),
      color: 0x57f287,
    },
  ],
};

const discordRes = await fetch(DISCORD_WEBHOOK, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

if (!discordRes.ok) {
  const text = await discordRes.text();
  console.error("[daily-blog] Discord 전송 실패:", discordRes.status, text);
  process.exit(1);
}

console.log("[daily-blog] ✅ Discord 전송 완료!");
