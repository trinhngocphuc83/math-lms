/**
 * Quy đổi dạng câu hỏi và mức độ giữa hai nơi trong hệ thống.
 *
 * - Ngân hàng câu hỏi (bảng `questions`) dùng mã tiếng Việt: NLC, DS, TLN, TL
 * - Trình soạn bài Luyện tập dùng mã tiếng Anh: multiple_choice, true_false_cluster, ...
 *
 * Trước đây mỗi nơi tự quy ước nên đẩy câu hỏi qua lại bị sai dạng.
 * Mọi chỗ cần quy đổi từ nay dùng chung file này.
 */

/** Mã dạng câu hỏi chuẩn lưu trong ngân hàng */
export type BankType = 'NLC' | 'DS' | 'TLN' | 'TL';

/** Mã dạng khối trong trình soạn bài Luyện tập */
export type BlockType =
  | 'multiple_choice'
  | 'true_false_cluster'
  | 'true_false'
  | 'short_answer'
  | 'essay';

export const BANK_TYPES: BankType[] = ['NLC', 'DS', 'TLN', 'TL'];

/** Tên hiển thị cho người dùng */
export const BANK_TYPE_LABELS: Record<BankType, string> = {
  NLC: 'Trắc nghiệm',
  DS: 'Đúng/Sai',
  TLN: 'Trả lời ngắn',
  TL: 'Tự luận',
};

/**
 * Mọi giá trị từng được ghi vào cột question_type (kể cả dữ liệu cũ)
 * quy về một mã chuẩn duy nhất.
 */
const TO_BANK_TYPE: Record<string, BankType> = {
  // Mã chuẩn
  NLC: 'NLC', DS: 'DS', TLN: 'TLN', TL: 'TL',
  // Dữ liệu cũ trong CSDL
  TN: 'NLC',      // "Trắc nghiệm" - tên gọi cũ
  'ĐS': 'DS',     // gõ có dấu Đ
  // Mã tiếng Anh do trình soạn bài Luyện tập ghi
  multiple_choice: 'NLC',
  true_false_cluster: 'DS',
  true_false: 'DS',
  short_answer: 'TLN',
  essay: 'TL',
};

/** Mã dạng khối tương ứng với từng mã ngân hàng */
const TO_BLOCK_TYPE: Record<BankType, BlockType> = {
  NLC: 'multiple_choice',
  DS: 'true_false_cluster',
  TLN: 'short_answer',
  TL: 'essay',
};

/**
 * Đưa một giá trị dạng câu hỏi bất kỳ về mã chuẩn của ngân hàng.
 * Trả về null nếu không nhận ra (để nơi gọi tự quyết định xử lý).
 */
export function toBankType(value: string | null | undefined): BankType | null {
  if (!value) return null;
  return TO_BANK_TYPE[String(value).trim()] ?? null;
}

/** Đổi mã dạng khối (Luyện tập) sang mã ngân hàng. Mặc định NLC nếu lạ. */
export function blockTypeToBankType(value: string | null | undefined): BankType {
  return toBankType(value) ?? 'NLC';
}

/** Đổi mã ngân hàng sang mã dạng khối để dựng lại câu hỏi trong bài Luyện tập. */
export function bankTypeToBlockType(value: string | null | undefined): BlockType {
  const bank = toBankType(value);
  return bank ? TO_BLOCK_TYPE[bank] : 'multiple_choice';
}

/** Tên hiển thị cho một giá trị dạng câu hỏi bất kỳ. */
export function bankTypeLabel(value: string | null | undefined): string {
  const bank = toBankType(value);
  return bank ? BANK_TYPE_LABELS[bank] : (value ? String(value) : 'Chưa rõ');
}

/**
 * Tất cả giá trị từng được dùng cho một mã dạng câu hỏi.
 * Dùng cho bộ lọc để tìm được cả câu hỏi lưu theo quy ước cũ.
 */
export function bankTypeSynonyms(code: BankType): string[] {
  return Object.keys(TO_BANK_TYPE).filter(key => TO_BANK_TYPE[key] === code);
}

/* ===================== MỨC ĐỘ ===================== */

export type DifficultyCode = '1' | '2' | '3' | '4';

export const DIFFICULTY_CODES: DifficultyCode[] = ['1', '2', '3', '4'];

export const DIFFICULTY_LABELS: Record<DifficultyCode, string> = {
  '1': 'Nhận biết',
  '2': 'Thông hiểu',
  '3': 'Vận dụng',
  '4': 'Vận dụng cao',
};

const TO_DIFFICULTY: Record<string, DifficultyCode> = {
  '1': '1', '2': '2', '3': '3', '4': '4',
  'Nhận biết': '1',
  'Thông hiểu': '2',
  'Vận dụng': '3',
  'Vận dụng cao': '4',
};

/** Đưa mức độ (số hoặc chữ) về mã chuẩn 1-4. Trả null nếu chưa đặt. */
export function toDifficultyCode(value: string | number | null | undefined): DifficultyCode | null {
  if (value === null || value === undefined || value === '') return null;
  return TO_DIFFICULTY[String(value).trim()] ?? null;
}

/** Tất cả giá trị từng được dùng cho một mức độ (số và chữ). */
export function difficultySynonyms(code: DifficultyCode): string[] {
  return Object.keys(TO_DIFFICULTY).filter(key => TO_DIFFICULTY[key] === code);
}

/** Tên hiển thị của mức độ. */
export function difficultyLabel(value: string | number | null | undefined): string {
  const code = toDifficultyCode(value);
  return code ? DIFFICULTY_LABELS[code] : 'Chưa đặt';
}

/* ===================== SO SÁNH TRÙNG LẶP ===================== */

/**
 * Chuẩn hoá nội dung câu hỏi để so sánh trùng lặp.
 *
 * Bỏ qua những khác biệt không làm thay đổi đề bài: khoảng trắng thừa,
 * thẻ định dạng HTML, ảnh minh hoạ, chữ hoa/thường, dấu chấm cuối câu,
 * và khoảng trắng thừa bên trong công thức LaTeX.
 */
export function normalizeQuestionForCompare(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    // Bỏ ảnh markdown ![...](...)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    // Bỏ thẻ HTML dùng để tô màu / chỉnh cỡ chữ
    .replace(/<[^>]*>/g, ' ')
    // Bỏ ký tự điều khiển còn sót
    .replace(/[\u0000-\u001F]/g, ' ')
    // Gộp khoảng trắng
    .replace(/\s+/g, ' ')
    // Bỏ khoảng trắng quanh dấu ngoặc và toán tử trong công thức
    .replace(/\s*([{}()[\]^_])\s*/g, '$1')
    .toLowerCase()
    // Bỏ dấu câu ở cuối
    .replace(/[.\s]+$/, '')
    .trim();
}

/** Hai câu hỏi có được coi là trùng nhau không. */
export function isSameQuestion(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeQuestionForCompare(a);
  return na.length > 0 && na === normalizeQuestionForCompare(b);
}
