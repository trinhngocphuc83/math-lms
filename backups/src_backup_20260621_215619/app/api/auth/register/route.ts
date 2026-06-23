import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      student_name,
      school,
      class_name,
      student_phone,
      parent_name,
      parent_phone,
      username,
      password,
      course_id
    } = body;

    // Validate các trường bắt buộc
    if (!student_name?.trim()) {
      return NextResponse.json({ error: 'Họ tên học sinh là bắt buộc' }, { status: 400 });
    }
    if (!parent_name?.trim()) {
      return NextResponse.json({ error: 'Họ tên phụ huynh là bắt buộc' }, { status: 400 });
    }
    if (!parent_phone?.trim()) {
      return NextResponse.json({ error: 'Số điện thoại phụ huynh là bắt buộc' }, { status: 400 });
    }
    if (!username?.trim() || !password) {
      return NextResponse.json({ error: 'Thiếu tài khoản hoặc mật khẩu' }, { status: 400 });
    }

    // Khởi tạo Supabase Admin Client (Service Role Key)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ==========================================
    // 1. TẠO TÀI KHOẢN HỌC SINH
    // ==========================================
    const studentEmail = `${username.trim()}@edu.local`;
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        full_name: student_name.trim(),
        username: username.trim(),
      }
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Tên tài khoản này đã tồn tại trong hệ thống. Vui lòng chọn tên tài khoản khác!' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Lỗi tạo tài khoản xác thực: ' + authError.message }, { status: 500 });
    }

    const studentUserId = authData.user.id;

    // Lưu hồ sơ học sinh vào bảng profiles
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: studentUserId,
      role: 'student',
      full_name: student_name.trim(),
      school: school?.trim() || null,
      class_name: class_name?.trim() || null,
      student_phone: student_phone?.trim() || null,
      parent_name: parent_name.trim(),
      parent_phone: parent_phone.trim(),
      username: username.trim(),
      is_active: false // Cần admin kích hoạt
    });

    if (profileError) {
      console.error('Profile Error (Student):', profileError);
      await supabaseAdmin.auth.admin.deleteUser(studentUserId);
      return NextResponse.json({ error: 'Lỗi lưu thông tin hồ sơ học sinh' }, { status: 500 });
    }

    // Nếu có chọn khóa học → tạo yêu cầu đăng ký khóa học
    if (course_id) {
      const { error: courseReqErr } = await supabaseAdmin.from('student_course_requests').insert({
        student_id: studentUserId,
        course_id: course_id,
        status: 'pending'
      });
      if (courseReqErr) console.error('Course Request Error:', courseReqErr);
    }

    // ==========================================
    // 2. TẠO TÀI KHOẢN PHỤ HUYNH (tự động)
    // ==========================================
    const parentPhoneClean = parent_phone.trim().replace(/\s/g, '');
    const parentEmail = `ph_${parentPhoneClean}@edu.local`;
    const parentDefaultPassword = '123456';

    // Kiểm tra xem tài khoản PH đã tồn tại chưa (tránh trùng lặp)
    const { data: existingParent } = await supabaseAdmin.auth.admin.listUsers();
    const parentExists = existingParent?.users?.find(u => u.email === parentEmail);

    if (!parentExists) {
      // Tạo tài khoản mới cho phụ huynh
      const { data: parentAuthData, error: parentAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: parentEmail,
        password: parentDefaultPassword,
        email_confirm: true,
        user_metadata: {
          role: 'parent',
          full_name: parent_name.trim(),
          username: parentPhoneClean,
        }
      });

      if (!parentAuthError && parentAuthData?.user) {
        // Lưu hồ sơ phụ huynh
        const { error: parentProfileErr } = await supabaseAdmin.from('profiles').insert({
          id: parentAuthData.user.id,
          role: 'parent',
          full_name: parent_name.trim(),
          parent_phone: parentPhoneClean,
          username: parentPhoneClean,
          is_active: false // Cũng cần kích hoạt
        });
        if (parentProfileErr) {
          console.error('Profile Error (Parent):', parentProfileErr);
        }
      } else {
        console.error('Auth Error (Parent):', parentAuthError?.message);
        // Không rollback tài khoản HS — PH có thể tạo sau
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Đăng ký thành công! Tài khoản học sinh và phụ huynh đã được tạo. Vui lòng chờ Giáo viên / Quản trị viên kích hoạt.' 
    });

  } catch (error: any) {
    console.error('Registration API Error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
