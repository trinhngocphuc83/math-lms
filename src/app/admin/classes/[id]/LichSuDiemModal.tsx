"use client";

import React from "react";
import {
  X, Loader2, Trash2, Trophy, Sparkles, ClipboardList, Dumbbell, TrendingUp, Globe,
} from "lucide-react";
import { layLichSuDiem, xoaDongDiem, type DongLichSu } from "@/app/actions/goiTenVaDiem";
import { LOI_CHUA_TAO_BANG } from "@/utils/goiTenVaDiem";

/**
 * Lịch sử cộng/trừ điểm của MỘT em - mọi tháng, mọi lớp.
 *
 * Vì sao cần: bảng tổng kết chỉ cho một con số tổng của tháng. Em nào thắc mắc "sao con
 * ít điểm thế", hay Thầy cô ngờ máy cộng nhầm, thì trước đây không có chỗ nào tra ra em
 * ấy được cộng những gì, ai cộng, vì bài nào. Đây là chỗ tra - và xoá được dòng cộng
 * nhầm ngay tại chỗ.
 *
 * Nhãn nguồn dùng ĐÚNG bộ nhãn bên phía học sinh (DiemThuongCuaToi), để hai bên gọi tên
 * một thứ giống nhau, khỏi cãi nhau vì cách gọi.
 */

const NHAN_NGUON: Record<string, { ten: string; Icon: any; mau: string }> = {
  tuong_tac:  { ten: 'Phát biểu trên lớp', Icon: Sparkles,      mau: 'bg-violet-50 text-violet-600' },
  kiem_tra:   { ten: 'Bài kiểm tra',       Icon: ClipboardList, mau: 'bg-rose-50 text-rose-600' },
  luyen_tap:  { ten: 'Bài luyện tập',      Icon: Dumbbell,      mau: 'bg-teal-50 text-teal-600' },
  thi_online: { ten: 'Thi online',         Icon: Globe,         mau: 'bg-sky-50 text-sky-600' },
  tien_bo:    { ten: 'Thưởng tiến bộ',     Icon: TrendingUp,    mau: 'bg-amber-50 text-amber-600' },
};

export default function LichSuDiemModal({ hs, onClose }: {
  hs: { id: string; ten: string } | null;
  onClose: () => void;
}) {
  const [ds, setDs] = React.useState<DongLichSu[]>([]);
  const [dangTai, setDangTai] = React.useState(false);
  const [dangXoa, setDangXoa] = React.useState('');
  const [bao, setBao] = React.useState('');

  const nap = React.useCallback(async () => {
    if (!hs) return;
    setDangTai(true); setBao('');
    try {
      setDs(await layLichSuDiem(hs.id));
    } catch (e: any) {
      setBao(e?.message === LOI_CHUA_TAO_BANG
        ? 'Chưa tạo bảng dữ liệu điểm thưởng.'
        : 'Không đọc được: ' + (e?.message || ''));
    } finally {
      setDangTai(false);
    }
  }, [hs]);

  React.useEffect(() => { nap(); }, [nap]);

  if (!hs) return null;

  const xoa = async (d: DongLichSu) => {
    if (!confirm(`Xoá dòng điểm này?\n\n${d.diem > 0 ? '+' : ''}${d.diem} — ${d.ly_do || NHAN_NGUON[d.nguon]?.ten || d.nguon}`)) return;
    setDangXoa(d.id);
    const r = await xoaDongDiem(d.id);
    setDangXoa('');
    if (!r.xoaDuoc) { setBao(r.vi || 'Không xoá được.'); return; }
    await nap();
  };

  const tong = ds.reduce((s, d) => s + d.diem, 0);

  /* Gom theo tháng, giữ đúng thứ tự mới nhất trước như máy chủ trả về. */
  const theoThang: { thang: string; dong: DongLichSu[] }[] = [];
  for (const d of ds) {
    const cuoi = theoThang[theoThang.length - 1];
    if (cuoi && cuoi.thang === d.thang) cuoi.dong.push(d);
    else theoThang.push({ thang: d.thang, dong: [d] });
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col"
           onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-black text-gray-800 truncate">{hs.ten}</div>
            <div className="text-[12.5px] text-gray-500">
              Lịch sử điểm thưởng · tổng cộng{' '}
              <b className={tong > 0 ? 'text-emerald-600' : 'text-gray-600'}>{tong}</b> điểm
              qua {ds.length} lần
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        {bao && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[13px] font-bold">
            {bao}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {dangTai ? (
            <div className="p-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-gray-300" /></div>
          ) : ds.length === 0 ? (
            <p className="p-8 text-center text-gray-400 text-sm">
              Em này chưa có lần cộng/trừ điểm nào.
            </p>
          ) : (
            <div className="space-y-5">
              {theoThang.map(nhom => (
                <div key={nhom.thang}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11.5px] font-black text-gray-500 uppercase tracking-wide">
                      Tháng {nhom.thang.split('-').reverse().join('/')}
                    </span>
                    <span className="text-[12px] font-black text-emerald-600">
                      {nhom.dong.reduce((s, d) => s + d.diem, 0) > 0 ? '+' : ''}
                      {nhom.dong.reduce((s, d) => s + d.diem, 0)}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                    {nhom.dong.map(d => {
                      const n = NHAN_NGUON[d.nguon] || { ten: d.nguon, Icon: Sparkles, mau: 'bg-gray-50 text-gray-500' };
                      return (
                        <div key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.mau}`}>
                            <n.Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13.5px] font-bold text-gray-800 truncate">
                              {d.ly_do || n.ten}
                            </div>
                            <div className="text-[11.5px] text-gray-400 truncate">
                              {n.ten}
                              {d.lop && ` · ${d.lop}`}
                              {' · '}{new Date(d.luc).toLocaleDateString('vi-VN')}
                              {d.nguoiTao ? ` · ${d.nguoiTao} cộng` : ' · máy tự cộng'}
                            </div>
                          </div>
                          <div className={`text-[17px] font-black shrink-0 ${d.diem > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {d.diem > 0 ? '+' : ''}{d.diem}
                          </div>
                          <button onClick={() => xoa(d)} disabled={!!dangXoa}
                                  title="Xoá dòng điểm cộng nhầm"
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-40 shrink-0">
                            {dangXoa === d.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 text-[11.5px] text-gray-400">
          Đây là đúng những gì em nhìn thấy trong mục <b>Điểm thưởng</b> của tài khoản học sinh.
        </div>
      </div>
    </div>
  );
}
