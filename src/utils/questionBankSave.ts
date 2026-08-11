// Lưu danh sách câu hỏi đã bóc tách (dạng QuestionData) vào Ngân hàng câu hỏi.
// Tách từ handleSaveAll trong src/app/admin/questions/editor/page.tsx để dùng
// chung cho: trang "Soạn câu hỏi 1 lượt" (Lưu tất cả), hàng đợi tự động (lưu
// ngay sau mỗi lô), và modal "Hàng chờ xem lại" (Lưu vào ngân hàng).

import type { QuestionData } from "./aiQuestionScan";
import { toBankType, toDifficultyCode } from "./questionTypes";

export interface SaveResult {
  insertedCount: number;
  duplicatesSkipped: number;
  newCategoriesCreated: number;
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
  const validQuestions = questions.filter((q) => !q.isDuplicate);
  const duplicatesSkipped = questions.length - validQuestions.length;

  if (validQuestions.length === 0) {
    return { insertedCount: 0, duplicatesSkipped, newCategoriesCreated: 0 };
  }

  const newCats = validQuestions
    .filter((q) => q.isNewLesson || q.isNewMathForm)
    .map((q) => ({ grade: q.grade, subject: q.subject, topic: q.topic, lesson: q.lesson, math_form: q.math_form }));
  const uniqueNewCats = Array.from(new Set(newCats.map((c) => JSON.stringify(c)))).map((s) => JSON.parse(s));

  if (uniqueNewCats.length > 0) {
    const { error: catError } = await supabase.from('question_categories').insert(uniqueNewCats);
    if (catError) console.error("Lỗi thêm danh mục mới:", catError);
  }

  const inserts = validQuestions.map((q) => ({
    question_id: `CH_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    grade: q.grade,
    subject: q.subject,
    topic: q.topic,
    lesson: q.lesson,
    math_form: q.math_form,
    // Chốt về mã chuẩn ngay trước khi ghi, tránh lọt nhãn chữ vào CSDL làm hỏng bộ lọc
    question_type: toBankType(q.question_type) ?? 'NLC',
    difficulty: toDifficultyCode(q.difficulty) ?? '1',
    content: q.content,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    image_url: q.image_url,
    usage_count: 0,
  }));

  const { error } = await supabase.from('questions').insert(inserts);
  if (error) throw error;

  return { insertedCount: inserts.length, duplicatesSkipped, newCategoriesCreated: uniqueNewCats.length };
}
