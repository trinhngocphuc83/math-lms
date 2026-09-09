// Xác định Chương / Bài / Dạng toán cho câu hỏi vừa bóc tách, và đối chiếu về đúng tên
// có trong danh mục.
//
// Vì sao cần: trước đây nơi đọc kết quả AI làm đúng hai dòng này -
//
//     const topic  = data.chuyenDe || (globalTopics.length === 1 ? globalTopics[0] : "");
//     const lesson = data.tenBai || "";
//
// nên có ba lỗ hổng:
//   1. Chương chỉ có phương án dự phòng khi thầy cô chọn ĐÚNG MỘT chương. Chọn nhiều
//      chương hoặc để "Tự động" mà AI quên trả chuyenDe là chương rỗng.
//   2. Bài không có phương án dự phòng nào. Bài thầy cô chọn ở panel chỉ được nhét vào
//      lời dặn cho AI, lúc đọc kết quả về thì không dùng tới - AI quên trả là mất trắng.
//   3. Không đối chiếu với danh mục, nên AI trả tên tự chế cũng lọt thẳng vào kho. Đo
//      trên kho Toán: 99 câu mang 9 tên chương lạ, trong đó 39 câu lấy TÊN BÀI
//      ("Cực trị của hàm số") làm tên chương.

import { findMatchingChapterTitle } from './topicMatch';
import { doGiongNhau } from "./questionFingerprint";

/** Một dòng danh mục: bộ (lớp, môn, chương, bài, dạng) đã được duyệt. */
export interface DongDanhMuc {
  grade?: string;
  subject?: string;
  topic?: string;
  lesson?: string;
  math_form?: string;
}

/**
 * So tên bỏ qua những khác biệt vặt: hoa thường, dấu tiếng Việt, khoảng trắng thừa,
 * dấu chấm/phẩy cuối câu, và ngoặc nhọn thừa quanh công thức.
 *
 * Hai vế cuối là bài học từ kho thật. AI mỗi lượt quét lại viết tên dạng lệch nhau một
 * chút, mà bản cũ chỉ bỏ qua hoa thường với dấu nên coi chúng là dạng MỚI, đề xuất thêm
 * dòng danh mục, thầy cô bấm duyệt là kho có thêm một dạng song sinh. Kho Lý đã sinh ra
 * ba biến thể của cùng một dạng chỉ vì lệch một dấu chấm và một cặp ngoặc nhọn:
 *
 *   Vận dụng công thức định luật I Nhiệt động lực học (${\Delta U = A + Q}$)
 *   Vận dụng công thức định luật I Nhiệt động lực học ($\Delta U = A + Q$).
 *   Vận dụng công thức định luật I Nhiệt động lực học ($\Delta U = A + Q$)
 *
 * Câu bị xé lẻ ra ba dạng, ra đề theo dạng nào cũng hụt câu. "${X}$" và "$X$" in ra
 * giống hệt nhau nên gộp chung là an toàn.
 */
export const chuanTen = (s: string | null | undefined): string =>
  String(s || '')
    .replace(/\$\{+([\s\S]*?)\}+\$/g, '$$$1$$')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/\s+/g, ' ')
    .replace(/^[\s.,;:]+|[\s.,;:]+$/g, '');

/**
 * Ngưỡng coi hai tên dạng là ĐÁNG NGỜ giống nhau - chỉ để BÁO cho thầy cô, tuyệt đối
 * không tự gộp.
 *
 * Đã thử tự gộp ở ngưỡng này và phải bỏ: tên dạng Toán thường chỉ khác nhau đúng một chữ
 * quyết định, mà một chữ trên một câu dài thì phép đo độ giống gần như không nhúc nhích.
 * Đo trên kho thật, tự gộp đòi nhập "căn bậc 3" vào "căn bậc 2", "Hệ phương trình chứa
 * tham số" vào "Phương trình chứa tham số", "Tìm cực trị" vào "Tìm SỐ ĐIỂM cực trị" -
 * toàn những cặp khác hẳn nhau. Gộp nhầm thì mất câu mà không ai biết.
 */
export const NGUONG_NGHI_TRUNG_TEN_DANG = 0.92;

/**
 * Từ hư hay bị AI viết lặp. Chỉ gộp mấy từ này, KHÔNG gộp bừa mọi từ lặp: tiếng Việt có
 * từ láy thật ("song song", "đều đều"), gộp là hỏng nghĩa. Đo trên kho: 17 tên bị bắt
 * lặp từ thì 16 là từ láy hợp lệ, chỉ đúng một cái "của của" là lỗi thật.
 */
const TU_HU_HAY_LAP = ['của', 'và', 'các', 'là', 'với', 'cho', 'trong', 'một', 'những'];

