-- ============================================================================
-- CHẠY TRÊN SUPABASE CỦA CẢ HAI APP (Toán và Lý - mỗi app một CSDL riêng)
-- Vào Supabase > dự án > SQL Editor > dán toàn bộ > Run
-- Chạy lại nhiều lần cũng không sao.
-- ============================================================================

-- Bản nháp của phiên soạn: giữ lại bài đang làm dở ở trang Soạn câu hỏi và trang
-- Soạn đề luyện tập, để hôm sau mở lại làm tiếp thay vì quét lại từ đầu.
create table if not exists ban_nhap_soan (
  id          uuid primary key default gen_random_uuid(),
  nguoi_tao   uuid not null,                 -- tài khoản đã soạn bản nháp này
  loai        text not null,                 -- 'ngan_hang' hoặc 'luyen_tap'
  khoa_rieng  text,                          -- phân biệt nhiều bản nháp cùng loại (VD mã bài học)
  ten         text,                          -- tên gợi nhớ, hiện ra cho dễ chọn
  du_lieu     jsonb not null,                -- toàn bộ nội dung đang soạn
  so_cau      int default 0,                 -- để hiện nhanh "bản nháp 23 câu"
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table ban_nhap_soan enable row level security;
-- Không tạo policy nào: trình duyệt bị chặn sạch, chỉ máy chủ đọc/ghi được sau khi
-- đã xác thực danh tính và ràng buộc đúng người tạo.

-- Mỗi người + mỗi loại + mỗi khoá riêng chỉ giữ MỘT bản nháp, lưu lần sau ghi đè lần trước
create unique index if not exists ban_nhap_soan_khoa_uni
  on ban_nhap_soan (nguoi_tao, loai, coalesce(khoa_rieng, ''));

create index if not exists ban_nhap_soan_nguoi_idx
  on ban_nhap_soan (nguoi_tao, updated_at desc);
