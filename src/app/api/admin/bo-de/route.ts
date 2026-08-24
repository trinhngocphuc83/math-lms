import { NextResponse } from 'next/server';
import { requireStaff } from '@/utils/auth/guard';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Bộ đề đã lưu.
 *
 * Trước đây nút "Chốt đề" chỉ cộng usage_count rồi báo thành công - bản đề KHÔNG
 * được lưu ở đâu cả. Đóng tab là mất trắng công chọn câu, không có lịch sử đề đã ra,
 * và không in lại được đúng đề đã phát cho học sinh.
 *
 * Dùng khoá máy chủ vì bảng bật bảo vệ dòng, nhưng mọi truy vấn đều ràng buộc
 * nguoi_tao = người đang đăng nhập, nên không ai đọc được đề của người khác.
 */

const NHAC_TAO_BANG =
  'Chưa tạo bảng bo_de_thi trong cơ sở dữ liệu. Hãy chạy tệp scratch/tao-bang-de-thi.sql trên Supabase.';

/** Lấy id người đang đăng nhập, đã qua kiểm tra quyền Giáo viên/Quản trị. */
async function layNguoiDung() {
  const guard = await requireStaff();
  if (!guard.ok) return { loi: guard.response };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { loi: NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 }) };
  return { user };
}

/**
 * Cộng 1 vào usage_count cho các câu trong đề.
 *
 * Bản cũ `await` từng câu trong vòng lặp và KHÔNG hề đọc `error`, nên đề 40 câu là
 * 40 lượt gọi và mọi lỗi bị nuốt im lặng. Ở đây gom các câu cùng usage_count lại
 * cập nhật một lượt (thường chỉ vài giá trị khác nhau), và đếm số dòng ghi được để
 * báo đúng sự thật thay vì luôn báo thành công.
 */
async function congLuotDung(db: any, ids: string[]): Promise<{ daCong: number; loi?: string }> {
  if (!ids.length) return { daCong: 0 };

  const { data: cu, error: loiDoc } = await db.from('questions')
    .select('id, usage_count').in('id', ids);
  if (loiDoc) return { daCong: 0, loi: loiDoc.message };

  const theoMuc = new Map<number, string[]>();
  for (const q of cu || []) {
    const n = Number(q.usage_count) || 0;
    if (!theoMuc.has(n)) theoMuc.set(n, []);
    theoMuc.get(n)!.push(q.id);
  }

  let daCong = 0;
  for (const [n, nhom] of theoMuc) {
    const { data, error } = await db.from('questions')
      .update({ usage_count: n + 1 }).in('id', nhom).select('id');
    if (error) return { daCong, loi: error.message };
    daCong += data?.length || 0;
  }
  return { daCong };
}

