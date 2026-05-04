# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
# Cài đặt tất cả dependencies để build
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Production (Runner) ──────────────────────────────────────────────
FROM node:20-alpine AS runner

# Cài đặt FFmpeg cho xử lý video
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Khai báo môi trường
ENV NODE_ENV=production

# Copy package.json để cài đặt
COPY package*.json ./

# Lưu ý: Tạm thời bỏ --omit=dev để bạn có thể chạy được drizzle-kit 
# (do drizzle-kit thường nằm trong devDependencies)
RUN npm ci

# Copy code đã build từ stage trước
COPY --from=builder /app/dist ./dist

COPY --from=builder /app/src/infrastructure/queue/processors/fonts \
    ./dist/infrastructure/queue/processors/fonts

# QUAN TRỌNG: Copy thư mục chứa các file migration của Drizzle
COPY --from=builder /app/drizzle ./drizzle

# Tạo các thư mục output và phân quyền cho user 'node'
# Phải làm trước khi đổi USER
RUN mkdir -p outputs/images outputs/videos outputs/reports outputs/csv && \
    chown -R node:node /app/outputs

# Sử dụng user node để bảo mật (không chạy quyền root)
USER node

EXPOSE 3000

# Chạy ứng dụng
CMD ["sh", "-c", "npm run db:generate && npm run db:migrate && node dist/app.js"]