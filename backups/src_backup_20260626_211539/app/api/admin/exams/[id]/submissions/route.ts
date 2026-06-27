import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Lấy thông tin kì thi
    const { data: examData, error: examError } = await supabaseAdmin
      .from('online_exams')
      .select('title, status, duration_minutes, max_cheat_warnings')
      .eq('id', id)
      .single();

    if (examError) return NextResponse.json({ error: examError.message }, { status: 400 });

    // Lấy danh sách nộp bài
    const { data: submissions, error: subError } = await supabaseAdmin
      .from('online_exam_submissions')
      .select(`
        id, student_id, score, cheat_warnings, status, created_at,
        profiles!student_id (full_name, class_name)
      `)
      .eq('exam_id', id)
      .order('created_at', { ascending: false });

    if (subError) return NextResponse.json({ error: subError.message }, { status: 400 });

    return NextResponse.json({ exam: examData, submissions: submissions || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
