"use client";

import React from "react";
import { AlertTriangle, CropIcon, PlusCircle, Trash2, ArrowUp, ArrowDown, ListTodo, Type, Image as ImageIcon, MonitorPlay, Database, ChevronUp, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import { fixLatexText, applyLatexFixToActiveElement } from "@/utils/latexFixer";
import 'katex/dist/katex.min.css';
import QuestionBankModal from "@/components/admin/QuestionBankModal";

export interface Block {
  id: string;
  type: 'md' | 'quiz';
  content: any;
}

const customMarkdownComponents: any = {
   strong: ({node, children, ...props}: any) => {
      const text = String(children);
      if (text.toLowerCase().includes("hướng dẫn giải") || text.toLowerCase().includes("phương pháp giải") || text.toLowerCase().includes("lời giải")) {
         return (
            <span className="block mt-10 mb-4 not-prose w-full">
               <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-t-2xl font-black flex items-center gap-3 w-max max-w-full shadow-md">
                  <span className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0 shadow-inner text-lg">💡</span>
                  {text.toUpperCase()}
               </span>
               <span className="bg-white border-l-4 border-orange-400 p-4 rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-100 flex items-center gap-2 mb-2 w-full">
                  <span className="text-orange-600 font-bold text-sm uppercase flex items-center gap-2">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                     Các bước chi tiết bên dưới
                  </span>
               </span>
            </span>
         );
      }
      if (text.toLowerCase().startsWith("bước")) {
         return (
            <span className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-400 text-white px-3 py-1 rounded-lg font-black shadow-sm mt-3 mb-1 mr-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              {children}
            </span>
         );
      }
      return <strong {...props} className="text-slate-900 font-bold">{children}</strong>;
   },
   li: ({node, children, ...props}: any) => (
       <li className="flex items-start gap-3 mb-3 relative group" {...props}>
          <span className="w-5 h-5 mt-1 shrink-0 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-sm border border-indigo-200">
             <CheckCircle2 className="w-3 h-3" />
          </span>
          <div className="flex-1 min-w-0">{children}</div>
       </li>
   ),
   p: ({node, children, ...props}: any) => {
       const kids = React.Children.toArray(children);
       const newKids: React.ReactNode[] = [];
       
       let isStartOfLine = true;
       kids.forEach((child, index) => {
           if (isStartOfLine) {
               let shouldInject = true;
               if (typeof child === 'string' && child.trim() === '') shouldInject = false;
               if (React.isValidElement(child) && child.props && child.props.className && child.props.className.includes('math-display')) shouldInject = false;
               
               if (shouldInject) {
                   newKids.push(
                       <span key={`icon-${index}`} className="inline-flex items-center justify-center mr-2 mt-1.5 align-top text-orange-500 bg-orange-50 rounded shadow-sm border border-orange-100 w-5 h-5 shrink-0">
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

       return <p className="mb-6 text-[1.1rem] leading-[1.8] text-gray-700 flex flex-wrap items-start" {...props}>{newKids}</p>;
   }
};

export default function BlockEditor({ blocks, onChangeBlocks, onTriggerCrop, globalSourceImage }: { blocks: Block[], onChangeBlocks: (b: Block[]) => void, onTriggerCrop: (meta: any, targetBlockId: string) => void, globalSourceImage?: string }) {

  const [previewBlocks, setPreviewBlocks] = React.useState<Set<string>>(new Set());
  const [collapsedBlocks, setCollapsedBlocks] = React.useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) => {
      setCollapsedBlocks(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
      });
  };
  const [isBankModalOpen, setIsBankModalOpen] = React.useState(false);
  const [insertIndex, setInsertIndex] = React.useState(-1);

  const handleInsertFromBank = (questions: any[]) => {
      const newBlocks = [...blocks];
      const itemsToInsert: Block[] = questions.map(q => {
         let blockType = 'multiple_choice';
         if (q.question_type === 'TL') blockType = 'essay';
         else if (q.question_type === 'TLN') blockType = 'short_answer';
         else if (q.question_type === 'DS') blockType = 'true_false_cluster';

         const content: any = {
             type: blockType,
             question: q.content || "",
             sampleAnswer: q.explanation || "",
             sourceQuestionId: q.id // Lưu ID để đếm số lần sử dụng
         };

         if (blockType === 'multiple_choice') {
             content.options = [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean);
             content.answerIndex = q.correct_answer === 'A' ? 0 : q.correct_answer === 'B' ? 1 : q.correct_answer === 'C' ? 2 : q.correct_answer === 'D' ? 3 : 0;
         } else if (blockType === 'short_answer') {
             content.exactAnswer = q.correct_answer || "";
         } else if (blockType === 'true_false_cluster') {
             const stmts = [];
             if (q.option_a) stmts.push({ id: 'a', content: q.option_a, isTrue: q.correct_answer?.charAt(0) === 'D' || q.correct_answer?.charAt(0) === 'T' });
             if (q.option_b) stmts.push({ id: 'b', content: q.option_b, isTrue: q.correct_answer?.charAt(1) === 'D' || q.correct_answer?.charAt(1) === 'T' });
             if (q.option_c) stmts.push({ id: 'c', content: q.option_c, isTrue: q.correct_answer?.charAt(2) === 'D' || q.correct_answer?.charAt(2) === 'T' });
             if (q.option_d) stmts.push({ id: 'd', content: q.option_d, isTrue: q.correct_answer?.charAt(3) === 'D' || q.correct_answer?.charAt(3) === 'T' });
             content.options = stmts.length > 0 ? stmts : [
                 { id: 'a', content: "Mệnh đề A", isTrue: true },
                 { id: 'b', content: "Mệnh đề B", isTrue: false },
             ];
         }

         return {
            id: Math.random().toString(36).substring(7),
            type: 'quiz',
            content
         };
      });

      newBlocks.splice(insertIndex + 1, 0, ...itemsToInsert);
      onChangeBlocks(newBlocks);
  };

  const togglePreview = (id: string) => {
    setPreviewBlocks(prev => {
       const newSet = new Set(prev);
       if (newSet.has(id)) newSet.delete(id);
       else newSet.add(id);
       return newSet;
    });
  };

  const updateBlockContent = (index: number, newContent: any) => {
      const newBlocks = [...blocks];
      newBlocks[index] = { ...newBlocks[index], content: newContent };
      onChangeBlocks(newBlocks);
  };

  const addBlock = (index: number, type: 'md' | 'quiz') => {
      const newBlocks = [...blocks];
      const newBlock: Block = {
          id: Math.random().toString(36).substring(7),
          type,
          content: type === 'md' ? "" : { type: 'multiple_choice', question: "", options: ["A", "B", "C", "D"], answerIndex: 0 }
      };
      newBlocks.splice(index + 1, 0, newBlock);
      onChangeBlocks(newBlocks);
  };

  const moveBlock = (index: number, dir: number) => {
      if (index + dir < 0 || index + dir >= blocks.length) return;
      const newBlocks = [...blocks];
      const temp = newBlocks[index];
      newBlocks[index] = newBlocks[index + dir];
      newBlocks[index + dir] = temp;
      onChangeBlocks(newBlocks);
  };

  const removeBlock = (index: number) => {
      if (!confirm("Xóa khối này?")) return;
      const newBlocks = [...blocks];
      newBlocks.splice(index, 1);
      onChangeBlocks(newBlocks);
  };

  const handleFixLatex = (idx: number) => {
      const block = blocks[idx];
      const fixString = (str: string) => {
          if (!str) return str;
          let s = str.replace(/\\\\/g, '\\');
          s = s.replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$');
          s = s.replace(/\\\(/g, '$').replace(/\\\)/g, '$');
          s = s.replace(/\{\{begincases/g, '\\begin{cases}').replace(/endcases\}\}/g, '\\end{cases}');
          return s;
      };

      if (block.type === 'md') {
          const fixedContent = typeof block.content === 'string' ? fixString(block.content) : block.content;
          updateBlockContent(idx, fixedContent);
      } else if (block.type === 'quiz') {
          const newContent = { ...block.content };
          if (newContent.question) newContent.question = fixString(newContent.question);
          if (newContent.options) {
              newContent.options = newContent.options.map((opt: any) => {
                  if (typeof opt === 'string') return fixString(opt);
                  return { ...opt, content: fixString(opt.content) };
              });
          }
          if (newContent.answer) newContent.answer = fixString(newContent.answer);
          if (newContent.phuong_phap_giai) newContent.phuong_phap_giai = fixString(newContent.phuong_phap_giai);
          if (newContent.cac_buoc_thuc_hien) newContent.cac_buoc_thuc_hien = newContent.cac_buoc_thuc_hien.map((step: string) => fixString(step));
          if (newContent.goi_y_nhanh) newContent.goi_y_nhanh = fixString(newContent.goi_y_nhanh);
          updateBlockContent(idx, newContent);
      }
  };

  const renderQuizContent = (text: string) => {
    const formattedText = text.replace(/^(?:\*\*)?Hướng\s+dẫn\s+giải:?(?:\*\*)?\s*/gim, '### 💡 Hướng dẫn giải chi tiết:\n\n');
    return (
      <div className="prose prose-sm max-w-full break-words prose-p:my-0 leading-relaxed text-inherit overflow-hidden prose-strong:text-[#0e6263]
         prose-h2:text-[1.25rem] prose-h2:font-extrabold prose-h2:text-[#00529b] prose-h2:mt-6 prose-h2:mb-3 prose-h2:bg-[#e6f0fa] prose-h2:px-3 prose-h2:py-2 prose-h2:rounded-xl prose-h2:border-l-4 prose-h2:border-[#00529b]
         prose-h3:text-[1.05rem] prose-h3:font-bold prose-h3:text-[#10b981] prose-h3:mt-5 prose-h3:mb-2 prose-h3:bg-emerald-50 prose-h3:px-3 prose-h3:py-1.5 prose-h3:rounded-lg prose-h3:border-l-4 prose-h3:border-emerald-500
         [&_code]:whitespace-pre-wrap [&_pre]:whitespace-pre-wrap [&_pre]:max-w-full [&_pre]:overflow-x-auto">
        <ReactMarkdown components={customMarkdownComponents} remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>{formattedText}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 h-full overflow-y-auto bg-gray-100">
       {blocks.length === 0 && (
          <div className="text-center py-10"><button onClick={() => addBlock(-1, 'md')} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-teal-700 shadow-sm transition-colors">+ Thêm nội dung đầu tiên</button></div>
       )}

       {blocks.map((block, idx) => (
          <div key={block.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden shrink-0 transition-all">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-2 font-bold text-gray-700 text-[15px]">
                     {block.type === 'md' ? <><Type className="w-4 h-4 text-indigo-500"/> Khối Lý Thuyết / Văn Bản</> : <><ListTodo className="w-4 h-4 text-teal-500"/> Khối Trắc Nghiệm Tương Tác</>}
                  </div>
                  <div className="flex gap-1.5">
                      <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 disabled:opacity-30"><ArrowUp className="w-4 h-4"/></button>
                      <button onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 disabled:opacity-30"><ArrowDown className="w-4 h-4"/></button>
                      <button onClick={() => toggleCollapse(block.id)} className={`p-1.5 hover:bg-gray-200 rounded-md transition-colors ${collapsedBlocks.has(block.id) ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500'}`} title={collapsedBlocks.has(block.id) ? "Mở rộng khối này" : "Thu gọn khối này"}>
                         {collapsedBlocks.has(block.id) ? <ChevronDown className="w-4 h-4"/> : <ChevronUp className="w-4 h-4"/>}
                      </button>
                      <div className="w-px h-4 bg-gray-300 mx-1 self-center"></div>
                      <button onClick={() => handleFixLatex(idx)} className="flex items-center gap-1.5 px-2 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-md text-[11px] font-bold transition-colors" title="Sửa nhanh các lỗi LaTeX (như dấu \\, dấu $$, v.v.)">🪄 Sửa lỗi LaTeX</button>
                      <button onClick={() => togglePreview(block.id)} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-bold transition-colors ${previewBlocks.has(block.id) ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'}`} title="Bật/Tắt Xem trước kết quả hiển thị"><MonitorPlay className="w-3.5 h-3.5"/> Xem Trước</button>
                      <button onClick={() => onTriggerCrop(globalSourceImage ? { originalUrl: globalSourceImage } : {}, block.id)} className="flex items-center gap-1.5 px-2 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded-md text-[11px] font-bold transition-colors" title="Chèn thêm ảnh vào khối này"><CropIcon className="w-3.5 h-3.5"/> Chèn Thêm Ảnh</button>
                      <button onClick={() => removeBlock(idx)} className="p-1.5 hover:bg-red-100 rounded-md text-red-500 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
              </div>

              {!collapsedBlocks.has(block.id) && (
              <div className="p-5 animate-in fade-in slide-in-from-top-1 duration-200">
                 {block.type === 'md' && (
                    <div className="flex flex-col gap-4">
                       {/* CẢNH BÁO CHO KHỐI LÝ THUYẾT */}
                       {(typeof block.content === 'string') && (() => {
                          const placeholderRegex = /\[IMAGE_PLACEHOLDER\]|\[.*?CHÚ Ý.*?\]|\[.*?HÌNH VẼ.*?\]/i;
                          const hasPlaceholder = placeholderRegex.test(block.content);
                          const bboxMatch = block.content.match(/\{\s*"image_bbox"\s*:\s*\[([\d,\s]+)\]\s*\}/);
                          if (!hasPlaceholder && !bboxMatch) return null;
                          
                          let bboxMeta = {};
                          if (bboxMatch) {
                              const coords = bboxMatch[1].split(',').map(n => parseInt(n.trim()));
                              if (coords.length === 4) {
                                  const [xmin, ymin, xmax, ymax] = coords;
                                  bboxMeta = { crop: { x: xmin, y: ymin, width: xmax - xmin, height: ymax - ymin, unit: 'px' } };
                              }
                          }
                          
                          return (
                            <div className={`border px-5 py-4 rounded-xl flex flex-col md:flex-row gap-5 items-start ${globalSourceImage ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200 animate-pulse'}`}>
                               <div className="flex-1">
                                  <h4 className={`font-bold flex items-center gap-2 mb-2 ${globalSourceImage ? 'text-orange-800' : 'text-red-700'}`}>
                                     {globalSourceImage ? <ImageIcon className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>} 
                                     {globalSourceImage ? "AI phát hiện có ảnh cần cắt!" : "Cảnh báo: Có vị trí cần chèn ảnh thủ công!"}
                                  </h4>
                                  <p className={`text-[14px] mb-4 leading-relaxed ${globalSourceImage ? 'text-orange-700' : 'text-red-600'}`}>
                                     {globalSourceImage ? "Hệ thống đã nhận diện khu vực ảnh từ dữ liệu gốc. Hãy dùng nút bên dưới để cắt phần ảnh chính xác." : "Hãy ấn nút bên dưới để tải file ảnh lên và cắt vào vị trí này."}
                                  </p>
                                  <button onClick={() => onTriggerCrop(globalSourceImage ? { originalUrl: globalSourceImage, ...bboxMeta } : bboxMeta, block.id)} className={`${globalSourceImage ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'} text-white px-4 py-2.5 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2 text-sm`}><CropIcon className="w-4 h-4"/> {globalSourceImage ? 'Cắt từ Ảnh Nguồn' : 'Cắt & Chèn Ảnh Mới'}</button>
                               </div>
                               {globalSourceImage && (
                                 <div className="w-full md:w-72 bg-white border border-orange-100 rounded-xl p-1.5 shadow-sm shrink-0 relative overflow-hidden">
                                    <img src={globalSourceImage} alt="Source" className="w-full max-h-48 object-contain rounded-lg opacity-60" />
                                    {bboxMatch && <div className="absolute inset-0 flex items-center justify-center font-bold text-orange-900 drop-shadow-md text-sm"><CropIcon className="w-6 h-6 mr-1"/> Đã xác định toạ độ</div>}
                                 </div>
                               )}
                            </div>
                          );
                       })()}

                       <textarea 
                           value={block.content} 
                           onChange={e => updateBlockContent(idx, e.target.value)} 
                           className="w-full h-40 p-4 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-mono text-[15px] transition-all"
                           placeholder="Nhập Markdown / LaTeX..."
                       />
                       
                       {(() => {
                           const hasMarkdownTable = typeof block.content === 'string' && /\|.*\|.*\n\s*\|[-\s:]+\|/.test(block.content);
                           if (!hasMarkdownTable) return null;
                           return (
                             <div className="mt-2 border px-5 py-4 rounded-xl flex flex-col md:flex-row gap-5 items-start bg-yellow-50 border-yellow-300 shadow-sm animate-in slide-in-from-top-2">
                               <div className="flex-1">
                                  <h4 className="font-bold flex items-center gap-2 mb-2 text-yellow-900">
                                     <AlertTriangle className="w-5 h-5 text-yellow-600"/> 
                                     Phát hiện có Bảng Markdown / Bảng Biến Thiên!
                                  </h4>
                                  <p className="text-[14px] mb-4 leading-relaxed text-yellow-800 font-medium">
                                     Bảng văn bản (như Bảng xét dấu, Bảng biến thiên) thường sẽ hiển thị không đẹp và bị lệch mũi tên trên Mobile. 
                                     Bạn nên <strong>xoá đoạn mã bảng này</strong> và sử dụng chức năng <strong>Chèn Hình Ảnh</strong> để thay thế.
                                  </p>
                                  <button 
                                     onClick={() => onTriggerCrop(globalSourceImage ? { originalUrl: globalSourceImage } : {}, block.id)} 
                                     className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2 text-sm"
                                  >
                                     <ImageIcon className="w-4 h-4"/> Chèn Ảnh Bảng Thay Thế
                                  </button>
                               </div>
                             </div>
                           );
                       })()}

                       {/* Đã loại bỏ Mobile View cũ */}
                    </div>
                 )}

                 {block.type === 'quiz' && (
                    <div className="flex flex-col gap-5">
                       {/* Cảnh báo hình ảnh & Smart Cropper tự động */}
                       {block.content.autoCropMetadata ? (
                          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 flex flex-col md:flex-row gap-5 items-start">
                             <div className="flex-1">
                                <h4 className="text-orange-800 font-bold flex items-center gap-2 mb-2"><ImageIcon className="w-5 h-5"/> Ảnh Gốc Đính Kèm</h4>
                                <p className="text-[14px] text-orange-700 mb-4 leading-relaxed">AI đã phát hiện và cắt ảnh từ tài liệu gốc. Bạn có thể sử dụng công cụ Cắt lại nếu AI cắt chưa chuẩn xác.</p>
                                <button onClick={() => onTriggerCrop(block.content.autoCropMetadata, block.id)} className="bg-orange-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-orange-700 shadow-sm transition-colors flex items-center gap-2 text-sm"><CropIcon className="w-4 h-4"/> Cắt lại Ảnh Này</button>
                             </div>
                             <div className="w-full md:w-72 bg-white border border-orange-100 rounded-xl p-1.5 shadow-sm shrink-0">
                                <img src={block.content.autoCropMetadata.originalUrl} alt="Source" className="w-full max-h-48 object-contain rounded-lg" />
                             </div>
                          </div>
                       ) : (/(?:\[IMAGE_PLACEHOLDER\]|\[.*?CHÚ Ý.*?\]|\[.*?HÌNH VẼ.*?\])/i.test(block.content.question || '')) && (
                          <div className="bg-red-50 border border-red-200 px-5 py-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
                             <div className="flex items-center gap-3 text-red-700">
                                <AlertTriangle className="w-6 h-6 shrink-0" />
                                <span className="text-[15px] font-bold">Cảnh báo: Phát hiện yêu cầu chèn ảnh từ AI. Hãy dùng nút bên phải để chèn!</span>
                             </div>
                             <button onClick={() => onTriggerCrop(globalSourceImage ? { originalUrl: globalSourceImage } : {}, block.id)} className="bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-red-700 shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0"><CropIcon className="w-4 h-4" /> Cắt & Chèn Ảnh Mới</button>
                          </div>
                       )}

                       <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                          <label className="font-bold text-teal-800 text-[15px]">Nội dung câu hỏi</label>
                          <select 
                             value={block.content.type || 'multiple_choice'} 
                             onChange={e => {
                               const newType = e.target.value;
                               let newContent = { ...block.content, type: newType };
                               // Nếu chuyển sang true_false_cluster mà options chưa đúng cấu trúc object
                               if (newType === 'true_false_cluster' && (!block.content.options || typeof block.content.options[0] === 'string')) {
                                  newContent.options = [
                                     { id: 'a', content: '', isTrue: true },
                                     { id: 'b', content: '', isTrue: false },
                                     { id: 'c', content: '', isTrue: true },
                                     { id: 'd', content: '', isTrue: false },
                                  ];
                               }
                               updateBlockContent(idx, newContent);
                             }} 
                             className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-teal-500/20"
                          >
                             <option value="multiple_choice">Trắc nghiệm 4 lựa chọn</option>
                             <option value="true_false_cluster">Đúng/Sai 4 Ý (Barem 2025)</option>
                             <option value="true_false">Đúng / Sai (Truyền thống)</option>
                             <option value="short_answer">Trả lời ngắn / Điền khuyết</option>
                             <option value="essay">Tự luận / Trình bày chi tiết</option>
                          </select>
                       </div>
                       
                       <textarea rows={3} value={block.content.question || ""} onChange={e => updateBlockContent(idx, { ...block.content, question: e.target.value })} className="w-full border border-gray-200 rounded-xl p-4 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 font-mono text-[15px] transition-all" placeholder="Nhập câu hỏi... (Markdown hỗ trợ)" />

                       {(block.content.type === 'multiple_choice' || !block.content.type) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             {[0,1,2,3].map(optIdx => (
                               <div key={optIdx} className="flex flex-col gap-1">
                                  <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                     <input type="radio" name={`q_${block.id}`} checked={block.content.answerIndex === optIdx} onChange={() => updateBlockContent(idx, { ...block.content, answerIndex: optIdx })} className="text-teal-600" />
                                     Đáp án {['A','B','C','D'][optIdx]}
                                  </label>
                                  <textarea rows={2} value={block.content.options?.[optIdx] || ""} onChange={e => {
                                     const newOpts = [...(block.content.options || ["","","",""])];
                                     newOpts[optIdx] = e.target.value;
                                     updateBlockContent(idx, { ...block.content, options: newOpts });
                                  }} className="border rounded p-2 text-sm outline-none focus:border-teal-500" />
                               </div>
                             ))}
                          </div>
                       )}

                       {block.content.type === 'true_false' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             {[0,1].map(optIdx => (
                               <div key={optIdx} className="flex flex-col gap-1">
                                  <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                     <input type="radio" name={`q_${block.id}`} checked={block.content.answerIndex === optIdx} onChange={() => updateBlockContent(idx, { ...block.content, answerIndex: optIdx })} className="text-teal-600" />
                                     Đáp án {['Đúng','Sai'][optIdx]}
                                  </label>
                                  <textarea rows={2} value={block.content.options?.[optIdx] || ""} onChange={e => {
                                     const newOpts = [...(block.content.options || ["",""])];
                                     newOpts[optIdx] = e.target.value;
                                     updateBlockContent(idx, { ...block.content, options: newOpts });
                                  }} className="border rounded p-2 text-sm outline-none focus:border-teal-500" />
                               </div>
                             ))}
                          </div>
                       )}

                       {block.content.type === 'true_false_cluster' && (
                          <div className="flex flex-col gap-4 mt-2">
                             <div className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-2 rounded-lg border border-teal-100">
                                Cấu trúc Barem 2025: Một câu hỏi chung và 4 mệnh đề (A, B, C, D). Học sinh chọn Đ/S cho từng mệnh đề độc lập. Điểm được tính theo bậc (0.1đ, 0.25đ, 0.5đ, 1.0đ).
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                               {(block.content.options || []).map((opt: any, optIdx: number) => (
                                  <div key={optIdx} className="flex flex-col gap-2 p-3 border border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                     <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-700 text-sm">Mệnh đề {opt.id?.toUpperCase() || ['A','B','C','D'][optIdx]}</span>
                                        <button 
                                           onClick={() => {
                                              const newOpts = [...block.content.options];
                                              newOpts[optIdx] = { ...opt, isTrue: !opt.isTrue };
                                              updateBlockContent(idx, { ...block.content, options: newOpts });
                                           }}
                                           className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${opt.isTrue ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200' : 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'}`}
                                        >
                                           {opt.isTrue ? '✓ Mệnh đề Đúng' : '✕ Mệnh đề Sai'}
                                        </button>
                                     </div>
                                     <textarea 
                                        rows={2} 
                                        value={opt.content || ""} 
                                        onChange={e => {
                                           const newOpts = [...block.content.options];
                                           newOpts[optIdx] = { ...opt, content: e.target.value };
                                           updateBlockContent(idx, { ...block.content, options: newOpts });
                                        }} 
                                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all" 
                                        placeholder="Nhập nội dung mệnh đề..."
                                     />
                                  </div>
                               ))}
                             </div>
                          </div>
                       )}

                       {block.content.type === 'short_answer' && (
                          <div>
                             <label className="text-xs font-bold text-gray-600 mb-1 block">Đáp án đúng chính xác (Text/Số)</label>
                             <input type="text" value={block.content.exactAnswer || ""} onChange={e => updateBlockContent(idx, { ...block.content, exactAnswer: e.target.value })} className="w-full border p-2 rounded outline-none focus:border-teal-500 font-bold" />
                          </div>
                       )}

                       {block.content.type === 'essay' && (
                          <div>
                             <label className="text-xs font-bold text-gray-600 mb-1 block">Hướng dẫn giải / Đáp án mẫu</label>
                             <textarea rows={4} value={block.content.sampleAnswer || ""} onChange={e => updateBlockContent(idx, { ...block.content, sampleAnswer: e.target.value })} className="w-full border p-2 rounded outline-none focus:border-teal-500" />
                          </div>
                       )}
                    </div>
                 )}

                  {previewBlocks.has(block.id) && (
                     <div className="mt-5 pt-5 border-t-2 border-indigo-100 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-3">
                           <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                              <MonitorPlay className="w-3 h-3" /> KẾT QUẢ XEM TRƯỚC:
                           </div>
                           <button onMouseDown={(e) => {
                               e.preventDefault(); // Tránh làm mất focus của ô nhập liệu
                               const isFixedBySelection = applyLatexFixToActiveElement();
                               if (!isFixedBySelection) {
                                  // Nếu không có vùng bôi đen nào, áp dụng cho toàn bộ khối
                                  try {
                                     let fixed = block.type === 'md' ? block.content : JSON.stringify(block.content);
                                     fixed = fixLatexText(fixed);
                                     if (block.type === 'md') updateBlockContent(idx, fixed);
                                     else updateBlockContent(idx, JSON.parse(fixed));
                                  } catch(err) { console.error(err) }
                               }
                           }} className="flex items-center gap-1.5 text-xs font-bold bg-purple-50 text-purple-700 px-3 py-1.5 rounded-md hover:bg-purple-100 transition-colors border border-purple-200 shadow-sm">
                              🪄 Sửa lỗi LaTeX ngay
                           </button>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-indigo-50/50">
                           {block.type === 'md' ? renderQuizContent(block.content) : (
                              <div className="flex flex-col gap-4">
                                 {renderQuizContent(block.content.question || "*(Chưa có câu hỏi)*")}
                                 {(block.content.type === 'multiple_choice' || !block.content.type) && (
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                       {[0,1,2,3].map(optIdx => (
                                          <div key={optIdx} className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex gap-2">
                                             <span className="font-bold text-indigo-600">{['A.','B.','C.','D.'][optIdx]}</span>
                                             <div className="flex-1">{renderQuizContent(block.content.options?.[optIdx] || "")}</div>
                                          </div>
                                       ))}
                                    </div>
                                 )}
                                 {block.content.type === 'true_false_cluster' && (
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                       {(block.content.options || []).map((opt: any, optIdx: number) => (
                                          <div key={optIdx} className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col gap-2">
                                             <span className="font-bold text-indigo-600 text-sm">Mệnh đề {opt.id?.toUpperCase() || ['A','B','C','D'][optIdx]}:</span>
                                             <div className="flex-1 text-sm">{renderQuizContent(opt.content || "")}</div>
                                             <div className="mt-1 pt-2 border-t border-gray-200">
                                                {opt.isTrue ? <span className="text-xs font-bold text-green-600">✓ Đáp án: ĐÚNG</span> : <span className="text-xs font-bold text-red-500">✕ Đáp án: SAI</span>}
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </div>
                           )}
                        </div>
                     </div>
                  )}
               </div>
              )}
              
              <div className="bg-gray-50 border-t border-gray-100 p-2 flex justify-center gap-3 flex-wrap">
                 <button onClick={() => addBlock(idx, 'md')} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-md"><PlusCircle className="w-3.5 h-3.5"/> Thêm Khối Lý thuyết xuống dưới</button>
                 <button onClick={() => addBlock(idx, 'quiz')} className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-800 bg-teal-50 px-3 py-1.5 rounded-md"><PlusCircle className="w-3.5 h-3.5"/> Thêm Khối Trắc nghiệm xuống dưới</button>
                 <button onClick={() => { setInsertIndex(idx); setIsBankModalOpen(true); }} className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-800 bg-orange-50 px-3 py-1.5 rounded-md border border-orange-100 shadow-sm"><Database className="w-3.5 h-3.5"/> Rút từ Ngân hàng</button>
              </div>
           </div>
        ))}

        <QuestionBankModal 
           isOpen={isBankModalOpen} 
           onClose={() => setIsBankModalOpen(false)} 
           onInsert={handleInsertFromBank} 
           usedQuestionIds={blocks.map(b => b.type === 'quiz' && b.content.sourceQuestionId).filter(Boolean) as string[]}
        />
     </div>
   );
 }
