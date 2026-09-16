"use client";

import React, { Suspense } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpenText, GraduationCap, Search, Users, X } from "lucide-react";
import { NOI_DUNG_HUONG_DAN } from "@/utils/noiDungHuongDan";
import { NOI_DUNG_HUONG_DAN_HOC_SINH } from "@/utils/noiDungHuongDanHocSinh";
import { THE, boSo, cheMuc } from "@/components/admin/HuongDanSoanBaiModal";

/**
 * Cẩm nang hướng dẫn mở toàn màn - mục "Cẩm nang hướng dẫn" trên thanh bên và thẻ ở Dashboard.
 *
 * Trước đây cẩm nang chỉ nằm sau nút ❓ ở trang soạn bài / lớp học / màn chiếu, nên thầy
 * cô mới không biết có nó, mà đọc trong hộp nhỏ cũng khó theo dõi bài dài 16 mục. Trang này
 * dùng LẠI bộ cắt mục và bộ kiểu dáng của hộp ❓ (cheMuc, THE) - nội dung đọc ở đâu cũng
 * giống nhau, sửa tệp .md là cả hai nơi đổi.
 *
 * Hai bài: cho thầy cô (soạn bài, đứng lớp, trò chơi) và cho học sinh - thầy xem bài học
 * sinh để biết các em đang được chỉ gì, đỡ phải đăng nhập tài khoản học sinh.
 *
 * Địa chỉ nhớ được: ?bai=hoc-sinh chọn bài, ?muc=16 mở thẳng một mục.
 */

const BAI = {
  'thay-co': {
    ten: 'Cho thầy cô',
    mota: 'Soạn bài · Sổ tay · Gọi tên · Điểm thưởng · Điện thoại · Trò chơi trên lớp',
    noiDung: NOI_DUNG_HUONG_DAN,
    goiYTim: 'Tìm: ảnh, Tab, AI, trò chơi…',
    Icon: GraduationCap,
  },
  'hoc-sinh': {
    ten: 'Cho học sinh',
    mota: 'Học bài · Thi online · Điểm thưởng · Sổ tay · Cài vào điện thoại',
    noiDung: NOI_DUNG_HUONG_DAN_HOC_SINH,
    goiYTim: 'Tìm: thi, điểm cộng, tự luận…',
    Icon: Users,
  },
} as const;
type MaBai = keyof typeof BAI;

