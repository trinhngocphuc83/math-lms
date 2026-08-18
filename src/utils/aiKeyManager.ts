import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Sổ treo khoá AI: khoá nào bị Google từ chối vì cạn hạn mức thì treo lại 24 giờ để
 * lần gọi sau không phí thời gian thử lại.
 *
 * Treo theo CẶP (khoá, model), không treo cả khoá. Google tính hạn mức riêng cho từng
 * model, nên một khoá cạn hạn mức ở gemini-3.7-flash vẫn còn nguyên hạn mức ở
 * gemini-3.5-flash. Bản trước chỉ có một cột blocked_at dùng chung nên treo nhầm khoá
 * cho mọi model - cạn một model là mất luôn cả khoá, đúng lúc cần xoay model nhất.
 *
 * Dữ liệu nằm ở bảng `ai_key_blocks`. Bảng chưa được tạo thì coi như chưa treo khoá nào
 * (cùng lắm tốn thêm một lượt thử) chứ không làm hỏng cả lượt gọi.
 */

const HAN_TREO_MS = 24 * 60 * 60 * 1000; // 24 giờ

/** Khoá nào đang bị treo. Truyền modelId để hỏi riêng một model. */
export const getBlockedKeys = async (
  modelId?: string,
): Promise<Record<string, { blockedAt: number; reason: string; model: string }>> => {
  try {
    const supabase = createAdminClient();
    let truyVan = supabase
      .from('ai_key_blocks')
      .select('api_key, model_id, blocked_at, block_reason')
      .gte('blocked_at', new Date(Date.now() - HAN_TREO_MS).toISOString());
    if (modelId) truyVan = truyVan.eq('model_id', modelId);

    const { data, error } = await truyVan;
    if (error) {
      console.warn('[KeyManager] Không đọc được sổ treo khoá:', error.message);
      return {};
    }
    const ra: Record<string, { blockedAt: number; reason: string; model: string }> = {};
    (data || []).forEach(r => {
      // Không truyền modelId thì gộp chung, khoá nào treo ở bất kỳ model nào cũng có mặt.
      const khoa = modelId ? (r.api_key as string) : `${r.api_key}|${r.model_id}`;
      ra[khoa] = {
        blockedAt: new Date(r.blocked_at as string).getTime(),
        reason: (r.block_reason as string) || '',
        model: r.model_id as string,
      };
    });
    return ra;
  } catch (err: any) {
    console.warn('[KeyManager] Lỗi kết nối CSDL khi đọc sổ treo khoá:', err?.message);
    return {};
  }
};

/** Treo một khoá ở đúng model vừa báo cạn hạn mức. */
export const blockKey = async (key: string, reason: string, modelId: string): Promise<void> => {
  if (!modelId) {
    console.warn('[KeyManager] Bỏ qua lệnh treo khoá vì thiếu tên model.');
    return;
  }
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('ai_key_blocks')
      .upsert(
        {
          api_key: key,
          model_id: modelId,
          blocked_at: new Date().toISOString(),
          block_reason: reason?.slice(0, 500) || '',
        },
        { onConflict: 'api_key,model_id' },
      );
    if (error) throw error;
    console.log(`[KeyManager] Đã treo khoá ***${key.slice(-4)} ở model ${modelId}: ${reason?.slice(0, 80)}`);
  } catch (err: any) {
    console.warn('[KeyManager] Không treo được khoá:', err?.message);
  }
};

/** Bỏ những khoá đang bị treo ở model này ra khỏi danh sách trước khi đem đi gọi. */
export const filterCleanKeys = async (allKeys: string[], modelId: string): Promise<string[]> => {
  if (!modelId) return allKeys;
  const treo = await getBlockedKeys(modelId);
  return allKeys.filter(k => !treo[k]);
};

/**
 * Bảng tổng hợp cho trang Trạm kiểm soát Cổng A.I: mỗi model đang treo mấy khoá.
 */
export const thongKeKhoaBiTreo = async (): Promise<Record<string, number>> => {
  const treo = await getBlockedKeys();
  const dem: Record<string, number> = {};
  Object.values(treo).forEach(t => { dem[t.model] = (dem[t.model] || 0) + 1; });
  return dem;
};
