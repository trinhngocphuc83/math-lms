"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { ChevronLeft, ChevronRight, MonitorPlay, FileText, Maximize2, Minimize2, CheckCircle2, XCircle, ArrowLeft, Download, Video, Loader2, BookOpen } from "lucide-react";
import confetti from 'canvas-confetti';
import Link from "next/link";

const getYouTubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const playSound = (type: 'correct' | 'wrong') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch(e) {}
};

const InteractiveQuiz = ({ data, onPass }: { data: any, onPass: () => void }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  const handleSelect = (idx: number) => {
    if (isCorrect) return; 
    setSelected(idx);
    const correct = idx === data.answerIndex;
    setIsCorrect(correct);
    if (correct) {
      playSound('correct');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#3B82F6', '#FBBF24']
      });
      onPass();
    } else {
      playSound('wrong');
    }
  };

  const renderQuizContent = (text: string) => (
    <div className="prose prose-lg max-w-full break-words prose-p:my-0 leading-relaxed text-inherit overflow-hidden [&_code]:whitespace-pre-wrap [&_pre]:whitespace-pre-wrap [&_pre]:max-w-full [&_pre]:overflow-x-auto">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{text}</ReactMarkdown>
    </div>
  );

  if (!isRevealed) {
    return (
      <div className="my-10 flex justify-center not-prose relative z-10">
        <button 
          onClick={() => setIsRevealed(true)}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-5 px-10 rounded-2xl shadow-[0_10px_30px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.7)] transition-all transform hover:-translate-y-2 flex items-center gap-4 text-xl border-t border-indigo-400 animate-in zoom-in duration-500"
        >
          <span className="text-2xl">🧠</span>
          <span className="tracking-wide text-shadow-sm">Thử sức với Câu hỏi Trắc nghiệm</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative bg-white p-8 md:p-10 rounded-[2rem] border-4 border-indigo-50 my-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] not-prose animate-in zoom-in-95 duration-500 origin-center overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      
      <div className="text-xl md:text-2xl font-bold text-slate-800 mb-8 flex items-start gap-4 leading-snug p-2 max-w-full overflow-hidden">
        <span className="text-4xl mt-1 shrink-0 animate-bounce">🤔</span> 
        <div className="flex-1 min-w-0">{renderQuizContent(data.question)}</div>
      </div>
      <div className="flex flex-col gap-4">
        {data.options.map((opt: string, i: number) => {
          let btnClass = "bg-white text-slate-700 hover:bg-slate-50 border-slate-200 hover:border-indigo-300 shadow-sm";
          let iconClass = "bg-slate-100 text-slate-500";
          let scaleClass = "scale-100 hover:scale-[1.01]";
          
          if (selected === i) {
            if (isCorrect) {
              btnClass = "bg-emerald-500 text-white border-emerald-600 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.5)] z-10";
              iconClass = "bg-emerald-600 text-white shadow-inner";
              scaleClass = "scale-[1.03]";
            } else {
              btnClass = "bg-rose-500 text-white border-rose-600 shadow-[0_10px_25px_-5px_rgba(244,63,94,0.5)] animate-shake z-10";
              iconClass = "bg-rose-600 text-white shadow-inner";
              scaleClass = "scale-[0.98]";
            }
          } else if (isCorrect && i === data.answerIndex) {
            btnClass = "bg-emerald-50 text-emerald-800 border-emerald-200"; 
            iconClass = "bg-emerald-500 text-white";
          }
          
          return (
            <button 
              key={i} 
              onClick={() => handleSelect(i)}
              className={`text-left px-6 py-5 rounded-2xl border-2 font-medium text-lg md:text-xl transition-all duration-300 flex items-center gap-5 w-full ${btnClass} ${scaleClass}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0 transition-colors text-xl ${iconClass}`}>
                {['A', 'B', 'C', 'D'][i]}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">{renderQuizContent(opt)}</div>
            </button>
          );
        })}
      </div>
      {isCorrect === true && (
        <div className="mt-8 p-6 bg-emerald-100 text-emerald-800 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 animate-in slide-in-from-bottom-6 zoom-in-95 duration-500 border border-emerald-300 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)]">
          <div className="bg-emerald-500 p-2 rounded-full text-white">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          Tuyệt vời! Bạn là một thiên tài! 🎉
        </div>
      )}
      {isCorrect === false && (
        <div className="mt-8 p-5 bg-rose-50 text-rose-700 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 border border-rose-200">
          <div className="bg-rose-100 p-2 rounded-full text-rose-600">
            <XCircle className="w-7 h-7" />
          </div>
          Đáp án chưa chính xác! Hãy suy nghĩ kỹ và thử lại nhé.
        </div>
      )}
    </div>
  );
};

