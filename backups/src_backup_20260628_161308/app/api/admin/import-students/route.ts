import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const courseId = formData.get('courseId') as string;

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file' }, { status: 400 });
    }

    // Khởi tạo Supabase Admin Client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Đọc file Excel
    const arrayBuffer = await file.arrayBuffer();
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);

    const results = {
      success: 0,
      failed: 0,
      parentCreated: 0,
      errors: [] as string[]
    };

    // Theo dõi danh sách PH đã tạo trong lần import này (tránh trùng lặp)
    const createdParentPhones = new Set<string>();

    for (const [index, row] of data.entries()) {
      // Mapping cột Excel → trường DB
      const studentName = row['Họ tên'] || row['Họ và tên'] || row['Họ tên HS'] || row['Ho ten HS'];
      const school = row['Trường'] || row['Truong'] || row['Trường đang học'];
      const className = row['Lớp'] || row['Lop'] || row['Lớp đang học'];
      const studentPhone = row['SĐT HS'] || row['SDT HS'] || row['SĐT Học sinh'];
      const parentName = row['Họ tên PH'] || row['Ho ten PH'] || row['Họ tên phụ huynh'];
      const parentPhone = row['SĐT PH'] || row['SDT PH'] || row['SĐT Phụ huynh'];
      const username = row['Tài khoản'] || row['Username'] || row['Tai khoan'];
      const password = (row['Mật khẩu'] || row['Password'] || row['Mat khau'] || '123456').toString();

      if (!studentName || !username) {
        results.failed++;
        results.errors.push(`Dòng ${index + 2}: Thiếu Họ tên hoặc Tài khoản`);
        continue;
      }

      // ========================================
      // TẠO TÀI KHOẢN HỌC SINH
      // ========================================
      const dummyEmail = `${username}@edu.local`;
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: dummyEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          role: 'student',
          full_name: studentName,
          username: username,
        }
      });

      if (authError) {
        results.failed++;
        results.errors.push(`Dòng ${index + 2} (${username}): ${authError.message}`);
        continue;
      }

      const userId = authData.user.id;

      // Lưu hồ sơ HS (is_active = true vì Admin tạo)
      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: userId,
        role: 'student',
        full_name: studentName,
        school: school?.toString() || null,
        class_name: className?.toString() || null,
        student_phone: studentPhone?.toString() || null,
        parent_name: parentName || null,
        parent_phone: parentPhone?.toString() || null,
        username: username,
        is_active: true 
      });

      if (profileError) {
        results.failed++;
        results.errors.push(`Dòng ${index + 2} (${username}): Lỗi lưu hồ sơ`);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        continue;
      }

      // Gán khóa học nếu có
      if (courseId) {
        const { error: courseReqErr } = await supabaseAdmin.from('student_course_requests').insert({
          student_id: userId,
          course_id: courseId,
          status: 'approved'
        });
        if (courseReqErr) console.error('Course Request Error:', courseReqErr);
      }

      results.success++;

      // ========================================
      // TẠO TÀI KHOẢN PHỤ HUYNH (tự động)
      // ========================================
      if (parentPhone) {
        const phoneClean = parentPhone.toString().trim().replace(/\s/g, '');
        
        // Chỉ tạo nếu chưa tạo trong lần import này
        if (phoneClean && !createdParentPhones.has(phoneClean)) {
          const parentEmail = `ph_${phoneClean}@edu.local`;
          const parentPw = '123456';

          const { data: parentAuth, error: parentAuthErr } = await supabaseAdmin.auth.admin.createUser({
            email: parentEmail,
            password: parentPw,
            email_confirm: true,
            user_metadata: {
              role: 'parent',
              full_name: parentName || `PH của ${studentName}`,
              username: phoneClean,
            }
          });

          if (!parentAuthErr && parentAuth?.user) {
            const { error: parentProfileErr } = await supabaseAdmin.from('profiles').insert({
              id: parentAuth.user.id,
              role: 'parent',
              full_name: parentName || `PH của ${studentName}`,
              parent_phone: phoneClean,
              username: phoneClean,
              is_active: true
            });
            if (parentProfileErr) console.error('Profile Error (Parent):', parentProfileErr);

            createdParentPhones.add(phoneClean);
            results.parentCreated++;
          } else if (parentAuthErr?.message?.includes('already registered')) {
            // PH đã có tài khoản → bỏ qua, không báo lỗi
            createdParentPhones.add(phoneClean);
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Import hoàn tất. HS: ${results.success} thành công, ${results.failed} thất bại. PH: ${results.parentCreated} tài khoản mới.`,
      results 
    });

  } catch (error: any) {
    console.error('Import API Error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống khi import: ' + error.message }, { status: 500 });
  }
}
