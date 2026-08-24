// Dựng bảng MA TRẬN và BẢN ĐẶC TẢ theo đúng hai mẫu ở Phụ lục Công văn 7991/BGDĐT-GDTrH
// ngày 17/12/2024, để in kèm đề nộp tổ chuyên môn.
//
// Hai bảng này có tiêu đề bốn tầng và gộp ô cả ngang lẫn dọc, nên phải dựng bằng
// Table của docx chứ không thể ghép bằng đoạn văn. Cả dự án trước đây chỉ có đúng một
// chỗ dựng bảng (latexToDocxTable) và nó là bảng đều cột không gộp ô, nên phần này
// viết mới hoàn toàn.
//
// Số liệu lấy từ CÁC CÂU THẬT SỰ ĐƯỢC CHỌN chứ không lấy từ ma trận đã cấu hình:
// thầy cô có thể chọn lệch so với mục tiêu, mà bảng in ra phải mô tả đúng đề đang cầm.

import {
  Table, TableRow, TableCell, Paragraph, TextRun,
  WidthType, AlignmentType, VerticalAlign, TableLayoutType, HeadingLevel,
} from "docx";
import { BANK_TYPES, toBankType, type BankType } from "./questionTypes";
import { mucDo7991, soDiemVN, type DongMaTran, type MucDoBo, MUC_DO_BO } from "./deThi";

/** Mỗi câu Đúng/Sai gồm 4 ý; ma trận của Bộ đếm theo Ý chứ không đếm theo câu. */
export const SO_Y_MOI_CAU_DS = 4;

const TEN_LOAI: Record<BankType, string> = {
  NLC: "Nhiều lựa chọn",
  DS: "“Đúng – Sai”",
  TLN: "Trả lời ngắn",
  TL: "Tự luận",
};

/* ===================== Ô VÀ HÀNG ===================== */

interface YO {
  chu?: string;
  cs?: number;      // gộp ngang
  rs?: number;      // gộp dọc
  dam?: boolean;
  nghieng?: boolean;
  trai?: boolean;   // căn trái thay vì căn giữa
  co?: number;      // cỡ chữ nửa point
}

const o = ({ chu = "", cs, rs, dam, nghieng, trai, co = 20 }: YO) =>
  new TableCell({
    ...(cs ? { columnSpan: cs } : {}),
    ...(rs ? { rowSpan: rs } : {}),
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: [new Paragraph({
      alignment: trai ? AlignmentType.LEFT : AlignmentType.CENTER,
      children: [new TextRun({ text: chu, bold: dam, italics: nghieng, size: co })],
    })],
  });

/** Nhiều dòng chữ trong một ô, dùng cho cột "Yêu cầu cần đạt". */
const oNhieuDong = (dong: string[], trai = true) =>
  new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: (dong.length ? dong : [""]).map(d => new Paragraph({
      alignment: trai ? AlignmentType.LEFT : AlignmentType.CENTER,
      children: [new TextRun({ text: d, size: 20 })],
    })),
  });

/** Số 0 để trống cho đỡ rối mắt, đúng lối trình bày của mẫu. */
const soHoacTrong = (n: number) => (n > 0 ? String(n) : "");

/* ===================== GOM SỐ LIỆU ===================== */

export interface ONhom {
  chuong: string;
  bai: string;
  /** Đếm theo [loại câu][mức độ]. Câu Đúng/Sai đã quy ra Ý. */
  dem: Record<BankType, Record<MucDoBo, number>>;
  /** Số câu thật (chưa quy ra ý), để tính điểm. */
  soCauThat: Record<BankType, Record<MucDoBo, number>>;
  diem: number;
}

const bangRong = (): Record<BankType, Record<MucDoBo, number>> =>
  Object.fromEntries(BANK_TYPES.map(t => [t, { "Biết": 0, "Hiểu": 0, "Vận dụng": 0 }])) as any;

/** Điểm mỗi câu của một bộ ba, tra từ ma trận đã cấu hình. */
const traDiem = (dong: DongMaTran[], dang: string, loai: BankType, muc: string): number =>
  dong.find(d => d.math_form === dang && d.question_type === loai && String(d.difficulty) === String(muc))?.diemMoiCau ?? 0;

