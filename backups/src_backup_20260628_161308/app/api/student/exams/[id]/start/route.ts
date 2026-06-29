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
    const { password } = body;

    // 1. Xác thực người dùng
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    // 2. Lấy thông tin kì thi
    const { data: exam, error } = await supabaseAdmin
      .from('online_exams')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !exam) return NextResponse.json({ error: "Kỳ thi không tồn tại" }, { status: 404 });
    if (exam.status !== 'PUBLISHED') return NextResponse.json({ error: "Kỳ thi chưa mở" }, { status: 403 });

    // 2.5 Kiểm tra giới hạn Khóa học LMS (Bảo mật)
    const classes = exam.assigned_classes || [];
    if (classes.length > 0) {
      const { data: requests } = await supabaseAdmin
        .from('student_course_requests')
        .select('course_id')
        .eq('student_id', user.id)
        .eq('status', 'approved');
        
      const approvedCourseIds = requests ? requests.map(r => r.course_id) : [];
      const hasAccess = classes.some((courseId: string) => approvedCourseIds.includes(courseId));
      
      if (!hasAccess) {
          return NextResponse.json({ error: "Bài thi này không dành cho khóa học của bạn! Truy cập bị từ chối." }, { status: 403 });
      }
    }

    // 3. Kiểm tra mật khẩu (nếu có)
    if (exam.password && exam.password !== password) {
      return NextResponse.json({ error: "Mật khẩu phòng thi không đúng!" }, { status: 403 });
    }

    // 4. Tạo bản ghi Submission (bắt đầu tính giờ)
    // Kiểm tra xem đã có submission đang làm hay chưa (resume)
    const { data: existingSubs } = await supabaseAdmin
      .from('online_exam_submissions')
      .select('id, status')
      .eq('exam_id', id)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    let submissionId;
    const inProgressSub = existingSubs?.find((s: any) => s.status === 'IN_PROGRESS');
    
    if (inProgressSub) {
      submissionId = inProgressSub.id;
    } else {
      const { data: newSub, error: subError } = await supabaseAdmin
        .from('online_exam_submissions')
        .insert([{
          exam_id: id,
          student_id: user.id,
          status: 'IN_PROGRESS',
          cheat_warnings: 0,
        }])
        .select('id')
        .single();
      
      if (subError) throw subError;
      submissionId = newSub.id;
    }

    // 5. Làm sạch dữ liệu đề thi: CHE GIẤU ĐÁP ÁN ĐỂ CHỐNG HACK DEVTOOLS
    const safeExamData = (exam.exam_data || []).map((q: any) => {
      return {
        question: q.question,
        options: q.options,
        type: q.type, // TRẮC NGHIỆM hoặc TỰ LUẬN
        // TUYỆT ĐỐI KHÔNG TRẢ VỀ answerIndex và explanation!
      };
    });

    return NextResponse.json({
      submission_id: submissionId,
      exam_info: {
        title: exam.title,
        duration_minutes: exam.duration_minutes,
        max_cheat_warnings: exam.max_cheat_warnings,
        shuffle_questions: exam.shuffle_questions,
        shuffle_options: exam.shuffle_options,
      },
      safe_exam_data: safeExamData
    });

  } catch (err: any) {
    console.error("Lỗi Start Exam:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
