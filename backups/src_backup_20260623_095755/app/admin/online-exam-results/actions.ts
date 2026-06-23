"use server";

import { createClient } from "@/utils/supabase/server";

export async function fetchOnlineExamResultsAdmin() {
  const supabase = await createClient();

  // 1. Lấy danh sách submission + thông tin profile + thông tin exam
  const { data: submissions, error: subError } = await supabase
    .from('online_exam_submissions')
    .select(`
      id, student_id, exam_id, score, status, cheat_warnings, created_at,
      profiles (full_name, class_name, username, student_phone),
      online_exams (title, exam_group_name, variant_name, assigned_classes, duration_minutes)
    `)
    .order('created_at', { ascending: false });

  if (subError) {
    console.error("Lỗi lấy submissions:", subError);
    return { error: subError.message };
  }

  // 2. Lấy danh sách khóa học (courses)
  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .select('id, title, grade_level');

  // 3. Lấy danh sách toàn bộ đề thi (để làm bộ lọc dù chưa có ai nộp bài)
  const { data: allExams, error: examsError } = await supabase
    .from('online_exams')
    .select('id, title, exam_group_name, variant_name, assigned_classes')
    .order('created_at', { ascending: false });

  return {
    results: submissions || [],
    courses: courses || [],
    allExams: allExams || []
  };
}
