"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Nút mở bảng chọn dùng chung cho các thanh công cụ.
 *
 * Vì sao cần: các thanh công cụ ở trang ra đề từng bày HẾT mọi nút ra ngoài - riêng màn
 * "Xem đề hoàn chỉnh" đã 9 nút to xếp thành hai hàng, đẩy nội dung đề xuống quá nửa màn
 * hình. Gom những việc cùng nhóm vào một bảng chọn thì thanh công cụ còn một hàng, mà
 * không mất chức năng nào.
 *
 * Bảng chọn KHÔNG tự đóng khi bấm bừa vào bên trong: bên trong còn có ô <select> (chọn
 * mẫu, chọn bộ đề), tự đóng theo mọi cú bấm thì vừa mở ra đã sập. Mục nào cần đóng thì
 * gọi dong() - MucMenu làm sẵn việc đó.
 */

const NgatMenu = createContext<() => void>(() => {});

/** Đóng bảng chọn từ bên trong (dùng cho ô <select> tự dựng). */
export const useDongMenu = () => useContext(NgatMenu);

interface PropsMenu {
  nhan: string;
  icon?: React.ReactNode;
  /** 'chinh' = nút đặc màu, dùng cho việc chính; mặc định là nút viền nhạt. */
  kieu?: "thuong" | "chinh";
  /** Bảng chọn thả từ mép phải của nút, cho nút nằm sát rìa phải màn hình. */
  canhPhai?: boolean;
  /** Lớp CSS bề rộng bảng chọn, mặc định 260px. */
  rong?: string;
  disabled?: boolean;
  /** Số nhỏ hiện trên nút, VD số bộ lọc đang bật. */
  dem?: number;
  title?: string;
  children: React.ReactNode;
}

export default function MenuGon({
  nhan, icon, kieu = "thuong", canhPhai = false, rong = "w-[260px]",
  disabled, dem, title, children,
}: PropsMenu) {
  const [mo, setMo] = useState(false);
  const boc = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: MouseEvent) => {
      if (boc.current && !boc.current.contains(e.target as Node)) setMo(false);
    };
    const phim = (e: KeyboardEvent) => { if (e.key === "Escape") setMo(false); };
    document.addEventListener("mousedown", ngoai);
    document.addEventListener("keydown", phim);
    return () => {
      document.removeEventListener("mousedown", ngoai);
      document.removeEventListener("keydown", phim);
    };
  }, [mo]);

  const nutChinh = "bg-teal-600 text-white border-teal-600 hover:bg-teal-700";
  const nutThuong = "bg-white text-gray-700 border-gray-300 hover:bg-gray-50";

  return (
    <div className="relative" ref={boc}>
      <button
        type="button"
        onClick={() => setMo(v => !v)}
        disabled={disabled}
        title={title}
        className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-[13px] font-bold transition-colors disabled:opacity-50 ${
          kieu === "chinh" ? nutChinh : nutThuong
        } ${mo ? "ring-2 ring-teal-500/30" : ""}`}
      >
        {icon}
        {nhan}
        {dem !== undefined && dem > 0 && (
          <span className="ml-0.5 px-1.5 py-px rounded-full bg-teal-100 text-teal-700 text-[10px] font-black">{dem}</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${mo ? "rotate-180" : ""}`} />
      </button>

      {mo && (
        <NgatMenu.Provider value={() => setMo(false)}>
          <div
            className={`absolute z-50 mt-1 ${canhPhai ? "right-0" : "left-0"} ${rong}
              rounded-xl border border-gray-200 bg-white shadow-xl p-1.5 max-h-[70vh] overflow-y-auto`}
          >
            {children}
          </div>
        </NgatMenu.Provider>
      )}
    </div>
  );
}

/** Tiêu đề nhóm bên trong bảng chọn. */
export function NhomMenu({ nhan }: { nhan: string }) {
  return (
    <div className="px-2 pt-2 pb-1 text-[10px] font-black uppercase tracking-wide text-gray-400">
      {nhan}
    </div>
  );
}

