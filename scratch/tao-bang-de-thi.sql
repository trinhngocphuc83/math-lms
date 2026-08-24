-- ============================================================================
-- CHẠY TRÊN SUPABASE CỦA CẢ HAI APP (Toán và Lý - mỗi app một CSDL riêng)
-- Vào Supabase > dự án > SQL Editor > dán toàn bộ > Run
-- Chạy lại nhiều lần cũng không sao.
-- ============================================================================

-- 1) Ma trận mẫu: khuôn dùng lại, VD "Giữa kỳ I - Toán 12".
--    Trước đây ma trận chỉ nằm trong bộ nhớ trang, đóng tab là mất, nên mỗi lần
--    ra đề lại phải tick từ đầu dù cấu trúc năm nào cũng gần như nhau.
create table if not exists ma_tran_mau (
  id          uuid primary key default gen_random_uuid(),
  nguoi_tao   uuid not null,                 -- tài khoản đã dựng mẫu này
  ten         text not null,                 -- tên gợi nhớ, hiện ra cho dễ chọn
  loai_de     text,                          -- 'Kiểm tra Giữa kỳ I'...
  grade       text,
  subject     text,
  khuon_de    text,                          -- '3-2-2-3' | '4-6' | '7-3' | 'tn100' | 'tl100'
  du_lieu     jsonb not null,                -- { dongMaTran: [...], dauDe: {...} }
  so_cau      int default 0,                 -- để hiện nhanh "mẫu 22 câu"
  tong_diem   numeric default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table ma_tran_mau enable row level security;
-- Không tạo policy nào: trình duyệt bị chặn sạch, chỉ máy chủ đọc/ghi được sau khi
-- đã xác thực danh tính và ràng buộc đúng người tạo.

-- Cùng một người thì tên mẫu không được trùng, lưu lại cùng tên là ghi đè
create unique index if not exists ma_tran_mau_ten_uni
  on ma_tran_mau (nguoi_tao, ten);

create index if not exists ma_tran_mau_nguoi_idx
  on ma_tran_mau (nguoi_tao, updated_at desc);


-- 2) Bộ đề đã lưu.
--    Trước đây nút "Chốt đề" chỉ cộng usage_count rồi báo thành công - bản đề
--    KHÔNG được lưu ở đâu cả. Đóng tab là mất trắng công chọn câu, không có lịch
--    sử đề đã ra, và không in lại được đúng đề đã phát cho học sinh.
create table if not exists bo_de_thi (
  id          uuid primary key default gen_random_uuid(),
  nguoi_tao   uuid not null,
  ten         text not null,
  loai_de     text,
  grade       text,
  subject     text,
  khuon_de    text,
  dau_de      jsonb,                         -- lớp học / kỳ / môn-lớp / năm học / thời gian / mã đề
  ma_tran     jsonb,                         -- các dòng ma trận kèm điểm mỗi câu
  cau_hoi     jsonb not null,                -- CHỤP LẠI toàn bộ nội dung câu, xem ghi chú dưới
  so_cau      int default 0,
  tong_diem   numeric default 0,
  da_chot     boolean default false,         -- đã cộng usage_count cho các câu chưa
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Vì sao cau_hoi lưu BẢN CHỤP đầy đủ chứ không lưu mỗi danh sách id:
-- sau này sửa một câu trong ngân hàng (đổi số liệu, vá công thức) thì đề cũ phải
-- giữ nguyên như lúc in cho học sinh. Nếu chỉ lưu id, mở lại đề tháng trước sẽ ra
-- nội dung đã đổi, không còn đối chiếu được với bài học sinh đã làm.
-- Trong mỗi phần tử vẫn giữ cả id gốc để đối chiếu với kho hiện tại khi cần.

alter table bo_de_thi enable row level security;
-- Không tạo policy nào, lý do như bảng trên.

create index if not exists bo_de_thi_nguoi_idx
  on bo_de_thi (nguoi_tao, updated_at desc);

create index if not exists bo_de_thi_lop_idx
  on bo_de_thi (nguoi_tao, grade, subject);
