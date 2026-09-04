/**
 * BỘ KIỂM THỬ ĐỀ THI - phần chạy bằng mã, KHÔNG tốn lượt AI.
 *
 * Theo Sổ tay Kiểm thử Đề thi của Thầy cô: bốn tiêu chí với trọng số 30/30/25/15, và quy
 * trình ba bước. Bước 1 (quét cấu trúc) và bước 3 (thẩm định thẩm mỹ) làm được hết ở đây;
 * bước 2 (giải độc lập chéo) cần AI nên nằm ở utils/soiNoiDungAI.
 *
 * Mọi luật đều đã ĐO TRƯỚC trên kho thật (Toán 7.844 câu, Lý 2.418 câu) rồi mới đưa vào -
 * luật nào không bắt được lỗi có thật thì không viết. Con số đo được ghi ngay cạnh từng
 * luật để sau này ai đọc cũng biết luật ấy sinh ra vì chuyện gì.
 *
 * Không tự sửa gì cả: chỉ chỉ ra chỗ hỏng và cách sửa, quyền quyết định là của Thầy cô.
 */

import { toBankType, type BankType } from './questionTypes';
import { dapAnNganHopLe, docDapAnDungSai, gonSo, SO_KY_TU_TRA_LOI_NGAN } from './chuanHoaCauHoi';
import { taoKhoaSoSanh, doGiongNhau, NGUONG_NGHI_TRUNG } from './questionFingerprint';
import type { PhanDeThi } from './deThi';

/** Bốn tiêu chí và trọng số, lấy đúng Sổ tay Kiểm thử. */
export const TIEU_CHI = {
  cauTruc: { ten: 'Cấu trúc & ma trận', trong: 30 },
  khoaHoc: { ten: 'Khoa học & công thức', trong: 30 },
  loiGiai: { ten: 'Chất lượng lời giải', trong: 25 },
  thamMy: { ten: 'Thẩm mỹ & định dạng', trong: 15 },
} as const;

export type MaTieuChi = keyof typeof TIEU_CHI;
export type MucLoi = 'loi' | 'canhBao' | 'nhac';

export interface LoiKiemThu {
  /** Mã luật, để sau này lọc hoặc tắt riêng từng luật. */
  ma: string;
  tieuChi: MaTieuChi;
  muc: MucLoi;
  /** Chỗ xảy ra: "Phần II · Câu 3" hoặc "Cả đề". */
  viTri: string;
  /** id câu, để bấm vào là nhảy tới đúng câu. */
  cauId?: string;
  moTa: string;
  cachSua: string;
  /**
   * Bản AI đã tính sẵn cho lỗi này, nếu có.
   *
   * Dùng cho lỗi "đáp án sai": AI giải xong đã biết đáp án đúng, đính luôn vào đây thì
   * lúc Thầy cô bấm Sửa là thay được ngay, khỏi gọi AI thêm lượt nữa.
   */
  deXuat?: Record<string, string>;
}

export interface KetQuaKiemThu {
  loi: LoiKiemThu[];
  /** Điểm chất lượng 0-100, tính theo trọng số bốn tiêu chí. */
  diem: number;
  theoTieuChi: Record<MaTieuChi, { soLoi: number; soCanhBao: number; diem: number }>;
  soCau: number;
}

/* ===================== TIỆN ÍCH ===================== */

const chu = (x: any) => String(x ?? '');
const gonKhoangTrang = (s: string) => chu(s).replace(/\s+/g, ' ').trim();
const trichDe = (s: string) => gonKhoangTrang(s).slice(0, 60);

const BS = String.fromCharCode(92);
/** Lệnh LaTeX hay gặp - dùng để bắt công thức để trần ngoài cặp $…$. */
const LENH_LATEX = ['frac', 'sqrt', 'left', 'right', 'begin', 'overrightarrow', 'vec',
  'int', 'sum', 'lim', 'cdot', 'times', 'geq', 'leq', 'neq', 'mathbb', 'alpha', 'beta'];
const RE_LATEX_TRAN = new RegExp('(' + LENH_LATEX.map(x => BS + BS + x).join('|') + ')');
const boCongThuc = (s: string) => chu(s).replace(/\$[^$]*\$/g, '');

