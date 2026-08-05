import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireStaff } from "@/utils/auth/guard";

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

export const maxDuration = 60; // 60s trên Vercel

export async function POST(request: Request) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const body = await request.json();
    const { baseQuestion, targetCount, targetDifficulty, targetFormat, contextMode } = body;

    const rotatedKeys = getRotatedApiKeys();
    if (rotatedKeys.length === 0) {
      throw new Error("Chưa cấu hình GEMINI_API_KEY trong hệ thống.");
    }

    // Determine target format
    let targetFormatStr = "giữ nguyên như câu gốc";
    if (targetFormat === "NLC") targetFormatStr = "Trắc nghiệm 4 đáp án (NLC)";
    else if (targetFormat === "TL") targetFormatStr = "Tự luận (TL) (Không có 4 đáp án)";
    else if (targetFormat === "DS") targetFormatStr = "Đúng/Sai (DS) (Mỗi câu có 4 ý a,b,c,d để xét đúng/sai)";

    // Determine target difficulty
    let targetDifficultyStr = "giữ nguyên độ khó như câu gốc";
    if (targetDifficulty === "harder") targetDifficultyStr = "nâng cao, khó hơn 1 chút so với câu gốc";
    else if (targetDifficulty === "easier") targetDifficultyStr = "cơ bản, dễ hơn 1 chút so với câu gốc";

    // Determine context mode
    let contextModeStr = "Chỉ thay đổi số liệu/hàm số, giữ nguyên bối cảnh thực tế (nếu có).";
    if (contextMode === "change") {
        contextModeStr = "Thay đổi hoàn toàn bối cảnh thực tế (Ví dụ: Từ bài toán xe chạy sang bài toán con thuyền, từ quỹ đạo bóng bay sang dòng nước...). Nhưng vẫn giữ nguyên lõi toán học và phương pháp giải.";
    }

    const systemInstruction = `
      Bạn là một chuyên gia ra đề Toán học. 
      Nhiệm vụ của bạn là đọc một "Câu Hỏi Gốc" và sinh ra ĐÚNG ${targetCount} "Câu Hỏi Tương Tự" (Biến thể).
      
      YÊU CẦU CHO CÁC CÂU HỎI TƯƠNG TỰ:
      1. Độ khó: ${targetDifficultyStr}.
      2. Dạng thức: ${targetFormatStr}.
      3. Bối cảnh: ${contextModeStr}
      4. Số liệu/Hàm số: BẮT BUỘC phải thay đổi số liệu, hàm số, hoặc phương trình cốt lõi để tạo thành một bài toán hoàn toàn mới, nhưng cách giải tương đương. PHẢI đảm bảo số liệu mới tính toán ra nghiệm đẹp, hợp lý (không ra số quá lẻ, vô lý).
      5. Nếu câu hỏi gốc có Hình ảnh/Đồ thị: Bạn KHÔNG được tự vẽ đồ thị bằng ký tự. Bắt buộc chèn dòng chữ "[CẦN CHÈN HÌNH TƯƠNG TỰ]" vào đề bài để báo hiệu.
      6. Lời giải: PHẢI sinh lời giải chi tiết cho từng biến thể, tương tự như phong cách giải của câu gốc. Sử dụng \\n để xuống dòng các bước giải.
      7. Format Toán học: Phải dùng LaTeX chuẩn bọc trong dấu $...$ cho tất cả các biểu thức toán học. Không dùng \\\\ để escape lệnh.
      8. KIỂM TRA TÍNH HỢP LÝ VÀ LOGIC TỰ ĐỘNG (SELF-REFLECTION):
         - Trước khi xuất kết quả, BẮT BUỘC bạn phải tự giải lại bài toán vừa sinh ra.
         - Kiểm tra cẩn thận tính hợp lý của các giả thiết thực tế và toán học (Ví dụ: Diện tích hố đào không thể lớn hơn diện tích tổng; Cạnh tam giác phải thoả mãn bất đẳng thức; Chiều dài, khối lượng, thời gian, vận tốc phải lớn hơn hoặc bằng 0; Điều kiện xác định của hàm số/phương trình...).
         - Đảm bảo câu hỏi có đủ giả thiết để giải, không bị tối nghĩa hoặc mâu thuẫn.
         - NẾU PHÁT HIỆN LỖI SAI, BẤT HỢP LÝ HOẶC GIẢ THIẾT KHÔNG RÕ RÀNG: Bạn PHẢI TỰ ĐỘNG SINH LẠI HOÀN TOÀN bài toán đó, điều chỉnh số liệu cho chuẩn xác và hợp logic rồi mới được đưa vào mảng kết quả JSON.

      TRẢ VỀ MỘT MẢNG JSON CÓ CẤU TRÚC:
      [
        {
          "loaiCauHoi": "NLC hoặc DS hoặc TLN hoặc TL",
          "mucDo": "1, 2, 3 hoặc 4",
          "noiDung": "Nội dung câu hỏi (chứa LaTeX)...",
          "dapAnA": "...", "dapAnB": "...", "dapAnC": "...", "dapAnD": "...",
          "dapAnDung": "A/B/C/D (nếu là NLC) hoặc Đ S Đ S (nếu là DS)",
          "loiGiai": "Phương pháp giải:\\n[...]\\n\\nLời giải:\\n[...]"
        }
      ]
      Lưu ý: Mảng trả về phải có ĐÚNG ${targetCount} phần tử. Chỉ trả về JSON thuần tuý, không chứa ký tự markdown json ở đầu/cuối.
    `;

    const baseQuestionContext = `
      --- CÂU HỎI GỐC ---
      Dạng toán: ${baseQuestion.math_form}
      Chuyên đề: ${baseQuestion.topic}
      Loại câu hỏi: ${baseQuestion.question_type}
      Đề bài: ${baseQuestion.content}
      Đáp án A: ${baseQuestion.option_a}
      Đáp án B: ${baseQuestion.option_b}
      Đáp án C: ${baseQuestion.option_c}
      Đáp án D: ${baseQuestion.option_d}
      Đáp án đúng: ${baseQuestion.correct_answer}
      Lời giải: ${baseQuestion.explanation}
      -------------------
    `;

    const parts = [
      { text: systemInstruction },
      { text: baseQuestionContext }
    ];

    let lastError = null;

    for (const apiKey of rotatedKeys) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-3.6-flash",
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7 // Nhiệt độ cao hơn chút để sinh ra sự đa dạng
          }
        });

        const result = await model.generateContent(parts);
        const text = result.response.text();
        
        // Fix \t LaTeX JSON parse bug
        let preprocessedText = text
            .replace(/\\n(?=eq|otin|exists|eg|abla|u|i|earrow|atural|parallel)/g, '\\\\n')
            .replace(/\\r(?=ightarrow|ho|angle)/g, '\\\\r')
            .replace(/\\t(?=imes|heta|riangle|ext)/g, '\\\\t')
            .replace(/\\b(?=egin)/g, '\\\\b')
            .replace(/\\f(?=rac|orall)/g, '\\\\f');

        let parsed;
        try {
          parsed = JSON.parse(preprocessedText);
        } catch (parseErr: any) {
          const sanitizedText = text.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
          parsed = JSON.parse(sanitizedText);
        }

        const finalArray = Array.isArray(parsed) ? parsed : (parsed.questions || []);

        // Chuyển đổi định dạng trả về của AI thành định dạng chuẩn của QuestionData (trừ các ID)
        const variants = finalArray.map((data: any) => {
           let parsedQuestionType = String(data.loaiCauHoi || targetFormat || "NLC");
           if (targetFormat && targetFormat !== "same") parsedQuestionType = targetFormat; // Ép kiểu nếu có yêu cầu
           
           if (parsedQuestionType.toLowerCase().includes("trắc nghiệm")) parsedQuestionType = "NLC";
           else if (parsedQuestionType.toLowerCase().includes("đúng/sai") || parsedQuestionType.toLowerCase().includes("đúng sai")) parsedQuestionType = "DS";
           else if (parsedQuestionType.toLowerCase().includes("ngắn")) parsedQuestionType = "TLN";
           else if (parsedQuestionType.toLowerCase().includes("tự luận") || parsedQuestionType === "essay") parsedQuestionType = "TL";
           
           let difficulty = data.mucDo || baseQuestion.difficulty;
           if (targetDifficulty === "harder") difficulty = Math.min(4, parseInt(baseQuestion.difficulty) + 1).toString();
           if (targetDifficulty === "easier") difficulty = Math.max(1, parseInt(baseQuestion.difficulty) - 1).toString();

           return {
              temp_id: `TEMP_VAR_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
              parent_id: baseQuestion.question_id || baseQuestion.temp_id, // Lưu vết họ hàng
              grade: baseQuestion.grade,
              subject: baseQuestion.subject,
              topic: baseQuestion.topic,
              lesson: baseQuestion.lesson,
              math_form: baseQuestion.math_form,
              question_type: parsedQuestionType,
              difficulty: difficulty,
              content: data.noiDung || "",
              option_a: data.dapAnA || "",
              option_b: data.dapAnB || "",
              option_c: data.dapAnC || "",
              option_d: data.dapAnD || "",
              correct_answer: data.dapAnDung || "",
              explanation: data.loiGiai || "",
              image_url: "" // Bắt buộc giáo viên phải tự upload nếu có ảnh
           };
        });

        return NextResponse.json({ variants });

      } catch (err: any) {
        lastError = err;
        console.error("Lỗi AI Sinh tương tự, chuyển key...", err.message);
        continue;
      }
    }

    throw new Error(lastError?.message || "Tất cả API keys đều báo lỗi hoặc quá tải (503).");

  } catch (error: any) {
    console.error("Lỗi API Generate Similar:", error);
    return NextResponse.json({ error: error.message || "Đã xảy ra lỗi hệ thống." }, { status: 500 });
  }
}

