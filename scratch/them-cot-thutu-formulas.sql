-- ============================================================================
-- SẮP THỨ TỰ CÔNG THỨC TRONG SỔ TAY
--
-- Bảng formulas hiện chỉ có: id, category_id, title, latex_content, description,
-- created_at, image_url — KHÔNG có cột thứ tự, nên danh sách bắt buộc xếp theo ngày
-- tạo và không cách nào đưa một công thức lên trên.
--
-- Chạy tệp này MỘT LẦN trong Supabase → SQL Editor. Chạy xong, tải lại trang Sổ tay
-- là hai mũi tên ▲ ▼ hiện ra ở mỗi công thức. Chưa chạy thì trang vẫn chạy bình
-- thường, chỉ là không có mũi tên.
--
-- An toàn: chỉ THÊM một cột, không đụng tới 236 công thức đang có.
-- ============================================================================

alter table public.formulas
  add column if not exists thu_tu integer;

-- Đánh số ban đầu theo đúng thứ tự đang hiện (ngày tạo), riêng từng chương.
-- Nhờ vậy sau khi chạy, danh sách trông y như trước — chỉ khác là sắp lại được.
with danh_so as (
  select id,
         row_number() over (partition by category_id order by created_at) as so
  from public.formulas
)
update public.formulas f
set thu_tu = d.so
from danh_so d
where f.id = d.id
  and f.thu_tu is null;

-- Tra cứu nhanh theo chương + thứ tự
create index if not exists formulas_chuong_thutu_idx
  on public.formulas (category_id, thu_tu);
