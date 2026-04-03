# GBread Blog Writer

사내용 유튜브 기반 블로그 초안 생성 도구.

## 빠른 시작

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local`에는 최소한 다음 값을 넣는다.

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

고화질 영상 캡처까지 쓰려면 아래 값도 함께 넣는다.

```env
CAPTURE_WORKER_URL=http://127.0.0.1:4100
CAPTURE_WORKER_TOKEN=your_capture_worker_token
```

브라우저에서 `http://localhost:3000`으로 접속한 뒤 유튜브 링크를 입력하면 된다.

## 고화질 캡처 워커

Vercel 앱 안에서 바로 영상 프레임을 고화질로 뽑는 데에는 한계가 있다.  
그래서 캡처는 별도 워커로 분리했고, 앱은 `/api/capture`에서 그 워커를 프록시한다.

- 워커가 연결되어 있으면: `yt-dlp + ffmpeg`로 실제 영상 프레임 추출
- 워커가 없으면: 기존 로컬 fallback 캡처 사용

로컬에서 워커를 띄우는 가장 간단한 방법:

```bash
npm run capture:worker:install
npm run capture:worker
```

처음 실행에서 브라우저가 없다고 나오면 아래를 한 번 더 실행한다.

```bash
cd capture-worker
npx playwright install chromium
```

Docker로 띄우려면:

```bash
docker build -t gbread-capture-worker ./capture-worker
docker run --rm -p 4100:4100 -e CAPTURE_WORKER_TOKEN=change-me gbread-capture-worker
```

자세한 설정은 [capture-worker/README.md](/Users/codekattt/Desktop/frontend/gbread/blog-writer/capture-worker/README.md)를 보면 된다.

## 목표

유튜브 링크를 입력하면 다음 순서로 처리하는 웹페이지를 만든다.

1. 영상 메타데이터와 텍스트 소스를 확보한다.
2. Google Gemini로 영상 내용을 구조적으로 분석한다.
3. 분석 결과를 기반으로 블로그 게시판에 바로 복사/붙여넣기 할 수 있는 텍스트 초안을 생성한다.

초기 범위는 `유튜브 전용`이며, 결과물은 `일반적인 블로그 게시판에 붙여넣기 쉬운 plain text 중심 출력`을 목표로 한다.

## 1차 범위

- 유튜브 URL 입력
- URL 검증 및 정규화
- 영상 기본 정보 수집
  - 제목
  - 설명
  - 채널명
  - 길이
- 자막 또는 transcript 확보
- Gemini 기반 영상 분석
- Gemini 기반 블로그 초안 작성
- 결과 복사 버튼 제공
- 재생성 기능 제공

## 제외 범위

다음 항목은 1차 구현에서 제외하고 이후 확장한다.

- 영상 캡쳐
- 장면별 이미지 추천 자동 삽입
- 여러 플랫폼 동시 지원
- 사용자 계정/권한 관리
- 외부 공개 배포 기준의 보안/결제 기능

## 권장 사용자 흐름

1. 사용자가 유튜브 링크를 붙여넣는다.
2. 시스템이 링크를 정규화하고 영상 정보를 읽는다.
3. transcript를 확보하거나, 없으면 대체 텍스트 소스를 조합한다.
4. Gemini가 영상 구조를 분석한다.
5. Gemini가 분석 결과를 기반으로 블로그 글을 작성한다.
6. 사용자는 결과를 검토하고 복사해서 블로그 게시판에 붙여넣는다.

## 제품 구조

분석과 작성을 반드시 분리한다.

- `Analyze`
  - 영상 내용을 구조화된 데이터로 변환
  - 예: 핵심 주제, 요약, 세부 포인트, 타깃 독자, 추천 소제목
- `Write`
  - 분석 결과와 사용자 지시사항을 바탕으로 최종 게시글 생성

이 분리를 해두면 추후 캡쳐 기능, 포맷 변환, 품질 개선을 붙이기 쉽다.

## 기술 방향

- Framework: Next.js App Router
- Language: TypeScript
- Validation: Zod
- Styling: Tailwind CSS
- AI: Google Gemini API
- State: React 기본 상태 + 서버 액션 또는 Route Handler 조합
- Storage: 1차는 무저장 또는 임시 세션 수준

## 제안 폴더 구조

```text
src/
  app/
    page.tsx
    api/
      analyze/route.ts
      write/route.ts
  components/
    url-form.tsx
    analysis-panel.tsx
    draft-panel.tsx
    copy-button.tsx
  lib/
    ai/
      gemini.ts
    prompts/
      analyze.ts
      write.ts
    schemas/
      analysis.ts
      draft.ts
    youtube/
      normalize.ts
      metadata.ts
      transcript.ts
      types.ts
    format/
      plain-text.ts
  types/
    index.ts
```

