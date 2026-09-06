"use client";

/**
 * HỘP CHỌN BỘ ĐỀ có lọc và tìm nhanh.
 *
 * Ô <select> một dòng chỉ dùng được khi kho còn vài bộ. Đề ra mỗi tuần một lần thì sau
 * một năm học đã hơn ba chục bộ, mà tên bộ đề lại tự sinh theo khuôn "Loại đề · Phân môn ·
 * Lớp · mã" nên NHIỀU BỘ TRÙNG TÊN NHAU - đo trên kho thật hôm nay đã có hai bộ trùng khít,
 * chỉ khác số câu. Cuộn một danh sách toàn dòng giống hệt nhau để tìm đúng đề vừa in là
 * việc không nên bắt ai làm.
 *
 * Nên ở đây: gõ chữ tìm (không dấu cũng ra), lọc theo Lớp · Phân môn · Loại đề, rồi bày
 * thành thẻ xếp theo mốc thời gian - đề vừa ra nằm ngay đầu. Mỗi thẻ nói đủ những thứ
 * phân biệt hai bộ trùng tên: ngày, số câu, tổng điểm, mã đề.
 *
 * Chỉ lọc TRÊN DANH SÁCH ĐÃ TẢI, không gọi lại máy chủ - danh sách vốn không kèm nội dung
 * câu hỏi nên nhẹ, và lọc tại chỗ thì gõ tới đâu thấy tới đó.
 */

import React from "react";
import { Search, X, Check, FileText } from "lucide-react";
import { soDiemVN } from "@/utils/deThi";

export interface DongChonBoDe {
  id: string;
  ten: string;
  grade?: string | null;
  subject?: string | null;
  loai_de?: string | null;
  so_cau?: number | null;
  tong_diem?: number | null;
  updated_at?: string | null;
  /** Chưa chốt là bản còn dở - phải nói rõ, in nhầm bản nháp ra lớp là hỏng buổi kiểm tra. */
  da_chot?: boolean | null;
  dau_de?: any;
}

/** Bỏ dấu để gõ "giua ky" vẫn ra "Giữa kỳ". */
const khongDau = (s: any): string =>
  String(s ?? "").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d");

/**
 * Số La Mã trong tên đề đổi thành số thường: Thầy cô gõ "giua ky 2" chứ không gõ "II".
 * Chỉ đổi khi đứng riêng một từ, để không phá chữ "I" trong tên khác.
 */
const SO_LA_MA: Record<string, string> = { i: "1", ii: "2", iii: "3", iv: "4" };
const doiLaMa = (s: string): string =>
  s.replace(/\b(i{1,3}|iv)\b/g, m => SO_LA_MA[m] ?? m);

/** Cả những chữ đáng tìm của một bộ đề, gộp lại một chuỗi. */
const chuDeTim = (b: DongChonBoDe): string => {
  const goc = khongDau([
    b.ten, b.loai_de, b.subject, b.grade && `lop ${b.grade}`,
    b.dau_de?.maDe && `ma ${b.dau_de.maDe}`, b.dau_de?.namHoc, b.dau_de?.tenKyThi,
    b.dau_de?.monLop, b.so_cau && `${b.so_cau} cau`,
  ].filter(Boolean).join(" "));
  return goc + " " + doiLaMa(goc);
};

/**
 * Một tiếng gõ vào có nằm trong chuỗi của bộ đề không.
 *
 * Tiếng thuần SỐ phải khớp trọn từ: gõ "2" là đang tìm "Giữa kỳ II" chứ không phải tìm mọi
 * đề của năm "2026". Tiếng có chữ thì khớp một phần cho dễ gõ tắt.
 */
const khopTieng = (chuoi: string, tieng: string): boolean =>
  /^\d+$/.test(tieng)
    ? chuoi.split(/[^0-9a-z]+/).includes(tieng)
    : chuoi.includes(tieng);

/* ===================== XẾP THEO MỐC THỜI GIAN ===================== */

const NGAY = 24 * 60 * 60 * 1000;

/**
 * Đề này thuộc mốc nào: hôm nay, tuần này, tháng này, hay cũ hơn.
 *
 * Thầy cô đi tìm đề thường nhớ "đề tuần trước" chứ không nhớ ngày, nên xếp theo mốc dễ
 * nhắm hơn là một danh sách phẳng dài dằng dặc.
 */
