/**
 * Dựng GIÁO ÁN (nội dung một bài giảng) thành các đoạn Word.
 *
 * Trước đây bộ này nằm lọt trong trang soạn bài, không ai ngoài trang ấy gọi được. Khi
 * cần xuất cả một chương ra Word thì phải dựng bản thứ hai, và bản thứ hai lệch ngay:
 * ngắt trang ở mỗi dấu "---" (bài giảng chia slide, tài liệu in thì không), và bỏ mất
 * các câu hỏi tương tác. Tách ra đây để cả hai đường đi chung một bộ.
 *
 * Khác với `exportDocx.ts` - bộ ấy dựng ĐỀ THI từ ngân hàng câu hỏi; bộ này dựng BÀI
 * GIẢNG từ markdown (lý thuyết, phân dạng, ví dụ mẫu, câu hỏi tương tác).
 */
import {
  Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle,
  Table, TableRow, TableCell, WidthType, ShadingType,
} from "docx";
import { latexToDocxElement } from "./latexToDocxMath";
import { fetchImageWithDimensions, base64ToUint8Array } from "./exportDocx";
import { anhWord } from "./mauDeThi";

const MATH_MARKER = ' MATH';

/**
 * Bỏ các thẻ HTML mà app dùng để trang trí trên màn hình.
 *
 * Nội dung bài giảng không phải markdown thuần: nó có `<span style="text-align:center;
 * display:block">` để canh giữa và `<div class="border-2 border-indigo-400 ...">` để vẽ
 * khung màu. Trên giấy thì không có khung màu, mà bộ dựng chỉ hiểu span MÀU CHỮ - mấy
 * thẻ còn lại rơi xuống nhánh chữ thường và IN RA NGUYÊN THẺ.
 *
 * Bỏ thẻ nhưng GIỮ chữ bên trong. Riêng `<img>` để nguyên vì bước sau còn dựng ảnh.
 *
 * Không dừng ở dấu `>` đầu tiên: lớp Tailwind của khung màu có dấu `>` nằm ngay trong
 * thuộc tính - `class="... [&>p:last-child]:mb-0"` - nên cắt tới `>` đầu tiên sẽ chừa
 * lại đuôi `p:last-child]:mb-0">` in ra giữa bài. Phải nhảy qua cả đoạn trong dấu nháy.
 */
const boTheTrangTri = (dong: string): string =>
    String(dong || '')
        .replace(/<\/?(?:span|div|p|section|figure|figcaption|small|u|mark)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, '')
        .replace(/<br\s*\/?>/gi, ' ')
        .trim();

// Bóc tách công thức $...$ / $$...$$ thành các placeholder vô hại (  không bao giờ
// xuất hiện trong nội dung thật) để không bị lẫn với ảnh/in đậm khi tách dòng thành runs.
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

// Tách 1 đoạn text thường (không còn ảnh/công thức) thành các TextRun, xử lý **in đậm**.
//
// Bản cũ còn đọc màu chữ từ <span style="color:...">. Bản in giấy để chữ ĐEN HẾT: màu
// trên màn hình là để gây chú ý khi đọc trên máy, in ra thì rối và tốn mực. Thẻ span
// nay đã bị `boTheTrangTri` gỡ từ trước, nên ở đây chỉ còn chữ.
const textToRuns = (
    text: string,
    opts: { color?: string; bold?: boolean } = {},
): { runs: TextRun[]; dam: boolean } => {
    const damVao = opts.bold ?? false;
    if (!text) return { runs: [], dam: damVao };

    /* Dấu đậm hoạt động như CÔNG TẮC chứ không phải cặp đóng mở tìm được trong một đoạn.
       Lý do: một dòng bị cắt nhỏ ở mỗi công thức, nên "**tích phân từ $a$ đến $b$**" có
       dấu mở nằm ở mẩu này còn dấu đóng nằm ở mẩu kia - dò theo cặp thì không bao giờ
       khớp, và cả hai dấu sao in ra giữa bài. Bật tắt theo công tắc thì khớp được, miễn
       là mẩu sau nhận lại trạng thái của mẩu trước. */
    const runs: TextRun[] = [];
    let dam = damVao;
    const manh = text.split('**');
    manh.forEach((m, i) => {
        if (i > 0) dam = !dam;
        if (!m) return;
        /* Trong mỗi mẩu, dấu sao ĐƠN là chữ nghiêng - dò theo cặp vì chữ nghiêng không
           bắc cầu qua công thức như chữ đậm. */
        let con = m;
        while (con.length > 0) {
            const d = con.indexOf('*');
            const c = d === -1 ? -1 : con.indexOf('*', d + 1);
            if (d === -1 || c === -1) {
                runs.push(new TextRun({ text: con, color: opts.color, bold: dam }));
                break;
            }
            if (d > 0) runs.push(new TextRun({ text: con.slice(0, d), color: opts.color, bold: dam }));
            runs.push(new TextRun({ text: con.slice(d + 1, c), color: opts.color, bold: dam, italics: true }));
            con = con.slice(c + 1);
        }
    });
    return { runs, dam };
};

