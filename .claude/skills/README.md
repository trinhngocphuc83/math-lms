# Skill của thầy Phúc — một bản dùng chung cho mọi máy

Thư mục này là **nguồn duy nhất** của các skill Claude Code (giao-an-tu-luan, thpt-12,
nap-bai-tap-vao-kho, soi-phieu-cham). Nó nằm trên Google Drive để máy nào cũng dùng được;
trong mỗi repo, `.claude/skills` chỉ là một **junction** trỏ về đây.

## Cài trên máy mới (một lần, mỗi repo)

Mở PowerShell tại gốc repo (`D:\claude\math-lms` hoặc `physics-lms`), xoá thư mục skills cũ
nếu có rồi tạo junction:

```powershell
Remove-Item -Recurse -Force .claude\skills -ErrorAction SilentlyContinue
cmd /c mklink /J ".claude\skills" "G:\My Drive\APP LMS\claude-skills"
```

(Đường dẫn ổ Google Drive có thể khác chữ G — xem trong File Explorer.)

## Chạy script

Vì script nằm ngoài repo (qua junction), Node không tự tìm thấy `node_modules` của repo. Luôn
chạy bằng launcher đã khai trong `package.json`:

```bash
npm run -s skill -- .claude/skills/<skill>/scripts/<script>.mjs --lop "TOÁN 9" --chuong "…"
npm run -s skill -- --experimental-strip-types .claude/skills/thpt-12/scripts/xuat-chuong-word.mjs …
```

(`skill` = `node --preserve-symlinks --preserve-symlinks-main`.) Chạy `node …` trực tiếp sẽ
báo `ERR_MODULE_NOT_FOUND @supabase/supabase-js`.

## Sửa skill

Sửa ngay trong thư mục này (hoặc qua `.claude/skills` của repo — cùng một chỗ). Git của repo
vẫn theo dõi nội dung qua junction, nên commit như thường; GitHub là bản dự phòng.