/**
 * Phương án tổng hợp bị cấm.
 *
 * Bản Master Prompt v5 cấm hẳn: "Tuyệt đối KHÔNG sử dụng các phương án nhiều hoặc đáp án
 * kiểu 'Cả A và B đều đúng', 'Tất cả các đáp án trên đều đúng', 'Không có đáp án nào'".
 * Đo trên kho: Lý còn 5 câu, Toán đã sạch.
 */
const RE_PHUONG_AN_TONG_HOP =
  /(cả\s+[abcd]\s+v[àa]\s+[abcd])|(tất cả\s+(các\s+)?(đáp án|phương án)?\s*(trên\s*)?đều đúng)|(không có đáp án nào)|(cả ba đáp án)|([abc],\s*[abc],\s*[abc]\s+đều đúng)/i;

/** Chỗ chờ hình còn sót trong lời văn. */
const RE_CHO_HINH = /\[HÌNH VẼ[^\]]*\]|\[HINH VE[^\]]*\]|\[BẢNG BIẾN THIÊN\]|\[CÓ HÌNH ẢNH[^\]]*\]/i;

/** Thẻ HTML còn sót - in ra giấy thành chữ thô. */
const RE_THE_HTML = /<img\b|<br\b|<div\b|<span\b|<p\b|&nbsp;|&lt;|&gt;/i;

/* ===================== SOÁT MỘT CÂU ===================== */

export interface CauDeSoat {
  id?: string;
  question_type?: string | null;
  content?: string | null;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  correct_answer?: string | null;
  explanation?: string | null;
  image_url?: string | null;
  difficulty?: any;
}

/**
 * Soát một câu hỏi. `viTri` là chỗ hiện cho Thầy cô, ví dụ "Phần II · Câu 3".
 */