## API 설계 초안

### `POST /api/analyze`

입력

```json
{
  "url": "https://www.youtube.com/watch?v=..."
}
```

출력 예시

```json
{
  "video": {
    "title": "string",
    "channelName": "string",
    "duration": 0,
    "description": "string"
  },
  "analysis": {
    "summary": "string",
    "targetAudience": "string",
    "coreMessage": "string",
    "keyPoints": ["string"],
    "recommendedOutline": ["string"],
    "toneHints": ["string"],
    "keywords": ["string"]
  }
}
```

### `POST /api/write`

입력

```json
{
  "video": {
    "title": "string",
    "channelName": "string"
  },
  "analysis": {
    "summary": "string",
    "coreMessage": "string",
    "keyPoints": ["string"],
    "recommendedOutline": ["string"],
    "keywords": ["string"]
  },
  "options": {
    "tone": "informative",
    "length": "medium",
    "extraPrompt": "string"
  }
}
```

출력 예시

```json
{
  "titleOptions": ["string", "string", "string"],
  "body": "string",
  "summary": "string",
  "hashtags": ["string"]
}
```

## UI 설계 초안

### 메인 화면

- 유튜브 링크 입력
- 글 길이 선택
- 글 톤 선택
- 추가 지시사항 입력
- `분석 후 작성` 버튼

### 결과 화면

- 영상 기본 정보
- 분석 요약 카드
- 추천 제목 3개
- 최종 본문
- 해시태그
- 전체 복사 버튼
- 재생성 버튼

## 프롬프트 전략

### 분석 프롬프트

목표는 영상 내용을 블로그 글쓰기 친화적인 구조로 바꾸는 것이다.

필수 출력 항목

- 핵심 주제
- 핵심 메시지
- 주요 포인트
- 시청자에게 유용한 정보
- 블로그용 소제목 초안
- 강조 키워드

### 작성 프롬프트

목표는 실제 게시판에 붙여넣기 쉬운 형태의 텍스트를 만드는 것이다.

제약

- 과도한 AI 티가 나는 문장 금지
- 불필요한 이모지 금지
- 섹션 단위로 읽기 쉽게 구성
- 제목, 도입부, 본문, 마무리 흐름 유지
- 블로그 편집기에서 깨지지 않는 plain text 중심 구성

## 구현 순서

### Phase 1. 프로젝트 뼈대

- Next.js 앱 생성
- TypeScript, ESLint, Tailwind 설정
- 환경변수 구조 정의
- 기본 페이지 레이아웃 작성

### Phase 2. 유튜브 입력 처리

- URL 검증
- URL 정규화
- video id 추출
- 메타데이터 수집 방식 결정

### Phase 3. transcript 확보

- 자막 소스 확보 전략 구현
- transcript 부재 시 fallback 설계
- 추출 결과 정제

### Phase 4. Gemini 분석

- Gemini 클라이언트 래퍼 작성
- 분석용 스키마 정의
- structured output 검증
- 에러/재시도 처리

### Phase 5. 블로그 초안 생성

- 작성 프롬프트 정리
- 결과 텍스트 포맷 고정
- 제목/본문/해시태그 분리

### Phase 6. 품질 보정

- 복붙 결과 가독성 개선
- 문장톤 보정
- 실패 케이스 처리
- 로딩 상태와 에러 메시지 개선

### Phase 7. 캡쳐 확장 준비

- 분석 결과에 타임코드 포함 가능하도록 설계
- 추후 `/api/capture` 추가 가능한 형태로 모듈 분리

## 환경변수 초안

```env
GEMINI_API_KEY=
YOUTUBE_API_KEY=
```

`YOUTUBE_API_KEY`는 메타데이터 확보 방식에 따라 불필요할 수도 있다. transcript 확보 전략을 어떤 방식으로 잡는지에 따라 최종 결정한다.

## 핵심 리스크

- 모든 유튜브 영상에 transcript가 있는 것은 아니다.
- transcript 품질이 낮으면 분석 품질도 흔들린다.
- 영상 링크만으로 직접 내용을 해석하는 방식은 응답시간과 비용이 커질 수 있다.
- 따라서 1차는 `transcript 중심 분석`을 기본 전략으로 잡는 편이 안전하다.

## 다음 작업 권장 순서

1. Next.js 프로젝트 초기화
2. Gemini 연결 테스트
3. 유튜브 URL 처리 모듈 작성
4. transcript 확보 방식 확정
5. 분석/작성 API 구현
6. 기본 UI 연결

## 이번 프로젝트의 결정 사항

- 지원 범위: 유튜브 전용
- 출력 목표: 일반 블로그 게시판에 바로 붙여넣기 쉬운 텍스트
- 사용 목적: 사내용 도구
- 후속 확장: 영상 캡쳐 기능
