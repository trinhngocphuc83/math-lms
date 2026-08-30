/**
 * Tách bài giảng Markdown thành các slide trình chiếu.
 *
 * Trước đây hàm này nằm trong chính trang trình chiếu. Tách ra vì trang ĐIỀU KHIỂN trên
 * điện thoại cũng phải tách y hệt để hiện đúng "slide đang chiếu" và "slide kế tiếp" -
 * hai nơi tách khác nhau một chút là số slide lệch nhau ngay, bấm nút này ra slide khác.
 *
 * Một slide là một MẢNG các mảnh: mỗi lần nhấn tiếp lại hiện thêm một mảnh (dấu `***`).
 *
 * Quy tắc cắt, giữ nguyên như bản cũ:
 *   `---`      sang slide mới
 *   `## `      cũng sang slide mới (mỗi mục lớn một slide)
 *   ```quiz    tách thành slide riêng
 *   `***`      chia một slide thành nhiều mảnh hiện dần
 */
export function tachSlide(markdown: string): string[][] {
  const parts = String(markdown || '').split(/(?:\n|^)\s*---\s*(?:\n|$)/);
  const slides: string[][] = [];

  parts.forEach(part => {
    const subparts = part.split(/(?=(?:\n|^)##\s)/);
    subparts.forEach(sp => {
      const tokens = sp.split(/(```quiz[\s\S]*?```)/g);
      tokens.forEach(t => {
        if (t.trim()) {
          const fragments = t.split(/(?:\n|^)\s*\*\*\*\s*(?:\n|$)/).filter(f => f.trim());
          if (fragments.length > 0) slides.push(fragments);
        }
      });
    });
  });

  return slides;
}

/** Tên cũ, giữ lại cho quen tay. */
export const parseSlides = tachSlide;

/** Slide này có phải một câu hỏi tương tác không. */
export function laSlideCauHoi(slide?: string[]): boolean {
  return !!slide && !!slide[0] && slide[0].trim().startsWith('```quiz');
}

/**
 * Đánh số câu hỏi để chữa bài: "Câu 7 / 22".
 *
 * Phải đếm RIÊNG slide câu hỏi chứ không lấy luôn số slide. Đo trên đề thật: 140/143 đề
 * luyện tập toàn câu hỏi nên hai số trùng nhau, nhưng 3 đề có xen slide chữ (một đề 37
 * slide mà chỉ 14 câu) - lấy số slide thì đánh số sai hẳn.
 *
 * Máy chiếu và điện thoại đều gọi hàm này để hai bên đếm y hệt nhau.
 */
export function viTriCauHoi(slides: string[][], viTri: number): { soCau: number; tongCau: number } {
  let tongCau = 0;
  let soCau = 0;
  slides.forEach((sl, i) => {
    if (!laSlideCauHoi(sl)) return;
    tongCau += 1;
    if (i <= viTri) soCau = tongCau;
  });
  return { soCau: laSlideCauHoi(slides[viTri]) ? soCau : 0, tongCau };
}

/** Chỉ số slide của câu thứ `soCau` (đếm từ 1). Trả -1 nếu không có. */
export function slideCuaCau(slides: string[][], soCau: number): number {
  let dem = 0;
  for (let i = 0; i < slides.length; i++) {
    if (!laSlideCauHoi(slides[i])) continue;
    dem += 1;
    if (dem === soCau) return i;
  }
  return -1;
}
