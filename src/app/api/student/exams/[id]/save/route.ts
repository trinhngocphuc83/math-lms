import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Lưu tạm bài làm trong lúc học sinh đang thi.
 *
 * Cần thiết để khi hết giờ hoặc bị buộc dừng vì gian lận, hệ thống vẫn chấm được
 * phần học sinh đã làm - trước đây bài chỉ được gửi lên đúng một lần lúc bấm nộp,
 * nên mất mạng hay đóng nhầm tab là mất trắng.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { submission_id, answers } = await req.json();
    if (!submission_id || !answers) {
      return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    // Chỉ cho lưu khi bài còn đang làm và đúng chủ nhân
    const { data: sub } = await supabaseAdmin
      .from('online_exam_submissions')
      .select('id, status, answers')
      .eq('id', submission_id)
      .eq('student_id', user.id)
      .eq('exam_id', id)
      .single();

    if (!sub) return NextResponse.json({ error: "Không tìm thấy bài thi" }, { status: 404 });
    if (sub.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: "Bài thi đã nộp, không lưu thêm được" }, { status: 409 });
    }

    // Giữ lại các khoá metadata cũ (nếu có), chỉ thay phần đáp án
    const cu = sub.answers || {};
    const moi: Record<string, any> = { ...answers };
    Object.keys(cu).forEach(k => {
      if (k.startsWith('_') || k === 'aiFeedback') moi[k] = cu[k];
    });
    moi._saved_at = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('online_exam_submissions')
      .update({ answers: moi })
      .eq('id', submission_id)
      .eq('student_id', user.id)
      .eq('status', 'IN_PROGRESS');

    if (error) throw error;
    return NextResponse.json({ success: true, saved_at: moi._saved_at });

  } catch (err: any) {
    console.error("Lỗi Save Exam:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
