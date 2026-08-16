"use client";
import { useEffect, useState, useRef, useLayoutEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
import { ChevronRight, ChevronLeft, ArrowLeft, Maximize2, Minimize2, BookOpen, Scaling } from 'lucide-react';
import { ensureMathDelimiters } from '@/utils/latexFixer';
import React from 'react';
import {
    presentationMarkdownComponents,
    slideCoViDuMau,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
} from '@/components/presentation/presentationTheme';
import PresentationTimer from '@/components/presentation/PresentationTimer';

/* Vùng nội dung bên trong canvas (đã trừ lề). Mọi phép đo auto-fit dựa trên đây. */
const PAD_X = 84;
const PAD_TOP = 54;
const PAD_BOTTOM = 46;
const CONTENT_HEIGHT = CANVAS_HEIGHT - PAD_TOP - PAD_BOTTOM;
/** Không thu nhỏ quá mức này để chữ còn đọc được từ cuối lớp. */
const MIN_CONTENT_SCALE = 0.45;

// --- Slide Parser ---
function parseSlides(markdown: string) {
    let parts = markdown.split(/(?:\n|^)\s*---\s*(?:\n|$)/);
    let slides: string[][] = [];

    parts.forEach(part => {
        let subparts = part.split(/(?=(?:\n|^)##\s)/);
        subparts.forEach(sp => {
            let tokens = sp.split(/(```quiz[\s\S]*?```)/g);
            tokens.forEach(t => {
                if (t.trim()) {
                    let fragments = t.split(/(?:\n|^)\s*\*\*\*\s*(?:\n|$)/).filter(f => f.trim());
                    if (fragments.length > 0) slides.push(fragments);
                }
            });
        });
    });

    return slides;
}

/* Lớp tiện ích cho KaTeX dùng chung mọi nơi trong slide. */
const KATEX_CLASS = '[&_.katex]:text-[#1e40af] [&_.katex-display]:my-4 [&_.katex-display]:text-[1.04em]';

// --- Quiz Component for Presentation ---
function PresentationQuiz({ quizData }: { quizData: any }) {
    const [showAnswer, setShowAnswer] = useState(false);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    if (!quizData) return null;

    const type = quizData.type || "multiple_choice";

    return (
        <div className="w-full flex flex-col">
            <div className="flex items-center gap-4 mb-7">
                <span className="text-[42px] leading-none">🎯</span>
                <h3 className="text-[42px] font-black text-indigo-800 tracking-tight m-0">Câu hỏi tương tác</h3>
            </div>

            <div className={`text-[42px] leading-[1.5] font-semibold text-slate-900 mb-8 ${KATEX_CLASS}`}>
                <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                    {quizData.question || ""}
                </ReactMarkdown>
                {quizData.img_url && (
                    <img src={quizData.img_url} alt="Minh họa" className="block mx-auto rounded-2xl shadow-lg mt-5 border border-slate-200 max-h-[340px]" />
                )}
            </div>

            {type === 'true_false' && (
                <div className="flex gap-6 items-stretch w-full max-w-[1100px] mx-auto">
                    {[0, 1].map((optIdx) => {
                        const isCorrect = optIdx === quizData.answerIndex;
                        const isSelected = optIdx === selectedIdx;
                        const text = (quizData.options && quizData.options[optIdx]) ? quizData.options[optIdx] : (optIdx === 0 ? 'ĐÚNG' : 'SAI');

                        let cls = 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40';
                        if (showAnswer && isCorrect) cls = 'border-emerald-500 bg-emerald-50';
                        else if (showAnswer && isSelected) cls = 'border-red-400 bg-red-50';
                        else if (showAnswer) cls = 'border-slate-200 bg-white opacity-45';
                        else if (isSelected) cls = 'border-indigo-500 bg-indigo-50';

                        return (
                            <button
                                key={optIdx}
                                disabled={showAnswer}
                                onClick={() => setSelectedIdx(optIdx)}
                                className={`flex-1 rounded-2xl border-[3px] px-8 py-6 transition-all duration-200 ${cls}`}
                            >
                                <div className={`text-[42px] font-black uppercase text-slate-800 ${KATEX_CLASS}`}>
                                    <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                        {String(text).replace(/^(\s*\d+)\.(?=\s|$)/, '$1\\.')}
                                    </ReactMarkdown>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {type === 'multiple_choice' && (
                <div className="grid grid-cols-2 gap-5 items-stretch">
                    {(quizData.options || []).map((opt: string, idx: number) => {
                        const isCorrect = idx === quizData.answerIndex;
                        const isSelected = idx === selectedIdx;

                        let cardCls = 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40';
                        let badgeCls = 'bg-slate-100 text-slate-500';

                        if (showAnswer) {
                            if (isCorrect) { cardCls = 'border-emerald-500 bg-emerald-50'; badgeCls = 'bg-emerald-500 text-white'; }
                            else if (isSelected) { cardCls = 'border-red-400 bg-red-50'; badgeCls = 'bg-red-500 text-white'; }
                            else { cardCls = 'border-slate-200 bg-white opacity-45'; }
                        } else if (isSelected) {
                            cardCls = 'border-indigo-500 bg-indigo-50'; badgeCls = 'bg-indigo-500 text-white';
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => !showAnswer && setSelectedIdx(idx)}
                                className={`w-full text-left rounded-2xl border-[3px] px-6 py-5 flex items-start gap-5 transition-all duration-200 ${cardCls}`}
                            >
                                <div className={`w-[62px] h-[62px] rounded-full flex items-center justify-center text-[34px] font-black shrink-0 transition-colors ${badgeCls}`}>
                                    {String.fromCharCode(65 + idx)}
                                </div>
                                <div className={`flex-1 min-w-0 text-[38px] leading-[1.45] text-slate-800 ${KATEX_CLASS}`}>
                                    <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                        {String(opt).replace(/^(\s*\d+)\.(?=\s|$)/, '$1\\.')}
                                    </ReactMarkdown>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {type === 'short_answer' && (
                <div className="w-full">
                    {!showAnswer ? (
                        <div className="flex flex-col gap-3">
                            <label className="text-[34px] font-semibold text-slate-600">Học sinh trả lời:</label>
                            <input
                                type="text"
                                placeholder="Nhập câu trả lời vào đây..."
                                className="w-full px-8 py-5 rounded-2xl border-[3px] border-indigo-200 focus:border-indigo-500 outline-none
                                           text-[40px] font-bold text-indigo-900 bg-indigo-50/40"
                            />
                        </div>
                    ) : (
                        <div className="p-8 bg-emerald-50 border-[3px] border-emerald-500 rounded-2xl text-center">
                            <h4 className="text-[32px] font-bold text-emerald-700 mb-2 uppercase tracking-wider">Đáp án chính xác</h4>
                            {/* Render qua KaTeX để đáp án dạng công thức hiện ra đúng, thay vì
                                in nguyên chuỗi LaTeX thô như trước */}
                            <div className={`text-[52px] font-black text-emerald-700 ${KATEX_CLASS}`}>
                                <ReactMarkdown remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                    {ensureMathDelimiters(quizData.exactAnswer || quizData.correctAnswer || quizData.answerText)}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-8 flex justify-center">
                <button
                    onClick={() => {
                        if (showAnswer) { setShowAnswer(false); setSelectedIdx(null); }
                        else setShowAnswer(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-full text-[32px] font-bold
                               shadow-lg transition-all duration-200 hover:-translate-y-0.5"
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
    const [slides, setSlides] = useState<string[][]>([]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [currentFragmentIndex, setCurrentFragmentIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Resume states
    const [showRestorePrompt, setShowRestorePrompt] = useState(false);
    const [savedSlideIndex, setSavedSlideIndex] = useState(0);

    /* Tỉ lệ phóng canvas theo màn hình. Đây là điểm mấu chốt: thay vì để chữ px
       "chạy tự do" trong khung co giãn (gây tràn slide), ta giữ nguyên canvas
       1600x900 rồi scale toàn bộ - giống reveal.js / Slidev / Marp. */
    const [viewScale, setViewScale] = useState(1);
    /* Tỉ lệ thu nhỏ riêng phần nội dung khi slide quá dài (auto-fit thật). */
    const [contentScale, setContentScale] = useState(1);
    /* Chiều cao thật của nội dung (chưa scale) - dùng để đặt đúng chiều cao khối
       sau khi thu nhỏ, nhờ đó slide quá dài vẫn cuộn được thay vì bị cắt mất. */
    const [naturalHeight, setNaturalHeight] = useState(0);
    const [autoFitEnabled, setAutoFitEnabled] = useState(true);

    const measureRef = useRef<HTMLDivElement>(null);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (!moduleId) return;
        async function load() {
            const { data } = await supabase.from('lesson_modules').select('*').eq('id', moduleId).single();
            if (data) {
                setModuleData(data);
                const presentationContent = data.presentation_markdown || data.content_markdown;
                if (presentationContent) {
                    const parsed = parseSlides(presentationContent);
                    setSlides(parsed);

                    const savedIdxStr = localStorage.getItem(`present_slide_${moduleId}`);
                    if (savedIdxStr) {
                        const savedIdx = parseInt(savedIdxStr);
                        if (!isNaN(savedIdx) && savedIdx > 0 && savedIdx < parsed.length) {
                            setSavedSlideIndex(savedIdx);
                            setShowRestorePrompt(true);
                        }
                    }
                }
            }
        }
        load();
    }, [moduleId]);

    useEffect(() => {
        if (!moduleId) return;
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (currentSlideIndex > 0) {
            localStorage.setItem(`present_slide_${moduleId}`, currentSlideIndex.toString());
        } else {
            localStorage.removeItem(`present_slide_${moduleId}`);
        }
    }, [currentSlideIndex, moduleId]);

    /* Phóng canvas vừa khít màn hình, đồng bộ cả khi vào/ra toàn màn hình. */
    useLayoutEffect(() => {
        const update = () => {
            setViewScale(Math.min(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT));
            setIsFullscreen(!!document.fullscreenElement);
        };
        update();
        window.addEventListener('resize', update);
        document.addEventListener('fullscreenchange', update);
        return () => {
            window.removeEventListener('resize', update);
            document.removeEventListener('fullscreenchange', update);
        };
    }, []);

    /* AUTO-FIT THẬT: đo chiều cao thật của nội dung rồi thu nhỏ đúng một lần cho vừa khung.
       Phần tử đo luôn giữ width 100% và KHÔNG bị transform, nên offsetHeight ổn định -
       không có vòng lặp đo/co như cơ chế "Tự ép viền" cũ (vốn giảm font 2px mỗi vòng
       nhưng chữ lại hardcode px nên không bao giờ vừa). */
    useLayoutEffect(() => {
        if (!autoFitEnabled) {
            setContentScale(1);
            setNaturalHeight(0);
            return;
        }
        let cancelled = false;
        const measure = () => {
            if (cancelled) return;
            const el = measureRef.current;
            if (!el) return;
            const natural = el.offsetHeight;
            if (!natural) return;
            // Trừ 1px biên an toàn: tích natural*scale là số thực, làm tròn lên có thể
            // dôi ra đúng 1px khiến khung vẫn xuất hiện thanh cuộn thừa.
            const next = natural > CONTENT_HEIGHT
                ? Math.max(MIN_CONTENT_SCALE, (CONTENT_HEIGHT - 1) / natural)
                : 1;
            setNaturalHeight(natural);
            setContentScale(prev => (Math.abs(prev - next) > 0.004 ? next : prev));
        };
        measure();
        // Đo lại vài nhịp để bắt kịp lúc KaTeX và ảnh render xong.
        const t1 = setTimeout(measure, 120);
        const t2 = setTimeout(measure, 420);
        return () => { cancelled = true; clearTimeout(t1); clearTimeout(t2); };
    }, [currentSlideIndex, currentFragmentIndex, slides, autoFitEnabled]);

    const currentFragments = slides[currentSlideIndex] || [];

    const goNext = useCallback(() => {
        const frags = slides[currentSlideIndex] || [];
        if (currentFragmentIndex < frags.length - 1) {
            setCurrentFragmentIndex(prev => prev + 1);
        } else if (currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(prev => prev + 1);
            setCurrentFragmentIndex(0);
        }
    }, [slides, currentSlideIndex, currentFragmentIndex]);

    const goPrev = useCallback(() => {
        if (currentFragmentIndex > 0) {
            setCurrentFragmentIndex(prev => prev - 1);
        } else if (currentSlideIndex > 0) {
            const prevIdx = currentSlideIndex - 1;
            setCurrentSlideIndex(prevIdx);
            setCurrentFragmentIndex((slides[prevIdx] || []).length - 1);
        }
    }, [slides, currentSlideIndex, currentFragmentIndex]);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.error(e));
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter' || e.key === 'PageDown') {
                if (e.key === ' ' || e.key === 'PageDown') e.preventDefault();
                goNext();
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                if (e.key === 'PageUp') e.preventDefault();
                goPrev();
            } else if (e.key === 'f' || e.key === 'F') {
                toggleFullscreen();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goNext, goPrev, toggleFullscreen]);

    if (!moduleData || slides.length === 0) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-indigo-200 text-3xl font-bold animate-pulse">
                Đang nạp bài giảng...
            </div>
        );
    }

    const isQuiz = currentFragments.length > 0 && currentFragments[0].startsWith('```quiz');
    let quizData: any = null;
    if (isQuiz) {
        try {
            const jsonStr = currentFragments[0].replace(/^```quiz\s*/, '').replace(/\s*```$/, '');
            quizData = JSON.parse(jsonStr);
        } catch (e) { }
    }

    // Đồng hồ đếm ngược chỉ hiện ở slide cần bấm giờ cho học sinh làm bài:
    // slide câu hỏi tương tác, hoặc slide có thẻ Ví dụ mẫu.
    const canBamGio = isQuiz || currentFragments.some(frag => slideCoViDuMau(frag));

    const handleSlideClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest('input')) return;
        goNext();
    };

    const progressPct = ((currentSlideIndex + 1) / slides.length) * 100;

    return (
        <div
            onClick={handleSlideClick}
            className="w-screen h-screen overflow-hidden flex items-center justify-center relative
                       bg-[radial-gradient(ellipse_at_top,#1e293b_0%,#0f172a_60%,#020617_100%)] selection:bg-indigo-500/30"
        >
            {showRestorePrompt && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm cursor-default" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 flex flex-col items-center animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-center w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full mb-4 border border-indigo-100">
                            <BookOpen className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 text-center mb-3">Tiếp tục trình chiếu?</h2>
                        <p className="text-slate-500 text-center mb-8 font-medium leading-relaxed">
                            Hệ thống đã lưu lại vị trí lần trước Thầy/Cô đang xem ở <strong className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Trang {savedSlideIndex + 1}</strong>.<br />Thầy/Cô muốn tiếp tục hay bắt đầu lại?
                        </p>
                        <div className="flex gap-4 w-full">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    localStorage.removeItem(`present_slide_${moduleId}`);
                                    setShowRestorePrompt(false);
                                    setCurrentSlideIndex(0);
                                    setCurrentFragmentIndex(0);
                                }}
                                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all"
                            >
                                Bắt đầu lại
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentSlideIndex(savedSlideIndex);
                                    setCurrentFragmentIndex(0);
                                    setShowRestorePrompt(false);
                                }}
                                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg"
                            >
                                Tiếp tục
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Thanh điều khiển trên - tự ẩn */}
            <div className="absolute top-0 left-0 right-0 px-6 py-4 flex justify-between items-center z-50
                            opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300
                            bg-slate-900/80 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center gap-5 min-w-0">
                    <button onClick={() => router.back()} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="font-bold text-lg text-white/90 truncate">{moduleData.title}</h1>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={() => setAutoFitEnabled(v => !v)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors border ${autoFitEnabled
                            ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40'
                            : 'bg-white/5 text-white/60 border-white/10'}`}
                        title="Tự động thu nhỏ nội dung cho vừa khung slide"
                    >
                        <Scaling className="w-4 h-4" />
                        Tự vừa khung: {autoFitEnabled ? 'BẬT' : 'TẮT'}
                        {autoFitEnabled && contentScale < 1 && (
                            <span
                                className={`ml-1 text-[11px] font-black px-1.5 py-0.5 rounded ${contentScale <= MIN_CONTENT_SCALE + 0.005
                                    ? 'bg-amber-400/30 text-amber-200'
                                    : 'bg-indigo-400/30'}`}
                                title={contentScale <= MIN_CONTENT_SCALE + 0.005
                                    ? 'Slide này quá dài, đã thu nhỏ hết mức cho phép - nên tách bớt nội dung sang slide mới'
                                    : 'Đã tự thu nhỏ nội dung cho vừa khung slide'}
                            >
                                {Math.round(contentScale * 100)}%
                            </span>
                        )}
                    </button>
                    <span className="text-white/80 font-bold text-base px-4 py-2 bg-white/10 rounded-full border border-white/10">
                        {currentSlideIndex + 1} / {slides.length}
                    </span>
                    <button onClick={toggleFullscreen} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white" title="Phím F">
                        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* CANVAS CỐ ĐỊNH 1600x900 - phóng nguyên khối theo màn hình */}
            <div
                className="bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] rounded-[20px] overflow-hidden relative flex flex-col shrink-0"
                style={{
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    transform: `scale(${viewScale})`,
                    transformOrigin: 'center center',
                }}
            >
                {/* Thanh tiến độ */}
                <div className="absolute top-0 left-0 right-0 h-[6px] bg-slate-100 z-40">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500 ease-out"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>

                {/* Đồng hồ bấm giờ - đặt trong canvas nên co giãn cùng slide.
                    key theo vị trí slide để chuyển sang slide khác thì đồng hồ về trạng thái ban đầu. */}
                {canBamGio && <PresentationTimer key={`${currentSlideIndex}-${currentFragmentIndex}`} />}

                <div
                    className="flex-1 overflow-y-auto overflow-x-hidden"
                    style={{ paddingLeft: PAD_X, paddingRight: PAD_X, paddingTop: PAD_TOP, paddingBottom: PAD_BOTTOM }}
                >
                    {/* Lớp thu nhỏ auto-fit. Transform KHÔNG ảnh hưởng offsetHeight của phần tử đo bên trong.
                        Chiều cao khối đặt đúng bằng chiều cao SAU khi thu nhỏ, nên slide dài bất thường
                        (đã chạm sàn 45% mà vẫn dư) sẽ cuộn được thay vì bị cắt mất nội dung. */}
                    <div
                        style={{
                            transform: `scale(${contentScale})`,
                            transformOrigin: 'top center',
                            height: naturalHeight ? naturalHeight * contentScale : CONTENT_HEIGHT,
                        }}
                    >
                        {/* flow-root: chặn margin-bottom của phần tử cuối "thoát" ra ngoài (margin collapse),
                            nếu không offsetHeight đo thiếu ~8px khiến nội dung vẫn dôi ra khỏi khung. */}
                        <div ref={measureRef} key={`${currentSlideIndex}-${currentFragmentIndex}`} className="w-full flow-root animate-in fade-in duration-300">
                            {isQuiz && quizData ? (
                                <PresentationQuiz quizData={quizData} />
                            ) : (
                                <div className="w-full">
                                    {currentFragments.slice(0, currentFragmentIndex + 1).map((frag, idx) => (
                                        <div
                                            key={`${currentSlideIndex}-${idx}`}
                                            className={`w-full animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out
                                                        [&_p]:whitespace-pre-wrap [&_li]:whitespace-pre-wrap ${KATEX_CLASS}`}
                                        >
                                            <ReactMarkdown
                                                components={presentationMarkdownComponents}
                                                remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]}
                                                rehypePlugins={[rehypeKatex, rehypeRaw]}
                                            >
                                                {frag}
                                            </ReactMarkdown>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Thanh điều hướng dưới - tự ẩn */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-5 z-50
                            opacity-0 hover:opacity-100 transition-opacity duration-300
                            bg-slate-900/85 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full shadow-2xl">
                <button
                    onClick={goPrev}
                    disabled={currentSlideIndex === 0 && currentFragmentIndex === 0}
                    className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all disabled:opacity-25 disabled:cursor-not-allowed text-white hover:scale-105 active:scale-95"
                    title="Slide trước (Mũi tên trái)"
                >
                    <ChevronLeft className="w-7 h-7" />
                </button>
                <div className="text-white/50 font-bold tracking-widest text-xs uppercase select-none">Điều khiển</div>
                <button
                    onClick={goNext}
                    disabled={currentSlideIndex === slides.length - 1 && currentFragmentIndex === currentFragments.length - 1}
                    className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all disabled:opacity-25 disabled:cursor-not-allowed text-white hover:scale-105 active:scale-95"
                    title="Slide tiếp theo (Space / Mũi tên phải)"
                >
                    <ChevronRight className="w-7 h-7" />
                </button>
            </div>
        </div>
    );
}
