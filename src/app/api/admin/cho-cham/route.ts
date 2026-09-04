import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireStaff } from "@/utils/auth/guard";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Mọi bài thi online đang CHỜ THẦY CÔ CHẤM, gom từ mọi đề, mọi lớp.
 *
 * Trước đây muốn biết em nào cần chấm thì phải vào từng đề rồi dò từng em - đề nhiều thì
 * bỏ sót là chuyện đương nhiên. Nay bài có câu tự luận dừng ở "SUBMITTED" khi nộp, nên
 * chỉ việc lọc đúng trạng thái đó.
 *
 * Đếm số câu còn thiếu điểm ngay tại đây chứ không để giao diện tự đếm: giao diện phải
 * tải cả exam_data của từng đề mới đếm được, mà đề nào cũng nặng.
 */
export async function GET() {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return guard.response;

    const { data: nop, error } = await supabaseAdmin
      .from("online_exam_submissions")
      .select("id, exam_id, student_id, score, status, answers, created_at, submit_time")
      .eq("status", "SUBMITTED")
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw error;
    if (!nop || nop.length === 0) return NextResponse.json({ ds: [] });

    const idDe = Array.from(new Set(nop.map((r) => r.exam_id).filter(Boolean)));
    const idHs = Array.from(new Set(nop.map((r) => r.student_id).filter(Boolean)));

    const [{ data: de }, { data: hs }] = await Promise.all([
      supabaseAdmin.from("online_exams").select("id, title, exam_data").in("id", idDe),
      supabaseAdmin.from("profiles").select("id, full_name, class_name").in("id", idHs),
    ]);

    const tenDe = new Map((de || []).map((d) => [d.id, d.title || "Đề thi"]));
    /* Chỉ số các câu tự luận của từng đề - tính một lần cho mỗi đề, không tính lại mỗi bài. */
    const cauTuLuanCua = new Map<string, number[]>(
      (de || []).map((d) => {
        const ds = Array.isArray(d.exam_data) ? d.exam_data : [];
        return [d.id, ds.map((q: any, i: number) => ((q?.type || "multiple_choice") === "essay" ? i : -1))
          .filter((i: number) => i >= 0)];
      }),
    );
    const tenHs = new Map((hs || []).map((h) => [h.id, h]));

    const ds = nop
      .map((r) => {
        const tl = cauTuLuanCua.get(r.exam_id) || [];
        if (tl.length === 0) return null;   // không có tự luận thì không phải việc của hàng chờ
        const daCham = (r.answers as any)?.gradedScores || {};
        const conThieu = tl.filter((i) => daCham[i] === undefined || daCham[i] === null).length;
        const p: any = tenHs.get(r.student_id) || {};
        return {
          exam_id: r.exam_id,
          student_id: r.student_id,
          tenDe: tenDe.get(r.exam_id) || "Đề thi",
          tenHs: p.full_name || "Học sinh",
          lop: p.class_name || "",
          diemMayCham: (r.answers as any)?._diemMayCham ?? r.score ?? null,
          soCauTuLuan: tl.length,
          conThieu,
          nopLuc: r.submit_time || r.created_at,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ ds });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
