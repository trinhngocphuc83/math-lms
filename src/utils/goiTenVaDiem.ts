import { createClient } from "@/utils/supabase/client";

/**
 * Vòng quay gọi tên và điểm thưởng - kiểu dữ liệu và mấy việc chạy được ở trình duyệt.
 *
 * PHẦN CỦA THẦY CÔ nằm bên `src/app/actions/goiTenVaDiem.ts` chứ không ở đây, vì bảng
 * `enrollments` có RLS chặn: đo trên máy thì trình duyệt đọc ra 0 dòng dù lớp có 16 em.
 * Trang lớp học cũng phải đi đường Server Action y như vậy.
 *
 * Còn PHẦN CỦA HỌC SINH (tự xem điểm mình) thì đọc thẳng ở đây được, vì quyền đã mở đúng
 * cho `student_id = auth.uid()` trong tệp SQL.
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

/** Bảng chưa được tạo thì báo bằng câu này để giao diện hiện lời nhắc tử tế. */
export const LOI_CHUA_TAO_BANG = 'CHUA_TAO_BANG';

/** Tháng theo dạng 'YYYY-MM' - dùng chung ở mọi chỗ. */
export function thangNay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Tháng liền trước - dùng để tính mức tiến bộ. */
export function thangTruoc(thang = thangNay()): string {
  const [n, t] = thang.split('-').map(Number);
  return t === 1 ? `${n - 1}-12` : `${n}-${String(t - 1).padStart(2, '0')}`;
}

export interface DongDiem {
  diem: number;
  nguon: string;
  ly_do: string | null;
  created_at: string;
}

/**
 * Điểm của CHÍNH học sinh đang đăng nhập, trong một tháng.
 * Đọc thẳng ở trình duyệt được nhờ quyền đã mở cho chính chủ.
 */
export async function diemCuaToi(thang = thangNay()): Promise<{ tong: number; dong: DongDiem[] }> {
  const supabase = createClient();
  const { data: nguoi } = await supabase.auth.getUser();
  const id = nguoi?.user?.id;
  if (!id) return { tong: 0, dong: [] };

  const { data, error } = await supabase
    .from('diem_thuong')
    .select('diem, nguon, ly_do, created_at')
    .eq('student_id', id).eq('thang', thang)
    .order('created_at', { ascending: false });

  if (error) {
    if (/schema cache|does not exist|Could not find the table/i.test(error.message)) {
      throw new Error(LOI_CHUA_TAO_BANG);
    }
    throw error;
  }

  const dong = (data || []) as DongDiem[];
  return { tong: dong.reduce((s, d) => s + Number(d.diem || 0), 0), dong };
}
