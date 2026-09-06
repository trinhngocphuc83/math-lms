/**
 * LƯỚI TÔ TRÒN của phiếu trả lời - và BẢN ĐỒ TOẠ ĐỘ của chính nó.
 *
 * Vì sao không dựng bằng bảng của Word: muốn đo độ đen từng ô thì máy phải biết tâm mỗi
 * ô nằm đâu, mà vị trí cuối cùng của bảng Word do Word tự tính - mình không biết trước.
 * Nên lưới được VẼ THÀNH ẢNH rồi nhúng vào Word: toạ độ do mình đặt nên mình biết chính
 * xác, và mỗi ảnh tự mang bốn dấu neo riêng ở bốn góc để nắn lại ảnh chụp.
 *
 * Tệp này chia làm hai phần rạch ròi:
 *
 *   1. DỰNG BẢN ĐỒ - `dungLuoi()`: hàm thuần, không đụng canvas, không đụng trình duyệt.
 *      Trả về toạ độ từng ô tròn, từng dấu neo, từng mốc chuẩn. Chạy được ở đâu cũng
 *      được nên KIỂM ĐƯỢC BẰNG MÁY, không phải nhìn mắt.
 *   2. VẼ RA ẢNH - `veLuoi()`: đọc bản đồ rồi tô lên canvas. Chỉ phần này cần trình duyệt.
 *
 * Bộ đọc ảnh (docPhieuQuet.ts) dùng lại ĐÚNG bản đồ ở mục 1, nên hai bên không thể lệch
 * nhau: sửa lưới là bộ đọc tự biết.
 *
 * TỰ CHIA TRANG: đề 22 câu đã cần lưới cao 334mm, quá khổ A4. Nên `dungLuoi` trả về MỘT
 * DÃY trang, mỗi trang một ảnh riêng với bốn dấu neo và mốc chuẩn của riêng nó - chụp
 * trang nào đọc trang ấy, không phụ thuộc trang khác.
 *
 * Khuôn ô theo phiếu thi tốt nghiệp 2025 để học sinh quen tay với tờ giấy kỳ thi thật.
 */

/* ===================== KÍCH THƯỚC ===================== */

/** Số điểm ảnh cho mỗi milimét khi vẽ. Ảnh in ra cỡ 300 dpi nên nét tròn không rỗ. */
export const PX_MOI_MM = 12;
const mm = (x: number) => Math.round(x * PX_MOI_MM);

/**
 * Bề ngang vùng in THẬT của khổ A4: 21cm trừ lề trái 2,5cm và lề phải 2cm = 16,5cm.
 * Trước để 170mm nên ảnh lưới rộng hơn vùng in, Word phải co lại hoặc tràn ra lề.
 */
export const RONG_MM = 165;

/* Cỡ ô và bước nhảy lấy theo khuôn phiếu thi tốt nghiệp: nhỏ và khít, để cả ba phần
   của một đề 40 + 8 + 6 câu nằm gọn trong MỘT TRANG. Bản trước ô 4,5mm bước 7,5mm nên
   một đề 22 câu đã tràn sang trang thứ hai - thầy cô phải in và quét gấp đôi số tờ. */
const BAN_KINH_O_MM = 1.75;          // ô tròn đường kính 3,5mm
const BUOC_NGANG_MM = 5.0;           // tâm hai ô liền nhau cách nhau 5mm
const BUOC_DOC_MM = 5.0;
const BUOC_DOC_TLN_MM = 4.4;         // cột Trả lời ngắn có 12 hàng nên xếp khít hơn nữa
const CANH_NEO_MM = 6;               // dấu neo góc: ô vuông đen đặc 6x6mm - GIỮ NGUYÊN
const LE_MM = 5;                     // lề trong của ảnh lưới
const CAO_DAI_MOC_MM = 11;           // dải đầu ảnh chứa dấu neo và mốc chuẩn

/* ===================== KIỂU DỮ LIỆU ===================== */

