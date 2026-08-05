"use server";

import { createClient } from '@supabase/supabase-js';
import { assertStaff } from '@/utils/auth/guard';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getTuitionFees(classId: string, month: number, year: number) {
  await assertStaff();
  const { data, error } = await supabaseAdmin
    .from('tuition_fees')
    .select('*')
    .eq('class_id', classId)
    .eq('month', month)
    .eq('year', year);
    
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function updateTuitionFee(
  classId: string, 
  studentId: string, 
  month: number, 
  year: number, 
  updates: any
) {
  await assertStaff();
  // First, check if record exists
  const { data: existing } = await supabaseAdmin
    .from('tuition_fees')
    .select('id')
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .eq('month', month)
    .eq('year', year)
    .single();

  if (existing) {
    const { error } = await supabaseAdmin
      .from('tuition_fees')
      .update(updates)
      .eq('id', existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const payload = {
      class_id: classId,
      student_id: studentId,
      month,
      year,
      ...updates
    };
    const { error } = await supabaseAdmin
      .from('tuition_fees')
      .insert(payload);
    if (error) return { success: false, error: error.message };
  }
  
  return { success: true };
}

// Chốt sổ tháng: Lấy phần còn nợ của tháng này chuyển sang nợ cũ của tháng sau
export async function rolloverDebt(classId: string, fromMonth: number, fromYear: number, toMonth: number, toYear: number) {
  await assertStaff();
  // 1. Get class tuition fee
  const { data: cls } = await supabaseAdmin.from('classes').select('tuition_fee').eq('id', classId).single();
  const defaultFee = cls?.tuition_fee || 0;

  // 2. Get all active enrollments with their enrollment date
  const { data: enrollments } = await supabaseAdmin
    .from('enrollments')
    .select('student_id, enrolled_at')
    .eq('class_id', classId)
    .eq('status', 'ACTIVE');

  if (!enrollments) return { success: false, error: 'Không tìm thấy học sinh nào trong lớp.' };

  // 3. Get current month's tuition fees
  const { data: currentMonthFees, error: fetchError } = await supabaseAdmin
    .from('tuition_fees')
    .select('student_id, base_fee, discount, old_debt, paid_amount')
    .eq('class_id', classId)
    .eq('month', fromMonth)
    .eq('year', fromYear);
    
  if (fetchError) return { success: false, error: fetchError.message };
  
  const currentFeesMap = new Map();
  currentMonthFees?.forEach(f => currentFeesMap.set(f.student_id, f));

  // 4. Loop through ALL active enrollments
  for (const en of enrollments) {
    const fee = currentFeesMap.get(en.student_id);
    let totalDue = 0;
    let paid = 0;
    let baseFeeToPreserve = defaultFee;

    if (fee) {
      const studentBaseFee = (fee.base_fee !== null && fee.base_fee !== undefined) ? fee.base_fee : defaultFee;
      totalDue = studentBaseFee + (fee.old_debt || 0) - (fee.discount || 0);
      paid = fee.paid_amount || 0;
      baseFeeToPreserve = studentBaseFee;
    } else {
      // Check if student was enrolled strictly AFTER fromMonth
      let shouldChargeDefault = true;
      const enrollDateStr = en.enrolled_at;
      
      if (enrollDateStr) {
        const enrollDate = new Date(enrollDateStr);
        const enrollM = enrollDate.getMonth() + 1;
        const enrollY = enrollDate.getFullYear();
        if (enrollY > fromYear || (enrollY === fromYear && enrollM > fromMonth)) {
          shouldChargeDefault = false; // Enrolled in future month, no debt for fromMonth
        }
      }

      if (shouldChargeDefault) {
        // Chưa có record tức là chưa nộp đồng nào và không có discount
        totalDue = defaultFee;
        paid = 0;
      } else {
        totalDue = 0;
        paid = 0;
      }
      baseFeeToPreserve = defaultFee;
    }

    const remainingDebt = totalDue - paid;
    
    // Always roll over to next month
    await updateTuitionFee(classId, en.student_id, toMonth, toYear, {
      base_fee: baseFeeToPreserve,
      old_debt: remainingDebt > 0 ? remainingDebt : 0
    });
  }
  
  return { success: true };
}
