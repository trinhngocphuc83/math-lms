-- ============================================================================
-- CHẠY TRÊN SUPABASE CỦA CẢ HAI APP (Toán và Lý - mỗi app một CSDL riêng)
-- Vào Supabase > dự án > SQL Editor > dán toàn bộ > Run
-- Chạy lại nhiều lần cũng không sao.
-- ============================================================================

-- Yêu cầu cần đạt của từng Dạng, để dựng cột cùng tên trong BẢN ĐẶC TẢ ĐỀ KIỂM TRA
-- (mẫu số 2 của Phụ lục kèm Công văn 7991/BGDĐT-GDTrH ngày 17/12/2024).
--
-- Mỗi dạng chỉ phải soạn MỘT LẦN rồi dùng cho mọi đề về sau. Dạng nào còn để trống
-- thì bản đặc tả tạm lấy chính tên dạng, nên in được ngay mà không phải soạn đủ hết.
alter table question_categories
  add column if not exists yeu_cau_can_dat text;

comment on column question_categories.yeu_cau_can_dat is
  'Yêu cầu cần đạt của dạng này, in ở cột cùng tên trong Bản đặc tả đề kiểm tra (CV 7991).';
