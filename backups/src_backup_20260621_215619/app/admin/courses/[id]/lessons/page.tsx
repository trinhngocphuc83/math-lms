"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, Edit2, Trash2, BookOpen, Layers, ArrowLeft, Loader2, ChevronDown, ChevronRight, FileEdit, Sparkles, Video } from "lucide-react";
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
        { lesson_id: lessonData.id, type: 'theory', title: 'Lý thuyết (Bài giảng tương tác)', order_index: 1 },
        { lesson_id: lessonData.id, type: 'exercise_types', title: 'Phân dạng bài tập', order_index: 2 },
        { lesson_id: lessonData.id, type: 'practice', title: 'Luyện tập', order_index: 3 },
        { lesson_id: lessonData.id, type: 'document', title: 'Tài liệu tham khảo', order_index: 4 },
        { lesson_id: lessonData.id, type: 'solution_video', title: 'Video sửa bài tập', order_index: 5 }
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
      { lesson_id: lessonId, type: 'theory', title: 'Lý thuyết (Bài giảng tương tác)', order_index: 1 },
      { lesson_id: lessonId, type: 'exercise_types', title: 'Phân dạng bài tập', order_index: 2 },
      { lesson_id: lessonId, type: 'practice', title: 'Luyện tập', order_index: 3 },
      { lesson_id: lessonId, type: 'document', title: 'Tài liệu tham khảo', order_index: 4 },
      { lesson_id: lessonId, type: 'solution_video', title: 'Video sửa bài tập', order_index: 5 }
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
                                        <Sparkles className="w-3.5 h-3.5" /> Khởi tạo 5 mục
                                      </button>
                                    </div>
                                  ) : (
                                    <ul className="space-y-1 pl-6 border-l-2 border-teal-100 ml-4 py-1">
                                      {lessonModules.map(mod => {
                                        let icon = <BookOpen className="w-3.5 h-3.5 text-blue-500" />;
                                        if (mod.type === 'exercise_types') icon = <FileEdit className="w-3.5 h-3.5 text-purple-500" />;
                                        if (mod.type === 'practice') icon = <Layers className="w-3.5 h-3.5 text-orange-500" />;
                                        if (mod.type === 'document') icon = <BookOpen className="w-3.5 h-3.5 text-teal-500" />;
                                        if (mod.type === 'solution_video') icon = <Video className="w-3.5 h-3.5 text-rose-500" />;
                                        
                                        return (
                                          <li key={mod.id} className="flex items-center justify-between p-2 rounded-md hover:bg-white border border-transparent hover:border-gray-200 transition-colors group/mod">
                                            <div className="flex items-center gap-2">
                                              {icon}
                                              <span className="text-sm font-medium text-gray-700">{mod.title}</span>
                                            </div>
                                            <Link 
                                              href={`/admin/lessons/editor?lessonId=${lesson.id}&moduleId=${mod.id}`}
                                              className="opacity-0 group-hover/mod:opacity-100 px-3 py-1 text-xs font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-md transition-colors flex items-center gap-1"
                                            >
                                              <Edit2 className="w-3 h-3" /> Soạn
                                            </Link>
                                          </li>
                                        );
                                      })}
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
    </div>
  );
}
