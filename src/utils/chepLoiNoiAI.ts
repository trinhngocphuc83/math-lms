/**
 * Nghe câu nói rồi chép ra chữ, bằng AI thay cho Web Speech của trình duyệt.
 *
 * VÌ SAO CẦN: Web Speech API (thứ đang dùng cho nút micro) KHÔNG chạy trên iPhone khi app
 * được thêm vào Màn hình chính - WebKit chặn nhận giọng nói trong chế độ standalone, nên
 * bấm micro là ra "Không nghe được, thử lại". Đường này không đụng Web Speech: tự ghi âm
 * bằng MediaRecorder rồi nhờ Gemini chép lại, nên iPhone dùng được.
 *
 * Ghi âm ra mỗi máy một kiểu (iPhone ra audio/mp4, Android ra audio/webm), Gemini không
 * nhận đủ các kiểu đó. Nên bước giữa: giải mã bằng AudioContext rồi đóng lại thành WAV
 * 16kHz một kênh - kiểu WAV thì chắc chắn nhận, mà tiếng nói 16kHz là quá đủ để nghe rõ.
 */

import { goiGeminiTrenTrinhDuyet, layCauHinhAI, GIAY_CHO_VIEC_NHO } from './geminiBrowser';

/** Máy này có ghi âm được không - không thì đừng bày nút micro ra cho bấm vào chỗ chết. */
export function ghiAmDuoc(): boolean {
  return typeof window !== 'undefined'
    && typeof (window as any).MediaRecorder !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia;
}

/** Kiểu tệp ghi âm mà máy này nhận; iPhone chỉ chịu audio/mp4. */
function kieuGhiAm(): string {
  const MR: any = (window as any).MediaRecorder;
  for (const k of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']) {
    if (MR?.isTypeSupported?.(k)) return k;
  }
  return '';
}

/** Đóng dữ liệu tiếng thành tệp WAV 16 bit một kênh. */
function dongThanhWav(mau: Float32Array, tanSo: number): Blob {
  const dau = new ArrayBuffer(44 + mau.length * 2);
  const v = new DataView(dau);
  const chu = (viTri: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(viTri + i, s.charCodeAt(i));
  };
  chu(0, 'RIFF');
  v.setUint32(4, 36 + mau.length * 2, true);
  chu(8, 'WAVE');
  chu(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);          // PCM
  v.setUint16(22, 1, true);          // một kênh
  v.setUint32(24, tanSo, true);
  v.setUint32(28, tanSo * 2, true);  // byte mỗi giây
  v.setUint16(32, 2, true);          // byte mỗi mẫu
  v.setUint16(34, 16, true);         // số bit
  chu(36, 'data');
  v.setUint32(40, mau.length * 2, true);
  for (let i = 0; i < mau.length; i++) {
    const s = Math.max(-1, Math.min(1, mau[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([dau], { type: 'audio/wav' });
}

/** Giải mã tệp ghi âm của máy rồi đóng lại thành WAV 16kHz một kênh. */
async function doiSangWav(am: Blob): Promise<Blob> {
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const tiengGoc = await ctx.decodeAudioData(await am.arrayBuffer());

    /* Trộn mọi kênh về một rồi hạ xuống 16kHz. OfflineAudioContext của Safari đòi đủ ba
       tham số nên truyền tường minh, đừng dùng kiểu object. */
    const TANSO = 16000;
    const soMau = Math.max(1, Math.round(tiengGoc.duration * TANSO));
    const OffCtx = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const off = new OffCtx(1, soMau, TANSO);
    const nguon = off.createBufferSource();
    nguon.buffer = tiengGoc;
    nguon.connect(off.destination);
    nguon.start();
    const daHa = await off.startRendering();

    return dongThanhWav(daHa.getChannelData(0), TANSO);
  } finally {
    try { await ctx.close(); } catch { /* đóng không được thì thôi */ }
  }
}

const LOI_DAN = `Đoạn ghi âm này là một câu nói ngắn bằng TIẾNG VIỆT.
Chép lại ĐÚNG NGUYÊN VĂN câu đó.
- Chỉ trả về đúng câu chữ, không thêm lời dẫn, không thêm dấu ngoặc kép, không giải thích.
- Không nghe ra gì thì trả về đúng một dấu gạch ngang: -`;

/**
 * Ghi âm xong thì chép ra chữ.
 *
 * Tiếng nói được gửi sang Google để chép - khác với Web Speech xử lý ngay trong máy. Đổi
 * lại là iPhone dùng được. Chỉ ghi trong lúc thầy cô chủ động bấm nút micro.
 */
export async function chepLoiNoiBangAI(am: Blob): Promise<string> {
  const wav = await doiSangWav(am);
  const b64: string = await new Promise((xong, hong) => {
    const doc = new FileReader();
    doc.onload = () => xong(String(doc.result).split(',')[1]);
    doc.onerror = hong;
    doc.readAsDataURL(wav);
  });

  const cauHinh = await layCauHinhAI();
  const kq = await goiGeminiTrenTrinhDuyet(
    cauHinh,
    [{ text: LOI_DAN }, { inlineData: { data: b64, mimeType: 'audio/wav' } }],
    { temperature: 0 },
    GIAY_CHO_VIEC_NHO,
  );

  const chu = String(kq.text || '').trim().replace(/^["']|["']$/g, '').trim();
  return chu === '-' ? '' : chu;
}
