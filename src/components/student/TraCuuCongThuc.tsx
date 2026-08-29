"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { BookOpen, Search, X, Loader2, Mic, MicOff, ChevronLeft, Clock, Layers } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { timCongThuc, type CongThuc } from "@/utils/timCongThuc";
import { useNhanGiongNoi } from "@/hooks/useNhanGiongNoi";

/**
 * Tra cứu Sổ tay công thức ngay trong lúc làm bài.
 *
 * Học sinh đang làm mà quên công thức thì phải mở tab khác, thoát khỏi bài - vừa mất mạch
 * làm, vừa dễ mất bài đang làm dở. Hộp này nổi lên ngay trên trang: gõ (hoặc nói) vài chữ là
 * ra công thức, đóng lại là làm tiếp.
 *
 * Nạp MỘT LẦN rồi lọc tại máy: cả sổ tay chỉ vài trăm công thức, tải hết một lượt còn nhẹ
 * hơn gọi máy chủ theo từng chữ gõ, mà tìm lại tức thì.
 */

const KHOA_GAN_DAY = 'sotay-gan-day';
const SO_GAN_DAY = 6;

/** Đọc danh sách công thức vừa xem. Trình duyệt chặn localStorage thì coi như chưa có gì. */
const docGanDay = (): string[] => {
  try { return JSON.parse(localStorage.getItem(KHOA_GAN_DAY) || '[]'); } catch { return []; }
};

