-- ============================================================================
-- CHẠY TRÊN SUPABASE CỦA CẢ HAI APP (Toán và Lý - mỗi app một CSDL riêng)
-- Vào Supabase > dự án > SQL Editor > dán toàn bộ > Run
-- Chạy lại nhiều lần cũng không sao.
-- ============================================================================

-- Khuôn đề tuỳ chỉnh: ngoài 5 khuôn dựng sẵn (3-2-2-3, 4-6, 7-3, 100% TN, 100% TL),
-- thầy cô tự dựng một cơ cấu số câu/điểm khác rồi lưu lại để chọn nhanh những lần sau,
-- y hệt cách "Ma trận mẫu" đã làm cho cả bảng ma trận.
create table if not exists khuon_de_tuy_chinh (
  id          uuid primary key default gen_random_uuid(),
  nguoi_tao   uuid not null,                 -- tài khoản đã lưu khuôn này
  ten         text not null,                 -- tên gợi nhớ, hiện trong ô chọn
  mo_ta       text,                          -- dòng tóm tắt hiện khi trỏ chuột vào
  chi_tieu    jsonb not null,                -- { NLC: {soCau, diemMoiCau}, DS: {...}, ... } - xem KhuonDe trong deThi.ts
  so_cau      int default 0,
  tong_diem   numeric default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table khuon_de_tuy_chinh enable row level security;
-- Không tạo policy nào: trình duyệt bị chặn sạch, chỉ máy chủ đọc/ghi được sau khi
-- đã xác thực danh tính và ràng buộc đúng người tạo.

-- Cùng một người thì tên khuôn không được trùng, lưu lại cùng tên là ghi đè
create unique index if not exists khuon_de_tuy_chinh_ten_uni
  on khuon_de_tuy_chinh (nguoi_tao, ten);

create index if not exists khuon_de_tuy_chinh_nguoi_idx
  on khuon_de_tuy_chinh (nguoi_tao, updated_at desc);
