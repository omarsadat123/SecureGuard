import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173')
});

export function loadConfig(overrides = {}) {
  const result = schema.safeParse({ ...process.env, ...overrides });
  if (!result.success) throw new Error(`Invalid configuration: ${result.error.message}`);
  const config = result.data;
  if (config.NODE_ENV !== 'test' && !config.DATABASE_URL)
    throw new Error('DATABASE_URL is required');
  if (config.NODE_ENV !== 'test' && !config.SESSION_SECRET)
    throw new Error('SESSION_SECRET is required');
  return config;
}
