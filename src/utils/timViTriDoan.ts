/**
 * Tìm xem một đoạn chữ ĐANG HIỂN THỊ nằm ở chỗ nào trong mã Markdown gốc.
 *
 * Dùng khi thầy cô nhấp vào một đoạn của bài giảng để sửa: phải mở ô soạn ĐÚNG CHỖ ĐÓ,
 * chứ không phải quăng con trỏ xuống cuối khối - bài lý thuyết trung bình 8.767 ký tự,
 * rơi xuống đáy rồi lại phải cuộn ngược lên mò.
 *
 * SO THEO TỪ, KHÔNG SO THEO KÝ TỰ. Đo trên bài thật: mã gốc ghi
 *
 *     #### Trong đó $\color{blue} a, b, c$ là những số thực đã cho
 *
 * còn màn hình hiện "Trong đó a,b,c là những số thực đã cho". So từng ký tự thì lệch ngay
 * ở chữ thứ tám, vì `\color{blue}` có chữ trong mã mà không có trên màn hình. Ngược lại
 * `\alpha` thì mã có chữ "alpha" còn màn hình lại là ký hiệu α. Nên:
 *   - bỏ hẳn các lệnh LaTeX dạng \tencommand ra khỏi mã gốc,
 *   - và chỉ so những TỪ dài từ 3 chữ trở lên, tức bỏ qua mọi ký hiệu toán một chữ.
 * Cái còn lại hai bên khớp nhau.
 */

interface Tu {
  chu: string;
  /** Vị trí của từ này trong chuỗi gốc */
  viTri: number;
}

/** Tách thành các từ đáng tin để so. `boLenh` dùng cho mã gốc. */
function tachTu(s: string, boLenh: boolean): Tu[] {
  const ra: Tu[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];

    // Thẻ HTML gõ tay: nuốt cả thẻ
    if (boLenh && c === '<') {
      const dong = s.indexOf('>', i);
      i = dong === -1 ? s.length : dong + 1;
      continue;
    }

    // Lệnh LaTeX \frac, \color, \alpha...: nuốt cả lệnh
    if (boLenh && c === '\\') {
      i++;
      let ten = '';
      while (i < s.length && /[A-Za-z]/.test(s[i])) { ten += s[i]; i++; }
      /*
       * Vài lệnh còn phải nuốt luôn PHẦN TRONG NGOẶC.
       *
       * Đo trên bài thật: `$\color{blue} a, b, c$` bỏ mỗi chữ "color" thì vẫn còn "blue"
       * - một từ 4 chữ chen vào giữa mã gốc mà màn hình không hề có, đủ làm lệch cả đoạn.
       * Chỉ nuốt ngoặc của các lệnh TÔ MÀU / CĂN CHỈNH; lệnh như \text{...} thì phần trong
       * ngoặc có hiện ra nên phải giữ.
       */
      if (/^(color|textcolor|hspace|vspace|begin|end|label|class|style|cssId)$/.test(ten)) {
        while (i < s.length && /\s/.test(s[i])) i++;
        if (s[i] === '{') {
          let sau = 1;
          i++;
          while (i < s.length && sau > 0) {
            if (s[i] === '{') sau++;
            else if (s[i] === '}') sau--;
            i++;
          }
        }
      }
      continue;
    }

    if (/[\p{L}\p{N}]/u.test(c)) {
      const dau = i;
      let tu = '';
      while (i < s.length && /[\p{L}\p{N}]/u.test(s[i])) { tu += s[i]; i++; }
      // Từ 3 chữ trở lên mới đáng tin - dưới đó phần lớn là ký hiệu toán (a, b, x, y)
      if (tu.length >= 3) ra.push({ chu: tu.toLowerCase(), viTri: dau });
      continue;
    }

    i++;
  }
  return ra;
}

/**
 * Trả về vị trí trong `nguon` ứng với đầu đoạn `chuHienThi`.
 * Không tìm ra thì trả 0 - đưa con trỏ về đầu khối vẫn hơn hẳn quăng xuống cuối.
 */
export function timViTriTrongNguon(nguon: string, chuHienThi: string): number {
  const n = String(nguon || '');
  if (!n || !String(chuHienThi || '').trim()) return 0;

  const tuNguon = tachTu(n, true);
  const tuHien = tachTu(String(chuHienThi), false);
  if (tuNguon.length === 0 || tuHien.length === 0) return 0;

  /*
   * Thử khớp 8 từ liền nhau, không được thì 6, 4, 3, rồi 2.
   *
   * Phải bắt đầu từ NHIỀU từ: đo trên bài thật, đoạn "Bất phương trình bậc nhất hai ẩn
   * x, y có dạng..." trùng đúng 4 từ đầu với chính tên bài "BÀI 1. BẤT PHƯƠNG TRÌNH BẬC
   * NHẤT HAI ẨN", nên khớp 4 từ là nhảy nhầm lên tiêu đề. Đoạn ngắn thì mới hạ dần.
   */
  for (const soTu of [8, 6, 4, 3, 2]) {
    if (tuHien.length < soTu) continue;
    const mau = tuHien.slice(0, soTu).map(t => t.chu);
    for (let i = 0; i + soTu <= tuNguon.length; i++) {
      let khop = true;
      for (let k = 0; k < soTu; k++) {
        if (tuNguon[i + k].chu !== mau[k]) { khop = false; break; }
      }
      if (khop) return tuNguon[i].viTri;
    }
  }

  // Còn một từ duy nhất và nó đủ dài thì vẫn tin được
  if (tuHien[0].chu.length >= 5) {
    const t = tuNguon.find(x => x.chu === tuHien[0].chu);
    if (t) return t.viTri;
  }
  return 0;
}
