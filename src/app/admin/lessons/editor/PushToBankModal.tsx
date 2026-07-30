"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from "@/utils/supabase/client";
import { X, UploadCloud, Loader2, Database, Info, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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

/* ===== Tự động detect Lớp và Môn từ tên khóa học ===== */
function autoDetectGradeSubject(courseName: string): { grade: string; subject: string } {
  if (!courseName) return { grade: '', subject: '' };
  const name = courseName.toLowerCase();

  // Detect Lớp: tìm pattern "lớp X", "lop X", "khối X", "L10", "10", "11", "12"
  let grade = '';
  const gradeMatch = name.match(/(?:lớp|lop|khối|khoi|l)\s*(\d{1,2})/i) || name.match(/\b(10|11|12|[6-9])\b/);
  if (gradeMatch) grade = gradeMatch[1];

  // Detect Môn: tìm tên môn phổ biến
  let subject = '';
  if (/toán|toan|math/i.test(name)) subject = 'Toán';
  else if (/lý|ly|vật lý|physics/i.test(name)) subject = 'Vật lý';
  else if (/hóa|hoa|hoá|chemistry/i.test(name)) subject = 'Hóa học';
  else if (/sinh|biology/i.test(name)) subject = 'Sinh học';
  else if (/văn|van|ngữ văn|ngu van/i.test(name)) subject = 'Ngữ văn';
  else if (/anh|english/i.test(name)) subject = 'Tiếng Anh';

  return { grade, subject };
}

/* ===== Tự gán mức độ dựa trên vị trí câu trong bài ===== */
function autoAssignDifficulty(index: number, total: number): string {
  // Phân bổ: 25% đầu = Nhận biết, 25% tiếp = Thông hiểu, 30% tiếp = Vận dụng, 20% cuối = Vận dụng cao
  const ratio = index / total;
  if (ratio < 0.25) return 'Nhận biết';
  if (ratio < 0.50) return 'Thông hiểu';
  if (ratio < 0.80) return 'Vận dụng';
  return 'Vận dụng cao';
}

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
      math_form: "", // Sẽ được user chọn
      difficulty: autoAssignDifficulty(index, quizBlocks.length),
      question_type: blockType,
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

      // Fetch danh mục dạng toán từ DB
      fetchCategories();
    }
    if (!isOpen) {
      hasParsedRef.current = false;
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('question_categories').select('*');
      if (data) setCategories(data);
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

  const handlePushAll = async () => {
    if (questions.length === 0) return alert("Không có câu hỏi nào.");
    setIsPushing(true);
    try {
      const inserts = questions.map(q => ({
        question_id: `CH_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        grade: q.grade, subject: q.subject, topic: q.topic, lesson: q.lesson,
        math_form: q.math_form, question_type: q.question_type, difficulty: q.difficulty,
        content: q.content, option_a: q.option_a, option_b: q.option_b,
        option_c: q.option_c, option_d: q.option_d, correct_answer: q.correct_answer,
        explanation: q.explanation, image_url: q.image_url, usage_count: 0
      }));
      const newCats = inserts.filter(q => q.math_form).map(q => ({
        grade: q.grade, subject: q.subject, topic: q.topic, lesson: q.lesson, math_form: q.math_form
      }));
      const uniqueNewCats = Array.from(new Set(newCats.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
      if (uniqueNewCats.length > 0) await supabase.from('question_categories').insert(uniqueNewCats);
      const { error } = await supabase.from('questions').insert(inserts);
      if (error) throw error;
      alert(`✅ Đã đưa thành công ${inserts.length} câu vào Ngân hàng!`);
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
                  <input list="gradesList" value={editCtx.grade} onChange={e => handleUpdateContext('grade', e.target.value)}
                    placeholder="VD: 10"
                    style={{ border: '1px solid #93c5fd', borderRadius: 6, padding: '3px 8px', fontSize: 12, width: 80, background: '#fff' }} />
                  <datalist id="gradesList">{uniqueGrades.map(g => <option key={g} value={g} />)}</datalist>

                  <label style={{ fontWeight: 700, fontSize: 12 }}>Môn:</label>
                  <input list="subjectsList" value={editCtx.subject} onChange={e => handleUpdateContext('subject', e.target.value)}
                    placeholder="VD: Toán"
                    style={{ border: '1px solid #93c5fd', borderRadius: 6, padding: '3px 8px', fontSize: 12, width: 100, background: '#fff' }} />
                  <datalist id="subjectsList">{uniqueSubjects.map(s => <option key={s} value={s} />)}</datalist>

                  <label style={{ fontWeight: 700, fontSize: 12 }}>Chương:</label>
                  <input list="topicsList" value={editCtx.topic} onChange={e => handleUpdateContext('topic', e.target.value)}
                    style={{ border: '1px solid #93c5fd', borderRadius: 6, padding: '3px 8px', fontSize: 12, width: 220, background: '#fff' }} />
                  <datalist id="topicsList">{uniqueTopics.map(t => <option key={t} value={t} />)}</datalist>

                  <label style={{ fontWeight: 700, fontSize: 12 }}>Bài:</label>
                  <input list="lessonsList" value={editCtx.lesson} onChange={e => handleUpdateContext('lesson', e.target.value)}
                    style={{ border: '1px solid #93c5fd', borderRadius: 6, padding: '3px 8px', fontSize: 12, width: 220, background: '#fff' }} />
                  <datalist id="lessonsList">{uniqueLessons.map(l => <option key={l} value={l} />)}</datalist>
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar: áp dụng chung + thống kê mức độ */}
          {questions.length > 0 && (
            <div style={{ background: '#fff', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: '#64748b', fontSize: 12 }}>Áp dụng chung:</span>

                {/* Dropdown Dạng bài - lấy từ question_categories */}
                <div style={{ position: 'relative' }}>
                  <select
                    value={mathFormFilter}
                    onChange={e => handleBatchMathForm(e.target.value)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '3px 8px', fontSize: 12, minWidth: 180, background: '#fff', cursor: 'pointer' }}
                  >
                    <option value="">-- Chọn dạng bài --</option>
                    {relevantForms.map(form => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                    <option value="__custom__">✏️ Nhập dạng mới...</option>
                  </select>
                </div>

                {/* Input tùy chỉnh nếu chọn "Nhập dạng mới" */}
                {mathFormFilter === '__custom__' && (
                  <input
                    type="text"
                    placeholder="Nhập dạng bài mới..."
                    autoFocus
                    onBlur={e => {
                      if (e.target.value) {
                        handleBatchMathForm(e.target.value);
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (val) handleBatchMathForm(val);
                      }
                    }}
                    style={{ border: '1px solid #a78bfa', borderRadius: 6, padding: '3px 8px', fontSize: 12, width: 180, background: '#faf5ff' }}
                  />
                )}

                <select onChange={e => handleBatchDifficulty(e.target.value)}
                  style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '3px 6px', fontSize: 12 }}>
                  <option value="">Độ khó...</option>
                  <option value="Nhận biết">Nhận biết</option>
                  <option value="Thông hiểu">Thông hiểu</option>
                  <option value="Vận dụng">Vận dụng</option>
                  <option value="Vận dụng cao">Vận dụng cao</option>
                </select>

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

                return (
                  <div key={q.id || `fb-${idx}`} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                    {/* CARD HEADER */}
                    <div style={{ padding: '8px 12px', background: '#fafafa', borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6, minHeight: 38 }}>
                      <button type="button" onClick={() => toggleCollapse(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}>
                        {isCollapsed ? <ChevronDown style={{ width: 14, height: 14, color: '#94a3b8' }} /> : <ChevronUp style={{ width: 14, height: 14, color: '#94a3b8' }} />}
                      </button>
                      <span style={{ fontWeight: 700, color: '#334155', fontSize: 13, whiteSpace: 'nowrap' }}>Câu {idx + 1}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: badgeBg[q.question_type_label] || '#f1f5f9', color: badgeText[q.question_type_label] || '#475569', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {q.question_type_label}
                      </span>

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
                          style={{ fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 5, padding: '2px 4px', color: diffColors[q.difficulty] || '#64748b', fontWeight: 700 }}>
                          <option value="Nhận biết">Nhận biết</option>
                          <option value="Thông hiểu">Thông hiểu</option>
                          <option value="Vận dụng">Vận dụng</option>
                          <option value="Vận dụng cao">Vận dụng cao</option>
                        </select>
                        {/* Dạng bài - dropdown từ question_categories */}
                        <select value={q.math_form} onChange={e => {
                          if (e.target.value === '__custom__') {
                            const custom = prompt('Nhập dạng bài mới:');
                            if (custom) handleUpdateField(q.id, 'math_form', custom);
                          } else {
                            handleUpdateField(q.id, 'math_form', e.target.value);
                          }
                        }}
                          style={{ fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 5, padding: '2px 4px', maxWidth: 140 }}>
                          <option value="">Dạng bài...</option>
                          {relevantForms.map(f => <option key={f} value={f}>{f}</option>)}
                          <option value="__custom__">✏️ Nhập mới...</option>
                        </select>
                      </div>
                    </div>

                    {/* CARD BODY */}
                    {!isCollapsed && (
                      <div style={{ padding: '12px 16px', fontSize: 14, lineHeight: 1.7, color: '#1e293b' }}>
                        {q.content ? (
                          <div style={{ marginBottom: 10 }}>
                            <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{q.content}</ReactMarkdown>
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
                                    {val ? <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{val}</ReactMarkdown> : <span style={{ color: '#ccc' }}>—</span>}
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
                                  <span style={{ flex: 1 }}>{val ? <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{val}</ReactMarkdown> : '—'}</span>
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
                            <div style={{ marginTop: 4 }}><ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{q.correct_answer}</ReactMarkdown></div>
                          </div>
                        )}

                        {/* Hướng dẫn giải */}
                        {q.explanation && q.question_type !== 'essay' && (
                          <div style={{ padding: '7px 12px', borderRadius: 7, marginTop: 6, background: '#fefce8', border: '1px solid #fde68a', fontSize: 12, color: '#854d0e' }}>
                            <strong>💡 Hướng dẫn giải:</strong>
                            <div style={{ marginTop: 4 }}><ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex, rehypeRaw]}>{q.explanation}</ReactMarkdown></div>
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
        <div style={{ padding: '12px 20px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
          <button onClick={onClose} type="button" style={{ padding: '8px 22px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 10, fontWeight: 700, fontSize: 14, color: '#475569', cursor: 'pointer' }}>
            Đóng
          </button>
          <button onClick={handlePushAll} type="button" disabled={isPushing || questions.length === 0}
            style={{ padding: '8px 22px', background: '#a21caf', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, color: '#fff', cursor: isPushing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: questions.length === 0 ? 0.5 : 1, boxShadow: '0 2px 8px rgba(162,28,175,0.25)' }}>
            {isPushing ? <Loader2 style={{ width: 16, height: 16 }} /> : <UploadCloud style={{ width: 16, height: 16 }} />}
            Đồng ý đưa {questions.length} câu vào Ngân hàng
          </button>
        </div>
      </div>
    </div>
  );
}
