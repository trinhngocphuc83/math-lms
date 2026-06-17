import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const { image, question, sampleAnswer, serverId = 1 } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    // Try to get the specific key based on serverId
    let apiKey = process.env[`GEMINI_API_KEY_${serverId}`];
    
    // Fallback to GEMINI_API_KEY if specific one is not found
    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
    }

    if (!apiKey) {
      return NextResponse.json({ 
        error: `Máy chủ chấm điểm số ${serverId} chưa được cấu hình API Key. Vui lòng báo Giáo viên kiểm tra lại!` 
      }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `Bạn là một Giáo viên Toán học cực kỳ tận tâm và chấm bài rất chuẩn xác.
Học sinh vừa làm bài tự luận và nộp ảnh chụp bài làm. 
Hãy đọc kỹ ảnh chụp bài làm của học sinh, đối chiếu với Đề bài và Đáp án mẫu/Barem dưới đây để chấm điểm.

ĐỀ BÀI:
${question}

ĐÁP ÁN MẪU / BAREM:
${sampleAnswer}

YÊU CẦU:
1. Đọc và hiểu các bước giải trong ảnh của học sinh.
2. Đánh giá xem học sinh làm đúng hay sai, hoặc đúng được bao nhiêu phần.
3. Xuất ra kết quả DƯỚI DẠNG CHUỖI JSON ĐÚNG CHUẨN như sau:
\`\`\`json
{
  "passed": true,
  "feedback": "Nhận xét chi tiết: Em đã làm đúng bước 1... Tuy nhiên bước 2 em tính nhầm..."
}
\`\`\`
Ghi chú: 
- "passed" (boolean): true nếu học sinh làm đúng (hoặc đúng phần lớn), false nếu sai hoàn toàn hoặc không thể đọc được.
- "feedback" (string): Lời nhận xét chi tiết, khen ngợi và chỉ ra lỗi sai. CÓ THỂ DÙNG MARKDOWN và LaTeX (bọc trong $$) trong phần feedback.

CHÚ Ý: Bắt buộc phản hồi của bạn phải chứa đoạn mã JSON nằm trong \`\`\`json và \`\`\`!`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: image, mimeType: "image/jpeg" } }
    ]);
    
    const text = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      const parsed = JSON.parse(jsonMatch[1]);
      return NextResponse.json(parsed);
    } else {
      // Fallback extraction
      const fallbackMatch = text.match(/\{[\s\S]*\}/);
      if (fallbackMatch) {
        const parsed = JSON.parse(fallbackMatch[0]);
        return NextResponse.json(parsed);
      }
      throw new Error("Không thể đọc kết quả JSON từ AI.");
    }
  } catch (error: any) {
    console.error("Lỗi AI Chấm điểm:", error);
    return NextResponse.json({ error: error.message || "Đã xảy ra lỗi khi chấm điểm." }, { status: 500 });
  }
}
