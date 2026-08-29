-- ============================================================================
-- ĐỢT B — VÒNG QUAY GỌI TÊN VÀ ĐIỂM THƯỞNG
--
-- Chạy MỘT LẦN trong Supabase → SQL Editor. Chạy xong tải lại trang là dùng được.
-- Chưa chạy thì các trang vẫn chạy bình thường, chỉ báo "chưa tạo bảng".
--
-- An toàn: chỉ TẠO MỚI, không đụng tới bảng nào đang có. Chạy lại nhiều lần cũng
-- không sao (mọi thứ đều "if not exists").
--
-- NGUYÊN TẮC XUYÊN SUỐT CẢ TỆP: mọi thứ khoá theo LỚP (class_id), không khoá theo
-- bài giảng. `lesson_id` chỉ để ghi nhớ việc đó xảy ra ở đâu, không bao giờ dùng để
-- lọc. Nhờ vậy vòng quay và điểm nối liền mạch qua mọi bài giảng, mọi buổi chữa đề.
-- ============================================================================


-- ────────────────────────────────────────────────────────────── 1. GỌI TÊN
-- Mỗi dòng là một lần gọi tên. Danh sách được quay = học sinh đang học của lớp mà
-- CHƯA có dòng nào ở vòng hiện tại. Hết người thì sang vòng kế tiếp.
create table if not exists public.luot_goi_ten (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  vong        integer not null default 1,
  lesson_id   uuid,                                  -- chỉ ghi nhớ, có thể rỗng
  created_at  timestamptz not null default now()
);

create index if not exists luot_goi_ten_lop_vong_idx
  on public.luot_goi_ten (class_id, vong);
create index if not exists luot_goi_ten_hs_idx
  on public.luot_goi_ten (student_id);


-- ────────────────────────────────────────────────────────── 2. ĐIỂM THƯỞNG
-- Mỗi dòng một lần cộng hoặc trừ. Bốn nguồn dồn chung về một thang.
create table if not exists public.diem_thuong (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  class_id    uuid not null references public.classes(id) on delete cascade,
  thang       text not null,                          -- 'YYYY-MM'
  nguon       text not null,                          -- tuong_tac|kiem_tra|luyen_tap|thi_online
  diem        numeric not null,
  ly_do       text,
  lesson_id   uuid,                                   -- chỉ ghi nhớ, có thể rỗng
  nguoi_tao   uuid,
  created_at  timestamptz not null default now()
);

create index if not exists diem_thuong_lop_thang_idx
  on public.diem_thuong (class_id, thang);
create index if not exists diem_thuong_hs_thang_idx
  on public.diem_thuong (student_id, thang);


-- ──────────────────────────────────────────────── 3. ĐIỂM KIỂM TRA THẦY NHẬP
-- Chỗ này trước giờ KHÔNG lưu gì: ScoresTab chỉ giữ điểm trong bộ nhớ trang, tải
-- lại trang là mất trắng. Hai bảng dưới đây là chỗ để lưu thật.
create table if not exists public.bang_diem (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  ten_bai     text not null,
  diem_dat    numeric default 5,                      -- dưới mức này coi như chưa đạt
  ngay        date not null default current_date,
  nguoi_tao   uuid,
  created_at  timestamptz not null default now()
);

