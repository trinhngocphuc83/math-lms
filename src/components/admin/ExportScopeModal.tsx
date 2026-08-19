"use client";

// Hộp thoại chọn phạm vi xuất Ngân hàng câu hỏi ra file cho NotebookLM.
//
// Cả kho hiện có hơn 8.000 câu (~1,5 triệu từ) trong khi NotebookLM chỉ nhận tối đa
// 500.000 từ mỗi nguồn, nên không thể xuất một lần. Hộp thoại này cho chọn theo
// Chương/Bài và chọn được NHIỀU chương cùng lúc (phục vụ ôn giữa kì / cuối kì),
// đồng thời ước lượng số từ ngay lúc chọn để biết trước có vượt ngưỡng hay không.

import React, { useMemo, useState } from "react";
import { X, ChevronRight, ChevronDown, FileText, AlertTriangle, Loader2, Search, ListTree } from "lucide-react";
import { NGUONG_TU_AN_TOAN } from "@/utils/exportQuestionsMarkdown";

/** Bỏ dấu tiếng Việt để tìm "phuong trinh" cũng ra "phương trình". */
const boDau = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

/** Một dòng thống kê để dựng cây: mỗi (lớp, chương, bài) kèm số câu và số từ ước lượng. */
export interface ThongKeNhanh {
  grade: string;
  topic: string;
  lesson: string;
  soCau: number;
  soTu: number;
}

export interface PhamViChon {
  /** Khoá dạng `lớp||chương||bài` của các BÀI được chọn */
  cacBai: string[];
  kemLoiGiai: boolean;
  tachTheoChuong: boolean;
}

export interface ExportScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  thongKe: ThongKeNhanh[];
  dangTai: boolean;
  dangXuat: boolean;
  tienTrinh?: string;
  onExport: (phamVi: PhamViChon) => void;
}

export const khoaBai = (grade: string, topic: string, lesson: string) => `${grade}||${topic}||${lesson}`;

