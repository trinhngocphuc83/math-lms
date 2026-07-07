"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getTuitionFees(classId: string, month: number, year: number) {
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
  // 1. Get all students enrolled in the class (or from current month's tuition)
  const { data: currentMonthFees, error: fetchError } = await supabaseAdmin
    .from('tuition_fees')
    .select('student_id, base_fee, discount, old_debt, paid_amount')
    .eq('class_id', classId)
    .eq('month', fromMonth)
    .eq('year', fromYear);
    
  if (fetchError) return { success: false, error: fetchError.message };
  
  if (!currentMonthFees || currentMonthFees.length === 0) {
    return { success: false, error: 'Không có dữ liệu thu phí của tháng này để chốt sổ.' };
  }

  // 2. Loop through and upsert next month's record
  for (const fee of currentMonthFees) {
    const totalDue = (fee.base_fee || 0) + (fee.old_debt || 0) - (fee.discount || 0);
    const remainingDebt = totalDue - (fee.paid_amount || 0);
    
    // Always roll over to preserve base_fee!
    await updateTuitionFee(classId, fee.student_id, toMonth, toYear, {
      base_fee: fee.base_fee, // Kế thừa Học phí cơ bản (custom tuition)
      old_debt: remainingDebt > 0 ? remainingDebt : 0
    });
  }
  
  return { success: true };
}
