import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const { data, error } = await supabaseAdmin
      .from('online_exams')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Xóa id và created_at khỏi body nếu có để tránh lỗi update
    delete body.id;
    delete body.created_at;

    const { data, error } = await supabaseAdmin
      .from("online_exams")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Lỗi update exam:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Lỗi server:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
