import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/utils/auth/guard';

export async function POST(request: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const { userId, isActive } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu ID người dùng' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch the student profile to check for parent info
    const { data: student, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !student) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin học sinh' }, { status: 404 });
    }

    let parentId = student.parent_id;
    let activatedAt = student.activated_at;
    let expirationDate = student.expiration_date;

    // Logic when activating the student
    if (isActive) {
      activatedAt = new Date().toISOString();
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      expirationDate = oneYearLater.toISOString();

      // Không tự tạo tài khoản phụ huynh nữa (mật khẩu mặc định gây mất an toàn).
      // Chỉ liên kết nếu tài khoản phụ huynh đã tồn tại sẵn từ trước.
      if (student.parent_phone && !parentId) {
        const parentPhoneStr = student.parent_phone.trim().replace(/\s+/g, '');

        const { data: existingParent } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('role', 'parent')
          .eq('username', parentPhoneStr)
          .single();

        if (existingParent) {
          parentId = existingParent.id;
        }
      }
    } else {
       // If deactivating, we might not clear expiration, but let's keep it simple.
    }

    // Update the student profile
    const updatePayload: any = { 
      is_active: isActive,
      parent_id: parentId
    };

    if (isActive) {
      updatePayload.activated_at = activatedAt;
      updatePayload.expiration_date = expirationDate;
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (updateError) {
      console.error('Update Profile Error:', updateError);
      return NextResponse.json({ error: 'Lỗi khi cập nhật trạng thái học sinh' }, { status: 500 });
    }

    // Automatically approve pending course requests if activated
    if (isActive) {
      await supabaseAdmin
        .from('student_course_requests')
        .update({ status: 'approved' })
        .eq('student_id', userId)
        .eq('status', 'pending');
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Toggle Active Error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
