// QUY ƯỚC TÊN DANH MỤC - một chỗ duy nhất quyết định tên lớp / phân môn / chương / bài / dạng
// trông như thế nào, để mọi đường tạo danh mục (bóc câu bằng AI, hàng đợi, sửa câu, đẩy từ
// bài giảng, nạp từ tài liệu) cùng đẻ ra một kiểu tên.
//
// Vì sao cần: 12/9/2026 thầy soi cây danh mục thấy "Toán 12 mà có hằng đẳng thức" - 10 câu
// lớp 8 gắn nhầm lớp 12. Đào tiếp thì lộ cả loạt: cùng một chương mà "Ôn tập chương I" và
// "Ôn tập chương 1" song song; lớp 7 đánh chương La Mã, lớp khác Ả Rập; "Bài 2. hệ bất
// phương trình" viết thường; "Bài 1 Tứ giác" thiếu dấu chấm; "thoã" thay vì "thoả"; lớp 9
// đánh bài liên tục 1-32 theo SGK, lớp khác đánh lại từ 1 trong mỗi chương; chương thống
// kê lớp 12 để phân môn Đại số. Mỗi lệch nhỏ ấy là một nhánh thừa trong ô lọc của ngân
// hàng, và bài giảng tra dạng bằng TÊN BÀI nên lệch một dấu là "kho không có dạng nào".
//
// Quy ước thầy chốt (xem docs/quy-uoc-danh-muc.md):
//   grade    "7".."12" - chuỗi số, không "Lớp 12"
//   subject  Đại số | Hình học | Giải tích | Thống kê   (thống kê và xác suất đều là Thống kê)
//   topic    "Chương N. Tên chương"   - N Ả Rập, theo đúng số chương của SGK Kết nối tri thức
//   lesson   "Bài N. Tên bài"         - N đánh lại từ 1 trong mỗi chương; bài ôn tập là
//                                       "Bài K. Ôn tập chương" với K = số bài của chương + 1
//   math_form tên dạng, viết hoa chữ đầu, không dấu chấm cuối
//
// Hàm ở đây chỉ CHUẨN HOÁ HÌNH THỨC (dấu câu, hoa thường, La Mã -> Ả Rập, lỗi chính tả hay
// gặp). Đặt sai lớp, sai chương thì máy không đoán được - việc đó thuộc bộ kiểm
// `kiem-danh-muc.mjs` chạy định kỳ trên kho.

const LA_MA: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };

/** Bốn phân môn được phép, kèm các cách viết hay gặp. */
const PHAN_MON: Record<string, string> = {
  'dai so': 'Đại số', 'đại số': 'Đại số', 'algebra': 'Đại số',
  'hinh hoc': 'Hình học', 'hình học': 'Hình học', 'geometry': 'Hình học',
  'giai tich': 'Giải tích', 'giải tích': 'Giải tích',
  'thong ke': 'Thống kê', 'thống kê': 'Thống kê', 'xac suat': 'Thống kê', 'xác suất': 'Thống kê',
  'thống kê và xác suất': 'Thống kê', 'thống kê - xác suất': 'Thống kê',
};

/** Lỗi chính tả đã gặp trong kho - thêm vào khi bắt được ca mới. */
const CHINH_TA: [RegExp, string][] = [
  [/thoã/g, 'thoả'], [/biễu diễn/g, 'biểu diễn'], [/\bHIệu\b/g, 'Hiệu'],
];

const khongDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
const gonKhoang = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim();
const hoaDau = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const suaChinhTa = (s: string) => CHINH_TA.reduce((t, [re, thay]) => t.replace(re, thay), s);

export const chuanHoaLop = (g: string | number | null | undefined): string => {
  const m = String(g ?? '').match(/\d+/);
  return m ? m[0] : '';
};

export const chuanHoaPhanMon = (s: string | null | undefined): string => {
  const t = gonKhoang(String(s ?? ''));
  return PHAN_MON[t.toLowerCase()] || PHAN_MON[khongDau(t)] || hoaDau(t);
};

/** "CHƯƠNG III: CĂN BẬC HAI" / "Chương 3 - Căn bậc hai" / "Chương III. Căn" -> "Chương 3. Căn bậc hai" */
export const chuanHoaChuong = (s: string | null | undefined): string => {
  let t = suaChinhTa(gonKhoang(String(s ?? '')));
  const m = t.match(/^ch[uư][oơ]ng\s+([IVX]+|\d+)\s*[.:\-–]?\s*(.*)$/i);
  if (!m) return t;
  const so = LA_MA[m[1].toUpperCase()] ?? parseInt(m[1], 10);
  let ten = m[2].trim();
  /* Tên chương viết HOA TOÀN BỘ (cây khoá học cũ) thì hạ xuống, giữ hoa chữ đầu */
  if (ten.length > 3 && ten === ten.toUpperCase()) ten = hoaDau(ten.toLowerCase());
  return `Chương ${so}. ${hoaDau(ten)}`;
};

/** "Bài 2: hệ bất phương trình" / "Bài 1 Tứ giác" / "Ôn tập chương IV" -> đúng khuôn. */
export const chuanHoaBai = (s: string | null | undefined): string => {
  let t = suaChinhTa(gonKhoang(String(s ?? '')));
  const on = t.match(/^(?:bài\s+(\d+)\s*[.:]?\s*)?[ôo]n\s+t[aậ]p\s+ch[uư][oơ]ng\b/i);
  if (on) return on[1] ? `Bài ${on[1]}. Ôn tập chương` : 'Ôn tập chương';   // thiếu số thì bộ kiểm sẽ báo
  const m = t.match(/^bài\s+(\d+)\s*[.:\-–]?\s*(.*)$/i);
  if (!m) return t;
  return `Bài ${parseInt(m[1], 10)}. ${hoaDau(m[2].trim())}`;
};

export const chuanHoaDang = (s: string | null | undefined): string =>
  hoaDau(suaChinhTa(gonKhoang(String(s ?? ''))).replace(/[.\s]+$/, ''));

export interface TenDanhMuc {
  grade?: string | number; subject?: string; topic?: string; lesson?: string; math_form?: string;
}

/** Chuẩn hoá cả bộ tên một dòng danh mục - dùng ở cửa chung `boSungYeuCauCanDat`. */
export function chuanHoaTenDanhMuc<T extends TenDanhMuc>(o: T): T {
  return {
    ...o,
    ...(o.grade !== undefined ? { grade: chuanHoaLop(o.grade) } : {}),
    ...(o.subject !== undefined ? { subject: chuanHoaPhanMon(o.subject) } : {}),
    ...(o.topic !== undefined ? { topic: chuanHoaChuong(o.topic) } : {}),
    ...(o.lesson !== undefined ? { lesson: chuanHoaBai(o.lesson) } : {}),
    ...(o.math_form !== undefined ? { math_form: chuanHoaDang(o.math_form) } : {}),
  };
}
