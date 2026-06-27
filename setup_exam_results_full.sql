-- Chạy đoạn mã này trong mục SQL Editor của Supabase
-- Bảng này dùng để lưu kết quả các lần làm bài tập Luyện tập của học sinh, bao gồm cả điểm, lịch sử chấm AI và ảnh nộp

CREATE TABLE IF NOT EXISTS public.exam_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    module_id UUID,
    score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    passed BOOLEAN NOT NULL DEFAULT false,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    cheat_warnings INTEGER NOT NULL DEFAULT 0,
    answers JSONB, -- Chứa đường link ảnh bài làm và chi tiết điểm từng câu
    is_reviewed BOOLEAN DEFAULT false, -- Đánh dấu giáo viên đã chấm lại chưa
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Cập nhật thêm 2 cột mới trong trường hợp bảng đã tồn tại từ trước nhưng thiếu cột
ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS answers JSONB;
ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT false;

-- Thêm index để truy vấn nhanh hơn
CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON public.exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_lesson_id ON public.exam_results(lesson_id);

-- Cấp quyền (RLS) cho Bảng
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- Xóa các policy cũ nếu có để tránh lỗi "already exists"
DROP POLICY IF EXISTS "Học sinh xem kết quả của mình" ON public.exam_results;
DROP POLICY IF EXISTS "Học sinh có thể lưu điểm của mình" ON public.exam_results;
DROP POLICY IF EXISTS "Admin xem tất cả kết quả" ON public.exam_results;

-- Tạo lại các Policy
CREATE POLICY "Học sinh xem kết quả của mình" ON public.exam_results
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Học sinh có thể lưu điểm của mình" ON public.exam_results
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admin xem tất cả kết quả" ON public.exam_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'teacher')
        )
    );

--------------------------------------------------------------
-- CẤU HÌNH SUPABASE STORAGE CHO ẢNH BÀI LÀM TỰ LUẬN
--------------------------------------------------------------
-- Tự động tạo Thùng chứa (Bucket) nếu chưa có
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lesson_submissions', 'lesson_submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Bật RLS cho Storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Xóa các policy cũ của storage nếu có
DROP POLICY IF EXISTS "Cho phép học sinh nộp ảnh" ON storage.objects;
DROP POLICY IF EXISTS "Cho phép xem ảnh" ON storage.objects;
DROP POLICY IF EXISTS "Cho phép admin xoá ảnh" ON storage.objects;

-- Tạo lại các policy Storage
CREATE POLICY "Cho phép học sinh nộp ảnh"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lesson_submissions');

CREATE POLICY "Cho phép xem ảnh"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lesson_submissions');

CREATE POLICY "Cho phép admin xoá ảnh"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lesson_submissions' AND (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR role = 'teacher')));
