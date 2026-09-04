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
import { chiaDiemTungBuoc, gomBuoc, tachLuuY } from './huongDanCham';

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
  /** Tổng điểm của các bước - luôn khớp điểm tối đa của câu khi dựng được barem. */
  tong: number;
}

/** Số bước hợp lý cho một câu: quá ít thì chấm thô, quá nhiều thì rối mắt. */
const IT_NHAT = 2;
const NHIEU_NHAT = 8;

const dong = (s: string): string[] =>
  String(s ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map((d) => d.replace(/^\s*[-+*•➤]\s*/, '').trim())
    .filter(Boolean);

const lamTron = (x: number) => Math.round(x * 100) / 100;

/**
 * Dựng barem từ lời giải mẫu và điểm tối đa của câu.
 *
 * Không có lời giải thì trả về barem rỗng - màn chấm sẽ nói thẳng "câu này chưa có lời
 * giải mẫu nên chưa dựng được barem", thay vì bịa ra mấy bước trống rồi để thầy cô tick
 * vào chỗ không có nội dung.
 */
export function dungBarem(loiGiai: string, diemToiDa: number): Barem {
  const diem = Math.max(0, Number(diemToiDa) || 0);
  const { giai, luuY } = tachLuuY(String(loiGiai ?? ''));
  const dsDong = dong(giai);
  if (dsDong.length === 0 || diem <= 0) return { buoc: [], luuY, tong: 0 };

  const soBuoc = Math.max(IT_NHAT, Math.min(NHIEU_NHAT, dsDong.length));
  const dsDiem = chiaDiemTungBuoc(diem, soBuoc);
  if (dsDiem.length === 0) return { buoc: [], luuY, tong: 0 };

  const nhom = gomBuoc(dsDong, dsDiem.length);
  const buoc: BuocBarem[] = dsDiem.map((d, i) => ({
    thu: i + 1,
    noiDung: (nhom[i] || []).join(' ').trim() || `Bước ${i + 1}`,
    diem: d,
  }));
  return { buoc, luuY, tong: lamTron(buoc.reduce((t, b) => t + b.diem, 0)) };
}

/** Cộng điểm của những bước đang được tick. */
export function congBuocDaTick(barem: Barem, daTick: number[]): number {
  const tap = new Set(daTick);
  return lamTron(barem.buoc.filter((b) => tap.has(b.thu)).reduce((t, b) => t + b.diem, 0));
}
