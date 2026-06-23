import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const { latexCode, title, apiKeyIndex } = await request.json();

    if (!latexCode) {
      return NextResponse.json({ error: "Missing latex code" }, { status: 400 });
    }

    const apiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4
    ].filter(Boolean) as string[];

    if (apiKeys.length === 0) {
      return NextResponse.json({ error: "API Key chưa được cấu hình" }, { status: 500 });
    }

    let apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
    if (typeof apiKeyIndex === 'number' && apiKeyIndex >= 0 && apiKeyIndex < apiKeys.length) {
      apiKey = apiKeys[apiKeyIndex];
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `Bạn là chuyên gia về mã LaTeX Toán học.
Dưới đây là một đoạn mã LaTeX bị lỗi cú pháp hoặc trình bày chưa đẹp, thuộc công thức có tên: "${title || 'Không rõ'}".
Mã lỗi:
${latexCode}

Nhiệm vụ của bạn là: Sửa lại đoạn mã LaTeX này sao cho:
1. Chuẩn cú pháp KaTeX/LaTeX.
2. Hiển thị đẹp nhất (ví dụ: \`\\vec{a}\` thay vì \`\\vec a\`, dùng \`\\cdot\` thay cho dấu nhân, thêm dấu ngoặc nhọn bao quanh chỉ số dưới nếu cần như \`a_{1}b_{1}\`).
3. KHÔNG THAY ĐỔI bản chất Toán học của công thức.
4. Chỉ trả về DUY NHẤT chuỗi LaTeX đã sửa. KHÔNG bọc trong \`\`\`latex hay $$. KHÔNG giải thích gì thêm.`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    
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
