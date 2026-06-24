import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Hàm lấy tất cả API keys từ environment và trộn ngẫu nhiên
function getRotatedApiKeys() {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  
  let i = 1;
  while (process.env[`GEMINI_API_KEY_${i}`]) {
    keys.push(process.env[`GEMINI_API_KEY_${i}`] as string);
    i++;
  }
  
  if (keys.length === 0) return [];
  // Trộn ngẫu nhiên (Fisher-Yates shuffle)
  for (let idx = keys.length - 1; idx > 0; idx--) {
    const j = Math.floor(Math.random() * (idx + 1));
    [keys[idx], keys[j]] = [keys[j], keys[idx]];
  }
  return keys;
}

export const maxDuration = 60; // Cho phép API chạy tối đa 60s trên Vercel

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, rawHtml, fileData } = body;

    const rotatedKeys = getRotatedApiKeys();
    if (rotatedKeys.length === 0) {
      throw new Error("Chưa cấu hình GEMINI_API_KEY trong hệ thống.");
    }

    const parts: any[] = [];
    
    // Yêu cầu bắt buộc trả về mảng các object theo JSON Schema mong muốn
    const systemInstruction = `
      Bạn là một chuyên gia phân tích dữ liệu giáo dục. Nhiệm vụ của bạn là đọc đề thi (được cung cấp dưới dạng văn bản, hình ảnh, hoặc file PDF) và bóc tách thành một danh sách (array) các câu hỏi.
      
      LƯU Ý CỰC KỲ QUAN TRỌNG VỀ QUY TẮC TÁCH HOẶC GỘP Ý NHỎ:
      - TRƯỜNG HỢP BẮT BUỘC TÁCH: Nếu một bài toán tự luận có các ý nhỏ (a, b, c...) hoàn toàn độc lập, không dùng chung biểu thức/dữ kiện phức tạp, không phụ thuộc nhau (Ví dụ: "Bài 1. Thực hiện phép tính: a) 1+1 b) 2+2"). Bạn BẮT BUỘC PHẢI TÁCH mỗi ý thành 1 object câu hỏi độc lập. Tự động ghép "dẫn chung" vào từng ý.
      - TRƯỜNG HỢP BẮT BUỘC GỘP (KHÔNG ĐƯỢC TÁCH): Nếu các ý nhỏ có liên quan mật thiết, dùng chung một biểu thức/dữ kiện gốc, hoặc ý sau phụ thuộc ý trước (Ví dụ: "Bài 3. Cho biểu thức P... a) Rút gọn P b) Tìm x để P > 0"). Bạn BẮT BUỘC KHÔNG ĐƯỢC TÁCH. Hãy GỘP CHUNG toàn bộ đề bài (dữ kiện gốc) và tất cả các ý nhỏ a, b... vào MỘT câu hỏi tự luận duy nhất.
      
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

    let lastError = null;

    // Vòng lặp xoay vòng API Keys để chống lỗi 503/429
    for (const apiKey of rotatedKeys) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Dùng mô hình mạnh mẽ và hỗ trợ native PDF (Gemini 1.5 Pro hoặc Flash)
        const model = genAI.getGenerativeModel({ 
          model: "gemini-3.5-flash", // Phải dùng bản 3.5 theo cấu hình server
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1
          }
        });

        const result = await model.generateContent(parts);
        const text = result.response.text();
        
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (parseErr: any) {
          console.warn("Lỗi JSON.parse lần 1, đang cố gắng sửa escape characters...");
          // Sửa lỗi AI trả về dấu backslash không hợp lệ (ví dụ: \sin thay vì \\sin)
          const sanitizedText = text.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
          parsed = JSON.parse(sanitizedText);
        }

        // Đảm bảo trả về mảng. Nếu AI trả về object { questions: [...] }, lấy mảng đó.
        const finalArray = Array.isArray(parsed) ? parsed : (parsed.questions || []);

        return NextResponse.json({ questions: finalArray });

      } catch (err: any) {
        lastError = err;
        console.error("Lỗi AI Parse Exam, chuyển key...", err.message);
        continue; // Lỗi thì thử key tiếp theo
      }
    }

    throw new Error(lastError?.message || "Tất cả API keys đều báo lỗi hoặc quá tải (503).");

  } catch (error: any) {
    console.error("Lỗi API Parse:", error);
    return NextResponse.json({ error: error.message || "Đã xảy ra lỗi hệ thống." }, { status: 500 });
  }
}
