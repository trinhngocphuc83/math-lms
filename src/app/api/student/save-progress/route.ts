import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, moduleId, answers, cheatWarnings = 0 } = body;

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 });
    }

    // Kiểm tra xem đã có bản nháp nào chưa (attempt_number = 0)
    let query = supabase
      .from('exam_results')
      .select('id')
      .eq('student_id', user.id)
      .eq('lesson_id', lessonId)
      .eq('attempt_number', 0);
      
    if (moduleId) {
      query = query.eq('module_id', moduleId);
    } else {
      query = query.is('module_id', null);
    }

    const { data: existingDrafts, error: fetchError } = await query;

    if (fetchError && fetchError.code !== '42P01') {
      console.error('Error fetching draft:', fetchError);
    }

    const answersData = {
      globalImages: [], 
      gradingDetails: [], 
      rawAnswers: answers 
    };

    if (existingDrafts && existingDrafts.length > 0) {
      // Cập nhật bản nháp cũ
      const draftId = existingDrafts[0].id;
      const { error: updateError } = await supabase
        .from('exam_results')
        .update({
          answers: answersData,
          cheat_warnings: cheatWarnings
        })
        .eq('id', draftId);
        
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      // Tạo bản nháp mới
      const { error: insertError } = await supabase
        .from('exam_results')
        .insert([
          {
            student_id: user.id,
            lesson_id: lessonId,
            module_id: moduleId || null,
            score: 0, // database requires non-null
            passed: false,
            attempt_number: 0, // Quy ước: 0 là bản nháp
            cheat_warnings: cheatWarnings,
            answers: answersData
          }
        ]);
        
      if (insertError) {
        if (insertError.code === '42P01') {
          return NextResponse.json({ success: true, warning: 'Table exam_results does not exist yet.' });
        }
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save progress error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