function TrangHuongDan() {
  const router = useRouter();
  const sp = useSearchParams();
  const maBai: MaBai = sp.get('bai') === 'hoc-sinh' ? 'hoc-sinh' : 'thay-co';
  const bai = BAI[maBai];

  const [tim, setTim] = React.useState('');
  const [mucDangXem, setMucDangXem] = React.useState(0);
  const thanRef = React.useRef<HTMLDivElement>(null);

  const { moDau, muc } = React.useMemo(() => cheMuc(bai.noiDung), [bai.noiDung]);

  const hienThi = React.useMemo(() => {
    const t = tim.trim().toLowerCase();
    if (!t) return muc;
    return muc.filter(m => (m.ten + '\n' + m.than).toLowerCase().includes(t));
  }, [tim, muc]);

  /* Cuộn TỨC THỜI, không 'smooth': khung cuộn là <main> của khu quản trị, đo trên Vercel
     thấy scrollIntoView({behavior:'smooth'}) trong khung ấy đứng im ở scrollTop 98 - bản
     tức thời thì tới đúng chỗ. */
  const nhay = React.useCallback((i: number) => {
    document.getElementById(`cam-nang-muc-${i}`)?.scrollIntoView({ block: 'start' });
    setMucDangXem(i);
  }, []);

  /* ?muc=16 -> cuộn tới mục 16 sau khi dựng xong; nhảy hai lần vì lần đầu bố cục có thể
     còn đổi (phông chữ, bảng rộng). */
  React.useEffect(() => {
    const m = Number(sp.get('muc'));
    if (!m || m < 1 || m > muc.length) return;
    const t1 = setTimeout(() => nhay(m - 1), 80);
    const t2 = setTimeout(() => nhay(m - 1), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [sp, muc.length, nhay]);

  /* Tô đậm mục đang đọc trên cột trái theo vị trí cuộn. */
  React.useEffect(() => {
    if (tim) return;
    const els = muc.map((_, i) => document.getElementById(`cam-nang-muc-${i}`)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const ob = new IntersectionObserver((entries) => {
      const thay = entries.filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (thay) setMucDangXem(Number(thay.target.id.replace('cam-nang-muc-', '')));
    }, { rootMargin: '-10% 0px -70% 0px' });
    els.forEach(el => ob.observe(el));
    return () => ob.disconnect();
  }, [muc, tim, maBai]);

  const doiBai = (ma: MaBai) => {
    setTim('');
    setMucDangXem(0);
    router.replace(ma === 'thay-co' ? '/admin/huong-dan' : `/admin/huong-dan?bai=${ma}`);
    /* Khung cuộn là <main> của khu quản trị chứ không phải window. */
    document.getElementById('cam-nang-dau')?.scrollIntoView({ block: 'start' });
  };

  return (
    <div className="max-w-[1180px] mx-auto">
      {/* Dải đầu trang */}
      <div id="cam-nang-dau" className="rounded-3xl bg-gradient-to-r from-teal-600 to-teal-500 text-white px-6 py-5 md:px-8 md:py-6 mb-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <BookOpenText className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-black leading-tight">Cẩm nang hướng dẫn</h1>
            <p className="text-[13px] text-teal-50/90 mt-0.5">{bai.mota}</p>
          </div>
          <div className="relative w-full sm:w-[260px]">
            <Search className="w-4 h-4 text-white/70 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={tim} onChange={e => setTim(e.target.value)}
              placeholder={bai.goiYTim}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/15 border border-white/25
                         text-[13px] text-white placeholder:text-white/60 outline-none
                         focus:bg-white/25 focus:border-white/50 transition-colors"
            />
            {tim && (
              <button onClick={() => setTim('')} title="Xoá ô tìm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-white/80 hover:bg-white/20">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Chọn bài */}
        <div className="flex gap-2 mt-4">
          {(Object.keys(BAI) as MaBai[]).map((ma) => {
            const b = BAI[ma];
            const dang = ma === maBai;
            return (
              <button key={ma} onClick={() => doiBai(ma)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[13px] font-bold transition-colors ${
                        dang ? 'bg-white text-teal-700 shadow-sm' : 'bg-white/15 text-white hover:bg-white/25'}`}>
                <b.Icon className="w-4 h-4" />
                {b.ten}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Cột mục lục - dính bên trái trên màn rộng */}
        {!tim && (
          <nav className="hidden lg:block w-[250px] shrink-0 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto
                          bg-white rounded-2xl border border-slate-200 p-3 [scrollbar-width:thin]">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-2 mb-2">Mục lục</p>
            {muc.map((m, i) => (
              <button key={i} onClick={() => nhay(i)}
                      className={`w-full text-left flex items-start gap-2 px-2 py-1.5 rounded-lg text-[12.5px] leading-snug transition-colors ${
                        mucDangXem === i
                          ? 'bg-teal-50 text-teal-800 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}>
                <span className={`w-5 h-5 rounded-md text-[11px] font-black flex items-center justify-center shrink-0 ${
                  mucDangXem === i ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {i + 1}
                </span>
                <span className="pt-px">{boSo(m.ten)}</span>
              </button>
            ))}
          </nav>
        )}

        {/* Thân bài */}
        <div ref={thanRef} className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 px-5 py-5 md:px-8 md:py-7">
          {/* Màn hẹp: hàng viên nhảy mục thay cho cột trái */}
          {!tim && (
            <div className="lg:hidden flex gap-1.5 flex-wrap mb-5">
              {muc.map((m, i) => (
                <button key={i} onClick={() => nhay(i)}
                        className="px-2.5 py-1 rounded-full text-[11.5px] font-bold bg-slate-50 border border-slate-200
                                   text-slate-600 hover:border-teal-400 hover:text-teal-700 transition-colors">
                  {i + 1}. {boSo(m.ten)}
                </button>
              ))}
            </div>
          )}

          {!tim && moDau && (
            <div className="text-[13.5px] leading-relaxed text-slate-500 bg-slate-50
                            border border-slate-200 rounded-xl px-4 py-3 mb-6">
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
              <section key={`${maBai}-${i}`} id={`cam-nang-muc-${i}`} className="mb-9 scroll-mt-4">
                <h2 className="flex items-center gap-2.5 mb-3 pb-2 border-b-2 border-slate-100">
                  <span className="w-7 h-7 rounded-lg bg-teal-600 text-white text-[13px]
                                   font-black flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-[17px] font-black text-slate-800">{boSo(m.ten)}</span>
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

export default function Page() {
  /* useSearchParams cần Suspense khi dựng tĩnh. */
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Đang mở cẩm nang…</div>}>
      <TrangHuongDan />
    </Suspense>
  );
}
