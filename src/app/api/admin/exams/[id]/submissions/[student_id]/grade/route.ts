import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/utils/auth/guard";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request, { params }: { params: Promise<{ id: string, student_id: string }> }) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const { id, student_id } = await params;
    const body = await req.json();
    const { score, answers, xongTuLuan } = body;

    /*
     * Chấm đủ mọi câu tự luận thì bài mới rời hàng chờ.
     *
     * Bản cũ chỉ ghi điểm mà KHÔNG đụng tới status, nên không có gì phân biệt bài đã chấm
     * xong với bài mới chấm dở - hàng chờ không dựng được, và điểm cộng thì không biết lúc
     * nào được tính. Chấm dở thì giữ nguyên SUBMITTED để bài vẫn nằm trong danh sách chờ.
     */
    const capNhat: Record<string, any> = { score, answers };
    if (xongTuLuan) capNhat.status = 'GRADED';

    const { error } = await supabaseAdmin
      .from('online_exam_submissions')
      .update(capNhat)
      .eq('exam_id', id)
      .eq('student_id', student_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
