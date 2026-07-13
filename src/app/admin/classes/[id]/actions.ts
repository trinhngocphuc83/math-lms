"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getEnrollments(classId: string) {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(`
      id, status, enrolled_at,
      profiles (id, full_name, username, student_phone, parent_name, parent_phone, school, enrollment_date)
    `)
    .eq('class_id', classId)
    .order('enrolled_at', { ascending: false });
    
  if (error) {
    console.error("Lỗi lấy danh sách học sinh:", error);
    return [];
  }
  return data;
}

export async function addEnrollment(classId: string, studentId: string) {
  const { data: clsData } = await supabaseAdmin.from('classes').select('course_id').eq('id', classId).single();
  
  const { error } = await supabaseAdmin.from('enrollments').insert({
    class_id: classId,
    student_id: studentId,
    status: 'ACTIVE'
  });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // Tự động thêm vào khóa học nếu lớp có gán khóa học
  if (clsData?.course_id) {
    const { data: existingReq } = await supabaseAdmin.from('student_course_requests')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', clsData.course_id);
      
    if (!existingReq || existingReq.length === 0) {
      await supabaseAdmin.from('student_course_requests').insert({
        student_id: studentId,
        course_id: clsData.course_id,
        status: 'approved'
      });
    }
  }
  
  return { success: true };
}

export async function removeEnrollment(enrollmentId: string) {
  const { error } = await supabaseAdmin.from('enrollments').delete().eq('id', enrollmentId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function getEnrollmentCounts() {
  const { data, error } = await supabaseAdmin.from('enrollments').select('class_id');
  if (error) {
    console.error("Lỗi lấy sĩ số:", error);
    return [];
  }
  return data;
}

export async function updateStudentProfile(profileId: string, updates: any) {
  const { error } = await supabaseAdmin.from('profiles').update(updates).eq('id', profileId);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function searchStudents(searchTerm: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, username, student_phone')
    .eq('role', 'student')
    .or(`full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,student_phone.ilike.%${searchTerm}%`)
    .limit(20);

  if (error) {
    console.error("Search error:", error);
    return { success: false, data: [] };
  }
  return { success: true, data };
}

export async function createAndEnrollNewStudent(classId: string, studentData: any) {
  try {
    const { full_name, username, password, student_phone, parent_name, parent_phone, school, class_name } = studentData;

    // 1. Kiểm tra username tồn tại
    const { data: existProfile } = await supabaseAdmin.from('profiles').select('id').eq('username', username);
    if (existProfile && existProfile.length > 0) {
      return { success: false, error: 'Tài khoản (Username) đã tồn tại. Vui lòng chọn tài khoản khác.' };
    }

    // 2. Tạo Auth User
    const dummyEmail = `${username}@edu.local`;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: dummyEmail,
      password: password || '123456',
      email_confirm: true,
      user_metadata: {
        role: 'student',
        full_name: full_name,
        username: username,
      }
    });

    if (authError) return { success: false, error: 'Lỗi khi tạo user: ' + authError.message };
    const userId = authData.user.id;

    // 3. Tạo Profile Học Sinh
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      role: 'student',
      full_name,
      username,
      student_phone: student_phone || null,
      parent_name: parent_name || null,
      parent_phone: parent_phone || null,
      school: school || null,
      class_name: class_name || null,
      is_active: true
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { success: false, error: 'Lỗi tạo hồ sơ học sinh: ' + profileError.message };
    }

    // 4. Enroll vào lớp
    const { error: enrollErr } = await supabaseAdmin.from('enrollments').insert({
      student_id: userId,
      class_id: classId,
      status: 'ACTIVE'
    });
    if (enrollErr) return { success: false, error: 'Lỗi khi đưa vào lớp: ' + enrollErr.message };

    // 5. Gán vào Khóa học nếu có
    const { data: clsData } = await supabaseAdmin.from('classes').select('course_id').eq('id', classId).single();
    if (clsData?.course_id) {
      await supabaseAdmin.from('student_course_requests').insert({
        student_id: userId,
        course_id: clsData.course_id,
        status: 'approved'
      });
    }

    // 6. Tạo tài khoản Phụ huynh nếu có SĐT
    if (parent_phone) {
      const phoneClean = parent_phone.toString().trim().replace(/\s/g, '');
      if (phoneClean) {
        const { data: existParent } = await supabaseAdmin.from('profiles').select('id').eq('username', phoneClean);
        if (!existParent || existParent.length === 0) {
          const parentEmail = `ph_${phoneClean}@edu.local`;
          const { data: parentAuth, error: parentAuthErr } = await supabaseAdmin.auth.admin.createUser({
            email: parentEmail,
            password: '123456',
            email_confirm: true,
            user_metadata: {
              role: 'parent',
              full_name: parent_name || `PH của ${full_name}`,
              username: phoneClean,
            }
          });

          if (!parentAuthErr && parentAuth?.user) {
            await supabaseAdmin.from('profiles').insert({
              id: parentAuth.user.id,
              role: 'parent',
              full_name: parent_name || `PH của ${full_name}`,
              parent_phone: phoneClean,
              username: phoneClean,
              is_active: true
            });
          }
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
