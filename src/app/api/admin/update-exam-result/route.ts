import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    /* Thầy cô đã chấm và chốt: gỡ cờ "chờ chấm tự luận" mà đường nộp bài gắn vào, nếu
       không lượt này nằm mãi trong hàng chờ và quét điểm thưởng tháng bỏ qua nó. */
    const answersChot = answers && typeof answers === 'object'
      ? { ...answers, _choChamTuLuan: 0, _chotLuc: new Date().toISOString() }
      : answers;

    const { data, error } = await supabaseAdmin
      .from('exam_results')
      .update({
        score: score,
        passed: score >= 7,
        answers: answersChot,
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
