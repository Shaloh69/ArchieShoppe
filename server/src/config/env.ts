import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ACCESS_TOKEN_SECRET: z.string().min(16, 'ACCESS_TOKEN_SECRET must be at least 16 chars'),
  REFRESH_TOKEN_SECRET: z.string().min(16, 'REFRESH_TOKEN_SECRET must be at least 16 chars'),
  PAYMONGO_SECRET_KEY: z.string().default('sk_test_placeholder'),
  PAYMONGO_WEBHOOK_SECRET: z.string().default('whsec_placeholder'),
  PYTHON_SERVER_URL: z.string().url().default('http://localhost:8001'),
  PYTHON_API_KEY: z.string().default('dev-api-key'),
  // Comma-separated list of allowed CORS origins (e.g. "https://a.com,https://b.com")
  CLIENT_URL: z.string().default('http://localhost:3000'),
  ADMIN_EMAIL: z.string().email().default('admin@unithrift.edu.ph'),
  ADMIN_PASSWORD: z.string().default('AdminPassword123!'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  // Supabase Storage
  SUPABASE_URL: z.string().url().default('https://placeholder.supabase.co'),
  SUPABASE_SERVICE_KEY: z.string().default('placeholder'),
  SUPABASE_BUCKET: z.string().default('unithriftMedia'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
