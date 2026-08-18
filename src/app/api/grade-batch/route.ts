import { NextResponse } from 'next/server';
import { getAllAIKeys } from '@/utils/aiKeys';
import { goiGemini } from '@/utils/geminiRunner';
import { requireUser } from '@/utils/auth/guard';

// Cho phép API chạy tối đa 60s trên Vercel - chấm nhiều ảnh cùng lúc rất dễ
// vượt giới hạn mặc định, khi đó hàm bị cắt ngang mà không báo lỗi rõ ràng.
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;

    const { images, questions, serverId = 1 } = await request.json();

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "Vui lòng đính kèm ảnh bài làm tổng hợp ở cuối trang trước khi nộp bài!" }, { status: 400 });
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "Không có câu hỏi nào cần chấm." }, { status: 400 });
    }

    // Lấy cả khoá trong biến môi trường lẫn khoá thầy cô tự thêm ở trang Trạm kiểm soát
    // Cổng A.I. Bản cũ chỉ đọc biến môi trường nên khoá thêm tay không bao giờ được dùng.
    const keys = await getAllAIKeys();
    if (keys.length === 0) {
      return NextResponse.json({ error: "Máy chủ chưa được cấu hình bất kỳ API Key nào." }, { status: 500 });
    }

    const prompt = `Bạn là một Giáo viên Toán học cực kỳ tận tâm và chấm bài rất chuẩn xác.
Học sinh vừa làm bài thi tự luận và nộp BẰNG CÁC HÌNH ẢNH ĐÍNH KÈM (Có thể là nhiều ảnh chụp giấy thi).
Hãy đọc kỹ toàn bộ các hình ảnh để nhận diện câu trả lời và chấm điểm cho TẤT CẢ các câu hỏi dưới đây.

DANH SÁCH CÂU HỎI CẦN CHẤM:
${questions.map((q: any) => `--- CÂU ${q.qIndex} ---
ĐỀ BÀI: ${q.question}
ĐÁP ÁN MẪU / BAREM: ${q.sampleAnswer}
ĐIỂM TỐI ĐA: ${q.maxScore} điểm
`).join('\n')}

YÊU CẦU QUAN TRỌNG:
1. Bạn phải TỰ TÌM phần bài làm của học sinh trong các bức ảnh tương ứng với từng câu hỏi để chấm.
2. Đánh giá xem học sinh làm đúng hay sai, đúng được bao nhiêu phần. Cho điểm lẻ (0.25, 0.5) nếu cần.
3. Nếu hình ảnh mờ, không có nội dung của câu hỏi nào đó, hãy chấm 0 điểm và nhận xét "Không tìm thấy bài làm".
4. BẮT BUỘC trả về kết quả dưới dạng JSON OBJECT. Key là qIndex (dạng string), Value là Object chứa kết quả.
Ví dụ định dạng trả về:
{
  "1": {
    "passed": true,
    "scoreNumber": 2.0,
    "score": "2.0/2",
    "feedback": "Làm bài rất tốt. $$x=2$$ là đúng."
  },
  "2": {
    "passed": false,
    "scoreNumber": 0.5,
    "score": "0.5/1.5",
    "feedback": "Sai dấu ở bước tính Delta."
  }
}`;

    const parts: any[] = [prompt];
    
    // Đẩy TẤT CẢ hình ảnh vào Google Gemini
    if (images && Array.isArray(images)) {
      for (const img of images) {
        if (typeof img === 'string' && img.startsWith('data:image')) {
          const base64Data = img.replace(/^data:image\/\w+;base64,/, '');
          parts.push({ inlineData: { data: base64Data, mimeType: "image/jpeg" } });
        }
      }
    }

    // Xoay khoá rồi xoay model - xem geminiRunner.ts
    const kq = await goiGemini({
      keys,
      parts,
      generationConfig: { responseMimeType: "application/json" },
    });
    console.log(`[Chấm gom nhóm] Dùng model ${kq.model}`);
    return NextResponse.json(JSON.parse(kq.text));

  } catch (error: any) {
    console.error("Lỗi AI Chấm điểm Batch:", error);
    return NextResponse.json({ error: error.message || "Đã xảy ra lỗi khi chấm điểm gom nhóm." }, { status: 500 });
  }
}

