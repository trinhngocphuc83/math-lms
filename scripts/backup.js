const fs = require('fs');
const path = require('path');

function getTimestamp() {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

const srcDir = path.join(__dirname, '../src');
const backupBaseDir = path.join(__dirname, '../backups');

if (!fs.existsSync(backupBaseDir)) {
  fs.mkdirSync(backupBaseDir, { recursive: true });
}

const backupDir = path.join(backupBaseDir, `src_backup_${getTimestamp()}`);

try {
  // Use Node.js cpSync for recursive copy
  fs.cpSync(srcDir, backupDir, { recursive: true });
  console.log(`\x1b[32m[THÀNH CÔNG]\x1b[0m Đã sao lưu an toàn toàn bộ mã nguồn vào thư mục: \x1b[36m${backupDir}\x1b[0m`);
} catch (err) {
  console.error('\x1b[31m[LỖI]\x1b[0m Không thể sao lưu mã nguồn:', err);
}
