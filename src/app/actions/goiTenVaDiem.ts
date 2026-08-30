"use server";

import { createClient } from '@supabase/supabase-js';
import { assertStaff } from '@/utils/auth/guard';
import { thangNay, thangTruoc, LOI_CHUA_TAO_BANG, type HocSinh, type TrangThaiQuay } from '@/utils/goiTenVaDiem';
import { gopLanLamLai, tinhCacLanCong, type BaiDaLam } from '@/utils/diemThuong';

/**
 * Vòng quay gọi tên và điểm thưởng - phần chạy trên máy chủ.
 *
 * PHẢI chạy ở máy chủ chứ không đọc thẳng từ trình duyệt: bảng `enrollments` có RLS chặn,
 * đo trên máy thì trình duyệt đọc ra 0 dòng dù lớp có 16 em. Đây cũng là cách trang lớp
 * học đang làm (xem getEnrollments trong admin/classes/[id]/actions.ts).
 *
 * NGUYÊN TẮC XUYÊN SUỐT: mọi thứ khoá theo LỚP, không khoá theo bài giảng. `lesson_id`
 * chỉ ghi nhớ việc đó xảy ra ở đâu, KHÔNG BAO GIỜ dùng để lọc.
 */

const quanTri = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const thieuBang = (loi: any) =>
  !!loi && /schema cache|does not exist|Could not find the table/i.test(String(loi.message || ''));

/** Danh sách lớp - dùng cho ô đổi lớp. */
export async function layDsLop(): Promise<{ id: string; name: string }[]> {
  await assertStaff();
  const { data } = await quanTri.from('classes').select('id, name').order('name');
  return data || [];
}

/** Suy lớp từ bài đang mở: bài → khoá học → lớp cùng khoá. */
export async function layLopTheoBai(lessonId: string): Promise<{ id: string; name: string }[]> {
  await assertStaff();
  const { data: bai } = await quanTri
    .from('lessons').select('course_id').eq('id', lessonId).maybeSingle();
  if (!bai?.course_id) return [];
  const { data } = await quanTri
    .from('classes').select('id, name').eq('course_id', bai.course_id).order('name');
  return data || [];
}

/**
 * Danh sách học sinh ĐANG HỌC của lớp - đọc sống mỗi lần gọi.
 *
 * Không bao giờ cất lại danh sách này. Nhờ thế thêm em mới hay bớt em là vòng quay và
 * bảng điểm tự đổi theo, không phải dọn dẹp gì.
 */
export async function layDsHocSinh(classId: string): Promise<HocSinh[]> {
  await assertStaff();
  const { data } = await quanTri
    .from('enrollments')
    .select('student_id, status, profiles (id, full_name)')
    .eq('class_id', classId)
    .eq('status', 'ACTIVE');

  return (data || [])
    .map((r: any) => ({
      id: r.profiles?.id || r.student_id,
      ten: r.profiles?.full_name || 'Chưa có tên',
    }))
    .filter((h: HocSinh) => !!h.id)
    .sort((a: HocSinh, b: HocSinh) => a.ten.localeCompare(b.ten, 'vi'));
}

/**
 * Trạng thái vòng quay của lớp.
 *
 * Vòng hiện tại = vòng lớn nhất đã ghi; gọi hết CẢ LỚP HIỆN TẠI thì tự sang vòng kế tiếp.
 * Vì luôn ghép với danh sách sống nên em mới vào ngay vòng đang chạy, còn dòng lịch sử
 * của em đã rời lớp nằm lại vô hại.
 */
export async function layTrangThaiQuay(classId: string): Promise<TrangThaiQuay> {
  await assertStaff();
  const caLop = await layDsHocSinh(classId);

  const { data, error } = await quanTri
    .from('luot_goi_ten').select('student_id, vong').eq('class_id', classId);
  if (error) throw new Error(thieuBang(error) ? LOI_CHUA_TAO_BANG : error.message);

  const luot = data || [];
  let vong = luot.reduce((m: number, r: any) => Math.max(m, r.vong || 1), 1);

  const conLaiCua = (v: number) => {
    const daGoi = new Set(luot.filter((r: any) => r.vong === v).map((r: any) => r.student_id));
    return caLop.filter(h => !daGoi.has(h.id));
  };

  let conLai = conLaiCua(vong);
  if (caLop.length > 0 && conLai.length === 0) {
    vong += 1;
    conLai = caLop;      // cả lớp vào lại vòng mới
  }

  return { vong, caLop, conLai };
}

