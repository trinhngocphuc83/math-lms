/**
 * BẢN HƯỚNG DẪN CHẤM VÀ BIỂU ĐIỂM CHI TIẾT - tệp của giáo viên khi ngồi chấm.
 *
 * Dựng theo hai bản mẫu thật của Thầy cô: "BAREM CHẤM" (Toán 10, chương Mệnh đề - Tập
 * hợp) và bản Master Prompt THCS v6. Chỗ nào hai bản khác nhau thì theo bản v6 vì đó là
 * bản mới hơn và chính nó nói rõ đang thay cái cũ:
 *
 *   - Biểu điểm tự luận: bản Toán 10 dùng bảng BA cột (Các bước | Sơ đồ biến đổi | Điểm),
 *     nhưng cột "Các bước" là tên do AI tự đặt cho từng bước. Bản v6 chốt lại bảng HAI
 *     cột "Nội dung giải chi tiết & Các bước lập luận | Biểu điểm" - tinh gọn hơn, và
 *     quan trọng hơn: dựng được từ chính lời giải đang có, không phải bịa tên bước.
 *
 * MỌI THỨ SUY TỪ ĐỀ THẬT: phần nào có câu thì bản chấm có mục ấy. Đề toàn trắc nghiệm ra
 * bản chấm chỉ có bảng đáp án; đề toàn tự luận ra bản chấm chỉ có biểu điểm.
 *
 * Số câu mỗi phần đánh lại từ 1, khớp đúng bản in đề và phiếu trả lời.
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  AlignmentType, VerticalAlign, ShadingType, Header, Footer,
} from "docx";
import {
  NAVY, TRANG, NEN_BANG_PHIEU, NEN_O_DIEM, DO_TONG_DIEM, XAM_MO,
  CO_TIEU_DE_PHU, CO_TIEU_DE_CHINH, CO_GHI_CHU,
  BE_NGANG_IN, VIEN_LUOI, KIEU_MAC_DINH, TRANG_CHUAN,
  daiNeo, daiNeoDauTrang, anhQR, noiDungQR, hopKyThuat, nhanTrongHop,
} from "./mauDeThi";
import { soDiemVN, lamTron, type DauDe, type PhanDeThi } from "./deThi";
import { docDapAnDungSai } from "./chuanHoaCauHoi";

const chu = (x: any) => String(x ?? '');
const gon = (s: any) => chu(s).replace(/\s+/g, ' ').trim();

/* ===================== CHIA ĐIỂM TỪNG BƯỚC ===================== */

/**
 * Chia điểm của một câu tự luận ra từng bước lập luận.
 *
 * Bản Master Prompt v6 yêu cầu chia nhỏ tới 0,10 - 0,25 điểm cho mỗi bước. Ở đây làm
 * đúng thế: ưu tiên bước 0,25đ, câu nhiều bước quá thì hạ xuống 0,10đ, và phần dư dồn
 * vào những bước đầu để tổng luôn khớp tuyệt đối với điểm của câu.
 *
 * Trả về mảng điểm, dài đúng bằng số bước THỰC SỰ dựng được (có thể ít hơn số bước xin,
 * lúc đó bên gọi phải gộp bớt dòng lại - xem gomBuoc).
 */
export function chiaDiemTungBuoc(diem: number, soBuoc: number): number[] {
  const tong = Math.max(0, Number(diem) || 0);
  if (tong <= 0 || soBuoc <= 0) return [];

  /* Bước nhỏ nhất: 0,25đ; không đủ chia thì hạ xuống 0,10đ. */
  const donVi = tong / soBuoc >= 0.25 ? 0.25 : 0.1;
  const tongDonVi = Math.round(tong / donVi);
  const n = Math.min(soBuoc, tongDonVi);
  if (n <= 0) return [];

  const moiBuoc = Math.floor(tongDonVi / n);
  const du = tongDonVi - moiBuoc * n;
  return Array.from({ length: n }, (_, i) =>
    lamTron((moiBuoc + (i < du ? 1 : 0)) * donVi));
}

/** Gộp các dòng lời giải thành đúng `soNhom` bước, giữ nguyên thứ tự. */
export function gomBuoc(dsDong: string[], soNhom: number): string[][] {
  if (soNhom <= 0) return [];
  if (dsDong.length <= soNhom) return dsDong.map(d => [d]);
  const ra: string[][] = Array.from({ length: soNhom }, () => []);
  dsDong.forEach((d, i) => ra[Math.min(soNhom - 1, Math.floor(i * soNhom / dsDong.length))].push(d));
  return ra;
}

