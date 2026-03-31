import type { Analysis, DraftLengthOption, DraftToneOption, YoutubeMetadata } from "@/types";

type BuildWritePromptParams = {
  video: YoutubeMetadata;
  analysis: Analysis;
  tone: DraftToneOption;
  length: DraftLengthOption;
  extraPrompt?: string;
};

function getLengthGuide(length: DraftLengthOption) {
  switch (length) {
    case "short":
      return "도입부 1문단, 본문 3개 섹션, 각 섹션은 짧고 밀도 있게 작성한다.";
    case "long":
      return "도입부 1~2문단, 본문 4~5개 섹션, 각 섹션은 충분히 설명하고 예시를 포함한다.";
    default:
      return "도입부 1문단, 본문 4개 안팎 섹션, 읽기 쉬운 중간 길이로 작성한다.";
  }
}

function getToneGuide(tone: DraftToneOption) {
  switch (tone) {
    case "friendly":
      return "친근하지만 가볍지 않게, 읽는 사람이 쉽게 따라오도록 설명한다.";
    case "insightful":
      return "핵심 포인트를 선명하게 짚고, 독자가 얻을 인사이트를 강조한다.";
    default:
      return "정돈된 문장과 신뢰감 있는 설명형 톤으로 작성한다.";
  }
}

export function buildWritePrompt({
  video,
  analysis,
  tone,
  length,
  extraPrompt,
}: BuildWritePromptParams) {
  return `
너는 한국어 실무 블로그 초안을 작성하는 에디터다.
아래 분석 결과를 바탕으로 블로그 게시판에 그대로 복사해서 붙여넣기 쉬운 초안을 작성해라.

문체 규칙:
- 한국어로 작성
- 지나치게 AI스럽거나 뻔한 표현 금지
- 과한 감탄사, 이모지, 표 형식 금지
- 소제목을 중심으로 읽기 쉽게 전개
- 정보 전달력이 우선이며, 문장은 자연스럽게 연결할 것

분량 가이드:
- ${getLengthGuide(length)}

톤 가이드:
- ${getToneGuide(tone)}

추가 지시사항:
- ${extraPrompt?.trim() || "없음"}

[영상 정보]
- 제목: ${video.title}
- 채널명: ${video.channelName}

[분석 결과]
- 요약: ${analysis.summary}
- 타깃 독자: ${analysis.targetAudience}
- 핵심 메시지: ${analysis.coreMessage}
- 주요 포인트: ${analysis.keyPoints.join(" | ")}
- 추천 목차: ${analysis.recommendedOutline.join(" | ")}
- 톤 힌트: ${analysis.toneHints.join(" | ")}
- 강조 키워드: ${analysis.keywords.join(", ")}

출력 원칙:
- titleOptions는 실제 게시 제목으로 쓸 수 있게 자연스럽게 작성
- openingParagraph는 도입부 역할만 하도록 작성
- sections의 heading은 블로그 소제목으로 바로 쓸 수 있게 작성
- closingParagraph는 글 전체를 매듭짓는 문단으로 작성
- cta는 마지막 한두 문장으로 간결하게 작성
- hashtags는 복사해서 바로 붙일 수 있게 해시태그 문자열로 만들기 좋은 단어를 제공
`.trim();
}
