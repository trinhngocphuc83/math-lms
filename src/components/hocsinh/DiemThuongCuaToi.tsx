"use client";

import React from "react";
import { Trophy, Loader2, Sparkles, ClipboardList, Dumbbell, TrendingUp, Globe } from "lucide-react";
import { diemCuaToi, tongDiemTichLuy, thangNay, thangTruoc, LOI_CHUA_TAO_BANG, type DongDiem } from "@/utils/goiTenVaDiem";

/**
 * Điểm thưởng của chính học sinh đang đăng nhập.
 *
 * Đọc thẳng ở trình duyệt được (không cần qua máy chủ như phần của thầy cô), vì quyền đã
 * mở đúng cho `student_id = auth.uid()` trong tệp SQL - em chỉ thấy điểm của mình.
 */

const NHAN_NGUON: Record<string, { ten: string; Icon: any; mau: string }> = {
  tuong_tac:  { ten: 'Phát biểu trên lớp', Icon: Sparkles,      mau: 'bg-violet-50 text-violet-600' },
  kiem_tra:   { ten: 'Bài kiểm tra',       Icon: ClipboardList, mau: 'bg-rose-50 text-rose-600' },
  luyen_tap:  { ten: 'Bài luyện tập',      Icon: Dumbbell,      mau: 'bg-teal-50 text-teal-600' },
  thi_online: { ten: 'Thi online',         Icon: Globe,         mau: 'bg-sky-50 text-sky-600' },
  tien_bo:    { ten: 'Thưởng tiến bộ',     Icon: TrendingUp,    mau: 'bg-amber-50 text-amber-600' },
};

export default function DiemThuongCuaToi() {
  const [thang, setThang] = React.useState(thangNay());
  const [tong, setTong] = React.useState(0);
  const [tongTruoc, setTongTruoc] = React.useState<number | null>(null);
  const [dong, setDong] = React.useState<DongDiem[]>([]);
  const [dangTai, setDangTai] = React.useState(true);
  const [chuaTaoBang, setChuaTaoBang] = React.useState(false);
  /** Tổng từ trước tới nay - con số này mới cho em thấy cả chặng đường đã đi. */
  const [tichLuy, setTichLuy] = React.useState<{ tong: number; soLan: number } | null>(null);

  React.useEffect(() => {
    let bo = false;
    tongDiemTichLuy().then(r => { if (!bo) setTichLuy(r); }).catch(() => { /* chưa bật bảng thì thôi */ });
    return () => { bo = true; };
  }, []);

  React.useEffect(() => {
    let bo = false;
    setDangTai(true); setChuaTaoBang(false);
    (async () => {
      try {
        const nay = await diemCuaToi(thang);
        if (bo) return;
        setTong(nay.tong); setDong(nay.dong);
        /* Tháng trước để em tự thấy mình tiến bộ bao nhiêu - đó mới là điều được thưởng. */
        try {
          const truoc = await diemCuaToi(thangTruoc(thang));
          if (!bo) setTongTruoc(truoc.dong.length > 0 ? truoc.tong : null);
        } catch { if (!bo) setTongTruoc(null); }
      } catch (e: any) {
        if (!bo && e?.message === LOI_CHUA_TAO_BANG) setChuaTaoBang(true);
      } finally {
        if (!bo) setDangTai(false);
      }
    })();
    return () => { bo = true; };
  }, [thang]);

  /* Sáu tháng gần nhất để chọn xem lại. */
  const cacThang = React.useMemo(() => {
    const ra = [thangNay()];
    for (let i = 0; i < 5; i++) ra.push(thangTruoc(ra[ra.length - 1]));
    return ra;
  }, []);

  const tang = tongTruoc === null ? null : tong - tongTruoc;

  if (chuaTaoBang) {
    return (
      <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-bold">
        Phần điểm thưởng chưa được bật. Em báo thầy cô nhé.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tổng điểm tháng */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-bold text-violet-100/90">Điểm thưởng tháng này</div>
            <div className="text-[42px] leading-none font-black mt-0.5">
              {dangTai ? <Loader2 className="w-8 h-8 animate-spin" /> : tong}
            </div>
            {tang !== null && !dangTai && (
              <div className="text-[13px] font-bold text-violet-100 mt-1.5">
                {tang > 0 && `Tăng ${tang} điểm so với tháng trước — cố lên em! 🎉`}
                {tang === 0 && 'Bằng tháng trước — cố thêm chút nữa nhé!'}
                {tang < 0 && `Ít hơn tháng trước ${Math.abs(tang)} điểm — tháng này gỡ lại nhé!`}
              </div>
            )}
          </div>
          <select value={thang} onChange={e => setThang(e.target.value)}
                  className="shrink-0 px-2 py-1.5 rounded-lg bg-white/15 border border-white/25 text-[12.5px] text-white outline-none">
            {cacThang.map(t => (
              <option key={t} value={t} className="text-slate-800">
                Tháng {t.split('-').reverse().join('/')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Điểm TÍCH LUỸ từ trước tới nay - ô tháng ở trên chỉ nói được một tháng. */}
      {tichLuy && tichLuy.soLan > 0 && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-bold text-amber-800">Điểm tích luỹ từ trước tới nay</div>
            <div className="text-[32px] leading-none font-black text-amber-700 mt-0.5">{tichLuy.tong}</div>
            <div className="text-[12.5px] text-amber-700/80 mt-1">
              Qua {tichLuy.soLan} lần được cộng / trừ điểm
            </div>
          </div>
        </div>
      )}

      {/* Từng lần cộng/trừ */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[11.5px] font-black text-gray-500 uppercase tracking-wide">
          Từng lần cộng / trừ
        </div>
        {dangTai ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : dong.length === 0 ? (
          <p className="p-6 text-center text-gray-400 text-sm">
            Tháng này chưa có điểm nào. Phát biểu trên lớp và làm bài luyện tập để có điểm nhé!
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {dong.map((d, i) => {
              const n = NHAN_NGUON[d.nguon] || { ten: d.nguon, Icon: Sparkles, mau: 'bg-gray-50 text-gray-500' };
              const duong = Number(d.diem) > 0;
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.mau}`}>
                    <n.Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-gray-800 truncate">{d.ly_do || n.ten}</div>
                    <div className="text-[11.5px] text-gray-400">
                      {n.ten} · {new Date(d.created_at).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  <div className={`text-[19px] font-black shrink-0 ${duong ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {duong ? '+' : ''}{d.diem}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-[11.5px] text-gray-400 leading-relaxed px-1">
        Điểm thưởng cộng từ: phát biểu đúng trên lớp, bài luyện tập và bài kiểm tra đạt từ 7
        điểm trở lên, và thưởng thêm khi bài sau tiến bộ hơn bài trước.
      </p>
    </div>
  );
}
