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

    // 2.2 Kiểm tra KHUNG GIỜ THI ở server.
    // Trước đây đề thi có sẵn hai mốc start_time/end_time nhưng không nơi nào kiểm,
    // nên vào thi được cả trước giờ mở lẫn sau khi kỳ thi đã đóng.
    const bayGio = Date.now();
    if (exam.start_time && bayGio < new Date(exam.start_time).getTime()) {
      return NextResponse.json({
        error: `Kỳ thi chưa đến giờ mở. Bắt đầu lúc ${new Date(exam.start_time).toLocaleString('vi-VN')}.`
      }, { status: 403 });
    }
    if (exam.end_time && bayGio > new Date(exam.end_time).getTime()) {
      return NextResponse.json({
        error: `Kỳ thi đã kết thúc lúc ${new Date(exam.end_time).toLocaleString('vi-VN')}.`
      }, { status: 403 });
    }

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
    const { data: existingSubs } = await supabaseAdmin
      .from('online_exam_submissions')
      .select('id, status, created_at, cheat_warnings, answers')
      .eq('exam_id', id)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    const thoiLuongGiay = (exam.duration_minutes || 0) * 60;
    let submissionId: string;
    let batDauLuc: number;
    let soLanCanhBao = 0;
    let baiLamDaLuu: Record<string, any> = {};

    const inProgressSub = existingSubs?.find((s: any) => s.status === 'IN_PROGRESS');

    if (inProgressSub) {
      submissionId = inProgressSub.id;
      batDauLuc = new Date(inProgressSub.created_at).getTime();
      soLanCanhBao = inProgressSub.cheat_warnings || 0;

      // Khôi phục bài làm dở đã lưu tự động (bỏ các khoá metadata)
      const daLuu = inProgressSub.answers || {};
      Object.keys(daLuu).forEach(k => {
        if (!k.startsWith('_') && k !== 'aiFeedback' && k !== 'submitted_time') {
          baiLamDaLuu[k] = daLuu[k];
        }
      });

      // Hết giờ từ trước mà chưa nộp -> chốt bài ngay, chấm phần đã làm
      if (thoiLuongGiay > 0 && bayGio - batDauLuc >= thoiLuongGiay * 1000) {
        return NextResponse.json({
          error: "Thời gian làm bài đã hết. Bài của em đang được hệ thống chốt lại, hãy tải lại trang để xem kết quả.",
          expired: true,
          submission_id: submissionId,
        }, { status: 409 });
      }
    } else {
      // Chỉ chặn thi lại khi đề khai báo rõ allow_retake = false. Giữ nguyên hành vi
      // cũ (cho thi lại) vì đây chưa phải thay đổi đã được thống nhất - hiện chưa
      // có ô bật/tắt số lượt thi trong form tạo đề.
      const daNop = existingSubs && existingSubs.length > 0;
      if (daNop && exam.allow_retake === false) {
        return NextResponse.json({
          error: "Em đã nộp bài thi này rồi. Vào mục Kết quả để xem lại bài làm."
        }, { status: 403 });
      }

      const { data: newSub, error: subError } = await supabaseAdmin
        .from('online_exam_submissions')
        .insert([{
          exam_id: id,
          student_id: user.id,
          status: 'IN_PROGRESS',
          cheat_warnings: 0,
        }])
        .select('id, created_at')
        .single();

      if (subError) throw subError;
      submissionId = newSub.id;
      batDauLuc = new Date(newSub.created_at).getTime();
    }

    // 4.5 THỜI GIAN CÒN LẠI TÍNH Ở SERVER.
    // Trước đây client tự đặt lại đủ duration_minutes mỗi lần vào, nên chỉ cần
    // tải lại trang là được thêm trọn thời gian làm bài.
    let conLaiGiay = thoiLuongGiay > 0
      ? Math.max(0, Math.floor((batDauLuc + thoiLuongGiay * 1000 - bayGio) / 1000))
      : 0;

    // Nếu kỳ thi có giờ đóng thì không được làm quá giờ đó
    if (exam.end_time) {
      const conLaiTheoLichGiay = Math.max(0, Math.floor((new Date(exam.end_time).getTime() - bayGio) / 1000));
      conLaiGiay = thoiLuongGiay > 0 ? Math.min(conLaiGiay, conLaiTheoLichGiay) : conLaiTheoLichGiay;
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
      remaining_seconds: conLaiGiay,
      cheat_warnings: soLanCanhBao,
      saved_answers: baiLamDaLuu,
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
