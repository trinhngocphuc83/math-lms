// Nhận diện câu hỏi trùng lặp.
//
// Cách cũ chỉ bỏ khoảng trắng, hạ chữ thường rồi so khớp TUYỆT ĐỐI. Ba chỗ hỏng:
//
//   1. So cả địa chỉ ảnh. Từ khi ảnh minh hoạ được nhúng thẳng vào nội dung câu, địa chỉ
//      ảnh chiếm hơn nửa chuỗi đem so. Cùng một câu quét hai lần ra hai địa chỉ khác nhau
//      nên không đời nào trùng - đo trên kho Lý: hai câu giống hệt về chữ vẫn bị coi là khác.
//   2. Khớp tuyệt đối: lệch đúng một từ ("hình bên" / "hình bên dưới") hay một dấu
//      ((y; x) / (y, x)) là trượt.
//   3. Không bỏ dấu tiếng Việt, không gom dfrac/frac, không xét đáp án.
//
// Khảo sát kho Lý (979 câu) bằng cách chuẩn hoá dưới đây: 56 cặp trùng hệt mà cách cũ bỏ
// sót hoàn toàn, 105 cặp gần giống cần người xem, và 4 cặp CÙNG KHUÔN NHƯNG KHÁC SỐ LIỆU
// - nhóm cuối là lý do không được phép chỉ nhìn phần trăm giống nhau mà kết luận.

/** Ngưỡng coi là "nghi trùng", cần người duyệt. Dưới mức này thì bỏ qua. */
export const NGUONG_NGHI_TRUNG = 0.85;

/** Chênh lệch độ dài tối đa còn đáng đem ra so, để khỏi quét thừa cả kho. */
const CHENH_DAI_TOI_DA = 60;

/**
 * Chuẩn hoá nội dung câu hỏi về dạng chỉ còn chữ và số, bỏ mọi thứ không nói lên
 * "câu này hỏi gì": ảnh, địa chỉ, tiền tố "Câu 1.", cách nói vị trí hình, cú pháp LaTeX,
 * dấu tiếng Việt và dấu câu.
 */
export function chuanHoaNoiDung(raw: string | null | undefined): string {
  let t = String(raw || '');

  // Ảnh và mọi địa chỉ - phần gây sai lệch nặng nhất
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
  t = t.replace(/<img[^>]*>/gi, ' ');
  t = t.replace(/https?:\/\/\S+/g, ' ');

  // Tiền tố đánh số câu và các dấu nhắc có hình
  t = t.replace(/^(?:(?:Câu|Bài|VD|Ví\s*dụ)\s*\d+[a-zA-Z]?\s*[:.-]?\s*)+/i, ' ');
  t = t.replace(/\[(?:CÓ\s+)?HÌNH[^\]]*\]/gi, ' ');
  t = t.replace(/\[BẢNG\s+BIẾN\s+THIÊN\]/gi, ' ');

  // "hình bên", "hình bên dưới", "hình vẽ dưới đây"... đều chỉ cùng một việc
  t = t.replace(/hình\s+(vẽ\s+)?(bên\s+)?(dưới\s+đây|dưới|trên|bên)?/gi, ' hinh ');

  // Cú pháp LaTeX: giữ lại ký hiệu toán, bỏ phần trang trí
  t = t.replace(/dfrac/g, 'frac');
  t = t.replace(/\\text\s*\{([^}]*)\}/g, '$1');
  t = t.replace(/[$\\{}]/g, ' ');

  // Bỏ dấu tiếng Việt rồi rút về chữ thường không dấu câu
  t = t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd');
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Phần chữ của câu, đã bỏ hết số - dùng để nhận ra hai bài cùng khuôn. */
export const layKhuonChu = (raw: string | null | undefined): string =>
  chuanHoaNoiDung(raw).replace(/[0-9]/g, '');

/** Dãy số theo đúng thứ tự xuất hiện - dùng để phân biệt hai bài cùng khuôn khác số liệu. */
export const layDaySo = (raw: string | null | undefined): string =>
  (chuanHoaNoiDung(raw).match(/[0-9]+/g) || []).join(',');

/** Bốn phương án đã chuẩn hoá và xếp thứ tự, để nhận ra câu chỉ bị hoán vị đáp án. */
export function layDapAn(q: { option_a?: string; option_b?: string; option_c?: string; option_d?: string }): string {
  return [q.option_a, q.option_b, q.option_c, q.option_d]
    .map(x => chuanHoaNoiDung(x))
    .filter(Boolean)
    .sort()
    .join('|');
}

/** Tập cụm 3 ký tự liên tiếp, dùng để đo độ giống nhau. */
function tapCum(s: string): Set<string> {
  const r = new Set<string>();
  for (let i = 0; i + 3 <= s.length; i++) r.add(s.slice(i, i + 3));
  return r;
}

