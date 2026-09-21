import { blockTypeToBankType } from './questionTypes';

/**
 * Đổi các khối ```quiz``` của một bài Luyện tập / đề ôn tập sang ĐÚNG khuôn câu hỏi của
 * ngân hàng, để đưa vào cùng bộ xuất mà Quản lý Đề thi đang dùng (exportDocx,
 * phieuTraLoi, huongDanCham).
 *
 * Trước đây "Xuất Giáo Án (Word)" ở trình soạn đi một đường riêng (giaoAnWord) - in được
 * lý thuyết nhưng đề thì không có đầu đề, không chia PHẦN I/II/III, không có phiếu trả
 * lời hay hướng dẫn chấm. Thầy muốn xuất từ Ôn tập & Kiểm tra giống hệt Quản lý Đề thi,
 * nên câu phải về cùng một khuôn dữ liệu rồi dùng chung bộ dựng - không dựng bản thứ hai.
 *
 * Khác biệt phải xử ở đây:
 * - `question_type` ghi MÃ NGÂN HÀNG (NLC/DS/TLN/TL) vì exportDocx rẽ nhánh theo mã ấy.
 * - Tự luận: lời giải để ở `explanation`, `correct_answer` bỏ trống - có thì bộ xuất in
 *   thêm dòng "➜ Kết luận" chép lại nguyên lời giải (lỗi từng gặp khi rà chương IV).
 * - Lời giải ghép từ `phuong_phap_giai` + `cac_buoc_thuc_hien` theo đúng hai nhãn
 *   "Phương pháp giải:" / "Lời giải:" mà bộ xuất nhận ra để dựng hộp kỹ thuật.
 */
export interface CauKhoTuKhoi {
  id: string;
  question_type: 'NLC' | 'DS' | 'TLN' | 'TL';
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  image_url: string;
  difficulty: string;
  /** Mã câu trong kho nếu khối được rút từ ngân hàng. */
  sourceQuestionId?: string;
}

const chuCua = (o: any): string => (typeof o === 'string' ? o : (o?.content ?? o?.text ?? ''));

function ghepLoiGiai(c: any): string {
  const pp = String(c.phuong_phap_giai || '').trim();
  const buoc: string[] = Array.isArray(c.cac_buoc_thuc_hien)
    ? c.cac_buoc_thuc_hien.map((b: any) => String(b || '').trim()).filter(Boolean)
    : [];
  if (pp || buoc.length) {
    const phan: string[] = [];
    if (pp) phan.push(`Phương pháp giải: ${pp}`);
    if (buoc.length) phan.push('Lời giải:\n' + buoc.map((b) => `- ${b}`).join('\n'));
    return phan.join('\n');
  }
  return String(c.explanation || c.sampleAnswer || c.answer || '').trim();
}

/** Một khối quiz (đã parse JSON) -> một câu khuôn kho. */
export function khoiQuizSangCauKho(c: any, viTri: number): CauKhoTuKhoi {
  const loai = blockTypeToBankType(c?.type || 'multiple_choice');
  const cau: CauKhoTuKhoi = {
    id: c?.sourceQuestionId || c?.id || `khoi_${viTri}`,
    question_type: loai,
    content: String(c?.question || c?.content || '').trim(),
    option_a: '', option_b: '', option_c: '', option_d: '',
    correct_answer: '',
    explanation: ghepLoiGiai(c || {}),
    image_url: String(c?.imageUrl || c?.image_url || ''),
    difficulty: String(c?.muc || c?.difficulty || ''),
    sourceQuestionId: c?.sourceQuestionId,
  };
  if (loai === 'NLC') {
    const opts = Array.isArray(c.options) ? c.options : [];
    [cau.option_a, cau.option_b, cau.option_c, cau.option_d] = [0, 1, 2, 3].map((k) => chuCua(opts[k]));
    const idx = typeof c.answerIndex === 'number' ? c.answerIndex : -1;
    cau.correct_answer = ['A', 'B', 'C', 'D'][idx] || '';
  } else if (loai === 'DS') {
    const y = Array.isArray(c.options) ? c.options : (Array.isArray(c.statements) ? c.statements : []);
    [cau.option_a, cau.option_b, cau.option_c, cau.option_d] = [0, 1, 2, 3].map((k) => chuCua(y[k]));
    cau.correct_answer = y.slice(0, 4).map((s: any) => (s?.isTrue || s?.correct === true ? 'Đ' : 'S')).join('');
  } else if (loai === 'TLN') {
    cau.correct_answer = String(c.exactAnswer ?? c.correctAnswer ?? c.answer ?? '').trim();
  }
  return cau;
}

/**
 * Lấy mọi khối quiz trong markdown (khối ```quiz``` chứa một câu hoặc một mảng câu) và
 * đổi hết sang khuôn kho, giữ đúng thứ tự xuất hiện. Khối hỏng JSON thì bỏ qua.
 */
export function cauKhoTuMarkdown(markdown: string): CauKhoTuKhoi[] {
  const ra: CauKhoTuKhoi[] = [];
  const re = /```quiz[^\n]*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(markdown || '')))) {
    try {
      const j = JSON.parse(m[1]);
      for (const c of Array.isArray(j) ? j : [j]) {
        if (c && typeof c === 'object') ra.push(khoiQuizSangCauKho(c, ra.length));
      }
    } catch { /* khối hỏng thì bỏ */ }
  }
  return ra;
}
