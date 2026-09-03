import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun,
  Table, TableRow, TableCell, WidthType, BorderStyle, PageOrientation, VerticalAlign,
  Tab, TabStopType, Header, Footer, PageNumber,
} from "docx";
import { saveAs } from "file-saver";

// Loại bỏ ký tự không hợp lệ trong XML (control characters)
// File .docx là XML bên trong, nếu chứa các ký tự này sẽ bị hỏng
const sanitizeXml = (text: string): string => {
  if (!text) return "";
  // Loại bỏ tất cả control characters ngoại trừ tab(0x09), newline(0x0A), carriage return(0x0D)
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
};

export const base64ToUint8Array = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

import { cleanLatexForWord } from "./latexToWord";
import { cleanLatexControlChars } from "./latexFixer";
import { latexToDocxElement, latexToDocxTable, laBangKeO } from "./latexToDocxMath";
import { soDiemVN, type DauDe, chiaPhanDeThi, type PhanDeThi } from "./deThi";
import { bangDapAn, type MaDe } from "./tronMaDe";
import {
  NAVY, XAM_MO, CO_TIEU_DE_PHU, CO_TIEU_DE_CHINH, CO_GHI_CHU as CO_GHI_CHU_DAUDE,
  KIEU_MAC_DINH, TRANG_CHUAN,
  BE_NGANG_IN, LE_TRANG, hopKyThuat, nhanTrongHop, nhanCau, daiNeo,
  daiNeoDauTrang, anhQR, noiDungQR, anhWord, bangDauDeThiSinh, bangDungSai, dongKetLuan,
} from "./mauDeThi";

// Đánh dấu tạm cho công thức $...$/$$...$$ để không lẫn với ảnh/HTML khi quét dòng,
// rồi thay lại bằng công thức Word thật (Equation/OMML) ở dưới - không còn hiện chữ
// LaTeX thô ("\sqrt{...}") trong file .docx xuất ra nữa.
const MATH_MARKER = " MATH";
const extractMathPlaceholders = (text: string, store: string[]): string => {
  if (!text) return text;
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_m: string, expr: string) => {
    store.push(expr);
    return `${MATH_MARKER}${store.length - 1} `;
  });
  text = text.replace(/\$([^\$\n]+?)\$/g, (_m: string, expr: string) => {
    store.push(expr);
    return `${MATH_MARKER}${store.length - 1} `;
  });
  return text;
};

/**
 * Dựng một dòng nội dung, tách riêng BẢNG KẺ Ô (\begin{array} kèm \hline) thành bảng
 * Word thật thay vì nhồi vào công thức.
 *
 * Trong dữ liệu thật, bảng số liệu thường nằm NGOÀI cặp $...$ (ví dụ "... = 20$.
 * \begin{array}{|c|c|} \hline ..."), nên phải dò ở mức văn bản chứ không thể chỉ dò
 * bên trong công thức.
 */
/**
 * Gộp mỗi bảng \begin{array}...\end{array} về ĐÚNG MỘT DÒNG.
 *
 * Trong dữ liệu thật, các hàng của bảng nằm trên nhiều dòng khác nhau. Nội dung được
 * cắt theo dấu xuống dòng trước khi dựng, nên không dòng nào chứa trọn cả bảng - bảng
 * bị vỡ thành từng mảnh "\begin{array}{|c|c|}", "\hline ... \\", mỗi mảnh một dòng
 * kèm dấu ➤ riêng. Gộp trước khi cắt thì mỗi bảng mới nhận diện được nguyên khối.
 */
const gopBangVeMotDong = (text: string): string => {
  if (!text || !text.includes('begin{array}')) return text;
  return text.replace(/\\begin\s*\{array\}[\s\S]*?\\end\s*\{array\}/g,
    (bang) => bang.replace(/[\r\n]+/g, ' '));
};

const dungDongCoTheCoBang = async (
  line: string,
  opts: { color?: string; bold?: boolean; italics?: boolean; icon?: TextRun } = {},
): Promise<any[]> => {
  const ra: any[] = [];
  let conLai = line;
  const RE_BANG = /\$?\s*\\begin\s*\{array\}[\s\S]*?\\end\s*\{array\}\s*\$?/;
  let iconConLai = opts.icon;

  // Dấu ➤ chỉ gắn vào đoạn văn ĐẦU TIÊN của dòng; nếu dòng mở đầu bằng bảng thì
  // gắn vào đoạn ngay sau bảng để không mất mốc đầu dòng.
  const themDoanVan = async (text: string) => {
    const runs = await processTextLine(text, opts.color, opts.bold, opts.italics);
    if (iconConLai) { runs.unshift(iconConLai); iconConLai = undefined; }
    ra.push(new Paragraph({ children: runs }));
  };

  while (true) {
    const m = conLai.match(RE_BANG);
    if (!m || !laBangKeO(m[0])) break;

    const truoc = conLai.slice(0, m.index).trim();
    if (truoc) await themDoanVan(truoc);

    const bang = latexToDocxTable(m[0]);
    if (bang) {
      ra.push(bang);
      ra.push(new Paragraph({ children: [new TextRun({ text: "" })] })); // giãn cách sau bảng
    }
    conLai = conLai.slice((m.index || 0) + m[0].length);
  }

  if (conLai.trim() || ra.length === 0) await themDoanVan(conLai);
  return ra;
};

