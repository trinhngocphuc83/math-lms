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

/** Một dòng danh mục: bộ (lớp, môn, chương, bài, dạng) đã được duyệt. */
export interface DongDanhMuc {
  grade?: string;
  subject?: string;
  topic?: string;
  lesson?: string;
  math_form?: string;
}

/** So tên không phân biệt hoa thường, dấu tiếng Việt và khoảng trắng thừa. */
export const chuanTen = (s: string | null | undefined): string =>
  String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/\s+/g, ' ').trim();

/** Tìm trong danh mục tên chuẩn ứng với một tên do AI trả về (khớp mờ theo dấu và hoa thường). */
function doiVeTenChuan(ten: string, dsChuan: string[]): string | null {
  const t = chuanTen(ten);
  if (!t) return null;
  const khop = dsChuan.find(x => chuanTen(x) === t);
  return khop || null;
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
  let math_form = (ts.dangToan || '').trim();
  if (math_form) math_form = doiVeTenChuan(math_form, dsDang) || math_form;

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