/** Một mục bấm được trong bảng chọn. Bấm xong tự đóng bảng. */
export function MucMenu({
  icon, nhan, moTa, onClick, disabled, nguyHiem, title,
}: {
  icon?: React.ReactNode;
  nhan: string;
  moTa?: string;
  onClick: () => void;
  disabled?: boolean;
  /** Việc xoá - tô đỏ để khỏi bấm nhầm. */
  nguyHiem?: boolean;
  title?: string;
}) {
  const dong = useDongMenu();
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={() => { onClick(); dong(); }}
      className={`w-full flex items-start gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors disabled:opacity-40 ${
        nguyHiem ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <span className="min-w-0">
        <span className="block text-[13px] font-bold leading-tight">{nhan}</span>
        {moTa && <span className="block text-[11px] text-gray-400 leading-snug mt-0.5">{moTa}</span>}
      </span>
    </button>
  );
}

/** Đường kẻ ngăn giữa hai nhóm. */
export function NganMenu() {
  return <div className="my-1 border-t border-gray-100" />;
}

/**
 * Danh sách chọn NHIỀU mục, dùng trong menu "Lọc kho".
 *
 * Trước đây mỗi ô lọc là một thẻ select chỉ chọn được một, nên muốn ra đề gộp hai
 * chương thì phải làm hai lần rồi ghép tay. Danh sách dạng toán có thể tới hàng trăm dòng
 * nên kèm luôn ô tìm nhanh; không có thì cuộn mỏi tay.
 */
export function DanhSachTick({ ds, chon, datChon, tenGoi, nhanCua }: {
  ds: string[];
  chon: string[];
  datChon: (v: string[]) => void;
  /** Tên gọi để ghi trong ô tìm, ví dụ "chuyên đề". */
  tenGoi: string;
  /** Đổi mã sang chữ dễ đọc, ví dụ NLC -> Trắc nghiệm. */
  nhanCua?: (m: string) => string;
}) {
  const [tim, setTim] = useState("");
  const hien = tim.trim()
    ? ds.filter((x) => (nhanCua ? nhanCua(x) : x).toLowerCase().includes(tim.trim().toLowerCase()))
    : ds;

  const bat = (x: string) =>
    datChon(chon.includes(x) ? chon.filter((y) => y !== x) : [...chon, x]);

  return (
    <div className="px-1 pb-1.5">
      {ds.length > 8 && (
        <input
          value={tim}
          onChange={(e) => setTim(e.target.value)}
          placeholder={`Tìm ${tenGoi}...`}
          className="w-full mb-1 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-teal-400 text-[12.5px]"
        />
      )}

      <div className="max-h-[190px] overflow-y-auto rounded-lg border border-gray-100">
        {hien.length === 0 && (
          <div className="px-2 py-3 text-[12px] text-gray-400 text-center">Không có {tenGoi} nào khớp.</div>
        )}
        {hien.map((x) => (
          <label
            key={x}
            className="flex items-start gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0"
          >
            <input
              type="checkbox"
              checked={chon.includes(x)}
              onChange={() => bat(x)}
              className="mt-0.5 w-3.5 h-3.5 accent-teal-600 shrink-0"
            />
            <span className={`text-[12.5px] leading-snug ${chon.includes(x) ? "font-bold text-teal-800" : "text-gray-600"}`}>
              {nhanCua ? nhanCua(x) : x}
            </span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-1 px-0.5">
        <button type="button" onClick={() => datChon(hien)} className="text-[11.5px] font-bold text-teal-600 hover:underline">
          Chọn hết
        </button>
        <button type="button" onClick={() => datChon([])} className="text-[11.5px] font-bold text-gray-400 hover:underline">
          Bỏ hết
        </button>
        {chon.length > 0 && (
          <span className="ml-auto text-[11.5px] font-bold text-teal-700">đang chọn {chon.length}</span>
        )}
      </div>
    </div>
  );
}

