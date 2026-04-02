# Capture Worker

고화질 영상 캡처 전용 워커.

이 워커는 `yt-dlp + ffmpeg`로 실제 유튜브 영상을 내려받은 뒤, 지정된 시점의 대표 프레임을 뽑아준다.  
Vercel 앱 안에서 storyboard를 확대하는 방식보다 화질이 훨씬 좋다.

## 엔드포인트

- `GET /health`
- `POST /captures`

## 환경변수

```env
PORT=4100
CAPTURE_WORKER_TOKEN=your_secret_token
YT_DLP_PATH=yt-dlp
FFMPEG_PATH=ffmpeg
```

`CAPTURE_WORKER_TOKEN`은 선택 사항이지만, 외부에 배포할 때는 설정하는 편이 안전하다.

## 로컬 실행

로컬 머신에 `yt-dlp`, `ffmpeg`가 설치되어 있다면:

```bash
PORT=4100 CAPTURE_WORKER_TOKEN=change-me node capture-worker/server.mjs
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
