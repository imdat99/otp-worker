import { Redis } from "@upstash/redis/cloudflare";

// OTP sẽ hết hạn sau một khoảng thời gian nhất định (tính bằng giây)
const OTP_EXPIRY_SECONDS = 5 * 60; // 5 phút
// const OTP_EXPIRY_SECONDS = 10; // 5 phút

export interface OtpOptions {
  length?: number;      // Độ dài của mã OTP
  expiry?: number;      // Thời gian hết hạn (giây)
  prefix?: string;      // Tiền tố cho key trong Redis
}

export class OtpService {
  private redis: Redis;
  private options: Required<OtpOptions>;

  constructor(redis: Redis, options?: OtpOptions) {
    this.redis = redis;
    this.options = {
      length: options?.length || 6,
      expiry: options?.expiry || OTP_EXPIRY_SECONDS,
      prefix: options?.prefix || 'otp:'
    };
  }

  /**
   * Tạo một mã OTP mới cho một identifier cụ thể (email, số điện thoại, etc.)
   */
  async generateOtp(identifier: string): Promise<string> {
    // Tạo mã OTP ngẫu nhiên với độ dài cụ thể
    const otp = this.generateRandomOtp(this.options.length);
    
    // Lưu OTP vào Redis với thời gian hết hạn
    const key = this.getRedisKey(identifier);
    await this.redis.set(key, otp, { ex: this.options.expiry });
    
    return otp;
  }

  /**
   * Xác thực một mã OTP đã nhập
   */
  async verifyOtp(identifier: string, inputOtp: string): Promise<boolean> {
    const key = this.getRedisKey(identifier);
    
    // Lấy OTP từ Redis
    const storedOtp = await this.redis.get<string>(key);
    
    // Nếu không tìm thấy OTP hoặc OTP không khớp
    if (!storedOtp || storedOtp !== inputOtp) {
      return false;
    }
    
    // OTP hợp lệ, xóa nó khỏi Redis để không thể sử dụng lại
    await this.redis.del(key);
    
    return true;
  }

  /**
   * Kiểm tra xem một identifier đã có mã OTP hay chưa
   */
  async hasExistingOtp(identifier: string): Promise<boolean> {
    const key = this.getRedisKey(identifier);
    return await this.redis.exists(key) > 0;
  }

  /**
   * Xóa một OTP hiện có
   */
  async deleteOtp(identifier: string): Promise<void> {
    const key = this.getRedisKey(identifier);
    await this.redis.del(key);
  }

  /**
   * Trả về thời gian còn lại (giây) trước khi OTP hết hạn
   * Trả về -1 nếu không tìm thấy OTP
   */
  async getRemainingTime(identifier: string): Promise<number> {
    const key = this.getRedisKey(identifier);
    const ttl = await this.redis.ttl(key);
    return ttl;
  }

  /**
   * Tạo một key Redis cho identifier
   */
  private getRedisKey(identifier: string): string {
    return `${this.options.prefix}${identifier}`;
  }

  /**
   * Tạo một mã OTP ngẫu nhiên
   */
  private generateRandomOtp(length: number): string {
    // Tạo OTP chỉ bao gồm chữ số
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += Math.floor(Math.random() * 10);
    }
    return otp;
  }
}
