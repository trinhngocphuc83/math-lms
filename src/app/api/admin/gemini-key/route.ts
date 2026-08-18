import { NextResponse } from 'next/server';
import { requireStaff } from '@/utils/auth/guard';
import { getAllAIKeys } from '@/utils/aiKeys';
import { filterCleanKeys, blockKey } from '@/utils/aiKeyManager';

/**
 * Cấp danh sách khoá Gemini cho các trang chạy AI phía trình duyệt (quét đề, soạn bài).
 *
 * Bản cũ liệt kê CỨNG GEMINI_API_KEY_1..5 từ biến môi trường nên có hai lỗ hổng:
 *   - Bỏ qua hoàn toàn khoá thầy cô tự thêm ở trang "Trạm kiểm soát Cổng A.I": thêm vào
 *     thì trang đó đếm tăng, nhưng lúc quét đề vẫn không hề dùng tới.
 *   - Không lọc khoá đã cạn hạn mức, nên mỗi lần quét lại thử tuần tự đúng những khoá
 *     hỏng đó, mỗi khoá phải chờ Google trả lỗi - chính là lý do quét lâu.
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

    const cleanKeys = await filterCleanKeys(allKeys);
    if (cleanKeys.length === 0) {
      return NextResponse.json({
        error: `Cả ${allKeys.length} khoá AI đều đã dùng hết hạn mức trong ngày (gói miễn phí của Google chỉ cho 20 lượt/ngày mỗi khoá). `
          + 'Vui lòng chờ sang ngày mới, thêm khoá mới ở trang Cài đặt Cổng A.I, hoặc nâng cấp gói trả phí.',
      }, { status: 429 });
    }

    // Xáo trộn để chia đều tải giữa các khoá
    const shuffledKeys = [...cleanKeys].sort(() => 0.5 - Math.random());
    return NextResponse.json({
      keys: shuffledKeys,
      key: shuffledKeys[0],
      tongSoKhoa: allKeys.length,
      soKhoaBiTreo: allKeys.length - cleanKeys.length,
    });
  } catch (error) {
    console.error('Lỗi khi lấy Gemini API Key:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}

/**
 * Trình duyệt báo về khoá vừa bị Google từ chối vì cạn hạn mức, để treo lại 24 giờ.
 *
 * Các trang chạy AI ở phía trình duyệt không đụng được vào sổ đen (nằm trong CSDL, chỉ
 * máy chủ mới có quyền), nên cần đường báo riêng này - nếu không, lần quét sau vẫn thử
 * lại đúng khoá đã hỏng.
 */
export async function POST(request: Request) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const { key, reason } = await request.json();
    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Thiếu khoá cần treo.' }, { status: 400 });
    }
    await blockKey(key, String(reason || 'Cạn hạn mức'));
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
