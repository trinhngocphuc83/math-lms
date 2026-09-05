/**
 * KHUÔN MẪU GIẤY TỜ KHẢO THÍ - quy chuẩn dùng chung cho MỌI tệp Word xuất ra.
 *
 * Bốn sản phẩm (đề sạch cho học sinh · đề kèm lời giải · phiếu trả lời · hướng dẫn chấm)
 * đều lắp từ đúng bộ dụng cụ ở đây. Sửa quy chuẩn một chỗ thì cả bốn tệp đổi theo, không
 * bao giờ lệch nhau - trước đây mỗi hàm xuất tự đặt màu, cỡ chữ, lề riêng nên đề in ra
 * một kiểu, bảng ma trận một kiểu.
 *
 * Con số lấy từ ba bản Master Prompt của Thầy cô (TNTHPT v5, Tổng hợp v3, THCS v6).
 *
 * ==========================================================================
 * NGUYÊN TẮC XUYÊN SUỐT: GIẤY IN RA PHẢI ĐỂ MÁY ĐỌC ĐƯỢC
 * ==========================================================================
 * Sau này học sinh làm bài xong CHỤP ẢNH nộp vào app để chấm. Ảnh chụp bằng điện thoại
 * thì nghiêng, thiếu sáng, có bóng tay - nên mọi thứ in ra đều thiết kế theo hướng đó:
 *
 *   1. Bốn DẤU NEO GÓC đen ở mỗi trang -> app nắn phẳng ảnh trước khi đọc. Không có neo
 *      thì ảnh chụp nghiêng là mọi toạ độ đều vô nghĩa.
 *   2. MÃ QR ở đầu trang ghi id bộ đề, mã đề, số trang -> máy tự biết đang chấm đề nào,
 *      khỏi bắt Thầy cô chọn tay. Kèm một dòng chữ thường ghi y hệt, phòng khi QR mờ.
 *   3. MÃ CÂU dạng "I.7", "IV.2" in nhỏ cạnh mỗi câu (xem deThi.maCauTrongDe). Mỗi phần
 *      đánh lại từ Câu 1 nên cả đề có tới bốn "Câu 1" - chỉ mã này mới phân biệt được.
 *   4. Chỗ học sinh viết tay thì NỀN TRẮNG TUYỆT ĐỐI và dòng kẻ chấm phải MỜ: nét chấm
 *      đậm cắt ngang chữ viết tay làm máy đọc nhầm chữ.
 *   5. Vùng trả lời trắc nghiệm dựng bằng BẢNG CÓ VIỀN chứ không vẽ vòng tròn rời: viền
 *      bảng là đường thẳng đậm, máy dò lưới dễ hơn dò từng vòng tròn rất nhiều.
 */

import {
  Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, VerticalAlign, ImageRun, ShadingType, TabStopType, PageNumber,
} from "docx";

/* ===================== MÀU ===================== */

/**
 * Navy chủ đạo. Chọn #1B365D (bản v5) chứ không phải #003366 (bản v3): navy pha xám,
 * in ra êm mắt khi tô cả mảng tiêu đề bảng, và hợp tông slate/indigo của app.
 */
export const NAVY = "1B365D";
/**
 * Nền hộp lời giải.
 *
 * Lấy đúng con số trong tệp .docx Thầy cô đang dùng (đề chuyên đề Vectơ 12) chứ không lấy
 * F5F7FA như bản mô tả trong prompt - bản mô tả và tệp thật lệch nhau một chút, tệp thật
 * mới là thứ Thầy cô nhìn hằng ngày.
 */
export const NEN_HOP = "F2F4F8";
/** Đỏ của dòng "Kết luận: Chọn C." - cũng lấy từ tệp thật. */
export const DO_KET_LUAN = "B42828";
/** Nền hàng tiêu đề của các bảng trong phiếu trả lời. */
export const NEN_BANG_PHIEU = "EAECEE";
/** Nền ô điểm ở đầu phiếu trả lời. */
export const NEN_O_DIEM = "F4F6F9";
/** Đỏ của dòng "TỔNG ĐIỂM" trên phiếu trả lời. */
export const DO_TONG_DIEM = "C0392B";
export const TRANG = "FFFFFF";
/** Nền hàng tiêu đề bảng. */
export const NEN_TIEU_DE = "F2F2F2";
/** Xám nhạt cho dòng kẻ chấm và chữ mờ trong ô tô - đủ thấy mà không cắt nét chữ viết. */
export const XAM_MO = "BFBFBF";
export const DEN = "000000";

