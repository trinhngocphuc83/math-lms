// Lưu danh sách câu hỏi đã bóc tách (dạng QuestionData) vào Ngân hàng câu hỏi.
// Tách từ handleSaveAll trong src/app/admin/questions/editor/page.tsx để dùng
// chung cho: trang "Soạn câu hỏi 1 lượt" (Lưu tất cả), hàng đợi tự động (lưu
// ngay sau mỗi lô), và modal "Hàng chờ xem lại" (Lưu vào ngân hàng).

import type { QuestionData } from "./aiQuestionScan";
import { toBankType, toDifficultyCode } from "./questionTypes";
import { docDapAnDungSai, dapAnDungSaiDungKhuon } from "./chuanHoaCauHoi";
import { nanTenPhanLoai } from "./deThi";
import { doiVeTenChuan } from "./phanLoaiCauHoi";
import { findMatchingChapterTitle, findMatchingLessonTitle } from "./topicMatch";
import { boSungYeuCauCanDat } from "./yeuCauCanDat";

export interface SaveResult {
  insertedCount: number;
  duplicatesSkipped: number;
  newCategoriesCreated: number;
  /** Câu bị giữ lại vì chưa rõ Chương, Bài hoặc Dạng - KHÔNG ghi vào kho. */
  thieuPhanLoai: QuestionData[];
  /** Chỗ máy đã tự nắn lại trước khi ghi, để báo cho thầy cô biết. */
  daNan: string[];
  /** Câu ghi được nhưng còn khuyết, dùng đề thi sẽ hỏng - cần thầy cô sửa sau. */
  conKhuyet: string[];
}

/**
 * Câu chưa đủ Chương, Bài hoặc Dạng thì không được vào kho.
 *
 * Thiếu Dạng cũng phải chặn chứ không riêng Chương và Bài: cây chọn dạng ở trang ra đề
 * xếp câu theo Dạng, thiếu Dạng là câu nằm trong kho mà không bao giờ đưa vào ma trận
 * được - coi như mất câu.
 */
const thieuPhanLoaiGoc = (q: QuestionData): boolean =>
  !String(q.topic || '').trim() || !String(q.lesson || '').trim() || !String(q.math_form || '').trim();

/**
 * Nắn đáp án về đúng khuôn của từng loại câu, và chỉ ra chỗ còn khuyết.
 *
 * Làm ở CỬA LƯU chứ không chỉ ở đường quét AI: câu đẩy từ Luyện tập sang, hay câu thầy
 * cô gõ tay, đều không đi qua chuanHoaCauHoi. Đo trên kho thật trước khi có chốt này:
 * 134 câu Đúng/Sai ghi đáp án kiểu "Đ, S, Đ, S" hay "a) Sai, b) Đúng..." nên mọi nơi
 * đọc đáp án đều coi như câu chưa có đáp án.
 */
function nanDapAn(q: QuestionData, loai: string): { correct: string; nan?: string; khuyet?: string } {
  const dap = String(q.correct_answer || '').trim();
  const nhan = String(q.content || '').replace(/\s+/g, ' ').slice(0, 40);

  if (loai === 'DS') {
    if (!dapAnDungSaiDungKhuon(dap)) {
      const doc = docDapAnDungSai(dap);
      if (doc) return { correct: doc, nan: `"${nhan}...": đáp án Đúng/Sai gom về "${doc}"` };
      return { correct: dap, khuyet: `"${nhan}...": đáp án Đúng/Sai chưa đúng khuôn ĐSSĐ` };
    }
    const doc = docDapAnDungSai(dap);
    return { correct: doc || dap };
  }

  if (loai === 'NLC') {
    const c = dap.toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(c)) return { correct: c, nan: c !== dap ? undefined : undefined };
    return { correct: dap, khuyet: `"${nhan}...": trắc nghiệm chưa có đáp án A/B/C/D` };
  }

  if (loai === 'TLN' && !dap) {
    return { correct: dap, khuyet: `"${nhan}...": trả lời ngắn chưa có đáp án` };
  }

  return { correct: dap };
}

/**
 * Bảo đảm mỗi tổ hợp (lớp, môn, chương, bài, dạng) của các câu này ĐỀU CÓ dòng danh mục.
 *
 * Tách riêng ra để những đường KHÔNG đi qua saveQuestionsToBank vẫn gọi được - đường sửa
 * câu trong Ngân hàng và đường nạp dữ liệu từ Excel. Thiếu dòng danh mục thì câu vẫn nằm
 * trong kho nhưng cây chọn dạng ở trang ra đề không hiện, coi như mất câu.
 *
 * Trả về số dòng vừa thêm.
 */