/**
 * Gom các câu đã chọn theo Chương rồi tới Bài, đếm vào đúng ô (loại câu × mức độ).
 *
 * Giữ thứ tự xuất hiện đầu tiên chứ không sắp lại theo bảng chữ cái, để bảng in ra
 * theo đúng thứ tự chương trình như thầy cô đã dựng ma trận.
 */
export function gomTheoChuongBai(cauHoi: any[], dong: DongMaTran[]): ONhom[] {
  const ra: ONhom[] = [];
  const chiMuc = new Map<string, ONhom>();

  for (const q of cauHoi) {
    const chuong = String(q.topic || "").trim() || "(chưa xếp chương)";
    const bai = String(q.lesson || "").trim() || "(chưa xếp bài)";
    const khoa = chuong + "||" + bai;

    let nhom = chiMuc.get(khoa);
    if (!nhom) {
      nhom = { chuong, bai, dem: bangRong(), soCauThat: bangRong(), diem: 0 };
      chiMuc.set(khoa, nhom);
      ra.push(nhom);
    }

    const loai = toBankType(q.question_type) || "NLC";
    const muc = mucDo7991(q.difficulty);
    nhom.dem[loai][muc] += loai === "DS" ? SO_Y_MOI_CAU_DS : 1;
    nhom.soCauThat[loai][muc] += 1;
    nhom.diem += traDiem(dong, String(q.math_form || ""), loai, String(q.difficulty || ""));
  }

  return ra;
}

const tongTheoLoaiMuc = (nhom: ONhom[], loai: BankType, muc: MucDoBo) =>
  nhom.reduce((s, n) => s + n.dem[loai][muc], 0);

const tongDiemTheoLoai = (nhom: ONhom[], loai: BankType, dong: DongMaTran[]) =>
  MUC_DO_BO.reduce((s, m) => s + nhom.reduce((x, n) => x + n.soCauThat[loai][m] * diemTrungBinh(n, loai, m, dong), 0), 0);

/** Điểm mỗi câu của một ô, lấy theo dòng ma trận khớp loại và mức. */
function diemTrungBinh(n: ONhom, loai: BankType, muc: MucDoBo, dong: DongMaTran[]): number {
  const khop = dong.filter(d => toBankType(d.question_type) === loai && mucDo7991(d.difficulty) === muc);
  if (khop.length === 0) return 0;
  return khop.reduce((s, d) => s + d.diemMoiCau, 0) / khop.length;
}

/* ===================== BẢNG 1: MA TRẬN ===================== */

/** Bốn tầng tiêu đề của bảng ma trận, tổng cộng 19 cột. */
function tieuDeMaTran(): TableRow[] {
  return [
    new TableRow({
      tableHeader: true,
      children: [
        o({ chu: "TT", rs: 4, dam: true }),
        o({ chu: "Chủ đề/Chương", rs: 4, dam: true }),
        o({ chu: "Nội dung/đơn vị kiến thức", rs: 4, dam: true }),
        o({ chu: "Mức độ đánh giá", cs: 12, dam: true }),
        o({ chu: "Tổng", cs: 3, rs: 3, dam: true }),
        o({ chu: "Tỉ lệ % điểm", rs: 4, dam: true }),
      ],
    }),
    new TableRow({
      tableHeader: true,
      children: [o({ chu: "TNKQ", cs: 9, dam: true }), o({ chu: "Tự luận", cs: 3, rs: 2, dam: true })],
    }),
    new TableRow({
      tableHeader: true,
      children: (["NLC", "DS", "TLN"] as BankType[]).map(t => o({ chu: TEN_LOAI[t], cs: 3, nghieng: true })),
    }),
    new TableRow({
      tableHeader: true,
      children: [
        ...BANK_TYPES.flatMap(() => MUC_DO_BO.map(m => o({ chu: m, dam: true }))),
        ...MUC_DO_BO.map(m => o({ chu: m, dam: true })),
      ],
    }),
  ];
}

