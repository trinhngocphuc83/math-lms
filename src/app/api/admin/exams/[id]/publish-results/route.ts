import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/utils/auth/guard";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('online_exam_submissions')
      .update({ status: 'PUBLISHED' })
      .eq('exam_id', id)
      .in('status', ['SUBMITTED', 'GRADED']);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
