import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { submission_id } = body;

    if (!submission_id) return NextResponse.json({ error: "Thiếu mã submission" }, { status: 400 });

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    // Lấy số vi phạm hiện tại
    const { data: sub, error: subError } = await supabaseAdmin
      .from('online_exam_submissions')
      .select('cheat_warnings, status')
      .eq('id', submission_id)
      .eq('student_id', user.id)
      .eq('exam_id', id)
      .single();

    if (subError || !sub) return NextResponse.json({ error: "Không tìm thấy bài thi" }, { status: 404 });
    // Bài đã nộp thì không đếm vi phạm nữa
    if (sub.status !== 'IN_PROGRESS') {
      return NextResponse.json({ success: true, cheat_warnings: sub.cheat_warnings || 0, force_submit: false });
    }

    // Cập nhật tăng thêm 1
    const newWarnings = (sub.cheat_warnings || 0) + 1;

    await supabaseAdmin
      .from('online_exam_submissions')
      .update({ cheat_warnings: newWarnings })
      .eq('id', submission_id)
      .eq('student_id', user.id);

    // NGƯỠNG VI PHẠM DO SERVER QUYẾT ĐỊNH.
    // Trước đây route này chỉ cộng số đếm, còn việc có buộc nộp bài hay không lại
    // do client tự xử - chặn request hoặc sửa biến trong DevTools là vô hiệu hoá.
    const { data: exam } = await supabaseAdmin
      .from('online_exams')
      .select('max_cheat_warnings')
      .eq('id', id)
      .single();

    const nguong = exam?.max_cheat_warnings ?? 0;
    const vuotNguong = nguong > 0 && newWarnings >= nguong;

    return NextResponse.json({
      success: true,
      cheat_warnings: newWarnings,
      max_cheat_warnings: nguong,
      force_submit: vuotNguong,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
