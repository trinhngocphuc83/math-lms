import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

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
    return parsedStyle;
};

const stripTriggerPrefix = (children: any): any => {
    let contentFound = false;
    const triggerRegex = /^[\s]*(ví dụ|vd|phương pháp|pp|lời giải chi tiết|lời giải|hướng dẫn giải|hướng dẫn|hdg|hd|chú ý|lưu ý|định lý|định nghĩa|tổng quát|lý thuyết)[\s]*[:.-]?[\s]*/i;
    
    const walk = (node: any): any => {
        if (contentFound) return node;

        if (typeof node === 'string') {
            if (!contentFound) {
                const original = node;
                let replaced = original.replace(triggerRegex, '');
                
                if (replaced === original && original.match(/^[\s]*[:.-]?[\s]*$/)) {
                    return '';
                } else if (replaced === original) {
                    if (original.trim().length > 0) {
                        replaced = original.replace(/^[\s]*[:.-]?[\s]*/, '');
                        if (replaced.trim().length > 0) contentFound = true;
                        return replaced;
                    }
                } else {
                    if (replaced.trim().length > 0) contentFound = true;
                    return replaced;
                }
            }
            return node;
        }

        if (Array.isArray(node)) {
            return node.map(walk);
        }

        if (React.isValidElement(node)) {
            const props: any = { ...node.props };
            if (props.children) {
                props.children = walk(props.children);
            }
            return React.cloneElement(node, props);
        }

        return node;
    };

    return walk(children);
};

export const unifiedMarkdownComponents: any = {
   div: ({node, style, children, ...props}: any) => {
       return <div style={sanitizeStyle(style)} {...props}>{children}</div>;
   },
   span: ({node, style, children, ...props}: any) => {
       return <span style={sanitizeStyle(style)} {...props}>{children}</span>;
   },
   h1: ({node, style, children, ...props}: any) => {
       return (
           <div className="not-prose mt-12 mb-6 flex items-center gap-4 w-full">
               <div className="w-3 h-10 bg-blue-600 rounded-full shadow-sm shrink-0"></div>
               <h1 style={sanitizeStyle(style)} className="text-[55px] font-black text-blue-900 tracking-tight m-0 leading-tight" {...props}>{children}</h1>
           </div>
       );
   },
   h2: ({node, style, children, ...props}: any) => {
       return (
           <div className="not-prose mt-10 mb-6 flex justify-center w-full">
               <div className="bg-orange-50 text-orange-700 px-6 py-3 rounded-r-3xl rounded-l-lg border-l-[8px] border-orange-500 font-bold shadow-sm inline-block w-fit leading-relaxed max-w-[95%] break-words text-[45px] uppercase text-center" style={sanitizeStyle(style)} {...props}>
                   {children}
               </div>
           </div>
       );
   },
   h3: ({node, style, children, ...props}: any) => {
       return (
           <h3 style={sanitizeStyle(style)} className="not-prose mt-8 mb-5 text-[40px] font-bold text-indigo-900 tracking-tight leading-[1.35] pl-5 py-2 border-l-[8px] border-indigo-500 bg-indigo-50/50 rounded-r-xl shadow-sm" {...props}>
               {children}
           </h3>
       );
   },
   strong: ({node, style, children, ...props}: any) => {
       return <strong style={sanitizeStyle(style)} {...props} className="text-slate-900 font-bold">{children}</strong>;
   },
   li: ({node, style, children, ...props}: any) => {
       return (
           <li style={sanitizeStyle(style)} className="flex items-start gap-4 mb-4 relative group text-[35px]" {...props}>
              <span className="mt-[15px] shrink-0 w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-sm"></span>
              <div className="flex-1 min-w-0 leading-[1.6] text-slate-700">{children}</div>
           </li>
       );
   },
   p: ({node, style, children, ...props}: any) => {
       return <p style={sanitizeStyle(style)} className="mb-6 text-[35px] leading-[1.6] text-slate-800" {...props}>{children}</p>;
   },
   blockquote: ({node, style, children, ...props}: any) => {
       const text = extractTextFromReactNode(children).trim();
       const lowerText = text.toLowerCase().replace(/[:.,-]/g, '').trim();
       
       let type = 'default';
       let icon = <Info className="w-5 h-5" />;
       let bgClass = 'bg-gray-50';
       let borderClass = 'border-gray-400';
       let headerClass = 'bg-gray-200/50 text-gray-800 border-gray-300';
       let headerText = 'NỘI DUNG';

       if (lowerText.startsWith('ví dụ') || lowerText.startsWith('vd')) {
           type = 'example';
           icon = <span className="text-lg leading-none">📌</span>;
           bgClass = 'bg-emerald-50'; borderClass = 'border-emerald-500'; headerClass = 'bg-emerald-100/70 text-emerald-900 border-emerald-200';
           headerText = 'VÍ DỤ';
       } else if (lowerText.startsWith('phương pháp') || lowerText.startsWith('pp')) {
           type = 'method';
           icon = <span className="text-lg leading-none">💡</span>;
           bgClass = 'bg-amber-50'; borderClass = 'border-amber-500'; headerClass = 'bg-amber-100/70 text-amber-900 border-amber-200';
           headerText = 'PHƯƠNG PHÁP';
       } else if (lowerText.startsWith('lời giải') || lowerText.startsWith('hướng dẫn') || lowerText.startsWith('hd') || lowerText.startsWith('hdg')) {
           type = 'solution';
           icon = <span className="text-lg leading-none">🎯</span>;
           bgClass = 'bg-indigo-50'; borderClass = 'border-indigo-500'; headerClass = 'bg-indigo-100/70 text-indigo-900 border-indigo-200';
           headerText = 'HƯỚNG DẪN GIẢI';
       } else if (lowerText.startsWith('chú ý') || lowerText.startsWith('lưu ý')) {
           type = 'note';
           icon = <AlertTriangle className="w-5 h-5 text-red-600" />;
           bgClass = 'bg-red-50'; borderClass = 'border-red-500'; headerClass = 'bg-red-100/70 text-red-900 border-red-200';
           headerText = 'CHÚ Ý';
       } else if (lowerText.startsWith('định lý') || lowerText.startsWith('định nghĩa') || lowerText.startsWith('tổng quát') || lowerText.startsWith('lý thuyết')) {
           type = 'theorem';
           icon = <span className="text-lg leading-none">📖</span>;
           bgClass = 'bg-blue-50'; borderClass = 'border-blue-500'; headerClass = 'bg-blue-100/70 text-blue-900 border-blue-200';
           headerText = 'KIẾN THỨC TRỌNG TÂM';
       }

       if (type !== 'default') {
           const processedChildren = stripTriggerPrefix(children);
           return (
               <div className={`not-prose my-6 rounded-xl border-2 ${borderClass} ${bgClass} shadow-sm overflow-hidden flex flex-col`}>
                   <div className={`px-4 py-2 border-b ${headerClass} font-bold flex items-center gap-2 uppercase tracking-wide text-[35px]`}>
                       {icon} <span>{headerText}</span>
                   </div>
                   <div className="px-5 py-4 flex-1 min-w-0 prose prose-slate max-w-none text-slate-800 leading-[1.6] font-medium [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 text-[35px]">
                       {processedChildren}
                   </div>
               </div>
           );
       }

       return (
           <blockquote className="not-prose my-6 border-l-[6px] border-slate-400 bg-slate-50 px-6 py-5 rounded-r-xl italic text-slate-700 shadow-sm text-[35px]" {...props}>
               <div className="prose prose-slate max-w-none text-inherit [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 text-[35px]">{children}</div>
           </blockquote>
       );
   }
};