/** GET [?id=...] - lấy một bộ đề, hoặc liệt kê các bộ đề của chính mình. */
export async function GET(request: Request) {
  try {
    const { user, loi } = await layNguoiDung();
    if (loi) return loi;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const grade = searchParams.get('grade');
    const subject = searchParams.get('subject');

    const db = createAdminClient();

    if (id) {
      const { data, error } = await db.from('bo_de_thi').select('*')
        .eq('id', id).eq('nguoi_tao', user!.id).maybeSingle();
      if (error) {
        if (/does not exist|schema cache/i.test(error.message)) {
          return NextResponse.json({ chuaTaoBang: true, boDe: null });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data) return NextResponse.json({ error: 'Không tìm thấy bộ đề này.' }, { status: 404 });
      return NextResponse.json({ chuaTaoBang: false, boDe: data });
    }

    // Danh sách: KHÔNG lấy cột cau_hoi vì nó rất nặng (chụp cả nội dung từng câu)
    let q = db.from('bo_de_thi')
      .select('id, ten, loai_de, grade, subject, khuon_de, dau_de, so_cau, tong_diem, da_chot, updated_at')
      .eq('nguoi_tao', user!.id)
      .order('updated_at', { ascending: false });
    if (grade) q = q.eq('grade', grade);
    if (subject) q = q.eq('subject', subject);

    const { data, error } = await q;
    if (error) {
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

/**
 * POST { id?, ten, loaiDe, grade, subject, khuonDe, dauDe, maTran, cauHoi, tongDiem, chotDe? }
 * Có `id` thì cập nhật đúng bộ đề đó, không thì tạo mới.
 * `chotDe: true` thì cộng thêm lượt dùng cho từng câu - chỉ cộng một lần duy nhất.
 */
export async function POST(request: Request) {
  try {
    const { user, loi } = await layNguoiDung();
    if (loi) return loi;

    const body = await request.json();
    const { id, ten, loaiDe, grade, subject, khuonDe, dauDe, maTran, cauHoi, tongDiem, chotDe } = body;

    if (!ten || !Array.isArray(cauHoi) || cauHoi.length === 0) {
      return NextResponse.json({ error: 'Thiếu tên đề hoặc chưa có câu hỏi nào.' }, { status: 400 });
    }

    const db = createAdminClient();

    // Đã chốt rồi thì không cộng lượt dùng lần thứ hai
    let daChotTruocDo = false;
    if (id) {
      const { data: cu } = await db.from('bo_de_thi').select('da_chot')
        .eq('id', id).eq('nguoi_tao', user!.id).maybeSingle();
      daChotTruocDo = !!cu?.da_chot;
    }
    const canCongLuot = !!chotDe && !daChotTruocDo;

    const dong = {
      nguoi_tao: user!.id,
      ten: String(ten).trim(),
      loai_de: loaiDe || null,
      grade: grade || null,
      subject: subject || null,
      khuon_de: khuonDe || null,
      dau_de: dauDe || null,
      ma_tran: maTran || null,
      cau_hoi: cauHoi,
      so_cau: cauHoi.length,
      tong_diem: Number(tongDiem) || 0,
      da_chot: daChotTruocDo || !!chotDe,
      updated_at: new Date().toISOString(),
    };

    let luu: { id: string; updated_at: string };
    if (id) {
      const { data, error } = await db.from('bo_de_thi')
        .update(dong).eq('id', id).eq('nguoi_tao', user!.id).select('id, updated_at');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      // Có .select() để BIẾT CHẮC đã ghi được - không có nó thì thất bại im lặng
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Không ghi được bộ đề (không có dòng nào được cập nhật).' }, { status: 500 });
      }
      luu = data[0];
    } else {
      const { data, error } = await db.from('bo_de_thi').insert(dong).select('id, updated_at');
      if (error) {
        if (/does not exist|schema cache/i.test(error.message)) {
          return NextResponse.json({ error: NHAC_TAO_BANG }, { status: 500 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Không tạo được bộ đề.' }, { status: 500 });
      }
      luu = data[0];
    }

    // Chỉ khi CHỐT đề mới cộng lượt dùng; lưu thường thì không đụng tới ngân hàng
    let daCong = 0;
    if (canCongLuot) {
      const ids = cauHoi.map((q: any) => q?.id).filter(Boolean);
      const kq = await congLuotDung(db, ids);
      daCong = kq.daCong;
      if (kq.loi) {
        return NextResponse.json({
          ok: true, id: luu.id, luuLuc: luu.updated_at, daCong,
          canhBao: 'Đã lưu bộ đề nhưng cộng lượt dùng bị lỗi: ' + kq.loi,
        });
      }
      if (daCong < ids.length) {
        return NextResponse.json({
          ok: true, id: luu.id, luuLuc: luu.updated_at, daCong,
          canhBao: `Đã lưu bộ đề nhưng chỉ cộng được lượt dùng cho ${daCong}/${ids.length} câu.`,
        });
      }
    }

    return NextResponse.json({
      ok: true, id: luu.id, luuLuc: luu.updated_at,
      daChot: dong.da_chot, daCong,
      boQuaChot: !!chotDe && daChotTruocDo,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}

/** DELETE ?id=... - xoá một bộ đề của chính mình. */
export async function DELETE(request: Request) {
  try {
    const { user, loi } = await layNguoiDung();
    if (loi) return loi;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu mã bộ đề.' }, { status: 400 });

    const db = createAdminClient();
    const { data, error } = await db.from('bo_de_thi')
      .delete().eq('id', id).eq('nguoi_tao', user!.id).select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy bộ đề này (hoặc không phải đề của bạn).' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}
