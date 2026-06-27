"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, Edit2, Trash2, BookOpen, Layers, ArrowLeft, Loader2, ChevronDown, ChevronRight, FileEdit, Sparkles, Video, Pencil, FileText, Target } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function CourseStructurePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const supabase = createClient();

  const [course, setCourse] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Thêm Chương
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");
  const [isSavingChapter, setIsSavingChapter] = useState(false);

  // Modal Thêm Bài Học
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [isSavingLesson, setIsSavingLesson] = useState(false);

  // Modal Thêm Mục (Module)
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleType, setModuleType] = useState("practice");
  const [isSavingModule, setIsSavingModule] = useState(false);
  const [isAddingPracticeChild, setIsAddingPracticeChild] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

  // Accordion State
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const [expandedLessons, setExpandedLessons] = useState<string[]>([]);
  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    loadStructure();
  }, [courseId]);

  const loadStructure = async () => {
    setLoading(true);
    const { data: courseData } = await supabase.from('courses').select('title').eq('id', courseId).single();
    if (courseData) setCourse(courseData);

    const { data: chData } = await supabase.from('chapters').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
    if (chData) {
      setChapters(chData);
      if (expandedChapters.length === 0) setExpandedChapters(chData.map(c => c.id));
    }

    const { data: lsData } = await supabase.from('lessons').select('id, title, chapter_id, order_index').eq('course_id', courseId).order('order_index', { ascending: true });
    if (lsData) {
      setLessons(lsData);
      // Fetch modules for all these lessons
      if (lsData.length > 0) {
        const lessonIds = lsData.map(l => l.id);
        const { data: modData } = await supabase.from('lesson_modules').select('*').in('lesson_id', lessonIds).order('order_index', { ascending: true });
        if (modData) setModules(modData);
      }
    }

    setLoading(false);
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => 
      prev.includes(chapterId) ? prev.filter(id => id !== chapterId) : [...prev, chapterId]
    );
  };

  const toggleLesson = (lessonId: string) => {
    setExpandedLessons(prev => 
      prev.includes(lessonId) ? prev.filter(id => id !== lessonId) : [...prev, lessonId]
    );
  };

  const handleCreateChapter = async () => {
    if (!chapterTitle) return alert("Vui lòng nhập tên chương!");
    setIsSavingChapter(true);
    
    const { error } = await supabase.from('chapters').insert([{
      course_id: courseId,
      title: chapterTitle,
      order_index: chapters.length + 1
    }]);

    setIsSavingChapter(false);
    if (error) {
      alert("Lỗi tạo chương: " + error.message);
    } else {
      setIsChapterModalOpen(false);
      setChapterTitle("");
      loadStructure();
    }
  };

  const openLessonModal = (chapterId: string) => {
    setActiveChapterId(chapterId);
    setLessonTitle("");
    setIsLessonModalOpen(true);
  };

  const handleCreateLesson = async () => {
    if (!lessonTitle) return alert("Vui lòng nhập tên bài học!");
    setIsSavingLesson(true);
    
    const chapterLessons = lessons.filter(l => l.chapter_id === activeChapterId);
    
    const { data: lessonData, error: lessonError } = await supabase.from('lessons').insert([{
      course_id: courseId,
      chapter_id: activeChapterId,
      title: lessonTitle,
      order_index: chapterLessons.length + 1,
      content_jsonb: {}
    }]).select().single();

    if (lessonError) {
      setIsSavingLesson(false);
      return alert("Lỗi tạo bài học: " + lessonError.message);
    }

    // Tự động tạo 5 mô-đun
    if (lessonData) {
      const predefinedModules = [
        { lesson_id: lessonData.id, type: 'theory', title: 'Lý thuyết & Phương pháp giải (Bài giảng tương tác)', order_index: 1 },
        { lesson_id: lessonData.id, type: 'practice', title: 'Luyện tập', order_index: 2 },
        { lesson_id: lessonData.id, type: 'document', title: 'Tài liệu & Video', order_index: 3 }
      ];
      await supabase.from('lesson_modules').insert(predefinedModules);
    }

    setIsSavingLesson(false);
    setIsLessonModalOpen(false);
    loadStructure();
  };

  const handleGenerateDefaultModules = async (lessonId: string) => {
    setIsSavingLesson(true);
    const predefinedModules = [
      { lesson_id: lessonId, type: 'theory', title: 'Lý thuyết & Phương pháp giải (Bài giảng tương tác)', order_index: 1 },
      { lesson_id: lessonId, type: 'practice', title: 'Luyện tập', order_index: 2 },
      { lesson_id: lessonId, type: 'document', title: 'Tài liệu & Video', order_index: 3 }
    ];
    const { error } = await supabase.from('lesson_modules').insert(predefinedModules);
    setIsSavingLesson(false);
    
    if (error) {
      alert("Lỗi khi tạo mục (Có thể bạn chưa chạy lệnh SQL tạo bảng lesson_modules): " + error.message);
      console.error("Insert modules error:", error);
    } else {
      loadStructure();
    }
  };

  const handleDeleteChapter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Xóa chương này sẽ XÓA TOÀN BỘ bài học bên trong. Bạn có chắc chắn không?")) return;
    await supabase.from('chapters').delete().eq('id', id);
    loadStructure();
  };

  const handleDeleteLesson = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc muốn xóa bài giảng này?")) return;
    await supabase.from('lessons').delete().eq('id', id);
    loadStructure();
  };

  const openModuleModal = (lessonId: string, isPracticeChild: boolean = false) => {
    setActiveLessonId(lessonId);
    setModuleTitle("");
    setModuleType(isPracticeChild ? "practice" : "theory");
    setIsAddingPracticeChild(isPracticeChild);
    setEditingModuleId(null);
    setIsModuleModalOpen(true);
  };

  const openEditModuleModal = (module: any) => {
    setActiveLessonId(module.lesson_id);
    setEditingModuleId(module.id);
    setModuleTitle(module.title);
    setModuleType(module.type);
    setIsAddingPracticeChild(module.type === 'practice');
    setIsModuleModalOpen(true);
  };

  const handleSaveModule = async () => {
    if (!moduleTitle) return alert("Vui lòng nhập tên mục!");
    setIsSavingModule(true);
    
    if (editingModuleId) {
      const { error } = await supabase.from('lesson_modules').update({
        title: moduleTitle,
        type: moduleType
      }).eq('id', editingModuleId);
      setIsSavingModule(false);
      if (error) alert("Lỗi cập nhật mục: " + error.message);
      else { setIsModuleModalOpen(false); loadStructure(); }
    } else {
      const lessonModules = modules.filter(m => m.lesson_id === activeLessonId);
      const { error } = await supabase.from('lesson_modules').insert([{
        lesson_id: activeLessonId,
        title: moduleTitle,
        type: moduleType,
        order_index: lessonModules.length + 1
      }]);
      setIsSavingModule(false);
      if (error) alert("Lỗi tạo mục: " + error.message);
      else { setIsModuleModalOpen(false); loadStructure(); }
    }
  };

  const handleDeleteModule = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Bạn có chắc muốn xóa mục này? Toàn bộ dữ liệu của mục sẽ bị mất.")) return;
    await supabase.from('lesson_modules').delete().eq('id', id);
    loadStructure();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-6">
        <Link href="/admin/courses" className="text-teal-600 text-sm font-medium flex items-center gap-1 hover:underline mb-3">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách Khóa học
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Cấu trúc Khóa học</h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600" /> {course?.title || 'Đang tải...'}
            </p>
          </div>
          <button 
            onClick={() => setIsChapterModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" /> Thêm Chương mới
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {chapters.length === 0 ? (
          <div className="bg-white p-10 rounded-xl border border-gray-200 text-center text-gray-500 shadow-sm">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>Khóa học này chưa có Chương nào.</p>
            <p className="text-sm mt-1">Hãy bắt đầu bằng việc tạo một Chương (Ví dụ: Chương 1. Đại số tuyến tính)</p>
          </div>
        ) : (
          chapters.map((chapter) => {
            const isExpanded = expandedChapters.includes(chapter.id);
            const chapterLessons = lessons.filter(l => l.chapter_id === chapter.id);

            return (
              <div key={chapter.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div 
                  className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleChapter(chapter.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                    <h3 className="font-bold text-gray-800 text-lg">{chapter.title}</h3>
                    <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {chapterLessons.length} bài
                    </span>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteChapter(chapter.id, e)} 
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa chương"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="p-4 bg-white">
                    <ul className="space-y-2">
                      {chapterLessons.length === 0 ? (
                        <li className="text-sm text-gray-500 italic p-3 text-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                          Chưa có bài học nào trong chương này.
                        </li>
                      ) : (
                        chapterLessons.map(lesson => {
                          const isLessonExpanded = expandedLessons.includes(lesson.id);
                          const lessonModules = modules.filter(m => m.lesson_id === lesson.id).sort((a, b) => a.order_index - b.order_index);

                          return (
                            <div key={lesson.id} className="border border-gray-100 rounded-lg overflow-hidden bg-white hover:border-teal-200 transition-all">
                              <div 
                                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 group"
                                onClick={() => toggleLesson(lesson.id)}
                              >
                                <div className="flex items-center gap-3">
                                  {isLessonExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                                  <span className="font-semibold text-gray-800">{lesson.title}</span>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={(e) => handleDeleteLesson(lesson.id, e)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Xóa bài"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              
                              {isLessonExpanded && (
                                <div className="bg-gray-50/50 p-2 border-t border-gray-100">
                                  {lessonModules.length === 0 ? (
                                    <div className="flex items-center justify-between p-2">
                                      <span className="text-xs text-gray-500 italic">Bài học này chưa có mục nào (dữ liệu cũ).</span>
                                      <button 
                                        onClick={() => handleGenerateDefaultModules(lesson.id)}
                                        className="text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                      >
                                        <Sparkles className="w-3.5 h-3.5" /> Khởi tạo 4 mục cơ bản
                                      </button>
                                    </div>
                                  ) : (
                                    <ul className="space-y-1 pl-6 border-l-2 border-teal-100 ml-4 py-1">
                                      {lessonModules.filter(m => m.type !== 'practice').map(mod => {
                                        let icon = <></>;
                                        if (mod.type === 'theory') icon = <BookOpen className="w-3.5 h-3.5 text-blue-500" />;
                                        if (mod.type === 'practice') icon = <Target className="w-3.5 h-3.5 text-rose-500" />;
                                        if (mod.type === 'document') icon = <FileText className="w-3.5 h-3.5 text-gray-500" />;
                                        
                                        return (
                                            <li key={mod.id} className="flex items-center justify-between p-2.5 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
                                              <div className="flex items-center gap-2">
                                                {icon}
                                                <span className="text-sm font-medium text-gray-700">{mod.title}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <button 
                                                  onClick={() => openEditModuleModal(mod)}
                                                  className="px-2.5 py-1.5 text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-1 border border-gray-200" title="Đổi tên Tab"
                                                >
                                                  <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <Link 
                                                  href={`/admin/lessons/editor?lessonId=${lesson.id}&moduleId=${mod.id}`}
                                                  className="px-3 py-1.5 text-xs font-bold bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-md transition-colors flex items-center gap-1 border border-teal-100"
                                                >
                                                  <Edit2 className="w-3.5 h-3.5" /> Soạn bài
                                                </Link>
                                                <button 
                                                  onClick={(e) => handleDeleteModule(mod.id, e)}
                                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Xóa Mục"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              </div>
                                            </li>
                                        );
                                      })}
                                      
                                      {/* Thư mục Luyện tập */}
                                      {lessonModules.filter(m => m.type === 'practice').length > 0 && (
                                        <div className="mt-3 border border-orange-100 rounded-xl overflow-hidden bg-orange-50/30">
                                           <div className="bg-orange-100/50 p-3 flex items-center justify-between border-b border-orange-100/50">
                                              <div className="flex items-center gap-2">
                                                 <Layers className="w-4 h-4 text-orange-600" />
                                                 <span className="font-bold text-orange-800 text-sm">🎯 Luyện tập ({lessonModules.filter(m => m.type === 'practice').length} phần)</span>
                                              </div>
                                           </div>
                                           <ul className="space-y-1 p-2">
                                              {lessonModules.filter(m => m.type === 'practice').map(mod => (
                                                <li key={mod.id} className="flex items-center justify-between p-2.5 rounded-md hover:bg-white border border-transparent hover:border-orange-200 transition-colors bg-white/60 shadow-sm mb-1">
                                                  <div className="flex items-center gap-3">
                                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                                    <span className="text-sm font-bold text-gray-700">{mod.title}</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <button onClick={() => openEditModuleModal(mod)} className="px-2.5 py-1.5 text-xs font-bold bg-orange-100/50 text-orange-700 hover:bg-orange-200 rounded-md transition-colors flex items-center gap-1 border border-orange-200 shadow-sm" title="Đổi tên">
                                                      <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <Link href={`/admin/lessons/editor?lessonId=${lesson.id}&moduleId=${mod.id}`} className="px-3 py-1.5 text-xs font-bold bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 shadow-sm rounded-md transition-colors flex items-center gap-1">
                                                      <Edit2 className="w-3.5 h-3.5" /> Soạn bài
                                                    </Link>
                                                    <button onClick={(e) => handleDeleteModule(mod.id, e)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                                      <Trash2 className="w-4 h-4" />
                                                    </button>
                                                  </div>
                                                </li>
                                              ))}
                                              <li className="flex justify-center p-1 mt-1">
                                                <button 
                                                  onClick={() => openModuleModal(lesson.id, true)}
                                                  className="text-xs font-bold text-orange-600 hover:text-orange-800 bg-white hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 w-full justify-center border border-dashed border-orange-300"
                                                >
                                                  <Plus className="w-3.5 h-3.5" /> Thêm Bài luyện tập
                                                </button>
                                              </li>
                                           </ul>
                                        </div>
                                      )}

                                      <li className="flex justify-center p-1 mt-3">
                                        <button 
                                          onClick={() => openModuleModal(lesson.id, false)}
                                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 w-full justify-center border border-dashed border-indigo-200"
                                        >
                                          <Plus className="w-3.5 h-3.5" /> Thêm Mục con (Tab)
                                        </button>
                                      </li>
                                    </ul>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </ul>

                    {/* Nút Tạo Bài Học */}
                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <button 
                        onClick={() => openLessonModal(chapter.id)}
                        className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1.5 p-2 hover:bg-teal-50 w-max rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Thêm Bài học mới
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Thêm Chương */}
      {isChapterModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Tạo Chương mới</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tên chương (Chuyên đề)</label>
                <input 
                  type="text" 
                  value={chapterTitle} onChange={e => setChapterTitle(e.target.value)}
                  placeholder="VD: Chương 1: Căn bậc hai, Căn bậc ba" 
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" 
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsChapterModalOpen(false)} className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Hủy bỏ
              </button>
              <button 
                onClick={handleCreateChapter} disabled={isSavingChapter}
                className="px-5 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                {isSavingChapter ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Bài Học */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Thêm Bài học mới</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tên Bài học</label>
                <input 
                  type="text" 
                  value={lessonTitle} onChange={e => setLessonTitle(e.target.value)}
                  placeholder="VD: Bài 1: Sự đồng biến và nghịch biến của hàm số" 
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" 
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsLessonModalOpen(false)} className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Hủy bỏ
              </button>
              <button 
                onClick={handleCreateLesson} disabled={isSavingLesson}
                className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                {isSavingLesson ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Tạo Bài học'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Mục Con */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editingModuleId ? 'Đổi tên Mục (Tab)' : 'Thêm Mục (Tab) mới'}</h2>
            <div className="space-y-4">
              {!isAddingPracticeChild && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Loại mục (Tab)</label>
                  <select 
                    value={moduleType} onChange={e => setModuleType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  >
                    <option value="theory">📖 Lý thuyết & Phương pháp giải (Bài giảng tương tác)</option>
                    <option value="practice">🎯 Luyện tập (Trắc nghiệm/Điền khuyết)</option>
                    <option value="document">📄 Tài liệu & Video (Chữa bài)</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tên hiển thị (Tên Tab)</label>
                <input 
                  type="text" 
                  value={moduleTitle} onChange={e => setModuleTitle(e.target.value)}
                  placeholder="VD: Luyện tập Cơ bản" 
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsModuleModalOpen(false)} className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Hủy bỏ
              </button>
              <button 
                onClick={handleSaveModule} disabled={isSavingModule}
                className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                {isSavingModule ? <Loader2 className="w-4 h-4 animate-spin"/> : (editingModuleId ? 'Lưu thay đổi' : 'Tạo Mục')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