/** Một ô tròn để học sinh tô. `ma` là khoá dùng chung giữa bộ vẽ và bộ đọc. */
export interface OTron {
  /** Khoá duy nhất: "NLC:3:B", "DS:2:c:Đ", "TLN:1:0:7". */
  ma: string;
  cau: number;
  /** Chữ in trong ô: A B C D · Đ S · - , 0..9 */
  nhan: string;
  x: number; y: number; r: number;
}

/** Ô vuông đen đặc ở góc, dùng để nắn phẳng ảnh chụp. */
export interface DauNeo { x: number; y: number; canh: number }

/** Mốc chuẩn màu: ô đã tô sẵn 100% (đen) và ô để trắng - xem docPhieuQuet. */
export interface MocChuan { x: number; y: number; r: number }

export interface KhoiPhieu {
  loai: 'NLC' | 'DS' | 'TLN';
  soCau: number;
}

export interface BanDoLuoi {
  /** Trang thứ mấy của lưới, đếm từ 1. */
  trang: number;
  rong: number;
  cao: number;
  neo: DauNeo[];
  mocDen: MocChuan[];
  mocTrang: MocChuan[];
  o: OTron[];
  /** Chữ cần vẽ kèm (nhãn "Câu 1", "a)", tiêu đề phần) - bộ đọc không dùng tới. */
  chu: { x: number; y: number; noiDung: string; co: number; dam?: boolean }[];
  /** Đường kẻ khung cho dễ nhìn - bộ đọc không dùng tới. */
  khung: { x: number; y: number; rong: number; cao: number }[];
}

/* ===================== CỤM: ĐƠN VỊ XẾP TRANG ===================== */

interface VeRa {
  o: OTron[];
  chu: BanDoLuoi['chu'];
  khung: BanDoLuoi['khung'];
}

/**
 * Một mảng nhỏ của lưới, vẽ được ở bất cứ độ cao nào.
 *
 * Chia thành cụm rồi mới xếp trang, chứ không dựng liền một dải rồi cắt ngang: cắt ngang
 * thì một câu có thể bị xẻ làm đôi, nửa trên trang này nửa dưới trang kia.
 */
interface Cum {
  cao: number;
  ve: (y: number) => VeRa;
}

const CHU_SO = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
/** Bốn ô của phần Trả lời ngắn: ô đầu có thêm dấu trừ, ba ô đầu có dấu phẩy. */
const HANG_TLN = ['-', ',', ...CHU_SO];

const TEN_KHOI: Record<KhoiPhieu['loai'], string> = {
  NLC: 'PHẦN I. TRẮC NGHIỆM NHIỀU LỰA CHỌN - tô kín ô tròn bằng bút chì',
  DS: 'PHẦN II. ĐÚNG / SAI - mỗi ý tô một ô',
  TLN: 'PHẦN III. TRẢ LỜI NGẮN - mỗi cột tô một ký tự',
};

/** Cụm tiêu đề của một phần. */
function cumTieuDe(chuTieuDe: string): Cum {
  return {
    cao: mm(8),
    ve: (y) => ({
      o: [], khung: [],
      chu: [{ x: mm(LE_MM), y: y + mm(4), noiDung: chuTieuDe, co: mm(3.6), dam: true }],
    }),
  };
}

/** Cắt danh sách thành từng khúc đều nhau. */
function chiaKhuc<T>(ds: T[], moiKhuc: number): T[][] {
  const ra: T[][] = [];
  for (let i = 0; i < ds.length; i += moiKhuc) ra.push(ds.slice(i, i + moiKhuc));
  return ra;
}

/** Số cột vừa bề ngang cho một khối có bề rộng cột cho trước. */
const soCotVua = (rongCot: number, toiDa: number) =>
  Math.max(1, Math.min(toiDa, Math.floor((mm(RONG_MM) - mm(LE_MM) * 2) / rongCot)));

