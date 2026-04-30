# ⬡ Job Queue & Task Scheduler API

> Hệ thống xử lý background jobs và lên lịch tác vụ tự động, xây dựng theo kiến trúc **DDD + FP** với Express.js, BullMQ và PostgreSQL.

---

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Tính năng](#tính-năng)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt & Chạy](#cài-đặt--chạy)
- [Tài liệu API](#tài-liệu-api)
- [Các loại Job](#các-loại-job)
- [Phân quyền](#phân-quyền)

---

## Tổng quan

Job Queue API là một REST API cho phép các ứng dụng client **đẩy các tác vụ nặng ra nền** thay vì xử lý đồng bộ. Thay vì người dùng phải chờ email gửi xong hay ảnh resize xong, hệ thống nhận yêu cầu, trả về ngay lập tức, rồi xử lý ngầm.

```
Client gửi request  →  API nhận & lưu DB  →  Enqueue vào BullMQ  →  Worker xử lý  →  Webhook thông báo
       ↑                      ↑                       ↑                    ↑                  ↑
   < 50ms                  Instant               Redis queue           Background          Async notify
```

---

## Kiến trúc hệ thống

Project được xây dựng theo **Domain-Driven Design (DDD)** kết hợp **Functional Programming (FP)**, chia thành 4 layer rõ ràng:

```
src/
├── domain/          ← Logic nghiệp vụ thuần túy (pure functions, types)
│   ├── auth/        ← User entity, Email/Password value objects
│   ├── job/         ← Job entity, payload validators, status transitions
│   ├── schedule/    ← Schedule entity, cron expression VO
│   ├── webhook/     ← Webhook entity, event types
│   └── audit/       ← Audit log entity, actions
│
├── application/     ← Use cases (factory functions nhận deps, trả về function)
│   ├── auth/        ← register, login, refresh-token
│   ├── job/         ← create, get, cancel, retry
│   ├── schedule/    ← create, update, toggle, delete
│   ├── webhook/     ← register, delete, dispatch
│   └── audit/       ← log, get-logs
│
├── infrastructure/  ← Implement các interface từ domain
│   ├── database/    ← Drizzle ORM repositories
│   ├── queue/       ← BullMQ queues, workers, processors
│   ├── events/      ← Event emitter (audit & webhook listeners)
│   ├── cloudinary/  ← Cloud storage cho media
│   └── http/        ← Middlewares, utils
│
└── presentation/    ← Controllers, routes, DTOs (Zod validation)
    ├── auth/
    ├── job/
    ├── schedule/
    ├── webhook/
    └── audit/
```

### Luồng xử lý Event (Audit & Webhook)

```
Use case hoàn thành
       ↓
emitAudit({ action, userId, meta })    emitWebhook({ event, jobId, data })
       ↓                                       ↓
appEmitter.on('audit')              appEmitter.on('webhook.dispatch')
       ↓                                       ↓
logAuditUseCase()                   dispatchWebhookUseCase()
       ↓                                       ↓
  Lưu DB                            Gửi HTTP đến URL đã đăng ký
```

---

## Công nghệ sử dụng

| Danh mục | Công nghệ |
|---|---|
| **Runtime** | Node.js 20, TypeScript |
| **Framework** | Express.js |
| **Queue** | BullMQ + Redis |
| **Database** | PostgreSQL + Drizzle ORM |
| **Auth** | JWT (Access + Refresh token rotation) |
| **Validation** | Zod |
| **Media** | Sharp (resize ảnh) + Cloudinary (storage) |
| **PDF** | PDFKit |
| **Container** | Docker + Docker Compose |

---

## Tính năng

### 🔐 Xác thực
- Đăng ký / Đăng nhập với JWT
- Refresh token rotation (tự động cấp token mới)
- Hỗ trợ API Key cho server-to-server
- Phân quyền `USER` / `ADMIN`

### ⚙️ Quản lý Job
- Tạo job với priority (0-10), delay (ms), maxAttempts
- Lên lịch chạy một lần vào thời điểm cụ thể (`scheduledAt`)
- Xem danh sách, lọc theo status/type, phân trang
- Cancel job đang pending
- Retry job bị failed (kiểm tra `maxAttempts`)

### 📅 Schedule (Cron Jobs)
- Tạo recurring job với cron expression
- Bật / tắt schedule không cần xóa
- Theo dõi `lastRunAt` và `nextRunAt`

### 🔔 Webhook
- Đăng ký URL nhận thông báo khi job hoàn thành / thất bại / bị cancel / retry
- Hỗ trợ nhiều events per webhook
- Delivery với error handling, không crash main flow

### 📋 Audit Log
- Tự động ghi lại mọi hành động qua Event Emitter
- Lọc theo action, jobId, khoảng thời gian
- USER chỉ xem log của mình, ADMIN xem tất cả

### 🩺 Health Check
- `GET /health` — liveness check
- `GET /health/ready` — kiểm tra DB + Redis + Queues

---

## Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu |
|---|---|
| Docker | 24.x+ |
| Docker Compose | 2.x+ |
| (Tùy chọn) Node.js | 20.x+ nếu chạy local |

---

## Cài đặt & Chạy

### 1. Clone repository

```bash
git clone <repository-url>
cd job-queue-api
```

### 2. Tạo file `.env`

```bash
cp .env.example .env
```

Sau đó chỉnh sửa các giá trị trong `.env`.

### 3. Build và khởi động

```bash
docker compose up -d --build
```

Lệnh này sẽ:
- Build Docker image (compile TypeScript → JavaScript)
- Khởi động PostgreSQL và chờ healthy
- Khởi động Redis và chờ healthy
- Khởi động server Express + tất cả workers

### 4. Xem logs

```bash
# Xem toàn bộ log real-time
docker logs -f job_queue_app

# Xem log của postgres
docker logs -f job_queue_postgres

# Xem log của redis
docker logs -f job_queue_redis
```

### 5. Kiểm tra server

```bash
curl http://localhost:3000/health
# → { "status": "ok", "timestamp": "..." }

curl http://localhost:3000/health/ready
# → { "status": "healthy", "services": { "database": {...}, "redis": {...}, "queues": {...} } }
```

### Các lệnh hữu ích

```bash
# Dừng tất cả containers
docker compose down

# Dừng và xóa toàn bộ data (volumes)
docker compose down -v

# Rebuild lại image sau khi thay đổi code
docker compose up -d --build

# Restart chỉ app (không rebuild)
docker compose restart app

# Xem trạng thái các container
docker compose ps

# Truy cập shell bên trong container app
docker exec -it job_queue_app sh

# Truy cập PostgreSQL
docker exec -it job_queue_postgres psql -U postgres -d job_queue_db

# Truy cập Redis CLI
docker exec -it job_queue_redis redis-cli -a <REDIS_PASSWORD>
```

### Chạy local (không dùng Docker)

```bash
# Cài dependencies
npm install

# Chạy PostgreSQL + Redis bằng Docker
docker compose up postgres redis -d

# Generate và chạy migration
npm run db:generate
npm run db:migrate

# Chạy development server (hot reload)
npm run dev
```
---

## Tài liệu API

### Base URL

```
http://localhost:3000
```

### Xác thực

Hầu hết API yêu cầu header:

```
Authorization: Bearer <accessToken>
```

---

### Auth

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| `POST` | `/auth/register` | Đăng ký tài khoản | Không |
| `POST` | `/auth/login` | Đăng nhập, nhận token | Không |
| `POST` | `/auth/refresh` | Làm mới access token | Không |
| `POST` | `/auth/logout` | Đăng xuất | ✅ |

**Ví dụ đăng ký:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123"
  }'
```

**Ví dụ đăng nhập:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123"
  }'
```

---

### Jobs

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| `POST` | `/job` | Tạo và enqueue job mới | ✅ |
| `GET` | `/job` | Danh sách jobs (filter, phân trang) | ✅ |
| `GET` | `/job/:id` | Chi tiết một job | ✅ |
| `POST` | `/job/:id/retry` | Retry job bị failed | ✅ |
| `DELETE` | `/job/:id` | Cancel job đang pending | ✅ |

**Ví dụ tạo job gửi email:**
```bash
curl -X POST http://localhost:3000/job \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SEND_EMAIL",
    "payload": {
      "to": "recipient@example.com",
      "subject": "Xin chào!",
      "body": "<p>Nội dung email</p>"
    },
    "priority": 5,
    "maxAttempts": 3
  }'
```

**Ví dụ tạo job resize ảnh với delay:**
```bash
curl -X POST http://localhost:3000/job \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "RESIZE_IMAGE",
    "payload": {
      "imageUrl": "https://example.com/photo.jpg",
      "width": 800,
      "height": 600,
      "format": "webp"
    },
    "delay": 5000
  }'
```

**Query parameters cho GET /job:**

| Param | Giá trị | Mô tả |
|---|---|---|
| `status` | `PENDING\|ACTIVE\|COMPLETED\|FAILED\|CANCELLED` | Lọc theo trạng thái |
| `type` | `SEND_EMAIL\|RESIZE_IMAGE\|...` | Lọc theo loại job |
| `page` | số nguyên, mặc định `1` | Trang hiện tại |
| `limit` | số nguyên, mặc định `10`, tối đa `100` | Số item mỗi trang |

---

### Schedules

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| `POST` | `/schedule/schedules` | Tạo cron schedule | ✅ |
| `GET` | `/schedule/schedules` | Danh sách schedules | ✅ |
| `PATCH` | `/schedule/schedules/:id` | Cập nhật schedule | ✅ |
| `PATCH` | `/schedule/schedules/:id/toggle` | Bật / tắt schedule | ✅ |
| `DELETE` | `/schedule/schedules/:id` | Xóa schedule | ✅ |

**Ví dụ tạo schedule gửi email hằng ngày lúc 9am:**
```bash
curl -X POST http://localhost:3000/schedule/schedules \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Morning Email",
    "jobType": "SEND_EMAIL",
    "cronExpr": "0 9 * * *",
    "payload": {
      "to": "admin@example.com",
      "subject": "Daily Report",
      "body": "<p>Báo cáo hằng ngày</p>"
    }
  }'
```

**Một số cron expression phổ biến:**

| Cron | Ý nghĩa |
|---|---|
| `* * * * *` | Mỗi phút |
| `0 * * * *` | Mỗi đầu giờ |
| `0 9 * * *` | Mỗi ngày lúc 9:00 AM |
| `0 9 * * 1-5` | Thứ 2 - Thứ 6 lúc 9:00 AM |
| `0 9 1 * *` | Ngày 1 mỗi tháng lúc 9:00 AM |

---

### Webhooks

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| `POST` | `/webhook` | Đăng ký webhook URL | ✅ |
| `GET` | `/webhook` | Danh sách webhooks | ✅ |
| `DELETE` | `/webhook/:id` | Xóa webhook | ✅ |

**Ví dụ đăng ký webhook:**
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://myapp.com/webhook/job-events",
    "events": ["job.completed", "job.failed"]
  }'
```

**Các events hỗ trợ:**

| Event | Mô tả |
|---|---|
| `job.completed` | Job hoàn thành thành công |
| `job.failed` | Job thất bại sau tất cả lần retry |
| `job.cancelled` | Job bị cancel bởi user |
| `job.retried` | Job được retry thủ công |

**Payload webhook gửi đến URL của bạn:**
```json
{
  "event": "job.completed",
  "jobId": "uuid-here",
  "data": {
    "type": "SEND_EMAIL",
    "result": { "messageId": "...", "accepted": ["email@example.com"] },
    "userId": "uuid-here"
  },
  "timestamp": "2025-04-30T09:00:00.000Z"
}
```

---

### Audit Logs

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| `GET` | `/audit` | Lấy audit logs (filter, phân trang) | ✅ |

**Query parameters:**

| Param | Giá trị | Mô tả |
|---|---|---|
| `action` | xem bảng bên dưới | Lọc theo loại hành động |
| `jobId` | UUID | Lọc theo job cụ thể |
| `fromDate` | ISO datetime | Từ thời điểm nào |
| `toDate` | ISO datetime | Đến thời điểm nào |
| `page` | số nguyên | Trang hiện tại |
| `limit` | số nguyên, tối đa `100` | Số item mỗi trang |

**Các action được ghi lại:**

| Action | Mô tả |
|---|---|
| `auth.register` | Đăng ký tài khoản mới |
| `auth.login` | Đăng nhập |
| `job.created` | Tạo job |
| `job.completed` | Job hoàn thành |
| `job.failed` | Job thất bại |
| `job.cancelled` | Cancel job |
| `job.retried` | Retry job |
| `schedule.created` | Tạo schedule |
| `schedule.updated` | Cập nhật schedule |
| `schedule.toggled` | Bật/tắt schedule |
| `schedule.deleted` | Xóa schedule |
| `webhook.registered` | Đăng ký webhook |
| `webhook.deleted` | Xóa webhook |

---

### Health Check

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/health` | Liveness check — server đang chạy |
| `GET` | `/health/ready` | Readiness — DB + Redis + Queues OK |

---

## Các loại Job

### SEND_EMAIL
```json
{
  "type": "SEND_EMAIL",
  "payload": {
    "to": "recipient@example.com",
    "subject": "Tiêu đề email",
    "body": "<p>Nội dung HTML</p>"
  }
}
```

### SEND_SMS
```json
{
  "type": "SEND_SMS",
  "payload": {
    "to": "+84901234567",
    "message": "Nội dung tin nhắn SMS"
  }
}
```

### RESIZE_IMAGE
```json
{
  "type": "RESIZE_IMAGE",
  "payload": {
    "imageUrl": "https://example.com/photo.jpg",
    "width": 800,
    "height": 600,
    "format": "webp"
  }
}
```

### COMPRESS_VIDEO
```json
{
  "type": "COMPRESS_VIDEO",
  "payload": {
    "videoUrl": "https://example.com/video.mp4",
    "quality": 80
  }
}
```

### GENERATE_PDF
```json
{
  "type": "GENERATE_PDF",
  "payload": {
    "templateId": "invoice-v1",
    "data": {
      "customerName": "Nguyễn Văn A",
      "total": 1500000
    }
  }
}
```

### EXPORT_CSV
```json
{
  "type": "EXPORT_CSV",
  "payload": {
    "filename": "users-export.csv",
    "data": [
      { "id": 1, "name": "Nguyễn Văn A", "email": "a@example.com" }
    ]
  }
}
```

### CALL_WEBHOOK
```json
{
  "type": "CALL_WEBHOOK",
  "payload": {
    "url": "https://api.example.com/callback",
    "method": "POST",
    "headers": { "X-API-Key": "secret" },
    "body": { "event": "user.created", "userId": 123 }
  }
}
```
---

## Phân quyền

| Hành động | USER | ADMIN |
|---|---|---|
| Tạo job | ✅ | ✅ |
| Xem job của mình | ✅ | ✅ |
| Xem tất cả jobs | ❌ | ✅ |
| Cancel / Retry job của mình | ✅ | ✅ |
| Cancel / Retry job của người khác | ❌ | ✅ |
| Tạo / Quản lý schedule của mình | ✅ | ✅ |
| Quản lý schedule của người khác | ❌ | ✅ |
| Xem audit log của mình | ✅ | ✅ |
| Xem tất cả audit logs | ❌ | ✅ |
| Truy cập Bull Board | ❌ | ✅ (Basic Auth) |
