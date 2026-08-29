/**
 * Tìm công thức trong Sổ tay - dùng chung cho hộp tra nhanh lúc làm bài và trang Sổ tay.
 *
 * Vì sao phải viết lại: bản cũ đòi CẢ CỤM từ khoá xuất hiện liền nhau (`.includes(cả cụm)`).
 * Chạy thử trên 236 công thức thật của kho:
 *
 *   "dao ham sin"           -> 0 kết quả
 *   "ghép nhóm phương sai"  -> 0 kết quả   (đúng từ, sai thứ tự)
 *   "tích phân từng phần"   -> 0 kết quả
 *   "x"                     -> 133 kết quả (56% cả sổ tay), cái đúng đứng thứ 9
 *
 * Ba trên bốn câu hỏi nhiều từ tự nhiên trả về RỖNG. Điều đó cũng giết luôn việc tìm bằng
 * giọng nói trước khi nó kịp chạy: người nói không đọc ra một cụm gọn như lúc gõ, mà nói cả
 * câu "đạo hàm của hàm sin".
 *
 * Cách mới: tách từ khoá thành các TỪ, đòi khớp ĐỦ các từ nhưng không cần đúng thứ tự, rồi
 * xếp hạng theo chỗ khớp - tiêu đề nặng hơn mô tả, mô tả nặng hơn tên chương, LaTeX nhẹ nhất.
 */

export interface CongThuc {
  id: string;
  title: string;
  latex_content: string | null;
  description: string | null;
  image_url: string | null;
  category_id: string | null;
}

/** Bỏ dấu tiếng Việt để gõ "dao ham" cũng tìm ra "đạo hàm". */
export const boDau = (s: string): string =>
  String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/\s+/g, ' ').trim();

/** Điểm cho từng chỗ khớp. Tiêu đề là nơi đáng tin nhất, LaTeX thô là nơi ít tin nhất. */
const DIEM = { tieuDe: 10, moTa: 4, chuong: 2, latex: 1 };

/**
 * Từ ngắn thì KHÔNG dò trong LaTeX thô. Gõ "x" mà dò LaTeX là trúng gần như mọi công thức
 * (đo được: 133/236). Ba ký tự trở lên mới đủ đặc trưng để dò trong công thức.
 */
const DAI_TOI_THIEU_DO_LATEX = 3;

export function timCongThuc(
  tuKhoa: string,
  dsCongThuc: CongThuc[],
  tenDanhMuc: Map<string, string>,
  gioiHan = 60,
): CongThuc[] {
  const cum = boDau(tuKhoa);
  const tu = cum.split(' ').filter(Boolean);
  if (tu.length === 0) return [];

  const chamDiem = (c: CongThuc): number | null => {
    const tieuDe = boDau(c.title);
    const moTa = boDau(c.description || '');
    const chuong = boDau(tenDanhMuc.get(c.category_id || '') || '');
    const latex = boDau(c.latex_content || '');

    let diem = 0;
    for (const w of tu) {
      if (tieuDe.includes(w)) diem += DIEM.tieuDe;
      else if (moTa.includes(w)) diem += DIEM.moTa;
      else if (chuong.includes(w)) diem += DIEM.chuong;
      else if (w.length >= DAI_TOI_THIEU_DO_LATEX && latex.includes(w)) diem += DIEM.latex;
      // Thiếu dù chỉ một từ là loại - nhờ vậy "đạo hàm sin" không trả về mọi công thức đạo hàm
      else return null;
    }

    // Gõ trúng khít tên công thức thì phải đứng đầu, không để nó lẫn giữa hàng chục cái khác
    if (tieuDe === cum) diem += 50;
    else if (tieuDe.startsWith(cum)) diem += 20;

    return diem;
  };

  return dsCongThuc
    .map(c => ({ c, diem: chamDiem(c) }))
    .filter((x): x is { c: CongThuc; diem: number } => x.diem !== null)
    .sort((a, b) => b.diem - a.diem || a.c.title.localeCompare(b.c.title, 'vi'))
    .slice(0, gioiHan)
    .map(x => x.c);
}
