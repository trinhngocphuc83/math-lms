import { NextResponse } from 'next/server';
import { requireStaff } from '@/utils/auth/guard';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Ma trận mẫu: khuôn dùng lại, VD "Giữa kỳ I - Toán 12".
 *
 * Trước đây ma trận chỉ nằm trong bộ nhớ trang, đóng tab là mất, nên mỗi lần ra đề
 * lại phải tick từ đầu dù cấu trúc năm nào cũng gần như nhau.
 *
 * Dùng khoá máy chủ vì bảng bật bảo vệ dòng, nhưng mọi truy vấn đều ràng buộc
 * nguoi_tao = người đang đăng nhập, nên không ai đọc được mẫu của người khác.
 */

const NHAC_TAO_BANG =
  'Chưa tạo bảng ma_tran_mau trong cơ sở dữ liệu. Hãy chạy tệp scratch/tao-bang-de-thi.sql trên Supabase.';

/** Lấy id người đang đăng nhập, đã qua kiểm tra quyền Giáo viên/Quản trị. */
async function layNguoiDung() {
  const guard = await requireStaff();
  if (!guard.ok) return { loi: guard.response };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { loi: NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 }) };
  return { user };
}

/** GET [?grade=&subject=] - liệt kê ma trận mẫu của chính mình. */
export async function GET(request: Request) {
  try {
    const { user, loi } = await layNguoiDung();
    if (loi) return loi;

    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');
    const subject = searchParams.get('subject');

    const db = createAdminClient();
    let q = db.from('ma_tran_mau')
      .select('id, ten, loai_de, grade, subject, khuon_de, du_lieu, so_cau, tong_diem, updated_at')
      .eq('nguoi_tao', user!.id)
      .order('updated_at', { ascending: false });

    if (grade) q = q.eq('grade', grade);
    if (subject) q = q.eq('subject', subject);

    const { data, error } = await q;
    if (error) {
      // Bảng chưa tạo thì coi như chưa có mẫu nào, để trang vẫn dùng được bình thường
      if (/does not exist|schema cache/i.test(error.message)) {
        return NextResponse.json({ chuaTaoBang: true, danhSach: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ chuaTaoBang: false, danhSach: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}

/** POST { ten, loaiDe, grade, subject, khuonDe, duLieu, soCau, tongDiem } - lưu mẫu, cùng tên thì ghi đè. */
export async function POST(request: Request) {
  try {
    const { user, loi } = await layNguoiDung();
    if (loi) return loi;

    const { ten, loaiDe, grade, subject, khuonDe, duLieu, soCau, tongDiem } = await request.json();
    if (!ten || !duLieu) {
      return NextResponse.json({ error: 'Thiếu tên mẫu hoặc nội dung ma trận.' }, { status: 400 });
    }

    const db = createAdminClient();
    const dong = {
      nguoi_tao: user!.id,
      ten: String(ten).trim(),
      loai_de: loaiDe || null,
      grade: grade || null,
      subject: subject || null,
      khuon_de: khuonDe || null,
      du_lieu: duLieu,
      so_cau: Number(soCau) || 0,
      tong_diem: Number(tongDiem) || 0,
      updated_at: new Date().toISOString(),
    };

    // Cùng một người thì tên mẫu không trùng nhau: lưu lại cùng tên là ghi đè
    const { data: cu } = await db.from('ma_tran_mau').select('id')
      .eq('nguoi_tao', user!.id).eq('ten', dong.ten);

    if (cu && cu.length > 0) {
      const { data, error } = await db.from('ma_tran_mau')
        .update(dong).eq('id', cu[0].id).eq('nguoi_tao', user!.id).select('id, updated_at');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      // Có .select() để BIẾT CHẮC đã ghi được - không có nó thì thất bại im lặng
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Không ghi được ma trận mẫu.' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, id: data[0].id, ghiDe: true, luuLuc: data[0].updated_at });
    }

    const { data, error } = await db.from('ma_tran_mau').insert(dong).select('id, updated_at');
    if (error) {
      if (/does not exist|schema cache/i.test(error.message)) {
        return NextResponse.json({ error: NHAC_TAO_BANG }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Không tạo được ma trận mẫu.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data[0].id, ghiDe: false, luuLuc: data[0].updated_at });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}

/** DELETE ?id=... - xoá một ma trận mẫu của chính mình. */
export async function DELETE(request: Request) {
  try {
    const { user, loi } = await layNguoiDung();
    if (loi) return loi;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu mã ma trận mẫu.' }, { status: 400 });

    const db = createAdminClient();
    const { data, error } = await db.from('ma_tran_mau')
      .delete().eq('id', id).eq('nguoi_tao', user!.id).select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy mẫu này (hoặc không phải mẫu của bạn).' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}
