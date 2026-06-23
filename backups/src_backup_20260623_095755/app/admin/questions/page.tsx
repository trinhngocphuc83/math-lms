"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { 
  FileEdit, Search, Plus, Upload, Loader2, Database,
  Filter, ChevronLeft, ChevronRight, CheckCircle2,
  AlertCircle, X, Trash2, ChevronDown, FileDown, Eye
} from "lucide-react";
import Papa from "papaparse";
import QuestionEditorModal from "@/components/admin/QuestionEditorModal";
import PreviewQuestionModal from "@/components/admin/PreviewQuestionModal";
import { exportQuestionsToWord } from "@/utils/docxExporter";
import CategoryManagerModal from "@/components/admin/CategoryManagerModal";

export default function QuestionsPage() {
  const supabase = createClient();
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<{ success: number; skipped: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Modal State
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [previewQuestion, setPreviewQuestion] = useState<any>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Categories & Filters State
  const [categories, setCategories] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    grade: "", subject: "", topic: "", lesson: "", math_form: "", difficulty: ""
  });

  const DIFFICULTY_LABELS: Record<string, string> = {
    "1": "Nhận biết",
    "2": "Thông hiểu",
    "3": "Vận dụng",
    "4": "Vận dụng cao"
  };

  useEffect(() => {
    fetchQuestions();
    fetchCategories();
  }, [currentPage, searchTerm, filters]);

  // Debounce for search
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
        // Nếu chuỗi dài > 30 ký tự -> Người dùng đang dán nguyên đoạn đề bài
        if (trimmedTerm.length > 30) {
          // Trích xuất các từ (chỉ lấy chữ cái, bỏ qua số/công thức Toán) có độ dài >= 3
          const words = trimmedTerm.match(/[\p{L}]+/gu) || [];
          const validWords = words.filter(w => w.length >= 3);
          
          if (validWords.length >= 4) {
             // Lấy 3 từ khóa đầu và 3 từ khóa cuối của đoạn văn
             const keywords = [...validWords.slice(0, 3), ...validWords.slice(-3)];
             const uniqueKeywords = Array.from(new Set(keywords));
             
             // Bắt buộc nội dung câu hỏi phải chứa đồng thời tất cả các từ khóa này
             uniqueKeywords.forEach(kw => {
                query = query.ilike('content', `%${kw}%`);
             });
          } else {
             // Nếu không có đủ chữ (toàn bộ là công thức), tìm kiếm fallback
             query = query.or(`content.ilike.%${trimmedTerm}%,question_id.ilike.%${trimmedTerm}%,math_form.ilike.%${trimmedTerm}%,lesson.ilike.%${trimmedTerm}%,topic.ilike.%${trimmedTerm}%`);
          }
        } else {
           // Nếu chuỗi ngắn (từ khóa bình thường), tìm kiếm trên tất cả các cột
           query = query.or(`content.ilike.%${trimmedTerm}%,question_id.ilike.%${trimmedTerm}%,math_form.ilike.%${trimmedTerm}%,lesson.ilike.%${trimmedTerm}%,topic.ilike.%${trimmedTerm}%`);
        }
      }
      if (filters.grade) query = query.eq('grade', filters.grade);
      if (filters.subject) query = query.eq('subject', filters.subject);
      if (filters.topic) query = query.eq('topic', filters.topic);
      if (filters.lesson) query = query.eq('lesson', filters.lesson);
      if (filters.math_form) query = query.eq('math_form', filters.math_form);
      if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
      
      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
        
      if (error) throw error;
      
      if (data) setQuestions(data);
      if (count !== null) {
        setTotalCount(count);
        setTotalPages(Math.ceil(count / itemsPerPage));
      }
    } catch (error) {
      console.error("Lỗi khi tải câu hỏi:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStats(null);

    Papa.parse(file, {
      complete: async (results) => {
        try {
          const data = results.data as string[][];
          if (data.length < 2) {
            alert("File CSV không có dữ liệu!");
            setIsImporting(false);
            return;
          }

          const rowsToImport = data.slice(1).filter(row => row.length >= 15 && row[0]);
          
          let successCount = 0;
          
          const chunkSize = 100;
          for (let i = 0; i < rowsToImport.length; i += chunkSize) {
            const chunk = rowsToImport.slice(i, i + chunkSize);
            
            const supabaseRecords = chunk.map(row => ({
              question_id: row[0] || `CH_NEW_${Date.now()}_${Math.random()}`,
              grade: row[1] || "",
              subject: row[2] || "",
              topic: row[3] || "",
              lesson: row[4] || "",
              math_form: row[5] || "",
              question_type: row[6] || "NLC",
              difficulty: row[7] || "1",
              content: row[8] || "",
              option_a: row[9] || "",
              option_b: row[10] || "",
              option_c: row[11] || "",
              option_d: row[12] || "",
              correct_answer: row[13] || "",
              explanation: row[14] || "",
              usage_count: parseInt(row[19]) || 0
            }));

            const { error } = await supabase
              .from('questions')
              .upsert(supabaseRecords, { onConflict: 'question_id', ignoreDuplicates: true });
              
            if (!error) {
              successCount += chunk.length;
            }
          }

          setImportStats({ success: successCount, skipped: rowsToImport.length - successCount, total: rowsToImport.length });
          fetchQuestions();
        } catch (error) {
          console.error("Lỗi xử lý file:", error);
          alert("Có lỗi xảy ra khi xử lý file CSV!");
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      },
      error: (error) => {
        alert("Lỗi đọc file CSV: " + error.message);
        setIsImporting(false);
      }
    });
  };

  const handleModalSave = async (updatedQuestion: any) => {
    try {
      const qId = updatedQuestion.question_id || `CH_NEW_${Date.now()}`;
      const { error } = await supabase.from('questions').upsert({
        ...updatedQuestion,
        question_id: qId
      });
      if (error) throw error;
      alert("Lưu câu hỏi thành công!");
      setEditingQuestion(null);
      fetchQuestions();
    } catch (e: any) {
      alert("Có lỗi khi lưu câu hỏi: " + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) return;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw error;
      fetchQuestions();
    } catch (e: any) {
      alert("Lỗi khi xóa: " + e.message);
    }
  };

  const uniqueGrades = Array.from(new Set(categories.map(c => c.grade))).filter(Boolean).sort();
  const uniqueSubjects = Array.from(new Set(categories.filter(c => !filters.grade || c.grade === filters.grade).map(c => c.subject))).filter(Boolean);
  const uniqueTopics = Array.from(new Set(categories.filter(c => (!filters.grade || c.grade === filters.grade) && (!filters.subject || c.subject === filters.subject)).map(c => c.topic))).filter(Boolean);
  const uniqueLessons = Array.from(new Set(categories.filter(c => (!filters.grade || c.grade === filters.grade) && (!filters.subject || c.subject === filters.subject) && (!filters.topic || c.topic === filters.topic)).map(c => c.lesson))).filter(Boolean);
  const uniqueForms = Array.from(new Set(categories.filter(c => (!filters.grade || c.grade === filters.grade) && (!filters.subject || c.subject === filters.subject) && (!filters.topic || c.topic === filters.topic) && (!filters.lesson || c.lesson === filters.lesson)).map(c => c.math_form))).filter(Boolean);

  const handleExportDocx = async (type: 'student' | 'teacher') => {
    if (selectedQuestions.length === 0) return alert("Vui lòng chọn ít nhất 1 câu hỏi!");
    try {
      // Find full question data
      const selectedData = questions.filter(q => selectedQuestions.includes(q.id));
      await exportQuestionsToWord(selectedData, type);
      setIsExportMenuOpen(false);
    } catch(e: any) {
      alert("Lỗi xuất file: " + e.message);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuestions(questions.map(q => q.id));
    } else {
      setSelectedQuestions([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) setSelectedQuestions(prev => [...prev, id]);
    else setSelectedQuestions(prev => prev.filter(qId => qId !== id));
  };

  const truncateText = (text: string) => text ? (text.length > 80 ? text.substring(0, 80) + '...' : text) : '';

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Database className="w-8 h-8 text-indigo-600" />
            Ngân hàng Câu hỏi
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Quản lý và tra cứu kho câu hỏi trắc nghiệm, tự luận.</p>
        </div>
      </div>

      {/* Top Bar - Filters & Actions */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4 mb-6">
        
        {/* Row 1: Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <select value={filters.grade} onChange={e => handleFilterChange('grade', e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 w-40 font-medium text-gray-700 bg-white">
              <option value="">-- Lớp --</option>
              {uniqueGrades.map(g => <option key={g as string} value={g as string}>{g as string}</option>)}
            </select>
            <select value={filters.subject} onChange={e => handleFilterChange('subject', e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 w-48 font-medium text-gray-700 bg-white">
              <option value="">-- Phân môn --</option>
              {uniqueSubjects.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
            </select>
            <select value={filters.topic} onChange={e => handleFilterChange('topic', e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 flex-1 font-medium text-gray-700 bg-white">
              <option value="">-- Chuyên đề --</option>
              {uniqueTopics.map(t => <option key={t as string} value={t as string}>{t as string}</option>)}
            </select>
          </div>
          
          <div className="flex gap-3">
            <select value={filters.lesson} onChange={e => handleFilterChange('lesson', e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 flex-1 font-medium text-gray-700 bg-white">
              <option value="">-- Tên bài --</option>
              {uniqueLessons.map(l => <option key={l as string} value={l as string}>{l as string}</option>)}
            </select>
            <select value={filters.difficulty} onChange={e => handleFilterChange('difficulty', e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 w-40 font-medium text-gray-700 bg-white">
              <option value="">-- Mức độ --</option>
              <option value="1">Nhận biết</option>
              <option value="2">Thông hiểu</option>
              <option value="3">Vận dụng</option>
              <option value="4">Vận dụng cao</option>
            </select>
          </div>

          <div className="flex gap-3">
            <select value={filters.math_form} onChange={e => handleFilterChange('math_form', e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 flex-1 font-medium text-gray-700 bg-white">
              <option value="">-- Dạng toán --</option>
              {uniqueForms.map(f => <option key={f as string} value={f as string}>{f as string}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: Search & Buttons */}
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Tìm kiếm (Nội dung, Mã CH, Dạng toán, Chuyên đề...)" 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 shadow-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-800 font-medium transition-all"
            />
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-4 py-3 rounded-xl font-bold transition-all text-sm shadow-sm"
            >
              <FileDown className="w-4 h-4" /> Xuất Word <ChevronDown className="w-4 h-4" />
            </button>
            {isExportMenuOpen && (
              <div className="absolute top-full mt-2 left-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                <button onClick={() => handleExportDocx('student')} className="w-full text-left px-4 py-2 hover:bg-indigo-50 font-medium text-gray-700">Bản Học Sinh (Chỉ Đề)</button>
                <button onClick={() => handleExportDocx('teacher')} className="w-full text-left px-4 py-2 hover:bg-indigo-50 font-medium text-gray-700">Bản Giáo Viên (Có Lời giải)</button>
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsCategoryModalOpen(true)} 
            className="flex items-center gap-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-4 py-3 rounded-xl font-bold transition-colors text-sm shadow-sm bg-white"
          >
            <Database className="w-4 h-4" /> Danh mục
          </button>
          <button 
            onClick={() => setEditingQuestion({ grade: "12", subject: "Đại số", topic: "", lesson: "", math_form: "", question_type: "NLC", difficulty: "1", content: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "", explanation: "" })}
            className="flex items-center gap-2 bg-teal-700 text-white hover:bg-teal-800 px-4 py-3 rounded-xl font-bold transition-all text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" /> Thêm câu hỏi
          </button>
          <Link 
            href="/admin/questions/editor" 
            className="flex items-center gap-2 bg-orange-600 text-white hover:bg-orange-700 px-4 py-3 rounded-xl font-bold transition-all text-sm shadow-sm"
          >
            <Database className="w-4 h-4" /> Thêm hàng loạt (AI)
          </Link>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto mb-6">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
              <tr className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                <th className="p-4 border-b border-gray-100 w-12">
                  <input type="checkbox" checked={selectedQuestions.length === questions.length && questions.length > 0} onChange={e => handleSelectAll(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                </th>
                <th className="p-4 border-b border-gray-100">Mã CH</th>
                <th className="p-4 border-b border-gray-100">Chuyên đề / Dạng toán</th>
                <th className="p-4 border-b border-gray-100">Nội dung (Trích dẫn)</th>
                <th className="p-4 border-b border-gray-100">Loại</th>
                <th className="p-4 border-b border-gray-100">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">Đang tải dữ liệu...</td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">Không tìm thấy câu hỏi nào.</td>
                </tr>
              ) : questions.map((q) => (
                <tr key={q.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="p-4">
                    <input type="checkbox" checked={selectedQuestions.includes(q.id)} onChange={e => handleSelectOne(q.id, e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                  </td>
                  <td className="p-4 font-bold text-gray-700 text-sm whitespace-nowrap">{q.question_id}</td>
                  <td className="p-4 min-w-[280px]">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {q.grade && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">Lớp {q.grade.replace('Lớp', '').trim()}</span>}
                      {q.subject && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">{q.subject}</span>}
                    </div>
                    {q.topic && <div className="font-bold text-indigo-900 text-xs mb-1 line-clamp-1" title={q.topic}>Chương/CĐ: <span className="text-gray-700">{q.topic}</span></div>}
                    {q.lesson && <div className="font-semibold text-gray-700 text-[11px] mb-1 line-clamp-1" title={q.lesson}>Bài: <span className="font-normal">{q.lesson}</span></div>}
                    {q.math_form && (
                      <div className="text-emerald-700 text-[11px] flex items-center gap-1.5 mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                        <span className="font-medium line-clamp-1" title={q.math_form}>{q.math_form}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-gray-700 text-sm font-medium line-clamp-2 max-w-md" title={q.content}>
                      {q.content.length > 100 ? q.content.substring(0, 100) + "..." : q.content}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex gap-1">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                          {q.question_type}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 text-[10px] font-bold border border-orange-100">
                          {DIFFICULTY_LABELS[q.difficulty] || `Mức ${q.difficulty}`}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                        Đã dùng: <strong className="text-gray-700">{q.usage_count || 0}</strong> lần
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => setPreviewQuestion(q)} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" title="Xem trước">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingQuestion(q)} className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors" title="Sửa">
                        <FileEdit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(q.id)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <div className="text-sm font-medium text-gray-500">
            Hiển thị trang <span className="font-bold text-indigo-600">{currentPage}</span> / {totalPages}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              Trang trước
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Upload className="w-6 h-6 text-emerald-600" /> Nhập Dữ liệu từ App cũ
              </h2>
              <button onClick={() => setIsImportModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            
            <div className="p-8">
              {!importStats ? (
                <>
                  <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl mb-6 shadow-inner">
                    <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2"><AlertCircle className="w-5 h-5"/> Hướng dẫn:</h3>
                    <ul className="text-sm text-blue-800 space-y-2 font-medium ml-2 list-disc list-inside">
                      <li>Truy cập Google Sheet của app Ngân hàng Câu hỏi cũ.</li>
                      <li>Chọn Trang tính <strong>NganHangCauHoi</strong>.</li>
                      <li>Bấm <strong>Tệp (File) &gt; Tải xuống &gt; Csv (.csv)</strong>.</li>
                      <li>Tải file .csv đó lên ô bên dưới đây.</li>
                    </ul>
                  </div>

                  <div 
                    onClick={() => !isImporting && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${isImporting ? 'border-gray-300 bg-gray-50' : 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50'}`}
                  >
                    <input 
                      type="file" 
                      accept=".csv" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                    />
                    {isImporting ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                        <p className="font-bold text-emerald-700 text-lg">Hệ thống đang quét và chèn dữ liệu...</p>
                        <p className="text-sm text-emerald-600 mt-2">Vui lòng không đóng cửa sổ này!</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-emerald-100 mb-4">
                          <Upload className="w-8 h-8 text-emerald-500" />
                        </div>
                        <p className="font-bold text-gray-700 text-lg">Bấm để Chọn File CSV</p>
                        <p className="text-sm text-gray-500 mt-2">Hỗ trợ file xuất trực tiếp từ Google Sheet</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border-4 border-white">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-800 mb-2">Nhập Dữ Liệu Thành Công!</h3>
                  <p className="text-gray-500 font-medium mb-8">Dữ liệu từ Google Sheet cũ đã nằm trọn trong hệ thống mới.</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm">
                      <div className="text-3xl font-black text-emerald-600 mb-1">{importStats.success}</div>
                      <div className="text-sm font-bold text-emerald-800">Câu hỏi được thêm</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-sm">
                      <div className="text-3xl font-black text-gray-600 mb-1">{importStats.total}</div>
                      <div className="text-sm font-bold text-gray-700">Tổng số dòng quét qua</div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setIsImportModalOpen(false)}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-md hover:shadow-lg text-lg"
                  >
                    Hoàn tất & Đóng
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <PreviewQuestionModal 
        isOpen={!!previewQuestion} 
        onClose={() => setPreviewQuestion(null)} 
        question={previewQuestion} 
      />
      <QuestionEditorModal 
        isOpen={!!editingQuestion} 
        onClose={() => setEditingQuestion(null)} 
        question={editingQuestion} 
        onSave={handleModalSave} 
      />

      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoriesUpdated={fetchCategories}
      />
    </div>
  );
}
