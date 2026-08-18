import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { chamTuDong } from "@/utils/examGrading";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getRotatedApiKeys() {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  let i = 1;
  while (process.env[`GEMINI_API_KEY_${i}`]) {
    keys.push(process.env[`GEMINI_API_KEY_${i}`] as string);
    i++;
  }
  if (keys.length === 0) return [];
  for (let idx = keys.length - 1; idx > 0; idx--) {
    const j = Math.floor(Math.random() * (idx + 1));
    [keys[idx], keys[j]] = [keys[j], keys[idx]];
  }
  return keys;
}

export const maxDuration = 60; // Tăng thời gian xử lý cho Vercel (lên 60s) để AI có đủ thời gian chấm tự luận

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

    let aiFeedback: any = {};

    // Nếu có câu Tự luận -> Khởi động AI Gemini để chấm điểm dựa trên ảnh và văn bản HS gửi lên
    if (essayTasks.length > 0) {
       const keys = getRotatedApiKeys();
       if (keys.length > 0) {
          try {
             const systemPrompt = `
Bạn là một giám khảo chấm thi cẩn thận. Dưới đây là các bài làm tự luận của học sinh.
Điểm tối đa mỗi câu là ${scorePerQuestion}.
Hãy đọc bài làm của học sinh (đôi khi có đính kèm Hình Ảnh viết tay giải toán), so sánh với đáp án gốc (nếu có), đánh giá các bước giải và chấm điểm khách quan.
TRẢ VỀ DUY NHẤT một chuỗi JSON (KHÔNG bọc trong \`\`\`json):
[
  { "qIndex": index_cau_hoi, "score": diem_so_thap_phan, "feedback": "Nhận xét ngắn gọn: Đúng/Sai bước nào, được bao nhiêu điểm" }
]
`;
             const parts: any[] = [{ text: systemPrompt + "\n\nDanh sách bài làm:" }];

             essayTasks.forEach(task => {
                let htmlAns = task.studentAnswer || "";

                // Trích xuất hình ảnh base64 từ bài làm (nếu học sinh paste ảnh vào editor) để gửi cho Gemini Vision
                const imgRegex = /data:(image\/[^;]+);base64,([^"']+)/g;
                let match;
                while ((match = imgRegex.exec(htmlAns)) !== null) {
                   parts.push({ inlineData: { data: match[2], mimeType: match[1] } });
                   htmlAns = htmlAns.replace(match[0], "[HÌNH ẢNH BÀI LÀM ĐÍNH KÈM]");
                }
                parts.push({ text: `\nCâu hỏi Index: ${task.qIndex}\nĐề bài: ${task.question}\nĐáp án chuẩn: ${task.answerText}\nBài làm HS: ${htmlAns}` });
             });

             let aiResult = null;
             for (const apiKey of keys) {
                try {
                   const genAI = new GoogleGenerativeAI(apiKey);
                   // Dùng bản flash mạnh và hỗ trợ đa phương tiện
                   const model = genAI.getGenerativeModel({
                      model: "gemini-3.7-flash",
                      generationConfig: { responseMimeType: "application/json" }
                   });
                   aiResult = await model.generateContent(parts);
                   break;
                } catch(e:any) {
                   // Tính năng xoay vòng key khi bị quá tải 429
                   if(e.status === 429 || e.status === 503) continue;
                   else throw e;
                }
             }

             if (aiResult) {
                const parsed = JSON.parse(aiResult.response.text());
                parsed.forEach((res: any) => {
                   correctPoints += Number(res.score) || 0;
                   aiFeedback[res.qIndex] = res.feedback;
                });
             }
          } catch(e) {
             console.error("Lỗi AI chấm bài tự luận:", e);
             // Nếu AI quá tải lỗi hoàn toàn, bỏ qua phần điểm tự luận (GV sẽ chấm tay sau)
             aiFeedback.globalError = "Hệ thống AI quá tải, chưa chấm xong tự luận.";
          }
       }
    }

    const finalScore = Math.max(0, Math.min(10, Math.round(correctPoints * 100) / 100));

    // Đếm số lượt thi để biết là lần đầu hay thi lại
    const { count } = await supabaseAdmin
      .from('online_exam_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', id)
      .eq('student_id', user.id);

    const nextStatus = (count && count > 1) ? 'PUBLISHED' : 'GRADED';

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
        answers: { ...baiLam, aiFeedback, submitted_time: new Date().toISOString(), _reason: lyDo }
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
      message: "Nộp bài và chấm điểm thành công!"
    });

  } catch (err: any) {
    console.error("Lỗi Submit Exam:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
