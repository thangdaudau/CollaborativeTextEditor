import 'dotenv/config';

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-key',
  REDIS_URL: process.env.REDIS_URL || '',
};

if (!env.DATABASE_URL) {
  throw new Error('❌ Missing DATABASE_URL in environment variables!');
}