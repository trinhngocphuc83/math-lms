/**
 * Đọc mã QR trên phiếu trả lời, thử nhiều lượt thay vì một.
 *
 * Vì sao phải nhiều lượt: bản cũ gọi jsQR đúng MỘT lần trên ảnh gốc. Ảnh chụp điện thoại
 * 3000-4000 điểm ảnh mà mã QR chỉ chừng 1,7cm, lại thêm rung tay, đèn loá, chụp nghiêng -
 * trượt là mất luôn mã học sinh. Mất mã thì tờ phiếu vào khay "chưa gán em nào" dù trên
 * giấy có in sẵn tên em, và Thầy cô phải gán tay từng tờ.
 *
 * Các lượt thử, xếp từ rẻ tới đắt:
 *   1. Ảnh gốc.
 *   2. Ảnh thu nhỏ - jsQR nhiều khi đọc được ảnh vừa mà thua ảnh quá to nhiều nhiễu hạt.
 *   3. Chỉ khoang đầu trang, phóng to - mã QR luôn nằm ở ô điểm góc trên bên phải.
 *   4. Xoay 90 / 180 / 270 - Thầy cô chụp ngang tờ giấy là chuyện thường.
 *
 * Mọi phép biến đổi ở đây là số học thuần trên mảng điểm ảnh, KHÔNG dùng canvas, để chạy
 * được cả ngoài trình duyệt và thử được bằng máy.
 */

export interface AnhDiemAnh {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

/** Nội dung mã QR của phiếu: "LTP|1|<bộ đề>|<mã đề>|pt|<trang>|<mã học sinh>". */
export interface MaPhieu {
  boDeId: string;
  maDe: string;
  trang: number;
  hs?: string;
}

/** Hàm giải mã QR - truyền jsQR vào để tệp này không phải tự nạp thư viện. */
export type BoGiaiQR = (
  data: Uint8ClampedArray,
  w: number,
  h: number,
  opt?: { inversionAttempts?: string },
) => { data?: string } | null;

/* ===================== BIẾN ĐỔI ẢNH ===================== */

/** Thu nhỏ theo phép lấy trung bình ô vuông - giữ nét hơn hẳn lấy mẫu thưa. */
export function thuNhoAnh(anh: AnhDiemAnh, rongToiDa: number): AnhDiemAnh {
  if (anh.width <= rongToiDa) return anh;
  const tiLe = rongToiDa / anh.width;
  const W = Math.max(1, Math.round(anh.width * tiLe));
  const H = Math.max(1, Math.round(anh.height * tiLe));
  const ra = new Uint8ClampedArray(W * H * 4);
  const bx = anh.width / W, by = anh.height / H;
  for (let y = 0; y < H; y++) {
    const y0 = Math.floor(y * by), y1 = Math.min(anh.height, Math.ceil((y + 1) * by));
    for (let x = 0; x < W; x++) {
      const x0 = Math.floor(x * bx), x1 = Math.min(anh.width, Math.ceil((x + 1) * bx));
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const i = (yy * anh.width + xx) * 4;
        r += anh.data[i]; g += anh.data[i + 1]; b += anh.data[i + 2]; n++;
      }
      const j = (y * W + x) * 4;
      ra[j] = r / n; ra[j + 1] = g / n; ra[j + 2] = b / n; ra[j + 3] = 255;
    }
  }
  return { data: ra, width: W, height: H };
}

/** Cắt một khoang. Toạ độ ngoài ảnh thì tự co về trong. */
export function catAnh(anh: AnhDiemAnh, x0: number, y0: number, w: number, h: number): AnhDiemAnh {
  const X = Math.max(0, Math.min(anh.width - 1, Math.round(x0)));
  const Y = Math.max(0, Math.min(anh.height - 1, Math.round(y0)));
  const W = Math.max(1, Math.min(anh.width - X, Math.round(w)));
  const H = Math.max(1, Math.min(anh.height - Y, Math.round(h)));
  const ra = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    const nguon = ((Y + y) * anh.width + X) * 4;
    ra.set(anh.data.subarray(nguon, nguon + W * 4), y * W * 4);
  }
  return { data: ra, width: W, height: H };
}

/** Phóng to nguyên khối (lặp điểm ảnh) - đủ cho jsQR bắt được ô vuông định vị nhỏ. */
export function phongTo(anh: AnhDiemAnh, lan: number): AnhDiemAnh {
  const n = Math.max(1, Math.round(lan));
  if (n === 1) return anh;
  const W = anh.width * n, H = anh.height * n;
  const ra = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    const sy = Math.floor(y / n);
    for (let x = 0; x < W; x++) {
      const si = (sy * anh.width + Math.floor(x / n)) * 4;
      const di = (y * W + x) * 4;
      ra[di] = anh.data[si]; ra[di + 1] = anh.data[si + 1];
      ra[di + 2] = anh.data[si + 2]; ra[di + 3] = 255;
    }
  }
  return { data: ra, width: W, height: H };
}

