import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAllAIKeys } from '@/utils/aiKeys';
import { filterCleanKeys, blockKey } from '@/utils/aiKeyManager';
import { requireStaff } from '@/utils/auth/guard';

export async function POST(request: Request) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const { questions, formsToUse, allForms } = await request.json();

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "Không có câu hỏi nào cần phân loại." }, { status: 400 });
    }

    const allKeys = getAllAIKeys();
    const cleanKeys = filterCleanKeys(allKeys);
    
    if (cleanKeys.length === 0) {
       return NextResponse.json({ 
         error: "Toàn bộ Cổng AI đã cạn kiệt dung lượng (bị khóa 24h). Vui lòng nạp thêm Key mới ở trang Admin!" 
       }, { status: 503 });
    }

    const globalTongHop = allForms?.find((f: string) => /tổng hợp/i.test(f)) || "Toán tổng hợp";
    const formListStr = formsToUse.map((f: string) => `- ${f}`).join('\n') + (globalTongHop && !formsToUse.includes(globalTongHop) ? `\n- ${globalTongHop}` : '');

    const prompt = `Bạn là một chuyên gia phân loại toán học. Phân loại các câu hỏi sau vào một trong các Dạng Bài (chính xác từng chữ) dưới đây.
Dạng Bài có sẵn:
${formListStr}

Câu hỏi:
${questions.map((q: any) => `ID: ${q.id}\nQuestionType: ${q.question_type}\nContent: ${q.content.substring(0, 500)}`).join('\n\n')}

Quy tắc:
1. Nếu câu hỏi có QuestionType là "true_false_cluster" (Đúng/Sai), ưu tiên chọn Dạng Bài "Toán tổng hợp" (nếu có trong danh sách).
2. Trả về kết quả Dạng Bài phải TRÍCH XUẤT CHÍNH XÁC NGUYÊN VĂN từ danh sách có sẵn (không tự bịa ra dạng bài mới).
3. Trả về MỘT chuỗi JSON ĐƠN GIẢN, định dạng:
{
  "id_câu_hỏi_1": "Tên Dạng Bài Khớp Nhất",
  "id_câu_hỏi_2": "Tên Dạng Bài Khớp Nhất"
}`;

    let lastError: any = null;
    
    for (const apiKey of cleanKeys) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-3.6-flash", 
          generationConfig: {
            responseMimeType: "application/json"
          }
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        let jsonStr = text;
        if (text.includes('{')) {
          jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        }
        
        const parsed = JSON.parse(jsonStr);
        return NextResponse.json(parsed);

      } catch (err: any) {
        lastError = err;
        const msg = (err.message || '').toLowerCase();
        
        if (msg.includes('quota') || msg.includes('429') || msg.includes('exceeded') || msg.includes('too many requests') || msg.includes('resource has been exhausted')) {
          blockKey(apiKey, err.message);
          console.log(`[Auto-Fallback Detect Forms] Key ***${apiKey.slice(-4)} đã cạn quota -> Chuyển Key tiếp theo...`);
          continue;
        }
        
        if (msg.includes('503') || msg.includes('service unavailable') || msg.includes('overloaded')) {
          console.log(`[Auto-Fallback Detect Forms] Key ***${apiKey.slice(-4)} bị 503 -> Thử key khác...`);
          continue;
        }

        console.error(`[Auto-Fallback Detect Forms] Lỗi không xác định với Key ***${apiKey.slice(-4)}:`, err.message);
        continue;
      }
    }

    return NextResponse.json({ 
      error: `Tất cả ${cleanKeys.length} Cổng AI đều đã cạn kiệt hoặc báo lỗi. Vui lòng nạp thêm Key mới.\nChi tiết: ${lastError?.message || 'Không rõ'}` 
    }, { status: 503 });

  } catch (error: any) {
    console.error("Detect Forms Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
