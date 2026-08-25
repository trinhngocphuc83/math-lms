"use client";

import React from "react";
import { AlertTriangle, CropIcon, PlusCircle, Trash2, ArrowUp, ArrowDown, ListTodo, Type, Image as ImageIcon, MonitorPlay, Database, ChevronRight, ChevronLeft, CheckCircle2, Sparkles } from "lucide-react";
import { fixLatexText, applyLatexFixToActiveElement, ensureMathDelimiters } from "@/utils/latexFixer";
import { bankTypeToBlockType } from "@/utils/questionTypes";
import 'katex/dist/katex.min.css';
import QuestionBankModal from "@/components/admin/QuestionBankModal";
import RichTextarea from "@/components/admin/RichTextarea";
import QuestionPreviewCard, { type PreviewStatement } from "@/components/admin/QuestionPreviewCard";
import SourceImageWithBox from "@/components/admin/SourceImageWithBox";
import { IMAGE_NEEDED_REGEX, IMAGE_PLACEHOLDER_STRIP_REGEX, daChenAnh, canChenAnh, coCanhBaoAI } from "@/utils/aiQuestionScan";
import VeLaiHinhModal from "@/components/admin/VeLaiHinhModal";
import { chamDoNetAnh } from "@/utils/veLaiHinhAI";

export interface Block {
  id: string;
  type: 'md' | 'quiz';
  content: any;
}

