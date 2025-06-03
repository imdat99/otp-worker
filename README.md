# Cloudflare Workers OTP Service

Dịch vụ xác thực một lần (OTP) chạy trên Cloudflare Workers sử dụng Hono Framework và Upstash Redis.

## Tính năng

- ✅ Tạo mã OTP với độ dài tùy chỉnh
- ✅ Xác thực mã OTP
- ✅ Hạn chế tần suất tạo mã OTP
- ✅ Thời gian hết hạn có thể cấu hình
- ✅ Lưu trữ OTP bằng Redis
- ✅ Hiệu suất cao và khả năng mở rộng tốt
- ✅ API RESTful tiêu chuẩn

## Cài đặt

1. Clone repository:

```bash
git clone https://github.com/username/cloudflare_otp.git
cd cloudflare_otp
```

2. Cài đặt các dependencies:

```bash
npm install
```

3. Sao chép file `wrangler.jsonc.example` thành `wrangler.jsonc` và cấu hình các biến môi trường:

```bash
cp wrangler.jsonc.example wrangler.jsonc
```

4. Cập nhật các biến môi trường trong `wrangler.jsonc`:

```json
{
  "vars": {
    "UPSTASH_REDIS_REST_URL": "https://your-redis-url.upstash.io",
    "UPSTASH_REDIS_REST_TOKEN": "your-redis-token"
  }
}
```

## Phát triển cục bộ

Để chạy dịch vụ trong môi trường phát triển cục bộ:

```bash
npm run dev
```

Ứng dụng sẽ chạy tại địa chỉ `http://127.0.0.1:8787`.

## Triển khai

Để triển khai ứng dụng lên Cloudflare Workers:

```bash
npm run deploy
```

## API Documentation

### Tạo mã OTP

```
POST /api/otp/generate
```

**Body Request**:

```json
{
  "identifier": "user@example.com",  // Email hoặc số điện thoại
  "type": "email",                   // "email", "phone", hoặc "username"
  "purpose": "verification"          // "registration", "login", "password-reset", hoặc "verification"
}
```

**Phản hồi thành công (200 OK)**:

```json
{
  "success": true,
  "message": "Mã OTP đã được tạo thành công",
  "data": {
    "otp": "123456",
    "identifier": "user@example.com",
    "type": "email",
    "purpose": "verification",
    "expiresIn": 300
  }
}
```

**Phản hồi lỗi (429 Too Many Requests)**:

```json
{
  "success": false,
  "message": "Mã OTP đã được tạo, vui lòng đợi 280 giây trước khi thử lại.",
  "data": {
    "remainingTime": 280
  }
}
```

### Xác thực mã OTP

```
POST /api/otp/verify
```

**Body Request**:

```json
{
  "identifier": "user@example.com",  // Email hoặc số điện thoại
  "otp": "123456",                   // Mã OTP nhận được
  "type": "email",                   // "email", "phone", hoặc "username"
  "purpose": "verification"          // "registration", "login", "password-reset", hoặc "verification"
}
```

**Phản hồi thành công (200 OK)**:

```json
{
  "success": true,
  "message": "Xác thực OTP thành công",
  "data": {
    "verified": true
  }
}
```

**Phản hồi lỗi (400 Bad Request)**:

```json
{
  "success": false,
  "message": "Mã OTP không hợp lệ hoặc đã hết hạn"
}
```

## Cấu trúc dự án

```
├── src/                       # Mã nguồn
│   ├── index.ts               # Điểm khởi đầu ứng dụng
│   ├── middleware/            # Middleware
│   │   └── validator.ts       # Xác thực request
│   ├── schemas/               # Schemas cho xác thực dữ liệu
│   │   └── otp.schema.ts      # Schema cho OTP
│   └── services/              # Các dịch vụ
│       └── otp.ts             # Dịch vụ xử lý OTP
├── package.json               # Dependencies
├── tsconfig.json              # Cấu hình TypeScript
└── wrangler.jsonc             # Cấu hình Cloudflare Workers
```

## Tùy chỉnh

Bạn có thể tùy chỉnh dịch vụ OTP bằng cách sửa đổi các tùy chọn trong file `src/index.ts`:

```typescript
const otpService = new OtpService(redis, {
  length: 6,              // Độ dài của mã OTP
  expiry: 5 * 60,         // Thời gian hết hạn (giây)
  prefix: 'otp:'          // Tiền tố cho key trong Redis
})
```

## Tối ưu hiệu suất

Dịch vụ đã được tối ưu hóa cho hiệu suất với:

1. **Caching**: Trang chính được cache trong 60 giây
2. **Background Processing**: Các tác vụ không cần thiết được xử lý nền
3. **Tối ưu Redis**: Sử dụng Redis để lưu trữ dữ liệu tạm thời
4. **Xử lý bất đồng bộ**: Sử dụng Promise để xử lý song song khi có thể

## Bảo mật

- Mã OTP chỉ được sử dụng một lần và bị xóa sau khi xác thực thành công
- Mã OTP có thời gian hết hạn (mặc định: 5 phút)
- Giới hạn tạo mã OTP liên tục để ngăn chặn tấn công brute-force

## Lưu ý cho nhà phát triển

Để tạo/đồng bộ hóa các kiểu dữ liệu dựa trên cấu hình Worker của bạn, hãy chạy:

```bash
npm run cf-typegen
```

Sau đó sử dụng `CloudflareBindings` trong mã của bạn:

```typescript
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## Giấy phép

MIT
