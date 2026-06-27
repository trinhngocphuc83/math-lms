import fs from 'fs';
import path from 'path';

const BLOCKED_KEYS_FILE = path.join(process.cwd(), 'blocked_ai_keys.json');

interface BlockRecord {
  blockedAt: number;
  reason: string;
}

// Đọc danh sách đen
export const getBlockedKeys = (): Record<string, BlockRecord> => {
  try {
    if (fs.existsSync(BLOCKED_KEYS_FILE)) {
      const data = fs.readFileSync(BLOCKED_KEYS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {}
  return {};
};

// Khóa 1 key
export const blockKey = (key: string, reason: string) => {
  const blocked = getBlockedKeys();
  blocked[key] = {
    blockedAt: Date.now(),
    reason: reason
  };
  try {
    fs.writeFileSync(BLOCKED_KEYS_FILE, JSON.stringify(blocked, null, 2), 'utf-8');
    console.log(`[KeyManager] Đã khóa Key: ***${key.slice(-4)} do lỗi: ${reason}`);
  } catch (err) {}
};

// Lọc lấy các Key Sạch (Đã trừ đi key trong sổ đen, và tự động thả khóa nếu quá 24h)
export const filterCleanKeys = (allKeys: string[]): string[] => {
  const blocked = getBlockedKeys();
  const now = Date.now();
  const UNBLOCK_TIME_MS = 24 * 60 * 60 * 1000; // 24 giờ

  const cleanKeys = allKeys.filter(key => {
    const record = blocked[key];
    if (!record) return true; // Sạch

    // Kiểm tra xem đã hết thời hạn khóa chưa
    if (now - record.blockedAt > UNBLOCK_TIME_MS) {
      // Đã quá 24h, xóa khỏi sổ đen (Ghi nhận ở memory, lát nữa nếu cần dọn dẹp file thì dọn sau)
      return true;
    }
    return false; // Vẫn đang bị khóa
  });

  return cleanKeys;
};
