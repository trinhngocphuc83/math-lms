-- Bổ sung cột answers để lưu trữ bài làm (kết quả chấm và hình ảnh)
ALTER TABLE public.exam_results
ADD COLUMN IF NOT EXISTS answers JSONB;

-- Bổ sung cột is_reviewed để đánh dấu trạng thái giáo viên đã chấm lại
ALTER TABLE public.exam_results
ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT false;
