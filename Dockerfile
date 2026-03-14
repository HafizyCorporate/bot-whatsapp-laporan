# 1. Pakai mesin Linux Debian + Node.js versi 20
FROM node:20-bullseye

# 2. Install Chromium dan SEMUA library yang bikin error tadi
RUN apt-get update && apt-get install -y \
    chromium \
    libglib2.0-0 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. Pindah ke folder kerja
WORKDIR /app

# 4. Copy file package dan install module
COPY package*.json ./
RUN npm install

# 5. Copy semua kodingan bot kamu
COPY . .

# 6. Paksa Puppeteer pakai Chromium bawaan mesin ini
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# 7. Nyalakan Bot
CMD ["node", "app.js"]
