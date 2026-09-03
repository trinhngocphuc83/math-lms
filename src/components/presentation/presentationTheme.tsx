import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

/**
 * Bộ typography DÀNH RIÊNG cho trình chiếu (slide), tách khỏi
 * unifiedMarkdownComponents của E-learning.
 *
 * Vì sao phải tách: unifiedMarkdownComponents hardcode cỡ chữ px (55/45/40/35px)
 * cho trang web cuộn dọc. Khi dùng lại cho slide - vốn là khung 16:9 co giãn theo
 * màn hình - chữ không co theo khung, khiến 4/15 slide bị tràn (nặng nhất tràn
 * 1249px, cắt mất 43% nội dung) và nút "Tự ép viền" cũ hoàn toàn vô tác dụng.
 *
 * Cách làm mới: mọi cỡ chữ ở đây tính theo CANVAS CỐ ĐỊNH 1600x900. Trang trình
 * chiếu phóng to/thu nhỏ nguyên canvas bằng transform: scale() - giống cách
 * reveal.js / Slidev / Marp làm - nên tỉ lệ chữ luôn chuẩn trên mọi TV, máy
 * chiếu, laptop.
 */

/** Cỡ canvas thiết kế. Mọi con số px trong file này tính theo hệ quy chiếu này. */
export const CANVAS_WIDTH = 1600;
export const CANVAS_HEIGHT = 900;

const sanitizeStyle = (style: any) => {
    let parsedStyle: any = {};
    if (typeof style === 'string') {
        style.split(';').forEach((rule: string) => {
            const [key, val] = rule.split(':');
            if (key && val) {
                const camelKey = key.trim().replace(/-([a-z])/g, (g: string) => g[1].toUpperCase());
                parsedStyle[camelKey] = val.trim();
            }
        });
    } else if (style) {
        parsedStyle = { ...style };
    }
    return parsedStyle;
};

/**
 * Bỏ emoji / dấu #, *, khoảng trắng ở ĐẦU chuỗi để lấy phần chữ thật dùng cho việc
 * so khớp nhãn thẻ.
 *
 * Cần thiết vì prompt hướng dẫn giáo viên viết "> ### 📌 Ví dụ mẫu" - chuỗi bắt đầu
 * bằng emoji nên phép kiểm tra startsWith('ví dụ') luôn sai, khiến 25/26 bài giảng
 * hiện ra khối trích dẫn xám thay vì thẻ VÍ DỤ MẪU có màu.
 *
 * Dùng so sánh code point thay cho lớp ký tự trong regex: target của dự án là ES2017
 * nên chưa hỗ trợ \p{L}, và regex chứa ký tự đặc biệt từng gây lỗi khó tìm ở dự án này.
 */
