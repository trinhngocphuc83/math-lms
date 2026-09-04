/**
 * PHIẾU TRẢ LỜI - tờ giấy học sinh làm bài.
 *
 * Dựng theo đúng cấu trúc tệp mẫu của Thầy cô (Phiếu trả lời đề KT cuối chương Toán 10):
 * bảng thông tin và ô điểm ở đầu, rồi từng phần một, cuối cùng là phần tự luận có dòng
 * kẻ chấm. Màu, cỡ chữ, bề rộng cột đều đo từ tệp .docx thật.
 *
 * KHÁC TỆP MẪU MỘT CHỖ, CÓ CHỦ Ý: tệp mẫu đặt khổ giấy Letter (12240 twip) - dấu vết của
 * máy sinh ra nó. Ta dùng A4 như mọi tệp khác của app, và mọi bề rộng cột đều tính từ
 * BE_NGANG_IN chứ không viết cứng con số 10080.
 *
 * MỌI THỨ SUY TỪ ĐỀ THẬT, không viết cứng theo khuôn 3-2-2-3: phần nào có câu thì phiếu
 * có khối ấy, số ô đúng bằng số câu. Đề 100% trắc nghiệm ra phiếu một trang chỉ có lưới;
 * đề 100% tự luận ra phiếu chỉ có dòng kẻ chấm.
 *
 * SỐ CÂU KHỚP VỚI ĐỀ: mỗi phần đánh lại từ Câu 1, đúng như bản in đề (xem
 * deThi.chiaPhanDeThi). Đề và phiếu bắt buộc phải cùng một lối đánh số, không thì học
 * sinh điền lệch ô.
 *
 * ĐỂ MÁY CHẤM ĐƯỢC ẢNH CHỤP: dấu neo bốn góc và mã QR ghi rõ đây là phiếu trả lời của đề
 * nào; vùng học sinh viết luôn nền trắng, dòng kẻ chấm màu xám nhạt.
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  AlignmentType, VerticalAlign, ShadingType, Header, Footer, BorderStyle,
} from "docx";
import {
  NAVY, NEN_BANG_PHIEU, NEN_O_DIEM, DO_TONG_DIEM, XAM_MO, DEN,
  CO_NOI_DUNG, CO_TIEU_DE_PHU, CO_TIEU_DE_CHINH, CO_GHI_CHU,
  BE_NGANG_IN, KHONG_VIEN, VIEN_LUOI, KIEU_MAC_DINH, TRANG_CHUAN,
  daiNeo, daiNeoDauTrang, dongKeCham, anhQR, noiDungQR,
} from "./mauDeThi";
import { soDiemVN, type DauDe, type PhanDeThi } from "./deThi";

const chu = (x: any) => String(x ?? '');

/* ===================== SỐ DÒNG KẺ CHẤM ===================== */

/**
 * Một câu tự luận cần chừa mấy dòng kẻ chấm.
 *
 * Công thức lấy từ bản Master Prompt THCS v6:
 *   số dòng kẻ = số dòng lời giải mẫu + số ý nhỏ + 3 dòng biên an toàn
 *
 * Chừa thiếu thì học sinh viết tràn ra lề, chừa thừa thì tốn giấy in. Câu chưa có lời
 * giải thì lấy mức giữa cho an toàn.
 */
export function soDongKeCham(loiGiai: string | null | undefined, deBai?: string | null): number {
  const g = chu(loiGiai).trim();
  const soYNho = (chu(deBai).match(/(?:^|\n)\s*[a-d]\s*[).]/gi) || []).length;

  if (!g) return 12;
  const soDongGiai = g.split('\n').filter(d => d.trim()).length;
  return Math.max(6, Math.min(26, soDongGiai + soYNho + 3));
}

/** Câu này có bắt vẽ hình không - nếu có thì chừa thêm một khung trống. */
export function canKhungVeHinh(deBai: string | null | undefined): boolean {
  return /vẽ\s+(hình|đồ thị|biểu đồ|sơ đồ)|dựng\s+hình|vẽ\s+và/i.test(chu(deBai));
}

