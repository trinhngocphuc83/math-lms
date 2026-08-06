import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { getAllAIKeys } from '@/utils/aiKeys';
import { filterCleanKeys, blockKey } from '@/utils/aiKeyManager';
import { requireStaff } from '@/utils/auth/guard';

const VALID_DIFFICULTIES = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'] as const;

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

interface IncomingQuestion {
  id: string;
  question_type: string;
  content: string;
  /** Chỉ có với câu Đúng/Sai 4 mệnh đề */
  statements?: string[];
}

export async function POST(request: Request) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const { questions, formsToUse, allForms, tongHopLabel } = await request.json() as {
      questions: IncomingQuestion[];
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
         error: "Toàn bộ Cổng AI đã cạn kiệt dung lượng (bị khóa 24h). Vui lòng nạp thêm Key mới ở trang Admin!"
       }, { status: 503 });
    }

    const globalTongHop = tongHopLabel || allForms?.find((f: string) => /tổng hợp/i.test(f)) || "Toán tổng hợp";
    const formListStr = (formsToUse && formsToUse.length > 0)
      ? formsToUse.map((f: string) => `- ${f}`).join('\n')
      : '(Chưa có Dạng toán nào trong phạm vi Chương/Bài này)';

    const questionsBlock = questions.map((q) => {
      if (q.question_type === 'true_false_cluster' && q.statements && q.statements.length > 0) {
        const stmts = q.statements.map((s, i) => `  Ý ${String.fromCharCode(97 + i)}) ${String(s).slice(0, 300)}`).join('\n');
        return `ID: ${q.id}\nQuestionType: Đúng/Sai 4 mệnh đề\nCâu dẫn: ${String(q.content).slice(0, 200)}\nCác mệnh đề:\n${stmts}`;
      }
      return `ID: ${q.id}\nQuestionType: ${q.question_type}\nContent: ${String(q.content).slice(0, 500)}`;
    }).join('\n\n');

    const prompt = `Bạn là một chuyên gia phân loại đề Toán học, đang giúp giáo viên gắn "Dạng toán" và "Mức độ" cho từng câu hỏi trước khi lưu vào Ngân hàng câu hỏi.

DANH SÁCH DẠNG TOÁN ĐÃ CÓ SẴN TRONG NGÂN HÀNG (chỉ trong phạm vi Chương/Bài đang soạn):
${formListStr}

CÂU HỎI CẦN PHÂN LOẠI:
${questionsBlock}

QUY TẮC VỀ DẠNG TOÁN:
1. Với câu KHÔNG phải Đúng/Sai: chọn 1 Dạng toán khớp nhất trong danh sách có sẵn. Nếu KHÔNG có dạng nào phù hợp, được phép TỰ ĐỀ XUẤT một tên Dạng toán mới, ngắn gọn, đúng văn phong các dạng đã có (ví dụ "Tìm khoảng đồng biến của hàm số", không viết câu đầy đủ, không có dấu chấm cuối).
2. Với câu Đúng/Sai 4 mệnh đề: xét TỪNG mệnh đề a, b, c, d riêng biệt xem thuộc dạng toán nào.
   - Nếu CẢ 4 mệnh đề cùng thuộc một Dạng toán -> trả về đúng dạng đó (isNew=false nếu dạng đã có sẵn).
   - Nếu các mệnh đề thuộc TỪ HAI Dạng toán khác nhau trở lên -> trả về "${globalTongHop}" (isNew=false, vì đây là nhãn tổng hợp có sẵn).
   - Chỉ tự đề xuất Dạng toán mới cho câu Đúng/Sai khi cả 4 mệnh đề cùng một dạng NHƯNG dạng đó chưa có trong danh sách.
3. Nếu Dạng toán trả về TRÙNG (không phân biệt hoa/thường) với một dạng đã có trong danh sách -> isNew=false và viết lại NGUYÊN VĂN đúng như trong danh sách.
4. Nếu là dạng bạn tự đề xuất, hoàn toàn mới, chưa từng xuất hiện trong danh sách -> isNew=true.

QUY TẮC VỀ MỨC ĐỘ (đánh giá theo NỘI DUNG câu hỏi, không theo thứ tự câu):
- "Nhận biết": chỉ cần nhớ định nghĩa, công thức, nhận ra khái niệm. Không cần biến đổi.
- "Thông hiểu": áp dụng trực tiếp một công thức/quy tắc quen thuộc, tính toán 1-2 bước.
- "Vận dụng": phải kết hợp nhiều bước hoặc nhiều kiến thức, biến đổi không hiển nhiên.
- "Vận dụng cao": bài toán phức tạp, nhiều tầng lập luận, toán thực tế khó, hoặc cần ý tưởng đặc biệt.

QUY TẮC BẮT BUỘC VỀ KẾT QUẢ:
- Trả về đúng ${questions.length} phần tử trong mảng kết quả, MỖI ID ở trên phải có đúng 1 phần tử tương ứng, không bỏ sót ID nào và không tự thêm ID không có trong đề.
- Nếu một câu quá mơ hồ, vẫn phải đưa ra phương án hợp lý nhất, tuyệt đối không được thiếu phần tử cho ID đó.
- Giữ nguyên ID y hệt như đã cho, không rút gọn hay đổi khác.`;

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

        let jsonStr = text;
        if (text.includes('[')) {
          jsonStr = text.substring(text.indexOf('['), text.lastIndexOf(']') + 1);
        }

        const parsedArray = JSON.parse(jsonStr);
        if (!Array.isArray(parsedArray)) throw new Error('AI không trả về mảng như yêu cầu');

        // Chuẩn hoá kết quả. isNew luôn tự xác định lại bằng cách đối chiếu với danh
        // sách thật, không tin hoàn toàn vào cờ AI trả về (AI hay báo nhầm dạng đã có
        // thành dạng mới). Nhờ responseSchema, "difficulty" giờ LUÔN có mặt và chỉ
        // nhận đúng 1 trong 4 giá trị hợp lệ - không cần lọc lại như trước.
        const normalized: Record<string, { form: string; isNew: boolean; difficulty: string }> = {};

        for (const item of parsedArray) {
          if (!item || typeof item !== 'object') continue;
          const id = String(item.id || '').trim();
          const form = String(item.form || '').trim();
          if (!id || !form) continue;

          // Nếu tên dạng trùng (không phân biệt hoa/thường) với dạng đã có -> dùng
          // NGUYÊN VĂN bản trong ngân hàng để không tạo ra bản sao lệch chính tả.
          const existing = allForms?.find(f => f.trim().toLowerCase() === form.toLowerCase());

          normalized[id] = {
            form: existing || form,
            isNew: !existing,
            difficulty: String(item.difficulty || ''),
          };
        }

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
      error: `Tất cả ${cleanKeys.length} Cổng AI đều đã cạn kiệt hoặc báo lỗi. Vui lòng nạp thêm Key mới.\nChi tiết: ${lastError?.message || 'Không rõ'}`
    }, { status: 503 });

  } catch (error: any) {
    console.error("Detect Forms Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
