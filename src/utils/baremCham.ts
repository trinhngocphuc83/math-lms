/**
 * Dựng barem chấm cho MỘT câu tự luận, để hiện lên màn chấm tay.
 *
 * Dùng lại đúng bộ chia điểm của bản Hướng dẫn chấm in ra giấy (huongDanCham.ts), nên
 * điểm thầy cô chấm trên màn hình và điểm ghi trong biểu điểm phát cho học sinh là một.
 * Nếu ở đây tự chia kiểu khác thì hai bản đá nhau, mà học sinh thắc mắc thì không biết
 * bản nào đúng.
 *
 * Barem chỉ là GỢI Ý: thầy cô tick những bước học sinh làm được thì điểm tự cộng, nhưng
 * vẫn gõ tay đè lên được. Máy không tự chấm thay.
 */
import { cacBuocCham } from './huongDanCham';

export interface BuocBarem {
  /** Số thứ tự bước, bắt đầu từ 1. */
  thu: number;
  /** Nội dung bước, đã gộp các dòng lời giải thuộc bước đó. */
  noiDung: string;
  /** Điểm của riêng bước này. */
  diem: number;
}

export interface Barem {
  buoc: BuocBarem[];
  /** Phần "Lưu ý / Sai lầm thường gặp" cắt ra từ lời giải, nếu có. */
  luuY: string;
  /**
   * Khối "Phương pháp giải" cắt ra khỏi barem - lời dặn cho người chấm, KHÔNG có điểm.
   * Học sinh không viết câu ấy ra bài nên không thể là một bước để tick.
   */
  phuongPhap: string;
  /** Tổng điểm của các bước - luôn khớp điểm tối đa của câu khi dựng được barem. */
  tong: number;
}

const lamTron = (x: number) => Math.round(x * 100) / 100;

/**
 * Dựng barem từ lời giải mẫu và điểm tối đa của câu.
 *
 * Chỉ đánh số lại các bước mà cacBuocCham() đã chia - KHÔNG tự chia kiểu khác. Trước đây
 * hàm này chia riêng nên bản in giấy và màn hình vênh nhau ở những câu lời giải dài.
 *
 * Không có lời giải thì trả về barem rỗng - màn chấm sẽ nói thẳng "câu này chưa có lời
 * giải mẫu nên chưa dựng được barem", thay vì bịa ra mấy bước trống rồi để thầy cô tick
 * vào chỗ không có nội dung.
 */
export function dungBarem(loiGiai: string, diemToiDa: number): Barem {
  const { buoc, phuongPhap, luuY, tong } = cacBuocCham(String(loiGiai ?? ''), diemToiDa);
  return {
    buoc: buoc.map((b, i) => ({ thu: i + 1, noiDung: b.noiDung, diem: b.diem })),
    luuY,
    phuongPhap,
    tong: lamTron(tong),
  };
}

/** Cộng điểm của những bước đang được tick. */
export function congBuocDaTick(barem: Barem, daTick: number[]): number {
  const tap = new Set(daTick);
  return lamTron(barem.buoc.filter((b) => tap.has(b.thu)).reduce((t, b) => t + b.diem, 0));
}
