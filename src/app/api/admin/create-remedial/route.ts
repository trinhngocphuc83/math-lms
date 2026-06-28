import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { exam_result_id, student_id, lesson_id, questions_data } = body;

    if (!exam_result_id || !student_id || !lesson_id || !questions_data) {
      return NextResponse.json({ success: false, error: 'Thiếu tham số bắt buộc' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('remedial_exams')
      .insert({
        exam_result_id,
        student_id,
        lesson_id,
        questions_data,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Lỗi khi insert remedial_exams:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
