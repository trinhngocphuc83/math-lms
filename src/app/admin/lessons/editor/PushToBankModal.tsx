"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from "@/utils/supabase/client";
import { X, UploadCloud, Loader2, Database, Info, ChevronDown, ChevronUp, Tag, AlertTriangle, Copy, ClipboardPaste, CheckCircle2 } from 'lucide-react';
import {
  blockTypeToBankType,
  toDifficultyCode,
  normalizeQuestionForCompare,
} from '@/utils/questionTypes';
import { findMatchingChapterTitle } from '@/utils/topicMatch';
import { buildDetectFormsPrompt, parseDetectFormsResponse, type DetectFormsResultItem } from '@/utils/detectFormsPrompt';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';

interface PushToBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: any[];
  courseContext: {
    grade: string;
    subject: string;
    topic: string;
    lesson: string;
    courseName?: string; // Tên khóa học để tự detect grade/subject
  };
}

/* ===== Component ComboBox (Lai giữa Select & Input) ===== */
function ComboBox({ value, onChange, options, placeholder, width }: { value: string, onChange: (v: string) => void, options: string[], placeholder: string, width: string | number }) {
  const [isCustom, setIsCustom] = useState(false);
  
  // Nếu đang nhập tay hoặc value hiện tại không nằm trong options (tức là tự gõ trước đó)
  const showInput = isCustom || (value && !options.includes(value));

  if (showInput) {
      return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input 
                  autoFocus={isCustom}
                  value={value} 
                  onChange={e => onChange(e.target.value)}
                  placeholder={placeholder}
                  style={{ border: '1px solid #93c5fd', borderRadius: 6, padding: '3px 8px', fontSize: 12, width, background: '#fff' }} 
              />
              {/* Nút này XOÁ giá trị để quay lại danh sách chọn. Trước đây tooltip chỉ ghi
                  "Quay lại chọn danh sách" nên dễ hiểu nhầm, trong khi nó xoá Tên bài của
                  mọi câu hỏi cùng lúc. Nay ghi rõ và có hỏi lại. */}
              <button
                type="button"
                title="Xoá nội dung đang gõ để chọn lại từ danh sách"
                onClick={() => {
                  if (value && !confirm(`Xoá "${value}" khỏi tất cả câu hỏi trong danh sách?`)) return;
                  setIsCustom(false);
                  onChange('');
                }}
                style={{ background: 'none', border: 'none', fontSize: 13, color: '#ef4444', cursor: 'pointer', padding: 2 }}
              >✕</button>
          </div>
      );
  }

  return (
      <select
          value={value}
          onChange={e => {
              if (e.target.value === '__custom__') {
                  setIsCustom(true);
                  onChange('');
              } else {
                  onChange(e.target.value);
              }
          }}
          style={{ border: '1px solid #93c5fd', borderRadius: 6, padding: '3px 8px', fontSize: 12, width, background: '#fff', cursor: 'pointer' }}
      >
          <option value="">{placeholder}</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          <option value="__custom__">✏️ Nhập mới...</option>
      </select>
  );
}

