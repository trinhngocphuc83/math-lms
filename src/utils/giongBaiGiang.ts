import { createClient } from '@/utils/supabase/client';
import { tachSlide, laSlideCauHoi } from '@/utils/tachSlide';

/**
 * Giọng đọc AI cho bài giảng trong app - bản trong app của mạch thu âm slide PowerPoint.
 *
 * Bên PowerPoint: kịch bản `am/kich-ban.md` -> cắt từng đoạn -> thu trên ElevenLabs ->
 * ghép và ghi mốc -> slide tự đọc, chữ hiện theo lời. Trong app làm gọn hơn được, vì MỖI
 * MẢNH LÀ MỘT TỆP RIÊNG: phát hết đoạn nào thì hiện mảnh kế tiếp, không phải ghép tệp rồi
 * tính mốc giây như PowerPoint.
 *
 * Không thêm bảng cơ sở dữ liệu. Mỗi module một thư mục trong kho `system-assets` (kho này
 * đã có sẵn và công khai, đang chứa giọng gọi tên):
 *
 *   giong-bai-giang/<module_id>/kich-ban.json   kịch bản + mốc, một tệp cho cả bài
 *   giong-bai-giang/<module_id>/s03.mp3         giọng từng đoạn
 *
 * Số slide lấy từ `tachSlide` - đúng hàm mà máy chiếu và điện thoại đang dùng, nên không
 * thể lệch nhau.
 */

export const KHO_GIONG = 'system-assets';
export const THU_MUC = 'giong-bai-giang';
/** Nhịp đọc: nhanh hơn bình thường một chút (1,1 từng bị chê nhanh ở bài Tin 11). */
export const NHIP_MAC_DINH = 1.05;

export interface DoanGiong {
  /** Tên đoạn, cũng là tên tệp mp3: "s03", "s03-m1" (mảnh *** thứ 1), "s07-loigiai". */
  khoa: string;
  slide: number;
  manh: number;
  /** Lời giảng thầy cô đã duyệt. Để trống nghĩa là slide này không đọc. */
  loi: string;
  /** Băm nội dung mảnh lúc thu - chữ trên slide đổi thì biết ngay giọng đã cũ. */
  chuKy: string;
  /** Tên tệp trong thư mục của module. Chưa thu thì bỏ trống. */
  mp3?: string;
  /** Thời lượng đo lúc tải lên (giây, chưa tính nhịp). */
  giay?: number;
}

export interface KichBanGiong {
  phien_ban: 1;
  nhip: number;
  cap_nhat: string;
  doan: DoanGiong[];
}

/** Một mảnh slide có thể đọc được, dựng từ chính markdown của bài. */
export interface ManhSlide {
  khoa: string;
  slide: number;
  manh: number;
  /** Trích nội dung để thầy cô nhìn mà viết lời. */
  trich: string;
  chuKy: string;
}

/**
 * Băm FNV-1a, ra 8 ký tự hex.
 *
 * Chỉ cần đủ để biết "chữ trên slide có đổi không" nên không cần hàm băm mật mã; hàm này
 * chạy được cả trên trình duyệt lẫn Node, không phải nạp thư viện.
 */