export function soatMotCau(q: CauDeSoat, viTri: string): LoiKiemThu[] {
  const ra: LoiKiemThu[] = [];
  const them = (
    ma: string, tieuChi: MaTieuChi, muc: MucLoi, moTa: string, cachSua: string,
  ) => ra.push({ ma, tieuChi, muc, viTri, cauId: q.id, moTa, cachSua });

  const loai: BankType = toBankType(q.question_type) ?? 'NLC';
  const de = chu(q.content);
  const pa = [q.option_a, q.option_b, q.option_c, q.option_d].map(chu);
  const paCo = pa.filter(x => x.trim());
  const dapAn = chu(q.correct_answer).trim();
  const giai = chu(q.explanation);
  const moiThu = [de, ...pa].join('\n');

  /* ---------- KHOA HỌC & CÔNG THỨC ---------- */

  // Công thức rỗng "$ $" - đo được 17 câu Toán, 2 câu Lý
  const capCongThuc = moiThu.match(/\$[^$]*\$/g) || [];
  if (capCongThuc.some(c => c.slice(1, -1).trim() === '')) {
    them('congThucRong', 'khoaHoc', 'loi',
      'Có cặp $…$ rỗng, in ra chỉ là khoảng trắng vô nghĩa.',
      'Xoá cặp $$ thừa, hoặc điền công thức còn thiếu vào giữa.');
  }

  // Số dấu $ lẻ -> công thức hở
  if ((moiThu.match(/\$/g) || []).length % 2 === 1) {
    them('doLaLe', 'khoaHoc', 'loi',
      'Số dấu $ lẻ - có một công thức chưa đóng, in ra sẽ vỡ.',
      'Tìm chỗ thiếu dấu $ và đóng lại.');
  }

  // Lệnh LaTeX để trần ngoài $…$ - đo được 38 câu Toán
  if (RE_LATEX_TRAN.test(boCongThuc(moiThu))) {
    them('latexTran', 'khoaHoc', 'loi',
      'Có lệnh LaTeX nằm ngoài cặp $…$, in ra thành chữ thô kiểu "\\frac{1}{2}".',
      'Bọc đoạn công thức đó vào cặp $…$.');
  }

  /* ---------- SƯ PHẠM: PHƯƠNG ÁN & ĐÁP ÁN ---------- */

  if (loai === 'NLC') {
    const phamCam = paCo.find(x => RE_PHUONG_AN_TONG_HOP.test(x));
    if (phamCam) {
      them('phuongAnTongHop', 'cauTruc', 'loi',
        `Phương án tổng hợp bị cấm: "${trichDe(phamCam)}".`,
        'Thay bằng một khẳng định độc lập, tương đương về độ dài với ba phương án kia.');
    }

    const chuanHoa = paCo.map(x => gonKhoangTrang(x).toLowerCase());
    if (new Set(chuanHoa).size < chuanHoa.length) {
      them('phuongAnTrungNhau', 'cauTruc', 'loi',
        'Có hai phương án giống hệt nhau - học sinh chọn đúng vẫn có thể bị chấm sai.',
        'Sửa lại một trong hai phương án cho khác đi.');
    }

    if (paCo.length > 0 && paCo.length < 4) {
      them('thieuPhuongAn', 'cauTruc', 'loi',
        `Chỉ có ${paCo.length} phương án, thiếu ${4 - paCo.length}.`,
        'Bổ sung cho đủ bốn phương án A, B, C, D.');
    }

    if (dapAn && !/^[ABCD]$/.test(dapAn)) {
      them('dapAnSaiKhuonTN', 'cauTruc', 'loi',
        `Đáp án ghi "${trichDe(dapAn)}" chứ không phải một chữ A/B/C/D.`,
        'Sửa lại đáp án thành đúng một chữ cái, hoặc đổi loại câu cho đúng.');
    }

    // Phương án dài gấp ba cái ngắn nhất -> học sinh đoán mò trúng
    const dai = paCo.map(x => gonKhoangTrang(x).length);
    if (dai.length === 4 && Math.max(...dai) > 3 * Math.min(...dai) && Math.max(...dai) > 40) {
      them('phuongAnLechDai', 'cauTruc', 'canhBao',
        'Một phương án dài gấp hơn ba lần phương án ngắn nhất - học sinh dễ đoán mò trúng.',
        'Viết lại cho bốn phương án tương đương nhau về độ dài.');
    }
  }

  if (loai === 'DS') {
    if (!pa.every(x => x.trim())) {
      them('dsThieuY', 'cauTruc', 'loi',
        'Câu Đúng/Sai thiếu ý - phải có đủ bốn ý a), b), c), d).',
        'Bổ sung ý còn thiếu.');
    }
    if (dapAn && !docDapAnDungSai(dapAn)) {
      them('dsDapAnSaiKhuon', 'cauTruc', 'loi',
        `Đáp án Đúng/Sai không đọc được: "${trichDe(dapAn)}".`,
        'Ghi lại theo khuôn bốn ký tự, ví dụ "ĐSSĐ".');
    }
    // Bốn ý bị lặp ngay trong đề -> in ra bị đúp. Đo được 39 câu Toán.
    if (/(^|\n)\s*a\s*[).:]/i.test(de) && /(^|\n)\s*d\s*[).:]/i.test(de)) {
      them('dsLapYTrongDe', 'thamMy', 'loi',
        'Bốn ý a) b) c) d) nằm cả trong đề bài lẫn ở ô mệnh đề - in ra sẽ đúp hai lần.',
        'Xoá bốn ý khỏi đề bài, chỉ giữ phần dẫn.');
    }
  }

  if (loai === 'TLN') {
    /*
     * Nắn đáp án về khuôn số TRƯỚC KHI xét, y như lúc lưu vào kho.
     *
     * Bản cũ xét thẳng chuỗi thô nên "-0.8" bị báo là không tô được, trong khi phiếu có
     * bốn ô và ô nào cũng tô được dấu trừ hay dấu phẩy: "-0,8" vừa khít bốn ô. Cái sai
     * chỉ là dấu chấm thập phân - thứ mà chuanHoaCauHoi.gonSo đã đổi sẵn thành dấu phẩy.
     * Báo oan kiểu này còn tệ hơn không báo: thầy cô đi sửa một câu vốn không hỏng.
     */
    if (dapAn && !dapAnNganHopLe(dapAn) && !dapAnNganHopLe(gonSo(dapAn))) {
      them('tlnKhongToDuoc', 'cauTruc', 'loi',
        `Đáp án "${trichDe(dapAn)}" không tô được vào ${SO_KY_TU_TRA_LOI_NGAN} ô của phiếu`
        + ' - học sinh có giải đúng cũng không có chỗ điền.',
        'Sửa đề để kết quả ra số ngắn, hoặc ghi rõ trong đề "làm tròn đến…", "tính theo đơn vị…".');
    }
  }

  if (loai !== 'TL' && !dapAn) {
    them('khongCoDapAn', 'cauTruc', 'loi',
      'Câu này chưa có đáp án - không chấm được.',
      'Điền đáp án vào câu.');
  }

  /* ---------- CHẤT LƯỢNG LỜI GIẢI ---------- */

  if (!giai.trim()) {
    them('khongCoLoiGiai', 'loiGiai', 'loi',
      'Chưa có lời giải.',
      'Soạn lời giải, hoặc nhờ AI soạn rồi soát lại.');
  } else {
    if (!giai.includes('\n')) {
      them('loiGiaiMotDong', 'loiGiai', 'canhBao',
        'Lời giải dồn hết vào một dòng - in ra là một khối chữ, học sinh khó theo.',
        'Tách mỗi bước biến đổi thành một dòng riêng (luật "Một dòng – Một chi tiết").');
    }
    if (gonKhoangTrang(giai).length < 40) {
      them('loiGiaiQuaNgan', 'loiGiai', 'canhBao',
        'Lời giải quá ngắn, nhiều khả năng chỉ ghi mỗi đáp số.',
        'Bổ sung các bước biến đổi và kết luận.');
    }
    if (!/phương pháp giải/i.test(giai)) {
      them('thieuPhuongPhap', 'loiGiai', 'nhac',
        'Chưa có mục "Phương pháp giải" nên hộp lời giải in ra không có phần Gợi mở của giáo viên.',
        'Thêm dòng "Phương pháp giải:" rồi ghi định hướng tư duy.');
    }
  }

  /* ---------- THẨM MỸ & ĐỊNH DẠNG ---------- */

  /* In đậm: CHO PHÉP nhấn mạnh ngắn (kiểu **không**, **không phải**) vì đó là lối viết
     quen của đề Việt Nam - đo trên kho có 55 chỗ Toán, 128 chỗ Lý đều là kiểu này. Chỉ
     báo lỗi khi in đậm cả cụm dài, đúng tinh thần "không in đậm nội dung câu hỏi". */
  const cumDam = (moiThu.match(/\*\*([^*]{1,300})\*\*/g) || [])
    .map(m => m.slice(2, -2).trim())
    .filter(x => x.split(/\s+/).length > 3);
  if (cumDam.length) {
    them('inDamCumDai', 'thamMy', 'loi',
      `In đậm cả cụm dài: "${trichDe(cumDam[0])}".`,
      'Bỏ in đậm, chỉ để nhãn "Câu 1.", "A." đậm. Nhấn mạnh một hai từ thì vẫn được.');
  }

  if (RE_THE_HTML.test(moiThu)) {
    them('conTheHTML', 'thamMy', 'loi',
      'Còn thẻ HTML trong nội dung (<br>, &nbsp;…), in ra Word thành chữ thô.',
      'Xoá thẻ, xuống dòng bằng phím Enter.');
  }

  if (RE_CHO_HINH.test(moiThu)) {
    if (!q.image_url) {
      them('choHinhChuaCoAnh', 'thamMy', 'loi',
        'Đề ghi có hình vẽ nhưng chưa gắn ảnh - in ra học sinh không có gì để nhìn.',
        'Chèn ảnh vào câu, hoặc bỏ chỗ chờ hình nếu không cần.');
    } else {
      them('conChuChoHinh', 'thamMy', 'loi',
        'Đã có ảnh nhưng lời văn vẫn còn chữ [HÌNH VẼ] / [BẢNG BIẾN THIÊN] - in ra thừa chữ.',
        'Xoá cụm chữ đó khỏi đề.');
    }
  }

  if (gonKhoangTrang(de).length < 15) {
    them('deQuaNgan', 'thamMy', 'canhBao',
      'Đề quá ngắn, nghi bị cắt cụt.',
      'Mở câu ra xem còn đủ chữ không.');
  }

  return ra;
}

