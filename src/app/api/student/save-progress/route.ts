import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Lưu bài tạm của học sinh (bản nháp, quy ước attempt_number = 0).
 *
 * Vì sao dùng khoá máy chủ thay vì phiên học sinh: bảng exam_results bật bảo vệ dòng.
 * Với phiên học sinh, lệnh UPDATE bị chặn mà KHÔNG hề báo lỗi - PostgREST chỉ trả về
 * "0 dòng được sửa". Bản cũ không kiểm số dòng nên vẫn trả success, giao diện báo
 * "Đã lưu thành công" trong khi thực tế không ghi được gì. Đó là lý do học sinh lưu tạm
 * lần đầu (INSERT) thì được, các lần sau (UPDATE) thì mất trắng bài làm.
 *
 * Danh tính vẫn được xác thực qua phiên đăng nhập ở ngay đầu hàm, và mọi truy vấn đều
 * ràng buộc student_id = user.id, nên học sinh không thể đụng vào bài của bạn khác.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, moduleId, answers, cheatWarnings = 0 } = body;

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 });
    }

    const db = createAdminClient();

    // Bản nháp hiện có của ĐÚNG học sinh này, ĐÚNG bài học và ĐÚNG đề luyện tập.
    // Phải dùng .is() khi module_id trống: trong SQL, "module_id = NULL" luôn sai.
    let query = db
      .from('exam_results')
      .select('id')
      .eq('student_id', user.id)
      .eq('lesson_id', lessonId)
      .eq('attempt_number', 0)
      .order('created_at', { ascending: false });

    query = moduleId ? query.eq('module_id', moduleId) : query.is('module_id', null);

    const { data: existingDrafts, error: fetchError } = await query;

    if (fetchError && fetchError.code !== '42P01') {
      console.error('Lỗi đọc bản nháp:', fetchError);
    }

    const answersData = {
      globalImages: [],
      gradingDetails: [],
      rawAnswers: answers,
    };

    if (existingDrafts && existingDrafts.length > 0) {
      // Cập nhật bản nháp mới nhất. Có .select() để BIẾT CHẮC đã ghi được -
      // không có nó thì thất bại im lặng, học sinh tưởng đã lưu.
      const draftId = existingDrafts[0].id;
      const { data: daSua, error: updateError } = await db
        .from('exam_results')
        .update({ answers: answersData, cheat_warnings: cheatWarnings })
        .eq('id', draftId)
        .eq('student_id', user.id)
        .select('id');

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      if (!daSua || daSua.length === 0) {
        return NextResponse.json(
          { error: 'Không ghi được bài tạm (không có dòng nào được cập nhật). Vui lòng thử lại.' },
          { status: 500 },
        );
      }

      // Dọn các bản nháp thừa nếu lỡ phát sinh từ trước, để lần mở lại luôn lấy đúng bài
      const thua = existingDrafts.slice(1).map(d => d.id);
      if (thua.length > 0) {
        await db.from('exam_results').delete().in('id', thua).eq('student_id', user.id);
      }

      return NextResponse.json({ success: true, mode: 'update' });
    }

    const { data: daThem, error: insertError } = await db
      .from('exam_results')
      .insert([{
        student_id: user.id,
        lesson_id: lessonId,
        module_id: moduleId || null,
        score: 0, // cột không cho phép trống
        passed: false,
        attempt_number: 0, // Quy ước: 0 là bản nháp
        cheat_warnings: cheatWarnings,
        answers: answersData,
      }])
      .select('id');

    if (insertError) {
      if (insertError.code === '42P01') {
        return NextResponse.json({ success: true, warning: 'Table exam_results does not exist yet.' });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    if (!daThem || daThem.length === 0) {
      return NextResponse.json({ error: 'Không tạo được bài tạm. Vui lòng thử lại.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, mode: 'insert' });
  } catch (error: any) {
    console.error('Save progress error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
