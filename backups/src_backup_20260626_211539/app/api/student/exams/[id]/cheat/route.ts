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
      .select('cheat_warnings')
      .eq('id', submission_id)
      .eq('student_id', user.id)
      .single();

    if (subError || !sub) return NextResponse.json({ error: "Không tìm thấy bài thi" }, { status: 404 });

    // Cập nhật tăng thêm 1
    const newWarnings = (sub.cheat_warnings || 0) + 1;
    
    await supabaseAdmin
      .from('online_exam_submissions')
      .update({ cheat_warnings: newWarnings })
      .eq('id', submission_id);

    return NextResponse.json({ success: true, cheat_warnings: newWarnings });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
