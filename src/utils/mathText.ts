/**
 * Các hàm xử lý vị trí công thức Toán trong văn bản Markdown.
 *
 * Quy ước trong hệ thống: công thức nằm giữa cặp $...$ (cùng dòng)
 * hoặc $$...$$ (khối riêng).
 */

/** Ký tự đánh dấu chỗ đặt con trỏ trong các mẫu công thức. Không xuất hiện trong LaTeX thật. */
export const CURSOR_TOKEN = '‸';

export interface MathRegion {
  /** Vị trí ký tự $ mở đầu */
  start: number;
  /** Vị trí ngay sau ký tự $ kết thúc */
  end: number;
  /** Phần LaTeX bên trong, không gồm dấu $ */
  content: string;
  /** true nếu là khối $$...$$ */
  display: boolean;
}

/**
 * Quét toàn bộ văn bản, trả về danh sách các vùng công thức đã đóng đủ cặp $.
 * Bỏ qua dấu $ đã được thoát bằng \$.
 */
/**
 * Tìm vị trí dấu $ (hoặc $$) đóng công thức, bắt đầu quét từ `from`.
 * Trả về -1 nếu không tìm thấy.
 */
function findClosingDelimiter(text: string, from: number, isDisplay: boolean): number {
  let j = from;
  while (j < text.length) {
    if (text[j] === '\\') {
      j += 2;
      continue;
    }
    if (text[j] === '$') {
      const hereIsDisplay = text[j + 1] === '$';
      if (isDisplay === hereIsDisplay) return j;
      // $ đơn nằm trong khối $$ (hoặc ngược lại) → bỏ qua
      j += hereIsDisplay ? 2 : 1;
      continue;
    }
    j += 1;
  }
  return -1;
}

export function findMathRegions(text: string): MathRegion[] {
  const regions: MathRegion[] = [];
  let i = 0;

  while (i < text.length) {
    // Bỏ qua ký tự đã thoát (\$ , \\ ...)
    if (text[i] === '\\') {
      i += 2;
      continue;
    }

    if (text[i] === '$') {
      // Gặp "$$" thì thử hiểu là khối $$...$$ trước; nếu không có dấu đóng thì
      // quay về hiểu là công thức inline rỗng "$$" (hay gặp khi vừa ấn Ctrl+M).
      const candidates: Array<'$$' | '$'> = text[i + 1] === '$' ? ['$$', '$'] : ['$'];

      let matched = false;
      for (const delimiter of candidates) {
        const isDisplay = delimiter === '$$';
        const contentStart = i + delimiter.length;
        const closeAt = findClosingDelimiter(text, contentStart, isDisplay);
        if (closeAt === -1) continue;

        regions.push({
          start: i,
          end: closeAt + delimiter.length,
          content: text.slice(contentStart, closeAt),
          display: isDisplay,
        });

        i = closeAt + delimiter.length;
        matched = true;
        break;
      }

      if (matched) continue;

      // Không có dấu đóng nào → dừng, phần còn lại coi như văn bản thường
      break;
    }

    i += 1;
  }

  return regions;
}

/**
 * Trả về vùng công thức đang chứa con trỏ, hoặc null nếu con trỏ nằm ngoài công thức.
 * Con trỏ nằm ngay sát mép trong của cặp $ cũng được tính là bên trong.
 */
export function getMathAtCursor(text: string, pos: number): MathRegion | null {
  for (const region of findMathRegions(text)) {
    if (pos >= region.start && pos <= region.end) return region;
  }
  return null;
}

/**
 * Con trỏ có đang nằm GIỮA hai dấu $ hay không (dùng khi chèn ký hiệu).
 *
 * Khác với getMathAtCursor: ở đây con trỏ đứng ngay trước dấu $ mở hoặc ngay
 * sau dấu $ đóng đều bị tính là NGOÀI, vì chèn LaTeX vào đó sẽ nằm ngoài công
 * thức và hiện ra thành chữ thường.
 */
export function isInsideMath(text: string, pos: number): boolean {
  for (const region of findMathRegions(text)) {
    const delimiterLength = region.display ? 2 : 1;
    const contentStart = region.start + delimiterLength;
    const contentEnd = region.end - delimiterLength;
    if (pos >= contentStart && pos <= contentEnd) return true;
  }
  return false;
}

/**
 * Bỏ dấu tiếng Việt và chuyển thường, để tìm kiếm "phan so" ra được "Phân số".
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    // Bỏ các dấu thanh tổ hợp (U+0300..U+036F) sinh ra sau khi normalize
    .split('')
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join('')
    .replace(/đ/g, 'd');
}
