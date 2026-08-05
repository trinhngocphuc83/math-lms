import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/utils/auth/guard';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const guard = await requireUser();
    if (!guard.ok) return guard.response;

    // Học sinh / Phụ huynh chỉ được xem khóa học của chính mình.
    // Chỉ Quản trị viên và Giáo viên mới được tra cứu theo userId khác.
    const { searchParams } = new URL(request.url);
    const requestedId = searchParams.get('userId');
    const isStaff = guard.user.role === 'admin' || guard.user.role === 'teacher';
    const userId = isStaff && requestedId ? requestedId : guard.user.id;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Bỏ qua RLS để lấy an toàn
    const { data, error } = await supabaseAdmin
      .from('student_course_requests')
      .select('course_id')
      .eq('student_id', userId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data && data.length > 0) {
      return NextResponse.json({ course_id: data[0].course_id });
    }

    return NextResponse.json({ course_id: null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
