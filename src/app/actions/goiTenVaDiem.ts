"use server";

import { createClient } from '@supabase/supabase-js';
import { assertStaff } from '@/utils/auth/guard';
import { thangNay, LOI_CHUA_TAO_BANG, type HocSinh, type TrangThaiQuay } from '@/utils/goiTenVaDiem';

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
