"use client";
import { useEffect, useState, useRef, useLayoutEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import ReactMarkdown from 'react-markdown';
import { chuyenDiaChiAnh, preprocessMarkdown } from '@/components/CustomMarkdownComponents';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
import { ChevronRight, ChevronLeft, ArrowLeft, Maximize2, Minimize2, BookOpen, Scaling, Dices, Smartphone, HelpCircle } from 'lucide-react';
import { ensureMathDelimiters } from '@/utils/latexFixer';
import React from 'react';
import {
    presentationMarkdownComponents,
    slideCoViDuMau,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
} from '@/components/presentation/presentationTheme';
import PresentationTimer from '@/components/presentation/PresentationTimer';
import PresentationQuiz, { KATEX_CLASS } from '@/components/presentation/PresentationQuiz';
import TruyDuoi from '@/components/tro-choi/TruyDuoi';
import { Gamepad2 } from 'lucide-react';
import type { TrangThaiTroChoi } from '@/utils/dieuKhienXa';
import BangGoiTenVaDiem from '@/components/lop/BangGoiTenVaDiem';
import GhepDienThoaiModal from '@/components/presentation/GhepDienThoaiModal';
import HuongDanSoanBaiModal from '@/components/admin/HuongDanSoanBaiModal';
import { moKenhMayChieu, taoMaPhien, type Lenh, type TrangThaiChieu } from '@/utils/dieuKhienXa';
import { tachSlide, viTriCauHoi, slideCuaCau } from '@/utils/tachSlide';

/* Vùng nội dung bên trong canvas (đã trừ lề). Mọi phép đo auto-fit dựa trên đây. */
const PAD_X = 84;
const PAD_TOP = 54;
/* Chừa chỗ cho thanh điều khiển nổi ở đáy màn (fixed bottom-6, cao ~60px).
   Trước để 46 thì thanh này đè lên đúng dòng cuối của lời giải - xem ảnh Thầy cô gửi. */
const PAD_BOTTOM = 118;
const CONTENT_HEIGHT = CANVAS_HEIGHT - PAD_TOP - PAD_BOTTOM;
/** Không thu nhỏ quá mức này để chữ còn đọc được từ cuối lớp. */
const MIN_CONTENT_SCALE = 0.45;

/* Hàm tách slide chuyển sang utils/tachSlide để TRANG ĐIỀU KHIỂN trên điện thoại tách y
   hệt - hai nơi tách lệch nhau một chút là số slide đã khác, bấm nút ra nhầm slide. */
const parseSlides = tachSlide;

/* Lớp tiện ích cho KaTeX dùng chung mọi nơi trong slide. */

// --- Quiz Component for Presentation ---
/**
 * Đọc khối ```quiz``` ở đầu slide. Trả về null nếu slide không phải câu hỏi tương tác,
 * hoặc khối JSON viết sai - lúc đó điện thoại chỉ hiện nội dung như slide thường.
 */
function docQuiz(manh?: string): any {
    if (!manh || !manh.startsWith('```quiz')) return null;
    try {
        return JSON.parse(manh.replace(/^```quiz\s*/, '').replace(/\s*```$/, ''));
    } catch { return null; }
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
    /* Bảng gọi tên & điểm - mở được ngay giữa giờ dạy, phím tắt G. */
    const [moGoiTen, setMoGoiTen] = useState(false);
    /* TRÒ CHƠI TRÊN LỚP (đợt 1: Truy đuổi). Mở thì khung slide nhường chỗ cho trò; bài giảng
       vẫn ở nguyên slide đang chiếu, đóng trò là về đúng chỗ. */
    const [moTroChoi, setMoTroChoi] = useState(false);
    const [lenhChoTroChoi, setLenhChoTroChoi] = useState<{ hanh: string; gia?: any; dem: number } | null>(null);
    const [ttTroChoi, setTtTroChoi] = useState<TrangThaiTroChoi | null>(null);
    const [cauHoiTroChoi, setCauHoiTroChoi] = useState<any | null>(null);
    const [quizTroChoi, setQuizTroChoi] = useState<{ hienDapAn: boolean; dangChon: number | null; buoc: number; loiGiai: string }>({ hienDapAn: false, dangChon: null, buoc: 0, loiGiai: '' });
    /* Đồng hồ của trò chơi dựng lại mỗi câu (khoá đổi), và tự chạy theo số giây thầy đã đặt lần trước */
    const [khoaGioTroChoi, setKhoaGioTroChoi] = useState('');
    const [moSanKhau, setMoSanKhau] = useState(false);

    /* Điều khiển bằng điện thoại. Mã phiên sinh MỘT LẦN cho mỗi lần mở trang - tải lại
       trang là mã đổi, nên điện thoại cũ mất quyền, phải quét lại. */
    const [maPhien] = useState(() => taoMaPhien());
    const [moGhepDT, setMoGhepDT] = useState(false);
    const [moHuongDan, setMoHuongDan] = useState(false);
    const [dtDaNoi, setDtDaNoi] = useState(false);
    /* Lệnh gửi xuống bảng Gọi tên - tăng số đếm là bảng đó biết có việc mới. */
    const [lenhChoBang, setLenhChoBang] = useState<{ viec: string; diem?: number; dem: number } | null>(null);
    /* Lệnh điện thoại bấm thẳng lên câu hỏi tương tác và đồng hồ đang chiếu. */
    const [lenhChoQuiz, setLenhChoQuiz] = useState<{ viec: string; chon?: number; chu?: string; y?: number; dung?: boolean; dem: number } | null>(null);
    const [lenhChoGio, setLenhChoGio] = useState<{ viec: string; phut?: number; dem: number; luc: number } | null>(null);
    /* Điện thoại đặt giờ ở slide thường (vốn không có đồng hồ) thì cho đồng hồ hiện ra. */
    const [moGioTuXa, setMoGioTuXa] = useState(false);
    /* Câu hỏi đang chiếu ở trạng thái nào - để điện thoại tô đúng phương án Thầy đã chọn. */
    const [trangThaiQuiz, setTrangThaiQuiz] = useState<{ hienDapAn: boolean; dangChon: number | null }>({ hienDapAn: false, dangChon: null });
    /** Câu đang chiếu đang ở bước nào (0 đề · 1 đáp án · 2 lời giải) và lời giải của nó. */
    const [buocQuiz, setBuocQuiz] = useState(0);
    const [loiGiaiQuiz, setLoiGiaiQuiz] = useState('');
    const [gioConLai, setGioConLai] = useState(0);
    /** Ô gõ số câu trên thanh trên cùng - để nhảy thẳng tới câu cần chữa. */
    const [oNhayCau, setONhayCau] = useState('');
    const phatTrangThai = useRef<((tt: TrangThaiChieu) => void) | null>(null);
    /* Luôn giữ hàm dựng trạng thái MỚI NHẤT. Bộ nghe lệnh chỉ tạo một lần nên nếu gọi
       thẳng vào biến state thì nó đọc phải giá trị cũ của lần vẽ đầu. */
    const layTrangThai = useRef<(() => TrangThaiChieu) | null>(null);
    /* Hàm xử lý lệnh, luôn giữ bản mới nhất - xem chú thích ở chỗ mở kênh. */
    const xuLyLenh = useRef<((l: Lenh) => void) | null>(null);

    // Resume states
    const [showRestorePrompt, setShowRestorePrompt] = useState(false);
    const [savedSlideIndex, setSavedSlideIndex] = useState(0);

    /* Tỉ lệ phóng canvas theo màn hình. Đây là điểm mấu chốt: thay vì để chữ px
       "chạy tự do" trong khung co giãn (gây tràn slide), ta giữ nguyên canvas
       1600x900 rồi scale toàn bộ - giống reveal.js / Slidev / Marp. */
    const [viewScale, setViewScale] = useState(1);
    /**
     * Bảng Gọi tên nép bên nào - để chừa chỗ cho nó.
     *
     * Trước đây bảng bung ra giữa và phủ nền mờ, cả lớp không còn nhìn thấy câu hỏi để
     * trả lời. Nay bảng nép một bên, và slide THU NHỎ vừa phần còn lại rồi dịch sang bên
     * kia - không bị che chữ nào.
     */
    const [benBang, setBenBang] = useState<'trai' | 'phai'>('phai');
    const CHO_BANG = 434; // bề ngang bảng 410 + lề
    /* Tỉ lệ thu nhỏ riêng phần nội dung khi slide quá dài (auto-fit thật). */
    const [contentScale, setContentScale] = useState(1);
    /* Chiều cao thật của nội dung (chưa scale) - dùng để đặt đúng chiều cao khối
       sau khi thu nhỏ, nhờ đó slide quá dài vẫn cuộn được thay vì bị cắt mất. */
    const [naturalHeight, setNaturalHeight] = useState(0);
    const [autoFitEnabled, setAutoFitEnabled] = useState(true);

    const measureRef = useRef<HTMLDivElement>(null);
    /** Vùng cuộn của slide - để điện thoại cuộn được phần bị khuất. */
    const vungCuon = useRef<HTMLDivElement>(null);
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
            const beRong = Math.max(320, window.innerWidth - (moGoiTen ? CHO_BANG : 0));
            setViewScale(Math.min(beRong / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT));
            setIsFullscreen(!!document.fullscreenElement);
        };
        update();
        window.addEventListener('resize', update);
        document.addEventListener('fullscreenchange', update);
        return () => {
            window.removeEventListener('resize', update);
            document.removeEventListener('fullscreenchange', update);
        };
        /* Mở/đóng bảng Gọi tên cũng phải tính lại: chỗ trống cho slide đổi. */
    }, [moGoiTen]);

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

    const moTroChoiRef = useRef(false);
    useEffect(() => { moTroChoiRef.current = moTroChoi; }, [moTroChoi]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Đang gõ trong ô nhập (ví dụ ô phút/giây của đồng hồ đặt giờ) thì không chuyển slide,
            // nếu không vừa gõ số vừa bị nhảy sang slide khác.
            const o = e.target as HTMLElement | null;
            const the = o?.tagName;
            if (the === 'INPUT' || the === 'TEXTAREA' || the === 'SELECT' || o?.isContentEditable) return;

            if (e.key === 't' || e.key === 'T') { setMoTroChoi(v => !v); return; }
            /* Đang chơi thì mũi tên/Enter là của trò chơi, không chuyển slide bên dưới */
            if (moTroChoiRef.current && (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter' || e.key === 'PageDown' || e.key === 'ArrowLeft' || e.key === 'PageUp')) return;

            if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter' || e.key === 'PageDown') {
                if (e.key === ' ' || e.key === 'PageDown') e.preventDefault();
                goNext();
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                if (e.key === 'PageUp') e.preventDefault();
                goPrev();
            } else if (e.key === 'f' || e.key === 'F') {
                toggleFullscreen();
            } else if (e.key === 'h' || e.key === 'H') {
                setMoHuongDan(true);
            } else if (e.key === 'g' || e.key === 'G') {
                /* Gọi tên & Điểm - đang giảng, với tay bấm một phím là xong. */
                setMoGoiTen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goNext, goPrev, toggleFullscreen]);

    /*
     * ĐIỆN THOẠI ĐIỀU KHIỂN.
     *
     * Máy chiếu là nơi giữ trạng thái thật, điện thoại chỉ ra lệnh. Nhờ vậy điện thoại rớt
     * mạng giữa chừng thì bài giảng không hề bị ảnh hưởng.
     */
    /*
     * KÊNH CHỈ MỞ ĐÚNG MỘT LẦN cho mỗi mã phiên.
     *
     * Bản đầu cho hiệu ứng phụ thuộc cả goNext/goPrev - mà hai hàm đó đổi mỗi lần sang
     * slide, nên kênh bị đóng rồi mở lại liên tục. Đo trên máy: bấm ▶ xong bấm tiếp "Gọi
     * tên" là lệnh rơi mất vì rơi đúng lúc kênh đang dựng lại. Nay việc xử lý lệnh để
     * trong ref, đổi bao nhiêu lần cũng không đụng tới kênh.
     */
    useEffect(() => {
        xuLyLenh.current = (l: Lenh) => {
            setDtDaNoi(true);
            /* Điện thoại vừa vào thì phát ngay trạng thái, đừng bắt Thầy bấm một cái
               mới biết đang ở slide nào. */
            if (l.viec === 'xin-trang-thai') {
                const tt = layTrangThai.current?.();
                if (tt) phatTrangThai.current?.(tt);
                return;
            }
            switch (l.viec) {
                case 'sau': goNext(); break;
                case 'truoc': goPrev(); break;
                case 'nhay': setCurrentSlideIndex(l.slide); setCurrentFragmentIndex(0); break;
                case 'nhay-cau': {
                    const i = slideCuaCau(slides, l.cau);
                    if (i >= 0) { setCurrentSlideIndex(i); setCurrentFragmentIndex(0); }
                    break;
                }
                case 'xem-loi-giai':
                    setLenhChoQuiz(v => ({ viec: 'xem-loi-giai', dem: (v?.dem || 0) + 1 })); break;
                case 'toan-man-hinh': toggleFullscreen(); break;
                case 'mo-goi-ten': setMoGoiTen(true); break;
                case 'dong-goi-ten': setMoGoiTen(false); break;
                case 'mo-san-khau': setMoSanKhau(true); break;
                case 'tro-choi':
                    if (l.hanh === 'mo') setMoTroChoi(true);
                    else if (l.hanh === 'dong') setMoTroChoi(false);
                    else setLenhChoTroChoi(v => ({ hanh: l.hanh, gia: l.gia, dem: (v?.dem || 0) + 1 }));
                    break;
                case 'chon-ds':
                    setLenhChoQuiz(v => ({ viec: 'chon-ds', y: (l as any).y, dung: (l as any).dung, dem: (v?.dem || 0) + 1 } as any)); break;
                /* Mấy việc bên dưới là của bảng Gọi tên, chuyển thẳng xuống cho nó lo. */
                case 'quay': case 'vang': case 'bo-lai':
                    setLenhChoBang(v => ({ viec: l.viec, dem: (v?.dem || 0) + 1 })); break;
                case 'diem':
                    setLenhChoBang(v => ({ viec: 'diem', diem: l.diem, dem: (v?.dem || 0) + 1 })); break;
                /* Thao tác thẳng trên câu hỏi tương tác đang chiếu */
                case 'chon-dap-an':
                    setLenhChoQuiz(v => ({ viec: 'chon-dap-an', chon: l.chon, dem: (v?.dem || 0) + 1 })); break;
                case 'hien-dap-an':
                    setLenhChoQuiz(v => ({ viec: 'hien-dap-an', dem: (v?.dem || 0) + 1 })); break;
                case 'nhap-dap-an':
                    setLenhChoQuiz(v => ({ viec: 'nhap-dap-an', chu: l.chu, dem: (v?.dem || 0) + 1 })); break;
                case 'dat-gio':
                    setMoGioTuXa(true);
                    setLenhChoGio(v => ({ viec: 'dat-gio', phut: l.phut, dem: (v?.dem || 0) + 1, luc: Date.now() })); break;
                case 'dung-gio':
                    setMoGioTuXa(false);
                    setLenhChoGio(v => ({ viec: 'dung-gio', dem: (v?.dem || 0) + 1, luc: Date.now() })); break;
                /* Cuộn phần đang chiếu - lời giải dài hơn một màn thì đuôi bị khuất, mà
                   thầy cô đang đứng giữa lớp không với tới chuột máy chiếu. */
                case 'cuon': {
                    /*
                     * Cuộn Ô TRONG CÙNG còn cuộn được, rồi mới tới khung ngoài.
                     *
                     * Nội dung bị khuất có thể nằm trong ô "Lời giải chi tiết" (ô đó có
                     * max-h riêng và tự cuộn), cũng có thể nằm ngoài khung slide khi cả
                     * slide dài quá. Cuộn nhầm ô thì bấm mãi không thấy gì nhúc nhích.
                     */
                    const ngoai = vungCuon.current;
                    if (!ngoai) break;
                    const buoc = (o: HTMLElement) => l.huong * Math.round(o.clientHeight * 0.7);
                    const conCuonDuoc = (o: HTMLElement) => (l.huong > 0
                        ? o.scrollTop + o.clientHeight < o.scrollHeight - 2
                        : o.scrollTop > 2);
                    const ben = Array.from(ngoai.querySelectorAll<HTMLElement>('*'))
                        .filter(o => o.scrollHeight - o.clientHeight > 8
                            && /auto|scroll/.test(getComputedStyle(o).overflowY))
                        .reverse();   // trong cùng trước
                    const o = [...ben, ngoai].find(conCuonDuoc) || ngoai;
                    o.scrollBy({ top: buoc(o), behavior: 'smooth' });
                    break;
                }
            }
        };
    });

    useEffect(() => {
        const k = moKenhMayChieu(maPhien, (l: Lenh) => xuLyLenh.current?.(l));
        phatTrangThai.current = k.phat;
        return () => { phatTrangThai.current = null; k.dong(); };
    }, [maPhien]);

    /* Đổi slide thì phát ngay xuống điện thoại, để ô "Slide n/23" và phần xem trước
       luôn khớp với những gì đang chiếu trên bảng. */
    useEffect(() => {
        layTrangThai.current = () => {
            const nay = slides[currentSlideIndex] || [];
            const ke = slides[currentSlideIndex + 1] || [];
            /* Slide này là câu hỏi tương tác thì gửi kèm đề và phương án, để điện thoại
               bày ra mấy nút A B C D thay vì hiện nguyên khối ```quiz``` khó đọc. */
            /* Đang chơi trò chơi: điện thoại bày câu của trò, không phải câu của slide bên dưới */
            const cauHoi = moTroChoi ? cauHoiTroChoi : docQuiz(nay[0]);
            const tq = moTroChoi ? quizTroChoi : trangThaiQuiz;
            const buocQ = moTroChoi ? quizTroChoi.buoc : buocQuiz;
            const loiGiaiQ = moTroChoi ? quizTroChoi.loiGiai : loiGiaiQuiz;
            const dem = moTroChoi ? { soCau: ttTroChoi?.cau || 0, tongCau: ttTroChoi?.tongCau || 0 } : viTriCauHoi(slides, currentSlideIndex);
            const loai = cauHoi?.type || 'multiple_choice';
            /* Cụm mệnh đề Đúng/Sai để phương án dưới dạng đối tượng {id, content, isTrue},
               không phải chuỗi - cứ đưa thẳng cho KaTeX là vỡ trang. Nắn hết về chuỗi. */
            const cumMenhDe = loai === 'true_false_cluster';
            return {
                slide: currentSlideIndex,
                tongSlide: slides.length,
                /* Chỉ gửi các mảnh ĐANG hiện, đúng như trên bảng */
                dangChieu: nay.slice(0, currentFragmentIndex + 1).join('\n\n'),
                keTiep: ke.join('\n\n'),
                moGoiTen,
                trungAi: '',
                tomTatQuay: '',
                cauHoi: cauHoi && {
                    loai,
                    de: cauHoi.question || '',
                    phuongAn: cumMenhDe
                        ? (cauHoi.options || []).map((o: any) => `${o?.id ? o.id + ') ' : ''}${o?.content ?? o}`)
                        : loai === 'true_false'
                            ? (cauHoi.options?.length ? cauHoi.options.map(String) : ['ĐÚNG', 'SAI'])
                            : (cauHoi.options || []).map((o: any) => String(o?.content ?? o)),
                    bamDuoc: !cumMenhDe,
                    hienDapAn: tq.hienDapAn,
                    dangChon: tq.dangChon,
                    /* Gửi luôn đáp án đúng: đây là điện thoại của Thầy cô (đã đăng nhập
                       tài khoản quản trị), có sẵn đáp án trong tay thì khỏi phải ngoái
                       nhìn bảng mới biết em trả lời đúng hay sai. */
                    dapAn: typeof cauHoi.answerIndex === 'number' ? cauHoi.answerIndex : null,
                    buoc: buocQ,
                    loiGiai: loiGiaiQ,
                    dapAnChu: cumMenhDe
                        ? (cauHoi.options || []).map((o: any) => `${o?.id || ''}: ${o?.isTrue ? 'Đúng' : 'Sai'}`).join(' · ')
                        : String(cauHoi.exactAnswer || cauHoi.correctAnswer || cauHoi.answerText || ''),
                },
                gioConLai,
                soCau: dem.soCau,
                tongCau: dem.tongCau,
                troChoi: moTroChoi ? ttTroChoi : null,
            };
        };
        if (phatTrangThai.current) phatTrangThai.current(layTrangThai.current());
    }, [currentSlideIndex, currentFragmentIndex, slides, moGoiTen, trangThaiQuiz, gioConLai, buocQuiz, loiGiaiQuiz, moTroChoi, ttTroChoi, cauHoiTroChoi, quizTroChoi]);

    /* Ô số câu bám theo câu đang chiếu - trừ lúc Thầy cô đang gõ dở để nhảy đi chỗ khác. */
    useEffect(() => {
        setONhayCau(String(viTriCauHoi(slides, currentSlideIndex).soCau || ''));
    }, [slides, currentSlideIndex]);

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
    const canBamGio = moTroChoi || isQuiz || moGioTuXa || currentFragments.some(frag => slideCoViDuMau(frag));

    const handleSlideClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest('input')) return;
        goNext();
    };

    const progressPct = ((currentSlideIndex + 1) / slides.length) * 100;
    const demCau = viTriCauHoi(slides, currentSlideIndex);

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
                    {/* Số CÂU, tách khỏi số slide: chữa bài là nhảy tới "câu 7", mà 3 đề
                        trong kho có xen slide chữ nên hai số này lệch nhau. */}
                    {demCau.tongCau > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full border border-white/10"
                             title="Gõ số câu rồi Enter để nhảy tới câu đó">
                            <span className="text-white/70 font-bold text-base">Câu</span>
                            <input
                                value={oNhayCau}
                                onChange={e => setONhayCau(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                onFocus={e => e.currentTarget.select()}
                                onBlur={() => setONhayCau(String(demCau.soCau || ''))}
                                onKeyDown={e => {
                                    if (e.key !== 'Enter') return;
                                    const i = slideCuaCau(slides, parseInt(oNhayCau || '0', 10));
                                    if (i >= 0) { setCurrentSlideIndex(i); setCurrentFragmentIndex(0); }
                                    e.currentTarget.blur();
                                }}
                                className="w-[46px] bg-white/15 border border-white/20 rounded-md px-1.5 py-0.5
                                           text-center text-white font-black text-base outline-none focus:border-indigo-300"
                            />
                            <span className="text-white/60 font-bold text-base">/ {demCau.tongCau}</span>
                        </div>
                    )}
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
                    /* translate ĐỨNG TRƯỚC scale nên dịch đúng số điểm ảnh thật,
                       không bị nhân thêm tỉ lệ phóng. */
                    transform: `translateX(${moGoiTen ? (benBang === 'phai' ? -CHO_BANG / 2 : CHO_BANG / 2) : 0}px) scale(${viewScale})`,
                    transformOrigin: 'center center',
                    transition: 'transform 220ms ease-out',
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
                {canBamGio && (
                    <PresentationTimer
                        key={moTroChoi ? `tro-choi-${khoaGioTroChoi}` : `${currentSlideIndex}-${currentFragmentIndex}`}
                        lenhNgoai={lenhChoGio}
                        onDoi={setGioConLai}
                    />
                )}

                <div
                    ref={vungCuon}
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
                            {moTroChoi ? (
                                <TruyDuoi
                                    lessonId={typeof params?.id === 'string' ? params.id : undefined}
                                    lenhTuXa={lenhChoTroChoi}
                                    lenhChoQuiz={lenhChoQuiz}
                                    onTrangThai={(tt, cauHoi, q) => { setTtTroChoi(tt); setCauHoiTroChoi(cauHoi); setQuizTroChoi(q); }}
                                    onBatDauCau={(khoa) => {
                                        setKhoaGioTroChoi(khoa);
                                        /* Tự chạy đồng hồ theo số giây thầy đặt lần trước (đồng hồ nhớ trong localStorage) */
                                        let giay = 0; try { giay = parseInt(localStorage.getItem('thoi-luong-dat-gio-lan-truoc') || '0', 10); } catch { /* thôi */ }
                                        if (giay > 0) setLenhChoGio(v => ({ viec: 'dat-gio', phut: giay / 60, dem: (v?.dem || 0) + 1, luc: Date.now() }));
                                    }}
                                    onDong={() => { setMoTroChoi(false); setTtTroChoi(null); setCauHoiTroChoi(null); }}
                                />
                            ) : isQuiz && quizData ? (
                                <PresentationQuiz
                                    key={currentSlideIndex}
                                    quizData={quizData}
                                    lenhNgoai={lenhChoQuiz}
                                    onDoi={(t: any) => {
                                        setTrangThaiQuiz({ hienDapAn: t.hienDapAn, dangChon: t.dangChon });
                                        setBuocQuiz(t.buoc);
                                        setLoiGiaiQuiz(t.loiGiai);
                                    }}
                                    onGoiTen={() => setMoGoiTen(true)}
                                    soCau={demCau.soCau}
                                    tongCau={demCau.tongCau}
                                />
                            ) : (
                                <div className="w-full">
                                    {/* whitespace-pre-wrap chỉ đặt cho <p>, KHÔNG đặt cho <li>: một ý có ảnh
                                        (hoặc có dòng trống) thì bên trong <li> là mấy khối rời nhau, giữa
                                        chúng còn sót ký tự xuống dòng - để pre-wrap thì mấy ký tự ấy hiện
                                        thành dòng trống thật, đẩy dấu đầu dòng rời hẳn khỏi chữ và giãn
                                        dòng vống lên. Đo trên slide "Sự chuyển thể": thừa 30px mỗi ý. */}
                                    {currentFragments.slice(0, currentFragmentIndex + 1).map((frag, idx) => (
                                        <div
                                            key={`${currentSlideIndex}-${idx}`}
                                            className={`w-full animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out
                                                        [&_p]:whitespace-pre-wrap ${KATEX_CLASS}`}
                                        >
                                            <ReactMarkdown urlTransform={chuyenDiaChiAnh}
                                                components={presentationMarkdownComponents}
                                                remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]}
                                                rehypePlugins={[rehypeKatex, rehypeRaw]}
                                            >
                                                {/* Dọn chữ TRƯỚC khi dựng, y như ô soạn thảo và
                                                    trang học sinh vẫn làm. Trình chiếu trước đây
                                                    bỏ qua bước này nên bảng Markdown gõ thiếu
                                                    dòng kẻ và mấy ký tự LaTeX hỏng vẫn trơ ra -
                                                    thành ra soạn thì đẹp mà chiếu lên lại khác. */}
                                                {preprocessMarkdown(frag)}
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
                <button
                    onClick={() => setMoHuongDan(true)}
                    className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white hover:scale-105 active:scale-95"
                    title="Hướng dẫn sử dụng (phím H)"
                >
                    <HelpCircle className="w-7 h-7" />
                </button>
                <button
                    onClick={() => setMoGhepDT(true)}
                    className={`p-2.5 rounded-full transition-all text-white hover:scale-105 active:scale-95 ${
                        dtDaNoi ? 'bg-emerald-500/40 hover:bg-emerald-500/60' : 'bg-white/10 hover:bg-white/20'}`}
                    title={dtDaNoi ? 'Điện thoại đã kết nối' : 'Dùng điện thoại điều khiển'}
                >
                    <Smartphone className="w-7 h-7" />
                </button>
                <button
                    onClick={() => setMoGoiTen(true)}
                    className="p-2.5 bg-violet-500/25 hover:bg-violet-500/45 rounded-full transition-all text-white hover:scale-105 active:scale-95"
                    title="Gọi tên & Điểm (phím G)"
                >
                    <Dices className="w-7 h-7" />
                </button>
                <button
                    onClick={() => setMoTroChoi(v => !v)}
                    className={`p-2.5 rounded-full transition-all text-white hover:scale-105 active:scale-95 ${
                        moTroChoi ? 'bg-orange-500/60 hover:bg-orange-500/80' : 'bg-orange-500/25 hover:bg-orange-500/45'}`}
                    title="Trò chơi trên lớp (phím T)"
                >
                    <Gamepad2 className="w-7 h-7" />
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

            {/* Gọi tên & Điểm. Đây là đường trình chiếu DÙNG CHUNG cho cả bài giảng lẫn
                luyện tập, nên gắn ở đây là phủ được cả hai. */}
            <BangGoiTenVaDiem
                isOpen={moGoiTen}
                onClose={() => setMoGoiTen(false)}
                benCanh
                onDoiBen={setBenBang}
                lessonId={typeof params?.id === 'string' ? params.id : undefined}
                lenhTuXa={lenhChoBang}
                onDoiTrangThai={(tt) => phatTrangThai.current?.({
                    slide: currentSlideIndex,
                    tongSlide: slides.length,
                    dangChieu: (slides[currentSlideIndex] || []).slice(0, currentFragmentIndex + 1).join('\n\n'),
                    keTiep: (slides[currentSlideIndex + 1] || []).join('\n\n'),
                    moGoiTen: true,
                    trungAi: tt.trungAi,
                    tomTatQuay: tt.tomTat,
                })}
            />

            {/* Ghép điện thoại: mã QR dựng từ chính địa chỉ đang mở nên chạy ở đâu cũng đúng. */}
            <HuongDanSoanBaiModal isOpen={moHuongDan} onClose={() => setMoHuongDan(false)} />

            <GhepDienThoaiModal
                isOpen={moGhepDT}
                onClose={() => setMoGhepDT(false)}
                ma={maPhien}
                daNoi={dtDaNoi}
                lessonId={typeof params?.id === 'string' ? params.id : undefined}
                moduleId={moduleId || undefined}
            />
        </div>
    );
}