// Chuyển 1 dòng nội dung (có thể chứa ảnh, công thức, in đậm) thành mảng children cho
// Paragraph của docx: TextRun | Math | ImageRun.
//
// Gỡ thẻ trang trí ngay tại đây vì đây là cửa duy nhất mọi chữ đi qua - chữ trong bài
// giảng, trong câu hỏi tương tác, trong lời giải đều vào đường này.
const buildRunsFromLine = async (line: string, opts: { color?: string; bold?: boolean } = {}): Promise<any[]> => {
    const mathStore: string[] = [];
    const withPlaceholders = extractMathPlaceholders(boTheTrangTri(line), mathStore);

    const runs: any[] = [];
    let remaining = withPlaceholders;
    /* Trạng thái chữ đậm phải đi xuyên qua các mẩu bị công thức cắt ra. */
    let dam = opts.bold ?? false;
    const dungChu = (s: string) => {
        const kq = textToRuns(s, { ...opts, bold: dam });
        dam = kq.dam;
        return kq.runs;
    };
    while (remaining.length > 0) {
        const imgIdx = remaining.toLowerCase().indexOf('<img');
        const mdIdx = remaining.indexOf('![');
        const mathIdx = remaining.indexOf(MATH_MARKER);

        const candidates = [
            imgIdx !== -1 ? { type: 'img', idx: imgIdx } : null,
            mdIdx !== -1 ? { type: 'mdimg', idx: mdIdx } : null,
            mathIdx !== -1 ? { type: 'math', idx: mathIdx } : null,
        ].filter((c): c is { type: string; idx: number } => c !== null);

        if (candidates.length === 0) {
            runs.push(...dungChu(remaining));
            break;
        }
        candidates.sort((a, b) => a.idx - b.idx);
        const next = candidates[0];

        if (next.idx > 0) runs.push(...dungChu(remaining.slice(0, next.idx)));

        if (next.type === 'math') {
            const endIdx = remaining.indexOf(' ', next.idx + MATH_MARKER.length);
            const nStr = remaining.slice(next.idx + MATH_MARKER.length, endIdx);
            const n = parseInt(nStr, 10);
            runs.push(latexToDocxElement(mathStore[n], { ...opts, bold: dam }));
            remaining = remaining.slice(endIdx + 1);
        } else if (next.type === 'img') {
            const end = remaining.indexOf('>', next.idx);
            if (end === -1) { runs.push(...dungChu(remaining.slice(next.idx))); break; }
            const tag = remaining.slice(next.idx, end + 1);
            remaining = remaining.slice(end + 1);
            const srcMatch = tag.match(/src="(data:image\/([^;]+);base64,([^"]+))"/i) || tag.match(/src='(data:image\/([^;]+);base64,([^']+))'/i);
            if (srcMatch && srcMatch[3]) {
                try {
                    const buffer = base64ToUint8Array(srcMatch[3].replace(/\s+/g, ''));
                    runs.push(anhWord(buffer, 300, 200));
                } catch (e) { /* bỏ qua ảnh lỗi */ }
            }
        } else {
            const bracketEnd = remaining.indexOf('](', next.idx);
            const parenEnd = bracketEnd !== -1 ? remaining.indexOf(')', bracketEnd) : -1;
            if (bracketEnd === -1 || parenEnd === -1) {
                runs.push(new TextRun({ text: '![', color: opts.color, bold: opts.bold }));
                remaining = remaining.slice(next.idx + 2);
            } else {
                const url = remaining.slice(bracketEnd + 2, parenEnd).trim();
                remaining = remaining.slice(parenEnd + 1);
                try {
                    const imgData = await fetchImageWithDimensions(url);
                    if (imgData) runs.push(anhWord(imgData.buffer, imgData.width, imgData.height));
                } catch (e) { /* bỏ qua ảnh lỗi */ }
            }
        }
    }
    return runs;
};