/**
 * Độ giống nhau giữa hai chuỗi đã chuẩn hoá, theo hệ số Dice trên cụm 3 ký tự.
 * Trả về 0 (khác hẳn) đến 1 (y hệt).
 */
export function doGiongNhau(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = tapCum(a), B = tapCum(b);
  if (!A.size || !B.size) return 0;
  let chung = 0;
  A.forEach(x => { if (B.has(x)) chung++; });
  return (2 * chung) / (A.size + B.size);
}

/** Một câu đã được rút gọn thành các khoá so sánh. */
export interface KhoaSoSanh {
  id: string;
  vanTay: string;
  khuonChu: string;
  daySo: string;
  dapAn: string;
}

export interface CauDeSoSanh {
  id: string;
  content?: string | null;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
}

export function taoKhoaSoSanh(q: CauDeSoSanh): KhoaSoSanh {
  return {
    id: q.id,
    vanTay: chuanHoaNoiDung(q.content),
    khuonChu: layKhuonChu(q.content),
    daySo: layDaySo(q.content),
    dapAn: layDapAn(q),
  };
}

export type MucDoTrung = 'trung' | 'nghi' | 'khac-so-lieu' | 'khong';

export interface KetQuaSoTrung {
  mucDo: MucDoTrung;
  /** Câu cũ giống nhất tìm được (nếu có) */
  idCauGiong?: string;
  /** Độ giống nhau 0..1 */
  diem: number;
  /** Câu chữ giải thích cho thầy cô hiểu vì sao bị đánh dấu */
  lyDo: string;
}

/**
 * Tìm câu cũ giống nhất với một câu mới.
 *
 * Thứ tự xét, quan trọng nhất trước:
 *   1. Vân tay giống hệt  -> chắc chắn trùng.
 *   2. Cùng khuôn chữ nhưng dãy số khác -> HAI BÀI KHÁC NHAU, không báo trùng. Đây là
 *      chốt chặn để không gộp nhầm những bài chỉ thay số liệu (đề Toán - Lý rất nhiều).
 *   3. Giống từ NGUONG_NGHI_TRUNG trở lên -> nghi trùng, để người duyệt quyết.
 *
 * Trùng đáp án chỉ dùng để nói rõ thêm trong lý do, không tự nó kết luận: bốn phương án
 * kiểu "Tăng / Giảm / Không đổi / Không liên quan" lặp lại ở rất nhiều câu khác nhau.
 */
export function timCauTrung(cauMoi: CauDeSoSanh, khoCu: KhoaSoSanh[]): KetQuaSoTrung {
  const moi = taoKhoaSoSanh(cauMoi);
  if (!moi.vanTay) return { mucDo: 'khong', diem: 0, lyDo: '' };

  let tot: { k: KhoaSoSanh; diem: number } | null = null;
  let khacSoLieu: KhoaSoSanh | null = null;

  for (const cu of khoCu) {
    if (!cu.vanTay || cu.id === moi.id) continue;

    if (cu.vanTay === moi.vanTay) {
      return {
        mucDo: 'trung',
        idCauGiong: cu.id,
        diem: 1,
        lyDo: 'Nội dung giống hệt một câu đã có trong kho (sau khi bỏ ảnh và cách trình bày).',
      };
    }

    if (Math.abs(cu.vanTay.length - moi.vanTay.length) > CHENH_DAI_TOI_DA) continue;

    const diem = doGiongNhau(moi.vanTay, cu.vanTay);
    if (diem < NGUONG_NGHI_TRUNG) continue;

    if (cu.khuonChu === moi.khuonChu && cu.daySo !== moi.daySo) {
      if (!khacSoLieu) khacSoLieu = cu;
      continue;
    }
    if (!tot || diem > tot.diem) tot = { k: cu, diem };
  }

  if (tot) {
    const trungDapAn = tot.k.dapAn && tot.k.dapAn === moi.dapAn;
    return {
      mucDo: 'nghi',
      idCauGiong: tot.k.id,
      diem: tot.diem,
      lyDo: `Giống ${Math.round(tot.diem * 100)}% một câu đã có trong kho`
        + (trungDapAn ? ', bốn phương án cũng trùng nhau.' : '.'),
    };
  }

  if (khacSoLieu) {
    return {
      mucDo: 'khac-so-lieu',
      idCauGiong: khacSoLieu.id,
      diem: 0,
      lyDo: 'Cùng khuôn với một câu đã có nhưng khác số liệu - vẫn là hai bài riêng.',
    };
  }

  return { mucDo: 'khong', diem: 0, lyDo: '' };
}
