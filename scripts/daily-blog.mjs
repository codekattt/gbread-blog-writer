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
const TISTORY_ACCESS_TOKEN = process.env.TISTORY_ACCESS_TOKEN?.trim();
const TISTORY_BLOG_NAME = process.env.TISTORY_BLOG_NAME?.trim();
const TISTORY_CATEGORY_ID = process.env.TISTORY_CATEGORY_ID?.trim();
const TISTORY_VISIBILITY = process.env.TISTORY_VISIBILITY?.trim() || "0";
const TISTORY_ACCEPT_COMMENT = process.env.TISTORY_ACCEPT_COMMENT?.trim() || "0";
const FORCE_RUN = ["1", "true", "yes"].includes((process.env.FORCE_RUN || "").toLowerCase());
const KOREA_HOLIDAY_FAIL_OPEN = ["1", "true", "yes"].includes(
  (process.env.KOREA_HOLIDAY_FAIL_OPEN || "").toLowerCase(),
);

function getKstDateInfo(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(partMap.year);
  const month = Number(partMap.month);
  const day = Number(partMap.day);
  const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const weekDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return {
    year,
    month,
    day,
    dateString,
    weekDay,
  };
}

async function fetchKoreaPublicHolidays(year) {
  const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Holiday API ${response.status}`);
  }

  const holidays = await response.json();
  if (!Array.isArray(holidays)) {
    throw new Error("Holiday API 응답 형식이 올바르지 않습니다.");
  }

  return new Map(
    holidays
      .filter((holiday) => typeof holiday?.date === "string")
      .map((holiday) => [holiday.date, holiday.localName || holiday.name || "공휴일"]),
  );
}

async function ensureKoreaBusinessDayOrExit(todayInfo) {
  if (FORCE_RUN) {
    console.log("[daily-blog] FORCE_RUN 활성화: 영업일 검사를 건너뜁니다.");
    return;
  }

  if (todayInfo.weekDay === 0 || todayInfo.weekDay === 6) {
    console.log(`[daily-blog] ${todayInfo.dateString} KST는 주말이므로 실행하지 않습니다.`);
    process.exit(0);
  }

  try {
    const holidays = await fetchKoreaPublicHolidays(todayInfo.year);
    const holidayName = holidays.get(todayInfo.dateString);

    if (holidayName) {
      console.log(
        `[daily-blog] ${todayInfo.dateString} KST는 대한민국 공휴일(${holidayName})이므로 실행하지 않습니다.`,
      );
      process.exit(0);
    }
  } catch (error) {
    if (KOREA_HOLIDAY_FAIL_OPEN) {
      console.warn("[daily-blog] 공휴일 확인 실패, KOREA_HOLIDAY_FAIL_OPEN 설정에 따라 실행합니다.", {
        message: error.message,
      });
      return;
    }

    console.error("[daily-blog] 공휴일 확인에 실패해 실행을 중단합니다.", error.message);
    process.exit(1);
  }
}

const kstToday = getKstDateInfo();
await ensureKoreaBusinessDayOrExit(kstToday);

if (!VERCEL_URL || !DISCORD_WEBHOOK) {
  console.error("VERCEL_APP_URL 또는 DISCORD_WEBHOOK_URL 환경변수가 없습니다.");
  process.exit(1);
}

if (!YOUTUBE_API_KEY) {
  console.error("YOUTUBE_API_KEY 환경변수가 없습니다.");
  process.exit(1);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraphHtml(paragraph) {
  return `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`;
}

function buildTistoryHtml(draft) {
  const opening = (draft.openingParagraphs || []).map(paragraphHtml).join("\n");
  const sections = (draft.sections || [])
    .map((section) =>
      [
        `<h2>${escapeHtml(section.heading)}</h2>`,
        ...(section.paragraphs || []).map(paragraphHtml),
      ].join("\n"),
    )
    .join("\n\n");
  const closing = [
    draft.closingHeading ? `<h2>${escapeHtml(draft.closingHeading)}</h2>` : "",
    ...(draft.closingParagraphs || []).map(paragraphHtml),
  ]
    .filter(Boolean)
    .join("\n");
  const hashtags = (draft.hashtags || []).join(" ");

  return [
    opening,
    sections,
    closing,
    draft.cta ? paragraphHtml(draft.cta) : "",
    draft.sourceNote ? paragraphHtml(draft.sourceNote) : "",
    hashtags ? `<p>${escapeHtml(hashtags)}</p>` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function postTistoryWrite(params, mode) {
  const endpoint = "https://www.tistory.com/apis/post/write";

  if (mode === "query") {
    const url = new URL(endpoint);
    for (const [key, value] of params.entries()) {
      url.searchParams.set(key, value);
    }
    return fetch(url.toString(), { method: "POST" });
  }

  return fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: params,
  });
}

async function publishToTistory({ draft }) {
  if (!TISTORY_ACCESS_TOKEN || !TISTORY_BLOG_NAME) {
    console.log("[daily-blog] 티스토리 환경변수가 없어 발행을 건너뜁니다.");
    return null;
  }

  const title = draft.selectedTitle || draft.titleOptions?.[0] || "블로그 초안";
  const tags = (draft.hashtags || [])
    .map((tag) => String(tag).replace(/^#/, "").trim())
    .filter(Boolean)
    .join(",");

  const params = new URLSearchParams({
    access_token: TISTORY_ACCESS_TOKEN,
    output: "json",
    blogName: TISTORY_BLOG_NAME,
    title,
    content: buildTistoryHtml(draft),
    visibility: TISTORY_VISIBILITY,
    tag: tags,
    acceptComment: TISTORY_ACCEPT_COMMENT,
  });

  if (TISTORY_CATEGORY_ID) {
    params.set("category", TISTORY_CATEGORY_ID);
  }

  let response = await postTistoryWrite(params, "body");
  let data = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));

  const status = data?.tistory?.status;
  if (response.ok && status === "200") {
    return data.tistory;
  }

  console.warn("[daily-blog] 티스토리 body 방식 실패, query 방식으로 재시도합니다.", {
    httpStatus: response.status,
    tistoryStatus: status,
    errorMessage: data?.tistory?.error_message,
  });

  response = await postTistoryWrite(params, "query");
  data = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));

  if (!response.ok || data?.tistory?.status !== "200") {
    throw new Error(
      `Tistory API ${response.status}: ${JSON.stringify({
        status: data?.tistory?.status,
        error_message: data?.tistory?.error_message,
        raw: data?.raw,
      })}`,
    );
  }

  return data.tistory;
}

// 날짜 기반으로 키워드 로테이션
const keyword = KEYWORDS[kstToday.day % KEYWORDS.length];
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

let tistoryPost = null;
let tistoryError = null;
try {
  console.log("[daily-blog] 티스토리 발행 시도 중...");
  tistoryPost = await publishToTistory({ draft });
  if (tistoryPost) {
    console.log(`[daily-blog] 티스토리 발행 완료: ${tistoryPost.url}`);
  }
} catch (error) {
  tistoryError = error;
  console.error("[daily-blog] 티스토리 발행 실패:", error.message);
}

// Discord 메시지 구성
const videoTitle = analyzed.video.title || "제목 없음";
const channelName = analyzed.video.channelName || "채널 정보 없음";
const summary = (analyzed.analysis.summary || "").slice(0, 500);
const keywords = (analyzed.analysis.keywords || []).map((k) => `#${k}`).join(" ").slice(0, 200);
const plainText = draft.plainText || "";
const draftPreview = plainText.slice(0, 3800);
const isTruncated = plainText.length > 3800;

const dateStr = `${kstToday.year}년 ${kstToday.month}월 ${kstToday.day}일`;

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
        tistoryPost
          ? `**티스토리:** ${tistoryPost.url}`
          : tistoryError
            ? "**티스토리:** 발행 실패, Discord 초안으로 대체"
            : "**티스토리:** 환경변수 없음, 발행 건너뜀",
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
