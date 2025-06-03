import { Context, Next } from 'hono';
import { ZodSchema } from 'zod';

export const validateRequest = <T extends ZodSchema>(schema: T) => {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const result = schema.safeParse(body);
      
      if (!result.success) {
        return c.json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          error: result.error.format(),
        }, 400);
      }
      
      // Lưu dữ liệu đã được xác thực vào context
      c.set('validatedData', result.data);
      await next();
    } catch (error) {
      return c.json({
        success: false,
        message: 'Lỗi xử lý dữ liệu',
        error: error instanceof Error ? error.message : 'Lỗi không xác định',
      }, 400);
    }
  };
};
