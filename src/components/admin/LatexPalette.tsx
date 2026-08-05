"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Search, X } from "lucide-react";
import { CURSOR_TOKEN, normalizeForSearch } from "@/utils/mathText";
import { LATEX_CATEGORIES, type LatexSnippet } from "./latexSnippets";

interface LatexPaletteProps {
  /** Nút bấm mở bảng, dùng để neo vị trí hiển thị */
  anchor: HTMLElement | null;
  /** Gọi khi người dùng chọn một ký hiệu; nhận mẫu LaTeX còn nguyên CURSOR_TOKEN */
  onPick: (latex: string) => void;
  onClose: () => void;
}

const PANEL_WIDTH = 380;
const PANEL_MAX_HEIGHT = 330;

/** Vẽ công thức thành HTML. Nếu LaTeX sai thì trả về null để hiện chữ thường thay thế. */
function renderPreview(latex: string): string | null {
  try {
    return katex.renderToString(latex, { throwOnError: true, displayMode: false });
  } catch {
    return null;
  }
}

function SnippetButton({ item, onPick }: { item: LatexSnippet; onPick: (latex: string) => void }) {
  const previewLatex = item.preview ?? item.latex.split(CURSOR_TOKEN).join("");
  const html = useMemo(() => renderPreview(previewLatex), [previewLatex]);

  return (
    <button
      type="button"
      title={item.label}
      // Dùng onMouseDown để không làm mất vùng bôi đen trong ô soạn thảo
      onMouseDown={(e) => {
        e.preventDefault();
        onPick(item.latex);
      }}
      className="h-11 flex items-center justify-center px-1 bg-white border border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors overflow-hidden"
    >
      {html ? (
        <span className="scale-90 pointer-events-none" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <span className="text-[10px] text-gray-500 truncate px-1">{item.label}</span>
      )}
    </button>
  );
}

export default function LatexPalette({ anchor, onPick, onClose }: LatexPaletteProps) {
  const [activeId, setActiveId] = useState(LATEX_CATEGORIES[0].id);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Neo bảng ngay dưới nút bấm. Dùng position: fixed + portal để thanh công cụ
  // (vốn có overflow-x-auto) không cắt mất bảng.
  useLayoutEffect(() => {
    if (!anchor) return;

    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Không đủ chỗ bên dưới thì lật lên trên
      const top = spaceBelow < PANEL_MAX_HEIGHT && rect.top > PANEL_MAX_HEIGHT
        ? rect.top - PANEL_MAX_HEIGHT - 4
        : rect.bottom + 4;
      const maxLeft = window.innerWidth - PANEL_WIDTH - 8;
      const left = Math.max(8, Math.min(rect.left, maxLeft));
      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [anchor]);

  // Bấm ra ngoài bảng (và ngoài nút mở) thì đóng lại
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchor?.contains(target)) return;
      onClose();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [anchor, onClose]);

  const trimmedQuery = query.trim();

  // Khi đang tìm kiếm thì gộp kết quả của mọi nhóm, ngược lại chỉ hiện nhóm đang chọn
  const { items, columns, emptyMessage } = useMemo(() => {
    if (trimmedQuery) {
      const needle = normalizeForSearch(trimmedQuery);
      const found = LATEX_CATEGORIES.flatMap((c) => c.items).filter((item) => {
        const haystack = normalizeForSearch(`${item.label} ${item.keywords ?? ""} ${item.latex}`);
        return haystack.includes(needle);
      });
      return {
        items: found,
        columns: 4,
        emptyMessage: `Không tìm thấy ký hiệu nào khớp "${trimmedQuery}"`,
      };
    }

    const category = LATEX_CATEGORIES.find((c) => c.id === activeId) ?? LATEX_CATEGORIES[0];
    return { items: category.items, columns: category.columns, emptyMessage: "" };
  }, [trimmedQuery, activeId]);

  if (typeof document === "undefined" || !position) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: "fixed", top: position.top, left: position.left, width: PANEL_WIDTH }}
      className="max-w-[92vw] bg-white border border-gray-200 rounded-xl shadow-2xl z-[9999] overflow-hidden"
    >
      {/* Ô tìm kiếm */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-slate-50">
        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm ký hiệu: phan so, can, tich phan..."
          className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-gray-400"
        />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onClose(); }}
          title="Đóng bảng công thức"
          className="p-0.5 text-gray-400 hover:text-gray-700 rounded shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Thanh chọn nhóm - ẩn khi đang tìm kiếm vì kết quả lấy từ mọi nhóm */}
      {!trimmedQuery && (
        <div className="flex gap-1 px-2 py-1.5 border-b border-gray-100 overflow-x-auto whitespace-nowrap">
          {LATEX_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setActiveId(category.id); }}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors shrink-0 ${
                activeId === category.id
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      )}

      {/* Lưới ký hiệu */}
      <div className="p-2 max-h-[240px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-[12px] text-gray-500 text-center py-6 px-3">{emptyMessage}</p>
        ) : (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {items.map((item) => (
              <SnippetButton key={`${item.label}-${item.latex}`} item={item} onPick={onPick} />
            ))}
          </div>
        )}
      </div>

      <p className="px-3 py-1.5 border-t border-gray-100 bg-slate-50 text-[10px] text-gray-500">
        Bấm một ký hiệu để chèn. Con trỏ tự nhảy vào đúng ô cần điền.
      </p>
    </div>,
    document.body
  );
}
