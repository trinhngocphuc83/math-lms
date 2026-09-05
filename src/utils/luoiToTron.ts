/**
 * LƯỚI TÔ TRÒN của phiếu trả lời - và BẢN ĐỒ TOẠ ĐỘ của chính nó.
 *
 * Vì sao không dựng bằng bảng của Word: muốn đo độ đen từng ô thì máy phải biết tâm mỗi
 * ô nằm đâu, mà vị trí cuối cùng của bảng Word do Word tự tính - mình không biết trước.
 * Nên lưới được VẼ THÀNH MỘT ẢNH rồi nhúng vào Word: toạ độ do mình đặt nên mình biết
 * chính xác, và ảnh tự mang bốn dấu neo riêng ở bốn góc để nắn lại ảnh chụp.
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
const CANH_NEO_MM = 6;               // dấu neo góc: ô vuông đen đặc 6x6mm
const LE_MM = 6;                     // lề trong của ảnh lưới

/* ===================== KIỂU DỮ LIỆU ===================== */

/** Một ô tròn để học sinh tô. `ma` là khoá dùng chung giữa bộ vẽ và bộ đọc. */
export interface OTron {
  /** Khoá duy nhất: "NLC:3:B", "DS:2:c:D", "TLN:1:0:7". */
  ma: string;
  /** Câu số mấy (đánh theo từng phần, đúng như bản in đề). */
  cau: number;
  /** Chữ in trong ô: A B C D · Đ S · - , 0..9 */
  nhan: string;
  x: number; y: number; r: number;
}

/** Ô vuông đen đặc ở góc, dùng để nắn phẳng ảnh chụp. */
export interface DauNeo { x: number; y: number; canh: number }

/** Mốc chuẩn màu: ô đã tô sẵn 100% (đen) và vùng để trắng - xem docPhieuQuet. */
export interface MocChuan { x: number; y: number; r: number }

export interface KhoiPhieu {
  loai: 'NLC' | 'DS' | 'TLN';
  soCau: number;
}

