"use client";
import { useEffect, useState, useMemo, useRef, useLayoutEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
import { ChevronRight, ChevronLeft, ArrowLeft, Maximize2, Minimize2, CheckCircle2, Lightbulb, Pin, BookOpen, Target } from 'lucide-react';
import React from 'react';

const extractTextFromReactNode = (node: any): string => {
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }
    if (Array.isArray(node)) {
        return node.map(extractTextFromReactNode).join('');
    }
    if (React.isValidElement(node) && node.props && (node.props as any).children) {
        return extractTextFromReactNode((node.props as any).children);
    }
    return '';
};

const checkRibbon = (children: any, fallback: any) => {
    const text = extractTextFromReactNode(children).trim();
    if (/^(.{0,8})(Bài\s+\d+|Phần\s+\d+|Dạng\s+\d+|\d+\.)/i.test(text)) {
        return (
            <div className="not-prose my-[1em] block w-full">
                <div className="bg-orange-50 text-orange-700 px-[1.5em] py-[0.6em] rounded-r-full rounded-l-[0.3em] border-l-[0.4em] border-orange-500 font-bold shadow-sm inline-flex items-center gap-[0.5em] leading-[1.3] max-w-full" style={{ fontSize: '1.2em' }}>
                    {children}
                </div>
            </div>
        );
    }
    return fallback;
};

// Extracting Custom Markdown Components
const customMarkdownComponents: any = {
   h1: ({node, children, ...props}: any) => checkRibbon(children, <h1 {...props}>{children}</h1>),
   h2: ({node, children, ...props}: any) => checkRibbon(children, <h2 {...props}>{children}</h2>),
   h3: ({node, children, ...props}: any) => checkRibbon(children, <h3 {...props}>{children}</h3>),
   h4: ({node, children, ...props}: any) => checkRibbon(children, <h4 {...props}>{children}</h4>),
   h5: ({node, children, ...props}: any) => checkRibbon(children, <h5 {...props}>{children}</h5>),
   h6: ({node, children, ...props}: any) => checkRibbon(children, <h6 {...props}>{children}</h6>),
   strong: ({node, children, ...props}: any) => {
      const text = String(children);
      if (text.toLowerCase().includes("hướng dẫn giải") || text.toLowerCase().includes("phương pháp giải") || text.toLowerCase().includes("lời giải")) {
         return (
            <span className="block mt-[2em] mb-[1em] not-prose w-full">
               <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-[1.5em] py-[0.6em] rounded-t-[1em] font-black flex items-center gap-[0.5em] w-max max-w-full shadow-md" style={{ fontSize: '1.2em' }}>
                  <span className="w-[1.5em] h-[1.5em] bg-white rounded-full flex items-center justify-center shrink-0 shadow-inner" style={{ fontSize: '1.2em' }}>💡</span>
                  {text.toUpperCase()}
               </span>
               <span className="bg-white border-l-[0.4em] border-orange-400 p-[1em] rounded-b-[1em] rounded-tr-[1em] shadow-sm flex items-center gap-[0.5em] mb-[0.5em] w-full">
                  <span className="text-orange-600 font-bold uppercase flex items-center gap-[0.5em]" style={{ fontSize: '0.9em' }}>
                     <svg className="w-[1.2em] h-[1.2em]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                     Các bước chi tiết bên dưới
                  </span>
               </span>
            </span>
         );
      }
      if (text.toLowerCase().startsWith("bước")) {
         return (
            <span className="inline-flex items-center gap-[0.5em] bg-gradient-to-r from-pink-500 to-rose-400 text-white px-[0.8em] py-[0.2em] rounded-[0.5em] font-black shadow-sm mt-[0.5em] mb-[0.2em] mr-[0.5em]">
              <span className="w-[0.5em] h-[0.5em] bg-white rounded-full animate-pulse"></span>
              {children}
            </span>
         );
      }
      return <strong {...props} className="text-slate-900 font-bold">{children}</strong>;
   },
   li: ({node, children, ...props}: any) => {
       const text = extractTextFromReactNode(children).trim();
       if (/^(.{0,8})(Bài\s+\d+|Phần\s+\d+|Dạng\s+\d+|\d+\.)/i.test(text)) {
           return (
               <li className="list-none my-[1em]" {...props}>
                   <div className="bg-orange-50 text-orange-700 px-[1.5em] py-[0.6em] rounded-r-full rounded-l-[0.3em] border-l-[0.4em] border-orange-500 font-bold shadow-sm inline-flex items-center gap-[0.5em] leading-[1.3] max-w-full" style={{ fontSize: '1.2em' }}>
                       {children}
                   </div>
               </li>
           );
       }
       return (
           <li className="flex items-start gap-[0.5em] mb-[0.5em] relative group" {...props}>
              <span className="w-[1.2em] h-[1.2em] mt-[0.2em] shrink-0 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-sm border border-indigo-200">
                 <CheckCircle2 className="w-[0.8em] h-[0.8em]" />
              </span>
              <div className="flex-1 min-w-0 leading-[1.6]">{children}</div>
           </li>
       );
   },
   p: ({node, children, ...props}: any) => {
       const text = extractTextFromReactNode(children).trim();
       if (/^(.{0,8})(Bài\s+\d+|Phần\s+\d+|Dạng\s+\d+|\d+\.)/i.test(text)) {
           return (
               <div className="not-prose my-[1em] block w-full">
                   <div className="bg-orange-50 text-orange-700 px-[1.5em] py-[0.6em] rounded-r-full rounded-l-[0.3em] border-l-[0.4em] border-orange-500 font-bold shadow-sm inline-flex items-center gap-[0.5em] leading-[1.3] max-w-full" style={{ fontSize: '1.2em' }}>
                       {children}
                   </div>
               </div>
           );
       }
       
       const kids = React.Children.toArray(children);
       const newKids: React.ReactNode[] = [];
       
       let isStartOfLine = true;
       kids.forEach((child, index) => {
           if (isStartOfLine) {
               let shouldInject = true;
               if (typeof child === 'string' && child.trim() === '') shouldInject = false;
               if (React.isValidElement(child) && child.props && child.props.className && child.props.className.includes('math-display')) shouldInject = false;
               
               if (shouldInject) {
                   newKids.push(
                       <span key={`icon-${index}`} className="inline-flex items-center justify-center mr-[0.5em] align-middle relative top-[-0.1em] text-orange-500 bg-orange-50 rounded-[0.2em] shadow-sm border border-orange-100 w-[1.2em] h-[1.2em] shrink-0">
                          <ChevronRight className="w-[0.9em] h-[0.9em] shrink-0" />
                       </span>
                   );
               }
               isStartOfLine = false;
           }
           
           newKids.push(child);
           
           if (React.isValidElement(child) && child.type === 'br') {
               isStartOfLine = true;
           }
       });

       return <p className="mb-[1em] text-[1.1em] leading-[1.6] text-slate-800 font-medium" {...props}>{newKids}</p>;
   }
};