const processTextLine = async (textLine: string, defaultColor?: string, defaultBold: boolean = false, defaultItalics: boolean = false) => {
  if (!textLine) return [new TextRun({ text: "" })];
  // Khôi phục lệnh LaTeX bị AI lưu nhầm thành ký tự điều khiển ("\"+TAB+"ext" thay vì
  // "\text"). Hàm này đã có sẵn và dùng ở nơi khác, nhưng đường xuất Word lại bỏ qua
  // nên các câu đó ra file .docx với công thức hỏng.
  textLine = cleanLatexControlChars(textLine);
  textLine = cleanLatexForWord(textLine);
  textLine = sanitizeXml(textLine);

  let decodedLine = textLine
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ');

  const mathStore: string[] = [];
  decodedLine = extractMathPlaceholders(decodedLine, mathStore);

  const elements: any[] = [];
  let remaining = decodedLine;

  while (remaining.length > 0) {
    const imgStart = remaining.toLowerCase().indexOf('<img');
    const mdStart = remaining.indexOf('![');
    const mathStart = remaining.indexOf(MATH_MARKER);

    if (mathStart !== -1 && (imgStart === -1 || mathStart < imgStart) && (mdStart === -1 || mathStart < mdStart)) {
      if (mathStart > 0) {
        const before = remaining.slice(0, mathStart).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
        if (before) elements.push(new TextRun({ text: before, color: defaultColor, bold: defaultBold, italics: defaultItalics }));
      }
      const endIdx = remaining.indexOf(' ', mathStart + MATH_MARKER.length);
      const nStr = remaining.slice(mathStart + MATH_MARKER.length, endIdx);
      const n = parseInt(nStr, 10);
      elements.push(latexToDocxElement(mathStore[n], { color: defaultColor, bold: defaultBold }));
      remaining = remaining.slice(endIdx + 1);
      continue;
    }

    let nextType: 'html' | 'md' | null = null;
    let startIndex = -1;

    if (imgStart !== -1 && mdStart !== -1) {
      if (imgStart < mdStart) {
        nextType = 'html';
        startIndex = imgStart;
      } else {
        nextType = 'md';
        startIndex = mdStart;
      }
    } else if (imgStart !== -1) {
      nextType = 'html';
      startIndex = imgStart;
    } else if (mdStart !== -1) {
      nextType = 'md';
      startIndex = mdStart;
    }

    if (startIndex === -1) {
      let plainText = remaining.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
      if (plainText) {
         elements.push(new TextRun({ text: plainText, color: defaultColor, bold: defaultBold, italics: defaultItalics }));
      }
      break;
    }
    
    if (startIndex > 0) {
      const textBefore = remaining.substring(0, startIndex);
      let plainText = textBefore.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
      if (plainText) {
         elements.push(new TextRun({ text: plainText, color: defaultColor, bold: defaultBold, italics: defaultItalics }));
      }
    }
    
    const afterStart = remaining.substring(startIndex);
    
    if (nextType === 'html') {
      const imgEnd = afterStart.indexOf('>');
      
      if (imgEnd === -1) {
        let plainText = afterStart.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
        if (plainText) {
           elements.push(new TextRun({ text: plainText, color: defaultColor, bold: defaultBold, italics: defaultItalics }));
        }
        break;
      }
      
      const imgTag = afterStart.substring(0, imgEnd + 1);
      remaining = afterStart.substring(imgEnd + 1);
      
      const srcMatch = imgTag.match(/src="(data:image\/([^;]+);base64,([^"]+))"/i) || imgTag.match(/src='(data:image\/([^;]+);base64,([^']+))'/i);
      if (srcMatch && srcMatch[3]) {
        try {
          const base64Data = srcMatch[3].replace(/\s+/g, '');
          const buffer = base64ToUint8Array(base64Data);
          elements.push(anhWord(buffer, 300, 200));
        } catch(e) {
          console.error("Lỗi parse ảnh base64:", e);
        }
      }
    } else if (nextType === 'md') {
      const bracketEnd = afterStart.indexOf('](');
      if (bracketEnd === -1) {
         elements.push(new TextRun({ text: "![", color: defaultColor, bold: defaultBold, italics: defaultItalics }));
         remaining = afterStart.substring(2);
         continue;
      }
      const parenEnd = afterStart.indexOf(')', bracketEnd);
      if (parenEnd === -1) {
         elements.push(new TextRun({ text: "![", color: defaultColor, bold: defaultBold, italics: defaultItalics }));
         remaining = afterStart.substring(2);
         continue;
      }
      
      const url = afterStart.substring(bracketEnd + 2, parenEnd).trim();
      remaining = afterStart.substring(parenEnd + 1);
      
      try {
         const imgData = await fetchImageWithDimensions(url);
         if (imgData) {
            elements.push(anhWord(imgData.buffer, imgData.width, imgData.height));
         }
      } catch(e) {
         console.error("Lỗi fetch MD ảnh:", e);
      }
    }
  }
  
  return elements.length > 0 ? elements : [new TextRun({ text: "" })];
};