/**
 * PHẦN I - bốn cột, mỗi cột mười câu, đúng khuôn phiếu thi.
 *
 * Bốn cột chứ không ba: đề 40 câu xếp ba cột thành 14 hàng, xếp bốn cột chỉ còn 10 hàng.
 * Riêng chỗ này đã tiết kiệm được gần 2cm chiều cao.
 */
function cumTracNghiem(soCau: number): Cum[] {
  const r = mm(BAN_KINH_O_MM), buocX = mm(BUOC_NGANG_MM), buocY = mm(BUOC_DOC_MM);
  const rongNhan = mm(7);
  const rongCot = Math.floor((mm(RONG_MM) - mm(LE_MM) * 2) / 4);
  const soCot = 4;
  const soHang = Math.ceil(soCau / soCot);

  /* Hàng tiêu đề A B C D, in một lần trên đầu mỗi cột. */
  const tieuDeCot: Cum = {
    cao: mm(4.5),
    ve: (y) => {
      const chu: BanDoLuoi['chu'] = [];
      for (let c = 0; c < soCot; c++) {
        if (c * soHang >= soCau) break;
        const x0 = mm(LE_MM) + c * rongCot;
        ['A', 'B', 'C', 'D'].forEach((ch, k) => {
          chu.push({ x: x0 + rongNhan + k * buocX + r - mm(0.8), y: y + mm(3), noiDung: ch, co: mm(2.6) });
        });
      }
      return { o: [], chu, khung: [] };
    },
  };

  /* Mỗi cụm là MỘT HÀNG NGANG gồm bốn câu - cắt trang ở đây thì không câu nào bị xẻ. */
  const hang: Cum[] = [];
  for (let h = 0; h < soHang; h++) {
    const cauCuaHang: { cot: number; so: number }[] = [];
    for (let c = 0; c < soCot; c++) {
      const so = c * soHang + h + 1;
      if (so <= soCau) cauCuaHang.push({ cot: c, so });
    }
    hang.push({
      cao: buocY,
      ve: (y) => {
        const o: OTron[] = []; const chu: BanDoLuoi['chu'] = [];
        for (const { cot, so } of cauCuaHang) {
          const x0 = mm(LE_MM) + cot * rongCot;
          const yc = y + r;
          chu.push({ x: x0, y: yc + mm(1), noiDung: String(so), co: mm(2.8), dam: true });
          ['A', 'B', 'C', 'D'].forEach((ch, k) => {
            o.push({ ma: `NLC:${so}:${ch}`, cau: so, nhan: ch,
                     x: x0 + rongNhan + k * buocX + r, y: yc, r });
          });
        }
        return { o, chu, khung: [] };
      },
    });
  }

  /* Khung bao quanh cả phần, vẽ cùng cụm tiêu đề cho khỏi rối. */
  return [tieuDeCot, ...hang];
}

/**
 * PHẦN II - mỗi khối chứa HAI câu đứng cạnh nhau, bốn khối một hàng.
 *
 * Tám câu Đúng/Sai vì thế nằm gọn trong MỘT băng bốn dòng a) b) c) d), thay vì hai băng
 * như bản trước. Đúng khuôn phiếu thi: "Câu 1 | Câu 2" chung một khung.
 */
