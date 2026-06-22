import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request, { params }: { params: Promise<{ id: string, student_id: string }> }) {
  try {
    const { id, student_id } = await params;

    const { data: exam } = await supabaseAdmin
      .from('online_exams')
      .select('title, exam_data')
      .eq('id', id)
      .single();

    const { data: submission } = await supabaseAdmin
      .from('online_exam_submissions')
      .select(`
        id, score, answers, status,
        profiles!student_id (full_name, class_name)
      `)
      .eq('exam_id', id)
      .eq('student_id', student_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ exam, submission });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
