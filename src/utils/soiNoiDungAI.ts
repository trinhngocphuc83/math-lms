/**
 * BƯỚC 2 CỦA BỘ KIỂM THỬ - GIẢI ĐỘC LẬP CHÉO.
 *
 * Đây là chỗ trả lời câu hỏi quan trọng nhất của Thầy cô: "đề có sai nội dung không?".
 * Sai một câu là cả lớp làm sai theo, chấm xong mới phát hiện thì đã muộn.
 *
 * Cách làm: CHE đáp án và lời giải đi, đưa AI đề bài trần rồi bắt tự giải lại từ đầu. So
 * kết quả với đáp án đang lưu trong kho. Lệch nhau là có chuyện - hoặc kho sai, hoặc đề
 * mơ hồ tới mức người giải nghiêm túc vẫn ra kết quả khác.
 *
 * HAI LƯỢT, NHƯNG CHỈ KHI CẦN
 * ---------------------------
 * AI cũng sai, nên một lượt lệch chưa đủ để kết tội. Lượt hai chỉ chạy trên NHỮNG CÂU
 * LỆCH ở lượt một:
 *   - hai lượt cùng ra một kết quả khác kho  -> gần như chắc chắn kho sai  -> báo LỖI
 *   - hai lượt ra hai kết quả khác nhau      -> câu mơ hồ hoặc quá khó     -> báo CẢNH BÁO
 *   - lượt hai quay về khớp kho              -> lượt một chỉ là hớ         -> bỏ qua
 * Nhờ vậy số lượt gọi AI chỉ nhiều hơn một chút so với chạy một lượt, mà báo động giả
 * giảm hẳn.
 *
 * CÂU CÓ HÌNH thì gửi kèm ảnh. Ảnh tải không được thì ghi "không kết luận được" chứ TUYỆT
 * ĐỐI không báo sai - đề đúng mà bị báo sai còn hại hơn là bỏ sót.
 */

import { layCauHinhAI, goiGeminiTrenTrinhDuyet } from './geminiBrowser';
import { docJsonCauHoi } from './vaJson';
import { toBankType } from './questionTypes';
import { docDapAnDungSai } from './chuanHoaCauHoi';
import type { LoiKiemThu } from './kiemThuDe';

export interface CauSoiNoiDung {
  id?: string;
  viTri: string;
  question_type?: string | null;
  content?: string | null;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  correct_answer?: string | null;
  image_url?: string | null;
}

/** Mỗi lượt gọi AI soi mấy câu. Gộp lại cho đỡ số lượt, nhưng đừng nhiều quá kẻo AI lướt. */
const SO_CAU_MOI_LUOT = 4;

/**
 * Hạn giờ cho MỘT lượt gọi (bốn câu, có thể kèm ảnh).
 *
 * Nặng hơn hẳn việc đọc một câu nên không dùng chung mốc GIAY_CHO_VIEC_NHO (25 giây).
 * Đo lượt soi thử 30 câu đầu tiên: đa số nhóm xong trong khoảng 20-40 giây, nhưng có
 * một nhóm đứng im hơn một phút. Quá 90 giây thì coi như model đang treo, bỏ để tụt
 * xuống model kế tiếp - chờ tiếp chỉ tổ bắt Thầy cô ngồi nhìn.
 */
const GIAY_CHO_MOT_LUOT = 90;

const chu = (x: any) => String(x ?? '');

/* ===================== DỰNG PROMPT ===================== */

function moTaMotCau(c: CauSoiNoiDung, so: number): string {
  const loai = toBankType(c.question_type) ?? 'NLC';
  const d: string[] = [`### CÂU ${so} (mã "${c.viTri}", loại ${loai})`, chu(c.content).trim()];

  if (loai === 'NLC') {
    d.push('Các phương án:');
    (['a', 'b', 'c', 'd'] as const).forEach((k, i) => {
      const v = chu((c as any)['option_' + k]).trim();
      if (v) d.push(`${'ABCD'[i]}. ${v}`);
    });
  } else if (loai === 'DS') {
    d.push('Bốn mệnh đề cần xét Đúng/Sai:');
    (['a', 'b', 'c', 'd'] as const).forEach((k) => {
      const v = chu((c as any)['option_' + k]).trim();
      if (v) d.push(`${k}) ${v}`);
    });
  }
  if (c.image_url) d.push('(Câu này có hình vẽ kèm theo, xem ảnh được gửi cùng.)');
  return d.join('\n');
}

