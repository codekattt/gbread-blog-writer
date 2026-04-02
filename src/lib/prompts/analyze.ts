import type { YoutubeMetadata } from "@/lib/youtube/types";

type BuildAnalyzePromptParams = {
  video: YoutubeMetadata;
  transcript?: string;
  sourceMode: "transcript" | "youtube_video";
};

export function buildAnalyzePrompt({ video, transcript, sourceMode }: BuildAnalyzePromptParams) {
  const sourceInstruction =
    sourceMode === "transcript"
      ? `
[입력 소스]
- transcript 기반 분석
- transcript에 없는 내용은 추정하지 말 것

[Transcript]
${transcript || "없음"}
`.trim()
      : `
[입력 소스]
- YouTube 영상 URL을 Gemini에 직접 전달한 비디오 분석
- 영상의 음성, 화면, 자막, 장면 흐름을 종합해 분석할 것
- 영상에서 직접 확인되지 않은 내용은 단정하지 말 것
`.trim();

  return `
너는 한국어 블로그 에디터를 보조하는 영상 분석가다.
아래 유튜브 영상 정보를 보고, 블로그 글쓰기에 바로 쓸 수 있는 구조화 분석 결과를 한국어로 작성해라.

목표:
- 영상의 핵심 메시지를 명확히 정리할 것
- 블로그 게시글로 확장하기 쉬운 목차와 포인트를 뽑을 것
- 나중에 영상 캡쳐 기능을 붙일 수 있도록 장면 포인트도 함께 제안할 것

반드시 지켜야 할 점:
- 추상적인 칭찬이나 감상문 형태를 피할 것
- 실제 블로그 글감으로 전개 가능한 정보 중심으로 작성할 것
- sceneMoments는 실제 블로그에 넣기 좋은 대표 장면만 고를 것
- 제품이 또렷하게 보이거나, 비교 결과/실험 장면/표정 변화/핵심 설명 장면처럼 화면 의미가 분명한 순간 위주로 고를 것
- 인트로, 아웃트로, 화면 전환 중간, 의미 없는 배경 컷은 제외할 것
- sceneMoments는 최소 6개, 가능하면 8~12개까지 넉넉하게 제안할 것
- 서로 너무 비슷한 장면은 반복하지 말 것
- 출력은 지정된 JSON 구조만 따를 것

[영상 메타데이터]
- 제목: ${video.title}
- 채널명: ${video.channelName}
- 길이(초): ${video.durationSeconds}
- 설명: ${video.description || "설명 없음"}
- 키워드: ${video.keywords.join(", ") || "없음"}

${sourceInstruction}
`.trim();
}