function cumDungSai(soCau: number): Cum[] {
  const r = mm(BAN_KINH_O_MM), buocX = mm(BUOC_NGANG_MM), buocY = mm(BUOC_DOC_MM);
  const rongNhan = mm(5);
  const rongCot = Math.floor((mm(RONG_MM) - mm(LE_MM) * 2) / 4);
  const soKhoi = Math.ceil(soCau / 2);
  const khoiMoiHang = 4;
  const caoKhoi = mm(8) + buocY * 4;

  const ra: Cum[] = [];
  for (let h = 0; h < Math.ceil(soKhoi / khoiMoiHang); h++) {
    const khoiCuaHang: { cot: number; cauTrai: number }[] = [];
    for (let k = 0; k < khoiMoiHang; k++) {
      const iKhoi = h * khoiMoiHang + k;
      if (iKhoi < soKhoi) khoiCuaHang.push({ cot: k, cauTrai: iKhoi * 2 + 1 });
    }
    ra.push({
      cao: caoKhoi + mm(2.5),
      ve: (y) => {
        const o: OTron[] = []; const chu: BanDoLuoi['chu'] = []; const khung: BanDoLuoi['khung'] = [];
        for (const { cot, cauTrai } of khoiCuaHang) {
          const x0 = mm(LE_MM) + cot * rongCot;
          khung.push({ x: x0 - mm(1), y: y - mm(0.5), rong: rongCot - mm(2.5), cao: caoKhoi });

          [0, 1].forEach(nua => {
            const cau = cauTrai + nua;
            if (cau > soCau) return;
            const xNua = x0 + rongNhan + nua * buocX * 2;
            chu.push({ x: xNua + mm(0.5), y: y + mm(3), noiDung: `Câu ${cau}`, co: mm(2.6), dam: true });
            ['Đúng', 'Sai'].forEach((nh, k) => {
              chu.push({ x: xNua + k * buocX - mm(0.6), y: y + mm(6.5), noiDung: nh, co: mm(2.2) });
            });
            ['a', 'b', 'c', 'd'].forEach((yNho, i2) => {
              const yc = y + mm(8) + i2 * buocY + r;
              if (nua === 0) chu.push({ x: x0, y: yc + mm(1), noiDung: `${yNho})`, co: mm(2.6) });
              ['Đ', 'S'].forEach((ch, k) => {
                o.push({ ma: `DS:${cau}:${yNho}:${ch}`, cau, nhan: ch,
                         x: xNua + k * buocX + r, y: yc, r });
              });
            });
          });
        }
        return { o, chu, khung };
      },
    });
  }
  return ra;
}

/**
 * PHẦN III - sáu khối một hàng, mỗi khối là bốn cột ký tự.
 *
 * Dấu trừ chỉ có ở cột ĐẦU, dấu phẩy chỉ có ở cột hai và cột ba - đúng khuôn phiếu thi,
 * và cũng đúng thực tế: đáp số bốn ký tự thì dấu phẩy không bao giờ rơi vào ô đầu hay ô
 * cuối. Bỏ được hai ô thừa mỗi câu.
 */
function cumTraLoiNgan(soCau: number): Cum[] {
  const r = mm(BAN_KINH_O_MM), buocX = mm(BUOC_NGANG_MM), buocY = mm(BUOC_DOC_TLN_MM);
  const rongNhan = mm(3.6);
  const rongCot = Math.floor((mm(RONG_MM) - mm(LE_MM) * 2) / 6);
  const khoiMoiHang = 6;
  const caoBang = mm(5) + buocY * HANG_TLN.length;

  const ra: Cum[] = [];
  for (let h = 0; h < Math.ceil(soCau / khoiMoiHang); h++) {
    const cauCuaHang: { cot: number; so: number }[] = [];
    for (let k = 0; k < khoiMoiHang; k++) {
      const so = h * khoiMoiHang + k + 1;
      if (so <= soCau) cauCuaHang.push({ cot: k, so });
    }
    ra.push({
      cao: caoBang + mm(3),
      ve: (y) => {
        const o: OTron[] = []; const chu: BanDoLuoi['chu'] = []; const khung: BanDoLuoi['khung'] = [];
        for (const { cot, so } of cauCuaHang) {
          const x0 = mm(LE_MM) + cot * rongCot;
          chu.push({ x: x0, y: y + mm(3), noiDung: `Câu ${so}`, co: mm(2.6), dam: true });
          khung.push({ x: x0 - mm(1), y: y - mm(0.5), rong: rongCot - mm(2), cao: caoBang });

          HANG_TLN.forEach((ky, hg) => {
            const yc = y + mm(5) + hg * buocY + r;
            chu.push({ x: x0, y: yc + mm(1), noiDung: ky, co: mm(2.6) });
            for (let c = 0; c < 4; c++) {
              if (ky === '-' && c !== 0) continue;        // dấu trừ chỉ ở ô đầu
              if (ky === ',' && (c === 0 || c === 3)) continue;  // dấu phẩy chỉ ở ô hai và ba
              o.push({
                /* nhan PHẢI giữ đúng ký tự: bộ đọc lấy chính trường này làm đáp án.
                   Bỏ chữ in trong ô là việc của bộ VẼ, không phải của bản đồ. */
                ma: `TLN:${so}:${c}:${ky}`, cau: so, nhan: ky,
                x: x0 + rongNhan + c * buocX + r, y: yc, r,
              });
            }
          });
        }
        return { o, chu, khung };
      },
    });
  }
  return ra;
}

