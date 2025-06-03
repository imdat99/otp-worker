import type { Redis } from '@upstash/redis/cloudflare';

// Khai báo kiểu cho các biến môi trường Cloudflare
interface CloudflareBindings {
  // Biến môi trường cho Upstash Redis
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  
  // Thêm các biến môi trường khác nếu cần
}

// Khai báo kiểu cho các biến trong context Hono
declare module 'hono' {
  interface ContextVariableMap {
    redis: Redis;
  }
}