export default function TraCuuCongThuc({ grade, kieu = 'noi' }: { grade?: string; kieu?: 'noi' | 'nutNho' }) {
  const supabase = createClient();
  const [mo, setMo] = React.useState(false);
  const [dangTai, setDangTai] = React.useState(false);
  const [daTai, setDaTai] = React.useState(false);
  const [dsCongThuc, setDsCongThuc] = React.useState<CongThuc[]>([]);
  const [tenDanhMuc, setTenDanhMuc] = React.useState<Map<string, string>>(new Map());
  const [lopDanhMuc, setLopDanhMuc] = React.useState<Map<string, string>>(new Map());
  const [tuKhoa, setTuKhoa] = React.useState("");
  const [loi, setLoi] = React.useState("");
  /** Đang xem trọn một chương (bấm từ thẻ chương) - null là chưa chọn chương nào. */
  const [chuongDangXem, setChuongDangXem] = React.useState<string | null>(null);
  /** Học sinh chủ động xin xem cả sổ tay, không riêng lớp của mình. */
  const [xemCaSo, setXemCaSo] = React.useState(false);
  const [ganDay, setGanDay] = React.useState<string[]>([]);
  const oNhapRef = React.useRef<HTMLInputElement>(null);

  // Nói tới đâu điền tới đó, câu chốt rồi thì thôi - danh sách tự lọc theo mỗi lần điền
  const { hoTro: hoTroMic, dangNghe, loi: loiMic, batDauNghe } = useNhanGiongNoi(
    React.useCallback((chu: string) => setTuKhoa(chu), []),
  );

  // Chỉ nạp khi học sinh thật sự mở hộp - đang làm bài thì đừng tải thêm gì cho nặng
  React.useEffect(() => {
    if (!mo || daTai || dangTai) return;
    setDangTai(true);
    (async () => {
      try {
        const [ct, dm] = await Promise.all([
          supabase.from("formulas").select("id, title, latex_content, description, image_url, category_id"),
          supabase.from("formula_categories").select("id, name, grade"),
        ]);
        if (ct.error) throw ct.error;
        setDsCongThuc(ct.data || []);
        setTenDanhMuc(new Map((dm.data || []).map((c: any) => [c.id, c.name])));
        setLopDanhMuc(new Map((dm.data || []).map((c: any) => [c.id, String(c.grade ?? '')])));
        setDaTai(true);
      } catch (e: any) {
        setLoi(e?.message || "Không tải được sổ tay công thức.");
      } finally {
        setDangTai(false);
      }
    })();
  }, [mo, daTai, dangTai, supabase]);

  // Mở hộp thì đọc lại danh sách vừa xem, và trả hộp về trạng thái đầu.
  // Xoá luôn từ khoá cũ: mở lại mà còn nguyên kết quả lần trước thì che mất mục "Vừa xem" -
  // vốn là thứ phục vụ đúng nhu cầu "tra lại cái nãy giờ" mà không phải gõ lại.
  React.useEffect(() => {
    if (!mo) return;
    setGanDay(docGanDay());
    setChuongDangXem(null);
    setTuKhoa('');
  }, [mo]);

  // Đóng bằng phím Esc cho nhanh, khỏi phải rê chuột đi tìm nút
  React.useEffect(() => {
    if (!mo) return;
    const phim = (e: KeyboardEvent) => { if (e.key === "Escape") setMo(false); };
    document.addEventListener("keydown", phim);
    return () => document.removeEventListener("keydown", phim);
  }, [mo]);

  /**
   * Phạm vi tra cứu: ưu tiên đúng lớp của bài đang làm.
   *
   * Trước đây tham số `grade` được nhận vào rồi bỏ không dùng, nên học sinh lớp 12 phải lướt
   * qua cả công thức Toán 11 nằm lẫn trong danh sách.
   */
  const trongLop = React.useMemo(() => {
    if (!grade || xemCaSo) return dsCongThuc;
    const loc = dsCongThuc.filter(c => lopDanhMuc.get(c.category_id || '') === String(grade));
    // Lớp đó chưa có công thức nào thì đừng hiện hộp rỗng - thà cho xem cả sổ còn hơn
    return loc.length > 0 ? loc : dsCongThuc;
  }, [dsCongThuc, lopDanhMuc, grade, xemCaSo]);

  const soNgoaiLop = dsCongThuc.length - trongLop.length;

  /** Các chương có công thức, kèm số lượng - để duyệt khi chưa biết gõ gì. */
  const dsChuong = React.useMemo(() => {
    const dem = new Map<string, number>();
    for (const c of trongLop) {
      if (!c.category_id) continue;
      dem.set(c.category_id, (dem.get(c.category_id) || 0) + 1);
    }
    return [...dem.entries()]
      .map(([id, so]) => ({ id, ten: tenDanhMuc.get(id) || 'Khác', so }))
      .sort((a, b) => b.so - a.so);
  }, [trongLop, tenDanhMuc]);

  const dsGanDay = React.useMemo(
    () => ganDay.map(id => dsCongThuc.find(c => c.id === id)).filter(Boolean) as CongThuc[],
    [ganDay, dsCongThuc],
  );

  const ketQua = React.useMemo(() => {
    if (tuKhoa.trim()) return timCongThuc(tuKhoa, trongLop, tenDanhMuc);
    if (chuongDangXem) return trongLop.filter(c => c.category_id === chuongDangXem);
    return [];
  }, [tuKhoa, chuongDangXem, trongLop, tenDanhMuc]);

  /** Xem công thức nào thì nhớ lại, lần sau mở hộp là thấy ngay khỏi gõ lại. */
  const nhoDaXem = (id: string) => {
    try {
      const moi = [id, ...docGanDay().filter(x => x !== id)].slice(0, SO_GAN_DAY);
      localStorage.setItem(KHOA_GAN_DAY, JSON.stringify(moi));
      setGanDay(moi);
    } catch { /* trình duyệt chặn thì bỏ qua, không làm hỏng việc tra cứu */ }
  };

  const dangDuyet = !tuKhoa.trim() && !chuongDangXem;

  const TheCongThuc = ({ c }: { c: CongThuc }) => (
    <div
      onClick={() => nhoDaXem(c.id)}
      className="rounded-xl border border-gray-200 p-3 hover:border-indigo-300 transition-colors"
    >
      <div className="flex items-baseline gap-2 flex-wrap mb-1">
        <span className="font-bold text-[14px] text-gray-800">{c.title}</span>
        {c.category_id && tenDanhMuc.get(c.category_id) && (
          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold">
            {tenDanhMuc.get(c.category_id)}
          </span>
        )}
      </div>
      {c.latex_content && (
        <div className="prose prose-sm max-w-none overflow-x-auto text-gray-800">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {`$$${c.latex_content}$$`}
          </ReactMarkdown>
        </div>
      )}
      {c.image_url && (
        <img src={c.image_url} alt={c.title} className="max-h-[180px] w-auto rounded-lg border border-gray-100 mt-1" />
      )}
      {c.description && <p className="text-[12px] text-gray-500 mt-1">{c.description}</p>}
    </div>
  );

  return (
    <>
      {/*
        * Hai kiểu nút mở sổ tay.
        *
        * "nutNho" là kiểu mặc định dùng trong màn làm bài: nút nằm gọn trong thanh tiến độ.
        * Kiểu nổi cũ là viên thuốc 198x48 dán cứng ở góc trái dưới, đo trên máy thật thì nó
        * che mất nửa trái của phương án nằm cuối màn - học sinh không đọc được đáp án.
        */}
      {kieu === 'nutNho' ? (
        <button
          type="button"
          onClick={() => setMo(true)}
          title="Quên công thức thì bấm vào đây tra nhanh (không mất bài đang làm)"
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors print:hidden"
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden md:inline">Sổ tay</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setMo(true)}
          title="Quên công thức thì bấm vào đây tra nhanh (không mất bài đang làm)"
          className="fixed bottom-5 left-5 z-40 flex items-center gap-2 bg-white border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-50 font-black px-4 py-2.5 rounded-full shadow-lg transition-all print:hidden"
        >
          <BookOpen className="w-5 h-5" /> Sổ tay công thức
        </button>
      )}

      {mo && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-[720px] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[88vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">

            <div className="flex items-center gap-3 px-4 py-3 border-b border-indigo-100 bg-indigo-50 shrink-0 sm:rounded-t-2xl">
              <BookOpen className="w-5 h-5 text-indigo-600 shrink-0" />
              <h2 className="text-base font-black text-indigo-900">Sổ tay công thức</h2>
              <span className="text-[11px] font-bold text-indigo-400">
                {daTai ? `${trongLop.length} công thức` : ""}
              </span>
              <button onClick={() => setMo(false)} className="ml-auto p-2 text-indigo-600 hover:bg-indigo-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-gray-100 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={oNhapRef}
                  autoFocus
                  value={tuKhoa}
                  onChange={e => { setTuKhoa(e.target.value); setChuongDangXem(null); }}
                  placeholder={dangNghe ? "Đang nghe, em nói đi..." : "Gõ hoặc bấm micro để nói tên công thức..."}
                  className={`w-full border rounded-xl pl-9 py-2.5 text-sm outline-none transition-colors ${hoTroMic ? 'pr-20' : 'pr-9'} ${dangNghe ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200 focus:border-indigo-400'}`}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {tuKhoa && (
                    <button
                      type="button" onClick={() => { setTuKhoa(''); oNhapRef.current?.focus(); }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full" title="Xoá"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {/* Chỉ hiện khi trình duyệt thật sự làm được - không bày nút bấm vào chỗ chết */}
                  {hoTroMic && (
                    <button
                      type="button"
                      onClick={batDauNghe}
                      title={dangNghe ? "Đang nghe, bấm để dừng" : "Bấm rồi nói tên công thức"}
                      className={`p-1.5 rounded-full transition-colors ${dangNghe ? 'bg-red-500 text-white animate-pulse' : 'text-indigo-600 hover:bg-indigo-50'}`}
                    >
                      {dangNghe ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
              {loiMic && <p className="text-[12px] text-red-600 font-bold mt-1.5 px-1">{loiMic}</p>}

              {/* Lớp đang lọc - nói rõ đang giấu bao nhiêu, và cho xem lại được */}
              {grade && soNgoaiLop > 0 && !xemCaSo && (
                <p className="text-[11.5px] text-gray-500 mt-1.5 px-1">
                  Đang xem công thức lớp {grade}.{' '}
                  <button onClick={() => setXemCaSo(true)} className="font-bold text-indigo-600 hover:underline">
                    Xem cả sổ tay ({soNgoaiLop} công thức lớp khác)
                  </button>
                </p>
              )}
              {xemCaSo && grade && (
                <p className="text-[11.5px] text-gray-500 mt-1.5 px-1">
                  Đang xem cả sổ tay.{' '}
                  <button onClick={() => setXemCaSo(false)} className="font-bold text-indigo-600 hover:underline">
                    Chỉ xem lớp {grade}
                  </button>
                </p>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
              {dangTai && (
                <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" /> Đang mở sổ tay...
                </div>
              )}
              {loi && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">{loi}</div>}

              {/*
                * Chưa gõ gì thì DUYỆT, không đổ bừa 40 công thức đầu theo thứ tự cơ sở dữ
                * liệu như bản cũ - một lát cắt vô nghĩa. Học sinh không nhớ tên công thức vẫn
                * tìm được đường qua chương, hoặc lấy lại thứ vừa xem.
                */}
              {daTai && dangDuyet && (
                <>
                  {dsGanDay.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-wide mb-1.5">
                        <Clock className="w-3.5 h-3.5" /> Vừa xem
                      </div>
                      <div className="space-y-2">
                        {dsGanDay.map(c => <TheCongThuc key={c.id} c={c} />)}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-wide mb-1.5">
                    <Layers className="w-3.5 h-3.5" /> Chọn chương để xem
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dsChuong.map(ch => (
                      <button
                        key={ch.id}
                        onClick={() => setChuongDangXem(ch.id)}
                        className="text-left rounded-xl border border-gray-200 px-3 py-2.5 hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors"
                      >
                        <div className="font-bold text-[13px] text-gray-800 line-clamp-2">{ch.ten}</div>
                        <div className="text-[11px] font-bold text-indigo-500 mt-0.5">{ch.so} công thức</div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {chuongDangXem && !tuKhoa.trim() && (
                <button
                  onClick={() => setChuongDangXem(null)}
                  className="flex items-center gap-1 text-[12.5px] font-bold text-indigo-600 hover:underline mb-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Tất cả các chương
                </button>
              )}

              {daTai && !dangDuyet && ketQua.length === 0 && (
                <div className="text-center text-gray-400 py-10 text-sm">
                  Không tìm thấy công thức nào khớp &ldquo;{tuKhoa}&rdquo;.
                  <button
                    onClick={() => setTuKhoa('')}
                    className="block mx-auto mt-2 font-bold text-indigo-600 hover:underline"
                  >
                    Xem theo chương
                  </button>
                </div>
              )}

              {ketQua.map(c => <TheCongThuc key={c.id} c={c} />)}
            </div>

            <div className="shrink-0 px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-[12px] text-gray-500 font-medium sm:rounded-b-2xl">
              Bài đang làm vẫn giữ nguyên. Đóng hộp này (hoặc nhấn Esc) là làm tiếp.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
