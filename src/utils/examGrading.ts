/**
 * Quy tắc chấm điểm dùng CHUNG cho thi online.
 *
 * Trước đây API nộp bài tự viết cách chấm riêng, lệch với phần Luyện tập:
 * - Trả lời ngắn chỉ so trim+lowercase nên "0,5" bị chấm sai khi đáp án là "0.5".
 * - Đúng/Sai chia đều số ý đúng cho 4, không theo barem bậc thang của quy chế 2025
 *   (1 ý: 0,1 - 2 ý: 0,25 - 3 ý: 0,5 - 4 ý: 1,0) dù app đã có sẵn cách tính đúng.
 * Gom về một chỗ để hai nơi không bao giờ lệch nhau nữa.
 */

/**
 * Chuẩn hoá đáp án Trả lời ngắn trước khi so khớp.
 * Bỏ khoảng trắng, quy dấu phẩy thập phân về dấu chấm, bỏ ký hiệu $ của LaTeX,
 * đưa \frac{a}{b} về a/b và bỏ tiền tố "x=" / "y=" mà học sinh hay viết thêm.
 */
export function normalizeShortAnswer(s: string | null | undefined): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/\$/g, '')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
    .replace(/^[xy]=/, '');
}

/** Đúng nếu câu trả lời khớp một trong các đáp án được chấp nhận. */
export function isShortAnswerCorrect(
  studentAnswer: string | null | undefined,
  acceptedAnswers: any
): boolean {
  const hs = normalizeShortAnswer(studentAnswer);
  if (!hs) return false;
  const list = Array.isArray(acceptedAnswers) ? acceptedAnswers : [acceptedAnswers];
  return list.some(a => a !== undefined && a !== null && normalizeShortAnswer(String(a)) === hs);
}

/**
 * Tỉ lệ điểm của một câu Đúng/Sai 4 ý theo barem bậc thang 2025.
 * Trả về 0 → 1 để nhân với số điểm của câu đó.
 */
export function trueFalseRatio(correctCount: number): number {
  if (correctCount >= 4) return 1.0;
  if (correctCount === 3) return 0.5;
  if (correctCount === 2) return 0.25;
  if (correctCount === 1) return 0.1;
  return 0;
}

/**
 * Đếm số ý đúng của một câu Đúng/Sai.
 * Chấp nhận đáp án học sinh ở cả hai dạng: mảng [true,false,...] hoặc
 * object { "0": true, "1": false } - vì hai màn hình trong app lưu khác nhau.
 */
export function countTrueFalseCorrect(studentAns: any, correctAns: any): number {
  if (!correctAns) return 0;
  const layDapAn = (nguon: any, i: number) => {
    if (Array.isArray(nguon)) return nguon[i];
    if (nguon && typeof nguon === 'object') return nguon[String(i)] ?? nguon[i];
    return undefined;
  };
  let dung = 0;
  for (let i = 0; i < 4; i++) {
    const hs = layDapAn(studentAns, i);
    const chuan = layDapAn(correctAns, i);
    if (chuan === undefined || chuan === null) continue;
    if (hs !== undefined && hs !== null && hs === chuan) dung++;
  }
  return dung;
}

export interface KetQuaChamTuDong {
  /** Điểm đã chấm được (không tính câu tự luận) */
  diem: number;
  /** Các câu tự luận cần AI hoặc giáo viên chấm */
  cauTuLuan: { qIndex: number; question: string; answerText: string; studentAnswer: any }[];
}

/**
 * Chấm toàn bộ phần máy chấm được (trắc nghiệm, đúng/sai, trả lời ngắn).
 * Câu tự luận được gom lại trả về để xử lý riêng.
 */
export function chamTuDong(
  examData: any[],
  answers: Record<string, any>,
  diemMoiCau: number
): KetQuaChamTuDong {
  let diem = 0;
  const cauTuLuan: KetQuaChamTuDong['cauTuLuan'] = [];

  examData.forEach((q: any, idx: number) => {
    const loai = q.type || 'multiple_choice';
    const traLoi = answers ? answers[idx] : undefined;

    if (loai === 'multiple_choice') {
      if (traLoi !== undefined && traLoi !== null && traLoi === q.answerIndex) diem += diemMoiCau;
    } else if (loai === 'true_false') {
      const soYDung = countTrueFalseCorrect(traLoi, q.answers);
      diem += trueFalseRatio(soYDung) * diemMoiCau;
    } else if (loai === 'short_answer') {
      if (isShortAnswerCorrect(traLoi, q.correct_answers)) diem += diemMoiCau;
    } else if (loai === 'essay') {
      cauTuLuan.push({
        qIndex: idx,
        question: q.question,
        answerText: q.answerText,
        studentAnswer: traLoi,
      });
    }
  });

  return { diem, cauTuLuan };
}
