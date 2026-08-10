"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { exportQuestionsToWord } from "@/utils/exportDocx";
import QuestionEditorModal from "@/components/admin/QuestionEditorModal";
import QuestionPreviewCard, { type PreviewStatement } from "@/components/admin/QuestionPreviewCard";
import { bankTypeLabel, difficultyLabel } from "@/utils/questionTypes";
import {
  Loader2, Pencil, Shuffle, ArrowLeft, ArrowRight, Printer, Download,
  CheckCircle, FileText, CheckSquare, Square, RotateCcw
} from "lucide-react";

interface MatrixItemDraft {
  id: string;
  math_form: string;
  question_type: string;
  difficulty: string;
  count: number;
}

interface LineState {
  item: MatrixItemDraft;
  candidates: any[];
  selectedIds: Set<string>;
}

function questionStatements(q: any): { statements: PreviewStatement[]; layout: 'choice' | 'truefalse' } {
  if (q.question_type === 'NLC') {
    const correctLetter = String(q.correct_answer || '').trim().toUpperCase();
    const statements = ['a', 'b', 'c', 'd']
      .map(opt => {
        const val = q[`option_${opt}`];
        if (!val) return null;
        return { key: opt, label: opt.toUpperCase(), content: val, isCorrect: correctLetter === opt.toUpperCase() } as PreviewStatement;
      })
      .filter((s): s is PreviewStatement => !!s);
    return { statements, layout: 'choice' };
  }
  if (q.question_type === 'DS') {
    const correctStr = String(q.correct_answer || '');
    const statements = ['a', 'b', 'c', 'd']
      .map((opt, i) => {
        const val = q[`option_${opt}`];
        if (!val) return null;
        const ch = correctStr.charAt(i);
        const isTrue = ch ? (ch === 'D' || ch === 'T' || ch.toUpperCase() === 'Đ') : undefined;
        return { key: opt, label: opt, content: val, isTrue } as PreviewStatement;
      })
      .filter((s): s is PreviewStatement => !!s);
    return { statements, layout: 'truefalse' };
  }
  return { statements: [], layout: 'choice' };
}

