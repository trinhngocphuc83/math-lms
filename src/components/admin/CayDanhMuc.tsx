"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ChevronRight, Loader2, Search, Eye, AlertTriangle } from "lucide-react";
import { toBankType, type BankType } from "@/utils/questionTypes";

/**
 * CÂY DANH MỤC KÈM SỐ CÂU — để soạn bài.
 *
 * Bảng phẳng trong hộp Danh mục chỉ để sửa từng dòng; muốn biết "Bài 2 chương 3 lớp 10 đang
 * có những dạng gì, mỗi dạng bao nhiêu câu, mức nào thiếu" thì phải tự cuộn 818 dòng mà
 * đếm — thầy yêu cầu 18/9/2026. Ở đây: cột trái Lớp › Phân môn › Chương (đếm dạng, câu);
 * bấm một chương thì bên phải bày từng Bài → từng Dạng với số câu, cơ cấu 4 mức và 4 loại,
 * yêu cầu cần đạt. Dạng 0 câu và mức trống tô nhạt để thấy ngay chỗ hổng.
 *
 * Số câu lấy từ bảng questions (7 cột, phân trang 1000 — PostgREST cắt ở 1000 dòng, kho
 * đang 7843 câu), gom theo đủ năm trường như trang Quản lý Đề thi.
 */

export interface DongDanhMuc {
  id: string; grade: string; subject: string; topic: string; lesson: string; math_form: string; yeu_cau_can_dat?: string;
}
interface Dem { tong: number; muc: Record<string, number>; loai: Record<BankType, number> }
const demMoi = (): Dem => ({ tong: 0, muc: { '1': 0, '2': 0, '3': 0, '4': 0, '': 0 }, loai: { NLC: 0, DS: 0, TLN: 0, TL: 0 } });
const khoa = (...p: (string | null | undefined)[]) => p.map(x => String(x ?? '').trim()).join('');

const TEN_LOAI: Record<BankType, string> = { NLC: 'TN', DS: 'Đ/S', TLN: 'TLN', TL: 'TL' };
const TEN_MUC: Record<string, string> = { '1': 'NB', '2': 'TH', '3': 'VD', '4': 'VDC' };

/** Sắp "Chương 2" trước "Chương 10", "Bài 3" trước "Bài 12". */
const soDau = (s: string) => { const m = String(s).match(/\d+/); return m ? Number(m[0]) : 999; };
const sapTen = (a: string, b: string) => soDau(a) - soDau(b) || a.localeCompare(b, 'vi');

