import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    
    // Yêu cầu quyền admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, score, answers } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const { data, error } = await supabase
      .from('exam_results')
      .update({
        score: score,
        answers: answers,
        is_reviewed: true // Đánh dấu giáo viên đã xem/chấm lại
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Lỗi cập nhật điểm:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Update API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