/* ===================== DỰNG BẢN ĐỒ ===================== */

/**
 * Dựng bản đồ lưới, tự chia trang.
 *
 * @param caoTrangDauMM Chiều cao còn lại của trang ĐẦU - trang này còn bảng thông tin
 *   học sinh và tiêu đề nên hẹp hơn các trang sau.
 */
export function dungLuoi(
  cacKhoi: KhoiPhieu[],
  caoTrangDauMM = 208,
  caoTrangSauMM = 245,
): BanDoLuoi[] {
  /* Xếp mọi khối thành một dãy cụm liên tiếp. */
  const cum: Cum[] = [];
  for (const khoi of cacKhoi) {
    if (khoi.soCau <= 0) continue;
    cum.push(cumTieuDe(TEN_KHOI[khoi.loai]));
    cum.push(...(khoi.loai === 'NLC' ? cumTracNghiem(khoi.soCau)
              : khoi.loai === 'DS' ? cumDungSai(khoi.soCau)
              : cumTraLoiNgan(khoi.soCau)));
  }
  if (cum.length === 0) return [];

  const rong = mm(RONG_MM);
  const le = mm(LE_MM);
  const canhNeo = mm(CANH_NEO_MM);
  const daiMoc = mm(CAO_DAI_MOC_MM);
  const r = mm(BAN_KINH_O_MM);

  const trang: BanDoLuoi[] = [];
  let dangXep: Cum[] = [];
  let caoDangXep = 0;

  const chotTrang = () => {
    if (dangXep.length === 0) return;
    const soTrang = trang.length + 1;
    let y = le + daiMoc;
    const o: OTron[] = []; const chu: BanDoLuoi['chu'] = []; const khung: BanDoLuoi['khung'] = [];
    for (const c of dangXep) {
      const ve = c.ve(y);
      o.push(...ve.o); chu.push(...ve.chu); khung.push(...ve.khung);
      y += c.cao;
    }
    const cao = y + le + canhNeo;

    const neo: DauNeo[] = [
      { x: le, y: le, canh: canhNeo },
      { x: rong - le - canhNeo, y: le, canh: canhNeo },
      { x: rong - le - canhNeo, y: cao - le - canhNeo, canh: canhNeo },
      { x: le, y: cao - le - canhNeo, canh: canhNeo },
    ];
    /* Mốc chuẩn màu: ô ĐÃ TÔ SẴN 100% và ô để trắng, nằm giữa dải đầu ảnh. Bộ đọc lấy
       hai mốc này làm chuẩn đen/trắng cho CHÍNH tờ giấy đó, nên bút chì đậm nhạt, máy
       photo cũ hay đèn vàng đều không làm lệch ngưỡng. */
    const yMoc = le + canhNeo / 2;
    const mocDen: MocChuan[] = [0, 1, 2].map(k => ({ x: rong / 2 - mm(16) + k * mm(9), y: yMoc, r }));
    const mocTrang: MocChuan[] = [0, 1, 2].map(k => ({ x: rong / 2 + mm(6) + k * mm(9), y: yMoc, r }));

    trang.push({ trang: soTrang, rong, cao, neo, mocDen, mocTrang, o, chu, khung });
    dangXep = []; caoDangXep = 0;
  };

  for (const c of cum) {
    const budget = mm(trang.length === 0 ? caoTrangDauMM : caoTrangSauMM) - le * 2 - daiMoc - canhNeo;
    if (caoDangXep + c.cao > budget && dangXep.length > 0) chotTrang();
    dangXep.push(c);
    caoDangXep += c.cao;
  }
  chotTrang();
  return trang;
}

