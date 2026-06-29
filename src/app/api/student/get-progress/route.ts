import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const moduleId = searchParams.get('moduleId');

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 });
    }

    // Lấy bản nháp (attempt_number = 0)
    let query = supabase
      .from('exam_results')
      .select('answers, cheat_warnings')
      .eq('student_id', user.id)
      .eq('lesson_id', lessonId)
      .eq('attempt_number', 0)
      .limit(1);
      
    if (moduleId) {
      query = query.eq('module_id', moduleId);
    } else {
      query = query.is('module_id', null);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ data: null });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data && data.length > 0) {
      return NextResponse.json({ data: data[0] });
    }

    return NextResponse.json({ data: null });
  } catch (error: any) {
    console.error('Get progress error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