function dungPrompt(nhom: CauSoiNoiDung[]): string {
  return `Bạn là một khảo thí viên nghiêm khắc, đang RÀ SOÁT CHẤT LƯỢNG đề thi trước khi in.

Dưới đây là ${nhom.length} câu hỏi. Đáp án đã bị CHE ĐI - bạn KHÔNG được đoán theo thói quen
hay theo "phương án nào trông hợp lý nhất", mà phải TỰ GIẢI LẠI TỪ ĐẦU một cách độc lập.

Với MỖI câu, hãy làm hai việc:

1. TỰ GIẢI và cho biết đáp án bạn tìm được:
   - Câu loại NLC: trả về đúng một chữ "A", "B", "C" hoặc "D".
   - Câu loại DS: trả về đúng bốn ký tự Đ/S theo thứ tự a,b,c,d, ví dụ "ĐSSĐ".
   - Câu loại TLN: trả về con số kết quả.
   - Câu loại TL: để rỗng.

2. SOÁT XEM ĐỀ CÓ SAI KHÔNG. Chỉ nêu khi thật sự có vấn đề khiến học sinh làm sai:
   - thiếu dữ kiện, không đủ căn cứ để giải ra một kết quả duy nhất;
   - dữ kiện mâu thuẫn nhau, hoặc phi lý về mặt thực tế (khối lượng âm, hiệu suất trên
     100%, tam giác có ba cạnh không dựng được, đầu mút trái lớn hơn đầu mút phải...);
   - có NHIỀU HƠN MỘT phương án đúng, hoặc KHÔNG có phương án nào đúng;
   - đề nhắc tới hình vẽ / bảng số liệu mà không có;
   - câu hỏi bị cắt cụt, hỏi một đằng dữ kiện một nẻo.

QUAN TRỌNG: nếu bạn KHÔNG chắc chắn (câu quá khó, thiếu hình, đề mơ hồ), hãy ghi
"chac": "thap" và nói rõ vì sao. Thà nhận là không chắc còn hơn kết tội một đề đúng.

Chỉ trả về JSON thuần, không kèm lời nào khác, theo đúng khuôn:
[
  {
    "so": 1,
    "dapAn": "B",
    "chac": "cao" | "vua" | "thap",
    "loiDe": "" hoặc mô tả ngắn gọn chỗ sai của đề,
    "vi": "một câu ngắn nói vì sao ra đáp án đó"
  }
]

${nhom.map((c, i) => moTaMotCau(c, i + 1)).join('\n\n')}`;
}

/* ===================== ẢNH KÈM THEO ===================== */

/** Tải ảnh của câu về dạng gửi được cho AI. Hỏng thì trả null, KHÔNG ném lỗi. */
async function anhThanhPart(url: string): Promise<any | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const b64: string = await new Promise((ok, hong) => {
      const r = new FileReader();
      r.onloadend = () => ok(chu(r.result).split(',')[1] || '');
      r.onerror = hong;
      r.readAsDataURL(blob);
    });
    if (!b64) return null;
    return { inlineData: { data: b64, mimeType: blob.type || 'image/png' } };
  } catch {
    return null;
  }
}

/* ===================== MỘT LƯỢT SOI ===================== */

interface TraLoiAI { so: number; dapAn: string; chac: string; loiDe: string; vi: string }

async function soiMotNhom(
  nhom: CauSoiNoiDung[], cauHinh: any, nhietDo: number,
): Promise<{ theoCau: Map<string, TraLoiAI>; thieuAnh: Set<string> }> {
  const parts: any[] = [{ text: dungPrompt(nhom) }];
  const thieuAnh = new Set<string>();

  for (const c of nhom) {
    if (!c.image_url) continue;
    const p = await anhThanhPart(c.image_url);
    if (p) parts.push(p);
    else thieuAnh.add(c.viTri);
  }

  const kq = await goiGeminiTrenTrinhDuyet(cauHinh, parts, { temperature: nhietDo }, GIAY_CHO_MOT_LUOT);
  const ds = docJsonCauHoi(kq.text).items;
  const theoCau = new Map<string, TraLoiAI>();
  for (const r of (Array.isArray(ds) ? ds : []) as any[]) {
    const i = Number(r?.so) - 1;
    if (i >= 0 && i < nhom.length) {
      theoCau.set(nhom[i].viTri, {
        so: i + 1,
        dapAn: chu(r?.dapAn).trim(),
        chac: chu(r?.chac).trim().toLowerCase(),
        loiDe: chu(r?.loiDe).trim(),
        vi: chu(r?.vi).trim(),
      });
    }
  }
  return { theoCau, thieuAnh };
}

