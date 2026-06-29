import React, { useState, useEffect } from "react";
import { X, Search, Loader2, Database, CheckCircle2, ChevronLeft, ChevronRight, CheckSquare, Square } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface QuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (questions: any[]) => void;
  usedQuestionIds?: string[];
}

export default function QuestionBankModal({ isOpen, onClose, onInsert, usedQuestionIds = [] }: QuestionBankModalProps) {
  const supabase = createClient();
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
  const [isInserting, setIsInserting] = useState(false);
  
  // Categories & Filters State
  const [categories, setCategories] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    grade: "", subject: "", topic: "", lesson: "", math_form: "", difficulty: "", question_type: ""
  });
  
  const DIFFICULTY_LABELS: Record<string, string> = {
    "1": "Nhận biết",
    "2": "Thông hiểu",
    "3": "Vận dụng",
    "4": "Vận dụng cao"
  };
  
  const QUESTION_TYPES: Record<string, string> = {
    "NLC": "Trắc nghiệm",
    "DS": "Đúng/Sai",
    "TLN": "Trả lời ngắn",
    "TL": "Tự luận"
  };
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setSelectedQuestions([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) fetchQuestions();
  }, [isOpen, currentPage, searchTerm, filters]);

  // Debounce cho thanh tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== searchInput) {
        setSearchTerm(searchInput);
        setCurrentPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, searchTerm]);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('question_categories').select('*');
      if (data) setCategories(data);
    } catch(e) {}
  };

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from("questions").select("*", { count: "exact" });
      
      if (searchTerm) {
        const trimmedTerm = searchTerm.trim();
        if (trimmedTerm.length > 30) {
          const words = trimmedTerm.match(/[\p{L}]+/gu) || [];
          const validWords = words.filter(w => w.length >= 3);
          
          if (validWords.length >= 4) {
             const keywords = [...validWords.slice(0, 3), ...validWords.slice(-3)];
             const uniqueKeywords = Array.from(new Set(keywords));
             uniqueKeywords.forEach(kw => {
                query = query.ilike('content', `%${kw}%`);
             });
          } else {
             query = query.or(`content.ilike.%${trimmedTerm}%,question_id.ilike.%${trimmedTerm}%,math_form.ilike.%${trimmedTerm}%,lesson.ilike.%${trimmedTerm}%,topic.ilike.%${trimmedTerm}%`);
          }
        } else {
           query = query.or(`content.ilike.%${trimmedTerm}%,question_id.ilike.%${trimmedTerm}%,math_form.ilike.%${trimmedTerm}%,lesson.ilike.%${trimmedTerm}%,topic.ilike.%${trimmedTerm}%`);
        }
      }

      if (filters.grade) query = query.eq('grade', filters.grade);
      if (filters.subject) query = query.eq('subject', filters.subject);
      if (filters.topic) query = query.eq('topic', filters.topic);
      if (filters.lesson) query = query.eq('lesson', filters.lesson);
      if (filters.math_form) query = query.eq('math_form', filters.math_form);
      if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
      if (filters.question_type) query = query.eq('question_type', filters.question_type);
      
      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
        
      if (error) throw error;
      
      if (data) setQuestions(data);
      if (count !== null) {
        setTotalPages(Math.ceil(count / itemsPerPage));
      }
    } catch (error) {
      console.error("Lỗi khi tải câu hỏi:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (question: any) => {
    if (selectedQuestions.find(q => q.id === question.id)) {
      setSelectedQuestions(selectedQuestions.filter(q => q.id !== question.id));
    } else {
      setSelectedQuestions([...selectedQuestions, question]);
    }
  };

  const handleSelectAllCurrentPage = () => {
    const newSelected = [...selectedQuestions];
    let allAdded = true;
    for (const q of questions) {
       if (!newSelected.find(sq => sq.id === q.id)) {
          newSelected.push(q);
          allAdded = false;
       }
    }
    // Nếu tất cả trên trang đã được chọn, ấn lại sẽ bỏ chọn
    if (allAdded) {
       setSelectedQuestions(selectedQuestions.filter(sq => !questions.find(q => q.id === sq.id)));
    } else {
       setSelectedQuestions(newSelected);
    }
  };

  const handleInsert = async () => {
    if (selectedQuestions.length === 0) return;
    setIsInserting(true);
    
    try {
      // Cập nhật lượt đếm trong CSDL
      for (const q of selectedQuestions) {
        const newCount = (q.usage_count || 0) + 1;
        await supabase.from('questions').update({ usage_count: newCount }).eq('id', q.id);
      }
      
      onInsert(selectedQuestions);
      onClose();
    } catch (e: any) {
      console.error("Lỗi khi cập nhật bộ đếm:", e);
      alert("Đã xảy ra lỗi khi chèn câu hỏi.");
    } finally {
      setIsInserting(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  if (!isOpen) return null;

  const uniqueGrades = Array.from(new Set(categories.map(c => c.grade))).filter(Boolean).sort();
  const uniqueSubjects = Array.from(new Set(categories.filter(c => !filters.grade || c.grade === filters.grade).map(c => c.subject))).filter(Boolean);
  const uniqueTopics = Array.from(new Set(categories.filter(c => (!filters.grade || c.grade === filters.grade) && (!filters.subject || c.subject === filters.subject)).map(c => c.topic))).filter(Boolean);
  const uniqueLessons = Array.from(new Set(categories.filter(c => (!filters.grade || c.grade === filters.grade) && (!filters.subject || c.subject === filters.subject) && (!filters.topic || c.topic === filters.topic)).map(c => c.lesson))).filter(Boolean);
  const uniqueForms = Array.from(new Set(categories.filter(c => (!filters.grade || c.grade === filters.grade) && (!filters.subject || c.subject === filters.subject) && (!filters.topic || c.topic === filters.topic) && (!filters.lesson || c.lesson === filters.lesson)).map(c => c.math_form))).filter(Boolean);

  const isAllCurrentPageSelected = questions.length > 0 && questions.every(q => selectedQuestions.find(sq => sq.id === q.id));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] md:max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-inner">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-800">Ngân hàng Câu hỏi</h2>
              <p className="text-xs text-gray-500 font-medium">Chọn một hoặc nhiều câu hỏi để chèn hàng loạt vào bài giảng</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 hover:text-red-500 rounded-xl text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 border-b border-gray-100 bg-white flex flex-col gap-3">
          <div className="flex gap-3 items-center w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm nội dung (hỗ trợ copy đề bài), mã câu hỏi..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-medium text-gray-700"
              />
            </div>
            <select value={filters.difficulty} onChange={e => handleFilterChange('difficulty', e.target.value)} className="w-36 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-500 font-medium text-gray-600">
              <option value="">-- Mọi Mức Độ --</option>
              <option value="1">Nhận biết</option>
              <option value="2">Thông hiểu</option>
              <option value="3">Vận dụng</option>
              <option value="4">Vận dụng cao</option>
            </select>
            <select value={filters.question_type} onChange={e => handleFilterChange('question_type', e.target.value)} className="w-36 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-500 font-medium text-gray-600">
              <option value="">-- Mọi Dạng --</option>
              <option value="NLC">Trắc nghiệm</option>
              <option value="DS">Đúng/Sai</option>
              <option value="TLN">Trả lời ngắn</option>
              <option value="TL">Tự luận</option>
            </select>
            <div className="flex items-center gap-2">
               <button 
                  onClick={handleInsert}
                  disabled={selectedQuestions.length === 0 || isInserting}
                  className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-orange-600/30 hover:bg-orange-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
               >
                 {isInserting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                 Chèn {selectedQuestions.length > 0 ? `(${selectedQuestions.length})` : ''} câu
               </button>
            </div>
          </div>
          
          <div className="flex gap-2 w-full overflow-x-auto pb-1 custom-scrollbar">
            <select value={filters.grade} onChange={e => handleFilterChange('grade', e.target.value)} className="min-w-[100px] border border-gray-200 rounded-lg p-2 text-xs outline-none focus:border-orange-500 font-bold text-gray-600 bg-gray-50">
              <option value="">Lớp</option>
              {uniqueGrades.map(g => <option key={g as string} value={g as string}>{g as string}</option>)}
            </select>
            <select value={filters.subject} onChange={e => handleFilterChange('subject', e.target.value)} className="min-w-[120px] border border-gray-200 rounded-lg p-2 text-xs outline-none focus:border-orange-500 font-bold text-gray-600 bg-gray-50">
              <option value="">Phân môn</option>
              {uniqueSubjects.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
            </select>
            <select value={filters.topic} onChange={e => handleFilterChange('topic', e.target.value)} className="flex-1 min-w-[200px] border border-gray-200 rounded-lg p-2 text-xs outline-none focus:border-orange-500 font-bold text-gray-600 bg-gray-50 truncate max-w-xs">
              <option value="">Chuyên đề</option>
              {uniqueTopics.map(t => <option key={t as string} value={t as string}>{t as string}</option>)}
            </select>
            <select value={filters.lesson} onChange={e => handleFilterChange('lesson', e.target.value)} className="flex-1 min-w-[200px] border border-gray-200 rounded-lg p-2 text-xs outline-none focus:border-orange-500 font-bold text-gray-600 bg-gray-50 truncate max-w-xs">
              <option value="">Bài học</option>
              {uniqueLessons.map(l => <option key={l as string} value={l as string}>{l as string}</option>)}
            </select>
            <select value={filters.math_form} onChange={e => handleFilterChange('math_form', e.target.value)} className="flex-1 min-w-[200px] border border-gray-200 rounded-lg p-2 text-xs outline-none focus:border-orange-500 font-bold text-gray-600 bg-gray-50 truncate max-w-xs">
              <option value="">Dạng toán</option>
              {uniqueForms.map(f => <option key={f as string} value={f as string}>{f as string}</option>)}
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        <div className="bg-orange-50 px-5 py-2.5 flex items-center justify-between border-b border-orange-100 shadow-inner">
           <button 
              onClick={handleSelectAllCurrentPage} 
              className="flex items-center gap-2 text-sm font-bold text-orange-700 hover:text-orange-900 transition-colors"
           >
              {isAllCurrentPageSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              {isAllCurrentPageSelected ? 'Bỏ chọn trang này' : 'Chọn tất cả trang này'}
           </button>
           
           <div className="text-sm font-semibold text-orange-800 bg-orange-100/50 px-3 py-1 rounded-md border border-orange-200">
             Đã chọn <span className="font-black text-orange-600">{selectedQuestions.length}</span> câu hỏi
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <p className="text-sm font-medium">Đang tải ngân hàng câu hỏi...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <Database className="w-12 h-12 text-gray-300" />
              <p className="text-base font-bold text-gray-500">Không tìm thấy câu hỏi nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {questions.map((q) => {
                 const isSelected = !!selectedQuestions.find(sq => sq.id === q.id);
                 return (
                   <div 
                      key={q.id} 
                      onClick={() => toggleSelect(q)}
                      className={`bg-white border rounded-xl p-4 flex gap-4 cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/10' : 'border-gray-200 hover:border-orange-300'}`}
                   >
                     <div className="pt-1 shrink-0">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-orange-500 border-orange-500 shadow-sm' : 'border-gray-300'}`}>
                           {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-1.5 mb-2">
                           <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 uppercase border border-gray-200 shadow-sm">
                                {q.question_id || 'NO-ID'}
                              </span>
                              {q.question_type && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">{QUESTION_TYPES[q.question_type] || q.question_type}</span>}
                              {q.grade && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">{q.grade}</span>}
                              {q.difficulty && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-100">{DIFFICULTY_LABELS[q.difficulty] || `Mức ${q.difficulty}`}</span>}
                              
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                Đã xuất hiện: {q.usage_count || 0} lần
                              </span>

                              {(() => {
                                  const usageCount = usedQuestionIds.filter(id => id === q.id).length;
                                  if (usageCount > 0) {
                                      return (
                                         <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200 flex items-center gap-1" title="Câu hỏi này đã có mặt trong bài giảng hiện tại">
                                            ⚠️ Có sẵn trong bài
                                         </span>
                                      );
                                  }
                                  return null;
                              })()}
                           </div>
                           {q.topic && <div className="font-bold text-indigo-900 text-[11px] line-clamp-1" title={q.topic}>Chương/CĐ: <span className="text-gray-700 font-medium">{q.topic}</span></div>}
                           {q.lesson && <div className="font-bold text-teal-800 text-[11px] line-clamp-1" title={q.lesson}>Bài: <span className="text-gray-700 font-medium">{q.lesson}</span></div>}
                           {q.math_form && (
                              <div className="text-emerald-700 text-[11px] flex items-center gap-1.5">
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                                 <span className="font-bold line-clamp-1" title={q.math_form}>{q.math_form}</span>
                              </div>
                           )}
                        </div>
                        <div className="text-[13px] text-gray-800 font-medium prose prose-sm max-w-none prose-p:my-1 line-clamp-3 leading-relaxed">
                           <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.content || ""}</ReactMarkdown>
                        </div>
                     </div>
                   </div>
                 )
              })}
            </div>
          )}
        </div>

        {/* Footer / Pagination */}
        {!isLoading && totalPages > 1 && (
           <div className="p-3 border-t border-gray-100 bg-white flex justify-center items-center gap-4 shrink-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
             <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:text-orange-600 disabled:opacity-30 disabled:hover:text-gray-600 transition-colors shadow-sm"
             >
                <ChevronLeft className="w-5 h-5" />
             </button>
             <span className="text-sm font-bold text-gray-600 bg-gray-50 px-4 py-1.5 rounded-lg border border-gray-200">
               Trang <span className="text-orange-600">{currentPage}</span> / {totalPages}
             </span>
             <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:text-orange-600 disabled:opacity-30 disabled:hover:text-gray-600 transition-colors shadow-sm"
             >
                <ChevronRight className="w-5 h-5" />
             </button>
           </div>
        )}

      </div>
    </div>
  );
}
