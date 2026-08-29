'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Nghe giọng nói tiếng Việt bằng Web Speech API của chính trình duyệt.
 *
 * Tách ra từ PresentationTimer (nơi đã chạy tốt) để ô tìm kiếm Sổ tay dùng lại, thay vì
 * chép thêm một bản nữa.
 *
 * Giọng nói KHÔNG gửi đi đâu cả: Web Speech API xử lý ngay trong trình duyệt. Cần trang
 * chạy HTTPS (Vercel có sẵn) hoặc localhost thì micro mới mở được.
 */

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
  // Giữ hàm gọi lại trong ref: nếu không, mỗi lần trang dựng lại là gắn một bộ nghe mới
  const khiNgheRef = useRef(khiNghe);
  khiNgheRef.current = khiNghe;

  // Chỉ dò ở phía trình duyệt. Dò lúc dựng trên máy chủ thì window chưa có, luôn ra false
  // rồi giữ nguyên như vậy - nút micro sẽ không bao giờ hiện.
  useEffect(() => {
    setHoTro(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
  }, []);

  const dungNghe = useCallback(() => {
    try { boNhanRef.current?.stop(); } catch { /* đã dừng rồi thì thôi */ }
    setDangNghe(false);
  }, []);

  const batDauNghe = useCallback(() => {
    const Nhan = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Nhan) return;

    // Đang nghe mà bấm nữa thì hiểu là muốn dừng
    if (boNhanRef.current) { dungNghe(); return; }

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
        if (e?.error === 'not-allowed') setLoi('Chưa cho phép dùng micro. Bấm vào ổ khoá trên thanh địa chỉ để bật.');
        else if (e?.error === 'no-speech') setLoi('Không nghe thấy gì, thử nói lại nhé.');
        else if (e?.error === 'network') setLoi('Mạng đang yếu nên chưa nghe được.');
        else setLoi('Không nghe được, thử lại nhé.');
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
  }, [ngonNgu, dungNghe]);

  // Rời trang lúc đang nghe thì phải tắt micro, không để nó chạy tiếp phía sau
  useEffect(() => () => { try { boNhanRef.current?.abort(); } catch { /* bỏ qua */ } }, []);

  return { hoTro, dangNghe, loi, batDauNghe, dungNghe };
}