/* ===================== SO ĐÁP ÁN ===================== */

/** Hai đáp án có coi là khớp nhau không - so theo đúng lối của từng loại câu. */
export function dapAnKhop(loai: string, a: string, b: string): boolean {
  const x = chu(a).trim(), y = chu(b).trim();
  if (!x || !y) return true;                       // thiếu một bên thì không kết tội

  const ma = toBankType(loai) ?? 'NLC';
  if (ma === 'NLC') return x.toUpperCase() === y.toUpperCase();
  if (ma === 'DS') {
    const dx = docDapAnDungSai(x), dy = docDapAnDungSai(y);
    return !dx || !dy ? true : dx === dy;
  }
  if (ma === 'TLN') {
    const so = (s: string) => {
      const t = s.replace(/\$/g, '').replace(/\{\s*,\s*\}/g, ',').replace(/,/g, '.')
        .replace(/[^0-9.\-]/g, '');
      const n = Number(t);
      return Number.isFinite(n) ? n : NaN;
    };
    const nx = so(x), ny = so(y);
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) return x === y;
    /* Cho lệch 0,5% để không bắt bẻ chuyện làm tròn. */
    return Math.abs(nx - ny) <= Math.max(Math.abs(nx), Math.abs(ny)) * 0.005;
  }
  return true;                                     // tự luận không so máy móc được
}

/* ===================== ĐƯỜNG CHÍNH ===================== */

export interface TienDoSoi { xong: number; tong: number; viec: string }

/**
 * Soi nội dung cả đề. Trả về danh sách lỗi ghép thẳng được vào kết quả kiểm thử.
 */