export async function baoDamCoDongDanhMuc(supabase: any, cacCau: any[]): Promise<number> {
  const khoa = (c: any) =>
    [c.grade, c.subject, c.topic, c.lesson, c.math_form].map((x) => String(x || '').trim()).join('|');

  const dayDu = cacCau.filter(
    (q) => String(q.topic || '').trim() && String(q.lesson || '').trim() && String(q.math_form || '').trim());
  if (dayDu.length === 0) return 0;

  const { data: dmHienCo } = await supabase
    .from('question_categories').select('grade, subject, topic, lesson, math_form');
  const daCo = new Set((dmHienCo || []).map(khoa));

  const canThem: any[] = [];
  for (const q of dayDu) {
    const c = { grade: q.grade, subject: q.subject, topic: q.topic, lesson: q.lesson, math_form: q.math_form };
    const k = khoa(c);
    if (daCo.has(k)) continue;
    daCo.add(k);
    canThem.push(c);
  }
  if (canThem.length === 0) return 0;

  const coYeuCau = await boSungYeuCauCanDat(canThem, (c) =>
    dayDu.filter((q) => q.topic === c.topic && q.lesson === c.lesson && q.math_form === c.math_form)
      .map((q) => String(q.content || '')).filter(Boolean));
  const { error } = await supabase.from('question_categories').insert(coYeuCau);
  if (error) { console.error('Lỗi thêm danh mục mới:', error); return 0; }
  return canThem.length;
}

/**
 * Lưu các câu hỏi hợp lệ (chưa trùng) vào bảng `questions`, tự thêm Bài học/Dạng
 * toán mới vào `question_categories` nếu câu hỏi đánh dấu isNewLesson/isNewMathForm.
 *
 * Lưu ý: hàm này KHÔNG tự hỏi trước khi thêm danh mục mới (giữ đúng hành vi cũ
 * của trang "Soạn câu hỏi 1 lượt"). Nơi cần duyệt danh mục mới trước khi lưu
 * (hàng đợi tự động) phải tự giải quyết isNewTopic/isNewLesson/isNewMathForm
 * TRƯỚC khi gọi hàm này.
 */
