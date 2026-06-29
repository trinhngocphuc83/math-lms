import fs from 'fs';
import path from 'path';

const KEYS_FILE_PATH = path.join(process.cwd(), 'ai_keys.json');

// Hàm đọc danh sách Key từ Cả 2 Nguồn (.env.local VÀ file ai_keys.json)
export const getAllAIKeys = (): string[] => {
  const keys: string[] = [];

  // Nguồn 1: Đọc từ Biến môi trường .env.local
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  for (let i = 1; i <= 20; i++) {
    if (process.env[`GEMINI_API_KEY_${i}`]) {
      keys.push(process.env[`GEMINI_API_KEY_${i}`] as string);
    }
  }

  // Nguồn 2: Đọc từ JSON File (Cộng dồn)
  try {
    if (fs.existsSync(KEYS_FILE_PATH)) {
      const fileData = fs.readFileSync(KEYS_FILE_PATH, 'utf-8');
      const parsedData = JSON.parse(fileData);
      if (Array.isArray(parsedData)) {
        keys.push(...parsedData);
      }
    }
  } catch (err) {
    console.error("Lỗi đọc file ai_keys.json:", err);
  }

  // Lọc các key rỗng hoặc trùng lặp (nếu có)
  return Array.from(new Set(keys.filter(k => k.trim() !== '')));
};

// Hàm lấy Key được thêm từ JSON (dành cho Admin quản lý)
export const getCustomKeys = (): string[] => {
  try {
    if (fs.existsSync(KEYS_FILE_PATH)) {
      const fileData = fs.readFileSync(KEYS_FILE_PATH, 'utf-8');
      const parsedData = JSON.parse(fileData);
      if (Array.isArray(parsedData)) return parsedData;
    }
  } catch (err) {}
  return [];
};

// Hàm lưu Key tùy chỉnh vào JSON
export const saveCustomKeys = (newKeys: string[]) => {
  try {
    // Chỉ lưu những Key không rỗng
    const validKeys = newKeys.filter(k => k.trim() !== '');
    fs.writeFileSync(KEYS_FILE_PATH, JSON.stringify(validKeys, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error("Lỗi ghi file ai_keys.json:", err);
    return false;
  }
};
