/**
 * Đoán MỨC (1 nhận biết · 2 thông hiểu · 3 vận dụng) cho các khối ```quiz``` chưa có `muc`
 * trong một Bộ câu hỏi trò chơi, rồi ghi `muc` vào từng khối.
 *
 * Vì sao cần: bộ câu đầu tiên thầy soạn (16/9/2026, 21 câu) toàn "chưa rõ" nên trò tính
 * ±1 cả bài. Khối quiz trong app phần lớn không có mức (chỉ 1051/3741 khối có
 * sourceQuestionId để tra kho), mà ô soạn từng khối cũng không có chỗ ghi mức - nên cần
 * một nút chạy qua cả bộ. Dùng lại doanMucDoNhieuCau (bộ kiểm thử đề); mức 4 gộp về 3
 * vì trò chỉ có ba bậc điểm.
 *
 * Chỉ chạy được trên trình duyệt (gọi Gemini bằng khoá của thầy).
 */
import { doanMucDoNhieuCau, type CauCanMucDo } from './datMucDo';

const MAU_QUIZ = /```quiz\s*\n([\s\S]*?)```/g;

/** Khối quiz (JSON trong bài) → bản mà doanMucDoNhieuCau hiểu (cột như bảng questions). */
export function khoiQuizSangCauCanMucDo(id: string, k: any): CauCanMucDo {
  const pa = Array.isArray(k.options) ? k.options.map((o: any) => typeof o === 'string' ? o : o?.content) : [];
  return {
    id, content: String(k.question || ''), question_type: String(k.type || ''),
    option_a: pa[0], option_b: pa[1], option_c: pa[2], option_d: pa[3],
    explanation: [k.phuong_phap_giai, ...(Array.isArray(k.cac_buoc_thuc_hien) ? k.cac_buoc_thuc_hien : []), k.answer]
      .filter(Boolean).join(' '),
  };
}

export function demCauChuaRoMuc(markdown: string): { tong: number; chuaRo: number } {
  let tong = 0, chuaRo = 0;
  for (const x of String(markdown || '').matchAll(MAU_QUIZ)) {
    try {
      const q = JSON.parse(x[1]);
      for (const k of Array.isArray(q) ? q : [q]) {
        if (!k?.question) continue;
        tong++; if (!(Number(k.muc) > 0)) chuaRo++;
      }
    } catch { /* khối hỏng, bỏ */ }
  }
  return { tong, chuaRo };
}

export async function doanMucChoBoCau(
  markdown: string,
  onTienDo?: (xong: number, tong: number) => void,
): Promise<{ markdown: string; soDoan: number; soChuaRo: number }> {
  /* Bước 1: gom khối, nhớ vị trí để thay đúng chỗ. */
  type Khoi = { batDau: number; ketThuc: number; ds: any[]; laMang: boolean };
  const khois: Khoi[] = [];
  for (const x of String(markdown || '').matchAll(MAU_QUIZ)) {
    try {
      const q = JSON.parse(x[1]);
      khois.push({ batDau: x.index!, ketThuc: x.index! + x[0].length, ds: Array.isArray(q) ? q : [q], laMang: Array.isArray(q) });
    } catch { /* khối hỏng, để nguyên */ }
  }
  const can: { id: string; k: any }[] = [];
  khois.forEach((kh, i) => kh.ds.forEach((k, j) => {
    if (k?.question && !(Number(k.muc) > 0)) can.push({ id: `${i}-${j}`, k });
  }));
  if (!can.length) return { markdown, soDoan: 0, soChuaRo: 0 };

  /* Bước 2: hỏi AI. */
  const kq = await doanMucDoNhieuCau(can.map(({ id, k }) => khoiQuizSangCauCanMucDo(id, k)), onTienDo);

  /* Bước 3: ghi muc vào khối, dựng lại markdown từ cuối lên để vị trí không trôi. */
  let soDoan = 0;
  for (const { id, k } of can) {
    const m = Math.min(3, Number(kq[id]) || 0);
    if (m) { k.muc = m; soDoan++; }
  }
  let ra = markdown;
  for (let i = khois.length - 1; i >= 0; i--) {
    const kh = khois[i];
    if (!kh.ds.some((k, j) => can.some(c => c.id === `${i}-${j}` && Number(k.muc) > 0))) continue;
    const than = JSON.stringify(kh.laMang ? kh.ds : kh.ds[0], null, 2);
    ra = ra.slice(0, kh.batDau) + '```quiz\n' + than + '\n```' + ra.slice(kh.ketThuc);
  }
  return { markdown: ra, soDoan, soChuaRo: can.length };
}
