"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from "@/utils/supabase/client";
import { X, UploadCloud, Loader2, Database, Info, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';

interface PushToBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: any[]; // Blocks từ editor (gồm 'md' và 'quiz')
  courseContext: {
    grade: string;
    subject: string;
    topic: string; // tiêu đề chương
    lesson: string; // tiêu đề bài
  };
}

// Hàm render nội dung Markdown + KaTeX
function RenderContent({ text }: { text: string }) {
  if (!text) return <span style={{ color: '#aaa', fontStyle: 'italic' }}>(Trống)</span>;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkBreaks]}
      rehypePlugins={[rehypeKatex, rehypeRaw]}
    >
      {text}
    </ReactMarkdown>
  );
}

export default function PushToBankModal({ isOpen, onClose, blocks, courseContext }: PushToBankModalProps) {
  const [isPushing, setIsPushing] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    if (isOpen && blocks && blocks.length > 0) {
      // Lọc tất cả quiz blocks từ editor
      const quizBlocks = blocks.filter(b => b.type === 'quiz' && b.content);
      
      // Debug log để kiểm tra dữ liệu
      console.log('[PushToBank] Tổng blocks:', blocks.length);
      console.log('[PushToBank] Quiz blocks tìm thấy:', quizBlocks.length);
      if (quizBlocks.length > 0) {
        console.log('[PushToBank] Mẫu quiz block đầu tiên:', JSON.stringify(quizBlocks[0], null, 2));
      }

      const parsed = quizBlocks.map((b, index) => {
        const c = b.content; // Nội dung quiz block
        const blockType = c.type || 'multiple_choice';

        // Trích xuất câu hỏi
        const questionText = c.question || "";

        // Trích xuất đáp án tùy theo loại câu hỏi
        let option_a = "", option_b = "", option_c = "", option_d = "";
        let correct_answer = "";
        let explanation = c.sampleAnswer || c.explanation || c.answer || "";

        if (blockType === "multiple_choice" || blockType === "true_false") {
          // Các options là mảng string: ["nội dung A", "nội dung B", ...]
          const opts = c.options || [];
          option_a = typeof opts[0] === 'string' ? opts[0] : (opts[0]?.content || "");
          option_b = typeof opts[1] === 'string' ? opts[1] : (opts[1]?.content || "");
          option_c = typeof opts[2] === 'string' ? opts[2] : (opts[2]?.content || "");
          option_d = typeof opts[3] === 'string' ? opts[3] : (opts[3]?.content || "");
          correct_answer = ['A', 'B', 'C', 'D'][c.answerIndex ?? 0] || 'A';
        } else if (blockType === "short_answer") {
          correct_answer = c.exactAnswer || c.answer || c.correctAnswer || "";
        } else if (blockType === "true_false_cluster") {
          // Các options là mảng object: [{id, content, isTrue}, ...]
          const stmts = c.options || c.statements || [];
          option_a = stmts[0]?.content || stmts[0]?.text || "";
          option_b = stmts[1]?.content || stmts[1]?.text || "";
          option_c = stmts[2]?.content || stmts[2]?.text || "";
          option_d = stmts[3]?.content || stmts[3]?.text || "";
          // Tạo chuỗi đáp án Đ/S
          correct_answer = stmts.map((s: any) => s.isTrue ? "Đ" : "S").join("");
        } else if (blockType === "essay") {
          correct_answer = c.sampleAnswer || c.answer || "";
        }

        // Map tên loại hiển thị thân thiện
        const typeLabels: Record<string, string> = {
          'multiple_choice': 'Trắc nghiệm',
          'true_false': 'Đúng/Sai',
          'true_false_cluster': 'Đúng/Sai 4 ý',
          'short_answer': 'Trả lời ngắn',
          'essay': 'Tự luận',
        };

        return {
          id: b.id || `q_${index}`,
          grade: courseContext.grade || "",
          subject: courseContext.subject || "",
          topic: courseContext.topic || "",
          lesson: courseContext.lesson || "",
          math_form: "",
          difficulty: "Vận dụng",
          question_type: blockType,
          question_type_label: typeLabels[blockType] || blockType,
          content: questionText,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_answer,
          explanation,
          image_url: c.imageUrl || "",
        };
      });

      console.log('[PushToBank] Parsed questions:', parsed.length);
      if (parsed.length > 0) {
        console.log('[PushToBank] Mẫu parsed đầu tiên:', JSON.stringify(parsed[0], null, 2));
      }

      setQuestions(parsed);
      // Mặc định mở rộng tất cả
      setExpandedIds(new Set(parsed.map((q: any) => q.id)));
    }
  }, [isOpen, blocks, courseContext]);

  if (!isOpen) return null;

  const handleUpdate = (id: string, field: string, value: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleUpdateAllMathForm = (value: string) => {
    setQuestions(prev => prev.map(q => ({ ...q, math_form: value })));
  };

  const handleUpdateAllDifficulty = (value: string) => {
    setQuestions(prev => prev.map(q => ({ ...q, difficulty: value })));
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(questions.map(q => q.id)));
  const collapseAll = () => setExpandedIds(new Set());

  const handlePushAll = async () => {
    if (questions.length === 0) return alert("Không có câu hỏi nào để đưa vào ngân hàng.");
    setIsPushing(true);
    try {
      const inserts = questions.map(q => ({
        question_id: `CH_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        grade: q.grade,
        subject: q.subject,
        topic: q.topic,
        lesson: q.lesson,
        math_form: q.math_form,
        question_type: q.question_type,
        difficulty: q.difficulty,
        content: q.content,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        image_url: q.image_url,
        usage_count: 0
      }));

      // Tạo categories mới nếu có math_form
      const newCats = inserts.filter(q => q.math_form).map(q => ({
        grade: q.grade, subject: q.subject, topic: q.topic, lesson: q.lesson, math_form: q.math_form
      }));
      const uniqueNewCats = Array.from(new Set(newCats.map(c => JSON.stringify(c)))).map(s => JSON.parse(s as string));
      if (uniqueNewCats.length > 0) {
        await supabase.from('question_categories').insert(uniqueNewCats);
      }

      const { error } = await supabase.from('questions').insert(inserts);
      if (error) throw error;

      alert(`✅ Đã đưa thành công ${inserts.length} câu vào Ngân hàng!`);
      onClose();
    } catch (e: any) {
      console.error(e);
      alert("❌ Lỗi khi lưu: " + e.message);
    } finally {
      setIsPushing(false);
    }
  };

  // Đếm theo loại
  const typeCounts = questions.reduce((acc: Record<string, number>, q) => {
    acc[q.question_type_label] = (acc[q.question_type_label] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div style={{
        backgroundColor: '#fff',
        width: '100%',
        maxWidth: '1100px',
        height: '90vh',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* HEADER */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '8px',
              backgroundColor: '#fae8ff',
              color: '#a21caf',
              borderRadius: '12px'
            }}>
              <UploadCloud style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '17px', color: '#1f2937', margin: 0 }}>
                Đưa vào Ngân hàng câu hỏi
              </h3>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                Xem trước {questions.length} câu hỏi • {Object.entries(typeCounts).map(([k, v]) => `${v} ${k}`).join(' • ')}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            padding: '6px',
            backgroundColor: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            cursor: 'pointer',
            color: '#6b7280'
          }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* BODY */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          backgroundColor: '#f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Bối cảnh tự động */}
          <div style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1e40af',
            padding: '12px 16px',
            borderRadius: '12px',
            display: 'flex',
            gap: '10px',
            fontSize: '13px',
            lineHeight: 1.6
          }}>
            <Info style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2 }} />
            <div>
              <div><strong>Bối cảnh tự động:</strong> Câu hỏi sẽ được gắn với Khóa/Chương/Bài đang soạn.</div>
              <div style={{ marginTop: 2 }}>
                <strong>Lớp:</strong> {courseContext.grade || '---'} | {' '}
                <strong>Môn:</strong> {courseContext.subject || '---'} | {' '}
                <strong>Chương:</strong> {courseContext.topic || '---'} | {' '}
                <strong>Bài:</strong> {courseContext.lesson || '---'}
              </div>
            </div>
          </div>

          {/* Thanh công cụ nhanh */}
          {questions.length > 0 && (
            <div style={{
              backgroundColor: '#fff',
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontWeight: 600, color: '#6b7280' }}>Dạng bài chung:</label>
                <input
                  type="text"
                  placeholder="VD: Tìm GTLN..."
                  onChange={(e) => handleUpdateAllMathForm(e.target.value)}
                  style={{
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '13px',
                    width: '180px',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontWeight: 600, color: '#6b7280' }}>Độ khó chung:</label>
                <select
                  onChange={(e) => handleUpdateAllDifficulty(e.target.value)}
                  style={{
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Chọn --</option>
                  <option value="Nhận biết">Nhận biết</option>
                  <option value="Thông hiểu">Thông hiểu</option>
                  <option value="Vận dụng">Vận dụng</option>
                  <option value="Vận dụng cao">Vận dụng cao</option>
                </select>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button onClick={expandAll} style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Mở tất cả
                </button>
                <button onClick={collapseAll} style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Thu gọn
                </button>
              </div>
            </div>
          )}

          {/* Danh sách câu hỏi */}
          {questions.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#9ca3af'
            }}>
              <Database style={{ width: 40, height: 40, marginBottom: 8, opacity: 0.5 }} />
              <p>Không tìm thấy câu hỏi nào trong bài giảng này.</p>
            </div>
          ) : (
            questions.map((q, idx) => {
              const isExpanded = expandedIds.has(q.id);

              // Màu badge theo loại
              const badgeColors: Record<string, { bg: string; color: string }> = {
                'Trắc nghiệm': { bg: '#dbeafe', color: '#1d4ed8' },
                'Đúng/Sai': { bg: '#fef3c7', color: '#92400e' },
                'Đúng/Sai 4 ý': { bg: '#fef3c7', color: '#92400e' },
                'Trả lời ngắn': { bg: '#d1fae5', color: '#065f46' },
                'Tự luận': { bg: '#ede9fe', color: '#5b21b6' },
              };
              const badge = badgeColors[q.question_type_label] || { bg: '#f3f4f6', color: '#374151' };

              return (
                <div key={q.id} style={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                }}>
                  {/* Thanh tiêu đề câu hỏi */}
                  <div
                    onClick={() => toggleExpand(q.id)}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#fafafa',
                      borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#374151', fontSize: '14px', minWidth: '50px' }}>
                      Câu {idx + 1}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: badge.bg,
                      color: badge.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {q.question_type_label}
                    </span>

                    {/* Preview nội dung khi thu gọn */}
                    {!isExpanded && (
                      <span style={{
                        flex: 1,
                        fontSize: '12px',
                        color: '#9ca3af',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {q.content ? q.content.substring(0, 80) + (q.content.length > 80 ? '...' : '') : '(Trống)'}
                      </span>
                    )}

                    {/* Tag controls */}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af' }}>ĐỘ KHÓ:</label>
                        <select
                          value={q.difficulty}
                          onChange={(e) => handleUpdate(q.id, 'difficulty', e.target.value)}
                          style={{
                            fontSize: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            padding: '2px 6px',
                            outline: 'none'
                          }}
                        >
                          <option value="Nhận biết">Nhận biết</option>
                          <option value="Thông hiểu">Thông hiểu</option>
                          <option value="Vận dụng">Vận dụng</option>
                          <option value="Vận dụng cao">Vận dụng cao</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af' }}>DẠNG:</label>
                        <input
                          type="text"
                          placeholder="Tìm GTLN..."
                          value={q.math_form}
                          onChange={(e) => handleUpdate(q.id, 'math_form', e.target.value)}
                          style={{
                            fontSize: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            width: '120px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      {isExpanded
                        ? <ChevronUp style={{ width: 16, height: 16, color: '#9ca3af', cursor: 'pointer' }} />
                        : <ChevronDown style={{ width: 16, height: 16, color: '#9ca3af', cursor: 'pointer' }} />
                      }
                    </div>
                  </div>

                  {/* Nội dung câu hỏi (khi mở rộng) */}
                  {isExpanded && (
                    <div style={{ padding: '16px', fontSize: '14px', lineHeight: 1.7, color: '#1e293b' }}>
                      {/* Nội dung câu hỏi */}
                      <div style={{ marginBottom: '12px' }}>
                        <RenderContent text={q.content} />
                      </div>

                      {/* Đáp án trắc nghiệm */}
                      {(q.question_type === 'multiple_choice' || q.question_type === 'true_false') && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginTop: '8px'
                        }}>
                          {['A', 'B', 'C', 'D'].map((letter) => {
                            const optKey = `option_${letter.toLowerCase()}` as keyof typeof q;
                            const optText = q[optKey] || "";
                            const isCorrect = q.correct_answer === letter;
                            return (
                              <div key={letter} style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: isCorrect ? '2px solid #14b8a6' : '1px solid #e5e7eb',
                                backgroundColor: isCorrect ? '#f0fdfa' : '#fff',
                                fontSize: '13px',
                                display: 'flex',
                                gap: '6px'
                              }}>
                                <span style={{
                                  fontWeight: 700,
                                  color: isCorrect ? '#0d9488' : '#6b7280'
                                }}>{letter}.</span>
                                <div style={{ flex: 1 }}>
                                  <RenderContent text={optText} />
                                </div>
                                {isCorrect && <span style={{ color: '#0d9488', fontWeight: 700, fontSize: '12px' }}>✓</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Đáp án Đúng/Sai 4 ý */}
                      {q.question_type === 'true_false_cluster' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                          {['A', 'B', 'C', 'D'].map((letter, i) => {
                            const optKey = `option_${letter.toLowerCase()}` as keyof typeof q;
                            const optText = q[optKey] || "";
                            const answer = q.correct_answer?.[i] || '?';
                            const isTrue = answer === 'Đ' || answer === 'T' || answer === 'D';
                            return (
                              <div key={letter} style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                backgroundColor: '#fff',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <span style={{ fontWeight: 700, color: '#6b7280', minWidth: '20px' }}>{letter}.</span>
                                <div style={{ flex: 1 }}><RenderContent text={optText} /></div>
                                <span style={{
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: isTrue ? '#d1fae5' : '#fee2e2',
                                  color: isTrue ? '#065f46' : '#991b1b'
                                }}>
                                  {isTrue ? 'ĐÚNG' : 'SAI'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Đáp án trả lời ngắn */}
                      {q.question_type === 'short_answer' && q.correct_answer && (
                        <div style={{
                          marginTop: '8px',
                          padding: '10px 14px',
                          backgroundColor: '#f0fdfa',
                          border: '1px solid #99f6e4',
                          borderRadius: '8px',
                          fontSize: '13px',
                          color: '#115e59'
                        }}>
                          <strong>Đáp án:</strong> {q.correct_answer}
                        </div>
                      )}

                      {/* Lời giải / Hướng dẫn */}
                      {q.explanation && (
                        <div style={{
                          marginTop: '8px',
                          padding: '10px 14px',
                          backgroundColor: '#fefce8',
                          border: '1px solid #fde68a',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#854d0e'
                        }}>
                          <strong>💡 Hướng dẫn giải:</strong>
                          <div style={{ marginTop: 4 }}>
                            <RenderContent text={q.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#fff',
          borderTop: '1px solid #e5e7eb',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          alignItems: 'center'
        }}>
          <button onClick={onClose} style={{
            padding: '8px 20px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '14px',
            color: '#374151',
            cursor: 'pointer'
          }}>
            Đóng
          </button>
          <button
            onClick={handlePushAll}
            disabled={isPushing || questions.length === 0}
            style={{
              padding: '8px 20px',
              backgroundColor: isPushing ? '#d946ef' : '#a21caf',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              color: '#fff',
              cursor: isPushing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: questions.length === 0 ? 0.5 : 1,
              boxShadow: '0 2px 8px rgba(162,28,175,0.3)'
            }}
          >
            {isPushing ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <UploadCloud style={{ width: 16, height: 16 }} />}
            Đồng ý đưa {questions.length} câu vào Ngân hàng
          </button>
        </div>
      </div>
    </div>
  );
}
