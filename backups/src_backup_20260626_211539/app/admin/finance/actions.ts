"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getFinanceStats(month: number, year: number) {
  // Get all tuition fees for the month
  const { data: fees, error: feeErr } = await supabaseAdmin
    .from('tuition_fees')
    .select('paid_amount')
    .eq('month', month)
    .eq('year', year);
    
  if (feeErr) return { success: false, error: feeErr.message };

  const totalRevenue = fees ? fees.reduce((sum, f) => sum + (f.paid_amount || 0), 0) : 0;

  // Get all expenses for the month
  const { data: expenses, error: expErr } = await supabaseAdmin
    .from('expenses')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .order('expense_date', { ascending: false });
    
  if (expErr) return { success: false, error: expErr.message };

  const totalExpense = expenses ? expenses.reduce((sum, e) => sum + (e.amount || 0), 0) : 0;
  
  return {
    success: true,
    totalRevenue,
    totalExpense,
    netProfit: totalRevenue - totalExpense,
    expenses
  };
}

export async function addExpense(title: string, amount: number, date: string, category: string, month: number, year: number) {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .insert({
      title,
      amount,
      expense_date: date,
      category,
      month,
      year
    });
    
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteExpense(expenseId: string) {
  const { error } = await supabaseAdmin.from('expenses').delete().eq('id', expenseId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
