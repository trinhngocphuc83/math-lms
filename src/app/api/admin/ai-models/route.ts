import { NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/auth/guard';
import { createAdminClient } from '@/utils/supabase/admin';
import { MODEL_MAC_DINH } from '@/utils/geminiRunner';
import { thongKeKhoaBiTreo } from '@/utils/aiKeyManager';

/**
 * Đọc/ghi danh sách model AI cho trang "Trạm kiểm soát Cổng A.I".
 *
 * Có bảng này thì mỗi lần Google ra model mới, hoặc model đang dùng bị quá tải kéo dài,
 * thầy cô tự bật/tắt và sắp lại thứ tự ngay trên giao diện - không phải sửa code rồi
 * triển khai lại.
 *
 * Chỉ Quản trị viên được đụng vào, vì đổi thứ tự model ảnh hưởng toàn hệ thống.
 */

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('ai_models')
      .select('id, model_id, thu_tu, dang_bat, ghi_chu')
      .order('thu_tu', { ascending: true });

    if (error) {
      // Bảng chưa được tạo: trả về danh sách mặc định kèm lời nhắc, để trang vẫn hiện được.
      return NextResponse.json({
        chuaTaoBang: true,
        models: MODEL_MAC_DINH.map((m, i) => ({ id: m, model_id: m, thu_tu: i + 1, dang_bat: true, ghi_chu: '' })),
        khoaBiTreo: {},
        loi: error.message,
      });
    }

    return NextResponse.json({
      chuaTaoBang: false,
      models: data || [],
      khoaBiTreo: await thongKeKhoaBiTreo(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}

/**
 * Lưu lại toàn bộ danh sách model: thêm model mới, bỏ model đã xoá, cập nhật
 * thứ tự và trạng thái bật/tắt.
 */
export async function POST(request: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const { models } = await request.json();
    if (!Array.isArray(models)) {
      return NextResponse.json({ error: 'Thiếu danh sách model.' }, { status: 400 });
    }

    // Chuẩn hoá: bỏ dòng trống, bỏ trùng, đánh lại thứ tự 1..n theo đúng thứ tự gửi lên.
    const daThay = new Set<string>();
    const sach = models
      .map((m: any) => ({
        model_id: String(m.model_id || '').trim(),
        dang_bat: m.dang_bat !== false,
        ghi_chu: String(m.ghi_chu || '').slice(0, 300),
      }))
      .filter(m => {
        if (!m.model_id || daThay.has(m.model_id)) return false;
        daThay.add(m.model_id);
        return true;
      })
      .map((m, i) => ({ ...m, thu_tu: i + 1 }));

    if (sach.length === 0) {
      return NextResponse.json({ error: 'Phải giữ lại ít nhất một model.' }, { status: 400 });
    }
    if (!sach.some(m => m.dang_bat)) {
      return NextResponse.json({ error: 'Phải bật ít nhất một model, nếu không toàn bộ tính năng AI sẽ ngừng chạy.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Xoá những model không còn trong danh sách
    const { data: dangCo } = await supabase.from('ai_models').select('model_id');
    const canXoa = (dangCo || []).map(r => r.model_id as string).filter(id => !daThay.has(id));
    if (canXoa.length > 0) {
      const { error } = await supabase.from('ai_models').delete().in('model_id', canXoa);
      if (error) throw error;
    }

    const { error } = await supabase.from('ai_models').upsert(sach, { onConflict: 'model_id' });
    if (error) throw error;

    return NextResponse.json({ ok: true, message: `Đã lưu ${sach.length} model.` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
