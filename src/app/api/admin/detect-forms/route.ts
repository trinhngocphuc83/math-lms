import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAllAIKeys } from '@/utils/aiKeys';
import { filterCleanKeys, blockKey } from '@/utils/aiKeyManager';
import { requireStaff } from '@/utils/auth/guard';

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

    const prompt = `Bạn là một chuyên gia phân loại đề Toán học, đang giúp giáo viên gắn "Dạng toán" (math_form) cho từng câu hỏi trước khi lưu vào Ngân hàng câu hỏi.

DANH SÁCH DẠNG TOÁN ĐÃ CÓ SẴN TRONG NGÂN HÀNG (chỉ trong phạm vi Chương/Bài đang soạn):
${formListStr}

CÂU HỎI CẦN PHÂN LOẠI:
${questionsBlock}

QUY TẮC:
1. Với câu KHÔNG phải Đúng/Sai: chọn 1 Dạng toán khớp nhất trong danh sách có sẵn. Nếu KHÔNG có dạng nào phù hợp, được phép TỰ ĐỀ XUẤT một tên Dạng toán mới, ngắn gọn, đúng văn phong các dạng đã có (ví dụ "Tìm khoảng đồng biến của hàm số", không viết câu đầy đủ, không có dấu chấm cuối).
2. Với câu Đúng/Sai 4 mệnh đề: xét TỪNG mệnh đề a, b, c, d riêng biệt xem thuộc dạng toán nào.
   - Nếu CẢ 4 mệnh đề cùng thuộc một Dạng toán -> trả về đúng dạng đó (isNew=false nếu dạng đã có sẵn).
   - Nếu các mệnh đề thuộc TỪ HAI Dạng toán khác nhau trở lên -> trả về "${globalTongHop}" (isNew=false, vì đây là nhãn tổng hợp có sẵn).
   - Chỉ tự đề xuất Dạng toán mới cho câu Đúng/Sai khi cả 4 mệnh đề cùng một dạng NHƯNG dạng đó chưa có trong danh sách.
3. Nếu Dạng toán trả về TRÙNG (không phân biệt hoa/thường) với một dạng đã có trong danh sách -> isNew=false và viết lại NGUYÊN VĂN đúng như trong danh sách.
4. Nếu là dạng bạn tự đề xuất, hoàn toàn mới, chưa từng xuất hiện trong danh sách -> isNew=true.
5. Nếu nội dung quá mơ hồ để phân loại, bỏ qua ID đó (không đưa vào kết quả).

Trả về DUY NHẤT một chuỗi JSON, định dạng:
{
  "id_câu_hỏi_1": { "form": "Tên Dạng Bài", "isNew": false },
  "id_câu_hỏi_2": { "form": "Tên Dạng Bài Mới Do Bạn Đề Xuất", "isNew": true }
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

        // Chuẩn hoá kết quả: đảm bảo mỗi mục có đúng { form, isNew }, phòng khi AI trả sai định dạng
        const normalized: Record<string, { form: string; isNew: boolean }> = {};
        for (const [id, value] of Object.entries(parsed)) {
          if (typeof value === 'string') {
            normalized[id] = { form: value, isNew: !allForms?.some(f => f.trim().toLowerCase() === value.trim().toLowerCase()) };
          } else if (value && typeof value === 'object' && 'form' in value) {
            const v = value as any;
            normalized[id] = { form: String(v.form || ''), isNew: Boolean(v.isNew) };
          }
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