/** Mọi ô tròn của cả phiếu, gộp từ mọi trang - tiện cho việc chấm. */
export const moiOCuaPhieu = (trang: BanDoLuoi[]): OTron[] => trang.flatMap(t => t.o);

/* ===================== VẼ RA ẢNH ===================== */

/**
 * Vẽ bản đồ của MỘT trang lên canvas. Chỉ hàm này cần trình duyệt.
 *
 * @param nen Ngữ cảnh vẽ 2D đã có sẵn kích thước bằng luoi.rong × luoi.cao.
 */
export function veLuoi(nen: CanvasRenderingContext2D, luoi: BanDoLuoi): void {
  nen.fillStyle = '#ffffff';
  nen.fillRect(0, 0, luoi.rong, luoi.cao);

  /* Khung nhạt cho dễ nhìn - bộ đọc không nhìn tới. */
  nen.strokeStyle = '#c8d0dc';
  nen.lineWidth = Math.max(1, mm(0.25));
  for (const k of luoi.khung) nen.strokeRect(k.x, k.y, k.rong, k.cao);

  nen.fillStyle = '#000000';
  for (const n of luoi.neo) nen.fillRect(n.x, n.y, n.canh, n.canh);
  for (const m of luoi.mocDen) {
    nen.beginPath(); nen.arc(m.x, m.y, m.r, 0, Math.PI * 2); nen.fill();
  }
  /* Mốc trắng chỉ có viền, ruột để trắng tinh. */
  nen.strokeStyle = '#000000';
  nen.lineWidth = Math.max(1, mm(0.3));
  for (const m of luoi.mocTrang) {
    nen.beginPath(); nen.arc(m.x, m.y, m.r, 0, Math.PI * 2); nen.stroke();
  }

  /* Ô tô: viền tròn, giữa in chữ mờ để học sinh biết đang tô ô nào. */
  nen.textAlign = 'center';
  nen.textBaseline = 'middle';
  /* Ô nay nhỏ hơn nên KHÔNG in chữ vào trong nữa: chữ chen trong ô 3,5mm vừa khó đọc
     vừa làm ô trông như đã tô. Nhãn đã nằm ở đầu hàng và đầu cột rồi. */
  for (const x of luoi.o) {
    nen.beginPath(); nen.arc(x.x, x.y, x.r, 0, Math.PI * 2); nen.stroke();
  }

  nen.fillStyle = '#1f2937';
  nen.textAlign = 'left';
  for (const c of luoi.chu) {
    nen.font = `${c.dam ? 'bold ' : ''}${c.co}px Arial`;
    nen.fillText(c.noiDung, c.x, c.y);
  }
}

/** Vẽ một trang lưới rồi trả về ảnh PNG - dùng để nhúng vào tệp Word. */
export async function anhLuoiPNG(luoi: BanDoLuoi): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = luoi.rong;
  canvas.height = luoi.cao;
  const nen = canvas.getContext('2d');
  if (!nen) throw new Error('Trình duyệt không dựng được canvas để vẽ lưới tô tròn.');
  veLuoi(nen, luoi);

  const blob: Blob = await new Promise((ok, hong) =>
    canvas.toBlob(b => (b ? ok(b) : hong(new Error('Không xuất được ảnh lưới.'))), 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}
