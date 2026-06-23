import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Sử dụng Service Role Key để bypass RLS, giải quyết triệt để lỗi INSERT policy do thiếu quyền read profiles ở Browser.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { data, error } = await supabaseAdmin
      .from("online_exams")
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error("Lỗi insert exam bằng admin key:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Lỗi server:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('online_exams')
      .select(`
        id, title, duration_minutes, start_time, end_time, status, created_at,
        exam_group_name, variant_name, assigned_classes
      `)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { error } = await supabaseAdmin.from('online_exams').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