/* ===================== SOÁT CẢ ĐỀ ===================== */

export interface ChiTieuLoaiSoat { soCau: number; diemMoiCau: number }

export interface DauVaoKiemThu {
  cacPhan: PhanDeThi[];
  /** Chỉ tiêu của khuôn đang chọn, khoá theo loại câu. Bỏ trống thì không soát cấu trúc. */
  chiTieu?: Partial<Record<BankType, ChiTieuLoaiSoat>>;
  /** Điểm từng phần đang tính trên màn hình. */
  diemPhan?: Record<string, number>;
  tenKhuon?: string;
  /** Từng dòng ma trận cần bao nhiêu câu và đang chọn được bao nhiêu. */
  dongMaTran?: { ten: string; can: number; co: number }[];
}

/** Nhãn vị trí của một câu: "Phần II · Câu 3". */
export function nhanViTri(phan: PhanDeThi, viTri: number): string {
  return `Phần ${phan.soLaMa} · Câu ${viTri}`;
}

export function soatCaDe(dv: DauVaoKiemThu): KetQuaKiemThu {
  const loi: LoiKiemThu[] = [];
  const themDe = (
    ma: string, tieuChi: MaTieuChi, muc: MucLoi, moTa: string, cachSua: string,
  ) => loi.push({ ma, tieuChi, muc, viTri: 'Cả đề', moTa, cachSua });

  const tatCaCau: { q: CauDeSoat; viTri: string }[] = [];
  for (const phan of dv.cacPhan) {
    phan.cauHoi.forEach((q: any, i: number) => tatCaCau.push({ q, viTri: nhanViTri(phan, i + 1) }));
  }

  /* ---------- BƯỚC 1: CẤU TRÚC & MA TRẬN ---------- */

  if (dv.chiTieu && Object.keys(dv.chiTieu).length > 0) {
    const demTheoLoai: Partial<Record<BankType, number>> = {};
    for (const phan of dv.cacPhan) demTheoLoai[phan.ma] = phan.cauHoi.length;

    for (const [ma, ct] of Object.entries(dv.chiTieu) as [BankType, ChiTieuLoaiSoat][]) {
      const co = demTheoLoai[ma] || 0;
      if (co !== ct.soCau) {
        themDe('lechSoCau', 'cauTruc', 'loi',
          `Khuôn ${dv.tenKhuon || ''} cần ${ct.soCau} câu loại ${ma}, đề đang có ${co} câu.`,
          co < ct.soCau ? 'Chọn thêm câu cho đủ.' : 'Bỏ bớt câu thừa.');
      }
    }
    for (const [ma, so] of Object.entries(demTheoLoai) as [BankType, number][]) {
      if (so > 0 && !dv.chiTieu[ma]) {
        themDe('loaiThua', 'cauTruc', 'canhBao',
          `Đề có ${so} câu loại ${ma} mà khuôn không có loại này.`,
          'Xem lại khuôn đề hoặc bỏ những câu đó.');
      }
    }
  }

  /* Dòng ma trận nào chưa chọn đủ câu - đề in ra sẽ hụt so với ma trận đã công bố. */
  for (const d of dv.dongMaTran || []) {
    if (d.co < d.can) {
      themDe('thieuCauSoVoiMaTran', 'cauTruc', 'loi',
        `Dạng "${d.ten}" cần ${d.can} câu, mới chọn được ${d.co}.`,
        'Vào lại màn chọn câu bổ sung, hoặc hạ số câu của dòng ma trận đó xuống.');
    }
  }

  const tongDiem = Object.values(dv.diemPhan || {}).reduce((t, x) => t + (Number(x) || 0), 0);
  if (tongDiem > 0 && Math.abs(tongDiem - 10) > 0.001) {
    themDe('tongDiemLech', 'cauTruc', 'loi',
      `Tổng điểm đang là ${tongDiem.toFixed(2).replace('.', ',')} chứ không phải 10,0.`,
      'Chỉnh lại số câu hoặc điểm mỗi câu trong ma trận.');
  }

  /* Mức độ nhận thức: chỉ nhắc khi lệch hẳn, vì mỗi khuôn một tỉ lệ khác nhau. */
  const mucDo: Record<string, number> = {};
  for (const { q } of tatCaCau) {
    const m = chu(q.difficulty).trim() || 'chưa ghi';
    mucDo[m] = (mucDo[m] || 0) + 1;
  }
  if (mucDo['chưa ghi']) {
    themDe('thieuMucDo', 'cauTruc', 'canhBao',
      `${mucDo['chưa ghi']} câu chưa ghi mức độ nhận thức - không soát được tỉ lệ ma trận.`,
      'Đặt mức độ cho các câu đó trong Ngân hàng câu hỏi.');
  }

  /* Câu trùng nhau NGAY TRONG một đề - dùng lại bộ dò đã có, cùng ngưỡng 0,85. */
  const khoa = tatCaCau.map(({ q }) => taoKhoaSoSanh({
    id: q.id || '', content: chu(q.content),
    option_a: chu(q.option_a), option_b: chu(q.option_b),
    option_c: chu(q.option_c), option_d: chu(q.option_d),
  }));
  const daBao = new Set<number>();
  for (let i = 0; i < khoa.length; i++) {
    for (let j = i + 1; j < khoa.length; j++) {
      const diem = doGiongNhau(khoa[i].khuonChu, khoa[j].khuonChu);
      if (diem < NGUONG_NGHI_TRUNG || daBao.has(j)) continue;
      daBao.add(j);
      loi.push({
        ma: 'cauTrungTrongDe', tieuChi: 'cauTruc', muc: 'canhBao',
        viTri: tatCaCau[j].viTri, cauId: tatCaCau[j].q.id,
        moTa: `Giống ${Math.round(diem * 100)}% với ${tatCaCau[i].viTri}.`,
        cachSua: 'Đổi một trong hai câu, hoặc xoá bớt khỏi ngân hàng.',
      });
    }
  }

  /* ---------- BƯỚC 3: SOÁT TỪNG CÂU ---------- */
  for (const { q, viTri } of tatCaCau) loi.push(...soatMotCau(q, viTri));

  /* ---------- CHẤM ĐIỂM ---------- */
  return { ...chamDiem(loi, tatCaCau.length), soCau: tatCaCau.length };
}

