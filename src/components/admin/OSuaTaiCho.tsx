"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import { Pencil } from "lucide-react";
import RichTextarea from "@/components/admin/RichTextarea";
import { appMarkdownComponents, preprocessMarkdown, chuyenDiaChiAnh } from "@/components/CustomMarkdownComponents";

/**
 * Ô soạn thảo hiện BẢN THẬT, bấm vào mới mở khung sửa.
 *
 * Trang soạn bài trước đây bày thẳng ô nhập chữ thô: công thức hiện ra là "$\dfrac{a}{b}$",
 * ảnh hiện ra là một dòng địa chỉ dài ngoằng. Muốn biết câu hỏi thật sự trông thế nào thì
 * phải bật khung xem trước bên cạnh, tức là lúc nào cũng phải nhìn hai chỗ.
 *
 * Nay mặc định dựng công thức và ảnh thật; bấm vào mới thành ô sửa và tự đặt con trỏ
 * vào. Bấm ra ngoài hoặc bấm Esc thì quay lại bản dựng.
 *
 * GIỮ NGUYÊN RichTextarea bên trong chứ không thay bằng textarea trần: thanh công cụ
 * chèn công thức, đổi màu, đổi cỡ chữ đều nằm ở đó, thay đi là mất hết.
 */

interface Props {
  value: string;
  onChange: (giaTriMoi: string) => void;
  /** Chữ mờ hiện khi ô còn trống. */
  placeholder?: string;
  rows?: number;
  /** Lớp CSS cho ô sửa, để giữ đúng dáng của từng chỗ đang dùng. */
  className?: string;
  collapsibleToolbar?: boolean;
  /** Chữ nhỏ hơn cho ô phương án, to hơn cho ô đề bài. */
  co?: "nho" | "vua";
}

export default function OSuaTaiCho({
  value, onChange, placeholder, rows = 3, className = "", collapsibleToolbar = true, co = "vua",
}: Props) {
  const [dangSua, setDangSua] = React.useState(false);
  const boc = React.useRef<HTMLDivElement>(null);

  /*
   * Đóng khi bấm ra ngoài. Dùng mousedown chứ không dùng onBlur của ô nhập: thanh công cụ
   * công thức nằm NGOÀI thẻ textarea, bấm vào nút chèn công thức là textarea mất focus
   * ngay, onBlur sẽ đóng khung sửa trước khi kịp chèn.
   */
  React.useEffect(() => {
    if (!dangSua) return;
    const raNgoai = (e: MouseEvent) => {
      if (boc.current && !boc.current.contains(e.target as Node)) setDangSua(false);
    };
    const phim = (e: KeyboardEvent) => { if (e.key === "Escape") setDangSua(false); };
    document.addEventListener("mousedown", raNgoai);
    document.addEventListener("keydown", phim);
    return () => {
      document.removeEventListener("mousedown", raNgoai);
      document.removeEventListener("keydown", phim);
    };
  }, [dangSua]);

  if (dangSua) {
    return (
      <div ref={boc}>
        <RichTextarea
          autoFocus
          rows={rows}
          collapsibleToolbar={collapsibleToolbar}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={className || "w-full border border-teal-400 rounded-xl p-3 outline-none ring-4 ring-teal-500/10 font-mono text-[15px]"}
        />
        <div className="text-[11px] text-gray-400 mt-1 px-1">
          Bấm ra ngoài hoặc nhấn Esc để xem lại bản thật.
        </div>
      </div>
    );
  }

  const trong = !String(value || "").trim();

  return (
    <div
      onClick={() => setDangSua(true)}
      title="Bấm để sửa"
      className={`group relative cursor-text rounded-xl border border-transparent hover:border-teal-300 hover:bg-teal-50/30 transition-colors px-3 py-2 ${
        trong ? "min-h-[44px] flex items-center" : ""
      }`}
    >
      {trong ? (
        <span className="text-gray-400 italic text-sm">{placeholder || "Bấm để nhập..."}</span>
      ) : (
        <div className={`prose max-w-none prose-p:my-1 overflow-x-auto ${co === "nho" ? "prose-sm" : "prose-sm sm:prose-base"}`}>
          <ReactMarkdown
            components={appMarkdownComponents}
            remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
            urlTransform={chuyenDiaChiAnh}
          >
            {preprocessMarkdown(String(value))}
          </ReactMarkdown>
        </div>
      )}
      <Pencil className="w-3.5 h-3.5 text-teal-500 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
