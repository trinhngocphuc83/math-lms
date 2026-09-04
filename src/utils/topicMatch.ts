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

/** Cấp danh mục đang so: chương hay bài. Hai cấp chỉ khác nhau ở chữ mở đầu. */
export type CapDanhMuc = 'chuong' | 'bai';

const MO_DAU: Record<CapDanhMuc, RegExp> = {
  chuong: /^ch[uư][oơ][nư]g\s*([ivxlcdm]+|\d+)\s*[.:)-]?\s*(.*)$/i,
  bai: /^b[aà]i\s*([ivxlcdm]+|\d+)\s*[.:)-]?\s*(.*)$/i,
};

/**
 * Tách "CHƯƠNG I. ỨNG DỤNG..." hay "Chương 4. Nguyên hàm..." thành số thứ tự
 * và phần tiêu đề còn lại đã chuẩn hoá. Đặt `cap` là 'bai' để tách tên bài.
 */
export function parseChapterTitle(raw: string, cap: CapDanhMuc = 'chuong'): ParsedChapterTitle {
  const text = String(raw || '').trim();
  // "Chương" / "CHƯƠNG" (hoặc "Bài") + số (La Mã hoặc thường) + dấu . hoặc : + phần còn lại
  const match = text.match(MO_DAU[cap]);

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

/**
 * Tên ngắn có nằm gọn trong tên dài không?
 *
 * Cần thêm lối so này vì Jaccard phạt oan tên ngắn: "Bài 2. Tập hợp" và "Bài 2. Tập hợp
 * và các phép toán trên tập hợp" cùng chỉ một bài, nhưng Jaccard chỉ được 2/7 = 0,29 nên
 * trượt ngưỡng, thế là cây thư mục hiện hai "Bài 2".
 *
 * Đòi ÍT NHẤT HAI từ chung để một từ trùng lặt vặt không kéo nhầm hai tên khác nhau lại:
 * "Chương 3. Hàm số" và "Chương 3. Số phức" chỉ chung mỗi từ "số".
 */
function chuaTronVen(a: string, b: string): boolean {
  const wordsA = new Set(a.split(' ').filter((w) => w.length > 1));
  const wordsB = new Set(b.split(' ').filter((w) => w.length > 1));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  let common = 0;
  for (const w of wordsA) if (wordsB.has(w)) common++;
  return common >= 2 && common / Math.min(wordsA.size, wordsB.size) >= 0.6;
}

/** Ngưỡng trùng từ vựng tối thiểu để coi là "cùng một chương" khi số thứ tự khớp. */
const MATCH_THRESHOLD = 0.5;

/**
 * Tìm trong danh sách `candidates` chuỗi nào cùng chỉ một Chương với `target`,
 * bất kể khác định dạng số La Mã/số thường hay viết hoa/thường.
 * Trả về nguyên văn của candidate khớp nhất, hoặc null nếu không đủ tin cậy.
 */
export function findMatchingChapterTitle(
  target: string, candidates: string[], cap: CapDanhMuc = 'chuong',
): string | null {
  if (!target?.trim()) return null;
  const parsedTarget = parseChapterTitle(target, cap);

  let best: { raw: string; score: number } | null = null;

  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;
    if (candidate === target) return candidate; // khớp tuyệt đối, khỏi so mờ

    const parsedCandidate = parseChapterTitle(candidate, cap);

    // Số chương phải khớp nếu cả hai bên đều tách được số
    if (parsedTarget.number !== null && parsedCandidate.number !== null) {
      if (parsedTarget.number !== parsedCandidate.number) continue;
    }

    const jaccard = wordOverlap(parsedTarget.textKey, parsedCandidate.textKey);
    const gonTrong = chuaTronVen(parsedTarget.textKey, parsedCandidate.textKey);
    const score = gonTrong ? Math.max(jaccard, MATCH_THRESHOLD) : jaccard;
    if (score >= MATCH_THRESHOLD && (!best || score > best.score)) {
      best = { raw: candidate, score };
    }
  }

  return best?.raw ?? null;
}

/**
 * Y hệt findMatchingChapterTitle nhưng cho tên BÀI.
 *
 * Cần riêng vì hai bộ sách đánh số bài khác nhau: Lớp 8 chương Hằng đẳng thức đang có
 * "Bài 2. Phân tích đa thức thành nhân tử" và "Bài 2. Lập phương của một tổng hay một
 * hiệu" - cùng số 2 mà là hai bài khác hẳn. Ngưỡng trùng từ vựng giữ nguyên 0.5 nên cặp
 * đó không khớp (không chung từ nào), còn cặp thật sự cùng bài thì khớp:
 *
 *   "Bài 2. Giá trị lớn nhất - nhỏ nhất"
 *   "Bài 2. Giá trị lớn nhất và giá trị nhỏ nhất của hàm số"
 */
export function findMatchingLessonTitle(target: string, candidates: string[]): string | null {
  return findMatchingChapterTitle(target, candidates, 'bai');
}

/**
 * Gom một danh sách tên về tên đại diện: tên nào cùng chỉ một chương (hoặc một bài) thì
 * cùng trỏ về MỘT tên.
 *
 * Trả về bản đồ tên gốc -> tên đại diện. Tên đại diện là tên hợp lối viết chung của kho
 * ("Chương 3." chứ không "CHƯƠNG III.", không viết hoa toàn bộ); cùng lối thì lấy tên
 * dài hơn vì thường là tên đầy đủ hơn.
 *
 * Dùng cho cây thư mục: kho lỡ có hai cách viết cùng một chương thì cây vẫn chỉ hiện một
 * nhánh, thay vì bổ đôi số câu ra hai chỗ.
 */
export function gomTenSongSinh(dsTen: string[], cap: CapDanhMuc = 'chuong'): Map<string, string> {
  const sach = Array.from(new Set(dsTen.map((x) => String(x || '').trim()).filter(Boolean)));
  const nhom: string[][] = [];

  for (const ten of sach) {
    const cungNhom = nhom.find((g) => findMatchingChapterTitle(ten, g, cap) !== null);
    if (cungNhom) cungNhom.push(ten);
    else nhom.push([ten]);
  }

  const diem = (ten: string): number => {
    let d = 0;
    if (/^(Chương|Bài)\s+\d/.test(ten)) d += 2;
    if (/^(CHƯƠNG|BÀI)|^(Chương|Bài)\s+[IVX]+/.test(ten)) d -= 2;
    const chu = ten.replace(/[^\p{L}]/gu, '');
    if (chu && chu === chu.toUpperCase()) d -= 2;
    return d;
  };

  const banDo = new Map<string, string>();
  for (const g of nhom) {
    const dep = [...g].sort((a, b) => diem(b) - diem(a) || b.length - a.length)[0];
    for (const ten of g) banDo.set(ten, dep);
  }
  return banDo;
}
