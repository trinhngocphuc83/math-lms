// Dựng nội dung Markdown từ ngân hàng câu hỏi để tải lên NotebookLM.
//
// Vì sao Markdown mà không phải .docx: NotebookLM chỉ đọc phần CHỮ của tài liệu.
// Công thức trong .docx là đối tượng Equation (OMML) nên khi trích chữ thường bị mất
// hoặc thành ký tự lạ, còn ảnh thì NotebookLM không đọc. Ở dạng Markdown, công thức
// giữ nguyên `$...$` - AI đọc LaTeX rất tốt - và file nhẹ, xuất nhanh, không phải
// tải hàng trăm ảnh về nhúng như bộ xuất Word (exportDocx.ts).

import { bankTypeLabel, difficultyLabel } from "./questionTypes";

/** Ngưỡng an toàn (từ) cho MỘT nguồn của NotebookLM. Giới hạn thật là 500.000, để
 *  450.000 nhằm trừ hao vì cách đếm từ của họ có thể khác cách ước lượng ở đây. */
export const NGUONG_TU_AN_TOAN = 450_000;

export interface CauHoiXuat {
  question_id?: string;
  grade?: string;
  subject?: string;
  topic?: string;
  lesson?: string;
  math_form?: string;
  question_type?: string;
  difficulty?: string;
  content?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer?: string;
  explanation?: string;
  image_url?: string;
}

export interface TuyChonXuat {
  /** Kèm lời giải hay không (bỏ đi khi chỉ cần đề) */
  kemLoiGiai?: boolean;
  /** Tiêu đề phạm vi ghi ở đầu file, VD "Lớp 9 - Chương III. Căn bậc 2 và căn bậc 3" */
  tieuDe?: string;
}

/** Ước lượng số từ của một chuỗi. Tiếng Việt tách từ theo khoảng trắng là đủ dùng để cảnh báo. */
export function uocLuongSoTu(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Ước lượng số từ của cả danh sách câu hỏi (dùng cho thanh cảnh báo lúc chọn phạm vi). */
export function uocLuongSoTuCuaCauHoi(questions: CauHoiXuat[], kemLoiGiai = true): number {
  let tong = 0;
  for (const q of questions) {
    const phan = [q.content, q.option_a, q.option_b, q.option_c, q.option_d];
    if (kemLoiGiai) phan.push(q.explanation);
    tong += uocLuongSoTu(phan.filter(Boolean).join(' '));
    tong += 25; // phần nhãn phân loại cố định của mỗi câu
  }
  return tong;
}

/** Đổi marker ảnh trong nội dung thành dòng ghi chú kèm đường dẫn, để biết câu có hình. */
function ghiChuAnh(text: string, imageUrl?: string): string {
  if (!text) return '';
  const markerRegex = /\[IMAGE_PLACEHOLDER\]|\[[^\]]*(?:HÌNH|ẢNH|BẢNG|ĐỒ THỊ|CHÚ Ý)[^\]]*\]/gi;
  const ghiChu = imageUrl ? `\n\n[Hình ảnh: ${imageUrl}]\n\n` : '\n\n[Câu này có hình vẽ nhưng chưa gắn ảnh]\n\n';
  const daThay = text.replace(markerRegex, ghiChu);
  // Có ảnh mà trong nội dung không có marker thì gắn ghi chú xuống cuối cho khỏi sót
  if (daThay === text && imageUrl && !/!\[[^\]]*\]\([^)]+\)/.test(text)) {
    return `${text}\n\n[Hình ảnh: ${imageUrl}]`;
  }
  return daThay;
}

/** Nhãn đáp án đúng đọc được bằng lời, cho cả 4 loại câu. */
function moTaDapAn(q: CauHoiXuat): string {
  const dap = (q.correct_answer || '').trim();
  if (!dap) return '(chưa có đáp án)';
  if (q.question_type === 'DS' || dap.length === 4) {
    const y = ['a', 'b', 'c', 'd'];
    const chiTiet = dap.split('').map((c, i) => `${y[i]}) ${c === 'D' || c === 'T' ? 'Đúng' : 'Sai'}`).join(', ');
    return `${dap} — ${chiTiet}`;
  }
  return dap;
}

