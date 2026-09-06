"use server";

import { createClient } from '@supabase/supabase-js';
import { assertStaff } from '@/utils/auth/guard';

/**
 * LƯU VẾT BÀI QUÉT - bằng chứng của mỗi lần chấm bài bằng ảnh.
 *
 * Chốt điểm xong, sổ điểm chỉ giữ ĐÚNG MỘT CON SỐ cho mỗi em. Phụ huynh hỏi "sao con
 * tôi được 6,5", hay em nói "con tô B mà máy đọc thành C", thì không còn gì đối chiếu.
 * Chỗ này giữ lại ảnh phiếu, đáp án máy đọc từng câu, độ đậm đo được, và chỗ thầy cô
 * sửa tay.
 *
 * PHẢI chạy ở máy chủ: kho ảnh 'bai-quet' để RIÊNG TƯ - bài có tên học sinh, không thể
 * để ai có đường dẫn cũng xem được. Trình duyệt chỉ nhận CHỮ KÝ TẠM THỜI khi cần xem,
 * y như cách app đang làm với bản ghi giọng đọc.
 *
 * Chưa chạy câu lệnh tạo bảng thì mọi hàm ở đây lặng lẽ báo `chuaTaoBang` - trang chấm
 * vẫn chấm và vẫn chốt điểm bình thường, chỉ là không lưu lại được.
 */

const quanTri = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const KHO_ANH = 'bai-quet';

const thieuBang = (loi: any) =>
  !!loi && /schema cache|does not exist|Could not find the table|Bucket not found/i.test(
    String(loi.message || ''));

export interface TrangAnhLuu {
  /** Ảnh dạng data:image/...;base64,... lấy thẳng từ trang chấm. */
  anhBase64: string;
  trang: number;
  vai: string;
}

export interface BaiQuetLuu {
  boDeId?: string;
  tenDe?: string;
  maDe?: string;
  classId?: string;
  studentId?: string;
  trangAnh: TrangAnhLuu[];
  oDaDoc: any[];
  doDam: Record<string, number>;
  suaTay: Record<string, string | null>;
  diem: number;
  diemToiDa: number;
  soCauVuong: number;
}

/** Cắt phần đầu "data:image/png;base64," ra khỏi chuỗi ảnh. */
function bocAnh(s: string): { bytes: Buffer; kieu: string } | null {
  const m = String(s || '').match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!m) return null;
  return { bytes: Buffer.from(m[2], 'base64'), kieu: m[1] };
}

/**
 * Lưu một mẻ bài đã chấm.
 *
 * Ảnh nào cất không được thì BỎ QUA ảnh đó chứ không bỏ cả bài: mất một tấm ảnh còn hơn
 * mất luôn đáp án và điểm từng câu.
 */
export async function luuBaiQuet(
  ds: BaiQuetLuu[],
  bangDiemId?: string,
): Promise<{ daLuu: number; chuaTaoBang: boolean; loi?: string }> {
  const nguoi = await assertStaff();
  if (ds.length === 0) return { daLuu: 0, chuaTaoBang: false };

  const dong: any[] = [];
  const moc = Date.now();

  for (let i = 0; i < ds.length; i++) {
    const b = ds[i];
    const anhDaCat: { duongDan: string; trang: number; vai: string }[] = [];

    for (let k = 0; k < b.trangAnh.length; k++) {
      const t = b.trangAnh[k];
      const boc = bocAnh(t.anhBase64);
      if (!boc) continue;
      const duoi = boc.kieu.split('/')[1] === 'jpeg' ? 'jpg' : boc.kieu.split('/')[1];
      const duongDan = `${b.classId || 'khong-lop'}/${moc}-${i + 1}-tr${t.trang || k + 1}.${duoi}`;
      const { error } = await quanTri.storage.from(KHO_ANH)
        .upload(duongDan, boc.bytes, { contentType: boc.kieu, upsert: true });
      if (error) {
        if (thieuBang(error)) return { daLuu: 0, chuaTaoBang: true };
        continue;                                  // hỏng một ảnh thì bỏ ảnh ấy thôi
      }
      anhDaCat.push({ duongDan, trang: t.trang, vai: t.vai });
    }

    dong.push({
      bo_de_id: b.boDeId || null,
      ten_de: b.tenDe || null,
      ma_de: b.maDe || null,
      class_id: b.classId || null,
      student_id: b.studentId || null,
      trang_anh: anhDaCat,
      o_da_doc: b.oDaDoc,
      do_dam: b.doDam,
      sua_tay: b.suaTay,
      diem: b.diem,
      diem_toi_da: b.diemToiDa,
      so_cau_vuong: b.soCauVuong,
      bang_diem_id: bangDiemId || null,
      nguoi_cham: (nguoi as any)?.id || null,
    });
  }

  const { error } = await quanTri.from('bai_quet').insert(dong);
  if (error) {
    if (thieuBang(error)) return { daLuu: 0, chuaTaoBang: true };
    return { daLuu: 0, chuaTaoBang: false, loi: error.message };
  }
  return { daLuu: dong.length, chuaTaoBang: false };
}

