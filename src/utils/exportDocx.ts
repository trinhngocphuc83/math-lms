import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun,
  Table, TableRow, TableCell, WidthType, BorderStyle, PageOrientation, VerticalAlign,
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
  opts: { color?: string; bold?: boolean; icon?: TextRun } = {},
): Promise<any[]> => {
  const ra: any[] = [];
  let conLai = line;
  const RE_BANG = /\$?\s*\\begin\s*\{array\}[\s\S]*?\\end\s*\{array\}\s*\$?/;
  let iconConLai = opts.icon;

  // Dấu ➤ chỉ gắn vào đoạn văn ĐẦU TIÊN của dòng; nếu dòng mở đầu bằng bảng thì
  // gắn vào đoạn ngay sau bảng để không mất mốc đầu dòng.
  const themDoanVan = async (text: string) => {
    const runs = await processTextLine(text, opts.color, opts.bold);
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

const processTextLine = async (textLine: string, defaultColor?: string, defaultBold: boolean = false) => {
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
        if (before) elements.push(new TextRun({ text: before, color: defaultColor, bold: defaultBold }));
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
         elements.push(new TextRun({ text: plainText, color: defaultColor, bold: defaultBold }));
      }
      break;
    }
    
    if (startIndex > 0) {
      const textBefore = remaining.substring(0, startIndex);
      let plainText = textBefore.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
      if (plainText) {
         elements.push(new TextRun({ text: plainText, color: defaultColor, bold: defaultBold }));
      }
    }
    
    const afterStart = remaining.substring(startIndex);
    
    if (nextType === 'html') {
      const imgEnd = afterStart.indexOf('>');
      
      if (imgEnd === -1) {
        let plainText = afterStart.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
        if (plainText) {
           elements.push(new TextRun({ text: plainText, color: defaultColor, bold: defaultBold }));
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
          elements.push(new ImageRun({
            data: buffer,
            transformation: { width: 300, height: 200 }
          } as any));
        } catch(e) {
          console.error("Lỗi parse ảnh base64:", e);
        }
      }
    } else if (nextType === 'md') {
      const bracketEnd = afterStart.indexOf('](');
      if (bracketEnd === -1) {
         elements.push(new TextRun({ text: "![", color: defaultColor, bold: defaultBold }));
         remaining = afterStart.substring(2);
         continue;
      }
      const parenEnd = afterStart.indexOf(')', bracketEnd);
      if (parenEnd === -1) {
         elements.push(new TextRun({ text: "![", color: defaultColor, bold: defaultBold }));
         remaining = afterStart.substring(2);
         continue;
      }
      
      const url = afterStart.substring(bracketEnd + 2, parenEnd).trim();
      remaining = afterStart.substring(parenEnd + 1);
      
      try {
         const imgData = await fetchImageWithDimensions(url);
         if (imgData) {
            elements.push(new ImageRun({
               data: imgData.buffer,
               transformation: { width: imgData.width, height: imgData.height }
            } as any));
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
const dungDauDe = (dauDe: DauDe): Table => new Table({
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
      ],
    }),
  ],
});