/** Ghi nhận đã gọi tên. `lessonId` chỉ để ghi nhớ. */
export async function ghiDaGoi(
  classId: string, studentId: string, vong: number, lessonId?: string | null,
): Promise<void> {
  await assertStaff();
  const { error } = await quanTri.from('luot_goi_ten').insert([{
    class_id: classId, student_id: studentId, vong, lesson_id: lessonId || null,
  }]);
  if (error) throw new Error(thieuBang(error) ? LOI_CHUA_TAO_BANG : error.message);
}

/**
 * Bỏ một em ra khỏi danh sách đã gọi, trả em đó lại vòng quay.
 *
 * Dùng khi quay nhầm - Thầy cô bấm QUAY lúc chưa định gọi, hoặc gọi trúng em vừa mới trả
 * lời xong. Chỉ xoá lượt gọi Ở VÒNG ĐANG CHẠY, không đụng tới lịch sử các vòng trước và
 * cũng không đụng tới điểm đã cộng.
 */
export async function boGoiTen(
  classId: string, studentId: string, vong: number,
): Promise<void> {
  await assertStaff();
  const { error } = await quanTri.from('luot_goi_ten').delete()
    .eq('class_id', classId).eq('student_id', studentId).eq('vong', vong);
  if (error) throw new Error(thieuBang(error) ? LOI_CHUA_TAO_BANG : error.message);
}

/** Tháng này của lớp đã chốt chưa. */
export async function daChotThang(classId: string, thang?: string): Promise<boolean> {
  await assertStaff();
  const { data, error } = await quanTri
    .from('chot_thang').select('id')
    .eq('class_id', classId).eq('thang', thang || thangNay()).maybeSingle();
  if (error && thieuBang(error)) throw new Error(LOI_CHUA_TAO_BANG);
  return !!data;
}

/** Cộng hoặc trừ điểm. Trả false nếu tháng đã chốt. */
export async function congDiem(
  classId: string,
  lan: { student_id: string; diem: number; ly_do?: string; nguon?: string },
  lessonId?: string | null,
  thang?: string,
): Promise<boolean> {
  const nguoi = await assertStaff();
  const t = thang || thangNay();
  if (await daChotThang(classId, t)) return false;

  const { error } = await quanTri.from('diem_thuong').insert([{
    student_id: lan.student_id,
    class_id: classId,
    thang: t,
    nguon: lan.nguon || 'tuong_tac',
    diem: lan.diem,
    ly_do: lan.ly_do || null,
    lesson_id: lessonId || null,
    nguoi_tao: (nguoi as any)?.id || null,
  }]);
  if (error) throw new Error(thieuBang(error) ? LOI_CHUA_TAO_BANG : error.message);
  return true;
}

/**
 * Tổng điểm tháng của từng em.
 *
 * Chỉ trả về em CÒN TRONG DANH SÁCH LỚP: em đã rời lớp biến khỏi bảng, em mới hiện ngay
 * với 0 điểm. Điểm cũ không bị xoá - nhận lại em đó là điểm hiện về đủ.
 */
export async function layTongDiemLop(
  classId: string, thang?: string,
): Promise<{ hs: HocSinh; tong: number }[]> {
  await assertStaff();
  const caLop = await layDsHocSinh(classId);

  const { data, error } = await quanTri
    .from('diem_thuong').select('student_id, diem')
    .eq('class_id', classId).eq('thang', thang || thangNay());
  if (error) throw new Error(thieuBang(error) ? LOI_CHUA_TAO_BANG : error.message);

  const cong: Record<string, number> = {};
  for (const r of data || []) cong[r.student_id] = (cong[r.student_id] || 0) + Number(r.diem || 0);

  return caLop
    .map(hs => ({ hs, tong: cong[hs.id] || 0 }))
    .sort((a, b) => b.tong - a.tong || a.hs.ten.localeCompare(b.hs.ten, 'vi'));
}

/* ────────────────────────────────────────────────── SÂN KHẤU VINH DANH ─── */

export interface DongVinhDanh {
  hs: HocSinh;
  tong: number;
  /** Tổng của tháng trước - để tính mức tiến bộ */
  truoc: number;
  tang: number;
}

