"use client";
import { useEffect, useState, useRef } from 'react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import { Dices } from 'lucide-react';
import { chuyenDiaChiAnh } from '@/components/CustomMarkdownComponents';
import { ensureMathDelimiters } from '@/utils/latexFixer';
import { xuongDongNgoaiCongThuc, khopTraLoiNgan } from '@/utils/troChoi';

/**
 * Một câu hỏi tương tác trên màn chiếu: đề → đáp án → lời giải, bấm được từ chuột lẫn
 * điện thoại. Tách ra khỏi trang trình chiếu (16/9/2026) để trò chơi trên lớp dùng chung
 * — một chỗ vẽ câu, mọi nơi chiếu câu đều giống nhau.
 */
export const KATEX_CLASS = '[&_.katex]:text-[#1e40af] [&_.katex-display]:my-4 [&_.katex-display]:text-[1.04em]';

/** Trạng thái câu báo ngược ra ngoài (máy chiếu phát xuống điện thoại, trò chơi chấm điểm). */
export interface TrangThaiQuiz {
    hienDapAn: boolean;
    dangChon: number | null;
    buoc: number;
    loiGiai: string;
    chonCum: Record<number, boolean>;
    chuNhap: string;
    /** Chế độ chấm kín: số lần đã chấm và kết quả lần chấm gần nhất. */
    lanCham: number;
    ketQuaCham: 'dung' | 'sai' | null;
    /** Phương án đã bị chọn sai (chấm kín) — khoá lại, em sau không chọn được nữa. */
    daSai: number[];
}

