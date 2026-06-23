import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    let approvedCourseIds: string[] = [];

    if (user) {
      const { data: requests } = await supabaseAdmin
        .from('student_course_requests')
        .select('course_id')
        .eq('student_id', user.id)
        .eq('status', 'approved');
      if (requests) {
        approvedCourseIds = requests.map(r => r.course_id);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('online_exams')
      .select('id, title, duration_minutes, start_time, end_time, description, status, created_at, assigned_classes, exam_group_name, variant_name')
      .eq('status', 'PUBLISHED')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Lọc theo Khóa học (LMS)
    const filteredData = data.filter((exam: any) => {
      const classes = exam.assigned_classes || [];
      if (classes.length === 0) return true; // Kỳ thi mở tự do
      if (approvedCourseIds.length === 0) return false; // Học sinh chưa có lớp nào
      // Nếu đề thi có yêu cầu lớp, học sinh phải nằm trong ít nhất 1 khóa học được yêu cầu
      return classes.some((courseId: string) => approvedCourseIds.includes(courseId));
    });

    return NextResponse.json(filteredData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