/** Xoay 90 / 180 / 270 độ theo chiều kim đồng hồ. */
export function xoayAnh(anh: AnhDiemAnh, do_: 90 | 180 | 270): AnhDiemAnh {
  const { width: w, height: h } = anh;
  const W = do_ === 180 ? w : h;
  const H = do_ === 180 ? h : w;
  const ra = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = (y * w + x) * 4;
    let dx: number, dy: number;
    if (do_ === 90) { dx = h - 1 - y; dy = x; }
    else if (do_ === 180) { dx = w - 1 - x; dy = h - 1 - y; }
    else { dx = y; dy = w - 1 - x; }
    const di = (dy * W + dx) * 4;
    ra[di] = anh.data[si]; ra[di + 1] = anh.data[si + 1];
    ra[di + 2] = anh.data[si + 2]; ra[di + 3] = 255;
  }
  return { data: ra, width: W, height: H };
}

/* ===================== ĐỌC ===================== */

/** Tách chuỗi trong mã QR thành các phần. Không đúng khuôn thì trả null. */
export function phanTichMaPhieu(chuoi: string): MaPhieu | null {
  const p = String(chuoi || '').split('|');
  if (p[0] !== 'LTP' || p[4] !== 'pt') return null;
  /*
   * SỐ TRANG 0 = "mã này không nói trang mấy".
   *
   * Đó là mã DANH TÍNH nằm ở dải đầu trang, lặp trên mọi trang của một em - dùng để nhận
   * ra tờ tự luận rời là của ai. Bản trước viết `Number(p[5]) || 1` nên số 0 bị nắn thành
   * 1, tờ tự luận sẽ tự khai là trang 1 và đè lên tờ lưới thật.
   */
  const soTrang = Number(p[5]);
  const trang = Number.isFinite(soTrang) && soTrang >= 0 ? soTrang : 1;
  /* Ô thứ bảy chỉ có ở phiếu in theo lớp - phiếu trắng in trước đó vẫn đọc được. */
  return { boDeId: p[2], maDe: p[3], trang, hs: p[6] || undefined };
}

/**
 * Thử đọc mã QR của phiếu bằng nhiều lượt biến đổi ảnh.
 *
 * @param giai  jsQR (hoặc bộ tương đương)
 * @returns mã đọc được, kèm tên lượt đã ăn - tiện để biết lượt nào đang gánh việc.
 */
export function docQRPhieu(
  anh: AnhDiemAnh,
  giai: BoGiaiQR,
): { ma: MaPhieu; luot: string } | null {
  const thu = (a: AnhDiemAnh, ten: string) => {
    try {
      const kq = giai(a.data as Uint8ClampedArray, a.width, a.height, { inversionAttempts: 'attemptBoth' });
      if (!kq?.data) return null;
      const ma = phanTichMaPhieu(kq.data);
      return ma ? { ma, luot: ten } : null;
    } catch { return null; }
  };

  const luot: { ten: string; dung: () => AnhDiemAnh }[] = [
    { ten: 'ảnh gốc', dung: () => anh },
    { ten: 'thu nhỏ 1600', dung: () => thuNhoAnh(anh, 1600) },
    { ten: 'thu nhỏ 1000', dung: () => thuNhoAnh(anh, 1000) },
    /* Mã QR nằm trong ô điểm góc trên bên phải. Cắt riêng khoang ấy rồi phóng to thì
       jsQR không còn phải lọc cả trang giấy đầy chữ và ô tròn. */
    { ten: 'khoang đầu trang, phóng to', dung: () => phongTo(catAnh(anh, anh.width * 0.45, 0, anh.width * 0.55, anh.height * 0.22), 2) },
    { ten: 'nửa trên trang', dung: () => thuNhoAnh(catAnh(anh, 0, 0, anh.width, anh.height * 0.35), 1400) },
    { ten: 'xoay 90', dung: () => thuNhoAnh(xoayAnh(anh, 90), 1600) },
    { ten: 'xoay 180', dung: () => thuNhoAnh(xoayAnh(anh, 180), 1600) },
    { ten: 'xoay 270', dung: () => thuNhoAnh(xoayAnh(anh, 270), 1600) },
  ];

  /*
   * MỘT TRANG CÓ THỂ CÓ HAI MÃ, phải lấy đúng mã mang số trang.
   *
   * Từ khi dải đầu trang mang mã DANH TÍNH (trang 0), trang lưới có hai mã: mã danh tính
   * ở dải trên cùng và mã trang nằm trong ô điểm. jsQR mỗi lượt chỉ trả về MỘT mã, và
   * lượt "ảnh gốc" hay vớ phải mã nào nằm gần góc trên bên trái - tức mã danh tính. Vớ
   * nhầm thì trang lưới tự khai là trang 0, xếp trang sẽ loạn.
   *
   * Nên: gặp mã trang 0 thì GHI NHỚ rồi chạy tiếp các lượt còn lại tìm mã có số trang.
   * Hết lượt mà vẫn chỉ có mã danh tính thì đó đúng là tờ tự luận - trả về, để bộ ghép
   * bài biết tờ này của em nào dù không biết là trang mấy.
   */
  let chiDanhTinh: { ma: MaPhieu; luot: string } | null = null;
  for (const l of luot) {
    const kq = thu(l.dung(), l.ten);
    if (!kq) continue;
    if (kq.ma.trang > 0) return kq;
    if (!chiDanhTinh) chiDanhTinh = kq;
  }
  return chiDanhTinh;
}
