/**
 * Trò chơi trên lớp — phần dùng chung phía trình duyệt (máy chiếu và điện thoại).
 */

/** Điểm một câu theo mức thầy chốt 16/9/2026: nhận biết ±1, thông hiểu ±2, vận dụng ±3. */
export const diemTheoMuc = (muc: number): number => (muc >= 3 ? 3 : muc === 2 ? 2 : 1);

export const TEN_MUC: Record<number, string> = { 0: 'Nhận biết', 1: 'Nhận biết', 2: 'Thông hiểu', 3: 'Vận dụng', 4: 'Vận dụng cao' };

/** Xáo mảng (Fisher–Yates), trả mảng mới. */
export function xao<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/**
 * So câu trả lời ngắn với đáp án: bỏ khoảng trắng, coi dấu phẩy và dấu chấm thập phân như
 * nhau, so số nếu cả hai là số (để "3.5" = "3,5" = "3,50"), còn lại so chữ không phân biệt hoa thường.
 */
export function khopTraLoiNgan(traLoi: string, dapAn: string): boolean {
  const chuan = (s: string) => String(s || '').replace(/\s+/g, '').replace(/\$/g, '').replace(',', '.').toLowerCase();
  const a = chuan(traLoi), b = chuan(dapAn);
  if (!a) return false;
  const na = Number(a), nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return Math.abs(na - nb) < 1e-9;
  return a === b;
}

/** Nhãn loại câu để bày lên màn hình / điện thoại */
export const TEN_LOAI: Record<string, string> = {
  multiple_choice: 'Trắc nghiệm', true_false: 'Đúng/Sai', true_false_cluster: 'Đúng/Sai 4 ý',
  short_answer: 'Trả lời ngắn', essay: 'Tự luận',
};