/* ===================== KHỐI DÙNG CHUNG ===================== */

const oTieuDe = (nhan: string, rong?: number) => new TableCell({
  shading: { type: ShadingType.CLEAR, fill: NEN_BANG_PHIEU, color: "auto" },
  verticalAlign: VerticalAlign.CENTER,
  ...(rong ? { width: { size: rong, type: WidthType.DXA } } : {}),
  margins: { top: 60, bottom: 60, left: 60, right: 60 },
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: nhan, bold: true, color: NAVY, size: 21 })],
  })],
});

/** Ô để trống cho học sinh điền - nền TRẮNG tuyệt đối để máy soi độ đen khi chấm ảnh. */
const oTrong = (cao = 1, rong?: number) => new TableCell({
  ...(rong ? { width: { size: rong, type: WidthType.DXA } } : {}),
  margins: { top: 60, bottom: 60, left: 60, right: 60 },
  children: Array.from({ length: cao }, () => new Paragraph({ text: "" })),
});

const tieuDePhan = (soLaMa: string, ten: string, soCau: number, diem?: number): Paragraph =>
  new Paragraph({
    spacing: { before: 280, after: 60 },
    children: [new TextRun({
      text: `PHẦN ${soLaMa}. ${ten} (${soCau} câu`
        + (typeof diem === 'number' && diem > 0 ? ` - ${soDiemVN(diem)} điểm` : '') + ')',
      bold: true, color: NAVY, size: CO_TIEU_DE_PHU,
    })],
  });

const dongHuongDan = (chuHD: string): Paragraph => new Paragraph({
  spacing: { after: 120 },
  children: [new TextRun({ text: chuHD, italics: true, size: 21 })],
});

/** Cắt danh sách thành từng khúc để bảng không bị quá nhiều cột trên một dòng. */
function chiaKhuc<T>(ds: T[], moiKhuc: number): T[][] {
  const ra: T[][] = [];
  for (let i = 0; i < ds.length; i += moiKhuc) ra.push(ds.slice(i, i + moiKhuc));
  return ra;
}

/* ===================== TỪNG PHẦN ===================== */

/** PHẦN TRẮC NGHIỆM: lưới C1..Cn, học sinh điền chữ cái vào ô dưới. */
function khoiTracNghiem(soCau: number): any[] {
  const MOI_HANG = 12;                      // quá 12 cột thì ô hẹp, viết không lọt
  const ra: any[] = [];
  for (const khuc of chiaKhuc(Array.from({ length: soCau }, (_, i) => i + 1), MOI_HANG)) {
    /* Bề rộng ô tính theo SỐ CỘT ĐẦY của một hàng, không theo số cột của khúc này -
       khúc cuối ít cột hơn mà để bảng rộng 100% thì ô phình to, nhìn so le với hàng trên. */
    const rongCot = Math.floor(BE_NGANG_IN / Math.min(soCau, MOI_HANG));
    ra.push(new Table({
      width: { size: rongCot * khuc.length, type: WidthType.DXA },
      borders: VIEN_LUOI,
      columnWidths: khuc.map(() => rongCot),
      rows: [
        new TableRow({ tableHeader: true, children: khuc.map(n => oTieuDe(`C${n}`, rongCot)) }),
        /* Ô trả lời cao gấp đôi dòng thường để học sinh viết thoải mái - và để máy chấm
           ảnh có đủ chỗ nhận ra chữ cái. */
        new TableRow({ height: { value: 576, rule: 'atLeast' as any }, children: khuc.map(() => oTrong(1, rongCot)) }),
      ],
    }));
    ra.push(new Paragraph({ text: "", spacing: { after: 80 } }));
  }
  return ra;
}

/**
 * PHẦN ĐÚNG/SAI: mỗi câu một khối bốn dòng a) b) c) d), hai câu xếp cạnh nhau cho gọn
 * giấy - đúng cách tệp mẫu làm.
 */
