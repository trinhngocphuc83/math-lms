import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Thu thập tất cả các key từ biến môi trường
    const keys: string[] = [];
    
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
    if (process.env.GEMINI_API_KEY_1) keys.push(process.env.GEMINI_API_KEY_1);
    if (process.env.GEMINI_API_KEY_2) keys.push(process.env.GEMINI_API_KEY_2);
    if (process.env.GEMINI_API_KEY_3) keys.push(process.env.GEMINI_API_KEY_3);
    if (process.env.GEMINI_API_KEY_4) keys.push(process.env.GEMINI_API_KEY_4);
    if (process.env.GEMINI_API_KEY_5) keys.push(process.env.GEMINI_API_KEY_5);

    // 2. Lọc các key hợp lệ
    const validKeys = keys.filter(k => k && k.trim().length > 0);

    if (validKeys.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy cấu hình Gemini API Key nào trên Server.' }, { status: 500 });
    }

    // 3. Xáo trộn ngẫu nhiên danh sách keys (Load Balancing)
    const shuffledKeys = validKeys.sort(() => 0.5 - Math.random());

    // 4. Trả về toàn bộ danh sách Keys để Client có thể thử lại (retry) khi gặp lỗi 503
    return NextResponse.json({ keys: shuffledKeys, key: shuffledKeys[0] });
    
  } catch (error) {
    console.error('Lỗi khi lấy Gemini API Key:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
