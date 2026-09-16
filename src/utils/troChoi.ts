/**
 * Trò chơi trên lớp — phần dùng chung phía trình duyệt (máy chiếu và điện thoại).
 */

/** Điểm một câu theo mức thầy chốt 16/9/2026: nhận biết ±1, thông hiểu ±2, vận dụng ±3. */
export const diemTheoMuc = (muc: number): number => (muc >= 3 ? 3 : muc === 2 ? 2 : 1);

export const TEN_MUC: Record<number, string> = { 0: 'Nhận biết', 1: 'Nhận biết', 2: 'Thông hiểu', 3: 'Vận dụng', 4: 'Vận dụng cao' };

/** Xáo mảng (Fisher–Yates), trả mảng mới. */
export function xao<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/**
 * So câu trả lời ngắn với đáp án: bỏ khoảng trắng, coi dấu phẩy và dấu chấm thập phân như
 * nhau, so số nếu cả hai là số (để "3.5" = "3,5" = "3,50"), còn lại so chữ không phân biệt hoa thường.
 */
export function khopTraLoiNgan(traLoi: string, dapAn: string): boolean {
  const chuan = (s: string) => String(s || '').replace(/\s+/g, '').replace(/\$/g, '').replace(',', '.').toLowerCase();
  const a = chuan(traLoi), b = chuan(dapAn);
  if (!a) return false;
  const na = Number(a), nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return Math.abs(na - nb) < 1e-9;
  return a === b;
}

/** Nhãn loại câu để bày lên màn hình / điện thoại */
export const TEN_LOAI: Record<string, string> = {
  multiple_choice: 'Trắc nghiệm', true_false: 'Đúng/Sai', true_false_cluster: 'Đúng/Sai 4 ý',
  short_answer: 'Trả lời ngắn', essay: 'Tự luận',
};

/**
 * Tách một câu nhiều ý (a) b) c)… hoặc a. b. c.) thành từng câu riêng cho trò chơi.
 *
 * Bài tập tự luyện hay có câu "Phân tích đa thức sau thành nhân tử: a) … b) … h)" — cả tám
 * ý là MỘT khối, đưa vào trò chơi thì không em nào làm nổi trong một lượt. Tách: phần dẫn
 * (chữ trước ý a) giữ lại ở đầu mỗi câu con, mỗi ý thành một câu tự luận; lời giải cũng
 * tách theo cùng nhãn nếu có. Câu không có ít nhất hai nhãn thì trả về nguyên câu.
 */
/**
 * Đổi chuỗi hai kí tự "\n" nằm NGOÀI công thức thành xuống dòng thật. Trong $…$ thì giữ nguyên
 * vì \ne, \neq, \nabla là lệnh LaTeX. Bản trước dò bằng chữ đứng sau nên "\ne)" (xuống dòng rồi
 * tới ý e) bị coi là \ne — màn chiếu in nguyên "\ne)" (thầy bắt được 16/9/2026).
 */
export function xuongDongNgoaiCongThuc(s: string): string {
  return String(s || '').split('$').map((doan, i) => (i % 2 === 0 ? doan.replace(/\\n/g, '\n') : doan)).join('$');
}

const NHAN_Y = /(^|\n)\s*(?:\*\*)?([a-h])[).]\s*(?:\*\*)?\s*/g;

function tachTheoNhan(text: string): { dan: string; y: { nhan: string; noiDung: string }[] } {
  const s = xuongDongNgoaiCongThuc(String(text || '')).replace(/\r/g, '');
  const moc = [...s.matchAll(NHAN_Y)].map(m => ({ nhan: m[2], batDau: m.index! + m[1].length, sau: m.index! + m[0].length }));
  if (moc.length < 2) return { dan: s, y: [] };
  /* Nhãn phải đi đúng thứ tự a, b, c… mới coi là các ý của một câu */
  for (let i = 1; i < moc.length; i++) if (moc[i].nhan.charCodeAt(0) !== moc[i - 1].nhan.charCodeAt(0) + 1) return { dan: s, y: [] };
  if (moc[0].nhan !== 'a') return { dan: s, y: [] };
  const dan = s.slice(0, moc[0].batDau).trim();
  const y = moc.map((m, i) => ({ nhan: m.nhan, noiDung: s.slice(m.sau, i + 1 < moc.length ? moc[i + 1].batDau : undefined).trim() }));
  return { dan, y };
}

export function tachYCau(quiz: any): any[] {
  const { dan, y } = tachTheoNhan(quiz.question);
  if (!y.length) return [quiz];
  const giai = tachTheoNhan(String(quiz.answer || quiz.sampleAnswer || quiz.explanation || ''));
  const giaiTheoNhan: Record<string, string> = {};
  for (const g of giai.y) giaiTheoNhan[g.nhan] = g.noiDung;
  return y.map(p => {
    const con: any = {
      type: 'essay',
      question: (dan ? dan + '\n' : '') + `${p.nhan}) ${p.noiDung}`,
      sourceQuestionId: quiz.sourceQuestionId,
      maCauHoi: quiz.maCauHoi ? `${quiz.maCauHoi}-${p.nhan}` : undefined,
      muc: quiz.muc,
    };
    const lg = giaiTheoNhan[p.nhan];
    if (lg) con.answer = (giai.dan && /phương pháp/i.test(giai.dan) ? giai.dan + '\n' : '') + lg;
    else if (quiz.answer || quiz.sampleAnswer || quiz.explanation) con.answer = String(quiz.answer || quiz.sampleAnswer || quiz.explanation);
    return con;
  });
}

/** Câu có tách được thành nhiều ý không (để bày nút "Tách ý"). */
export const soYTachDuoc = (quiz: any): number => tachTheoNhan(String(quiz?.question || '')).y.length;
