/**
 * CHẤM PHẦN TRẮC NGHIỆM TỪ KẾT QUẢ ĐỌC LƯỚI TÔ TRÒN.
 *
 * Nhận đáp án máy đọc được từ ảnh (docPhieuQuet) và bản chụp đề trong bo_de_thi, trả về
 * điểm từng câu kèm lý do. Không gọi AI, không đụng cơ sở dữ liệu - hàm thuần nên kiểm
 * được bằng máy.
 *
 * Luật tính điểm lấy ĐÚNG bộ đang dùng cho bản in Hướng dẫn chấm (huongDanCham.ts), để
 * điểm máy chấm và biểu điểm phát cho học sinh không thể vênh nhau:
 *   - Trắc nghiệm nhiều lựa chọn: đúng thì trọn điểm câu.
 *   - Đúng/Sai: lũy tiến theo số ý đúng - 0,1 · 0,25 · 0,5 · 1,0 lần điểm mỗi câu.
 *   - Trả lời ngắn: đúng thì trọn điểm câu, so sánh theo SỐ chứ không theo chữ.
 *
 * Câu nào máy không dám đọc thì để `null` - KHÔNG tính 0 điểm. Chấm 0 cho một ô mờ mà
 * học sinh có tô là oan, nên phải chờ Thầy cô nhìn rồi mới có điểm.
 */

import { docDapAnDungSai } from './chuanHoaCauHoi';
import { lamTron } from './deThi';
import { MOC_LUY_TIEN } from './huongDanCham';
import type { KetQuaDocPhieu } from './docPhieuQuet';

const chu = (x: any) => String(x ?? '');

export interface CauDaCham {
  /** Khoá câu trong lưới: "NLC:3", "DS:2", "TLN:1". */
  ma: string;
  loai: 'NLC' | 'DS' | 'TLN';
  /** Số thứ tự câu trong phần, đúng như bản in đề. */
  cau: number;
  /** Đáp án máy đọc được; `null` là chưa tô hoặc máy không dám đọc. */
  hocSinh: string | null;
  dapAn: string;
  /** Điểm chấm được; `null` nghĩa là CHƯA chấm, đang chờ Thầy cô nhìn. */
  diem: number | null;
  diemToiDa: number;
  /** Vì sao chưa chấm được - để hiện lên bảng soát. */
  vuong?: string;
}

export interface KetQuaChamPhieu {
  cau: CauDaCham[];
  /** Tổng điểm phần trắc nghiệm, chỉ cộng những câu đã chấm được. */
  diem: number;
  diemToiDa: number;
  /** Số câu còn phải chờ Thầy cô nhìn. */
  soCauVuong: number;
}

/* ===================== SO ĐÁP ÁN ===================== */

/** Bốn ý Đúng/Sai của đáp án, dạng ['Đ','S','Đ','S']; không đọc được thì trả về null. */
function bonYDapAn(dapAn: string): string[] | null {
  const doc = docDapAnDungSai(chu(dapAn));
  if (!doc) return null;
  const ky = doc.toUpperCase().replace(/[^ĐSTF]/g, '')
    .replace(/T/g, 'Đ').replace(/F/g, 'S');
  return ky.length === 4 ? [...ky] : null;
}

/**
 * So hai đáp số Trả lời ngắn theo GIÁ TRỊ SỐ, không theo chữ.
 *
 * Học sinh tô "0,8" mà đáp án ghi ".8" hay "0.80" thì vẫn là một số. So chuỗi thì đánh
 * trượt oan. Không ra số ở cả hai bên thì mới quay về so chữ đã bỏ dấu cách.
 */
function khopSo(a: string, b: string): boolean {
  const so = (s: string) => {
    const t = chu(s).replace(/\s/g, '').replace(',', '.');
    return /^-?\d*\.?\d+$/.test(t) ? Number(t) : NaN;
  };
  const x = so(a), y = so(b);
  if (!Number.isNaN(x) && !Number.isNaN(y)) return Math.abs(x - y) < 1e-9;
  return chu(a).replace(/\s/g, '') === chu(b).replace(/\s/g, '');
}