/* ===== Component Modal Nhập Dạng Bài Mới ===== */
function AddNewCategoryModal({
  isOpen, onClose, onSave, 
  initialContext, uniqueGrades, uniqueSubjects, uniqueTopics, uniqueLessons, supabase
}: any) {
  const [ctx, setCtx] = useState(initialContext);
  const [formName, setFormName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCtx(initialContext);
      setFormName("");
    }
  }, [isOpen, initialContext]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formName.trim()) return alert("Tên Dạng bài không được để trống!");
    if (!ctx.grade || !ctx.subject || !ctx.topic) return alert("Vui lòng chọn đầy đủ Lớp, Môn, Chương!");
    
    setIsSaving(true);
    try {
      const payload = {
        grade: ctx.grade,
        subject: ctx.subject,
        topic: ctx.topic,
        lesson: ctx.lesson || '',
        math_form: formName.trim()
      };
      
      const { data: existing } = await supabase.from('question_categories')
         .select('id')
         .eq('grade', ctx.grade)
         .eq('subject', ctx.subject)
         .eq('topic', ctx.topic)
         .eq('lesson', ctx.lesson || '')
         .eq('math_form', formName.trim())
         .maybeSingle();
         
      if (!existing) {
         const { error } = await supabase.from('question_categories').insert([payload]);
         if (error) throw error;
      }
      
      alert("Đã lưu Dạng bài mới thành công!");
      onSave(formName.trim());
      onClose();
    } catch (e: any) {
      alert("Lỗi lưu Dạng bài: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
       <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
           <h3 style={{ margin: 0, fontSize: 18, color: '#1e293b' }}>Thêm Dạng bài mới</h3>
           <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
         </div>
         
         <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <div>
               <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Tên Dạng Bài Toán (*):</label>
               <input 
                 autoFocus
                 value={formName} 
                 onChange={e => setFormName(e.target.value)}
                 placeholder="Ví dụ: Tìm khoảng biến thiên của mẫu số liệu ghép nhóm..."
                 style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 12px', fontSize: 14 }}
               />
            </div>
            
            <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
               <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>Chỉ định vị trí lưu Dạng bài này trong Ngân hàng:</div>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <ComboBox value={ctx.grade} onChange={v => setCtx((p:any) => ({...p, grade: v}))} options={uniqueGrades} placeholder="-- Lớp --" width={90} />
                  <ComboBox value={ctx.subject} onChange={v => setCtx((p:any) => ({...p, subject: v}))} options={uniqueSubjects} placeholder="-- Môn --" width={110} />
                  <ComboBox value={ctx.topic} onChange={v => setCtx((p:any) => ({...p, topic: v}))} options={uniqueTopics} placeholder="-- Chương --" width="100%" />
                  <ComboBox value={ctx.lesson} onChange={v => setCtx((p:any) => ({...p, lesson: v}))} options={uniqueLessons} placeholder="-- Bài (Tùy chọn) --" width="100%" />
               </div>
            </div>
         </div>

         <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
            <button onClick={handleSave} disabled={isSaving} style={{ padding: '8px 16px', border: 'none', borderRadius: 6, background: '#8b5cf6', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              Lưu vào Ngân Hàng
            </button>
         </div>
       </div>
    </div>
  );
}

/* ===== Tự động detect Lớp và Môn từ tên khóa học ===== */
function autoDetectGradeSubject(courseName: string): { grade: string; subject: string } {
  if (!courseName) return { grade: '', subject: '' };
  const name = courseName.toLowerCase();

  // Detect Lớp: tìm pattern "lớp X", "lop X", "khối X", "L10", "10", "11", "12"
  let grade = '';
  const gradeMatch = name.match(/(?:lớp|lop|khối|khoi|l)\s*(\d{1,2})/i) || name.match(/\b(10|11|12|[6-9])\b/);
  if (gradeMatch) grade = gradeMatch[1];

  // KHÔNG tự đoán Môn nữa. Tên khóa học chỉ cho biết "Toán", trong khi ngân hàng
  // phân theo phân môn ("Đại số", "Hình học"). Đoán bừa sẽ đẻ ra môn thứ ba và
  // làm phân mảnh danh mục. Để giáo viên chọn từ danh sách môn đang có,
  // bước kiểm tra trước khi lưu sẽ chặn nếu còn bỏ trống.
  return { grade, subject: '' };
}

/* ===== Thuật toán nhận dạng Dạng Toán tự động (TF-IDF chuẩn & N-grams) ===== */
function autoDetectMathForm(content: string, explanation: string, forms: string[]): string {
  if (!forms || forms.length === 0) return '';
  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, ""); 
  const text = normalize(content + ' ' + (explanation || ''));
  
  // Tính Tần suất xuất hiện (IDF) của các từ trong tất cả các forms
  const stopWords = ['tim', 'tinh', 'cac', 'cua', 'va', 'cho', 'trong', 'la', 'mot', 'co', 'de', 'bai', 'toan'];
  const idf: Record<string, number> = {};
  for (const f of forms) {
      if (!f) continue;
      const ws = Array.from(new Set(normalize(f).split(/\s+/).filter(w => w.length > 1 && !stopWords.includes(w))));
      for (const w of ws) idf[w] = (idf[w] || 0) + 1;
  }
  const totalForms = forms.length;
  for (const w in idf) {
      // Công thức IDF chuẩn: Math.log(N/df). Từ phổ biến (xuất hiện trong mọi form) sẽ có điểm = 0 (bị loại).
      idf[w] = Math.log(totalForms / idf[w]); 
  }

  let bestForm = '';
  let maxScore = 0;

  for (const form of forms) {
    if (!form) continue;
    const formNorm = normalize(form);
    if (text.includes(formNorm)) return form; // Khớp chính xác 100%
    
    // KHÔNG dùng Set ở đây để giữ nguyên thứ tự từ vựng cho tính toán N-gram
    const words = formNorm.split(/\s+/).filter(w => w.length > 1 && !stopWords.includes(w));
    if (words.length === 0) continue;
    
    let score = 0;

    // Tính MaxScore dựa trên từ vựng KHÔNG TRÙNG LẶP để không bị cộng lố
    const uniqueWords = Array.from(new Set(words));
    for (const w of uniqueWords) {
      const weight = idf[w] || 0;
      if (text.includes(w)) {
        score += weight;
      }
    }
    
    // Bỏ N-gram bonus và chia maxScore vì nó gây lạm phát điểm cho những từ rác phổ biến
    const finalScore = score;
    
    // Ngưỡng tối thiểu (1.5 là đủ cho 2-3 từ khóa sau khi đã loại stop words)
    if (finalScore > maxScore && finalScore >= 1.5) { 
       maxScore = finalScore;
       bestForm = form;
    }
  }
  return bestForm;
}

/**
 * Xác định Dạng toán cho một câu hỏi, kể cả câu Đúng/Sai 4 mệnh đề.
 *
 * Trước đây MỌI câu Đúng/Sai đều bị gán cứng "Toán tổng hợp" ngay khi mở modal,
 * bất kể 4 mệnh đề có thực sự thuộc nhiều dạng khác nhau hay không. Nay xét
 * riêng từng mệnh đề: cùng 1 dạng thì gán đúng dạng đó, khác dạng thì mới gán
 * "Tổng hợp", không nhận diện được ý nào thì để trống cho AI/giáo viên xử lý.
 */
function resolveMathForm(q: any, forms: string[], tongHopLabel: string): string {
  if (q.question_type === 'true_false_cluster') {
    const statements = [q.option_a, q.option_b, q.option_c, q.option_d]
      .map((s: string) => String(s || '').trim())
      .filter(Boolean);
    if (statements.length === 0) return '';

    const detected = statements
      .map((s: string) => autoDetectMathForm(s, '', forms))
      .filter(Boolean);
    const unique = Array.from(new Set(detected));

    if (unique.length === 0) return ''; // không nhận diện được mệnh đề nào
    if (unique.length === 1) return unique[0] as string; // cả 4 ý cùng 1 dạng
    return tongHopLabel; // các ý thuộc nhiều dạng khác nhau
  }

  return autoDetectMathForm(q.content, q.explanation, forms);
}

/* ===== Tự gán mức độ dựa trên vị trí câu trong bài ===== */
// Trước đây hàm này gán mức độ theo VỊ TRÍ trong danh sách (25% đầu = Nhận biết...),
// nên câu khó xếp đầu bị gán "Nhận biết" còn câu dễ xếp cuối bị gán "Vận dụng cao".
// Nay để trống và bắt giáo viên chọn (có nút gán hàng loạt ở thanh trên).

/* ===== Parse quiz blocks ===== */
function parseQuizBlocks(blocks: any[], ctx: PushToBankModalProps['courseContext']) {
  if (!blocks || !Array.isArray(blocks)) return [];
  const quizBlocks = blocks.filter(b => b.type === 'quiz' && b.content);

  // Tự detect nếu grade/subject trống
  const detected = autoDetectGradeSubject(ctx.courseName || '');
  const grade = ctx.grade || detected.grade || '';
  const subject = ctx.subject || detected.subject || '';

  return quizBlocks.map((b, index) => {
    const c = b.content;
    const blockType = c.type || 'multiple_choice';
    const questionText = c.question || "";

    let option_a = "", option_b = "", option_c = "", option_d = "";
    let correct_answer = "";
    let explanation = c.sampleAnswer || c.explanation || c.answer || "";

    if (blockType === "multiple_choice" || blockType === "true_false") {
      const opts = c.options || [];
      option_a = typeof opts[0] === 'string' ? opts[0] : (opts[0]?.content || "");
      option_b = typeof opts[1] === 'string' ? opts[1] : (opts[1]?.content || "");
      option_c = typeof opts[2] === 'string' ? opts[2] : (opts[2]?.content || "");
      option_d = typeof opts[3] === 'string' ? opts[3] : (opts[3]?.content || "");
      correct_answer = ['A', 'B', 'C', 'D'][c.answerIndex ?? 0] || 'A';
    } else if (blockType === "short_answer") {
      correct_answer = c.exactAnswer || c.answer || c.correctAnswer || "";
    } else if (blockType === "true_false_cluster") {
      const stmts = c.options || c.statements || [];
      option_a = stmts[0]?.content || stmts[0]?.text || "";
      option_b = stmts[1]?.content || stmts[1]?.text || "";
      option_c = stmts[2]?.content || stmts[2]?.text || "";
      option_d = stmts[3]?.content || stmts[3]?.text || "";
      correct_answer = stmts.map((s: any) => s.isTrue ? "Đ" : "S").join("");
    } else if (blockType === "essay") {
      correct_answer = c.sampleAnswer || c.answer || "";
    }

    const typeLabels: Record<string, string> = {
      'multiple_choice': 'Trắc nghiệm', 'true_false': 'Đúng/Sai',
      'true_false_cluster': 'Đúng/Sai 4 ý', 'short_answer': 'Trả lời ngắn', 'essay': 'Tự luận',
    };

    return {
      id: b.id || `q_${index}_${Date.now()}`,
      grade, subject,
      topic: ctx.topic || "", lesson: ctx.lesson || "",
      math_form: "",
      difficulty: '',
      question_type: blockType,
      type_label: typeLabels[blockType] || 'Khác',
      question_type_label: typeLabels[blockType] || blockType,
      content: questionText,
      option_a, option_b, option_c, option_d,
      correct_answer, explanation,
      image_url: c.imageUrl || "",
    };
  });
}

export default function PushToBankModal({ isOpen, onClose, blocks, courseContext }: PushToBankModalProps) {
  const [isPushing, setIsPushing] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editCtx, setEditCtx] = useState({ grade: '', subject: '', topic: '', lesson: '' });
  const [categories, setCategories] = useState<any[]>([]); // Dạng toán từ DB
  const [mathFormFilter, setMathFormFilter] = useState(''); // Dropdown filter cho dạng toán chung
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState<{isOpen: boolean, targetId: string}>({isOpen: false, targetId: ''});
  // Dạng toán MỚI do AI đề xuất (chưa có trong Ngân hàng) - chờ giáo viên duyệt tại chỗ,
  // không tự áp dụng ngay để tránh sinh danh mục rác nếu AI đặt tên chưa chuẩn.
  const [pendingFormSuggestions, setPendingFormSuggestions] = useState<Record<string, string>>({});
  // Phòng khi Cổng AI của hệ thống báo lỗi (hết quota, quá tải 503...): giáo viên
  // tự copy prompt dán vào Gemini Web/ChatGPT, rồi dán kết quả JSON ngược lại đây.
  const [showManualDetectModal, setShowManualDetectModal] = useState(false);
  const [manualDetectPrompt, setManualDetectPrompt] = useState('');
  const [manualDetectInput, setManualDetectInput] = useState('');
  const [manualDetectError, setManualDetectError] = useState('');
  const [manualDetectCopied, setManualDetectCopied] = useState(false);
  const hasParsedRef = useRef(false);
  const supabase = createClient();

  // Chỉ parse 1 lần khi modal mở
  useEffect(() => {
    if (isOpen && !hasParsedRef.current) {
      hasParsedRef.current = true;
      const parsed = parseQuizBlocks(blocks, courseContext);
      setQuestions(parsed);

      // Detect grade/subject
      const detected = autoDetectGradeSubject(courseContext.courseName || '');
      setEditCtx({
        grade: courseContext.grade || detected.grade || '',
        subject: courseContext.subject || detected.subject || '',
        topic: courseContext.topic || '',
        lesson: courseContext.lesson || '',
      });

      setCollapsed({});

      // Fetch danh mục dạng toán từ DB và tự động nhận diện
      fetchCategories(parsed);
    }
    if (!isOpen) {
      hasParsedRef.current = false;
    }
  }, [isOpen]);

  const fetchCategories = async (currentQs: any[]) => {
    try {
      const { data } = await supabase.from('question_categories').select('*');
      if (data) {
         setCategories(data);

         // Bảng chapters (nguồn của courseContext.topic) và question_categories.topic
         // dùng khác định dạng (số La Mã/số thường, viết hoa toàn bộ/đầu câu...) nên
         // so khớp tuyệt đối luôn thất bại. Đối chiếu mờ để nhận ra cùng một Chương,
         // rồi dùng lại đúng chuỗi đã có trong ngân hàng - nhờ vậy dropdown Chương/Bài
         // không còn hiện dạng "khoá" (input tự do) và phạm vi Dạng toán đối chiếu
         // đúng chương đang soạn thay vì phải dò trên toàn bộ ngân hàng.
         // Tính bối cảnh NGAY TẠI ĐÂY thay vì đọc state editCtx.
         // Trước đây đọc editCtx từ closure nên luôn nhận giá trị CŨ (rỗng lúc modal
         // vừa mở), khiến mọi bộ lọc đều lọt và hàm dò chạy trên toàn bộ ~229 dạng
         // toán của mọi chương. Kết quả là câu hỏi bị gán dạng của chương khác, mà
         // dropdown chỉ liệt kê dạng của chương đang soạn nên hiện TRỐNG.
         const baseCtx = {
            grade: courseContext.grade || autoDetectGradeSubject(courseContext.courseName || '').grade || '',
            subject: courseContext.subject || '',
            topic: courseContext.topic || '',
            lesson: courseContext.lesson || '',
         };

         const sameGradeTopics = Array.from(new Set(
            data.filter(c => !baseCtx.grade || c.grade === baseCtx.grade).map(c => c.topic)
         )).filter(Boolean) as string[];
         const matchedTopic = baseCtx.topic
            ? (findMatchingChapterTitle(baseCtx.topic, sameGradeTopics) || baseCtx.topic)
            : '';

         const effectiveCtx = { ...baseCtx, topic: matchedTopic };

         setEditCtx(prevCtx => (
            matchedTopic && matchedTopic !== prevCtx.topic ? { ...prevCtx, topic: matchedTopic } : prevCtx
         ));

         const globalForms = Array.from(new Set(data.map(c => c.math_form))).filter(Boolean) as string[];
         const globalTongHop = globalForms.find(f => /tổng hợp/i.test(f)) || "Toán tổng hợp";

         // Chỉ dò trong phạm vi Chương/Bài đang soạn. Nếu chương này chưa có dạng nào
         // thì để trống cho AI hoặc giáo viên xử lý, KHÔNG lấy bừa dạng của chương khác.
         const scopedForms = Array.from(new Set(
            data.filter(c =>
               (!effectiveCtx.grade || c.grade === effectiveCtx.grade) &&
               (!effectiveCtx.subject || c.subject === effectiveCtx.subject) &&
               (!effectiveCtx.topic || c.topic === effectiveCtx.topic) &&
               (!effectiveCtx.lesson || c.lesson === effectiveCtx.lesson)
            ).map(c => c.math_form)
         )).filter(Boolean) as string[];

         if (scopedForms.length > 0) {
            setQuestions(prev => prev.map(q => {
               if (q.math_form) return q;
               const detected = resolveMathForm(q, scopedForms, globalTongHop);
               return detected ? { ...q, math_form: detected } : q;
            }));
         }
      }
    } catch (e) { console.error('[PushToBank] Fetch categories error:', e); }
  };

  // Lọc dạng toán phù hợp với Bối cảnh hiện tại (Lớp, Môn, Chương, Bài)
  const relevantCategories = categories.filter(c =>
    (!editCtx.grade || c.grade === editCtx.grade) &&
    (!editCtx.subject || c.subject === editCtx.subject) &&
    (!editCtx.topic || c.topic === editCtx.topic) &&
    (!editCtx.lesson || c.lesson === editCtx.lesson)
  );

  const relevantForms = Array.from(new Set(relevantCategories.map(c => c.math_form))).filter(Boolean).sort();

  // Tạo danh sách dropdown động (Datalist) cho các ô Lớp, Môn, Chương, Bài
  const uniqueGrades = Array.from(new Set(categories.map(c => c.grade))).filter(Boolean).sort();
  const uniqueSubjects = Array.from(new Set(categories.filter(c => !editCtx.grade || c.grade === editCtx.grade).map(c => c.subject))).filter(Boolean).sort();
  const uniqueTopics = Array.from(new Set(categories.filter(c => (!editCtx.grade || c.grade === editCtx.grade) && (!editCtx.subject || c.subject === editCtx.subject)).map(c => c.topic))).filter(Boolean).sort();
  const uniqueLessons = Array.from(new Set(categories.filter(c => (!editCtx.grade || c.grade === editCtx.grade) && (!editCtx.subject || c.subject === editCtx.subject) && (!editCtx.topic || c.topic === editCtx.topic)).map(c => c.lesson))).filter(Boolean).sort();

  // === Handlers ===
  const handleAutoDetectAll = () => {
     let count = 0;
     const allForms = Array.from(new Set(categories.map(c => c.math_form))).filter(Boolean) as string[];
     const formsToUse = relevantForms.length > 0 ? relevantForms : allForms;
     
     if (formsToUse.length === 0) {
        alert("Chưa có danh sách Dạng bài nào trong hệ thống để đối chiếu!");
        return;
     }
     
     const globalTongHop = allForms.find(f => /tổng hợp/i.test(f)) || "Toán tổng hợp";

     setQuestions(prev => {
        const next = prev.map(q => {
           if (!q.math_form) {
              // Câu Đúng/Sai: xét riêng từng mệnh đề, chỉ gán "Tổng hợp" khi các
              // mệnh đề THỰC SỰ thuộc nhiều dạng khác nhau (không gán cứng nữa).
              const detected = resolveMathForm(q, formsToUse, globalTongHop);
              if (detected) {
                 count++;
                 return { ...q, math_form: detected };
              }
           }
           return q;
        });

        setTimeout(() => {
           if (count > 0) alert(`✨ Đã nhận diện và điền tự động Dạng bài cho ${count} câu hỏi trống!`);
           else alert("Không tìm thấy Dạng bài nào phù hợp với các câu hỏi đang trống.");
        }, 100);
        
        return next;
     });
  };

  /**
   * Bối cảnh dùng chung cho cả luồng AI tự động lẫn luồng dán tay: danh sách Dạng
   * toán trong phạm vi chương, nhãn "Tổng hợp", và các câu còn thiếu Dạng toán
   * hoặc Mức độ (kèm câu đang gán dạng ngoài phạm vi chương đang soạn).
   */
  const getDetectFormsContext = () => {
    const allForms = Array.from(new Set(categories.map(c => c.math_form))).filter(Boolean) as string[];
    const formsToUse = relevantForms.length > 0 ? relevantForms : allForms;
    const globalTongHop = allForms.find(f => /tổng hợp/i.test(f)) || "Toán tổng hợp";

    const emptyQs = questions.filter(q =>
       !q.math_form ||
       !q.difficulty ||
       (!formsToUse.includes(q.math_form) && q.math_form !== globalTongHop)
    );

    return { allForms, formsToUse, globalTongHop, emptyQs };
  };

  /**
   * Áp dụng kết quả { id: { form, isNew, difficulty } } vào danh sách câu hỏi.
   * Dùng chung cho cả kết quả gọi AI tự động lẫn kết quả dán tay từ Gemini Web -
   * cùng một quy tắc áp dụng (dạng có sẵn thì điền ngay, dạng mới thì chờ duyệt,
   * Mức độ chỉ điền vào ô đang trống) để hai luồng không bao giờ lệch nhau.
   */
  const applyDetectFormsResult = (
    data: Record<string, DetectFormsResultItem>,
    expectedIds: string[]
  ) => {
    let formCount = 0;
    let difficultyCount = 0;
    let missingCount = 0;
    const newSuggestions: Record<string, string> = {};

    // Tính trước danh sách câu hỏi mới trên một bản chụp `questions` hiện tại
    // (KHÔNG dùng updater `prev => ...` của setQuestions) vì React chạy updater
    // đó bất đồng bộ ở lần render sau - nếu đếm formCount/difficultyCount/
    // newSuggestions bên trong updater rồi return ngay sau setQuestions() thì
    // các biến đếm luôn bằng 0 khi đọc, và newSuggestions luôn rỗng nên đề xuất
    // Dạng toán MỚI không bao giờ được đưa vào hàng chờ duyệt.
    const nextQuestions = questions.map(q => {
         if (!expectedIds.includes(q.id)) return q;

         const result = data[q.id];
         if (!result) {
            missingCount++;
            return q;
         }

         const patch: any = {};

         if (result.form) {
            if (result.isNew) {
               // Dạng mới -> chờ duyệt, chưa gán vào câu hỏi
               newSuggestions[q.id] = result.form;
            } else {
               patch.math_form = result.form;
               formCount++;
            }
         }

         // Chỉ điền vào ô Mức độ đang trống để không đè lên lựa chọn giáo viên
         // đã tự đặt trước đó.
         if (result.difficulty && !q.difficulty) {
            patch.difficulty = result.difficulty;
            difficultyCount++;
         }

         return Object.keys(patch).length > 0 ? { ...q, ...patch } : q;
    });

    setQuestions(nextQuestions);

    if (Object.keys(newSuggestions).length > 0) {
      setPendingFormSuggestions(prev => ({ ...prev, ...newSuggestions }));
    }

    return { formCount, difficultyCount, missingCount, newCount: Object.keys(newSuggestions).length };
  };

  const reportDetectFormsResult = (source: string, r: { formCount: number; difficultyCount: number; missingCount: number; newCount: number }) => {
    const parts: string[] = [];
    if (r.formCount > 0) parts.push(`điền Dạng toán cho ${r.formCount} câu`);
    if (r.difficultyCount > 0) parts.push(`điền Mức độ cho ${r.difficultyCount} câu`);
    if (r.newCount > 0) parts.push(`đề xuất ${r.newCount} Dạng toán MỚI đang chờ Thầy duyệt (khung màu cam dưới câu hỏi)`);
    if (r.missingCount > 0) parts.push(`còn ${r.missingCount} câu chưa xử lý được, Thầy chọn tay giúp`);
    alert(parts.length ? `✨ ${source} đã ${parts.join('; ')}.` : `${source} không nhận diện được câu nào.`);
  };

  const handleAutoDetectGemini = async () => {
    const { allForms, formsToUse, globalTongHop, emptyQs } = getDetectFormsContext();
    if (emptyQs.length === 0) {
       alert("Tất cả câu hỏi đã có đủ Dạng toán và Mức độ!");
       return;
    }

    setGeminiLoading(true);
    try {
        const res = await fetch('/api/admin/detect-forms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                questions: emptyQs.map(q => ({
                  id: q.id,
                  question_type: q.question_type,
                  content: q.content,
                  // Với câu Đúng/Sai, gửi kèm 4 mệnh đề để AI xét xem có thực sự
                  // thuộc nhiều dạng khác nhau hay không, thay vì gán cứng "Tổng hợp".
                  statements: q.question_type === 'true_false_cluster'
                    ? [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean)
                    : undefined,
                })),
                formsToUse,
                allForms,
                tongHopLabel: globalTongHop,
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Lỗi máy chủ");
        }

        const result = applyDetectFormsResult(data, emptyQs.map(q => q.id));
        setTimeout(() => reportDetectFormsResult('AI Gemini', result), 100);
    } catch (e: any) {
        console.error(e);
        // Gọi AI tự động thất bại (hết quota, quá tải, mất mạng...) - gợi ý ngay
        // lối thoát bằng tay thay vì chỉ báo lỗi rồi thôi.
        if (confirm("Lỗi khi gọi AI Gemini: " + e.message + "\n\nDùng cách THỦ CÔNG (dán tay vào Gemini Web) luôn không?")) {
          openManualDetectModal();
        }
    } finally {
        setGeminiLoading(false);
    }
  };

  /** Mở hộp thoại thủ công: sinh sẵn prompt để giáo viên copy dán vào Gemini Web/ChatGPT. */
  const openManualDetectModal = () => {
    const { formsToUse, globalTongHop, emptyQs } = getDetectFormsContext();
    if (emptyQs.length === 0) {
       alert("Tất cả câu hỏi đã có đủ Dạng toán và Mức độ!");
       return;
    }

    const prompt = buildDetectFormsPrompt({
      questions: emptyQs.map(q => ({
        id: q.id,
        question_type: q.question_type,
        content: q.content,
        statements: q.question_type === 'true_false_cluster'
          ? [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean)
          : undefined,
      })),
      formsToUse,
      globalTongHop,
      forManualCopy: true,
    });

    setManualDetectPrompt(prompt);
    setManualDetectInput('');
    setManualDetectError('');
    setManualDetectCopied(false);
    setShowManualDetectModal(true);
  };

  const handleCopyManualPrompt = async () => {
    try {
      await navigator.clipboard.writeText(manualDetectPrompt);
      setManualDetectCopied(true);
      setTimeout(() => setManualDetectCopied(false), 2000);
    } catch {
      alert("Không copy được tự động. Thầy bôi đen và copy thủ công đoạn văn bản bên dưới giúp.");
    }
  };

  /** Đọc kết quả JSON dán tay từ Gemini Web/ChatGPT rồi áp dụng như luồng tự động. */
  const applyManualDetectInput = () => {
    if (!manualDetectInput.trim()) {
      setManualDetectError('Chưa dán nội dung kết quả vào ô bên dưới.');
      return;
    }

    const { allForms, emptyQs } = getDetectFormsContext();

    try {
      const data = parseDetectFormsResponse(manualDetectInput, allForms);
      const result = applyDetectFormsResult(data, emptyQs.map(q => q.id));
      setShowManualDetectModal(false);
      setTimeout(() => reportDetectFormsResult('Kết quả dán tay', result), 100);
    } catch (e: any) {
      setManualDetectError('Không đọc được kết quả: ' + e.message + '. Kiểm tra lại đã dán đúng và đủ đoạn JSON AI trả về chưa.');
    }
  };

  /** Duyệt một Dạng toán mới do AI đề xuất -> áp dụng cho câu hỏi đó. */
  const approveNewForm = (questionId: string, formName: string) => {
    const name = formName.trim();
    if (!name) return;
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, math_form: name } : q));
    setPendingFormSuggestions(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  /** Bỏ đề xuất Dạng toán mới, để trống cho giáo viên tự chọn. */
  const rejectNewForm = (questionId: string) => {
    setPendingFormSuggestions(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const handleUpdateField = (id: string, field: string, value: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleBatchMathForm = (value: string) => {
    setMathFormFilter(value);
    setQuestions(prev => prev.map(q => ({ ...q, math_form: value })));
  };

  const handleBatchDifficulty = (value: string) => {
    if (!value) return;
    setQuestions(prev => prev.map(q => ({ ...q, difficulty: value })));
  };

  const handleUpdateContext = (field: string, value: string) => {
    setEditCtx(prev => ({ ...prev, [field]: value }));
    setQuestions(prev => prev.map(q => ({ ...q, [field]: value })));
  };

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const collapseAll = () => {
    const c: Record<string, boolean> = {};
    questions.forEach(q => { c[q.id] = true; });
    setCollapsed(c);
  };

  const expandAll = () => setCollapsed({});

  /**
   * Soát lỗi trước khi đẩy. Mỗi mục gồm nhãn và danh sách id câu bị thiếu,
   * dùng cả cho bảng cảnh báo lẫn việc tô đỏ từng câu trong danh sách.
   */
  const blockingIssues = React.useMemo(() => {
    const issues: { key: string; label: string; ids: string[] }[] = [];
    const add = (key: string, label: string, filter: (q: any) => boolean) => {
      const ids = questions.filter(filter).map(q => q.id);
      if (ids.length) issues.push({ key, label, ids });
    };

    add('lesson', 'Thiếu Tên bài', q => !String(q.lesson || '').trim());
    add('topic', 'Thiếu Chuyên đề (Chương)', q => !String(q.topic || '').trim());
    add('grade', 'Thiếu Lớp', q => !String(q.grade || '').trim());
    add('subject', 'Thiếu Môn', q => !String(q.subject || '').trim());
    add('math_form', 'Thiếu Dạng toán', q => !String(q.math_form || '').trim());
    add('difficulty', 'Chưa chọn Mức độ', q => !toDifficultyCode(q.difficulty));
    add('answer', 'Chưa có đáp án đúng', q =>
      q.question_type !== 'essay' && !String(q.correct_answer || '').trim());
    add('options', 'Thiếu phương án trả lời', q =>
      (q.question_type === 'multiple_choice' || q.question_type === 'true_false_cluster') &&
      ![q.option_a, q.option_b, q.option_c, q.option_d].every(o => String(o || '').trim()));

    return issues;
  }, [questions]);

  /** Tập hợp id các câu đang có vấn đề, để tô đỏ trong danh sách */
  const problemIds = React.useMemo(
    () => new Set(blockingIssues.flatMap(i => i.ids)),
    [blockingIssues]
  );

  /** Các câu trùng nhau ngay trong đợt đẩy này */
  const duplicateInBatchIds = React.useMemo(() => {
    const seen = new Map<string, string>();
    const dups = new Set<string>();
    for (const q of questions) {
      const key = normalizeQuestionForCompare(q.content);
      if (!key) continue;
      if (seen.has(key)) dups.add(q.id);
      else seen.set(key, q.id);
    }
    return dups;
  }, [questions]);

  const handlePushAll = async () => {
    if (questions.length === 0) return alert("Không có câu hỏi nào.");

    // Chặn lưu khi còn thiếu thông tin bắt buộc - trước đây ghi thẳng vào CSDL
    // nên sinh ra hàng loạt câu mất Tên bài, mất Dạng toán, chưa chọn đáp án.
    if (blockingIssues.length > 0) {
      alert(
        '⚠️ Chưa thể đẩy vào Ngân hàng vì còn thiếu thông tin:\n\n' +
        blockingIssues.map(i => `• ${i.label}: ${i.ids.length} câu`).join('\n') +
        '\n\nCác câu thiếu đã được tô đỏ trong danh sách bên dưới.'
      );
      return;
    }

    setIsPushing(true);
    try {
      const inserts = questions.map(q => ({
        question_id: `CH_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        grade: q.grade, subject: q.subject, topic: q.topic, lesson: q.lesson,
        math_form: q.math_form,
        // Quy đổi sang mã chuẩn của ngân hàng (NLC/DS/TLN/TL và mức độ 1-4).
        // Trước đây ghi thẳng mã tiếng Anh nên câu hỏi lọt khỏi mọi bộ lọc.
        question_type: blockTypeToBankType(q.question_type),
        difficulty: toDifficultyCode(q.difficulty) ?? '',
        content: q.content, option_a: q.option_a, option_b: q.option_b,
        option_c: q.option_c, option_d: q.option_d, correct_answer: q.correct_answer,
        explanation: q.explanation, image_url: q.image_url, usage_count: 0
      }));

      // Bỏ câu trùng nhau NGAY TRONG đợt đẩy này (giữ câu đầu tiên)
      const seen = new Set<string>();
      const deduped = inserts.filter(q => {
        const key = normalizeQuestionForCompare(q.content);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const dupInBatch = inserts.length - deduped.length;

      // Đối chiếu với toàn bộ ngân hàng theo nội dung đã chuẩn hoá
      // (trước đây chỉ so khớp tuyệt đối nên lệch một dấu cách là lọt).
      const { data: bankRows } = await supabase
        .from('questions')
        .select('content')
        .eq('grade', deduped[0]?.grade || '')
        .eq('subject', deduped[0]?.subject || '');

      const bankKeys = new Set(
        (bankRows || []).map(r => normalizeQuestionForCompare(r.content)).filter(Boolean)
      );
      const newInserts = deduped.filter(q => !bankKeys.has(normalizeQuestionForCompare(q.content)));
      const dupInBank = deduped.length - newInserts.length;
      const duplicateCount = dupInBatch + dupInBank;

      if (newInserts.length === 0) {
         alert(
           `⚠️ Không có câu nào mới để đẩy.\n\n` +
           `• Trùng trong chính đợt này: ${dupInBatch} câu\n` +
           `• Đã có sẵn trong Ngân hàng: ${dupInBank} câu`
         );
         setIsPushing(false);
         return;
      }

      // Chỉ tạo danh mục khi có ĐỦ 5 thành phần - trước đây thiếu tên bài vẫn tạo,
      // sinh ra các danh mục rỗng nằm rác trong hệ thống.
      const newCats = newInserts
        .filter(q => q.grade && q.subject && q.topic && q.lesson && q.math_form)
        .map(q => ({
          grade: q.grade, subject: q.subject, topic: q.topic, lesson: q.lesson, math_form: q.math_form
        }));
      const uniqueNewCats = Array.from(new Set(newCats.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
      
      if (uniqueNewCats.length > 0) {
         const { data: existings } = await supabase.from('question_categories').select('grade,subject,topic,lesson,math_form');
         const existSet = new Set((existings || []).map(c => `${c.grade}|${c.subject}|${c.topic}|${c.lesson}|${c.math_form}`));
         const toInsert = uniqueNewCats.filter(c => !existSet.has(`${c.grade}|${c.subject}|${c.topic}|${c.lesson}|${c.math_form}`));
         
         if (toInsert.length > 0) {
             const { error: catErr } = await supabase.from('question_categories').insert(toInsert);
             if (catErr) console.warn("Lỗi thêm category:", catErr);
         }
      }
      
      const { error } = await supabase.from('questions').insert(newInserts);
      if (error) throw error;
      
      alert(
        `✅ Đã đẩy ${newInserts.length} câu mới vào Ngân hàng!` +
        (dupInBatch > 0 ? `\n• Bỏ qua ${dupInBatch} câu trùng nhau trong đợt này` : '') +
        (dupInBank > 0 ? `\n• Bỏ qua ${dupInBank} câu đã có sẵn trong Ngân hàng` : '')
      );
      onClose();
    } catch (e: any) {
      console.error(e);
      alert("❌ Lỗi: " + e.message);
    } finally { setIsPushing(false); }
  };

  // Đếm loại
  const typeCounts = questions.reduce((acc: Record<string, number>, q) => {
    acc[q.question_type_label] = (acc[q.question_type_label] || 0) + 1;
    return acc;
  }, {});

  // Đếm theo mức độ
  const diffCounts = questions.reduce((acc: Record<string, number>, q) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ background: '#fff', width: '100%', maxWidth: 1100, maxHeight: '92vh', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ===== HEADER ===== */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fae8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UploadCloud style={{ width: 18, height: 18, color: '#a21caf' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>Đưa vào Ngân hàng câu hỏi</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {questions.length} câu • {Object.entries(typeCounts).map(([k, v]) => `${v} ${k}`).join(' • ')}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
            <X style={{ width: 16, height: 16, color: '#94a3b8' }} />
          </button>
        </div>

        {/* ===== BODY ===== */}
        <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '16px 20px', background: '#f1f5f9' }}>

          {/* Bối cảnh - chỉnh sửa được */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: '#1e40af' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Info style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Bối cảnh tự động (có thể chỉnh sửa):</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', alignItems: 'center' }}>
                  <label style={{ fontWeight: 700, fontSize: 12 }}>Lớp:</label>
                  <ComboBox value={editCtx.grade} onChange={v => handleUpdateContext('grade', v)} options={uniqueGrades} placeholder="-- Lớp --" width={80} />

                  <label style={{ fontWeight: 700, fontSize: 12 }}>Môn:</label>
                  <ComboBox value={editCtx.subject} onChange={v => handleUpdateContext('subject', v)} options={uniqueSubjects} placeholder="-- Môn --" width={100} />

                  <label style={{ fontWeight: 700, fontSize: 12 }}>Chương:</label>
                  <ComboBox value={editCtx.topic} onChange={v => handleUpdateContext('topic', v)} options={uniqueTopics} placeholder="-- Chương --" width={220} />

                  <label style={{ fontWeight: 700, fontSize: 12 }}>Bài:</label>
                  <ComboBox value={editCtx.lesson} onChange={v => handleUpdateContext('lesson', v)} options={uniqueLessons} placeholder="-- Bài --" width={220} />
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar: áp dụng chung + thống kê mức độ */}
          {questions.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>Áp dụng chung:</span>
                <div style={{ position: 'relative' }}>
                  <select
                    value={mathFormFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        setShowAddCategoryModal({isOpen: true, targetId: 'all'});
                      } else {
                        setMathFormFilter(val);
                        setQuestions(prev => prev.map(q => ({ ...q, math_form: val })));
                      }
                    }}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '3px 8px', fontSize: 12, minWidth: 180, background: '#fff', cursor: 'pointer' }}
                  >
                    <option value="">-- Chọn dạng bài --</option>
                    {relevantForms.map(form => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                    <option value="__custom__">✏️ Nhập dạng mới...</option>
                  </select>
                </div>
                <select
                  onChange={(e) => {
                    const diff = e.target.value;
                    if (diff) setQuestions(prev => prev.map(q => ({ ...q, difficulty: diff })));
                    e.target.value = "";
                  }}
                  style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '3px 8px', fontSize: 12, background: '#fff', cursor: 'pointer' }}
                >
                  <option value="">Độ khó...</option>
                  <option value="Nhận biết">Tất cả Nhận biết</option>
                  <option value="Thông hiểu">Tất cả Thông hiểu</option>
                  <option value="Vận dụng">Tất cả Vận dụng</option>
                  <option value="Vận dụng cao">Tất cả Vận dụng cao</option>
                </select>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#f8fafc', padding: '4px 6px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <button 
                    onClick={handleAutoDetectGemini}
                    disabled={geminiLoading}
                    style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', opacity: geminiLoading ? 0.6 : 1 }}
                  >
                    {geminiLoading ? '⏳ Đang phân tích...' : '✨ Dùng AI (Hệ thống)'}
                  </button>
                  <div style={{ width: 1, height: 16, background: '#cbd5e1', margin: '0 4px' }}></div>
                  <button
                    onClick={handleAutoDetectAll}
                    style={{ background: 'none', border: 'none', color: '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                    title="Dùng thuật toán cơ bản (Offline)"
                  >
                    Dùng thuật toán
                  </button>
                  <div style={{ width: 1, height: 16, background: '#cbd5e1', margin: '0 4px' }}></div>
                  <button
                    type="button"
                    onClick={openManualDetectModal}
                    title="Dùng khi Cổng AI của hệ thống báo lỗi (hết quota, quá tải...) - tự dán vào Gemini Web/ChatGPT"
                    style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <ClipboardPaste style={{ width: 12, height: 12 }} /> Thủ công
                  </button>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button onClick={expandAll} type="button" style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>▼ Mở tất cả</button>
                  <button onClick={collapseAll} type="button" style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>▲ Thu gọn</button>
                </div>
              </div>

              {/* Thống kê phân bổ mức độ */}
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'].map(level => {
                  const colors: Record<string, string> = { 'Nhận biết': '#3b82f6', 'Thông hiểu': '#10b981', 'Vận dụng': '#f59e0b', 'Vận dụng cao': '#ef4444' };
                  const count = diffCounts[level] || 0;
                  return (
                    <span key={level} style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                      background: count > 0 ? `${colors[level]}15` : '#f1f5f9',
                      color: count > 0 ? colors[level] : '#94a3b8',
                      border: `1px solid ${count > 0 ? `${colors[level]}30` : '#e2e8f0'}`
                    }}>
                      {level}: {count}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== DANH SÁCH CÂU HỎI ===== */}
          {questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <Database style={{ width: 40, height: 40, margin: '0 auto 8px', opacity: 0.5 }} />
              <div>Không tìm thấy câu hỏi nào trong bài giảng.</div>
            </div>
          ) : (
            <div>
              {questions.map((q, idx) => {
                const isCollapsed = !!collapsed[q.id];
                const badgeBg: Record<string, string> = { 'Trắc nghiệm': '#dbeafe', 'Đúng/Sai': '#fef3c7', 'Đúng/Sai 4 ý': '#fef3c7', 'Trả lời ngắn': '#d1fae5', 'Tự luận': '#ede9fe' };
                const badgeText: Record<string, string> = { 'Trắc nghiệm': '#1d4ed8', 'Đúng/Sai': '#92400e', 'Đúng/Sai 4 ý': '#92400e', 'Trả lời ngắn': '#065f46', 'Tự luận': '#5b21b6' };
                const diffColors: Record<string, string> = { 'Nhận biết': '#3b82f6', 'Thông hiểu': '#10b981', 'Vận dụng': '#f59e0b', 'Vận dụng cao': '#ef4444' };

                const hasProblem = problemIds.has(q.id);
                const isDuplicate = duplicateInBatchIds.has(q.id);

                return (
                  <div key={q.id || `fb-${idx}`} style={{ background: '#fff', borderRadius: 10, border: `1px solid ${hasProblem ? '#fca5a5' : isDuplicate ? '#fde68a' : '#e2e8f0'}`, marginBottom: 10, boxShadow: hasProblem ? '0 0 0 2px rgba(248,113,113,0.15)' : '0 1px 2px rgba(0,0,0,0.04)' }}>
                    {/* CARD HEADER */}
                    <div style={{ padding: '8px 12px', background: '#fafafa', borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6, minHeight: 38 }}>
                      <button type="button" onClick={() => toggleCollapse(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}>
                        {isCollapsed ? <ChevronDown style={{ width: 14, height: 14, color: '#94a3b8' }} /> : <ChevronUp style={{ width: 14, height: 14, color: '#94a3b8' }} />}
                      </button>
                      <span style={{ fontWeight: 700, color: '#334155', fontSize: 13, whiteSpace: 'nowrap' }}>Câu {idx + 1}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: badgeBg[q.question_type_label] || '#f1f5f9', color: badgeText[q.question_type_label] || '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {q.question_type_label}
                      </span>

                      {isDuplicate && (
                        <span title="Trùng nội dung với một câu khác trong đợt này, sẽ được bỏ qua khi đẩy"
                          style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#fef3c7', color: '#92400e', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Copy style={{ width: 10, height: 10 }} /> TRÙNG
                        </span>
                      )}
                      {hasProblem && (
                        <span title="Câu này còn thiếu thông tin bắt buộc"
                          style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#fee2e2', color: '#b91c1c', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <AlertTriangle style={{ width: 10, height: 10 }} /> THIẾU
                        </span>
                      )}

                      {/* Preview khi thu gọn */}
                      {isCollapsed && (
                        <span style={{ flex: 1, fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.content?.substring(0, 80) || '(Trống)'}
                        </span>
                      )}

                      {/* Controls */}
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        {/* Mức độ */}
                        <select value={q.difficulty} onChange={e => handleUpdateField(q.id, 'difficulty', e.target.value)}
                          style={{ fontSize: 11, border: `1px solid ${q.difficulty ? '#e2e8f0' : '#fca5a5'}`, borderRadius: 5, padding: '2px 4px', color: diffColors[q.difficulty] || '#dc2626', fontWeight: 700 }}>
                          <option value="">-- Chọn mức độ --</option>
                          <option value="Nhận biết">Nhận biết</option>
                          <option value="Thông hiểu">Thông hiểu</option>
                          <option value="Vận dụng">Vận dụng</option>
                          <option value="Vận dụng cao">Vận dụng cao</option>
                        </select>
                        {/* Dạng bài - dropdown từ question_categories */}
                        <select value={q.math_form} onChange={e => {
                          if (e.target.value === '__custom__') {
                            setShowAddCategoryModal({isOpen: true, targetId: q.id});
                          } else {
                            handleUpdateField(q.id, 'math_form', e.target.value);
                          }
                        }}
                          style={{ fontSize: 11, border: `1px solid ${q.math_form ? '#e2e8f0' : '#fca5a5'}`, borderRadius: 5, padding: '2px 4px', maxWidth: 140, color: q.math_form ? undefined : '#dc2626', fontWeight: q.math_form ? undefined : 700 }}>
                          <option value="">-- Chọn dạng bài --</option>
                          {/* Dạng đang gán nhưng thuộc chương khác vẫn phải hiện ra, nếu không
                              ô sẽ trông như trống dù thực tế đã có giá trị (gây hiểu nhầm là
                              AI không chạy). Có ghi chú rõ để giáo viên biết mà đổi lại. */}
                          {q.math_form && !relevantForms.includes(q.math_form) && (
                            <option value={q.math_form}>{q.math_form} (khác chương)</option>
                          )}
                          {relevantForms.map(f => <option key={f} value={f}>{f}</option>)}
                          <option value="__custom__">✏️ Nhập mới...</option>
                        </select>
                      </div>
                    </div>

                    {/* Đề xuất Dạng toán MỚI từ AI - chờ duyệt tại chỗ, chưa tự ghi vào ngân hàng */}
                    {pendingFormSuggestions[q.id] && (
                      <div onClick={e => e.stopPropagation()} style={{ margin: '0 16px 10px', padding: '8px 12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', whiteSpace: 'nowrap' }}>🆕 AI đề xuất Dạng mới:</span>
                        <input
                          value={pendingFormSuggestions[q.id]}
                          onChange={e => setPendingFormSuggestions(prev => ({ ...prev, [q.id]: e.target.value }))}
                          style={{ flex: 1, minWidth: 140, fontSize: 12, border: '1px solid #fdba74', borderRadius: 6, padding: '3px 8px', background: '#fff' }}
                        />
                        <button type="button" onClick={() => approveNewForm(q.id, pendingFormSuggestions[q.id])}
                          style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#16a34a', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                          ✓ Duyệt
                        </button>
                        <button type="button" onClick={() => rejectNewForm(q.id)}
                          style={{ fontSize: 11, fontWeight: 700, color: '#64748b', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                          Bỏ
                        </button>
                        <span style={{ fontSize: 10, color: '#9a3412', width: '100%' }}>
                          Chưa có trong Ngân hàng - Thầy có thể sửa tên trước khi duyệt. Duyệt xong sẽ tự tạo Dạng toán mới này khi đẩy vào Ngân hàng.
                        </span>
                      </div>
                    )}

                    {/* CARD BODY */}
                    {!isCollapsed && (
                      <div style={{ padding: '12px 16px', fontSize: 14, lineHeight: 1.7, color: '#1e293b' }}>
                        {q.content ? (
                          <div style={{ marginBottom: 10 }}>
                            <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{q.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: 10 }}>(Chưa có nội dung)</div>
                        )}

                        {/* Trắc nghiệm */}
                        {(q.question_type === 'multiple_choice' || q.question_type === 'true_false') && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            {['A', 'B', 'C', 'D'].map(letter => {
                              const val = q[`option_${letter.toLowerCase()}`] || "";
                              const isCorrect = q.correct_answer === letter;
                              return (
                                <div key={letter} style={{ padding: '6px 10px', borderRadius: 7, fontSize: 13, border: isCorrect ? '2px solid #14b8a6' : '1px solid #e2e8f0', background: isCorrect ? '#f0fdfa' : '#fff', display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                                  <strong style={{ color: isCorrect ? '#0d9488' : '#64748b' }}>{letter}.</strong>
                                  <span style={{ flex: 1 }}>
                                    {val ? <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{val}</ReactMarkdown> : <span style={{ color: '#ccc' }}>—</span>}
                                  </span>
                                  {isCorrect && <span style={{ color: '#0d9488', fontWeight: 700 }}>✓</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Đúng/Sai 4 ý */}
                        {q.question_type === 'true_false_cluster' && (
                          <div>
                            {['A', 'B', 'C', 'D'].map((letter, i) => {
                              const val = q[`option_${letter.toLowerCase()}`] || "";
                              const ans = q.correct_answer?.[i] || '?';
                              const isTrue = ans === 'Đ' || ans === 'T' || ans === 'D';
                              return (
                                <div key={letter} style={{ padding: '5px 10px', borderRadius: 6, marginBottom: 4, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                  <strong style={{ color: '#64748b', minWidth: 18 }}>{letter}.</strong>
                                  <span style={{ flex: 1 }}>{val ? <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{val}</ReactMarkdown> : '—'}</span>
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 4, background: isTrue ? '#d1fae5' : '#fee2e2', color: isTrue ? '#065f46' : '#991b1b' }}>{isTrue ? 'ĐÚNG' : 'SAI'}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Trả lời ngắn */}
                        {q.question_type === 'short_answer' && q.correct_answer && (
                          <div style={{ padding: '7px 12px', borderRadius: 7, marginTop: 6, background: '#f0fdfa', border: '1px solid #99f6e4', fontSize: 13, color: '#115e59' }}>
                            <strong>Đáp án:</strong> {q.correct_answer}
                          </div>
                        )}

                        {/* Tự luận */}
                        {q.question_type === 'essay' && q.correct_answer && (
                          <div style={{ padding: '7px 12px', borderRadius: 7, marginTop: 6, background: '#fefce8', border: '1px solid #fde68a', fontSize: 12, color: '#854d0e' }}>
                            <strong>Lời giải mẫu:</strong>
                            <div style={{ marginTop: 4 }}><ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{q.correct_answer}</ReactMarkdown></div>
                          </div>
                        )}

                        {/* Hướng dẫn giải */}
                        {q.explanation && q.question_type !== 'essay' && (
                          <div style={{ padding: '7px 12px', borderRadius: 7, marginTop: 6, background: '#fefce8', border: '1px solid #fde68a', fontSize: 12, color: '#854d0e' }}>
                            <strong>💡 Hướng dẫn giải:</strong>
                            <div style={{ marginTop: 4 }}><ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{q.explanation}</ReactMarkdown></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        <div style={{ padding: '12px 20px', background: '#fff', borderTop: '1px solid #e2e8f0' }}>

          {/* Bảng soát lỗi trước khi lưu */}
          {(blockingIssues.length > 0 || duplicateInBatchIds.size > 0) && (
            <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {blockingIssues.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12.5, color: '#b91c1c', marginBottom: 4 }}>
                    <AlertTriangle style={{ width: 14, height: 14 }} />
                    Chưa thể đẩy vào Ngân hàng — còn thiếu thông tin
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12, color: '#7f1d1d' }}>
                    {blockingIssues.map(i => (
                      <span key={i.key}>• {i.label}: <b>{i.ids.length}</b> câu</span>
                    ))}
                  </div>
                </div>
              )}
              {duplicateInBatchIds.size > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#92400e' }}>
                  <Copy style={{ width: 14, height: 14, flexShrink: 0 }} />
                  Có <b>{duplicateInBatchIds.size}</b> câu trùng nội dung với câu khác ngay trong đợt này — sẽ tự động bỏ qua, chỉ giữ câu đầu tiên.
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
            <button onClick={onClose} type="button" style={{ padding: '8px 22px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 10, fontWeight: 700, fontSize: 14, color: '#475569', cursor: 'pointer' }}>
              Đóng
            </button>
            <button onClick={handlePushAll} type="button" disabled={isPushing || questions.length === 0 || blockingIssues.length > 0}
              style={{ padding: '8px 22px', background: blockingIssues.length > 0 ? '#cbd5e1' : '#a21caf', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, color: '#fff', cursor: (isPushing || blockingIssues.length > 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: questions.length === 0 ? 0.5 : 1, boxShadow: blockingIssues.length > 0 ? 'none' : '0 2px 8px rgba(162,28,175,0.25)' }}>
              {isPushing ? <Loader2 style={{ width: 16, height: 16 }} /> : <UploadCloud style={{ width: 16, height: 16 }} />}
              Đồng ý đưa {Math.max(0, questions.length - duplicateInBatchIds.size)} câu vào Ngân hàng
            </button>
          </div>
        </div>
      </div>
      
      <AddNewCategoryModal 
        isOpen={showAddCategoryModal.isOpen} 
        onClose={() => {
            setShowAddCategoryModal({isOpen: false, targetId: ''});
            setMathFormFilter(''); // reset select Áp dụng chung về rỗng để hiển thị đúng (tránh lỗi value không khớp nếu user hủy)
        }} 
        onSave={(newForm: string) => {
           // Refetch data
           fetchCategories(questions); // Cập nhật lại dropdown danh sách
           
           // Tự gán form mới cho target (hoặc all)
           if (showAddCategoryModal.targetId === 'all') {
              setMathFormFilter(newForm);
              setQuestions(prev => prev.map(q => ({ ...q, math_form: newForm })));
           } else {
              handleUpdateField(showAddCategoryModal.targetId, 'math_form', newForm);
           }
        }} 
        initialContext={editCtx}
        uniqueGrades={uniqueGrades}
        uniqueSubjects={uniqueSubjects}
        uniqueTopics={uniqueTopics}
        uniqueLessons={uniqueLessons}
        supabase={supabase}
      />

      {/* Hộp thoại Thủ công: dùng khi Cổng AI của hệ thống báo lỗi (hết quota,
          quá tải 503...). Giáo viên tự copy prompt dán vào Gemini Web/ChatGPT
          rồi dán kết quả JSON ngược lại - không phụ thuộc server đang gặp sự cố. */}
      {showManualDetectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#faf5ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px 16px 0 0' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <ClipboardPaste style={{ width: 18, height: 18 }} /> Phân tích Dạng toán &amp; Mức độ - Thủ công
              </h2>
              <button onClick={() => setShowManualDetectModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X style={{ width: 18, height: 18, color: '#94a3b8' }} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: '#1e40af', lineHeight: 1.6 }}>
                Dùng khi nút &quot;Dùng AI (Hệ thống)&quot; báo lỗi (hết quota, quá tải 503...).
                <br />
                <b>Bước 1:</b> Copy prompt bên dưới. <b>Bước 2:</b> Dán vào Gemini Web, ChatGPT hoặc AI Studio bất kỳ. <b>Bước 3:</b> Dán kết quả JSON AI trả về vào ô cuối, rồi bấm Áp dụng.
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#374151' }}>Bước 1 · Prompt (đã kèm sẵn nội dung câu hỏi)</label>
                  <button type="button" onClick={handleCopyManualPrompt}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: '1px solid #c4b5fd', background: manualDetectCopied ? '#f0fdf4' : '#f5f3ff', color: manualDetectCopied ? '#166534' : '#6d28d9', cursor: 'pointer' }}>
                    {manualDetectCopied ? <><CheckCircle2 style={{ width: 13, height: 13 }} /> Đã copy</> : <><Copy style={{ width: 13, height: 13 }} /> Copy Prompt</>}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={manualDetectPrompt}
                  style={{ width: '100%', height: 140, padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11.5, fontFamily: 'monospace', color: '#475569', background: '#f8fafc', resize: 'vertical' }}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>Bước 2 · Dán kết quả JSON AI trả về vào đây</label>
                <textarea
                  value={manualDetectInput}
                  onChange={(e) => { setManualDetectInput(e.target.value); setManualDetectError(''); }}
                  placeholder='Dán nguyên văn câu trả lời của AI vào đây, ví dụ: [{"id": "...", "form": "...", "isNew": false, "difficulty": "Thông hiểu"}, ...]'
                  style={{ width: '100%', height: 140, padding: 10, border: `1px solid ${manualDetectError ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 8, fontSize: 12, fontFamily: 'monospace', resize: 'vertical' }}
                />
                {manualDetectError && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#dc2626', display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                    <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0, marginTop: 1 }} /> {manualDetectError}
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowManualDetectModal(false)} style={{ padding: '8px 18px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 700, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                Đóng
              </button>
              <button onClick={applyManualDetectInput} disabled={!manualDetectInput.trim()}
                style={{ padding: '8px 20px', background: manualDetectInput.trim() ? '#7c3aed' : '#cbd5e1', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, color: '#fff', cursor: manualDetectInput.trim() ? 'pointer' : 'not-allowed' }}>
                Áp dụng kết quả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