function mocThoiGian(iso?: string | null): { thu: number; ten: string } {
  if (!iso) return { thu: 4, ten: "Không rõ ngày" };
  const cach = Date.now() - new Date(iso).getTime();
  if (cach < NGAY) return { thu: 0, ten: "Hôm nay" };
  if (cach < 7 * NGAY) return { thu: 1, ten: "7 ngày qua" };
  if (cach < 30 * NGAY) return { thu: 2, ten: "30 ngày qua" };
  return { thu: 3, ten: "Cũ hơn" };
}

const ngayVN = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

/* ===================== Ô LỌC ===================== */

/** Các giá trị CÓ THẬT của một cột, kèm số bộ đề - không bày lựa chọn dẫn tới rỗng. */
function cacGiaTri(ds: DongChonBoDe[], lay: (b: DongChonBoDe) => string): [string, number][] {
  const dem = new Map<string, number>();
  for (const b of ds) {
    const v = lay(b);
    if (v) dem.set(v, (dem.get(v) || 0) + 1);
  }
  return [...dem].sort((a, b) => a[0].localeCompare(b[0], "vi"));
}

function OLoc({ nhan, giaTri, dat, muc }: {
  nhan: string; giaTri: string; dat: (v: string) => void; muc: [string, number][];
}) {
  if (muc.length < 2) return null;   // một giá trị duy nhất thì lọc chẳng để làm gì
  return (
    <select
      value={giaTri}
      onChange={e => dat(e.target.value)}
      className={`flex-1 min-w-[125px] border rounded-lg px-2.5 py-1.5 text-[13px] font-medium outline-none
                  ${giaTri ? "border-teal-400 bg-teal-50 text-teal-800" : "border-slate-300 text-slate-600"}`}
    >
      <option value="">{nhan}: tất cả</option>
      {muc.map(([v, n]) => <option key={v} value={v}>{nhan}: {v} ({n})</option>)}
    </select>
  );
}

/* ===================== HỘP CHỌN ===================== */

