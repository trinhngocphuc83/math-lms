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
import { Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { latexToDocxElement } from "./latexToDocxMath";
import { fetchImageWithDimensions, base64ToUint8Array } from "./exportDocx";
import { anhWord } from "./mauDeThi";

const MATH_MARKER = ' MATH';

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

// Tách 1 đoạn text thường (không còn ảnh/công thức) thành các TextRun, xử lý **in đậm**
// và <span style="color:...">...</span> (không lồng nhau - đúng với cách nội dung AI sinh ra).
const textToRuns = (text: string, opts: { color?: string; bold?: boolean } = {}): TextRun[] => {
    if (!text) return [];
    const boldItalicRuns = (t: string): TextRun[] => {
        const runs: TextRun[] = [];
        let remaining = t;
        while (remaining.length > 0) {
            const boldIdx = remaining.indexOf('**');
            if (boldIdx !== -1) {
                const endBold = remaining.indexOf('**', boldIdx + 2);
                if (endBold !== -1) {
                    if (boldIdx > 0) runs.push(new TextRun({ text: remaining.slice(0, boldIdx), color: opts.color, bold: opts.bold }));
                    runs.push(new TextRun({ text: remaining.slice(boldIdx + 2, endBold), color: opts.color, bold: true }));
                    remaining = remaining.slice(endBold + 2);
                    continue;
                }
            }
            runs.push(new TextRun({ text: remaining, color: opts.color, bold: opts.bold }));
            break;
        }
        return runs;
    };

    const spanRegex = /<span[^>]*style="[^"]*color:\s*([^;"]+)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
    const runs: TextRun[] = [];
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    let hasSpan = false;
    while ((m = spanRegex.exec(text)) !== null) {
        hasSpan = true;
        if (m.index > lastIndex) runs.push(...boldItalicRuns(text.slice(lastIndex, m.index)));
        const color = m[1].trim().replace('#', '').toUpperCase();
        runs.push(...textToRuns(m[2], { ...opts, color }));
        lastIndex = m.index + m[0].length;
    }
    if (hasSpan) {
        if (lastIndex < text.length) runs.push(...boldItalicRuns(text.slice(lastIndex)));
        return runs;
    }
    return boldItalicRuns(text);
};

// Chuyển 1 dòng nội dung (có thể chứa ảnh, công thức, in đậm, span màu) thành mảng
// children cho Paragraph của docx: TextRun | Math | ImageRun.
const buildRunsFromLine = async (line: string, opts: { color?: string; bold?: boolean } = {}): Promise<any[]> => {
    const mathStore: string[] = [];
    const withPlaceholders = extractMathPlaceholders(line, mathStore);

    const runs: any[] = [];
    let remaining = withPlaceholders;
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
            runs.push(...textToRuns(remaining, opts));
            break;
        }
        candidates.sort((a, b) => a.idx - b.idx);
        const next = candidates[0];

        if (next.idx > 0) runs.push(...textToRuns(remaining.slice(0, next.idx), opts));

        if (next.type === 'math') {
            const endIdx = remaining.indexOf(' ', next.idx + MATH_MARKER.length);
            const nStr = remaining.slice(next.idx + MATH_MARKER.length, endIdx);
            const n = parseInt(nStr, 10);
            runs.push(latexToDocxElement(mathStore[n], opts));
            remaining = remaining.slice(endIdx + 1);
        } else if (next.type === 'img') {
            const end = remaining.indexOf('>', next.idx);
            if (end === -1) { runs.push(...textToRuns(remaining.slice(next.idx), opts)); break; }
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

// Tách 1 khối text dài (nhiều dòng, ví dụ lời giải) theo từng dòng, gộp mỗi dòng
// thành 1 Paragraph có icon mũi tên màu ở đầu dòng.
const buildBulletParagraphs = async (text: string, bulletColor: string): Promise<Paragraph[]> => {
    const cleaned = text.replace(/^(?:\*\*)?(?:Phương pháp giải|Lời giải|Hướng dẫn giải|Giải thích):?(?:\*\*)?\s*/i, '');
    const lines = cleaned.split('\n').map(l => l.replace(/^[\-\+\*]\s*/, '').trim()).filter(Boolean);
    const paragraphs: Paragraph[] = [];
    for (const line of lines) {
        const runs = await buildRunsFromLine(line);
        paragraphs.push(new Paragraph({
            children: [new TextRun({ text: '➤ ', color: bulletColor, bold: true }), ...runs],
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
        children: [new TextRun({ text: `Câu ${questionNumber}. `, bold: true, color: '0000FF' }), ...questionRuns],
        spacing: { before: 160, after: 60 },
    }));

    if (quiz.options) {
        for (let i = 0; i < quiz.options.length; i++) {
            const opt = quiz.options[i];
            const optText = typeof opt === 'string' ? opt : opt.content;
            const label = String.fromCharCode(65 + i);
            const optRuns = await buildRunsFromLine((optText || '').replace(/\\n/g, ' '));
            paragraphs.push(new Paragraph({
                children: [new TextRun({ text: `${label}. `, bold: true, color: '0000FF' }), ...optRuns],
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
                children: [new TextRun({ text: 'Phương pháp giải', bold: true, color: '0000FF' })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 160, after: 60 },
            }));
            paragraphs.push(...(await buildBulletParagraphs(methodText, 'E67E22')));
        }
        if (explanationText) {
            paragraphs.push(new Paragraph({
                children: [new TextRun({ text: 'Lời giải', bold: true, color: '0000FF' })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 100, after: 60 },
            }));
            paragraphs.push(...(await buildBulletParagraphs(explanationText, '27AE60')));
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
): Promise<Paragraph[]> {
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

    const bodyParagraphs: Paragraph[] = [];
    const lines = noiDung.split('\n');
    let questionCounter = 1;

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed) continue;
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

        text = text.replace(/^[\-\+\*]\s*/, isQuote ? '' : '- ');

        const runs = await buildRunsFromLine(text, isQuote ? { color: '555555' } : {});
        bodyParagraphs.push(new Paragraph({
            heading: headingLevel,
            children: runs,
            indent: isQuote ? { left: 480 } : undefined,
            border: isQuote ? { left: { style: BorderStyle.SINGLE, size: 12, color: '6366F1', space: 8 } } : undefined,
            spacing: { before: headingLevel ? 240 : 80, after: 80 },
        }));
    }

    return bodyParagraphs;
}
