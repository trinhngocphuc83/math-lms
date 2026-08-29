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
 * Có ô tìm nhanh vì bảng khá dài: thầy cô gõ "ảnh" hay "Tab" là lọc còn đúng phần cần.
 */

/** Cắt lấy các mục (chia theo `##`) có chứa từ khoá. */
function locTheoTu(chu: string, tu: string): string {
  const t = tu.trim().toLowerCase();
  if (!t) return chu;
  const muc = chu.split(/\n(?=## )/);
  const hop = muc.filter(m => m.toLowerCase().includes(t));
  return hop.length ? hop.join('\n') : '';
}

export default function HuongDanSoanBaiModal({
  isOpen, onClose,
}: { isOpen: boolean; onClose: () => void }) {
  const [tim, setTim] = React.useState('');

  React.useEffect(() => {
    if (!isOpen) return;
    setTim('');
    const phim = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', phim);
    return () => document.removeEventListener('keydown', phim);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const noiDung = locTheoTu(NOI_DUNG_HUONG_DAN, tim);

  return (
    <div className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="bg-white w-full sm:max-w-[900px] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        <div className="flex items-center gap-2 px-4 py-3 border-b border-teal-100 bg-teal-50 shrink-0 sm:rounded-t-2xl">
          <HelpCircle className="w-5 h-5 text-teal-600 shrink-0" />
          <h2 className="text-[15px] font-black text-teal-900">Hướng dẫn soạn bài</h2>
          <div className="relative ml-auto mr-1 w-[190px] sm:w-[240px]">
            <Search className="w-3.5 h-3.5 text-teal-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={tim} onChange={e => setTim(e.target.value)}
              placeholder="Tìm nhanh: ảnh, Tab, AI..."
              className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-teal-200 bg-white text-[12.5px] outline-none focus:border-teal-400"
            />
          </div>
          <button onClick={onClose} className="p-1.5 text-teal-600 hover:bg-teal-100 rounded-full shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 min-h-0">
          {noiDung ? (
            <div className="prose prose-sm max-w-none
                            prose-headings:font-black prose-headings:text-gray-800
                            prose-h2:text-[16px] prose-h2:mt-6 prose-h2:mb-2 prose-h2:pb-1.5
                            prose-h2:border-b prose-h2:border-teal-100 prose-h2:text-teal-800
                            prose-h3:text-[14px] prose-h3:mt-4 prose-h3:mb-1.5
                            prose-table:text-[12.5px] prose-th:bg-gray-50 prose-th:text-left
                            prose-td:align-top prose-code:text-[12px]
                            prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5
                            prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                            prose-li:my-0.5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{noiDung}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">
              Không có mục nào chứa “{tim}”. Thử từ khác, hoặc xoá ô tìm để xem toàn bộ.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