export const fetchImageWithDimensions = async (url: string): Promise<{buffer: Uint8Array, width: number, height: number} | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Fetch image failed with status:", response.status);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    const dimensions = await new Promise<{width: number, height: number}>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = (e) => {
        console.error("Image load error", e);
        // Trả về kích thước mặc định nếu không đọc được
        resolve({ width: 400, height: 300 });
      };
      const blob = new Blob([arrayBuffer]);
      const objectUrl = URL.createObjectURL(blob);
      img.src = objectUrl;
    });

    let { width, height } = dimensions;
    const MAX_WIDTH = 500;
    if (width > MAX_WIDTH) {
       const ratio = MAX_WIDTH / width;
       width = MAX_WIDTH;
       height = Math.round(height * ratio);
    }

    return { buffer, width, height };
  } catch (err) {
    console.error("Error fetching image", err);
    return null;
  }
};

const cleanHtmlNewlinesInTags = (html: string) => {
  if (!html) return "";
  // Khôi phục lệnh LaTeX trước, rồi mới dọn ký tự lạ - làm ngược lại thì mã điều khiển
  // (chính là dấu vết của lệnh hỏng) bị xoá mất, không khôi phục được nữa.
  let cleaned = sanitizeXml(cleanLatexControlChars(html)).replace(/\\{1,2}color\s*\{[^}]+\}/gi, '')
             .replace(/<img[^>]+>/gi, (match) => match.replace(/\n|\r/g, ''));
  // Hàn gắn dữ liệu cũ: Khôi phục dấu backslash nếu OCR lưu nhầm thành newline (\n)
  return cleaned.replace(/\n(?=eq|otin|abla|atural|ightarrow|ho|angle|imes|heta|riangle|ext|egin|rac|orall|end|left|right)/g, '\\');
};

/** Số điểm kiểu Việt Nam, dùng chung một bản với hai trang ra đề. */
const soDiem = soDiemVN;

const KHONG_VIEN = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

const dongGiua = (chu: string, dam = false) =>
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: chu, bold: dam })] });

/**
 * Đầu đề hai cột như đề in thật: tên lớp học bên trái, thông tin kỳ thi bên phải.
 *
 * Dùng bảng KHÔNG VIỀN thay vì hai đoạn căn lề, vì chỉ bảng mới giữ được hai khối chữ
 * nằm ngang hàng nhau khi số dòng hai bên khác nhau.
 */
const dungDauDe = (dauDe: DauDe, qr?: any): Table => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: KHONG_VIEN,
  rows: [
    new TableRow({
      children: [
        new TableCell({
          borders: KHONG_VIEN,
          width: { size: 45, type: WidthType.PERCENTAGE },
          children: [
            dongGiua((dauDe.tenLopHoc || "").toUpperCase(), true),
            dongGiua("ĐỀ CHÍNH THỨC", true),
            /* "(Đề thi có 04 trang)" - học từ tệp .docx của Thầy cô. Số trang lấy bằng
               trường đánh số của Word nên tự đúng, khỏi phải đếm tay. */
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "(Đề thi có ", italics: true, size: CO_GHI_CHU_DAUDE }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], italics: true, size: CO_GHI_CHU_DAUDE }),
                new TextRun({ text: " trang)", italics: true, size: CO_GHI_CHU_DAUDE }),
              ],
            }),
          ],
        }),
        new TableCell({
          borders: KHONG_VIEN,
          width: { size: 55, type: WidthType.PERCENTAGE },
          children: [
            dongGiua((dauDe.tenKyThi || "ĐỀ KIỂM TRA").toUpperCase(), true),
            ...(dauDe.monLop ? [dongGiua(`Môn: ${dauDe.monLop}`, true)] : []),
            ...(dauDe.namHoc ? [dongGiua(`Năm học: ${dauDe.namHoc}`)] : []),
            ...(dauDe.thoiGian ? [dongGiua(`Thời gian làm bài: ${dauDe.thoiGian}`)] : []),
            ...(dauDe.maDe ? [dongGiua(`Mã đề: ${dauDe.maDe}`, true)] : []),
          ],
        }),
        /* Ô mã QR - chỉ hiện khi dựng được mã. Đây là chỗ app chấm bài bằng ảnh chụp
           đọc ra "đang chấm đề nào, mã đề nào", khỏi bắt Thầy cô chọn tay. */
        ...(qr ? [new TableCell({
          borders: KHONG_VIEN,
          width: { size: 16, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [qr] })],
        })] : []),
      ],
    }),
  ],
});

