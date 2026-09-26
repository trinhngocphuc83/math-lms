/**
 * Nắn BẢNG SỐ LIỆU viết bằng LaTeX cho dựng được thành bảng thật.
 *
 * Bộ bóc câu bằng AI hay trả về bảng `\begin{array}…\end{array}` ĐỂ TRẦN, không bọc trong
 * cặp `$$`. KaTeX chỉ dựng công thức nằm giữa `$…$` nên bảng ấy in ra nguyên chữ LaTeX thô
 * giữa đề bài - thầy cô nhìn thấy đúng dòng "\begin{array}{|c|c|c|}" thay vì bảng điểm.
 * (Thầy báo 26/9/2026, hai câu thống kê lớp 10.)
 *
 * Bẫy thứ hai đi kèm: trong JSON của AI, dấu xuống dòng của bảng phải là HAI gạch chéo
 * `\\`, nhưng AI hay viết một gạch. Sau khi JSON.parse, chuỗi còn đúng một `\` treo ở cuối
 * dòng - KaTeX gặp lệnh lạ là hỏng cả khối. Nên nắn luôn: `\` đứng một mình cuối dòng
 * (hoặc ngay trước `\hline`, `\end{array}`) đổi thành `\\`.
 *
 * Chỉ sửa phần NẰM NGOÀI các cặp `$…$` sẵn có - bảng đã bọc đúng thì không đụng tới.
 */

/** Khối `\begin{array}` … `\end{array}` đầu tiên bắt đầu từ vị trí `tu`. */
function timKhoiArray(s: string, tu: number): { dau: number; cuoi: number } | null {
  const dau = s.indexOf('\\begin{array}', tu);
  if (dau < 0) return null;
  const ketThuc = s.indexOf('\\end{array}', dau);
  if (ketThuc < 0) return null;
  return { dau, cuoi: ketThuc + '\\end{array}'.length };
}

/** Vị trí `i` có đang nằm giữa một cặp `$…$` hay `$$…$$` không. */
function trongCongThuc(s: string, i: number): boolean {
  const truoc = s.slice(0, i);
  const doi = (truoc.match(/\$\$/g) || []).length;
  if (doi % 2 === 1) return true;
  const don = (truoc.replace(/\$\$/g, '').match(/\$/g) || []).length;
  return don % 2 === 1;
}

/** Trả lại dấu xuống dòng `\\` cho các hàng trong một khối array. */
function chuaXuongDong(khoi: string): string {
  return khoi
    /* Một gạch chéo đứng lẻ ngay trước \hline hoặc \end{array} */
    .replace(/(^|[^\\])\\(\s*)(?=\\hline|\\end\{array\})/g, '$1\\\\$2')
    /* Một gạch chéo đứng lẻ ở cuối dòng */
    .replace(/(^|[^\\])\\[ \t]*(\r?\n)/g, '$1\\\\$2')
    /* Một gạch chéo đứng lẻ ở cuối cả khối (hàng cuối không xuống dòng) */
    .replace(/(^|[^\\])\\[ \t]*$/g, '$1\\\\');
}

export interface KetQuaNanBang {
  text: string;
  /** Có sửa gì không - để nơi gọi ghi cảnh báo cho thầy cô soát lại. */
  daSua: boolean;
  /** Số bảng đã bọc vào `$$…$$`. */
  soBang: number;
}

/**
 * Bọc mọi bảng `\begin{array}` để trần vào `$$…$$` và trả lại dấu xuống dòng cho nó.
 *
 * Giữ bảng ở dòng riêng (thêm xuống dòng trước/sau nếu đang dính vào chữ) để markdown
 * không nuốt mất, và để bảng nằm giữa như bảng thật chứ không chen ngang câu văn.
 */
export function nanBangLatex(raw: string | null | undefined): KetQuaNanBang {
  const goc = String(raw ?? '');
  if (!goc.includes('\\begin{array}')) return { text: goc, daSua: false, soBang: 0 };

  let s = goc;
  let tu = 0;
  let soBang = 0;

  for (;;) {
    const k = timKhoiArray(s, tu);
    if (!k) break;
    if (trongCongThuc(s, k.dau)) { tu = k.cuoi; continue; }

    const khoi = chuaXuongDong(s.slice(k.dau, k.cuoi));
    const truoc = s.slice(0, k.dau).replace(/[ \t]+$/, '');
    const sau = s.slice(k.cuoi).replace(/^[ \t]+/, '');
    const themTruoc = truoc && !truoc.endsWith('\n') ? '\n\n' : '';
    const themSau = sau && !sau.startsWith('\n') ? '\n\n' : '';
    const boc = `$$${khoi}$$`;

    s = truoc + themTruoc + boc + themSau + sau;
    tu = truoc.length + themTruoc.length + boc.length;
    soBang++;
  }

  return { text: s, daSua: s !== goc, soBang };
}
