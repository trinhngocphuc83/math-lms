-- Chạy đoạn mã này trong mục SQL Editor của Supabase
-- Bảng này dùng để lưu kết quả các lần làm bài tập Luyện tập của học sinh

CREATE TABLE IF NOT EXISTS public.exam_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    module_id UUID, -- Lưu id của phần luyện tập
    score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    passed BOOLEAN NOT NULL DEFAULT false,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    cheat_warnings INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Thêm index để truy vấn nhanh hơn
CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON public.exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_lesson_id ON public.exam_results(lesson_id);

-- Cấp quyền (RLS)
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- Học sinh có thể xem và tự lưu kết quả của mình
CREATE POLICY "Học sinh xem kết quả của mình" ON public.exam_results
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Học sinh có thể lưu điểm của mình" ON public.exam_results
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Admin và Giáo viên có quyền xem tất cả
CREATE POLICY "Admin xem tất cả kết quả" ON public.exam_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'teacher')
        )
    );