export interface BangVinhDanh {
  tenLop: string;
  thang: string;
  /** Xếp theo TỔNG điểm tháng này */
  theoTong: DongVinhDanh[];
  /** Xếp theo MỨC TĂNG so với tháng trước */
  theoTienBo: DongVinhDanh[];
  /** Tháng trước chưa có dữ liệu -> bảng tiến bộ không có nghĩa, phải ẩn đi */
  coThangTruoc: boolean;
}

/**
 * Hai bảng vinh danh của một lớp trong một tháng.
 *
 * Chỉ tính những em CÒN TRONG DANH SÁCH LỚP: em đã rời lớp không lên bảng, em mới vào
 * hiện với 0 điểm. Điểm cũ không mất - nhận lại em đó là hiện về đủ.
 */
export async function layBangVinhDanh(
  classId: string, thang?: string,
): Promise<BangVinhDanh> {
  await assertStaff();
  const t = thang || thangNay();
  const tTruoc = thangTruoc(t);

  const caLop = await layDsHocSinh(classId);
  const { data: lop } = await quanTri.from('classes').select('name').eq('id', classId).maybeSingle();

  const { data, error } = await quanTri
    .from('diem_thuong').select('student_id, diem, thang')
    .eq('class_id', classId).in('thang', [t, tTruoc]);
  if (error) throw new Error(thieuBang(error) ? LOI_CHUA_TAO_BANG : error.message);

  const nay: Record<string, number> = {};
  const truoc: Record<string, number> = {};
  for (const r of data || []) {
    const o = r.thang === t ? nay : truoc;
    o[r.student_id] = (o[r.student_id] || 0) + Number(r.diem || 0);
  }

  const dong: DongVinhDanh[] = caLop.map(hs => {
    const a = nay[hs.id] || 0;
    const b = truoc[hs.id] || 0;
    return { hs, tong: a, truoc: b, tang: a - b };
  });

  const theoTen = (x: DongVinhDanh, y: DongVinhDanh) => x.hs.ten.localeCompare(y.hs.ten, 'vi');

  return {
    tenLop: lop?.name || 'Lớp',
    thang: t,
    theoTong: [...dong].sort((a, b) => b.tong - a.tong || theoTen(a, b)),
    theoTienBo: [...dong].sort((a, b) => b.tang - a.tang || theoTen(a, b)),
    coThangTruoc: Object.keys(truoc).length > 0,
  };
}

/* ──────────────────────────────────────────────── KHO GIỌNG ĐỌC ĐÃ NHỚ ─── */

const KHO_GIONG = 'system-assets';
const THU_MUC_GIONG = 'giong-goi-ten';

/**
 * Cất bản giọng vừa đọc vào kho chung.
 *
 * PHẢI đi qua máy chủ: trình duyệt ghi vào kho bị chặn - đo trên máy thì sau cả buổi thử
 * vẫn 0 tệp được nhớ, nên lần nào cũng phải gọi Google lại từ đầu và hay lỡ nhịp.
 */
export async function catGiongVaoKho(khoa: string, wavBase64: string): Promise<boolean> {
  await assertStaff();
  try {
    const bytes = Buffer.from(wavBase64, 'base64');
    const { error } = await quanTri.storage.from(KHO_GIONG)
      .upload(`${THU_MUC_GIONG}/${khoa}.wav`, bytes, {
        contentType: 'audio/wav', upsert: true,
      });
    return !error;
  } catch {
    return false;
  }
}

/** Địa chỉ bản đã nhớ, nếu có. Không có thì trả rỗng. */
export async function timGiongDaNho(khoa: string): Promise<string> {
  await assertStaff();
  try {
    const { data, error } = await quanTri.storage.from(KHO_GIONG)
      .list(THU_MUC_GIONG, { search: `${khoa}.wav`, limit: 1 });
    if (error || !data || data.length === 0) return '';
    const { data: ky } = await quanTri.storage.from(KHO_GIONG)
      .createSignedUrl(`${THU_MUC_GIONG}/${khoa}.wav`, 60 * 60 * 6);
    return ky?.signedUrl || '';
  } catch {
    return '';
  }
}

/* ────────────────────────────────────── QUÉT ĐIỂM TỪ BÀI LÀM (tự động) ─── */

