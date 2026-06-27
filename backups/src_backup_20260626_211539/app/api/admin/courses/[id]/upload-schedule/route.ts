import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET_NAME = 'system-assets';

export async function POST(req: Request, context: any) {
  try {
    // Trong Next.js 15+, params có thể là Promise. 
    // Để an toàn 100%, ta cắt trực tiếp từ đường dẫn URL.
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    // Đường dẫn: /api/admin/courses/[id]/upload-schedule -> ID nằm ở vị trí áp chót
    const courseId = pathSegments[pathSegments.length - 2];

    if (!courseId || courseId === 'undefined') {
      return NextResponse.json({ error: 'Thiếu ID khóa học' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false }
    });

    // 1. Kiểm tra bucket tồn tại chưa, chưa thì tạo (Public)
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;

    const bucketExists = buckets.find(b => b.name === BUCKET_NAME);
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      });
      if (createError) throw createError;
    }

    // Tên file đặc trưng cho từng khóa học
    const FILE_NAME = `schedule_course_${courseId}.png`;

    // 2. Chuyển đổi File sang Buffer để upload server-side
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Upload file (Ghi đè - upsert)
    const { data, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(FILE_NAME, buffer, {
        contentType: file.type,
        cacheControl: '0', // Tắt cache để update ảnh là thấy ngay
        upsert: true
      });

    if (uploadError) throw uploadError;

    // 4. Lấy public URL
    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(FILE_NAME);

    // Thêm query timestamp để chống cache ở client
    const timestampedUrl = `${publicUrl}?t=${Date.now()}`;

    return NextResponse.json({ success: true, url: timestampedUrl });

  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
