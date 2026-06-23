import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Lấy tất cả API key từ biến môi trường
function getAllApiKeys(): string[] {
  const keys: string[] = [];
  // Key chính
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  // Các key phụ: GEMINI_API_KEY_1, _2, ... _20
  for (let i = 1; i <= 20; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  return keys;
}

// Biến toàn cục để lưu index key đang dùng (xoay vòng round-robin giữa các request)
let globalKeyIndex = 0;

export async function POST(request: Request) {
  try {
    const { images, categories, apiKeyIndex } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    const apiKeys = getAllApiKeys();
    console.log(`[Bóc tách] Tổng số API Key có sẵn: ${apiKeys.length}`);

    if (apiKeys.length === 0) {
      return NextResponse.json({ error: "API Key chưa được cấu hình. Hãy thêm GEMINI_API_KEY vào file .env.local" }, { status: 500 });
    }

    // Xác định key bắt đầu: dùng round-robin toàn cục hoặc key chỉ định
    let startIndex: number;
    let isSpecificKey = false;

    if (typeof apiKeyIndex === 'number' && apiKeyIndex >= 0 && apiKeyIndex < apiKeys.length) {
      startIndex = apiKeyIndex;
      isSpecificKey = true;
    } else {
      startIndex = globalKeyIndex % apiKeys.length;
      // Tăng index toàn cục cho request tiếp theo (round-robin)
      globalKeyIndex = (globalKeyIndex + 1) % apiKeys.length;
    }

    // Tạo danh sách categories dạng text cho prompt
    const categoriesString = JSON.stringify(categories, null, 2);

    const prompt = `Bạn là một Giáo sư Toán học và chuyên gia bóc tách dữ liệu (OCR).
Tôi sẽ cung cấp cho bạn một hoặc nhiều hình ảnh chứa các công thức Toán học.
Hệ thống hiện tại đang có danh sách các chuyên đề/chương bài sau:
${categoriesString}

Nhiệm vụ của bạn là:
1. Đọc và bóc tách TẤT CẢ các công thức Toán học xuất hiện trong CÁC bức ảnh này.
2. PHÂN LOẠI THÔNG MINH: Với mỗi công thức, hãy suy luận xem nó thuộc về danh mục nào trong danh sách trên và gán "category_id" tương ứng. (Ví dụ: công thức sin/cos thì cho vào ID của Lượng giác).
3. Trả về đúng 1 mảng JSON chứa các công thức.
4. Định dạng JSON BẮT BUỘC như sau:
\`\`\`json
[
  {
    "category_id": "Mã ID của danh mục phù hợp nhất từ danh sách trên",
    "title": "Tên công thức (bạn tự đặt tên ngắn gọn dựa theo nội dung)",
    "latex_content": "Mã LaTeX chuẩn xác của công thức trong ảnh",
    "description": "Ghi chú thêm nếu có (tùy chọn)",
    "needs_image": true/false // (Điền true nếu công thức/định lý này BẮT BUỘC phải có hình vẽ minh họa đi kèm (ví dụ: hình học, đồ thị) mới có thể hiểu được. Ngược lại điền false)
  }
]
\`\`\`
5. CHÚ Ý: "latex_content" phải là mã LaTeX hợp lệ. KHÔNG bọc trong $$ hoặc \\(.
6. KHÔNG trả lời gì thêm ngoài đoạn mã JSON nằm trong \`\`\`json.`;

    const imageParts = images.map((img: string) => ({
      inlineData: { data: img, mimeType: "image/jpeg" }
    }));

    let lastError: any = null;
    const maxTries = isSpecificKey ? 1 : apiKeys.length;

    // Thử lần lượt từng API key
    for (let i = 0; i < maxTries; i++) {
      const currentIndex = (startIndex + i) % apiKeys.length;
      const apiKey = apiKeys[currentIndex];
      const keyLabel = `Key #${currentIndex} (${apiKey.substring(0, 8)}...)`;

      console.log(`[Bóc tách] Đang thử ${keyLabel} (lần ${i + 1}/${maxTries})`);

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Sử dụng gemini-3.5-flash — model mới nhất, thông minh nhất (ra 20/05/2026)
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

        // Timeout 45 giây
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('⏱️ Timeout: API không phản hồi sau 45 giây')), 45000)
        );

        const result = await Promise.race([
          model.generateContent([prompt, ...imageParts]),
          timeoutPromise
        ]) as any;

        const text = result.response.text();

        // Parse kết quả JSON
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          const parsed = JSON.parse(jsonMatch[1]);
          console.log(`[Bóc tách] ✅ Thành công với ${keyLabel}, tìm được ${parsed.length} công thức`);
          return NextResponse.json(parsed);
        } else {
          // Thử parse trực tiếp nếu AI trả về JSON không có code fence
          const fallbackMatch = text.match(/\[[\s\S]*\]/);
          if (fallbackMatch) {
            const parsed = JSON.parse(fallbackMatch[0]);
            console.log(`[Bóc tách] ✅ Thành công (fallback) với ${keyLabel}, tìm được ${parsed.length} công thức`);
            return NextResponse.json(parsed);
          }
          throw new Error("Không thể đọc kết quả JSON từ AI.");
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || '';
        console.warn(`[Bóc tách] ❌ ${keyLabel} thất bại: ${errMsg.substring(0, 150)}`);

        // Nếu là lỗi 503 hoặc 429 (quá tải), chờ 2 giây rồi thử key tiếp
        if (errMsg.includes('503') || errMsg.includes('429') || errMsg.includes('overloaded') || errMsg.includes('Resource has been exhausted')) {
          console.log(`[Bóc tách] ⏳ Chờ 2 giây trước khi thử key tiếp theo...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        // Tiếp tục vòng lặp sang key khác
      }
    }

    // Tất cả key đều thất bại
    const errorMsg = maxTries > 1
      ? `Đã thử tất cả ${maxTries} API Key nhưng đều thất bại. Lỗi cuối: ${lastError?.message || 'Không xác định'}. Vui lòng thử lại sau vài phút.`
      : (lastError?.message || "API Key được chọn đang bận. Hãy chuyển sang chế độ Tự động.");
    
    return NextResponse.json({ error: errorMsg }, { status: 503 });

  } catch (error: any) {
    console.error("[Bóc tách] Lỗi hệ thống:", error);
    return NextResponse.json({ error: error.message || "Đã xảy ra lỗi khi gọi AI bóc tách ảnh." }, { status: 500 });
  }
}
