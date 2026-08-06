/**
 * Đối chiếu tên Chương/Chuyên đề giữa hai nguồn dữ liệu không cùng quy ước:
 *
 * - Bảng `chapters` (cấu trúc khóa học): "CHƯƠNG I. ỨNG DỤNG ĐẠO HÀM ĐỂ..."
 * - Bảng `question_categories` (ngân hàng câu hỏi): "Chương 4. Nguyên hàm và tích phân"
 *
 * Khác nhau về: viết hoa toàn bộ hay đầu câu, số La Mã hay số thường,
 * dấu chấm hay hai chấm, và đôi khi cả chính tả (tọa/toạ). So khớp tuyệt đối
 * sẽ luôn trả về rỗng, khiến bộ lọc Dạng toán không bao giờ tìm đúng phạm vi.
 */

const ROMAN_VALUES: Record<string, number> = {
  I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000,
};

/** Đổi số La Mã (I, II, IV, XII...) sang số thường. Trả null nếu không phải số La Mã hợp lệ. */
function romanToArabic(input: string): number | null {
  const s = input.toUpperCase();
  if (!/^[IVXLCDM]+$/.test(s)) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN_VALUES[s[i]];
    const next = ROMAN_VALUES[s[i + 1]];
    if (next && cur < next) total -= cur;
    else total += cur;
  }
  return total > 0 && total <= 50 ? total : null;
}

/** Bỏ dấu tiếng Việt, hạ chữ thường, gộp khoảng trắng. */
function stripDiacritics(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .split('')
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join('')
    .replace(/đ/g, 'd') // đ -> d
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ParsedChapterTitle {
  /** Số thứ tự chương, null nếu không tách được */
  number: number | null;
  /** Phần tiêu đề còn lại, đã bỏ dấu và hạ chữ thường, dùng để so khớp mờ */
  textKey: string;
  /** Nguyên văn ban đầu */
  raw: string;
}

/**
 * Tách "CHƯƠNG I. ỨNG DỤNG..." hay "Chương 4. Nguyên hàm..." thành số thứ tự
 * và phần tiêu đề còn lại đã chuẩn hoá.
 */
export function parseChapterTitle(raw: string): ParsedChapterTitle {
  const text = String(raw || '').trim();
  // "Chương" / "CHƯƠNG" + số (La Mã hoặc thường) + dấu . hoặc : + phần còn lại
  const match = text.match(/^ch[uư][oơ][nư]g\s*([ivxlcdm]+|\d+)\s*[.:)-]?\s*(.*)$/i);

  if (!match) {
    return { number: null, textKey: stripDiacritics(text), raw: text };
  }

  const numPart = match[1];
  const rest = match[2] || '';
  const asArabic = /^\d+$/.test(numPart) ? parseInt(numPart, 10) : romanToArabic(numPart);

  return { number: asArabic, textKey: stripDiacritics(rest), raw: text };
}

/** Tỉ lệ trùng từ vựng giữa hai chuỗi đã chuẩn hoá (Jaccard trên tập từ). */
function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(' ').filter((w) => w.length > 1));
  const wordsB = new Set(b.split(' ').filter((w) => w.length > 1));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let common = 0;
  for (const w of wordsA) if (wordsB.has(w)) common++;
  return common / new Set([...wordsA, ...wordsB]).size;
}

/** Ngưỡng trùng từ vựng tối thiểu để coi là "cùng một chương" khi số thứ tự khớp. */
const MATCH_THRESHOLD = 0.5;

/**
 * Tìm trong danh sách `candidates` chuỗi nào cùng chỉ một Chương với `target`,
 * bất kể khác định dạng số La Mã/số thường hay viết hoa/thường.
 * Trả về nguyên văn của candidate khớp nhất, hoặc null nếu không đủ tin cậy.
 */
export function findMatchingChapterTitle(target: string, candidates: string[]): string | null {
  if (!target?.trim()) return null;
  const parsedTarget = parseChapterTitle(target);

  let best: { raw: string; score: number } | null = null;

  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;
    if (candidate === target) return candidate; // khớp tuyệt đối, khỏi so mờ

    const parsedCandidate = parseChapterTitle(candidate);

    // Số chương phải khớp nếu cả hai bên đều tách được số
    if (parsedTarget.number !== null && parsedCandidate.number !== null) {
      if (parsedTarget.number !== parsedCandidate.number) continue;
    }

    const score = wordOverlap(parsedTarget.textKey, parsedCandidate.textKey);
    if (score >= MATCH_THRESHOLD && (!best || score > best.score)) {
      best = { raw: candidate, score };
    }
  }

  return best?.raw ?? null;
}
