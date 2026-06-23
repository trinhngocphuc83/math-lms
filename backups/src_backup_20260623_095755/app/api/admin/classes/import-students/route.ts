import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const classId = formData.get('classId') as string;

    if (!file || !classId) {
      return NextResponse.json({ error: 'Thiếu file hoặc classId' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Lấy thông tin khóa học của lớp
    const { data: clsData } = await supabaseAdmin.from('classes').select('course_id').eq('id', classId).single();
    const courseId = clsData?.course_id;

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

    const createdParentPhones = new Set<string>();

    for (const [index, row] of data.entries()) {
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

      // Check if student already exists
      const { data: existingProfiles } = await supabaseAdmin.from('profiles').select('id').eq('username', username);
      
      let userId = null;

      if (existingProfiles && existingProfiles.length > 0) {
        // User already exists
        userId = existingProfiles[0].id;
      } else {
        // Create new user
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

        userId = authData.user.id;

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
      }

      // Enroll into class
      if (userId && classId) {
        // Check if already enrolled
        const { data: checkEnroll } = await supabaseAdmin.from('enrollments')
          .select('id').eq('student_id', userId).eq('class_id', classId);
        
        if (!checkEnroll || checkEnroll.length === 0) {
          const { error: enrollErr } = await supabaseAdmin.from('enrollments').insert({
            student_id: userId,
            class_id: classId,
            status: 'ACTIVE'
          });
          if (enrollErr) {
            results.failed++;
            results.errors.push(`Dòng ${index + 2} (${username}): Lỗi khi thêm vào lớp`);
            continue;
          }
        }
        
        // Tự động gán quyền truy cập khóa học nếu lớp có khóa học
        if (courseId) {
          const { data: existingCourseReq } = await supabaseAdmin.from('student_course_requests')
            .select('id').eq('student_id', userId).eq('course_id', courseId);
          
          if (!existingCourseReq || existingCourseReq.length === 0) {
            await supabaseAdmin.from('student_course_requests').insert({
              student_id: userId,
              course_id: courseId,
              status: 'approved'
            });
          }
        }
      }

      results.success++;

      // Create Parent if doesn't exist
      if (parentPhone) {
        const phoneClean = parentPhone.toString().trim().replace(/\s/g, '');
        if (phoneClean && !createdParentPhones.has(phoneClean)) {
          const { data: existParent } = await supabaseAdmin.from('profiles').select('id').eq('username', phoneClean);
          
          if (!existParent || existParent.length === 0) {
            const parentEmail = `ph_${phoneClean}@edu.local`;
            const { data: parentAuth, error: parentAuthErr } = await supabaseAdmin.auth.admin.createUser({
              email: parentEmail,
              password: '123456',
              email_confirm: true,
              user_metadata: {
                role: 'parent',
                full_name: parentName || `PH của ${studentName}`,
                username: phoneClean,
              }
            });

            if (!parentAuthErr && parentAuth?.user) {
              await supabaseAdmin.from('profiles').insert({
                id: parentAuth.user.id,
                role: 'parent',
                full_name: parentName || `PH của ${studentName}`,
                parent_phone: phoneClean,
                username: phoneClean,
                is_active: true
              });
              createdParentPhones.add(phoneClean);
              results.parentCreated++;
            } else if (parentAuthErr?.message?.includes('already registered')) {
              createdParentPhones.add(phoneClean);
            }
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Hoàn tất',
      results
    });
  } catch (error: any) {
    console.error('Import classes error:', error);
    return NextResponse.json(
      { error: 'Đã có lỗi xảy ra khi xử lý file', details: error.message },
      { status: 500 }
    );
  }
}
