FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 python3-venv ca-certificates \
  && python3 -m venv /opt/yt-dlp \
  && /opt/yt-dlp/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/yt-dlp/bin/pip install --no-cache-dir yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server.mjs ./server.mjs

ENV PORT=4100
ENV YT_DLP_PATH=/opt/yt-dlp/bin/yt-dlp

EXPOSE 4100

CMD ["node", "./server.mjs"]