/* ===================== BẢNG MARKDOWN ===================== */

/**
 * Cắt một dòng bảng thành các ô, KHÔNG cắt nhầm dấu `|` nằm trong công thức.
 *
 * Bài giảng đầy trị tuyệt đối và tập hợp: `$\ln|x|$`, `$\{x \mid x>0\}$`. Cắt thô theo
 * mọi dấu `|` thì một công thức vỡ thành ba ô, bảng lệch cột và công thức hỏng luôn.
 * Nên bỏ qua dấu `|` khi đang ở trong `$...$`, trong dấu nháy ngược, hoặc đã bị `\` chặn.
 */
function catODong(dong: string): string[] {
  const s = dong.trim().replace(/^\|/, '').replace(/\|$/, '');
  const o: string[] = [];
  let hienTai = '', trongMath = false, trongMa = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && i + 1 < s.length) { hienTai += c + s[i + 1]; i++; continue; }
    if (c === '$') trongMath = !trongMath;
    if (c === '`') trongMa = !trongMa;
    if (c === '|' && !trongMath && !trongMa) { o.push(hienTai.trim()); hienTai = ''; continue; }
    hienTai += c;
  }
  o.push(hienTai.trim());
  return o;
}

/** Dòng `|---|:--:|---|` ngăn giữa hàng tiêu đề và phần thân của bảng markdown. */
const LA_DONG_NGAN = (d: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(d);

/**
 * Dựng BẢNG WORD THẬT từ bảng markdown.
 *
 * Vì sao cần: bản trước không có bộ này, mọi dòng `| Bước | Bấm |` rơi xuống nhánh chữ
 * thường và IN RA NGUYÊN DẤU GẠCH ĐỨNG - thầy cô mở tài liệu ra thấy một mớ ký tự. Mục
 * bấm máy Casio nào cũng có bảng, nên hỏng là hỏng khắp bài.
 */
const dungBangWord = async (dongBang: string[]): Promise<Table> => {
  const hang = dongBang.filter(d => !LA_DONG_NGAN(d)).map(catODong);
  const soCot = Math.max(...hang.map(h => h.length));

  const rows: TableRow[] = [];
  for (let r = 0; r < hang.length; r++) {
    const laTieuDe = r === 0;
    const cells: TableCell[] = [];
    for (let c = 0; c < soCot; c++) {
      const runs = await buildRunsFromLine(hang[r][c] ?? '', { bold: laTieuDe });
      cells.push(new TableCell({
        children: [new Paragraph({ children: runs, spacing: { before: 40, after: 40 } })],
        shading: laTieuDe ? { type: ShadingType.CLEAR, fill: 'F2F2F2' } : undefined,
        width: { size: Math.round(100 / soCot), type: WidthType.PERCENTAGE },
      }));
    }
    rows.push(new TableRow({ children: cells, tableHeader: laTieuDe }));
  }
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
};

// Tách 1 khối text dài (nhiều dòng, ví dụ lời giải) theo từng dòng, gộp mỗi dòng
// thành 1 Paragraph có icon mũi tên màu ở đầu dòng.
const buildBulletParagraphs = async (text: string): Promise<Paragraph[]> => {
    const cleaned = text.replace(/^(?:\*\*)?(?:Phương pháp giải|Lời giải|Hướng dẫn giải|Giải thích):?(?:\*\*)?\s*/i, '');
    const lines = cleaned.split('\n').map(l => l.replace(/^[\-\+\*]\s*/, '').trim()).filter(Boolean);
    const paragraphs: Paragraph[] = [];
    for (const line of lines) {
        const runs = await buildRunsFromLine(line);
        paragraphs.push(new Paragraph({
            children: [new TextRun({ text: '➤ ', bold: true }), ...runs],
            spacing: { before: 40, after: 40 },
        }));
    }
    return paragraphs;
};

// Chuyển 1 khối ```quiz``` (câu hỏi tương tác trong bài giảng) thành các Paragraph.
const renderQuizToParagraphs = async (quiz: any, questionNumber: number, type: 'student' | 'teacher'): Promise<Paragraph[]> => {
    const paragraphs: Paragraph[] = [];

    const questionRuns = await buildRunsFromLine((quiz.question || '').replace(/\\n/g, ' '));
    paragraphs.push(new Paragraph({
        children: [new TextRun({ text: `Câu ${questionNumber}. `, bold: true }), ...questionRuns],
        spacing: { before: 160, after: 60 },
    }));

    if (quiz.options) {
        for (let i = 0; i < quiz.options.length; i++) {
            const opt = quiz.options[i];
            const optText = typeof opt === 'string' ? opt : opt.content;
            const label = String.fromCharCode(65 + i);
            const optRuns = await buildRunsFromLine((optText || '').replace(/\\n/g, ' '));
            paragraphs.push(new Paragraph({
                children: [new TextRun({ text: `${label}. `, bold: true }), ...optRuns],
                spacing: { before: 20, after: 20 },
            }));
        }
    }

    if (type === 'teacher') {
        const fullText: string = [quiz.explanation, quiz.sampleAnswer, quiz.answer].filter(Boolean).join('\n\n');
        const lowerExp = fullText.toLowerCase();
        const ppIndex = lowerExp.indexOf('phương pháp giải');
        const lgIndex = lowerExp.indexOf('lời giải');

        let methodText = '';
        let explanationText = '';
        if (ppIndex !== -1 && lgIndex !== -1 && ppIndex < lgIndex) {
            const startPP = ppIndex + (lowerExp.indexOf('phương pháp giải:') === ppIndex ? 17 : 16);
            const startLG = lgIndex + (lowerExp.indexOf('lời giải:') === lgIndex ? 9 : 8);
            methodText = fullText.substring(startPP, lgIndex).trim();
            explanationText = fullText.substring(startLG).trim();
        } else if (ppIndex !== -1 && lgIndex === -1) {
            const startPP = ppIndex + (lowerExp.indexOf('phương pháp giải:') === ppIndex ? 17 : 16);
            methodText = fullText.substring(startPP).trim();
        } else if (ppIndex === -1 && lgIndex !== -1) {
            const startLG = lgIndex + (lowerExp.indexOf('lời giải:') === lgIndex ? 9 : 8);
            explanationText = fullText.substring(startLG).trim();
        } else {
            explanationText = fullText.trim();
        }

        if (methodText) {
            paragraphs.push(new Paragraph({
                children: [new TextRun({ text: 'Phương pháp giải', bold: true })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 160, after: 60 },
            }));
            paragraphs.push(...(await buildBulletParagraphs(methodText)));
        }
        if (explanationText) {
            paragraphs.push(new Paragraph({
                children: [new TextRun({ text: 'Lời giải', bold: true })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 100, after: 60 },
            }));
            paragraphs.push(...(await buildBulletParagraphs(explanationText)));
        }
    }

    return paragraphs;
};

/**
 * Markdown của một bài giảng -> các đoạn Word.
 *
 * @param content  nội dung module (markdown, có thể lẫn HTML và khối ```quiz```)
 * @param type     'student' bỏ lời giải, 'teacher' giữ đủ phương pháp và lời giải
 */
export async function noiDungGiaoAnSangWord(
    content: string,
    type: 'student' | 'teacher' = 'teacher',
): Promise<(Paragraph | Table)[]> {
    let noiDung = String(content || '');

    if (type === 'student') {
        // Xóa bỏ các đoạn được đánh dấu là Lời Giải
        noiDung = noiDung.replace(/\*\*(?:Lời\s*giải|Hướng\s*dẫn\s*giải|HDG|Đáp\s*án).*?\*\*:?[\s\S]*?(?=\*\*Câu|$)/gi, '\n');
        noiDung = noiDung.replace(/<details>[\s\S]*?<summary>.*?(?:Lời\s*giải|Đáp\s*án).*?<\/summary>[\s\S]*?<\/details>/gi, '\n');
    }

    // Xóa màu chữ LaTeX (\color{}) và chữa lỗi cú pháp hệ phương trình viết tắt
    noiDung = noiDung.replace(/\\{1,2}color\s*\{[^}]+\}/gi, '');
    noiDung = noiDung.replace(/\{\{begincases/g, '\\begin{cases}').replace(/endcases\}\}/g, '\\end{cases}');

    // Bóc tách các khối câu hỏi ```quiz``` thành đối tượng JSON thật (không phải chuỗi)
    const quizBlocks: any[] = [];
    noiDung = noiDung.replace(/```quiz\n([\s\S]*?)\n```/g, (match, jsonString) => {
        try {
            const quiz = JSON.parse(jsonString);
            quizBlocks.push(quiz);
            return `\n@@QUIZ_${quizBlocks.length - 1}@@\n`;
        } catch (e) { return match; }
    });

    const bodyParagraphs: (Paragraph | Table)[] = [];
    const lines = noiDung.split('\n');
    let questionCounter = 1;

    for (let iDong = 0; iDong < lines.length; iDong++) {
        const rawLine = lines[iDong];
        // Gỡ thẻ trang trí trước khi xét, để dòng chỉ có mỗi `<div class="...">` thành
        // rỗng và bị bỏ qua, không đẻ ra đoạn trắng giữa bài.
        const trimmed = boTheTrangTri(rawLine);
        if (!trimmed) continue;

        /* BẢNG MARKDOWN: dòng bắt đầu bằng `|` và dòng ngay sau là dòng ngăn `|---|---|`.
           Phải đòi đủ hai dấu hiệu, vì một dòng lẻ có dấu `|` (công thức trị tuyệt đối
           đứng đầu dòng chẳng hạn) không phải là bảng. */
        if (trimmed.startsWith('|') && LA_DONG_NGAN(boTheTrangTri(lines[iDong + 1] || ''))) {
            const dongBang: string[] = [];
            let j = iDong;
            while (j < lines.length) {
                const d = boTheTrangTri(lines[j]);
                if (!d.startsWith('|')) break;
                dongBang.push(d);
                j++;
            }
            bodyParagraphs.push(await dungBangWord(dongBang));
            /* Word dán bảng sát đoạn kế tiếp trông rất chật, chèn một dòng trắng. */
            bodyParagraphs.push(new Paragraph({ children: [], spacing: { after: 120 } }));
            iDong = j - 1;
            continue;
        }
        // Dấu ngắt slide của bài giảng. Tài liệu in đọc liền mạch nên bỏ qua.
        if (/^-{3,}$/.test(trimmed)) continue;

        const quizMatch = trimmed.match(/^@@QUIZ_(\d+)@@$/);
        if (quizMatch) {
            const quiz = quizBlocks[Number(quizMatch[1])];
            // Một khối có thể chứa cả mảng câu hỏi, không phải lúc nào cũng một câu.
            if (quiz) {
                for (const q of Array.isArray(quiz) ? quiz : [quiz]) {
                    bodyParagraphs.push(...(await renderQuizToParagraphs(q, questionCounter, type)));
                    questionCounter++;
                }
            }
            continue;
        }

        let text = trimmed;

        let isQuote = false;
        if (text.startsWith('> ')) { isQuote = true; text = text.slice(2); }
        else if (text === '>') { isQuote = true; text = ''; }

        /* Bản cũ chỉ nhận ba cấp tiêu đề đầu, nên dòng "#### Bước 1:" rơi hết xuống nhánh
           chữ thường và IN RA NGUYÊN DẤU THĂNG. Bài giảng dùng #### rất nhiều cho các ý
           nhỏ, nên phải nhận đủ sáu cấp - và phải dò cấp DÀI trước, vì "#### " cũng khớp
           với phép thử "bắt đầu bằng ### ". */
        let headingLevel: (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined;
        const CAP_TIEU_DE = [
            HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3,
            HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6,
        ];
        const mTieuDe = text.match(/^(#{1,6})\s+([\s\S]*)$/);
        if (mTieuDe) { headingLevel = CAP_TIEU_DE[mTieuDe[1].length - 1]; text = mTieuDe[2]; }

        /* Gạch đầu dòng: dấu phải có KHOẢNG TRẮNG theo sau, và dòng không phải tiêu đề.
           Bản cũ nhận cả dấu sao dính liền chữ, nên tiêu đề "### **Định nghĩa**" bị ăn
           mất một dấu sao thành "- *Định nghĩa**" - vừa hỏng chữ đậm vừa thành gạch đầu
           dòng. Đo trên chương IV: dính 11 dòng mỗi bài. */
        text = text.replace(/^[-+*]\s+/, headingLevel || isQuote ? '' : '- ');

        const runs = await buildRunsFromLine(text);
        bodyParagraphs.push(new Paragraph({
            heading: headingLevel,
            children: runs,
            indent: isQuote ? { left: 480 } : undefined,
            border: isQuote ? { left: { style: BorderStyle.SINGLE, size: 12, color: '000000', space: 8 } } : undefined,
            spacing: { before: headingLevel ? 240 : 80, after: 80 },
        }));
    }

    return bodyParagraphs;
}
