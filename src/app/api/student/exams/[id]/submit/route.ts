import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { chamTuDong } from "@/utils/examGrading";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


/* Không còn gọi AI nên đường này chạy rất nhanh; giữ trần 60s cho chắc. */
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { submission_id, answers, reason } = body;

    if (!submission_id) {
      return NextResponse.json({ error: "Thiếu dữ liệu nộp bài" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    // CHỐT BÀI MỘT LẦN DUY NHẤT.
    // Trước đây lệnh cập nhật chỉ khớp id + student_id mà không xét trạng thái, nên
    // học sinh có thể gọi lại /submit với cùng mã bài, đổi đáp án và ghi đè điểm.
    // Mỗi lần nộp API lại trả về điểm số, thành ra dò được từng câu tới khi đạt 10.
    const { data: sub } = await supabaseAdmin
      .from('online_exam_submissions')
      .select('id, status, created_at, answers')
      .eq('id', submission_id)
      .eq('student_id', user.id)
      .eq('exam_id', id)
      .single();

    if (!sub) return NextResponse.json({ error: "Không tìm thấy bài thi" }, { status: 404 });
    if (sub.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: "Bài thi này đã được nộp trước đó." }, { status: 409 });
    }

    // Lấy đáp án gốc từ hệ thống
    const { data: exam, error: examError } = await supabaseAdmin
      .from('online_exams')
      .select('exam_data, duration_minutes, end_time')
      .eq('id', id)
      .single();

    if (examError || !exam) return NextResponse.json({ error: "Không tìm thấy đề thi gốc" }, { status: 404 });

    // Bài làm dùng để chấm: ưu tiên dữ liệu client gửi lên, nếu thiếu thì lấy bản
    // lưu tự động gần nhất (trường hợp hết giờ / bị buộc dừng mà client không gửi kịp).
    const daLuu: Record<string, any> = {};
    Object.keys(sub.answers || {}).forEach(k => {
      if (!k.startsWith('_') && k !== 'aiFeedback' && k !== 'submitted_time') daLuu[k] = (sub.answers as any)[k];
    });
    const baiLam: Record<string, any> = (answers && Object.keys(answers).length > 0) ? answers : daLuu;

    const examData = exam.exam_data || [];
    const scorePerQuestion = 10 / (examData.length || 1);

    // Chấm phần máy chấm được, dùng chung quy tắc với khu Luyện tập
    // (Trả lời ngắn có chuẩn hoá dấu thập phân/LaTeX, Đúng-Sai theo barem 2025).
    const { diem: diemTuDong, cauTuLuan: essayTasks } = chamTuDong(examData, baiLam, scorePerQuestion);
    let correctPoints = diemTuDong;

    /*
     * KHÔNG gọi AI chấm tự luận ở đây nữa.
     *
     * Đây từng là cửa thứ hai học sinh tiêu khoá API: cứ nộp một bài có tự luận là một
     * lượt gọi. Cộng với khu Luyện tập (mỗi câu một lượt) thì một buổi của một lớp đủ đốt
     * sạch hạn mức ngày - Google cho 20 lượt/ngày mỗi khoá.
     *
     * Nay bài có câu tự luận thì DỪNG Ở "SUBMITTED" (chờ thầy cô chấm), điểm hiện ra là
     * điểm phần máy chấm được. Thầy cô chấm xong ở màn chấm tay thì điểm tự luận mới được
     * CỘNG THÊM vào, và bài mới chuyển sang "GRADED". Điểm cộng cũng chỉ tính khi ấy.
     */
    const soCauTuLuan = essayTasks.length;

    const finalScore = Math.max(0, Math.min(10, Math.round(correctPoints * 100) / 100));

    // Đếm số lượt thi để biết là lần đầu hay thi lại
    const { count } = await supabaseAdmin
      .from('online_exam_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', id)
      .eq('student_id', user.id);

    /* Còn câu tự luận thì bài chưa chấm xong - để nguyên SUBMITTED cho vào hàng chờ. */
    const nextStatus = soCauTuLuan > 0 ? 'SUBMITTED'
                     : (count && count > 1) ? 'PUBLISHED' : 'GRADED';

    // Ghi lại lý do chốt bài để Thầy nhìn kết quả là biết em nào bị hết giờ / vi phạm
    const lyDo = reason === 'time_up' ? 'HET_GIO'
               : reason === 'cheat' ? 'VI_PHAM_GIAN_LAN'
               : 'TU_NOP';

    // Chỉ cập nhật khi bài VẪN đang ở trạng thái IN_PROGRESS - chặn nộp trùng
    // trong trường hợp hai yêu cầu gửi lên gần như cùng lúc.
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('online_exam_submissions')
      .update({
        status: nextStatus,
        score: finalScore,
        answers: {
          ...baiLam,
          submitted_time: new Date().toISOString(),
          _reason: lyDo,
          /* Điểm phần máy chấm được, chốt ngay lúc nộp. Màn chấm tay CỘNG THÊM điểm tự
             luận vào đây chứ không tính lại - tính lại là ra số khác, vì trang chấm từng
             có một bản sao luật chấm riêng đã lỗi thời. */
          _diemMayCham: Math.round(diemTuDong * 100) / 100,
          _soCauTuLuan: soCauTuLuan,
        }
      })
      .eq('id', submission_id)
      .eq('student_id', user.id)
      .eq('status', 'IN_PROGRESS')
      .select('id');

    if (updateError) throw updateError;
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: "Bài thi này đã được nộp trước đó." }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      score: finalScore,
      status: nextStatus,
      reason: lyDo,
      soCauTuLuan,
      message: soCauTuLuan > 0
        ? `Đã nộp bài. Điểm phần trắc nghiệm là ${finalScore}; còn ${soCauTuLuan} câu tự luận chờ Thầy cô chấm.`
        : "Nộp bài và chấm điểm thành công!"
    });

  } catch (err: any) {
    console.error("Lỗi Submit Exam:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
