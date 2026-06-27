import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, moduleId, score, passed, cheatWarnings = 0, globalImages = [], gradingDetails = [] } = body;

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 });
    }

    // Lấy số lần thi (attempt) hiện tại của học sinh cho bài này
    const { data: attempts, error: fetchError } = await supabase
      .from('exam_results')
      .select('attempt_number')
      .eq('student_id', user.id)
      .eq('lesson_id', lessonId)
      .eq('module_id', moduleId || null)
      .order('attempt_number', { ascending: false })
      .limit(1);

    if (fetchError && fetchError.code !== '42P01') { // Bỏ qua lỗi table not found tạm thời nếu admin chưa chạy SQL
      console.error('Error fetching attempts:', fetchError);
    }

    

// ...
    // Xử lý ảnh cho từng câu tự luận trong gradingDetails
    if (gradingDetails && gradingDetails.length > 0) {
      for (let j = 0; j < gradingDetails.length; j++) {
        const questionDetail = gradingDetails[j];
        if (questionDetail.images && questionDetail.images.length > 0) {
          const uploadedUrls: string[] = [];
          for (let i = 0; i < questionDetail.images.length; i++) {
            const base64Str = questionDetail.images[i];
            
            // Nếu đã là link public (do làm bài lại giữ nguyên ảnh cũ) thì ko cần up
            if (base64Str.startsWith('http')) {
              uploadedUrls.push(base64Str);
              continue;
            }
            
            try {
              const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              const filename = `${user.id}/${lessonId}_${Date.now()}_q${questionDetail.qIndex}_img${i}.jpg`;
              
              const { error: uploadError } = await supabaseAdmin.storage
                .from('lesson_submissions')
                .upload(filename, buffer, { contentType: 'image/jpeg', upsert: true });
                
              if (!uploadError) {
                const { data } = supabaseAdmin.storage.from('lesson_submissions').getPublicUrl(filename);
                uploadedUrls.push(data.publicUrl);
              } else {
                console.error(`Lỗi upload ảnh câu ${questionDetail.qIndex}:`, uploadError);
                uploadedUrls.push(base64Str);
              }
            } catch (err) {
              console.error(`Lỗi xử lý base64 ảnh câu ${questionDetail.qIndex}:`, err);
            }
          }
          questionDetail.images = uploadedUrls;
        }
      }
    }

    const answersData = {
      globalImages: [], // Bỏ globalImages, chỉ dùng ảnh trong gradingDetails
      gradingDetails: gradingDetails
    };

    const nextAttempt = (attempts && attempts.length > 0) ? attempts[0].attempt_number + 1 : 1;

    // Lưu kết quả mới
    const { data, error } = await supabase
      .from('exam_results')
      .insert([
        {
          student_id: user.id,
          lesson_id: lessonId,
          module_id: moduleId || null,
          score: score,
          passed: passed,
          attempt_number: nextAttempt,
          cheat_warnings: cheatWarnings,
          answers: answersData
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error saving exam result:', error);
      // Nếu lỗi do chưa có bảng (42P01), trả về OK giả định để UI không lỗi, nhưng báo cho dev biết
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, warning: 'Table exam_results does not exist yet.' });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Save score error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