/** Tiêu đề một PHẦN kèm câu dẫn chuẩn và số điểm của phần. */
const dungTieuDePhan = (phan: PhanDeThi, diem?: number): Paragraph[] => [
  new Paragraph({
    spacing: { before: 320, after: 60 },
    children: [
      new TextRun({ text: `PHẦN ${phan.soLaMa}. `, bold: true, color: "0000FF" }),
      new TextRun({ text: phan.tieuDe, bold: true }),
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
 * Bản cũ nhồi cả bốn phương án vào MỘT đoạn văn, ngăn nhau bằng bốn dấu cách. Word tự
 * ngắt dòng ở đâu tuỳ nó, nên phương án dài ngắn khác nhau là các cột so le hết, đọc
 * rất rối - đúng chỗ thầy cô phàn nàn. Dùng bảng KHÔNG KẺ VIỀN thì các cột thẳng tăm
 * tắp mà in ra vẫn không thấy đường kẻ nào.
 *
 * Chọn số cột theo phương án DÀI NHẤT, không theo trung bình: chỉ cần một phương án dài
 * là cả hàng bị đội cao, nên phải để nó quyết định.
 */
const dungPhuongAnNLC = async (
  q: any,
  doiChu: (s: string) => Promise<any[]>,
): Promise<any[]> => {
  const nhan = ["A", "B", "C", "D"] as const;
  const noiDung = [q.option_a, q.option_b, q.option_c, q.option_d].map(x => String(x ?? ""));

  // Phương án rỗng thì bỏ hẳn cột, đỡ chừa một khoảng trống vô nghĩa giữa đề
  const dsCo = nhan.map((n, i) => ({ nhan: n, noiDung: noiDung[i] })).filter(x => x.noiDung.trim());
  if (dsCo.length === 0) return [];

  const daiNhat = Math.max(...dsCo.map(x => beRongPhuongAn(x.noiDung)));
  const coAnh = dsCo.some(x => /!\[|<img/i.test(x.noiDung));
  const soCot = coAnh ? 1 : daiNhat <= 14 ? 4 : daiNhat <= 34 ? 2 : 1;

  const oPhuongAn = async (x: { nhan: string; noiDung: string }) => new TableCell({
    // Không kẻ viền: chỉ mượn bảng để canh cột, in ra phải trông như đoạn văn thường
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    margins: { top: 20, bottom: 20, left: 0, right: 120 },
    children: [new Paragraph({
      children: [
        new TextRun({ text: `${x.nhan}. `, bold: true, color: "0000FF" }),
        ...(await doiChu(cleanHtmlNewlinesInTags(x.noiDung))),
      ],
    })],
  });

  const hang: any[] = [];
  for (let i = 0; i < dsCo.length; i += soCot) {
    const trongHang = dsCo.slice(i, i + soCot);
    const o = [];
    for (const x of trongHang) o.push(await oPhuongAn(x));
    // Hàng cuối thiếu ô thì chèn ô rỗng, không thì Word kéo giãn ô cuối chiếm hết bề ngang
    while (o.length < soCot) {
      o.push(new TableCell({
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        children: [new Paragraph({ text: "" })],
      }));
    }
    hang.push(new TableRow({ children: o }));
  }

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: Array.from({ length: soCot }, () => Math.floor(9000 / soCot)),
      rows: hang,
    }),
    // Bảng dính sát câu sau nếu không chừa một dòng trống phía dưới
    new Paragraph({ text: "", spacing: { after: 120 } }),
  ];
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
        childrenElements.push(dungDauDe({ ...khuonDe.dauDe, maDe: maHienTai.ma }));
        childrenElements.push(new Paragraph({ text: "", spacing: { after: 200 } }));
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

    for (let i = 0; i < dsCau.length; i++) {
      const q = dsCau[i];

      // Sang một PHẦN mới thì chèn tiêu đề phần trước khi in câu đầu của phần đó
      const phanMoi = mocPhan.get(i);
      if (phanMoi) {
        childrenElements.push(...dungTieuDePhan(phanMoi, khuonDe?.diemPhan?.[phanMoi.ma]));
      }

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
            new TextRun({ text: `Câu ${i + 1}. `, bold: true, color: "0000FF" }),
            ...(await processTextLine(titleLineText))
          ],
          spacing: { before: 200 }
        })
      );
      
      if (imageData && contentLines[0].match(/\[HÌNH VẼ.*\]|\[HINH VẼ.*\]|\[BẢNG BIẾN THIÊN\]/gi)) {
         childrenElements.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageData.buffer,
                  transformation: { width: imageData.width, height: imageData.height },
                } as any),
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
                  new ImageRun({
                    data: imageData.buffer,
                    transformation: { width: imageData.width, height: imageData.height },
                  } as any),
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
                new ImageRun({
                  data: imageData.buffer,
                  transformation: { width: imageData.width, height: imageData.height },
                } as any),
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
        childrenElements.push(new Paragraph({ children: [new TextRun({ text: `a) `}), ...(await processTextLine(cleanHtmlNewlinesInTags(q.option_a || "")))] }));
        childrenElements.push(new Paragraph({ children: [new TextRun({ text: `b) `}), ...(await processTextLine(cleanHtmlNewlinesInTags(q.option_b || "")))] }));
        childrenElements.push(new Paragraph({ children: [new TextRun({ text: `c) `}), ...(await processTextLine(cleanHtmlNewlinesInTags(q.option_c || "")))] }));
        childrenElements.push(new Paragraph({ children: [new TextRun({ text: `d) `}), ...(await processTextLine(cleanHtmlNewlinesInTags(q.option_d || "")))], spacing: { after: 200 } }));
      } else if (qType === 'TLN') {
        childrenElements.push(new Paragraph({
          children: [new TextRun({ text: "Kết quả: .......................................", bold: true, color: "0000FF" })],
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

        // 1. Output "Phương pháp giải" header
        childrenElements.push(
          new Paragraph({
            children: [new TextRun({ text: "Phương pháp giải", bold: true, color: "0000FF" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 }
          })
        );

        // 2. Output Method lines with icons
        if (methodText) {
          methodText = methodText.replace(/^\*\*/, "");
          const mLines = gopBangVeMotDong(cleanHtmlNewlinesInTags(methodText)).split('\n');
          for (const line of mLines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              childrenElements.push(...await dungDongCoTheCoBang(cleanLine(trimmedLine), {
                icon: new TextRun({ text: "➤ ", color: "E67E22", bold: true }),
              }));
            }
          }
        }

        // 3. Output "Lời giải" header
        childrenElements.push(
          new Paragraph({
            children: [new TextRun({ text: "Lời giải", bold: true, color: "0000FF" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 200 }
          })
        );

        // 4. Output Explanation lines with icons
        if (explanationText) {
          explanationText = explanationText.replace(/^\*\*/, "");
          const eLines = gopBangVeMotDong(cleanHtmlNewlinesInTags(explanationText)).split('\n');
          for (const line of eLines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              childrenElements.push(...await dungDongCoTheCoBang(cleanLine(trimmedLine), {
                icon: new TextRun({ text: "➤ ", color: "27AE60", bold: true }),
              }));
            }
          }
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

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              size: 24,
              font: "Times New Roman"
            }
          }
        }
      },
      sections: [
        // Phụ lục (nếu có) đi riêng một section khổ ngang; đề thi giữ khổ dọc
        ...(khuonDe?.phuLuc?.length
          ? [{
              properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
              children: khuonDe.phuLuc,
            }]
          : []),
        {
          properties: {},
          children: childrenElements
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