/** Dựng khối Markdown cho MỘT câu hỏi. `soThuTu` để đánh số trong file. */
export function dungKhoiCauHoi(q: CauHoiXuat, soThuTu: number, kemLoiGiai = true): string {
  const dong: string[] = [];

  dong.push(`## Câu ${soThuTu}${q.question_id ? ` — ${q.question_id}` : ''}`);
  dong.push('');
  dong.push(`**Lớp:** ${q.grade || 'chưa rõ'} · **Phân môn:** ${q.subject || 'chưa rõ'}`);
  dong.push(`**Chương:** ${q.topic || 'chưa rõ'}`);
  dong.push(`**Bài:** ${q.lesson || 'chưa rõ'}`);
  dong.push(`**Dạng toán:** ${q.math_form || 'chưa rõ'}`);
  dong.push(`**Loại câu:** ${bankTypeLabel(q.question_type)} · **Mức độ:** ${difficultyLabel(q.difficulty)}`);
  dong.push('');
  dong.push(`**Đề bài:** ${ghiChuAnh(q.content || '', q.image_url).trim()}`);

  const dapAnDung = (q.correct_answer || '').trim().toUpperCase();
  const luaChon: [string, string | undefined][] = [
    ['A', q.option_a], ['B', q.option_b], ['C', q.option_c], ['D', q.option_d],
  ];
  const coLuaChon = luaChon.some(([, v]) => v && v.trim());

  if (coLuaChon) {
    dong.push('');
    for (const [nhan, noiDung] of luaChon) {
      if (!noiDung || !noiDung.trim()) continue;
      // Chỉ đánh dấu đáp án đúng cho câu 1 lựa chọn; câu Đúng/Sai đã có mô tả riêng bên dưới
      const laDung = q.question_type !== 'DS' && dapAnDung === nhan;
      dong.push(laDung ? `- **${nhan}. ${noiDung.trim()}**  ← đáp án đúng` : `- ${nhan}. ${noiDung.trim()}`);
    }
  }

  dong.push('');
  dong.push(`**Đáp án:** ${moTaDapAn(q)}`);

  if (kemLoiGiai && q.explanation && q.explanation.trim()) {
    dong.push('');
    dong.push(`**Lời giải:** ${q.explanation.trim()}`);
  }

  dong.push('');
  dong.push('---');
  dong.push('');
  return dong.join('\n');
}

/** Dựng toàn bộ nội dung file Markdown cho một danh sách câu hỏi. */
export function dungFileMarkdown(questions: CauHoiXuat[], tuyChon: TuyChonXuat = {}): string {
  const { kemLoiGiai = true, tieuDe } = tuyChon;

  // Đầu file ghi rõ phạm vi để NotebookLM nắm bối cảnh khi trả lời
  const chuongCoTrong = Array.from(new Set(questions.map((q) => q.topic).filter(Boolean)));
  const lopCoTrong = Array.from(new Set(questions.map((q) => q.grade).filter(Boolean))).sort();

  const dau: string[] = [];
  dau.push(`# ${tieuDe || 'Ngân hàng câu hỏi Toán'}`);
  dau.push('');
  dau.push(`- **Số câu:** ${questions.length}`);
  dau.push(`- **Lớp:** ${lopCoTrong.join(', ') || 'chưa rõ'}`);
  dau.push(`- **Chương:** ${chuongCoTrong.join(' | ') || 'chưa rõ'}`);
  dau.push(`- **Ngày xuất:** ${new Date().toLocaleDateString('vi-VN')}`);
  dau.push(`- **Ghi chú:** Công thức toán viết theo LaTeX, đặt trong cặp dấu $...$`);
  dau.push('');
  dau.push('---');
  dau.push('');

  const than = questions.map((q, i) => dungKhoiCauHoi(q, i + 1, kemLoiGiai));
  return dau.join('\n') + than.join('\n');
}

/** Bỏ dấu tiếng Việt và ký tự lạ để đặt tên file an toàn trên mọi hệ điều hành. */
export function tenFileAnToan(text: string): string {
  return (text || 'ngan_hang')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'ngan_hang';
}
