import React from 'react';
import { ChevronRight, CheckCircle2 } from 'lucide-react';

export const extractTextFromReactNode = (node: any): string => {
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }
    if (Array.isArray(node)) {
        return node.map(extractTextFromReactNode).join('');
    }
    if (React.isValidElement(node) && node.props && (node.props as any).children) {
        return extractTextFromReactNode((node.props as any).children);
    }
    return '';
};


const sanitizeStyle = (style: any) => {
    let parsedStyle: any = {};
    if (typeof style === 'string') {
        style.split(';').forEach((rule: string) => {
            const [key, val] = rule.split(':');
            if (key && val) {
                const camelKey = key.trim().replace(/-([a-z])/g, (g: any) => g[1].toUpperCase());
                parsedStyle[camelKey] = val.trim();
            }
        });
    } else if (style) {
        parsedStyle = { ...style };
    }
    // Xóa bỏ các kích thước cứng để đảm bảo hiển thị chuẩn trên App
    delete parsedStyle.fontSize;
    delete parsedStyle.lineHeight;
    return parsedStyle;
};

export const checkAndRenderSpecialBlock = (children: any, isPresentation: boolean = false) => {
    const text = extractTextFromReactNode(children).trim();
    if (text.length > 50 || text.length === 0) return null;

    const cleanText = text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27FF]|💡|🎯|📌|📝|✅|⚙️|✨|⭐|🌟/g, '').trim();
    // Bỏ dấu hai chấm ở cuối hoặc các dấu câu khác để so sánh chính xác hơn
    const lowerText = cleanText.toLowerCase().replace(/[:.,-]/g, '').trim();
    
    // Khôi phục lại text hiển thị (có thể bỏ dấu hai chấm đi cho đẹp)
    const displayText = cleanText.replace(/[:.,-]$/g, '').trim();

    if (lowerText === "hướng dẫn giải" || lowerText === "lời giải" || lowerText === "lời giải chi tiết" || lowerText === "hướng dẫn giải chi tiết") {
       return isPresentation ? (
           <span className="inline-flex items-center gap-[0.5em] px-[1.2em] py-[0.4em] rounded-[1em] border-[2px] border-indigo-400 bg-indigo-50 shadow-sm mx-[0.2em] my-[0.4em] w-fit">
                <span className="text-[1.3em] leading-none">📝</span>
                <span className="text-purple-600 font-bold leading-none uppercase tracking-wide" style={{ fontSize: '1.2em' }}>{displayText}</span>
             </span>
       ) : (
             <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50 border-2 border-indigo-400 shadow-sm mt-4 mb-2 w-fit">
                <span className="text-xl leading-none">📝</span>
                <span className="text-purple-600 font-bold text-base tracking-wide uppercase">{displayText}</span>
             </span>
       );
    }
    if (lowerText === "phương pháp giải" || lowerText === "phương pháp") {
       return isPresentation ? (
           <span className="inline-flex items-center gap-[0.4em] px-[1em] py-[0.2em] rounded-full border-[1.5px] border-amber-400 bg-amber-50/80 shadow-sm mx-[0.2em] my-[0.2em] w-fit">
                <span className="text-[1.2em] leading-none">💡</span>
                <span className="text-orange-500 font-bold leading-none uppercase tracking-wide" style={{ fontSize: '1.1em' }}>{displayText}</span>
             </span>
       ) : (
             <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-100 shadow-sm mt-4 mb-2 w-fit">
                <span className="text-base leading-none">💡</span>
                <span className="text-amber-600 font-bold text-sm tracking-wide uppercase">{displayText}</span>
             </span>
       );
    }
    if (lowerText === "ví dụ mẫu" || lowerText.startsWith("ví dụ")) {
       return isPresentation ? (
           <span className="inline-flex items-center gap-[0.4em] px-[1em] py-[0.2em] rounded-full border-[1.5px] border-emerald-400 bg-emerald-50/80 shadow-sm mx-[0.2em] my-[0.2em] w-fit">
                <span className="text-[1.2em] leading-none">📌</span>
                <span className="text-emerald-600 font-bold leading-none uppercase tracking-wide" style={{ fontSize: '1.1em' }}>{displayText}</span>
             </span>
       ) : (
             <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-100 shadow-sm mt-4 mb-2 w-fit">
                <span className="text-base leading-none">📌</span>
                <span className="text-emerald-600 font-bold text-sm tracking-wide uppercase">{displayText}</span>
             </span>
       );
    }
    if (lowerText === "câu hỏi tương tác") {
       return isPresentation ? (
           <span className="inline-flex items-center gap-[0.4em] px-[1em] py-[0.2em] rounded-full border-[1.5px] border-purple-400 bg-purple-50/80 shadow-sm mx-[0.2em] my-[0.2em] w-fit">
                <span className="text-[1.2em] leading-none">🎯</span>
                <span className="text-purple-600 font-bold leading-none uppercase tracking-wide" style={{ fontSize: '1.1em' }}>{displayText}</span>
             </span>
       ) : (
             <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50/80 border border-purple-100 shadow-sm mt-4 mb-2 w-fit">
                <span className="text-base leading-none">🎯</span>
                <span className="text-purple-600 font-bold text-sm tracking-wide uppercase">{displayText}</span>
             </span>
       );
    }
    if (lowerText.startsWith("bước")) {
       return isPresentation ? (
           <span className="inline-flex items-center gap-[0.5em] bg-gradient-to-r from-pink-500 to-rose-400 text-white px-[0.8em] py-[0.2em] rounded-[0.5em] font-black shadow-sm mt-[0.5em] mb-[0.2em] mr-[0.5em] w-fit uppercase tracking-wider">
               <span className="w-[0.5em] h-[0.5em] bg-white rounded-full animate-pulse"></span>
               {displayText}
             </span>
       ) : (
             <span className="inline-flex items-center gap-2 bg-slate-800 text-white px-2.5 py-1 rounded-md font-bold shadow-sm mt-2 mb-1 mr-2 text-xs uppercase tracking-wider w-fit">
               <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
               {displayText}
             </span>
       );
    }
    return null;
};

