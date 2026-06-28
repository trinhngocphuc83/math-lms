"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { exportQuestionsToWord } from "@/utils/docxExporter";
import { 
  Sliders, Download, UploadCloud, Trash2, Printer, FileText, Settings, Database, Shuffle, CheckCircle, X, ChevronDown, ChevronRight, Folder, File, List
} from "lucide-react";
import * as XLSX from "xlsx";

interface CategoryData {
  id: string;
  grade: string;
  subject: string;
  topic: string;
  lesson: string;
  math_form: string;
}

interface InventoryData {
  math_form: string;
  question_type: string;
  difficulty: string;
  count: number;
}

interface MatrixItem {
  id: string; // unique id in matrix
  category_id: string;
  math_form: string;
  topic: string;
  question_type: string; // TN, DS, TLN, TL
  difficulty: string; // 1, 2, 3, 4
  count: number;
  max_count: number;
}

export default function ExamsManagerPage() {
  const supabase = createClient();

  // Filters
  const [examType, setExamType] = useState("Kiểm tra Giữa kỳ I");
  const [grade, setGrade] = useState("12");
  const [subject, setSubject] = useState("Đại số");
  const [topicFilter, setTopicFilter] = useState("");
  const [topicList, setTopicList] = useState<string[]>([]);
  const [lessonFilter, setLessonFilter] = useState("");
  const [lessonList, setLessonList] = useState<string[]>([]);
  const [formFilter, setFormFilter] = useState("");
  const [formList, setFormList] = useState<string[]>([]);
  const [qTypeFilter, setQTypeFilter] = useState("");
  const [uniqueGrades, setUniqueGrades] = useState<string[]>([]);
  const [uniqueSubjects, setUniqueSubjects] = useState<string[]>([]);
  
  // Data State
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [inventory, setInventory] = useState<InventoryData[]>([]);
  const [matrixItems, setMatrixItems] = useState<MatrixItem[]>([]);
  
  // Loading & Generating
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // UI States
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({});
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchBaseCategories = async () => {
      const { data } = await supabase.from('question_categories').select('grade, subject');
      if (data) {
        setUniqueGrades(Array.from(new Set(data.map(d => d.grade))).filter(Boolean).sort() as string[]);
        setUniqueSubjects(Array.from(new Set(data.map(d => d.subject))).filter(Boolean) as string[]);
      }
    };
    fetchBaseCategories();
  }, []);

  useEffect(() => {
    const fetchTreeFilters = async () => {
      if (!grade || !subject) {
        setTopicList([]); setLessonList([]); setFormList([]);
        return;
      }
      let query = supabase.from('question_categories').select('topic, lesson, math_form').eq('grade', grade).eq('subject', subject);
      const { data } = await query;
      if (data) {
        setTopicList(Array.from(new Set(data.map(d => d.topic))).filter(Boolean) as string[]);
        
        let lessonData = data;
        if (topicFilter) lessonData = data.filter(d => d.topic === topicFilter);
        setLessonList(Array.from(new Set(lessonData.map(d => d.lesson))).filter(Boolean) as string[]);

        let formData = lessonData;
        if (lessonFilter) formData = lessonData.filter(d => d.lesson === lessonFilter);
        setFormList(Array.from(new Set(formData.map(d => d.math_form))).filter(Boolean) as string[]);
      }
    };
    fetchTreeFilters();
  }, [grade, subject, topicFilter, lessonFilter]);

  const fetchTreeAndInventory = async () => {
    setIsLoadingTree(true);
    try {
      // 1. Lấy danh mục
      let query = supabase.from('question_categories').select('*').order('topic').order('lesson');
      if (grade) query = query.eq('grade', grade);
      if (subject) query = query.eq('subject', subject);
      if (topicFilter) query = query.eq('topic', topicFilter);
      if (lessonFilter) query = query.eq('lesson', lessonFilter);
      if (formFilter) query = query.eq('math_form', formFilter);
      
      const { data: cats, error: err1 } = await query;
      if (err1) throw err1;
      
      // 2. Quét kho
      let qQuery = supabase.from('questions').select('topic, lesson, math_form, grade, subject, question_type, difficulty');
      if (grade) qQuery = qQuery.eq('grade', grade);
      if (subject) qQuery = qQuery.eq('subject', subject);
      if (topicFilter) qQuery = qQuery.eq('topic', topicFilter);
      if (lessonFilter) qQuery = qQuery.eq('lesson', lessonFilter);
      if (formFilter) qQuery = qQuery.eq('math_form', formFilter);
      if (qTypeFilter) qQuery = qQuery.eq('question_type', qTypeFilter);

      const { data: qData, error: err2 } = await qQuery;
      if (err2) throw err2;

      const counts: Record<string, number> = {};
      const extraCatsMap = new Map<string, CategoryData>();

      qData.forEach(q => {
        const form = q.math_form;
        const qType = q.question_type || 'TN';
        const qDiff = q.difficulty || '1';
        
        if (form) {
          const key = `${form}||${qType}||${qDiff}`;
          counts[key] = (counts[key] || 0) + 1;
          
          if (!extraCatsMap.has(form)) {
            extraCatsMap.set(form, {
              id: `auto_${form}`,
              grade: q.grade || grade,
              subject: q.subject || subject,
              topic: q.topic || 'Chưa phân loại',
              lesson: q.lesson || 'Chưa phân loại',
              math_form: form
            });
          }
        }
      });

      const inv: InventoryData[] = Object.keys(counts).map(k => {
        const [math_form, question_type, difficulty] = k.split('||');
        return { math_form, question_type, difficulty, count: counts[k] };
      });
      
      let finalCats = [...(cats || [])];
      extraCatsMap.forEach((val, key) => {
        if (!finalCats.find(c => c.math_form === key)) {
          finalCats.push(val);
        }
      });
      
      setCategories(finalCats);
      setInventory(inv);
    } catch (e: any) {
      alert("Lỗi tải cây thư mục: " + e.message);
    } finally {
      setIsLoadingTree(false);
    }
  };

  const toggleTopic = (topic: string) => setExpandedTopics(prev => ({ ...prev, [topic]: !prev[topic] }));
  const toggleLesson = (lesson: string) => setExpandedLessons(prev => ({ ...prev, [lesson]: !prev[lesson] }));
  const toggleType = (key: string) => setExpandedTypes(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleMatrixItem = (cat: CategoryData, inv: InventoryData) => {
    const key = `${cat.math_form}_${inv.question_type}_${inv.difficulty}`;
    const existing = matrixItems.find(m => m.id === key);
    if (existing) {
      setMatrixItems(matrixItems.filter(item => item.id !== key));
    } else {
      setMatrixItems([...matrixItems, {
        id: key,
        category_id: cat.id,
        math_form: cat.math_form,
        topic: cat.topic,
        question_type: inv.question_type,
        difficulty: inv.difficulty,
        count: 1,
        max_count: inv.count
      }]);
    }
  };

  const removeMatrixItem = (id: string) => {
    setMatrixItems(matrixItems.filter(item => item.id !== id));
  };

  const updateMatrixItem = (id: string, field: keyof MatrixItem, value: any) => {
    setMatrixItems(matrixItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const clearMatrix = () => {
    if(confirm("Bạn có chắc chắn muốn xoá toàn bộ ma trận?")) setMatrixItems([]);
  };

  const generateExam = async () => {
    if (matrixItems.length === 0) {
      alert("Vui lòng thêm ít nhất 1 dạng toán vào ma trận!");
      return;
    }
    setIsGenerating(true);
    try {
      let finalQuestions: any[] = [];
      
      for (const item of matrixItems) {
        let query = supabase
          .from('questions')
          .select('*')
          .eq('math_form', item.math_form)
          .eq('question_type', item.question_type)
          .eq('difficulty', item.difficulty);
        
        if (grade) query = query.eq('grade', grade);
        if (subject) query = query.eq('subject', subject);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Bước 1: Trộn ngẫu nhiên
          const shuffled = data.sort(() => 0.5 - Math.random());
          // Bước 2: Ưu tiên các câu chưa dùng hoặc dùng ít
          const sorted = shuffled.sort((a, b) => (a.usage_count || 0) - (b.usage_count || 0));
          const selected = sorted.slice(0, item.count);
          finalQuestions = [...finalQuestions, ...selected];
        }
      }
      
      if(finalQuestions.length === 0) {
        alert("Không tìm thấy câu hỏi nào thoả mãn ma trận trong kho!");
      } else {
        setGeneratedQuestions(finalQuestions);
        setShowPreviewModal(true);
      }
    } catch (error: any) {
      alert("Lỗi khi sinh đề: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const [isFinalizing, setIsFinalizing] = useState(false);

  const handleFinalizeExam = async () => {
    if (generatedQuestions.length === 0) return alert("Không có câu hỏi nào để chốt!");
    setIsFinalizing(true);
    try {
      for (const q of generatedQuestions) {
        const newCount = (q.usage_count || 0) + 1;
        await supabase.from('questions').update({ usage_count: newCount }).eq('id', q.id);
      }
      setGeneratedQuestions(prev => prev.map(q => ({...q, usage_count: (q.usage_count || 0) + 1})));
      alert("Đã chốt đề thành công! Số lần sử dụng của các câu hỏi trong đề đã được cộng thêm 1.");
    } catch (error: any) {
      alert("Lỗi khi chốt đề: " + error.message);
    } finally {
      setIsFinalizing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportWordStudent = async () => {
    try {
      if(generatedQuestions.length === 0) return alert("Chưa có đề thi nào được sinh!");
      await exportQuestionsToWord(generatedQuestions, 'student');
    } catch (e: any) {
      alert("Lỗi xuất Word: " + e.message);
    }
  };

  const handleExportWordTeacher = async () => {
    try {
      if(generatedQuestions.length === 0) return alert("Chưa có đề thi nào được sinh!");
      await exportQuestionsToWord(generatedQuestions, 'teacher');
    } catch (e: any) {
      alert("Lỗi xuất Word: " + e.message);
    }
  };

  const handleExportMatrix = () => {
    const wsData = [
      ["STT", "Dạng Toán", "Loại Câu", "Mức độ", "Số Câu"],
      ...matrixItems.map((item, i) => [
        i + 1,
        item.math_form,
        item.question_type,
        item.difficulty,
        item.count
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ma Tran");
    XLSX.writeFile(wb, "Ma_Tran_De_Thi.xlsx");
  };

  const getTypeName = (type: string) => {
    if (['TN', 'NLC'].includes(type)) return 'Trắc nghiệm nhiều lựa chọn';
    if (type === 'DS') return 'Trắc nghiệm Đúng/Sai';
    if (type === 'TLN') return 'Trả lời ngắn';
    if (type === 'TL') return 'Tự luận';
    return type || 'Khác';
  };
  
  const getDiffName = (level: string) => {
    if (level === '1' || level === 'NB') return 'Mức 1';
    if (level === '2' || level === 'TH') return 'Mức 2';
    if (level === '3' || level === 'VD') return 'Mức 3';
    if (level === '4' || level === 'VDC') return 'Mức 4';
    return `Mức ${level}`;
  };

  // Group Categories & Inventory for UI Tree
  const groupedCategories: Record<string, Record<string, Record<string, any[]>>> = {};
  
  categories.forEach(cat => {
    const invItems = inventory.filter(i => i.math_form === cat.math_form);
    if (invItems.length === 0) return; // Chỉ hiển thị dạng toán có trong kho

    if (!groupedCategories[cat.topic]) groupedCategories[cat.topic] = {};
    if (!groupedCategories[cat.topic][cat.lesson]) groupedCategories[cat.topic][cat.lesson] = {};
    
    invItems.forEach(inv => {
      const typeName = getTypeName(inv.question_type);
      if (!groupedCategories[cat.topic][cat.lesson][typeName]) {
        groupedCategories[cat.topic][cat.lesson][typeName] = [];
      }
      groupedCategories[cat.topic][cat.lesson][typeName].push({ cat, inv });
    });
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden text-gray-800">
      <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-4">
        
        {/* Header & Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4 flex-shrink-0">
          <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}>
            <h2 className="text-xl font-bold text-teal-800 flex items-center gap-2">
              <Sliders className="w-6 h-6" /> Thiết lập Ma trận Đề thi chuẩn 2025
            </h2>
            <button className="text-gray-400 hover:text-teal-600 transition-colors p-1 bg-gray-50 rounded-lg hover:bg-teal-50">
              {isHeaderExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
          
          {isHeaderExpanded && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-wrap items-center gap-3">
              <select value={examType} onChange={e=>setExamType(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 font-bold text-indigo-700 bg-indigo-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                <option>Kiểm tra Giữa kỳ I</option>
                <option>Kiểm tra Cuối kỳ I</option>
                <option>Kiểm tra Giữa kỳ II</option>
                <option>Kiểm tra Cuối kỳ II</option>
                <option>Sinh bài giảng (Ôn tập)</option>
                <option>Đề thi thử THPT QG</option>
                <option>Đề thi thử lớp 10</option>
              </select>
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <select value={grade} onChange={e=>setGrade(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white">
                <option value="">-- Khối Lớp --</option>
                {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={subject} onChange={e=>setSubject(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white">
                <option value="">-- Phân môn --</option>
                {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={topicFilter} onChange={e=>setTopicFilter(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white max-w-[200px]">
                <option value="">-- Chuyên đề (Tất cả) --</option>
                {topicList.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={lessonFilter} onChange={e=>setLessonFilter(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white max-w-[200px]">
                <option value="">-- Bài học (Tất cả) --</option>
                {lessonList.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select value={formFilter} onChange={e=>setFormFilter(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white max-w-[200px]">
                <option value="">-- Dạng toán (Tất cả) --</option>
                {formList.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select value={qTypeFilter} onChange={e=>setQTypeFilter(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white max-w-[200px]">
                <option value="">-- Dạng thức (Tất cả) --</option>
                <option value="NLC">Trắc nghiệm</option>
                <option value="DS">Đúng/Sai</option>
                <option value="TLN">Trả lời ngắn</option>
                <option value="TL">Tự luận</option>
              </select>
              <button onClick={fetchTreeAndInventory} disabled={isLoadingTree} className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-teal-700 transition-colors text-sm shadow-sm disabled:opacity-50 flex items-center gap-2">
                {isLoadingTree ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Database className="w-4 h-4" />}
                Tải & Quét Kho
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-3 mt-1">
              <button onClick={handleExportMatrix} className="flex items-center gap-2 border border-teal-600 text-teal-700 hover:bg-teal-50 px-4 py-2.5 rounded-xl font-bold transition-colors text-sm bg-white">
                <Download className="w-4 h-4" /> Xuất Excel mẫu
              </button>
              <button className="flex items-center gap-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-bold transition-colors text-sm bg-white cursor-not-allowed opacity-50" title="Đang cập nhật">
                <UploadCloud className="w-4 h-4" /> Import Excel
              </button>
            </div>
          </div>
          )}
        </div>

        {/* 2 Columns Layout */}
        <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
          
          {/* Cột trái: Cây thư mục */}
          <div className="w-[45%] bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden flex-shrink-0">
            <div className="p-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-blue-800 text-[15px] flex items-center gap-2">1. Chọn Dạng Toán</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              {Object.keys(groupedCategories).length === 0 ? (
                <div className="text-center text-gray-400 mt-10 text-sm">Vui lòng chọn Lớp/Môn và bấm "Tải & Quét Kho"</div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedCategories).map(([topic, lessons]) => {
                    const isTopicExpanded = expandedTopics[topic] !== false;
                    return (
                    <div key={topic} className="border-b border-gray-100 pb-3">
                      <div 
                        className="font-bold text-indigo-900 text-[14px] mb-2 flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors"
                        onClick={() => toggleTopic(topic)}
                      >
                        <Folder className="w-5 h-5 text-indigo-600" />
                        <span className="uppercase" title={topic}>{topic}</span>
                      </div>
                      
                      {isTopicExpanded && (
                        <div className="space-y-3 pl-3 border-l-2 border-indigo-50 ml-3 mt-2">
                          {Object.entries(lessons).map(([lesson, types]) => {
                            const isLessonExpanded = expandedLessons[lesson] !== false;
                            return (
                            <div key={lesson} className="bg-gray-100/50 rounded-lg overflow-hidden border border-gray-200/50">
                              <div 
                                className="font-semibold text-gray-700 text-[13px] flex items-center gap-2 cursor-pointer bg-gray-200/50 hover:bg-gray-200 p-2.5 transition-colors"
                                onClick={() => toggleLesson(lesson)}
                              >
                                <File className="w-4 h-4 text-blue-500 shrink-0" />
                                <span title={lesson}>Bài: {lesson}</span>
                              </div>
                              
                              {isLessonExpanded && (
                                <div className="space-y-3 p-3 bg-white">
                                  {Object.entries(types).map(([typeName, forms]) => {
                                    const typeKey = `${lesson}_${typeName}`;
                                    const isTypeExpanded = expandedTypes[typeKey] !== false;
                                    return (
                                      <div key={typeName} className="mb-2 last:mb-0">
                                        <div 
                                          className="text-[13px] text-teal-800 font-bold flex items-center gap-2 cursor-pointer hover:text-teal-600 mb-1.5"
                                          onClick={() => toggleType(typeKey)}
                                        >
                                          <List className="w-4 h-4 text-teal-500 shrink-0" />
                                          {typeName}
                                        </div>
                                        {isTypeExpanded && (
                                          <div className="space-y-2 pl-6">
                                            {(() => {
                                              const formsGrouped = forms.reduce((acc, {cat, inv}) => {
                                                if (!acc[cat.math_form]) acc[cat.math_form] = [];
                                                // Lọc trùng lặp do mảng categories có thể bị duplicate math_form
                                                const exists = acc[cat.math_form].some((item: any) => 
                                                  item.inv.question_type === inv.question_type && 
                                                  item.inv.difficulty === inv.difficulty
                                                );
                                                if (!exists) {
                                                  acc[cat.math_form].push({cat, inv});
                                                }
                                                return acc;
                                              }, {} as Record<string, any[]>);

                                              return Object.entries(formsGrouped).map(([mathFormName, items], idx) => (
                                                <div key={idx} className="bg-white border border-gray-200/60 rounded-xl overflow-hidden hover:border-indigo-200 transition-colors">
                                                  <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100 text-[13px] text-gray-800 font-semibold leading-snug">
                                                    {mathFormName}
                                                  </div>
                                                  <div className="p-2.5 flex flex-wrap gap-2">
                                                    {(items as any[]).map(({cat, inv}: any, subIdx: number) => {
                                                      const formKey = `${cat.math_form}_${inv.question_type}_${inv.difficulty}`;
                                                      const isChecked = matrixItems.some(m => m.id === formKey);
                                                      return (
                                                        <label 
                                                          key={subIdx} 
                                                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer border transition-colors ${isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'}`}
                                                        >
                                                          <input 
                                                            type="checkbox" 
                                                            className="flex-shrink-0 cursor-pointer w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                            checked={isChecked}
                                                            onChange={() => toggleMatrixItem(cat, inv)}
                                                          />
                                                          <span className="text-[12px] text-gray-700 font-medium">
                                                            {getDiffName(inv.difficulty)} <span className="text-gray-400 font-normal">({inv.count})</span>
                                                          </span>
                                                        </label>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              ));
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )})}
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Bảng Ma trận */}
          <div className="w-[55%] bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            <div className="p-3 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-emerald-800 text-[15px]">2. Cấu hình Ma Trận</h3>
              <button onClick={clearMatrix} className="text-xs text-red-600 font-bold hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Xóa bảng
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto relative scrollbar-thin">
              {matrixItems.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 opacity-60">
                  <Settings className="w-16 h-16 mb-4" />
                  <p>Chưa chọn dạng toán nào từ cây thư mục bên trái.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-blue-50/50 sticky top-0 shadow-sm z-10">
                    <tr className="text-[11px] uppercase text-gray-500 font-bold border-b border-gray-100">
                      <th className="p-3">STT</th>
                      <th className="p-3">Dạng Toán</th>
                      <th className="p-3 text-center">Loại Câu</th>
                      <th className="p-3 text-center">Mức độ</th>
                      <th className="p-3 text-center w-20">Số câu</th>
                      <th className="p-3 text-center w-12">HĐ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {matrixItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="p-3 text-center font-bold text-gray-600">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-medium text-gray-800 line-clamp-2" title={item.math_form}>{item.math_form}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-medium text-indigo-600 text-[12px]">{item.question_type}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-medium text-teal-600 text-[12px]">{getDiffName(item.difficulty)}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col items-center">
                            <input 
                              type="number" 
                              min="1" 
                              max={item.max_count}
                              value={item.count} 
                              onChange={(e) => updateMatrixItem(item.id, 'count', parseInt(e.target.value) || 1)}
                              className="w-full border border-gray-200 rounded p-1.5 text-[13px] outline-none focus:border-emerald-500 text-center font-bold"
                            />
                            <span className="text-[10px] text-gray-400 mt-1">(Kho: {item.max_count})</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => removeMatrixItem(item.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors border border-red-100">
                            <X className="w-3.5 h-3.5" /> Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom Panel */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-gray-500">Tổng số câu:</span> <span className="font-black text-lg text-emerald-600">{matrixItems.reduce((acc, curr) => acc + curr.count, 0)}</span>
                </div>
                <button 
                  onClick={generateExam}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shuffle className="w-5 h-5" />}
                  TIẾN HÀNH TRỘN ĐỀ
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Exam Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm p-4 flex justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-full flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-6 h-6 text-teal-600" /> Bản xem trước Đề thi
              </h2>
              <button onClick={() => setShowPreviewModal(false)} className="p-2 text-gray-400 hover:text-red-600 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-3">
              <button onClick={handlePrint} className="bg-teal-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm hover:bg-teal-700">
                <Printer className="w-4 h-4" /> In trực tiếp Web
              </button>
              <button onClick={handleExportWordStudent} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm hover:bg-blue-700">
                <Download className="w-4 h-4" /> Xuất Đề (Học Sinh)
              </button>
              <button onClick={handleExportWordTeacher} className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm hover:bg-indigo-700">
                <Download className="w-4 h-4" /> Xuất Đề + Lời Giải (Giáo Viên)
              </button>
              <button onClick={handleFinalizeExam} disabled={isFinalizing} className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm hover:bg-emerald-700 disabled:opacity-50 ml-2">
                {isFinalizing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Chốt Đề (Lưu bộ đếm)
              </button>
              <span className="ml-auto text-sm text-gray-500">Đã tạo thành công {generatedQuestions.length} câu hỏi.</span>
            </div>
            <div id="print-area" className="flex-1 overflow-y-auto p-8 bg-gray-50" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt' }}>
              <div className="text-center font-bold text-lg uppercase mb-6">{examType || "ĐỀ KIỂM TRA"}</div>
              {generatedQuestions.map((q, i) => (
                <div key={i} className="mb-4">
                  <p className="font-bold inline-block">Câu {i + 1}. </p>
                  <span className="ml-2 mr-2 inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 align-text-bottom">
                    Đã xuất hiện: {q.usage_count || 0} lần
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: ' ' + q.content.replace(/\\n/g, '<br/>').replace(/\\[HINH VẼ ĐỒ THỊ\\]|\\[HÌNH VẼ ĐỒ THỊ\\]/gi, '').replace(/\$(.*?)\$/g, '<span class="math">\\($1\\)</span>') }} />
                  {['TN', 'NLC'].includes(q.question_type) && (
                    <div className="grid grid-cols-2 mt-2 gap-y-1">
                      <div><b>A.</b> <span dangerouslySetInnerHTML={{ __html: (q.option_a || '').replace(/\$(.*?)\$/g, '<span class="math">\\($1\\)</span>') }} /></div>
                      <div><b>B.</b> <span dangerouslySetInnerHTML={{ __html: (q.option_b || '').replace(/\$(.*?)\$/g, '<span class="math">\\($1\\)</span>') }} /></div>
                      <div><b>C.</b> <span dangerouslySetInnerHTML={{ __html: (q.option_c || '').replace(/\$(.*?)\$/g, '<span class="math">\\($1\\)</span>') }} /></div>
                      <div><b>D.</b> <span dangerouslySetInnerHTML={{ __html: (q.option_d || '').replace(/\$(.*?)\$/g, '<span class="math">\\($1\\)</span>') }} /></div>
                    </div>
                  )}
                  {q.question_type === 'DS' && (
                    <div className="mt-2 space-y-1">
                      <div><b>a)</b> <span dangerouslySetInnerHTML={{ __html: (q.option_a || '').replace(/\$(.*?)\$/g, '<span class="math">\\($1\\)</span>') }} /></div>
                      <div><b>b)</b> <span dangerouslySetInnerHTML={{ __html: (q.option_b || '').replace(/\$(.*?)\$/g, '<span class="math">\\($1\\)</span>') }} /></div>
                      <div><b>c)</b> <span dangerouslySetInnerHTML={{ __html: (q.option_c || '').replace(/\$(.*?)\$/g, '<span class="math">\\($1\\)</span>') }} /></div>
                      <div><b>d)</b> <span dangerouslySetInnerHTML={{ __html: (q.option_d || '').replace(/\$(.*?)\$/g, '<span class="math">\\($1\\)</span>') }} /></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
