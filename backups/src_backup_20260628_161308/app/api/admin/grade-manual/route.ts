import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAllAIKeys } from '@/utils/aiKeys';
import { filterCleanKeys, blockKey } from '@/utils/aiKeyManager';

export async function POST(request: Request) {
  try {
    const { imageUrls, customPrompt, question, sampleAnswer, maxScore = 10 } = await request.json();

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json({ error: "Vui lòng chọn ít nhất 1 ảnh bài làm!" }, { status: 400 });
    }

    // Lấy toàn bộ Keys rồi lọc bỏ Keys đang nằm trong Sổ Đen
    const allKeys = getAllAIKeys();
    const cleanKeys = filterCleanKeys(allKeys);
    
    if (cleanKeys.length === 0) {
       return NextResponse.json({ 
         error: "Hệ thống AI hiện đang quá tải hoặc hết Key. Vui lòng thử lại sau!" 
       }, { status: 503 });
    }

    // Chuẩn bị Prompt chấm bài
    const prompt = `Bạn là Trợ lý AI Thông Minh hỗ trợ Giáo viên chấm bài.
Giáo viên yêu cầu bạn chấm bài làm (hình ảnh) của học sinh dựa trên Đề bài và Đáp án mẫu.

[LỆNH ĐẶC BIỆT TỪ GIÁO VIÊN]: "${customPrompt || 'Chấm bình thường dựa trên barem.'}"

THANG ĐIỂM TỐI ĐA: ${maxScore} điểm

ĐỀ BÀI:
${question}

ĐÁP ÁN MẪU / BAREM:
${sampleAnswer}

YÊU CẦU TRẢ VỀ DỮ LIỆU DẠNG JSON với các trường sau:
- "passed" (boolean): true nếu học sinh đạt điểm giỏi, false nếu sai/kém.
- "scoreNumber" (number): Điểm số dạng SỐ THỰC (ví dụ: 1.5, 2.0, 0.75). PHẢI <= ${maxScore}.
- "feedback" (string): Lời nhận xét gửi tới học sinh (dùng Markdown/LaTeX nếu cần). Phải tuân thủ LỆNH ĐẶC BIỆT của giáo viên.`;

    const parts: any[] = [prompt];

    // Download hình ảnh từ URL và convert sang base64
    for (const url of imageUrls) {
       try {
           if (url.startsWith('data:image')) {
               // Là chuỗi Base64 (Fallback)
               const mimeType = url.split(';')[0].split(':')[1] || 'image/jpeg';
               const base64Data = url.split(',')[1];
               parts.push({ inlineData: { data: base64Data, mimeType } });
           } else {
               // Là Web URL (Storage)
               const res = await fetch(url);
               if (!res.ok) continue;
               const arrayBuffer = await res.arrayBuffer();
               const buffer = Buffer.from(arrayBuffer);
               const base64Data = buffer.toString('base64');
               const mimeType = res.headers.get('content-type') || 'image/jpeg';
               parts.push({ inlineData: { data: base64Data, mimeType } });
           }
       } catch(e) {
           console.error("Lỗi tải ảnh để chấm nháp:", url, e);
       }
    }

    if (parts.length === 1) {
       return NextResponse.json({ error: "Không thể tải được dữ liệu ảnh để chấm." }, { status: 400 });
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
        
        // Phát hiện Lỗi Quota/429
        if (msg.includes('quota') || msg.includes('429') || msg.includes('exceeded') || msg.includes('too many requests') || msg.includes('resource has been exhausted')) {
          blockKey(apiKey, err.message);
          console.log(`[Auto-Fallback Admin] Key ***${apiKey.slice(-4)} đã cạn quota -> Chuyển Key tiếp theo...`);
          continue; 
        }
        
        // Lỗi 503
        if (msg.includes('503') || msg.includes('service unavailable') || msg.includes('overloaded')) {
          continue;
        }

        console.error(`[Auto-Fallback Admin] Lỗi không xác định với Key ***${apiKey.slice(-4)}:`, err.message);
        continue;
      }
    }

    // Hết sạch Key mà không chấm được
    return NextResponse.json({ 
      error: `Chấm thất bại do lỗi Hệ thống AI: ${lastError?.message || 'Không rõ'}` 
    }, { status: 503 });

  } catch (error: any) {
    console.error("Lỗi AI Chấm điểm thủ công:", error);
    return NextResponse.json({ error: error.message || "Đã xảy ra lỗi khi chấm điểm." }, { status: 500 });
  }
}
