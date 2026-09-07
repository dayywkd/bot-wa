FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependensi sistem yang mungkin dibutuhkan
RUN apk add --no-cache tzdata ca-certificates

# Salin package.json dan package-lock.json jika ada
COPY package*.json ./

# Install dependensi produksi
RUN npm ci --only=production || npm install --production

# Buat folder session untuk persistent volume Railway
RUN mkdir -p /app/session

# Salin seluruh source code proyek
COPY . .

# Set default env vars
ENV PORT=3000
ENV SESSION_DIR=/app/session
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "src/server.js"]