/**
 * Dọn một tên dạng do AI trả về, TRƯỚC khi đem so với danh mục.
 *
 * Mấy kiểu bẩn đã gặp thật trong kho, dù prompt đã dặn rõ:
 *   - Nhét cả tên bài vào: "Bài 3. Biểu thức toạ độ..., Dạng toán: Toán thực tế - Tọa độ"
 *   - Lặp từ hư: "Xác định tọa độ của của vectơ"
 *   - Còn số thứ tự câu, dấu chấm cuối, xuống dòng, khoảng trắng thừa
 * Không dọn thì mỗi kiểu bẩn đẻ ra một dạng mới, kho phình mà ra đề lại hụt câu.
 */
export function donTenDang(ten: string | null | undefined): string {
  let t = String(ten || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  /* "Bài 3. Tên bài, Dạng toán: X" -> "X". Lấy khúc SAU nhãn, đó mới là tên dạng. */
  const mDang = t.match(/,\s*Dạng\s*toán\s*:\s*(.+)$/i);
  if (mDang) t = mDang[1].trim();
  t = t.replace(/^Bài\s*\d+\s*[.:]\s*/i, '');
  t = t.replace(/^(Câu|Bài\s*tập|VD|Ví\s*dụ)\s*\d+\s*[.:-]?\s*/i, '');
  for (const tu of TU_HU_HAY_LAP) {
    t = t.replace(new RegExp(`(^|\\s)${tu}(\\s+${tu})+(\\s|$)`, 'gi'), `$1${tu}$3`);
  }
  return t.replace(/\s+/g, ' ').replace(/^[\s.,;:-]+|[\s.,;:]+$/g, '');
}

/**
 * Tìm trong danh mục tên chuẩn ứng với một tên do AI trả về.
 *
 * Xuất ra dùng chung: mọi chỗ sắp thêm một dòng danh mục đều phải hỏi hàm này trước,
 * không thì tên chỉ lệch một dấu chấm cũng thành dạng mới.
 *
 * Hai vòng, chặt trước lỏng sau:
 *   1. Khớp đúng sau khi chuẩn hoá (bỏ dấu, thường hoá) - như cũ.
 *   2. Khớp GẦN: giống từ 92% trở lên thì dùng lại tên đã có. Vòng này để bắt mấy tên
 *      chỉ lệch một hai chữ, thứ mà vòng một luôn để lọt và là nguồn đẻ dạng lạ chính.
 */
export function doiVeTenChuan(ten: string, dsChuan: string[]): string | null {
  const t = chuanTen(ten);
  if (!t) return null;
  const khop = dsChuan.find(x => chuanTen(x) === t);
  return khop || null;
}

/**
 * Bản dành riêng cho TÊN DẠNG. Đừng dùng cho tên bài hay tên chương.
 *
 * Khác `doiVeTenChuan` hai chỗ, và cả hai đều chỉ đúng với tên dạng:
 *   - Dọn tên trước khi so (`donTenDang`). Với tên BÀI thì dọn là hỏng: nó cắt tiền tố
 *     "Bài 3." vốn là một phần tên bài thật.
 *   - Khớp GẦN từ 92%. Đây là vòng chặn chính: tên chỉ lệch một hai chữ thì dùng lại tên
 *     đã có thay vì đẻ thêm một dạng song sinh. Với tên bài thì không dám, vì "Bài 9.
 *     Định luật Boyle" và "Bài 10. Định luật Charles" cũng giống nhau kha khá.
 */
export function doiVeTenDangChuan(ten: string, dsDang: string[]): string | null {
  const t = chuanTen(donTenDang(ten));
  if (!t) return null;
  return dsDang.find(x => chuanTen(x) === t) || null;
}

/**
 * Tên dạng đã có nào GẦN GIỐNG tên sắp thêm - để hỏi thầy cô, không phải để tự gộp.
 *
 * Đây là chốt chặn cuối cho việc đẻ dạng lạ: dọn tên bắt được mấy kiểu bẩn máy móc, còn
 * kiểu "cùng một dạng, AI diễn đạt khác đi một chút" thì chỉ người mới phân xử được -
 * "Tìm cực trị" và "Tìm số điểm cực trị" giống nhau tới 93% nhưng là hai dạng.
 *
 * @returns danh sách tên đã có, xếp giống nhất lên đầu; rỗng nghĩa là không có gì đáng ngờ.
 */
export function timDangGanGiong(ten: string, dsDang: string[], toiDa = 3): string[] {
  const t = chuanTen(donTenDang(ten));
  if (!t) return [];
  return dsDang
    .map(x => ({ x, d: doGiongNhau(t, chuanTen(x)) }))
    .filter(o => o.d >= NGUONG_NGHI_TRUNG_TEN_DANG && chuanTen(o.x) !== t)
    .sort((a, b) => b.d - a.d)
    .slice(0, toiDa)
    .map(o => o.x);
}

export interface KetQuaPhanLoai {
  topic: string;
  lesson: string;
  math_form: string;
  /** Những trường phải suy ra chứ không phải AI trả về - để nói cho thầy cô biết. */
  daSuyRa: string[];
  /** Những trường vẫn không xác định được. */
  conThieu: string[];
}

export interface ThamSoPhanLoai {
  /** Giá trị thô AI trả về */
  chuyenDe?: string;
  tenBai?: string;
  dangToan?: string;
  /** Lựa chọn của thầy cô ở panel phân loại gốc */
  globalTopics: string[];
  globalLesson?: string;
  globalGrade?: string;
  globalSubject?: string;
  /** Toàn bộ danh mục đã duyệt, để tra ngược */
  danhMuc: DongDanhMuc[];
}

/**
 * Chốt Chương / Bài / Dạng cho một câu hỏi, theo thứ tự ưu tiên:
 *
 *   Dạng toán : AI trả -> đối chiếu về tên chuẩn trong danh mục.
 *   Bài       : AI trả -> bài thầy cô chọn ở panel -> suy từ danh mục theo Dạng toán.
 *   Chương    : AI trả -> suy từ danh mục theo Bài hoặc Dạng -> chương thầy cô chọn.
 *
 * Suy từ danh mục chỉ nhận khi kết quả DUY NHẤT: một dạng toán nằm ở hai chương khác
 * nhau thì thà để trống còn hơn gán bừa.
 */
export function chotPhanLoai(ts: ThamSoPhanLoai): KetQuaPhanLoai {
  const daSuyRa: string[] = [];
  const conThieu: string[] = [];

  // Chỉ tra trong phạm vi lớp + môn đang làm việc, tránh trùng tên giữa các lớp
  const dm = ts.danhMuc.filter(d =>
    (!ts.globalGrade || !d.grade || d.grade === ts.globalGrade) &&
    (!ts.globalSubject || !d.subject || d.subject === ts.globalSubject));

  const dsChuong = Array.from(new Set(dm.map(d => (d.topic || '').trim()).filter(Boolean)));
  const dsBai = Array.from(new Set(dm.map(d => (d.lesson || '').trim()).filter(Boolean)));
  const dsDang = Array.from(new Set(dm.map(d => (d.math_form || '').trim()).filter(Boolean)));

  /** Giá trị duy nhất của một cột trong các dòng danh mục lọc được, hoặc rỗng. */
  const duyNhat = (dong: DongDanhMuc[], cot: 'topic' | 'lesson'): string => {
    const bo = Array.from(new Set(dong.map(d => (d[cot] || '').trim()).filter(Boolean)));
    return bo.length === 1 ? bo[0] : '';
  };

  // ----- Dạng toán -----
  let math_form = donTenDang(ts.dangToan);
  if (math_form) math_form = doiVeTenDangChuan(math_form, dsDang) || math_form;

  // ----- Bài -----
  let lesson = (ts.tenBai || '').trim();
  if (lesson) {
    lesson = doiVeTenChuan(lesson, dsBai) || lesson;
  } else if (ts.globalLesson?.trim()) {
    lesson = ts.globalLesson.trim();
    daSuyRa.push('Bài (lấy theo lựa chọn của thầy cô)');
  } else if (math_form) {
    const suy = duyNhat(dm.filter(d => chuanTen(d.math_form) === chuanTen(math_form)), 'lesson');
    if (suy) { lesson = suy; daSuyRa.push('Bài (suy từ Dạng toán)'); }
  }

  // ----- Chương -----
  let topic = (ts.chuyenDe || '').trim();
  if (topic) {
    // Khớp mờ được cả khác số La Mã / số thường / hoa thường
    topic = findMatchingChapterTitle(topic, dsChuong) || doiVeTenChuan(topic, dsChuong) || topic;
  }
  if (!topic && lesson) {
    const suy = duyNhat(dm.filter(d => chuanTen(d.lesson) === chuanTen(lesson)), 'topic');
    if (suy) { topic = suy; daSuyRa.push('Chương (suy từ Bài)'); }
  }
  if (!topic && math_form) {
    const suy = duyNhat(dm.filter(d => chuanTen(d.math_form) === chuanTen(math_form)), 'topic');
    if (suy) { topic = suy; daSuyRa.push('Chương (suy từ Dạng toán)'); }
  }
  if (!topic && ts.globalTopics.length === 1) {
    topic = ts.globalTopics[0];
    daSuyRa.push('Chương (lấy theo lựa chọn của thầy cô)');
  }

  if (!topic) conThieu.push('Chương');
  if (!lesson) conThieu.push('Bài');
  if (!math_form) conThieu.push('Dạng toán');

  return { topic, lesson, math_form, daSuyRa, conThieu };
}

/** Câu chữ ngắn gọn để hiện lên giao diện. */
export const moTaPhanLoai = (kq: KetQuaPhanLoai): string => {
  const phan: string[] = [];
  if (kq.conThieu.length) phan.push('Chưa rõ ' + kq.conThieu.join(', ').toLowerCase());
  if (kq.daSuyRa.length) phan.push('Tự điền: ' + kq.daSuyRa.join('; '));
  return phan.join(' · ');
};
