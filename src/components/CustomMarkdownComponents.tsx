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


export const appMarkdownComponents: any = {
   span: ({node, style, children, ...props}: any) => {
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
           parsedStyle = style;
       }
       return <span style={parsedStyle} {...props}>{children}</span>;
   },
   h1: ({node, children, ...props}: any) => (
       <div className="not-prose mt-8 mb-5 flex items-center gap-3">
           <div className="w-1.5 h-7 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"></div>
           <h1 className="text-2xl font-black text-slate-800 tracking-tight m-0" {...props}>{children}</h1>
       </div>
   ),
   h2: ({node, children, ...props}: any) => (
       <div className="not-prose mt-8 mb-4 flex items-center gap-2.5">
           <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
           <h2 className="text-xl font-bold text-slate-800 tracking-tight m-0" {...props}>{children}</h2>
       </div>
   ),
   h3: ({node, children, ...props}: any) => (
       <div className="not-prose mt-6 mb-3 flex items-center gap-2.5">
           <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
           <h3 className="text-lg font-bold text-slate-800 tracking-tight m-0" {...props}>{children}</h3>
       </div>
   ),
   h4: ({node, children, ...props}: any) => <h4 className="text-base font-bold text-slate-800 mt-6 mb-3" {...props}>{children}</h4>,
   h5: ({node, children, ...props}: any) => <h5 className="text-base font-bold text-slate-800 mt-5 mb-2" {...props}>{children}</h5>,
   h6: ({node, children, ...props}: any) => <h6 className="text-sm font-bold text-slate-800 mt-5 mb-2 uppercase" {...props}>{children}</h6>,
   strong: ({node, children, ...props}: any) => {
       const text = String(children);
       const lowerText = text.toLowerCase();
       if (lowerText.includes("hướng dẫn giải") || lowerText.includes("lời giải")) {
          return (
             <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-100 shadow-sm mt-4 mb-2">
                <span className="text-base leading-none">📝</span>
                <span className="text-blue-600 font-bold text-sm tracking-wide uppercase">{children}</span>
             </span>
          );
       }
       if (lowerText.includes("phương pháp giải")) {
          return (
             <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-100 shadow-sm mt-4 mb-2">
                <span className="text-base leading-none">💡</span>
                <span className="text-amber-600 font-bold text-sm tracking-wide uppercase">{children}</span>
             </span>
          );
       }
       if (lowerText.includes("ví dụ mẫu")) {
          return (
             <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-100 shadow-sm mt-4 mb-2">
                <span className="text-base leading-none">📌</span>
                <span className="text-emerald-600 font-bold text-sm tracking-wide uppercase">{children}</span>
             </span>
          );
       }
       if (lowerText.startsWith("bước")) {
          return (
             <span className="inline-flex items-center gap-2 bg-slate-800 text-white px-2.5 py-1 rounded-md font-bold shadow-sm mt-2 mb-1 mr-2 text-xs uppercase tracking-wider">
               <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
               {children}
             </span>
          );
       }
       return <strong {...props} className="text-slate-900 font-bold">{children}</strong>;
   },
   li: ({node, children, ...props}: any) => {
       return (
           <li className="flex items-start gap-3 mb-3 relative group" {...props}>
              <span className="mt-[0.6rem] shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-sm"></span>
              <div className="flex-1 min-w-0 leading-relaxed text-slate-700">{children}</div>
           </li>
       );
   },
   p: ({node, children, ...props}: any) => {
       // Just clean text for paragraphs, no forced icons
       return <p className="mb-4 text-[1.05rem] sm:text-[1.1rem] leading-[1.8] text-slate-700" {...props}>{children}</p>;
   }
};
