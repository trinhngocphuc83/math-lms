-- ==============================================================================
-- MODULE: ĐIỂM DANH VÀ HỌC PHÍ (TÀI CHÍNH)
-- Vui lòng copy và chạy toàn bộ lệnh này trong mục SQL Editor của Supabase
-- ==============================================================================

-- 1. Bảng Buổi học (sessions)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    session_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Bảng Điểm danh (attendance)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('PRESENT', 'EXCUSED_ABSENCE', 'UNEXCUSED_ABSENCE', 'LATE')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(session_id, student_id)
);

-- 3. Bảng Học phí (tuition_fees)
CREATE TABLE IF NOT EXISTS public.tuition_fees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    base_fee INTEGER DEFAULT 0,
    old_debt INTEGER DEFAULT 0,
    discount INTEGER DEFAULT 0,
    paid_amount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PARTIAL', 'PAID')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(class_id, student_id, month, year)
);

-- 4. Bảng Chi phí (expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    amount INTEGER NOT NULL,
    expense_date DATE NOT NULL,
    category TEXT DEFAULT 'OTHER',
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Bật Row Level Security (RLS)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tuition_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Policies cho Admin (quản lý tất cả)
CREATE POLICY "Admin có thể quản lý sessions" ON public.sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admin có thể quản lý attendance" ON public.attendance FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admin có thể quản lý tuition_fees" ON public.tuition_fees FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admin có thể quản lý expenses" ON public.expenses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Policies cho Học sinh
CREATE POLICY "Người dùng xem sessions của lớp mình" ON public.sessions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE enrollments.class_id = sessions.class_id AND enrollments.student_id = auth.uid()
  )
);
CREATE POLICY "Người dùng xem attendance của mình" ON public.attendance FOR SELECT USING (
  student_id = auth.uid()
);
CREATE POLICY "Người dùng xem học phí của mình" ON public.tuition_fees FOR SELECT USING (
  student_id = auth.uid()
);