export default function PresentationQuiz({ quizData, lenhNgoai, onDoi, onGoiTen, soCau, tongCau, chamKin, khoa }: {
    quizData: any;
    /** Số thứ tự câu trong đề, để trên bảng ghi đúng "Câu 7" như tờ đề học sinh cầm. */
    soCau?: number;
    tongCau?: number;
    /** Lệnh bấm từ điện thoại; `dem` tăng mỗi lần bấm nên bấm mấy lần chạy mấy lần. */
    lenhNgoai?: { viec: string; chon?: number; chu?: string; y?: number; dung?: boolean; dem: number } | null;
    /** Báo ngược ra để máy chiếu phát xuống điện thoại */
    onDoi?: (tt: TrangThaiQuiz) => void;
    /** Mở bảng Gọi tên & Điểm ngay tại câu đang chữa */
    onGoiTen?: () => void;
    /**
     * CHẤM KÍN (trò chơi Truy đuổi, Đấu đội): nút chính ở bước đề là "Chấm" thay vì "Hiển
     * thị đáp án". Đúng thì mới lật đáp án; SAI thì chỉ tô đỏ phương án vừa chọn, khoá nó
     * lại, đáp án vẫn giấu — để chuyền cho em khác / đội khác còn trả lời được. Bản đầu
     * (16/9/2026) chấm bằng cách lật đáp án nên em sai là cả lớp thấy luôn đáp án, em nhận
     * chuyền chỉ việc đọc — thầy bắt được ngay buổi chơi thật đầu tiên.
     */
    chamKin?: boolean;
    /** Khoá thao tác (trò chơi đã chấm xong câu này / chưa tới lượt): không chọn phương án,
        không có nút Chấm; nút Xem lời giải vẫn còn. */
    khoa?: boolean;
}) {
    /**
     * BA BƯỚC cho một câu, đi bằng đúng một nút: đề → đáp án → lời giải → về lại đề.
     *
     * Trước đây chỉ có hai trạng thái đúng/sai và chỉ ba kiểu câu có nhánh vẽ, nên bấm
     * "Hiển thị đáp án" ở câu TỰ LUẬN hay CỤM ĐÚNG/SAI thì không ra gì - đo trên đề thật
     * của Thầy là 453/1949 câu (23%). Lời giải chi tiết thì đề nào cũng có sẵn trong
     * `answer`/`sampleAnswer` nhưng chưa bao giờ được hiện.
     */
    const [buoc, setBuoc] = useState(0);
    const showAnswer = buoc >= 1;
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const [chuNhap, setChuNhap] = useState('');
    /** Cụm mệnh đề: thầy bấm Đ/S theo lớp trả lời trước khi lật đáp án. */
    const [chonCum, setChonCum] = useState<Record<number, boolean>>({});
    /** Ảnh trong đề là dải ngang (rộng/cao > 2,5) - đo lúc ảnh tải xong, xem chú thích chỗ dùng. */
    const [anhRong, setAnhRong] = useState(false);
    useEffect(() => { setAnhRong(false); }, [quizData]);

    /* Chấm kín: phương án đã sai (khoá), câu trả lời ngắn đã sai, số lần chấm, kết quả. */
    const [daSai, setDaSai] = useState<number[]>([]);
    const [saiNgan, setSaiNgan] = useState<string[]>([]);
    const [lanCham, setLanCham] = useState(0);
    const [ketQuaCham, setKetQuaCham] = useState<'dung' | 'sai' | null>(null);
    const [nhacChon, setNhacChon] = useState(false);

    const type = quizData?.type || "multiple_choice";

    /**
     * Chấm mà không lật đáp án. Đúng → lật (bước 1). Sai → khoá phương án vừa chọn, xoá
     * lựa chọn, đáp án vẫn giấu. Chưa chọn gì thì nhắc, không chấm — bấm nhầm là trừ điểm
     * thật trong sổ.
     */
    const cham = () => {
        if (!quizData || showAnswer) return;
        let dung = false;
        if (type === 'multiple_choice' || type === 'true_false') {
            if (selectedIdx === null) { setNhacChon(true); return; }
            dung = selectedIdx === quizData.answerIndex;
            if (!dung) { setDaSai(d => d.includes(selectedIdx) ? d : [...d, selectedIdx]); setSelectedIdx(null); }
        } else if (type === 'true_false_cluster') {
            const ds = quizData.options || [];
            if (!ds.length || ds.some((_: any, i: number) => chonCum[i] === undefined)) { setNhacChon(true); return; }
            dung = ds.every((o: any, i: number) => !!o?.isTrue === !!chonCum[i]);
            if (!dung) setChonCum({});
        } else if (type === 'short_answer') {
            if (!chuNhap.trim()) { setNhacChon(true); return; }
            dung = khopTraLoiNgan(chuNhap, String(quizData.exactAnswer || quizData.correctAnswer || quizData.answerText || ''));
            if (!dung) { setSaiNgan(s => [...s, chuNhap.trim()]); setChuNhap(''); }
        } else {
            return; /* tự luận: trò chơi chấm bằng nút Đúng/Sai riêng */
        }
        setNhacChon(false);
        setKetQuaCham(dung ? 'dung' : 'sai');
        setLanCham(n => n + 1);
        if (dung) setBuoc(1);
    };
    useEffect(() => { if (nhacChon) { const t = setTimeout(() => setNhacChon(false), 1800); return () => clearTimeout(t); } }, [nhacChon]);

    /* Nhận lệnh từ điện thoại. Phải nằm TRƯỚC dòng thoát sớm bên dưới, nếu không React
       đếm số hook lệch giữa hai lần vẽ và vỡ trang. */
    const demDaLam = useRef(lenhNgoai?.dem ?? 0);
    useEffect(() => {
        if (!lenhNgoai || lenhNgoai.dem === demDaLam.current) return;
        demDaLam.current = lenhNgoai.dem;
        if (lenhNgoai.viec === 'chon-dap-an' && typeof lenhNgoai.chon === 'number') {
            if (!showAnswer && !khoa && !daSai.includes(lenhNgoai.chon)) setSelectedIdx(lenhNgoai.chon);
        } else if (lenhNgoai.viec === 'hien-dap-an') {
            /* Chấm kín: nút "Hiển thị đáp án" trên điện thoại ở bước đề nghĩa là Chấm */
            if (chamKin && buoc === 0 && type !== 'essay') cham(); else doiBuoc();
        } else if (lenhNgoai.viec === 'cham') {
            cham();
        } else if (lenhNgoai.viec === 'xem-loi-giai') {
            setBuoc(2);
        } else if (lenhNgoai.viec === 'nhap-dap-an') {
            setChuNhap(lenhNgoai.chu || '');
        } else if (lenhNgoai.viec === 'chon-ds' && typeof lenhNgoai.y === 'number') {
            /* Điện thoại bấm Đ/S cho từng ý của cụm Đúng/Sai (trò chơi cần) */
            if (!showAnswer) setChonCum(c => ({ ...c, [lenhNgoai.y as number]: !!lenhNgoai.dung }));
        } else if (lenhNgoai.viec === 'lam-lai') {
            setBuoc(0); setSelectedIdx(null); setChonCum({}); setChuNhap('');
            setDaSai([]); setSaiNgan([]); setKetQuaCham(null); setNhacChon(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lenhNgoai]);

    /* Lời giải: câu do AI soạn để ở `answer`, câu lấy từ ngân hàng để ở `sampleAnswer`.
       Phải đọc cả hai - đo trên đề thật thì hai bên gần như không trùng nhau. */
    /* Đọc CẢ `explanation`: đo 01/09/2026 có 18 câu trong bài giảng cất lời giải ở đúng
       trường đó, mà bản cũ chỉ nhìn `answer`/`sampleAnswer` nên nút "Xem lời giải" không
       hiện - bấm xong đáp án là nhảy thẳng sang "Làm lại". Ô soạn thảo vốn đã đọc cả ba
       trường này rồi, chỉ màn chiếu là bỏ sót. */
    const loiGiai: string = String(quizData?.answer || quizData?.sampleAnswer || quizData?.explanation || '').trim();
    const coLoiGiai = !!loiGiai || !!quizData?.phuong_phap_giai
        || (Array.isArray(quizData?.cac_buoc_thuc_hien) && quizData.cac_buoc_thuc_hien.length > 0);

    /** Một nút đi hết ba bước; hết bước thì vòng về đề và xoá lựa chọn cũ. */
    const doiBuoc = () => setBuoc(b => {
        if (b === 0) return 1;
        if (b === 1 && coLoiGiai) return 2;
        setSelectedIdx(null); setChonCum({});
        return 0;
    });

    useEffect(() => {
        onDoi?.({ hienDapAn: showAnswer, dangChon: selectedIdx, buoc, loiGiai, chonCum, chuNhap, lanCham, ketQuaCham, daSai });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAnswer, selectedIdx, buoc, loiGiai, chonCum, chuNhap, lanCham, ketQuaCham, daSai]);

    if (!quizData) return null;

    /* Chấm kín mà vừa sai: dải đỏ nhắc, đáp án vẫn giấu. */
    const daiSai = chamKin && !showAnswer && ketQuaCham === 'sai' && (
        <div className="mb-5 rounded-2xl border-[3px] border-rose-300 bg-rose-50 px-7 py-3 text-[28px] font-bold text-rose-700 flex items-center gap-4">
            <span className="text-[34px]">✗</span>
            <span>Sai rồi — đáp án chưa lộ, {type === 'multiple_choice' || type === 'true_false' ? 'phương án đó đã khoá, ' : ''}bạn tiếp theo trả lời tiếp.</span>
        </div>
    );
    const nhacChuaChon = nhacChon && (
        <div className="mb-5 rounded-2xl border-[3px] border-amber-300 bg-amber-50 px-7 py-3 text-[28px] font-bold text-amber-800">
            Chưa có câu trả lời — chọn đáp án (hoặc bấm "Bó tay") rồi mới chấm.
        </div>
    );

    /*
     * VỊ TRÍ ẢNH - đọc đúng cái thầy cô chọn trong trang soạn bài (Dưới đề / Bên phải /
     * Bên trái), giống hệt trang làm bài của học sinh.
     *
     * Trước đây màn chiếu không hề biết tới viTriAnh: ảnh cứ nằm giữa dòng, phương án
     * trải hết bề ngang bên dưới, nên bảng biến thiên và bốn phương án phải nhìn hai
     * lượt. Nay ảnh sang một bên thì ĐỀ và MỌI KIỂU PHƯƠNG ÁN cùng dồn sang bên kia.
     *
     * Chỉ xếp cạnh nhau khi câu có ĐÚNG MỘT ảnh - nhiều ảnh thì chia cột là vỡ bố cục.
     */
    /*
     * Ảnh đặt ở trường `imageUrl` (mọi bộ dựng khối quiz - tự luyện, đề ôn tập, trang soạn
     * bài - đều ghi vào đây, và trang học sinh cũng đọc trường này) thì GHÉP VÀO ĐỀ như
     * một ảnh markdown, để đi chung đường xếp cạnh bên dưới. Trước đây màn chiếu chỉ đọc
     * `img_url` - một tên không bộ dựng nào ghi - nên câu "cho ở bảng sau" hiện ra không có
     * bảng nào cả; học sinh nhìn bốn mệnh đề mà không có số liệu để xét (bắt được 12/9/2026).
     */
    const anhRieng = String(quizData.imageUrl || quizData.img_url || '').trim();
    const deGocTho = xuongDongNgoaiCongThuc(String(quizData.question || ''));
    const deGoc = anhRieng && !deGocTho.includes(anhRieng)
        ? `${deGocTho}\n\n![Hình ảnh](${anhRieng})`
        : deGocTho;
    const anhTrongDe = (deGoc.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)/) || [])[1];
    const soAnhTrongDe = (deGoc.match(/!\[[^\]]*\]\(/g) || []).length;
    /*
     * ẢNH RỘNG THÌ XUỐNG DƯỚI, KHÔNG XẾP CẠNH.
     *
     * Bảng tần số cắt từ sách phần lớn là dải ngang: đo 112 ảnh trong chương 3 Toán 12 thì
     * hơn 80 tấm rộng 700–1500 px mà cao chỉ 60–190 px. Nhét dải ấy vào cột 38% bên phải thì
     * chữ trong bảng còn cao chừng 10 px trên màn chiếu - "ảnh nhỏ như con kiến" thầy bắt
     * được 12/9/2026. Ảnh có tỉ lệ rộng/cao trên 2,5 thì tự động đặt dưới đề, trải hết bề
     * ngang; chỉ ảnh gần vuông (đồ thị, hình vẽ) mới xếp cạnh. Thầy cô chọn tay "Dưới đề"
     * trong trang soạn bài thì vẫn được tôn trọng như trước.
     */
    const viTriAnh = quizData.viTriAnh || (anhRong ? 'duoi' : 'phai');
    const canhNhau = viTriAnh !== 'duoi' && !!anhTrongDe && soAnhTrongDe === 1;
    const deKhongAnh = canhNhau
        ? deGoc.replace(/!\[[^\]]*\]\([^)\s]+[^)]*\)/, '').trim()
        : deGoc;
    const doTiLeAnh = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const im = e.currentTarget;
        if (im.naturalHeight > 0 && im.naturalWidth / im.naturalHeight > 2.5) setAnhRong(true);
    };
    /* Ảnh nằm trong đề (dưới đề): trải hết bề ngang cột đề thay vì cỡ gốc - ảnh 800 px trên
       slide 1900 px vẫn là nhỏ. */
    const thanhPhanDe = {
        img: ({ src, alt }: any) => (
            <img src={src} alt={alt || 'Hình ảnh'} onLoad={doTiLeAnh}
                 className="block mx-auto my-4 w-full max-w-[1200px] h-auto rounded-2xl border border-slate-200 bg-white shadow-sm" />
        ),
    };

    return (
        <div className="w-full flex flex-col">
            {/* Ghi ĐÚNG SỐ CÂU như trong đề. Trước đây câu nào cũng đề "Câu hỏi tương tác"
                nên chữa bài không biết đang ở câu nào, học sinh dò trên tờ đề cũng chịu. */}
            <div className="flex items-baseline gap-4 mb-7">
                <span className="text-[42px] leading-none self-center">🎯</span>
                <h3 className="text-[42px] font-black text-indigo-800 tracking-tight m-0">
                    {soCau ? `Câu ${soCau}` : 'Câu hỏi tương tác'}
                </h3>
                {!!soCau && !!tongCau && (
                    <span className="text-[26px] font-bold text-slate-400">/ {tongCau} câu</span>
                )}
            </div>

            {daiSai}
            {nhacChuaChon}

            {/* Ảnh sang một bên thì CẢ đề lẫn phương án cùng dồn sang bên kia - đúng cách
                trang làm bài của học sinh đang làm, để mắt chỉ nhìn một lượt. */}
            <div className={canhNhau
                ? `flex gap-10 items-start ${viTriAnh === 'trai' ? 'flex-row-reverse' : ''}`
                : 'contents'}>
            <div className={canhNhau ? 'flex-1 min-w-0' : 'contents'}>
            {/* Bảng LaTeX (\begin{array}) 6-7 cột: KaTeX phóng chữ 1,21em nên bảng rộng 2100px ở cỡ
                42px, khung đề chỉ 1430px -> cắt mất cột cuối. Thu chữ trong bảng còn 0,75em (≈31px
                trước khi slide tự co, đo trên bảng 7 cột thì còn dư 8% bề ngang; vẫn đọc được từ
                cuối lớp). Không cho cuộn ngang: overflow-x:auto kéo theo thanh cuộn dọc vì KaTeX
                xếp bảng bằng vlist có lề âm.
                Nhắm vào .katex chứ không phải .katex-display: "$$…$$" viết trên một dòng được
                remark-math coi là công thức nội dòng, không sinh .katex-display.
                Luật nằm ở globals.css (.de-trinh-chieu) vì Tailwind 4 không sinh lớp cho biến thể
                tuỳ ý có :has() - đã thử `[&_.katex:has(.mtable)]:text-[0.75em]`, lên bản dựng
                không có luật nào. */}
            <div className={`de-trinh-chieu text-[42px] leading-[1.5] font-semibold text-slate-900 mb-8 ${KATEX_CLASS}`}>
                <ReactMarkdown urlTransform={chuyenDiaChiAnh} components={thanhPhanDe} remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                    {deKhongAnh}
                </ReactMarkdown>
            </div>

            {type === 'true_false' && (
                <div className="flex gap-6 items-stretch w-full max-w-[1100px] mx-auto">
                    {[0, 1].map((optIdx) => {
                        const isCorrect = optIdx === quizData.answerIndex;
                        const isSelected = optIdx === selectedIdx;
                        const text = (quizData.options && quizData.options[optIdx]) ? quizData.options[optIdx] : (optIdx === 0 ? 'ĐÚNG' : 'SAI');

                        const biKhoa = daSai.includes(optIdx);
                        let cls = 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40';
                        if (showAnswer && isCorrect) cls = 'border-emerald-500 bg-emerald-50';
                        else if (showAnswer && (isSelected || biKhoa)) cls = 'border-red-400 bg-red-50';
                        else if (showAnswer) cls = 'border-slate-200 bg-white opacity-45';
                        else if (biKhoa) cls = 'border-red-400 bg-red-50 opacity-60 line-through cursor-not-allowed';
                        else if (isSelected) cls = 'border-indigo-500 bg-indigo-50';

                        return (
                            <button
                                key={optIdx}
                                disabled={showAnswer || biKhoa || khoa}
                                onClick={() => !khoa && setSelectedIdx(optIdx)}
                                className={`flex-1 rounded-2xl border-[3px] px-8 py-6 transition-all duration-200 ${cls}`}
                            >
                                <div className={`text-[42px] font-black uppercase text-slate-800 ${KATEX_CLASS}`}>
                                    <ReactMarkdown urlTransform={chuyenDiaChiAnh} remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
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

                        const biKhoa = daSai.includes(idx);
                        if (showAnswer) {
                            if (isCorrect) { cardCls = 'border-emerald-500 bg-emerald-50'; badgeCls = 'bg-emerald-500 text-white'; }
                            else if (isSelected || biKhoa) { cardCls = 'border-red-400 bg-red-50'; badgeCls = 'bg-red-500 text-white'; }
                            else { cardCls = 'border-slate-200 bg-white opacity-45'; }
                        } else if (biKhoa) {
                            /* Chấm kín: phương án đã chọn sai — tô đỏ, khoá, nhưng đáp án đúng vẫn giấu */
                            cardCls = 'border-red-400 bg-red-50 opacity-70 cursor-not-allowed'; badgeCls = 'bg-red-500 text-white';
                        } else if (isSelected) {
                            cardCls = 'border-indigo-500 bg-indigo-50'; badgeCls = 'bg-indigo-500 text-white';
                        }

                        return (
                            <button
                                key={idx}
                                disabled={biKhoa || khoa}
                                onClick={() => !showAnswer && !biKhoa && !khoa && setSelectedIdx(idx)}
                                className={`w-full text-left rounded-2xl border-[3px] px-6 py-5 flex items-start gap-5 transition-all duration-200 ${cardCls}`}
                            >
                                <div className={`w-[62px] h-[62px] rounded-full flex items-center justify-center text-[34px] font-black shrink-0 transition-colors ${badgeCls}`}>
                                    {biKhoa && !showAnswer ? '✗' : String.fromCharCode(65 + idx)}
                                </div>
                                <div className={`flex-1 min-w-0 text-[38px] leading-[1.45] text-slate-800 ${KATEX_CLASS}`}>
                                    <ReactMarkdown urlTransform={chuyenDiaChiAnh} remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                        {String(opt).replace(/^(\s*\d+)\.(?=\s|$)/, '$1\\.')}
                                    </ReactMarkdown>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* CỤM MỆNH ĐỀ ĐÚNG/SAI - 263 câu trong đề của Thầy, trước đây bấm hiện đáp
                án không ra gì vì không có nhánh nào vẽ kiểu này. */}
            {type === 'true_false_cluster' && (
                <div className="w-full flex flex-col gap-4">
                    {(quizData.options || []).map((menh: any, i: number) => {
                        const dung = !!menh?.isTrue;
                        const thayChon = chonCum[i];
                        const daChon = thayChon !== undefined;
                        let cls = 'border-slate-200 bg-white';
                        if (showAnswer) cls = dung ? 'border-emerald-500 bg-emerald-50' : 'border-red-300 bg-red-50/60';
                        else if (daChon) cls = 'border-indigo-500 bg-indigo-50';
                        return (
                            <div key={i} className={`rounded-2xl border-[3px] px-7 py-5 flex items-center gap-6 ${cls}`}>
                                <span className="shrink-0 w-[54px] h-[54px] rounded-xl bg-slate-100 text-slate-600
                                                 text-[30px] font-black flex items-center justify-center uppercase">
                                    {menh?.id || String.fromCharCode(97 + i)}
                                </span>
                                <div className={`flex-1 min-w-0 text-[34px] leading-[1.45] font-semibold text-slate-900 ${KATEX_CLASS}`}>
                                    <ReactMarkdown urlTransform={chuyenDiaChiAnh} remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                        {ensureMathDelimiters(String(menh?.content ?? menh ?? ''))}
                                    </ReactMarkdown>
                                </div>
                                {showAnswer ? (
                                    <span className={`shrink-0 px-6 py-2 rounded-xl text-[30px] font-black ${
                                        dung ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
                                        {dung ? 'ĐÚNG' : 'SAI'}
                                    </span>
                                ) : (
                                    <div className="shrink-0 flex gap-2">
                                        {[true, false].map(v => (
                                            <button key={String(v)}
                                                    disabled={khoa}
                                                    onClick={() => !khoa && setChonCum(c => ({ ...c, [i]: v }))}
                                                    className={`w-[62px] h-[54px] rounded-xl text-[28px] font-black border-[3px] transition-colors ${
                                                      thayChon === v
                                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                                        : 'bg-white border-slate-300 text-slate-500 hover:border-indigo-400'}`}>
                                                {v ? 'Đ' : 'S'}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* TỰ LUẬN - 190 câu. Không tự chấm được, nên chỉ bày bài giải mẫu rồi Thầy
                gọi em lên và cộng điểm bằng tay. */}
            {type === 'essay' && showAnswer && (
                <div className="w-full rounded-2xl border-[3px] border-emerald-500 bg-emerald-50/60 px-8 py-6">
                    <h4 className="text-[30px] font-black text-emerald-700 mb-3 uppercase tracking-wider">Bài giải mẫu</h4>
                    <div className={`text-[34px] leading-[1.5] font-medium text-slate-900 ${KATEX_CLASS}`}>
                        <ReactMarkdown urlTransform={chuyenDiaChiAnh} remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                            {ensureMathDelimiters(loiGiai || '(Đề này chưa có bài giải mẫu)')}
                        </ReactMarkdown>
                    </div>
                </div>
            )}

            {type === 'short_answer' && (
                <div className="w-full">
                    {!showAnswer ? (
                        <div className="flex flex-col gap-3">
                            {saiNgan.length > 0 && (
                                <div className="text-[28px] font-bold text-rose-700">
                                    Đã trả lời sai: {saiNgan.map((x, i) => <span key={i} className="inline-block mx-1 px-3 py-0.5 rounded-lg bg-rose-50 border border-rose-300 line-through">{x}</span>)}
                                </div>
                            )}
                            <label className="text-[34px] font-semibold text-slate-600">Học sinh trả lời:</label>
                            <input
                                type="text"
                                value={chuNhap}
                                disabled={khoa}
                                onChange={e => setChuNhap(e.target.value)}
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
                                <ReactMarkdown urlTransform={chuyenDiaChiAnh} remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                    {ensureMathDelimiters(quizData.exactAnswer || quizData.correctAnswer || quizData.answerText)}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            )}

            </div>

            {/* Cột hình. Chỉ có khi thầy cô để ảnh sang bên. */}
            {canhNhau && (
               <div className="w-[38%] shrink-0">
                  <img src={anhTrongDe} alt="Hình minh họa" onLoad={doTiLeAnh}
                       className="w-full h-auto rounded-2xl border border-slate-200 bg-white shadow-sm"
                       style={{ objectFit: 'contain' }} />
               </div>
            )}
            </div>

            {/* LỜI GIẢI CHI TIẾT - có sẵn trong đề từ lâu mà trình chiếu chưa bao giờ
                đọc tới. Bước này mới là lúc chữa bài thật sự. Tự luận đã bày bài giải mẫu
                ở trên rồi nên không lặp lại. */}
            {buoc === 2 && (
                <div className="mt-7 w-full rounded-2xl border-[3px] border-indigo-200 bg-indigo-50/40 px-8 py-6
                                max-h-[430px] overflow-y-auto">
                    <h4 className="text-[30px] font-black text-indigo-700 mb-3 uppercase tracking-wider">Lời giải chi tiết</h4>

                    {quizData.phuong_phap_giai && (
                        <div className={`hop-giai text-[31px] leading-[1.5] text-slate-800 mb-3 ${KATEX_CLASS}`}>
                            <b className="text-indigo-700">Phương pháp: </b>
                            <ReactMarkdown urlTransform={chuyenDiaChiAnh} remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                {ensureMathDelimiters(String(quizData.phuong_phap_giai))}
                            </ReactMarkdown>
                        </div>
                    )}

                    {type !== 'essay' && loiGiai && (
                        /* hop-giai: thu khoảng cách giữa các ý và đánh dấu ▸ đầu mỗi ý -
                           xem globals.css. Dòng chỉ có công thức thì không đánh dấu. */
                        <div className={`hop-giai text-[32px] leading-[1.5] text-slate-900 ${KATEX_CLASS}`}>
                            <ReactMarkdown urlTransform={chuyenDiaChiAnh} remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                {ensureMathDelimiters(loiGiai)}
                            </ReactMarkdown>
                        </div>
                    )}

                    {Array.isArray(quizData.cac_buoc_thuc_hien) && quizData.cac_buoc_thuc_hien.length > 0 && (
                        <ol className="mt-4 space-y-2.5">
                            {quizData.cac_buoc_thuc_hien.map((b: string, i: number) => (
                                <li key={i} className="flex gap-4">
                                    <span className="shrink-0 w-[42px] h-[42px] rounded-full bg-indigo-600 text-white
                                                     text-[24px] font-black flex items-center justify-center mt-1">{i + 1}</span>
                                    <div className={`flex-1 text-[31px] leading-[1.45] text-slate-800 ${KATEX_CLASS}`}>
                                        <ReactMarkdown urlTransform={chuyenDiaChiAnh} remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                            {ensureMathDelimiters(String(b))}
                                        </ReactMarkdown>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}

                    {quizData.goi_y_nhanh && (
                        <div className="mt-4 px-5 py-3 rounded-xl bg-amber-50 border-l-[6px] border-amber-400
                                        text-[29px] leading-[1.45] text-amber-900">
                            <b>Mẹo: </b>{String(quizData.goi_y_nhanh)}
                        </div>
                    )}
                </div>
            )}

            <div className="mt-8 flex justify-center items-center gap-4">
                {/* Chấm kín + tự luận + bước đề: không có nút — trò chơi chấm Đúng/Sai bằng nút riêng,
                    lật bài giải mẫu sau khi chấm. */}
                {/* Khoá: chỉ còn 'Xem lời giải' (bước 1 có lời giải); không Chấm, không Làm lại — trò chơi tự đi tiếp. */}
                {!(chamKin && type === 'essay' && buoc === 0) && !(khoa && !(buoc === 1 && coLoiGiai)) && (
                <button
                    onClick={chamKin && buoc === 0 ? cham : doiBuoc}
                    className={`${chamKin && buoc === 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}
                               text-white px-10 py-4 rounded-full text-[32px] font-bold
                               shadow-lg transition-all duration-200 hover:-translate-y-0.5`}
                    title={chamKin && buoc === 0 ? 'Chấm — đúng mới lật đáp án, sai thì khoá phương án đó' : undefined}
                >
                    {buoc === 0 ? (chamKin ? '✓ Chấm' : 'Hiển thị đáp án') : buoc === 1 && coLoiGiai ? 'Xem lời giải' : 'Làm lại'}
                </button>
                )}

                {/* Gọi tên ngay tại câu - trước phải với xuống thanh dưới cùng màn hình */}
                {onGoiTen && (
                    <button onClick={onGoiTen} title="Gọi tên & cộng điểm cho câu này (phím G)"
                            className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-4 rounded-full text-[32px]
                                       font-bold shadow-lg transition-all duration-200 hover:-translate-y-0.5
                                       flex items-center gap-3">
                        <Dices className="w-[34px] h-[34px]" /> Gọi tên
                    </button>
                )}
            </div>
        </div>
    );
}

