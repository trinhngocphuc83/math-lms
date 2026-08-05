import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export type Role = 'admin' | 'teacher' | 'student' | 'parent';

export interface AuthedUser {
  id: string;
  role: Role;
}

export type GuardResult =
  | { ok: true; user: AuthedUser }
  | { ok: false; response: NextResponse };

/**
 * Lấy người dùng từ cookie phiên đăng nhập rồi đối chiếu role trong bảng profiles.
 * Luôn ưu tiên role trong DB, không tin role nằm trong user_metadata (client có thể tác động).
 */
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const supabaseAdmin = createAdminClient();
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile?.role) return null;

  return { id: user.id, role: profile.role as Role };
}

/**
 * Chặn request nếu người dùng chưa đăng nhập hoặc không thuộc nhóm quyền cho phép.
 *
 * Cách dùng trong route handler:
 *   const guard = await requireStaff();
 *   if (!guard.ok) return guard.response;
 */
export async function requireRole(allowed: Role[]): Promise<GuardResult> {
  const user = await getAuthedUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },
        { status: 401 }
      ),
    };
  }

  if (!allowed.includes(user.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Tài khoản của bạn không có quyền thực hiện thao tác này.' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user };
}

/** Chỉ Quản trị viên (quản lý người dùng, cấu hình hệ thống). */
export const requireAdmin = () => requireRole(['admin']);

/** Quản trị viên hoặc Giáo viên (nghiệp vụ giảng dạy: đề thi, chấm bài, lớp học). */
export const requireStaff = () => requireRole(['admin', 'teacher']);

/** Bất kỳ tài khoản nào đã đăng nhập. */
export const requireUser = () => requireRole(['admin', 'teacher', 'student', 'parent']);

/**
 * Bản dùng cho Server Action ("use server"): ném lỗi thay vì trả về NextResponse,
 * vì Server Action không trả về HTTP response như route handler.
 */
export async function assertRole(allowed: Role[]): Promise<AuthedUser> {
  const user = await getAuthedUser();

  if (!user) {
    throw new Error('Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  if (!allowed.includes(user.role)) {
    throw new Error('Tài khoản của bạn không có quyền thực hiện thao tác này.');
  }

  return user;
}

/** Server Action: chỉ Quản trị viên. */
export const assertAdmin = () => assertRole(['admin']);

/** Server Action: Quản trị viên hoặc Giáo viên. */
export const assertStaff = () => assertRole(['admin', 'teacher']);
