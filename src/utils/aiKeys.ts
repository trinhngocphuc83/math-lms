import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Quản lý danh sách khoá API Gemini.
 *
 * Khoá đến từ HAI nguồn, cộng dồn:
 *   1. Biến môi trường: GEMINI_API_KEY, GEMINI_API_KEY_1 .. _20 (khai báo lúc triển khai)
 *   2. Bảng `ai_keys` trong CSDL - khoá thầy cô tự thêm qua trang "Trạm kiểm soát Cổng A.I"
 *
 * TRƯỚC ĐÂY nguồn 2 lưu bằng fs.writeFileSync vào ai_keys.json trong thư mục dự án.
 * Cách đó chỉ chạy trên máy cá nhân: Vercel có hệ thống tệp CHỈ ĐỌC nên ghi sẽ lỗi, mà
 * file cũng không nằm trong Git nên bản đã triển khai không hề có - khoá thêm qua giao
 * diện coi như mất trắng. Nay chuyển hẳn sang CSDL.
 *
 * Bảng `ai_keys` bật bảo vệ dòng và KHÔNG có policy nào, nên chỉ máy chủ (service role)
 * đọc được; trình duyệt không thể lấy khoá API ra.
 */

/** Khoá khai báo sẵn trong biến môi trường lúc triển khai. */
const layKeyMoiTruong = (): string[] => {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  for (let i = 1; i <= 20; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  return Array.from(new Set(keys.map(k => k.trim()).filter(Boolean)));
};

/** Che khoá để bày lên màn hình: 6 kí tự đầu + 4 kí tự cuối, đủ nhận ra mà không lộ. */
export const cheKhoa = (k: string): string => (k.length <= 12 ? k.slice(0, 3) + '…' : `${k.slice(0, 6)}…${k.slice(-4)}`);

/**
 * Tách một đoạn chữ dán vào thành danh sách khoá: thầy hay dán cả chục khoá vào MỘT ô,
 * mỗi khoá một dòng hoặc cách nhau bằng dấu phẩy - bản trước coi cả đoạn là một khoá
 * (dài ngoằng, Google từ chối) nên "thêm 9 khoá" mà hệ thống chỉ đếm được 1.
 */
export const tachKhoa = (text: string): string[] =>
  Array.from(new Set(String(text || '').split(/[\s,;]+/).map(k => k.trim()).filter(k => k.length >= 20)));

/** Khoá lõi (biến môi trường) đã che, để trang quản lý bày ra cho thầy đối chiếu. */
export const getEnvKeysMasked = (): string[] => layKeyMoiTruong().map(cheKhoa);

/**
 * Chép khoá lõi (biến môi trường của bản đang chạy) vào bảng ai_keys, bỏ qua khoá đã có.
 * Sau bước này thầy có thể xoá dần biến môi trường trên Vercel - mọi khoá nằm gọn trong CSDL,
 * sửa/xoá ngay trên trang quản lý, không phải triển khai lại.
 */
export const importEnvKeysToDb = async (): Promise<{ them: number; daCo: number; loi?: string }> => {
  const env = layKeyMoiTruong();
  try {
    const supabase = createAdminClient();
    const hienCo = new Set((await docBangKhoa()).map(r => r.api_key));
    const canThem = env.filter(k => !hienCo.has(k));
    if (canThem.length > 0) {
      const { error } = await supabase.from('ai_keys').insert(canThem.map(api_key => ({ api_key })));
      if (error) throw error;
    }
    return { them: canThem.length, daCo: env.length - canThem.length };
  } catch (err: any) {
    console.error('[aiKeys] Lỗi chép khoá lõi vào CSDL:', err?.message);
    return { them: 0, daCo: 0, loi: err?.message };
  }
};

/**
 * Đọc bảng ai_keys. Bảng chưa được tạo (hoặc CSDL trục trặc) thì trả mảng rỗng thay vì
 * ném lỗi - để toàn bộ tính năng AI vẫn chạy được bằng khoá trong biến môi trường.
 */
async function docBangKhoa(): Promise<{ api_key: string; blocked_at: string | null; block_reason: string | null }[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('ai_keys')
      .select('api_key, blocked_at, block_reason')
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('[aiKeys] Không đọc được bảng ai_keys:', error.message);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.warn('[aiKeys] Lỗi kết nối CSDL khi đọc khoá:', err?.message);
    return [];
  }
}

/** Toàn bộ khoá khả dụng: biến môi trường + khoá thêm tay, đã bỏ trùng và bỏ rỗng. */
export const getAllAIKeys = async (): Promise<string[]> => {
  const themTay = (await docBangKhoa()).map(r => r.api_key);
  const tatCa = [...layKeyMoiTruong(), ...themTay];
  return Array.from(new Set(tatCa.filter(k => k && k.trim() !== '')));
};

/** Chỉ các khoá thầy cô tự thêm (để hiện lên trang quản lý cho sửa/xoá). */
export const getCustomKeys = async (): Promise<string[]> => {
  return (await docBangKhoa()).map(r => r.api_key);
};

/**
 * Lưu lại danh sách khoá thêm tay: khoá nào không còn trong danh sách thì xoá, khoá mới
 * thì thêm. Giữ nguyên trạng thái "đang bị treo" của những khoá cũ vẫn còn.
 */
export const saveCustomKeys = async (newKeys: string[]): Promise<boolean> => {
  // Mỗi phần tử có thể là một khoá hoặc cả một đoạn dán nhiều khoá - tách hết ra
  const hopLe = Array.from(new Set(newKeys.flatMap(tachKhoa)));
  try {
    const supabase = createAdminClient();
    const hienCo = (await docBangKhoa()).map(r => r.api_key);

    const canXoa = hienCo.filter(k => !hopLe.includes(k));
    if (canXoa.length > 0) {
      const { error } = await supabase.from('ai_keys').delete().in('api_key', canXoa);
      if (error) throw error;
    }

    const canThem = hopLe.filter(k => !hienCo.includes(k));
    if (canThem.length > 0) {
      const { error } = await supabase.from('ai_keys').insert(canThem.map(api_key => ({ api_key })));
      if (error) throw error;
    }
    return true;
  } catch (err: any) {
    console.error('[aiKeys] Lỗi lưu khoá vào CSDL:', err?.message);
    return false;
  }
};