/* ===================== CỠ CHỮ (nửa-point của docx) ===================== */

/** Nội dung: 12pt. */
export const CO_NOI_DUNG = 24;
/** Tiêu đề phụ: 13pt. */
export const CO_TIEU_DE_PHU = 26;
/** Tiêu đề chính: 14pt. */
export const CO_TIEU_DE_CHINH = 28;
/** Chữ ghi chú, mã câu, chân trang: 9pt. */
export const CO_GHI_CHU = 18;

export const FONT = "Times New Roman";

/* ===================== TRANG ===================== */

/** 1cm = 567 twip. */
export const CM = 567;

/**
 * Lề trang chuẩn: Top 2 · Bottom 2 · Left 2.5 · Right 2 cm.
 *
 * Trước đây KHÔNG đặt lề nên Word lấy mặc định 1 inch (2,54cm) cả bốn phía - đề in ra
 * hụt bề ngang so với mẫu, và điểm dừng Tab tính theo bề ngang cũng lệch theo.
 */
export const LE_TRANG = {
  top: Math.round(2 * CM),
  bottom: Math.round(2 * CM),
  left: Math.round(2.5 * CM),
  right: Math.round(2 * CM),
};

/**
 * Bề ngang vùng in, tính bằng twip: A4 rộng 21cm trừ lề trái phải.
 * Dùng để đặt điểm dừng Tab và chia cột - không được đoán bằng con số 9000 như trước.
 */
export const BE_NGANG_IN = Math.round(21 * CM) - LE_TRANG.left - LE_TRANG.right;

export const KHONG_VIEN = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

const vien = (color: string, size: number) => ({ style: BorderStyle.SINGLE, size, color });

/** Viền mảnh dùng cho lưới tô - đủ đậm để máy dò được đường kẻ trên ảnh chụp. */
export const VIEN_LUOI = {
  top: vien(DEN, 6), bottom: vien(DEN, 6), left: vien(DEN, 6), right: vien(DEN, 6),
};

/* ===================== HỘP LỜI GIẢI (Callout Box) ===================== */

/**
 * Hộp kỹ thuật đặt ngay dưới câu hỏi: bảng MỘT cột, viền trái dày 3pt màu Navy, nền xám
 * nhạt, ba viền còn lại ẩn.
 *
 * Ba bản mẫu đều mô tả đúng khối này. Bản cũ của app in ra hai dòng tiêu đề canh giữa
 * màu xanh dương rồi thả các dòng ➤ trôi nổi - nhìn không ra khối, và khi in đề kèm lời
 * giải thì lời giải lẫn vào câu hỏi kế tiếp.
 *
 * docx tính độ dày viền theo đơn vị 1/8 pt, nên 3pt = 24.
 */
export const VIEN_HOP_GIAI = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.SINGLE, size: 24, color: NAVY },
};

export function hopKyThuat(noiDung: any[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: VIEN_HOP_GIAI,
    rows: [new TableRow({
      children: [new TableCell({
        borders: VIEN_HOP_GIAI,
        shading: { type: ShadingType.CLEAR, fill: NEN_HOP, color: "auto" },
        /* Lề trong ô lấy đúng tệp .docx thật của Thầy cô: 140/140/200/180. */
        margins: { top: 140, bottom: 140, left: 200, right: 180 },
        children: noiDung.length ? noiDung : [new Paragraph({ text: "" })],
      })],
    })],
  });
}

/** Dòng nhãn trong hộp: "💡 Gợi mở của giáo viên" / "📝 Lời giải chi tiết". */
export function nhanTrongHop(chu: string, nghieng = false): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: chu, bold: true, italics: nghieng, color: NAVY })],
  });
}

