-- Cấu trúc Cơ sở dữ liệu cho Hệ thống LMS Toán học (EduCenter)
-- Dành cho PostgreSQL (Supabase)

-- 1. Bảng Profiles (Liên kết với bảng users có sẵn của Supabase Auth)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  full_name TEXT,
  avatar_url TEXT,
  school TEXT,
  class_name TEXT,
  student_phone TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  username TEXT UNIQUE,
  is_active BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,
  expiration_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kích hoạt RLS (Row Level Security) cho bảo mật
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to profiles" ON public.profiles FOR ALL USING (true);

-- Bảng lưu yêu cầu đăng ký khóa học của học sinh (để chờ duyệt)
CREATE TABLE public.student_course_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.student_course_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to requests" ON public.student_course_requests FOR ALL USING (true);

-- 2. Bảng Categories (Phân loại Khóa học)
CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

-- 2.5. Bảng Courses (Khóa học / Khối lớp)
CREATE TABLE public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id),
  title TEXT NOT NULL,
  grade_level INTEGER NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng User Progress (Tiến độ học tập)
CREATE TABLE public.user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);


-- 3. Bảng Lessons (Bài giảng chứa công thức Toán học)
CREATE TABLE public.lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_jsonb JSONB NOT NULL, -- Lưu trữ cấu trúc JSON chứa văn bản xen kẽ LaTeX
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật RLS (Row Level Security) - Cho phép ai cũng có thể ĐỌC bài giảng
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to courses" ON public.courses FOR ALL USING (true);
CREATE POLICY "Allow public access to lessons" ON public.lessons FOR ALL USING (true);

-- Bật quyền thêm sửa xóa cho Categories để Test
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to categories" ON public.categories FOR ALL USING (true);

-- 5. Bảng Lớp học (Classes)
CREATE TABLE public.classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  grade_level_category_id UUID REFERENCES public.categories(id),
  course_id UUID REFERENCES public.courses(id),
  teacher_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'active',
  max_students INTEGER DEFAULT 30, -- Sĩ số tối đa
  tuition_fee NUMERIC DEFAULT 0, -- Học phí (VND)
  start_date DATE, -- Ngày khai giảng dự kiến
  schedule TEXT, -- Lịch học, Thời gian học
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to classes" ON public.classes FOR ALL USING (true);

-- 6. Bảng Phân lớp Học sinh (Class Students)
CREATE TABLE public.class_students (
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(class_id, student_id)
);

-- Chèn dữ liệu mẫu (Căn bậc hai Lớp 9)
INSERT INTO public.courses (title, grade_level) VALUES ('Toán 9 Tập 1', 9);
-- (Dữ liệu bài giảng lessons sẽ được chèn bằng mã nguồn phần mềm sau khi tích hợp quản trị)

-- 7. Bảng Chương (Chapters)
CREATE TABLE public.chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to chapters" ON public.chapters FOR ALL USING (true);

-- Cập nhật bảng Lessons để kết nối với Chapters và lưu nội dung Markdown
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS content_markdown TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- 8. Bảng Các Mục trong Bài học (Lesson Modules)
CREATE TABLE public.lesson_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('theory', 'exercise_types', 'practice', 'document', 'solution_video')),
  title TEXT NOT NULL,
  content_markdown TEXT,
  video_url TEXT,
  attachment_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lesson_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to lesson modules" ON public.lesson_modules FOR ALL USING (true);
