import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const { images, questions, serverId = 1 } = await request.json();

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "Vui lòng đính kèm ảnh bài làm tổng hợp ở cuối trang trước khi nộp bài!" }, { status: 400 });
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "Không có câu hỏi nào cần chấm." }, { status: 400 });
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
      return NextResponse.json({ error: "Máy chủ chưa được cấu hình bất kỳ API Key nào." }, { status: 500 });
    }

    const startIndex = Math.floor(Math.random() * keys.length);
    const rotatedKeys = [...keys.slice(startIndex), ...keys.slice(0, startIndex)];

    const prompt = `Bạn là một Giáo viên Toán học cực kỳ tận tâm và chấm bài rất chuẩn xác.
Học sinh vừa làm bài thi tự luận và nộp BẰNG CÁC HÌNH ẢNH ĐÍNH KÈM (Có thể là nhiều ảnh chụp giấy thi).
Hãy đọc kỹ toàn bộ các hình ảnh để nhận diện câu trả lời và chấm điểm cho TẤT CẢ các câu hỏi dưới đây.

DANH SÁCH CÂU HỎI CẦN CHẤM:
${questions.map((q: any) => `--- CÂU ${q.qIndex} ---
ĐỀ BÀI: ${q.question}
ĐÁP ÁN MẪU / BAREM: ${q.sampleAnswer}
ĐIỂM TỐI ĐA: ${q.maxScore} điểm
`).join('\n')}

YÊU CẦU QUAN TRỌNG:
1. Bạn phải TỰ TÌM phần bài làm của học sinh trong các bức ảnh tương ứng với từng câu hỏi để chấm.
2. Đánh giá xem học sinh làm đúng hay sai, đúng được bao nhiêu phần. Cho điểm lẻ (0.25, 0.5) nếu cần.
3. Nếu hình ảnh mờ, không có nội dung của câu hỏi nào đó, hãy chấm 0 điểm và nhận xét "Không tìm thấy bài làm".
4. BẮT BUỘC trả về kết quả dưới dạng JSON OBJECT. Key là qIndex (dạng string), Value là Object chứa kết quả.
Ví dụ định dạng trả về:
{
  "1": {
    "passed": true,
    "scoreNumber": 2.0,
    "score": "2.0/2",
    "feedback": "Làm bài rất tốt. $$x=2$$ là đúng."
  },
  "2": {
    "passed": false,
    "scoreNumber": 0.5,
    "score": "0.5/1.5",
    "feedback": "Sai dấu ở bước tính Delta."
  }
}`;

    const parts: any[] = [prompt];
    
    // Đẩy TẤT CẢ hình ảnh vào Google Gemini
    if (images && Array.isArray(images)) {
      for (const img of images) {
        if (typeof img === 'string' && img.startsWith('data:image')) {
          const base64Data = img.replace(/^data:image\/\w+;base64,/, '');
          parts.push({ inlineData: { data: base64Data, mimeType: "image/jpeg" } });
        }
      }
    }

    let lastError = null;

    // Chế độ xoay vòng (Round-Robin) API Keys để tránh bị quét Rate Limit 503
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
        const parsed = JSON.parse(text);
        
        return NextResponse.json(parsed);

      } catch (err: any) {
        lastError = err;
        console.error("Lỗi API Key (Batch Mode):", err.message);
        continue;
      }
    }

    throw new Error(lastError?.message || "Tất cả API keys đều quá tải (503).");
  } catch (error: any) {
    console.error("Lỗi AI Chấm điểm Batch:", error);
    return NextResponse.json({ error: error.message || "Đã xảy ra lỗi khi chấm điểm gom nhóm." }, { status: 500 });
  }
}
