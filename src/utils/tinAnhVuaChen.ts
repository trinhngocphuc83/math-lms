/**
 * Loa báo "vừa chèn xong một tấm ảnh vào ô soạn thảo".
 *
 * Vì sao phải có: ô soạn thảo (RichTextarea) nằm sâu ba tầng dưới trang soạn bài
 * (page.tsx -> BlockEditor -> OSuaTaiCho -> RichTextarea) và được dựng ở hơn chục chỗ.
 * Trang soạn bài cần biết ảnh vừa rơi vào đâu để chèn luôn sang bản còn lại (E-learning /
 * Trình chiếu là HAI bản chữ riêng - chèn ảnh ở bản này thì bản kia không có, đó chính là
 * cảnh "chèn ảnh vào ô soạn thảo mà màn trình chiếu không thấy đâu"). Luồn một tham số
 * qua ngần ấy chỗ thì rối, nên báo bằng một cái loa nhỏ ở đây.
 *
 * Không ai đăng ký nghe thì lời báo rơi vào im lặng - các trang khác vẫn chạy như cũ.
 */
export interface TinAnhVuaChen {
  /** Đúng chuỗi Markdown của tấm ảnh, ví dụ `![Hình ảnh](https://...)`. */
  anhMd: string;
  /** Dòng chữ ngay TRÊN tấm ảnh - dùng để tìm đúng chỗ ấy ở bản còn lại. */
  neo: string;
}

const nguoiNghe = new Set<(tin: TinAnhVuaChen) => void>();

/** Đăng ký nghe. Trả về hàm bỏ nghe (gọi trong phần dọn dẹp của useEffect). */
export function nghenAnhVuaChen(f: (tin: TinAnhVuaChen) => void): () => void {
  nguoiNghe.add(f);
  return () => { nguoiNghe.delete(f); };
}

export function baoAnhVuaChen(tin: TinAnhVuaChen): void {
  nguoiNghe.forEach(f => {
    try { f(tin); } catch { /* một người nghe hỏng thì không được kéo cả ô soạn thảo hỏng theo */ }
  });
}