/** Trong tháng 'YYYY-MM' thì từ ngày nào tới ngày nào. */
function khoangThang(thang: string): { tu: string; den: string } {
  const [n, t] = thang.split('-').map(Number);
  const tu = new Date(Date.UTC(n, t - 1, 1));
  const den = new Date(Date.UTC(t === 12 ? n + 1 : n, t === 12 ? 0 : t, 1));
  return { tu: tu.toISOString(), den: den.toISOString() };
}

export interface KetQuaQuet {
  /** Số lần cộng mới ghi nhận */
  themMoi: number;
  /** Tổng điểm vừa cộng thêm */
  themDiem: number;
  daChot: boolean;
}

/**
 * Quét bài làm trong tháng rồi cộng điểm cho những bài CHƯA cộng.
 *
 * Chạy lại bao nhiêu lần cũng không sao: mỗi bài đã cộng thì cột `lesson_id` giữ đúng
 * khoá của bài đó, lượt sau thấy có rồi là bỏ qua. Quy tắc quy đổi nằm ở utils/diemThuong
 * (có 27 phép thử), ở đây chỉ lo đọc/ghi.
 */
export async function quetDiemTuDong(
  classId: string, thang?: string,
): Promise<KetQuaQuet> {
  const nguoi = await assertStaff();
  const t = thang || thangNay();
  if (await daChotThang(classId, t)) return { themMoi: 0, themDiem: 0, daChot: true };

  const caLop = await layDsHocSinh(classId);
  if (caLop.length === 0) return { themMoi: 0, themDiem: 0, daChot: false };
  const ids = caLop.map(h => h.id);
  const { tu, den } = khoangThang(t);

  /* Những gì đã cộng rồi - khoá theo cặp (nguồn, khoá bài). */
  const { data: daCo, error: loiDaCo } = await quanTri
    .from('diem_thuong').select('student_id, nguon, lesson_id')
    .eq('class_id', classId).eq('thang', t);
  if (loiDaCo) throw new Error(thieuBang(loiDaCo) ? LOI_CHUA_TAO_BANG : loiDaCo.message);

  const daCong = (hsId: string) => new Set(
    (daCo || [])
      .filter((r: any) => r.student_id === hsId && r.lesson_id)
      .map((r: any) => `${r.nguon}|${r.lesson_id}`),
  );

  const canGhi: any[] = [];

  /* ---------------------------------------------------------- 1. LUYỆN TẬP */
  const { data: kq } = await quanTri
    .from('exam_results').select('student_id, module_id, score, created_at')
    .in('student_id', ids).gte('created_at', tu).lt('created_at', den);

  const idMuc = [...new Set((kq || []).map((r: any) => r.module_id).filter(Boolean))];
  const { data: muc } = idMuc.length
    ? await quanTri.from('lesson_modules').select('id, title').in('id', idMuc)
    : { data: [] as any[] };
  const tenMuc: Record<string, string> = {};
  for (const m of muc || []) tenMuc[m.id] = m.title || 'Bài luyện tập';

  for (const hs of caLop) {
    const bai: BaiDaLam[] = (kq || [])
      .filter((r: any) => r.student_id === hs.id && r.module_id)
      .map((r: any) => ({
        khoa: r.module_id,
        ten: `Luyện tập: ${tenMuc[r.module_id] || 'Bài luyện tập'}`,
        diem: Number(r.score),
        luc: r.created_at,
      }));
    if (bai.length === 0) continue;

    const da = daCong(hs.id);
    for (const lan of tinhCacLanCong(gopLanLamLai(bai), 'luyen_tap', new Set(
      [...da].filter(k => k.startsWith('luyen_tap|') || k.startsWith('tien_bo|'))
             .map(k => k.split('|')[1]),
    ))) {
      if (da.has(`${lan.nguon}|${lan.khoa}`)) continue;
      canGhi.push({
        student_id: hs.id, class_id: classId, thang: t,
        nguon: lan.nguon, diem: lan.diem, ly_do: lan.ly_do,
        lesson_id: lan.khoa, nguoi_tao: (nguoi as any)?.id || null,
      });
    }
  }

  /* ------------------------------------------------- 2. KIỂM TRA THẦY NHẬP */
  const { data: bd } = await quanTri
    .from('bang_diem').select('id, ten_bai, ngay')
    .eq('class_id', classId).gte('ngay', tu.slice(0, 10)).lt('ngay', den.slice(0, 10));

  if (bd && bd.length > 0) {
    const { data: ct } = await quanTri
      .from('bang_diem_chi_tiet').select('bang_diem_id, student_id, diem')
      .in('bang_diem_id', bd.map((b: any) => b.id));

    const tenBai: Record<string, { ten: string; ngay: string }> = {};
    for (const b of bd) tenBai[b.id] = { ten: b.ten_bai, ngay: b.ngay };

    for (const hs of caLop) {
      const bai: BaiDaLam[] = (ct || [])
        .filter((r: any) => r.student_id === hs.id && r.diem != null)
        .map((r: any) => ({
          khoa: r.bang_diem_id,
          ten: `Kiểm tra: ${tenBai[r.bang_diem_id]?.ten || 'Bài kiểm tra'}`,
          diem: Number(r.diem),
          luc: tenBai[r.bang_diem_id]?.ngay || '',
        }));
      if (bai.length === 0) continue;

      const da = daCong(hs.id);
      for (const lan of tinhCacLanCong(gopLanLamLai(bai), 'kiem_tra', new Set(
        [...da].filter(k => k.startsWith('kiem_tra|') || k.startsWith('tien_bo|'))
               .map(k => k.split('|')[1]),
      ))) {
        if (da.has(`${lan.nguon}|${lan.khoa}`)) continue;
        canGhi.push({
          student_id: hs.id, class_id: classId, thang: t,
          nguon: lan.nguon, diem: lan.diem, ly_do: lan.ly_do,
          lesson_id: lan.khoa, nguoi_tao: (nguoi as any)?.id || null,
        });
      }
    }
  }

  if (canGhi.length === 0) return { themMoi: 0, themDiem: 0, daChot: false };

  const { error } = await quanTri.from('diem_thuong').insert(canGhi);
  if (error) throw new Error(thieuBang(error) ? LOI_CHUA_TAO_BANG : error.message);

  return {
    themMoi: canGhi.length,
    themDiem: canGhi.reduce((s, r) => s + Number(r.diem), 0),
    daChot: false,
  };
}

