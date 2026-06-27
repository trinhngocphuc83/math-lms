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