/* ===================== TÁCH LỜI GIẢI ===================== */

/** Cắt phần "Lưu ý / Chú ý / Sai lầm" ra khỏi lời giải để đưa vào hộp riêng. */
export function tachLuuY(loiGiai: string): { giai: string; luuY: string } {
  const s = chu(loiGiai);
  const m = s.match(/(?:^|\n)\s*(?:\*{0,2})\s*(?:lưu ý|chú ý|sai lầm)[^\n]*[:：]/i);
  if (!m || m.index === undefined) return { giai: s, luuY: '' };
  return { giai: s.slice(0, m.index).trim(), luuY: s.slice(m.index).trim() };
}

/** Các dòng lập luận của lời giải, đã bỏ dòng trống và dấu gạch đầu dòng. */
function dongLapLuan(loiGiai: string): string[] {
  return chu(loiGiai)
    .split('\n')
    .map(d => d.replace(/^\s*[-+*•➤]\s*/, '').trim())
    .filter(Boolean);
}

/* ===================== KHỐI DÙNG CHUNG ===================== */

const oTieuDe = (nhan: string, rong?: number) => new TableCell({
  shading: { type: ShadingType.CLEAR, fill: NAVY, color: "auto" },
  verticalAlign: VerticalAlign.CENTER,
  ...(rong ? { width: { size: rong, type: WidthType.DXA } } : {}),
  margins: { top: 70, bottom: 70, left: 80, right: 80 },
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: nhan, bold: true, color: TRANG, size: 21 })],
  })],
});

const oChu = (noiDung: any[], opt: { nen?: string; canGiua?: boolean; rong?: number } = {}) =>
  new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    ...(opt.nen ? { shading: { type: ShadingType.CLEAR, fill: opt.nen, color: "auto" } } : {}),
    ...(opt.rong ? { width: { size: opt.rong, type: WidthType.DXA } } : {}),
    margins: { top: 70, bottom: 70, left: 80, right: 80 },
    children: noiDung,
  });

const dong = (chuNoiDung: string, opt: { dam?: boolean; nghieng?: boolean; mau?: string; canGiua?: boolean; co?: number } = {}) =>
  new Paragraph({
    ...(opt.canGiua ? { alignment: AlignmentType.CENTER } : {}),
    children: [new TextRun({
      text: chuNoiDung, bold: opt.dam, italics: opt.nghieng,
      color: opt.mau, size: opt.co,
    })],
  });

const tieuDePhan = (soLaMa: string, ten: string, diem?: number): Paragraph =>
  new Paragraph({
    spacing: { before: 300, after: 80 },
    children: [new TextRun({
      text: `PHẦN ${soLaMa}. ${ten}`
        + (typeof diem === 'number' && diem > 0 ? ` (${soDiemVN(diem)} điểm)` : ''),
      bold: true, color: NAVY, size: CO_TIEU_DE_PHU,
    })],
  });

function chiaKhuc<T>(ds: T[], moiKhuc: number): T[][] {
  const ra: T[][] = [];
  for (let i = 0; i < ds.length; i += moiKhuc) ra.push(ds.slice(i, i + moiKhuc));
  return ra;
}

/* ===================== PHẦN TRẮC NGHIỆM ===================== */

/** Bảng tra đáp án nhanh: hàng trên số câu, hàng dưới đáp án. */
function bangDapAnNhanh(phan: PhanDeThi): any[] {
  const MOI_HANG = 12;
  const ds = phan.cauHoi.map((q: any, i: number) => ({
    so: i + 1, dapAn: gon(q?.correct_answer) || '—',
  }));
  const ra: any[] = [];
  for (const khuc of chiaKhuc(ds, MOI_HANG)) {
    const rongCot = Math.floor(BE_NGANG_IN / Math.min(ds.length, MOI_HANG));
    ra.push(new Table({
      width: { size: rongCot * khuc.length, type: WidthType.DXA },
      borders: VIEN_LUOI,
      columnWidths: khuc.map(() => rongCot),
      rows: [
        new TableRow({ tableHeader: true, children: khuc.map(x => oTieuDe(`Câu ${x.so}`, rongCot)) }),
        new TableRow({
          children: khuc.map(x => oChu([dong(x.dapAn, { dam: true, mau: NAVY, canGiua: true })],
            { nen: NEN_O_DIEM, rong: rongCot })),
        }),
      ],
    }));
    ra.push(new Paragraph({ text: "", spacing: { after: 100 } }));
  }
  return ra;
}

/* ===================== PHẦN ĐÚNG / SAI ===================== */

