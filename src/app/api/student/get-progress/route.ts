import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Đọc bài tạm của học sinh để mở lại đúng chỗ đang làm dở.
 *
 * Dùng khoá máy chủ vì bảng exam_results bật bảo vệ dòng (xem chú thích ở save-progress),
 * nhưng luôn ràng buộc student_id = user.id nên chỉ đọc được bài của chính mình.
 *
 * Bắt buộc phải sắp xếp theo thời gian: bản cũ chỉ .limit(1) mà không sắp xếp, nếu lỡ có
 * hai bản nháp thì cơ sở dữ liệu trả về bản nào cũng được - học sinh mở lại có thể nhận
 * đúng bản CŨ và mất phần làm thêm.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const moduleId = searchParams.get('moduleId');

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 });
    }

    const db = createAdminClient();

    let query = db
      .from('exam_results')
      .select('answers, cheat_warnings, created_at')
      .eq('student_id', user.id)
      .eq('lesson_id', lessonId)
      .eq('attempt_number', 0)
      .order('created_at', { ascending: false })
      .limit(1);

    // "module_id = NULL" luôn sai trong SQL, phải dùng .is() cho trường hợp trống
    query = moduleId ? query.eq('module_id', moduleId) : query.is('module_id', null);

    const { data, error } = await query;

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ data: null });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Kèm theo bài ĐÃ NỘP của đúng đề này (nếu có), để mở lại còn biết mình đã nộp
    // và được bao nhiêu điểm. Từ khi mỗi đề có khung làm bài riêng, chuyển tab rồi quay
    // lại là khung dựng mới hoàn toàn, không có chỗ này thì học sinh tưởng mất bài.
    let qNop = db
      .from('exam_results')
      .select('score, attempt_number, created_at')
      .eq('student_id', user.id)
      .eq('lesson_id', lessonId)
      .gt('attempt_number', 0)
      .order('created_at', { ascending: false })
      .limit(1);
    qNop = moduleId ? qNop.eq('module_id', moduleId) : qNop.is('module_id', null);
    const { data: daNop } = await qNop;

    return NextResponse.json({
      data: data && data.length > 0 ? data[0] : null,
      daNop: daNop && daNop.length > 0 ? daNop[0] : null,
    });
  } catch (error: any) {
    console.error('Get progress error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