function SelectContent() {
  const searchParams = useSearchParams();
  const draftKey = searchParams.get('draft');
  const supabase = createClient();

  const [examType, setExamType] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [lines, setLines] = useState<LineState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState<'select' | 'final'>('select');
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);

  useEffect(() => {
    if (!draftKey) { setIsLoading(false); setLoadError("Thiếu thông tin ma trận (draft key)."); return; }
    const raw = localStorage.getItem(draftKey);
    if (!raw) { setIsLoading(false); setLoadError("Không tìm thấy dữ liệu ma trận - có thể tab này đã hết hạn, hãy quay lại trang trước và bấm lại."); return; }
    try {
      const draft = JSON.parse(raw);
      setExamType(draft.examType || "");
      setGrade(draft.grade || "");
      setSubject(draft.subject || "");
      loadCandidates(draft.matrixItems || [], draft.grade, draft.subject);
    } catch (e) {
      setIsLoading(false);
      setLoadError("Dữ liệu ma trận bị lỗi.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const defaultSelect = (candidates: any[], count: number): Set<string> => {
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const sorted = shuffled.sort((a, b) => (a.usage_count || 0) - (b.usage_count || 0));
    return new Set(sorted.slice(0, count).map(q => q.id));
  };

  const loadCandidates = async (matrixItems: MatrixItemDraft[], gradeVal: string, subjectVal: string) => {
    setIsLoading(true);
    try {
      const results: LineState[] = [];
      for (const item of matrixItems) {
        let query = supabase.from('questions').select('*')
          .eq('math_form', item.math_form)
          .eq('question_type', item.question_type)
          .eq('difficulty', item.difficulty);
        if (gradeVal) query = query.eq('grade', gradeVal);
        if (subjectVal) query = query.eq('subject', subjectVal);
        const { data, error } = await query;
        if (error) throw error;
        const candidates = data || [];
        results.push({ item, candidates, selectedIds: defaultSelect(candidates, item.count) });
      }
      setLines(results);
    } catch (e: any) {
      setLoadError("Lỗi tải câu hỏi: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCandidate = (lineIdx: number, qid: string) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== lineIdx) return l;
      const next = new Set(l.selectedIds);
      if (next.has(qid)) next.delete(qid); else next.add(qid);
      return { ...l, selectedIds: next };
    }));
  };

  const reroll = (lineIdx: number) => {
    setLines(prev => prev.map((l, i) => i === lineIdx ? { ...l, selectedIds: defaultSelect(l.candidates, l.item.count) } : l));
  };

  const selectAll = (lineIdx: number, on: boolean) => {
    setLines(prev => prev.map((l, i) => i === lineIdx ? { ...l, selectedIds: on ? new Set(l.candidates.map(q => q.id)) : new Set<string>() } : l));
  };

  const handleSaveEdit = async (updatedQuestion: any) => {
    try {
      const { id, ...rest } = updatedQuestion;
      const { error } = await supabase.from('questions').update(rest).eq('id', id);
      if (error) throw error;
      setLines(prev => prev.map(l => ({
        ...l,
        candidates: l.candidates.map(q => q.id === id ? { ...q, ...rest } : q),
      })));
      alert("Đã lưu câu hỏi vào ngân hàng!");
    } catch (e: any) {
      alert("Lỗi lưu câu hỏi: " + e.message);
    }
  };

  const totalSelected = lines.reduce((acc, l) => acc + l.selectedIds.size, 0);
  const totalTarget = lines.reduce((acc, l) => acc + l.item.count, 0);
  const finalQuestions = lines.flatMap(l => l.candidates.filter(q => l.selectedIds.has(q.id)));

  const handlePrint = () => window.print();

  const handleExportWordStudent = async () => {
    try {
      if (finalQuestions.length === 0) return alert("Chưa chọn câu hỏi nào!");
      await exportQuestionsToWord(finalQuestions, 'student');
    } catch (e: any) { alert("Lỗi xuất Word: " + e.message); }
  };

  const handleExportWordTeacher = async () => {
    try {
      if (finalQuestions.length === 0) return alert("Chưa chọn câu hỏi nào!");
      await exportQuestionsToWord(finalQuestions, 'teacher');
    } catch (e: any) { alert("Lỗi xuất Word: " + e.message); }
  };

  const handleFinalizeExam = async () => {
    if (finalQuestions.length === 0) return alert("Chưa chọn câu hỏi nào để chốt!");
    setIsFinalizing(true);
    try {
      for (const q of finalQuestions) {
        const newCount = (q.usage_count || 0) + 1;
        await supabase.from('questions').update({ usage_count: newCount }).eq('id', q.id);
      }
      setLines(prev => prev.map(l => ({
        ...l,
        candidates: l.candidates.map(q => l.selectedIds.has(q.id) ? { ...q, usage_count: (q.usage_count || 0) + 1 } : q),
      })));
      setIsFinalized(true);
      if (draftKey) localStorage.removeItem(draftKey);
      alert("Đã chốt đề thành công! Số lần sử dụng của các câu hỏi trong đề đã được cộng thêm 1.");
    } catch (e: any) {
      alert("Lỗi khi chốt đề: " + e.message);
    } finally {
      setIsFinalizing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <p className="text-gray-500 font-medium">Đang tải danh sách câu hỏi trong kho...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-3 text-center px-6">
        <p className="text-red-600 font-bold">{loadError}</p>
        <p className="text-gray-500 text-sm">Hãy quay lại tab cấu hình ma trận và bấm lại nút để mở tab xem trước mới.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Thanh trên cùng */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-gray-800">{examType || "Đề thi"}</h1>
            <p className="text-sm text-gray-500">
              {grade ? `Lớp ${grade}` : ""}{grade && subject ? " · " : ""}{subject}
              {step === 'select' && (
                <> · Đã chọn <b className={totalSelected === totalTarget ? "text-emerald-600" : "text-amber-600"}>{totalSelected}</b> / mục tiêu {totalTarget} câu</>
              )}
            </p>
          </div>
          {step === 'select' ? (
            <button
              onClick={() => setStep('final')}
              disabled={totalSelected === 0}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              Xem đề hoàn chỉnh ({totalSelected} câu) <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center gap-3 flex-wrap print:hidden">
              <button onClick={() => setStep('select')} className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-50">
                <ArrowLeft className="w-4 h-4" /> Quay lại chọn câu
              </button>
              <button onClick={handlePrint} className="bg-teal-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm hover:bg-teal-700">
                <Printer className="w-4 h-4" /> In trực tiếp Web
              </button>
              <button onClick={handleExportWordStudent} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm hover:bg-blue-700">
                <Download className="w-4 h-4" /> Xuất Đề (Học Sinh)
              </button>
              <button onClick={handleExportWordTeacher} className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm hover:bg-indigo-700">
                <Download className="w-4 h-4" /> Xuất Đề + Lời Giải (Giáo Viên)
              </button>
              <button onClick={handleFinalizeExam} disabled={isFinalizing || isFinalized} className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm hover:bg-emerald-700 disabled:opacity-50">
                {isFinalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {isFinalized ? "Đã chốt đề" : "Chốt Đề (Lưu bộ đếm)"}
              </button>
            </div>
          )}
        </div>
      </div>

      {step === 'select' ? (
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
          {lines.length === 0 && (
            <div className="text-center text-gray-400 py-20">Không có dạng toán nào trong ma trận.</div>
          )}
          {lines.map((line, lineIdx) => {
            const selectedCount = line.selectedIds.size;
            const isMatch = selectedCount === line.item.count;
            return (
              <div key={line.item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-bold text-gray-800">{line.item.math_form}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-700">{bankTypeLabel(line.item.question_type)}</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-700">{difficultyLabel(line.item.difficulty)}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isMatch ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        Đã chọn: {selectedCount} / mục tiêu {line.item.count}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => reroll(lineIdx)} className="flex items-center gap-1.5 text-xs font-bold border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                      <RotateCcw className="w-3.5 h-3.5" /> Chọn ngẫu nhiên lại
                    </button>
                    <button onClick={() => selectAll(lineIdx, true)} className="flex items-center gap-1.5 text-xs font-bold border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                      <CheckSquare className="w-3.5 h-3.5" /> Chọn tất cả
                    </button>
                    <button onClick={() => selectAll(lineIdx, false)} className="flex items-center gap-1.5 text-xs font-bold border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                      <Square className="w-3.5 h-3.5" /> Bỏ chọn hết
                    </button>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {line.candidates.length === 0 && (
                    <div className="col-span-full text-center text-gray-400 py-6 text-sm">Không có câu hỏi nào trong kho khớp dạng này.</div>
                  )}
                  {line.candidates.map(q => {
                    const isChecked = line.selectedIds.has(q.id);
                    const { statements, layout } = questionStatements(q);
                    return (
                      <div key={q.id} className={`rounded-xl border-2 transition-colors ${isChecked ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        <div className="p-3 flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCandidate(lineIdx, q.id)}
                            className="mt-1.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <QuestionPreviewCard
                              content={q.content}
                              imageUrl={q.image_url}
                              statements={statements}
                              statementsLayout={layout}
                              correctAnswerDisplay={q.question_type === 'TLN' || q.question_type === 'TL' ? (q.correct_answer || undefined) : undefined}
                              size="md"
                            />
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                              Đã dùng: {q.usage_count || 0} lần
                            </span>
                            <button
                              onClick={() => setEditingQuestion(q)}
                              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Sửa
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div id="print-area" className="max-w-5xl mx-auto px-8 py-8 bg-white" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt' }}>
          <div className="text-center font-bold text-lg uppercase mb-6">{examType || "ĐỀ KIỂM TRA"}</div>
          {finalQuestions.map((q, i) => {
            const { statements, layout } = questionStatements(q);
            return (
              <div key={q.id} className="mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold">Câu {i + 1}.</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Đã xuất hiện: {q.usage_count || 0} lần
                  </span>
                </div>
                <QuestionPreviewCard
                  content={q.content}
                  imageUrl={q.image_url}
                  statements={statements}
                  statementsLayout={layout}
                  correctAnswerDisplay={q.question_type === 'TLN' || q.question_type === 'TL' ? (q.correct_answer || undefined) : undefined}
                  size="md"
                />
              </div>
            );
          })}
        </div>
      )}

      <QuestionEditorModal
        isOpen={!!editingQuestion}
        onClose={() => setEditingQuestion(null)}
        question={editingQuestion}
        onSave={handleSaveEdit}
      />
    </div>
  );
}

export default function ExamSelectPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>}>
      <SelectContent />
    </Suspense>
  );
}
