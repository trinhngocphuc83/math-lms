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

    // 3. Xoay vòng ngẫu nhiên (Load Balancing)
    const randomKey = validKeys[Math.floor(Math.random() * validKeys.length)];

    // 4. Trả về Key
    return NextResponse.json({ key: randomKey });
    
  } catch (error) {
    console.error('Lỗi khi lấy Gemini API Key:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
