import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Service-role client — server-side only, never expose to browser
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
