"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createTeacher(data: { email: string, password?: string, full_name: string, permissions: string[] }) {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Create the user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password || '12345678',
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        role: 'teacher',
        permissions: data.permissions
      }
    });

    if (authError) {
      throw new Error(`Auth Error: ${authError.message}`);
    }

    const userId = authData.user.id;

    // 2. Insert into profiles table
    // Some supabase configurations auto-insert into profiles via triggers, but just to be safe we can upsert
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: data.full_name,
        role: 'teacher'
      });

    if (profileError) {
      // It might error if trigger already inserted it, which is fine, we can ignore or handle it
      console.warn("Profile upsert warning:", profileError.message);
    }

    revalidatePath("/admin/teachers");
    return { success: true };
  } catch (error: any) {
    console.error("Create teacher error:", error);
    return { success: false, error: error.message };
  }
}

export async function getTeachers() {
  try {
    const supabaseAdmin = createAdminClient();
    
    // Get all users
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }

    // Filter teachers
    const teachers = data.users.filter(user => user.user_metadata?.role === 'teacher').map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || 'Không rõ',
      created_at: user.created_at,
      permissions: user.user_metadata?.permissions || []
    }));

    return { success: true, teachers };
  } catch (error: any) {
    console.error("Get teachers error:", error);
    return { success: false, error: error.message, teachers: [] };
  }
}

export async function updateTeacherPermissions(userId: string, permissions: string[]) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { permissions }
    });

    if (error) throw error;
    
    revalidatePath("/admin/teachers");
    return { success: true };
  } catch (error: any) {
    console.error("Update permissions error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteTeacher(userId: string) {
  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    
    // Also delete from profiles if no cascade
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    revalidatePath("/admin/teachers");
    return { success: true };
  } catch (error: any) {
    console.error("Delete teacher error:", error);
    return { success: false, error: error.message };
  }
}
