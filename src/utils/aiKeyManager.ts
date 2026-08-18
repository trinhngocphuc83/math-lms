import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Sổ đen khoá AI: khoá nào bị Google từ chối vì cạn hạn mức thì treo lại 24 giờ để
 * lần gọi sau không phí thời gian thử lại.
 *
 * Trước đây ghi vào blocked_ai_keys.json trong thư mục dự án - không chạy được trên
 * Vercel (hệ thống tệp chỉ đọc) nên trên bản online sổ đen luôn rỗng, lần nào cũng thử
 * lại đúng những khoá đã cạn. Nay lưu vào cột blocked_at của bảng `ai_keys`.
 *
 * Chỉ treo được khoá thầy cô tự thêm (có dòng trong bảng). Khoá khai báo trong biến môi
 * trường không có dòng nào để đánh dấu, nên được ghi thêm một dòng riêng khi bị treo.
 */

const HAN_TREO_MS = 24 * 60 * 60 * 1000; // 24 giờ

/** Danh sách khoá đang bị treo (đã bỏ những khoá quá 24 giờ). */
export const getBlockedKeys = async (): Promise<Record<string, { blockedAt: number; reason: string }>> => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('ai_keys')
      .select('api_key, blocked_at, block_reason')
      .not('blocked_at', 'is', null);
    if (error) {
      console.warn('[KeyManager] Không đọc được sổ đen:', error.message);
      return {};
    }
    const ra: Record<string, { blockedAt: number; reason: string }> = {};
    const now = Date.now();
    (data || []).forEach(r => {
      const moc = new Date(r.blocked_at as string).getTime();
      if (now - moc <= HAN_TREO_MS) {
        ra[r.api_key] = { blockedAt: moc, reason: r.block_reason || '' };
      }
    });
    return ra;
  } catch (err: any) {
    console.warn('[KeyManager] Lỗi kết nối CSDL khi đọc sổ đen:', err?.message);
    return {};
  }
};

/** Treo một khoá lại vì cạn hạn mức. */
export const blockKey = async (key: string, reason: string): Promise<void> => {
  try {
    const supabase = createAdminClient();
    // upsert: khoá thêm tay thì cập nhật dòng sẵn có; khoá từ biến môi trường thì tạo
    // dòng mới chỉ để ghi nhận trạng thái treo.
    const { error } = await supabase
      .from('ai_keys')
      .upsert(
        { api_key: key, blocked_at: new Date().toISOString(), block_reason: reason?.slice(0, 500) || '' },
        { onConflict: 'api_key' },
      );
    if (error) throw error;
    console.log(`[KeyManager] Đã treo khoá ***${key.slice(-4)}: ${reason?.slice(0, 80)}`);
  } catch (err: any) {
    console.warn('[KeyManager] Không treo được khoá:', err?.message);
  }
};

/** Bỏ những khoá đang bị treo ra khỏi danh sách trước khi đem đi gọi Gemini. */
export const filterCleanKeys = async (allKeys: string[]): Promise<string[]> => {
  const treo = await getBlockedKeys();
  return allKeys.filter(k => !treo[k]);
};