export default function BlockEditor({ blocks, onChangeBlocks, onTriggerCrop, globalSourceImage, globalTriggerBankModal }: { blocks: Block[], onChangeBlocks: (b: Block[]) => void, onTriggerCrop: (meta: any, targetBlockId: string) => void, globalSourceImage?: string, globalTriggerBankModal?: number }) {

  const [previewBlocks, setPreviewBlocks] = React.useState<Set<string>>(new Set());
  const [isBankModalOpen, setIsBankModalOpen] = React.useState(false);
  const [insertIndex, setInsertIndex] = React.useState(-1);
  const [selectedBlocks, setSelectedBlocks] = React.useState<Set<string>>(new Set());
  const [activeBlockId, setActiveBlockId] = React.useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  // Trên điện thoại chỉ đủ chỗ cho MỘT trong hai: Bản đồ câu hỏi hoặc khu soạn.
  // Trước đây cả hai cùng nằm trong flex-col, Bản đồ (shrink-0 + cao gần hết màn)
  // đẩy khu soạn xuống vùng cao ~0 rồi bị overflow-hidden cắt mất - trên điện thoại
  // không sửa được câu hỏi. Nay chạm 1 câu là sang màn soạn, có nút quay lại.
  // State này KHÔNG ảnh hưởng desktop (từ md trở lên luôn hiện cả hai).
  const [mobileView, setMobileView] = React.useState<'map' | 'editor'>('map');

  /** Chọn 1 khối từ Bản đồ: trên điện thoại chuyển luôn sang màn soạn câu đó. */
  const selectBlock = (blockId: string) => {
    setActiveBlockId(blockId);
    setMobileView('editor');
  };

  React.useEffect(() => {
    if (blocks.length > 0 && !activeBlockId) setActiveBlockId(blocks[0].id);
    if (blocks.length > 0 && activeBlockId && !blocks.find(b => b.id === activeBlockId)) setActiveBlockId(blocks[0].id);
  }, [blocks, activeBlockId]);

  // Bản đồ câu hỏi: nhớ trạng thái thu gọn để lần sau mở lên vẫn giữ nguyên
  React.useEffect(() => {
    try {
      if (localStorage.getItem('lessonEditor.mapCollapsed') === '1') setIsSidebarCollapsed(true);
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('lessonEditor.mapCollapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  };


  React.useEffect(() => {
     if (globalTriggerBankModal && globalTriggerBankModal > 0) {
        setInsertIndex(blocks.length - 1);
        setIsBankModalOpen(true);
     }
  }, [globalTriggerBankModal]);

  const handleInsertFromBank = (questions: any[]) => {
      const newBlocks = [...blocks];
      const itemsToInsert: Block[] = questions.map(q => {
         // Dùng bảng quy đổi chung để không sai dạng khi rút câu hỏi về bài giảng.
         // Trước đây chỉ nhận 3 mã TL/TLN/DS, còn lại rơi hết vào trắc nghiệm.
         const blockType = bankTypeToBlockType(q.question_type);

         let questionContent = q.content || "";
         if (q.image_url) {
             // Dùng regex chung IMAGE_PLACEHOLDER_STRIP_REGEX: bản cũ ở đây thiếu nhánh
             // "HÌNH ẢNH" nên câu ngân hàng chứa "[CÓ HÌNH ẢNH KÈM THEO]" không được thay
             // bằng ảnh mà bị nối ảnh xuống cuối, marker nằm lại và báo chấm đỏ vĩnh viễn.
             //
             // So sánh trước/sau thay vì .test(): regex này mang cờ "g" nên .test() sẽ nhớ
             // lastIndex giữa các lần gọi, chạy trong vòng lặp nhiều câu sẽ trả false sai
             // xen kẽ. .replace() với cờ "g" thì luôn quét lại từ đầu nên an toàn.
             const imageMarkdown = `\n\n![Hình vẽ](${q.image_url})\n\n`;
             const replaced = questionContent.replace(IMAGE_PLACEHOLDER_STRIP_REGEX, imageMarkdown);
             questionContent = replaced !== questionContent ? replaced : questionContent + imageMarkdown;
         }

         const content: any = {
             type: blockType,
             question: questionContent,
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
             
             // Nếu câu hỏi trong ngân hàng bị lỗi chỉ lưu 1-3 ý, tự động bù đủ 4 ý
             if (stmts.length > 0 && stmts.length < 4) {
                 const defaultIds = ['a', 'b', 'c', 'd'];
                 for (let i = stmts.length; i < 4; i++) {
                     stmts.push({ id: defaultIds[i], content: `Phát biểu ${defaultIds[i]}`, isTrue: false });
                 }
             }
             content.options = stmts.length > 0 ? stmts : [
                 { id: 'a', content: "Mệnh đề A", isTrue: true },
                 { id: 'b', content: "Mệnh đề B", isTrue: false },
                 { id: 'c', content: "Mệnh đề C", isTrue: true },
                 { id: 'd', content: "Mệnh đề D", isTrue: false },
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

  /** Địa chỉ ảnh markdown đầu tiên trong nội dung câu - chính là ảnh AI vừa cắt chèn vào. */
  const layAnhTrongCau = (noiDung: any): string | undefined =>
    (String(noiDung || "").match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/) || [])[1];

  /** Khối đang nhờ AI vẽ lại hình, kèm địa chỉ ảnh cũ để còn thay đúng chỗ. */
  const [oVeLai, setOVeLai] = React.useState<{ idx: number; urlCu: string } | null>(null);

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

  /* ---------- BẢN ĐỒ THEO TRÌNH TỰ TRÌNH CHIẾU ----------
     Trước đây Bản đồ gom khối theo LOẠI (Văn bản một cụm, Trắc nghiệm một cụm)
     nên mất hẳn thứ tự tài liệu - nhìn vào không biết bài chạy theo mạch nào,
     rất khó dò đúng chỗ cần sửa. Nay liệt kê đúng trình tự và gom theo từng
     slide của bản trình chiếu. */

  /** Nhãn + màu nhận diện cho từng loại khối. */
  const blockKind = (b: Block): { label: string; dot: string; chip: string } => {
     if (b.type === 'md') return { label: 'Văn bản', dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-600' };
     switch (b.content?.type) {
        case 'true_false_cluster':
        case 'true_false':
           return { label: 'Đúng/Sai', dot: 'bg-orange-500', chip: 'bg-orange-100 text-orange-700' };
        case 'short_answer':
           return { label: 'Trả lời ngắn', dot: 'bg-purple-500', chip: 'bg-purple-100 text-purple-700' };
        case 'essay':
           return { label: 'Tự luận', dot: 'bg-blue-500', chip: 'bg-blue-100 text-blue-700' };
        default:
           return { label: 'Trắc nghiệm', dot: 'bg-teal-500', chip: 'bg-teal-100 text-teal-700' };
     }
  };

  /** Trích vài chữ đầu để nhận ra ngay khối nào là khối nào. */
  const blockPreview = (b: Block): string => {
     const raw = b.type === 'md'
        ? (typeof b.content === 'string' ? b.content : '')
        : (b.content?.question || '');
     const line = String(raw)
        .split('\n')
        .map(l => l.trim())
        .find(l => l && !/^-{3,}$/.test(l) && !/^\s*$/.test(l)) || '';
     // Lược lặp lại các dấu đầu dòng vì hay lồng nhau ("> ### 📌 Ví dụ mẫu")
     let s = line;
     for (let k = 0; k < 4; k++) {
        s = s.replace(/^\s*>\s*/, '').replace(/^\s*#{1,6}\s*/, '');
     }
     return s
        .replace(/\*\*/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\$[^$]*\$/g, '…')
        .trim()
        .slice(0, 46);
  };

  /**
   * Số slide mà một đoạn markdown tạo ra - dùng ĐÚNG luật tách của trang trình
   * chiếu (ngắt ở dòng '---', ở tiêu đề '##', và mỗi khối quiz là một slide riêng)
   * để số hiệu trên Bản đồ khớp với số slide thầy thấy khi trình chiếu.
   */
  const countSlidesIn = (md: string): number => {
     let n = 0;
     md.split(/(?:\n|^)\s*---\s*(?:\n|$)/).forEach(part => {
        part.split(/(?=(?:\n|^)##\s)/).forEach(sp => {
           sp.split(/(```quiz[\s\S]*?```)/g).forEach(t => { if (t.trim()) n++; });
        });
     });
     return n;
  };

  /** Với mỗi khối: slide bắt đầu và số slide nó chiếm. */
  const blockSlideInfo = React.useMemo(() => {
     let running = 0;
     return blocks.map(b => {
        const md = b.type === 'md'
           ? (typeof b.content === 'string' ? b.content : '')
           : '```quiz\n' + JSON.stringify(b.content) + '\n```';
        const count = Math.max(1, countSlidesIn(md));
        const start = running + 1;
        running += count;
        return { start, count };
     });
  }, [blocks]);

  const tongSoSlide = blockSlideInfo.length > 0
     ? blockSlideInfo[blockSlideInfo.length - 1].start + blockSlideInfo[blockSlideInfo.length - 1].count - 1
     : 0;

  // Khối còn cần xử lý ảnh (chèn thủ công hoặc xác nhận cắt ảnh AI) - dùng để
  // báo động trên Bản đồ để không bị bỏ sót khi có nhiều câu.
  //
  // Dùng IMAGE_NEEDED_REGEX chung (không có cờ "g" nên .test() an toàn) thay cho bản
  // chép riêng trước đây - trước có 4 bản regex lệch nhau giữa các file, sửa chỗ này
  // quên chỗ kia.
  const blockNeedsImage = (b: Block): boolean => {
     if (b.type === 'md') {
        if (typeof b.content !== 'string') return false;
        return IMAGE_NEEDED_REGEX.test(b.content) || /\{\s*"image_bbox"\s*:\s*\[([\d,\s]+)\]\s*\}/.test(b.content);
     }
     if (b.type === 'quiz') {
        const question = b.content?.question || '';
        // Đã chèn được ảnh vào câu thì coi như xong, kể cả khi ảnh do AI tự cắt
        // (autoCropMetadata vẫn được giữ để còn cắt lại). Bản cũ trả về true ngay khi
        // thấy autoCropMetadata nên câu ĐÃ CÓ ẢNH vẫn bị báo đỏ "thiếu ảnh" vĩnh viễn.
        if (daChenAnh(question)) return false;
        if (b.content?.autoCropMetadata) return true;
        return IMAGE_NEEDED_REGEX.test(question);
     }
     return false;
  };

  /** Khối đã có ảnh chèn sẵn (AI tự cắt hoặc chèn thủ công) - đánh dấu trên Bản đồ
   *  để dễ lần ra câu nào có hình mà không phải mở từng câu ra xem. */
  const blockHasImage = (b: Block): boolean => {
     const text = b.type === 'md'
        ? (typeof b.content === 'string' ? b.content : '')
        : (b.content?.question || '');
     return daChenAnh(text);
  };

  /** Khối bị AI cảnh báo sai đề / đã tự sửa - phải rà lại bằng mắt vì nội dung
   *  không còn đúng nguyên bản đề gốc. */
  const blockCoCanhBao = (b: Block): boolean => {
     if (b.type === 'md') return coCanhBaoAI(typeof b.content === 'string' ? b.content : '');
     return coCanhBaoAI(b.content?.question, b.content?.answer || b.content?.explanation);
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-gray-100 relative">
       {/* SIDEBAR BẢN ĐỒ CÂU HỎI - thu gọn được (240px ↔ 52px) */}
       {/* Điện thoại: chiếm trọn khung, chỉ hiện khi đang ở màn "map" (md trở lên luôn hiện) */}
       <div
          className={`${mobileView === 'map' ? 'flex' : 'hidden'} md:flex ${isSidebarCollapsed ? 'md:w-[52px]' : 'md:w-[240px]'} w-full flex-1 min-h-0 md:flex-none border-r border-gray-200 bg-white overflow-y-auto overflow-x-hidden flex-col shadow-sm z-10 md:shrink-0 transition-[width] duration-300 ease-out md:max-h-[calc(100vh-120px)]`}
       >
          <div className={`p-3 border-b border-gray-100 bg-indigo-50/50 flex items-center sticky top-0 z-20 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between'}`}>
             {!isSidebarCollapsed && (
                <h3 className="font-black text-indigo-900 flex items-center gap-2 text-sm uppercase tracking-wider whitespace-nowrap"><ListTodo className="w-4 h-4"/> Bản đồ</h3>
             )}
             <button
                type="button"
                onClick={toggleSidebar}
                title={isSidebarCollapsed ? 'Mở rộng Bản đồ câu hỏi' : 'Thu gọn Bản đồ câu hỏi'}
                className="p-1 rounded-md text-indigo-500 hover:text-indigo-800 hover:bg-indigo-100 transition-colors shrink-0"
             >
                {isSidebarCollapsed ? <ChevronRight className="w-4 h-4"/> : <ChevronLeft className="w-4 h-4"/>}
             </button>
          </div>

          {/* Dạng thu gọn: dải ô dọc ĐÚNG TRÌNH TỰ, rê chuột hiện chi tiết */}
          {isSidebarCollapsed && (
             <div className="flex flex-col items-center gap-1 py-2">
                {blocks.map((b, i) => {
                   const kind = blockKind(b);
                   const info = blockSlideInfo[i];
                   const needsImage = blockNeedsImage(b);
                   const nhanSlide = info.count > 1 ? `Slide ${info.start}-${info.start + info.count - 1}` : `Slide ${info.start}`;
                   return (
                      <div key={b.id} className="relative shrink-0">
                         <button
                            onClick={() => selectBlock(b.id)}
                            title={`${nhanSlide} · ${kind.label}${needsImage ? ' · Còn thiếu ảnh!' : ''}`}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[12px] transition-all shrink-0 relative overflow-hidden ${activeBlockId === b.id
                               ? 'bg-indigo-600 text-white shadow-md'
                               : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'} ${needsImage ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}
                         >
                            {info.start}
                            <span className={`absolute bottom-0 left-0 right-0 h-[3px] ${kind.dot}`} />
                         </button>
                         {needsImage && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" title="Còn thiếu ảnh"/>
                         )}
                      </div>
                   );
                })}
             </div>
          )}

          {!isSidebarCollapsed && (
          <div className="p-2.5 flex flex-col gap-1">
             {blocks.length === 0 && (
                <div className="text-[11px] text-gray-400 text-center py-8">Chưa có nội dung</div>
             )}

             {blocks.map((b, i) => {
                const kind = blockKind(b);
                const info = blockSlideInfo[i];
                const needsImage = blockNeedsImage(b);
                const hasImage = !needsImage && blockHasImage(b);
                const coCanhBao = blockCoCanhBao(b);
                const isActive = activeBlockId === b.id;
                const preview = blockPreview(b);
                const hetSlide = info.start + info.count - 1;
                const nhanSlide = info.count > 1 ? `S${info.start}–${hetSlide}` : `S${info.start}`;
                return (
                   <button
                      key={b.id}
                      onClick={() => selectBlock(b.id)}
                      title={`Slide ${info.count > 1 ? `${info.start}-${hetSlide}` : info.start} · ${kind.label}${needsImage ? ' · CÒN THIẾU ẢNH' : hasImage ? ' · Có hình ảnh' : ''}${coCanhBao ? '\n🛠️ AI ĐÃ SỬA/NGHI SAI ĐỀ - cần kiểm tra lại' : ''}\n${preview}`}
                      className={`w-full text-left rounded-lg px-2 py-1.5 border flex items-stretch gap-2 transition-colors ${isActive
                         ? 'bg-indigo-600 border-indigo-600 shadow-sm'
                         : needsImage
                            ? 'bg-red-50 border-red-200 hover:bg-red-100'
                            : coCanhBao
                               ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                               : 'bg-white border-gray-100 hover:bg-indigo-50 hover:border-indigo-200'}`}
                   >
                      {/* Vạch màu theo loại khối */}
                      <span className={`w-1 rounded-full shrink-0 ${kind.dot}`} />
                      <span className="flex-1 min-w-0">
                         <span className="flex items-center gap-1.5">
                            <span className={`text-[9.5px] font-black tabular-nums ${isActive ? 'text-white' : 'text-indigo-500'}`}>
                               {nhanSlide}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-[1px] rounded ${isActive ? 'bg-white/20 text-white' : kind.chip}`}>
                               {kind.label}
                            </span>
                            {needsImage && (
                               <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse ml-auto" title="Còn thiếu ảnh" />
                            )}
                            {hasImage && (
                               <ImageIcon className={`w-3 h-3 shrink-0 ml-auto ${isActive ? 'text-white/80' : 'text-emerald-500'}`} aria-label="Câu có hình ảnh" />
                            )}
                            {coCanhBao && (
                               <AlertTriangle className={`w-3 h-3 shrink-0 ${needsImage || hasImage ? '' : 'ml-auto'} ${isActive ? 'text-amber-300' : 'text-amber-500'}`} strokeWidth={3} aria-label="AI đã sửa hoặc nghi sai đề" />
                            )}
                         </span>
                         <span className={`block text-[11px] leading-snug mt-0.5 truncate ${isActive ? 'text-white/90' : 'text-gray-600'}`}>
                            {preview || '(trống)'}
                         </span>
                      </span>
                   </button>
                );
             })}

             {blocks.length > 0 && (
                <div className="mt-2 pt-2.5 border-t border-gray-100 px-1 flex items-center justify-between text-[10px] font-bold text-gray-400">
                   <span>{blocks.length} khối · {tongSoSlide} slide</span>
                   <span className="flex items-center gap-2">
                      {blocks.some(b => !blockNeedsImage(b) && blockHasImage(b)) && (
                         <span className="text-emerald-500 flex items-center gap-0.5">
                            <ImageIcon className="w-2.5 h-2.5" /> {blocks.filter(b => !blockNeedsImage(b) && blockHasImage(b)).length}
                         </span>
                      )}
                      {blocks.some(blockCoCanhBao) && (
                         <span className="text-amber-500 flex items-center gap-0.5" title="AI đã sửa hoặc nghi sai đề - cần kiểm tra">
                            <AlertTriangle className="w-2.5 h-2.5" strokeWidth={3} /> {blocks.filter(blockCoCanhBao).length}
                         </span>
                      )}
                      {blocks.some(blockNeedsImage) && (
                         <span className="text-red-500">{blocks.filter(blockNeedsImage).length} thiếu ảnh</span>
                      )}
                   </span>
                </div>
             )}
          </div>
          )}
       </div>

       {/* MAIN EDITOR - chiếm toàn bộ phần còn lại */}
       {/* Điện thoại: chỉ hiện khi đang ở màn "editor" (md trở lên luôn hiện) */}
       <div className={`${mobileView === 'editor' ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 min-h-0 flex-col p-4 md:p-6 overflow-y-auto md:max-h-[calc(100vh-120px)]`}>

       {/* Thanh điều hướng chỉ có trên điện thoại: quay lại Bản đồ + biết đang soạn câu nào */}
       <div className="md:hidden flex items-center gap-2 mb-3 -mt-1 sticky top-0 bg-slate-50/95 backdrop-blur-sm py-2 z-20 border-b border-gray-200">
          <button
             type="button"
             onClick={() => setMobileView('map')}
             className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-sm shrink-0 hover:bg-indigo-100"
          >
             <ChevronLeft className="w-4 h-4" /> Bản đồ
          </button>
          {(() => {
             const i = blocks.findIndex(b => b.id === activeBlockId);
             if (i < 0) return null;
             const info = blockSlideInfo[i];
             const kind = blockKind(blocks[i]);
             const nhan = info ? (info.count > 1 ? `Slide ${info.start}-${info.start + info.count - 1}` : `Slide ${info.start}`) : '';
             return (
                <span className="text-sm font-bold text-gray-700 truncate">
                   {nhan} · <span className="text-gray-500">{kind.label}</span>
                </span>
             );
          })()}
       </div>

       <div className="flex items-center justify-between mb-[-0.5rem] flex-wrap gap-3">

         {selectedBlocks.size > 0 && (
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2">
               <span className="text-sm font-bold text-gray-600 mr-2">Đã chọn {selectedBlocks.size} khối:</span>
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
                  <option value="">-- Đổi dạng câu hỏi --</option>
                  <option value="multiple_choice">Trắc nghiệm 4 lựa chọn</option>
                  <option value="true_false_cluster">Đúng/Sai 4 Ý (Barem 2025)</option>
                  <option value="short_answer">Trả lời ngắn / Điền khuyết</option>
                  <option value="essay">Tự luận / Trình bày chi tiết</option>
               </select>
               <button onClick={() => setSelectedBlocks(new Set())} className="ml-2 text-xs font-bold text-gray-400 hover:text-gray-600 underline">Bỏ chọn</button>
            </div>
         )}
       </div>

       {blocks.length === 0 && (
          <div className="text-center py-10 flex flex-col items-center gap-4">
             <button onClick={() => addBlock(-1, 'md')} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-teal-700 shadow-sm transition-colors">+ Thêm nội dung đầu tiên (Hoặc ấn Ctrl+V dán ảnh)</button>
             <button onClick={() => { setInsertIndex(-1); setIsBankModalOpen(true); }} className="flex items-center gap-2 font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-lg border border-orange-200 transition-colors shadow-sm"><Database className="w-4 h-4"/> Hoặc Rút Đề từ Ngân hàng</button>
          </div>
       )}

       {blocks.filter(b => b.id === activeBlockId).map((block) => {
             const idx = blocks.findIndex(b => b.id === block.id);
             return (
          <div key={block.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible shrink-0 transition-all relative">
              {/* overflow-x-auto: trên điện thoại hàng nút này rộng hơn màn hình (~660px),
                  trước đây overflow visible nên các nút cuối bị cắt và không bấm tới được. */}
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center gap-3 rounded-t-xl z-20 relative overflow-x-auto">
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
                     {block.type === 'md' ? <><Type className="w-4 h-4 text-indigo-500"/> Khối Lý Thuyết / Văn Bản</> : <><ListTodo className="w-4 h-4 text-teal-500"/> Khối Trắc Nghiệm Tương Tác</>}

                     {/* Chọn dạng câu hỏi - gộp vào đây để không tốn thêm một dòng riêng bên dưới */}
                     {block.type !== 'md' && (
                        <select
                           value={block.content.type || 'multiple_choice'}
                           onClick={e => e.stopPropagation()}
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
                           title="Dạng câu hỏi"
                           className="ml-2 border border-gray-300 rounded-lg px-2 py-1 text-[12px] bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                        >
                           <option value="multiple_choice">Trắc nghiệm 4 lựa chọn</option>
                           <option value="true_false_cluster">Đúng/Sai 4 Ý (Barem 2025)</option>
                           <option value="true_false">Đúng / Sai (Truyền thống)</option>
                           <option value="short_answer">Trả lời ngắn / Điền khuyết</option>
                           <option value="essay">Tự luận / Trình bày chi tiết</option>
                        </select>
                     )}
                  </div>
                  <div className="flex gap-1.5">
                      <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 disabled:opacity-30"><ArrowUp className="w-4 h-4"/></button>
                      <button onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 disabled:opacity-30"><ArrowDown className="w-4 h-4"/></button>
                      <div className="w-px h-4 bg-gray-300 mx-1 self-center"></div>
                      <button onClick={() => handleFixLatex(idx)} className="flex items-center gap-1.5 px-2 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-md text-[11px] font-bold transition-colors" title="Sửa nhanh các lỗi LaTeX (như dấu \\, dấu $$, v.v.)">🪄 Sửa lỗi LaTeX</button>
                      <button onClick={() => togglePreview(block.id)} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-bold transition-colors ${previewBlocks.has(block.id) ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'}`} title="Bật/Tắt chế độ chia đôi màn hình: sửa bên trái, xem trước bên phải"><MonitorPlay className="w-3.5 h-3.5"/> Xem Trước</button>
                      <button onClick={() => onTriggerCrop(globalSourceImage ? { originalUrl: globalSourceImage } : {}, block.id)} className="flex items-center gap-1.5 px-2 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded-md text-[11px] font-bold transition-colors" title="Chèn thêm ảnh vào khối này"><CropIcon className="w-3.5 h-3.5"/> Chèn Thêm Ảnh</button>
                      <button onClick={() => removeBlock(idx)} className="p-1.5 hover:bg-red-100 rounded-md text-red-500 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
              </div>

              <div className="p-5 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className={previewBlocks.has(block.id) ? "grid grid-cols-1 xl:grid-cols-2 gap-6 items-start" : ""}>
                <div className="min-w-0 flex flex-col gap-5">
                 {block.type === 'md' && (
                    <div className="flex flex-col gap-4">
                       {/* CẢNH BÁO CHO KHỐI LÝ THUYẾT */}
                       {(typeof block.content === 'string') && (() => {
                          const hasPlaceholder = IMAGE_NEEDED_REGEX.test(block.content);
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
                            <div className={`border px-2 py-1.5 rounded flex items-center gap-2 justify-between ${globalSourceImage ? 'bg-orange-50/80 border-orange-200' : 'bg-red-50/80 border-red-200'}`}>
                               <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
                                  <h4 className={`font-bold flex items-center gap-2 mb-2 ${globalSourceImage ? 'text-orange-800' : 'text-red-700'}`}>
                                     {globalSourceImage ? <ImageIcon className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>} 
                                     {globalSourceImage ? "AI phát hiện có ảnh cần cắt!" : "Cảnh báo: Có vị trí cần chèn ảnh thủ công!"}
                                  </h4>
                                  <p className={`text-[14px] mb-4 leading-relaxed ${globalSourceImage ? 'text-orange-700' : 'text-red-600'}`}>
                                     {globalSourceImage ? "Hệ thống đã nhận diện khu vực ảnh từ dữ liệu gốc. Hãy dùng nút bên dưới để cắt phần ảnh chính xác." : "Hãy ấn nút bên dưới để tải file ảnh lên và cắt vào vị trí này."}
                                  </p>
                                  <button onClick={() => onTriggerCrop(globalSourceImage ? { originalUrl: globalSourceImage, ...bboxMeta } : bboxMeta, block.id)} className={`${globalSourceImage ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'} text-white px-2 py-1 rounded font-bold shadow-sm flex items-center gap-1 text-[11px] whitespace-nowrap shrink-0`}><CropIcon className="w-4 h-4"/> {globalSourceImage ? 'Cắt từ Ảnh Nguồn' : 'Cắt & Chèn Ảnh Mới'}</button>
                               </div>
                               {globalSourceImage && (
                                 <div className="w-full md:w-48 bg-white border border-orange-100 rounded-lg p-1 shadow-sm shrink-0 relative overflow-hidden">
                                    <img src={globalSourceImage} alt="Source" className="w-full max-h-24 object-contain rounded-lg opacity-60" />
                                    {bboxMatch && <div className="absolute inset-0 flex items-center justify-center font-bold text-orange-900 drop-shadow-md text-sm"><CropIcon className="w-6 h-6 mr-1"/> Đã xác định toạ độ</div>}
                                 </div>
                               )}
                            </div>
                          );
                       })()}

                       <RichTextarea 
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
                               <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
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
                                     className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded font-bold shadow-sm flex items-center gap-1 text-[11px] whitespace-nowrap shrink-0"
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
                          <AutoCropReviewPanel
                             meta={block.content.autoCropMetadata}
                             onRecrop={() => onTriggerCrop(block.content.autoCropMetadata, block.id)}
                             urlAnhDaCat={layAnhTrongCau(block.content.question)}
                             onVeLai={() => {
                                const url = layAnhTrongCau(block.content.question);
                                if (url) setOVeLai({ idx, urlCu: url });
                             }}
                          />
                       ) : (canChenAnh(block.content.question)) && (
                          <div className="bg-red-50 border border-red-200 px-5 py-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
                             <div className="flex items-center gap-3 text-red-700">
                                <AlertTriangle className="w-6 h-6 shrink-0" />
                                <span className="text-[15px] font-bold">Cảnh báo: Phát hiện yêu cầu chèn ảnh từ AI. Hãy dùng nút bên phải để chèn!</span>
                             </div>
                             <button onClick={() => onTriggerCrop(globalSourceImage ? { originalUrl: globalSourceImage } : {}, block.id)} className="bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-red-700 shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0"><CropIcon className="w-4 h-4" /> Cắt & Chèn Ảnh Mới</button>
                          </div>
                       )}

                       <RichTextarea rows={3} value={block.content.question || ""} onChange={e => updateBlockContent(idx, { ...block.content, question: e.target.value })} className="w-full border border-gray-200 rounded-xl p-4 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 font-mono text-[15px] transition-all" placeholder="Nhập câu hỏi... (Markdown hỗ trợ)" />

                       {(block.content.type === 'multiple_choice' || !block.content.type) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             {[0,1,2,3].map(optIdx => (
                               <div key={optIdx} className="flex flex-col gap-1">
                                  <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                     <input type="radio" name={`q_${block.id}`} checked={block.content.answerIndex === optIdx} onChange={() => updateBlockContent(idx, { ...block.content, answerIndex: optIdx })} className="text-teal-600" />
                                     Đáp án {['A','B','C','D'][optIdx]}
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
                                     Đáp án {['Đúng','Sai'][optIdx]}
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
                             {/* Dùng RichTextarea để có bảng công thức + xem trước như mọi ô khác.
                                 Trước đây là <input> thuần nên không gõ/nhìn được công thức toán. */}
                             <RichTextarea
                                collapsibleToolbar={true}
                                rows={1}
                                value={block.content.exactAnswer || ""}
                                onChange={e => updateBlockContent(idx, { ...block.content, exactAnswer: e.target.value })}
                                className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 font-bold transition-all"
                                placeholder="VD: 12.5 hoặc $\frac{3\pi}{8}$"
                             />
                          </div>
                       )}

                       <div className="mt-4 pt-4 border-t border-gray-100">
                          <label className="text-xs font-bold text-gray-600 mb-2 block text-indigo-700">✍️ Hướng dẫn giải / Lời giải chi tiết</label>
                          <RichTextarea rows={4} value={block.content.answer || block.content.sampleAnswer || block.content.explanation || ""} onChange={e => updateBlockContent(idx, { ...block.content, answer: e.target.value, sampleAnswer: e.target.value })} className="w-full border p-2 rounded outline-none focus:border-teal-500" />
                       </div>
                    </div>
                 )}

                </div>

                {previewBlocks.has(block.id) && (() => {
                     const isMd = block.type === 'md';
                     const c = block.content || {};
                     let statements: PreviewStatement[] = [];
                     let statementsLayout: 'choice' | 'truefalse' = 'choice';
                     let correctAnswerDisplay: string | undefined;

                     if (!isMd) {
                        if (c.type === 'true_false_cluster') {
                           statementsLayout = 'truefalse';
                           statements = (c.options || []).map((opt: any, i: number) => ({
                              key: opt.id || String(i),
                              label: opt.id || ['a','b','c','d'][i],
                              content: opt.content || '',
                              isTrue: opt.isTrue,
                           }));
                        } else if (c.type === 'true_false') {
                           statementsLayout = 'choice';
                           statements = ['Đúng', 'Sai'].map((label, i) => ({
                              key: String(i),
                              label,
                              content: c.options?.[i] || label,
                              isCorrect: c.answerIndex === i,
                           }));
                           correctAnswerDisplay = c.answerIndex === 0 ? 'Đúng' : c.answerIndex === 1 ? 'Sai' : undefined;
                        } else if (c.type === 'multiple_choice' || !c.type) {
                           statementsLayout = 'choice';
                           statements = [0,1,2,3].map(i => ({
                              key: String(i),
                              label: ['A','B','C','D'][i],
                              content: c.options?.[i] || '',
                              isCorrect: c.answerIndex === i,
                           }));
                           correctAnswerDisplay = typeof c.answerIndex === 'number' ? ['A','B','C','D'][c.answerIndex] : undefined;
                        } else if (c.type === 'short_answer') {
                           correctAnswerDisplay = ensureMathDelimiters(c.exactAnswer) || undefined;
                        }
                     }

                     const explanationText = !isMd ? (c.answer || c.sampleAnswer || c.explanation || '') : '';

                     return (
                     <div className="xl:sticky xl:top-3 min-w-0 animate-in fade-in slide-in-from-top-2 bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-orange-50">
                           <h3 className="text-base font-black text-orange-800 flex items-center gap-2">
                              <MonitorPlay className="w-4 h-4" /> Xem trước
                           </h3>
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
                           }} className="flex items-center gap-1.5 text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200 transition-colors border border-purple-200">
                              🪄 Sửa lỗi LaTeX ngay
                           </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[85vh] bg-gray-50/50">
                           <QuestionPreviewCard
                              content={isMd ? block.content : (c.question || "*(Chưa có câu hỏi)*")}
                              statements={statements}
                              statementsLayout={statementsLayout}
                              correctAnswerDisplay={correctAnswerDisplay}
                              explanation={explanationText}
                              size="md"
                           />
                        </div>
                     </div>
                     );
                })()}
                </div>
              </div>

              <div className="bg-gray-50 border-t border-gray-100 p-2 flex justify-center gap-3 flex-wrap">
                 <button onClick={() => addBlock(idx, 'md')} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-md"><PlusCircle className="w-3.5 h-3.5"/> Thêm Khối Lý thuyết xuống dưới</button>
                 <button onClick={() => addBlock(idx, 'quiz')} className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-800 bg-teal-50 px-3 py-1.5 rounded-md"><PlusCircle className="w-3.5 h-3.5"/> Thêm Khối Trắc nghiệm xuống dưới</button>
                 <button onClick={() => { setInsertIndex(idx); setIsBankModalOpen(true); }} className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-800 bg-orange-50 px-3 py-1.5 rounded-md border border-orange-100 shadow-sm"><Database className="w-3.5 h-3.5"/> Rút từ Ngân hàng</button>
              </div>
           </div>
             );
          })}

        <QuestionBankModal
           isOpen={isBankModalOpen}
           onClose={() => setIsBankModalOpen(false)}
           onInsert={handleInsertFromBank}
           usedQuestionIds={blocks.map(b => b.type === 'quiz' && b.content.sourceQuestionId).filter(Boolean) as string[]}
        />

        {/* Ảnh chụp mờ thì nhờ AI vẽ lại bằng nét vector. Bản vẽ lại chỉ thay vào bài sau
            khi thầy cô soi hai hình cạnh nhau và bấm nhận - xem VeLaiHinhModal. */}
        <VeLaiHinhModal
           isOpen={!!oVeLai}
           onClose={() => setOVeLai(null)}
           urlAnhGoc={oVeLai?.urlCu || null}
           onNhan={(urlMoi) => {
              if (!oVeLai) return;
              const b = blocks[oVeLai.idx];
              if (!b || b.type !== 'quiz') return;
              // Thay đúng địa chỉ ảnh cũ trong nội dung câu, giữ nguyên mọi thứ khác
              const moi = String(b.content.question || '').split(oVeLai.urlCu).join(urlMoi);
              updateBlockContent(oVeLai.idx, { ...b.content, question: moi });
              setOVeLai(null);
           }}
        />
     </div>
     </div>
   );
 }

/**
 * Khối đối chiếu ảnh AI tự cắt: cho xem ảnh trang gốc kèm KHUNG ĐỎ đúng vùng đã cắt,
 * nhìn một cái là biết AI cắt đúng hình của câu này hay nhầm sang chỗ khác. Ảnh đã cắt
 * nằm ngay trong nội dung câu hỏi phía dưới nên ở đây không lặp lại.
 */
function AutoCropReviewPanel({ meta, onRecrop, urlAnhDaCat, onVeLai }: {
   meta: any;
   onRecrop: () => void;
   /** Ảnh đã cắt đang nằm trong nội dung câu - để chấm độ nét và vẽ lại. */
   urlAnhDaCat?: string;
   onVeLai?: () => void;
}) {
   const [showSource, setShowSource] = React.useState(false);
   const box = meta?.box;

   /*
    * Tự chấm độ nét ảnh đã cắt để MỜI thầy cô vẽ lại, thay vì để thầy cô tự phát hiện
    * lúc in ra mới thấy rỗ. Chấm hỏng (ảnh chặn CORS, địa chỉ chết) thì lặng lẽ bỏ qua -
    * không được để việc phụ này chặn việc soạn bài.
    */
   const [doNet, setDoNet] = React.useState<{ diem: number; beRong: number; nenVeLai: boolean; moTa: string } | null>(null);
   React.useEffect(() => {
      if (!urlAnhDaCat) { setDoNet(null); return; }
      let con = true;
      chamDoNetAnh(urlAnhDaCat).then(k => { if (con) setDoNet(k); }).catch(() => { if (con) setDoNet(null); });
      return () => { con = false; };
   }, [urlAnhDaCat]);

   return (
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col gap-3">
         <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
               <h4 className="text-orange-800 font-bold flex items-center gap-2 mb-1">
                  <ImageIcon className="w-5 h-5"/> {box ? 'AI đã tự cắt ảnh và chèn vào câu hỏi' : 'Ảnh gốc đính kèm'}
               </h4>
               <p className="text-[13px] text-orange-700 leading-relaxed">
                  {box
                     ? 'Hãy đối chiếu với ảnh gốc để chắc chắn cắt đúng hình của câu này. Nếu lệch, bấm "Cắt lại" để tự chọn vùng.'
                     : 'AI đã phát hiện ảnh từ tài liệu gốc. Dùng nút Cắt lại nếu chưa chuẩn xác.'}
               </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
               {meta?.originalUrl && (
                  <button
                     type="button"
                     onClick={() => setShowSource(v => !v)}
                     className="bg-white border border-orange-300 text-orange-700 px-3 py-2 rounded-lg font-bold hover:bg-orange-50 text-sm flex items-center gap-1.5"
                  >
                     <ImageIcon className="w-4 h-4"/> {showSource ? 'Ẩn ảnh gốc' : box ? 'Xem ảnh gốc (khung đỏ)' : 'Xem ảnh gốc'}
                  </button>
               )}
               {urlAnhDaCat && onVeLai && (
                  <button
                     type="button"
                     onClick={onVeLai}
                     title="Ảnh chụp mờ thì nhờ AI vẽ lại bằng nét vector, in cỡ nào cũng sắc"
                     className="bg-white border border-sky-400 text-sky-700 px-3 py-2 rounded-lg font-bold hover:bg-sky-50 text-sm flex items-center gap-1.5"
                  >
                     <Sparkles className="w-4 h-4"/> Nhờ AI vẽ lại
                  </button>
               )}
               <button
                  type="button"
                  onClick={onRecrop}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-700 shadow-sm transition-colors flex items-center gap-2 text-sm"
               >
                  <CropIcon className="w-4 h-4"/> Cắt lại Ảnh Này
               </button>
            </div>
         </div>

         {/* Ảnh mờ hoặc quá nhỏ thì mời vẽ lại ngay tại đây, khỏi đợi in ra mới thấy rỗ */}
         {doNet?.nenVeLai && onVeLai && (
            <div className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
               <span className="text-[13px] font-bold text-sky-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {doNet.moTa} (độ nét {doNet.diem}, rộng {doNet.beRong}px) - nên nhờ AI vẽ lại bằng nét vector.
               </span>
               <button
                  type="button"
                  onClick={onVeLai}
                  className="bg-sky-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-sky-700 text-[13px] flex items-center gap-1.5 shrink-0"
               >
                  <Sparkles className="w-4 h-4"/> Vẽ lại hình này
               </button>
            </div>
         )}

         {showSource && meta?.originalUrl && (
            <div className="bg-white border border-orange-100 rounded-lg p-2">
               <div className="text-[11px] font-bold text-gray-500 mb-1">
                  {box ? 'Ảnh trang gốc - khung đỏ là vùng AI đã cắt:' : 'Ảnh trang gốc:'}
               </div>
               <SourceImageWithBox src={meta.originalUrl} box={box} />
            </div>
         )}
      </div>
   );
}