function khoiDungSai(soCau: number, batDau = 1): any[] {
  const Y = ['a)', 'b)', 'c)', 'd)'];
  /* Bề ngang một nửa bảng: Câu hỏi | Ý | Đúng (X) | Sai (X). Tỉ lệ lấy từ tệp mẫu. */
  const nua = BE_NGANG_IN / 2;
  const cot = [0.286, 0.171, 0.271, 0.271].map(t => Math.floor(nua * t));
  const ra: any[] = [];

  for (const cap of chiaKhuc(Array.from({ length: soCau }, (_, i) => batDau + i), 2)) {
    const hangTieuDe = new TableRow({
      tableHeader: true,
      children: cap.flatMap(() => [
        oTieuDe('Câu hỏi', cot[0]), oTieuDe('Ý', cot[1]),
        oTieuDe('Đúng (X)', cot[2]), oTieuDe('Sai (X)', cot[3]),
      ]),
    });

    const hangY = Y.map((y, i) => new TableRow({
      height: { value: 400, rule: 'atLeast' as any },
      children: cap.flatMap(soCauNay => [
        /* Ô tên câu gộp dọc bốn dòng - chỉ dựng ở dòng đầu. */
        ...(i === 0 ? [new TableCell({
          rowSpan: 4,
          verticalAlign: VerticalAlign.CENTER,
          width: { size: cot[0], type: WidthType.DXA },
          margins: { top: 60, bottom: 60, left: 60, right: 60 },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `Câu ${soCauNay}`, bold: true, size: 21 })],
          })],
        })] : []),
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          width: { size: cot[1], type: WidthType.DXA },
          margins: { top: 60, bottom: 60, left: 60, right: 60 },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: y, bold: true, size: 21 })],
          })],
        }),
        oTrong(1, cot[2]),
        oTrong(1, cot[3]),
      ]),
    }));

    ra.push(new Table({
      /* Số câu lẻ thì khối cuối chỉ chiếm nửa trang, không kéo giãn cho đầy. */
      width: { size: cot.reduce((t, x) => t + x, 0) * cap.length, type: WidthType.DXA },
      borders: VIEN_LUOI,
      columnWidths: cap.flatMap(() => cot),
      rows: [hangTieuDe, ...hangY],
    }));
    ra.push(new Paragraph({ text: "", spacing: { after: 80 } }));
  }
  return ra;
}

/** PHẦN TRẢ LỜI NGẮN: mỗi câu một ô rộng để ghi kết quả. */
function khoiTraLoiNgan(soCau: number, batDau = 1): any[] {
  const MOI_HANG = 4;
  const ra: any[] = [];
  for (const khuc of chiaKhuc(Array.from({ length: soCau }, (_, i) => batDau + i), MOI_HANG)) {
    const rongCot = Math.floor(BE_NGANG_IN / Math.min(soCau, MOI_HANG));
    ra.push(new Table({
      width: { size: rongCot * khuc.length, type: WidthType.DXA },
      borders: VIEN_LUOI,
      columnWidths: khuc.map(() => rongCot),
      rows: [
        new TableRow({ tableHeader: true, children: khuc.map(n => oTieuDe(`Câu ${n}`, rongCot)) }),
        new TableRow({ height: { value: 620, rule: 'atLeast' as any }, children: khuc.map(() => oTrong(1, rongCot)) }),
      ],
    }));
    ra.push(new Paragraph({ text: "", spacing: { after: 80 } }));
  }
  return ra;
}

/** Khung nét đứt cho câu bắt vẽ hình - cao 6cm theo bản Master Prompt THCS v6. */
function khungVeHinh(): Table {
  const netDut = { style: BorderStyle.DASHED, size: 6, color: XAM_MO };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: netDut, bottom: netDut, left: netDut, right: netDut },
    rows: [new TableRow({
      height: { value: 3402, rule: 'atLeast' as any },   // 6cm
      children: [new TableCell({
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: 'Phần vẽ hình', italics: true, color: XAM_MO, size: CO_GHI_CHU })],
        })],
      })],
    })],
  });
}

