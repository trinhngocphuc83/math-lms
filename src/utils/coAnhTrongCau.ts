/**
 * Đọc và đổi CỠ ẢNH cùng KIỂU XẾP ẢNH ngay trong nội dung câu hỏi.
 *
 * Cỡ ảnh ghi vào TIÊU ĐỀ của cú pháp ảnh Markdown chuẩn: `![Hình ảnh](url "vua")`. Dùng
 * tiêu đề chứ không bịa cú pháp riêng, nên chỗ nào chưa hiểu quy ước này thì ảnh vẫn hiện
 * bình thường - xuất Word, Kỳ thi Online... đều không vỡ.
 *
 * Kiểu xếp thì không cần đánh dấu gì: Markdown gộp các dòng liền nhau vào một đoạn, nên
 * hai dòng ảnh SÁT NHAU sẽ nằm ngang, cách nhau một DÒNG TRỐNG thì xếp dọc. Việc của hàm
 * này chỉ là thêm hoặc bớt đúng cái dòng trống đó.
 */

/** Bắt một ảnh Markdown: nhóm 1 = alt, nhóm 2 = địa chỉ, nhóm 3 = tiêu đề (nếu có). */
const MAU_ANH = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;

export type CoAnh = 'nho' | 'vua' | 'to';
const HOP_LE: string[] = ['nho', 'vua', 'to'];

/** Cỡ của ảnh ĐẦU TIÊN trong câu; không ghi gì thì coi là 'vua'. */
export function docCoAnh(noiDung: string): CoAnh {
  MAU_ANH.lastIndex = 0;
  const m = MAU_ANH.exec(String(noiDung || ''));
  const t = (m?.[3] || '').trim().toLowerCase();
  return (HOP_LE.includes(t) ? t : 'vua') as CoAnh;
}

/** Đặt cỡ cho MỌI ảnh trong câu. */
export function datCoAnh(noiDung: string, co: CoAnh): string {
  return String(noiDung || '').replace(MAU_ANH, (_, alt, url) => `![${alt}](${url} "${co}")`);
}

/** Đếm số ảnh trong câu - từ hai ảnh trở lên mới có chuyện xếp ngang hay dọc. */
export function demAnh(noiDung: string): number {
  return (String(noiDung || '').match(/!\[[^\]]*\]\([^)\s]+(?:\s+"[^"]*")?\)/g) || []).length;
}

/**
 * Hai ảnh đang nằm ngang chưa? Tức giữa hai dòng ảnh KHÔNG có dòng trống.
 * Chỉ xét cặp ảnh đầu tiên - đủ cho việc bật/tắt bằng một cái nút.
 */
export function dangXepNgang(noiDung: string): boolean {
  return /!\[[^\]]*\]\([^)\s]+(?:\s+"[^"]*")?\)[ \t]*\n[ \t]*!\[/.test(String(noiDung || ''));
}

/**
 * Bật/tắt xếp ngang: bỏ hoặc thêm dòng trống giữa các dòng ảnh liền nhau.
 * Thầy cô khỏi phải nhớ quy ước, chỉ bấm một nút.
 */
export function datXepAnh(noiDung: string, ngang: boolean): string {
  const s = String(noiDung || '');
  const anhRoiXuongDong = /(!\[[^\]]*\]\([^)\s]+(?:\s+"[^"]*")?\))[ \t]*\n+[ \t]*(?=!\[)/g;
  return s.replace(anhRoiXuongDong, (_, anh) => (ngang ? `${anh}\n` : `${anh}\n\n`));
}

/**
 * Chuyển một ảnh lên trên / xuống dưới một đoạn.
 *
 * Dán ảnh vào thì nó rơi đúng chỗ con trỏ đang đứng, thường là giữa câu hoặc cuối bài -
 * muốn đưa lên đầu đề thì phải tự cắt dòng `![...](...)` rồi dán lại, mò trong đống mã
 * Markdown rất dễ hỏng. Hàm này đổi chỗ ảnh với ĐOẠN kề nó, giữ nguyên mọi thứ khác.
 *
 * "Đoạn" ở đây tính theo cách Markdown vẫn tính: các dòng liền nhau, ngăn nhau bằng một
 * dòng trống. Nhờ vậy ảnh nhảy qua trọn một đoạn văn chứ không nhích từng dòng.
 *
 * @param chiSoAnh Ảnh thứ mấy trong câu, đếm từ 0.
 * @param huong    -1 là lên, 1 là xuống.
 * @returns Nội dung mới; không nhúc nhích được thì trả lại nguyên văn.
 */
export function chuyenAnh(noiDung: string, chiSoAnh: number, huong: -1 | 1): string {
  const s = String(noiDung || '');
  const doan = s.split(/\n[ \t]*\n/);

  /* Tìm đoạn chứa ảnh thứ chiSoAnh. Một đoạn có thể chứa nhiều ảnh (khi xếp ngang) -
     lúc đó cả cụm ảnh đi cùng nhau, đúng ý người dùng chứ không xé lẻ hàng ngang. */
  let dem = 0;
  let viTri = -1;
  for (let i = 0; i < doan.length; i++) {
    const so = demAnh(doan[i]);
    if (so === 0) continue;
    if (chiSoAnh < dem + so) { viTri = i; break; }
    dem += so;
  }
  if (viTri === -1) return s;

  const dich = viTri + huong;
  if (dich < 0 || dich >= doan.length) return s;

  [doan[viTri], doan[dich]] = [doan[dich], doan[viTri]];
  return doan.join('\n\n');
}

/** Ảnh này còn nhích được theo hướng đó không - để làm mờ nút khi đã hết đường. */
export function chuyenAnhDuoc(noiDung: string, chiSoAnh: number, huong: -1 | 1): boolean {
  return chuyenAnh(noiDung, chiSoAnh, huong) !== String(noiDung || '');
}
