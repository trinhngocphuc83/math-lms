import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
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

      // Check if we need to create a parent account
      if (student.parent_phone && !parentId) {
        const parentPhoneStr = student.parent_phone.trim().replace(/\s+/g, '');
        
        // 1. Check if a parent profile with this phone already exists (as username)
        const { data: existingParent } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('role', 'parent')
          .eq('username', parentPhoneStr)
          .single();

        if (existingParent) {
          parentId = existingParent.id;
        } else {
          // 2. Create new parent auth user
          const parentDummyEmail = `${parentPhoneStr}@edu.local`;
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: parentDummyEmail,
            password: '123456', // Mật khẩu mặc định
            email_confirm: true,
            user_metadata: {
              role: 'parent',
              full_name: student.parent_name || 'Phụ huynh của ' + student.full_name,
              username: parentPhoneStr,
            }
          });

          if (authError && !authError.message.includes('already registered')) {
            console.error('Lỗi tạo tài khoản phụ huynh:', authError);
          } else if (authData?.user) {
            parentId = authData.user.id;
            // 3. Create parent profile
            await supabaseAdmin.from('profiles').insert({
              id: parentId,
              role: 'parent',
              full_name: student.parent_name || 'Phụ huynh của ' + student.full_name,
              username: parentPhoneStr,
              student_phone: parentPhoneStr,
              is_active: true, // Parent account is active immediately
              activated_at: activatedAt,
              expiration_date: expirationDate
            });
          }
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
