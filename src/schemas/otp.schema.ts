import { z } from 'zod';

// Schema cho request tạo OTP
export const generateOtpSchema = z.object({
  identifier: z.string().min(1, 'Identifier là bắt buộc').max(100),
  type: z.enum(['email', 'phone', 'username']).default('email'),
  purpose: z.enum(['registration', 'login', 'password-reset', 'verification']),
});

// Schema cho request xác thực OTP
export const verifyOtpSchema = z.object({
  identifier: z.string().min(1, 'Identifier là bắt buộc').max(100),
  otp: z.string().min(1, 'OTP là bắt buộc'),
  type: z.enum(['email', 'phone', 'username']).default('email'),
  purpose: z.enum(['registration', 'login', 'password-reset', 'verification']),
});

// Schema cho response API
export const apiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional(),
  error: z.any().optional(),
});