function stripLeadingSymbols(s: string): string {
    let i = 0;
    while (i < s.length) {
        const c = s.codePointAt(i)!;
        const isAsciiLetter = (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
        const isDigit = c >= 48 && c <= 57;
        // Chữ Latin có dấu (tiếng Việt) nằm ở các khoảng mở rộng này
        const isLatinExt = (c >= 0x00C0 && c <= 0x024F) || (c >= 0x1E00 && c <= 0x1EFF);
        if (isAsciiLetter || isDigit || isLatinExt) break;
        i += c > 0xFFFF ? 2 : 1;
    }
    return s.slice(i);
}

/** Chuẩn hoá một đoạn chữ về dạng chỉ còn chữ thường, không emoji/dấu câu đầu-cuối. */
function normalizeLabel(raw: string): string {
    return stripLeadingSymbols(String(raw).trim())
        .toLowerCase()
        .replace(/[:.,*#]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Các nhãn thường được viết thành một dòng tiêu đề riêng bên trong thẻ. */
const LABEL_WORDS = [
    'ví dụ mẫu', 'ví dụ', 'vd',
    'phương pháp giải', 'phương pháp', 'pp',
    'lời giải chi tiết', 'lời giải', 'hướng dẫn giải', 'hướng dẫn', 'hdg', 'hd',
    'chú ý', 'lưu ý',
    'định lý', 'định nghĩa', 'tổng quát', 'lý thuyết',
];

/**
 * Bỏ hẳn phần tử đầu tiên nếu nó CHỈ chứa đúng nhãn (ví dụ dòng "### 📌 Ví dụ mẫu"),
 * vì tiêu đề thẻ màu đã hiển thị nhãn đó rồi - tránh lặp hai lần.
 */
const dropLabelHeading = (children: any): any => {
    let removed = false;
    return React.Children.toArray(children).filter((child: any) => {
        if (removed || !React.isValidElement(child)) return true;
        const txt = extractTextFrom((child.props as any)?.children);
        if (txt && LABEL_WORDS.includes(normalizeLabel(txt))) {
            removed = true;
            return false;
        }
        return true;
    });
};

const extractTextFrom = (n: any): string => {
    if (typeof n === 'string' || typeof n === 'number') return String(n);
    if (Array.isArray(n)) return n.map(extractTextFrom).join('');
    if (React.isValidElement(n) && (n.props as any)?.children) return extractTextFrom((n.props as any).children);
    return '';
};

/** Bỏ chữ mồi ("Ví dụ:", "Phương pháp:"...) khỏi nội dung vì đã hiện ở tiêu đề thẻ. */
const stripTriggerPrefix = (children: any): any => {
    let contentFound = false;
    const triggerRegex = /^[\s]*(ví dụ|vd|phương pháp|pp|lời giải chi tiết|lời giải|hướng dẫn giải|hướng dẫn|hdg|hd|chú ý|lưu ý|định lý|định nghĩa|tổng quát|lý thuyết)[\s]*[:.-]?[\s]*/i;

    const walk = (node: any): any => {
        if (contentFound) return node;

        if (typeof node === 'string') {
            const original = node;
            const replaced = original.replace(triggerRegex, '');
            if (replaced !== original) {
                contentFound = true;
                return replaced;
            }
            if (original.trim()) contentFound = true;
            return original;
        }

        if (Array.isArray(node)) return node.map(walk);

        if (React.isValidElement(node)) {
            const props: any = { ...(node.props || {}) };
            if (props.children) props.children = walk(props.children);
            return React.cloneElement(node, props);
        }

        return node;
    };

    return walk(children);
};

/** Cấu hình các loại thẻ nội dung nhận diện từ blockquote. */
const CALLOUTS = [
    {
        match: (t: string) => t.startsWith('ví dụ') || t.startsWith('vd'),
        label: 'VÍ DỤ MẪU',
        icon: '📌',
        accent: '#0d9488',
        bg: 'rgba(240, 253, 250, 0.9)',
        headBg: 'rgba(204, 251, 241, 0.75)',
        headText: '#115e59',
    },
    {
        match: (t: string) => t.startsWith('phương pháp') || t.startsWith('pp'),
        label: 'PHƯƠNG PHÁP GIẢI',
        icon: '💡',
        accent: '#d97706',
        bg: 'rgba(255, 251, 235, 0.9)',
        headBg: 'rgba(254, 243, 199, 0.8)',
        headText: '#92400e',
    },
    {
        match: (t: string) => t.startsWith('lời giải') || t.startsWith('hướng dẫn') || t.startsWith('hdg') || t.startsWith('hd'),
        label: 'HƯỚNG DẪN GIẢI',
        icon: '🎯',
        accent: '#4f46e5',
        bg: 'rgba(238, 242, 255, 0.9)',
        headBg: 'rgba(224, 231, 255, 0.8)',
        headText: '#3730a3',
    },
    {
        match: (t: string) => t.startsWith('chú ý') || t.startsWith('lưu ý'),
        label: 'CHÚ Ý',
        icon: null as any,
        accent: '#dc2626',
        bg: 'rgba(254, 242, 242, 0.9)',
        headBg: 'rgba(254, 226, 226, 0.8)',
        headText: '#991b1b',
    },
    {
        match: (t: string) => t.startsWith('định lý') || t.startsWith('định nghĩa') || t.startsWith('tổng quát') || t.startsWith('lý thuyết'),
        label: 'KIẾN THỨC TRỌNG TÂM',
        icon: '📖',
        accent: '#2563eb',
        bg: 'rgba(239, 246, 255, 0.9)',
        headBg: 'rgba(219, 234, 254, 0.8)',
        headText: '#1e40af',
    },
];

/**
 * Slide này có thẻ VÍ DỤ MẪU hay không - dùng để tự hiện đồng hồ đếm ngược ở
 * trang trình chiếu. Soi trên markdown thô (chưa dựng thành React) nên phải tự dò
 * dòng blockquote, nhưng vẫn dùng lại đúng luật nhận nhãn của CALLOUTS bên trên
 * để không lệch với thẻ màu đang hiển thị.
 */
export function slideCoViDuMau(markdown: string): boolean {
    if (!markdown) return false;
    const calloutViDu = CALLOUTS[0]; // thẻ "VÍ DỤ MẪU"
    for (const dong of String(markdown).split('\n')) {
        const d = dong.trim();
        if (!d.startsWith('>')) continue;
        // Bỏ dấu ">" (có thể lồng nhiều cấp) rồi chuẩn hoá y như lúc dựng thẻ
        const noiDung = d.replace(/^>+\s*/, '').replace(/^#+\s*/, '');
        const nhan = normalizeLabel(noiDung).replace(/-/g, '');
        if (nhan && calloutViDu.match(nhan)) return true;
    }
    return false;
}

export const presentationMarkdownComponents: any = {
    div: ({ node, style, children, ...props }: any) => (
        <div style={sanitizeStyle(style)} {...props}>{children}</div>
    ),
    span: ({ node, style, children, ...props }: any) => (
        <span style={sanitizeStyle(style)} {...props}>{children}</span>
    ),

    // Tiêu đề bài / chương: dải màu phủ hết chiều ngang slide, chữ trắng.
    // Bản cũ chỉ là chữ đen kèm vạch màu mỏng - chiếu lên TV/máy chiếu trông nhạt,
    // không tạo được điểm nhấn mở đầu bài.
    h1: ({ node, style, children, ...props }: any) => (
        <div className="not-prose relative w-full mb-9 mt-1 rounded-[26px] overflow-hidden
                        bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600
                        shadow-[0_18px_45px_-14px_rgba(79,70,229,0.75)]">
            {/* Hoạ tiết mờ cho dải màu đỡ phẳng */}
            <div className="pointer-events-none absolute -right-16 -top-24 w-[340px] h-[340px] rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -right-4 top-16 w-[180px] h-[180px] rounded-full bg-white/[0.07]" />
            {/* Vạch sáng chạy dọc mép trái làm điểm tựa thị giác */}
            <div className="absolute left-0 top-0 bottom-0 w-[12px] bg-white/25" />

            <h1
                style={{ ...sanitizeStyle(style), textShadow: '0 3px 14px rgba(15,23,42,0.35)' }}
                className="relative text-[70px] font-black text-white tracking-tight leading-[1.14] m-0
                           px-12 py-7 break-words text-center"
                {...props}
            >
                {children}
            </h1>
        </div>
    ),

    // Tiêu đề mục / tên dạng toán: thẻ nền nhạt, nổi bật khi chiếu
    h2: ({ node, style, children, ...props }: any) => (
        <div className="not-prose mb-7 mt-2">
            <div
                style={sanitizeStyle(style)}
                className="inline-block max-w-full text-[58px] font-black tracking-tight leading-[1.2] text-red-700
                           bg-gradient-to-r from-indigo-50 to-transparent border-l-[10px] border-indigo-600
                           rounded-r-2xl pl-7 pr-9 py-3 break-words"
                {...props}
            >
                {children}
            </div>
        </div>
    ),

    /*
     * Muc nho: PHAI CO KHUNG.
     *
     * Ben trinh soan va ben hoc sinh, cap nay la khung vien trai cham + nen nhat. Rieng
     * trinh chieu lai chi la mot cham tron - cung mot bai ma soan thao thay dong khung
     * con chieu len bang thi khong. Nay dung chung mot kieu, chi phong to cho vua slide.
     */
    h3: ({ node, style, children, ...props }: any) => (
        <h3
            style={sanitizeStyle(style)}
            className="not-prose text-[47px] font-bold text-indigo-900 tracking-tight leading-[1.3]
                       mb-5 mt-7 pl-7 pr-6 py-3 border-l-[10px] border-indigo-500
                       bg-indigo-50/60 rounded-r-2xl shadow-sm"
            {...props}
        >
            {children}
        </h3>
    ),

    /* Mục con a) b) c) - BỎ dấu ❖ theo yêu cầu, giữ nguyên màu và lề. */
    h4: ({ node, style, children, ...props }: any) => (
        <h4
            style={sanitizeStyle(style)}
            className="not-prose ml-6 text-[40px] font-bold text-teal-800 tracking-tight leading-[1.35] mb-4 mt-5"
            {...props}
        >
            {children}
        </h4>
    ),

    /* ##### của bài cũ: hiện như Ý lớn (chữ thường, gạch "–") cho bài cũ và bài mới
       nhìn cùng một kiểu. */
    h5: ({ node, style, children, ...props }: any) => (
        <h5
            style={sanitizeStyle(style)}
            className="not-prose flex items-start gap-3 text-[40px] font-normal text-slate-800 leading-[1.55] mb-2 mt-2 ml-9"
            {...props}
        >
            <span className="shrink-0 font-bold text-slate-500">–</span>
            <span className="flex-1 min-w-0">{children}</span>
        </h5>
    ),

    p: ({ node, style, children, ...props }: any) => (
        <p style={sanitizeStyle(style)} className="text-[42px] leading-[1.55] text-slate-800 mb-4" {...props}>
            {children}
        </p>
    ),

    /* Ba bậc ý dùng chung lớp .ds-y (globals.css) - đo bằng em nên tự co theo cỡ chữ
       42px của khung chiếu, không phải vẽ riêng một kiểu như trước. */
    ul: ({ node, style, children, ...props }: any) => (
        <ul style={sanitizeStyle(style)} className="ds-y not-prose mb-4 space-y-1" {...props}>{children}</ul>
    ),
    ol: ({ node, style, children, ...props }: any) => (
        <ol style={sanitizeStyle(style)} className="not-prose list-none pl-0 mb-4 space-y-1 [counter-reset:item]" {...props}>{children}</ol>
    ),

    /* Bỏ lề dưới của <p> nằm trong ý: Markdown gói mỗi ý thành một <p>, mà <p> đang có
       mb-4 nên mỗi gạch đầu dòng đội thêm một khoảng trống - nhìn rời rạc, đúng chỗ Thầy
       cô kêu giãn dòng nhiều quá. */
    li: ({ node, style, children, ...props }: any) => (
        <li
            style={sanitizeStyle(style)}
            className="not-prose text-[42px] leading-[1.5] text-slate-800 mb-1.5 [&>p]:mb-0 [&>p]:text-[42px]"
            {...props}
        >
            {children}
        </li>
    ),

    strong: ({ node, style, children, ...props }: any) => (
        <strong style={sanitizeStyle(style)} className="font-black text-indigo-900" {...props}>{children}</strong>
    ),

    em: ({ node, style, children, ...props }: any) => (
        <em style={sanitizeStyle(style)} className="italic text-slate-700" {...props}>{children}</em>
    ),

    a: ({ node, style, children, ...props }: any) => (
        <a style={sanitizeStyle(style)} className="text-blue-600 underline underline-offset-4" {...props}>{children}</a>
    ),

    hr: () => <div className="not-prose my-7 h-[3px] rounded-full bg-slate-200" />,

    img: ({ node, style, ...props }: any) => (
        <img
            style={sanitizeStyle(style)}
            className="block mx-auto my-5 max-h-[440px] w-auto max-w-full rounded-2xl border border-slate-200 shadow-lg"
            {...props}
        />
    ),

    code: ({ node, inline, className, children, ...props }: any) =>
        inline ? (
            <code className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[36px] font-mono" {...props}>{children}</code>
        ) : (
            <code className="block p-5 rounded-2xl bg-slate-900 text-slate-100 text-[32px] font-mono overflow-x-auto" {...props}>{children}</code>
        ),

    // Thẻ nội dung (Ví dụ / Phương pháp / Lời giải / Chú ý / Kiến thức)
    blockquote: ({ node, style, children, ...props }: any) => {
        const text = extractTextFrom(children).trim();
        // Chuẩn hoá có bỏ emoji đầu chuỗi, nhờ đó "📌 Ví dụ mẫu" mới khớp được nhãn "ví dụ"
        const lower = normalizeLabel(text).replace(/-/g, '');
        const callout = CALLOUTS.find(c => c.match(lower));

        if (!callout) {
            return (
                <blockquote
                    className="not-prose my-6 rounded-r-2xl border-l-[8px] border-slate-300 bg-slate-50 px-8 py-6
                               text-[42px] leading-[1.55] italic text-slate-700"
                    {...props}
                >
                    {children}
                </blockquote>
            );
        }

        return (
            <div
                className="not-prose my-6 rounded-2xl overflow-hidden shadow-[0_6px_24px_-8px_rgba(15,23,42,0.18)]"
                style={{ border: `3px solid ${callout.accent}`, background: callout.bg }}
            >
                <div
                    className="flex items-center gap-3 px-7 py-3 text-[32px] font-black uppercase tracking-wider"
                    style={{ background: callout.headBg, color: callout.headText }}
                >
                    {callout.icon
                        ? <span className="text-[34px] leading-none">{callout.icon}</span>
                        : <AlertTriangle className="w-[34px] h-[34px]" />}
                    <span>{callout.label}</span>
                </div>
                <div className="hop-giai px-8 py-5 text-[42px] leading-[1.5] text-slate-800">
                    {stripTriggerPrefix(dropLabelHeading(children))}
                </div>
            </div>
        );
    },

    table: ({ node, style, children, ...props }: any) => (
        <div className="not-prose my-6 overflow-x-auto rounded-2xl border-2 border-slate-300 shadow-sm">
            <table className="w-full border-collapse text-[32px]" style={sanitizeStyle(style)} {...props}>{children}</table>
        </div>
    ),
    thead: ({ node, style, children, ...props }: any) => (
        <thead className="bg-slate-100" style={sanitizeStyle(style)} {...props}>{children}</thead>
    ),
    tbody: ({ node, style, children, ...props }: any) => (
        <tbody className="bg-white" style={sanitizeStyle(style)} {...props}>{children}</tbody>
    ),
    tr: ({ node, style, children, ...props }: any) => (
        <tr className="border-b border-slate-200 last:border-0" style={sanitizeStyle(style)} {...props}>{children}</tr>
    ),
    th: ({ node, style, children, ...props }: any) => (
        <th className="px-6 py-3 text-left font-black text-slate-800 border-r border-slate-200 last:border-0" style={sanitizeStyle(style)} {...props}>{children}</th>
    ),
    td: ({ node, style, children, ...props }: any) => (
        <td className="px-6 py-3 align-top text-slate-700 border-r border-slate-200 last:border-0" style={sanitizeStyle(style)} {...props}>{children}</td>
    ),
};

export default presentationMarkdownComponents;