/* ─────────────────────────────────── BẢNG ĐIỂM KIỂM TRA THẦY CÔ NHẬP ─── */

export interface BaiKiemTra {
  id: string;
  ten_bai: string;
  diem_dat: number;
  ngay: string;
  /** student_id -> điểm */
  diem: Record<string, number>;
}

/** Các bài kiểm tra của lớp, mới nhất trước. */
export async function layDsBaiKiemTra(classId: string): Promise<BaiKiemTra[]> {
  await assertStaff();
  const { data, error } = await quanTri
    .from('bang_diem').select('id, ten_bai, diem_dat, ngay')
    .eq('class_id', classId).order('ngay', { ascending: false });
  if (error) throw new Error(thieuBang(error) ? LOI_CHUA_TAO_BANG : error.message);
  if (!data || data.length === 0) return [];

  const { data: ct } = await quanTri
    .from('bang_diem_chi_tiet').select('bang_diem_id, student_id, diem')
    .in('bang_diem_id', data.map((b: any) => b.id));

  return data.map((b: any) => {
    const diem: Record<string, number> = {};
    for (const r of ct || []) if (r.bang_diem_id === b.id && r.diem != null) diem[r.student_id] = Number(r.diem);
    return { id: b.id, ten_bai: b.ten_bai, diem_dat: Number(b.diem_dat ?? 5), ngay: b.ngay, diem };
  });
}

/**
 * Lưu một bài kiểm tra và điểm từng em.
 *
 * Trước đây ScoresTab KHÔNG hề nhập supabase dòng nào - điểm chỉ nằm trong bộ nhớ trang,
 * Thầy cô nhập xong tải lại trang là mất trắng. Đây là chỗ lưu thật.
 */
