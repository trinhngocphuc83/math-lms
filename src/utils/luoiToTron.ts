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

/** Bề ngang vùng in của khổ A4 sau khi trừ lề - khớp với BE_NGANG_IN của mauDeThi. */
export const RONG_MM = 170;

const BAN_KINH_O_MM = 2.25;          // ô tròn đường kính 4,5mm - vừa đầu bút chì 2B
const BUOC_NGANG_MM = 7.5;           // tâm hai ô liền nhau cách nhau 7,5mm
const BUOC_DOC_MM = 7.5;
const BUOC_DOC_TLN_MM = 6.2;         // cột Trả lời ngắn có 12 hàng nên xếp khít hơn
const CANH_NEO_MM = 6;               // dấu neo góc: ô vuông đen đặc 6x6mm
const LE_MM = 6;                     // lề trong của ảnh lưới
const CAO_DAI_MOC_MM = 12;           // dải đầu ảnh chứa dấu neo và mốc chuẩn

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

function cumTracNghiem(soCau: number): Cum[] {
  const r = mm(BAN_KINH_O_MM), buocX = mm(BUOC_NGANG_MM), buocY = mm(BUOC_DOC_MM);
  const rongNhan = mm(13);
  const rongCot = rongNhan + buocX * 4 + mm(4);
  const soCot = soCotVua(rongCot, 3);

  /* Mỗi cụm là MỘT HÀNG NGANG gồm `soCot` câu - cắt trang ở đây thì không câu nào bị xẻ. */
  return chiaKhuc(Array.from({ length: soCau }, (_, i) => i + 1), soCot).map(khuc => ({
    cao: buocY,
    ve: (y) => {
      const o: OTron[] = []; const chu: BanDoLuoi['chu'] = [];
      khuc.forEach((cau, k) => {
        const x0 = mm(LE_MM) + k * rongCot;
        const yc = y + r;
        chu.push({ x: x0, y: yc + mm(1.2), noiDung: `Câu ${cau}`, co: mm(3) });
        ['A', 'B', 'C', 'D'].forEach((ch, j) => {
          o.push({ ma: `NLC:${cau}:${ch}`, cau, nhan: ch, x: x0 + rongNhan + j * buocX + r, y: yc, r });
        });
      });
      return { o, chu, khung: [] };
    },
  }));
}

function cumDungSai(soCau: number): Cum[] {
  const r = mm(BAN_KINH_O_MM), buocX = mm(BUOC_NGANG_MM), buocY = mm(BUOC_DOC_MM);
  const rongNhan = mm(13), rongY = mm(6);
  const rongCot = rongNhan + rongY + buocX * 2 + mm(5);
  const soCot = soCotVua(rongCot, 4);
  const caoKhoi = buocY * 4 + mm(5);

  return chiaKhuc(Array.from({ length: soCau }, (_, i) => i + 1), soCot).map(khuc => ({
    cao: caoKhoi + mm(3),
    ve: (y) => {
      const o: OTron[] = []; const chu: BanDoLuoi['chu'] = []; const khung: BanDoLuoi['khung'] = [];
      khuc.forEach((cau, k) => {
        const x0 = mm(LE_MM) + k * rongCot;
        chu.push({ x: x0, y: y + mm(3.5), noiDung: `Câu ${cau}`, co: mm(3), dam: true });
        khung.push({ x: x0 - mm(1), y: y - mm(1), rong: rongCot - mm(3), cao: caoKhoi });
        ['a', 'b', 'c', 'd'].forEach((yNho, i) => {
          const yc = y + mm(5) + i * buocY + r;
          chu.push({ x: x0 + rongNhan, y: yc + mm(1.2), noiDung: `${yNho})`, co: mm(3) });
          ['Đ', 'S'].forEach((ch, j) => {
            o.push({ ma: `DS:${cau}:${yNho}:${ch}`, cau, nhan: ch,
                     x: x0 + rongNhan + rongY + j * buocX + r, y: yc, r });
          });
        });
      });
      return { o, chu, khung };
    },
  }));
}

function cumTraLoiNgan(soCau: number): Cum[] {
  const r = mm(BAN_KINH_O_MM), buocX = mm(BUOC_NGANG_MM), buocY = mm(BUOC_DOC_TLN_MM);
  const rongBang = buocX * 4 + mm(3);
  const rongCot = rongBang + mm(7);
  const soCot = soCotVua(rongCot, 5);
  const caoBang = buocY * HANG_TLN.length + mm(7);

  return chiaKhuc(Array.from({ length: soCau }, (_, i) => i + 1), soCot).map(khuc => ({
    cao: caoBang + mm(4),
    ve: (y) => {
      const o: OTron[] = []; const chu: BanDoLuoi['chu'] = []; const khung: BanDoLuoi['khung'] = [];
      khuc.forEach((cau, k) => {
        const x0 = mm(LE_MM) + k * rongCot;
        chu.push({ x: x0, y: y + mm(3.5), noiDung: `Câu ${cau}`, co: mm(3), dam: true });
        khung.push({ x: x0 - mm(1.5), y: y + mm(4.5), rong: rongBang, cao: caoBang - mm(4) });
        for (let c = 0; c < 4; c++) {
          HANG_TLN.forEach((ky, h) => {
            if (ky === '-' && c !== 0) return;          // dấu trừ chỉ ở ô đầu
            if (ky === ',' && c === 3) return;          // ô cuối không có dấu phẩy
            o.push({
              ma: `TLN:${cau}:${c}:${ky}`, cau, nhan: ky,
              x: x0 + c * buocX + r, y: y + mm(6) + h * buocY + r, r,
            });
          });
        }
      });
      return { o, chu, khung };
    },
  }));
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
  caoTrangDauMM = 165,
  caoTrangSauMM = 235,
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
  for (const x of luoi.o) {
    nen.beginPath(); nen.arc(x.x, x.y, x.r, 0, Math.PI * 2); nen.stroke();
    nen.fillStyle = '#9aa4b2';
    nen.font = `${Math.round(x.r * 1.05)}px Arial`;
    nen.fillText(x.nhan, x.x, x.y + 1);
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
