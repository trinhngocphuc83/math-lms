/**
 * Âm thanh cho sân khấu vinh danh.
 *
 * TIẾNG KÈN VÀ TRỐNG DỒN ĐƯỢC TẠO BẰNG MÃ, không tải tệp từ mạng về:
 *   - không dính bản quyền của ai,
 *   - chạy được cả khi mất mạng,
 *   - không phải quản lý thêm tệp nào, cũng không tốn dung lượng.
 * Thầy cô tìm được bản ưng ý hơn thì cứ thả tệp vào public/nhac-vinh-danh/ theo đúng tên
 * (fanfare.mp3, trong.mp3) - hệ thống TỰ ƯU TIÊN dùng tệp thật, không cần sửa mã.
 *
 * Nhạc nền thì dùng tệp Thầy cô đã chuẩn bị: public/nhac-vinh-danh/nen.mp3
 */

const THU_MUC = '/nhac-vinh-danh';

let boAm: AudioContext | null = null;

/** Trình duyệt chỉ cho tạo AudioContext sau khi người dùng bấm - nên tạo trễ, dùng lại. */
function layBoAm(): AudioContext | null {
  try {
    if (!boAm) boAm = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (boAm.state === 'suspended') boAm.resume();
    return boAm;
  } catch {
    return null;
  }
}

/** Tệp có thật không - để ưu tiên bản Thầy cô bỏ vào. */
async function coTep(duong: string): Promise<boolean> {
  try {
    const r = await fetch(duong, { method: 'HEAD' });
    return r.ok;
  } catch {
    return false;
  }
}

function phatTep(duong: string, amLuong = 0.9): Promise<void> {
  return new Promise((xong) => {
    const a = new Audio(duong);
    a.volume = amLuong;
    a.onended = () => xong();
    a.onerror = () => xong();
    a.play().catch(() => xong());
  });
}

/* ─────────────────────────────────────────────────────────── tiếng kèn ─── */

/** Một nốt kèn: sóng răng cưa qua bộ lọc, lên nhanh xuống chậm cho ra chất đồng. */
function noiKen(ctx: AudioContext, tanSo: number, batDau: number, dai: number, to = 0.22) {
  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const loc = ctx.createBiquadFilter();
  const g = ctx.createGain();

  o1.type = 'sawtooth'; o1.frequency.value = tanSo;
  // Nốt thứ hai lệch nhẹ cho dày tiếng, giống nhiều kèn thổi cùng lúc
  o2.type = 'sawtooth'; o2.frequency.value = tanSo * 1.005;

  loc.type = 'lowpass';
  loc.frequency.setValueAtTime(1200, batDau);
  loc.frequency.linearRampToValueAtTime(3600, batDau + 0.08);
  loc.Q.value = 1.2;

  g.gain.setValueAtTime(0.0001, batDau);
  g.gain.exponentialRampToValueAtTime(to, batDau + 0.05);      // vào nhanh
  g.gain.exponentialRampToValueAtTime(0.0001, batDau + dai);   // tắt dần

  o1.connect(loc); o2.connect(loc); loc.connect(g); g.connect(ctx.destination);
  o1.start(batDau); o2.start(batDau);
  o1.stop(batDau + dai + 0.05); o2.stop(batDau + dai + 0.05);
}

/**
 * Kèn chào: rải hợp âm Đô trưởng rồi ngân nốt cao - đúng kiểu fanfare mở màn.
 */
export async function keoFanfare(): Promise<void> {
  if (await coTep(`${THU_MUC}/fanfare.mp3`)) {
    await phatTep(`${THU_MUC}/fanfare.mp3`);
    return;
  }
  const ctx = layBoAm();
  if (!ctx) return;
  const t = ctx.currentTime + 0.03;

  //  Đô   Mi   Sol   Đô(cao)  rồi ngân
  const notes: [number, number, number][] = [
    [523.25, 0.00, 0.20],
    [659.25, 0.16, 0.20],
    [783.99, 0.32, 0.20],
    [1046.5, 0.48, 1.10],
  ];
  for (const [f, tre, dai] of notes) noiKen(ctx, f, t + tre, dai, tre === 0.48 ? 0.3 : 0.2);
  // Nền quãng năm cho dày
  noiKen(ctx, 261.63, t + 0.48, 1.10, 0.16);
  noiKen(ctx, 392.00, t + 0.48, 1.10, 0.12);

  await new Promise(x => setTimeout(x, 1700));
}

/* ───────────────────────────────────────────────────────── trống dồn ─── */

/** Một tiếng trống: nhiễu trắng qua lọc, tắt rất nhanh. */
function goTrong(ctx: AudioContext, luc: number, to: number) {
  const dai = 0.09;
  const dem = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dai), ctx.sampleRate);
  const d = dem.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);

  const nguon = ctx.createBufferSource();
  nguon.buffer = dem;
  const loc = ctx.createBiquadFilter();
  loc.type = 'bandpass'; loc.frequency.value = 220; loc.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.value = to;

  nguon.connect(loc); loc.connect(g); g.connect(ctx.destination);
  nguon.start(luc);
}

/**
 * Trống dồn: gõ mau dần và to dần trong `giay` giây, chốt bằng một tiếng mạnh.
 * Dùng lúc sắp lộ tên - kéo căng sự chờ đợi.
 */
export async function trongDon(giay = 2.2): Promise<void> {
  if (await coTep(`${THU_MUC}/trong.mp3`)) {
    await phatTep(`${THU_MUC}/trong.mp3`);
    return;
  }
  const ctx = layBoAm();
  if (!ctx) return;

  const batDau = ctx.currentTime + 0.03;
  let t = 0;
  let nhip = 0.085;              // khoảng cách giữa hai tiếng, ngắn dần
  while (t < giay) {
    const phan = t / giay;
    goTrong(ctx, batDau + t, 0.06 + phan * 0.22);
    t += nhip;
    nhip = Math.max(0.028, nhip * 0.965);
  }
  goTrong(ctx, batDau + giay, 0.45);   // tiếng chốt

  await new Promise(x => setTimeout(x, giay * 1000 + 250));
}

/* ───────────────────────────────────────────────────────── nhạc nền ─── */

export class NhacNen {
  private a: HTMLAudioElement | null = null;

  /** Bật nhạc nền, to dần cho êm. Không có tệp thì im lặng, không báo lỗi. */
  async bat(amLuong = 0.45): Promise<boolean> {
    if (!(await coTep(`${THU_MUC}/nen.mp3`))) return false;
    this.a = new Audio(`${THU_MUC}/nen.mp3`);
    this.a.loop = true;
    this.a.volume = 0;
    try {
      await this.a.play();
    } catch {
      return false;      // trình duyệt chặn vì chưa có thao tác người dùng
    }
    const dich = amLuong;
    const buoc = () => {
      if (!this.a) return;
      this.a.volume = Math.min(dich, this.a.volume + dich / 25);
      if (this.a.volume < dich) setTimeout(buoc, 60);
    };
    buoc();
    return true;
  }

  /** Hạ nhỏ tạm thời - dùng lúc xướng tên cho khỏi át tiếng nói. */
  haNho(muc = 0.12) {
    if (this.a) this.a.volume = muc;
  }

  nangLai(muc = 0.45) {
    if (this.a) this.a.volume = muc;
  }

  tat() {
    if (!this.a) return;
    const a = this.a;
    this.a = null;
    const buoc = () => {
      a.volume = Math.max(0, a.volume - 0.05);
      if (a.volume > 0.01) setTimeout(buoc, 60);
      else { a.pause(); a.currentTime = 0; }
    };
    buoc();
  }
}
