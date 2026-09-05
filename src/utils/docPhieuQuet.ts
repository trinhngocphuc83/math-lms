/**
 * ĐỌC LƯỚI TÔ TRÒN TỪ ẢNH CHỤP PHIẾU TRẢ LỜI.
 *
 * Không dùng AI: đo độ đen bằng hình học thuần nên không tốn khoá, chạy tức thì, và
 * chạy lại bao nhiêu lần cũng ra một kết quả.
 *
 * Đường đi:
 *   1. Chuyển ảnh sang xám, tìm ngưỡng bằng phép Otsu.
 *   2. Tìm BỐN DẤU NEO - bốn ô vuông đen đặc mà luoiToTron đã in ở bốn góc lưới.
 *   3. Dựng phép nắn phối cảnh từ bốn dấu ấy: ảnh chụp nghiêng, méo, xa gần đều nắn về
 *      đúng hệ toạ độ của bản đồ lưới.
 *   4. Đo độ đen từng ô tròn tại đúng tâm mà bản đồ chỉ ra.
 *   5. HIỆU CHỈNH NGƯỠNG THEO CHÍNH TỜ GIẤY ĐÓ bằng mốc đen và mốc trắng in sẵn - bút
 *      chì đậm nhạt, máy photo cũ, đèn vàng đều không làm lệch.
 *
 * NGUYÊN TẮC: KHÔNG ĐOÁN. Ô mờ, tô hai ô, tẩy chưa sạch - đều trả về "không chắc" để
 * thầy cô nhìn, chứ không chọn bừa cái đậm hơn. Thà bắt nhìn ba ô còn hơn chấm sai một ô.
 */

import type { BanDoLuoi, OTron } from './luoiToTron';

