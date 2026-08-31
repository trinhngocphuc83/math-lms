"use client";

import React from "react";
import { AlertTriangle, CropIcon, PlusCircle, Trash2, ArrowUp, ArrowDown, ListTodo, Type, Image as ImageIcon, MonitorPlay, Database, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, Library, Wand2, Loader2 } from "lucide-react";
import { fixLatexText, applyLatexFixToActiveElement, ensureMathDelimiters, cleanObjectLatex } from "@/utils/latexFixer";
import { bankTypeToBlockType } from "@/utils/questionTypes";
import 'katex/dist/katex.min.css';
import QuestionBankModal from "@/components/admin/QuestionBankModal";
import RichTextarea from "@/components/admin/RichTextarea";
import OSuaTaiCho from "@/components/admin/OSuaTaiCho";
import QuestionPreviewCard, { type PreviewStatement } from "@/components/admin/QuestionPreviewCard";
import SourceImageWithBox from "@/components/admin/SourceImageWithBox";
import { IMAGE_NEEDED_REGEX, IMAGE_PLACEHOLDER_STRIP_REGEX, daChenAnh, canChenAnh, coCanhBaoAI } from "@/utils/aiQuestionScan";
import VeLaiHinhModal from "@/components/admin/VeLaiHinhModal";
import { chamDoNetAnh } from "@/utils/veLaiHinhAI";
import MenuGon, { MucMenu, NganMenu } from "@/components/admin/MenuGon";
import SuaBangAIModal from "@/components/admin/SuaBangAIModal";
import DayCongThucVaoSoTayModal from "@/components/admin/DayCongThucVaoSoTayModal";
import { coMucCongThuc } from "@/utils/congThucCuoiBai";
import { docCoAnh, datCoAnh, demAnh, dangXepNgang, datXepAnh } from "@/utils/coAnhTrongCau";

export interface Block {
  id: string;
  type: 'md' | 'quiz';
  content: any;
}

/** Liệt kê mọi ảnh Markdown trong một đoạn chữ, theo đúng thứ tự. */
const dsAnhTrongChu = (chu: string): string[] =>
  Array.from(String(chu || '').matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)).map(m => m[1]);

/**
 * Đọc chú thích `<!--anh {...}-->` mà cỗ máy cắt ảnh ghi kèm mỗi hình.
 *
 * Khối lý thuyết lưu xuống CSDL là Markdown thuần, không có chỗ đặt metadata như khối
 * trắc nghiệm, nên phải nhờ chú thích HTML - nó không hiện ra màn hình.
 */
const docGhiChuAnh = (chu: string): Record<number, { veLai?: boolean; moNet?: boolean }> => {
  const ra: Record<number, { veLai?: boolean; moNet?: boolean }> = {};
  let i = 0;
  for (const m of String(chu || '').matchAll(/!\[[^\]]*\]\([^)\s]+(?:\s+"[^"]*")?\)\s*(?:<!--anh\s*(\{[^>]*?\})\s*-->)?/g)) {
    if (m[1]) { try { ra[i] = JSON.parse(m[1]); } catch { /* chú thích hỏng thì bỏ qua */ } }
    i++;
  }
  return ra;
};

import { laKhoiQuizHong, cuuKhoiQuizHong, dungLaiCauHoiBangAI } from "@/utils/noiTiepJson";
import { docCauHoiTuAnh, ganAnhVaoCau, coCauCanAnh, taiAnhLenKho } from "@/utils/docCauHoiTuAnh";