/* ===================== SOÁT ĐỀ TRƯỚC KHI IN PHIẾU ===================== */

/**
 * Đáp số Trả lời ngắn có tô vừa BỐN Ô của phiếu không.
 *
 * Phiếu theo khuôn thi tốt nghiệp chỉ có đúng bốn ô, mỗi ô một ký tự trong {- , 0..9}.
 * Đáp số dài hơn, có chữ, có phân số, hay dấu phẩy đặt sai chỗ thì học sinh KHÔNG CÓ CHỖ
 * MÀ TÔ - in ra là hỏng câu ấy. Đo trên kho Toán: 246/907 câu đang vướng.
 */
export function vuaBonO(dapAn: string): { duoc: boolean; viSao?: string } {
  const s = chu(dapAn).trim().replace(/\s/g, '').replace('.', ',');
  if (!s) return { duoc: false, viSao: 'chưa có đáp án' };
  if (/[^-,\d]/.test(s)) return { duoc: false, viSao: 'đáp số có chữ hoặc ký hiệu ngoài số' };
  if (s.length > 4) return { duoc: false, viSao: `đáp số dài ${s.length} ký tự, phiếu chỉ có 4 ô` };
  if (s.indexOf('-') > 0) return { duoc: false, viSao: 'dấu trừ không nằm ở ô đầu' };
  if ((s.match(/,/g) || []).length > 1) return { duoc: false, viSao: 'có hơn một dấu phẩy' };
  if (s.endsWith(',')) return { duoc: false, viSao: 'dấu phẩy rơi vào ô cuối' };
  return { duoc: true };
}

export interface CauKhongToDuoc { phan: string; cau: number; dapAn: string; viSao: string }

/**
 * Soát cả đề: câu nào học sinh không tô nổi lên phiếu.
 *
 * Gọi TRƯỚC khi in phiếu. Thà bắt Thầy cô sửa đáp án lúc còn trên màn hình, còn hơn phát
 * đề ra lớp rồi mới phát hiện có câu không ai tô được.
 */
export function soatDeTruocKhiInPhieu(cacPhan: CauTrongDe[]): CauKhongToDuoc[] {
  const ra: CauKhongToDuoc[] = [];
  for (const phan of cacPhan) {
    phan.cauHoi.forEach((q: any, i: number) => {
      const cau = i + 1;
      const dapAn = chu(q?.correct_answer).trim();

      if (phan.ma === 'TLN') {
        const kq = vuaBonO(dapAn);
        if (!kq.duoc) ra.push({ phan: 'Trả lời ngắn', cau, dapAn, viSao: kq.viSao! });
        return;
      }
      if (phan.ma === 'NLC') {
        if (!/^[ABCD]$/.test(dapAn.toUpperCase().replace(/[^ABCD]/gi, '').slice(0, 1)))
          ra.push({ phan: 'Trắc nghiệm', cau, dapAn, viSao: 'đáp án không đọc ra A, B, C hay D' });
        return;
      }
      if (phan.ma === 'DS' && !bonYDapAn(dapAn))
        ra.push({ phan: 'Đúng/Sai', cau, dapAn, viSao: 'đáp án không đọc ra đủ bốn ý Đ/S' });
    });
  }
  return ra;
}

/* ===================== CHẤM ===================== */

export interface CauTrongDe {
  /** 'NLC' | 'DS' | 'TLN' - phần nào của đề. */
  ma: string;
  /** Các câu của phần đó, theo đúng thứ tự in. */
  cauHoi: any[];
  /** Điểm mỗi câu của phần này. */
  diemMoiCau: number;
}

/**
 * Chấm phần trắc nghiệm của một bài.
 *
 * @param doc Kết quả đọc ảnh - có thể gộp từ nhiều trang phiếu.
 * @param cacPhan Ba phần trắc nghiệm của đề kèm điểm mỗi câu.
 * @param suaTay Đáp án Thầy cô sửa tay đè lên máy đọc, theo cùng khoá câu.
 */
