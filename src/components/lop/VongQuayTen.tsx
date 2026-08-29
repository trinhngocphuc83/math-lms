"use client";

import React from "react";

/**
 * Vòng quay tên - băng tên cuộn dọc rồi chậm dần và dừng đúng người trúng.
 *
 * CHỌN BĂNG CUỘN CHỨ KHÔNG PHẢI BÁNH XE CHIA MÚI: tên học sinh Việt dài (đo trên lớp
 * thật: "Huỳnh Ngọc Phương Khanh", "Nguyễn Trần Duy Dương"), nhét vào múi bánh xe thì chữ
 * xoay nghiêng và bé tí, chiếu lên tivi cả lớp không đọc nổi. Băng cuộn thì chữ luôn nằm
 * ngang và to hết cỡ khung.
 *
 * Người trúng được BỐC TRƯỚC rồi mới dựng băng sao cho dừng đúng vào đó - không phải quay
 * ngẫu nhiên rồi xem rơi vào ai. Nhờ vậy tiếng đọc tên lấy sẵn được ngay từ đầu, quay dừng
 * là phát liền chứ không trễ.
 */

const CAO_DONG = 92;          // chiều cao mỗi dòng, px
const SO_DONG_CHAY = 34;      // độ dài băng - đủ để cảm giác quay lâu mà không giật

/** Chậm dần thật êm về cuối. */
const chamDan = (t: number) => 1 - Math.pow(1 - t, 4);

export default function VongQuayTen({
  dsTen, trungTen, dangQuay, keoDai = 3200, onXong,
}: {
  /** Danh sách tên để chạy qua */
  dsTen: string[];
  /** Tên người trúng - đã bốc sẵn từ trước */
  trungTen: string | null;
  dangQuay: boolean;
  keoDai?: number;
  onXong?: () => void;
}) {
  const [dich, setDich] = React.useState(0);
  const [dangChay, setDangChay] = React.useState(false);
  const [bang, setBang] = React.useState<string[]>([]);
  const khung = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!dangQuay || !trungTen || dsTen.length === 0) return;

    /* Dựng băng: các tên chạy lung tung, riêng ô ĐÍCH đặt đúng người trúng. */
    const b: string[] = [];
    for (let i = 0; i < SO_DONG_CHAY; i++) {
      b.push(dsTen[Math.floor(Math.random() * dsTen.length)]);
    }
    const oDich = SO_DONG_CHAY - 3;      // chừa vài dòng phía dưới cho khỏi hụt băng
    b[oDich] = trungTen;
    setBang(b);
    setDangChay(true);

    const batDau = performance.now();
    const quangDuong = oDich * CAO_DONG;

    const buoc = (gio: number) => {
      const t = Math.min(1, (gio - batDau) / keoDai);
      setDich(quangDuong * chamDan(t));
      if (t < 1) {
        khung.current = requestAnimationFrame(buoc);
      } else {
        setDangChay(false);
        onXong?.();
      }
    };
    khung.current = requestAnimationFrame(buoc);

    return () => { if (khung.current) cancelAnimationFrame(khung.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dangQuay, trungTen]);

  /* Chạy nhanh thì nhoè đi cho ra cảm giác tốc độ, gần dừng thì nét lại. */
  const conLai = bang.length ? 1 - dich / ((SO_DONG_CHAY - 3) * CAO_DONG) : 0;
  const nhoe = dangChay ? Math.min(7, conLai * 9) : 0;

  const daDung = !dangChay && !!trungTen;

  return (
    <div className="relative rounded-2xl overflow-hidden border-2 border-violet-300 bg-gradient-to-b from-violet-50 via-white to-violet-50"
         style={{ height: CAO_DONG * 3 }}>

      {/* Mờ dần hai mép để chỉ ô giữa là rõ */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[92px]
                      bg-gradient-to-b from-white via-white/85 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[92px]
                      bg-gradient-to-t from-white via-white/85 to-transparent" />

      {/* Khung ngắm ở giữa */}
      <div className="pointer-events-none absolute inset-x-3 z-10 rounded-xl border-[3px] border-violet-500/70
                      bg-violet-100/30"
           style={{ top: CAO_DONG, height: CAO_DONG }} />

      {/* Hai mũi nhọn hai bên khung ngắm */}
      <div className="pointer-events-none absolute left-0 z-30 w-0 h-0
                      border-y-[12px] border-y-transparent border-l-[16px] border-l-violet-600"
           style={{ top: CAO_DONG + CAO_DONG / 2 - 12 }} />
      <div className="pointer-events-none absolute right-0 z-30 w-0 h-0
                      border-y-[12px] border-y-transparent border-r-[16px] border-r-violet-600"
           style={{ top: CAO_DONG + CAO_DONG / 2 - 12 }} />

      {bang.length === 0 ? (
        <div className="h-full flex items-center justify-center text-[22px] font-black text-violet-300 px-4 text-center">
          Bấm QUAY để gọi tên
        </div>
      ) : (
        <div
          className="absolute inset-x-0"
          style={{
            top: CAO_DONG,                       // dòng đầu nằm sẵn trong khung ngắm
            transform: `translateY(-${dich}px)`,
            filter: nhoe > 0.4 ? `blur(${nhoe}px)` : undefined,
          }}
        >
          {bang.map((ten, i) => (
            <div key={i}
                 className="flex items-center justify-center text-center px-4 font-black
                            text-violet-900 leading-tight"
                 style={{ height: CAO_DONG, fontSize: ten.length > 22 ? 26 : 32 }}>
              {ten}
            </div>
          ))}
        </div>
      )}

      {/* Loé sáng lúc vừa dừng */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-700"
        style={{
          opacity: daDung ? 1 : 0,
          boxShadow: 'inset 0 0 60px 10px rgba(139,92,246,0.45)',
        }}
      />

      {/*
        KHÔNG dùng <style jsx>: styled-jsx viết lại mọi className trong component thành
        chuỗi JS, mà className của ta xuống dòng cho dễ đọc - thành ra chuỗi có xuống dòng
        thật, không đóng được, cả trang trắng. Loé sáng làm bằng chuyển màu thường là đủ.
      */}
    </div>
  );
}
