// Đọc câu nói tiếng Việt thành số giây, dùng cho đồng hồ đếm ngược ở trình chiếu:
// giáo viên bấm micro rồi nói "hai phút", "90 giây", "1 phút 30 giây"...
//
// Nhận dạng giọng nói trả về khi thì chữ số ("2 phút 30"), khi thì chữ viết
// ("hai phút ba mươi giây") tuỳ cách phát âm và bộ máy của trình duyệt, nên phải
// hiểu được cả hai. Tách riêng file này để thử được bằng nhiều câu mẫu mà không
// cần micro thật.

/** Số đếm tiếng Việt 0-20 và các mốc chục. */
const SO_CO_BAN: Record<string, number> = {
  'không': 0, 'linh': 0, 'lẻ': 0,
  'một': 1, 'mốt': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'tư': 4, 'năm': 5, 'lăm': 5,
  'sáu': 6, 'bảy': 7, 'bẩy': 7, 'tám': 8, 'chín': 9, 'mười': 10, 'mươi': 10,
};

/** Bỏ dấu và chuẩn hoá khoảng trắng để so khớp bớt lệ thuộc cách gõ dấu. */
function chuanHoa(text: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Đổi một cụm chữ số tiếng Việt thành số. Xử lý được các dạng hay gặp khi nói
 * thời lượng: "ba", "mười", "mười lăm", "hai mươi", "hai mươi lăm", "ba mươi".
 * Trả về null nếu không đọc được.
 */
export function docSoTiengViet(cum: string): number | null {
  const tu = chuanHoa(cum).split(' ').filter(Boolean);
  if (tu.length === 0) return null;

  // Toàn chữ số thì lấy luôn
  if (tu.length === 1 && /^\d+$/.test(tu[0])) return parseInt(tu[0], 10);

  let tong: number | null = null;

  for (let i = 0; i < tu.length; i++) {
    const t = tu[i];

    if (/^\d+$/.test(t)) {
      tong = (tong ?? 0) + parseInt(t, 10);
      continue;
    }

    const gt = SO_CO_BAN[t];
    if (gt === undefined) continue;

    if (t === 'mười') {
      // "mười" đứng đầu = 10; "hai mười" hiếm gặp nhưng vẫn xử lý như hàng chục
      tong = tong === null ? 10 : tong * 10;
    } else if (t === 'mươi') {
      // "hai mươi" -> nhân hàng chục
      tong = (tong ?? 0) * 10;
    } else {
      tong = (tong ?? 0) + gt;
    }
  }

  return tong;
}

/**
 * Đọc câu nói thành TỔNG SỐ GIÂY.
 *
 * Hiểu được:
 *   "hai phút"            -> 120
 *   "2 phút 30 giây"      -> 150
 *   "1 phút rưỡi"         -> 90
 *   "90 giây"             -> 90
 *   "ba mươi giây"        -> 30
 *   "5"  (không nêu đơn vị, mặc định là PHÚT vì thầy hay nói gọn "năm")
 *
 * Trả về null nếu không hiểu, để nơi gọi báo cho người dùng nói lại.
 */
export function docThoiLuongTiengViet(cauNoi: string): number | null {
  const s = chuanHoa(cauNoi);
  if (!s) return null;

  let tongGiay = 0;
  let daHieu = false;

  // "một phút rưỡi" / "1 phút rưỡi" -> cộng thêm 30 giây
  const coRuoi = /\brưỡi\b/.test(s);

  // Phần PHÚT: lấy cụm chữ đứng ngay trước từ "phút"
  const khopPhut = s.match(/([\p{L}\d\s]+?)\s*phút/u);
  if (khopPhut) {
    const soPhut = docSoTiengViet(khopPhut[1]);
    if (soPhut !== null && soPhut >= 0) {
      tongGiay += soPhut * 60;
      daHieu = true;
    }
  }

  // Phần GIÂY: cụm đứng ngay trước "giây". Nếu câu có cả "phút" thì chỉ xét phần sau chữ "phút".
  const phanSauPhut = khopPhut ? s.slice(s.indexOf('phút') + 'phút'.length) : s;
  const khopGiay = phanSauPhut.match(/([\p{L}\d\s]+?)\s*giây/u);
  if (khopGiay) {
    const soGiay = docSoTiengViet(khopGiay[1]);
    if (soGiay !== null && soGiay >= 0) {
      tongGiay += soGiay;
      daHieu = true;
    }
  }

  if (coRuoi && khopPhut) {
    tongGiay += 30;
    daHieu = true;
  }

  // Có "phút" nhưng phần sau chỉ là con số trống đơn vị: "2 phút 30"
  if (khopPhut && !khopGiay) {
    const duoi = phanSauPhut.trim();
    if (duoi && !/rưỡi/.test(duoi)) {
      const them = docSoTiengViet(duoi);
      if (them !== null && them > 0 && them < 60) {
        tongGiay += them;
        daHieu = true;
      }
    }
  }

  // Không nêu đơn vị nào: hiểu là số PHÚT ("năm" = 5 phút)
  if (!daHieu) {
    const chiSo = docSoTiengViet(s);
    if (chiSo !== null && chiSo > 0) {
      tongGiay = chiSo * 60;
      daHieu = true;
    }
  }

  if (!daHieu || tongGiay <= 0) return null;
  // Chặn trên 90 phút cho khỏi nhận nhầm số rác từ micro
  return Math.min(tongGiay, 90 * 60);
}

/** Đổi số giây thành chuỗi MM:SS để hiển thị. */
export function dinhDangMMSS(tongGiay: number): string {
  const g = Math.max(0, Math.floor(tongGiay));
  const phut = Math.floor(g / 60);
  const giay = g % 60;
  return `${String(phut).padStart(2, '0')}:${String(giay).padStart(2, '0')}`;
}