export const appMarkdownComponents = unifiedMarkdownComponents;
export const customMarkdownComponents = unifiedMarkdownComponents;

export const studentMarkdownComponents: any = {
   div: ({node, style, children, ...props}: any) => {
       return <div style={sanitizeStyle(style)} {...props}>{children}</div>;
   },
   span: ({node, style, children, ...props}: any) => {
       return <span style={sanitizeStyle(style)} {...props}>{children}</span>;
   },
   h1: ({node, style, children, ...props}: any) => {
       return (
           <div className="not-prose mt-6 mb-4 flex items-center gap-3 w-full">
               <div className="w-2 h-8 bg-blue-600 rounded-full shadow-sm shrink-0"></div>
               <h1 style={sanitizeStyle(style)} className="text-2xl sm:text-3xl font-black text-blue-900 tracking-tight m-0 leading-tight" {...props}>{children}</h1>
           </div>
       );
   },
   h2: ({node, style, children, ...props}: any) => {
       return (
           <div className="not-prose mt-6 mb-4 flex justify-center w-full">
               <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-r-2xl rounded-l-md border-l-[6px] border-orange-500 font-bold shadow-sm inline-block w-fit leading-relaxed max-w-[95%] break-words text-xl sm:text-2xl uppercase text-center" style={sanitizeStyle(style)} {...props}>
                   {children}
               </div>
           </div>
       );
   },
   h3: ({node, style, children, ...props}: any) => {
       return (
           <h3 style={sanitizeStyle(style)} className="not-prose mt-6 mb-4 text-xl sm:text-2xl font-bold text-indigo-900 tracking-tight leading-[1.35] pl-4 py-1.5 border-l-[6px] border-indigo-500 bg-indigo-50/50 rounded-r-lg shadow-sm" {...props}>
               {children}
           </h3>
       );
   },
   strong: ({node, style, children, ...props}: any) => {
       return <strong style={sanitizeStyle(style)} {...props} className="text-slate-900 font-bold">{children}</strong>;
   },
   li: ({node, style, children, ...props}: any) => {
       return (
           <li style={sanitizeStyle(style)} className="flex items-start gap-3 mb-2 relative group" {...props}>
              <span className="mt-[6px] shrink-0 w-2 h-2 rounded-full bg-indigo-400 shadow-sm"></span>
              <div className="flex-1 min-w-0 leading-[1.6] text-slate-700">{children}</div>
           </li>
       );
   },
   p: ({node, style, children, ...props}: any) => {
       return <p style={sanitizeStyle(style)} className="mb-3 leading-[1.6] text-slate-800" {...props}>{children}</p>;
   },
   blockquote: ({node, style, children, ...props}: any) => {
       const text = extractTextFromReactNode(children).trim();
       const lowerText = text.toLowerCase().replace(/[:.,-]/g, '').trim();
       
       let type = 'default';
       let icon = <Info className="w-4 h-4" />;
       let bgClass = 'bg-gray-50';
       let borderClass = 'border-gray-400';
       let headerClass = 'bg-gray-200/50 text-gray-800 border-gray-300';
       let headerText = 'NỘI DUNG';

       if (lowerText.startsWith('ví dụ') || lowerText.startsWith('vd')) {
           type = 'example';
           icon = <span className="text-base leading-none">📌</span>;
           bgClass = 'bg-emerald-50'; borderClass = 'border-emerald-500'; headerClass = 'bg-emerald-100/70 text-emerald-900 border-emerald-200';
           headerText = 'VÍ DỤ';
       } else if (lowerText.startsWith('phương pháp') || lowerText.startsWith('pp')) {
           type = 'method';
           icon = <span className="text-base leading-none">💡</span>;
           bgClass = 'bg-amber-50'; borderClass = 'border-amber-500'; headerClass = 'bg-amber-100/70 text-amber-900 border-amber-200';
           headerText = 'PHƯƠNG PHÁP';
       } else if (lowerText.startsWith('lời giải') || lowerText.startsWith('hướng dẫn') || lowerText.startsWith('hd') || lowerText.startsWith('hdg')) {
           type = 'solution';
           icon = <span className="text-base leading-none">🎯</span>;
           bgClass = 'bg-indigo-50'; borderClass = 'border-indigo-500'; headerClass = 'bg-indigo-100/70 text-indigo-900 border-indigo-200';
           headerText = 'HƯỚNG DẪN GIẢI';
       } else if (lowerText.startsWith('chú ý') || lowerText.startsWith('lưu ý')) {
           type = 'note';
           icon = <AlertTriangle className="w-4 h-4 text-red-600" />;
           bgClass = 'bg-red-50'; borderClass = 'border-red-500'; headerClass = 'bg-red-100/70 text-red-900 border-red-200';
           headerText = 'CHÚ Ý';
       } else if (lowerText.startsWith('định lý') || lowerText.startsWith('định nghĩa') || lowerText.startsWith('tổng quát') || lowerText.startsWith('lý thuyết')) {
           type = 'theorem';
           icon = <span className="text-base leading-none">📖</span>;
           bgClass = 'bg-blue-50'; borderClass = 'border-blue-500'; headerClass = 'bg-blue-100/70 text-blue-900 border-blue-200';
           headerText = 'KIẾN THỨC TRỌNG TÂM';
       }

       if (type !== 'default') {
           const processedChildren = stripTriggerPrefix(children);
           return (
               <div className={`not-prose my-4 rounded-xl border-2 ${borderClass} ${bgClass} shadow-sm overflow-hidden flex flex-col`}>
                   <div className={`px-3 py-1.5 border-b ${headerClass} font-bold flex items-center gap-2 uppercase tracking-wide text-sm`}>
                       {icon} <span>{headerText}</span>
                   </div>
                   <div className="px-4 py-3 flex-1 min-w-0 prose prose-slate prose-sm sm:prose-base max-w-none text-slate-800 leading-[1.6] font-medium [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
                       {processedChildren}
                   </div>
               </div>
           );
       }

       return (
           <blockquote className="not-prose my-4 border-l-[4px] border-slate-400 bg-slate-50 px-4 py-3 rounded-r-xl italic text-slate-700 shadow-sm" {...props}>
               <div className="prose prose-slate prose-sm sm:prose-base max-w-none text-inherit [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">{children}</div>
           </blockquote>
       );
   }
};

export const checkAndRenderSpecialBlock = () => null;
