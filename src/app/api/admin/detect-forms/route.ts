import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { getAllAIKeys } from '@/utils/aiKeys';
import { filterCleanKeys, blockKey } from '@/utils/aiKeyManager';
import { requireStaff } from '@/utils/auth/guard';
import {
  VALID_DIFFICULTIES,
  buildDetectFormsPrompt,
  parseDetectFormsResponse,
  type DetectFormsQuestion,
} from '@/utils/detectFormsPrompt';

/**
 * Ép cứng cấu trúc JSON trả về bằng responseSchema của Gemini, thay vì chỉ dặn
 * bằng lời trong prompt. Trước đây prompt yêu cầu "difficulty" bắt buộc nhưng AI
 * vẫn bỏ trống trường này ở MỌI câu, và vẫn bỏ sót nhiều ID dù đã ghi "bắt buộc
 * trả đủ". Dùng schema với `required` thì mỗi phần tử AI trả về LUÔN có đủ 4
 * trường - Gemini không thể lách qua được như với chỉ dẫn bằng văn bản.
 */
const responseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      id: { type: SchemaType.STRING, description: 'ID câu hỏi, chép nguyên văn từ đề bài, không tự đổi' },
      form: { type: SchemaType.STRING, description: 'Tên Dạng toán' },
      isNew: { type: SchemaType.BOOLEAN, description: 'true nếu là dạng toán tự đề xuất, false nếu khớp dạng đã có sẵn' },
      difficulty: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: [...VALID_DIFFICULTIES],
        description: 'Mức độ nhận thức của câu hỏi',
      },
    },
    required: ['id', 'form', 'isNew', 'difficulty'],
  },
};

// Cho phép API chạy tối đa 60s trên Vercel. Thiếu dòng này thì hàm bị Vercel cắt
// ngang theo giới hạn mặc định (thường 10s) mà KHÔNG trả lỗi rõ ràng về client -
// nút "Đang phân tích..." treo vô thời hạn, trông như hệ thống không hoạt động.
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const { questions, formsToUse, allForms, tongHopLabel } = await request.json() as {
      questions: DetectFormsQuestion[];
      formsToUse: string[];
      allForms: string[];
      tongHopLabel?: string;
    };

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "Không có câu hỏi nào cần phân loại." }, { status: 400 });
    }

    const allKeys = getAllAIKeys();
    const cleanKeys = filterCleanKeys(allKeys);

    if (cleanKeys.length === 0) {
       return NextResponse.json({
         error: "Toàn bộ Cổng AI đã cạn kiệt dung lượng (bị khóa 24h). Vui lòng nạp thêm Key mới, hoặc dùng nút \"Thủ công\" để tự dán vào Gemini Web!"
       }, { status: 503 });
    }

    const globalTongHop = tongHopLabel || allForms?.find((f: string) => /tổng hợp/i.test(f)) || "Toán tổng hợp";
    const prompt = buildDetectFormsPrompt({ questions, formsToUse: formsToUse || [], globalTongHop });

    let lastError: any = null;

    for (const apiKey of cleanKeys) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-3.6-flash",
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema as any,
          }
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const normalized = parseDetectFormsResponse(text, allForms || []);

        return NextResponse.json(normalized);

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
      error: `Tất cả ${cleanKeys.length} Cổng AI đều đã cạn kiệt hoặc báo lỗi. Vui lòng nạp thêm Key mới, hoặc dùng nút "Thủ công" để tự dán vào Gemini Web.\nChi tiết: ${lastError?.message || 'Không rõ'}`
    }, { status: 503 });

  } catch (error: any) {
    console.error("Detect Forms Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
