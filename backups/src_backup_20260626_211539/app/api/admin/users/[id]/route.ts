import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Khởi tạo Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// XÓA TÀI KHOẢN
export async function DELETE(request: Request, context: any) {
  try {
    // Next.js 15 compatibility: params might be a Promise, or we can just extract from URL
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();
    if (!userId) {
      return NextResponse.json({ error: 'Thiếu ID người dùng' }, { status: 400 });
    }

    // Xóa luôn các requests (nếu chưa có CASCADE)
    const { error: reqErr } = await supabaseAdmin.from('student_course_requests').delete().eq('student_id', userId);
    if (reqErr) console.error('Lỗi xóa requests:', reqErr);

    // Xóa khỏi bảng profiles
    const { error: profErr } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
    if (profErr) {
      console.error('Lỗi xóa profile:', profErr);
      return NextResponse.json({ error: 'Lỗi CSDL: ' + profErr.message }, { status: 500 });
    }

    // Xóa user khỏi Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      return NextResponse.json({ error: 'Lỗi xóa tài khoản xác thực: ' + authError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Đã xóa tài khoản thành công.' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}

// CHỈNH SỬA TÀI KHOẢN
export async function PUT(request: Request, context: any) {
  try {
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();
    if (!userId) {
      return NextResponse.json({ error: 'Thiếu ID người dùng' }, { status: 400 });
    }

    const body = await request.json();
    const {
      full_name,
      school,
      class_name,
      student_phone,
      parent_name,
      parent_phone,
      course_id,
      password // password nếu có gửi lên thì đổi
    } = body;

    // 1. Cập nhật bảng profiles
    const { error: profileError } = await supabaseAdmin.from('profiles').update({
      full_name: full_name?.trim(),
      school: school?.trim() || null,
      class_name: class_name?.trim() || null,
      student_phone: student_phone?.trim() || null,
      parent_name: parent_name?.trim() || null,
      parent_phone: parent_phone?.trim() || null,
    }).eq('id', userId);

    if (profileError) {
      return NextResponse.json({ error: 'Lỗi cập nhật hồ sơ: ' + profileError.message }, { status: 500 });
    }

    // 2. Cập nhật Khóa học (Course) qua bảng student_course_requests
    if (course_id) {
      // Xóa các liên kết cũ
      await supabaseAdmin.from('student_course_requests').delete().eq('student_id', userId);
      // Thêm liên kết mới
      await supabaseAdmin.from('student_course_requests').insert({
        student_id: userId,
        course_id: course_id,
        status: 'approved'
      });
    }

    // 2. Cập nhật mật khẩu nếu có
    if (password && password.trim() !== '') {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password.trim()
      });
      if (authError) {
        return NextResponse.json({ error: 'Cập nhật thông tin thành công, nhưng lỗi đổi mật khẩu: ' + authError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'Đã cập nhật tài khoản thành công.' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