export function dungBangMaTran(cauHoi: any[], dong: DongMaTran[]): Table {
  const nhom = gomTheoChuongBai(cauHoi, dong);
  const tongDiem = nhom.reduce((s, n) => s + n.diem, 0) || 1;

  const hangThan = nhom.map((n, i) => new TableRow({
    children: [
      o({ chu: String(i + 1) }),
      o({ chu: n.chuong, trai: true }),
      o({ chu: n.bai, trai: true }),
      ...BANK_TYPES.flatMap(t => MUC_DO_BO.map(m => o({ chu: soHoacTrong(n.dem[t][m]) }))),
      ...MUC_DO_BO.map(m => o({ chu: soHoacTrong(BANK_TYPES.reduce((s, t) => s + n.dem[t][m], 0)) })),
      o({ chu: Math.round((n.diem / tongDiem) * 100) + "%" }),
    ],
  }));

  const hangTongCau = new TableRow({
    children: [
      o({ chu: "Tổng số câu", cs: 3, dam: true }),
      ...BANK_TYPES.flatMap(t => MUC_DO_BO.map(m => o({ chu: soHoacTrong(tongTheoLoaiMuc(nhom, t, m)), dam: true }))),
      ...MUC_DO_BO.map(m => o({ chu: soHoacTrong(BANK_TYPES.reduce((s, t) => s + tongTheoLoaiMuc(nhom, t, m), 0)), dam: true })),
      o({ chu: "" }),
    ],
  });

  const diemLoai = BANK_TYPES.map(t => tongDiemTheoLoai(nhom, t, dong));
  const diemMuc = MUC_DO_BO.map(m =>
    nhom.reduce((s, n) => s + BANK_TYPES.reduce((x, t) => x + n.soCauThat[t][m] * diemTrungBinh(n, t, m, dong), 0), 0));

  const hangTongDiem = new TableRow({
    children: [
      o({ chu: "Tổng số điểm", cs: 3, dam: true }),
      ...diemLoai.map(d => o({ chu: soDiemVN(d), cs: 3, dam: true })),
      ...diemMuc.map(d => o({ chu: soDiemVN(d), dam: true })),
      o({ chu: soDiemVN(tongDiem), dam: true }),
    ],
  });

  const hangTiLe = new TableRow({
    children: [
      o({ chu: "Tỉ lệ %", cs: 3, dam: true }),
      ...diemLoai.map(d => o({ chu: Math.round((d / tongDiem) * 100) + "%", cs: 3 })),
      ...diemMuc.map(d => o({ chu: Math.round((d / tongDiem) * 100) + "%" })),
      o({ chu: "100%", dam: true }),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [...tieuDeMaTran(), ...hangThan, hangTongCau, hangTongDiem, hangTiLe],
  });
}

/* ===================== BẢNG 2: BẢN ĐẶC TẢ ===================== */

/** Bốn tầng tiêu đề của bản đặc tả, tổng cộng 16 cột. */
function tieuDeDacTa(): TableRow[] {
  return [
    new TableRow({
      tableHeader: true,
      children: [
        o({ chu: "TT", rs: 4, dam: true }),
        o({ chu: "Chủ đề/Chương", rs: 4, dam: true }),
        o({ chu: "Nội dung/đơn vị kiến thức", rs: 4, dam: true }),
        o({ chu: "Yêu cầu cần đạt", rs: 4, dam: true }),
        o({ chu: "Số câu hỏi ở các mức độ đánh giá", cs: 12, dam: true }),
      ],
    }),
    new TableRow({
      tableHeader: true,
      children: [o({ chu: "TNKQ", cs: 9, dam: true }), o({ chu: "Tự luận", cs: 3, rs: 2, dam: true })],
    }),
    new TableRow({
      tableHeader: true,
      children: (["NLC", "DS", "TLN"] as BankType[]).map(t => o({ chu: TEN_LOAI[t], cs: 3, nghieng: true })),
    }),
    new TableRow({
      tableHeader: true,
      children: BANK_TYPES.flatMap(() => MUC_DO_BO.map(m => o({ chu: m, dam: true }))),
    }),
  ];
}

/**
 * Bản đặc tả: mỗi Bài tách thành tối đa ba dòng theo mức độ Biết - Hiểu - Vận dụng,
 * đúng lối trình bày "- Biết… / - Hiểu… / - VD…" của mẫu.
 *
 * @param yeuCau Yêu cầu cần đạt của từng dạng, khoá là tên dạng. Dạng nào chưa được
 *               thầy cô soạn thì lấy tạm chính tên dạng - vẫn đọc được, và bảng vẫn
 *               dùng ngay được thay vì bắt soạn đủ 118 dạng mới in nổi.
 */
export function dungBangDacTa(cauHoi: any[], dong: DongMaTran[], yeuCau: Map<string, string>): Table {
  const nhom = gomTheoChuongBai(cauHoi, dong);

  /** Yêu cầu cần đạt của một (bài, mức), gộp từ các dạng có câu ở ô đó. */
  const yeuCauCua = (n: ONhom, muc: MucDoBo): string[] => {
    const dsDang = Array.from(new Set(
      cauHoi
        .filter(q => String(q.lesson || "").trim() === n.bai && mucDo7991(q.difficulty) === muc)
        .map(q => String(q.math_form || "").trim())
        .filter(Boolean)
    ));
    return dsDang.map(d => "- " + (yeuCau.get(d)?.trim() || d));
  };

  const hangThan: TableRow[] = [];
  nhom.forEach((n, i) => {
    const cacMuc = MUC_DO_BO.filter(m => BANK_TYPES.some(t => n.dem[t][m] > 0));
    if (cacMuc.length === 0) return;

    cacMuc.forEach((muc, k) => {
      hangThan.push(new TableRow({
        children: [
          ...(k === 0 ? [
            o({ chu: String(i + 1), rs: cacMuc.length }),
            o({ chu: n.chuong, rs: cacMuc.length, trai: true }),
            o({ chu: n.bai, rs: cacMuc.length, trai: true }),
          ] : []),
          oNhieuDong(yeuCauCua(n, muc)),
          ...BANK_TYPES.flatMap(t => MUC_DO_BO.map(m =>
            o({ chu: m === muc ? soHoacTrong(n.dem[t][m]) : "" }))),
        ],
      }));
    });
  });

  const hangTongCau = new TableRow({
    children: [
      o({ chu: "Tổng số câu", cs: 4, dam: true }),
      ...BANK_TYPES.flatMap(t => MUC_DO_BO.map(m => o({ chu: soHoacTrong(tongTheoLoaiMuc(nhom, t, m)), dam: true }))),
    ],
  });

  const diemLoai = BANK_TYPES.map(t => tongDiemTheoLoai(nhom, t, dong));
  const tongDiem = diemLoai.reduce((s, d) => s + d, 0) || 1;

  const hangTongDiem = new TableRow({
    children: [
      o({ chu: "Tổng số điểm", cs: 4, dam: true }),
      ...diemLoai.map(d => o({ chu: soDiemVN(d), cs: 3, dam: true })),
    ],
  });

  const hangTiLe = new TableRow({
    children: [
      o({ chu: "Tỉ lệ %", cs: 4, dam: true }),
      ...diemLoai.map(d => o({ chu: Math.round((d / tongDiem) * 100) + "%", cs: 3 })),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [...tieuDeDacTa(), ...hangThan, hangTongCau, hangTongDiem, hangTiLe],
  });
}

/* ===================== PHẦN PHỤ LỤC ĐEM VÀO TỆP WORD ===================== */

const tieuDeBang = (chu: string) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  alignment: AlignmentType.CENTER,
  spacing: { before: 200, after: 200 },
  children: [new TextRun({ text: chu, bold: true, size: 26 })],
});