/**
 * Bảng quy đổi điểm lũy tiến của Bộ: đúng 1 ý 0,1đ · 2 ý 0,25đ · 3 ý 0,5đ · cả 4 ý 1,0đ.
 *
 * Nhân theo điểm mỗi câu của khuôn đang dùng, nên khuôn nào cũng ra đúng con số - đề để
 * mỗi câu Đúng/Sai 1,0đ thì ra đúng bảng của Bộ, để 2,0đ thì mọi mốc gấp đôi.
 */
export const MOC_LUY_TIEN = [0.1, 0.25, 0.5, 1.0];

function bangLuyTien(diemMoiCau: number): Table {
  const heSo = diemMoiCau > 0 ? diemMoiCau : 1;
  const rongCot = Math.floor(BE_NGANG_IN / 4);
  const nhan = ['Đúng 1 ý', 'Đúng 2 ý', 'Đúng 3 ý', 'Đúng cả 4 ý'];
  return new Table({
    width: { size: rongCot * 4, type: WidthType.DXA },
    borders: VIEN_LUOI,
    columnWidths: [rongCot, rongCot, rongCot, rongCot],
    rows: [
      new TableRow({
        tableHeader: true,
        children: nhan.map(n => oChu([dong(n, { dam: true, canGiua: true })],
          { nen: NEN_BANG_PHIEU, rong: rongCot })),
      }),
      new TableRow({
        children: MOC_LUY_TIEN.map(m => oChu(
          [dong(`${soDiemVN(lamTron(m * heSo))} điểm`, { dam: true, mau: NAVY, canGiua: true })],
          { rong: rongCot })),
      }),
    ],
  });
}

/** Bảng tra đáp án chi tiết Phần Đúng/Sai: mỗi ý một dòng. */
function bangChiTietDungSai(phan: PhanDeThi): Table {
  const cot = [0.20, 0.09, 0.16, 0.55].map(t => Math.floor(BE_NGANG_IN * t));
  const NHAN_Y = ['a', 'b', 'c', 'd'] as const;
  const O_Y = ['option_a', 'option_b', 'option_c', 'option_d'] as const;

  const hang: TableRow[] = [new TableRow({
    tableHeader: true,
    children: [
      oTieuDe('Câu hỏi', cot[0]), oTieuDe('Ý', cot[1]),
      oTieuDe('Đáp án đúng', cot[2]), oTieuDe('Nội dung mệnh đề', cot[3]),
    ],
  })];

  phan.cauHoi.forEach((q: any, i: number) => {
    const dapAn = docDapAnDungSai(q?.correct_answer) || '';
    NHAN_Y.forEach((y, k) => {
      const laDung = dapAn[k] === 'Đ';
      const coDapAn = !!dapAn[k];
      hang.push(new TableRow({
        children: [
          /* Ô tên câu gộp dọc bốn dòng, kèm trích đề in nghiêng để người chấm định vị. */
          ...(k === 0 ? [new TableCell({
            rowSpan: 4,
            verticalAlign: VerticalAlign.CENTER,
            width: { size: cot[0], type: WidthType.DXA },
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
            children: [
              dong(`Câu ${i + 1}`, { dam: true, canGiua: true }),
              dong(gon(q?.content).slice(0, 90), { nghieng: true, co: CO_GHI_CHU, canGiua: true }),
            ],
          })] : []),
          oChu([dong(`${y})`, { dam: true, canGiua: true })], { rong: cot[1] }),
          oChu(
            [dong(coDapAn ? (laDung ? 'ĐÚNG' : 'SAI') : '—',
              { dam: true, canGiua: true, mau: coDapAn ? (laDung ? '1E7A46' : DO_TONG_DIEM) : XAM_MO })],
            { nen: coDapAn ? (laDung ? 'EAF6EF' : 'FDECEC') : undefined, rong: cot[2] },
          ),
          oChu([dong(gon(q?.[O_Y[k]]) || '—')], { rong: cot[3] }),
        ],
      }));
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: VIEN_LUOI,
    columnWidths: cot,
    rows: hang,
  });
}

/* ===================== PHẦN TRẢ LỜI NGẮN ===================== */

function bangTraLoiNgan(phan: PhanDeThi): Table {
  const cot = [0.14, 0.22, 0.64].map(t => Math.floor(BE_NGANG_IN * t));
  const hang: TableRow[] = [new TableRow({
    tableHeader: true,
    children: [
      oTieuDe('Câu hỏi', cot[0]),
      oTieuDe('Kết quả chấp nhận', cot[1]),
      oTieuDe('Ghi chú chấm thi & Bản chất phương pháp', cot[2]),
    ],
  })];

  phan.cauHoi.forEach((q: any, i: number) => {
    const { giai } = tachLuuY(chu(q?.explanation));
    hang.push(new TableRow({
      children: [
        oChu([dong(`Câu ${i + 1}`, { dam: true, canGiua: true })], { rong: cot[0] }),
        oChu([dong(gon(q?.correct_answer) || '—', { dam: true, mau: NAVY, canGiua: true })],
          { nen: NEN_O_DIEM, rong: cot[1] }),
        oChu(
          dongLapLuan(giai).slice(0, 6).map(d => dong(d)).concat(giai.trim() ? [] : [dong('—')]),
          { rong: cot[2] },
        ),
      ],
    }));
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: VIEN_LUOI,
    columnWidths: cot,
    rows: hang,
  });
}

/* ===================== PHẦN TỰ LUẬN ===================== */

/**
 * Biểu điểm một câu tự luận: bảng HAI cột theo bản Master Prompt v6.
 * Cột nội dung chiếm 80% bề ngang, cột biểu điểm 20%.
 */
function bangBieuDiem(loiGiai: string, diemCau: number): Table | null {
  const dsDong = dongLapLuan(loiGiai);
  if (dsDong.length === 0) return null;

  const diemBuoc = chiaDiemTungBuoc(diemCau, dsDong.length);
  const nhom = gomBuoc(dsDong, diemBuoc.length || 1);
  const cot = [Math.floor(BE_NGANG_IN * 0.8), Math.floor(BE_NGANG_IN * 0.2)];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: VIEN_LUOI,
    columnWidths: cot,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          oTieuDe('Nội dung giải chi tiết & Các bước lập luận', cot[0]),
          oTieuDe('Biểu điểm', cot[1]),
        ],
      }),
      ...nhom.map((cacDong, i) => new TableRow({
        children: [
          oChu(cacDong.map(d => dong(d)), { rong: cot[0] }),
          oChu([dong(diemBuoc[i] !== undefined ? `${soDiemVN(diemBuoc[i])} điểm` : '',
            { dam: true, mau: NAVY, canGiua: true })], { rong: cot[1] }),
        ],
      })),
    ],
  });
}

