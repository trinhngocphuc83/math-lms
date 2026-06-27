import sys

filepath = r'D:\APP LMS\math-lms\src\app\api\grade\route.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Thêm import getAllAIKeys
import_marker = "import { GoogleGenerativeAI } from '@google/generative-ai';"
if "getAllAIKeys" not in content:
    content = content.replace(import_marker, import_marker + "\nimport { getAllAIKeys } from '@/utils/aiKeys';")

# 2. Xóa bỏ logic đọc key từ process.env (Vòng lặp) và thay bằng đọc từ getAllAIKeys
old_key_logic = """    const keys: string[] = [];
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
    for (let i = 1; i <= 10; i++) {
      if (process.env[`GEMINI_API_KEY_${i}`]) {
        keys.push(process.env[`GEMINI_API_KEY_${i}`] as string);
      }
    }

    if (keys.length === 0) {
      return NextResponse.json({ error: "Chưa cấu hình GEMINI_API_KEY" }, { status: 500 });
    }

    const startIndex = Math.floor(Math.random() * keys.length);
    const rotatedKeys = [...keys.slice(startIndex), ...keys.slice(0, startIndex)];

    let lastError = null;

    // Chế độ xoay vòng (Round-Robin) API Keys để tránh bị quét Rate Limit 503
    for (const apiKey of rotatedKeys) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);"""

new_key_logic = """    const allKeys = getAllAIKeys();
    if (allKeys.length === 0) {
      return NextResponse.json({ error: "Chưa cấu hình GEMINI_API_KEY" }, { status: 500 });
    }

    // Chọn Key chính xác theo serverId từ Học Sinh
    const targetIndex = (serverId && serverId > 0 && serverId <= allKeys.length) ? serverId - 1 : 0;
    const apiKey = allKeys[targetIndex];

    try {
      const genAI = new GoogleGenerativeAI(apiKey);"""

content = content.replace(old_key_logic, new_key_logic)

# 3. Xóa đuôi catch của vòng lặp Round-Robin
old_catch = """      } catch (err: any) {
        lastError = err;
        console.error("Lỗi API Key (Tự luận đơn):", err.message);
        continue;
      }
    }

    throw new Error(lastError?.message || "Tất cả API keys đều quá tải (503).");"""

new_catch = """      } catch (err: any) {
        console.error(`Lỗi API Key ở Cổng Số ${targetIndex + 1}:`, err.message);
        throw err; // Bắn thẳng lỗi về UI để Học sinh Đổi Cổng
      }"""

content = content.replace(old_catch, new_catch)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Đã cập nhật API Backend (Route) thành công!")