export function bam(chuoi: string): string {
  let h = 0x811c9dc5;
  const s = String(chuoi ?? '').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export const khoaDoan = (slide: number, manh: number): string =>
  `s${String(slide + 1).padStart(2, '0')}${manh > 0 ? `-m${manh}` : ''}`;

/** Bỏ thẻ HTML, công thức, ảnh... để lấy một dòng trích cho người đọc. */
export function trichNoiDung(manh: string, dai = 180): string {
  const t = String(manh || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' [hình] ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\$\$?([^$]*)\$\$?/g, (_, x) => ` ${String(x).slice(0, 20)} `)
    .replace(/[#*_>`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > dai ? t.slice(0, dai) + '…' : t;
}

/**
 * Mọi mảnh có thể đọc của một bài.
 *
 * Bỏ slide câu hỏi tương tác (thầy chốt: không đọc đề, học sinh phải tự nghĩ) và mảnh
 * không còn chữ nào sau khi bóc thẻ - slide chỉ có một tấm ảnh thì không có gì để đọc.
 */
export function dungDanhSachManh(markdown: string): ManhSlide[] {
  const slides = tachSlide(markdown);
  const ra: ManhSlide[] = [];
  slides.forEach((sl, i) => {
    if (laSlideCauHoi(sl)) return;
    sl.forEach((manh, k) => {
      const trich = trichNoiDung(manh);
      if (!trich) return;
      ra.push({ khoa: khoaDoan(i, k), slide: i, manh: k, trich, chuKy: bam(manh) });
    });
  });
  return ra;
}

/* ─────────────────────────────────────────────────────────── ĐỌC KỊCH BẢN ─── */

const duongDan = (moduleId: string, ten: string) => `${THU_MUC}/${moduleId}/${ten}`;

export function urlTep(moduleId: string, ten: string): string {
  const sb = createClient();
  return sb.storage.from(KHO_GIONG).getPublicUrl(duongDan(moduleId, ten)).data.publicUrl;
}

/**
 * Tải kịch bản của một module. Chưa thu bài nào thì trả null (không phải lỗi).
 *
 * `moi` = true thì thêm mốc giờ vào địa chỉ để vượt bộ nhớ đệm của CDN - trang thu giọng
 * phải thấy ngay bản mình vừa ghi, còn máy chiếu thì dùng bản đệm cho nhanh.
 */
export async function taiKichBan(moduleId: string, moi = false): Promise<KichBanGiong | null> {
  try {
    const u = urlTep(moduleId, 'kich-ban.json') + (moi ? `?t=${Date.now()}` : '');
    const r = await fetch(u, { cache: moi ? 'no-store' : 'default' });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || !Array.isArray(j.doan)) return null;
    return { phien_ban: 1, nhip: Number(j.nhip) || NHIP_MAC_DINH, cap_nhat: j.cap_nhat || '', doan: j.doan };
  } catch {
    return null;
  }
}

/** Các đoạn ĐÃ THU của một bài, tra nhanh theo khoá. */
export function traTheoKhoa(kb: KichBanGiong | null): Map<string, DoanGiong> {
  const m = new Map<string, DoanGiong>();
  for (const d of kb?.doan || []) if (d.mp3) m.set(d.khoa, d);
  return m;
}

/** Địa chỉ mp3 của một đoạn, chưa thu thì rỗng. */
export function urlGiong(moduleId: string, d?: DoanGiong | null): string {
  return d?.mp3 ? urlTep(moduleId, d.mp3) : '';
}

/* ──────────────────────────────────────────────────────────── BỘ PHÁT ─── */

/**
 * Bộ phát một đoạn giọng: chỉ một tiếng vang lên tại một thời điểm trong cả trang.
 *
 * Dùng một thẻ Audio duy nhất thay vì mỗi lần phát một thẻ mới - trước đây ở màn vinh danh
 * đã gặp cảnh hai tiếng chồng nhau khi bấm nhanh. Trình duyệt chặn phát tự động khi người
 * dùng chưa chạm vào trang: `phat` trả về false để nơi gọi bày nút "Bật tiếng".
 */
export class BoPhatGiong {
  private am: HTMLAudioElement | null = null;
  private nhip: number;
  /** Gọi khi đoạn chạy hết (không gọi khi bị dừng giữa chừng). */
  onXong: (() => void) | null = null;

  constructor(nhip = NHIP_MAC_DINH) {
    this.nhip = nhip;
  }

  datNhip(n: number) {
    this.nhip = n || NHIP_MAC_DINH;
    if (this.am) this.am.playbackRate = this.nhip;
  }

  dangPhat(): boolean {
    return !!this.am && !this.am.paused && !this.am.ended;
  }

  async phat(url: string): Promise<boolean> {
    this.dung();
    if (!url) return false;
    try {
      const a = new Audio(url);
      a.playbackRate = this.nhip;
      a.preload = 'auto';
      a.onended = () => { const f = this.onXong; this.am = null; f?.(); };
      this.am = a;
      /* Cửa sổ đang ở nền thì trình duyệt có khi giữ lời hứa của play() treo mãi - chờ
         quá 6 giây coi như không phát được, để nơi gọi bày nút mời bật tiếng. */
      await Promise.race([
        a.play(),
        new Promise((_, tuChoi) => setTimeout(() => tuChoi(new Error('play() treo')), 6000)),
      ]);
      return true;
    } catch {
      /* Trình duyệt chặn phát tự động, hoặc tệp hỏng. */
      this.am = null;
      return false;
    }
  }

  dung() {
    if (!this.am) return;
    this.am.onended = null;
    try { this.am.pause(); } catch { /* bỏ */ }
    this.am = null;
  }
}

/** Tra đoạn đã thu theo BĂM NỘI DUNG - xem chú thích ở manhTheoTrangHocSinh. */
export function traTheoChuKy(kb: KichBanGiong | null): Map<string, DoanGiong> {
  const m = new Map<string, DoanGiong>();
  for (const d of kb?.doan || []) if (d.mp3 && d.chuKy) m.set(d.chuKy, d);
  return m;
}

/**
 * Các mảnh đọc được của TỪNG TRANG bên màn hình học sinh, kèm băm nội dung.
 *
 * Trang học sinh cắt bài theo `---` và hiện bản E-LEARNING, còn kịch bản giọng dựng từ bản
 * TRÌNH CHIẾU - module nào có hai bản thì hai bản khác nhau, nên khớp theo chỉ số slide là
 * đọc nhầm sang ý khác. Vì vậy bên này tra giọng theo BĂM NỘI DUNG: mảnh nào chữ giống nhau
 * thì nghe được, mảnh chỉ có ở bản trình chiếu thì lặng, không bao giờ đọc nhầm.
 */
export function manhTheoTrangHocSinh(markdown: string): { khoa: string; chuKy: string }[][] {
  const trang = String(markdown || '').split(/(?:\r?\n|^)---(?:\r?\n|$)/).filter(p => p.trim() !== '');
  const ra: { khoa: string; chuKy: string }[][] = [];
  let daQua = 0;
  for (const t of trang) {
    const sl = tachSlide(t);
    const ds: { khoa: string; chuKy: string }[] = [];
    sl.forEach((manhs, i) => {
      if (laSlideCauHoi(manhs)) return;
      manhs.forEach((m, k) => { if (trichNoiDung(m)) ds.push({ khoa: khoaDoan(daQua + i, k), chuKy: bam(m) }); });
    });
    ra.push(ds);
    daQua += sl.length;
  }
  return ra;
}
