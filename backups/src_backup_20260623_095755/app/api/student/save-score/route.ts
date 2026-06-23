import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, moduleId, score, passed, cheatWarnings = 0 } = body;

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 });
    }

    // Lấy số lần thi (attempt) hiện tại của học sinh cho bài này
    const { data: attempts, error: fetchError } = await supabase
      .from('exam_results')
      .select('attempt_number')
      .eq('student_id', user.id)
      .eq('lesson_id', lessonId)
      .eq('module_id', moduleId || null)
      .order('attempt_number', { ascending: false })
      .limit(1);

    if (fetchError && fetchError.code !== '42P01') { // Bỏ qua lỗi table not found tạm thời nếu admin chưa chạy SQL
      console.error('Error fetching attempts:', fetchError);
    }

    const nextAttempt = (attempts && attempts.length > 0) ? attempts[0].attempt_number + 1 : 1;

    // Lưu kết quả mới
    const { data, error } = await supabase
      .from('exam_results')
      .insert([
        {
          student_id: user.id,
          lesson_id: lessonId,
          module_id: moduleId || null,
          score: score,
          passed: passed,
          attempt_number: nextAttempt,
          cheat_warnings: cheatWarnings
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error saving exam result:', error);
      // Nếu lỗi do chưa có bảng (42P01), trả về OK giả định để UI không lỗi, nhưng báo cho dev biết
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, warning: 'Table exam_results does not exist yet.' });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Save score error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
