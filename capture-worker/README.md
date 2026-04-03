# Capture Worker

고화질 영상 캡처 전용 워커.

이 워커는 `Playwright + Chromium`으로 실제 브라우저 세션에서 유튜브 영상을 연 뒤,
지정된 시점의 비디오 프레임을 직접 캡처한다.

## 엔드포인트

- `GET /health`
- `POST /captures`

## 환경변수

```env
PORT=4100
CAPTURE_WORKER_TOKEN=your_secret_token
PLAYWRIGHT_WS_ENDPOINT=
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=
YOUTUBE_COOKIES_JSON_B64=
```

`CAPTURE_WORKER_TOKEN`은 선택 사항이지만, 외부에 배포할 때는 설정하는 편이 안전하다.

- `PLAYWRIGHT_WS_ENDPOINT`: Browserless 같은 원격 브라우저를 붙일 때 사용
- `YOUTUBE_COOKIES_JSON_B64`: Playwright cookies JSON 배열을 base64 인코딩해 넣으면 로그인 세션을 주입할 수 있음

## 로컬 실행

의존성 설치:

```bash
cd capture-worker
npm install
npx playwright install chromium
```

실행:

```bash
PORT=4100 CAPTURE_WORKER_TOKEN=change-me npm run start
```

## Docker 실행

```bash
docker build -t gbread-capture-worker ./capture-worker
docker run --rm -p 4100:4100 -e CAPTURE_WORKER_TOKEN=change-me gbread-capture-worker
```

## 앱 연결

Next.js 앱의 `.env.local`에 아래 값을 넣으면 `/api/capture`가 이 워커로 프록시된다.

```env
CAPTURE_WORKER_URL=http://127.0.0.1:4100
CAPTURE_WORKER_TOKEN=change-me
```
