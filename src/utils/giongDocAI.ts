import { layCauHinhAI } from "@/utils/geminiBrowser";
/* Đọc/ghi kho giọng phải qua máy chủ: trình duyệt ghi vào kho bị chặn - đo trên máy thì
   sau cả buổi thử vẫn 0 tệp được nhớ, nên lần nào cũng gọi Google lại từ đầu. */
import { catGiongVaoKho, timGiongDaNho } from "@/app/actions/goiTenVaDiem";

/**
 * Giọng đọc cho vòng quay gọi tên.
 *
 * BA LỚP DỰ PHÒNG, tụt dần chứ không bao giờ im lặng:
 *   1. Giọng AI của Google (gemini-2.5-flash-preview-tts) - hay nhất.
 *   2. Bản đã đọc lần trước, cất trong kho chung. Lớp chỉ 10-18 em nên sau một buổi là đủ
 *      bộ: lần sau đọc tức thì, không tốn hạn mức, và MẤT MẠNG VẪN ĐỌC ĐƯỢC. Cất ở kho
 *      chung thay vì nhớ trong máy để thầy cô đổi máy vẫn còn.
 *   3. Giọng máy của trình duyệt; máy không có giọng Việt thì chuông báo.
 *
 * TÁCH LÀM HAI NHỊP - CHUẨN BỊ rồi mới PHÁT. Gọi giọng AI mất mấy giây, nếu đợi quay xong
 * mới gọi thì tiếng ra trễ hẳn, nghe như lúc bấm nút cộng điểm mới đọc. Nay bốc trúng ai
 * là đi lấy tiếng ngay, để nó chạy song song với lúc vòng quay đang xoay, quay dừng là
 * phát liền.
 */

const MODEL_TTS = 'gemini-2.5-flash-preview-tts';

/**
 * Bọc lời dặn quanh câu cần đọc.
 *
 * Gửi trơ mỗi câu "Mời em An" thì model thỉnh thoảng tưởng đây là câu hỏi phải TRẢ LỜI
 * chứ không phải câu phải ĐỌC LÊN, rồi trả về lỗi 400 kèm đúng dòng này:
 *   "Model tried to generate text, but it should only be used for TTS. Make sure your
 *    instructions are clear to only generate audio from a given text transcript."
 * Lúc đó app im tiếng AI và tụt xuống giọng máy mà không ai biết vì sao.
 *
 * Đo ngày 31/08/2026 trên 6 câu thật (mời em, cộng điểm, trừ điểm, vinh danh): kèm lời
 * dặn vẫn ra tiếng 6/6, và chép ngược lại bằng AI thì LỜI DẶN KHÔNG BỊ ĐỌC LÊN - nghe ra
 * đúng câu gốc. Nên bọc là lãi, không mất gì.
 */
const bocLoiDan = (cau: string) =>
  `Đọc to, rõ ràng, giọng thân thiện đúng nguyên văn câu sau: ${cau}`;

/** Khoá đã cạn hạn mức giọng đọc trong phiên này - khỏi thử lại cho mất thì giờ. */
const khoaCanTts = new Set<string>();

let vuongMacGanNhat = '';
/**
 * Vì sao lần gần nhất không dùng được giọng AI - để trang gọi tên bày ra cho thầy cô biết.
 * Chuỗi rỗng nghĩa là lần gần nhất vẫn đọc bằng giọng AI bình thường.
 */
export const lyDoKhongCoGiongAI = (): string => vuongMacGanNhat;

export type CachDoc = 'ai' | 'da-nho' | 'giong-may' | 'chuong';

/** Đã chuẩn bị xong, gọi `phat()` là ra tiếng ngay. */
export interface GiongDaSan {
  phat: () => Promise<CachDoc>;
  /** Lấy được từ đâu - để bên gọi biết mà dừng khi hết hạn mức. */
  nguon: 'da-nho' | 'ai' | 'du-phong';
}