export default function CoursePlayerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [course, setCourse] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  
  const [activeModule, setActiveModule] = useState<any>(null);
  const [activeLessonId, setActiveLessonId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [isContentFullscreen, setIsContentFullscreen] = useState(false);
  
  // Gamification & Pagination States
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [passedSlides, setPassedSlides] = useState<Record<number, boolean>>({});
  
  const videoRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCourseData = async () => {
      setLoading(true);
      
      // 1. Get first course
      const { data: initialCourse } = await supabase.from('courses').select('*').order('created_at', { ascending: false }).limit(1).single();
      
      if (!initialCourse) {
        setLoading(false);
        return;
      }

      const courseId = initialCourse.id;
      setCourse(initialCourse);

      // 2. Fetch all required data in parallel
      const [
        { data: chaptersData },
        { data: lessonsData }
      ] = await Promise.all([
        supabase.from('chapters').select('*').eq('course_id', courseId).order('order_index', { ascending: true }),
        supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index', { ascending: true })
      ]);

      if (chaptersData) setChapters(chaptersData);
      
      if (lessonsData && lessonsData.length > 0) {
        setLessons(lessonsData);
        
        // Fetch modules for all lessons
        const lessonIds = lessonsData.map((l: any) => l.id);
        const { data: modulesData } = await supabase.from('lesson_modules')
          .select('*')
          .in('lesson_id', lessonIds)
          .order('order_index', { ascending: true });
          
        if (modulesData && modulesData.length > 0) {
          setModules(modulesData);
          
          // Set initial active module (first module of first lesson)
          setActiveModule(modulesData[0]);
          setActiveLessonId(modulesData[0].lesson_id);
        }
      }

      setLoading(false);
    };
    fetchCourseData();
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsVideoFullscreen(!!document.fullscreenElement && document.fullscreenElement === videoRef.current);
      setIsContentFullscreen(!!document.fullscreenElement && document.fullscreenElement === contentRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleVideoFullscreen = () => {
    if (!document.fullscreenElement) {
      if (videoRef.current?.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const toggleContentFullscreen = () => {
    if (!document.fullscreenElement) {
      if (contentRef.current?.requestFullscreen) {
        contentRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleModuleClick = (mod: any, lessId: string) => {
    setActiveModule(mod);
    setActiveLessonId(lessId);
    setCurrentSlideIndex(0);
    setPassedSlides({});
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
    </div>
  );

  if (!course) return <div className="p-10 text-center">Không tìm thấy bài giảng</div>;

  const ytId = getYouTubeId(activeModule?.video_url || "");
  const activeLessonData = lessons.find(l => l.id === activeLessonId);

  const renderMarkdownComponent = {
    code(props: any) {
      const {children, className, node, ...rest} = props;
      const match = /language-(\w+)/.exec(className || '');
      if (!match?.length) return <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded-md font-mono text-sm break-words whitespace-pre-wrap" {...rest}>{children}</code>;
      
      if (match[1] === 'quiz') {
        try {
          const data = JSON.parse(String(children).replace(/\n$/, ''));
          return <InteractiveQuiz data={data} onPass={() => setPassedSlides(prev => ({...prev, [currentSlideIndex]: true}))} />;
        } catch (e) {
          return <div className="p-4 bg-red-100 text-red-600 rounded-lg shadow-sm border border-red-200">Lỗi: Cấu trúc câu hỏi Quiz từ AI không hợp lệ. Vui lòng sửa lại.</div>;
        }
      }
      return <code className={`${className} whitespace-pre-wrap break-words inline-block max-w-full`} {...rest}>{children}</code>;
    },
    pre({ node, children, ...props }: any) {
      return <pre className="overflow-x-auto whitespace-pre-wrap break-words max-w-full p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm font-mono text-gray-800" {...props}>{children}</pre>;
    },
    h1: ({ children }: any) => <h1 className="text-3xl font-extrabold text-gray-800 border-b pb-4 mb-6 mt-8">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-2xl font-bold text-teal-700 mt-8 mb-4 flex items-center gap-2"><div className="w-2 h-6 bg-teal-500 rounded-full"></div>{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-xl font-bold text-gray-700 mt-6 mb-3">{children}</h3>,
    p: ({ children }: any) => <div className="text-gray-700 leading-relaxed mb-4 text-lg">{children}</div>,
    ul: ({ children }: any) => <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700 text-lg ml-4">{children}</ul>,
    blockquote: ({ children }: any) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-500 my-4 bg-gray-50 p-4 rounded-r-lg">{children}</blockquote>,
    img: ({ src, alt }: any) => (
      <div className="my-6 flex justify-center">
        <img src={src} alt={alt} className="max-w-full rounded-xl shadow-md object-contain border border-gray-100 max-h-[500px]" />
      </div>
    )
  };

  return (
    <div className="h-screen flex flex-col bg-[#f4f9f8] font-sans overflow-hidden">
      {/* Top Navbar */}
      <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="hidden md:block bg-teal-100 p-2 rounded-lg text-teal-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-0.5">{course?.title}</div>
            <h1 className="font-bold text-gray-800 text-sm hidden md:block">{activeLessonData?.title} - {activeModule?.title}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            <BookOpen className="w-5 h-5" /> Danh sách bài
          </button>
        </div>
      </header>

      {/* Main Player Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* YouTube Video Section */}
            {ytId && (
              <div ref={videoRef} className={`bg-black rounded-2xl shadow-xl overflow-hidden relative group ${isVideoFullscreen ? 'h-screen w-screen rounded-none' : 'aspect-video'}`}>
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                ></iframe>
                {!isVideoFullscreen && (
                  <button onClick={toggleVideoFullscreen} className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white p-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-10"><Maximize2 className="w-5 h-5" /></button>
                )}
                {isVideoFullscreen && (
                  <button onClick={toggleVideoFullscreen} className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white p-2.5 rounded-lg transition-opacity backdrop-blur-sm z-50"><Minimize2 className="w-5 h-5" /></button>
                )}
              </div>
            )}

            {/* E-learning Content Section */}
            {activeModule?.content_markdown && (
              <div ref={contentRef} className={`bg-white shadow-lg border border-gray-100 relative transition-all duration-300 flex flex-col ${isContentFullscreen ? 'h-screen w-screen overflow-y-auto rounded-none p-8 md:p-16' : 'rounded-2xl p-6 md:p-10 min-h-[60vh]'}`}>
                <div className="absolute top-4 right-4 z-10">
                  <button onClick={toggleContentFullscreen} className={`p-2.5 rounded-lg transition-all shadow-sm border ${isContentFullscreen ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300' : 'bg-white hover:bg-gray-50 text-gray-500 border-gray-200 hover:text-teal-600 hover:border-teal-200'}`}>
                    {isContentFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  </button>
                </div>

                {isContentFullscreen && (
                  <div className="mb-8 border-b pb-4 pr-12 flex-shrink-0">
                    <h1 className="text-3xl font-bold text-gray-800">{activeLessonData?.title}</h1>
                  </div>
                )}

                <div className="flex-1 flex flex-col relative w-full max-w-5xl mx-auto">
                  {(() => {
                    const slides = activeModule.content_markdown.split('---').map((s: string) => s.trim()).filter(Boolean);
                    const totalSlides = Math.max(slides.length, 1);
                    const activeSlideContent = slides[currentSlideIndex] || "*Chưa có nội dung để hiển thị...*";
                    const hasQuiz = activeSlideContent.includes('```quiz');
                    const isQuizPassed = passedSlides[currentSlideIndex];
                    const canGoNext = !hasQuiz || isQuizPassed;

                    return (
                      <>
                        <div className="w-full bg-gray-200 h-2 rounded-full mb-8 overflow-hidden flex-shrink-0">
                          <div className="bg-teal-500 h-full transition-all duration-500 ease-out" style={{ width: `${((currentSlideIndex + 1) / totalSlides) * 100}%` }}></div>
                        </div>

                        <div className="flex-1 prose prose-lg max-w-none prose-p:my-0 leading-relaxed text-gray-800 pb-10 animate-in slide-in-from-bottom-2 fade-in duration-300">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={renderMarkdownComponent}>
                            {activeSlideContent}
                          </ReactMarkdown>
                        </div>

                        <div className="flex justify-between items-center mt-auto pt-6 border-t border-gray-100 flex-shrink-0 w-full">
                          <button disabled={currentSlideIndex === 0} onClick={() => { setCurrentSlideIndex(prev => prev - 1); window.scrollTo({ top: contentRef.current?.offsetTop, behavior: 'smooth' }); }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-40 disabled:hover:bg-teal-50 transition-colors shadow-sm"><ChevronLeft className="w-5 h-5" /> Quay Lại</button>
                          <span className="text-gray-500 font-bold bg-white px-5 py-2 rounded-full shadow-sm border border-gray-200">{currentSlideIndex + 1} / {totalSlides}</span>
                          <button disabled={currentSlideIndex >= totalSlides - 1 || !canGoNext} onClick={() => { setCurrentSlideIndex(prev => prev + 1); window.scrollTo({ top: contentRef.current?.offsetTop, behavior: 'smooth' }); }} className={`flex items-center gap-1.5 px-6 py-2.5 rounded-full font-bold transition-colors shadow-sm ${canGoNext ? 'text-white bg-teal-600 hover:bg-teal-700' : 'text-gray-400 bg-gray-200 cursor-not-allowed'}`} title={!canGoNext ? "Bạn phải trả lời đúng Trắc nghiệm để đi tiếp!" : ""}>
                            Tiếp Tục <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Attachment Section */}
            {activeModule?.attachment_url && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm flex items-center justify-between mt-6">
                <div className="flex items-center gap-4">
                  <div className="bg-white p-3 rounded-xl shadow-sm"><FileText className="w-8 h-8 text-blue-600" /></div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">Tài liệu đính kèm</h3>
                    <p className="text-gray-500 text-sm">Nhấn để xem và tải về tài liệu.</p>
                  </div>
                </div>
                <a href={activeModule.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md"><Download className="w-5 h-5" /> Tải Xuống</a>
              </div>
            )}
            
            {!activeModule?.content_markdown && !activeModule?.video_url && !activeModule?.attachment_url && (
              <div className="text-center text-gray-500 py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                Nội dung mục này đang được cập nhật.
              </div>
            )}

          </div>
        </main>

        {/* Course Playlist Sidebar */}
        <aside className={`${sidebarOpen ? 'w-[320px] lg:w-[380px]' : 'w-0'} transition-all duration-300 bg-[#fafafa] border-l border-gray-200 flex flex-col z-10 shrink-0`}>
          <div className="p-4 bg-white border-b border-gray-200 shrink-0">
            <h3 className="font-bold text-gray-800">Cấu trúc khóa học</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {chapters.map((chapter) => {
              const chapterLessons = lessons.filter(l => l.chapter_id === chapter.id);
              
              return (
                <div key={chapter.id} className="mb-2">
                  {/* Chapter header */}
                  <div className="bg-gray-100/80 px-4 py-3 sticky top-0 border-y border-gray-200 z-10 backdrop-blur-sm">
                    <p className="font-bold text-gray-800 text-sm">{chapter.title}</p>
                  </div>
                  
                  {/* Lessons List */}
                  <div className="p-2 space-y-2">
                    {chapterLessons.map((lesson) => {
                      const lessonModules = modules.filter(m => m.lesson_id === lesson.id);
                      const isLessonActive = lesson.id === activeLessonId;
                      
                      return (
                        <div key={lesson.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                          <div className="p-3 bg-gray-50 border-b border-gray-100">
                            <p className="text-sm font-bold text-gray-800">{lesson.title}</p>
                          </div>
                          
                          <div className="py-1">
                            {lessonModules.map(mod => {
                              const isActiveMod = activeModule?.id === mod.id;
                              
                              let icon = <BookOpen className="w-4 h-4 text-gray-400" />;
                              if (mod.type === 'theory') icon = <BookOpen className="w-4 h-4 text-blue-500" />;
                              if (mod.type === 'exercise_types') icon = <FileText className="w-4 h-4 text-purple-500" />;
                              if (mod.type === 'practice') icon = <CheckCircle2 className="w-4 h-4 text-orange-500" />;
                              if (mod.type === 'document') icon = <Download className="w-4 h-4 text-teal-500" />;
                              if (mod.type === 'solution_video') icon = <Video className="w-4 h-4 text-rose-500" />;

                              return (
                                <button 
                                  key={mod.id}
                                  onClick={() => handleModuleClick(mod, lesson.id)}
                                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                                    isActiveMod ? 'bg-teal-50 border-l-4 border-teal-500' : 'hover:bg-gray-50 border-l-4 border-transparent'
                                  }`}
                                >
                                  {icon}
                                  <span className={`text-sm ${isActiveMod ? 'font-bold text-teal-700' : 'font-medium text-gray-600'}`}>
                                    {mod.title}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
