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
