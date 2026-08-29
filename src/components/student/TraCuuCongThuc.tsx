"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { BookOpen, Search, X, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

/**
 * Tra cứu Sổ tay công thức ngay trong lúc làm bài.
 *
 * Học sinh đang làm mà quên công thức thì phải mở tab khác, thoát khỏi bài - vừa mất
 * mạch làm, vừa dễ mất bài đang làm dở. Hộp này nổi lên ngay trên trang: gõ vài chữ là
 * ra công thức, đóng lại là làm tiếp.
 *
 * Nạp MỘT LẦN rồi lọc tại máy: cả sổ tay chỉ vài trăm công thức, tải hết một lượt còn
 * nhẹ hơn gọi máy chủ theo từng chữ gõ, mà tìm lại tức thì.
 */

interface CongThuc {
  id: string;
  title: string;
  latex_content: string | null;
  description: string | null;
  image_url: string | null;
  category_id: string | null;
}

/** Bỏ dấu tiếng Việt để gõ "dao ham" cũng tìm ra "đạo hàm". */
const boDau = (s: string) =>
  String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d")
    .toLowerCase().replace(/\s+/g, " ").trim();

export default function TraCuuCongThuc({ grade, kieu = 'noi' }: { grade?: string; kieu?: 'noi' | 'nutNho' }) {
  const supabase = createClient();
  const [mo, setMo] = React.useState(false);
  const [dangTai, setDangTai] = React.useState(false);
  const [daTai, setDaTai] = React.useState(false);
  const [dsCongThuc, setDsCongThuc] = React.useState<CongThuc[]>([]);
  const [tenDanhMuc, setTenDanhMuc] = React.useState<Map<string, string>>(new Map());
  const [tuKhoa, setTuKhoa] = React.useState("");
  const [loi, setLoi] = React.useState("");

  // Chỉ nạp khi học sinh thật sự mở hộp - đang làm bài thì đừng tải thêm gì cho nặng
  React.useEffect(() => {
    if (!mo || daTai || dangTai) return;
    setDangTai(true);
    (async () => {
      try {
        const [ct, dm] = await Promise.all([
          supabase.from("formulas").select("id, title, latex_content, description, image_url, category_id"),
          supabase.from("formula_categories").select("id, name"),
        ]);
        if (ct.error) throw ct.error;
        setDsCongThuc(ct.data || []);
        setTenDanhMuc(new Map((dm.data || []).map((c: any) => [c.id, c.name])));
        setDaTai(true);
      } catch (e: any) {
        setLoi(e?.message || "Không tải được sổ tay công thức.");
      } finally {
        setDangTai(false);
      }
    })();
  }, [mo, daTai, dangTai, supabase]);

  // Đóng bằng phím Esc cho nhanh, khỏi phải rê chuột đi tìm nút
  React.useEffect(() => {
    if (!mo) return;
    const phim = (e: KeyboardEvent) => { if (e.key === "Escape") setMo(false); };
    document.addEventListener("keydown", phim);
    return () => document.removeEventListener("keydown", phim);
  }, [mo]);

  const khoa = boDau(tuKhoa);
  const ketQua = React.useMemo(() => {
    if (!khoa) return dsCongThuc.slice(0, 40);
    return dsCongThuc.filter(c =>
      boDau(c.title).includes(khoa)
      || boDau(c.description || "").includes(khoa)
      || boDau(c.latex_content || "").includes(khoa)
      || boDau(tenDanhMuc.get(c.category_id || "") || "").includes(khoa)
    ).slice(0, 60);
  }, [khoa, dsCongThuc, tenDanhMuc]);

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
                {daTai ? `${dsCongThuc.length} công thức` : ""}
              </span>
              <button onClick={() => setMo(false)} className="ml-auto p-2 text-indigo-600 hover:bg-indigo-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-gray-100 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  value={tuKhoa}
                  onChange={e => setTuKhoa(e.target.value)}
                  placeholder="Gõ tên công thức... (VD: đạo hàm, nguyên hàm, cấp số nhân)"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
              {dangTai && (
                <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" /> Đang mở sổ tay...
                </div>
              )}
              {loi && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">{loi}</div>}
              {daTai && ketQua.length === 0 && (
                <div className="text-center text-gray-400 py-10 text-sm">
                  Không tìm thấy công thức nào khớp &ldquo;{tuKhoa}&rdquo;.
                </div>
              )}
              {ketQua.map(c => (
                <div key={c.id} className="rounded-xl border border-gray-200 p-3 hover:border-indigo-300 transition-colors">
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
              ))}
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