export interface DongBaiQuet {
  id: string;
  ten_de: string | null;
  ma_de: string | null;
  diem: number | null;
  diem_toi_da: number | null;
  so_cau_vuong: number;
  created_at: string;
  hocSinh: string;
  soAnh: number;
}

/** Các bài đã quét của một lớp, mới nhất trước. */
export async function layDsBaiQuet(classId: string, gioiHan = 200):
  Promise<{ ds: DongBaiQuet[]; chuaTaoBang: boolean }> {
  await assertStaff();
  const { data, error } = await quanTri.from('bai_quet')
    .select('id, ten_de, ma_de, diem, diem_toi_da, so_cau_vuong, created_at, student_id, trang_anh')
    .eq('class_id', classId)
    .order('created_at', { ascending: false })
    .limit(gioiHan);
  if (error) {
    if (thieuBang(error)) return { ds: [], chuaTaoBang: true };
    throw new Error(error.message);
  }

  const idHS = [...new Set((data || []).map((r: any) => r.student_id).filter(Boolean))];
  const { data: hs } = idHS.length
    ? await quanTri.from('profiles').select('id, full_name').in('id', idHS)
    : { data: [] as any[] };
  const ten = new Map((hs || []).map((h: any) => [h.id, h.full_name]));

  return {
    chuaTaoBang: false,
    ds: (data || []).map((r: any) => ({
      id: r.id, ten_de: r.ten_de, ma_de: r.ma_de,
      diem: r.diem, diem_toi_da: r.diem_toi_da, so_cau_vuong: r.so_cau_vuong,
      created_at: r.created_at,
      hocSinh: ten.get(r.student_id) || '(chưa gán em nào)',
      soAnh: Array.isArray(r.trang_anh) ? r.trang_anh.length : 0,
    })),
  };
}

/**
 * Một bài đã quét, kèm ĐỊA CHỈ ẢNH CÓ CHỮ KÝ TẠM THỜI.
 *
 * Chữ ký sống 6 tiếng - đủ cho một buổi ngồi soát, hết hạn thì mở lại là có chữ ký mới.
 * Không bao giờ trả về đường dẫn công khai: kho ảnh này để riêng tư.
 */
export async function layMotBaiQuet(id: string): Promise<{
  bai: any | null; anh: { url: string; trang: number; vai: string }[]; hocSinh: string;
}> {
  await assertStaff();
  const { data, error } = await quanTri.from('bai_quet').select('*').eq('id', id).maybeSingle();
  if (error || !data) return { bai: null, anh: [], hocSinh: '' };

  const anh: { url: string; trang: number; vai: string }[] = [];
  for (const t of (data.trang_anh || []) as any[]) {
    const { data: ky } = await quanTri.storage.from(KHO_ANH)
      .createSignedUrl(t.duongDan, 60 * 60 * 6);
    if (ky?.signedUrl) anh.push({ url: ky.signedUrl, trang: t.trang, vai: t.vai });
  }

  let hocSinh = '';
  if (data.student_id) {
    const { data: h } = await quanTri.from('profiles')
      .select('full_name').eq('id', data.student_id).maybeSingle();
    hocSinh = h?.full_name || '';
  }
  return { bai: data, anh, hocSinh };
}
