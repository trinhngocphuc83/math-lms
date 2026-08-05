import { NextResponse } from 'next/server';
import { getAllAIKeys, getCustomKeys, saveCustomKeys } from '@/utils/aiKeys';
import { requireAdmin, requireUser } from '@/utils/auth/guard';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  if (action === 'totalCount') {
    // Chỉ trả về SỐ LƯỢNG cổng AI khả dụng - mọi tài khoản đã đăng nhập đều xem được
    const countGuard = await requireUser();
    if (!countGuard.ok) return countGuard.response;

    const allKeys = getAllAIKeys();
    return NextResponse.json({ count: allKeys.length });
  }

  // Danh sách Key thật chỉ dành cho Quản trị viên
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const customKeys = getCustomKeys();
  return NextResponse.json({ customKeys });
}

export async function POST(req: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const body = await req.json();
    const { keys } = body; // mảng các chuỗi API Key

    if (!Array.isArray(keys)) {
      return NextResponse.json({ error: 'Định dạng dữ liệu không hợp lệ.' }, { status: 400 });
    }

    const success = saveCustomKeys(keys);
    if (success) {
      return NextResponse.json({ message: 'Đã lưu Cổng Máy chủ Trí tuệ Nhân tạo thành công!' });
    } else {
      return NextResponse.json({ error: 'Lỗi ghi dữ liệu xuống Máy chủ.' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
