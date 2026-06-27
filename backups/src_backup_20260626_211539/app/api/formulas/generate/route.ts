import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const { categoryName, parentCategoryName, apiKeyIndex } = await request.json();

    if (!categoryName) {
      return NextResponse.json({ error: "Missing category name" }, { status: 400 });
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

    const context = parentCategoryName ? `${parentCategoryName} -> ${categoryName}` : categoryName;

    const prompt = `Bạn là một Giáo sư Toán học cực kỳ giỏi và là tác giả của những cuốn từ điển Toán học chi tiết nhất.
Nhiệm vụ của bạn là liệt kê ĐẦY ĐỦ VÀ CHÍNH XÁC NHẤT TẤT CẢ các công thức Toán học thuộc chủ đề: "${context}".

YÊU CẦU QUAN TRỌNG:
1. TRUY XUẤT TOÀN BỘ KIẾN THỨC: Hãy quét kỹ tất cả các tài liệu, sách giáo khoa và sách nâng cao để đưa ra MỘT DANH SÁCH VÉT CẠN (đầy đủ nhất có thể) các công thức cho chủ đề này. KHÔNG GIỚI HẠN số lượng (có thể lên tới 30-50 công thức nếu cần thiết để bao quát toàn bộ từ cơ bản đến nâng cao, các hệ quả, và các trường hợp đặc biệt).
2. TÍNH CHÍNH XÁC TUYỆT ĐỐI: Bạn phải kiểm tra chéo độ chính xác của từng công thức. Bất kỳ sai sót nào về dấu hay hệ số đều không được chấp nhận.
3. Trả về đúng 1 mảng JSON chứa các công thức.
4. Định dạng JSON BẮT BUỘC như sau:
\`\`\`json
[
  {
    "title": "Tên công thức (Ví dụ: Đạo hàm hàm số mũ cơ số a, Hệ quả đạo hàm trị tuyệt đối...)",
    "latex_content": "Mã LaTeX chuẩn xác",
    "description": "Ghi chú ngắn gọn (khi nào áp dụng, điều kiện chặt chẽ là gì)"
  }
]
\`\`\`
5. CHÚ Ý: "latex_content" phải là mã LaTeX hợp lệ. KHÔNG bọc trong $$ hoặc \\(, chỉ xuất chuỗi bên trong. Chú ý escape dấu backslash cẩn thận trong chuỗi JSON (dùng \\\\ cho các lệnh latex).
6. KHÔNG trả lời gì thêm ngoài đoạn mã JSON nằm trong \`\`\`json.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      const parsed = JSON.parse(jsonMatch[1]);
      return NextResponse.json(parsed);
    } else {
      const fallbackMatch = text.match(/\[[\s\S]*\]/);
      if (fallbackMatch) {
        const parsed = JSON.parse(fallbackMatch[0]);
        return NextResponse.json(parsed);
      }
      throw new Error("Không thể đọc kết quả JSON từ AI.");
    }
  } catch (error: any) {
    console.error("Lỗi Sinh Công Thức bằng AI:", error);
    return NextResponse.json({ error: error.message || "Đã xảy ra lỗi khi gọi AI." }, { status: 500 });
  }
}
