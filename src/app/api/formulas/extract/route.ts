import { NextResponse } from 'next/server';
import { getAllAIKeys } from '@/utils/aiKeys';
import { goiGemini } from '@/utils/geminiRunner';
import { requireStaff } from '@/utils/auth/guard';

// Cho phép API chạy tối đa 60s trên Vercel - trích xuất công thức từ ảnh dễ
// vượt giới hạn mặc định, khi đó hàm bị cắt ngang mà không báo lỗi rõ ràng.
export const maxDuration = 60;


// Biến toàn cục để lưu index key đang dùng (xoay vòng round-robin giữa các request)
let globalKeyIndex = 0;

export async function POST(request: Request) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const { images, categories, apiKeyIndex } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    // Lấy cả khoá biến môi trường lẫn khoá thầy cô tự thêm ở Trạm kiểm soát Cổng A.I.
    const tatCaKhoa = await getAllAIKeys();
    console.log(`[Bóc tách] Tổng số API Key có sẵn: ${tatCaKhoa.length}`);
    if (tatCaKhoa.length === 0) {
      return NextResponse.json({ error: "API Key chưa được cấu hình. Hãy thêm GEMINI_API_KEY vào file .env.local" }, { status: 500 });
    }

    // Client có thể chỉ định khoá bắt đầu; nếu không thì xoay vòng toàn cục để chia tải.
    let startIndex: number;
    if (typeof apiKeyIndex === 'number' && apiKeyIndex >= 0 && apiKeyIndex < tatCaKhoa.length) {
      startIndex = apiKeyIndex;
    } else {
      startIndex = globalKeyIndex % tatCaKhoa.length;
      globalKeyIndex = (globalKeyIndex + 1) % tatCaKhoa.length;
    }
    const keys = [...tatCaKhoa.slice(startIndex), ...tatCaKhoa.slice(0, startIndex)];

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

    // Xoay khoá rồi xoay model - xem geminiRunner.ts
    try {
      const kq = await goiGemini({ keys, parts: [prompt, ...imageParts] });
      console.log(`[Bóc tách] Dùng model ${kq.model}`);
      const text = kq.text;

      // Parse kết quả JSON
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsed = JSON.parse(jsonMatch[1]);
        console.log(`[Bóc tách] Tìm được ${parsed.length} công thức`);
        return NextResponse.json(parsed);
      }
      // AI trả về JSON không bọc trong code fence
      const fallbackMatch = text.match(/\[[\s\S]*\]/);
      if (fallbackMatch) {
        const parsed = JSON.parse(fallbackMatch[0]);
        console.log(`[Bóc tách] Tìm được ${parsed.length} công thức (không có code fence)`);
        return NextResponse.json(parsed);
      }
      throw new Error("Không thể đọc kết quả JSON từ AI.");
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Không gọi được AI.' }, { status: 503 });
    }

  } catch (error: any) {
    console.error("[Bóc tách] Lỗi hệ thống:", error);
    return NextResponse.json({ error: error.message || "Đã xảy ra lỗi khi gọi AI bóc tách ảnh." }, { status: 500 });
  }
}