/** Tiêu đề một PHẦN kèm câu dẫn chuẩn và số điểm của phần. */
const dungTieuDePhan = (phan: PhanDeThi, diem?: number): Paragraph[] => [
  new Paragraph({
    spacing: { before: 320, after: 60 },
    children: [
      new TextRun({ text: `PHẦN ${phan.soLaMa}. `, bold: true, color: NAVY, size: CO_TIEU_DE_PHU }),
      new TextRun({ text: phan.tieuDe, bold: true, color: NAVY, size: CO_TIEU_DE_PHU }),
      ...(typeof diem === 'number' && diem > 0
        ? [new TextRun({ text: ` (${soDiem(diem)} điểm)`, bold: true })]
        : []),
    ],
  }),
  new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text: phan.cauDan, italics: true })],
  }),
];

/**
 * Bảng đáp án của tất cả các mã đề, in ở cuối bản dành cho giáo viên.
 *
 * Mỗi mã một cột riêng vì câu đã bị đảo thứ tự - dùng chung một cột đáp án cho mọi mã
 * là chấm sai cả tập bài mà không ai phát hiện cho tới lúc trả bài.
 */
const dungBangDapAn = (cacMa: MaDe[]): any[] => {
  const cot = bangDapAn(cacMa);
  const soCau = Math.max(...cot.map(c => c.dapAn.length), 0);
  if (soCau === 0) return [];

  const oNho = (chu: string, dam = false) => new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: chu, bold: dam, size: 20 })],
    })],
  });

  const hangTieuDe = new TableRow({
    tableHeader: true,
    children: [oNho("Câu", true), ...cot.map(c => oNho("Mã " + c.ma, true))],
  });

  const hangCau = Array.from({ length: soCau }, (_, i) => new TableRow({
    children: [oNho(String(i + 1), true), ...cot.map(c => oNho(c.dapAn[i] || "—"))],
  }));

  return [
    new Paragraph({ text: "", pageBreakBefore: true }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "BẢNG ĐÁP ÁN CÁC MÃ ĐỀ", bold: true, size: 26 })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [hangTieuDe, ...hangCau],
    }),
  ];
};

/**
 * Ước lượng bề rộng một phương án khi in ra giấy.
 *
 * Đếm theo ký tự nhưng KHÔNG đếm phần cú pháp LaTeX: "$\dfrac{a}{b}$" in ra chỉ là một
 * phân số bé, mà đếm thô thì thành 14 ký tự nên bị xếp nhầm sang một cột. Bỏ dấu $, bỏ
 * tên lệnh và dấu ngoặc nhọn rồi mới đếm.
 */
const beRongPhuongAn = (s: string): number => {
  const tho = String(s ?? "")
    .replace(/\$\$?([\s\S]*?)\$\$?/g, "$1")     // bỏ dấu $ bọc ngoài
    .replace(/\\[a-zA-Z]+\s*/g, "x")            // \dfrac, \sqrt... coi như một ký tự
    .replace(/[{}\\]/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "IMG")    // ảnh trong phương án: coi là dài
    .trim();
  return tho.length;
};

/**
 * Xếp 4 phương án trắc nghiệm thành 4 / 2 / 1 cột cho thẳng hàng, đúng lối trình bày
 * của đề thi Việt Nam.
 *
 * Canh cột bằng ĐIỂM DỪNG TAB trên đoạn văn thường, KHÔNG dùng bảng.
 *
 * Bản đầu tôi làm bằng bảng không kẻ viền: cột thẳng thật, nhưng thầy cô mở ra sửa lại
 * rất cực - chọn chữ, đổi cỡ, thêm bớt phương án trong ô bảng đều vướng. Đề thi in ra
 * còn phải sửa tay nhiều lần nên tính dễ sửa quan trọng hơn. Tab cho ra đúng cột như
 * bảng mà vẫn là đoạn văn bình thường, muốn sửa gì cũng được.
 *
 * Bản cũ hơn nữa thì nhồi cả bốn phương án vào một đoạn ngăn nhau bằng bốn dấu cách -
 * Word tự ngắt dòng tuỳ nó nên phương án dài ngắn khác nhau là cột so le hết.
 *
 * Chọn số cột theo phương án DÀI NHẤT, không theo trung bình: chỉ cần một phương án dài
 * là cả hàng bị đội cao, nên phải để nó quyết định.
 */

/* Chia đều bề ngang vùng in cho 4 và cho 2 cột. Bề ngang lấy từ LỀ THẬT của khuôn mẫu
   (mauDeThi.BE_NGANG_IN) chứ không đoán bằng con số 9000 như bản cũ - lề đổi thì cột
   phương án phải đổi theo, không thì cột chót tràn ra ngoài mép giấy. */