/* ===================== NHÃN & MÃ CÂU ===================== */

/**
 * Nhãn đầu câu. CHỈ nhãn được in đậm - nội dung câu hỏi và bốn phương án giữ chữ thường.
 * Đây là điều cả ba bản mẫu nhắc lại nhiều nhất.
 */
export function nhanCau(chu: string): TextRun {
  return new TextRun({ text: chu, bold: true, color: NAVY });
}

/**
 * Dòng chốt đáp án cuối hộp lời giải: "➜ Kết luận: Chọn C."
 *
 * Học từ tệp .docx Thầy cô đang dùng - nhìn phát thấy ngay đáp án, khỏi dò lại cả hộp.
 * Chỉ có ở bản dành cho giáo viên.
 */
export function dongKetLuan(dapAn: string): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 40 },
    children: [
      new TextRun({ text: "➜ Kết luận: ", bold: true, color: DO_KET_LUAN }),
      new TextRun({ text: dapAn, bold: true }),
    ],
  });
}

/**
 * Bảng thông tin thí sinh và ô điểm ở đầu đề - dựng theo đúng tệp .docx của Thầy cô.
 *
 * Số cột điểm chạy theo SỐ PHẦN THẬT của đề, nên khuôn nào cũng đúng: đề 3-2-2-3 ra bốn
 * ô điểm phần, đề toàn trắc nghiệm ra một ô, đề tự luận ra một ô.
 *
 * @param cotDiem Nhãn từng ô điểm, ví dụ ["Điểm Phần I|(3,0 điểm)", "TỔNG ĐIỂM|(10,0 điểm)"].
 *                Dấu "|" là chỗ xuống dòng trong ô.
 */
export function bangDauDeThiSinh(cotDiem: string[]): Table {
  const soCot = Math.max(cotDiem.length, 1);
  const vienNavy = vien(NAVY, 4);
  const khungBang = {
    top: vienNavy, bottom: vienNavy, left: vienNavy, right: vienNavy,
    insideHorizontal: vienNavy, insideVertical: vienNavy,
  };
  const leO = { top: 60, bottom: 60, left: 80, right: 80 };

  const dongThongTin = (chu: string) => new TableRow({
    children: [new TableCell({
      columnSpan: soCot,
      margins: leO,
      children: [new Paragraph({ children: [new TextRun({ text: chu, bold: true })] })],
    })],
  });

  const oTieuDe = (nhan: string) => new TableCell({
    shading: { type: ShadingType.CLEAR, fill: NAVY, color: "auto" },
    margins: leO,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: nhan.split('|').flatMap((d, i) => [
        ...(i ? [new TextRun({ break: 1 })] : []),
        new TextRun({ text: d, bold: true, color: TRANG, size: 19 }),
      ]),
    })],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: khungBang,
    rows: [
      dongThongTin("Họ và tên thí sinh: ................................................  Số báo danh: ......................"),
      dongThongTin("Lớp: ....................  Phòng thi số: ..............  Chữ ký cán bộ coi thi: ......................"),
      new TableRow({ children: cotDiem.map(oTieuDe) }),
      /* Hàng để trống cho giáo viên ghi điểm - chừa cao gấp đôi dòng thường. */
      new TableRow({
        height: { value: 560, rule: 'atLeast' as any },
        children: cotDiem.map(() => new TableCell({ margins: leO, children: [new Paragraph({ text: "" })] })),
      }),
    ],
  });
}

/**
 * Bốn ý a) b) c) d) của câu Đúng/Sai, dựng thành BẢNG "Lệnh khẳng định | Đúng | Sai".
 *
 * Học từ tệp .docx Thầy cô đang dùng. Hơn hẳn cách in bốn đoạn văn rời như trước ở hai
 * điểm: học sinh có chỗ đánh dấu ngay trên đề, và - quan trọng cho việc chấm ảnh sau này
 * - hai ô Đúng/Sai là ô bảng có viền, máy dò ô đen trong lưới dễ hơn dò dấu tích viết tay
 * nằm lửng lơ giữa dòng.
 *
 * @param y Bốn (hoặc ít hơn) mệnh đề, đã dựng sẵn thành các đoạn văn.
 */