export default function ExportScopeModal({
  isOpen, onClose, thongKe, dangTai, dangXuat, tienTrinh, onExport,
}: ExportScopeModalProps) {
  const [daChon, setDaChon] = useState<Set<string>>(new Set());
  const [moRong, setMoRong] = useState<Set<string>>(new Set());
  // Ô tìm nhanh: gõ tên chương/bài để thu hẹp cây, khỏi phải cuộn qua hàng chục chương.
  const [tuKhoa, setTuKhoa] = useState('');
  const [kemLoiGiai, setKemLoiGiai] = useState(true);
  const [tachTheoChuong, setTachTheoChuong] = useState(false);

  /**
   * Lọc theo từ khoá trước khi dựng cây. Khớp ở cấp nào cũng giữ lại: gõ tên chương thì
   * giữ trọn chương, gõ tên bài thì chỉ giữ những bài khớp.
   */
  const thongKeLoc = useMemo(() => {
    const tk = boDau(tuKhoa.trim());
    if (!tk) return thongKe;
    return thongKe.filter(d =>
      boDau(d.topic).includes(tk) || boDau(d.lesson).includes(tk) || boDau('lop ' + d.grade).includes(tk)
    );
  }, [thongKe, tuKhoa]);

  // Dựng cây Lớp -> Chương -> Bài từ thống kê
  const cay = useMemo(() => {
    const goc = new Map<string, Map<string, ThongKeNhanh[]>>();
    for (const d of thongKeLoc) {
      const lop = d.grade || '(chưa rõ lớp)';
      const chuong = d.topic || '(chưa rõ chương)';
      if (!goc.has(lop)) goc.set(lop, new Map());
      const mapChuong = goc.get(lop)!;
      if (!mapChuong.has(chuong)) mapChuong.set(chuong, []);
      mapChuong.get(chuong)!.push(d);
    }
    return goc;
  }, [thongKeLoc]);

  const tongTheoNhanh = useMemo(() => {
    const m = new Map<string, { soCau: number; soTu: number }>();
    for (const d of thongKe) {
      const k = khoaBai(d.grade, d.topic, d.lesson);
      m.set(k, { soCau: d.soCau, soTu: d.soTu });
    }
    return m;
  }, [thongKe]);

  const tongDaChon = useMemo(() => {
    let soCau = 0, soTu = 0;
    for (const k of daChon) {
      const v = tongTheoNhanh.get(k);
      if (v) { soCau += v.soCau; soTu += v.soTu; }
    }
    return { soCau, soTu };
  }, [daChon, tongTheoNhanh]);

  if (!isOpen) return null;

  const doiChon = (khoaCacBai: string[], bat: boolean) => {
    setDaChon((truoc) => {
      const moi = new Set(truoc);
      khoaCacBai.forEach((k) => (bat ? moi.add(k) : moi.delete(k)));
      return moi;
    });
  };

  const khoaCuaChuong = (lop: string, chuong: string) =>
    (cay.get(lop)?.get(chuong) || []).map((d) => khoaBai(d.grade, d.topic, d.lesson));

  const khoaCuaLop = (lop: string) => {
    const ds: string[] = [];
    cay.get(lop)?.forEach((_, chuong) => ds.push(...khoaCuaChuong(lop, chuong)));
    return ds;
  };

  const trangThaiNhom = (khoa: string[]) => {
    const daCo = khoa.filter((k) => daChon.has(k)).length;
    return { tatCa: daCo > 0 && daCo === khoa.length, motPhan: daCo > 0 && daCo < khoa.length };
  };

  const demCau = (khoa: string[]) => khoa.reduce((s, k) => s + (tongTheoNhanh.get(k)?.soCau || 0), 0);

  // Mọi khoá mở rộng có thể có (mỗi lớp và mỗi chương), để nút "Mở tất cả" bung trọn cây.
  const moiKhoaMoRong: string[] = [];
  cay.forEach((mapChuong, lop) => {
    moiKhoaMoRong.push(lop);
    mapChuong.forEach((_, chuong) => moiKhoaMoRong.push(`${lop}||${chuong}`));
  });
  // Đang tìm kiếm thì bung sẵn cây, nếu không thầy cô gõ xong vẫn phải bấm mở từng lớp.
  const dangTimKiem = tuKhoa.trim().length > 0;
  const moTatCa = dangTimKiem || (moiKhoaMoRong.length > 0 && moiKhoaMoRong.every((k) => moRong.has(k)));
  const dangMoRong = (k: string) => dangTimKiem || moRong.has(k);

  const vuotNguong = tongDaChon.soTu > NGUONG_TU_AN_TOAN;
  const dangBan = dangTai || dangXuat;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm p-3 md:p-4 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-full max-w-3xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Đầu hộp thoại */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> Xuất câu hỏi ra file cho NotebookLM
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Chọn chương hoặc bài cần xuất. Chọn nhiều chương cùng lúc để ôn giữa kì / cuối kì.
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-600 rounded-full shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thanh tìm nhanh + mở/thu gọn cây */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={tuKhoa}
              onChange={(e) => setTuKhoa(e.target.value)}
              placeholder="Tìm nhanh tên chương hoặc bài (gõ không dấu cũng được)..."
              className="w-full border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-sm outline-none focus:border-blue-500"
            />
            {tuKhoa && (
              <button onClick={() => setTuKhoa('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setMoRong(moTatCa ? new Set() : new Set(moiKhoaMoRong))}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-xl hover:bg-indigo-100 shrink-0"
          >
            <ListTree className="w-4 h-4" /> {moTatCa ? 'Thu gọn tất cả' : 'Mở tất cả chương / bài'}
          </button>
        </div>

        {/* Cây chọn */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/40">
          {dangTai ? (
            <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Đang đọc ngân hàng câu hỏi...
            </div>
          ) : thongKeLoc.length === 0 && tuKhoa.trim() ? (
            <div className="text-center py-16">
              <p className="text-gray-500 font-bold">Không có chương hay bài nào khớp “{tuKhoa}”.</p>
              <button onClick={() => setTuKhoa('')} className="mt-2 text-sm font-bold text-blue-600 hover:underline">
                Xoá từ khoá để xem lại toàn bộ
              </button>
            </div>
          ) : thongKe.length === 0 ? (
            <p className="text-center text-gray-400 py-16">Chưa có câu hỏi nào trong ngân hàng.</p>
          ) : (
            <div className="space-y-2">
              {Array.from(cay.keys()).sort().map((lop) => {
                const khoaLop = khoaCuaLop(lop);
                const tt = trangThaiNhom(khoaLop);
                const dangMo = dangMoRong(lop);
                return (
                  <div key={lop} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {/* Bấm bất cứ đâu trên dòng đều mở/đóng - trước đây chỉ mũi tên nhỏ mới mở
                        được, nên nhìn vào tưởng chỉ chọn được nguyên lớp. Ô tick chặn lan lên
                        để tick không làm đóng cây. */}
                    <div
                      onClick={() => setMoRong((p) => { const n = new Set(p); n.has(lop) ? n.delete(lop) : n.add(lop); return n; })}
                      className="flex items-center gap-2 px-3 py-2.5 bg-gray-50/80 cursor-pointer hover:bg-indigo-50/60"
                    >
                      <span className="p-1 text-gray-500 shrink-0">
                        {dangMo ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </span>
                      <input
                        type="checkbox"
                        checked={tt.tatCa}
                        ref={(el) => { if (el) el.indeterminate = tt.motPhan; }}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => doiChon(khoaLop, e.target.checked)}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                      <span className="font-black text-gray-800">Lớp {lop}</span>
                      <span className="text-xs text-gray-500">
                        ({demCau(khoaLop)} câu · {cay.get(lop)!.size} chương)
                      </span>
                      {!dangMo && (
                        <span className="ml-auto text-[11px] font-bold text-indigo-600 shrink-0">Bấm để chọn từng chương / bài</span>
                      )}
                    </div>

                    {dangMo && (
                      <div className="p-2 space-y-1.5">
                        {Array.from(cay.get(lop)!.keys()).map((chuong) => {
                          const khoaCh = khoaCuaChuong(lop, chuong);
                          const ttCh = trangThaiNhom(khoaCh);
                          const khoaMoChuong = `${lop}||${chuong}`;
                          const moChuong = dangMoRong(khoaMoChuong);
                          return (
                            <div key={chuong} className="border border-gray-100 rounded-lg">
                              <div
                                onClick={() => setMoRong((p) => { const n = new Set(p); n.has(khoaMoChuong) ? n.delete(khoaMoChuong) : n.add(khoaMoChuong); return n; })}
                                className="flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-indigo-50/50 rounded-lg"
                              >
                                <span className="p-0.5 text-gray-400 shrink-0">
                                  {moChuong ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={ttCh.tatCa}
                                  ref={(el) => { if (el) el.indeterminate = ttCh.motPhan; }}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => doiChon(khoaCh, e.target.checked)}
                                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                                />
                                <span className="font-bold text-sm text-gray-700 truncate">{chuong}</span>
                                <span className="text-xs text-gray-400 shrink-0">
                                  ({demCau(khoaCh)} câu · {(cay.get(lop)!.get(chuong) || []).length} bài)
                                </span>
                              </div>

                              {moChuong && (
                                <div className="pl-9 pr-2.5 pb-2 space-y-1">
                                  {(cay.get(lop)!.get(chuong) || []).map((d) => {
                                    const k = khoaBai(d.grade, d.topic, d.lesson);
                                    return (
                                      <label key={k} className="flex items-center gap-2 cursor-pointer py-0.5">
                                        <input
                                          type="checkbox"
                                          checked={daChon.has(k)}
                                          onChange={(e) => doiChon([k], e.target.checked)}
                                          className="w-3.5 h-3.5 accent-blue-600"
                                        />
                                        <span className="text-[13px] text-gray-600 truncate">{d.lesson || '(chưa rõ bài)'}</span>
                                        <span className="text-[11px] text-gray-400 shrink-0">({d.soCau})</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chân: tổng kết + tuỳ chọn + nút xuất */}
        <div className="border-t border-gray-100 bg-white shrink-0">
          <div className={`px-5 py-2.5 text-sm flex items-center justify-between flex-wrap gap-2 ${vuotNguong ? 'bg-amber-50' : ''}`}>
            <div>
              <span className="font-black text-blue-600 text-lg">{tongDaChon.soCau}</span>
              <span className="text-gray-500"> câu · ước lượng </span>
              <span className={`font-bold ${vuotNguong ? 'text-amber-700' : 'text-gray-700'}`}>
                {tongDaChon.soTu.toLocaleString('vi-VN')} từ
              </span>
              <span className="text-gray-400 text-xs"> / giới hạn 500.000 từ mỗi nguồn</span>
            </div>
            {tongDaChon.soCau > 0 && (
              <button onClick={() => setDaChon(new Set())} className="text-xs font-bold text-gray-500 hover:underline">
                Bỏ chọn tất cả
              </button>
            )}
          </div>

          {vuotNguong && (
            <div className="px-5 py-2 bg-amber-50 border-t border-amber-100 flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Vượt ngưỡng an toàn ({NGUONG_TU_AN_TOAN.toLocaleString('vi-VN')} từ). NotebookLM có thể từ chối hoặc cắt bớt
                nội dung. Nên bật <b>“Tách mỗi chương một file”</b> bên dưới rồi tải từng file lên.
              </span>
            </div>
          )}

          <div className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap border-t border-gray-100">
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={kemLoiGiai} onChange={(e) => setKemLoiGiai(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                <span className="text-gray-700">Kèm lời giải</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={tachTheoChuong} onChange={(e) => setTachTheoChuong(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                <span className="text-gray-700">Tách mỗi chương một file</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              {tienTrinh && <span className="text-xs text-gray-500">{tienTrinh}</span>}
              <button
                onClick={() => onExport({ cacBai: Array.from(daChon), kemLoiGiai, tachTheoChuong: tachTheoChuong || vuotNguong })}
                disabled={dangBan || tongDaChon.soCau === 0}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
              >
                {dangXuat ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Xuất {tongDaChon.soCau > 0 ? `${tongDaChon.soCau} câu` : ''}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
