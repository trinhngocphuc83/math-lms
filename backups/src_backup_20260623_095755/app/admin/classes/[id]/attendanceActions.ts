"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getSessions(classId: string) {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('class_id', classId)
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false });
    
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function createSession(classId: string, title: string, sessionDate: string) {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .insert({ class_id: classId, title, session_date: sessionDate })
    .select()
    .single();
    
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function deleteSession(sessionId: string) {
  const { error } = await supabaseAdmin
    .from('sessions')
    .delete()
    .eq('id', sessionId);
    
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getAttendance(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from('attendance')
    .select('*')
    .eq('session_id', sessionId);
    
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function saveBulkAttendance(sessionId: string, updates: any[]) {
  // updates is an array of { student_id, status, note }
  // We can upsert
  const payload = updates.map(u => ({
    session_id: sessionId,
    student_id: u.student_id,
    status: u.status,
    note: u.note || null
  }));
  
  const { error } = await supabaseAdmin
    .from('attendance')
    .upsert(payload, { onConflict: 'session_id, student_id' });
    
  if (error) return { success: false, error: error.message };
  return { success: true };
}
