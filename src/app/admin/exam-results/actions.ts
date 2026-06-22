"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function fetchExamResultsAdmin() {
  // 1. Fetch classes
  const { data: classes } = await supabaseAdmin
    .from('classes')
    .select('id, name')
    .order('created_at', { ascending: false });

  // 2. Fetch enrollments
  const { data: enrollments } = await supabaseAdmin
    .from('enrollments')
    .select('student_id, class_id');

  // 3. Fetch exam results with profile and lesson data
  const { data: results, error } = await supabaseAdmin
    .from('exam_results')
    .select(`
      *,
      profiles (full_name, email),
      lessons (title)
    `)
    .order('created_at', { ascending: false });

  // 4. Fetch all students (profiles with role=STUDENT or all users)
  // Trong DB có thể không có cột role, ta lấy tất cả profiles
  const { data: students } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, class_name, student_phone');

  // 5. Fetch all lessons
  const { data: lessons } = await supabaseAdmin
    .from('lessons')
    .select('id, title')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching exam_results in admin:", error);
    return { error: error.code };
  }

  return {
    classes: classes || [],
    enrollments: enrollments || [],
    results: results || [],
    students: students || [],
    lessons: lessons || []
  };
}