export function bangDungSai(y: { nhan: string; noiDung: any[] }[]): Table {
  const vienO = vien(NAVY, 4);
  const khung = {
    top: vienO, bottom: vienO, left: vienO, right: vienO,
    insideHorizontal: vienO, insideVertical: vienO,
  };
  const leO = { top: 60, bottom: 60, left: 100, right: 80 };

  const oTieuDe = (chu: string, canGiua = false) => new TableCell({
    shading: { type: ShadingType.CLEAR, fill: NEN_TIEU_DE, color: "auto" },
    margins: leO,
    children: [new Paragraph({
      alignment: canGiua ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: chu, bold: true, color: NAVY })],
    })],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: khung,
    columnWidths: [Math.round(BE_NGANG_IN * 0.76), Math.round(BE_NGANG_IN * 0.12), Math.round(BE_NGANG_IN * 0.12)],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [oTieuDe("Lệnh khẳng định"), oTieuDe("Đúng", true), oTieuDe("Sai", true)],
      }),
      ...y.map(m => new TableRow({
        children: [
          new TableCell({
            margins: leO,
            children: m.noiDung.length ? m.noiDung : [new Paragraph({ text: "" })],
          }),
          /* Hai ô trống để học sinh đánh dấu [X]. Nền TRẮNG tuyệt đối - đây là chỗ máy
             sẽ soi độ đen khi chấm bằng ảnh chụp. */
          new TableCell({ margins: leO, children: [new Paragraph({ text: "" })] }),
          new TableCell({ margins: leO, children: [new Paragraph({ text: "" })] }),
        ],
      })),
    ],
  });
}

/* ===================== ẢNH TRONG WORD ===================== */

export type KieuAnh = 'png' | 'jpg' | 'gif' | 'bmp';

/**
 * Đoán định dạng ảnh theo mấy byte đầu tệp.
 *
 * Bắt buộc phải biết định dạng: thư viện docx lấy nó làm ĐUÔI TỆP của phần ảnh trong gói
 * .docx và khai vào [Content_Types].xml. Không truyền thì ảnh nằm trong gói với đuôi
 * ".undefined" mà bảng khai lại không có dòng nào cho đuôi ấy - gói .docx hoá ra không
 * hợp lệ, Word báo "nội dung không đọc được" hoặc lẳng lặng bỏ ảnh.
 *
 * Đo trên một đề 30 câu vừa xuất thử: cả 16 tấm ảnh đều rơi vào cảnh này.
 */
