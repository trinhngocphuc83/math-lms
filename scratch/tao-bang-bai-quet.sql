-- ============================================================================
-- LƯU VẾT BÀI QUÉT - bằng chứng của mỗi lần chấm bài bằng ảnh
--
-- Chạy MỘT LẦN trong Supabase → SQL Editor. Chạy xong tải lại trang là dùng được.
-- Chưa chạy thì trang "Chấm bài quét ảnh" vẫn chấm và vẫn chốt điểm bình thường,
-- chỉ không lưu lại được để tra về sau.
--
-- An toàn: chỉ TẠO MỚI, không đụng tới bảng nào đang có. Chạy lại nhiều lần cũng
-- không sao (mọi thứ đều "if not exists" hoặc "drop policy if exists").
--
-- VÌ SAO CẦN: hiện nay chốt điểm xong app chỉ giữ ĐÚNG MỘT CON SỐ cho mỗi em. Phụ
-- huynh hỏi "sao con tôi được 6,5", hay em nói "con tô B mà máy đọc thành C", thì
-- không còn gì để đối chiếu. Bảng này giữ lại ảnh phiếu, đáp án máy đọc từng câu,
-- chỗ thầy cô sửa tay, và điểm từng câu.
-- ============================================================================


-- ─────────────────────────────────────────────────────── 1. BẢNG BÀI QUÉT
-- Mỗi dòng là MỘT BÀI của một em trong một lần chấm.
create table if not exists public.bai_quet (
  id           uuid primary key default gen_random_uuid(),

  -- Đề nào, mã đề nào. Không ràng buộc khoá ngoại tới bo_de_thi để lỡ sau này xoá
  -- bộ đề thì bài đã chấm vẫn còn nguyên làm bằng chứng.
  bo_de_id     uuid,
  ten_de       text,
  ma_de        text,

  class_id     uuid references public.classes(id) on delete set null,
  student_id   uuid references public.profiles(id) on delete set null,

  -- Ảnh phiếu: [{ duongDan, trang, vai }] - duongDan là đường trong kho ảnh riêng
  -- 'bai-quet', KHÔNG phải địa chỉ công khai. Xem ảnh phải xin chữ ký tạm thời.
  trang_anh    jsonb not null default '[]'::jsonb,

  -- Máy đọc ra gì: [{ ma, loai, cau, hocSinh, dapAn, diem, diemToiDa, vuong }]
  o_da_doc     jsonb not null default '[]'::jsonb,
  -- Độ đậm đo được từng ô: { "NLC:3:B": 0.71, ... } - để trả lời "vì sao máy không dám đọc"
  do_dam       jsonb not null default '{}'::jsonb,
  -- Thầy cô sửa tay câu nào: { "NLC:3": "B", "DS:2:a": "Đ" }
  sua_tay      jsonb not null default '{}'::jsonb,

  diem         numeric,
  diem_toi_da  numeric,
  so_cau_vuong integer not null default 0,

  -- Dòng sổ điểm sinh ra từ lần chốt này, để lần ngược lại được.
  bang_diem_id uuid,

  nguoi_cham   uuid,
  created_at   timestamptz not null default now()
);

create index if not exists bai_quet_lop_idx     on public.bai_quet (class_id, created_at desc);
create index if not exists bai_quet_hs_idx      on public.bai_quet (student_id, created_at desc);
create index if not exists bai_quet_bo_de_idx   on public.bai_quet (bo_de_id);
create index if not exists bai_quet_bang_diem_idx on public.bai_quet (bang_diem_id);


-- ──────────────────────────────────────────────────── 2. KHOÁ THEO VAI TRÒ
-- Dùng lại đúng hàm la_quan_tri() mà các bảng khác đang dùng.
alter table public.bai_quet enable row level security;

-- Thầy cô: toàn quyền. Học sinh: chỉ xem bài CỦA CHÍNH MÌNH, không sửa được.
drop policy if exists bai_quet_doc on public.bai_quet;
create policy bai_quet_doc on public.bai_quet
  for select to authenticated using (student_id = auth.uid() or public.la_quan_tri());

drop policy if exists bai_quet_ghi on public.bai_quet;
create policy bai_quet_ghi on public.bai_quet
  for all to authenticated using (public.la_quan_tri()) with check (public.la_quan_tri());


-- ───────────────────────────────────────────────── 3. KHO ẢNH BÀI LÀM (RIÊNG TƯ)
-- KHÔNG công khai: đây là bài có tên học sinh. Ba kho ảnh hiện có của app
-- (lesson_images, system-assets, lesson_submissions) đều công khai - ai có đường dẫn
-- là xem được, nên không dùng chúng cho việc này.
--
-- Xem ảnh phải xin CHỮ KÝ TẠM THỜI qua máy chủ (createSignedUrl), y như cách app đang
-- làm với bản ghi giọng đọc.
insert into storage.buckets (id, name, public)
values ('bai-quet', 'bai-quet', false)
on conflict (id) do update set public = false;

-- Chỉ thầy cô đọc/ghi qua trình duyệt. App ghi bằng khoá máy chủ nên không vướng.
drop policy if exists bai_quet_anh_doc on storage.objects;
create policy bai_quet_anh_doc on storage.objects
  for select to authenticated
  using (bucket_id = 'bai-quet' and public.la_quan_tri());

drop policy if exists bai_quet_anh_ghi on storage.objects;
create policy bai_quet_anh_ghi on storage.objects
  for all to authenticated
  using (bucket_id = 'bai-quet' and public.la_quan_tri())
  with check (bucket_id = 'bai-quet' and public.la_quan_tri());


-- ============================================================================
-- XONG. Vào trang "Chấm bài quét ảnh", chấm rồi bấm "Chốt điểm vào sổ" là bài được
-- lưu lại; xem lại ở mục "Bài đã quét" ngay trên trang ấy.
-- ============================================================================