/** Ảnh thô - hợp với cả ImageData của trình duyệt lẫn bộ đệm dựng trong phép kiểm. */
export interface AnhTho {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export interface DoODoc {
  ma: string;
  /** Độ đen đã chuẩn hoá theo mốc của chính tờ giấy: 0 là trắng giấy, 1 là mực in đặc. */
  dam: number;
}

export interface KetQuaDocPhieu {
  /** Không tìm đủ bốn dấu neo thì mọi thứ sau đó vô nghĩa. */
  timDuocNeo: boolean;
  loi?: string;
  /** Bốn dấu neo tìm được, theo thứ tự trái-trên, phải-trên, phải-dưới, trái-dưới. */
  neo?: { x: number; y: number }[];
  o: DoODoc[];
  /** Đáp án đọc được, theo mã câu: "NLC:3" -> "B", "DS:2:c" -> "Đ", "TLN:1" -> "-0,8". */
  traLoi: Record<string, string>;
  /** Câu máy KHÔNG DÁM đọc, kèm lý do - thầy cô phải nhìn. */
  khongChac: { ma: string; viSao: string }[];
}

/* ===================== ẢNH XÁM & NGƯỠNG ===================== */

function anhXam(anh: AnhTho): Float32Array {
  const { data, width, height } = anh;
  const ra = new Float32Array(width * height);
  for (let i = 0, k = 0; k < ra.length; i += 4, k++) {
    /* Trọng số mắt người - chữ bút chì xanh hay đen đều ra xám như nhau. */
    ra[k] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
  }
  return ra;
}

/**
 * Nền giấy cục bộ: trung bình xám trong một ô vuông rộng quanh mỗi điểm.
 *
 * Vì sao không dùng một ngưỡng chung cho cả ảnh: chụp bằng điện thoại thì một góc bao giờ
 * cũng tối hơn góc kia - bóng bàn tay, đèn trần lệch, giấy cong. Ngưỡng chung sẽ coi cả
 * góc tối là "mực" và góc sáng là "giấy". Lấy nền ngay quanh từng điểm thì hết bệnh đó.
 *
 * Dùng ảnh tích phân nên chỉ quét một lượt, cỡ ảnh nào cũng nhanh.
 */
function nenCucBo(xam: Float32Array, rong: number, cao: number): Float32Array {
  const cong = new Float64Array((rong + 1) * (cao + 1));
  for (let y = 0; y < cao; y++) {
    let hang = 0;
    for (let x = 0; x < rong; x++) {
      hang += xam[y * rong + x];
      cong[(y + 1) * (rong + 1) + x + 1] = cong[y * (rong + 1) + x + 1] + hang;
    }
  }
  const nua = Math.max(8, Math.round(Math.min(rong, cao) / 12));
  const ra = new Float32Array(rong * cao);
  for (let y = 0; y < cao; y++) {
    const y0 = Math.max(0, y - nua), y1 = Math.min(cao - 1, y + nua);
    for (let x = 0; x < rong; x++) {
      const x0 = Math.max(0, x - nua), x1 = Math.min(rong - 1, x + nua);
      const tong = cong[(y1 + 1) * (rong + 1) + x1 + 1] - cong[y0 * (rong + 1) + x1 + 1]
                 - cong[(y1 + 1) * (rong + 1) + x0] + cong[y0 * (rong + 1) + x0];
      ra[y * rong + x] = tong / ((y1 - y0 + 1) * (x1 - x0 + 1));
    }
  }
  return ra;
}

/* ===================== TÌM BỐN DẤU NEO ===================== */

interface Vung { x: number; y: number; so: number; x0: number; y0: number; x1: number; y1: number }

/** Gom các điểm tối liền nhau thành từng vùng (quét theo hàng, hợp nhất bằng union-find). */
function cacVungToi(xam: Float32Array, rong: number, cao: number, nen: Float32Array): Vung[] {
  /* Tối = đậm hơn hẳn nền giấy NGAY QUANH nó, chứ không so với một con số chung. */
  const toi = (i: number) => xam[i] < nen[i] - 0.16 && xam[i] < 0.72;
  const nhan = new Int32Array(rong * cao).fill(-1);
  const cha: number[] = [];
  const tim = (a: number): number => { while (cha[a] !== a) { cha[a] = cha[cha[a]]; a = cha[a]; } return a; };
  const hop = (a: number, b: number) => { const ra = tim(a), rb = tim(b); if (ra !== rb) cha[rb] = ra; };

  for (let y = 0; y < cao; y++) {
    for (let x = 0; x < rong; x++) {
      const i = y * rong + x;
      if (!toi(i)) continue;
      const trai = x > 0 && toi(i - 1) ? nhan[i - 1] : -1;
      const tren = y > 0 && toi(i - rong) ? nhan[i - rong] : -1;
      if (trai === -1 && tren === -1) { cha.push(cha.length); nhan[i] = cha.length - 1; }
      else if (trai === -1) nhan[i] = tren;
      else if (tren === -1) nhan[i] = trai;
      else { nhan[i] = trai; if (trai !== tren) hop(trai, tren); }
    }
  }

  const bang = new Map<number, Vung>();
  for (let y = 0; y < cao; y++) {
    for (let x = 0; x < rong; x++) {
      const i = y * rong + x;
      if (nhan[i] === -1) continue;
      const g = tim(nhan[i]);
      const v = bang.get(g);
      if (!v) bang.set(g, { x, y, so: 1, x0: x, y0: y, x1: x, y1: y });
      else {
        v.x += x; v.y += y; v.so++;
        if (x < v.x0) v.x0 = x; if (x > v.x1) v.x1 = x;
        if (y < v.y0) v.y0 = y; if (y > v.y1) v.y1 = y;
      }
    }
  }
  return [...bang.values()].map(v => ({ ...v, x: v.x / v.so, y: v.y / v.so }));
}

/**
 * Bốn dấu neo: ô vuông ĐẶC, gần vuông, và to hơn hẳn ô tròn.
 *
 * Lọc theo hình dạng chứ không theo vị trí: ảnh chụp có thể lệch nhiều, mà giấy còn có
 * chữ đen của đề bài lẫn vào, nên phải chọn bằng đặc điểm riêng của dấu neo.
 */
type KetQuaTimNeo = { boNeo: { x: number; y: number }[][] } | { viSao: string };

/** Bốn góc của một nhóm ứng viên: cực trị của x+y và x-y nên không sợ ảnh nghiêng. */
function bonGocCua(nhom: Vung[]): Vung[] | null {
  if (nhom.length < 4) return null;
  const chon = (f: (v: Vung) => number) => nhom.reduce((a, b) => (f(b) < f(a) ? b : a));
  const bon = [chon(v => v.x + v.y), chon(v => -(v.x - v.y)),
               chon(v => -(v.x + v.y)), chon(v => v.x - v.y)];
  return new Set(bon.map(v => `${Math.round(v.x)},${Math.round(v.y)}`)).size === 4 ? bon : null;
}

/** Bốn dấu có làm thành khung giống khung lưới đã in không. */
function khungHopLe(bon: Vung[], rong: number, cao: number, tiLeLuoi: number): boolean {
  const dt = bon.map(v => (v.x1 - v.x0 + 1) * (v.y1 - v.y0 + 1));
  if (Math.max(...dt) / Math.min(...dt) > 2.2) return false;

  const bx = bon.map(v => v.x), by = bon.map(v => v.y);
  const spanX = Math.max(...bx) - Math.min(...bx);
  const spanY = Math.max(...by) - Math.min(...by);
  if (spanX < rong * 0.12 || spanY < cao * 0.12) return false;

  const tiLeThay = spanX / Math.max(1, spanY);
  if (tiLeThay < tiLeLuoi * 0.6 || tiLeThay > tiLeLuoi * 1.65) return false;

  const dai = (a: Vung, b: Vung) => Math.hypot(a.x - b.x, a.y - b.y);
  const canh = [dai(bon[0], bon[1]), dai(bon[1], bon[2]), dai(bon[2], bon[3]), dai(bon[3], bon[0])];
  const lech = (a: number, b: number) => Math.abs(a - b) / Math.max(a, b, 1);
  if (lech(canh[0], canh[2]) > 0.45 || lech(canh[1], canh[3]) > 0.45) return false;

  const dienTich = Math.abs(bon.reduce((s, q, i) => {
    const r = bon[(i + 1) % 4];
    return s + (q.x * r.y - r.x * q.y);
  }, 0) / 2);
  return dienTich >= spanX * spanY * 0.45;
}

function timDauNeo(vung: Vung[], rong: number, cao: number, tiLeLuoi: number): KetQuaTimNeo {
  /* Cỡ dấu neo đo bằng ĐIỂM ẢNH THẬT, không theo bề ngang ảnh: Thầy cô chụp lùi xa thì
     tờ giấy nhỏ đi trong khung hình, lấy ngưỡng theo bề ngang ảnh là loại oan cả bốn dấu. */
  const canhToiThieu = 5;
  const canhToiDa = Math.min(rong, cao) * 0.15;
  let ungVien = vung.filter(v => {
    const w = v.x1 - v.x0 + 1, h = v.y1 - v.y0 + 1;
    if (w < canhToiThieu || h < canhToiThieu) return false;
    if (w > canhToiDa || h > canhToiDa) return false;
    const tiLe = w / h;
    if (tiLe < 0.72 || tiLe > 1.38) return false;
    /* Đặc ruột, không phải chữ hay ô tròn rỗng. Ngưỡng 0,52 chứ không phải 0,72: ẢNH
       CHỤP NGHIÊNG thì khung bao của một ô vuông nở ra, tỉ lệ đặc tụt xuống dù ô vẫn
       đen kín - xoay 12° đã còn 0,71, xoay 25° còn 0,57. Lấy 0,72 là tự loại mất chính
       bốn dấu neo mình vừa in ra. */
    return v.so / (w * h) > 0.52;
  });
  if (ungVien.length < 4) {
    return { viSao: 'khong thay du bon o vuong den o goc luoi' };
  }

  /* Dấu neo là những ô vuông đặc TO NHẤT trên tờ giấy. Giữ lại vài chục cái to nhất rồi
     mới đi tìm bốn góc - khỏi vớ phải một dấu chấm câu nằm lọt ngoài rìa. */
  ungVien = ungVien
    .sort((a, b) => b.so - a.so)
    .slice(0, 30);

  /* Trên tờ giấy thật còn có MÃ QR, mà ba ô vuông định vị của nó to gần bằng dấu neo
     (6,3mm so với 6mm) - lấy cực trị trên cả đống là bắt nhầm chúng làm góc lưới, cả
     trang thành không đọc được. Nên gom ứng viên thành từng NHÓM CÙNG CỠ rồi thử từng
     nhóm; chốt mốc chuẩn ở docPhieuQuet sẽ loại nhóm sai. */
  const theoCo = [...ungVien].sort((a, b) => b.so - a.so);
  const nhom: Vung[][] = [];
  for (const v of theoCo) {
    const cuoi = nhom[nhom.length - 1];
    if (cuoi && cuoi[0].so / v.so <= 1.7) cuoi.push(v);
    else nhom.push([v]);
  }
  /* Thử từng nhóm cùng cỡ trước, rồi mới thử gộp cả đống - phòng khi dấu neo bị chia
     nhầm sang hai nhóm vì ảnh mờ. */
  const boNeo: { x: number; y: number }[][] = [];
  for (const n of [...nhom, ungVien]) {
    const bon = bonGocCua(n);
    if (!bon || !khungHopLe(bon, rong, cao, tiLeLuoi)) continue;
    const diem = bon.map(v => ({ x: v.x, y: v.y }));
    if (!boNeo.some(cu => cu.every((c, k) => Math.abs(c.x - diem[k].x) < 2 && Math.abs(c.y - diem[k].y) < 2))) {
      boNeo.push(diem);
    }
  }
  if (boNeo.length === 0) {
    return { viSao: 'không nhóm nào làm thành khung giống khung lưới đã in' };
  }
  return { boNeo };
}

/**
 * Soi xem máy nhìn thấy gì khi tìm dấu neo.
 *
 * Ảnh không đọc được thì phải nói rõ vì sao, chứ báo chung chung "chụp lại đi" là Thầy cô
 * chụp lại mười lần vẫn hỏng. Màn soát dùng hàm này để vẽ đè bốn dấu máy bắt được lên ảnh.
 */
export function chanDoanNeo(anh: AnhTho, luoi: BanDoLuoi): {
  soVungToi: number; soUngVien: number; soBo?: number;
  bon?: { x: number; y: number }[]; viSao?: string;
} {
  const xam = anhXam(anh);
  const vung = cacVungToi(xam, anh.width, anh.height, nenCucBo(xam, anh.width, anh.height));
  const canhToiDa = Math.min(anh.width, anh.height) * 0.15;
  const soUngVien = vung.filter(v => {
    const w = v.x1 - v.x0 + 1, h = v.y1 - v.y0 + 1;
    return w >= 5 && h >= 5 && w <= canhToiDa && h <= canhToiDa
      && w / h >= 0.72 && w / h <= 1.38 && v.so / (w * h) > 0.52;
  }).length;
  const kq = timDauNeo(vung, anh.width, anh.height, luoi.rong / luoi.cao);
  return {
    soVungToi: vung.length, soUngVien,
    ...('boNeo' in kq ? { soBo: kq.boNeo.length, bon: kq.boNeo[0] } : { viSao: kq.viSao }),
  };
}

/* ===================== NẮN PHỐI CẢNH ===================== */

/**
 * Ma trận nắn từ hệ toạ độ BẢN ĐỒ sang hệ toạ độ ẢNH, dựng từ bốn cặp điểm.
 *
 * Dùng phối cảnh chứ không chỉ xoay: chụp bằng điện thoại thì mép xa bao giờ cũng nhỏ
 * hơn mép gần, xoay đơn thuần không nắn được chỗ đó.
 */
function matranNan(tu: { x: number; y: number }[], den: { x: number; y: number }[]): number[] | null {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = tu[i], { x: u, y: v } = den[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  /* Khử Gauss có chọn trục chính - tám ẩn nên viết thẳng, khỏi kéo thư viện về. */
  const n = 8;
  for (let c = 0; c < n; c++) {
    let tot = c;
    for (let i = c + 1; i < n; i++) if (Math.abs(A[i][c]) > Math.abs(A[tot][c])) tot = i;
    if (Math.abs(A[tot][c]) < 1e-9) return null;
    [A[c], A[tot]] = [A[tot], A[c]];
    [b[c], b[tot]] = [b[tot], b[c]];
    for (let i = 0; i < n; i++) {
      if (i === c) continue;
      const he = A[i][c] / A[c][c];
      if (!he) continue;
      for (let j = c; j < n; j++) A[i][j] -= he * A[c][j];
      b[i] -= he * b[c];
    }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return [...h, 1];
}

const nanDiem = (h: number[], x: number, y: number) => {
  const z = h[6] * x + h[7] * y + h[8];
  return { x: (h[0] * x + h[1] * y + h[2]) / z, y: (h[3] * x + h[4] * y + h[5]) / z };
};

/* ===================== ĐO ĐỘ ĐEN ===================== */

/**
 * Đo một ô: ruột ô đậm bao nhiêu, và NỀN GIẤY NGAY QUANH ô ấy sáng bao nhiêu.
 *
 * Lấy nền ngay quanh từng ô chứ không lấy một mức chung cho cả tờ: ảnh chụp bao giờ cũng
 * có góc sáng góc tối, mà hai ô cách nhau nửa gang tay thì nền giấy đã khác nhau rồi.
 * So ruột với nền của chính nó thì đèn lệch cỡ nào cũng không ảnh hưởng.
 *
 * Vành lấy nền nằm từ 1,3r đến 1,95r - ra ngoài vòng tròn in sẵn, nhưng chưa chạm ô bên
 * cạnh (tâm hai ô cách nhau 7,5mm trong khi r chỉ 2,25mm).
 */
function doO(xam: Float32Array, rong: number, cao: number,
             h: number[], o: { x: number; y: number; r: number }): { ruot: number; nen: number } {
  const giua = nanDiem(h, o.x, o.y);
  const mep = nanDiem(h, o.x + o.r, o.y);
  const r = Math.max(1.5, Math.hypot(mep.x - giua.x, mep.y - giua.y));

  const rRuot = r * 0.72, rTrong = r * 1.3, rNgoai = r * 1.95;
  let tRuot = 0, sRuot = 0, tNen = 0, sNen = 0;
  const x0 = Math.max(0, Math.floor(giua.x - rNgoai)), x1 = Math.min(rong - 1, Math.ceil(giua.x + rNgoai));
  const y0 = Math.max(0, Math.floor(giua.y - rNgoai)), y1 = Math.min(cao - 1, Math.ceil(giua.y + rNgoai));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d2 = (x - giua.x) ** 2 + (y - giua.y) ** 2;
      const v = xam[y * rong + x];
      if (d2 <= rRuot * rRuot) { tRuot += v; sRuot++; }
      else if (d2 >= rTrong * rTrong && d2 <= rNgoai * rNgoai) { tNen += v; sNen++; }
    }
  }
  return { ruot: sRuot ? tRuot / sRuot : 1, nen: sNen ? tNen / sNen : 1 };
}

/* ===================== ĐỌC MỘT PHIẾU ===================== */

/** Ô coi là ĐÃ TÔ khi độ đậm vượt mức này (0 = trắng giấy, 1 = mực in đặc). */
const MUC_DA_TO = 0.42;
/** Ô đậm nhì phải kém ô đậm nhất ít nhất chừng này, không thì coi như tô hai ô. */
const CACH_BIET = 0.18;

export function docPhieuQuet(anh: AnhTho, luoi: BanDoLuoi): KetQuaDocPhieu {
  const { width: rong, height: cao } = anh;
  const xam = anhXam(anh);
  const nen = nenCucBo(xam, rong, cao);
  const vung = cacVungToi(xam, rong, cao, nen);
  const timNeo = timDauNeo(vung, rong, cao, luoi.rong / luoi.cao);

  if ('viSao' in timNeo) {
    return {
      timDuocNeo: false,
      loi: 'Không nhận ra bốn dấu neo ở góc lưới - chụp lại cho thấy trọn tờ giấy, đủ sáng,'
        + ` đặt thẳng. (${timNeo.viSao})`,
      o: [], traLoi: {}, khongChac: [],
    };
  }
  const nCanh = luoi.neo[0].canh / 2;
  const goc = luoi.neo.map(n => ({ x: n.x + nCanh, y: n.y + nCanh }));
  const tb = (a: number[]) => a.reduce((t, x) => t + x, 0) / (a.length || 1);

  /* THỬ TỪNG BỘ BỐN DẤU, để chốt mốc chuẩn tự chọn bộ đúng.
     Trên tờ giấy thật còn có mã QR mà ba ô vuông định vị của nó to gần bằng dấu neo, nên
     không thể chọn bừa một bộ rồi tin. Mốc đen là ô in đặc, mốc trắng là ô để trắng tinh -
     cả hai do ta in ra nên biết chắc phải đọc thành gì. Bộ nào nắn xong mà hai mốc ấy ra
     đúng đen và đúng trắng thì mới là bộ thật. */
  let h: number[] | null = null;
  let neo: { x: number; y: number }[] | null = null;
  let tpDen = 0;
  let viSaoTruot = 'không bộ nào nắn ra được mốc chuẩn đúng đen/trắng';

  for (const bo of timNeo.boNeo) {
    const hThu = matranNan(goc, bo);
    if (!hThu) { viSaoTruot = 'bốn dấu nằm lệch bất thường, không dựng được phép nắn'; continue; }
    const tuongPhan = (m: { x: number; y: number; r: number }) => {
      const d = doO(xam, rong, cao, hThu, m);
      return d.nen - d.ruot;
    };
    const den = tb(luoi.mocDen.map(tuongPhan));
    const trang = tb(luoi.mocTrang.map(tuongPhan));
    if (den < 0.22 || trang > den * 0.4) continue;
    h = hThu; neo = bo; tpDen = den;
    break;
  }

  if (!h || !neo) {
    return {
      timDuocNeo: false,
      loi: 'Nắn ảnh xong nhưng mốc chuẩn in sẵn không đọc ra đúng đen/trắng - nhiều khả năng'
        + ` bắt nhầm dấu neo. Chụp lại cho thấy trọn bốn góc lưới, đủ sáng. (${viSaoTruot})`,
      o: [], traLoi: {}, khongChac: [],
    };
  }

  /** 0 khi trắng như nền giấy, 1 khi đậm như ô mốc in đặc. */
  const chuanHoa = (d: { ruot: number; nen: number }) =>
    Math.min(1.4, Math.max(0, (d.nen - d.ruot) / tpDen));

  const o: DoODoc[] = luoi.o.map(x => ({ ma: x.ma, dam: chuanHoa(doO(xam, rong, cao, h, x)) }));
  const damCua = new Map(o.map(x => [x.ma, x.dam]));

  /* Gom ô theo từng câu để chọn đáp án, và để bắt trường hợp tô hai ô. */
  const nhom = new Map<string, OTron[]>();
  for (const x of luoi.o) {
    const p = x.ma.split(':');
    const khoa = p[0] === 'DS' ? `DS:${p[1]}:${p[2]}`
               : p[0] === 'TLN' ? `TLN:${p[1]}:${p[2]}`
               : `NLC:${p[1]}`;
    (nhom.get(khoa) || nhom.set(khoa, []).get(khoa)!).push(x);
  }

  const traLoi: Record<string, string> = {};
  const khongChac: KetQuaDocPhieu['khongChac'] = [];
  const chonTrongNhom = new Map<string, string | null>();

  for (const [khoa, ds] of nhom) {
    const xep = ds.map(x => ({ nhan: x.nhan, dam: damCua.get(x.ma) ?? 0 }))
                  .sort((a, b) => b.dam - a.dam);
    const nhat = xep[0], nhi = xep[1];
    if (!nhat || nhat.dam < MUC_DA_TO) { chonTrongNhom.set(khoa, null); continue; }
    if (nhi && nhi.dam >= MUC_DA_TO && nhat.dam - nhi.dam < CACH_BIET) {
      chonTrongNhom.set(khoa, null);
      khongChac.push({ ma: khoa, viSao: `tô hơn một ô (${nhat.nhan} và ${nhi.nhan})` });
      continue;
    }
    if (nhi && nhat.dam - nhi.dam < CACH_BIET) {
      chonTrongNhom.set(khoa, null);
      khongChac.push({ ma: khoa, viSao: 'nét tô quá mờ, không phân biệt được' });
      continue;
    }
    chonTrongNhom.set(khoa, nhat.nhan);
  }

  /* NLC và DS: mỗi nhóm là một đáp án. Chưa tô thì để trống, không báo lỗi. */
  for (const [khoa, chon] of chonTrongNhom) {
    if (khoa.startsWith('TLN:')) continue;
    if (chon) traLoi[khoa] = chon;
  }

  /* TLN: ghép bốn cột thành một đáp số. Cột nào không chắc thì cả câu không chắc. */
  const cauTLN = new Set(
    luoi.o.filter(x => x.ma.startsWith('TLN:')).map(x => `TLN:${x.ma.split(':')[1]}`));
  for (const cau of cauTLN) {
    const so = cau.split(':')[1];
    let chuoi = '';
    let hong = false;
    for (let c = 0; c < 4; c++) {
      const khoa = `TLN:${so}:${c}`;
      if (!nhom.has(khoa)) continue;
      if (khongChac.some(k => k.ma === khoa)) { hong = true; break; }
      chuoi += chonTrongNhom.get(khoa) ?? '';
    }
    if (hong) {
      khongChac.push({ ma: cau, viSao: 'có cột tô không rõ' });
      continue;
    }
    if (chuoi) traLoi[cau] = chuoi;
  }
  /* Đã báo theo từng cột rồi thì bỏ dòng báo lẻ đi, chỉ giữ dòng của cả câu. */
  const gonKhongChac = khongChac.filter(k => !/^TLN:\d+:\d+$/.test(k.ma));

  return { timDuocNeo: true, neo, o, traLoi, khongChac: gonKhongChac };
}
