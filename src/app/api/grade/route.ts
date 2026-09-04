import { NextResponse } from 'next/server';
import { getAllAIKeys } from '@/utils/aiKeys';
import { goiGemini } from '@/utils/geminiRunner';
import { requireStaff } from '@/utils/auth/guard';

// Cho phép API chạy tối đa 60s trên Vercel - chấm bài kèm ảnh dễ vượt giới hạn
// mặc định của Vercel, khi đó hàm bị cắt ngang mà không báo lỗi rõ ràng.
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    /*
     * CHỈ nhân viên được gọi, không phải "ai đăng nhập cũng được".
     *
     * Trước đây đây là cửa học sinh tiêu khoá API: khu Luyện tập gọi MỖI CÂU TỰ LUẬN một
     * lượt. Đo trên kho Toán: 448 câu tự luận trong 58 khối bài, 84 lượt ghi danh - tối đa
     * 37.632 lượt gọi. Hạn mức miễn phí của Google là 20 lượt/ngày mỗi khoá, 5 khoá là 100
     * lượt/ngày cho cả app; một lớp làm một khối bài là cháy sạch hạn mức, rồi chính thầy
     * cô không bóc được câu, không soạn được đề. Nay tự luận chuyển sang thầy cô chấm tay.
     */
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const { image, images, textAnswer, question, sampleAnswer, maxScore = 10 } = await request.json();

    if (!image && (!images || images.length === 0) && (!textAnswer || !textAnswer.trim())) {
      return NextResponse.json({ error: "Vui lòng nhập câu trả lời hoặc đính kèm ảnh bài làm!" }, { status: 400 });
    }

    // Lấy toàn bộ khoá (.env + khoá thêm tay). Việc lọc khoá đang bị treo do cạn hạn
    // mức nay nằm trong goiGemini(), vì hạn mức tính riêng cho từng cặp khoá + model.
    const allKeys = await getAllAIKeys();
    if (allKeys.length === 0) {
      return NextResponse.json({
        error: "Máy chủ chưa được cấu hình API Key nào. Vui lòng báo Giáo viên!",
      }, { status: 500 });
    }

    // Chuẩn bị Prompt chấm bài
    const prompt = `Bạn là một Giáo viên Toán học cực kỳ tận tâm và chấm bài rất chuẩn xác.
Học sinh vừa làm bài tự luận và nộp câu trả lời bằng văn bản và/hoặc ảnh chụp bài làm. 
Hãy đọc kỹ bài làm của học sinh, đối chiếu với Đề bài và Đáp án mẫu/Barem/Các bước thực hiện dưới đây để chấm điểm.

THANG ĐIỂM TỐI ĐA CỦA CÂU NÀY: ${maxScore} điểm

ĐỀ BÀI:
${question}

ĐÁP ÁN MẪU / BAREM / CÁC BƯỚC GIẢI:
${sampleAnswer}

BÀI LÀM VĂN BẢN CỦA HỌC SINH (nếu có):
${textAnswer || "Không có"}

YÊU CẦU:
1. Đọc và hiểu các bước giải trong bài làm của học sinh (ảnh hoặc văn bản).
2. Đánh giá xem học sinh làm đúng hay sai, đúng được bao nhiêu phần.
3. Chấm điểm trên THANG ĐIỂM TỐI ĐA ${maxScore} điểm. Cho điểm lẻ (0.25, 0.5, 0.75) nếu cần.
4. Trả về kết quả dưới dạng JSON với các trường sau:
- "passed" (boolean): true nếu học sinh làm đúng (hoặc đúng phần lớn), false nếu sai hoàn toàn.
- "scoreNumber" (number): Điểm số dạng SỐ THỰC (ví dụ: 1.5, 2.0, 0.75). PHẢI nhỏ hơn hoặc bằng ${maxScore}.
- "score" (string): Điểm dạng chuỗi hiển thị (ví dụ: "1.5/${maxScore}").
- "feedback" (string): Lời nhận xét chi tiết, khen ngợi và chỉ ra lỗi sai. CÓ THỂ DÙNG MARKDOWN và LaTeX (bọc trong $$) trong phần feedback.`;

    // Chuẩn bị dữ liệu ảnh
    const parts: any[] = [prompt];
    
    // Xử lý ảnh đơn (image)
    if (image && typeof image === 'string' && image.startsWith('data:image')) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      parts.push({ inlineData: { data: base64Data, mimeType: "image/jpeg" } });
    }

    // Xử lý mảng ảnh (images) 
    if (images && Array.isArray(images)) {
      images.forEach((img: string) => {
        if (typeof img === 'string' && img.startsWith('data:image')) {
          const mimeType = img.split(';')[0].split(':')[1] || 'image/jpeg';
          const base64Content = img.split(',')[1];
          parts.push({ inlineData: { data: base64Content, mimeType } });
        }
      });
    }

    // Xoay khoá rồi xoay model - xem geminiRunner.ts
    try {
      const kq = await goiGemini({
        keys: allKeys,
        parts,
        generationConfig: { responseMimeType: "application/json" },
      });
      console.log(`[Chấm điểm] Dùng model ${kq.model}`);
      return NextResponse.json(JSON.parse(kq.text));
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Không gọi được AI.' }, { status: 503 });
    }

  } catch (error: any) {
    console.error("Lỗi AI Chấm điểm:", error);
    return NextResponse.json({ error: error.message || "Đã xảy ra lỗi khi chấm điểm." }, { status: 500 });
  }
}