/** PHẦN TỰ LUẬN: mỗi câu một tiêu đề rồi tới các dòng kẻ chấm. */
function khoiTuLuan(phan: PhanDeThi, diemMoiCau: number): any[] {
  const ra: any[] = [];
  phan.cauHoi.forEach((q: any, i: number) => {
    ra.push(new Paragraph({
      spacing: { before: 240, after: 140 },
      children: [new TextRun({
        text: `Câu ${i + 1}`
          + (diemMoiCau > 0 ? ` (${soDiemVN(diemMoiCau)} điểm)` : '')
          + '. Phần làm bài của học sinh:',
        bold: true, color: NAVY,
      })],
    }));

    if (canKhungVeHinh(q?.content)) {
      ra.push(khungVeHinh());
      ra.push(new Paragraph({ text: "", spacing: { after: 80 } }));
    }

    const soDong = soDongKeCham(q?.explanation, q?.content);
    for (let d = 0; d < soDong; d++) ra.push(dongKeCham());
  });
  return ra;
}

/* ===================== ĐẦU PHIẾU ===================== */

function bangDauPhieu(dauDe: DauDe, cacPhan: PhanDeThi[], diemPhan: Record<string, number>): Table {
  const trai: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: chu(dauDe.tenLopHoc).toUpperCase(), bold: true, size: CO_TIEU_DE_PHU, color: NAVY })] }),
    new Paragraph({ children: [new TextRun({ text: 'Họ và tên học sinh: ..................................', size: 21 })] }),
    new Paragraph({ children: [new TextRun({ text: 'Lớp: ......................   SBD: ......................', size: 21 })] }),
    new Paragraph({
      children: [new TextRun({
        text: 'Phòng thi: ................   ' + (chu(dauDe.tenKyThi) || 'Đề kiểm tra')
          + (dauDe.maDe ? `   Mã đề: ${dauDe.maDe}` : ''),
        size: 21,
      })],
    }),
  ];

  /* Ô điểm: liệt kê đúng các phần CÓ THẬT trong đề, hai phần một dòng cho gọn. */
  const dongDiem: TextRun[] = [];
  const nhan = cacPhan.map(p => `Phần ${p.soLaMa}: ..... /${soDiemVN(diemPhan[p.ma] || 0)}đ`);
  chiaKhuc(nhan, 2).forEach((cap, i) => {
    if (i > 0) dongDiem.push(new TextRun({ break: 1, size: 19 }));
    dongDiem.push(new TextRun({ text: cap.join('  |  '), size: 19 }));
  });
  const tong = cacPhan.reduce((t, p) => t + (diemPhan[p.ma] || 0), 0);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: VIEN_LUOI,
    columnWidths: [Math.floor(BE_NGANG_IN * 0.49), Math.floor(BE_NGANG_IN * 0.51)],
    rows: [new TableRow({
      children: [
        new TableCell({ margins: { top: 100, bottom: 100, left: 140, right: 100 }, children: trai }),
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: NEN_O_DIEM, color: "auto" },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'ĐIỂM SỐ CHI TIẾT', bold: true, color: NAVY, size: 21 })],
            }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: dongDiem }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60 },
              children: [new TextRun({
                text: `TỔNG ĐIỂM: ............. / ${soDiemVN(tong || 10)}đ`,
                bold: true, color: DO_TONG_DIEM, size: CO_NOI_DUNG,
              })],
            }),
          ],
        }),
      ],
    })],
  });
}

/* ===================== DỰNG CẢ PHIẾU ===================== */

