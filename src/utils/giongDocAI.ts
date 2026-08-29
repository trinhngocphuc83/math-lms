import { createClient } from "@/utils/supabase/client";
import { layCauHinhAI } from "@/utils/geminiBrowser";

/**
 * Đọc tên học sinh khi quay trúng: "Mời em ...".
 *
 * BA LỚP DỰ PHÒNG, tụt dần chứ không bao giờ im lặng:
 *   1. Giọng AI của Google (gemini-2.5-flash-preview-tts) - hay nhất.
 *   2. Bản đã đọc lần trước, cất trong kho chung. Lớp chỉ 10-18 em nên sau một buổi là đủ
 *      bộ: lần sau đọc tức thì, không tốn hạn mức, và MẤT MẠNG VẪN ĐỌC ĐƯỢC. Cất ở kho
 *      chung thay vì nhớ trong máy để thầy cô đổi máy vẫn còn.
 *   3. Giọng máy của trình duyệt; máy không có giọng Việt thì chuông báo.
 */

const MODEL_TTS = 'gemini-2.5-flash-preview-tts';
const KHO = 'system-assets';
const THU_MUC = 'giong-goi-ten';

export type CachDoc = 'ai' | 'da-nho' | 'giong-may' | 'chuong';

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

const duongTep = (studentId: string) => `${THU_MUC}/${studentId}.wav`;

/** Địa chỉ bản đã nhớ, nếu có. */
async function timBanDaNho(studentId: string): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from(KHO)
      .list(THU_MUC, { search: `${studentId}.wav`, limit: 1 });
    if (error || !data || data.length === 0) return null;
    return supabase.storage.from(KHO).getPublicUrl(duongTep(studentId)).data.publicUrl;
  } catch {
    return null;
  }
}

/** Cất bản vừa đọc để lần sau khỏi gọi lại - hỏng thì bỏ qua, không làm gián đoạn giờ dạy. */
async function nhoLai(studentId: string, wav: Blob): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.storage.from(KHO)
      .upload(duongTep(studentId), wav, { contentType: 'audio/wav', upsert: true });
  } catch (e) {
    console.warn('Không cất được giọng đọc, lần sau sẽ gọi lại:', e);
  }
}

function phat(url: string): Promise<void> {
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
 * Đọc "Mời em <tên>". Trả về đã đọc bằng cách nào, để giao diện nói cho thầy cô biết.
 * KHÔNG bao giờ ném lỗi ra ngoài - đang dạy mà vỡ giao diện thì phiền hơn nhiều.
 */
export async function doiTen(studentId: string, ten: string): Promise<CachDoc> {
  const cau = `Mời em ${ten}`;

  // 1. Bản đã nhớ - nhanh nhất, và mất mạng vẫn còn (nếu trình duyệt đã tải về)
  const daNho = await timBanDaNho(studentId);
  if (daNho) {
    await phat(daNho);
    return 'da-nho';
  }

  // 2. Giọng AI
  try {
    const cauHinh = await layCauHinhAI();
    for (const key of cauHinh.keys) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_TTS}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: cau }] }],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
              },
            }),
          },
        );
        const j = await res.json();
        const phan = j?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (!phan?.data) continue;   // khoá này không ra tiếng, thử khoá kế tiếp

        const wav = bocDauWav(base64SangByte(phan.data));
        const url = URL.createObjectURL(wav);
        await phat(url);
        URL.revokeObjectURL(url);
        nhoLai(studentId, wav);      // cất lại, không cần chờ
        return 'ai';
      } catch { /* thử khoá kế tiếp */ }
    }
  } catch { /* không lấy được khoá - xuống lớp dự phòng */ }

  // 3. Giọng máy, rồi chuông
  if (giongMay(cau)) return 'giong-may';
  chuong();
  return 'chuong';
}
