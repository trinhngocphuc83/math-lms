import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const { image, textAnswer, question, sampleAnswer, serverId = 1, maxScore = 10 } = await request.json();

    if (!image && (!textAnswer || !textAnswer.trim())) {
      return NextResponse.json({ error: "Vui lòng nhập câu trả lời hoặc đính kèm ảnh bài làm!" }, { status: 400 });
    }

    // Tìm tất cả các API keys có sẵn trong biến môi trường
    const keys: string[] = [];
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
    for (let i = 1; i <= 10; i++) {
      if (process.env[`GEMINI_API_KEY_${i}`]) {
        keys.push(process.env[`GEMINI_API_KEY_${i}`] as string);
      }
    }

    if (keys.length === 0) {
      return NextResponse.json({ 
        error: `Máy chủ chưa được cấu hình bất kỳ API Key nào. Vui lòng báo Giáo viên kiểm tra lại!` 
      }, { status: 500 });
    }

    // Trộn ngẫu nhiên (hoặc thử theo thứ tự)
    // Để phân tải tự nhiên hơn, ta có thể trộn mảng keys, nhưng ở đây cứ thử tuần tự từ GEMINI_API_KEY_1 -> 2 -> ... 
    // Wait, để xoay vòng tốt nhất ta random vị trí bắt đầu
    const startIndex = Math.floor(Math.random() * keys.length);
    const rotatedKeys = [...keys.slice(startIndex), ...keys.slice(0, startIndex)];

    const prompt = `Bạn là một Giáo viên Toán học cực kỳ tận tâm và chấm bài rất chuẩn xác.
Học sinh vừa làm bài tự luận và nộp câu trả lời bằng văn bản và/hoặc ảnh chụp bài làm. 
Hãy đọc kỹ bài làm của học sinh, đối chiếu với Đề bài và Đáp án mẫu/Barem/Các bước thực hiện dưới đây để chấm điểm.

THANG ĐIỂM TỐI ĐA CỦA CÂU NÀY: ${maxScore} điểm

ĐỀ BÀI:
${question}

ĐÁP ÁN MẪU / BAREM / CÁC BƯỚC GIẢI:
${sampleAnswer}

BÀI LÀM VĂN BẢN CỦA HỌC SINH (nếu có):
${textAnswer || "Không có"}

YÊU CẦU:
1. Đọc và hiểu các bước giải trong bài làm của học sinh (ảnh hoặc văn bản).
2. Đánh giá xem học sinh làm đúng hay sai, đúng được bao nhiêu phần.
3. Chấm điểm trên THANG ĐIỂM TỐI ĐA ${maxScore} điểm. Cho điểm lẻ (0.25, 0.5, 0.75) nếu cần.
4. Trả về kết quả dưới dạng JSON với các trường sau:
- "passed" (boolean): true nếu học sinh làm đúng (hoặc đúng phần lớn), false nếu sai hoàn toàn.
- "scoreNumber" (number): Điểm số dạng SỐ THỰC (ví dụ: 1.5, 2.0, 0.75). PHẢI nhỏ hơn hoặc bằng ${maxScore}.
- "score" (string): Điểm dạng chuỗi hiển thị (ví dụ: "1.5/${maxScore}").
- "feedback" (string): Lời nhận xét chi tiết, khen ngợi và chỉ ra lỗi sai. CÓ THỂ DÙNG MARKDOWN và LaTeX (bọc trong $$) trong phần feedback.`;

    const parts: any[] = [prompt];
    
    if (image) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      parts.push({ inlineData: { data: base64Data, mimeType: "image/jpeg" } });
    }

    let lastError = null;

    // Vòng lặp xoay vòng API Keys
    for (const apiKey of rotatedKeys) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-3.5-flash", 
          generationConfig: {
            responseMimeType: "application/json"
          }
        });

        const result = await model.generateContent(parts);
        const text = result.response.text();
        
        // Vì sử dụng responseMimeType="application/json", text chắc chắn là chuỗi JSON hợp lệ.
        const parsed = JSON.parse(text);
        return NextResponse.json(parsed);

      } catch (err: any) {
        lastError = err;
        console.error("Lỗi với API Key này, chuyển sang key khác...", err.message);
        // Nếu lỗi không phải 429 (quota) hoặc 503, vẫn tiếp tục thử key khác (để an toàn)
        continue;
      }
    }

    // Nếu tất cả các keys đều thất bại
    throw new Error(lastError?.message || "Tất cả API keys đều báo lỗi hoặc quá tải (503).");
  } catch (error: any) {
    console.error("Lỗi AI Chấm điểm:", error);
    return NextResponse.json({ error: error.message || "Đã xảy ra lỗi khi chấm điểm." }, { status: 500 });
  }
}
