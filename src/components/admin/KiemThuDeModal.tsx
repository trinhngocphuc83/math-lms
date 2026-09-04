"use client";

import React from "react";
import {
  X, ShieldCheck, AlertTriangle, AlertCircle, Info, Loader2, Bot, CheckCircle2, Wrench,
} from "lucide-react";
import {
  soatCaDe, chamDiem, loiKetLuan, TIEU_CHI,
  type KetQuaKiemThu, type LoiKiemThu, type MaTieuChi, type ChiTieuLoaiSoat,
} from "@/utils/kiemThuDe";
import { soiNoiDungBangAI, type CauSoiNoiDung, type TienDoSoi } from "@/utils/soiNoiDungAI";
import { nhanViTri } from "@/utils/kiemThuDe";
import type { PhanDeThi } from "@/utils/deThi";
import type { BankType } from "@/utils/questionTypes";
import { suaDuocBang, suaBangMay, suaBangAI, type BanVa } from "@/utils/suaLoiKiemThu";
import SuaHangLoatModal, { type MucSuaHangLoat } from "@/components/admin/SuaHangLoatModal";
import type { CauDeSoat } from "@/utils/kiemThuDe";
import SuaLoiModal from "./SuaLoiModal";

/**
 * Bảng kiểm thử đề thi - theo Sổ tay Kiểm thử của Thầy cô.
 *
 * Chia làm hai lượt rõ ràng:
 *   - Mở khung ra là soi ngay phần CHẠY BẰNG MÃ (cấu trúc, công thức, lời giải, thẩm mỹ).
 *     Tức thì, không tốn lượt AI nào.
 *   - Muốn biết ĐỀ CÓ SAI NỘI DUNG KHÔNG thì bấm thêm nút soi bằng AI: máy che đáp án đi
 *     rồi tự giải lại từ đầu, câu nào lệch mới soi lại lần hai để chốt.
 *
 * Không tự sửa gì cả - chỉ chỉ chỗ hỏng và cách sửa.
 */

const MAU_MUC = {
  loi: { nen: 'bg-rose-50 border-rose-200', chu: 'text-rose-700', Icon: AlertCircle, ten: 'Lỗi' },
  canhBao: { nen: 'bg-amber-50 border-amber-200', chu: 'text-amber-700', Icon: AlertTriangle, ten: 'Cảnh báo' },
  nhac: { nen: 'bg-slate-50 border-slate-200', chu: 'text-slate-600', Icon: Info, ten: 'Nhắc' },
} as const;

function ThanhDiem({ diem }: { diem: number }) {
  const mau = diem >= 90 ? 'bg-emerald-500' : diem >= 70 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
      <div className={`h-full ${mau}`} style={{ width: `${Math.max(2, diem)}%` }} />
    </div>
  );
}

