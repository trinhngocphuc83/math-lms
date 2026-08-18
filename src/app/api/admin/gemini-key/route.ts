import { NextResponse } from 'next/server';
import { requireStaff } from '@/utils/auth/guard';
import { getAllAIKeys } from '@/utils/aiKeys';
import { getBlockedKeys, blockKey } from '@/utils/aiKeyManager';
import { layDanhSachModel } from '@/utils/geminiRunner';

/**
 * Cấp khoá Gemini VÀ danh sách model cho các trang chạy AI phía trình duyệt
 * (quét đề, soạn bài, sinh câu tương tự).
 *
 * Bản trước chỉ trả khoá và ghi cứng tên model ở từng trang, nên khi Google để model đó
 * quá tải là các trang này đứng hẳn. Nay trả kèm danh sách model theo đúng thứ tự ưu tiên
 * thầy cô đặt trong bảng ai_models, để trình duyệt tự tụt xuống model kế tiếp.
 *
 * Việc lọc khoá bị treo phải làm ở phía trình duyệt chứ không lọc sẵn ở đây, vì hạn mức
 * tính riêng cho từng cặp khoá + model: một khoá cạn ở model này vẫn dùng tốt ở model kia.
 */
export async function GET() {
  try {
    // API này trả về API Key thật của máy chủ nên chỉ Quản trị viên / Giáo viên
    // (những người dùng trang soạn bài, soạn câu hỏi) mới được gọi.
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const allKeys = await getAllAIKeys();
    if (allKeys.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy cấu hình Gemini API Key nào trên Server.' }, { status: 500 });
    }

    const models = await layDanhSachModel();
    const treo = await getBlockedKeys(); // gộp mọi model, khoá ghi dạng "key|model"
    const danhSachTreo = Object.entries(treo).map(([ghep, tt]) => ({
      key: ghep.split('|')[0],
      model: tt.model,
    }));

    // Xáo trộn để chia đều tải giữa các khoá
    const shuffledKeys = [...allKeys].sort(() => 0.5 - Math.random());
    return NextResponse.json({
      keys: shuffledKeys,
      key: shuffledKeys[0],
      models,
      treo: danhSachTreo,
      tongSoKhoa: allKeys.length,
      soKhoaBiTreo: danhSachTreo.length,
    });
  } catch (error) {
    console.error('Lỗi khi lấy Gemini API Key:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}

/**
 * Trình duyệt báo về cặp khoá + model vừa bị Google từ chối vì cạn hạn mức, để treo 24 giờ.
 *
 * Các trang chạy AI ở phía trình duyệt không đụng được vào sổ treo (nằm trong CSDL, chỉ
 * máy chủ mới có quyền), nên cần đường báo riêng này - nếu không, lần quét sau vẫn thử
 * lại đúng khoá đã hỏng.
 */
export async function POST(request: Request) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const { key, reason, model } = await request.json();
    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Thiếu khoá cần treo.' }, { status: 400 });
    }
    if (!model || typeof model !== 'string') {
      return NextResponse.json({ error: 'Thiếu tên model cần treo.' }, { status: 400 });
    }
    await blockKey(key, String(reason || 'Cạn hạn mức'), model);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
