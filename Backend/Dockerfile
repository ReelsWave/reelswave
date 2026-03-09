FROM node:22-slim

# Install ffmpeg, ffprobe, and fonts
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg fontconfig fonts-liberation fonts-dejavu-core && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
