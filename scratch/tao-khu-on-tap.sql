-- ============================================================================
-- KHU ÔN TẬP & KIỂM TRA
--
-- Chạy MỘT LẦN cho mỗi dự án Supabase (app Toán và app Lý chạy riêng).
-- Chạy lại lần nữa cũng không sao: mọi câu đều đã chống chạy trùng.
--
-- Không tạo bảng mới. Đề ôn tập vẫn là lesson_modules kiểu 'practice' - đúng thứ mà
-- trình soạn đề, màn làm bài của học sinh, màn chữa bài và bảng điểm đã biết cách xử lý.
-- Chỉ thêm một cột để đánh dấu nhánh nào thuộc khu Ôn tập:
--
--   courses                      -> Khối
--   chapters (loai = 'on-tap')   -> hộp chứa của khối đó
--   lessons                      -> Hình thức kiểm tra (Giữa kì I, Cuối kì I, ...)
--   lesson_modules ('practice')  -> từng ĐỀ
-- ============================================================================

-- 1. Cột đánh dấu ------------------------------------------------------------
alter table chapters
  add column if not exists loai text not null default 'bai-hoc';

comment on column chapters.loai is
  'bai-hoc = chương bài giảng bình thường; on-tap = hộp chứa của khu Ôn tập & Kiểm tra';

create index if not exists chapters_loai_idx on chapters (loai);


-- 2. Đưa các chương kiểm tra sẵn có vào khu Ôn tập ---------------------------
-- Thầy cô đã tự xoay xở bằng cách thêm một chương ở cuối mỗi khoá, tên mỗi nơi một kiểu:
-- "BÀI KIỂM TRA", "ÔN TẬP KIỂM TRA", "ĐỀ ÔN TẬP KIỂM TRA", "ĐỀ KIỂM TRA".
-- Gom hết về một tên chuẩn và đánh dấu là khu ôn tập. ĐỀ BÊN TRONG KHÔNG BỊ ĐỘNG TỚI.
update chapters
   set loai  = 'on-tap',
       title = 'Ôn tập & Kiểm tra'
 where loai <> 'on-tap'
   and (upper(title) like '%KIỂM TRA%' or upper(title) like '%KIEM TRA%');


-- 3. Đổi tên bài con về đúng hình thức kiểm tra chuẩn -------------------------
-- Đang là "GKI", "ÔN TẬP GKI", "GIỮA KÌ I"... Xếp kì II lên trước để "GKII" không bị
-- câu "GKI" bắt mất.
update lessons
   set title = case
     when upper(title) like '%GKII%'
       or upper(title) like '%GIỮA KÌ II%' or upper(title) like '%GIỮA KỲ II%' then 'Giữa kì II'
     when upper(title) like '%CKII%'
       or upper(title) like '%CUỐI KÌ II%' or upper(title) like '%CUỐI KỲ II%' then 'Cuối kì II'
     when upper(title) like '%GKI%'
       or upper(title) like '%GIỮA KÌ I%'  or upper(title) like '%GIỮA KỲ I%'  then 'Giữa kì I'
     when upper(title) like '%CKI%'
       or upper(title) like '%CUỐI KÌ I%'  or upper(title) like '%CUỐI KỲ I%'  then 'Cuối kì I'
     when upper(title) like '%CUỐI CHƯƠNG%' or upper(title) like '%CUOI CHUONG%' then 'Cuối chương'
     else title
   end
 where chapter_id in (select id from chapters where loai = 'on-tap');


-- 4. Soát lại ---------------------------------------------------------------
-- Chạy xong nên thấy: mỗi khoá có đề kiểm tra sẽ hiện một dòng, cột "so_de" đúng bằng
-- số đề đang có, và cột "hinh_thuc" đã mang tên chuẩn.
select c.title  as khoi,
       l.title  as hinh_thuc,
       count(m.id) filter (where m.type = 'practice') as so_de
  from chapters ch
  join courses  c on c.id  = ch.course_id
  left join lessons l on l.chapter_id = ch.id
  left join lesson_modules m on m.lesson_id = l.id
 where ch.loai = 'on-tap'
 group by c.title, l.title
 order by c.title, l.title;