export async function luuBaiKiemTra(
  classId: string,
  bai: { id?: string; ten_bai: string; diem_dat: number; ngay?: string },
  diem: Record<string, number | null>,
): Promise<string> {
  const nguoi = await assertStaff();

  let id = bai.id || '';
  if (id) {
    const { error } = await quanTri.from('bang_diem')
      .update({ ten_bai: bai.ten_bai, diem_dat: bai.diem_dat }).eq('id', id);
    if (error) throw new Error(thieuBang(error) ? LOI_CHUA_TAO_BANG : error.message);
  } else {
    const { data, error } = await quanTri.from('bang_diem').insert([{
      class_id: classId, ten_bai: bai.ten_bai, diem_dat: bai.diem_dat,
      ngay: bai.ngay || new Date().toISOString().slice(0, 10),
      nguoi_tao: (nguoi as any)?.id || null,
    }]).select('id').single();
    if (error) throw new Error(thieuBang(error) ? LOI_CHUA_TAO_BANG : error.message);
    id = data.id;
  }

  /* Ô để trống nghĩa là em đó chưa có điểm - xoá dòng cũ đi chứ đừng giữ số cũ. */
  const coDiem = Object.entries(diem).filter(([, d]) => d != null && Number.isFinite(Number(d)));
  const khongDiem = Object.entries(diem).filter(([, d]) => d == null || !Number.isFinite(Number(d)));

  if (khongDiem.length > 0) {
    await quanTri.from('bang_diem_chi_tiet').delete()
      .eq('bang_diem_id', id).in('student_id', khongDiem.map(([k]) => k));
  }
  if (coDiem.length > 0) {
    const { error } = await quanTri.from('bang_diem_chi_tiet').upsert(
      coDiem.map(([sid, d]) => ({ bang_diem_id: id, student_id: sid, diem: Number(d) })),
      { onConflict: 'bang_diem_id,student_id' },
    );
    if (error) throw new Error(thieuBang(error) ? LOI_CHUA_TAO_BANG : error.message);
  }

  return id;
}

export async function xoaBaiKiemTra(baiId: string): Promise<void> {
  await assertStaff();
  await quanTri.from('bang_diem').delete().eq('id', baiId);
}

/* ───────────────────────────────────────────────────── CHỐT THÁNG ─── */

/**
 * Chốt tháng: khoá lại, không cộng/trừ thêm được nữa.
 *
 * Quét nốt điểm từ bài làm TRƯỚC khi khoá, để không sót bài nào Thầy cô vừa chấm.
 */
export async function chotThang(classId: string, thang?: string): Promise<{ daQuet: number }> {
  const nguoi = await assertStaff();
  const t = thang || thangNay();

  const quet = await quetDiemTuDong(classId, t);

  const { error } = await quanTri.from('chot_thang').insert([{
    class_id: classId, thang: t, nguoi_chot: (nguoi as any)?.id || null,
  }]);
  if (error && !/duplicate|unique/i.test(error.message)) {
    throw new Error(thieuBang(error) ? LOI_CHUA_TAO_BANG : error.message);
  }
  return { daQuet: quet.themMoi };
}

/** Mở khoá lại một tháng đã chốt - phòng khi Thầy cô chốt nhầm. */
export async function boChotThang(classId: string, thang?: string): Promise<void> {
  await assertStaff();
  await quanTri.from('chot_thang').delete()
    .eq('class_id', classId).eq('thang', thang || thangNay());
}

/** Chi tiết từng lần cộng/trừ của cả lớp trong tháng - dùng để xuất phiếu phụ huynh. */
export async function layChiTietThang(
  classId: string, thang?: string,
): Promise<Record<string, { diem: number; nguon: string; ly_do: string; luc: string }[]>> {
  await assertStaff();
  const t = thang || thangNay();
  const caLop = await layDsHocSinh(classId);
  const ids = new Set(caLop.map(h => h.id));

  const { data, error } = await quanTri
    .from('diem_thuong').select('student_id, diem, nguon, ly_do, created_at')
    .eq('class_id', classId).eq('thang', t)
    .order('created_at', { ascending: true });
  if (error) throw new Error(thieuBang(error) ? LOI_CHUA_TAO_BANG : error.message);

  const ra: Record<string, { diem: number; nguon: string; ly_do: string; luc: string }[]> = {};
  for (const hs of caLop) ra[hs.id] = [];
  for (const r of data || []) {
    if (!ids.has(r.student_id)) continue;   // em đã rời lớp thì không lên phiếu
    ra[r.student_id].push({
      diem: Number(r.diem), nguon: r.nguon,
      ly_do: r.ly_do || '', luc: r.created_at,
    });
  }
  return ra;
}
