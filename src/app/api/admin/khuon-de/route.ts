import { NextResponse } from 'next/server';
import { requireStaff } from '@/utils/auth/guard';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Khuôn đề tuỳ chỉnh: ngoài 5 khuôn dựng sẵn (3-2-2-3, 4-6, 7-3, 100% TN, 100% TL),
 * thầy cô tự dựng một cơ cấu số câu/điểm khác rồi lưu lại để chọn nhanh những lần sau.
 *
 * Dùng khoá máy chủ vì bảng bật bảo vệ dòng, nhưng mọi truy vấn đều ràng buộc
 * nguoi_tao = người đang đăng nhập, nên không ai đọc được khuôn của người khác.
 */

const NHAC_TAO_BANG =
  'Chưa tạo bảng khuon_de_tuy_chinh trong cơ sở dữ liệu. Hãy chạy tệp scratch/them-bang-khuon-de.sql trên Supabase.';

/** Lấy id người đang đăng nhập, đã qua kiểm tra quyền Giáo viên/Quản trị. */
async function layNguoiDung() {
  const guard = await requireStaff();
  if (!guard.ok) return { loi: guard.response };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { loi: NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 }) };
  return { user };
}

/** GET - liệt kê khuôn đề tuỳ chỉnh của chính mình. */
export async function GET() {
  try {
    const { user, loi } = await layNguoiDung();
    if (loi) return loi;

    const db = createAdminClient();
    const { data, error } = await db.from('khuon_de_tuy_chinh')
      .select('id, ten, mo_ta, chi_tieu, so_cau, tong_diem, updated_at')
      .eq('nguoi_tao', user!.id)
      .order('updated_at', { ascending: false });

    if (error) {
      // Bảng chưa tạo thì coi như chưa có khuôn nào, để trang vẫn dùng được bình thường
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

/** POST { ten, moTa, chiTieu, soCau, tongDiem } - lưu khuôn, cùng tên thì ghi đè. */
export async function POST(request: Request) {
  try {
    const { user, loi } = await layNguoiDung();
    if (loi) return loi;

    const { ten, moTa, chiTieu, soCau, tongDiem } = await request.json();
    if (!ten || !chiTieu) {
      return NextResponse.json({ error: 'Thiếu tên khuôn hoặc chỉ tiêu.' }, { status: 400 });
    }

    const db = createAdminClient();
    const dong = {
      nguoi_tao: user!.id,
      ten: String(ten).trim(),
      mo_ta: moTa || null,
      chi_tieu: chiTieu,
      so_cau: Number(soCau) || 0,
      tong_diem: Number(tongDiem) || 0,
      updated_at: new Date().toISOString(),
    };

    // Cùng một người thì tên khuôn không trùng nhau: lưu lại cùng tên là ghi đè
    const { data: cu } = await db.from('khuon_de_tuy_chinh').select('id')
      .eq('nguoi_tao', user!.id).eq('ten', dong.ten);

    if (cu && cu.length > 0) {
      const { data, error } = await db.from('khuon_de_tuy_chinh')
        .update(dong).eq('id', cu[0].id).eq('nguoi_tao', user!.id).select('id, updated_at');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      // Có .select() để BIẾT CHẮC đã ghi được - không có nó thì thất bại im lặng
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Không ghi được khuôn đề.' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, id: data[0].id, ghiDe: true, luuLuc: data[0].updated_at });
    }

    const { data, error } = await db.from('khuon_de_tuy_chinh').insert(dong).select('id, updated_at');
    if (error) {
      if (/does not exist|schema cache/i.test(error.message)) {
        return NextResponse.json({ error: NHAC_TAO_BANG }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Không tạo được khuôn đề.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data[0].id, ghiDe: false, luuLuc: data[0].updated_at });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}

/** DELETE ?id=... - xoá một khuôn đề tuỳ chỉnh của chính mình. */
export async function DELETE(request: Request) {
  try {
    const { user, loi } = await layNguoiDung();
    if (loi) return loi;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu mã khuôn đề.' }, { status: 400 });

    const db = createAdminClient();
    const { data, error } = await db.from('khuon_de_tuy_chinh')
      .delete().eq('id', id).eq('nguoi_tao', user!.id).select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy khuôn này (hoặc không phải khuôn của bạn).' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}
