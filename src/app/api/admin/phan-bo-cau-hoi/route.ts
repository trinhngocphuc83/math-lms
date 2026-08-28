import { NextResponse } from 'next/server';
import { SchemaType } from "@google/generative-ai";
import { getAllAIKeys } from '@/utils/aiKeys';
import { goiGemini } from '@/utils/geminiRunner';
import { requireStaff } from '@/utils/auth/guard';
import { chuanTen } from '@/utils/phanLoaiCauHoi';
import {
  MUC_DO_HOP_LE,
  demChuong,
  dungCayDanhMuc,
  vietCayThanhChu,
  dungPromptPhanBo,
  docKetQuaPhanBo,
  type CauCanPhanBo,
  type DongDanhMucGon,
} from '@/utils/phanBoDanhMucPrompt';

/**
 * Xếp TỪNG câu hỏi về đúng Chương / Bài / Dạng đã có trong danh mục.
 *
 * Khác với /api/admin/detect-forms (chỉ đoán Dạng, trong phạm vi một bài đã biết trước):
 * ở đây máy nhận cả cây danh mục và tự quyết mỗi câu thuộc chương nào, bài nào. Cần thế
 * vì tài liệu đưa vào thường là một ĐỀ THI trải trên nhiều chương.
 */

const responseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      id: { type: SchemaType.STRING, description: 'ID câu hỏi, chép nguyên văn, không tự đổi' },
      subject: { type: SchemaType.STRING, description: 'Tên Phân môn, chép NGUYÊN VĂN từ danh mục đã cho' },
      topic: { type: SchemaType.STRING, description: 'Tên Chương, chép NGUYÊN VĂN từ danh mục đã cho' },
      lesson: { type: SchemaType.STRING, description: 'Tên Bài, chép NGUYÊN VĂN từ danh mục đã cho' },
      math_form: { type: SchemaType.STRING, description: 'Tên Dạng, ưu tiên chọn trong danh sách dạng của bài đó' },
      dangMoi: { type: SchemaType.BOOLEAN, description: 'true nếu tự đề xuất dạng mới, false nếu chọn dạng đã có' },
      difficulty: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: [...MUC_DO_HOP_LE],
        description: 'Mức độ nhận thức của câu hỏi',
      },
      lyDo: { type: SchemaType.STRING, description: 'Vì sao xếp vào đó, dưới 15 từ' },
    },
    required: ['id', 'subject', 'topic', 'lesson', 'math_form', 'dangMoi', 'difficulty'],
  },
};

// Cho chạy tối đa 60s trên Vercel; thiếu dòng này thì bị cắt ngang ở ~10s mà không báo lỗi
// rõ ràng, nút "Đang phân tích..." treo vô thời hạn.
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    // Không nhận "subject" nữa: Phân môn là một tầng của cây danh mục, để máy tự xếp
    // từng câu. Đề cuối kỳ có cả Đại số lẫn Hình học, chốt sẵn một môn cho cả lô là sai.
    const { questions, danhMuc, grade } = await request.json() as {
      questions: CauCanPhanBo[];
      danhMuc: DongDanhMucGon[];
      grade?: string;
    };

    if (!questions?.length) {
      return NextResponse.json({ error: 'Không có câu hỏi nào cần xếp chỗ.' }, { status: 400 });
    }
    if (!danhMuc?.length) {
      return NextResponse.json({
        error: 'Chưa chọn Lớp, hoặc danh mục của lớp đó còn trống.'
          + ' Hãy chọn Lớp trước, hoặc dựng danh mục ở trang Khối lớp & Danh mục.',
      }, { status: 400 });
    }

    const cay = dungCayDanhMuc(danhMuc);
    if (demChuong(cay) === 0) {
      return NextResponse.json({ error: 'Danh mục của lớp này chưa có Chương và Bài nào.' }, { status: 400 });
    }

    const allKeys = await getAllAIKeys();
    if (allKeys.length === 0) {
      return NextResponse.json({
        error: 'Máy chủ chưa được cấu hình API Key nào. Vui lòng thêm ở trang Trạm kiểm soát Cổng A.I!',
      }, { status: 500 });
    }

    const prompt = dungPromptPhanBo({
      cauHoi: questions,
      cayChu: vietCayThanhChu(cay),
      grade: grade || '',
      dsMon: [...cay.keys()],
    });

    try {
      const kq = await goiGemini({
        keys: allKeys,
        parts: [prompt],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema as any,
        },
      });
      console.log(`[Phân bổ danh mục] Dùng model ${kq.model}`);
      const { xepDuoc, khongXep } = docKetQuaPhanBo(kq.text, cay, chuanTen);
      return NextResponse.json({ xepDuoc, khongXep, model: kq.model });
    } catch (err: any) {
      return NextResponse.json({
        error: (err?.message || 'Không gọi được AI.') + ' Thử lại, hoặc tự chọn Dạng cho từng câu.',
      }, { status: 503 });
    }
  } catch (error: any) {
    console.error('Phan bo danh muc Error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}