export async function soiNoiDungBangAI(
  cacCau: CauSoiNoiDung[],
  onTienDo?: (t: TienDoSoi) => void,
): Promise<LoiKiemThu[]> {
  const ra: LoiKiemThu[] = [];
  if (cacCau.length === 0) return ra;

  const cauHinh = await layCauHinhAI();
  const nhomLai = (ds: CauSoiNoiDung[]) => {
    const n: CauSoiNoiDung[][] = [];
    for (let i = 0; i < ds.length; i += SO_CAU_MOI_LUOT) n.push(ds.slice(i, i + SO_CAU_MOI_LUOT));
    return n;
  };

  /* ---------- LƯỢT 1: giải mù toàn bộ ---------- */
  const nhom1 = nhomLai(cacCau);
  const lan1 = new Map<string, TraLoiAI>();
  const khongCoAnh = new Set<string>();
  let xong = 0;

  for (const nhom of nhom1) {
    onTienDo?.({ xong, tong: cacCau.length, viec: 'Đang tự giải lại đề…' });
    try {
      const r = await soiMotNhom(nhom, cauHinh, 0.1);
      r.theoCau.forEach((v, k) => lan1.set(k, v));
      r.thieuAnh.forEach(k => khongCoAnh.add(k));
    } catch (e: any) {
      ra.push({
        ma: 'aiHong', tieuChi: 'khoaHoc', muc: 'nhac', viTri: nhom[0].viTri,
        moTa: 'Không soi được nhóm câu này: ' + (e?.message || 'lỗi không rõ'),
        cachSua: 'Thử lại, hoặc kiểm tra hạn mức khoá AI trong Cài đặt Cổng A.I.',
      });
    }
    xong += nhom.length;
  }

  /* ---------- CHỌN RA NHỮNG CÂU LỆCH ---------- */
  const theoViTri = new Map(cacCau.map(c => [c.viTri, c]));
  const lech: CauSoiNoiDung[] = [];

  for (const [viTri, tl] of lan1) {
    const c = theoViTri.get(viTri);
    if (!c) continue;

    /* Lỗi đề do AI chỉ ra - báo ngay, không cần lượt hai, nhưng hạ mức nếu AI tự nhận
       là không chắc. */
    if (tl.loiDe) {
      ra.push({
        ma: 'noiDungDeSai', tieuChi: 'khoaHoc',
        muc: tl.chac === 'thap' ? 'canhBao' : 'loi',
        viTri, cauId: c.id,
        moTa: 'AI soi ra: ' + tl.loiDe,
        cachSua: 'Đọc lại đề, bổ sung dữ kiện hoặc sửa số liệu cho hợp lý.',
      });
    }

    if (!chu(c.correct_answer).trim()) continue;    // chưa có đáp án thì luật khác đã báo
    if (!dapAnKhop(chu(c.question_type), tl.dapAn, chu(c.correct_answer))) lech.push(c);
  }

  /* ---------- LƯỢT 2: chỉ chạy trên câu lệch ---------- */
  if (lech.length > 0) {
    const lan2 = new Map<string, TraLoiAI>();
    let xong2 = 0;
    for (const nhom of nhomLai(lech)) {
      onTienDo?.({ xong: xong2, tong: lech.length, viec: 'Giải lại lần hai những câu đang lệch…' });
      try {
        const r = await soiMotNhom(nhom, cauHinh, 0.6);
        r.theoCau.forEach((v, k) => lan2.set(k, v));
      } catch { /* lượt hai hỏng thì coi như chưa xác nhận */ }
      xong2 += nhom.length;
    }

    for (const c of lech) {
      const a = lan1.get(c.viTri);
      const b = lan2.get(c.viTri);
      const dapAnKho = chu(c.correct_answer).trim();
      const loai = chu(c.question_type);
      const thieuHinh = khongCoAnh.has(c.viTri);

      if (!b) {
        ra.push({
          ma: 'dapAnNghiSai', tieuChi: 'khoaHoc', muc: 'canhBao', viTri: c.viTri, cauId: c.id,
          moTa: `Lượt soi thứ nhất ra "${a?.dapAn}" trong khi kho ghi "${dapAnKho}", chưa soi lại được lần hai.`,
          cachSua: 'Giải tay lại câu này để chốt.',
        });
        continue;
      }

      const haiLuotGiongNhau = dapAnKhop(loai, a?.dapAn || '', b.dapAn);
      const luotHaiKhopKho = dapAnKhop(loai, b.dapAn, dapAnKho);

      if (luotHaiKhopKho) continue;                 // lượt một chỉ là hớ, bỏ qua

      if (haiLuotGiongNhau && !thieuHinh && a?.chac !== 'thap' && b.chac !== 'thap') {
        ra.push({
          ma: 'dapAnSai', tieuChi: 'khoaHoc', muc: 'loi', viTri: c.viTri, cauId: c.id,
          moTa: `Giải độc lập HAI lần đều ra "${b.dapAn}" nhưng kho ghi đáp án "${dapAnKho}".`
            + (b.vi ? ` AI lập luận: ${b.vi}` : ''),
          cachSua: 'Giải tay lại câu này. Nếu AI đúng thì sửa đáp án trong ngân hàng.',
          deXuat: { correct_answer: b.dapAn },
        });
      } else {
        ra.push({
          ma: 'dapAnNghiSai', tieuChi: 'khoaHoc', muc: 'canhBao', viTri: c.viTri, cauId: c.id,
          moTa: thieuHinh
            ? `Câu có hình nhưng máy không tải được ảnh nên soi chưa chắc: hai lượt ra "${a?.dapAn}" và "${b.dapAn}", kho ghi "${dapAnKho}".`
            : `Hai lượt giải ra hai kết quả khác nhau ("${a?.dapAn}" và "${b.dapAn}"), kho ghi "${dapAnKho}" - đề có thể mơ hồ.`,
          cachSua: 'Đọc lại đề xem có chỗ nào hiểu được hai nghĩa, rồi giải tay để chốt.',
        });
      }
    }
  }

  onTienDo?.({ xong: cacCau.length, tong: cacCau.length, viec: 'Xong' });
  return ra;
}
