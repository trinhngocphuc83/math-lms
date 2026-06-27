import { NextResponse } from 'next/server';
import { getAllAIKeys, getCustomKeys, saveCustomKeys } from '@/utils/aiKeys';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  if (action === 'totalCount') {
    // Trả về tổng số Cổng AI đang khả dụng (Cả .env và json) để Học Sinh chọn
    const allKeys = getAllAIKeys();
    return NextResponse.json({ count: allKeys.length });
  }

  // Mặc định trả về Danh sách các Khóa Tuỳ chỉnh của Admin (ẩn đi một phần cho an toàn nếu cần, nhưng Admin thì cho xem)
  const customKeys = getCustomKeys();
  return NextResponse.json({ customKeys });
}

export async function POST(req: Request) {
  try {
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