export function chamPhieuQuet(
  doc: Pick<KetQuaDocPhieu, 'traLoi' | 'khongChac'>,
  cacPhan: CauTrongDe[],
  suaTay: Record<string, string | null> = {},
): KetQuaChamPhieu {
  const vuongCua = new Map(doc.khongChac.map(k => [k.ma, k.viSao]));
  const ra: CauDaCham[] = [];

  for (const phan of cacPhan) {
    const loai = phan.ma as CauDaCham['loai'];
    if (loai !== 'NLC' && loai !== 'DS' && loai !== 'TLN') continue;

    phan.cauHoi.forEach((q: any, i: number) => {
      const cau = i + 1;
      const dapAn = chu(q?.correct_answer).trim();
      const diemToiDa = phan.diemMoiCau;

      if (loai === 'DS') {
        /* Bốn ý chấm riêng từng ý rồi mới quy ra điểm lũy tiến. */
        const dung = bonYDapAn(dapAn);
        const y = ['a', 'b', 'c', 'd'];
        const doc4 = y.map(k => {
          const ma = `DS:${cau}:${k}`;
          return ma in suaTay ? suaTay[ma] : (doc.traLoi[ma] ?? null);
        });
        const vuong = y.map(k => vuongCua.get(`DS:${cau}:${k}`)).find(Boolean);
        const chuoiHS = doc4.map(v => v ?? '·').join('');

        if (!dung) {
          ra.push({ ma: `DS:${cau}`, loai, cau, hocSinh: chuoiHS, dapAn, diem: null, diemToiDa,
                    vuong: 'đáp án của đề không đọc ra bốn ý Đúng/Sai' });
          return;
        }
        if (vuong) {
          ra.push({ ma: `DS:${cau}`, loai, cau, hocSinh: chuoiHS, dapAn: dung.join(''),
                    diem: null, diemToiDa, vuong });
          return;
        }
        const soDung = doc4.filter((v, k) => v && v === dung[k]).length;
        const diem = soDung === 0 ? 0 : lamTron(MOC_LUY_TIEN[soDung - 1] * diemToiDa);
        ra.push({ ma: `DS:${cau}`, loai, cau, hocSinh: chuoiHS, dapAn: dung.join(''), diem, diemToiDa });
        return;
      }

      const ma = `${loai}:${cau}`;
      const hocSinh = ma in suaTay ? suaTay[ma] : (doc.traLoi[ma] ?? null);
      const vuong = vuongCua.get(ma);

      if (vuong) {
        ra.push({ ma, loai, cau, hocSinh, dapAn, diem: null, diemToiDa, vuong });
        return;
      }
      if (!dapAn) {
        ra.push({ ma, loai, cau, hocSinh, dapAn, diem: null, diemToiDa,
                  vuong: 'câu này trong đề chưa có đáp án' });
        return;
      }
      if (hocSinh === null) {
        /* Không tô gì cả là bỏ trống - chấm 0, không phải chuyện phải hỏi lại. */
        ra.push({ ma, loai, cau, hocSinh: null, dapAn, diem: 0, diemToiDa });
        return;
      }

      const dung = loai === 'TLN'
        ? khopSo(hocSinh, dapAn)
        : hocSinh.toUpperCase() === dapAn.toUpperCase().replace(/[^ABCD]/g, '').slice(0, 1);
      ra.push({ ma, loai, cau, hocSinh, dapAn, diem: dung ? diemToiDa : 0, diemToiDa });
    });
  }

  return {
    cau: ra,
    diem: lamTron(ra.reduce((t, c) => t + (c.diem ?? 0), 0)),
    diemToiDa: lamTron(ra.reduce((t, c) => t + c.diemToiDa, 0)),
    soCauVuong: ra.filter(c => c.diem === null).length,
  };
}
