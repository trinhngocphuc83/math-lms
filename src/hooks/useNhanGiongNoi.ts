'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { chepLoiNoiBangAI, ghiAmDuoc } from '@/utils/chepLoiNoiAI';

/**
 * Nghe giọng nói tiếng Việt, có ĐƯỜNG LUI cho iPhone.
 *
 * Tách ra từ PresentationTimer (nơi đã chạy tốt) để ô tìm kiếm Sổ tay dùng lại, thay vì
 * chép thêm một bản nữa.
 *
 * HAI ĐƯỜNG:
 *   1. Web Speech API của trình duyệt - nhanh, giọng nói KHÔNG rời khỏi máy. Android và
 *      máy tính đi đường này.
 *   2. Tự ghi âm rồi nhờ AI chép lại (utils/chepLoiNoiAI) - dành cho iPhone.
 *
 * VÌ SAO CẦN ĐƯỜNG 2: app này để display "standalone", thầy cô thêm vào Màn hình chính là
 * chạy như ứng dụng riêng. WebKit CHẶN nhận giọng nói trong chế độ đó, nên trên iPhone bấm
 * micro chỉ ra "Không nghe được, thử lại" dù iPhone vẫn có webkitSpeechRecognition. Vì
 * vậy phải nhìn máy chứ không nhìn mỗi việc "trình duyệt có hàm đó không".
 */

/** iPhone/iPad đang chạy app từ Màn hình chính - chỗ WebKit chặn nhận giọng nói. */
function laIphoneManHinhChinh(): boolean {
  if (typeof window === 'undefined') return false;
  const nav: any = navigator;
  // iPadOS khai là Macintosh, phải nhìn thêm số điểm chạm mới phân biệt được
  const laApple = /iPad|iPhone|iPod/.test(nav.userAgent)
    || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  if (!laApple) return false;
  return nav.standalone === true
    || !!window.matchMedia?.('(display-mode: standalone)')?.matches;
}

export interface KetQuaNgheNoi {
  /** Trình duyệt có hỗ trợ không - không thì đừng hiện nút micro cho khỏi bấm vào chỗ chết. */
  hoTro: boolean;
  dangNghe: boolean;
  loi: string;
  batDauNghe: () => void;
  dungNghe: () => void;
}

