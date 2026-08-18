import { NextResponse } from "next/server";
import { getAllAIKeys } from '@/utils/aiKeys';
import { goiGemini } from '@/utils/geminiRunner';
import { requireStaff } from "@/utils/auth/guard";

export const maxDuration = 60; // Cho phép API chạy tối đa 60s trên Vercel

export async function POST(request: Request) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const body = await request.json();
    const { prompt, rawHtml, fileData } = body;

    // Lấy cả khoá trong biến môi trường lẫn khoá thầy cô tự thêm ở trang Trạm kiểm soát
    // Cổng A.I. Bản cũ chỉ đọc biến môi trường nên khoá thêm tay không bao giờ được dùng.
    const keys = await getAllAIKeys();
    if (keys.length === 0) {
      throw new Error("Chưa cấu hình GEMINI_API_KEY trong hệ thống.");
    }

    const parts: any[] = [];
    
    // Yêu cầu bắt buộc trả về mảng các object theo JSON Schema mong muốn
    const systemInstruction = `
      Bạn là một chuyên gia phân tích dữ liệu giáo dục. Nhiệm vụ của bạn là đọc đề thi (được cung cấp dưới dạng văn bản, hình ảnh, hoặc file PDF) và bóc tách thành một danh sách (array) các câu hỏi.
      
      LƯU Ý CỰC KỲ QUAN TRỌNG VỀ QUY TẮC TÁCH HOẶC GỘP Ý NHỎ:
      - TRƯỜNG HỢP BẮT BUỘC TÁCH: Nếu một bài toán tự luận có các ý nhỏ (a, b, c...) hoàn toàn độc lập, không dùng chung biểu thức/dữ kiện phức tạp, không phụ thuộc nhau (Ví dụ: "Bài 1. Thực hiện phép tính: a) 1+1 b) 2+2"). Bạn BẮT BUỘC PHẢI TÁCH mỗi ý thành 1 object câu hỏi độc lập. Tự động ghép "dẫn chung" vào từng ý.
      - TRƯỜNG HỢP BẮT BUỘC GỘP (KHÔNG ĐƯỢC TÁCH): Nếu các ý nhỏ có liên quan mật thiết, dùng chung một biểu thức/dữ kiện gốc, hoặc ý sau phụ thuộc ý trước (Ví dụ: "Bài 3. Cho biểu thức P... a) Rút gọn P b) Tìm x để P > 0"). Bạn BẮT BUỘC KHÔNG ĐƯỢC TÁCH. Hãy GỘP CHUNG toàn bộ đề bài (dữ kiện gốc) và tất cả các ý nhỏ a, b... vào MỘT câu hỏi tự luận duy nhất.
      
      LƯU Ý BẮT BUỘC VỀ LATEX: Bạn PHẢI escape tất cả các dấu backslash trong mã LaTeX bằng hai dấu backslash (\\\\). Ví dụ: phải viết là \\\\neq thay vì \\neq, \\\\Rightarrow thay vì \\Rightarrow, \\\\begin{cases} thay vì \\begin{cases}, và ký hiệu xuống dòng trong hệ phương trình phải viết là \\\\\\\\ thay vì \\\\. Nếu bạn quên, file JSON sẽ bị hỏng toàn bộ.
      
      Mỗi câu hỏi phải là một object JSON với các trường:
      - "qIndex": Số thứ tự câu hỏi (ví dụ 1, 2, 3...)
      - "type": Loại câu hỏi. CHỈ MỘT TRONG CÁC GIÁ TRỊ: "multiple_choice" (Trắc nghiệm 4 chọn 1), "true_false" (Đúng/Sai có 4 ý a,b,c,d), "short_answer" (Trả lời ngắn), "essay" (Tự luận).
      - "question": Nội dung câu hỏi (chữ) có thể chứa mã LaTeX được bọc trong cặp $...$.
      - "options": Mảng 4 phần tử chứa nội dung 4 đáp án (A,B,C,D) hoặc 4 ý (a,b,c,d) ĐỐI VỚI "multiple_choice" và "true_false". Nếu là loại khác thì để mảng rỗng [].
      - "answerIndex": Index (0, 1, 2, 3) của đáp án đúng NẾU LÀ "multiple_choice".
      - "answers": Mảng 4 boolean (true/false) tương ứng với 4 ý đúng/sai NẾU LÀ "true_false" (VD: [true, false, true, false]).
      - "correct_answers": Mảng các chuỗi đáp án được chấp nhận NẾU LÀ "short_answer" (VD: ["12", "12,0"]).
      - "answerText": Văn bản đáp án hoặc hướng dẫn giải thích (nếu có).
      - "hasMediaWarning": boolean (Mặc định là false. Đặt là true NẾU BẠN NHẬN THẤY câu hỏi gốc CÓ CHỨA một HÌNH ẢNH MÔ TẢ hoặc BẢNG BIỂU).
      - "mediaWarningNote": string (Chỉ điền khi hasMediaWarning=true. Chỉ ra vị trí của ảnh đó).
    `;
    parts.push({ text: systemInstruction + "\n\n" + prompt });

    // 1. Xử lý File tải lên (PDF, Image)
    if (fileData && fileData.base64 && fileData.mimeType) {
      parts.push({
        inlineData: {
          data: fileData.base64,
          mimeType: fileData.mimeType
        }
      });
    }

    // 2. Xử lý HTML được dán vào (chứa text và ảnh base64 inline)
    if (rawHtml) {
      let cleanedHtml = rawHtml;
      // Trích xuất tất cả ảnh base64 trong thẻ <img> (data:image/...)
      const imgRegex = /data:(image\/[^;]+);base64,([^"']+)/g;
      let match;
      let imgCount = 0;
      while ((match = imgRegex.exec(rawHtml)) !== null) {
         imgCount++;
         const mimeType = match[1];
         const base64Data = match[2];
         parts.push({
           inlineData: {
             data: base64Data,
             mimeType: mimeType
           }
         });
         // Cắt bỏ chuỗi base64 khổng lồ khỏi HTML và thay bằng placeholder để text gọn hơn
         cleanedHtml = cleanedHtml.replace(match[0], `[HÌNH ẢNH ĐÍNH KÈM SỐ ${imgCount}]`);
      }
      // Đưa phần text đã làm sạch vào prompt
      parts.push({ text: "Nội dung văn bản (đã trích xuất ảnh): \n" + cleanedHtml });
    }

    // Xoay khoá rồi xoay model - xem geminiRunner.ts
    const kq = await goiGemini({
      keys,
      parts,
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    });
    console.log(`[Bóc đề] Dùng model ${kq.model}`);
    const text = kq.text;

    // Tiền xử lý: Sửa lỗi LLM quên escape các ký tự LaTeX thông dụng làm JSON parser nhầm thành ký tự điều khiển (newline, return, tab...)
    // Lỗi phổ biến nhất: AI trả về "x \neq 0", JS parser nhận diện \n là ký tự ngắt dòng.
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
      console.warn("Lỗi JSON.parse lần 1, đang cố gắng sửa escape characters...");
      // Sửa lỗi AI trả về dấu backslash không hợp lệ (ví dụ: \sin thay vì \\sin)
      const sanitizedText = text.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
      parsed = JSON.parse(sanitizedText);
    }

    // Đảm bảo trả về mảng. Nếu AI trả về object { questions: [...] }, lấy mảng đó.
    const finalArray = Array.isArray(parsed) ? parsed : (parsed.questions || []);

    return NextResponse.json({ questions: finalArray });

  } catch (error: any) {
    console.error("Lỗi API Parse:", error);
    return NextResponse.json({ error: error.message || "Đã xảy ra lỗi hệ thống." }, { status: 500 });
  }
}

