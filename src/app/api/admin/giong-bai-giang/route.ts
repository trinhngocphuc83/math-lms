import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireStaff } from '@/utils/auth/guard';

/**
 * Ghi kịch bản và tệp giọng của bài giảng vào kho.
 *
 * PHẢI đi qua máy chủ: trình duyệt ghi thẳng vào kho bị chặn - đã đo khi làm giọng gọi tên,
 * cả buổi thử vẫn 0 tệp được nhớ. Đọc thì vẫn đọc thẳng được vì kho công khai.
 *
 *   POST  { viec: 'ghi-kich-ban', moduleId, kichBan }        ghi đè kich-ban.json
 *   POST  multipart: viec=tai-mp3, moduleId, khoa, tep       tải một đoạn giọng
 *   POST  { viec: 'xoa-mp3', moduleId, ten }                 xoá một đoạn giọng
 */

const KHO = 'system-assets';
const THU_MUC = 'giong-bai-giang';

const quanTri = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** Chỉ nhận id dạng uuid và tên tệp do chính app đặt - đường dẫn là do người dùng gửi lên. */
const idHopLe = (s: string) => /^[0-9a-f-]{20,40}$/i.test(String(s || ''));
const tenHopLe = (s: string) => /^[a-z0-9-]{1,40}\.(mp3|json)$/i.test(String(s || ''));

export const maxDuration = 60;

export async function POST(req: Request) {
  const guard = await requireStaff();
  if (!guard.ok) return guard.response;

  try {
    const loai = req.headers.get('content-type') || '';

    /* ---- Tải một đoạn giọng (multipart) ---- */
    if (loai.includes('multipart/form-data')) {
      const form = await req.formData();
      const moduleId = String(form.get('moduleId') || '');
      const khoa = String(form.get('khoa') || '');
      const tep = form.get('tep') as File | null;
      if (!idHopLe(moduleId) || !/^[a-z0-9-]{1,40}$/i.test(khoa) || !tep) {
        return NextResponse.json({ error: 'Thiếu moduleId, khoá đoạn hoặc tệp' }, { status: 400 });
      }
      if (tep.size > 12 * 1024 * 1024) {
        return NextResponse.json({ error: 'Tệp giọng quá lớn (trên 12 MB)' }, { status: 400 });
      }
      const ten = `${khoa}.mp3`;
      const { error } = await quanTri.storage.from(KHO)
        .upload(`${THU_MUC}/${moduleId}/${ten}`, await tep.arrayBuffer(), {
          contentType: 'audio/mpeg', upsert: true,
        });
      if (error) throw error;
      return NextResponse.json({ ok: true, ten });
    }

    const body = await req.json();
    const moduleId = String(body.moduleId || '');
    if (!idHopLe(moduleId)) return NextResponse.json({ error: 'moduleId không hợp lệ' }, { status: 400 });

    if (body.viec === 'ghi-kich-ban') {
      const kb = body.kichBan;
      if (!kb || !Array.isArray(kb.doan)) {
        return NextResponse.json({ error: 'Kịch bản không hợp lệ' }, { status: 400 });
      }
      const noiDung = JSON.stringify({ ...kb, phien_ban: 1, cap_nhat: new Date().toISOString() }, null, 1);
      const { error } = await quanTri.storage.from(KHO)
        .upload(`${THU_MUC}/${moduleId}/kich-ban.json`, new Blob([noiDung]), {
          contentType: 'application/json', upsert: true,
          /* Không để CDN giữ bản cũ: thầy vừa sửa lời là máy chiếu phải thấy ngay. */
          cacheControl: '10',
        });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (body.viec === 'xoa-mp3') {
      const ten = String(body.ten || '');
      if (!tenHopLe(ten)) return NextResponse.json({ error: 'Tên tệp không hợp lệ' }, { status: 400 });
      const { error } = await quanTri.storage.from(KHO).remove([`${THU_MUC}/${moduleId}/${ten}`]);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Việc không rõ' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Lỗi ghi kho giọng' }, { status: 500 });
  }
}
