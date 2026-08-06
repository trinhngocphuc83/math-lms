"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { 
  FileEdit, Search, Plus, Upload, Loader2, Database,
  Filter, ChevronLeft, ChevronRight, ChevronUp, CheckCircle2,
  AlertCircle, X, Trash2, ChevronDown, FileDown, Eye, Wand2, RefreshCw
} from "lucide-react";
import Papa from "papaparse";
import QuestionEditorModal from "@/components/admin/QuestionEditorModal";
import PreviewQuestionModal from "@/components/admin/PreviewQuestionModal";
import { exportQuestionsToWord } from "@/utils/exportDocx";
import CategoryManagerModal from "@/components/admin/CategoryManagerModal";
import {
  bankTypeLabel,
  difficultyLabel,
  toBankType,
  toDifficultyCode,
  bankTypeSynonyms,
  difficultySynonyms,
} from "@/utils/questionTypes";

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
  const [isChangeTypeMenuOpen, setIsChangeTypeMenuOpen] = useState(false);
  const [isChangingType, setIsChangingType] = useState(false);
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);

  // Thanh lọc/thao tác: mặc định thu gọn để đỡ chiếm chỗ, nhớ trạng thái lần mở gần nhất
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  useEffect(() => {
    try { setIsFilterExpanded(localStorage.getItem('questionsPage.filterExpanded') === '1'); } catch {}
  }, []);
  const toggleFilterExpanded = () => {
    setIsFilterExpanded(prev => {
      const next = !prev;
      try { localStorage.setItem('questionsPage.filterExpanded', next ? '1' : '0'); } catch {}
      return next;
    });
  };

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
        // Lấy tất cả các chữ cái và số từ chuỗi tìm kiếm, bỏ qua các ký hiệu đặc biệt của LaTeX
        let tokens = trimmedTerm.match(/[\p{L}\d]+/gu) || [];
        
        if (tokens.length > 0) {
          // Lấy tối đa 15 từ khóa đầu và 15 từ khóa cuối để tránh query quá dài gây lỗi database
          if (tokens.length > 30) {
            tokens = [...tokens.slice(0, 15), ...tokens.slice(-15)];
          }
          
          // Nối các từ khóa lại bằng dấu % để tạo thành chuỗi tìm kiếm theo ĐÚNG THỨ TỰ (từ đầu đến cuối)
          const pattern = `%${tokens.join('%')}%`;
          
          // Tìm kiếm trên nhiều cột, sử dụng pattern đã được làm sạch (chỉ chứa chữ/số, an toàn tuyệt đối cho PostgREST)
          query = query.or(`content.ilike.${pattern},question_id.ilike.${pattern},math_form.ilike.${pattern},lesson.ilike.${pattern},topic.ilike.${pattern}`);
        } else {
          // Fallback nếu người dùng chỉ nhập toàn ký tự đặc biệt
          // Không dùng .or() vì ký tự đặc biệt có thể phá vỡ cú pháp của PostgREST
          query = query.ilike('content', `%${trimmedTerm}%`);
        }
      }
      if (filters.grade) query = query.eq('grade', filters.grade);
      if (filters.subject) query = query.eq('subject', filters.subject);
      if (filters.topic) query = query.eq('topic', filters.topic);
      if (filters.lesson) query = query.eq('lesson', filters.lesson);
      if (filters.math_form) query = query.eq('math_form', filters.math_form);
      // Lọc theo TẤT CẢ cách viết từng dùng, để tìm được cả câu hỏi lưu theo quy ước cũ
      // (ví dụ "multiple_choice", "TN" đều thuộc nhóm Trắc nghiệm).
      if (filters.difficulty) {
        const code = toDifficultyCode(filters.difficulty);
        query = code ? query.in('difficulty', difficultySynonyms(code)) : query.eq('difficulty', filters.difficulty);
      }
      if (filters.question_type) {
        const code = toBankType(filters.question_type);
        query = code ? query.in('question_type', bankTypeSynonyms(code)) : query.eq('question_type', filters.question_type);
      }
      
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

  const handleChangeBulkType = async (newType: string) => {
    if (selectedQuestions.length === 0) return;
    
    // Hộp thoại xác nhận
    const typeLabel = newType === 'NLC' ? 'Trắc nghiệm' : newType === 'DS' ? 'Đúng/Sai' : newType === 'TLN' ? 'Trả lời ngắn' : 'Tự luận';
    const confirmMsg = `Bạn có chắc chắn muốn đổi dạng thức của ${selectedQuestions.length} câu hỏi đã chọn thành "${typeLabel}" không?`;
    if (!window.confirm(confirmMsg)) return;

    setIsChangingType(true);
    setIsChangeTypeMenuOpen(false);
    
    try {
      const { error } = await supabase
        .from('questions')
        .update({ question_type: newType })
        .in('id', selectedQuestions);
        
      if (error) throw error;
      
      alert(`Đã chuyển đổi thành công ${selectedQuestions.length} câu hỏi thành ${typeLabel}!`);
      setSelectedQuestions([]);
      fetchQuestions(); // Giữ nguyên trang hiện tại
    } catch (error: any) {
      console.error("Lỗi khi đổi dạng thức:", error);
      alert("Lỗi khi đổi dạng thức: " + error.message);
    } finally {
      setIsChangingType(false);
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
      const isNew = !updatedQuestion.id;
      const qId = updatedQuestion.question_id || `CH_NEW_${Date.now()}`;
      
      const recordsToSave = [{
        ...updatedQuestion,
        question_id: qId
      }];

      if (isNew && updatedQuestion.question_type === 'DS' && updatedQuestion.math_form === 'Toán tổng hợp' && updatedQuestion.lesson !== 'Ôn tập chương') {
        const cloneRecord = {
          ...updatedQuestion,
          question_id: `CH_NEW_${Date.now()}_clone`,
          lesson: "Ôn tập chương"
        };
        delete cloneRecord.id;
        recordsToSave.push(cloneRecord);
      }

      for (const record of recordsToSave) {
        const { error } = await supabase.from('questions').upsert(record);
        if (error) throw error;
      }
      
      alert("Lưu câu hỏi thành công!" + (recordsToSave.length > 1 ? " (Đã tự động tạo thêm 1 bản sao vào bài Ôn tập chương)" : ""));
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

  const activeFilterCount = Object.values(filters).filter(v => v).length;
  const clearAllFilters = () => {
    setFilters({ grade: "", subject: "", topic: "", lesson: "", math_form: "", difficulty: "", question_type: "" });
    setCurrentPage(1);
  };

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-600" />
            Ngân hàng Câu hỏi
          </h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">Quản lý và tra cứu kho câu hỏi trắc nghiệm, tự luận.</p>
        </div>
      </div>

      {/* Top Bar - Filters & Actions: gọn 1 dòng, bấm "Bộ lọc" để mở rộng khi cần */}
      <div className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex-1 min-w-[180px] relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm (Nội dung, Mã CH, Dạng toán, Chuyên đề...)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-800 text-sm font-medium transition-all"
            />
          </div>

          <button
            onClick={toggleFilterExpanded}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-colors border ${isFilterExpanded ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'}`}
          >
            <Filter className="w-3.5 h-3.5" /> Bộ lọc
            {activeFilterCount > 0 && (
              <span className={`text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center ${isFilterExpanded ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'}`}>{activeFilterCount}</span>
            )}
            {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-lg font-bold transition-all text-xs shadow-sm"
            >
              <FileDown className="w-3.5 h-3.5" /> Xuất Word <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {isExportMenuOpen && (
              <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                <button onClick={() => handleExportDocx('student')} className="w-full text-left px-4 py-2 hover:bg-indigo-50 font-medium text-gray-700 text-sm">Bản Học Sinh (Chỉ Đề)</button>
                <button onClick={() => handleExportDocx('teacher')} className="w-full text-left px-4 py-2 hover:bg-indigo-50 font-medium text-gray-700 text-sm">Bản Giáo Viên (Có Lời giải)</button>
              </div>
            )}
          </div>

          {selectedQuestions.length > 0 && (
            <div className="relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setIsChangeTypeMenuOpen(!isChangeTypeMenuOpen)}
                disabled={isChangingType}
                className="flex items-center gap-1.5 bg-amber-600 text-white hover:bg-amber-700 px-3 py-2 rounded-lg font-bold transition-all text-xs shadow-sm disabled:opacity-50"
              >
                {isChangingType ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Đổi Dạng ({selectedQuestions.length}) <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {isChangeTypeMenuOpen && (
                <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Chọn dạng mới</div>
                  <button onClick={() => handleChangeBulkType('NLC')} className="w-full text-left px-4 py-2 hover:bg-amber-50 font-medium text-gray-700 text-sm">Trắc nghiệm (NLC)</button>
                  <button onClick={() => handleChangeBulkType('DS')} className="w-full text-left px-4 py-2 hover:bg-amber-50 font-medium text-gray-700 text-sm">Đúng/Sai (DS)</button>
                  <button onClick={() => handleChangeBulkType('TLN')} className="w-full text-left px-4 py-2 hover:bg-amber-50 font-medium text-gray-700 text-sm">Trả lời ngắn (TLN)</button>
                  <button onClick={() => handleChangeBulkType('TL')} className="w-full text-left px-4 py-2 hover:bg-amber-50 font-medium text-gray-700 text-sm">Tự luận (TL)</button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-3 py-2 rounded-lg font-bold transition-colors text-xs shadow-sm bg-white"
          >
            <Database className="w-3.5 h-3.5" /> Danh mục
          </button>
          <button
            onClick={() => setEditingQuestion({ grade: "12", subject: "Đại số", topic: "", lesson: "", math_form: "", question_type: "NLC", difficulty: "1", content: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "", explanation: "" })}
            className="flex items-center gap-1.5 bg-teal-700 text-white hover:bg-teal-800 px-3 py-2 rounded-lg font-bold transition-all text-xs shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm câu hỏi
          </button>

          <div className="relative">
            <button
              onClick={() => setIsAiMenuOpen(!isAiMenuOpen)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-pink-600 text-white hover:opacity-90 px-3 py-2 rounded-lg font-bold transition-all text-xs shadow-sm"
            >
              <Wand2 className="w-3.5 h-3.5" /> Công cụ AI <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {isAiMenuOpen && (
              <div className="absolute top-full mt-2 right-0 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                <Link href="/admin/questions/editor" onClick={() => setIsAiMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-orange-50 font-medium text-gray-700 text-sm">
                  <Database className="w-4 h-4 text-orange-600" /> Thêm hàng loạt (AI)
                </Link>
                <Link href="/admin/questions/generator" onClick={() => setIsAiMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-purple-50 font-medium text-gray-700 text-sm">
                  <Wand2 className="w-4 h-4 text-purple-600" /> Sinh trắc nghiệm (AI)
                </Link>
                <Link href="/admin/questions/similar-generator" onClick={() => setIsAiMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-pink-50 font-medium text-gray-700 text-sm">
                  <Wand2 className="w-4 h-4 text-pink-600" /> Sinh câu tương tự (AI)
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Bộ lọc chi tiết - chỉ hiện khi bấm "Bộ lọc" */}
        {isFilterExpanded && (
          <div className="flex flex-wrap gap-2 mt-2.5 pt-2.5 border-t border-gray-100 animate-in fade-in slide-in-from-top-1 duration-150">
            <select value={filters.grade} onChange={e => handleFilterChange('grade', e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-500 font-medium text-gray-700 bg-white">
              <option value="">-- Lớp --</option>
              {uniqueGrades.map(g => <option key={g as string} value={g as string}>{g as string}</option>)}
            </select>
            <select value={filters.subject} onChange={e => handleFilterChange('subject', e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-500 font-medium text-gray-700 bg-white">
              <option value="">-- Phân môn --</option>
              {uniqueSubjects.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
            </select>
            <select value={filters.topic} onChange={e => handleFilterChange('topic', e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-500 font-medium text-gray-700 bg-white max-w-[170px]">
              <option value="">-- Chuyên đề --</option>
              {uniqueTopics.map(t => <option key={t as string} value={t as string}>{t as string}</option>)}
            </select>
            <select value={filters.lesson} onChange={e => handleFilterChange('lesson', e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-500 font-medium text-gray-700 bg-white max-w-[170px]">
              <option value="">-- Tên bài --</option>
              {uniqueLessons.map(l => <option key={l as string} value={l as string}>{l as string}</option>)}
            </select>
            <select value={filters.difficulty} onChange={e => handleFilterChange('difficulty', e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-500 font-medium text-gray-700 bg-white">
              <option value="">-- Mức độ --</option>
              <option value="1">Nhận biết</option>
              <option value="2">Thông hiểu</option>
              <option value="3">Vận dụng</option>
              <option value="4">Vận dụng cao</option>
            </select>
            <select value={filters.math_form} onChange={e => handleFilterChange('math_form', e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-500 font-medium text-gray-700 bg-white max-w-[170px]">
              <option value="">-- Dạng toán --</option>
              {uniqueForms.map(f => <option key={f as string} value={f as string}>{f as string}</option>)}
            </select>
            <select value={filters.question_type} onChange={e => handleFilterChange('question_type', e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-500 font-medium text-gray-700 bg-white">
              <option value="">-- Dạng thức --</option>
              <option value="NLC">Trắc nghiệm</option>
              <option value="DS">Đúng/Sai</option>
              <option value="TLN">Trả lời ngắn</option>
              <option value="TL">Tự luận</option>
            </select>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="text-xs font-bold text-gray-400 hover:text-red-600 underline px-1">Xoá lọc ({activeFilterCount})</button>
            )}
          </div>
        )}
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
                          {bankTypeLabel(q.question_type)}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 text-[10px] font-bold border border-orange-100">
                          {difficultyLabel(q.difficulty)}
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
        onUpdate={(updated) => {
          setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
          setPreviewQuestion(updated);
        }}
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