export default function KiemThuDeModal({
  mo, onDong, cacPhan, chiTieu, diemPhan, tenKhuon, dongMaTran,
}: {
  mo: boolean;
  onDong: () => void;
  cacPhan: PhanDeThi[];
  chiTieu?: Partial<Record<BankType, ChiTieuLoaiSoat>>;
  diemPhan?: Record<string, number>;
  tenKhuon?: string;
  dongMaTran?: { ten: string; can: number; co: number }[];
}) {
  const [kq, setKq] = React.useState<KetQuaKiemThu | null>(null);
  const [loiAI, setLoiAI] = React.useState<LoiKiemThu[] | null>(null);
  const [dangSoiAI, setDangSoiAI] = React.useState(false);
  const [tienDo, setTienDo] = React.useState<TienDoSoi | null>(null);
  const [baoAI, setBaoAI] = React.useState('');
  /* Bản vá đang chờ Thầy cô soi trước khi lưu. */
  const [banVa, setBanVa] = React.useState<{ cau: CauDeSoat; va: BanVa; ghiChu: string[]; moTa: string } | null>(null);
  const [dangSuaMa, setDangSuaMa] = React.useState('');
  const [baoSua, setBaoSua] = React.useState('');
  /* Những câu đã sửa và lưu trong phiên này - vá luôn vào bản đang cầm để soi lại cho đúng. */
  const [daVa, setDaVa] = React.useState<Record<string, BanVa>>({});

  /* Những lỗi đang được tick để sửa hàng loạt, khoá là "mã lỗi|id câu". */
  const [dsTick, setDsTick] = React.useState<Set<string>>(new Set());
  const [dsHangLoat, setDsHangLoat] = React.useState<MucSuaHangLoat[] | null>(null);
  const [dangChayLoat, setDangChayLoat] = React.useState(0);

  React.useEffect(() => {
    if (!mo) return;
    setLoiAI(null); setBaoAI(''); setTienDo(null);
    setKq(soatCaDe({ cacPhan, chiTieu, diemPhan, tenKhuon, dongMaTran }));
  }, [mo, cacPhan, chiTieu, diemPhan, tenKhuon, dongMaTran]);

  if (!mo || !kq) return null;

  /* Gộp lỗi máy soi và lỗi AI soi rồi chấm lại điểm trên toàn bộ. */
  const tatCaLoi = [...kq.loi, ...(loiAI || [])];
  const tong = { ...chamDiem(tatCaLoi, kq.soCau), soCau: kq.soCau };
  const ketLuan = loiKetLuan({ loi: tatCaLoi });

  const soiBangAI = async () => {
    setDangSoiAI(true); setBaoAI('');
    try {
      const ds: CauSoiNoiDung[] = [];
      for (const phan of cacPhan) {
        phan.cauHoi.forEach((q: any, i: number) => ds.push({
          id: q.id, viTri: nhanViTri(phan, i + 1),
          question_type: q.question_type, content: q.content,
          option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
          correct_answer: q.correct_answer, image_url: q.image_url,
        }));
      }
      const r = await soiNoiDungBangAI(ds, setTienDo);
      setLoiAI(r);
      setBaoAI(r.length === 0
        ? 'Đã tự giải lại toàn bộ đề, không thấy câu nào sai nội dung.'
        : `Soi xong: ${r.filter(x => x.muc === 'loi').length} lỗi nội dung, ${r.filter(x => x.muc === 'canhBao').length} chỗ nghi ngờ.`);
    } catch (e: any) {
      setBaoAI('Không soi được: ' + (e?.message || 'lỗi không rõ'));
    } finally {
      setDangSoiAI(false); setTienDo(null);
    }
  };

  /** Câu hỏi ứng với một dòng lỗi, đã vá những gì vừa lưu trong phiên này. */
  const timCau = (cauId?: string): CauDeSoat | null => {
    if (!cauId) return null;
    for (const phan of cacPhan) {
      const q = (phan.cauHoi as any[]).find(x => x?.id === cauId);
      if (q) return { ...q, ...(daVa[cauId] || {}) };
    }
    return null;
  };

  /**
   * Bấm "Sửa" ở một dòng lỗi.
   *
   * Lỗi máy tự sửa được thì ra bản vá ngay; lỗi phải nhờ AI thì gọi một lượt. Cả hai
   * đường đều KHÔNG ghi thẳng vào ngân hàng - chỉ mở bảng so sánh cho Thầy cô gật đầu.
   */
  const chaySua = async (l: LoiKiemThu) => {
    const cau = timCau(l.cauId);
    if (!cau) return;
    const khoa = `${l.ma}|${l.cauId}`;
    setDangSuaMa(khoa); setBaoSua('');
    try {
      const cach = suaDuocBang(l.ma);
      const r = cach === 'ai' ? await suaBangAI(cau, l.ma) : suaBangMay(cau, l.ma, l.deXuat);
      if (!r) { setBaoSua(`${l.viTri}: không tự sửa được chỗ này, Thầy/Cô sửa tay giúp.`); return; }
      setBanVa({ cau, va: r.va, ghiChu: r.ghiChu, moTa: `${l.viTri} — ${l.moTa}` });
    } catch (e: any) {
      setBaoSua('Không sửa được: ' + (e?.message || 'lỗi không rõ'));
    } finally {
      setDangSuaMa('');
    }
  };

  const daLuuXong = (cauId: string, va: BanVa) => {
    /* Vá vào bản đang cầm rồi soi lại từ đầu, để dòng lỗi vừa sửa tự biến mất. */
    const moi = { ...daVa, [cauId]: { ...(daVa[cauId] || {}), ...va } };
    setDaVa(moi);
    for (const phan of cacPhan) {
      const q = (phan.cauHoi as any[]).find(x => x?.id === cauId);
      if (q) Object.assign(q, va);
    }
    setKq(soatCaDe({ cacPhan, chiTieu, diemPhan, tenKhuon, dongMaTran }));
    setLoiAI(cu => (cu ? cu.filter(x => x.cauId !== cauId) : cu));
    setBaoSua('Đã lưu vào ngân hàng câu hỏi.');
  };

  const theoMuc = (m: 'loi' | 'canhBao' | 'nhac') => tatCaLoi.filter(l => l.muc === m);

  const khoaLoi = (l: LoiKiemThu) => `${l.ma}|${l.cauId}`;
  const suaDuoc = (l: LoiKiemThu) => !!l.cauId && !!suaDuocBang(l.ma);
  const doiTick = (l: LoiKiemThu) => setDsTick(prev => {
    const n = new Set(prev); const k = khoaLoi(l);
    n.has(k) ? n.delete(k) : n.add(k); return n;
  });
  const tickCaKhoi = (ds: LoiKiemThu[], bat: boolean) => setDsTick(prev => {
    const n = new Set(prev);
    ds.filter(suaDuoc).forEach(l => (bat ? n.add(khoaLoi(l)) : n.delete(khoaLoi(l))));
    return n;
  });

  /**
   * Sửa hàng loạt những lỗi đang tick.
   *
   * Hai điều phải giữ đúng, khác hẳn việc chạy vòng lặp bấm từng nút:
   *  - Nhiều lỗi có thể cùng trỏ vào MỘT câu (lời giải dồn dòng + đáp án lệch chẳng hạn).
   *    Phải GỘP bản vá theo từng câu rồi mới ghi, không thì bản sau đè mất bản trước.
   *  - Máy vẫn không tự ghi. Chạy xong mở bảng duyệt chung, gật đầu mới lưu.
   */
  const chayHangLoat = async () => {
    const ds = tatCaLoi.filter(l => suaDuoc(l) && dsTick.has(khoaLoi(l)));
    if (ds.length === 0) return;
    setBaoSua(''); setDangChayLoat(1);
    const gom = new Map<string, MucSuaHangLoat>();
    const hong: string[] = [];
    for (let i = 0; i < ds.length; i++) {
      const l = ds[i];
      setDangChayLoat(i + 1);
      const goc = timCau(l.cauId);
      if (!goc) continue;
      /* Lỗi thứ hai của cùng một câu phải nhìn thấy bản vá của lỗi trước, không thì hai
         bản vá dựng trên hai gốc khác nhau rồi đè nhau. */
      const dangCo = gom.get(l.cauId!);
      const cauHienTai = dangCo ? { ...goc, ...dangCo.va } : goc;
      try {
        const cach = suaDuocBang(l.ma);
        const r = cach === 'ai' ? await suaBangAI(cauHienTai, l.ma) : suaBangMay(cauHienTai, l.ma, l.deXuat);
        if (!r) { hong.push(l.viTri); continue; }
        gom.set(l.cauId!, {
          cau: goc,
          va: { ...(dangCo?.va || {}), ...r.va },
          ghiChu: [...(dangCo?.ghiChu || []), ...r.ghiChu],
          moTa: [...(dangCo?.moTa || []), `${l.viTri} — ${l.moTa}`],
        });
      } catch (e: any) {
        hong.push(`${l.viTri} (${e?.message || 'lỗi'})`);
      }
    }
    setDangChayLoat(0);
    const ra = [...gom.values()];
    if (ra.length === 0) {
      setBaoSua('Không tự sửa được chỗ nào trong số đã chọn, Thầy/Cô sửa tay giúp.');
      return;
    }
    if (hong.length) setBaoSua(`${hong.length} chỗ không tự sửa được: ${hong.slice(0, 3).join('; ')}`);
    setDsHangLoat(ra);
  };

  const KhoiLoi = ({ muc }: { muc: 'loi' | 'canhBao' | 'nhac' }) => {
    const ds = theoMuc(muc);
    if (ds.length === 0) return null;
    const { nen, chu, Icon, ten } = MAU_MUC[muc];
    return (
      <div className="mb-5">
        <div className={`flex items-center gap-2 mb-2 font-black text-[13px] ${chu}`}>
          <Icon className="w-4 h-4" /> {ten} ({ds.length})
          {/* Sửa hàng loạt: tick nhiều chỗ rồi sửa một lượt, đỡ phải bấm từng nút. */}
          {ds.some(suaDuoc) && (
            <span className="ml-auto flex items-center gap-1.5 font-bold text-[11.5px] text-slate-500">
              <button onClick={() => tickCaKhoi(ds, true)}
                      className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50">
                Chọn hết
              </button>
              <button onClick={() => tickCaKhoi(ds, false)}
                      className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50">
                Bỏ hết
              </button>
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {ds.map((l, i) => (
            <div key={i} className={`rounded-xl border px-3 py-2 ${nen}`}>
              <div className="flex items-start gap-2">
                {suaDuoc(l) && (
                  <input
                    type="checkbox"
                    checked={dsTick.has(khoaLoi(l))}
                    onChange={() => doiTick(l)}
                    title="Chọn để sửa hàng loạt"
                    className="mt-1 w-4 h-4 accent-emerald-600 shrink-0"
                  />
                )}
                <span className="shrink-0 text-[11px] font-black bg-white/70 border border-current/20 rounded px-1.5 py-0.5 mt-[1px]">
                  {l.viTri}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-slate-800">{l.moTa}</div>
                  <div className="text-[12.5px] text-slate-500 mt-0.5">→ {l.cachSua}</div>
                </div>
                {/* Sửa được thì cho bấm ngay tại dòng. Nhờ AI thì ghi rõ để Thầy cô biết
                    là sẽ tốn lượt và mất mấy giây. */}
                {l.cauId && suaDuocBang(l.ma) && (
                  <button
                    onClick={() => chaySua(l)}
                    disabled={!!dangSuaMa}
                    title={suaDuocBang(l.ma) === 'ai'
                      ? 'Nhờ AI sửa chỗ này rồi cho xem trước'
                      : 'Máy tự sửa chỗ này rồi cho xem trước'}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11.5px] font-black
                               bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    {dangSuaMa === `${l.ma}|${l.cauId}`
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : suaDuocBang(l.ma) === 'ai' ? <Bot className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
                    {suaDuocBang(l.ma) === 'ai' ? 'Nhờ AI sửa' : 'Sửa'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={onDong}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
           onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-teal-700" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-black text-gray-800">Kiểm thử đề thi</div>
            <div className="text-[12.5px] text-gray-500">
              {tong.soCau} câu · {theoMuc('loi').length} lỗi · {theoMuc('canhBao').length} cảnh báo
            </div>
          </div>
          <div className="text-right shrink-0 mr-2">
            <div className={`text-[30px] leading-none font-black ${
              tong.diem >= 90 ? 'text-emerald-600' : tong.diem >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
              {tong.diem}
            </div>
            <div className="text-[11px] text-gray-400 font-bold">ĐIỂM CHẤT LƯỢNG</div>
          </div>
          <button onClick={onDong} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Câu trả lời thẳng cho việc Thầy cô đang cần: in được chưa? */}
        <div className={`mx-5 mt-3 px-4 py-2.5 rounded-xl border font-bold text-[13.5px] flex items-center gap-2 ${
          ketLuan.xong ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                       : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {ketLuan.xong ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {ketLuan.chu}
        </div>

        {/* Bốn tiêu chí theo đúng trọng số trong Sổ tay */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3 border-b border-gray-100">
          {(Object.keys(TIEU_CHI) as MaTieuChi[]).map(ma => (
            <div key={ma}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[11.5px] font-bold text-slate-600 truncate">{TIEU_CHI[ma].ten}</span>
                <span className="text-[11px] text-slate-400 shrink-0 ml-1">{TIEU_CHI[ma].trong}%</span>
              </div>
              <ThanhDiem diem={tong.theoTieuChi[ma].diem} />
              <div className="text-[11px] text-slate-500 mt-1">
                {tong.theoTieuChi[ma].soLoi} lỗi · {tong.theoTieuChi[ma].soCanhBao} cảnh báo
              </div>
            </div>
          ))}
        </div>

        {/* Soi nội dung bằng AI - việc tốn lượt AI nên tách riêng, Thầy cô tự bấm */}
        <div className="px-5 py-3 border-b border-gray-100 bg-slate-50/70">
          {loiAI === null ? (
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={soiBangAI} disabled={dangSoiAI}
                      className="bg-violet-600 text-white px-4 py-2 rounded-xl font-bold text-[13px]
                                 flex items-center gap-2 hover:bg-violet-700 disabled:opacity-60">
                {dangSoiAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                Soi nội dung bằng AI
              </button>
              <span className="text-[12.5px] text-slate-500">
                {dangSoiAI && tienDo
                  ? `${tienDo.viec} (${tienDo.xong}/${tienDo.tong} câu)`
                  : 'Máy che đáp án rồi tự giải lại cả đề để tìm câu sai nội dung. Tốn lượt AI và mất vài phút.'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[13px] font-bold text-violet-800">
              <CheckCircle2 className="w-4 h-4" /> {baoAI}
            </div>
          )}
          {baoAI && loiAI === null && (
            <div className="mt-2 text-[12.5px] font-bold text-rose-600">{baoAI}</div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tatCaLoi.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="font-bold text-slate-700">Không thấy lỗi nào.</p>
              <p className="text-[13px] text-slate-500 mt-1">
                Đề đã qua được toàn bộ luật rà soát chạy bằng mã.
              </p>
            </div>
          ) : (
            <>
              <KhoiLoi muc="loi" />
              <KhoiLoi muc="canhBao" />
              <KhoiLoi muc="nhac" />
            </>
          )}
        </div>

        {baoSua && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-[12.5px] font-bold">
            {baoSua}
          </div>
        )}

        <div className="px-5 py-3 border-t border-gray-200 flex items-center gap-3">
          <span className="text-[11.5px] text-gray-400 flex-1 min-w-0">
            Sửa xong đều hiện bảng so sánh trước/sau, có gật đầu mới ghi vào ngân hàng câu hỏi.
          </span>
          {dsTick.size > 0 && (
            <button
              onClick={chayHangLoat}
              disabled={dangChayLoat > 0 || !!dangSuaMa}
              className="shrink-0 bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-[13px]
                         flex items-center gap-2 hover:bg-slate-900 disabled:opacity-50"
            >
              {dangChayLoat > 0
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang sửa {dangChayLoat}/{dsTick.size}...</>
                : <><Wrench className="w-4 h-4" /> Sửa {dsTick.size} chỗ đã chọn</>}
            </button>
          )}
        </div>
      </div>

      <SuaLoiModal
        cau={banVa?.cau || null}
        va={banVa?.va || null}
        moTaLoi={banVa?.moTa || ''}
        ghiChu={banVa?.ghiChu || []}
        onDong={() => setBanVa(null)}
        onDaLuu={daLuuXong}
      />

      {dsHangLoat && (
        <SuaHangLoatModal
          ds={dsHangLoat}
          onDong={() => { setDsHangLoat(null); setDsTick(new Set()); }}
          onDaLuu={daLuuXong}
        />
      )}
    </div>
  );
}
