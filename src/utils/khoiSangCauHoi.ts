/**
 * ĐỔI KHỐI CÂU HỎI TRONG BÀI SOẠN SANG DẠNG CÂU HỎI CỦA NGÂN HÀNG.
 *
 * Bài ôn tập và bài kiểm tra giữ câu hỏi ở dạng khối `quiz`, mỗi khối một object riêng
 * (`question`, `options`, `answerIndex`, `sampleAnswer`…). Còn mọi bộ soát của app -
 * kiểm thử đề, rà câu trùng, sửa lỗi bằng AI - đều nói bằng dạng của ngân hàng
 * (`content`, `option_a..d`, `correct_answer`, `explanation`).
 *
 * Trước đây phép đổi này nằm lọt trong PushToBankModal nên chỉ đường "đẩy câu sang kho"
 * mới dùng được. Tách ra đây để khu soạn bài soát được câu bằng đúng bộ đang chạy ở
 * Quản lý Đề thi, không phải viết lại luật lần thứ hai - hai bộ luật rồi sẽ lệch nhau.
 *
 * Hàm thuần, không đụng cơ sở dữ liệu, kiểm được bằng máy.
 */

import type { CauDeSoat } from './kiemThuDe';

/** Một khối trong bài soạn. `content` là object của khối quiz. */
export interface KhoiBaiSoan {
  id?: string;
  type?: string;
  content?: any;
}

/** Câu đã đổi sang dạng ngân hàng, kèm chỗ nó nằm trong bài để còn nhảy tới. */
export interface CauTuKhoi extends CauDeSoat {
  id: string;
  /** Vị trí khối trong mảng blocks - dùng để ghi ngược bản sửa về đúng khối. */
  viTriKhoi: number;
  /** Số hiệu câu hỏi tính theo thứ tự các khối quiz, khớp với Bản đồ. */
  soCau: number;
  question_type: string;
}

const chu = (x: any) => String(x ?? '');

/** Lấy chữ của một phương án, khối cũ để chuỗi trần, khối mới để object. */
const chuPhuongAn = (o: any): string =>
  typeof o === 'string' ? o : chu(o?.content ?? o?.text);

/**
 * Đổi một khối quiz sang dạng câu hỏi ngân hàng.
 *
 * Giữ đúng cách đọc của PushToBankModal để hai đường không lệch nhau: cùng một khối thì
 * bộ soát và bộ đẩy sang kho phải hiểu giống hệt nhau.
 */
export function cauTuKhoiQuiz(c: any): Omit<CauTuKhoi, 'id' | 'viTriKhoi' | 'soCau'> {
  const loai = chu(c?.type) || 'multiple_choice';
  let option_a = '', option_b = '', option_c = '', option_d = '';
  let correct_answer = '';

  if (loai === 'multiple_choice' || loai === 'true_false') {
    const pa = Array.isArray(c?.options) ? c.options : [];
    [option_a, option_b, option_c, option_d] = [0, 1, 2, 3].map(i => chuPhuongAn(pa[i]));
    correct_answer = ['A', 'B', 'C', 'D'][c?.answerIndex ?? 0] || 'A';
  } else if (loai === 'short_answer') {
    correct_answer = chu(c?.exactAnswer || c?.answer || c?.correctAnswer);
  } else if (loai === 'true_false_cluster') {
    const y = (Array.isArray(c?.options) ? c.options : c?.statements) || [];
    [option_a, option_b, option_c, option_d] = [0, 1, 2, 3].map(i => chuPhuongAn(y[i]));
    correct_answer = y.map((s: any) => (s?.isTrue ? 'Đ' : 'S')).join('');
  } else if (loai === 'essay') {
    correct_answer = chu(c?.sampleAnswer || c?.answer);
  }

  /* Lời giải của bài soạn nằm rải ở nhiều trường khác nhau tuỳ khối được sinh ra lúc nào.
     Gộp lại theo đúng thứ tự đọc để bộ soát nhìn thấy đủ, chứ soi mỗi `explanation` thì
     câu nào cũng bị báo "không có lời giải" oan. */
  const loiGiai = [
    chu(c?.phuong_phap_giai),
    ...(Array.isArray(c?.cac_buoc_thuc_hien) ? c.cac_buoc_thuc_hien.map(chu) : []),
    chu(c?.explanation || c?.sampleAnswer || c?.answer),
  ].filter(s => s.trim()).join('\n');

  return {
    question_type: loai,
    content: chu(c?.question),
    option_a, option_b, option_c, option_d,
    correct_answer,
    explanation: loiGiai,
    image_url: chu(c?.imageUrl),
  };
}

/**
 * Mọi câu hỏi trong một bài soạn, theo đúng thứ tự khối.
 *
 * Khối hỏng (content không phải object) bị bỏ qua chứ không ném lỗi - bài đang soạn dở
 * thì lúc nào cũng có khối chưa xong, mà bấm soát lại thì không được vỡ.
 */
