import { NextResponse } from 'next/server';
import { SchemaType } from "@google/generative-ai";
import { getAllAIKeys } from '@/utils/aiKeys';
import { goiGemini } from '@/utils/geminiRunner';
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

    // Lọc khoá bị treo nay nằm trong goiGemini(), vì treo tính riêng theo từng model.
    const allKeys = await getAllAIKeys();
    if (allKeys.length === 0) {
       return NextResponse.json({
         error: "Máy chủ chưa được cấu hình API Key nào. Vui lòng thêm ở trang Trạm kiểm soát Cổng A.I!"
       }, { status: 500 });
    }

    const globalTongHop = tongHopLabel || allForms?.find((f: string) => /tổng hợp/i.test(f)) || "Toán tổng hợp";
    const prompt = buildDetectFormsPrompt({ questions, formsToUse: formsToUse || [], globalTongHop });

    // Xoay khoá rồi xoay model - xem geminiRunner.ts
    try {
      const kq = await goiGemini({
        keys: allKeys,
        parts: [prompt],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema as any,
        },
      });
      console.log(`[Phân dạng] Dùng model ${kq.model}`);
      return NextResponse.json(parseDetectFormsResponse(kq.text, allForms || []));
    } catch (err: any) {
      return NextResponse.json({
        error: (err?.message || 'Không gọi được AI.')
          + ' Hoặc dùng nút "Thủ công" để tự dán vào Gemini Web.',
      }, { status: 503 });
    }

  } catch (error: any) {
    console.error("Detect Forms Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
