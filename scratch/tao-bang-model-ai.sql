-- ============================================================================
-- CHẠY FILE NÀY TRÊN SUPABASE CỦA CẢ HAI APP (Toán và Lý - mỗi app một CSDL riêng)
-- Vào Supabase > dự án > SQL Editor > dán toàn bộ > Run
-- Chạy lại nhiều lần cũng không sao (đã có IF NOT EXISTS / ON CONFLICT).
-- ============================================================================

-- 1) Danh sách model AI và thứ tự ưu tiên khi gọi.
--    Có bảng này thì thầy cô bật/tắt và sắp thứ tự ngay trên trang
--    "Trạm kiểm soát Cổng A.I", không cần sửa code rồi đẩy lên GitHub lại.
create table if not exists ai_models (
  id         uuid primary key default gen_random_uuid(),
  model_id   text not null unique,          -- ví dụ: gemini-3.6-flash
  thu_tu     int  not null,                 -- số nhỏ được gọi trước
  dang_bat   boolean not null default true, -- tắt thì bỏ qua hẳn model này
  ghi_chu    text,
  created_at timestamptz default now()
);
alter table ai_models enable row level security;
-- Không tạo policy nào: chỉ máy chủ (service_role) đọc/ghi được, trình duyệt bị chặn sạch.

-- 2) Sổ treo khoá, tính RIÊNG cho từng model.
--    Google tính hạn mức riêng cho mỗi model, nên một khoá cạn hạn mức ở
--    gemini-3.7-flash vẫn còn nguyên hạn mức ở gemini-3.5-flash. Bảng cũ chỉ có
--    một cột blocked_at chung nên treo nhầm khoá cho mọi model - đó là lý do
--    tách ra bảng này.
create table if not exists ai_key_blocks (
  id           uuid primary key default gen_random_uuid(),
  api_key      text not null,
  model_id     text not null,
  blocked_at   timestamptz not null default now(),
  block_reason text,
  unique (api_key, model_id)
);
alter table ai_key_blocks enable row level security;

create index if not exists ai_key_blocks_model_idx on ai_key_blocks (model_id, blocked_at);

-- 3) Nạp danh sách model ban đầu.
--    Ba model đầu BẬT sẵn theo đúng thứ tự thầy chốt.
--    Bốn model sau để TẮT, khi nào cần thêm đường vòng thì bật trong giao diện.
insert into ai_models (model_id, thu_tu, dang_bat, ghi_chu) values
  ('gemini-3.6-flash',       1, true,  'Đo 18/08/2026: chạy được nhưng thất thường, 4,9s - 52s'),
  ('gemini-3.7-flash',       2, true,  'Đo 18/08/2026: đang kẹt 503/429 gần như liên tục'),
  ('gemini-3.5-flash',       3, true,  'Đo 18/08/2026: ổn định nhất, 1,4s - 1,7s'),
  ('gemini-3-flash-preview', 4, false, 'Bản xem trước, ổn định 1,7s'),
  ('gemini-2.5-flash',       5, false, 'Đời cũ, ổn định 3,4s'),
  ('gemini-3.5-flash-lite',  6, false, 'Nhanh nhất 0,7s và quota cao, nhưng yếu hơn với công thức'),
  ('gemini-3.1-flash-lite',  7, false, 'Nhanh 1,0s, quota cao, yếu hơn với công thức')
on conflict (model_id) do nothing;

-- ============================================================================
-- Ghi chú: cột blocked_at / block_reason của bảng ai_keys cũ KHÔNG còn được dùng
-- nữa (đã thay bằng ai_key_blocks). Không cần xoá, cứ để đó cũng không ảnh hưởng.
-- Những khoá đang bị treo oan trong cột đó sẽ tự được dùng lại ngay.
-- ============================================================================
