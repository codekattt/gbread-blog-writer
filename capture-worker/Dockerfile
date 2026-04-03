FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.mjs ./server.mjs

ENV PORT=4100
ENV PLAYWRIGHT_HEADLESS=true

EXPOSE 4100

CMD ["npm", "run", "start"]
