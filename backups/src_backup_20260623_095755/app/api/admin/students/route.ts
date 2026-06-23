import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    // Lấy tất cả học sinh (role = 'student' hoặc role khác 'admin')
    const { data: students, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role, class_name')
      .neq('role', 'admin') // Chỉ lấy những user không phải admin
      .order('full_name', { ascending: true });

    if (error) throw error;

    return NextResponse.json(students);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const body = await req.json();
    const { studentId, className } = body;

    if (!studentId) return NextResponse.json({ error: "Thiếu ID học sinh" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ class_name: className || null })
      .eq('id', studentId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Cập nhật lớp thành công" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