export async function saveQuestionsToBank(supabase: any, questions: QuestionData[]): Promise<SaveResult> {
  const chuaTrung = questions.filter((q) => !q.isDuplicate);
  const duplicatesSkipped = questions.length - chuaTrung.length;

  // Chặn ngay tại cửa lưu: thiếu Chương hoặc Bài thì giữ lại để hỏi thầy cô, thay vì ghi
  // chuỗi rỗng vào kho. Đo trên kho Toán trước khi có chốt này: 60 câu không có chương và
  // 139 câu không có bài đã lọt vào, riêng 60 câu kia lọt cùng MỘT lượt lưu.
  const thieuPhanLoai = chuaTrung.filter(thieuPhanLoaiGoc);
  const validQuestions = chuaTrung.filter((q) => !thieuPhanLoaiGoc(q));

  const daNan: string[] = [];
  const conKhuyet: string[] = [];

  if (validQuestions.length === 0) {
    return { insertedCount: 0, duplicatesSkipped, newCategoriesCreated: 0, thieuPhanLoai, daNan, conKhuyet };
  }

  /*
   * Nắn tên Chương/Bài/Dạng viết sai LaTeX kiểu "${{X}}$" về "$X$".
   *
   * Không phải chuyện thẩm mỹ: chuỗi "${{" bị tường lửa của Supabase coi là dấu hiệu
   * tấn công template injection nên chặn nguyên truy vấn, trả về trang chặn không kèm
   * cờ CORS. Trang chọn câu vì thế chỉ báo được "Failed to fetch" rồi chết câm. App Lý
   * đã dính đúng lỗi này với 13 dạng. Chặn ngay từ cửa lưu để không tái diễn.
   */
  for (const q of validQuestions) {
    for (const cot of ['topic', 'lesson', 'math_form'] as const) {
      const cu = String((q as any)[cot] ?? '');
      const moi = nanTenPhanLoai(cu);
      if (moi !== cu) {
        (q as any)[cot] = moi;
        daNan.push(`Tên viết sai LaTeX: "${cu}" -> "${moi}"`);
      }
    }
  }

  /*
   * Bảo đảm danh mục CÓ DÒNG cho mọi tổ hợp sắp ghi.
   *
   * Trước đây chỉ thêm khi câu bật cờ isNewLesson/isNewMathForm - tức là tin vào phán
   * đoán của AI lúc quét. AI tưởng dạng đã có nên không bật cờ, mà thật ra tổ hợp
   * (lớp, chương, bài, dạng) chưa hề có dòng nào, thế là câu vào kho mà cây chọn dạng
   * không hiện ra. Đo trên kho thật: 68 tổ hợp mồ côi kiểu này. Giờ TRA BẢNG THẬT.
   */
  const khoa = (c: any) =>
    [c.grade, c.subject, c.topic, c.lesson, c.math_form].map((x) => String(x || '').trim()).join('|');

  const { data: dmHienCo } = await supabase
    .from('question_categories').select('grade, subject, topic, lesson, math_form');
  const daCo = new Set((dmHienCo || []).map(khoa));

  /*
   * Bám vào tên ĐÃ CÓ thay vì đẻ thêm tên song sinh.
   *
   * Tên chỉ lệch dấu chấm cuối, hoa thường hay một cặp ngoặc nhọn trong công thức thì
   * với khoá ở trên vẫn là tổ hợp mới, thế là kho có thêm một dạng y hệt dạng cũ và câu
   * bị xé lẻ ra hai chỗ - ra đề theo dạng nào cũng hụt câu. Kho Lý đã sinh ra ba biến
   * thể của cùng một dạng đúng theo lối đó. Ở đây kéo tên câu về đúng tên trong danh mục
   * (xem chuanTen trong phanLoaiCauHoi.ts), và báo cho thầy cô biết đã kéo chỗ nào.
   *
   * Riêng Chương và Bài còn so thêm THEO SỐ THỨ TỰ, vì chuanTen chỉ bỏ qua hoa thường và
   * dấu, không bỏ qua số La Mã. Kho Toán vì thiếu chốt này mà có "CHƯƠNG I. ỨNG DỤNG ĐẠO
   * HÀM..." nằm cạnh "Chương 1. Ứng dụng đạo hàm..." - cùng một chương, 731 câu bị xé làm
   * hai nhánh trên cây chọn dạng.
   */
  for (const q of validQuestions) {
    for (const cot of ['topic', 'lesson', 'math_form'] as const) {
      const cu = String((q as any)[cot] ?? '').trim();
      if (!cu) continue;
      const dsCoSan = (dmHienCo || [])
        .filter((d: any) => String(d.grade) === String(q.grade) && d.subject === q.subject)
        .map((d: any) => String(d[cot] || '')).filter(Boolean);
      const chuan = doiVeTenChuan(cu, dsCoSan)
        || (cot === 'topic' ? findMatchingChapterTitle(cu, dsCoSan) : null)
        || (cot === 'lesson' ? findMatchingLessonTitle(cu, dsCoSan) : null);
      if (chuan && chuan !== cu) {
        (q as any)[cot] = chuan;
        daNan.push(`Tên trùng dạng đã có, đã gộp lại: "${cu}" -> "${chuan}"`);
      }
    }
  }

  const uniqueNewCats: any[] = [];
  for (const q of validQuestions) {
    const c = { grade: q.grade, subject: q.subject, topic: q.topic, lesson: q.lesson, math_form: q.math_form };
    const k = khoa(c);
    if (daCo.has(k)) continue;
    daCo.add(k);
    uniqueNewCats.push(c);
  }

  if (uniqueNewCats.length > 0) {
    /* Dạng mới phải có "Yêu cầu cần đạt" ngay từ lúc sinh ra. Trước đây chỗ này ghi
       danh mục trống, nên bảng đặc tả in ra phải lấy tạm tên dạng thay cho yêu cầu. */
    /* Truyền kèm vài câu THẬT của dạng đó - máy soạn yêu cầu bám câu thật sát hơn hẳn
       so với chỉ nhìn tên dạng. */
    const coYeuCau = await boSungYeuCauCanDat(uniqueNewCats, (c) =>
      validQuestions
        .filter((q) => q.topic === c.topic && q.lesson === c.lesson && q.math_form === c.math_form)
        .map((q) => String(q.content || ''))
        .filter(Boolean));
    const { error: catError } = await supabase.from('question_categories').insert(coYeuCau);
    if (catError) console.error("Lỗi thêm danh mục mới:", catError);
  }

  const inserts = validQuestions.map((q) => {
    const loai = toBankType(q.question_type) ?? 'NLC';
    const nan = nanDapAn(q, loai);
    if (nan.nan) daNan.push(nan.nan);
    if (nan.khuyet) conKhuyet.push(nan.khuyet);

    // Câu Đúng/Sai thiếu mệnh đề thì in ra đề là ô trống, phải báo ngay lúc lưu
    if (loai === 'DS' && ![q.option_a, q.option_b, q.option_c, q.option_d].every((x) => String(x || '').trim())) {
      conKhuyet.push(`"${String(q.content || '').replace(/\s+/g, ' ').slice(0, 40)}...": câu Đúng/Sai chưa đủ 4 mệnh đề`);
    }

    return {
      question_id: `CH_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      grade: q.grade,
      subject: q.subject,
      topic: q.topic,
      lesson: q.lesson,
      math_form: q.math_form,
      // Chốt về mã chuẩn ngay trước khi ghi, tránh lọt nhãn chữ vào CSDL làm hỏng bộ lọc
      question_type: loai,
      difficulty: toDifficultyCode(q.difficulty) ?? '1',
      content: q.content,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: nan.correct,
      explanation: q.explanation,
      image_url: q.image_url,
      usage_count: 0,
    };
  });

  const { error } = await supabase.from('questions').insert(inserts);
  if (error) throw error;

  return {
    insertedCount: inserts.length,
    duplicatesSkipped,
    newCategoriesCreated: uniqueNewCats.length,
    thieuPhanLoai,
    daNan,
    conKhuyet,
  };
}