export function kieuAnh(b: Uint8Array): KieuAnh {
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'png';
  if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpg';
  if (b.length >= 3 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'gif';
  if (b.length >= 2 && b[0] === 0x42 && b[1] === 0x4D) return 'bmp';
  return 'png';   // không nhận ra thì coi là png - vẫn hợp lệ hơn là để trống
}

/** Dựng thẻ ảnh cho Word, luôn kèm định dạng. Dùng thay cho `new ImageRun` khắp nơi. */
export function anhWord(data: Uint8Array, width: number, height: number): any {
  return new ImageRun({
    data,
    type: kieuAnh(data),
    transformation: { width, height },
  } as any);
}

/* ===================== DẤU NEO GÓC & MÃ QR ===================== */

/**
 * Dấu neo góc trang - ô vuông đen đặc.
 *
 * App chấm ảnh tìm bốn dấu này để nắn phẳng ảnh chụp (ảnh điện thoại luôn nghiêng ít
 * nhiều). Đặt ở đầu trang và chân trang nên lặp lại y hệt trên mọi trang.
 *
 * Dùng ký tự khối đặc "█" cỡ lớn thay vì vẽ hình: Word không đặt hình theo milimet một
 * cách chắc chắn, còn ký tự thì in ra ổn định trên mọi máy. Máy dò tìm theo hình dạng
 * chứ không theo toạ độ tuyệt đối, nên chỉ cần dấu ĐEN, VUÔNG và ở đúng bốn góc.
 */
export const KY_TU_NEO = "█";

export function neoGoc(): TextRun {
  return new TextRun({ text: KY_TU_NEO, size: 28, color: DEN, font: "Arial" });
}

/**
 * Dải đầu trang / chân trang mang hai dấu neo hai bên, ở giữa là chữ nhận dạng.
 *
 * @param giua Các đoạn chữ in ở giữa. Để trống thì chỉ có hai dấu neo.
 */
export function daiNeo(giua: any[] = []): Paragraph {
  return new Paragraph({
    spacing: { after: 0 },
    tabStops: [
      { type: TabStopType.CENTER, position: Math.round(BE_NGANG_IN / 2) },
      { type: TabStopType.RIGHT, position: BE_NGANG_IN },
    ],
    children: [
      neoGoc(),
      new TextRun({ text: "\t" }),
      ...giua,
      new TextRun({ text: "\t" }),
      neoGoc(),
    ],
  });
}

/** Chữ nhỏ màu xám dùng cho dòng nhận dạng ở đầu trang. */
export const chuNho = (chu: string) =>
  new TextRun({ text: chu, size: CO_GHI_CHU, color: XAM_MO });

/**
 * Nội dung nhét vào mã QR của một trang giấy.
 *
 * Gọn hết mức có thể - QR càng ít chữ thì ô càng to, chụp mờ vẫn đọc được. Ngăn nhau
 * bằng dấu '|' để máy tách nhanh, không cần đọc JSON.
 *
 * Dạng: LTP|<phiên bản>|<id bộ đề>|<mã đề>|<loại tệp>|<trang>
 *   loại tệp: 'de' = đề thi · 'pt' = phiếu trả lời · 'hd' = hướng dẫn chấm
 */
export const PHIEN_BAN_MAU = 1;

export function noiDungQR(x: {
  boDeId?: string; maDe?: string; loai: 'de' | 'pt' | 'hd'; trang: number;
  /** Mã ngắn của học sinh khi in phiếu theo lớp - xem maHocSinhNgan. */
  hs?: string;
}): string {
  const goc = ['LTP', PHIEN_BAN_MAU, x.boDeId || '-', x.maDe || '-', x.loai, x.trang];
  /* Chỉ nối thêm khi CÓ mã học sinh, để mã QR của phiếu trắng vẫn y như trước và bộ đọc
     cũ vẫn hiểu. Bộ đọc mới tách theo dấu '|' nên thừa một ô cũng không sao. */
  return (x.hs ? [...goc, x.hs] : goc).join('|');
}

/**
 * Mã ngắn của một học sinh để nhét vào QR.
 *
 * KHÔNG dùng cả mã dài 36 ký tự: nhồi vào QR thì ô mã dày đặc, in ra 2,6cm là ảnh chụp
 * điện thoại đọc không nổi. Sáu ký tự đầu là đủ, vì lúc quét ta chỉ dò trong DANH SÁCH
 * MỘT LỚP - vài chục em, trùng sáu ký tự đầu gần như không thể, mà lỡ trùng thì bộ ghép
 * bài thấy hai em cùng khớp sẽ bắt Thầy cô chọn tay chứ không đoán.
 */
export const maHocSinhNgan = (id: string): string =>
  String(id ?? '').replace(/-/g, '').slice(0, 6).toLowerCase();

/**
 * Chữ người đọc được, in ở đầu trang phòng khi mã QR bị mờ hoặc bị gấp mất.
 *
 * KHÔNG kèm số trang: số trang do Word tự điền bằng trường đánh số (xem daiNeoDauTrang),
 * viết cứng vào đây thì trang nào cũng ghi "TRANG 1".
 */
export function chuNhanDang(x: { maDe?: string; loai: 'de' | 'pt' | 'hd' }): string {
  const ten = x.loai === 'pt' ? 'PHIẾU TRẢ LỜI' : x.loai === 'hd' ? 'HƯỚNG DẪN CHẤM' : 'ĐỀ THI';
  return `${ten}${x.maDe ? ` · MÃ ĐỀ ${x.maDe}` : ''} · Trang `;
}

/**
 * Dải đầu trang hoàn chỉnh: hai dấu neo, ở giữa là chữ nhận dạng kèm SỐ TRANG THẬT.
 *
 * Số trang lấy bằng trường đánh số của Word nên trang nào cũng đúng - ảnh chụp trang 2
 * vẫn tự khai là trang 2, máy chấm khỏi phải đoán theo thứ tự tệp ảnh Thầy cô gửi lên.
 */
export function daiNeoDauTrang(x: { maDe?: string; loai: 'de' | 'pt' | 'hd' }): Paragraph {
  return daiNeo([
    chuNho(chuNhanDang(x)),
    new TextRun({ children: [PageNumber.CURRENT], size: CO_GHI_CHU, color: XAM_MO }),
    chuNho('/'),
    new TextRun({ children: [PageNumber.TOTAL_PAGES], size: CO_GHI_CHU, color: XAM_MO }),
  ]);
}

/**
 * Dựng ảnh QR để chèn vào Word.
 *
 * Nạp thư viện `qrcode` theo kiểu động: app đã có sẵn thư viện này (đang dùng ở khung
 * ghép điện thoại trình chiếu), nạp động thì trang nào không xuất Word sẽ không phải
 * tải nó về.
 */
export async function anhQR(noiDung: string, cot = 120): Promise<any | null> {
  try {
    const QRCode = (await import('qrcode')).default;
    const url: string = await QRCode.toDataURL(noiDung, {
      width: 360, margin: 0, errorCorrectionLevel: 'M',
    });
    const b64 = url.split(',')[1] || '';
    const bin = typeof window !== 'undefined' ? window.atob(b64) : '';
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return anhWord(bytes, cot, cot);
  } catch {
    /* Không dựng được mã thì thôi - dòng chữ nhận dạng vẫn còn đó, tệp vẫn dùng được. */
    return null;
  }
}

/* ===================== DÒNG KẺ CHẤM CHO BÀI VIẾT TAY ===================== */

/**
 * Một dòng kẻ chấm kéo khít từ lề trái sang lề phải, bằng ĐIỂM DỪNG TAB + dẫn hướng
 * dấu chấm - đúng cách ba bản mẫu yêu cầu.
 *
 * Màu XÁM NHẠT chứ không đen: học sinh viết đè lên, nét chấm đậm cắt ngang chữ khiến
 * máy đọc chữ viết tay nhận nhầm nét. Xám vẫn đủ để mắt người thấy đường kẻ thẳng.
 */
export function dongKeCham(): Paragraph {
  return new Paragraph({
    spacing: { before: 0, after: 0, line: 360 },
    tabStops: [{ type: TabStopType.RIGHT, position: BE_NGANG_IN, leader: "dot" as any }],
    children: [new TextRun({ text: "\t", color: XAM_MO })],
  });
}

/* ===================== TIỆN ÍCH CHUNG ===================== */

export const dongGiua = (chu: string, dam = false, co = CO_NOI_DUNG) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: chu, bold: dam, size: co })],
  });

/** Một ô bảng gọn, dùng cho lưới tô và bảng đáp án. */
export function oBang(noiDung: any[], opt: {
  nen?: string; canGiua?: boolean; rong?: number; vien?: any;
} = {}): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    borders: opt.vien ?? VIEN_LUOI,
    ...(opt.nen ? { shading: { type: ShadingType.CLEAR, fill: opt.nen, color: "auto" } } : {}),
    ...(opt.rong ? { width: { size: opt.rong, type: WidthType.PERCENTAGE } } : {}),
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: noiDung,
  });
}

/** Kiểu chữ mặc định của mọi tài liệu xuất ra. */
export const KIEU_MAC_DINH = {
  default: {
    document: { run: { size: CO_NOI_DUNG, font: FONT } },
  },
};

/** Thuộc tính trang chuẩn (khổ dọc, lề đúng mẫu). */
export const TRANG_CHUAN = { page: { margin: LE_TRANG } };
