import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodType } from 'zod';

export const validate = (schema: ZodType<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let parsed: any;
    // BƯỚC 1: Parse Schema của Zod
    try {
      parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err) => ({
          field: err.path.join('.').replace(/^(body|query|params)\.?/, '') || 'payload',
          message: err.message,
        }));
        return res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors,
        });
      }

      console.error('Validation Middleware Error:', error);
      return res.status(500).json({ error: 'Internal server error during validation' });
    }

    // BƯỚC 2: Sanitize dữ liệu sạch (Fix lỗi Express req.query getter)
    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.params !== undefined) req.params = parsed.params;
    if (parsed.query !== undefined) {
      Object.defineProperty(req, 'query', {
        value: parsed.query,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    // BƯỚC 3: Chuyển tiếp Controller
    next();
  };
};