const MOC_TAB_4_COT = [1, 2, 3].map(k => Math.round((BE_NGANG_IN * k) / 4));
const MOC_TAB_2_COT = [Math.round(BE_NGANG_IN / 2)];

const dungPhuongAnNLC = async (
  q: any,
  doiChu: (s: string) => Promise<any[]>,
): Promise<any[]> => {
  const nhan = ["A", "B", "C", "D"] as const;
  const noiDung = [q.option_a, q.option_b, q.option_c, q.option_d].map(x => String(x ?? ""));

  // Phương án rỗng thì bỏ hẳn, đỡ chừa một khoảng trống vô nghĩa giữa đề
  const dsCo = nhan.map((n, i) => ({ nhan: n, noiDung: noiDung[i] })).filter(x => x.noiDung.trim());
  if (dsCo.length === 0) return [];

  const daiNhat = Math.max(...dsCo.map(x => beRongPhuongAn(x.noiDung)));
  const coAnh = dsCo.some(x => /!\[|<img/i.test(x.noiDung));
  const soCot = coAnh ? 1 : daiNhat <= 14 ? 4 : daiNhat <= 34 ? 2 : 1;

  const mocTab = soCot === 4 ? MOC_TAB_4_COT : soCot === 2 ? MOC_TAB_2_COT : [];
  const tabStops = mocTab.map(v => ({ type: TabStopType.LEFT, position: v }));

  /** Một phương án: nhãn "A. " đậm xanh rồi tới nội dung đã dựng công thức. */
  const motPhuongAn = async (x: { nhan: string; noiDung: string }) => ([
    nhanCau(`${x.nhan}. `),
    ...(await doiChu(cleanHtmlNewlinesInTags(x.noiDung))),
  ]);

  const doan: any[] = [];
  for (let i = 0; i < dsCo.length; i += soCot) {
    const trongHang = dsCo.slice(i, i + soCot);
    const con: any[] = [];
    for (let k = 0; k < trongHang.length; k++) {
      // Tab đặt TRƯỚC phương án thứ hai trở đi, để phương án đầu bám sát lề trái
      if (k > 0) con.push(new TextRun({ children: [new Tab()] }));
      con.push(...await motPhuongAn(trongHang[k]));
    }
    doan.push(new Paragraph({
      children: con,
      tabStops: tabStops.length ? tabStops : undefined,
      spacing: { before: i === 0 ? 60 : 0, after: i + soCot >= dsCo.length ? 200 : 0 },
    }));
  }

  return doan;
};

export interface KhuonXuatDe {
  dauDe: DauDe;
  chiaPhan: boolean;
  /** Điểm từng phần, khoá theo mã loại câu (NLC/DS/TLN/TL). */
  diemPhan?: Record<string, number>;
  /**
   * Bảng Ma trận và Bản đặc tả, in ở các trang đầu theo KHỔ NGANG.
   *
   * Phải tách thành section riêng: hai bảng có 19 và 16 cột nên khổ dọc bóp chữ
   * đến mức không đọc nổi, còn đề thi thì bắt buộc khổ dọc.
   */
  phuLuc?: any[];
  /**
   * Nhiều mã đề in trong CÙNG MỘT TỆP, mỗi mã sang trang mới, cuối tệp có bảng
   * đáp án của tất cả các mã. Bỏ trống thì in một đề như cũ.
   */
  maDe?: MaDe[];
  /** Id bộ đề đã lưu - nhét vào mã QR để app chấm ảnh biết đang chấm đề nào. */
  boDeId?: string;
}

/**
 * Xuất câu hỏi ra Word.
 *
 * Không truyền `khuonDe` thì giữ đúng hành vi cũ (tiêu đề "NGÂN HÀNG CÂU HỎI", các câu
 * xếp liền một mạch) để những nơi đang gọi không phải sửa. Truyền `khuonDe` thì dựng
 * đầu đề và chia PHẦN I/II/III theo khuôn 2025.
 */
export const exportQuestionsToWord = async (
  questions: any[],
  exportType: 'student' | 'teacher',
  filePrefix: string = 'Ngan_Hang_Cau_Hoi',
  khuonDe?: KhuonXuatDe,
) => {
  try {
    const childrenElements: any[] = [];

    // Không trộn mã thì vẫn chạy đúng một vòng, giữ nguyên hành vi cũ
    const cacMa: MaDe[] = khuonDe?.maDe?.length
      ? khuonDe.maDe
      : [{ ma: khuonDe?.dauDe?.maDe || "", cauHoi: questions }];

    for (let iMa = 0; iMa < cacMa.length; iMa++) {
      const maHienTai = cacMa[iMa];

      if (khuonDe) {
        // Mã thứ hai trở đi sang trang mới, để in ra là tách được thành từng tập
        if (iMa > 0) childrenElements.push(new Paragraph({ text: "", pageBreakBefore: true }));
        const qrDauDe = await anhQR(noiDungQR({
          boDeId: khuonDe.boDeId, maDe: maHienTai.ma, loai: 'de', trang: 1,
        }), 74);
        childrenElements.push(dungDauDe({ ...khuonDe.dauDe, maDe: maHienTai.ma }, qrDauDe));
        childrenElements.push(new Paragraph({ text: "", spacing: { after: 120 } }));

        /* Bảng thông tin thí sinh và ô điểm - học từ tệp .docx Thầy cô đang dùng. Trước
           đây đề in ra không có chỗ nào ghi tên, ghi điểm, phải kẻ tay.

           Số ô điểm chạy theo SỐ PHẦN THẬT của đề nên khuôn nào cũng đúng. */
        if (khuonDe.chiaPhan) {
          const phanCuaMa = chiaPhanDeThi(maHienTai.cauHoi);
          const cotDiem = phanCuaMa.map(ph => {
            const d = khuonDe.diemPhan?.[ph.ma];
            return `Điểm Phần ${ph.soLaMa}` + (typeof d === 'number' && d > 0 ? `|(${soDiem(d)} điểm)` : '');
          });
          const tong = phanCuaMa.reduce((t, ph) => t + (khuonDe.diemPhan?.[ph.ma] || 0), 0);
          cotDiem.push(`TỔNG ĐIỂM|(${soDiem(tong || 10)} điểm)`);
          cotDiem.push("Lời phê của giáo viên");
          childrenElements.push(bangDauDeThiSinh(cotDiem));
          childrenElements.push(new Paragraph({ text: "", spacing: { after: 160 } }));
        }
      } else {
        childrenElements.push(new Paragraph({
          text: "NGÂN HÀNG CÂU HỎI",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }));
      }

    /**
     * Sắp câu theo thứ tự PHẦN và ghi lại mốc chèn tiêu đề phần.
     * Không chia phần thì giữ nguyên thứ tự đầu vào.
     */
    let dsCau = maHienTai.cauHoi;
    const mocPhan = new Map<number, PhanDeThi>();
    if (khuonDe?.chiaPhan) {
      const cacPhan = chiaPhanDeThi(maHienTai.cauHoi);
      dsCau = cacPhan.flatMap(p => p.cauHoi);
      let n = 0;
      for (const p of cacPhan) { mocPhan.set(n, p); n += p.cauHoi.length; }
    }

    /* Phần đang in và số câu TRONG PHẦN ĐÓ. Mỗi phần đánh lại từ Câu 1, nên không thể
       lấy chỉ số i của cả đề làm số câu nữa. Không chia phần thì đánh liền như cũ. */
    let phanDangIn: PhanDeThi | null = null;
    let soTrongPhan = 0;

    for (let i = 0; i < dsCau.length; i++) {
      const q = dsCau[i];

      // Sang một PHẦN mới thì chèn tiêu đề phần trước khi in câu đầu của phần đó
      const phanMoi = mocPhan.get(i);
      if (phanMoi) {
        childrenElements.push(...dungTieuDePhan(phanMoi, khuonDe?.diemPhan?.[phanMoi.ma]));
        phanDangIn = phanMoi;
        soTrongPhan = 0;
      }
      soTrongPhan++;
      const soCauIn = phanDangIn ? soTrongPhan : i + 1;
      /* KHÔNG in mã câu "I.7" lên đề: Thầy cô phải ngồi xoá tay từng chỗ trước khi phát
         cho học sinh. Mã vẫn còn trong deThi.maCauTrongDe, dành cho phiếu trả lời và
         hướng dẫn chấm - hai chỗ đó vốn phải ghi số câu, ghi kèm mã là tự nhiên. Bản
         thân tờ đề cũng không cần: mã QR ở đầu đề đã nhận dạng đủ. */

      let imageData: {buffer: Uint8Array, width: number, height: number} | null = null;
      
      if (q.image_url) {
        imageData = await fetchImageWithDimensions(q.image_url);
      }

      let rawContent = cleanHtmlNewlinesInTags(q.content || "");
      const contentLines = gopBangVeMotDong(rawContent).split('\n');
      let imageInserted = false;

      const titleLineText = contentLines[0].replace(/\[HÌNH VẼ.*\]|\[HINH VẼ.*\]|\[BẢNG BIẾN THIÊN\]/gi, '').trim();
      
      // Question Title
      childrenElements.push(
        new Paragraph({
          children: [
            nhanCau(`Câu ${soCauIn}. `),
            ...(await processTextLine(titleLineText))
          ],
          spacing: { before: 200 }
        })
      );
      
      if (imageData && contentLines[0].match(/\[HÌNH VẼ.*\]|\[HINH VẼ.*\]|\[BẢNG BIẾN THIÊN\]/gi)) {
         childrenElements.push(
            new Paragraph({
              children: [
                anhWord(imageData.buffer, imageData.width, imageData.height),
              ],
              alignment: AlignmentType.CENTER,
            })
          );
          imageInserted = true;
      }
      
      for (let j = 1; j < contentLines.length; j++) {
         const line = contentLines[j];
         if (imageData && line.match(/\[HÌNH VẼ.*\]|\[HINH VẼ.*\]|\[BẢNG BIẾN THIÊN\]/gi)) {
            childrenElements.push(
              new Paragraph({
                children: [
                  anhWord(imageData.buffer, imageData.width, imageData.height),
                ],
                alignment: AlignmentType.CENTER,
              })
            );
            imageInserted = true;
            
            const textWithoutMarker = line.replace(/\[HÌNH VẼ.*\]|\[HINH VẼ.*\]|\[BẢNG BIẾN THIÊN\]/gi, '').trim();
            if (textWithoutMarker) {
               childrenElements.push(...await dungDongCoTheCoBang(textWithoutMarker));
            }
         } else {
            childrenElements.push(...await dungDongCoTheCoBang(line));
         }
      }

      if (imageData && !imageInserted) {
         childrenElements.push(
            new Paragraph({
              children: [
                anhWord(imageData.buffer, imageData.width, imageData.height),
              ],
              alignment: AlignmentType.CENTER,
            })
          );
      }

      // Options
      const qType = q.question_type;
      if (qType === 'TN' || qType === 'NLC') {
        childrenElements.push(...await dungPhuongAnNLC(q, processTextLine));
      } else if (qType === 'DS') {
        /* Bốn ý dựng thành BẢNG có hai cột Đúng/Sai để học sinh đánh dấu - học từ tệp
           .docx của Thầy cô. Bản cũ in bốn đoạn văn rời, học sinh không có chỗ tích. */
        const nhanY = ['a', 'b', 'c', 'd'] as const;
        const noiDungY = [q.option_a, q.option_b, q.option_c, q.option_d];
        const dsY: { nhan: string; noiDung: any[] }[] = [];
        for (let k = 0; k < 4; k++) {
          const chu = String(noiDungY[k] ?? '');
          if (!chu.trim()) continue;
          dsY.push({
            nhan: nhanY[k],
            noiDung: [new Paragraph({
              children: [
                new TextRun({ text: `${nhanY[k]}) `, bold: true }),
                ...(await processTextLine(cleanHtmlNewlinesInTags(chu))),
              ],
            })],
          });
        }
        if (dsY.length) {
          childrenElements.push(bangDungSai(dsY));
          childrenElements.push(new Paragraph({ text: "", spacing: { after: 160 } }));
        }
      } else if (qType === 'TLN') {
        childrenElements.push(new Paragraph({
          children: [new TextRun({ text: "Kết quả: .......................................", bold: true, color: NAVY })],
          spacing: { before: 100, after: 200 }
        }));
      }

      // Teacher Solution
      if (exportType === 'teacher' && q.explanation) {
        let methodText = "";
        // Khôi phục lệnh LaTeX TRƯỚC khi dọn ký tự lạ: sanitizeXml xoá các mã điều khiển,
        // mà lệnh hỏng lại nằm chính ở đó ("\" + mã 0x0C + "orall"). Dọn trước thì mã bị
        // xoá mất, chỉ còn "\orall" - không còn dấu vết để khôi phục thành "\forall".
        const sanitizedExplanation = sanitizeXml(cleanLatexControlChars(q.explanation));
        let explanationText = sanitizedExplanation;

        // Smart parsing
        const lowerExp = sanitizedExplanation.toLowerCase();
        const ppIndex = lowerExp.indexOf("phương pháp giải:");
        const ppIndex2 = lowerExp.indexOf("phương pháp giải");
        const lgIndex = lowerExp.indexOf("lời giải:");
        const lgIndex2 = lowerExp.indexOf("lời giải");

        let startPP = -1;
        let startLG = -1;

        if (ppIndex !== -1) startPP = ppIndex + "phương pháp giải:".length;
        else if (ppIndex2 !== -1) startPP = ppIndex2 + "phương pháp giải".length;

        if (lgIndex !== -1) startLG = lgIndex;
        else if (lgIndex2 !== -1) startLG = lgIndex2;

        if (startPP !== -1 && startLG !== -1 && startPP < startLG) {
          methodText = sanitizedExplanation.substring(startPP, startLG).trim();
          let lgOffset = lowerExp.indexOf("lời giải:") === startLG ? "lời giải:".length : "lời giải".length;
          explanationText = sanitizedExplanation.substring(startLG + lgOffset).trim();
        } else if (startPP !== -1 && startLG === -1) {
          methodText = sanitizedExplanation.substring(startPP).trim();
          explanationText = "";
        } else if (startPP === -1 && startLG !== -1) {
          let lgOffset = lowerExp.indexOf("lời giải:") === startLG ? "lời giải:".length : "lời giải".length;
          explanationText = sanitizedExplanation.substring(startLG + lgOffset).trim();
        }

        // Clean leading symbols like '-', '+', '*'
        const cleanLine = (line: string) => line.replace(/^[\-\+\*]\s*/, '');

        /* HỘP KỸ THUẬT: bảng một cột, viền trái 3pt Navy, nền xám nhạt - đúng khối mà
           cả ba bản mẫu mô tả. Bản cũ in hai dòng tiêu đề canh giữa rồi thả các dòng ➤
           trôi nổi, nên lời giải lẫn vào câu hỏi kế tiếp, nhìn không ra khối.

           Mỗi bước một dòng riêng (luật "Một dòng - Một chi tiết") giữ nguyên như cũ. */
        const trongHop: any[] = [];

        if (methodText) {
          trongHop.push(nhanTrongHop("💡 Gợi mở của giáo viên:"));
          methodText = methodText.replace(/^\*\*/, "");
          const mLines = gopBangVeMotDong(cleanHtmlNewlinesInTags(methodText)).split('\n');
          for (const line of mLines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              /* Gợi mở in NGHIÊNG, dấu chấm tròn - đúng tệp .docx của Thầy cô. */
              trongHop.push(...await dungDongCoTheCoBang(cleanLine(trimmedLine), {
                italics: true,
                icon: new TextRun({ text: "• ", bold: true }),
              }));
            }
          }
        }

        if (explanationText) {
          trongHop.push(nhanTrongHop("📝 Lời giải chi tiết:"));
          explanationText = explanationText.replace(/^\*\*/, "");
          const eLines = gopBangVeMotDong(cleanHtmlNewlinesInTags(explanationText)).split('\n');
          for (const line of eLines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              trongHop.push(...await dungDongCoTheCoBang(cleanLine(trimmedLine), {
                icon: new TextRun({ text: "- " }),
              }));
            }
          }
        }

        /* Dòng chốt "➜ Kết luận: Chọn C." - nhìn phát thấy đáp án, khỏi dò lại cả hộp. */
        const dapAn = String(q.correct_answer ?? '').trim();
        if (dapAn) {
          trongHop.push(dongKetLuan(
            (qType === 'TN' || qType === 'NLC') ? `Chọn ${dapAn}.` : dapAn,
          ));
        }

        if (trongHop.length) {
          childrenElements.push(hopKyThuat(trongHop));
          /* Word cần một đoạn trống sau bảng, không thì bảng kế tiếp dính liền vào. */
          childrenElements.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        }
      }
    }

      if (khuonDe) {
        childrenElements.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [new TextRun({ text: "--- HẾT ---", italics: true })],
        }));
      }
    }

    // Bảng đáp án của mọi mã, chỉ in khi có trộn mã và là bản dành cho giáo viên
    if (khuonDe?.maDe?.length && exportType === 'teacher') {
      childrenElements.push(...dungBangDapAn(khuonDe.maDe));
    }

    /**
     * Đầu trang và chân trang mang DẤU NEO GÓC, lặp lại trên mọi trang.
     *
     * Bốn dấu vuông đen ở bốn góc để app chấm bài bằng ảnh chụp nắn phẳng được ảnh -
     * ảnh chụp bằng điện thoại luôn nghiêng ít nhiều, không có neo thì mọi toạ độ đều
     * vô nghĩa. Giữa đầu trang là dòng chữ nhận dạng để người vẫn đọc được.
     *
     * Chỉ gắn khi in ĐỀ THI THẬT (có khuôn đề); bản "ngân hàng câu hỏi" không cần.
     */
    const nhanDang = khuonDe
      ? { maDe: khuonDe.dauDe?.maDe, loai: 'de' as const }
      : null;

    const doc = new Document({
      styles: KIEU_MAC_DINH,
      sections: [
        // Phụ lục (nếu có) đi riêng một section khổ ngang; đề thi giữ khổ dọc
        ...(khuonDe?.phuLuc?.length
          ? [{
              properties: {
                page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: LE_TRANG },
              },
              children: khuonDe.phuLuc,
            }]
          : []),
        {
          properties: TRANG_CHUAN,
          ...(nhanDang ? {
            headers: { default: new Header({ children: [daiNeoDauTrang(nhanDang)] }) },
            footers: { default: new Footer({ children: [daiNeo()] }) },
          } : {}),
          children: childrenElements,
        },
      ]
    });

    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // Đề in cho học sinh và đề kèm lời giải cho giáo viên phải khác tên để không ghi đè nhau
    const hauTo = khuonDe
      ? (khuonDe.phuLuc?.length
          ? 'tron_goi'
          : exportType === 'teacher' ? 'de_va_loi_giai' : 'de')
      : exportType;
    a.download = `${filePrefix}_${hauTo}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (e: any) {
    throw new Error(e.message);
  }
};