function khoiTuLuan(phan: PhanDeThi, diemMoiCau: number): any[] {
  const ra: any[] = [];

  phan.cauHoi.forEach((q: any, i: number) => {
    ra.push(new Paragraph({
      spacing: { before: 300, after: 100 },
      children: [
        new TextRun({
          text: `Câu ${i + 1}` + (diemMoiCau > 0 ? ` (${soDiemVN(diemMoiCau)} điểm)` : '') + '. ',
          bold: true, color: NAVY,
        }),
        new TextRun({ text: gon(q?.content).slice(0, 220), italics: true, color: '505050' }),
      ],
    }));

    const { giai, luuY } = tachLuuY(chu(q?.explanation));
    const bang = bangBieuDiem(giai, diemMoiCau);
    if (bang) {
      ra.push(bang);
      ra.push(new Paragraph({ text: "", spacing: { after: 100 } }));
    } else {
      ra.push(dong('(Chưa có lời giải cho câu này - Thầy/Cô soạn biểu điểm tay.)',
        { nghieng: true, mau: XAM_MO }));
    }

    /* Hộp lưu ý sư phạm: CHỈ dựng khi lời giải có sẵn phần lưu ý. Không tự bịa ra lời
       nhắc sư phạm - bịa sai còn hại hơn không có. */
    if (luuY) {
      ra.push(hopKyThuat([
        nhanTrongHop(`⚠ Lưu ý sư phạm & Lỗi thường gặp (Câu ${i + 1}):`),
        ...dongLapLuan(luuY.replace(/^[^\n]*[:：]\s*/, '')).map(d => dong(d, { nghieng: true })),
      ]));
      ra.push(new Paragraph({ text: "", spacing: { after: 120 } }));
    }
  });

  return ra;
}

/* ===================== DỰNG CẢ BẢN ===================== */

const TEN_PHAN: Record<string, string> = {
  NLC: 'ĐÁP ÁN TRẮC NGHIỆM NHIỀU LỰA CHỌN',
  DS: 'ĐÁP ÁN TRẮC NGHIỆM ĐÚNG/SAI',
  TLN: 'ĐÁP ÁN TRẮC NGHIỆM TRẢ LỜI NGẮN',
  TL: 'BIỂU ĐIỂM CHI TIẾT TỰ LUẬN',
};

