# Skill và bộ nhớ của Claude — một bản dùng chung cho mọi máy

Thư mục này (`G:\My Drive\APP LMS\claude-skills`) là **nguồn duy nhất** của các skill Claude Code:
`giao-an-tu-luan` (THCS, 100% tự luận) · `thpt-12` (THPT) · `nap-bai-tap-vao-kho` · `soi-phieu-cham`,
kèm `_chung/` (hàm dùng chung). Bộ nhớ của Claude về dự án nằm ở thư mục bên cạnh
`G:\My Drive\APP LMS\claude-memory\`. Trong mỗi máy, các thư mục tương ứng chỉ là **junction**
trỏ về đây, nên sửa ở máy nào thì máy khác cũng thấy (sau khi Google Drive đồng bộ).

## Cài trên máy mới — 7 bước, làm một lần

1. **Google Drive for desktop** đăng nhập cùng tài khoản, thấy được thư mục `My Drive\APP LMS`.
   Ghi lại chữ ổ đĩa (máy này là `G:`; máy khác có thể là chữ khác — thay vào các lệnh dưới).
   Nên bật *Available offline* cho `APP LMS\claude-skills` và `APP LMS\claude-memory`.
2. **Node.js** (đang dùng v24) và **Git**. Python 3.10 + `pip install pymupdf` chỉ cần khi soạn
   bài từ sách quét (đọc PDF).
3. **Lấy mã nguồn** về đúng đường dẫn `D:\claude\math-lms` (và `D:\claude\physics-lms` nếu dùng
   app Lý): `git clone` từ GitHub, rồi `npm install` trong mỗi repo. Đường dẫn phải đúng như vậy
   vì bộ nhớ của Claude được xếp theo đường dẫn dự án (`D--claude-math-lms`).
4. **Tệp `.env.local`** ở gốc mỗi repo (khoá Supabase, Gemini…) — không có trong Git, thầy tự
   chép từ máy cũ hoặc từ Vercel. Không có tệp này thì mọi script đều dừng ngay câu đầu.
5. **Nối skill**: trong PowerShell tại gốc repo:
   ```powershell
   Remove-Item -Recurse -Force .claude\skills -ErrorAction SilentlyContinue
   cmd /c mklink /J ".claude\skills" "G:\My Drive\APP LMS\claude-skills"
   ```
   (`git clone` mang theo một bản chép của skills — phải xoá rồi nối, nếu không hai bản lệch nhau.)
   Làm cho cả hai repo.
6. **Nối bộ nhớ** (sau khi mở Claude Code một lần trong repo để nó tạo thư mục dự án):
   ```powershell
   $m = "$env:USERPROFILE\.claude\projects\D--claude-math-lms\memory"
   if (Test-Path $m) { Rename-Item $m "memory.cu" }
   cmd /c mklink /J $m "G:\My Drive\APP LMS\claude-memory\math-lms"
   ```
7. **Claude Code** (app desktop) đăng nhập; muốn Claude tự mở app xem bài thì cài thêm tiện ích
   *Claude in Chrome* và đăng nhập app LMS trong Chrome.

Kiểm tra: mở Claude Code trong `D:\claude\math-lms`, gõ `/` phải thấy bốn skill; chạy thử
```bash
npm run -s skill -- .claude/skills/thpt-12/scripts/soi-chuong.mjs --lop "TOÁN 9" --chuong "HỆ THỨC LƯỢNG"
```
ra bảng phủ dạng là xong.

## Chạy script

Script nằm ngoài repo (qua junction) nên Node không tự tìm thấy `node_modules` của repo. Luôn
chạy bằng launcher đã khai trong `package.json` (`skill` = `node --preserve-symlinks
--preserve-symlinks-main`):

```bash
npm run -s skill -- .claude/skills/<skill>/scripts/<script>.mjs --lop "TOÁN 9" --chuong "…"
npm run -s skill -- --experimental-strip-types .claude/skills/thpt-12/scripts/xuat-chuong-word.mjs …
```

Chạy `node …` trực tiếp sẽ báo `ERR_MODULE_NOT_FOUND @supabase/supabase-js`.

## Sửa skill

Sửa ngay trong thư mục này (hoặc qua `.claude/skills` của repo — cùng một chỗ). Git của repo
vẫn theo dõi nội dung qua junction, nên `git commit` như thường; GitHub là bản dự phòng.
Đừng tạo bản riêng trong repo.
