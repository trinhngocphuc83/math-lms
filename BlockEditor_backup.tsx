"use client";

import React from "react";
import { AlertTriangle, CropIcon, PlusCircle, Trash2, ArrowUp, ArrowDown, ListTodo, Type, Image as ImageIcon, MonitorPlay, Database, ChevronUp, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import { fixLatexText, applyLatexFixToActiveElement } from "@/utils/latexFixer";
import 'katex/dist/katex.min.css';
import QuestionBankModal from "@/components/admin/QuestionBankModal";
import RichTextarea from "@/components/admin/RichTextarea";

export interface Block {
  id: string;
  type: 'md' | 'quiz';
  content: any;
}

import { unifiedMarkdownComponents as customMarkdownComponents } from "@/components/CustomMarkdownComponents";

export default function BlockEditor({ blocks, onChangeBlocks, onTriggerCrop, globalSourceImage, globalTriggerBankModal }: { blocks: Block[], onChangeBlocks: (b: Block[]) => void, onTriggerCrop: (meta: any, targetBlockId: string) => void, globalSourceImage?: string, globalTriggerBankModal?: number }) {

  const [previewBlocks, setPreviewBlocks] = React.useState<Set<string>>(new Set());
  const [collapsedBlocks, setCollapsedBlocks] = React.useState<Set<string>>(new Set());
  const [focusMode, setFocusMode] = React.useState(true);
  const [isBankModalOpen, setIsBankModalOpen] = React.useState(false);
  const [insertIndex, setInsertIndex] = React.useState(-1);
  const [selectedBlocks, setSelectedBlocks] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
     if (globalTriggerBankModal && globalTriggerBankModal > 0) {
        setInsertIndex(blocks.length - 1);
        setIsBankModalOpen(true);
     }
  }, [globalTriggerBankModal]);

  React.useEffect(() => {
     if (!focusMode) {
        setCollapsedBlocks(new Set());
     }
  }, [focusMode]);

  const handleFocusBlock = (id: string) => {
      if (!focusMode) return;
      setCollapsedBlocks(prev => {
          if (!prev.has(id) && prev.size === blocks.length - 1) return prev;
          const newSet = new Set<string>();
          blocks.forEach(b => {
              if (b.id !== id) newSet.add(b.id);
          });
          return newSet;
      });
  };

  const toggleCollapse = (id: string) => {
      setCollapsedBlocks(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
      });
  };

  const handleInsertFromBank = (questions: any[]) => {
      const newBlocks = [...blocks];
      const itemsToInsert: Block[] = questions.map(q => {
         let blockType = 'multiple_choice';
         if (q.question_type === 'TL') blockType = 'essay';
         else if (q.question_type === 'TLN') blockType = 'short_answer';
         else if (q.question_type === 'DS') blockType = 'true_false_cluster';

         let questionContent = q.content || "";
         if (q.image_url) {
             const placeholderRegex = /(?:\[IMAGE_PLACEHOLDER\]|\[.*?CH├Ü ├¥.*?\]|\[.*?H├îNH Vß║╝.*?\]|\[.*?Bß║óNG BIß║╛N THI├èN.*?\])/i;
             if (placeholderRegex.test(questionContent)) {
                 questionContent = questionContent.replace(new RegExp(placeholderRegex, 'ig'), `\n\n![H├¼nh vß║╜](${q.image_url})\n\n`);
             } else {
                 questionContent += `\n\n![H├¼nh vß║╜](${q.image_url})\n\n`;
             }
         }

         const content: any = {
             type: blockType,
             question: questionContent,
             sampleAnswer: q.explanation || "",
             sourceQuestionId: q.id // L╞░u ID ─æß╗â ─æß║┐m sß╗æ lß║ºn sß╗¡ dß╗Ñng
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
             
             // Nß║┐u c├óu hß╗Åi trong ng├ón h├áng bß╗ï lß╗ùi chß╗ë l╞░u 1-3 ├╜, tß╗▒ ─æß╗Öng b├╣ ─æß╗º 4 ├╜
             if (stmts.length > 0 && stmts.length < 4) {
                 const defaultIds = ['a', 'b', 'c', 'd'];
                 for (let i = stmts.length; i < 4; i++) {
                     stmts.push({ id: defaultIds[i], content: `Ph├ít biß╗âu ${defaultIds[i]}`, isTrue: false });
                 }
             }
             content.options = stmts.length > 0 ? stmts : [
                 { id: 'a', content: "Mß╗çnh ─æß╗ü A", isTrue: true },
                 { id: 'b', content: "Mß╗çnh ─æß╗ü B", isTrue: false },
                 { id: 'c', content: "Mß╗çnh ─æß╗ü C", isTrue: true },
                 { id: 'd', content: "Mß╗çnh ─æß╗ü D", isTrue: false },
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
      if (!confirm("X├│a khß╗æi n├áy?")) return;
      const newBlocks = [...blocks];
      newBlocks.splice(index, 1);
      onChangeBlocks(newBlocks);
  };

  const handleFixLatex = (idx: number) => {
      const block = blocks[idx];
      const fixString = (str: string) => {
          if (!str) return str;
          let s = str;
                    // Fix control characters caused by missing escape in JSON (e.g. \f becomes form feed)
          s = s.replace(/\x0Crac/g, '\\frac');
          s = s.replace(/\x0Bec/g, '\\vec');
          s = s.replace(/\x0Aeq/g, '\\neq');
          s = s.replace(/\x08eta/g, '\\beta');
          s = s.replace(/\x08egin/g, '\\begin');
          s = s.replace(/\x09an/g, '\\tan');
          s = s.replace(/\x09heta/g, '\\theta');
          s = s.replace(/\x0Dightarrow/g, '\\rightarrow');
          s = s.replace(/\x0Dight/g, '\\right');

          // Fix JSON escaping for common LaTeX commands (e.g. \\vec -> \vec)
          s = s.replace(/\\\\(vec|frac|Rightarrow|rightarrow|leftrightarrow|Leftrightarrow|lim|log|sin|cos|tan|cot|sqrt|Delta|alpha|beta|gamma|pi|Omega|Sigma|sum|int|infty|to|text|begin|end|cases|le|ge|neq|pm|mp|cup|cap|subset|supset|in|notin|emptyset|mathbb|mathcal|mathbf|mathrm|widehat)/g, '\\$1');
          
          s = s.replace(/\\\[/g, '$$$$').replace(/\\\]/g, '$$$$');
          s = s.replace(/\\\(/g, '$').replace(/\\\)/g, '$');
          
          s = s.replace(/\{\{begincases/g, '\\begin{cases}').replace(/endcases\}\}/g, '\\end{cases}');
          s = s.replace(/(?<!\\)begincases/g, '\\begin{cases}').replace(/(?<!\\)endcases/g, '\\end{cases}');
          
          s = s.replace(/\\\\\\\\/g, '\\\\');
          s = s.replace(/\\prime/g, "'");
          s = s.replace(/(?<!\\)rightarrow/g, "\\rightarrow");
          s = s.replace(/textAl/g, "\\text{Al}");
          s = s.replace(/textO/g, "\\text{O}");
          s = s.replace(/(?<!\$)\\begin\{cases\}/g, '$\\begin{cases}');
          s = s.replace(/\\end\{cases\}(?!\$)/g, '\\end{cases}$');
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
    const formattedText = text.replace(/\\n/g, '\n').replace(/^(?:\*\*)?H╞░ß╗¢ng\s+dß║½n\s+giß║úi:?(?:\*\*)?\s*/gim, '### ≡ƒÆí H╞░ß╗¢ng dß║½n giß║úi chi tiß║┐t:\n\n');
    return (
      <div className="prose prose-sm max-w-full break-words prose-p:my-0 leading-relaxed text-inherit overflow-hidden prose-strong:text-[#0e6263]
         prose-h2:text-[1.25rem] prose-h2:font-extrabold prose-h2:text-[#00529b] prose-h2:mt-6 prose-h2:mb-3 prose-h2:bg-[#e6f0fa] prose-h2:px-3 prose-h2:py-2 prose-h2:rounded-xl prose-h2:border-l-4 prose-h2:border-[#00529b] prose-h2:block prose-h2:w-fit prose-h2:clear-both
         prose-h3:text-[1.05rem] prose-h3:font-bold prose-h3:text-[#10b981] prose-h3:mt-5 prose-h3:mb-2 prose-h3:bg-emerald-50 prose-h3:px-3 prose-h3:py-1.5 prose-h3:rounded-lg prose-h3:border-l-4 prose-h3:border-emerald-500 prose-h3:block prose-h3:w-fit prose-h3:clear-both
         [&_code]:whitespace-pre-wrap [&_pre]:whitespace-pre-wrap [&_pre]:max-w-full [&_pre]:overflow-x-auto">
        <ReactMarkdown components={customMarkdownComponents} remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{formattedText}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 h-full overflow-y-auto bg-gray-100">
       <div className="flex items-center justify-between mb-[-0.5rem] flex-wrap gap-3">
         <label className="flex items-center gap-2 text-[15px] font-bold text-indigo-700 cursor-pointer bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 w-max shadow-sm transition-colors hover:bg-indigo-100">
            <input type="checkbox" checked={focusMode} onChange={e => setFocusMode(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
            ≡ƒÄ» Chß║┐ ─æß╗Ö Tß║¡p trung (Tß╗▒ ─æß╗Öng thu gß╗ìn c├íc khß╗æi kh├íc khi l├ám viß╗çc)
         </label>

         {selectedBlocks.size > 0 && (
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2">
               <span className="text-sm font-bold text-gray-600 mr-2">─É├ú chß╗ìn {selectedBlocks.size} khß╗æi:</span>
               <select 
                  onChange={(e) => {
                     const newType = e.target.value;
                     if (!newType) return;
                     const newBlocks = blocks.map(b => {
                        if (selectedBlocks.has(b.id) && b.type === 'quiz') {
                           let newContent = { ...b.content, type: newType };
                           if (newType === 'true_false_cluster' && (!b.content.options || typeof b.content.options[0] === 'string')) {
                              newContent.options = [
                                 { id: 'a', content: '', isTrue: true },
                                 { id: 'b', content: '', isTrue: false },
                                 { id: 'c', content: '', isTrue: true },
                                 { id: 'd', content: '', isTrue: false },
                              ];
                           }
                           return { ...b, content: newContent };
                        }
                        return b;
                     });
                     onChangeBlocks(newBlocks);
                     e.target.value = ""; // reset
                  }}
                  className="border border-indigo-200 rounded-md px-3 py-1.5 text-sm bg-indigo-50 font-bold text-indigo-700 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500/30"
               >
                  <option value="">-- ─Éß╗òi dß║íng c├óu hß╗Åi --</option>
                  <option value="multiple_choice">Trß║»c nghiß╗çm 4 lß╗▒a chß╗ìn</option>
                  <option value="true_false_cluster">─É├║ng/Sai 4 ├¥ (Barem 2025)</option>
                  <option value="short_answer">Trß║ú lß╗¥i ngß║»n / ─Éiß╗ün khuyß║┐t</option>
                  <option value="essay">Tß╗▒ luß║¡n / Tr├¼nh b├áy chi tiß║┐t</option>
               </select>
               <button onClick={() => setSelectedBlocks(new Set())} className="ml-2 text-xs font-bold text-gray-400 hover:text-gray-600 underline">Bß╗Å chß╗ìn</button>
            </div>
         )}
       </div>

       {blocks.length === 0 && (
          <div className="text-center py-10 flex flex-col items-center gap-4">
             <button onClick={() => addBlock(-1, 'md')} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-teal-700 shadow-sm transition-colors">+ Th├¬m nß╗Öi dung ─æß║ºu ti├¬n (Hoß║╖c ß║Ñn Ctrl+V d├ín ß║únh)</button>
             <button onClick={() => { setInsertIndex(-1); setIsBankModalOpen(true); }} className="flex items-center gap-2 font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-lg border border-orange-200 transition-colors shadow-sm"><Database className="w-4 h-4"/> Hoß║╖c R├║t ─Éß╗ü tß╗½ Ng├ón h├áng</button>
          </div>
       )}

       {blocks.map((block, idx) => (
          <div key={block.id} onClickCapture={() => handleFocusBlock(block.id)} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible shrink-0 transition-all relative">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center rounded-t-xl z-20 relative">
                  <div className="flex items-center gap-2 font-bold text-gray-700 text-[15px]">
                     <input 
                        type="checkbox" 
                        checked={selectedBlocks.has(block.id)}
                        onChange={(e) => {
                           const newSet = new Set(selectedBlocks);
                           if (e.target.checked) newSet.add(block.id);
                           else newSet.delete(block.id);
                           setSelectedBlocks(newSet);
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2 cursor-pointer"
                        onClick={e => e.stopPropagation()}
                     />
                     {block.type === 'md' ? <><Type className="w-4 h-4 text-indigo-500"/> Khß╗æi L├╜ Thuyß║┐t / V─ân Bß║ún</> : <><ListTodo className="w-4 h-4 text-teal-500"/> Khß╗æi Trß║»c Nghiß╗çm T╞░╞íng T├íc</>}
                  </div>
                  <div className="flex gap-1.5">
                      <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 disabled:opacity-30"><ArrowUp className="w-4 h-4"/></button>
                      <button onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 disabled:opacity-30"><ArrowDown className="w-4 h-4"/></button>
                      <button onClick={() => toggleCollapse(block.id)} className={`p-1.5 hover:bg-gray-200 rounded-md transition-colors ${collapsedBlocks.has(block.id) ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500'}`} title={collapsedBlocks.has(block.id) ? "Mß╗ƒ rß╗Öng khß╗æi n├áy" : "Thu gß╗ìn khß╗æi n├áy"}>
                         {collapsedBlocks.has(block.id) ? <ChevronDown className="w-4 h-4"/> : <ChevronUp className="w-4 h-4"/>}
                      </button>
                      <div className="w-px h-4 bg-gray-300 mx-1 self-center"></div>
                      <button onClick={() => handleFixLatex(idx)} className="flex items-center gap-1.5 px-2 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-md text-[11px] font-bold transition-colors" title="Sß╗¡a nhanh c├íc lß╗ùi LaTeX (nh╞░ dß║Ñu \\, dß║Ñu $$, v.v.)">≡ƒ¬ä Sß╗¡a lß╗ùi LaTeX</button>
                      <button onClick={() => togglePreview(block.id)} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-bold transition-colors ${previewBlocks.has(block.id) ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'}`} title="Bß║¡t/Tß║»t Xem tr╞░ß╗¢c kß║┐t quß║ú hiß╗ân thß╗ï"><MonitorPlay className="w-3.5 h-3.5"/> Xem Tr╞░ß╗¢c</button>
                      <button onClick={() => onTriggerCrop(globalSourceImage ? { originalUrl: globalSourceImage } : {}, block.id)} className="flex items-center gap-1.5 px-2 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded-md text-[11px] font-bold transition-colors" title="Ch├¿n th├¬m ß║únh v├áo khß╗æi n├áy"><CropIcon className="w-3.5 h-3.5"/> Ch├¿n Th├¬m ß║ónh</button>
                      <button onClick={() => removeBlock(idx)} className="p-1.5 hover:bg-red-100 rounded-md text-red-500 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
              </div>

              {!collapsedBlocks.has(block.id) && (
              <div className="p-5 animate-in fade-in slide-in-from-top-1 duration-200">
                 {block.type === 'md' && (
                    <div className="flex flex-col gap-4">
                       {/* Cß║óNH B├üO CHO KHß╗ÉI L├¥ THUYß║╛T */}
                       {(typeof block.content === 'string') && (() => {
                          const placeholderRegex = /\[IMAGE_PLACEHOLDER\]|\[.*?CH├Ü ├¥.*?\]|\[.*?H├îNH Vß║╝.*?\]|\[.*?H├îNH ß║óNH.*?\]|\[.*?Bß║óNG BIß╗éU.*?\]/i;
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
                                     {globalSourceImage ? "AI ph├ít hiß╗çn c├│ ß║únh cß║ºn cß║»t!" : "Cß║únh b├ío: C├│ vß╗ï tr├¡ cß║ºn ch├¿n ß║únh thß╗º c├┤ng!"}
                                  </h4>
                                  <p className={`text-[14px] mb-4 leading-relaxed ${globalSourceImage ? 'text-orange-700' : 'text-red-600'}`}>
                                     {globalSourceImage ? "Hß╗ç thß╗æng ─æ├ú nhß║¡n diß╗çn khu vß╗▒c ß║únh tß╗½ dß╗» liß╗çu gß╗æc. H├úy d├╣ng n├║t b├¬n d╞░ß╗¢i ─æß╗â cß║»t phß║ºn ß║únh ch├¡nh x├íc." : "H├úy ß║Ñn n├║t b├¬n d╞░ß╗¢i ─æß╗â tß║úi file ß║únh l├¬n v├á cß║»t v├áo vß╗ï tr├¡ n├áy."}
                                  </p>
                                  <button onClick={() => onTriggerCrop(globalSourceImage ? { originalUrl: globalSourceImage, ...bboxMeta } : bboxMeta, block.id)} className={`${globalSourceImage ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'} text-white px-4 py-2.5 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2 text-sm`}><CropIcon className="w-4 h-4"/> {globalSourceImage ? 'Cß║»t tß╗½ ß║ónh Nguß╗ôn' : 'Cß║»t & Ch├¿n ß║ónh Mß╗¢i'}</button>
                               </div>
                               {globalSourceImage && (
                                 <div className="w-full md:w-72 bg-white border border-orange-100 rounded-xl p-1.5 shadow-sm shrink-0 relative overflow-hidden">
                                    <img src={globalSourceImage} alt="Source" className="w-full max-h-48 object-contain rounded-lg opacity-60" />
                                    {bboxMatch && <div className="absolute inset-0 flex items-center justify-center font-bold text-orange-900 drop-shadow-md text-sm"><CropIcon className="w-6 h-6 mr-1"/> ─É├ú x├íc ─æß╗ïnh toß║í ─æß╗Ö</div>}
                                 </div>
                               )}
                            </div>
                          );
                       })()}

                       <RichTextarea 
                           value={block.content} 
                           onChange={e => updateBlockContent(idx, e.target.value)} 
                           className="w-full h-40 p-4 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-mono text-[15px] transition-all"
                           placeholder="Nhß║¡p Markdown / LaTeX..."
                       />
                       
                       {(() => {
                           const hasMarkdownTable = typeof block.content === 'string' && /\|.*\|.*\n\s*\|[-\s:]+\|/.test(block.content);
                           if (!hasMarkdownTable) return null;
                           return (
                             <div className="mt-2 border px-5 py-4 rounded-xl flex flex-col md:flex-row gap-5 items-start bg-yellow-50 border-yellow-300 shadow-sm animate-in slide-in-from-top-2">
                               <div className="flex-1">
                                  <h4 className="font-bold flex items-center gap-2 mb-2 text-yellow-900">
                                     <AlertTriangle className="w-5 h-5 text-yellow-600"/> 
                                     Ph├ít hiß╗çn c├│ Bß║úng Markdown / Bß║úng Biß║┐n Thi├¬n!
                                  </h4>
                                  <p className="text-[14px] mb-4 leading-relaxed text-yellow-800 font-medium">
                                     Bß║úng v─ân bß║ún (nh╞░ Bß║úng x├⌐t dß║Ñu, Bß║úng biß║┐n thi├¬n) th╞░ß╗¥ng sß║╜ hiß╗ân thß╗ï kh├┤ng ─æß║╣p v├á bß╗ï lß╗çch m┼⌐i t├¬n tr├¬n Mobile. 
                                     Bß║ín n├¬n <strong>xo├í ─æoß║ín m├ú bß║úng n├áy</strong> v├á sß╗¡ dß╗Ñng chß╗⌐c n─âng <strong>Ch├¿n H├¼nh ß║ónh</strong> ─æß╗â thay thß║┐.
                                  </p>
                                  <button 
                                     onClick={() => onTriggerCrop(globalSourceImage ? { originalUrl: globalSourceImage } : {}, block.id)} 
                                     className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2 text-sm"
                                  >
                                     <ImageIcon className="w-4 h-4"/> Ch├¿n ß║ónh Bß║úng Thay Thß║┐
                                  </button>
                               </div>
                             </div>
                           );
                       })()}

                       {/* ─É├ú loß║íi bß╗Å Mobile View c┼⌐ */}
                    </div>
                 )}

                 {block.type === 'quiz' && (
                    <div className="flex flex-col gap-5">
                       {/* Cß║únh b├ío h├¼nh ß║únh & Smart Cropper tß╗▒ ─æß╗Öng */}
                       {block.content.autoCropMetadata ? (
                          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 flex flex-col md:flex-row gap-5 items-start">
                             <div className="flex-1">
                                <h4 className="text-orange-800 font-bold flex items-center gap-2 mb-2"><ImageIcon className="w-5 h-5"/> ß║ónh Gß╗æc ─É├¡nh K├¿m</h4>
                                <p className="text-[14px] text-orange-700 mb-4 leading-relaxed">AI ─æ├ú ph├ít hiß╗çn v├á cß║»t ß║únh tß╗½ t├ái liß╗çu gß╗æc. Bß║ín c├│ thß╗â sß╗¡ dß╗Ñng c├┤ng cß╗Ñ Cß║»t lß║íi nß║┐u AI cß║»t ch╞░a chuß║⌐n x├íc.</p>
                                <button onClick={() => onTriggerCrop(block.content.autoCropMetadata, block.id)} className="bg-orange-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-orange-700 shadow-sm transition-colors flex items-center gap-2 text-sm"><CropIcon className="w-4 h-4"/> Cß║»t lß║íi ß║ónh N├áy</button>
                             </div>
                             <div className="w-full md:w-72 bg-white border border-orange-100 rounded-xl p-1.5 shadow-sm shrink-0">
                                <img src={block.content.autoCropMetadata.originalUrl} alt="Source" className="w-full max-h-48 object-contain rounded-lg" />
                             </div>
                          </div>
                       ) : (/(?:\[IMAGE_PLACEHOLDER\]|\[.*?CH├Ü ├¥.*?\]|\[.*?H├îNH Vß║╝.*?\]|\[.*?H├îNH ß║óNH.*?\]|\[.*?Bß║óNG BIß╗éU.*?\])/i.test(block.content.question || '')) && (
                          <div className="bg-red-50 border border-red-200 px-5 py-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
                             <div className="flex items-center gap-3 text-red-700">
                                <AlertTriangle className="w-6 h-6 shrink-0" />
                                <span className="text-[15px] font-bold">Cß║únh b├ío: Ph├ít hiß╗çn y├¬u cß║ºu ch├¿n ß║únh tß╗½ AI. H├úy d├╣ng n├║t b├¬n phß║úi ─æß╗â ch├¿n!</span>
                             </div>
                             <button onClick={() => onTriggerCrop(globalSourceImage ? { originalUrl: globalSourceImage } : {}, block.id)} className="bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-red-700 shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0"><CropIcon className="w-4 h-4" /> Cß║»t & Ch├¿n ß║ónh Mß╗¢i</button>
                          </div>
                       )}

                       <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                          <label className="font-bold text-teal-800 text-[15px]">Nß╗Öi dung c├óu hß╗Åi</label>
                          <select 
                             value={block.content.type || 'multiple_choice'} 
                             onChange={e => {
                               const newType = e.target.value;
                               let newContent = { ...block.content, type: newType };
                               // Nß║┐u chuyß╗ân sang true_false_cluster m├á options ch╞░a ─æ├║ng cß║Ñu tr├║c object
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
                             <option value="multiple_choice">Trß║»c nghiß╗çm 4 lß╗▒a chß╗ìn</option>
                             <option value="true_false_cluster">─É├║ng/Sai 4 ├¥ (Barem 2025)</option>
                             <option value="true_false">─É├║ng / Sai (Truyß╗ün thß╗æng)</option>
                             <option value="short_answer">Trß║ú lß╗¥i ngß║»n / ─Éiß╗ün khuyß║┐t</option>
                             <option value="essay">Tß╗▒ luß║¡n / Tr├¼nh b├áy chi tiß║┐t</option>
                          </select>
                       </div>
                       
                       <RichTextarea rows={3} value={block.content.question || ""} onChange={e => updateBlockContent(idx, { ...block.content, question: e.target.value })} className="w-full border border-gray-200 rounded-xl p-4 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 font-mono text-[15px] transition-all" placeholder="Nhß║¡p c├óu hß╗Åi... (Markdown hß╗ù trß╗ú)" />

                       {(block.content.type === 'multiple_choice' || !block.content.type) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             {[0,1,2,3].map(optIdx => (
                               <div key={optIdx} className="flex flex-col gap-1">
                                  <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                     <input type="radio" name={`q_${block.id}`} checked={block.content.answerIndex === optIdx} onChange={() => updateBlockContent(idx, { ...block.content, answerIndex: optIdx })} className="text-teal-600" />
                                     ─É├íp ├ín {['A','B','C','D'][optIdx]}
                                  </label>
                                  <RichTextarea collapsibleToolbar={true} rows={2} value={block.content.options?.[optIdx] || ""} onChange={e => {
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
                                     ─É├íp ├ín {['─É├║ng','Sai'][optIdx]}
                                  </label>
                                  <RichTextarea collapsibleToolbar={true} rows={2} value={block.content.options?.[optIdx] || ""} onChange={e => {
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
                                Cß║Ñu tr├║c Barem 2025: Mß╗Öt c├óu hß╗Åi chung v├á 4 mß╗çnh ─æß╗ü (A, B, C, D). Hß╗ìc sinh chß╗ìn ─É/S cho tß╗½ng mß╗çnh ─æß╗ü ─æß╗Öc lß║¡p. ─Éiß╗âm ─æ╞░ß╗úc t├¡nh theo bß║¡c (0.1─æ, 0.25─æ, 0.5─æ, 1.0─æ).
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                               {(block.content.options || []).map((opt: any, optIdx: number) => (
                                  <div key={optIdx} className="flex flex-col gap-2 p-3 border border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                     <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-700 text-sm">Mß╗çnh ─æß╗ü {opt.id?.toUpperCase() || ['A','B','C','D'][optIdx]}</span>
                                        <button 
                                           onClick={() => {
                                              const newOpts = [...block.content.options];
                                              newOpts[optIdx] = { ...opt, isTrue: !opt.isTrue };
                                              updateBlockContent(idx, { ...block.content, options: newOpts });
                                           }}
                                           className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${opt.isTrue ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200' : 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'}`}
                                        >
                                           {opt.isTrue ? 'Γ£ô Mß╗çnh ─æß╗ü ─É├║ng' : 'Γ£ò Mß╗çnh ─æß╗ü Sai'}
                                        </button>
                                     </div>
                                     <RichTextarea 
                                        collapsibleToolbar={true}
                                        rows={2} 
                                        value={opt.content || ""} 
                                        onChange={e => {
                                           const newOpts = [...block.content.options];
                                           newOpts[optIdx] = { ...opt, content: e.target.value };
                                           updateBlockContent(idx, { ...block.content, options: newOpts });
                                        }} 
                                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all" 
                                        placeholder="Nhß║¡p nß╗Öi dung mß╗çnh ─æß╗ü..."
                                     />
                                  </div>
                               ))}
                             </div>
                          </div>
                       )}

                       {block.content.type === 'short_answer' && (
                          <div>
                             <label className="text-xs font-bold text-gray-600 mb-1 block">─É├íp ├ín ─æ├║ng ch├¡nh x├íc (Text/Sß╗æ)</label>
                             <input type="text" value={block.content.exactAnswer || ""} onChange={e => updateBlockContent(idx, { ...block.content, exactAnswer: e.target.value })} className="w-full border p-2 rounded outline-none focus:border-teal-500 font-bold" />
                          </div>
                       )}

                       <div className="mt-4 pt-4 border-t border-gray-100">
                          <label className="text-xs font-bold text-gray-600 mb-2 block text-indigo-700">Γ£ì∩╕Å H╞░ß╗¢ng dß║½n giß║úi / Lß╗¥i giß║úi chi tiß║┐t</label>
                          <RichTextarea rows={4} value={block.content.answer || block.content.sampleAnswer || block.content.explanation || ""} onChange={e => updateBlockContent(idx, { ...block.content, answer: e.target.value, sampleAnswer: e.target.value })} className="w-full border p-2 rounded outline-none focus:border-teal-500" />
                       </div>
                    </div>
                 )}

                  {previewBlocks.has(block.id) && (
                     <div className="mt-5 pt-5 border-t-2 border-indigo-100 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-3">
                           <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                              <MonitorPlay className="w-3 h-3" /> Kß║╛T QUß║ó XEM TR╞»ß╗ÜC:
                           </div>
                           <button onMouseDown={(e) => {
                               e.preventDefault(); // Tr├ính l├ám mß║Ñt focus cß╗ºa ├┤ nhß║¡p liß╗çu
                               const isFixedBySelection = applyLatexFixToActiveElement();
                               if (!isFixedBySelection) {
                                  // Nß║┐u kh├┤ng c├│ v├╣ng b├┤i ─æen n├áo, ├íp dß╗Ñng cho to├án bß╗Ö khß╗æi
                                  try {
                                     let fixed = block.type === 'md' ? block.content : JSON.stringify(block.content);
                                     fixed = fixLatexText(fixed);
                                     if (block.type === 'md') updateBlockContent(idx, fixed);
                                     else updateBlockContent(idx, JSON.parse(fixed));
                                  } catch(err) { console.error(err) }
                               }
                           }} className="flex items-center gap-1.5 text-xs font-bold bg-purple-50 text-purple-700 px-3 py-1.5 rounded-md hover:bg-purple-100 transition-colors border border-purple-200 shadow-sm">
                              ≡ƒ¬ä Sß╗¡a lß╗ùi LaTeX ngay
                           </button>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md border-4 border-slate-700 aspect-video overflow-y-auto w-full max-w-4xl mx-auto relative prose prose-lg prose-indigo [&_p]:whitespace-pre-wrap [&_li]:whitespace-pre-wrap prose-p:leading-[1.5] prose-li:leading-[1.5] prose-p:my-[0.3em] prose-li:my-[0.2em] prose-ul:my-[0.3em]">
                           {block.type === 'md' ? renderQuizContent(block.content) : (
                              <div className="flex flex-col gap-4">
                                 {renderQuizContent(block.content.question || "*(Ch╞░a c├│ c├óu hß╗Åi)*")}
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
                                             <span className="font-bold text-indigo-600 text-sm">Mß╗çnh ─æß╗ü {opt.id?.toUpperCase() || ['A','B','C','D'][optIdx]}:</span>
                                             <div className="flex-1 text-sm">{renderQuizContent(opt.content || "")}</div>
                                             <div className="mt-1 pt-2 border-t border-gray-200">
                                                {opt.isTrue ? <span className="text-xs font-bold text-green-600">Γ£ô ─É├íp ├ín: ─É├ÜNG</span> : <span className="text-xs font-bold text-red-500">Γ£ò ─É├íp ├ín: SAI</span>}
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 )}

                                 {(block.content.answer || block.content.sampleAnswer || block.content.explanation) && (
                                    <div className="mt-4 p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                                       <div className="text-sm font-bold text-emerald-800 mb-2 border-b border-emerald-200/50 pb-2 flex items-center gap-2">
                                          <span className="text-lg">≡ƒÆí</span> H╞░ß╗¢ng dß║½n giß║úi:
                                       </div>
                                       <div className="text-[15px] text-gray-800">
                                          {renderQuizContent(block.content.answer || block.content.sampleAnswer || block.content.explanation || "")}
                                       </div>
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
                 <button onClick={() => addBlock(idx, 'md')} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-md"><PlusCircle className="w-3.5 h-3.5"/> Th├¬m Khß╗æi L├╜ thuyß║┐t xuß╗æng d╞░ß╗¢i</button>
                 <button onClick={() => addBlock(idx, 'quiz')} className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-800 bg-teal-50 px-3 py-1.5 rounded-md"><PlusCircle className="w-3.5 h-3.5"/> Th├¬m Khß╗æi Trß║»c nghiß╗çm xuß╗æng d╞░ß╗¢i</button>
                 <button onClick={() => { setInsertIndex(idx); setIsBankModalOpen(true); }} className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-800 bg-orange-50 px-3 py-1.5 rounded-md border border-orange-100 shadow-sm"><Database className="w-3.5 h-3.5"/> R├║t tß╗½ Ng├ón h├áng</button>
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