export const appMarkdownComponents: any = {
   div: ({node, style, children, ...props}: any) => {
       return <div style={sanitizeStyle(style)} {...props}>{children}</div>;
   },
   span: ({node, style, children, ...props}: any) => {
       return <span style={sanitizeStyle(style)} {...props}>{children}</span>;
   },
   h1: ({node, style, children, ...props}: any) => {
       const special = checkAndRenderSpecialBlock(children, false);
       if (special) return <div className="not-prose my-4 block">{special}</div>;
       return (
           <div className="not-prose mt-8 mb-5 flex items-center gap-3">
               <div className="w-1.5 h-7 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"></div>
               <h1 style={sanitizeStyle(style)} className="text-2xl font-black text-slate-800 tracking-tight m-0" {...props}>{children}</h1>
           </div>
       );
   },
   h2: ({node, style, children, ...props}: any) => {
       const special = checkAndRenderSpecialBlock(children, false);
       if (special) return <div className="not-prose my-3 block">{special}</div>;
       return (
           <div className="not-prose mt-8 mb-4 flex items-center gap-2.5">
               <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
               <h2 style={sanitizeStyle(style)} className="text-xl font-bold text-slate-800 tracking-tight m-0" {...props}>{children}</h2>
           </div>
       );
   },
   h3: ({node, style, children, ...props}: any) => {
       const special = checkAndRenderSpecialBlock(children, false);
       if (special) return <div className="not-prose my-2 block">{special}</div>;
       return (
           <div className="not-prose mt-6 mb-3 flex items-center gap-2.5">
               <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
               <h3 style={sanitizeStyle(style)} className="text-lg font-bold text-slate-800 tracking-tight m-0" {...props}>{children}</h3>
           </div>
       );
   },
   h4: ({node, style, children, ...props}: any) => {
       const special = checkAndRenderSpecialBlock(children, false);
       if (special) return <div className="not-prose my-2 block">{special}</div>;
       return <h4 style={sanitizeStyle(style)} className="text-base font-bold text-slate-800 mt-6 mb-3" {...props}>{children}</h4>;
   },
   h5: ({node, style, children, ...props}: any) => {
       const special = checkAndRenderSpecialBlock(children, false);
       if (special) return <div className="not-prose my-2 block">{special}</div>;
       return <h5 style={sanitizeStyle(style)} className="text-base font-bold text-slate-800 mt-5 mb-2" {...props}>{children}</h5>;
   },
   h6: ({node, style, children, ...props}: any) => {
       const special = checkAndRenderSpecialBlock(children, false);
       if (special) return <div className="not-prose my-2 block">{special}</div>;
       return <h6 style={sanitizeStyle(style)} className="text-sm font-bold text-slate-800 mt-5 mb-2 uppercase" {...props}>{children}</h6>;
   },
   strong: ({node, style, children, ...props}: any) => {
       const special = checkAndRenderSpecialBlock(children, false);
       if (special) return special;
       return <strong style={sanitizeStyle(style)} {...props} className="text-slate-900 font-bold">{children}</strong>;
   },
   li: ({node, style, children, ...props}: any) => {
       return (
           <li style={sanitizeStyle(style)} className="flex items-start gap-3 mb-3 relative group" {...props}>
              <span className="mt-[0.6rem] shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-sm"></span>
              <div className="flex-1 min-w-0 leading-relaxed text-slate-700">{children}</div>
           </li>
       );
   },
   p: ({node, style, children, ...props}: any) => {
       const special = checkAndRenderSpecialBlock(children, false);
       if (special) return <div className="not-prose my-3 block">{special}</div>;
       return <p style={sanitizeStyle(style)} className="mb-4 text-[1.05rem] sm:text-[1.1rem] leading-[1.8] text-slate-700 whitespace-pre-wrap" {...props}>{children}</p>;
   }
};
