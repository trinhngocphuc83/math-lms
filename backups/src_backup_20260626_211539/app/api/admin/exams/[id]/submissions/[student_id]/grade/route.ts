import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request, { params }: { params: Promise<{ id: string, student_id: string }> }) {
  try {
    const { id, student_id } = await params;
    const body = await req.json();
    const { score, answers } = body;

    const { error } = await supabaseAdmin
      .from('online_exam_submissions')
      .update({ score, answers })
      .eq('exam_id', id)
      .eq('student_id', student_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