/**
 * Google trả tiếng nói dạng PCM thô (audio/L16 24kHz), trình duyệt không phát thẳng được.
 * Phải tự bọc 44 byte đầu của tệp WAV vào.
 */
function bocDauWav(pcm: Uint8Array, tanSo = 24000, soKenh = 1, bit = 16): Blob {
  const khoiDuLieu = pcm.byteLength;
  const dau = new ArrayBuffer(44);
  const v = new DataView(dau);
  const chu = (viTri: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(viTri + i, s.charCodeAt(i));
  };
  const nhipByte = (tanSo * soKenh * bit) / 8;

  chu(0, 'RIFF');
  v.setUint32(4, 36 + khoiDuLieu, true);
  chu(8, 'WAVE');
  chu(12, 'fmt ');
  v.setUint32(16, 16, true);        // độ dài khối fmt
  v.setUint16(20, 1, true);         // 1 = PCM thô
  v.setUint16(22, soKenh, true);
  v.setUint32(24, tanSo, true);
  v.setUint32(28, nhipByte, true);
  v.setUint16(32, (soKenh * bit) / 8, true);
  v.setUint16(34, bit, true);
  chu(36, 'data');
  v.setUint32(40, khoiDuLieu, true);

  return new Blob([dau, pcm as unknown as BlobPart], { type: 'audio/wav' });
}

const base64SangByte = (b64: string): Uint8Array => {
  const tho = atob(b64);
  const ra = new Uint8Array(tho.length);
  for (let i = 0; i < tho.length; i++) ra[i] = tho.charCodeAt(i);
  return ra;
};

/** Địa chỉ bản đã nhớ, nếu có. */
async function timBanDaNho(khoa: string): Promise<string | null> {
  try {
    return (await timGiongDaNho(khoa)) || null;
  } catch {
    return null;
  }
}

/** Cất bản vừa đọc - hỏng thì bỏ qua, không làm gián đoạn giờ dạy. */
async function nhoLai(khoa: string, wav: Blob): Promise<void> {
  try {
    const bo = new Uint8Array(await wav.arrayBuffer());
    let nhi = '';
    for (let i = 0; i < bo.length; i++) nhi += String.fromCharCode(bo[i]);
    await catGiongVaoKho(khoa, btoa(nhi));
  } catch (e) {
    console.warn('Không cất được giọng đọc, lần sau sẽ gọi lại:', e);
  }
}

function phatUrl(url: string): Promise<void> {
  return new Promise((xong) => {
    const a = new Audio(url);
    a.onended = () => xong();
    a.onerror = () => xong();
    a.play().catch(() => xong());
  });
}

/** Giọng máy của trình duyệt. Trả về false nếu máy không có giọng Việt. */
function giongMay(cau: string): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  const ds = window.speechSynthesis.getVoices();
  const vi = ds.find(g => /^vi/i.test(g.lang));
  if (!vi) return false;
  const u = new SpeechSynthesisUtterance(cau);
  u.voice = vi;
  u.lang = 'vi-VN';
  u.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  return true;
}

/** Không có giọng nào thì ít nhất phải có tiếng chuông, đừng im lặng. */
function chuong(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.start(); o.stop(ctx.currentTime + 0.6);
  } catch { /* trình duyệt chặn âm thanh thì thôi */ }
}

/**
 * Đi lấy tiếng nói NGAY, trả về hàm phát để gọi đúng lúc cần.
 *
 * `khoa` là tên tệp đem cất, nên phải khác nhau theo từng câu: tên em thì một khoá, câu
 * "được cộng 1 điểm" lại một khoá khác - nếu không thì đọc nhầm câu.
 */
