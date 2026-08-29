import { createClient } from "@/utils/supabase/client";

/**
 * Vòng quay gọi tên và điểm thưởng - phần đọc/ghi dữ liệu.
 *
 * NGUYÊN TẮC XUYÊN SUỐT: mọi thứ khoá theo LỚP, không khoá theo bài giảng.
 *
 *   - `lesson_id` chỉ ghi nhớ việc đó xảy ra ở đâu, KHÔNG BAO GIỜ dùng để lọc. Nhờ vậy
 *     quay ở bài A rồi mở bài B, hay mở thẳng từ trang lớp học, vẫn nối liền một mạch.
 *   - Danh sách lớp là NGUỒN SỰ THẬT, đọc sống mỗi lần dùng, tuyệt đối không chụp lại rồi
 *     cất đi. Nhờ vậy thêm học sinh mới hay bớt học sinh là vòng quay và bảng điểm tự đổi
 *     theo, không phải dọn dẹp gì.
 */

export interface HocSinh {
  id: string;
  ten: string;
}

export interface TrangThaiQuay {
  /** Vòng hiện tại, đếm từ 1 */
  vong: number;
  /** Cả lớp, theo danh sách SỐNG */
  caLop: HocSinh[];
  /** Những em chưa được gọi trong vòng này */
  conLai: HocSinh[];
}

/** Bảng chưa được tạo thì báo bằng câu này để trang trên hiện lời nhắc tử tế. */
export const LOI_CHUA_TAO_BANG = 'CHUA_TAO_BANG';

const laLoiThieuBang = (loi: any) =>
  !!loi && /schema cache|does not exist|Could not find the table/i.test(String(loi.message || ''));

/**
 * Suy ra lớp từ bài giảng đang mở: bài → khoá học → lớp cùng khoá.
 * Mỗi lớp một khoá riêng nên hầu như luôn ra đúng một lớp.
 */
export async function timLopTheoBai(lessonId: string): Promise<{ id: string; name: string }[]> {
  const supabase = createClient();
  const { data: bai } = await supabase
    .from('lessons').select('course_id').eq('id', lessonId).maybeSingle();
  if (!bai?.course_id) return [];
  const { data } = await supabase
    .from('classes').select('id, name').eq('course_id', bai.course_id).order('name');
  return data || [];
}

/** Toàn bộ lớp trong hệ thống - dùng cho ô đổi lớp. */
export async function dsLop(): Promise<{ id: string; name: string }[]> {
  const supabase = createClient();
  const { data } = await supabase.from('classes').select('id, name').order('name');
  return data || [];
}

/** Danh sách học sinh ĐANG HỌC của lớp, đọc sống. */
export async function dsHocSinh(classId: string): Promise<HocSinh[]> {
  const supabase = createClient();
  const { data: gd } = await supabase
    .from('enrollments').select('student_id').eq('class_id', classId).eq('status', 'ACTIVE');
  const ids = (gd || []).map((r: any) => r.student_id).filter(Boolean);
  if (ids.length === 0) return [];

  const { data: hs } = await supabase
    .from('profiles').select('id, full_name').in('id', ids);

  return (hs || [])
    .map((p: any) => ({ id: p.id, ten: p.full_name || 'Chưa có tên' }))
    .sort((a, b) => a.ten.localeCompare(b.ten, 'vi'));
}

/**
 * Trạng thái vòng quay của lớp.
 *
 * Vòng hiện tại = vòng lớn nhất đã ghi. Nếu vòng đó đã gọi hết CẢ LỚP HIỆN TẠI thì tự
 * sang vòng kế tiếp. Vì luôn ghép với danh sách sống nên:
 *   - thêm em mới giữa vòng: em đó chưa có dòng nào nên vào ngay vòng đang chạy;
 *   - bớt em: dòng lịch sử cũ nằm lại vô hại, không tính vào đâu cả.
 */
