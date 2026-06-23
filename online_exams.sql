-- ==============================================================================
-- CƠ SỞ DỮ LIỆU TÍNH NĂNG KIỂM TRA ONLINE (ONLINE EXAMS)
-- ==============================================================================

-- 1. Bảng lưu trữ thông tin Kỳ thi (Online Exams)
CREATE TABLE IF NOT EXISTS public.online_exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    exam_data JSONB NOT NULL, -- Lưu trữ snapshot đề thi (danh sách câu hỏi, điểm)
    duration_minutes INTEGER NOT NULL, -- Thời gian làm bài (phút)
    start_time TIMESTAMP WITH TIME ZONE, -- Thời gian bắt đầu mở đề (nếu null là mở vô thời hạn)
    end_time TIMESTAMP WITH TIME ZONE, -- Thời gian đóng đề
    password VARCHAR(100), -- Mật khẩu đề thi (nếu có)
    shuffle_questions BOOLEAN DEFAULT false, -- Trộn thứ tự câu hỏi
    shuffle_options BOOLEAN DEFAULT false, -- Trộn thứ tự đáp án
    show_results VARCHAR(50) DEFAULT 'LATER', -- 'IMMEDIATELY' (xem điểm ngay), 'LATER' (chờ công bố)
    max_cheat_warnings INTEGER DEFAULT 3, -- Số lần rời tab tối đa trước khi thu bài
    status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'PUBLISHED', 'CLOSED'
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Bảng phân phối đề thi cho các Lớp (Classes)
CREATE TABLE IF NOT EXISTS public.online_exam_classes (
    exam_id UUID REFERENCES public.online_exams(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (exam_id, class_id)
);

-- 3. Bảng lưu trạng thái và kết quả bài thi của Học sinh
CREATE TABLE IF NOT EXISTS public.online_exam_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id UUID REFERENCES public.online_exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    submit_time TIMESTAMP WITH TIME ZONE,
    answers JSONB DEFAULT '{}'::jsonb, -- Lưu câu trả lời của học sinh
    score NUMERIC(5, 2), -- Tổng điểm đạt được
    cheat_warnings INTEGER DEFAULT 0, -- Số lần cảnh báo gian lận thực tế
    status VARCHAR(50) DEFAULT 'IN_PROGRESS', -- 'IN_PROGRESS', 'SUBMITTED', 'GRADED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- INDEX & RLS POLICIES
-- ==============================================================================

-- Bật RLS
ALTER TABLE public.online_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_exam_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_exam_submissions ENABLE ROW LEVEL SECURITY;

-- Policy cho online_exams
-- Admin/Giáo viên có thể xem, thêm sửa xóa tất cả
CREATE POLICY "Admin/Teacher có toàn quyền trên online_exams" ON public.online_exams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'teacher')
        )
    );

-- Học sinh chỉ được xem các bài thi được giao cho lớp của mình và trạng thái là PUBLISHED
CREATE POLICY "Học sinh xem kỳ thi của lớp mình" ON public.online_exams
    FOR SELECT USING (
        status = 'PUBLISHED' AND
        EXISTS (
            SELECT 1 FROM public.online_exam_classes oec
            JOIN public.enrollments e ON oec.class_id = e.class_id
            WHERE oec.exam_id = online_exams.id AND e.student_id = auth.uid()
        )
    );

-- Policy cho online_exam_classes
CREATE POLICY "Admin/Teacher có toàn quyền trên exam_classes" ON public.online_exam_classes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'teacher')
        )
    );
CREATE POLICY "Học sinh có thể xem lớp của kỳ thi" ON public.online_exam_classes
    FOR SELECT USING (true); -- Mọi người đều có thể đọc để match thông tin

-- Policy cho online_exam_submissions
CREATE POLICY "Admin/Teacher xem tất cả bài nộp" ON public.online_exam_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'teacher')
        )
    );
CREATE POLICY "Admin/Teacher cập nhật bài nộp" ON public.online_exam_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'teacher')
        )
    );

-- Học sinh chỉ xem bài của chính mình
CREATE POLICY "Học sinh xem bài của mình" ON public.online_exam_submissions
    FOR SELECT USING (auth.uid() = student_id);

-- Học sinh tự tạo bài thi (khi bắt đầu làm)
CREATE POLICY "Học sinh bắt đầu làm bài" ON public.online_exam_submissions
    FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Học sinh tự cập nhật bài thi của mình (nộp bài, lưu kết quả tạm)
CREATE POLICY "Học sinh cập nhật bài của mình" ON public.online_exam_submissions
    FOR UPDATE USING (auth.uid() = student_id);
