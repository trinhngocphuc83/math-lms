/**
 * KIỂM TRA PHÂN QUYỀN API (Smoke test)
 *
 * Script đăng nhập bằng một tài khoản rồi gọi thử các API để xem
 * người dùng đó được phép / bị chặn đúng như thiết kế hay chưa.
 *
 * CÁCH CHẠY:
 *   1. Mở 1 cửa sổ terminal chạy app:      npm run dev
 *   2. Mở cửa sổ thứ 2 chạy lệnh:
 *
 *      SMOKE_USER=admin@toanthayphuc.com SMOKE_PASS=... node scripts/smoke-test-auth.js
 *
 *   Trên PowerShell (Windows):
 *      $env:SMOKE_USER="admin@toanthayphuc.com"; $env:SMOKE_PASS="..."; node scripts/smoke-test-auth.js
 *
 * Tuỳ chọn:
 *   BASE_URL   địa chỉ app, mặc định http://localhost:3000
 *   SMOKE_ROLE vai trò mong đợi: admin | teacher | student  (mặc định admin)
 *
 * LƯU Ý: Script chỉ gọi các API CHỈ ĐỌC, không tạo/sửa/xóa dữ liệu nào.
 */

const fs = require('fs');
const path = require('path');
const { createServerClient } = require('@supabase/ssr');

// --- Đọc biến môi trường từ .env.local ---
function loadEnvLocal() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
loadEnvLocal();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.SMOKE_USER;
const PASSWORD = process.env.SMOKE_PASS;
const ROLE = (process.env.SMOKE_ROLE || 'admin').toLowerCase();

if (!EMAIL || !PASSWORD) {
  console.error('Thiếu SMOKE_USER hoặc SMOKE_PASS. Xem hướng dẫn ở đầu file này.');
  process.exit(1);
}

/**
 * Kỳ vọng theo vai trò: 'pass' = phải vào được, 'deny' = phải bị chặn (401/403)
 * Chỉ liệt kê các API CHỈ ĐỌC (GET) để không đụng vào dữ liệu thật.
 */
const CHECKS = [
  { path: '/api/admin/gemini-key', label: 'Lấy AI key (soạn bài, soạn câu hỏi)', admin: 'pass', teacher: 'pass', student: 'deny' },
  { path: '/api/settings/ai-keys', label: 'Xem danh sách AI key đã lưu', admin: 'pass', teacher: 'deny', student: 'deny' },
  { path: '/api/settings/ai-keys?action=totalCount', label: 'Đếm số cổng AI khả dụng', admin: 'pass', teacher: 'pass', student: 'pass' },
  { path: '/api/formulas/keys', label: 'Sổ tay công thức: đếm AI key', admin: 'pass', teacher: 'pass', student: 'deny' },
  { path: '/api/admin/exams', label: 'Danh sách Kỳ thi Online', admin: 'pass', teacher: 'pass', student: 'deny' },
  { path: '/api/admin/students', label: 'Danh sách học sinh', admin: 'pass', teacher: 'deny', student: 'deny' },
  { path: '/api/student/my-course', label: 'Khóa học của tôi', admin: 'pass', teacher: 'pass', student: 'pass' },
];

async function main() {
  // 1. Đăng nhập và lấy cookie phiên đúng định dạng mà app đang dùng
  const jar = {};
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })),
        setAll: (list) => list.forEach(({ name, value }) => { jar[name] = value; }),
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error) {
    console.error('✗ Đăng nhập thất bại:', error.message);
    process.exitCode = 1;
    return;
  }

  // 2. Đối chiếu vai trò thật trong bảng profiles
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', data.user.id).single();
  const actualRole = profile?.role || '(không có hồ sơ)';

  console.log(`\nĐăng nhập: ${profile?.full_name || EMAIL}`);
  console.log(`Vai trò trong CSDL: ${actualRole}   |   Kiểm tra theo kịch bản: ${ROLE}`);
  console.log(`Máy chủ: ${BASE_URL}\n`);

  if (actualRole !== ROLE) {
    console.log(`⚠ Vai trò thật (${actualRole}) khác với SMOKE_ROLE (${ROLE}). Kết quả bên dưới có thể sai kỳ vọng.\n`);
  }

  const cookieHeader = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');

  // 3. Gọi thử từng API
  let failed = 0;
  for (const check of CHECKS) {
    const expected = check[ROLE] || 'deny';
    let status, note = '';

    try {
      const res = await fetch(BASE_URL + check.path, { headers: { cookie: cookieHeader } });
      status = res.status;
      if (status >= 400) {
        const body = await res.json().catch(() => ({}));
        note = body.error ? ` — ${body.error}` : '';
      }
    } catch (err) {
      console.log(`✗ ${check.label}: không gọi được (${err.message}). App đã chạy chưa?`);
      failed++;
      continue;
    }

    const blocked = status === 401 || status === 403;
    const ok = expected === 'pass' ? !blocked : blocked;
    if (!ok) failed++;

    const mark = ok ? '✓' : '✗';
    const verdict = expected === 'pass'
      ? (blocked ? `LỖI: đáng lẽ vào được nhưng bị chặn (${status})${note}` : `vào được (${status})`)
      : (blocked ? `bị chặn đúng (${status})` : `LỖI: đáng lẽ phải bị chặn nhưng vào được (${status})`);

    console.log(`${mark} ${check.label.padEnd(42)} ${verdict}`);
  }

  console.log(
    failed === 0
      ? '\n✅ Tất cả đều đúng kỳ vọng.\n'
      : `\n❌ Có ${failed} mục sai kỳ vọng — gửi lại kết quả này để chỉnh phân quyền.\n`
  );

  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error('Lỗi:', e);
  process.exitCode = 1;
});