export async function chuanBiGiong(khoa: string, cau: string): Promise<GiongDaSan> {
  // 1. Bản đã nhớ - nhanh nhất, và mất mạng vẫn còn nếu trình duyệt đã tải về
  const daNho = await timBanDaNho(khoa);
  if (daNho) {
    return { nguon: 'da-nho', phat: async () => { await phatUrl(daNho); return 'da-nho'; } };
  }

  // 2. Giọng AI - lấy sẵn về, chưa phát vội
  let vuongMac = '';
  try {
    const cauHinh = await layCauHinhAI();
    /* Bỏ qua khoá đã biết là cạn: mỗi khoá chết ngốn nửa giây đến một giây, mà máy chủ
       xáo khoá ngẫu nhiên nên gần như lần gọi tên nào cũng đụng phải. */
    const conDung = cauHinh.keys.filter(k => !khoaCanTts.has(k));
    for (const key of (conDung.length ? conDung : cauHinh.keys)) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_TTS}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: bocLoiDan(cau) }] }],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
              },
            }),
          },
        );
        const j = await res.json();
        const phan = j?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (!phan?.data) {
          /* Cạn hạn mức thì nhớ lại, đừng thử khoá này nữa trong buổi dạy. */
          if (res.status === 429) {
            khoaCanTts.add(key);
            vuongMac = 'Khoá AI đã hết lượt đọc trong ngày';
          } else {
            vuongMac = String(j?.error?.message || j?.candidates?.[0]?.finishReason || 'không rõ').slice(0, 120);
          }
          continue;   // khoá này không ra tiếng, thử khoá kế tiếp
        }

        vuongMacGanNhat = '';
        const wav = bocDauWav(base64SangByte(phan.data));
        const url = URL.createObjectURL(wav);
        nhoLai(khoa, wav);           // cất lại, không cần chờ
        return {
          nguon: 'ai',
          phat: async () => {
            await phatUrl(url);
            URL.revokeObjectURL(url);
            return 'ai';
          },
        };
      } catch (e: any) { vuongMac = String(e?.message || 'không gọi được').slice(0, 120); }
    }
  } catch (e: any) {
    vuongMac = String(e?.message || 'không xin được khoá AI').slice(0, 120);
  }

  /* Xuống tới đây là KHÔNG có giọng AI. Ghi lại lý do để trang gọi tên bày ra - trước đây
     im lặng tụt xuống giọng máy, thầy cô chỉ thấy giọng robot mà không hiểu vì sao. */
  vuongMacGanNhat = vuongMac || 'không rõ';

  // 3. Giọng máy, rồi chuông
  return {
    nguon: 'du-phong',
    phat: async () => {
      if (giongMay(cau)) return 'giong-may';
      chuong();
      return 'chuong';
    },
  };
}

/**
 * Nói NGAY LẬP TỨC bằng giọng máy (hoặc chuông) - không chờ mạng.
 *
 * Dùng khi giọng AI lấy chưa kịp: quay dừng mà im lặng mấy giây thì cả lớp cụt hứng,
 * thà giọng máy đọc đúng lúc còn hơn giọng hay mà đọc trễ.
 */
export function noiNgay(cau: string): CachDoc {
  if (giongMay(cau)) return 'giong-may';
  chuong();
  return 'chuong';
}

/** Tiện dụng: chuẩn bị rồi phát luôn. */
export async function doc(khoa: string, cau: string): Promise<CachDoc> {
  return (await chuanBiGiong(khoa, cau)).phat();
}

/** "Mời em ..." */
export const chuanBiMoiEm = (studentId: string, ten: string) =>
  chuanBiGiong(studentId, `Mời em ${ten}`);

/** "Em ... được cộng 1 điểm" / "Em ... bị trừ 1 điểm" */
export const noiCongDiem = (studentId: string, ten: string, diem: number) =>
  doc(
    `${studentId}-${diem > 0 ? 'cong' : 'tru'}${Math.abs(diem)}`,
    diem > 0
      ? `Em ${ten} được cộng ${Math.abs(diem)} điểm`
      : `Em ${ten} bị trừ ${Math.abs(diem)} điểm`,
  );
