import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * KHO KHOÁ AI DÙNG CHUNG cho cả hai app (Toán và Lý).
 *
 * Hai app chạy trên hai dự án Supabase riêng, nên trước đây mỗi app có một bảng `ai_keys`
 * và một sổ treo `ai_key_blocks` riêng: thầy phải nhập khoá hai lần, và một khoá cạn hạn
 * mức bên Toán thì bên Lý vẫn thử lại (hạn mức của Google tính theo khoá, không theo app).
 *
 * Nay app nào khai báo hai biến môi trường
 *   KHO_KHOA_SUPABASE_URL          - URL dự án Supabase giữ kho khoá (dự án của app Toán)
 *   KHO_KHOA_SERVICE_ROLE_KEY      - service role key của dự án ấy
 * thì mọi thao tác với `ai_keys` và `ai_key_blocks` đi sang dự án đó. Không khai báo thì
 * dùng dự án của chính mình như cũ - app Toán không cần khai báo gì vì kho nằm ngay ở nó.
 *
 * Bảng `ai_models` (thứ tự model ưu tiên) vẫn để riêng từng app.
 */
export const dungKhoChung = (): boolean =>
  !!(process.env.KHO_KHOA_SUPABASE_URL && process.env.KHO_KHOA_SERVICE_ROLE_KEY);

export function createKhoKhoaClient() {
  if (!dungKhoChung()) return createAdminClient();
  return createClient(process.env.KHO_KHOA_SUPABASE_URL!, process.env.KHO_KHOA_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
