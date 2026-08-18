import { NextResponse } from 'next/server';
import { getAllAIKeys } from '@/utils/aiKeys';
import { goiGemini } from '@/utils/geminiRunner';
import { requireStaff } from '@/utils/auth/guard';

// Cho phép API chạy tối đa 60s trên Vercel, phòng khi vượt giới hạn mặc định.
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const { latexCode, title, apiKeyIndex } = await request.json();

    if (!latexCode) {
      return NextResponse.json({ error: "Missing latex code" }, { status: 400 });
    }

    // Lấy cả khoá biến môi trường lẫn khoá thầy cô tự thêm ở Trạm kiểm soát Cổng A.I.
    const tatCaKhoa = await getAllAIKeys();
    if (tatCaKhoa.length === 0) {
      return NextResponse.json({ error: "API Key chưa được cấu hình" }, { status: 500 });
    }
    // Client có thể chỉ định bắt đầu từ khoá nào để chia tải; vẫn xoay tiếp các khoá còn lại.
    const batDau = (typeof apiKeyIndex === 'number' && apiKeyIndex >= 0 && apiKeyIndex < tatCaKhoa.length)
      ? apiKeyIndex : 0;
    const keys = [...tatCaKhoa.slice(batDau), ...tatCaKhoa.slice(0, batDau)];

    const prompt = `Bạn là chuyên gia về mã LaTeX Toán học.
Dưới đây là một đoạn mã LaTeX bị lỗi cú pháp hoặc trình bày chưa đẹp, thuộc công thức có tên: "${title || 'Không rõ'}".
Mã lỗi:
${latexCode}

Nhiệm vụ của bạn là: Sửa lại đoạn mã LaTeX này sao cho:
1. Chuẩn cú pháp KaTeX/LaTeX.
2. Hiển thị đẹp nhất (ví dụ: \`\\vec{a}\` thay vì \`\\vec a\`, dùng \`\\cdot\` thay cho dấu nhân, thêm dấu ngoặc nhọn bao quanh chỉ số dưới nếu cần như \`a_{1}b_{1}\`).
3. KHÔNG THAY ĐỔI bản chất Toán học của công thức.
4. Chỉ trả về DUY NHẤT chuỗi LaTeX đã sửa. KHÔNG bọc trong \`\`\`latex hay $$. KHÔNG giải thích gì thêm.`;

    // Xoay khoá rồi xoay model - xem geminiRunner.ts
    const kq = await goiGemini({ keys, parts: [prompt] });
    console.log(`[Sửa công thức] Dùng model ${kq.model}`);
    let text = kq.text.trim();
    
    // Remove markdown code blocks if the AI still outputs them
    if (text.startsWith('```latex')) {
      text = text.replace(/^```latex\n?/, '').replace(/\n?```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    
    return NextResponse.json({ correctedLatex: text.trim() });
  } catch (error: any) {
    console.error("Lỗi Sửa LaTeX bằng AI:", error);
    return NextResponse.json({ error: error.message || "Đã xảy ra lỗi khi gọi AI." }, { status: 500 });
  }
}
