import { NextResponse } from 'next/server';
import { getAllAIKeys, getCustomKeys, saveCustomKeys, getEnvKeysMasked, importEnvKeysToDb, soKhoaCucBoChuaGop, gopKhoaCucBoVaoKhoChung } from '@/utils/aiKeys';
import { dungKhoChung } from '@/utils/supabase/khoKhoa';
import { requireAdmin, requireUser } from '@/utils/auth/guard';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  if (action === 'totalCount') {
    // Chỉ trả về SỐ LƯỢNG cổng AI khả dụng - mọi tài khoản đã đăng nhập đều xem được
    const countGuard = await requireUser();
    if (!countGuard.ok) return countGuard.response;

    const allKeys = await getAllAIKeys();
    return NextResponse.json({ count: allKeys.length });
  }

  // Danh sách Key thật chỉ dành cho Quản trị viên
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const customKeys = await getCustomKeys();
  // Khoá lõi chỉ bày bản đã che - đủ để thầy đối chiếu xem khoá nào đang nằm ở biến môi trường
  return NextResponse.json({
    customKeys,
    coreKeys: getEnvKeysMasked(),
    // Kho chung: app này đang đọc/ghi khoá ở dự án Supabase của app Toán hay ở dự án riêng
    khoChung: dungKhoChung(),
    khoaCucBoChuaGop: await soKhoaCucBoChuaGop(),
  });
}

export async function POST(req: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const body = await req.json();

    // Chép khoá lõi (biến môi trường của bản đang chạy) vào CSDL để quản lý một chỗ
    if (body?.action === 'importEnv') {
      const kq = await importEnvKeysToDb();
      if (kq.loi) return NextResponse.json({ error: `Lỗi chép khoá lõi: ${kq.loi}` }, { status: 500 });
      return NextResponse.json({
        message: kq.them > 0
          ? `Đã chép ${kq.them} khoá lõi vào cơ sở dữ liệu (${kq.daCo} khoá đã có sẵn).`
          : `Không có khoá lõi nào mới: ${kq.daCo} khoá đều đã nằm trong cơ sở dữ liệu.`,
        ...kq,
      });
    }

    // Gộp khoá còn nằm ở bảng riêng của app này sang kho chung
    if (body?.action === 'gopCucBo') {
      const kq = await gopKhoaCucBoVaoKhoChung();
      if (kq.loi) return NextResponse.json({ error: `Lỗi gộp khoá: ${kq.loi}` }, { status: 500 });
      return NextResponse.json({ message: kq.them > 0 ? `Đã gộp ${kq.them} khoá của app này vào kho chung.` : 'Không còn khoá nào cần gộp.', ...kq });
    }

    const { keys } = body; // mảng các chuỗi API Key

    if (!Array.isArray(keys)) {
      return NextResponse.json({ error: 'Định dạng dữ liệu không hợp lệ.' }, { status: 400 });
    }

    const success = await saveCustomKeys(keys);
    if (success) {
      const soKhoa = (await getCustomKeys()).length;
      return NextResponse.json({ message: `Đã lưu ${soKhoa} Cổng Máy chủ Trí tuệ Nhân tạo vào cơ sở dữ liệu!` });
    } else {
      return NextResponse.json({ error: 'Lỗi ghi dữ liệu xuống Máy chủ.' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