export default function BlockEditor({ blocks, onChangeBlocks, onTriggerCrop, globalSourceImage, globalTriggerBankModal }: { blocks: Block[], onChangeBlocks: (b: Block[]) => void, onTriggerCrop: (meta: any, targetBlockId: string) => void, globalSourceImage?: string, globalTriggerBankModal?: number }) {

  const [previewBlocks, setPreviewBlocks] = React.useState<Set<string>>(new Set());

  /** Id khối đang mở hộp "Sửa bằng AI"; null là chưa mở. */

  const [oSuaAI, setOSuaAI] = React.useState<string | null>(null);
  /** Id khối đang mở hộp "Đưa công thức vào Sổ tay". */
  const [oDayCongThuc, setODayCongThuc] = React.useState<string | null>(null);
  const [isBankModalOpen, setIsBankModalOpen] = React.useState(false);
  const [insertIndex, setInsertIndex] = React.useState(-1);
  const [selectedBlocks, setSelectedBlocks] = React.useState<Set<string>>(new Set());
  const [activeBlockId, setActiveBlockId] = React.useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  /** Khối đang được dựng lại thành câu hỏi (để hiện vòng quay chờ trên đúng nút đó). */
  const [dangDungLai, setDangDungLai] = React.useState<string | null>(null);

  /* ---- Dán ảnh một câu hỏi vào ô soạn thảo thì ra khối câu hỏi ---- */

  /** Ảnh vừa dán và khối nhận nó, đang chờ Thầy cô chọn làm gì với ảnh đó. */
  const [anhVuaDan, setAnhVuaDan] = React.useState<{ file: File; idx: number } | null>(null);
  /** Chỗ trả lời cho ô soạn thảo biết ảnh đã được xử lý hay chưa (xem RichTextarea). */
  const traLoiAnhDan = React.useRef<((daXuLy: boolean) => void) | null>(null);
  /** Chữ báo đang làm tới đâu khi đọc ảnh; null là không đọc gì cả. */
  const [dangDocAnh, setDangDocAnh] = React.useState<string | null>(null);

  /**
   * Ô soạn thảo nào cũng gọi cái này khi có ảnh dán vào: dừng lại hỏi Thầy cô ảnh đó là
   * một CÂU HỎI hay chỉ là HÌNH MINH HOẠ.
   *
   * Không tự đoán: hai việc trái ngược nhau, đoán sai một cái là mất công gỡ.
   */
  const hoiVeAnhDan = (idx: number) => (file: File) => new Promise<boolean>((tra) => {
    traLoiAnhDan.current = tra;
    setAnhVuaDan({ file, idx });
  });

  /** Chốt câu trả lời cho ô soạn thảo rồi đóng hộp hỏi. */
  const chotAnhDan = (daXuLy: boolean) => {
    traLoiAnhDan.current?.(daXuLy);
    traLoiAnhDan.current = null;
    setAnhVuaDan(null);
  };

  /**
   * Đọc ảnh thành khối câu hỏi và đặt vào đúng chỗ.
   *
   * Khối đang trống, hoặc đang là JSON hỏng, hoặc vốn đã là khối câu hỏi thì THAY HẲN -
   * đây chính là lúc Thầy cô muốn chữa một câu ra sai. Khối lý thuyết đang có chữ thì
   * chèn xuống DƯỚI, không đụng vào bài đang soạn.
   */
  const docAnhThanhCauHoi = async (file: File, idx: number) => {
    setDangDocAnh('Đang đọc ảnh...');
    try {
      const items = await docCauHoiTuAnh([file], setDangDocAnh);

      if (coCauCanAnh(items)) {
        setDangDocAnh('Đang tải hình vẽ lên...');
        ganAnhVaoCau(items, await taiAnhLenKho(file));
      }

      const moi: Block[] = items.map((it) => ({
        id: Math.random().toString(36).substring(7),
        type: 'quiz',
        content: cleanObjectLatex(it),
      }));

      const ra = [...blocks];
      const cu = ra[idx];
      const chuCu = typeof cu?.content === 'string' ? cu.content : '';
      const thayHan = !cu || cu.type === 'quiz' || !chuCu.trim() || laKhoiQuizHong(chuCu);
      if (thayHan) ra.splice(idx, 1, ...moi);
      else ra.splice(idx + 1, 0, ...moi);
      onChangeBlocks(ra);

      alert(`Đã đọc ảnh ra ${items.length} câu hỏi.\n\nThầy/Cô soát lại đề và đáp án rồi bấm Lưu.`);
    } catch (e: any) {
      alert('Không đọc được ảnh này: ' + (e?.message || 'lỗi không rõ'));
    } finally {
      setDangDocAnh(null);
    }
  };

  /**
   * Dựng một khối Văn bản lỡ chứa JSON câu hỏi thành các KHỐI CÂU HỎI đàng hoàng.
   *
   * Hai nước: vá tại chỗ trước (tức thì, không tốn lượt AI); vá không nổi mới nhờ AI dựng
   * lại. AI chỉ được sửa ĐỊNH DẠNG, không được viết thêm câu hay đổi nội dung.
   */
  const dungLaiThanhCauHoi = async (blockId: string) => {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx < 0 || blocks[idx].type !== 'md') return;
    const chu = typeof blocks[idx].content === 'string' ? blocks[idx].content : '';

    /* Dọn đúng như đường dán vẫn dọn: bỏ chữ "Câu 3." dính ở đầu đề (số thứ tự do khối
       tự đánh lại) và vá công thức LaTeX vỡ trong JSON. */
    const apDung = (items: any[], nguon: string) => {
      const moi: Block[] = items.map((it) => {
        if (it.question) it.question = String(it.question).replace(/^(Câu|Bài)\s*\d+[\.\:\-\s]*/i, '');
        return {
          id: Math.random().toString(36).substring(7),
          type: 'quiz' as const,
          content: cleanObjectLatex(it),
        };
      });
      const ra = [...blocks];
      ra.splice(idx, 1, ...moi);
      onChangeBlocks(ra);
      alert(`Đã dựng lại thành ${items.length} câu hỏi (${nguon}).\n\nThầy/Cô soát lại nội dung rồi bấm Lưu.`);
    };

    const taiCho = cuuKhoiQuizHong(chu);
    if (taiCho) { apDung(taiCho, 'vá tại chỗ'); return; }

    if (!window.confirm(
      'Khối này hỏng nặng, vá tại chỗ không được.\n\nNhờ AI dựng lại không? '
      + 'AI chỉ sửa định dạng, giữ nguyên nội dung từng câu.',
    )) return;

    setDangDungLai(blockId);
    try {
      const items = await dungLaiCauHoiBangAI(chu);
      apDung(items, 'AI dựng lại');
    } catch (e: any) {
      alert('Không dựng lại được: ' + (e?.message || 'lỗi không rõ'));
    } finally {
      setDangDungLai(null);
    }
  };

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
              {/* Đầu khối: đo được 93px, nay rút còn ~44px. Bốn nút gom vào menu ba chấm,
                  chỉ chừa "Xem Trước" ra ngoài vì hay dùng nhất. */}
              <div className="bg-gray-50 border-b border-gray-200 px-3 py-1.5 flex justify-between items-center gap-2 rounded-t-xl z-20 relative overflow-x-auto">
                  <div className="flex items-center gap-2 font-bold text-gray-700 text-[13px] whitespace-nowrap">
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
                     {block.type === 'md'
                        ? <><Type className="w-4 h-4 text-indigo-500 shrink-0"/> <span className="hidden sm:inline">Khối Lý Thuyết</span></>
                        : <><ListTodo className="w-4 h-4 text-teal-500 shrink-0"/> <span className="hidden sm:inline">Câu hỏi</span></>}

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
                           className="ml-1 border border-gray-300 rounded-md px-1.5 py-0.5 text-[12px] bg-white font-medium text-gray-700 outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer max-w-[190px]"
                        >
                           <option value="multiple_choice">Trắc nghiệm 4 lựa chọn</option>
                           <option value="true_false_cluster">Đúng/Sai 4 Ý (Barem 2025)</option>
                           <option value="true_false">Đúng / Sai (Truyền thống)</option>
                           <option value="short_answer">Trả lời ngắn / Điền khuyết</option>
                           <option value="essay">Tự luận / Trình bày chi tiết</option>
                        </select>
                     )}
                  </div>
                  <div className="flex gap-1 items-center shrink-0">
                      {/* Đưa mục "CÔNG THỨC CẦN NHỚ" của bài vào Sổ tay bằng một nút - khỏi
                          phải sang trang Sổ tay gõ lại từng công thức. */}
                      {block.type === 'md' && (
                         <button
                            onClick={() => setODayCongThuc(block.id)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-colors border ${
                               coMucCongThuc(typeof block.content === 'string' ? block.content : '')
                                  ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                                  : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-500'
                            }`}
                            title="Đưa mục CÔNG THỨC CẦN NHỚ của bài này vào Sổ tay công thức"
                         >
                            <Library className="w-3.5 h-3.5"/> <span className="hidden lg:inline">Vào Sổ tay</span>
                         </button>
                      )}
                      {/* Khối chữ mà bên trong lại là JSON câu hỏi: dấu hiệu đợt dán bị hỏng rào
                          mã. Bày nút dựng lại ngay tại đây, khỏi phải xóa đi dán lại từ đầu. */}
                      {block.type === 'md' && laKhoiQuizHong(typeof block.content === 'string' ? block.content : '') && (
                         <button
                            onClick={() => dungLaiThanhCauHoi(block.id)}
                            disabled={dangDungLai === block.id}
                            title="Khối này thực ra là câu hỏi bị hỏng rào mã - bấm để dựng lại thành các câu đúng"
                            className="flex items-center gap-1 px-2 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-md text-[11px] font-bold transition-colors"
                         >
                            {dangDungLai === block.id
                               ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                               : <Wand2 className="w-3.5 h-3.5" />}
                            <span className="hidden lg:inline">Dựng lại thành câu hỏi</span>
                         </button>
                      )}
                      <button
                         onClick={() => setOSuaAI(block.id)}
                         className="flex items-center gap-1 px-2 py-1 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 rounded-md text-[11px] font-bold transition-colors"
                         title={block.type === 'md'
                            ? "Nhờ AI sửa bài giảng theo yêu cầu - gõ hoặc nói"
                            : "Nhờ AI sửa đề hoặc đáp án theo yêu cầu - gõ hoặc nói"}
                      >
                         <Sparkles className="w-3.5 h-3.5"/> <span className="hidden lg:inline">Sửa bằng AI</span>
                      </button>
                      <button onClick={() => togglePreview(block.id)} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${previewBlocks.has(block.id) ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'}`} title="Bật/Tắt chế độ chia đôi màn hình: sửa bên trái, xem trước bên phải"><MonitorPlay className="w-3.5 h-3.5"/> <span className="hidden lg:inline">Xem Trước</span></button>

                      {/* Các việc còn lại gom vào menu ba chấm - trước đây bày hết ra hàng
                          ngang nên đầu khối cao 93px và trên điện thoại còn tràn khỏi màn. */}
                      <MenuGon nhan="⋯" title="Việc khác" canhPhai rong="w-[230px]">
                         <MucMenu nhan="Đưa lên trên" icon={<ArrowUp className="w-4 h-4"/>}
                                  onClick={() => moveBlock(idx, -1)} disabled={idx === 0} />
                         <MucMenu nhan="Đưa xuống dưới" icon={<ArrowDown className="w-4 h-4"/>}
                                  onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1} />
                         <NganMenu />
                         <MucMenu nhan="Sửa lỗi LaTeX" icon={<span>🪄</span>}
                                  moTa="Dọn dấu \ và $$ bị lỗi"
                                  onClick={() => handleFixLatex(idx)} />
                         <MucMenu nhan="Chèn thêm ảnh" icon={<CropIcon className="w-4 h-4"/>}
                                  onClick={() => onTriggerCrop(globalSourceImage ? { originalUrl: globalSourceImage } : {}, block.id)} />
                      </MenuGon>

                      {/* Xoá để NGOÀI, không giấu trong menu ba chấm: nằm trong đó thì tìm
                          không ra. Vẫn hỏi lại trước khi xoá như cũ. */}
                      <button
                         onClick={() => removeBlock(idx)}
                         title="Xoá khối này"
                         className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-rose-50
                                    border border-gray-200 hover:border-rose-300 text-gray-400
                                    hover:text-rose-600 rounded-md transition-colors"
                      >
                         <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                  </div>
              </div>

              <div className="p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className={previewBlocks.has(block.id) ? "grid grid-cols-1 xl:grid-cols-2 gap-4 items-start" : ""}>
                <div className="min-w-0 flex flex-col gap-3">
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

                       {/*
                         * CHỈNH ẢNH NGAY TRONG KHỐI LÝ THUYẾT.
                         *
                         * Khối trắc nghiệm đã có mấy nút này trong AutoCropReviewPanel, còn
                         * khối lý thuyết thì chưa - muốn đổi cỡ ảnh phải tự gõ tay
                         * ![...](url "nho"). Chỉ hiện khi trong khối thật sự có ảnh.
                         */}
                       {(() => {
                          const chu = typeof block.content === 'string' ? block.content : '';
                          const soAnh = demAnh(chu);
                          if (soAnh === 0) return null;
                          const co = docCoAnh(chu);
                          const ngang = dangXepNgang(chu);
                          return (
                            <div className="flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-200">
                               <span className="text-[11px] font-black text-sky-700 uppercase tracking-wide">
                                  {soAnh} ảnh
                               </span>
                               <div className="flex items-center gap-1">
                                  {([['nho', 'Nhỏ'], ['vua', 'Vừa'], ['to', 'To']] as const).map(([ma, ten]) => (
                                     <button key={ma}
                                        onClick={() => updateBlockContent(idx, datCoAnh(chu, ma))}
                                        title={`Đổi mọi ảnh trong khối sang cỡ ${ten.toLowerCase()}`}
                                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors border ${
                                           co === ma
                                              ? 'bg-sky-600 text-white border-sky-600'
                                              : 'bg-white text-sky-700 border-sky-200 hover:bg-sky-100'
                                        }`}>
                                        {ten}
                                     </button>
                                  ))}
                               </div>
                               {/* Xếp ngang chỉ có nghĩa khi có từ 2 ảnh trở lên */}
                               {soAnh > 1 && (
                                  <button
                                     onClick={() => updateBlockContent(idx, datXepAnh(chu, !ngang))}
                                     title={ngang
                                        ? 'Đang xếp ngang - bấm để xếp dọc, mỗi ảnh một dòng'
                                        : 'Đang xếp dọc - bấm để hai ảnh nằm ngang song song'}
                                     className="px-2 py-1 rounded-md text-[11px] font-bold border bg-white text-sky-700 border-sky-200 hover:bg-sky-100">
                                     {ngang ? '⇄ Xếp ngang' : '⇅ Xếp dọc'}
                                  </button>
                               )}
                               {/* Vẽ lại bằng nét vector - đúng cỗ máy khối trắc nghiệm dùng.
                                   Ảnh nào máy chấm là mờ thì tô vàng để nhắc. */}
                               {(() => {
                                  const ds = dsAnhTrongChu(chu);
                                  const ghi = docGhiChuAnh(chu);
                                  return ds.map((u, i) => {
                                     const g = ghi[i] || {};
                                     if (g.veLai) return null;
                                     return (
                                       <button key={u + i}
                                          onClick={() => setOVeLai({ idx, urlCu: u })}
                                          title={g.moNet
                                             ? 'Máy chấm ảnh này hơi mờ - nên nhờ AI vẽ lại bằng nét vector'
                                             : 'Nhờ AI vẽ lại hình này bằng nét vector, in cỡ nào cũng sắc'}
                                          className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-colors flex items-center gap-1 ${
                                             g.moNet
                                                ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                                                : 'bg-white border-sky-200 text-sky-700 hover:bg-sky-100'
                                          }`}>
                                          ✨ Vẽ lại{ds.length > 1 ? ` ${i + 1}` : ''}
                                       </button>
                                     );
                                  });
                               })()}
                               <button
                                  onClick={() => onTriggerCrop(globalSourceImage ? { originalUrl: globalSourceImage } : {}, block.id)}
                                  title="Cắt và chèn thêm một ảnh nữa vào khối này"
                                  className="ml-auto px-2 py-1 rounded-md text-[11px] font-bold border bg-white text-sky-700 border-sky-200 hover:bg-sky-100 flex items-center gap-1">
                                  <CropIcon className="w-3.5 h-3.5"/> Chèn thêm ảnh
                               </button>
                            </div>
                          );
                       })()}

                       {/*
                         * HIỆN TƯỜNG MINH, nhấp vào mới sửa - đúng cách khối trắc nghiệm đang
                         * làm. Bài lý thuyết trung bình 8.767 ký tự, nhìn thấy thành phẩm ngay
                         * thì soát nhanh hơn hẳn đọc mã Markdown thô.
                         */}
                       <OSuaTaiCho
                           rows={10}
                           value={typeof block.content === 'string' ? block.content : ''}
                           onChange={v => updateBlockContent(idx, v)}
                           xuLyAnhDan={hoiVeAnhDan(idx)}
                           placeholder="Bấm để soạn bài giảng... (Markdown, LaTeX - dán ảnh câu hỏi để đọc thành câu)"
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
                             viTriAnh={block.content.viTriAnh || 'phai'}
                             onDoiViTri={(v) => updateBlockContent(idx, { ...block.content, viTriAnh: v })}
                             coAnh={docCoAnh(block.content.question)}
                             onDoiCoAnh={(v) => updateBlockContent(idx, {
                                ...block.content, question: datCoAnh(block.content.question, v as any),
                             })}
                             soAnhTrongCau={demAnh(block.content.question)}
                             xepNgang={dangXepNgang(block.content.question)}
                             onDoiXepAnh={(ngang) => updateBlockContent(idx, {
                                ...block.content, question: datXepAnh(block.content.question, ngang),
                             })}
                             onRecrop={() => onTriggerCrop(block.content.autoCropMetadata, block.id)}
                             urlAnhDaCat={layAnhTrongCau(block.content.question)}
                             onVeLai={() => {
                                const url = layAnhTrongCau(block.content.question);
                                if (url) setOVeLai({ idx, urlCu: url });
                             }}
                             onQuayVeAnhChup={() => {
                                const cu = layAnhTrongCau(block.content.question);
                                const anhChup = block.content.autoCropMetadata?.urlAnhCat;
                                if (!cu || !anhChup) return;
                                updateBlockContent(idx, {
                                   ...block.content,
                                   question: String(block.content.question || '').split(cu).join(anhChup),
                                   autoCropMetadata: { ...block.content.autoCropMetadata, daVeLai: false },
                                });
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

                       <OSuaTaiCho
                          rows={3}
                          value={block.content.question || ""}
                          onChange={v => updateBlockContent(idx, { ...block.content, question: v })}
                          xuLyAnhDan={hoiVeAnhDan(idx)}
                          placeholder="Bấm để nhập câu hỏi... (Markdown hỗ trợ - dán ảnh đề để máy đọc lại cả câu)"
                       />

                       {(block.content.type === 'multiple_choice' || !block.content.type) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             {[0,1,2,3].map(optIdx => (
                               <div key={optIdx} className="flex flex-col gap-1">
                                  <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                     <input type="radio" name={`q_${block.id}`} checked={block.content.answerIndex === optIdx} onChange={() => updateBlockContent(idx, { ...block.content, answerIndex: optIdx })} className="text-teal-600" />
                                     Đáp án {['A','B','C','D'][optIdx]}
                                  </label>
                                  <OSuaTaiCho
                                     co="nho"
                                     rows={2}
                                     value={block.content.options?.[optIdx] || ""}
                                     onChange={v => {
                                        const newOpts = [...(block.content.options || ["","","",""])];
                                        newOpts[optIdx] = v;
                                        updateBlockContent(idx, { ...block.content, options: newOpts });
                                     }}
                                     placeholder="Bấm để nhập phương án..."
                                     className="w-full border border-teal-400 rounded p-2 text-sm outline-none ring-2 ring-teal-500/10"
                                  />
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
                                  <OSuaTaiCho
                                     co="nho"
                                     rows={2}
                                     value={block.content.options?.[optIdx] || ""}
                                     onChange={v => {
                                        const newOpts = [...(block.content.options || ["",""])];
                                        newOpts[optIdx] = v;
                                        updateBlockContent(idx, { ...block.content, options: newOpts });
                                     }}
                                     placeholder="Bấm để nhập phương án..."
                                     className="w-full border border-teal-400 rounded p-2 text-sm outline-none ring-2 ring-teal-500/10"
                                  />
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
                                     <OSuaTaiCho
                                        co="nho"
                                        rows={2}
                                        value={opt.content || ""}
                                        onChange={v => {
                                           const newOpts = [...block.content.options];
                                           newOpts[optIdx] = { ...opt, content: v };
                                           updateBlockContent(idx, { ...block.content, options: newOpts });
                                        }}
                                        placeholder="Bấm để nhập nội dung mệnh đề..."
                                        className="w-full border border-teal-400 rounded-lg p-2.5 text-sm outline-none ring-2 ring-teal-500/10"
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
                             <OSuaTaiCho
                                rows={1}
                                value={block.content.exactAnswer || ""}
                                onChange={v => updateBlockContent(idx, { ...block.content, exactAnswer: v })}
                                placeholder="Bấm để nhập đáp án. VD: 12.5 hoặc $\frac{3\pi}{8}$"
                                className="w-full border border-teal-400 rounded-lg p-2.5 outline-none ring-2 ring-teal-500/10 font-bold"
                             />
                          </div>
                       )}

                       <div className="mt-4 pt-4 border-t border-gray-100">
                          <label className="text-xs font-bold text-gray-600 mb-2 block text-indigo-700">✍️ Hướng dẫn giải / Lời giải chi tiết</label>
                          <OSuaTaiCho
                             rows={4}
                             value={block.content.answer || block.content.sampleAnswer || block.content.explanation || ""}
                             onChange={v => updateBlockContent(idx, { ...block.content, answer: v, sampleAnswer: v })}
                             placeholder="Bấm để nhập hướng dẫn giải..."
                             className="w-full border border-teal-400 p-2 rounded outline-none ring-2 ring-teal-500/10"
                          />
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

        {/* Nhờ AI sửa đề/đáp án theo lời dặn - gõ hoặc nói. Bản sửa KHÔNG tự thay vào
            khối: hộp bày bảng đối chiếu trước/sau, thầy cô bấm nhận mới thay. */}
        {/* Đưa công thức cuối bài vào Sổ tay. Cái nào đã có trong kho thì bỏ tick sẵn,
            dùng chính cơ chế chống trùng toàn kho. */}
        <DayCongThucVaoSoTayModal
           isOpen={!!oDayCongThuc}
           onClose={() => setODayCongThuc(null)}
           noiDungBai={(() => {
              const b = blocks.find(x => x.id === oDayCongThuc);
              return typeof b?.content === 'string' ? b.content : '';
           })()}
        />

        <SuaBangAIModal
           isOpen={!!oSuaAI}
           onClose={() => setOSuaAI(null)}
           cau={oSuaAI ? (blocks.find(b => b.id === oSuaAI)?.content ?? null) : null}
           onNhan={(cauMoi) => {
              const i = blocks.findIndex(b => b.id === oSuaAI);
              if (i >= 0) updateBlockContent(i, cauMoi);
           }}
        />

        {/* Dán ảnh vào ô soạn thảo: hỏi ảnh đó là câu hỏi hay hình minh hoạ.
            Hai việc trái ngược nhau nên KHÔNG tự đoán - đoán sai là mất công gỡ. */}
        {anhVuaDan && (
           <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => chotAnhDan(true)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
                 <h3 className="font-bold text-gray-800 text-lg mb-1">Ảnh vừa dán là gì?</h3>
                 <p className="text-[13px] text-gray-500 mb-4 leading-relaxed">
                    Nếu là ảnh chụp một câu hỏi, máy sẽ đọc ra thành khối câu hỏi đầy đủ đề,
                    phương án và lời giải — dùng để chữa những câu bị hỏng mã.
                 </p>
                 <div className="flex flex-col gap-2">
                    <button
                       onClick={() => { const { file, idx } = anhVuaDan; chotAnhDan(true); docAnhThanhCauHoi(file, idx); }}
                       className="flex items-center gap-2 w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition-colors"
                    >
                       <Wand2 className="w-4 h-4 shrink-0" /> Ảnh một câu hỏi — đọc thành khối câu hỏi
                    </button>
                    <button
                       onClick={() => chotAnhDan(false)}
                       className="flex items-center gap-2 w-full px-4 py-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-xl font-bold text-sm transition-colors"
                    >
                       <ImageIcon className="w-4 h-4 shrink-0" /> Hình minh hoạ — chèn ảnh vào bài
                    </button>
                    <button onClick={() => chotAnhDan(true)}
                            className="w-full py-2 text-gray-500 hover:text-gray-700 text-[13px] font-medium">
                       Huỷ, không làm gì cả
                    </button>
                 </div>
              </div>
           </div>
        )}

        {/* Chắn màn lúc máy đang đọc ảnh: bấm lung tung giữa chừng dễ đổi mất khối đích. */}
        {dangDocAnh && (
           <div className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl px-6 py-5 flex items-center gap-3">
                 <Loader2 className="w-5 h-5 text-teal-600 animate-spin shrink-0" />
                 <span className="font-bold text-gray-700 text-sm">{dangDocAnh}</span>
              </div>
           </div>
        )}

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
              if (!b) return;

              /* Khối lý thuyết là chuỗi Markdown: thay đúng địa chỉ ảnh cũ, và đánh dấu
                 vào chú thích để lần sau không mời vẽ lại nữa. */
              if (b.type === 'md') {
                 const cu = String(b.content || '');
                 let moi = cu.split(oVeLai.urlCu).join(urlMoi);
                 const chuThich = `<!--anh {"veLai":true}-->`;
                 const daCo = new RegExp(
                    '!\\[[^\\]]*\\]\\(' + urlMoi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    + '(?:\\s+"[^"]*")?\\)\\s*<!--anh',
                 ).test(moi);
                 if (!daCo) {
                    moi = moi.replace(
                       new RegExp('(!\\[[^\\]]*\\]\\(' + urlMoi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\s+"[^"]*")?\\))'),
                       `$1\n${chuThich}`,
                    );
                 }
                 updateBlockContent(oVeLai.idx, moi);
                 setOVeLai(null);
                 return;
              }

              if (b.type !== 'quiz') return;
              // Thay đúng địa chỉ ảnh cũ trong nội dung câu, giữ nguyên mọi thứ khác
              const moi = String(b.content.question || '').split(oVeLai.urlCu).join(urlMoi);
              updateBlockContent(oVeLai.idx, {
                 ...b.content,
                 question: moi,
                 // Ghi nhớ ảnh chụp cũ để còn quay về, và đánh dấu đây là bản vẽ lại
                 autoCropMetadata: {
                    ...(b.content.autoCropMetadata || {}),
                    urlAnhCat: b.content.autoCropMetadata?.urlAnhCat || oVeLai.urlCu,
                    daVeLai: true,
                 },
              });
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
function AutoCropReviewPanel({ meta, onRecrop, urlAnhDaCat, onVeLai, onQuayVeAnhChup, viTriAnh, onDoiViTri,
                              coAnh, onDoiCoAnh, soAnhTrongCau = 0, xepNgang, onDoiXepAnh }: {
   meta: any;
   onRecrop: () => void;
   /** Ảnh đặt ở đâu so với đề bài khi học sinh làm bài. */
   viTriAnh?: string;
   onDoiViTri?: (v: string) => void;
   /** Cỡ ảnh hiện tại ('nho' | 'vua' | 'to'), đọc từ tiêu đề ảnh trong nội dung câu. */
   coAnh?: string;
   onDoiCoAnh?: (v: string) => void;
   /** Số ảnh trong câu, và hai ảnh có đang nằm ngang không (liền dòng, không dòng trống). */
   soAnhTrongCau?: number;
   xepNgang?: boolean;
   onDoiXepAnh?: (ngang: boolean) => void;
   /** Ảnh đã cắt đang nằm trong nội dung câu - để chấm độ nét và vẽ lại. */
   urlAnhDaCat?: string;
   onVeLai?: () => void;
   /** Bỏ bản vẽ lại, dùng lại đúng ảnh chụp đã cắt. */
   onQuayVeAnhChup?: () => void;
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
      // Lúc quét đề đã chấm sẵn rồi thì dùng lại, khỏi tải ảnh về chấm lần nữa
      if (meta?.doNet) { setDoNet(meta.doNet); return; }
      if (!urlAnhDaCat || meta?.daVeLai) { setDoNet(null); return; }
      let con = true;
      chamDoNetAnh(urlAnhDaCat).then(k => { if (con) setDoNet(k); }).catch(() => { if (con) setDoNet(null); });
      return () => { con = false; };
   }, [urlAnhDaCat, meta?.doNet, meta?.daVeLai]);

   // Khung báo ảnh: đo được 133px, nay rút còn MỘT hàng ~40px. Lời dặn dài và các nút ít
   // dùng gom vào menu ⋯; chỉ chừa ra ngoài thứ hay bấm nhất là ô chọn vị trí ảnh.
   return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5 flex flex-col gap-2">
         <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0 text-orange-800 font-bold text-[12.5px] whitespace-nowrap">
               <ImageIcon className="w-4 h-4 shrink-0"/>
               {meta?.daVeLai ? 'Hình máy vẽ lại' : box ? 'Ảnh đã cắt' : 'Ảnh gốc'}
               {meta?.daVeLai && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-700 border border-sky-300">
                     nét vector
                  </span>
               )}
               <span
                  className="text-[11px] font-medium text-orange-600/80 hidden xl:inline truncate max-w-[280px]"
                  title={meta?.daVeLai
                     ? 'Máy VẼ LẠI chứ không làm sạch - soi kỹ từng con số, sai thì quay về ảnh chụp.'
                     : 'Đối chiếu với ảnh gốc để chắc chắn cắt đúng hình của câu này.'}
               >
                  · {meta?.daVeLai ? 'soi kỹ từng con số' : 'nên đối chiếu ảnh gốc'}
               </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
               {/*
                  Vị trí ảnh so với đề bài. Hình vuông vắn như đồ thị, bảng biến thiên đặt
                  bên cạnh đề thì học sinh vừa đọc vừa nhìn hình, khỏi cuộn lên cuộn xuống.
                  CHỈ đổi cách bày trên màn hình; xuất Word vẫn để ảnh dưới đề, vì Word chỉ
                  xếp cạnh nhau được bằng bảng mà bảng thì khó sửa tay.
               */}
               {onDoiViTri && (
                  <div className="flex items-center gap-0.5 bg-white border border-orange-200 rounded-lg p-0.5" title="Ảnh nằm ở đâu so với đề bài">
                     {([['duoi', 'Dưới đề'], ['phai', 'Bên phải'], ['trai', 'Bên trái']] as const).map(([ma, ten]) => (
                        <button
                           key={ma}
                           type="button"
                           onClick={() => onDoiViTri(ma)}
                           className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                              (viTriAnh || 'phai') === ma ? 'bg-orange-600 text-white' : 'text-orange-700 hover:bg-orange-50'
                           }`}
                        >
                           {ten}
                        </button>
                     ))}
                  </div>
               )}
               {/* Cỡ ảnh: ghi vào TIÊU ĐỀ của cú pháp ảnh Markdown chuẩn `![...](url "vua")`.
                   Đo 14 ảnh thật trong kho thì nhỏ nhất 211px, lớn nhất 3124px - chênh 15
                   lần bề rộng, nên không thể để một cỡ chung cho tất cả. */}
               {onDoiCoAnh && (
                  <div className="flex items-center gap-0.5 bg-white border border-orange-200 rounded-lg p-0.5" title="Cỡ ảnh khi hiện ra">
                     {([['nho', 'Nhỏ'], ['vua', 'Vừa'], ['to', 'To']] as const).map(([ma, ten]) => (
                        <button
                           key={ma}
                           type="button"
                           onClick={() => onDoiCoAnh(ma)}
                           className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                              (coAnh || 'vua') === ma ? 'bg-orange-600 text-white' : 'text-orange-700 hover:bg-orange-50'
                           }`}
                        >
                           {ten}
                        </button>
                     ))}
                  </div>
               )}

               {/* Từ hai ảnh trở lên mới có chuyện xếp ngang hay dọc */}
               {onDoiXepAnh && soAnhTrongCau > 1 && (
                  <button
                     type="button"
                     onClick={() => onDoiXepAnh(!xepNgang)}
                     title={xepNgang ? 'Đang xếp ngang - bấm để chuyển sang xếp dọc' : 'Đang xếp dọc - bấm để hai ảnh nằm ngang'}
                     className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white border border-orange-200 text-orange-700 hover:bg-orange-50 transition-colors whitespace-nowrap"
                  >
                     {xepNgang ? '⇄ Xếp ngang' : '⇅ Xếp dọc'}
                  </button>
               )}

               <MenuGon nhan="⋯" title="Việc với ảnh" canhPhai rong="w-[250px]">
                  {meta?.originalUrl && (
                     <MucMenu
                        nhan={showSource ? 'Ẩn ảnh gốc' : 'Xem ảnh gốc'}
                        moTa={box ? 'Có khung đỏ đánh dấu vùng đã cắt' : undefined}
                        icon={<ImageIcon className="w-4 h-4"/>}
                        onClick={() => setShowSource(v => !v)}
                     />
                  )}
                  {urlAnhDaCat && onVeLai && (
                     <MucMenu
                        nhan={meta?.daVeLai ? 'Vẽ lại lượt khác' : 'Nhờ AI vẽ lại'}
                        moTa="Ảnh mờ thì vẽ bằng nét vector, in cỡ nào cũng sắc"
                        icon={<Sparkles className="w-4 h-4"/>}
                        onClick={onVeLai}
                     />
                  )}
                  {/* Bản vẽ lại sai số liệu thì phải có đường lui - ảnh chụp vẫn giữ nguyên
                      trên Storage nên chỉ việc trỏ lại vào nó. */}
                  {meta?.daVeLai && meta?.urlAnhCat && onQuayVeAnhChup && (
                     <MucMenu
                        nhan="Quay về ảnh chụp"
                        moTa="Dùng lại đúng ảnh cắt ra từ tài liệu"
                        icon={<ImageIcon className="w-4 h-4"/>}
                        onClick={onQuayVeAnhChup}
                     />
                  )}
                  <NganMenu />
                  <MucMenu
                     nhan="Cắt lại ảnh này"
                     moTa="Tự chọn lại vùng cắt nếu AI cắt lệch"
                     icon={<CropIcon className="w-4 h-4"/>}
                     onClick={onRecrop}
                  />
               </MenuGon>
            </div>
         </div>

         {!meta?.daVeLai && meta?.lyDoKhongVeLai && (
            <p className="text-[11.5px] text-gray-500">
               Máy không vẽ lại được hình này: {meta.lyDoKhongVeLai}
            </p>
         )}

         {/* Ảnh mờ hoặc quá nhỏ thì mời vẽ lại ngay tại đây, khỏi đợi in ra mới thấy rỗ */}
         {doNet?.nenVeLai && onVeLai && (
            <div className="bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2">
               <span className="text-[12px] font-bold text-sky-800 flex items-center gap-1.5 min-w-0">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{doNet.moTa} (độ nét {doNet.diem}, rộng {doNet.beRong}px)</span>
               </span>
               <button
                  type="button"
                  onClick={onVeLai}
                  className="bg-sky-600 text-white px-2.5 py-1 rounded-lg font-bold hover:bg-sky-700 text-[12px] flex items-center gap-1.5 shrink-0"
               >
                  <Sparkles className="w-3.5 h-3.5"/> Vẽ lại
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
