import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { supabase } from '../config/supabase';
import { env } from '../config/env';

// Keep files in memory — we stream them straight to Supabase Storage.
// This avoids any disk dependency (Render free tier disk is ephemeral).
const storage = multer.memoryStorage();

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpg, png, webp)'));
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
});

/**
 * Upload a file buffer to Supabase Storage and return its public URL.
 * Call this after multer has put the file into req.file (memoryStorage).
 */
export async function uploadToSupabase(file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const name = `items/${crypto.randomBytes(12).toString('hex')}${ext}`;

  const { error } = await supabase.storage
    .from(env.SUPABASE_BUCKET)
    .upload(name, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = supabase.storage.from(env.SUPABASE_BUCKET).getPublicUrl(name);
  return data.publicUrl;
}