export default function ChonBoDe({
  ds, giaTri, onChon, chieuCao = "max-h-[320px]", hanhDong, trong,
}: {
  ds: DongChonBoDe[];
  giaTri: string;
  onChon: (id: string) => void;
  /** Lớp Tailwind giới hạn chiều cao vùng cuộn. */
  chieuCao?: string;
  /** Nút riêng gài vào mép phải mỗi thẻ, VD nút xoá bộ đề. */
  hanhDong?: (b: DongChonBoDe) => React.ReactNode;
  /** Lời nhắn khi cả kho chưa có bộ đề nào. */
  trong?: string;
}) {
  const [tim, setTim] = React.useState("");
  const [lop, setLop] = React.useState("");
  const [mon, setMon] = React.useState("");
  const [loai, setLoai] = React.useState("");

  const timSach = khongDau(tim).trim();
  const coLoc = !!(timSach || lop || mon || loai);

  /* Tự xếp mới-trước chứ không tin danh sách gọi vào đã xếp sẵn - thứ tự là thứ Thầy cô
     dựa vào để tìm đề vừa ra, không nên phụ thuộc vào chỗ khác. */
  const loc = React.useMemo(() => ds.filter(b =>
    (!lop || String(b.grade ?? "") === lop)
    && (!mon || String(b.subject ?? "") === mon)
    && (!loai || String(b.loai_de ?? "") === loai)
    && (!timSach || timSach.split(/\s+/).every(t => khopTieng(chuDeTim(b), t)))
  ).sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? ""))),
  [ds, lop, mon, loai, timSach]);

  /* Gom theo mốc thời gian. */
  const nhom = React.useMemo(() => {
    const m = new Map<number, { ten: string; ds: DongChonBoDe[] }>();
    for (const b of loc) {
      const { thu, ten } = mocThoiGian(b.updated_at);
      if (!m.has(thu)) m.set(thu, { ten, ds: [] });
      m.get(thu)!.ds.push(b);
    }
    return [...m].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }, [loc]);

  const xoaLoc = () => { setTim(""); setLop(""); setMon(""); setLoai(""); };

  /** Bộ đang chọn nhưng bị bộ lọc giấu mất khỏi danh sách. */
  const daChonNgoaiLoc = giaTri && !loc.some(b => b.id === giaTri)
    ? ds.find(b => b.id === giaTri)
    : null;

  return (
    <div>
      {/* Hàng lọc - chỉ hiện khi có đủ đề để phải lọc */}
      {ds.length > 3 && (
        <div className="mb-2.5 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={tim}
              onChange={e => setTim(e.target.value)}
              placeholder="Tìm theo tên, loại đề, mã đề… (gõ không dấu cũng được)"
              className="w-full border border-slate-300 rounded-lg pl-8 pr-7 py-1.5 text-[13px] outline-none
                         focus:border-teal-400"
            />
            {tim && (
              <button
                onClick={() => setTim("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OLoc nhan="Lớp" giaTri={lop} dat={setLop} muc={cacGiaTri(ds, b => String(b.grade ?? ""))} />
            <OLoc nhan="Phân môn" giaTri={mon} dat={setMon} muc={cacGiaTri(ds, b => String(b.subject ?? ""))} />
            <OLoc nhan="Loại" giaTri={loai} dat={setLoai} muc={cacGiaTri(ds, b => String(b.loai_de ?? ""))} />
            {coLoc && (
              <button
                onClick={xoaLoc}
                className="text-[12.5px] font-bold text-slate-500 hover:text-rose-600 px-1"
              >
                Bỏ lọc
              </button>
            )}
          </div>
        </div>
      )}

      {/* Danh sách thẻ */}
      <div className={`border border-slate-200 rounded-xl overflow-y-auto ${chieuCao} bg-slate-50/60`}>
        {loc.length === 0 ? (
          <p className="p-5 text-center text-[13px] text-slate-500">
            {ds.length === 0
              ? (trong ?? "Chưa có bộ đề nào đã chốt. Vào Quản lý Đề thi ra đề rồi bấm Lưu bộ đề.")
              : "Không có bộ đề nào khớp. Thử bỏ bớt điều kiện lọc."}
          </p>
        ) : nhom.map(({ ten, ds: dsNhom }) => (
          <div key={ten}>
            <div className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur px-3 py-1
                            text-[11.5px] font-black uppercase tracking-wide text-slate-500">
              {ten} · {dsNhom.length}
            </div>
            {dsNhom.map(b => {
              const chon = b.id === giaTri;
              return (
                /* Thẻ là <div> chứ không phải <button>: chỗ gọi còn gài thêm nút riêng
                   (xoá bộ đề) vào mỗi thẻ, mà nút lồng trong nút là HTML hỏng. */
                <div
                  key={b.id}
                  className={`border-b border-slate-200/70 last:border-b-0 flex items-stretch
                              transition-colors ${chon ? "bg-teal-50" : "bg-white hover:bg-slate-50"}`}
                >
                  <button
                    onClick={() => onChon(b.id)}
                    className="flex-1 min-w-0 text-left px-3 py-2.5 flex items-start gap-2.5"
                  >
                    <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                                      ${chon ? "border-teal-600 bg-teal-600" : "border-slate-300"}`}>
                      {chon && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block font-bold text-[13.5px] leading-snug
                                        ${chon ? "text-teal-900" : "text-slate-800"}`}>
                        {b.ten}
                      </span>
                      {/* Dòng phụ nói đủ những thứ phân biệt hai bộ trùng tên nhau */}
                      <span className="block text-[12px] text-slate-500 mt-0.5">
                        {b.da_chot === false && (
                          <span className="mr-1.5 px-1.5 py-px rounded-full bg-amber-100 text-amber-700
                                           text-[10px] font-black whitespace-nowrap">
                            CHƯA CHỐT
                          </span>
                        )}
                        {[
                          ngayVN(b.updated_at),
                          b.so_cau ? `${b.so_cau} câu` : "",
                          b.tong_diem != null ? `${soDiemVN(Number(b.tong_diem))} điểm` : "",
                          b.dau_de?.maDe ? `mã ${b.dau_de.maDe}` : "",
                          b.dau_de?.namHoc || "",
                        ].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                  {hanhDong && (
                    <div className="flex items-center pr-2 shrink-0">{hanhDong(b)}</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="mt-1.5 text-[12px] text-slate-500 flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5" />
        {coLoc ? `Hiện ${loc.length} trong ${ds.length} bộ đề` : `${ds.length} bộ đề`}
      </p>

      {/* Đề đang chọn mà bị điều kiện lọc giấu đi thì phải nói ra: không thấy thẻ nào sáng
          lên, Thầy cô dễ tưởng đã mất chọn rồi chọn lại nhầm bộ khác. */}
      {daChonNgoaiLoc && (
        <p className="mt-1 text-[12px] text-amber-700 bg-amber-50 border border-amber-200
                      rounded-lg px-2.5 py-1.5">
          Đang chọn <b>{daChonNgoaiLoc.ten}</b> - bộ này không nằm trong danh sách đang lọc.{' '}
          <button onClick={xoaLoc} className="underline font-bold hover:text-amber-900">
            Bỏ lọc để thấy lại
          </button>
        </p>
      )}
    </div>
  );
}
