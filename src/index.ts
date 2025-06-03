import { Hono } from 'hono'
import { Redis } from "@upstash/redis/cloudflare";
import { OtpService } from './services/otp';
import { generateOtpSchema, verifyOtpSchema } from './schemas/otp.schema';
import { validateRequest } from './middleware/validator';
import { cache } from 'hono/cache';

type Bindings = {
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
}

interface RedisVariables {
  redis: Redis;
  otpService: OtpService;
  validatedData?: any;
}

const app = new Hono<{ Bindings: Bindings, Variables: RedisVariables }>()

// Middleware để khởi tạo Redis và OtpService một lần duy nhất
app.use('*', async (c, next) => {
  // Chỉ khởi tạo Redis và OtpService khi cần xử lý OTP
  const redis = new Redis({
    url: c.env.UPSTASH_REDIS_REST_URL,
    token: c.env.UPSTASH_REDIS_REST_TOKEN,
  })
  c.set('redis', redis)
  
  // Khởi tạo dịch vụ OTP với cấu hình tối ưu
  const otpService = new OtpService(redis, {
    length: 6, 
    expiry: 5 * 60, // 5 phút
    prefix: 'otp:'
  })
  c.set('otpService', otpService)
  
  await next()
})

// Cache trang chính trong 60s để tăng hiệu năng
app.get('/', cache({ cacheName: 'otp-api', cacheControl: 'max-age=60' }), async (c) => {
  return c.json({
    message: 'OTP Service API',
    endpoints: {
      generateOtp: '/api/otp/generate',
      verifyOtp: '/api/otp/verify',
      documentation: '/api/docs'
    }
  })
})


// API tạo mã OTP
app.post('/api/otp/generate', validateRequest(generateOtpSchema), async (c) => {
  try {
    const data = c.get('validatedData');
    const { identifier, type, purpose } = data;
    
    const otpService = c.get('otpService');

    // Kiểm tra nếu identifier đã có OTP, không cho phép tạo liên tục
    const hasExistingOtp = await otpService.hasExistingOtp(identifier);
    if (hasExistingOtp) {
      // Lấy thời gian còn lại - thực hiện song song để tối ưu
      const remainingTime = await otpService.getRemainingTime(identifier);
      return c.json({
        success: false,
        message: `Mã OTP đã được tạo, vui lòng đợi ${remainingTime} giây trước khi thử lại.`,
        data: { remainingTime }
      }, 429); // Too Many Requests
    }

    // Tạo OTP mới
    const otp = await otpService.generateOtp(identifier);
    
    // Tối ưu: Lấy thời gian hết hạn đồng thời với việc gửi response
    const expiresInPromise = otpService.getRemainingTime(identifier);
    
    // Trong thực tế, bạn sẽ gửi OTP qua email hoặc SMS ở đây
    // Background task cho việc gửi email/SMS (không block request)
    c.executionCtx.waitUntil(Promise.resolve().then(async () => {
      // Code gửi email/SMS sẽ ở đây
      // sendOtpNotification(identifier, type, otp); 
    }));
    
    // Đợi kết quả của expiresIn
    const expiresIn = await expiresInPromise;
    
    return c.json({
      success: true,
      message: 'Mã OTP đã được tạo thành công',
      data: { 
        otp, // Chỉ trả về OTP trong môi trường phát triển/test
        identifier,
        type,
        purpose,
        expiresIn
      }
    });
  } catch (error) {
    // Log lỗi, trong Cloudflare Workers ta dùng c.executionCtx.waitUntil để log
    c.executionCtx.waitUntil(Promise.resolve().then(() => {
      console.error('Error generating OTP:', error);
    }));
    return c.json({
      success: false,
      message: 'Không thể tạo mã OTP',
      error: error instanceof Error ? error.message : 'Lỗi không xác định',
    }, 500);
  }
});
// API xác thực mã OTP
app.post('/api/otp/verify', validateRequest(verifyOtpSchema), async (c) => {
  try {
    const data = c.get('validatedData');
    const { identifier, otp } = data;
    
    const otpService = c.get('otpService');
    
    // Xác thực OTP
    const isValid = await otpService.verifyOtp(identifier, otp);
    
    if (!isValid) {
      return c.json({
        success: false,
        message: 'Mã OTP không hợp lệ hoặc đã hết hạn',
      }, 400);
    }
    
    return c.json({
      success: true,
      message: 'Xác thực OTP thành công',
      data: { verified: true }
    });
  } catch (error) {
    c.executionCtx.waitUntil(Promise.resolve().then(() => {
      console.error('Error verifying OTP:', error);
    }));
    return c.json({
      success: false,
      message: 'Không thể xác thực mã OTP',
      error: error instanceof Error ? error.message : 'Lỗi không xác định',
    }, 500);
  }
});

export default app
