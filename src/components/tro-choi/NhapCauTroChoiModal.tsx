"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { X, Scissors, Plus, Loader2, Search, Sparkles } from 'lucide-react';
import { layCauNguonTroChoi, type CauNguon } from '@/app/actions/troChoi';
import { tachYCau, soYTachDuoc, TEN_LOAI, TEN_MUC, xuongDongNgoaiCongThuc } from '@/utils/troChoi';
import { doanMucDoNhieuCau } from '@/utils/datMucDo';
import { khoiQuizSangCauCanMucDo } from '@/utils/doanMucBoCau';

/**
 * Nhập câu vào BỘ CÂU HỎI TRÒ CHƠI từ các module đã có của bài / chương (bài tập tự
 * luyện, luyện tập, đề ôn tập, bài giảng).
 *
 * Thầy chốt 16/9/2026: trò chơi không lấy thẳng từ tự luyện — câu tự luận 8 ý không chơi
 * được. Ở đây thầy tick câu muốn lấy; câu nhiều ý (a) b) c)…) có nút TÁCH: mỗi ý thành một
 * câu tự luận riêng, phần dẫn giữ ở đầu, lời giải tách theo cùng nhãn. Mức của từng câu
 * chỉnh được (quyết định điểm ±1/±2/±3 trong trò).
 *
 * MỨC: chỉ ~1/3 khối quiz trong bài có sourceQuestionId để tra mức từ kho (đo 16/9/2026:
 * 1051/3741); Toán 10 chương 2 soạn tay không có câu nào → cả 112 câu hiện "chưa rõ", vào
 * trò đều ±1 - thầy phàn nàn ngay buổi đầu. Nên có nút "AI đoán mức" cho câu chưa rõ (dùng
 * lại doanMucDoNhieuCau của bộ kiểm thử đề, mức 4 gộp về 3 vì trò chỉ có ba bậc) và ô đặt
 * mức hàng loạt cho câu đã tick; thầy vẫn sửa từng câu được.
 */