const ghiChu = (chu: string) => new Paragraph({
  spacing: { before: 120 },
  children: [new TextRun({ text: chu, italics: true, size: 18 })],
});

/**
 * Dựng trọn hai bảng kèm tiêu đề và ghi chú, để chèn vào phần đầu tệp Word.
 *
 * Ghi chú về câu Đúng/Sai là bắt buộc: cột "Đúng – Sai" đếm theo Ý chứ không theo câu
 * (mẫu của Bộ cũng có đúng chú thích này), không nói rõ thì người đọc tưởng đề có tám
 * câu Đúng/Sai trong khi thực ra chỉ có hai.
 */
export function dungPhuLucBang(cauHoi: any[], dong: DongMaTran[], yeuCau: Map<string, string>): any[] {
  return [
    tieuDeBang("MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ"),
    dungBangMaTran(cauHoi, dong),
    ghiChu(`Ghi chú: mỗi câu hỏi “Đúng – Sai” gồm ${SO_Y_MOI_CAU_DS} ý; số ở các cột “Đúng – Sai” là số ý, không phải số câu.`),
    new Paragraph({ text: "", pageBreakBefore: true }),
    tieuDeBang("BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ"),
    dungBangDacTa(cauHoi, dong, yeuCau),
    ghiChu("Ghi chú: dạng nào chưa soạn “Yêu cầu cần đạt” thì tạm lấy chính tên dạng; sửa lại trong Quản lý danh mục."),
  ];
}