/**
 * Chấm điểm chất lượng 0-100 theo bốn trọng số.
 *
 * LỖI trừ nặng và KHÔNG chia theo số câu: một đề tổng điểm 12,0 hay một câu học sinh
 * không điền được đáp án thì dài ngắn gì cũng là đề chưa in được. Chỉ CẢNH BÁO mới chia
 * theo số câu, vì đó là chuyện mức độ chứ không phải chuyện đúng sai. Lời nhắc không trừ.
 */
export function chamDiem(loi: LoiKiemThu[], soCau: number): Omit<KetQuaKiemThu, 'soCau'> {
  const theoTieuChi = {} as KetQuaKiemThu['theoTieuChi'];
  let tong = 0;

  for (const ma of Object.keys(TIEU_CHI) as MaTieuChi[]) {
    const cua = loi.filter(l => l.tieuChi === ma);
    const soLoi = cua.filter(l => l.muc === 'loi').length;
    const soCanhBao = cua.filter(l => l.muc === 'canhBao').length;
    const nhip = Math.max(soCau, 10) / 10;
    const tru = soLoi * 12 + (soCanhBao * 3) / nhip;
    const diem = Math.max(0, Math.round(100 - tru));
    theoTieuChi[ma] = { soLoi, soCanhBao, diem };
    tong += (diem * TIEU_CHI[ma].trong) / 100;
  }

  return { loi, diem: Math.round(tong), theoTieuChi };
}

/**
 * Lời kết luận cho Thầy cô: đề này in được chưa?
 *
 * Con số điểm chỉ để so đề này với đề kia. Thứ Thầy cô cần biết trước khi bấm in là một
 * câu dứt khoát, nên nói thẳng ra đây.
 */
export function loiKetLuan(kq: { loi: LoiKiemThu[] }): { xong: boolean; chu: string } {
  const soLoi = kq.loi.filter(l => l.muc === 'loi').length;
  const soCanhBao = kq.loi.filter(l => l.muc === 'canhBao').length;
  if (soLoi > 0) {
    return { xong: false, chu: `Chưa in được — còn ${soLoi} lỗi phải sửa.` };
  }
  if (soCanhBao > 0) {
    return { xong: true, chu: `In được. Còn ${soCanhBao} chỗ nên xem lại cho đẹp.` };
  }
  return { xong: true, chu: 'Đề sạch — in được.' };
}