export async function docTrangThaiQuay(classId: string): Promise<TrangThaiQuay> {
  const supabase = createClient();
  const caLop = await dsHocSinh(classId);

  const { data, error } = await supabase
    .from('luot_goi_ten').select('student_id, vong').eq('class_id', classId);
  if (error) {
    if (laLoiThieuBang(error)) throw new Error(LOI_CHUA_TAO_BANG);
    throw error;
  }

  const luot = data || [];
  let vong = luot.reduce((m: number, r: any) => Math.max(m, r.vong || 1), 1);

  const conLaiCua = (v: number) => {
    const daGoi = new Set(luot.filter((r: any) => r.vong === v).map((r: any) => r.student_id));
    return caLop.filter(h => !daGoi.has(h.id));
  };

  let conLai = conLaiCua(vong);
  // Cả lớp đã được gọi hết ở vòng này -> mở vòng mới, cả lớp vào lại
  if (caLop.length > 0 && conLai.length === 0) {
    vong += 1;
    conLai = caLop;
  }

  return { vong, caLop, conLai };
}

/** Ghi nhận đã gọi tên một em. `lessonId` chỉ để ghi nhớ. */
export async function ghiDaGoi(
  classId: string, studentId: string, vong: number, lessonId?: string | null,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('luot_goi_ten').insert([{
    class_id: classId, student_id: studentId, vong, lesson_id: lessonId || null,
  }]);
  if (error) {
    if (laLoiThieuBang(error)) throw new Error(LOI_CHUA_TAO_BANG);
    throw error;
  }
}

/* ------------------------------------------------------------------ ĐIỂM ---- */

/** Tháng hiện tại theo dạng 'YYYY-MM' - dùng chung ở mọi chỗ. */
export function thangNay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export interface LanCongDiem {
  student_id: string;
  diem: number;
  ly_do?: string;
  nguon?: 'tuong_tac' | 'kiem_tra' | 'luyen_tap' | 'thi_online';
}

/** Tháng này của lớp đã chốt chưa - chốt rồi thì không cộng/trừ thêm được. */
export async function daChotThang(classId: string, thang = thangNay()): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('chot_thang').select('id').eq('class_id', classId).eq('thang', thang).maybeSingle();
  if (error && laLoiThieuBang(error)) throw new Error(LOI_CHUA_TAO_BANG);
  return !!data;
}

/** Cộng hoặc trừ điểm cho một em. Trả về false nếu tháng đã chốt. */
export async function congDiem(
  classId: string, lan: LanCongDiem, lessonId?: string | null, thang = thangNay(),
): Promise<boolean> {
  if (await daChotThang(classId, thang)) return false;

  const supabase = createClient();
  const { data: nguoi } = await supabase.auth.getUser();
  const { error } = await supabase.from('diem_thuong').insert([{
    student_id: lan.student_id,
    class_id: classId,
    thang,
    nguon: lan.nguon || 'tuong_tac',
    diem: lan.diem,
    ly_do: lan.ly_do || null,
    lesson_id: lessonId || null,
    nguoi_tao: nguoi?.user?.id || null,
  }]);
  if (error) {
    if (laLoiThieuBang(error)) throw new Error(LOI_CHUA_TAO_BANG);
    throw error;
  }
  return true;
}

/**
 * Tổng điểm tháng của từng em trong lớp.
 *
 * Chỉ trả về những em CÒN TRONG DANH SÁCH LỚP: em đã rời lớp thì biến khỏi bảng, em mới
 * vào hiện ngay với 0 điểm. Điểm cũ không bị xoá - nhận lại em đó là điểm hiện về đủ.
 */
export async function tongDiemLop(
  classId: string, thang = thangNay(),
): Promise<{ hs: HocSinh; tong: number }[]> {
  const supabase = createClient();
  const caLop = await dsHocSinh(classId);

  const { data, error } = await supabase
    .from('diem_thuong').select('student_id, diem')
    .eq('class_id', classId).eq('thang', thang);
  if (error) {
    if (laLoiThieuBang(error)) throw new Error(LOI_CHUA_TAO_BANG);
    throw error;
  }

  const cong: Record<string, number> = {};
  for (const r of data || []) cong[r.student_id] = (cong[r.student_id] || 0) + Number(r.diem || 0);

  return caLop
    .map(hs => ({ hs, tong: cong[hs.id] || 0 }))
    .sort((a, b) => b.tong - a.tong || a.hs.ten.localeCompare(b.hs.ten, 'vi'));
}
