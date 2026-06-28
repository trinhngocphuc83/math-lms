import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { remedialId, score, globalImages, gradingDetails } = body;

    if (!remedialId) {
      return NextResponse.json({ success: false, error: 'Thiếu remedialId' }, { status: 400 });
    }

    // 1. Lấy thông tin bài gỡ điểm và bài gốc
    const { data: remedial, error: remedialErr } = await supabaseAdmin
      .from('remedial_exams')
      .select('*, exam_results(*)')
      .eq('id', remedialId)
      .single();

    if (remedialErr || !remedial) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy bài luyện tập.' }, { status: 404 });
    }

    if (remedial.status === 'completed') {
      return NextResponse.json({ success: false, error: 'Bài này đã được nộp trước đó.' }, { status: 400 });
    }

    // 2. Tính điểm cộng dồn
    const oldScore = Number(remedial.exam_results.score || 0);
    const earnedScore = Number(score || 0);
    let newScore = oldScore + earnedScore;
    if (newScore > 10) newScore = 10; // Capping at 10
    
    const passed = newScore >= 7;

    // 3. Gộp bài làm (ảnh, gradingDetails) của bài gỡ điểm vào answers của bài gốc để GV có thể xem lại nếu muốn
    const currentAnswers = remedial.exam_results.answers || {};
    currentAnswers.remedial_answers = {
      globalImages: globalImages || [],
      gradingDetails: gradingDetails || []
    };

    // 4. Cập nhật bài gốc
    const { error: updateResultErr } = await supabaseAdmin
      .from('exam_results')
      .update({
        score: newScore,
        passed: passed,
        answers: currentAnswers
      })
      .eq('id', remedial.exam_result_id);

    if (updateResultErr) {
      throw updateResultErr;
    }

    // 5. Đánh dấu bài gỡ điểm đã hoàn thành
    const { error: updateRemedialErr } = await supabaseAdmin
      .from('remedial_exams')
      .update({
        status: 'completed',
        remedial_score: earnedScore
      })
      .eq('id', remedialId);

    if (updateRemedialErr) {
      throw updateRemedialErr;
    }

    return NextResponse.json({ success: true, newScore, passed });
  } catch (error: any) {
    console.error('Lỗi submit remedial:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
