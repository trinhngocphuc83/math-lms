import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAllAIKeys } from '@/utils/aiKeys';
import { filterCleanKeys, blockKey } from '@/utils/aiKeyManager';

export async function POST(request: Request) {
  try {
    const { image, images, textAnswer, question, sampleAnswer, maxScore = 10 } = await request.json();

    if (!image && (!images || images.length === 0) && (!textAnswer || !textAnswer.trim())) {
      return NextResponse.json({ error: "Vui lòng nhập câu trả lời hoặc đính kèm ảnh bài làm!" }, { status: 400 });
    }

    // Lấy toàn bộ Keys (.env + JSON cộng dồn) rồi lọc bỏ Keys đang nằm trong Sổ Đen
    const allKeys = getAllAIKeys();
    const cleanKeys = filterCleanKeys(allKeys);
    
    if (cleanKeys.length === 0) {
       return NextResponse.json({ 
         error: allKeys.length === 0 
           ? "Máy chủ chưa được cấu hình API Key nào. Vui lòng báo Giáo viên!" 
           : "Toàn bộ Cổng AI đã cạn kiệt dung lượng (bị khóa 24h). Vui lòng nạp thêm Key mới ở trang Admin!" 
       }, { status: 503 });
    }

    // Chuẩn bị Prompt chấm bài
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

    // Chuẩn bị dữ liệu ảnh
    const parts: any[] = [prompt];
    
    // Xử lý ảnh đơn (image)
    if (image && typeof image === 'string' && image.startsWith('data:image')) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      parts.push({ inlineData: { data: base64Data, mimeType: "image/jpeg" } });
    }

    // Xử lý mảng ảnh (images) 
    if (images && Array.isArray(images)) {
      images.forEach((img: string) => {
        if (typeof img === 'string' && img.startsWith('data:image')) {
          const mimeType = img.split(';')[0].split(':')[1] || 'image/jpeg';
          const base64Content = img.split(',')[1];
          parts.push({ inlineData: { data: base64Content, mimeType } });
        }
      });
    }

    // ====== CỖ MÁY AUTO-FALLBACK: Vòng lặp Xoay Key Tự Động ======
    let lastError: any = null;
    
    for (const apiKey of cleanKeys) {
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
        
        // CHẤM THÀNH CÔNG -> TRẢ VỀ NGAY LẬP TỨC
        return NextResponse.json(parsed);

      } catch (err: any) {
        lastError = err;
        const msg = (err.message || '').toLowerCase();
        
        // Phát hiện Lỗi Quota/429 -> Quăng Key vào Sổ Đen, nhảy sang Key tiếp
        if (msg.includes('quota') || msg.includes('429') || msg.includes('exceeded') || msg.includes('too many requests') || msg.includes('resource has been exhausted')) {
          blockKey(apiKey, err.message);
          console.log(`[Auto-Fallback] Key ***${apiKey.slice(-4)} đã cạn quota -> Chuyển Key tiếp theo...`);
          continue; // NHẢY SANG KEY TIẾP THEO NGAY LẬP TỨC
        }
        
        // Lỗi 503 (Service Unavailable) -> cũng thử key khác
        if (msg.includes('503') || msg.includes('service unavailable') || msg.includes('overloaded')) {
          console.log(`[Auto-Fallback] Key ***${apiKey.slice(-4)} bị 503 -> Thử key khác...`);
          continue;
        }

        // Lỗi khác (parse, network...) -> cũng thử key khác cho an toàn
        console.error(`[Auto-Fallback] Lỗi không xác định với Key ***${apiKey.slice(-4)}:`, err.message);
        continue;
      }
    }

    // Hết sạch Key mà không chấm được -> Trả về lỗi cuối cùng
    return NextResponse.json({ 
      error: `Tất cả ${cleanKeys.length} Cổng AI đều đã cạn kiệt hoặc báo lỗi. Vui lòng nạp thêm Key mới ở trang Admin hoặc chờ 24h để Key được mở lại.\nChi tiết: ${lastError?.message || 'Không rõ'}` 
    }, { status: 503 });

  } catch (error: any) {
    console.error("Lỗi AI Chấm điểm:", error);
    return NextResponse.json({ error: error.message || "Đã xảy ra lỗi khi chấm điểm." }, { status: 500 });
  }
}
