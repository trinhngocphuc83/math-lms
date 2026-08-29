/**
 * Chống trùng công thức trong Sổ tay.
 *
 * Vì sao viết lại: kho 236 công thức thật đang có 4 nhóm trùng LaTeX (dư 4 bản) và 1 nhóm
 * trùng tên. Ba chỗ hở, đều kiểm được trong mã cũ:
 *
 *  1. Bộ lọc chỉ so trong CHƯƠNG ĐANG CHỌN, mà 3/4 nhóm trùng lại nằm khác chương
 *     (VD "Tọa độ trọng tâm tứ diện" có ở cả "Vectơ..." lẫn "Toán 12") - không thể bắt.
 *  2. Thêm tay thì không kiểm gì cả.
 *  3. Hai chỗ chuẩn hoá khác nhau, một chỗ sai: `replace(/\\s/g, '')` cắt đúng hai ký tự
 *     `\s`, tức biến `\sin x` thành `in x`, còn chỗ kia mới đúng là `/\s/g`.
 *
 * Nay gom về MỘT hàm chuẩn hoá dùng chung, và chuẩn hoá có hiểu LaTeX chứ không chỉ bỏ
 * khoảng trắng - hai công thức chỉ khác cách gõ vẫn phải bị bắt.
 */

export interface CongThucGon {
  id?: string;
  title?: string | null;
  latex_content?: string | null;
  category_id?: string | null;
}

/**
 * Đưa một công thức LaTeX về dạng so sánh được.
 *
 * Những thứ chỉ khác cách gõ mà cùng một công thức thì phải cho ra cùng một chuỗi:
 *   \dfrac{a}{b}      ≡ \frac{a}{b}      (dfrac/tfrac chỉ là cỡ hiển thị)
 *   \left( x \right)  ≡ (x)              (left/right chỉ là co giãn ngoặc)
 *   a \, b            ≡ ab               (\, \; \! \quad chỉ là khoảng cách)
 *   $x^2$             ≡ x^2              (dấu $ là ranh giới, không phải nội dung)
 */
export function chuanHoaLatex(s: string | null | undefined): string {
  return String(s || '')
    // bỏ dấu bao công thức
    .replace(/\$\$?/g, '')
    // cỡ phân số chỉ là cách hiển thị
    .replace(/\\[dt]frac\b/g, '\\frac')
    // \left( \right] ... chỉ là co giãn ngoặc
    .replace(/\\(left|right|big{1,2}[lr]?|middle)\b\s*/g, '')
    // các lệnh tạo khoảng cách
    .replace(/\\[,;:!]|\\quad\b|\\qquad\b|\\hspace\{[^}]*\}/g, '')
    // \mathrm{d} và bạn bè chỉ đổi kiểu chữ
    .replace(/\\(mathrm|mathit|text|mathbf|boldsymbol)\s*\{([^{}]*)\}/g, '$2')
    // bỏ mọi khoảng trắng - phải sau các bước trên
    .replace(/\s+/g, '')
    // dấu ngoặc nhọn bao một ký tự đơn là thừa: x^{2} ≡ x^2
    .replace(/\{(\w)\}/g, '$1')
    .toLowerCase();
}

/** Chuẩn hoá TÊN công thức: bỏ dấu tiếng Việt, gộp khoảng trắng. */
export function chuanHoaTen(s: string | null | undefined): string {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export interface KetQuaDoTrung {
  /** Công thức đã có trong kho mà bản mới trùng với nó; null là không trùng. */
  trungVoi: CongThucGon | null;
  /** Trùng ở đâu - để nói cho Thầy cô biết vì sao bị chặn. */
  lyDo: 'latex' | 'ten' | null;
}

/**
 * Dò một công thức mới với TOÀN KHO (không giới hạn theo chương).
 *
 * `boQuaId` để lúc SỬA một công thức thì không tự báo nó trùng với chính nó.
 */
export function doTrung(
  moi: CongThucGon,
  toanKho: CongThucGon[],
  boQuaId?: string,
): KetQuaDoTrung {
  const latexMoi = chuanHoaLatex(moi.latex_content);
  const tenMoi = chuanHoaTen(moi.title);

  for (const c of toanKho) {
    if (boQuaId && c.id === boQuaId) continue;
    // LaTeX là căn cứ chắc nhất: cùng công thức thì đúng là một, dù đặt tên khác nhau
    if (latexMoi && chuanHoaLatex(c.latex_content) === latexMoi) {
      return { trungVoi: c, lyDo: 'latex' };
    }
  }
  for (const c of toanKho) {
    if (boQuaId && c.id === boQuaId) continue;
    if (tenMoi && chuanHoaTen(c.title) === tenMoi) {
      return { trungVoi: c, lyDo: 'ten' };
    }
  }
  return { trungVoi: null, lyDo: null };
}

export interface NhomTrung {
  khoa: string;
  lyDo: 'latex' | 'ten';
  cacBan: CongThucGon[];
}

/**
 * Gom các bản trùng đang có sẵn trong kho thành từng nhóm, để dọn.
 * Nhóm theo LaTeX trước; cái nào không dính LaTeX mới xét tới tên.
 */
export function gomNhomTrung(toanKho: CongThucGon[]): NhomTrung[] {
  const theoLatex = new Map<string, CongThucGon[]>();
  for (const c of toanKho) {
    const k = chuanHoaLatex(c.latex_content);
    if (!k) continue;
    if (!theoLatex.has(k)) theoLatex.set(k, []);
    theoLatex.get(k)!.push(c);
  }

  const nhom: NhomTrung[] = [];
  const daVao = new Set<string>();
  for (const [khoa, ds] of theoLatex) {
    if (ds.length < 2) continue;
    nhom.push({ khoa, lyDo: 'latex', cacBan: ds });
    ds.forEach(c => c.id && daVao.add(c.id));
  }

  const theoTen = new Map<string, CongThucGon[]>();
  for (const c of toanKho) {
    if (c.id && daVao.has(c.id)) continue;   // đã nằm trong nhóm trùng LaTeX rồi
    const k = chuanHoaTen(c.title);
    if (!k) continue;
    if (!theoTen.has(k)) theoTen.set(k, []);
    theoTen.get(k)!.push(c);
  }
  for (const [khoa, ds] of theoTen) {
    if (ds.length < 2) continue;
    nhom.push({ khoa, lyDo: 'ten', cacBan: ds });
  }

  return nhom;
}

/**
 * Lọc một lô công thức sắp thêm: bỏ cái đã có trong kho, và bỏ cả cái trùng nhau ngay
 * trong chính lô đó (AI hay trả về hai bản na ná trong cùng một lượt).
 */
export function locLoMoi<T extends CongThucGon>(
  loMoi: T[],
  toanKho: CongThucGon[],
): { giuLai: T[]; boQua: { cauMoi: T; trungVoi: CongThucGon; lyDo: string }[] } {
  const giuLai: T[] = [];
  const boQua: { cauMoi: T; trungVoi: CongThucGon; lyDo: string }[] = [];
  const khoTam: CongThucGon[] = [...toanKho];

  for (const m of loMoi) {
    const kq = doTrung(m, khoTam);
    if (kq.trungVoi) {
      boQua.push({ cauMoi: m, trungVoi: kq.trungVoi, lyDo: kq.lyDo === 'latex' ? 'trùng công thức' : 'trùng tên' });
    } else {
      giuLai.push(m);
      khoTam.push(m);   // để hai cái giống nhau trong cùng lô cũng bị bắt
    }
  }
  return { giuLai, boQua };
}
