// CỬA LƯU: bảo đảm mỗi dạng toán mới sinh ra trong ngân hàng đều có "Yêu cầu cần đạt".
//
// Vì sao cần: cột `question_categories.yeu_cau_can_dat` là nguồn duy nhất cho cột cùng
// tên trong BẢNG ĐẶC TẢ xuất ra Word (xem exportBangDeThi.ts). Dạng nào trống thì bảng
// đặc tả lấy tạm chính tên dạng - nhìn thì có chữ nhưng không phải yêu cầu cần đạt.
//
// Đo trên kho thật trước khi có tệp này: 54/818 dạng trống, và CẢ 54 đều mới tạo trong
// tháng gần nhất - tức là mấy đường lưu câu tự động đang đẻ ra danh mục rỗng; 244/7843
// câu (3%) nằm ở những dạng đó. Có 5 đường tạo danh mục mà không đường nào ghi yêu cầu.
//
// Việc SOẠN chữ thì dùng lại soanYeuCauCanDat.ts (đang chạy cho nút "AI soạn Yêu cầu
// cần đạt" trong Quản lý danh mục) - một giọng văn, một prompt, sửa một chỗ.
//
// Nguyên tắc: KHÔNG BAO GIỜ chặn việc lưu câu. Thầy cô đang soạn dở mà báo lỗi vì AI
// hết hạn mức thì hỏng việc; nên AI hỏng là dùng câu dựng theo mẫu, có đánh dấu để soát.

import { layCauHinhAI } from "./geminiBrowser";
import { soanYeuCauNhieuLo, type DangCanSoan } from "./soanYeuCauCanDat";

/** Một dạng cần có yêu cầu cần đạt. */
export interface ODanhMuc {
  grade?: string | number;
  subject?: string;
  topic?: string;
  lesson?: string;
  math_form?: string;
}

/** Dấu hiệu câu này do máy dựng theo mẫu chứ không phải AI soạn - để Thầy cô soát lại. */
export const DAU_TAM = " (tự dựng theo tên dạng — nên soát lại)";

export const thieuYeuCau = (s?: string | null): boolean => !String(s || "").trim();

/**
 * Câu dự phòng khi không nhờ được AI.
 *
 * Không cố tỏ ra thông minh: lấy chính tên dạng rồi ghép vào khuôn "Thực hiện được...".
 * Vẫn hơn hẳn để trống, và có đuôi đánh dấu nên không lẫn với câu do AI soạn.
 */
export function yeuCauTheoMau(o: ODanhMuc): string {
  const dang = String(o.math_form || "").trim();
  if (!dang) return "";
  const chu = dang.charAt(0).toLowerCase() + dang.slice(1);
  return `Thực hiện được: ${chu}.${DAU_TAM}`;
}

/**
 * CỬA CHUNG cho mọi đường tạo danh mục mới.
 *
 * Đưa vào danh sách dòng sắp ghi, trả về đúng danh sách đó nhưng đã có `yeu_cau_can_dat`.
 * Mọi nơi tạo `question_categories` đều phải đi qua đây, nếu không lại đẻ ra dạng rỗng.
 *
 * @param cauMauCua Vài câu thật thuộc dạng đó, nếu nơi gọi có sẵn. Máy soạn bám câu thật
 *   thì sát hơn hẳn so với chỉ nhìn tên dạng - đường lưu hàng loạt luôn có sẵn nên truyền
 *   vào; mấy đường thêm dạng bằng tay thì chưa có câu nào, để trống cũng không sao.
 */
export async function boSungYeuCauCanDat<T extends ODanhMuc>(
  dong: T[],
  cauMauCua?: (o: T) => string[],
  onTienDo?: (moTa: string) => void,
): Promise<(T & { yeu_cau_can_dat: string })[]> {
  if (dong.length === 0) return [];

  /* Luôn có sẵn câu theo mẫu để lấp, nên hàm này không bao giờ trả về ô trống. */
  const ra = dong.map((d) => ({ ...d, yeu_cau_can_dat: yeuCauTheoMau(d) }));

  try {
    const canSoan: DangCanSoan[] = dong.map((d, i) => ({
      id: String(i),
      grade: String(d.grade ?? ""),
      subject: String(d.subject ?? ""),
      topic: String(d.topic ?? ""),
      lesson: String(d.lesson ?? ""),
      math_form: String(d.math_form ?? ""),
      cauMau: (cauMauCua?.(d) || []).slice(0, 3),
    }));

    const cauHinh = await layCauHinhAI();
    const kq = await soanYeuCauNhieuLo(canSoan, cauHinh, onTienDo);
    for (const r of kq.ketQua) {
      const i = Number(r.id);
      if (Number.isInteger(i) && ra[i] && r.yeuCau.trim()) {
        ra[i].yeu_cau_can_dat = r.yeuCau.trim();
      }
    }
  } catch {
    /* AI hỏng hoặc hết hạn mức: giữ nguyên câu theo mẫu, tuyệt đối không ném lỗi ra
       ngoài - lưu câu hỏi mới là việc chính, yêu cầu cần đạt soát lại sau cũng được. */
  }

  return ra;
}
