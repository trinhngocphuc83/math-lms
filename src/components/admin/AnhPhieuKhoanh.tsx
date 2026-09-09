"use client";

/**
 * Ảnh phiếu trả lời có KHOANH ĐÁP ÁN ngay trên từng ô tròn.
 *
 * Vì sao cần: bảng bên phải nói "Câu 4 → D, sai" nhưng Thầy cô vẫn phải tự dò xuống ảnh
 * xem em ấy tô ô nào, mà một tờ có ba mươi mấy câu. Khoanh thẳng lên ảnh thì liếc một cái
 * là thấy cả bài: chỗ nào xanh, chỗ nào đỏ.
 *
 *   xanh liền  - em tô ô này và ĐÚNG đáp án
 *   đỏ liền    - em tô ô này nhưng SAI
 *   xanh đứt   - đáp án đúng nằm ở đây, vẽ kèm khi em làm sai để thấy lẽ ra phải tô đâu
 *   cam liền   - máy chưa dám đọc, Thầy cô nhìn giúp
 *
 * Vòng khoanh dùng toạ độ ĐÃ NẮN về chính tấm ảnh (`viTriO` của docPhieuQuet), nên ảnh
 * chụp nghiêng hay méo thì vòng vẫn rơi đúng ô.
 */
import React from "react";
import type { KetQuaDocPhieu } from "@/utils/docPhieuQuet";
import type { CauDaCham } from "@/utils/chamPhieuQuet";

type Mau = 'dung' | 'sai' | 'dapAn' | 'vuong';

const NET: Record<Mau, { mau: string; dut: boolean; day: number }> = {
  dung:  { mau: '#059669', dut: false, day: 3 },
  sai:   { mau: '#e11d48', dut: false, day: 3 },
  dapAn: { mau: '#059669', dut: true,  day: 2.5 },
  vuong: { mau: '#d97706', dut: false, day: 3 },
};

/**
 * Những vòng cần vẽ cho một trang.
 *
 * Mã ô do luoiToTron đặt: "NLC:3:B", "DS:2:c:Đ", "TLN:1:0:7" - ghép lại từ đáp án của
 * từng câu thì ra đúng ô cần khoanh.
 */
function cacVong(cau: CauDaCham[], viTri: NonNullable<KetQuaDocPhieu['viTriO']>) {
  const oCua = new Map(viTri.map(v => [v.ma, v]));
  const ra: { x: number; y: number; r: number; kieu: Mau }[] = [];
  const them = (ma: string, kieu: Mau) => {
    const v = oCua.get(ma);
    if (v) ra.push({ x: v.x, y: v.y, r: v.r, kieu });
  };

  for (const c of cau) {
    const chuaCham = c.diem === null;

    if (c.loai === 'NLC') {
      if (c.hocSinh) them(`${c.ma}:${c.hocSinh}`, chuaCham ? 'vuong' : c.hocSinh === c.dapAn ? 'dung' : 'sai');
      /* Làm sai thì chỉ luôn chỗ đáng lẽ phải tô - đỡ phải mở đáp án ra dò. */
      if (!chuaCham && c.dapAn && c.hocSinh !== c.dapAn) them(`${c.ma}:${c.dapAn}`, 'dapAn');
      continue;
    }

    if (c.loai === 'DS') {
      /* Bốn ý a b c d, mỗi ý một ô Đ và một ô S. Đáp án cũng là bốn ký tự. */
      const y = ['a', 'b', 'c', 'd'];
      const dap = String(c.dapAn || '').toUpperCase().replace(/[^ĐS]/g, '');
      for (let k = 0; k < 4; k++) {
        const em = (c.hocSinh ?? '')[k];
        const dung = dap[k];
        if (em === 'Đ' || em === 'S') {
          them(`${c.ma}:${y[k]}:${em}`, chuaCham ? 'vuong' : em === dung ? 'dung' : 'sai');
          if (!chuaCham && dung && em !== dung) them(`${c.ma}:${y[k]}:${dung}`, 'dapAn');
        }
      }
      continue;
    }

    /* Trả lời ngắn: mỗi cột một ký tự. Cả câu đúng hay sai thì bốn cột cùng màu. */
    const em = c.hocSinh ?? '';
    const kieu: Mau = chuaCham ? 'vuong' : c.diem === c.diemToiDa ? 'dung' : 'sai';
    for (let cot = 0; cot < em.length; cot++) {
      if (!em[cot] || em[cot] === ' ') continue;
      them(`${c.ma}:${cot}:${em[cot]}`, kieu);
    }
  }
  return ra;
}

export default function AnhPhieuKhoanh({
  anhUrl, tenTep, doc, cau, khoanh = true,
}: {
  anhUrl: string;
  tenTep: string;
  doc?: KetQuaDocPhieu;
  cau: CauDaCham[];
  khoanh?: boolean;
}) {
  const [co, setCo] = React.useState<{ w: number; h: number } | null>(null);
  const vong = React.useMemo(
    () => (doc?.viTriO && khoanh ? cacVong(cau, doc.viTriO) : []),
    [doc, cau, khoanh],
  );

  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={anhUrl}
        alt={tenTep}
        className="w-full block"
        onLoad={e => setCo({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      />
      {/* Lớp khoanh xếp chồng đúng khít ảnh. Dùng viewBox theo cỡ THẬT của ảnh nên ảnh co
          giãn cỡ nào vòng cũng bám đúng ô, không phải tính lại tỉ lệ. */}
      {co && vong.length > 0 && (
        <svg
          viewBox={`0 0 ${co.w} ${co.h}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden
        >
          {vong.map((v, i) => {
            const n = NET[v.kieu];
            return (
              <circle
                key={i}
                cx={v.x} cy={v.y} r={v.r * 1.55}
                fill="none"
                stroke={n.mau}
                strokeWidth={Math.max(2, v.r * 0.36 * (n.day / 3))}
                strokeDasharray={n.dut ? `${v.r * 0.8} ${v.r * 0.6}` : undefined}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}
