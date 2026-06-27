import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request, { params }: { params: Promise<{ id: string, submission_id: string }> }) {
  try {
    const { id, submission_id } = await params;

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const { data: submission, error: subError } = await supabaseAdmin
      .from('online_exam_submissions')
      .select('id, score, answers, status, student_id')
      .eq('id', submission_id)
      .single();

    if (subError || !submission) {
       return NextResponse.json({ error: "Không tìm thấy bài làm" }, { status: 404 });
    }

    if (submission.student_id !== user.id) {
       return NextResponse.json({ error: "Không có quyền xem" }, { status: 403 });
    }

    const { data: exam } = await supabaseAdmin
      .from('online_exams')
      .select('title, exam_data')
      .eq('id', id)
      .single();

    return NextResponse.json({ exam, submission });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
