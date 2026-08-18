import { NextResponse } from "next/server";
import { getAllAIKeys } from '@/utils/aiKeys';
import { goiGemini } from '@/utils/geminiRunner';
import { requireStaff } from "@/utils/auth/guard";

// Hàm lấy API key xoay vòng

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const { htmlContent } = await request.json();

    // Lấy cả khoá biến môi trường lẫn khoá thầy cô tự thêm ở Trạm kiểm soát Cổng A.I.
    const keys = await getAllAIKeys();
    if (keys.length === 0) {
      throw new Error("Chưa cấu hình GEMINI_API_KEY");
    }

    const systemInstruction = `
      Bạn là một trợ lý thông minh chuyên sửa lỗi định dạng toán học.
      Nhiệm vụ: Chuyển đổi toàn bộ các biểu thức toán học, công thức trong đoạn văn bản/HTML sau về chuẩn LaTeX được bọc trong cặp dấu $...$ (inline) hoặc $$...$$ (block).
      KHÔNG thay đổi bất kỳ chữ nghĩa bình thường hay cấu trúc HTML nào, chỉ chèn dấu $ vào đúng vị trí công thức toán đang bị lỗi.
      Chỉ trả về trực tiếp đoạn văn bản/HTML sau khi đã sửa, không giải thích gì thêm, không bọc trong \`\`\`html.
    `;

    // Xoay khoá rồi xoay model - xem geminiRunner.ts
    const kq = await goiGemini({
      keys,
      parts: [systemInstruction + "\n\nNội dung cần sửa:\n" + htmlContent],
      generationConfig: { temperature: 0.1 },
    });
    console.log(`[Sửa LaTeX] Dùng model ${kq.model}`);
    // Xóa block code markdown nếu AI trả về
    const fixedHtml = kq.text.replace(/^```html\n?/, '').replace(/\n?```$/, '');
    return NextResponse.json({ fixedHtml });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

