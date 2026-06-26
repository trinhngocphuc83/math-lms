import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(request: Request) {
  try {
    // Khởi tạo Supabase Admin Client với quyền tối cao (Bypass RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Giả sử có role validation ở đây, nhưng tạm thời pass

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    if (id.toString().startsWith('unsubmitted-')) return NextResponse.json({ success: true, message: 'Bỏ qua bài chưa nộp' });

    // 1. Lấy thông tin record để tìm ảnh
    const { data: resultData, error: fetchError } = await supabaseAdmin
      .from('exam_results')
      .select('answers')
      .eq('id', id)
      .single();

    if (fetchError && fetchError.code !== '42P01') {
      console.error('Error fetching result:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // 2. Xóa ảnh trên Storage nếu có
    if (resultData && resultData.answers && Array.isArray(resultData.answers.globalImages)) {
      const urls: string[] = resultData.answers.globalImages;
      const filePaths = urls.map(url => {
        // Tách đường dẫn sau chữ lesson_submissions/
        const match = url.split('lesson_submissions/');
        return match.length > 1 ? match[1] : null;
      }).filter(Boolean) as string[];

      if (filePaths.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage
          .from('lesson_submissions')
          .remove(filePaths);
          
        if (storageError) {
          console.error("Lỗi xóa file storage:", storageError);
          // Vẫn tiếp tục xóa Record dù xóa file lỗi
        }
      }
    }

    // 3. Xóa Record trong Database bằng QUYỀN TỐI CAO
    const { data: deletedData, error: deleteError } = await supabaseAdmin
      .from('exam_results')
      .delete()
      .eq('id', id)
      .select(); // Bắt buộc trả về các dòng đã bị xoá để xác nhận

    if (deleteError) {
      console.error('Lỗi xóa Record:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    
    if (!deletedData || deletedData.length === 0) {
        console.error('Không tìm thấy Record để xóa hoặc ID bị sai (ID:', id, ')');
        return NextResponse.json({ error: 'Không tìm thấy dữ liệu để xóa (ID không hợp lệ)' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
