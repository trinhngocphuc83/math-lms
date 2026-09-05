"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, HelpCircle, Search } from "lucide-react";
import { NOI_DUNG_HUONG_DAN } from "@/utils/noiDungHuongDan";

/**
 * Bảng tra lệnh cho trình soạn bài.
 *
 * Nội dung lấy từ docs/huong-dan-soan-bai.md (dựng sang noiDungHuongDan.ts) để hướng dẫn
 * đọc ngoài app và hướng dẫn trong app không bao giờ lệch nhau.
 *
 * KIỂU DÁNG PHẢI TỰ VIẾT: dự án KHÔNG cài @tailwindcss/typography, nên mọi lớp `prose-*`
 * đều vô tác dụng - bảng ra trần trụi không viền, tiêu đề không to hơn chữ thường. Vì vậy
 * mỗi thẻ đều được gán lớp tường minh qua `components` bên dưới.
 */

interface Muc {
  ten: string;
  than: string;
}

/** Cắt bài hướng dẫn thành phần mở đầu + từng mục `##`. */
function cheMuc(chu: string): { moDau: string; muc: Muc[] } {
  const phan = chu.split(/\n(?=## )/);
  const moDau = /^## /.test(phan[0]) ? '' : phan.shift() || '';
  const muc = phan.map((p) => {
    const dong = p.split('\n');
    return {
      ten: dong[0].replace(/^##\s*/, '').trim(),
      than: dong.slice(1).join('\n').trim(),
    };
  });
  return { moDau: moDau.replace(/\n-{3,}\s*$/, '').trim(), muc };
}

/** Bỏ số thứ tự đầu tên mục - số đã hiện riêng trong viên tròn. */
const boSo = (ten: string) => ten.replace(/^\d+\.\s*/, '');

const THE = {
  p: (p: any) => <p className="text-[13.5px] leading-relaxed text-slate-600 my-2.5" {...p} />,

  h3: (p: any) => (
    <h3 className="text-[13px] font-black text-slate-700 uppercase tracking-wider mt-6 mb-2.5
                   flex items-center gap-2 before:content-[''] before:w-1 before:h-3.5
                   before:bg-teal-500 before:rounded-full" {...p} />
  ),

  strong: (p: any) => <strong className="font-bold text-slate-800" {...p} />,
  em: (p: any) => <em className="italic text-slate-500" {...p} />,

  code: (p: any) => (
    <code className="font-mono text-[12px] bg-slate-100 text-teal-800 border border-slate-200
                     rounded px-1.5 py-[1px] whitespace-nowrap" {...p} />
  ),

  pre: (p: any) => (
    <pre className="bg-slate-800 text-slate-100 rounded-xl p-3.5 my-3 overflow-x-auto
                    text-[12px] leading-relaxed [&_code]:bg-transparent [&_code]:border-0
                    [&_code]:text-slate-100 [&_code]:p-0" {...p} />
  ),

  ul: (p: any) => <ul className="my-2.5 space-y-1.5" {...p} />,
  ol: (p: any) => <ol className="my-2.5 space-y-1.5 list-decimal pl-5 marker:text-teal-600 marker:font-bold" {...p} />,
  li: (p: any) => (
    <li className="text-[13.5px] leading-relaxed text-slate-600 [ul>&]:relative [ul>&]:pl-4
                   [ul>&]:before:content-[''] [ul>&]:before:absolute [ul>&]:before:left-0
                   [ul>&]:before:top-[0.55em] [ul>&]:before:w-1.5 [ul>&]:before:h-1.5
                   [ul>&]:before:rounded-full [ul>&]:before:bg-teal-400" {...p} />
  ),

  blockquote: (p: any) => (
    <blockquote className="border-l-[3px] border-amber-400 bg-amber-50/70 rounded-r-lg
                           px-3.5 py-2 my-3 [&_p]:my-0 [&_p]:text-amber-900" {...p} />
  ),

  /* Bảng là phần chính của bài hướng dẫn nên chăm kỹ nhất. */
  table: (p: any) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full border-collapse text-left" {...p} />
    </div>
  ),
  thead: (p: any) => <thead className="bg-slate-50" {...p} />,
  th: (p: any) => (
    <th className="text-[11px] font-black text-slate-500 uppercase tracking-wider
                   px-3.5 py-2.5 border-b border-slate-200 whitespace-nowrap" {...p} />
  ),
  tbody: (p: any) => <tbody className="divide-y divide-slate-100" {...p} />,
  tr: (p: any) => <tr className="even:bg-slate-50/40 hover:bg-teal-50/40 transition-colors" {...p} />,
  td: (p: any) => (
    <td className="px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-600 align-top
                   first:font-semibold first:text-slate-800 first:whitespace-nowrap" {...p} />
  ),

  /* Dấu --- trong tệp gốc chỉ để ngăn mục; mục đã có tiêu đề riêng nên không vẽ lại. */
  hr: () => <div className="h-1" />,
  a: (p: any) => <a className="text-teal-700 font-semibold underline underline-offset-2" {...p} />,
};

export default function HuongDanSoanBaiModal({
  isOpen, onClose, noiDung, tieuDe, phuDe, goiYTim, mau,
}: {
  isOpen: boolean;
  onClose: () => void;
  /* Bốn tham số dưới đây để hộp này dùng chung được cho nhiều bài hướng dẫn - hiện có bài
     cho thầy cô và bài cho học sinh. Bỏ trống thì ra đúng bài soạn bài như trước. */
  noiDung?: string;
  tieuDe?: string;
  phuDe?: string;
  goiYTim?: string;
  /* Lớp nền của dải đầu hộp, để mỗi bài một màu cho dễ phân biệt. */
  mau?: string;
}) {
  const [tim, setTim] = React.useState('');
  const thanRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setTim('');
    const phim = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', phim);
    return () => document.removeEventListener('keydown', phim);
  }, [isOpen, onClose]);

  const { moDau, muc } = React.useMemo(
    () => cheMuc(noiDung ?? NOI_DUNG_HUONG_DAN), [noiDung]);

  /* Lọc theo từ khoá: giữ nguyên cả mục nào có chứa từ đó. */
  const hienThi = React.useMemo(() => {
    const t = tim.trim().toLowerCase();
    if (!t) return muc;
    return muc.filter(m => (m.ten + '\n' + m.than).toLowerCase().includes(t));
  }, [tim, muc]);

  if (!isOpen) return null;

  const nhay = (i: number) => {
    thanRef.current?.querySelector(`#huong-dan-muc-${i}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="fixed inset-0 z-[95] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="bg-white w-full sm:max-w-[920px] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Đầu hộp */}
        <div className={`shrink-0 px-5 py-3.5 flex items-center gap-3 ${
          mau || 'bg-gradient-to-r from-teal-600 to-teal-500'}`}>
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <HelpCircle className="w-[18px] h-[18px] text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-black text-white leading-tight">
              {tieuDe || 'Hướng dẫn sử dụng'}
            </h2>
            <p className="text-[11.5px] text-white/90 leading-tight hidden sm:block">
              {phuDe || 'Soạn bài · Sổ tay · Gọi tên · Điểm thưởng · Vinh danh · Điện thoại'}
            </p>
          </div>
          <div className="relative ml-auto w-[150px] sm:w-[230px] shrink-0">
            <Search className="w-3.5 h-3.5 text-white/70 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={tim} onChange={e => setTim(e.target.value)}
              placeholder={goiYTim || 'Tìm: ảnh, Tab, AI…'}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-white/15 border border-white/25
                         text-[12.5px] text-white placeholder:text-white/60 outline-none
                         focus:bg-white/25 focus:border-white/50 transition-colors"
            />
          </div>
          <button onClick={onClose} title="Đóng (Esc)"
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg shrink-0 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hàng nhảy nhanh tới từng mục */}
        {!tim && (
          <div className="shrink-0 flex gap-1.5 overflow-x-auto px-5 py-2 bg-slate-50 border-b border-slate-200
                          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {muc.map((m, i) => (
              <button key={i} onClick={() => nhay(i)}
                      className="shrink-0 px-2.5 py-1 rounded-full text-[11.5px] font-bold
                                 bg-white border border-slate-200 text-slate-600
                                 hover:border-teal-400 hover:text-teal-700 transition-colors">
                {boSo(m.ten)}
              </button>
            ))}
          </div>
        )}

        <div ref={thanRef} className="px-5 py-4 overflow-y-auto flex-1 min-h-0 scroll-smooth">
          {/* Câu mở đầu */}
          {!tim && moDau && (
            <div className="text-[13.5px] leading-relaxed text-slate-500 bg-slate-50
                            border border-slate-200 rounded-xl px-4 py-3 mb-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ ...THE, p: (p: any) => <p className="my-0" {...p} /> }}>
                {moDau}
              </ReactMarkdown>
            </div>
          )}

          {hienThi.length === 0 ? (
            <p className="text-[13.5px] text-slate-500 py-12 text-center">
              Không có mục nào chứa “{tim}”. Thử từ khác, hoặc xoá ô tìm để xem toàn bộ.
            </p>
          ) : hienThi.map((m) => {
            const i = muc.indexOf(m);
            return (
              <section key={i} id={`huong-dan-muc-${i}`} className="mb-7 scroll-mt-2">
                <h2 className="flex items-center gap-2.5 mb-3 pb-2 border-b-2 border-slate-100">
                  <span className="w-6 h-6 rounded-lg bg-teal-600 text-white text-[12px]
                                   font-black flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-[15px] font-black text-slate-800">{boSo(m.ten)}</span>
                </h2>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={THE}>{m.than}</ReactMarkdown>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