create table if not exists public.bang_diem_chi_tiet (
  id            uuid primary key default gen_random_uuid(),
  bang_diem_id  uuid not null references public.bang_diem(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  diem          numeric,
  created_at    timestamptz not null default now(),
  unique (bang_diem_id, student_id)
);

create index if not exists bang_diem_lop_idx on public.bang_diem (class_id, ngay);


-- ─────────────────────────────────────────────────────────────── 4. HỆ SỐ
-- Thầy cô sửa được: muốn điểm phát biểu trên lớp nặng hơn điểm luyện tập thì chỉnh
-- ở đây, không phải sửa mã.
create table if not exists public.cai_dat_diem (
  nguon         text primary key,
  he_so         numeric not null default 1,
  mo_ta         text,
  cap_nhat_luc  timestamptz not null default now()
);

insert into public.cai_dat_diem (nguon, he_so, mo_ta) values
  ('tuong_tac',  1, 'Phát biểu, trả lời đúng khi gọi tên trên lớp'),
  ('kiem_tra',   1, 'Điểm bài kiểm tra thầy cô nhập'),
  ('luyen_tap',  1, 'Điểm làm bài luyện tập trên hệ thống'),
  ('thi_online', 1, 'Điểm thi online')
on conflict (nguon) do nothing;


-- ─────────────────────────────────────────────────────────── 5. CHỐT THÁNG
-- Chốt rồi thì tháng đó khoá lại, không cộng/trừ thêm được nữa.
create table if not exists public.chot_thang (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  thang       text not null,
  chot_luc    timestamptz not null default now(),
  nguoi_chot  uuid,
  unique (class_id, thang)
);


-- ============================================================================
-- QUYỀN TRUY CẬP
--
-- Đặt chặt hơn mấy bảng cũ một chút, vì đây là ĐIỂM của học sinh:
--   - Học sinh chỉ đọc được điểm CỦA CHÍNH MÌNH.
--   - Chỉ tài khoản admin mới được cộng, trừ, sửa, xoá.
--   - Chưa đăng nhập thì không đọc được gì.
-- Vai trò đọc từ bảng profiles, đúng chỗ hệ thống đang dùng.
-- ============================================================================

alter table public.luot_goi_ten       enable row level security;
alter table public.diem_thuong        enable row level security;
alter table public.bang_diem          enable row level security;
alter table public.bang_diem_chi_tiet enable row level security;
alter table public.cai_dat_diem       enable row level security;
alter table public.chot_thang         enable row level security;

create or replace function public.la_quan_tri() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- Gọi tên: việc của thầy cô, học sinh không cần thấy
drop policy if exists luot_goi_ten_admin on public.luot_goi_ten;
create policy luot_goi_ten_admin on public.luot_goi_ten
  for all to authenticated using (public.la_quan_tri()) with check (public.la_quan_tri());

-- Điểm thưởng: học sinh đọc điểm mình, admin toàn quyền
drop policy if exists diem_thuong_doc on public.diem_thuong;
create policy diem_thuong_doc on public.diem_thuong
  for select to authenticated using (student_id = auth.uid() or public.la_quan_tri());

drop policy if exists diem_thuong_ghi on public.diem_thuong;
create policy diem_thuong_ghi on public.diem_thuong
  for all to authenticated using (public.la_quan_tri()) with check (public.la_quan_tri());

-- Bảng điểm kiểm tra
drop policy if exists bang_diem_admin on public.bang_diem;
create policy bang_diem_admin on public.bang_diem
  for all to authenticated using (public.la_quan_tri()) with check (public.la_quan_tri());

drop policy if exists bang_diem_ct_doc on public.bang_diem_chi_tiet;
create policy bang_diem_ct_doc on public.bang_diem_chi_tiet
  for select to authenticated using (student_id = auth.uid() or public.la_quan_tri());

drop policy if exists bang_diem_ct_ghi on public.bang_diem_chi_tiet;
create policy bang_diem_ct_ghi on public.bang_diem_chi_tiet
  for all to authenticated using (public.la_quan_tri()) with check (public.la_quan_tri());

-- Hệ số và chốt tháng: ai đăng nhập cũng đọc được, chỉ admin sửa
drop policy if exists cai_dat_diem_doc on public.cai_dat_diem;
create policy cai_dat_diem_doc on public.cai_dat_diem
  for select to authenticated using (true);

drop policy if exists cai_dat_diem_ghi on public.cai_dat_diem;
create policy cai_dat_diem_ghi on public.cai_dat_diem
  for all to authenticated using (public.la_quan_tri()) with check (public.la_quan_tri());

drop policy if exists chot_thang_doc on public.chot_thang;
create policy chot_thang_doc on public.chot_thang
  for select to authenticated using (true);

drop policy if exists chot_thang_ghi on public.chot_thang;
create policy chot_thang_ghi on public.chot_thang
  for all to authenticated using (public.la_quan_tri()) with check (public.la_quan_tri());
