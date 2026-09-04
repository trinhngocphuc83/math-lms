"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, RefreshCw, Users, Clock, CheckCircle2 } from "lucide-react";

/**
 * Hàng chờ chấm: mọi bài thi online còn câu tự luận chưa chấm, gom từ mọi đề, mọi lớp.
 *
 * Có màn này vì từ khi bỏ AI chấm hộ, tự luận nào cũng phải qua tay thầy cô - mà bản cũ
 * muốn tìm bài cần chấm thì phải vào từng đề rồi dò từng em, đề nhiều là bỏ sót.
 */
interface DongCho {
  exam_id: string;
  student_id: string;
  tenDe: string;
  tenHs: string;
  lop: string;
  diemMayCham: number | null;
  soCauTuLuan: number;
  conThieu: number;
  nopLuc: string | null;
}

export default function ChoChamPage() {
  const [ds, setDs] = useState<DongCho[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [locLop, setLocLop] = useState("");
  const [locDe, setLocDe] = useState("");

  const tai = async () => {
    setDangTai(true);
    try {
      const res = await fetch("/api/admin/cho-cham");
      const data = await res.json();
      setDs(res.ok ? (data.ds || []) : []);
    } finally {
      setDangTai(false);
    }
  };
  useEffect(() => { tai(); }, []);

  const dsLop = Array.from(new Set(ds.map(d => d.lop).filter(Boolean))).sort();
  const dsDe = Array.from(new Set(ds.map(d => d.tenDe).filter(Boolean))).sort();
  const hienThi = ds.filter(d => (!locLop || d.lop === locLop) && (!locDe || d.tenDe === locDe));

  const ngay = (s: string | null) => {
    if (!s) return "";
    const d = new Date(s);
    return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-indigo-600" /> Chờ chấm
          </h1>
          <p className="text-slate-500 mt-1">
            Bài thi online còn câu tự luận chưa chấm. Chấm đủ thì bài mới có điểm tổng và mới được tính điểm cộng.
          </p>
        </div>
        <button onClick={tai} disabled={dangTai}
          className="bg-white border border-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${dangTai ? "animate-spin" : ""}`} /> Tải lại
        </button>
      </div>

      {ds.length > 0 && (
        <div className="flex gap-3 mb-5 flex-wrap">
          <select value={locLop} onChange={e => setLocLop(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Tất cả lớp</option>
            {dsLop.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={locDe} onChange={e => setLocDe(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Tất cả đề</option>
            {dsDe.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <span className="text-sm text-slate-500 self-center">
            {hienThi.length} bài · {hienThi.reduce((t, d) => t + d.conThieu, 0)} câu cần chấm
          </span>
        </div>
      )}

      {dangTai ? (
        <div className="p-10 text-center text-slate-400 animate-pulse">Đang tải hàng chờ...</div>
      ) : hienThi.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <p className="font-bold text-emerald-800">Không còn bài nào chờ chấm.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="text-left px-5 py-3 font-black">Học sinh</th>
                <th className="text-left px-5 py-3 font-black">Đề</th>
                <th className="text-center px-5 py-3 font-black">Máy chấm</th>
                <th className="text-center px-5 py-3 font-black">Còn phải chấm</th>
                <th className="text-left px-5 py-3 font-black">Nộp lúc</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {hienThi.map((d, i) => (
                <tr key={`${d.exam_id}_${d.student_id}`} className={i % 2 ? "bg-slate-50/50" : ""}>
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />{d.tenHs}
                    </div>
                    {d.lop && <div className="text-xs text-slate-500 ml-6">{d.lop}</div>}
                  </td>
                  <td className="px-5 py-3 text-slate-700">{d.tenDe}</td>
                  <td className="px-5 py-3 text-center font-black text-slate-700">
                    {d.diemMayCham !== null ? Number(d.diemMayCham).toFixed(2) : "-"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-700">
                      {d.conThieu}/{d.soCauTuLuan} câu
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />{ngay(d.nopLuc)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/online-exams/${d.exam_id}/submissions/${d.student_id}`}
                      className="bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 text-xs"
                    >
                      Chấm bài
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