export function cacCauTrongBai(blocks: KhoiBaiSoan[]): CauTuKhoi[] {
  const ra: CauTuKhoi[] = [];
  (blocks || []).forEach((b, viTriKhoi) => {
    if (b?.type !== 'quiz' || !b?.content || typeof b.content !== 'object') return;
    ra.push({
      ...cauTuKhoiQuiz(b.content),
      id: chu(b.id) || `khoi-${viTriKhoi}`,
      viTriKhoi,
      soCau: ra.length + 1,
    });
  });
  return ra;
}

/* ===================== GHI NGƯỢC BẢN SỬA VỀ KHỐI ===================== */

/** Những trường của câu ngân hàng mà bộ sửa lỗi có thể vá. */
export type BanVaCau = Partial<Pick<CauDeSoat,
  'content' | 'option_a' | 'option_b' | 'option_c' | 'option_d' | 'correct_answer' | 'explanation'>>;

/**
 * Đắp bản vá ngược vào khối quiz.
 *
 * Đây là chiều ngược của `cauTuKhoiQuiz`, và là chỗ dễ làm hỏng bài nhất: khối giữ phương
 * án ở `options` chứ không phải `option_a..d`, giữ đáp án ở `answerIndex` chứ không phải
 * chữ "A". Đắp sai một chỗ là câu mất phương án hoặc đổi đáp án - nên chỉ đụng vào đúng
 * những trường có trong bản vá, còn lại giữ nguyên xi.
 *
 * Trả về content MỚI, không sửa tại chỗ.
 */
export function dapVaVaoKhoi(content: any, va: BanVaCau): any {
  const moi = { ...(content || {}) };
  const loai = chu(moi?.type) || 'multiple_choice';

  if (va.content !== undefined) moi.question = va.content;

  const paMoi = [va.option_a, va.option_b, va.option_c, va.option_d];
  if (paMoi.some(x => x !== undefined)) {
    const cu = Array.isArray(moi.options) ? [...moi.options] : [];
    /* Giữ nguyên hình dạng cũ của từng phương án: khối cũ để chuỗi trần, khối mới để
       object có thêm `isTrue` - đắp đè bằng chuỗi là mất cờ Đúng/Sai của cụm bốn ý. */
    moi.options = paMoi.map((x, i) => {
      if (x === undefined) return cu[i];
      if (cu[i] && typeof cu[i] === 'object') return { ...cu[i], content: x };
      return x;
    }).filter((x, i) => x !== undefined || i < cu.length);
  }

  if (va.correct_answer !== undefined) {
    const dap = chu(va.correct_answer);
    if (loai === 'multiple_choice' || loai === 'true_false') {
      const i = ['A', 'B', 'C', 'D'].indexOf(dap.trim().toUpperCase().slice(0, 1));
      if (i >= 0) moi.answerIndex = i;
    } else if (loai === 'true_false_cluster') {
      const y = dap.toUpperCase().replace(/[^ĐSTF]/g, '').replace(/T/g, 'Đ').replace(/F/g, 'S');
      if (y.length === 4 && Array.isArray(moi.options)) {
        moi.options = moi.options.map((o: any, i: number) =>
          (o && typeof o === 'object' ? { ...o, isTrue: y[i] === 'Đ' } : o));
      }
    } else if (loai === 'short_answer' || loai === 'essay') {
      /* Ghi vào ĐÚNG trường khối đang dùng, không tạo trường mới.
         Khối sinh ra ở những đợt khác nhau nên đáp án mẫu nằm chỗ khác nhau: có khối để ở
         `sampleAnswer`, có khối để ở `answer`, có khối ở `exactAnswer`. Cứ ghi cứng vào
         một trường thì vá xong sinh ra trường thứ hai, còn giao diện vẫn đọc trường cũ -
         nhìn vào tưởng bản vá không ăn. Đã gặp đúng chuyện này lúc kiểm trên bài thật. */
      const uuTien = loai === 'short_answer'
        ? ['exactAnswer', 'answer', 'correctAnswer']
        : ['sampleAnswer', 'answer'];
      const truong = uuTien.find(k => moi[k] !== undefined) ?? uuTien[0];
      moi[truong] = dap;
    }
  }

  /* Lời giải gộp từ ba trường, nên sửa xong thì dồn về một chỗ và dọn hai chỗ kia -
     để lại thì bài in ra có hai bản lời giải, bản cũ sai nằm ngay dưới bản mới đúng. */
  if (va.explanation !== undefined) {
    moi.explanation = va.explanation;
    delete moi.phuong_phap_giai;
    delete moi.cac_buoc_thuc_hien;
  }

  return moi;
}