// --- Slide Parser ---
function parseSlides(markdown: string) {
    let parts = markdown.split(/(?:\n|^)\s*---\s*(?:\n|$)/);
    let slides: string[] = [];
    
    parts.forEach(part => {
        let subparts = part.split(/(?=(?:\n|^)##\s)/);
        subparts.forEach(sp => {
            let tokens = sp.split(/(```quiz[\s\S]*?```)/g);
            tokens.forEach(t => {
                if (t.trim()) slides.push(t.trim());
            });
        });
    });
    
    return slides;
}

// --- Quiz Component for Presentation ---
function PresentationQuiz({ quizData, fontSize }: { quizData: any, fontSize: number }) {
    const [showAnswer, setShowAnswer] = useState(false);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    if (!quizData) return null;
    
    const type = quizData.type || "multiple_choice";
    
    return (
        <div className="w-full flex flex-col" style={{ fontSize: `${fontSize}px` }}>
            <h3 className="font-black text-indigo-800 mb-[1em] flex items-center gap-[0.5em]" style={{ fontSize: '1.2em' }}>
                <span className="drop-shadow-md text-blue-500">🎯</span> Câu hỏi tương tác
            </h3>
            
            <div className="font-semibold text-slate-800 mb-[1.5em] drop-shadow-sm">
                <div className="prose prose-slate max-w-none [&_.katex]:text-[1.1em] [&_.katex-display]:my-[0.5em]">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
                        {quizData.question || ""}
                    </ReactMarkdown>
                </div>
                {quizData.img_url && (
                    <img src={quizData.img_url} alt="Minh họa" className="block mx-auto rounded-[1em] shadow-xl mt-[1em] border border-slate-200" style={{ maxHeight: '40vh' }} />
                )}
            </div>
            
            {type === 'true_false' && (
                <div className="flex flex-col md:flex-row gap-[1em] pb-[1em] items-center w-full max-w-4xl mx-auto">
                    {[0, 1].map((optIdx) => {
                        const isCorrect = optIdx === quizData.answerIndex;
                        const isSelected = optIdx === selectedIdx;
                        const text = (quizData.options && quizData.options[optIdx]) ? quizData.options[optIdx] : (optIdx === 0 ? 'ĐÚNG' : 'SAI');
                        return (
                            <button
                                key={optIdx}
                                disabled={showAnswer}
                                onClick={() => {
                                    setSelectedIdx(optIdx);
                                }}
                                className={`flex-1 w-full text-center p-[1em] rounded-[1em] border-[0.2em] transition-all flex items-center gap-[1em]
                                    ${isSelected && !showAnswer ? 'border-indigo-400 bg-indigo-50 shadow-[0_0.3em_0_0_rgba(129,140,248,1)] transform -translate-y-[0.2em]' : ''}
                                    ${!isSelected && !showAnswer ? 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 shadow-sm' : ''}
                                    ${showAnswer && isCorrect ? 'border-green-400 bg-green-50 shadow-[0_0.3em_0_0_rgba(74,222,128,1)]' : ''}
                                    ${showAnswer && isSelected && !isCorrect ? 'border-red-400 bg-red-50 shadow-[0_0.3em_0_0_rgba(248,113,113,1)]' : ''}
                                    ${showAnswer && !isCorrect && !(isSelected && !isCorrect) ? 'border-gray-200 opacity-50' : ''}
                                `}
                            >
                                <div className="flex-1 min-w-0 text-center text-[1.2em] font-black uppercase text-gray-700">
                                   <ReactMarkdown components={customMarkdownComponents} remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>{text}</ReactMarkdown>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
            
            {type === 'multiple_choice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[1em] pb-[1em] items-start">
                    {(quizData.options || []).map((opt: string, idx: number) => {
                        const isCorrect = idx === quizData.answerIndex;
                        const isSelected = idx === selectedIdx;
                        
                        let bgColor = 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md hover:-translate-y-1 cursor-pointer';
                        let circleColor = 'bg-slate-100 text-slate-500';
                        
                        if (showAnswer) {
                            if (isCorrect) {
                                bgColor = 'bg-green-50 border-green-400 text-green-900 shadow-[0_0_20px_rgba(74,222,128,0.2)]';
                                circleColor = 'bg-green-500 text-white shadow-lg';
                            } else if (isSelected) {
                                bgColor = 'bg-red-50 border-red-400 text-red-900 shadow-[0_0_20px_rgba(248,113,113,0.2)]';
                                circleColor = 'bg-red-500 text-white shadow-lg';
                            } else {
                                bgColor = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                            }
                        } else if (isSelected) {
                            bgColor = 'bg-blue-50 border-blue-500 text-blue-900 shadow-md transform -translate-y-1';
                            circleColor = 'bg-blue-500 text-white shadow-lg';
                        }
                        
                        return (
                            <div 
                                key={idx} 
                                onClick={() => !showAnswer && setSelectedIdx(idx)}
                                className={`p-[1em] rounded-[1em] border-4 ${bgColor} transition-all duration-300 ease-out flex items-center gap-[1em] min-h-[4em]`}
                            >
                                <div className={`w-[2em] h-[2em] rounded-full flex items-center justify-center font-black shrink-0 transition-colors duration-500 ${circleColor}`} style={{ fontSize: '1.1em' }}>
                                    {String.fromCharCode(65 + idx)}
                                </div>
                                <div className="font-medium flex-1 prose prose-slate max-w-none [&_.katex]:text-[1.1em]" style={{ fontSize: '0.9em' }}>
                                    <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex]}>{opt}</ReactMarkdown>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {type === 'short_answer' && (
                <div className="w-full mb-[1em]">
                    {!showAnswer && (
                        <div className="flex flex-col gap-[0.5em] mt-[0.5em]">
                            <label className="text-slate-600 font-semibold" style={{ fontSize: '0.9em' }}>Học sinh trả lời:</label>
                            <input 
                                type="text" 
                                placeholder="Nhập câu trả lời vào đây..."
                                className="w-full px-[1.5em] py-[1em] rounded-[1em] border-4 border-indigo-200 focus:border-indigo-500 focus:ring-0 outline-none text-indigo-900 font-bold bg-indigo-50/50 shadow-inner"
                                style={{ fontSize: '1em' }}
                            />
                        </div>
                    )}
                    
                    {showAnswer && (
                        <div className="mt-[1em] p-[1.5em] bg-green-50 border-4 border-green-400 rounded-[1em] text-center shadow-lg">
                            <h4 className="text-green-700 font-bold mb-[0.5em]" style={{ fontSize: '0.8em' }}>Đáp án chính xác:</h4>
                            <div className="font-black text-green-600" style={{ fontSize: '1.5em' }}>{quizData.answerText}</div>
                        </div>
                    )}
                </div>
            )}
            
            <div className="mt-[1em] flex justify-center pb-[1em]">
                <button 
                    onClick={() => {
                        if (showAnswer) {
                            setShowAnswer(false);
                            setSelectedIdx(null);
                        } else {
                            setShowAnswer(true);
                        }
                    }}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-[2em] py-[0.8em] rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    style={{ fontSize: '0.8em' }}
                >
                    {showAnswer ? 'Làm lại' : 'Hiển thị đáp án'}
                </button>
            </div>
        </div>
    );
}

export default function PresentationPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const moduleId = searchParams.get('moduleId');
    const supabase = createClient();
    
    const [moduleData, setModuleData] = useState<any>(null);
    const [slides, setSlides] = useState<string[]>([]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Auto-fit text states
    const [baseFontSize, setBaseFontSize] = useState(48); // Start huge
    const contentBoxRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (!moduleId) return;
        async function load() {
            const { data } = await supabase.from('lesson_modules').select('*').eq('id', moduleId).single();
            if (data) {
                setModuleData(data);
                const presentationContent = data.presentation_markdown || data.content_markdown;
                if (presentationContent) {
                    setSlides(parseSlides(presentationContent));
                }
            }
        }
        load();
    }, [moduleId]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Space' || e.key === 'Enter' || e.key === 'PageDown') {
                setCurrentSlideIndex(prev => Math.min(prev + 1, slides.length - 1));
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                setCurrentSlideIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'f' || e.key === 'F') {
                toggleFullscreen();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [slides.length]);
    
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.error(e));
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };
    
    // Reset font size when slide changes
    useEffect(() => {
        setBaseFontSize(52); // Initial giant size
    }, [currentSlideIndex]);
    
    // Iterative font scaling based on overflow
    useLayoutEffect(() => {
        if (!contentBoxRef.current) return;
        const container = contentBoxRef.current;
        
        // Wait for rendering to stabilize
        const timer = setTimeout(() => {
            const isOverflowing = container.scrollHeight > container.clientHeight;
            if (isOverflowing && baseFontSize > 24) { // Don't go smaller than 24px
                setBaseFontSize(prev => prev - 2);
            }
        }, 10); // Small delay to let images/katex render
        
        return () => clearTimeout(timer);
    }, [currentSlideIndex, baseFontSize, slides]);
    
    if (!moduleData || slides.length === 0) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-indigo-600 text-3xl font-bold animate-pulse">Đang nạp bài giảng...</div>;
    }
    
    const currentContent = slides[currentSlideIndex];
    const isQuiz = currentContent.startsWith('```quiz');
    let quizData = null;
    if (isQuiz) {
        try {
            const jsonStr = currentContent.replace(/^```quiz\s*/, '').replace(/\s*```$/, '');
            quizData = JSON.parse(jsonStr);
        } catch (e) {}
    }
    const handleSlideClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest('input')) {
            return;
        }
        setCurrentSlideIndex(prev => Math.min(prev + 1, slides.length - 1));
    };

    return (
        <div onClick={handleSlideClick} className="w-screen h-screen overflow-hidden bg-gradient-to-br from-slate-100 to-indigo-50 flex items-center justify-center selection:bg-indigo-500/30">
            
            {/* Header / Controls (Auto-hides) */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 opacity-0 hover:opacity-100 transition-opacity duration-500 bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.back()} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-700">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="font-black text-2xl text-slate-800">{moduleData.title}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-slate-500 font-bold text-xl px-6 bg-slate-100 py-2 rounded-full border border-slate-200">
                        {currentSlideIndex + 1} / {slides.length}
                    </span>
                    <button onClick={toggleFullscreen} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-700" title="Phím F">
                        {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
                    </button>
                </div>
            </div>
            
            {/* Slide Box (Locked to 16:9) */}
            <div 
                className="bg-white shadow-[0_30px_80px_-15px_rgba(0,0,0,0.15)] overflow-hidden relative flex flex-col mx-auto"
                style={{
                    aspectRatio: '16 / 9',
                    width: '100%',
                    maxWidth: 'calc(100vh * 16 / 9)',
                    maxHeight: '100vh'
                }}
            >
                {/* Progress Bar inside slide */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 z-40">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out" style={{ width: `${((currentSlideIndex + 1) / slides.length) * 100}%` }} />
                </div>
                
                {/* Inner Content Wrapper */}
                <div 
                    ref={contentBoxRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden w-full h-full p-[5%] flex flex-col scroll-smooth"
                    style={{ scrollbarWidth: 'thin' }}
                >
                    <div 
                        key={currentSlideIndex}
                        className="animate-in fade-in duration-500 ease-out h-full w-full flex flex-col"
                    >
                        {isQuiz && quizData ? (
                            <PresentationQuiz quizData={quizData} fontSize={baseFontSize} />
                        ) : (
                            <div 
                                className="prose prose-slate max-w-none w-full
                                    prose-headings:font-black prose-headings:tracking-tight
                                    prose-h1:text-[1.8em] prose-h1:text-white prose-h1:bg-gradient-to-r prose-h1:from-indigo-600 prose-h1:to-blue-600 prose-h1:px-[0.8em] prose-h1:py-[0.4em] prose-h1:rounded-[0.4em] prose-h1:shadow-lg prose-h1:inline-block prose-h1:mb-[0.8em] prose-h1:leading-tight prose-h1:border-2 prose-h1:border-white
                                    prose-h2:text-[1.4em] prose-h2:text-indigo-900 prose-h2:bg-indigo-50 prose-h2:px-[0.6em] prose-h2:py-[0.3em] prose-h2:rounded-[0.3em] prose-h2:border-l-[0.3em] prose-h2:border-indigo-600 prose-h2:shadow-sm prose-h2:inline-block prose-h2:mb-[0.8em]
                                    prose-h3:text-[1.2em] prose-h3:text-blue-900 prose-h3:bg-blue-50 prose-h3:px-[0.5em] prose-h3:py-[0.2em] prose-h3:rounded-[0.2em] prose-h3:border-l-[0.2em] prose-h3:border-blue-500 prose-h3:inline-block prose-h3:mb-[0.5em]
                                    prose-p:text-[1em] prose-p:leading-[1.5] prose-p:text-slate-700
                                    prose-li:text-[1em] prose-li:leading-[1.5] prose-li:my-[0.3em]
                                    prose-strong:text-indigo-900 prose-strong:font-black
                                    prose-blockquote:border-l-[0.3em] prose-blockquote:border-indigo-400 prose-blockquote:bg-indigo-50 prose-blockquote:p-[0.8em] prose-blockquote:rounded-r-2xl prose-blockquote:text-slate-700 prose-blockquote:font-medium prose-blockquote:text-[1.1em]
                                    [&_.katex-display]:text-[1.1em] [&_.katex-display]:my-[0.5em]
                                    [&_.katex]:text-[1em] [&_.katex]:text-blue-900
                                    [&_img]:max-h-[40vh] [&_img]:mx-auto [&_img]:rounded-2xl [&_img]:shadow-xl [&_img]:border [&_img]:border-slate-200
                                "
                                style={{ fontSize: `${baseFontSize}px` }}
                            >
                                <ReactMarkdown 
                                    components={customMarkdownComponents}
                                    remarkPlugins={[remarkMath, remarkBreaks]} 
                                    rehypePlugins={[rehypeKatex]}
                                >
                                    {currentContent}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Navigation Indicators */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 opacity-0 hover:opacity-100 transition-opacity duration-500 bg-white/90 backdrop-blur-md border border-slate-200 px-6 py-3 rounded-full shadow-xl z-50">
                <button 
                    onClick={() => setCurrentSlideIndex(prev => Math.max(prev - 1, 0))}
                    disabled={currentSlideIndex === 0}
                    className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 hover:scale-110 active:scale-95"
                    title="Slide trước (Mũi tên trái)"
                >
                    <ChevronLeft className="w-8 h-8" />
                </button>
                <div className="text-slate-400 font-bold tracking-widest text-sm uppercase">
                    Điều khiển
                </div>
                <button 
                    onClick={() => setCurrentSlideIndex(prev => Math.min(prev + 1, slides.length - 1))}
                    disabled={currentSlideIndex === slides.length - 1}
                    className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 hover:scale-110 active:scale-95"
                    title="Slide tiếp theo (Space / Mũi tên phải)"
                >
                    <ChevronRight className="w-8 h-8" />
                </button>
            </div>
        </div>
    );
}
