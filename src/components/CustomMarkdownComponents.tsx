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

const checkRibbon = (children: any, fallback: any) => {
    const text = extractTextFromReactNode(children).trim();
    if (/^(.{0,8})(Bài\s+\d+|Phần\s+\d+|Dạng\s+\d+|\d+\.)/i.test(text)) {
        return (
            <div className="not-prose mt-0 mb-4 block w-full">
                <div className="bg-orange-50 text-orange-700 px-5 py-2 rounded-r-full rounded-l-md border-l-4 border-orange-500 font-bold shadow-sm inline-block w-fit leading-relaxed max-w-full break-words text-lg">
                    {children}
                </div>
            </div>
        );
    }
    return fallback;
};

// This is the App (E-learning) optimized version of the components
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
   h1: ({node, children, ...props}: any) => checkRibbon(children, <h1 {...props}>{children}</h1>),
   h2: ({node, children, ...props}: any) => checkRibbon(children, <h2 {...props}>{children}</h2>),
   h3: ({node, children, ...props}: any) => checkRibbon(children, <h3 {...props}>{children}</h3>),
   h4: ({node, children, ...props}: any) => checkRibbon(children, <h4 {...props}>{children}</h4>),
   h5: ({node, children, ...props}: any) => checkRibbon(children, <h5 {...props}>{children}</h5>),
   h6: ({node, children, ...props}: any) => checkRibbon(children, <h6 {...props}>{children}</h6>),
   strong: ({node, children, ...props}: any) => {
       const text = String(children);
       const lowerText = text.toLowerCase();
       if (lowerText.includes("hướng dẫn giải") || lowerText.includes("lời giải")) {
          return (
             <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-[1.5px] border-indigo-400 bg-indigo-50/50 shadow-sm mx-1 my-1">
                <span className="text-lg leading-none">📝</span>
                <span className="text-blue-500 font-bold leading-none text-base">{children}</span>
             </span>
          );
       }
       if (lowerText.includes("phương pháp giải")) {
          return (
             <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-[1.5px] border-indigo-400 bg-indigo-50/50 shadow-sm mx-1 my-1">
                <span className="text-lg leading-none">💡</span>
                <span className="text-orange-500 font-bold leading-none text-base">{children}</span>
             </span>
          );
       }
       if (lowerText.includes("ví dụ mẫu")) {
          return (
             <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-[1.5px] border-indigo-400 bg-indigo-50/50 shadow-sm mx-1 my-1">
                <span className="text-lg leading-none">📌</span>
                <span className="text-rose-500 font-bold leading-none text-base">{children}</span>
             </span>
          );
       }
       if (lowerText.startsWith("bước")) {
          return (
             <span className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-400 text-white px-3 py-1 rounded-lg font-black shadow-sm mt-2 mb-1 mr-2">
               <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
               {children}
             </span>
          );
       }
       return <strong {...props} className="text-slate-900 font-bold">{children}</strong>;
   },
   li: ({node, children, ...props}: any) => {
       const text = extractTextFromReactNode(children).trim();
       if (/^(.{0,8})(Bài\s+\d+|Phần\s+\d+|Dạng\s+\d+|\d+\.)/i.test(text)) {
            return (
                <li className="list-none mt-0 mb-3" {...props}>
                    <div className="bg-orange-50 text-orange-700 px-5 py-2 rounded-r-full rounded-l-md border-l-4 border-orange-500 font-bold shadow-sm inline-flex w-fit items-center gap-2 leading-relaxed max-w-full break-words text-lg">
                        {children}
                    </div>
                </li>
            );
        }
       return (
           <li className="flex items-start gap-3 mb-3 relative group" {...props}>
              <span className="w-5 h-5 mt-1 shrink-0 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-sm border border-indigo-200">
                 <CheckCircle2 className="w-3 h-3" />
              </span>
              <div className="flex-1 min-w-0 leading-relaxed">{children}</div>
           </li>
       );
   },
   p: ({node, children, ...props}: any) => {
       const text = extractTextFromReactNode(children).trim();
       if (/^(.{0,8})(Bài\s+\d+|Phần\s+\d+|Dạng\s+\d+|\d+\.)/i.test(text)) {
            return (
                <div className="not-prose mt-0 mb-4 block w-full">
                    <div className="bg-orange-50 text-orange-700 px-5 py-2 rounded-r-full rounded-l-md border-l-4 border-orange-500 font-bold shadow-sm inline-block w-fit leading-relaxed max-w-full break-words text-lg">
                        {children}
                    </div>
                </div>
            );
       }
       
       const kids = React.Children.toArray(children);
       const newKids: React.ReactNode[] = [];
       
       let isStartOfLine = true;
       kids.forEach((child, index) => {
           if (typeof child === 'string' && child.trim() === '' && !child.includes('\u00A0')) {
               newKids.push(child);
               return;
           }

           if (isStartOfLine) {
               let shouldInject = true;
               
               if (typeof child === 'string') {
                   if (/^[\n\s]*\u00A0/.test(child)) {
                       shouldInject = false;
                       child = child.replace(/(^[\n\s]*)\u00A0/, '$1');
                       if (child === '' || child === '\n') {
                           child += '\u200B';
                       }
                   }
               } else if (React.isValidElement(child)) {
                   if ((child.props as any)?.className?.includes('math-display')) {
                       shouldInject = false;
                   }
                   const text = extractTextFromReactNode(child).trim();
                   if (/^(bước|hướng dẫn giải|lời giải|phương pháp|ví dụ mẫu)/i.test(text)) {
                       shouldInject = false;
                   }
               }
               
               if (shouldInject) {
                   newKids.push(
                       <span key={`icon-${index}`} className="inline-flex items-center justify-center mr-2 align-middle relative -top-[1px] text-orange-500 bg-orange-50 rounded shadow-sm border border-orange-100 w-5 h-5 shrink-0">
                          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                       </span>
                   );
               }
               isStartOfLine = false;
           }
           
           newKids.push(child);
           
           if (React.isValidElement(child) && child.type === 'br') {
               isStartOfLine = true;
           }
       });

       return <p className="mb-5 text-[1.1rem] leading-[1.8] text-gray-700" {...props}>{newKids}</p>;
   }
};