export interface KhuonHuongDan {
  dauDe: DauDe;
  cacPhan: PhanDeThi[];
  diemPhan: Record<string, number>;
  boDeId?: string;
}

export function dungNoiDungHuongDan(k: KhuonHuongDan): any[] {
  const ra: any[] = [
    dong(chu(k.dauDe?.tenLopHoc).toUpperCase(), { dam: true, mau: NAVY, co: CO_TIEU_DE_PHU }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 40 },
      children: [new TextRun({
        text: 'BẢN HƯỚNG DẪN CHẤM VÀ BIỂU ĐIỂM CHI TIẾT',
        bold: true, color: NAVY, size: CO_TIEU_DE_CHINH,
      })],
    }),
    dong(
      [gon(k.dauDe?.tenKyThi) || 'Đề kiểm tra', gon(k.dauDe?.monLop)].filter(Boolean).join(' --- '),
      { nghieng: true, canGiua: true },
    ),
    dong(`(Thang điểm 10${k.dauDe?.maDe ? ` --- Mã đề ${k.dauDe.maDe}` : ''})`,
      { nghieng: true, canGiua: true }),
  ];

  for (const phan of k.cacPhan) {
    const soCau = phan.cauHoi.length;
    const diem = k.diemPhan[phan.ma] || 0;
    const diemMoiCau = soCau > 0 ? lamTron(diem / soCau) : 0;

    ra.push(tieuDePhan(phan.soLaMa, TEN_PHAN[phan.ma] || phan.tieuDe, diem));

    if (phan.ma === 'NLC') {
      ra.push(dong(`Mỗi câu trả lời đúng học sinh được ${soDiemVN(diemMoiCau)} điểm.`
        + ` Dưới đây là bảng tra đáp án nhanh cho ${soCau} câu hỏi:`));
      ra.push(new Paragraph({ text: "", spacing: { after: 80 } }));
      ra.push(...bangDapAnNhanh(phan));
    } else if (phan.ma === 'DS') {
      ra.push(dong(`Điểm tối đa của một câu là ${soDiemVN(diemMoiCau)} điểm.`
        + ' Điểm thành phần tính LŨY TIẾN theo số ý chọn đúng trong mỗi câu.'));
      ra.push(dong('Quy định quy đổi điểm thi trắc nghiệm Đúng/Sai của Bộ GD&ĐT:',
        { nghieng: true }));
      ra.push(new Paragraph({ text: "", spacing: { after: 80 } }));
      ra.push(bangLuyTien(diemMoiCau));
      ra.push(new Paragraph({ text: "", spacing: { after: 140 } }));
      ra.push(dong('Bảng tra đáp án chi tiết:', { dam: true }));
      ra.push(new Paragraph({ text: "", spacing: { after: 80 } }));
      ra.push(bangChiTietDungSai(phan));
    } else if (phan.ma === 'TLN') {
      ra.push(dong(`Mỗi câu trả lời đúng học sinh được ${soDiemVN(diemMoiCau)} điểm.`
        + ' Chỉ ghi nhận kết quả cuối cùng, không chấm cách trình bày.'));
      ra.push(new Paragraph({ text: "", spacing: { after: 80 } }));
      ra.push(bangTraLoiNgan(phan));
    } else {
      ra.push(dong(`Phần tự luận gồm ${soCau} câu, mỗi câu hoàn thành xuất sắc được`
        + ` ${soDiemVN(diemMoiCau)} điểm. Điểm được chia nhỏ tới từng bước lập luận.`));
      ra.push(...khoiTuLuan(phan, diemMoiCau));
    }
  }

  ra.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 },
    children: [new TextRun({ text: '--- HẾT ---', italics: true })],
  }));
  return ra;
}

/** Xuất bản hướng dẫn chấm ra tệp Word và tải về. */
export async function exportHuongDanCham(k: KhuonHuongDan, tenTep: string): Promise<boolean> {
  const qr = await anhQR(noiDungQR({
    boDeId: k.boDeId, maDe: k.dauDe?.maDe, loai: 'hd', trang: 1,
  }), 70);

  const doc = new Document({
    styles: KIEU_MAC_DINH,
    sections: [{
      properties: TRANG_CHUAN,
      headers: { default: new Header({ children: [daiNeoDauTrang({ maDe: k.dauDe?.maDe, loai: 'hd' })] }) },
      footers: { default: new Footer({ children: [daiNeo()] }) },
      children: [
        ...(qr ? [new Paragraph({ alignment: AlignmentType.RIGHT, children: [qr] })] : []),
        ...dungNoiDungHuongDan(k),
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
  a.download = `${tenTep}_huong_dan_cham.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
