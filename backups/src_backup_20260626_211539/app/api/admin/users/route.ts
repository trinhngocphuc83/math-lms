import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      full_name, 
      username, 
      password, 
      school, 
      class_name, 
      student_phone, 
      parent_name, 
      parent_phone, 
      course_id,
      is_active
    } = body;

    if (!full_name || !username || !password) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc (Họ tên, Tài khoản, Mật khẩu)' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Kiểm tra username đã tồn tại trong profiles chưa
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: `Tài khoản ${username} đã tồn tại trong hệ thống!` }, { status: 400 });
    }

    // 2. Tạo Auth User bằng email giả
    const dummyEmail = `${username}@edu.local`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: dummyEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        full_name: full_name,
        username: username,
      }
    });

    if (authError || !authData.user) {
        if (authError?.message?.includes('already registered')) {
            return NextResponse.json({ error: `Tài khoản hoặc Email giả định (${dummyEmail}) đã tồn tại trong Auth.` }, { status: 400 });
        }
      return NextResponse.json({ error: 'Lỗi tạo tài khoản Auth: ' + (authError?.message || 'Không xác định') }, { status: 500 });
    }

    const userId = authData.user.id;

    // 3. Tạo Profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        role: 'student',
        full_name: full_name,
        username: username,
        school: school || null,
        class_name: class_name || null,
        student_phone: student_phone || null,
        parent_name: parent_name || null,
        parent_phone: parent_phone || null,
        is_active: is_active !== undefined ? is_active : true,
      });

    if (profileError) {
      // Rollback auth
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Lỗi lưu thông tin hồ sơ: ' + profileError.message }, { status: 500 });
    }

    // 4. Nếu có chọn khóa học, gán vào luôn
    if (course_id) {
      await supabaseAdmin
        .from('student_course_requests')
        .insert({
          student_id: userId,
          course_id: course_id,
          status: 'approved'
        });
    }

    // 5. Tự động tạo tài khoản Phụ huynh nếu có SĐT
    if (parent_phone) {
        const phoneClean = parent_phone.toString().trim().replace(/\s/g, '');
        if (phoneClean) {
            const parentEmail = `ph_${phoneClean}@edu.local`;
            const parentPw = '123456';

            const { data: parentAuth, error: parentAuthErr } = await supabaseAdmin.auth.admin.createUser({
                email: parentEmail,
                password: parentPw,
                email_confirm: true,
                user_metadata: {
                    role: 'parent',
                    full_name: parent_name || `PH của ${full_name}`,
                    username: phoneClean,
                }
            });

            if (!parentAuthErr && parentAuth?.user) {
                const { error: parentProfileErr } = await supabaseAdmin.from('profiles').insert({
                    id: parentAuth.user.id,
                    role: 'parent',
                    full_name: parent_name || `PH của ${full_name}`,
                    parent_phone: phoneClean,
                    username: phoneClean,
                    is_active: true
                });
                if (parentProfileErr) console.error('Profile Error (Parent):', parentProfileErr);
            }
        }
    }

    return NextResponse.json({ success: true, user_id: userId });

  } catch (error: any) {
    return NextResponse.json({ error: 'Lỗi máy chủ: ' + error.message }, { status: 500 });
  }
}