export default function CayDanhMuc({ danhMuc, onSua, onXemCau }: {
  danhMuc: DongDanhMuc[];
  /** Mở dòng ấy ở ô sửa của hộp Danh mục */
  onSua?: (d: DongDanhMuc) => void;
  /** Đặt bộ lọc Ngân hàng theo bài / dạng rồi đóng hộp — để xem câu ngay */
  onXemCau?: (loc: { grade: string; subject: string; topic: string; lesson?: string; math_form?: string }) => void;
}) {
  const supabase = createClient();
  const [dem, setDem] = useState<Map<string, Dem> | null>(null);
  const [loi, setLoi] = useState('');
  const [tim, setTim] = useState('');
  const [chuongChon, setChuongChon] = useState('');
  const [moLop, setMoLop] = useState<Record<string, boolean>>({});

  /* Đếm câu toàn kho một lần khi mở. */
  useEffect(() => {
    let huy = false;
    (async () => {
      try {
        const m = new Map<string, Dem>();
        const COT = 'grade, subject, topic, lesson, math_form, question_type, difficulty';
        for (let tu = 0; ; tu += 1000) {
          const { data, error } = await supabase.from('questions').select(COT).range(tu, tu + 999);
          if (error) throw error;
          for (const q of data || []) {
            const loai = toBankType(q.question_type);
            const mucQ = ['1', '2', '3', '4'].includes(String(q.difficulty)) ? String(q.difficulty) : '';
            /* Cộng vào cả 3 tầng: dạng, bài, chương — mỗi tầng một khoá */
            for (const k of [
              khoa(q.grade, q.subject, q.topic, q.lesson, q.math_form),
              khoa(q.grade, q.subject, q.topic, q.lesson),
              khoa(q.grade, q.subject, q.topic),
            ]) {
              const d = m.get(k) || demMoi();
              d.tong++; d.muc[mucQ]++; if (loai) d.loai[loai]++;
              m.set(k, d);
            }
          }
          if (!data || data.length < 1000) break;
        }
        if (!huy) setDem(m);
      } catch (e: any) { if (!huy) setLoi(e?.message || 'Không đếm được câu trong kho'); }
    })();
    return () => { huy = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Cây: lớp › phân môn › chương › bài › dạng */
  const cay = useMemo(() => {
    const t = tim.trim().toLowerCase();
    const lops = new Map<string, Map<string, Map<string, Map<string, DongDanhMuc[]>>>>();
    for (const d of danhMuc) {
      if (t && ![d.topic, d.lesson, d.math_form].some(x => String(x || '').toLowerCase().includes(t))) continue;
      const g = String(d.grade || '?'), s = String(d.subject || '?'), c = String(d.topic || '(chưa đặt chương)'), b = String(d.lesson || '(chưa đặt bài)');
      if (!lops.has(g)) lops.set(g, new Map());
      const pm = lops.get(g)!; if (!pm.has(s)) pm.set(s, new Map());
      const ch = pm.get(s)!; if (!ch.has(c)) ch.set(c, new Map());
      const bai = ch.get(c)!; if (!bai.has(b)) bai.set(b, []);
      bai.get(b)!.push(d);
    }
    return lops;
  }, [danhMuc, tim]);

  const dsLop = [...cay.keys()].sort((a, b) => Number(a) - Number(b));
  const demCua = (k: string) => dem?.get(k) || demMoi();

  /* Chương đang chọn → bài → dạng */
  const [gC, sC, cC] = chuongChon.split('');
  const baiCuaChuong = cay.get(gC)?.get(sC)?.get(cC);

  const O = ({ n, nhat }: { n: number; nhat?: boolean }) => (
    <span className={`inline-block min-w-[26px] text-center px-1 rounded text-[11px] font-bold ${
      n === 0 ? 'bg-rose-50 text-rose-400' : nhat ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>{n}</span>
  );

  return (
    <div className="flex h-full min-h-0">
      {/* Cột trái: lớp › phân môn › chương */}
      <div className="w-[380px] shrink-0 border-r border-gray-100 flex flex-col min-h-0 bg-white">
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={tim} onChange={e => setTim(e.target.value)} placeholder="Tìm chương, bài, dạng…"
                   className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {dem ? <>Kho: <b className="text-gray-600">{[...dem.entries()].filter(([k]) => k.split('').length === 3).reduce((s, [, v]) => s + v.tong, 0)}</b> câu · số trong ngoặc: dạng / câu</>
                 : loi ? <span className="text-rose-600">{loi}</span> : <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> đang đếm câu trong kho…</span>}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {dsLop.map(g => {
            const pm = cay.get(g)!;
            const mo = moLop[g] ?? (dsLop.length <= 2 || !!tim);
            return (
              <div key={g} className="mb-1">
                <button onClick={() => setMoLop(m => ({ ...m, [g]: !mo }))}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left">
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${mo ? 'rotate-90' : ''}`} />
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-black text-xs flex items-center justify-center">{g}</span>
                  <span className="font-bold text-gray-700 text-sm">Lớp {g}</span>
                  <span className="ml-auto text-[11px] text-gray-400">{[...pm.values()].reduce((s, ch) => s + ch.size, 0)} chương</span>
                </button>
                {mo && [...pm.keys()].sort().map(s => (
                  <div key={s} className="ml-4 mt-0.5">
                    <div className="px-2 py-1 text-[11px] font-black uppercase tracking-wider text-gray-400">{s}</div>
                    {[...pm.get(s)!.keys()].sort(sapTen).map(c => {
                      const k = khoa(g, s, c);
                      const soDang = [...pm.get(s)!.get(c)!.values()].reduce((n, ds) => n + ds.filter(d => d.math_form).length, 0);
                      const d = demCua(k);
                      const chon = chuongChon === k;
                      return (
                        <button key={c} onClick={() => setChuongChon(k)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-[13px] transition-colors ${
                                  chon ? 'bg-emerald-600 text-white font-bold' : 'text-gray-700 hover:bg-emerald-50'}`}>
                          <span className="flex-1 min-w-0 truncate">{c}</span>
                          <span className={`shrink-0 text-[11px] font-bold ${chon ? 'text-emerald-100' : 'text-gray-400'}`}>
                            {soDang} / {dem ? d.tong : '…'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
          {dsLop.length === 0 && <p className="text-sm text-gray-400 p-4 text-center">Không có mục nào khớp.</p>}
        </div>
      </div>

      {/* Bên phải: bài → dạng của chương đang chọn */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-gray-50/40">
        {!baiCuaChuong ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 text-gray-400">
            <p className="text-base font-bold text-gray-500 mb-1">Chọn một chương bên trái</p>
            <p className="text-sm max-w-md">Bên này sẽ bày từng bài của chương: có những dạng gì, mỗi dạng bao nhiêu câu, chia theo mức Nhận biết · Thông hiểu · Vận dụng · VDC và theo loại câu — nhìn một lượt là biết bài nào đủ câu để soạn, dạng nào còn trống.</p>
          </div>
        ) : (
          <div className="p-5">
            {(() => {
              const dC = demCua(chuongChon);
              return (
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-gray-400">Lớp {gC} · {sC}</div>
                    <h3 className="text-lg font-black text-gray-800">{cC}</h3>
                  </div>
                  <div className="ml-auto flex items-center gap-2 text-[12px] text-gray-600">
                    <span className="font-bold text-gray-800">{dC.tong} câu</span>
                    {['1', '2', '3', '4'].map(m => <span key={m} className="px-1.5 py-0.5 rounded bg-white border border-gray-200">{TEN_MUC[m]} <b>{dC.muc[m]}</b></span>)}
                    {dC.muc[''] > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700">chưa mức <b>{dC.muc['']}</b></span>}
                    {onXemCau && (
                      <button onClick={() => onXemCau({ grade: gC, subject: sC, topic: cC })}
                              className="ml-1 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700">
                        <Eye className="w-3.5 h-3.5" /> Xem câu cả chương
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {[...baiCuaChuong.keys()].sort(sapTen).map(b => {
              const dsDang = baiCuaChuong.get(b)!;
              const kB = khoa(gC, sC, cC, b);
              const dB = demCua(kB);
              const cacDang = dsDang.filter(d => d.math_form).sort((x, y) => demCua(khoa(gC, sC, cC, b, y.math_form)).tong - demCua(khoa(gC, sC, cC, b, x.math_form)).tong);
              return (
                <div key={b} className="mb-4 rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <span className="font-bold text-gray-800 text-sm">{b}</span>
                    <span className="text-[12px] text-gray-500">{cacDang.length} dạng · <b className="text-gray-700">{dB.tong} câu</b></span>
                    <div className="ml-auto flex items-center gap-1 text-[11px] text-gray-500">
                      {(['NLC', 'DS', 'TLN', 'TL'] as BankType[]).map(l => <span key={l} className="px-1.5 py-0.5 rounded bg-white border border-gray-200">{TEN_LOAI[l]} <b>{dB.loai[l]}</b></span>)}
                      {onXemCau && (
                        <button onClick={() => onXemCau({ grade: gC, subject: sC, topic: cC, lesson: b })} title="Lọc Ngân hàng theo bài này"
                                className="ml-1 p-1 rounded-md text-indigo-600 hover:bg-indigo-50"><Eye className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                  {cacDang.length === 0 ? (
                    <p className="px-4 py-3 text-[12.5px] text-amber-700 italic flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Bài này chưa đặt dạng nào.</p>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10.5px] uppercase tracking-wider text-gray-400">
                          <th className="px-4 py-1.5 font-bold">Dạng</th>
                          <th className="px-2 py-1.5 font-bold text-center">Câu</th>
                          {['1', '2', '3', '4'].map(m => <th key={m} className="px-1 py-1.5 font-bold text-center">{TEN_MUC[m]}</th>)}
                          {(['NLC', 'DS', 'TLN', 'TL'] as BankType[]).map(l => <th key={l} className="px-1 py-1.5 font-bold text-center text-gray-300">{TEN_LOAI[l]}</th>)}
                          <th className="px-2 py-1.5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {cacDang.map(d => {
                          const dd = demCua(khoa(gC, sC, cC, b, d.math_form));
                          return (
                            <tr key={d.id} className={`group ${dd.tong === 0 ? 'bg-rose-50/40' : 'hover:bg-emerald-50/30'}`}>
                              <td className="px-4 py-2 align-top">
                                <div className="text-[13px] font-semibold text-gray-800">{d.math_form}</div>
                                <div className={`text-[11.5px] leading-snug ${d.yeu_cau_can_dat ? 'text-gray-500' : 'text-amber-600 italic'}`}>
                                  {d.yeu_cau_can_dat || 'Chưa soạn yêu cầu cần đạt'}
                                </div>
                              </td>
                              <td className="px-2 py-2 text-center align-top"><span className={`text-[13px] font-black ${dd.tong === 0 ? 'text-rose-500' : 'text-gray-800'}`}>{dd.tong}</span></td>
                              {['1', '2', '3', '4'].map(m => <td key={m} className="px-1 py-2 text-center align-top"><O n={dd.muc[m]} /></td>)}
                              {(['NLC', 'DS', 'TLN', 'TL'] as BankType[]).map(l => <td key={l} className="px-1 py-2 text-center align-top"><O n={dd.loai[l]} nhat /></td>)}
                              <td className="px-2 py-2 text-right align-top whitespace-nowrap">
                                {onXemCau && dd.tong > 0 && (
                                  <button onClick={() => onXemCau({ grade: gC, subject: sC, topic: cC, lesson: b, math_form: d.math_form })} title="Xem câu của dạng này"
                                          className="p-1 rounded-md text-indigo-600 hover:bg-indigo-50"><Eye className="w-4 h-4" /></button>
                                )}
                                {onSua && (
                                  <button onClick={() => onSua(d)} title="Sửa tên / yêu cầu cần đạt"
                                          className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 text-[11px] font-bold">Sửa</button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
