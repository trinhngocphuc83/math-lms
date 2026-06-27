import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
    const { submission_id, answers } = body;

    if (!submission_id || !answers) {
      return NextResponse.json({ error: "Thiếu dữ liệu nộp bài" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    // Lấy đáp án gốc từ hệ thống
    const { data: exam, error: examError } = await supabaseAdmin
      .from('online_exams')
      .select('exam_data')
      .eq('id', id)
      .single();

    if (examError || !exam) return NextResponse.json({ error: "Không tìm thấy đề thi gốc" }, { status: 404 });

    const examData = exam.exam_data || [];
    let correctPoints = 0;
    const scorePerQuestion = 10 / (examData.length || 1);
    
    // Lưu danh sách các câu tự luận cần AI chấm
    const essayTasks: any[] = [];

    // Chấm điểm ngay lập tức đối với Trắc nghiệm & Đúng Sai & Trả lời ngắn
    examData.forEach((q: any, idx: number) => {
      const type = q.type || 'multiple_choice';
      const studentAns = answers[idx];

      if (type === 'multiple_choice') {
         if (studentAns === q.answerIndex) correctPoints += scorePerQuestion;
      } 
      else if (type === 'true_false') {
         if (q.answers && Array.isArray(studentAns)) {
            // Điểm chia đều cho 4 ý con (mỗi ý 0.25 của câu hỏi đó)
            let countTF = 0;
            for(let i=0; i<4; i++) {
               if (q.answers[i] === studentAns[i]) countTF++;
            }
            correctPoints += (countTF / 4) * scorePerQuestion;
         }
      }
      else if (type === 'short_answer') {
         if (q.correct_answers && studentAns) {
            // So khớp không phân biệt hoa thường và khoảng trắng
            const isMatch = q.correct_answers.some((ans: string) => 
               String(ans).trim().toLowerCase() === String(studentAns).trim().toLowerCase()
            );
            if (isMatch) correctPoints += scorePerQuestion;
         }
      }
      else if (type === 'essay') {
         essayTasks.push({
            qIndex: idx,
            question: q.question,
            answerText: q.answerText,
            studentAnswer: studentAns
         });
      }
    });

    let aiFeedback = {};
    
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
                      model: "gemini-3.5-flash",
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
                   (aiFeedback as any)[res.qIndex] = res.feedback;
                });
             }
          } catch(e) {
             console.error("Lỗi AI chấm bài tự luận:", e);
             // Nếu AI quá tải lỗi hoàn toàn, bỏ qua phần điểm tự luận (GV sẽ chấm tay sau)
             (aiFeedback as any).globalError = "Hệ thống AI quá tải, chưa chấm xong tự luận.";
          }
       }
    }

    const finalScore = Math.round(correctPoints * 100) / 100;
    // Đếm số lần thi để xác định là thi lần đầu hay thi lại
    const { count } = await supabaseAdmin
      .from('online_exam_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', id)
      .eq('student_id', user.id);
      
    const nextStatus = (count && count > 1) ? 'PUBLISHED' : 'GRADED';

    const { error: updateError } = await supabaseAdmin
      .from('online_exam_submissions')
      .update({
        status: nextStatus,
        score: finalScore,
        answers: { ...answers, aiFeedback: aiFeedback, submitted_time: new Date().toISOString() } // Lưu cả nhận xét của AI vào JSON
      })
      .eq('id', submission_id)
      .eq('student_id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      score: finalScore, 
      status: nextStatus,
      message: "Nộp bài và chấm điểm thành công!"
    });

  } catch (err: any) {
    console.error("Lỗi Submit Exam:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
