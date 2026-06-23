import { NextResponse } from 'next/server';

// API trả về số lượng key Gemini có sẵn (không trả về giá trị key để bảo mật)
export async function GET() {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) keys.push('GEMINI_API_KEY');
  for (let i = 1; i <= 20; i++) {
    if (process.env[`GEMINI_API_KEY_${i}`]) keys.push(`GEMINI_API_KEY_${i}`);
  }
  return NextResponse.json({ count: keys.length });
}