export interface BanDoLuoi {
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

/* ===================== DỰNG BẢN ĐỒ ===================== */

const CHU_SO = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
/** Bốn ô của phần Trả lời ngắn: ô đầu có thêm dấu trừ, ba ô đầu có dấu phẩy. */
const HANG_TLN = ['-', ',', ...CHU_SO];

/**
 * Dựng bản đồ lưới cho một danh sách khối.
 *
 * Xếp theo chiều dọc, khối nào có câu thì mới có khối ấy - đề toàn trắc nghiệm ra lưới
 * chỉ có phần trắc nghiệm, không chừa chỗ trống vô ích.
 */
export function dungLuoi(cacKhoi: KhoiPhieu[]): BanDoLuoi {
  const o: OTron[] = [];
  const chu: BanDoLuoi['chu'] = [];
  const khung: BanDoLuoi['khung'] = [];

  const rong = mm(RONG_MM);
  const le = mm(LE_MM);
  const r = mm(BAN_KINH_O_MM);
  const buocX = mm(BUOC_NGANG_MM);
  const buocY = mm(BUOC_DOC_MM);
  const canhNeo = mm(CANH_NEO_MM);

  /* Chừa chỗ cho dấu neo và dải mốc chuẩn ở đầu ảnh. */
  let y = le + canhNeo + mm(6);

  const tieuDe = (t: string) => {
    chu.push({ x: le, y: y + mm(3), noiDung: t, co: mm(3.6), dam: true });
    y += mm(7);
  };

  for (const khoi of cacKhoi) {
    if (khoi.soCau <= 0) continue;

    if (khoi.loai === 'NLC') {
      tieuDe('PHẦN I. TRẮC NGHIỆM NHIỀU LỰA CHỌN');
      /* Mỗi cột: nhãn "Câu n" rồi bốn ô A B C D. Chia cột sao cho vừa bề ngang. */
      const rongNhan = mm(13);
      const rongCot = rongNhan + buocX * 4;
      const soCot = Math.max(1, Math.min(3, Math.floor((rong - le * 2) / rongCot)));
      const soHang = Math.ceil(khoi.soCau / soCot);
      const dauKhoi = y;

      for (let i = 0; i < khoi.soCau; i++) {
        const cot = Math.floor(i / soHang);
        const hang = i % soHang;
        const x0 = le + cot * rongCot;
        const yc = dauKhoi + hang * buocY + r;
        chu.push({ x: x0, y: yc + mm(1.2), noiDung: `Câu ${i + 1}`, co: mm(3) });
        ['A', 'B', 'C', 'D'].forEach((ch, k) => {
          o.push({ ma: `NLC:${i + 1}:${ch}`, cau: i + 1, nhan: ch,
                   x: x0 + rongNhan + k * buocX + r, y: yc, r });
        });
      }
      y = dauKhoi + soHang * buocY + mm(4);
      khung.push({ x: le - mm(2), y: dauKhoi - mm(2), rong: rong - le * 2 + mm(4), cao: y - dauKhoi });
      y += mm(4);
      continue;
    }

    if (khoi.loai === 'DS') {
      tieuDe('PHẦN II. ĐÚNG / SAI');
      /* Mỗi câu một khối bốn dòng a) b) c) d), mỗi dòng hai ô Đ và S. */
      const rongNhan = mm(13);
      const rongY = mm(6);
      const rongCot = rongNhan + rongY + buocX * 2 + mm(4);
      const soCot = Math.max(1, Math.min(4, Math.floor((rong - le * 2) / rongCot)));
      const soHangKhoi = Math.ceil(khoi.soCau / soCot);
      const caoKhoi = buocY * 4;
      const dauKhoi = y;

      for (let i = 0; i < khoi.soCau; i++) {
        const cot = Math.floor(i / soHangKhoi);
        const hang = i % soHangKhoi;
        const x0 = le + cot * rongCot;
        const y0 = dauKhoi + hang * (caoKhoi + mm(3));
        chu.push({ x: x0, y: y0 + mm(3), noiDung: `Câu ${i + 1}`, co: mm(3), dam: true });
        ['a', 'b', 'c', 'd'].forEach((yNho, k) => {
          const yc = y0 + k * buocY + r + mm(2);
          chu.push({ x: x0 + rongNhan, y: yc + mm(1.2), noiDung: `${yNho})`, co: mm(3) });
          ['Đ', 'S'].forEach((ch, j) => {
            o.push({ ma: `DS:${i + 1}:${yNho}:${ch}`, cau: i + 1, nhan: ch,
                     x: x0 + rongNhan + rongY + j * buocX + r, y: yc, r });
          });
        });
      }
      y = dauKhoi + soHangKhoi * (caoKhoi + mm(3)) + mm(4);
      khung.push({ x: le - mm(2), y: dauKhoi - mm(2), rong: rong - le * 2 + mm(4), cao: y - dauKhoi });
      y += mm(4);
      continue;
    }

    /* TLN: mỗi câu một bảng bốn cột, mỗi cột tô một ký tự. Dấu trừ chỉ có ở cột đầu,
       dấu phẩy không có ở cột cuối - đúng khuôn phiếu thi tốt nghiệp. */
    tieuDe('PHẦN III. TRẢ LỜI NGẮN');
    const rongBang = buocX * 4 + mm(2);
    const soCot = Math.max(1, Math.floor((rong - le * 2) / (rongBang + mm(6))));
    const soHangKhoi = Math.ceil(khoi.soCau / soCot);
    const caoBang = buocY * HANG_TLN.length + mm(6);
    const dauKhoi = y;

    for (let i = 0; i < khoi.soCau; i++) {
      const cot = i % soCot;
      const hang = Math.floor(i / soCot);
      const x0 = le + cot * (rongBang + mm(6));
      const y0 = dauKhoi + hang * (caoBang + mm(4));
      chu.push({ x: x0, y: y0 + mm(3), noiDung: `Câu ${i + 1}`, co: mm(3), dam: true });
      for (let c = 0; c < 4; c++) {
        HANG_TLN.forEach((ky, h) => {
          if (ky === '-' && c !== 0) return;          // dấu trừ chỉ ở ô đầu
          if (ky === ',' && c === 3) return;          // ô cuối không có dấu phẩy
          const xc = x0 + c * buocX + r;
          const yc = y0 + mm(5) + h * buocY + r;
          o.push({ ma: `TLN:${i + 1}:${c}:${ky}`, cau: i + 1, nhan: ky, x: xc, y: yc, r });
        });
      }
      khung.push({ x: x0 - mm(1), y: y0 + mm(4), rong: rongBang, cao: caoBang - mm(2) });
    }
    y = dauKhoi + soHangKhoi * (caoBang + mm(4)) + mm(4);
  }

  const cao = y + canhNeo + le;

  /* Bốn dấu neo góc - bộ đọc tìm chúng để nắn phẳng ảnh chụp. */
  const neo: DauNeo[] = [
    { x: le, y: le, canh: canhNeo },
    { x: rong - le - canhNeo, y: le, canh: canhNeo },
    { x: rong - le - canhNeo, y: cao - le - canhNeo, canh: canhNeo },
    { x: le, y: cao - le - canhNeo, canh: canhNeo },
  ];

  /* Mốc chuẩn màu: ba ô ĐÃ TÔ SẴN 100% và ba vùng để trắng, nằm trên dải đầu ảnh.
     Bộ đọc lấy hai mốc này làm chuẩn đen/trắng cho CHÍNH tờ giấy đó, nên bút chì đậm
     nhạt, máy photo cũ hay đèn vàng đều không làm lệch ngưỡng. */
  const yMoc = le + canhNeo / 2;
  const mocDen: MocChuan[] = [0, 1, 2].map(k => ({ x: rong / 2 - mm(14) + k * mm(9), y: yMoc, r }));
  const mocTrang: MocChuan[] = [0, 1, 2].map(k => ({ x: rong / 2 + mm(6) + k * mm(9), y: yMoc, r }));

  return { rong, cao, neo, mocDen, mocTrang, o, chu, khung };
}

/* ===================== VẼ RA ẢNH ===================== */

/**
 * Vẽ bản đồ lên canvas. Chỉ hàm này cần trình duyệt.
 *
 * @param nen Ngữ cảnh vẽ 2D đã có sẵn kích thước bằng luoi.rong × luoi.cao.
 */
export function veLuoi(nen: CanvasRenderingContext2D, luoi: BanDoLuoi): void {
  nen.fillStyle = '#ffffff';
  nen.fillRect(0, 0, luoi.rong, luoi.cao);

  /* Khung nhạt cho dễ nhìn - không ảnh hưởng gì tới việc đọc. */
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

/** Vẽ lưới rồi trả về ảnh PNG - dùng để nhúng vào tệp Word. */
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