export default function NhapCauTroChoiModal({ isOpen, onClose, lessonId, onThem }: {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  /** Nhận markdown các khối ```quiz``` để nối vào nội dung đang soạn */
  onThem: (markdown: string, soCau: number) => void;
}) {
  const [dangTai, setDangTai] = useState(false);
  const [ds, setDs] = useState<CauNguon[]>([]);
  const [loi, setLoi] = useState('');
  const [chon, setChon] = useState<Record<number, boolean>>({});
  const [tach, setTach] = useState<Record<number, boolean>>({});
  const [muc, setMuc] = useState<Record<number, number>>({});
  const [locModule, setLocModule] = useState('');
  const [tim, setTim] = useState('');
  const [dangDoan, setDangDoan] = useState<{ xong: number; tong: number } | null>(null);
  const [baoDoan, setBaoDoan] = useState('');

  useEffect(() => {
    if (!isOpen || !lessonId) return;
    setDangTai(true); setLoi(''); setChon({}); setTach({}); setMuc({});
    layCauNguonTroChoi(lessonId)
      .then(r => { setDs(r); setDangTai(false); })
      .catch(e => { setLoi(e?.message || 'Không tải được'); setDangTai(false); });
  }, [isOpen, lessonId]);

  const dsModule = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of ds) m.set(c.moduleId, `${c.tenBai} › ${c.tenModule}`);
    return [...m.entries()];
  }, [ds]);

  const hien = ds.map((c, i) => ({ c, i })).filter(({ c }) => (!locModule || c.moduleId === locModule)
    && (!tim || String(c.quiz.question).toLowerCase().includes(tim.toLowerCase())));

  const daChon = Object.entries(chon).filter(([, v]) => v).map(([k]) => Number(k));
  const tongSeThem = daChon.reduce((s, i) => s + (tach[i] ? soYTachDuoc(ds[i].quiz) : 1), 0);
  const mucCua = (i: number) => muc[i] ?? ds[i]?.muc ?? 0;
  /* Câu chưa rõ mức trong số đang hiện (ưu tiên câu đã tick nếu có tick). */
  const chuaRo = (daChon.length ? daChon : hien.map(h => h.i)).filter(i => !mucCua(i));

  const doanMuc = async () => {
    if (!chuaRo.length || dangDoan) return;
    setBaoDoan('');
    setDangDoan({ xong: 0, tong: chuaRo.length });
    try {
      const kq = await doanMucDoNhieuCau(chuaRo.map(i => khoiQuizSangCauCanMucDo(String(i), ds[i].quiz)),
        (xong, tong) => setDangDoan({ xong, tong }));
      const moi: Record<number, number> = {};
      for (const [k, v] of Object.entries(kq)) moi[Number(k)] = Math.min(3, Number(v) || 0);
      setMuc(m => ({ ...m, ...moi }));
      const n = Object.keys(moi).length;
      setBaoDoan(n ? `AI đã đoán mức cho ${n}/${chuaRo.length} câu — xem lại rồi chỉnh chỗ nào chưa ưng.`
                   : 'AI không trả về mức nào (hết hạn mức hoặc lỗi mạng). Thử lại hoặc đặt tay.');
    } catch (e: any) {
      setBaoDoan(e?.message || 'AI đoán mức không chạy được.');
    } finally {
      setDangDoan(null);
    }
  };

  const datMucHangLoat = (m: number) => {
    if (!daChon.length) return;
    setMuc(cu => { const t = { ...cu }; for (const i of daChon) t[i] = m; return t; });
  };

  const them = () => {
    const khoi: any[] = [];
    for (const i of daChon) {
      const goc = { ...ds[i].quiz };
      const m = muc[i] ?? ds[i].muc;
      if (m) goc.muc = m;
      /* Bỏ lời giải rỗng để khối gọn */
      for (const con of (tach[i] ? tachYCau(goc) : [goc])) {
        if (m) con.muc = m;
        khoi.push(con);
      }
    }
    if (!khoi.length) return;
    onThem(khoi.map(k => '```quiz\n' + JSON.stringify(k, null, 2) + '\n```').join('\n\n'), khoi.length);
    onClose();
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-black text-slate-800">🎮 Nhập câu vào bộ câu hỏi trò chơi</h3>
            <p className="text-sm text-slate-500">Tick câu muốn lấy từ các phần đã soạn của bài / chương. Câu nhiều ý thì bấm <b>Tách</b> để mỗi ý thành một câu.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap gap-3 items-center">
          <select id="nhap-tro-choi-module" value={locModule} onChange={e => setLocModule(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium max-w-[420px]">
            <option value="">Mọi phần ({ds.length} câu)</option>
            {dsModule.map(([id, ten]) => <option key={id} value={id}>{ten} ({ds.filter(c => c.moduleId === id).length})</option>)}
          </select>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input id="nhap-tro-choi-tim" value={tim} onChange={e => setTim(e.target.value)} placeholder="Tìm trong đề…" className="flex-1 text-sm outline-none" />
          </div>
          <button onClick={() => { const t: Record<number, boolean> = {}; hien.forEach(({ i }) => { t[i] = true; }); setChon(c => ({ ...c, ...t })); }}
                  className="text-sm font-bold text-indigo-700 hover:underline">Chọn hết đang hiện</button>
          <button onClick={() => setChon({})} className="text-sm font-bold text-slate-500 hover:underline">Bỏ chọn</button>
        </div>

        {/* Hàng mức: AI đoán cho câu chưa rõ + đặt tay hàng loạt cho câu đã tick */}
        {!dangTai && ds.length > 0 && (
          <div className="px-6 py-2.5 border-b border-slate-100 bg-amber-50/60 flex flex-wrap gap-3 items-center text-sm">
            <button onClick={doanMuc} disabled={!chuaRo.length || !!dangDoan}
                    className="px-3 py-1.5 rounded-lg bg-violet-600 text-white font-bold hover:bg-violet-700 disabled:opacity-40 flex items-center gap-1.5">
              {dangDoan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {dangDoan ? `Đang đoán ${dangDoan.xong}/${dangDoan.tong}…`
                : `AI đoán mức cho ${chuaRo.length} câu chưa rõ${daChon.length ? ' đã tick' : ''}`}
            </button>
            <span className="text-slate-500">hoặc</span>
            <label className="flex items-center gap-2 text-slate-700 font-medium">
              đặt mức cho {daChon.length} câu đã tick:
              <select value="" disabled={!daChon.length} onChange={e => { if (e.target.value) datMucHangLoat(Number(e.target.value)); }}
                      className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-bold disabled:opacity-40">
                <option value="">— chọn —</option>
                <option value={1}>{TEN_MUC[1]} (±1)</option>
                <option value={2}>{TEN_MUC[2]} (±2)</option>
                <option value={3}>{TEN_MUC[3]} (±3)</option>
              </select>
            </label>
            {baoDoan && <span className="text-violet-800 font-medium">{baoDoan}</span>}
            {!baoDoan && !dangDoan && (
              <span className="text-slate-500">Mức quyết định điểm trong trò: chưa rõ thì tính ±1.</span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {dangTai && <div className="flex items-center gap-2 text-slate-500 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Đang tải câu…</div>}
          {loi && <div className="text-rose-600 font-bold">{loi}</div>}
          {!dangTai && !ds.length && <p className="text-slate-500 py-8 text-center">Bài và chương này chưa có câu tương tác nào ở các phần khác. Dùng "Rút từ Ngân hàng" để lấy câu từ kho.</p>}
          <div className="flex flex-col gap-2">
            {hien.map(({ c, i }) => {
              const soY = soYTachDuoc(c.quiz);
              const de = xuongDongNgoaiCongThuc(String(c.quiz.question)).replace(/!\[[^\]]*\]\([^)]*\)/g, '[hình]');
              return (
                <label key={i} className={`flex gap-3 items-start rounded-xl border p-3 cursor-pointer transition-colors ${chon[i] ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="checkbox" checked={!!chon[i]} onChange={e => setChon(ch => ({ ...ch, [i]: e.target.checked }))} className="mt-1.5 w-4 h-4" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold mb-1">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">{TEN_LOAI[c.quiz.type] || c.quiz.type}</span>
                      <span className="text-slate-400 truncate">{c.tenBai} › {c.tenModule}</span>
                      {soY >= 2 && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">{soY} ý</span>}
                    </div>
                    <div className="text-[13px] text-slate-800 whitespace-pre-line line-clamp-4 font-mono">{de}</div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5" onClick={e => e.preventDefault()}>
                    <select value={mucCua(i)} onChange={e => setMuc(m => ({ ...m, [i]: Number(e.target.value) }))}
                            className={`text-[11.5px] font-bold px-2 py-1 rounded border bg-white ${mucCua(i) ? 'border-slate-300' : 'border-amber-400 text-amber-800'}`}
                            title="Mức → điểm trong trò chơi">
                      <option value={0}>Mức: chưa rõ (±1)</option>
                      <option value={1}>{TEN_MUC[1]} (±1)</option>
                      <option value={2}>{TEN_MUC[2]} (±2)</option>
                      <option value={3}>{TEN_MUC[3]} (±3)</option>
                    </select>
                    {soY >= 2 && (
                      <button type="button" onClick={() => { setTach(t => ({ ...t, [i]: !t[i] })); setChon(ch => ({ ...ch, [i]: true })); }}
                              className={`text-[11.5px] font-bold px-2 py-1 rounded flex items-center gap-1 border ${tach[i] ? 'bg-amber-500 border-amber-500 text-white' : 'border-amber-400 text-amber-700 hover:bg-amber-50'}`}>
                        <Scissors className="w-3.5 h-3.5" /> {tach[i] ? `Tách ${soY} câu` : 'Tách ý'}
                      </button>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-sm text-slate-600">Đã chọn <b>{daChon.length}</b> câu → sẽ thêm <b>{tongSeThem}</b> câu vào bộ</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-50">Huỷ</button>
            <button onClick={them} disabled={!tongSeThem}
                    className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Thêm {tongSeThem} câu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
