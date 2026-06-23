"use client";

import React from "react";
import { AlertTriangle, CropIcon, PlusCircle, Trash2, ArrowUp, ArrowDown, ListTodo, Type, Image as ImageIcon, MonitorPlay } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';

export interface Block {
  id: string;
  type: 'md' | 'quiz';
  content: any;
}

export default function BlockEditor({ blocks, onChangeBlocks, onTriggerCrop, globalSourceImage }: { blocks: Block[], onChangeBlocks: (b: Block[]) => void, onTriggerCrop: (meta: any, targetBlockId: string) => void, globalSourceImage?: string }) {

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
        <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>{formattedText}</ReactMarkdown>
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
                      <div className="w-px h-4 bg-gray-300 mx-1 self-center"></div>
                      <button onClick={() => handleFixLatex(idx)} className="flex items-center gap-1.5 px-2 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-md text-[11px] font-bold transition-colors" title="Sửa nhanh các lỗi LaTeX (như dấu \\, dấu $$, v.v.)">🪄 Sửa lỗi LaTeX</button>
                      <button onClick={() => onTriggerCrop(globalSourceImage ? { originalUrl: globalSourceImage } : {}, block.id)} className="flex items-center gap-1.5 px-2 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded-md text-[11px] font-bold transition-colors" title="Chèn thêm ảnh vào khối này"><CropIcon className="w-3.5 h-3.5"/> Chèn Thêm Ảnh</button>
                      <button onClick={() => removeBlock(idx)} className="p-1.5 hover:bg-red-100 rounded-md text-red-500 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
              </div>

              <div className="p-5">
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
                       <div className="mt-6 flex flex-col items-center bg-slate-50/50 border border-slate-200 rounded-2xl p-6">
  <div className="text-xs font-bold text-indigo-500 mb-5 uppercase tracking-widest flex items-center gap-2">
     <MonitorPlay className="w-4 h-4" /> Giao diện xem trước (Mobile)
  </div>
  <div className="relative w-[320px] h-[580px] bg-white rounded-[2.5rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden flex flex-col shrink-0 ring-1 ring-black/5">
     {/* iPhone Notch */}
     <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-2xl w-32 mx-auto z-10 flex justify-center items-end pb-1">
        <div className="w-12 h-1.5 bg-black/20 rounded-full"></div>
     </div>
     {/* Mobile Status Bar */}
     <div className="h-6 w-full bg-white flex justify-between items-center px-5 pt-1 text-[10px] font-bold text-slate-800 shrink-0 z-0 relative">
        <span>9:41</span>
        <div className="flex items-center gap-1">
           <div className="w-3 h-2.5 bg-slate-800 rounded-sm"></div>
           <div className="w-3 h-2.5 bg-slate-800 rounded-full"></div>
           <div className="w-4 h-2.5 border border-slate-800 rounded-sm relative"><div className="absolute inset-y-[1px] left-[1px] right-[2px] bg-slate-800 rounded-[1px]"></div></div>
        </div>
     </div>
     {/* App Header */}
     <div className="h-12 bg-white border-b border-gray-100 flex items-center px-4 shrink-0 shadow-sm relative z-0">
        <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><MonitorPlay className="w-3 h-3" /></div>
        <span className="ml-3 font-bold text-gray-800 text-sm truncate">Học Sinh View</span>
     </div>
     {/* Screen Content */}
     <div className="flex-1 overflow-y-auto p-5 bg-gray-50/80 scroll-smooth no-scrollbar">
        <div className="break-words overflow-x-hidden prose prose-sm max-w-none prose-indigo bg-white p-4 rounded-xl shadow-sm border border-gray-100">
           {renderQuizContent(block.content)}
        </div>
     </div>
     {/* Home Indicator */}
     <div className="h-1 w-24 bg-slate-300 rounded-full mx-auto absolute bottom-2 inset-x-0"></div>
  </div>
</div>
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
              </div>
              
              <div className="bg-gray-50 border-t border-gray-100 p-2 flex justify-center gap-3">
                 <button onClick={() => addBlock(idx, 'md')} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-md"><PlusCircle className="w-3.5 h-3.5"/> Thêm Khối Lý thuyết xuống dưới</button>
                 <button onClick={() => addBlock(idx, 'quiz')} className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-800 bg-teal-50 px-3 py-1.5 rounded-md"><PlusCircle className="w-3.5 h-3.5"/> Thêm Khối Trắc nghiệm xuống dưới</button>
              </div>
          </div>
       ))}
    </div>
  );
}
