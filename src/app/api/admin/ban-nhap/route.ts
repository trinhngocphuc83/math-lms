import { NextResponse } from 'next/server';
import { requireStaff } from '@/utils/auth/guard';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Bản nháp phiên soạn: giữ bài đang làm dở ở trang Soạn câu hỏi và trang Soạn đề luyện
 * tập, để hôm sau mở lại làm tiếp thay vì quét lại từ đầu.
 *
 * Lưu vào cơ sở dữ liệu chứ không phải bộ nhớ trình duyệt, nên soạn ở trường về nhà mở
 * tiếp được, và xoá dữ liệu duyệt cũng không mất.
 *
 * Dùng khoá máy chủ vì bảng bật bảo vệ dòng, nhưng mọi truy vấn đều ràng buộc
 * nguoi_tao = người đang đăng nhập, nên không ai đọc được bản nháp của người khác.
 */

/** Lấy id người đang đăng nhập, đã qua kiểm tra quyền Giáo viên/Quản trị. */
async function layNguoiDung() {
  const guard = await requireStaff();
  if (!guard.ok) return { loi: guard.response };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { loi: NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 }) };
  return { user };
}

/** GET ?loai=ngan_hang[&khoa=...] - lấy bản nháp; không có `loai` thì liệt kê tất cả. */
export async function GET(request: Request) {
  try {
    const { user, loi } = await layNguoiDung();
    if (loi) return loi;

    const { searchParams } = new URL(request.url);
    const loai = searchParams.get('loai');
    const khoa = searchParams.get('khoa');

    const db = createAdminClient();
    let q = db.from('ban_nhap_soan')
      .select('id, loai, khoa_rieng, ten, so_cau, du_lieu, created_at, updated_at')
      .eq('nguoi_tao', user!.id)
      .order('updated_at', { ascending: false });

    if (loai) q = q.eq('loai', loai);
    if (khoa !== null) q = khoa ? q.eq('khoa_rieng', khoa) : q.is('khoa_rieng', null);

    const { data, error } = await q;
    if (error) {
      // Bảng chưa tạo thì coi như chưa có bản nháp nào, để trang vẫn dùng được bình thường
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

/** POST { loai, khoa, ten, duLieu, soCau } - lưu đè bản nháp của chính mình. */
export async function POST(request: Request) {
  try {
    const { user, loi } = await layNguoiDung();
    if (loi) return loi;

    const { loai, khoa, ten, duLieu, soCau } = await request.json();
    if (!loai || !duLieu) {
      return NextResponse.json({ error: 'Thiếu loại hoặc nội dung bản nháp.' }, { status: 400 });
    }

    const db = createAdminClient();
    const dong = {
      nguoi_tao: user!.id,
      loai,
      khoa_rieng: khoa || null,
      ten: ten || null,
      du_lieu: duLieu,
      so_cau: Number(soCau) || 0,
      updated_at: new Date().toISOString(),
    };

    // Mỗi người + loại + khoá riêng chỉ giữ MỘT bản nháp, nên tìm rồi ghi đè
    let qCu = db.from('ban_nhap_soan').select('id')
      .eq('nguoi_tao', user!.id).eq('loai', loai);
    qCu = khoa ? qCu.eq('khoa_rieng', khoa) : qCu.is('khoa_rieng', null);
    const { data: cu } = await qCu;

    if (cu && cu.length > 0) {
      const { data, error } = await db.from('ban_nhap_soan')
        .update(dong).eq('id', cu[0].id).eq('nguoi_tao', user!.id).select('id, updated_at');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Không ghi được bản nháp.' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, id: data[0].id, luuLuc: data[0].updated_at });
    }

    const { data, error } = await db.from('ban_nhap_soan').insert(dong).select('id, updated_at');
    if (error) {
      if (/does not exist|schema cache/i.test(error.message)) {
        return NextResponse.json({
          error: 'Chưa tạo bảng ban_nhap_soan trong cơ sở dữ liệu. Hãy chạy tệp scratch/tao-bang-ban-nhap.sql trên Supabase.',
        }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data![0].id, luuLuc: data![0].updated_at });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}

/** DELETE ?id=... - bỏ bản nháp sau khi đã lưu hẳn vào ngân hàng. */
export async function DELETE(request: Request) {
  try {
    const { user, loi } = await layNguoiDung();
    if (loi) return loi;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu mã bản nháp.' }, { status: 400 });

    const db = createAdminClient();
    const { error } = await db.from('ban_nhap_soan')
      .delete().eq('id', id).eq('nguoi_tao', user!.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}
