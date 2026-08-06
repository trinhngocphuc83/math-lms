/**
 * Logic dựng prompt và đọc kết quả cho tính năng AI gán Dạng toán + Mức độ.
 *
 * Tách riêng ra đây (không nằm trong route.ts) để DÙNG CHUNG được ở cả hai nơi:
 * - Server (/api/admin/detect-forms): gọi Gemini qua API, có responseSchema ép cứng.
 * - Client (PushToBankModal): sinh cùng một prompt để giáo viên tự dán vào Gemini
 *   Web/ChatGPT khi Cổng AI của hệ thống báo lỗi (hết quota, 503 quá tải...), rồi
 *   dán kết quả JSON vào lại - không phụ thuộc API server đang gặp sự cố.
 *
 * Giữ hai luồng dùng chung một hàm để không lặp lại lỗi cũ: quy tắc phân loại ở
 * hai nơi từng lệch nhau (chỗ này sửa, chỗ kia quên) là nguyên nhân của nhiều lỗi
 * đã gặp trước đây trong dự án.
 */

export const VALID_DIFFICULTIES = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'] as const;
export type DifficultyLabel = (typeof VALID_DIFFICULTIES)[number];

export interface DetectFormsQuestion {
  id: string;
  question_type: string;
  content: string;
  /** Chỉ có với câu Đúng/Sai 4 mệnh đề */
  statements?: string[];
}

export interface DetectFormsResultItem {
  form: string;
  isNew: boolean;
  difficulty: string;
}

/** Dựng đoạn liệt kê câu hỏi trong prompt - dùng chung cho cả sinh prompt lẫn ước lượng độ dài. */
function buildQuestionsBlock(questions: DetectFormsQuestion[]): string {
  return questions.map((q) => {
    if (q.question_type === 'true_false_cluster' && q.statements && q.statements.length > 0) {
      const stmts = q.statements.map((s, i) => `  Ý ${String.fromCharCode(97 + i)}) ${String(s).slice(0, 300)}`).join('\n');
      return `ID: ${q.id}\nQuestionType: Đúng/Sai 4 mệnh đề\nCâu dẫn: ${String(q.content).slice(0, 200)}\nCác mệnh đề:\n${stmts}`;
    }
    return `ID: ${q.id}\nQuestionType: ${q.question_type}\nContent: ${String(q.content).slice(0, 500)}`;
  }).join('\n\n');
}

export interface BuildDetectFormsPromptParams {
  questions: DetectFormsQuestion[];
  /** Dạng toán đã có, trong đúng phạm vi Chương/Bài đang soạn */
  formsToUse: string[];
  /** Nhãn "Toán tổng hợp" (hoặc tương đương) đang dùng trong hệ thống */
  globalTongHop: string;
  /** true khi dùng cho luồng dán tay - có kèm hướng dẫn định dạng JSON tường minh
   *  vì Gemini Web/ChatGPT không có responseSchema ép cứng như gọi qua API. */
  forManualCopy?: boolean;
}

export function buildDetectFormsPrompt({
  questions,
  formsToUse,
  globalTongHop,
  forManualCopy = false,
}: BuildDetectFormsPromptParams): string {
  const formListStr = formsToUse.length > 0
    ? formsToUse.map((f) => `- ${f}`).join('\n')
    : '(Chưa có Dạng toán nào trong phạm vi Chương/Bài này)';

  const questionsBlock = buildQuestionsBlock(questions);

  const outputInstruction = forManualCopy
    ? `Trả về DUY NHẤT một mảng JSON, không kèm chữ giải thích, không bọc trong \`\`\`json, đúng định dạng sau:
[
  { "id": "id_câu_hỏi_1", "form": "Tên Dạng Bài", "isNew": false, "difficulty": "Thông hiểu" },
  { "id": "id_câu_hỏi_2", "form": "Tên Dạng Bài Mới Do Bạn Đề Xuất", "isNew": true, "difficulty": "Vận dụng" }
]`
    : '';

  return `Bạn là một chuyên gia phân loại đề Toán học, đang giúp giáo viên gắn "Dạng toán" và "Mức độ" cho từng câu hỏi trước khi lưu vào Ngân hàng câu hỏi.

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
- Trả về đúng ${questions.length} phần tử trong kết quả, MỖI ID ở trên phải có đúng 1 phần tử tương ứng, không bỏ sót ID nào và không tự thêm ID không có trong đề.
- Nếu một câu quá mơ hồ, vẫn phải đưa ra phương án hợp lý nhất, tuyệt đối không được thiếu phần tử cho ID đó.
- Giữ nguyên ID y hệt như đã cho, không rút gọn hay đổi khác.
- Trường "difficulty" chỉ được nhận đúng 1 trong 4 giá trị: "Nhận biết", "Thông hiểu", "Vận dụng", "Vận dụng cao".
${outputInstruction}`;
}

/**
 * Đọc kết quả AI trả về (mảng JSON, có thể lẫn chữ giải thích hoặc bọc ```json
 * khi copy tay từ Gemini Web/ChatGPT) và chuẩn hoá về dạng dùng trong app.
 *
 * Dùng CHUNG cho cả kết quả gọi qua API (đã được responseSchema ép gọn) lẫn kết
 * quả dán tay (lộn xộn hơn) - nên luôn khoan dung, không bao giờ throw vì một
 * phần tử lỗi, chỉ bỏ qua phần tử đó.
 */
export function parseDetectFormsResponse(
  rawText: string,
  allForms: string[]
): Record<string, DetectFormsResultItem> {
  let jsonStr = rawText.trim();
  // Bỏ rào ```json ... ``` nếu có (thường gặp khi copy tay từ chat AI)
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');

  const start = jsonStr.indexOf('[');
  const end = jsonStr.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Không tìm thấy mảng JSON hợp lệ trong nội dung dán vào');
  }
  jsonStr = jsonStr.slice(start, end + 1);

  const parsedArray = JSON.parse(jsonStr);
  if (!Array.isArray(parsedArray)) {
    throw new Error('Nội dung dán vào không phải là một mảng JSON');
  }

  const normalized: Record<string, DetectFormsResultItem> = {};

  for (const item of parsedArray) {
    if (!item || typeof item !== 'object') continue;
    const id = String((item as any).id || '').trim();
    const form = String((item as any).form || '').trim();
    if (!id || !form) continue;

    // Nếu tên dạng trùng (không phân biệt hoa/thường) với dạng đã có -> dùng
    // NGUYÊN VĂN bản trong ngân hàng để không tạo ra bản sao lệch chính tả.
    const existing = allForms.find((f) => f.trim().toLowerCase() === form.toLowerCase());

    const rawDifficulty = String((item as any).difficulty || '').trim();
    const difficulty = (VALID_DIFFICULTIES as readonly string[]).includes(rawDifficulty) ? rawDifficulty : '';

    normalized[id] = {
      form: existing || form,
      isNew: !existing,
      difficulty,
    };
  }

  return normalized;
}
