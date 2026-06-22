import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Hàm lấy API key xoay vòng
function getRotatedApiKeys() {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  let i = 1;
  while (process.env[`GEMINI_API_KEY_${i}`]) {
    keys.push(process.env[`GEMINI_API_KEY_${i}`] as string);
    i++;
  }
  if (keys.length === 0) return [];
  for (let idx = keys.length - 1; idx > 0; idx--) {
    const j = Math.floor(Math.random() * (idx + 1));
    [keys[idx], keys[j]] = [keys[j], keys[idx]];
  }
  return keys;
}

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { htmlContent } = await request.json();

    const rotatedKeys = getRotatedApiKeys();
    if (rotatedKeys.length === 0) {
      throw new Error("Chưa cấu hình GEMINI_API_KEY");
    }

    const systemInstruction = `
      Bạn là một trợ lý thông minh chuyên sửa lỗi định dạng toán học.
      Nhiệm vụ: Chuyển đổi toàn bộ các biểu thức toán học, công thức trong đoạn văn bản/HTML sau về chuẩn LaTeX được bọc trong cặp dấu $...$ (inline) hoặc $$...$$ (block).
      KHÔNG thay đổi bất kỳ chữ nghĩa bình thường hay cấu trúc HTML nào, chỉ chèn dấu $ vào đúng vị trí công thức toán đang bị lỗi.
      Chỉ trả về trực tiếp đoạn văn bản/HTML sau khi đã sửa, không giải thích gì thêm, không bọc trong \`\`\`html.
    `;

    for (const apiKey of rotatedKeys) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-3.5-flash",
          generationConfig: { temperature: 0.1 }
        });
        
        const result = await model.generateContent(systemInstruction + "\n\nNội dung cần sửa:\n" + htmlContent);
        let fixedHtml = result.response.text();
        // Xóa block code markdown nếu AI trả về
        fixedHtml = fixedHtml.replace(/^```html\n?/, '').replace(/\n?```$/, '');

        return NextResponse.json({ fixedHtml });
      } catch (e: any) {
        if (e.status === 429 || e.status === 503) {
          continue; // Thử key khác
        }
        throw e;
      }
    }

    throw new Error("Tất cả API keys đều bị quá tải, vui lòng thử lại sau.");

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
