import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Sử dụng service_role key để bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { formulas } = await req.json();

    if (!Array.isArray(formulas) || formulas.length === 0) {
      return NextResponse.json({ error: "Danh sách công thức trống!" }, { status: 400 });
    }

    // Chuẩn hóa dữ liệu trước khi insert
    const cleanFormulas = formulas.map((f: any) => ({
      category_id: f.category_id,
      title: f.title || "Chưa có tên",
      latex_content: f.latex_content || "",
      description: f.description || "",
      image_url: f.image_url || null,
    }));

    const { data, error } = await supabaseAdmin
      .from("formulas")
      .insert(cleanFormulas)
      .select();

    if (error) {
      console.error("Lỗi lưu công thức (server):", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data?.length || 0 });
  } catch (err: any) {
    console.error("Lỗi server /api/formulas/save:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