export function useNhanGiongNoi(
  /** Gọi mỗi khi nghe được chữ. `xong` = true là câu đã chốt, false là đang nói dở. */
  khiNghe: (chu: string, xong: boolean) => void,
  ngonNgu = 'vi-VN',
): KetQuaNgheNoi {
  const [hoTro, setHoTro] = useState(false);
  const [dangNghe, setDangNghe] = useState(false);
  const [loi, setLoi] = useState('');
  const boNhanRef = useRef<any>(null);
  /** Đi đường ghi âm + AI thay vì Web Speech. */
  const duongGhiAm = useRef(false);
  const boGhiRef = useRef<any>(null);
  const hetGioRef = useRef<any>(null);
  // Giữ hàm gọi lại trong ref: nếu không, mỗi lần trang dựng lại là gắn một bộ nghe mới
  const khiNgheRef = useRef(khiNghe);
  khiNgheRef.current = khiNghe;

  // Chỉ dò ở phía trình duyệt. Dò lúc dựng trên máy chủ thì window chưa có, luôn ra false
  // rồi giữ nguyên như vậy - nút micro sẽ không bao giờ hiện.
  useEffect(() => {
    const coWebSpeech = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    // iPhone thêm vào Màn hình chính: có hàm cũng vô dụng, đi thẳng đường ghi âm cho khỏi
    // bắt thầy cô nói một lần rồi mới báo hỏng.
    duongGhiAm.current = !coWebSpeech || laIphoneManHinhChinh();
    setHoTro(coWebSpeech || ghiAmDuoc());
  }, []);

  const dungNghe = useCallback(() => {
    try { boNhanRef.current?.stop(); } catch { /* đã dừng rồi thì thôi */ }
    try { boGhiRef.current?.stop(); } catch { /* đã dừng rồi thì thôi */ }
    if (!boGhiRef.current) setDangNghe(false);
  }, []);

  /**
   * Đường ghi âm: thu tiếng rồi nhờ AI chép lại.
   *
   * Tự dừng sau 6 giây - câu đặt giờ chỉ dài vài chữ, để lâu hơn thì tệp nặng mà AI cũng
   * chép lâu hơn. Bấm nút lần nữa thì dừng ngay.
   */
  const ngheBangGhiAm = useCallback(async () => {
    setLoi('');
    let luong: MediaStream | null = null;
    try {
      luong = await navigator.mediaDevices.getUserMedia({ audio: true });
      const MR: any = (window as any).MediaRecorder;
      const kieu = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']
        .find(k => MR?.isTypeSupported?.(k)) || '';
      const bo = new MR(luong, kieu ? { mimeType: kieu } : undefined);
      boGhiRef.current = bo;
      const manh: BlobPart[] = [];
      bo.ondataavailable = (e: any) => { if (e.data?.size) manh.push(e.data); };

      const xong = new Promise<void>((tra) => { bo.onstop = () => tra(); });
      bo.start();
      setDangNghe(true);
      hetGioRef.current = setTimeout(() => { try { bo.stop(); } catch { /* rồi */ } }, 6000);
      await xong;

      clearTimeout(hetGioRef.current);
      luong.getTracks().forEach(t => t.stop());
      boGhiRef.current = null;

      const am = new Blob(manh, { type: kieu || 'audio/webm' });
      if (am.size < 1000) { setLoi('Không nghe thấy gì, thử nói lại nhé.'); return; }

      const chu = await chepLoiNoiBangAI(am);
      if (!chu) { setLoi('Không nghe rõ, thử nói lại nhé.'); return; }
      khiNgheRef.current(chu, true);
    } catch (e: any) {
      const m = String(e?.name || e?.message || '');
      if (/NotAllowed|Permission/i.test(m)) setLoi('Chưa cho phép dùng micro. Vào Cài đặt cho phép rồi thử lại.');
      else setLoi('Không nghe được: ' + (e?.message || 'lỗi không rõ'));
    } finally {
      clearTimeout(hetGioRef.current);
      luong?.getTracks().forEach(t => t.stop());
      boGhiRef.current = null;
      setDangNghe(false);
    }
  }, []);

  const batDauNghe = useCallback(() => {
    // Đang nghe mà bấm nữa thì hiểu là muốn dừng
    if (boNhanRef.current || boGhiRef.current) { dungNghe(); return; }

    if (duongGhiAm.current) { void ngheBangGhiAm(); return; }

    const Nhan = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Nhan) { duongGhiAm.current = true; void ngheBangGhiAm(); return; }

    setLoi('');
    try {
      const nd = new Nhan();
      boNhanRef.current = nd;
      nd.lang = ngonNgu;
      nd.continuous = false;
      // Hiện chữ dần trong lúc nói, để học sinh biết máy đang nghe được chứ không đứng im
      nd.interimResults = true;
      nd.maxAlternatives = 1;

      nd.onstart = () => setDangNghe(true);
      nd.onerror = (e: any) => {
        setDangNghe(false);
        boNhanRef.current = null;
        if (e?.error === 'not-allowed') {
          setLoi('Chưa cho phép dùng micro. Bấm vào ổ khoá trên thanh địa chỉ để bật.');
          return;
        }
        if (e?.error === 'no-speech') { setLoi('Không nghe thấy gì, thử nói lại nhé.'); return; }

        /* Còn lại là Web Speech của máy này hỏng chứ không phải thầy cô nói sai
           (hay gặp nhất: 'service-not-allowed' trên iPhone). Chuyển hẳn sang đường ghi âm
           và NGHE LẠI NGAY, để thầy cô chỉ phải nói thêm một lần chứ không phải mò. */
        duongGhiAm.current = true;
        setLoi('Máy này không tự nghe được, đang chuyển sang nghe bằng AI — Thầy cô nói lại giúp.');
        void ngheBangGhiAm();
      };
      nd.onend = () => { setDangNghe(false); boNhanRef.current = null; };
      nd.onresult = (e: any) => {
        const kq = e.results[e.results.length - 1];
        const chu = kq[0]?.transcript || '';
        if (chu) khiNgheRef.current(chu.trim(), !!kq.isFinal);
      };

      nd.start();
    } catch {
      boNhanRef.current = null;
      setLoi('Không mở được micro.');
    }
  }, [ngonNgu, dungNghe, ngheBangGhiAm]);

  // Rời trang lúc đang nghe thì phải tắt micro, không để nó chạy tiếp phía sau
  useEffect(() => () => {
    try { boNhanRef.current?.abort(); } catch { /* bỏ qua */ }
    try { boGhiRef.current?.stop(); } catch { /* bỏ qua */ }
    clearTimeout(hetGioRef.current);
  }, []);

  return { hoTro, dangNghe, loi, batDauNghe, dungNghe };
}
