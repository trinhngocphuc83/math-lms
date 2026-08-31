"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, Edit2, Trash2, BookOpen, Layers, ArrowLeft, Loader2, ChevronDown, ChevronRight, FileEdit, Sparkles, Video, Pencil, FileText, Target, ArrowUp, ArrowDown } from "lucide-react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function CourseStructurePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  /**
   * Mã bài cần mở sẵn, do trình soạn bài truyền sang khi bấm nút lui.
   *
   * Cây bài giảng nay thu gọn hết, nên soạn xong bấm lui mà về một trang đóng kín thì
   * Thầy cô phải mò lại từng chương - đúng kiểu "văng hẳn ra ngoài".
   */
  const baiCanMo = useSearchParams().get('bai');
  const supabase = createClient();

  const [course, setCourse] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Thêm Chương
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");
  const [isSavingChapter, setIsSavingChapter] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);

  // Modal Thêm Bài Học
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

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

    /* Bỏ chương thuộc khu Ôn tập & Kiểm tra - đề ôn tập có trang riêng /admin/on-tap,
       để cả hai nơi thì sửa một chỗ lại quên chỗ kia.
       Lọc bằng JS chứ không lọc trong câu truy vấn: máy nào chưa chạy tệp SQL thì cột
       `loai` chưa có, lọc trong truy vấn là hỏng cả câu và cây bài giảng trống trơn. */
    const { data: chRaw } = await supabase.from('chapters').select('*')
      .eq('course_id', courseId).order('order_index', { ascending: true });
    const chData = (chRaw || []).filter((c: any) => c.loai !== 'on-tap');
    if (chData) {
      setChapters(chData);
      /* KHÔNG mở sẵn mọi chương nữa. Khoá 12 có 5 chương, mở hết là một trang dài lê thê
         phải cuộn mãi mới tới chương cần sửa. Bấm chương nào thì mở chương đó. */
    }

    const { data: lsData } = await supabase.from('lessons').select('id, title, chapter_id, order_index').eq('course_id', courseId).order('order_index', { ascending: true });
    if (lsData) {
      setLessons(lsData);

      /* Vừa soạn xong bài nào rồi bấm lui thì mở sẵn đúng chương, đúng bài đó và cuộn
         tới - để Thầy cô nhìn ra ngay mình đang ở đâu, thay vì thấy một trang đóng kín. */
      if (baiCanMo) {
        const bai = lsData.find(l => l.id === baiCanMo);
        if (bai) {
          if (bai.chapter_id) setExpandedChapters(cu => cu.includes(bai.chapter_id) ? cu : [...cu, bai.chapter_id]);
          setExpandedLessons(cu => cu.includes(bai.id) ? cu : [...cu, bai.id]);
          setTimeout(() => {
            document.getElementById(`bai-${bai.id}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 260);
        }
      }
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

  const openChapterModal = (chapter?: any) => {
    if (chapter) {
      setEditingChapterId(chapter.id);
      setChapterTitle(chapter.title);
    } else {
      setEditingChapterId(null);
      setChapterTitle("");
    }
    setIsChapterModalOpen(true);
  };

  const handleSaveChapter = async () => {
    if (!chapterTitle) return alert("Vui lòng nhập tên chương!");
    setIsSavingChapter(true);

    if (editingChapterId) {
      const { error } = await supabase.from('chapters').update({ title: chapterTitle }).eq('id', editingChapterId);
      setIsSavingChapter(false);
      if (error) alert("Lỗi sửa chương: " + error.message);
      else { setIsChapterModalOpen(false); loadStructure(); }
    } else {
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
    }
  };

  const handleMoveChapter = async (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    if (direction === 'up' && index > 0) {
      const current = chapters[index];
      const prev = chapters[index - 1];
      const tempOrder = current.order_index;
      await supabase.from('chapters').update({ order_index: prev.order_index }).eq('id', current.id);
      await supabase.from('chapters').update({ order_index: tempOrder }).eq('id', prev.id);
      loadStructure();
    } else if (direction === 'down' && index < chapters.length - 1) {
      const current = chapters[index];
      const next = chapters[index + 1];
      const tempOrder = current.order_index;
      await supabase.from('chapters').update({ order_index: next.order_index }).eq('id', current.id);
      await supabase.from('chapters').update({ order_index: tempOrder }).eq('id', next.id);
      loadStructure();
    }
  };

  const openLessonModal = (chapterId: string, lesson?: any) => {
    setActiveChapterId(chapterId);
    if (lesson) {
      setEditingLessonId(lesson.id);
      setLessonTitle(lesson.title);
    } else {
      setEditingLessonId(null);
      setLessonTitle("");
    }
    setIsLessonModalOpen(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonTitle) return alert("Vui lòng nhập tên bài học!");
    setIsSavingLesson(true);

    if (editingLessonId) {
      const { error } = await supabase.from('lessons').update({ title: lessonTitle }).eq('id', editingLessonId);
      setIsSavingLesson(false);
      if (error) alert("Lỗi sửa bài học: " + error.message);
      else { setIsLessonModalOpen(false); loadStructure(); }
    } else {
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
    }
  };

  const handleMoveLesson = async (chapterId: string, index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const chapterLessons = lessons.filter(l => l.chapter_id === chapterId);
    if (direction === 'up' && index > 0) {
      const current = chapterLessons[index];
      const prev = chapterLessons[index - 1];
      const tempOrder = current.order_index;
      await supabase.from('lessons').update({ order_index: prev.order_index }).eq('id', current.id);
      await supabase.from('lessons').update({ order_index: tempOrder }).eq('id', prev.id);
      loadStructure();
    } else if (direction === 'down' && index < chapterLessons.length - 1) {
      const current = chapterLessons[index];
      const next = chapterLessons[index + 1];
      const tempOrder = current.order_index;
      await supabase.from('lessons').update({ order_index: next.order_index }).eq('id', current.id);
      await supabase.from('lessons').update({ order_index: tempOrder }).eq('id', next.id);
      loadStructure();
    }
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

  /* Rộng gần hết khu nội dung: bản cũ khóa ở max-w-4xl (896px) nên màn hình 1366 còn
     dư hơn 400px trống bên phải, mà tên chương dài thì lại bị bó chật. */
  return (
    <div className="max-w-[1240px] mx-auto pb-16">
      {/* Đầu trang dồn về MỘT hàng: tên khoá, số chương/bài, rồi tới các nút. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link href="/admin/courses" title="Quay lại danh sách Khóa học"
              className="p-1.5 -ml-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-[17px] font-black text-gray-800 leading-tight truncate">
            {course?.title || 'Đang tải...'}
          </h1>
          <p className="text-[12px] text-gray-400 leading-tight">
            {chapters.length} chương · {lessons.length} bài học
          </p>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {chapters.length > 0 && (
            <button
              onClick={() => setExpandedChapters(expandedChapters.length ? [] : chapters.map(c => c.id))}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-teal-700
                         hover:border-teal-300 text-[12.5px] font-bold transition-colors"
            >
              {expandedChapters.length ? 'Thu hết' : 'Mở hết'}
            </button>
          )}
          <button
            onClick={() => openChapterModal()}
            className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-[12.5px] font-bold
                       flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Thêm Chương
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
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
              <div key={chapter.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div
                  className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors group/ch ${
                    isExpanded ? 'bg-teal-50/70 border-b border-teal-100' : 'bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => toggleChapter(chapter.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-teal-600 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                    <h3 className="font-bold text-gray-800 text-[14px] truncate">{chapter.title}</h3>
                    <span className="shrink-0 bg-teal-100 text-teal-700 text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                      {chapterLessons.length}
                    </span>
                  </div>
                  {/* Nút sửa/xoá chỉ hiện khi rê chuột - để luôn thì bốn biểu tượng nhân với năm
                      chương thành hai mươi cái, rối mắt mà chẳng dùng mấy khi. */}
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/ch:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button onClick={(e) => handleMoveChapter(chapters.indexOf(chapter), 'up', e)} disabled={chapters.indexOf(chapter) === 0} className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-25" title="Di chuyển lên"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => handleMoveChapter(chapters.indexOf(chapter), 'down', e)} disabled={chapters.indexOf(chapter) === chapters.length - 1} className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-25" title="Di chuyển xuống"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); openChapterModal(chapter); }} className="p-1 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors" title="Đổi tên chương"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => handleDeleteChapter(chapter.id, e)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Xóa chương"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-2.5 bg-white">
                    {/* Màn rộng thì xếp bài học làm hai cột, đỡ phải cuộn. Bài nào đang mở ra xem
                        mục con thì chiếm trọn bề ngang cho dễ đọc. */}
                    <ul className="grid gap-1.5 xl:grid-cols-2 items-start">
                      {chapterLessons.length === 0 ? (
                        <li className="xl:col-span-2 text-[12.5px] text-gray-400 italic px-3 py-2 text-center bg-gray-50/50 rounded border border-dashed border-gray-200">
                          Chưa có bài học nào trong chương này.
                        </li>
                      ) : (
                        chapterLessons.map(lesson => {
                          const isLessonExpanded = expandedLessons.includes(lesson.id);
                          const lessonModules = modules.filter(m => m.lesson_id === lesson.id).sort((a, b) => a.order_index - b.order_index);

                          return (
                            <div key={lesson.id} id={`bai-${lesson.id}`} className={`border rounded-lg overflow-hidden bg-white transition-all ${
                              isLessonExpanded ? 'xl:col-span-2 border-teal-300' : 'border-gray-100 hover:border-teal-200'
                            }`}>
                              <div
                                className="flex items-center justify-between px-2.5 py-1.5 cursor-pointer hover:bg-gray-50 group"
                                onClick={() => toggleLesson(lesson.id)}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {isLessonExpanded ? <ChevronDown className="w-3.5 h-3.5 text-teal-600 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                                  <span className="font-bold text-[13px] text-gray-800 truncate">{lesson.title}</span>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => handleMoveLesson(chapter.id, chapterLessons.indexOf(lesson), 'up', e)} disabled={chapterLessons.indexOf(lesson) === 0} className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-25" title="Lên"><ArrowUp className="w-3.5 h-3.5" /></button>
                                  <button onClick={(e) => handleMoveLesson(chapter.id, chapterLessons.indexOf(lesson), 'down', e)} disabled={chapterLessons.indexOf(lesson) === chapterLessons.length - 1} className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-25" title="Xuống"><ArrowDown className="w-3.5 h-3.5" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); openLessonModal(chapter.id, lesson); }} className="p-1 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors" title="Đổi tên"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={(e) => handleDeleteLesson(lesson.id, e)} className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors" title="Xóa bài"><Trash2 className="w-3.5 h-3.5" /></button>
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
                                    <ul className="space-y-0.5 pl-3 border-l-2 border-teal-100 ml-2 py-0.5">
                                      {lessonModules.filter(m => m.type !== 'practice').map(mod => {
                                        let icon = <></>;
                                        if (mod.type === 'theory') icon = <BookOpen className="w-3.5 h-3.5 text-blue-500" />;
                                        if (mod.type === 'practice') icon = <Target className="w-3.5 h-3.5 text-rose-500" />;
                                        if (mod.type === 'document') icon = <FileText className="w-3.5 h-3.5 text-gray-500" />;

                                        return (
                                            <li className="flex items-center justify-between px-2 py-1 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors" key={mod.id}>
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                {icon}
                                                <span className="text-[12.5px] font-medium text-gray-700 truncate">{mod.title}</span>
                                              </div>
                                              <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                  onClick={() => openEditModuleModal(mod)}
                                                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors" title="Đổi tên Tab"
                                                >
                                                  <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <Link
                                                  href={`/admin/lessons/editor?lessonId=${lesson.id}&moduleId=${mod.id}`}
                                                  className="px-2 py-1 text-[11.5px] font-bold bg-teal-50 text-teal-700 hover:bg-teal-100 rounded transition-colors flex items-center gap-1 border border-teal-100"
                                                >
                                                  <Edit2 className="w-3 h-3" /> Soạn bài
                                                </Link>
                                                <button
                                                  onClick={(e) => handleDeleteModule(mod.id, e)}
                                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Xóa Mục"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </li>
                                        );
                                      })}

                                      {/* Thư mục Luyện tập */}
                                      {lessonModules.filter(m => m.type === 'practice').length > 0 && (
                                        <div className="mt-1.5 border border-orange-100 rounded-lg overflow-hidden bg-orange-50/30">
                                           <div className="bg-orange-100/50 px-2 py-1 flex items-center gap-1.5 border-b border-orange-100/50">
                                              <Layers className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                                              <span className="font-bold text-orange-800 text-[12px]">Luyện tập ({lessonModules.filter(m => m.type === 'practice').length} phần)</span>
                                           </div>
                                           <ul className="space-y-0.5 p-1">
                                              {lessonModules.filter(m => m.type === 'practice').map(mod => (
                                                <li key={mod.id} className="flex items-center justify-between px-2 py-1 rounded hover:bg-white border border-transparent hover:border-orange-200 transition-colors bg-white/60">
                                                  <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></span>
                                                    <span className="text-[12.5px] font-bold text-gray-700 truncate">{mod.title}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1 shrink-0">
                                                    <button onClick={() => openEditModuleModal(mod)} className="p-1 text-orange-500 hover:text-orange-700 hover:bg-orange-100 rounded transition-colors" title="Đổi tên">
                                                      <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <Link href={`/admin/lessons/editor?lessonId=${lesson.id}&moduleId=${mod.id}`} className="px-2 py-1 text-[11.5px] font-bold bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded transition-colors flex items-center gap-1">
                                                      <Edit2 className="w-3 h-3" /> Soạn bài
                                                    </Link>
                                                    <button onClick={(e) => handleDeleteModule(mod.id, e)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Xóa">
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                </li>
                                              ))}
                                              <li className="flex justify-center pt-0.5">
                                                <button
                                                  onClick={() => openModuleModal(lesson.id, true)}
                                                  className="text-[11.5px] font-bold text-orange-600 hover:text-orange-800 bg-white hover:bg-orange-100 px-2 py-1 rounded transition-colors flex items-center gap-1 w-full justify-center border border-dashed border-orange-300"
                                                >
                                                  <Plus className="w-3 h-3" /> Thêm Bài luyện tập
                                                </button>
                                              </li>
                                           </ul>
                                        </div>
                                      )}

                                      <li className="flex justify-center pt-1">
                                        <button
                                          onClick={() => openModuleModal(lesson.id, false)}
                                          className="text-[11.5px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors flex items-center gap-1 w-full justify-center border border-dashed border-indigo-200"
                                        >
                                          <Plus className="w-3 h-3" /> Thêm Mục con (Tab)
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
                    <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                      <button
                        onClick={() => openLessonModal(chapter.id)}
                        className="text-[12.5px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 px-2 py-1 hover:bg-teal-50 w-max rounded transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm Bài học mới
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
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editingChapterId ? 'Đổi tên Chương' : 'Tạo Chương mới'}</h2>
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
                onClick={handleSaveChapter} disabled={isSavingChapter}
                className="px-5 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                {isSavingChapter ? <Loader2 className="w-4 h-4 animate-spin"/> : (editingChapterId ? 'Lưu thay đổi' : 'Tạo mới')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Bài Học */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editingLessonId ? 'Đổi tên Bài học' : 'Thêm Bài học mới'}</h2>
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
                onClick={handleSaveLesson} disabled={isSavingLesson}
                className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                {isSavingLesson ? <Loader2 className="w-4 h-4 animate-spin"/> : (editingLessonId ? 'Lưu thay đổi' : 'Tạo Bài học')}
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