const HUONG_DAN: Record<string, string> = {
  NLC: 'Thí sinh chọn phương án trả lời đúng nhất và điền chữ cái A, B, C hoặc D tương ứng vào ô.',
  DS: 'Thí sinh đánh dấu (X) vào ô Đúng hoặc Sai cho mỗi ý a), b), c), d) tương ứng.',
  TLN: 'Thí sinh tính toán và ghi kết quả (số hoặc biểu thức) vào các ô tương ứng.',
  TL: 'Thí sinh trình bày chi tiết các bước lập luận, chứng minh và lời giải vào phần giấy kẻ sẵn dưới đây.',
};

const TEN_PHAN_PHIEU: Record<string, string> = {
  NLC: 'TRẮC NGHIỆM NHIỀU LỰA CHỌN',
  DS: 'TRẮC NGHIỆM ĐÚNG/SAI',
  TLN: 'TRẮC NGHIỆM TRẢ LỜI NGẮN',
  TL: 'TỰ LUẬN',
};

export interface KhuonPhieu {
  dauDe: DauDe;
  cacPhan: PhanDeThi[];
  diemPhan: Record<string, number>;
  boDeId?: string;
}

/** Dựng toàn bộ nội dung phiếu. Tách riêng để chỗ khác dùng lại được (xem trước, gộp tệp). */
export function dungNoiDungPhieu(k: KhuonPhieu): any[] {
  const ra: any[] = [bangDauPhieu(k.dauDe, k.cacPhan, k.diemPhan)];

  const coTuLuan = k.cacPhan.some(p => p.ma === 'TL');
  ra.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 160 },
    children: [new TextRun({
      text: 'PHIẾU TRẢ LỜI' + (coTuLuan ? ' TRẮC NGHIỆM & TỰ LUẬN' : ' TRẮC NGHIỆM'),
      bold: true, color: NAVY, size: CO_TIEU_DE_CHINH,
    })],
  }));

  for (const phan of k.cacPhan) {
    const soCau = phan.cauHoi.length;
    /* Phần tự luận sang trang mới - giữ trọn phần trắc nghiệm trong một tờ để chấm nhanh. */
    if (phan.ma === 'TL') ra.push(new Paragraph({ text: "", pageBreakBefore: true }));

    ra.push(tieuDePhan(phan.soLaMa, TEN_PHAN_PHIEU[phan.ma] || phan.tieuDe, soCau, k.diemPhan[phan.ma]));
    ra.push(dongHuongDan(HUONG_DAN[phan.ma] || ''));

    if (phan.ma === 'NLC') ra.push(...khoiTracNghiem(soCau));
    else if (phan.ma === 'DS') ra.push(...khoiDungSai(soCau));
    else if (phan.ma === 'TLN') ra.push(...khoiTraLoiNgan(soCau));
    else ra.push(...khoiTuLuan(phan, soCau > 0 ? (k.diemPhan[phan.ma] || 0) / soCau : 0));
  }

  return ra;
}

/** Xuất phiếu trả lời ra tệp Word và tải về. */
export async function exportPhieuTraLoi(k: KhuonPhieu, tenTep: string): Promise<boolean> {
  const qr = await anhQR(noiDungQR({
    boDeId: k.boDeId, maDe: k.dauDe?.maDe, loai: 'pt', trang: 1,
  }), 74);

  const doc = new Document({
    styles: KIEU_MAC_DINH,
    sections: [{
      properties: TRANG_CHUAN,
      headers: { default: new Header({ children: [daiNeoDauTrang({ maDe: k.dauDe?.maDe, loai: 'pt' })] }) },
      footers: { default: new Footer({ children: [daiNeo()] }) },
      children: [
        /* Mã QR đặt ngay đầu phiếu, canh phải - máy chấm ảnh đọc ra ngay đây là phiếu
           của đề nào, mã đề nào, khỏi bắt Thầy cô chọn tay. */
        ...(qr ? [new Paragraph({ alignment: AlignmentType.RIGHT, children: [qr] })] : []),
        ...dungNoiDungPhieu(k),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer as any], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${tenTep}_phieu_tra_loi.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
