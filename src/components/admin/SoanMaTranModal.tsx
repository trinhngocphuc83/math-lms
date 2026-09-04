"use client";

import { useState } from "react";
import { X, Loader2, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { layCauHinhAI } from "@/utils/geminiBrowser";
import {
  soanMaTranBangAI, doiChieuChiTieu, demTheoMuc,
  type ODeChon, type DongMaTranAI,
} from "@/utils/soanMaTranAI";
import {
  bankTypeLabel, difficultyLabel, BANK_TYPES, DIFFICULTY_CODES,
  type BankType,
} from "@/utils/questionTypes";
import { MUC_DO_BO, type KhuonDe } from "@/utils/deThi";

/**
 * Nhờ AI soạn ma trận từ đầu, cho lúc thầy cô chưa có ma trận nào trong tay.
 *
 * Máy chỉ được chọn trong những ô kho ĐANG CÓ CÂU; dòng nào máy bịa ra mà kho không có
 * thì bị loại và liệt kê rõ. Bảng soát luôn hiện trước, sửa được cả Bài, Dạng, Loại câu,
 * Mức độ lẫn số câu từng dòng, và chỉ khi bấm nhận mới ghi vào ma trận.
 */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Các ô kho đang có câu, đã lọc theo lớp/phân môn/chương đang chọn. */
  oKho: ODeChon[];
  khuon: KhuonDe;
  tenKhuon: string;
  onNhan: (dong: DongMaTranAI[]) => void;
  /** Yêu cầu cần đạt của từng dạng, khoá là tên dạng. */
  yeuCau?: Map<string, string>;
  /** Lưu yêu cầu vừa sửa ngược vào danh mục. */
  onLuuYeuCau?: (dang: string, chu: string, bai?: string) => void;
}

export default function SoanMaTranModal({ isOpen, onClose, oKho, khuon, tenKhuon, onNhan, yeuCau, onLuuYeuCau }: Props) {
  const [ghiChu, setGhiChu] = useState("");
  const [dangChay, setDangChay] = useState(false);
  const [tienDo, setTienDo] = useState("");
  const [loi, setLoi] = useState("");
  const [dong, setDong] = useState<DongMaTranAI[] | null>(null);
  const [biLoai, setBiLoai] = useState<string[]>([]);
  const [model, setModel] = useState("");
  /** Yêu cầu cần đạt Thầy cô vừa sửa tại bảng, khoá là tên dạng. */
  const [yeuCauSua, setYeuCauSua] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const dongLai = () => {
    setDong(null); setLoi(""); setTienDo(""); setModel(""); setBiLoai([]); setYeuCauSua({});
    onClose();
  };

  const chay = async () => {
    setDangChay(true); setLoi(""); setDong(null);
    try {
      setTienDo("Đang xin khoá AI...");
      const cauHinh = await layCauHinhAI();
      const kq = await soanMaTranBangAI(oKho, khuon, tenKhuon, ghiChu, cauHinh, setTienDo);
      if (kq.dong.length === 0) {
        setLoi("Máy không đề xuất được dòng nào khớp với kho. Thử mở rộng phạm vi chương/bài rồi làm lại.");
        setBiLoai(kq.dongBiLoai);
      } else {
        setDong(kq.dong); setBiLoai(kq.dongBiLoai); setModel(kq.model);
      }
    } catch (e: any) {
      setLoi(e?.message || "Không gọi được AI.");
    } finally {
      setDangChay(false); setTienDo("");
    }
  };

  /* ---------- Danh sách để chọn, dựng từ chính kho ---------- */

  // Tên bài kiểu "Bài 2. ..." nên phải so sánh có nhận số, không thì Bài 10 đứng trước Bài 2.
  const soSanhTen = (a: string, b: string) => a.localeCompare(b, "vi", { numeric: true });

  const dsBai = [...new Set(oKho.map(o => o.lesson))].sort(soSanhTen);
  const dangCuaBai = (bai: string) =>
    [...new Set(oKho.filter(o => o.lesson === bai).map(o => o.math_form))].sort(soSanhTen);

  const soKhoCua = (d: Pick<DongMaTranAI, "math_form" | "question_type" | "difficulty">) =>
    oKho.find(o => o.math_form === d.math_form && o.question_type === d.question_type
      && String(o.difficulty) === String(d.difficulty))?.soCau ?? 0;

  /* ---------- Sửa từng dòng ---------- */

  /**
   * Đổi Bài xong thì Dạng cũ thường không còn thuộc bài mới nữa - phải kéo Dạng theo, và
   * lấy lại Chương theo ô kho tương ứng. Không làm bước này thì dòng trỏ vào một ô không
   * có thật, đến lúc chọn câu mới lòi ra là chẳng lấy được câu nào.
   *
   * Kéo theo thì ưu tiên dạng CÒN CÂU đúng loại và mức đang chọn, chứ không lấy bừa dạng
   * đầu bảng chữ cái - lấy bừa thì đổi Bài xong hay rơi ngay vào ô rỗng, thầy cô lại phải
   * dò tiếp một vòng nữa.
   */
  const chinhLai = (d: DongMaTranAI): DongMaTranAI => {
    const dsDang = dangCuaBai(d.lesson);
    const math_form = dsDang.includes(d.math_form)
      ? d.math_form
      : (dsDang.find(m => soKhoCua({ ...d, math_form: m }) > 0) || dsDang[0] || d.math_form);
    const o = oKho.find(x => x.lesson === d.lesson && x.math_form === math_form);
    return { ...d, math_form, topic: o?.topic || d.topic };
  };

  /**
   * Sửa phân loại thì BỎ luôn lời giải thích của máy: câu đó nói vì sao máy chọn dạng và
   * loại cũ, giữ lại chỉ khiến thầy cô đọc nhầm là máy tán thành lựa chọn mới.
   */
  const sua = (i: number, thayDoi: Partial<DongMaTranAI>) =>
    setDong(prev => prev
      ? prev.map((d, k) => (k === i ? chinhLai({ ...d, ...thayDoi, lyDo: undefined }) : d))
      : prev);

  const suaSoCau = (i: number, v: number) =>
    setDong(prev => prev ? prev.map((d, k) => (k === i ? { ...d, soCau: Math.max(1, v) } : d)) : prev);

  const xoaDong = (i: number) =>
    setDong(prev => prev ? prev.filter((_, k) => k !== i) : prev);

  /* ---------- Soát lại sau khi sửa ---------- */

  // Trang ma trận đánh dấu dòng bằng dạng + loại + mức, hai dòng trùng bộ ba này sẽ đè
  // nhau lúc nhận vào. Bắt tại đây để thầy cô sửa, hơn là để ma trận hụt dòng lúc nào
  // không hay.
  const khoaDong = (d: DongMaTranAI) => [d.math_form, d.question_type, d.difficulty].join("|");
  const demKhoa = new Map<string, number>();
  for (const d of dong || []) demKhoa.set(khoaDong(d), (demKhoa.get(khoaDong(d)) || 0) + 1);
  const soDongTrung = [...demKhoa.values()].filter(n => n > 1).length;

  const oChon = "w-full px-2 py-1.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-fuchsia-400 cursor-pointer";

  const chiTieu = dong ? doiChieuChiTieu(dong, khuon) : [];
  const theoMuc = dong ? demTheoMuc(dong) : null;
  const tongCau = dong ? dong.reduce((s, d) => s + d.soCau, 0) : 0;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1200px] max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-fuchsia-100 bg-fuchsia-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-5 h-5 text-fuchsia-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-black text-fuchsia-900 truncate">AI soạn ma trận</h2>
            {model && <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white border border-fuchsia-300 text-fuchsia-700">{model}</span>}
          </div>
          <button onClick={dongLai} className="p-2 text-fuchsia-600 hover:bg-fuchsia-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {!dong && (
            <>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[13px]">
                <div className="font-black text-gray-800 mb-1">Cấu trúc đề: {tenKhuon}</div>
                <div className="text-gray-600">{khuon.moTa}</div>
                <div className="text-gray-500 mt-1.5">
                  Kho trong phạm vi đang chọn có <b>{oKho.length}</b> ô còn câu
                  {" "}(tổng <b>{oKho.reduce((s, o) => s + o.soCau, 0)}</b> câu).
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-gray-600 uppercase">Dặn thêm cho máy (không bắt buộc)</label>
                <textarea
                  value={ghiChu}
                  onChange={e => setGhiChu(e.target.value)}
                  rows={2}
                  placeholder="VD: tập trung vào Bài 1 và Bài 2; đừng ra câu về tiệm cận xiên; phần tự luận nên là bài toán thực tế..."
                  className="mt-1 w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-fuchsia-400"
                />
              </div>

              <div className="text-center py-4">
                <button
                  onClick={chay}
                  disabled={dangChay || oKho.length === 0}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-black rounded-xl disabled:opacity-60 transition-colors"
                >
                  {dangChay ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {dangChay ? (tienDo || "Đang chạy...") : "Soạn ma trận"}
                </button>
                <p className="text-xs text-gray-500 mt-3 max-w-2xl mx-auto">
                  Máy <b>chỉ được chọn trong những dạng kho đang có câu</b>, không bịa ra dạng mới.
                  Soạn xong hiện bảng để thầy cô soát và <b>sửa lại Bài, Dạng, Loại câu, Mức độ, số câu</b>;
                  chỉ khi bấm nhận mới ghi vào ma trận.
                </p>
                {loi && (
                  <div className="mt-4 mx-auto max-w-2xl p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex gap-2 text-left">
                    <AlertTriangle className="w-5 h-5 shrink-0" /> <span>{loi}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {dong && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {dong.length} dòng · {tongCau} câu
                </span>
                {chiTieu.map(c => (
                  <span key={c.loai} className={`px-2.5 py-1 rounded-lg border ${c.co === c.can ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-300"}`}>
                    {bankTypeLabel(c.loai)}: {c.co}/{c.can} câu
                  </span>
                ))}
                {theoMuc && (
                  <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
                    {MUC_DO_BO.map(m => `${m} ${theoMuc[m]}`).join(" · ")}
                  </span>
                )}
                <button onClick={() => setDong(null)} className="ml-auto px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold">
                  Soạn lại
                </button>
              </div>

              {soDongTrung > 0 && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[12px] text-red-800 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Có <b>{soDongTrung} chỗ bị trùng</b> (cùng Dạng, cùng Loại câu, cùng Mức độ) - tô đỏ bên dưới.
                    Ma trận chỉ giữ được một dòng cho mỗi bộ ba này, hãy sửa hoặc xoá bớt rồi mới nhận.
                  </span>
                </div>
              )}

              {biLoai.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[12px] text-amber-900">
                  <b>{biLoai.length} dòng máy đề xuất đã bị loại</b> vì kho không có ô đó:
                  <ul className="list-disc ml-5 mt-1">
                    {biLoai.slice(0, 6).map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
              )}

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full min-w-[1000px] text-[13px]">
                  <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase font-black">
                    <tr>
                      <th className="p-2 text-left">Bài · Dạng</th>
                      <th className="p-2 text-left w-[180px]">Loại câu</th>
                      <th className="p-2 text-left w-[160px]">Mức độ</th>
                      <th className="p-2 text-center w-24">Số câu</th>
                      <th className="p-2 text-left w-[250px]">Yêu cầu cần đạt</th>
                      <th className="p-2 w-14"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dong.map((d, i) => {
                      const kho = soKhoCua(d);
                      const thieu = d.soCau > kho;
                      const trung = (demKhoa.get(khoaDong(d)) || 0) > 1;
                      return (
                        <tr key={i} className={trung ? "bg-red-50/60" : undefined}>
                          <td className="p-2 align-top">
                            <select
                              value={d.lesson}
                              onChange={e => sua(i, { lesson: e.target.value })}
                              className={`${oChon} text-[11px] text-gray-500`}
                            >
                              {dsBai.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <select
                              value={d.math_form}
                              onChange={e => sua(i, { math_form: e.target.value })}
                              className={`${oChon} mt-1 font-bold text-gray-800`}
                            >
                              {dangCuaBai(d.lesson).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            {d.lyDo && <div className="text-[11px] text-fuchsia-600 italic mt-1">{d.lyDo}</div>}
                          </td>
                          <td className="p-2 align-top">
                            {/* Kèm số câu kho đang có của từng lựa chọn, để đổi xong không phải dò lại. */}
                            <select
                              value={d.question_type}
                              onChange={e => sua(i, { question_type: e.target.value as BankType })}
                              className={`${oChon} font-bold text-gray-700`}
                            >
                              {BANK_TYPES.map(t => (
                                <option key={t} value={t}>
                                  {bankTypeLabel(t)} (kho: {soKhoCua({ ...d, question_type: t })})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2 align-top">
                            <select
                              value={String(d.difficulty)}
                              onChange={e => sua(i, { difficulty: e.target.value })}
                              className={`${oChon} font-bold text-gray-700`}
                            >
                              {DIFFICULTY_CODES.map(m => (
                                <option key={m} value={m}>
                                  {difficultyLabel(m)} (kho: {soKhoCua({ ...d, difficulty: m })})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2 text-center align-top">
                            <input
                              type="number" min={1} value={d.soCau}
                              onChange={e => suaSoCau(i, parseInt(e.target.value) || 1)}
                              className={`w-16 px-2 py-1.5 rounded-lg border text-center font-bold outline-none ${thieu ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200"}`}
                            />
                            <div className={`text-[10px] font-bold mt-0.5 ${thieu ? "text-red-600" : "text-gray-400"}`}>kho: {kho}</div>
                          </td>
                          {/* Yêu cầu cần đạt: đây là chỗ Thầy cô soát xem ma trận đã phủ đủ yêu cầu
                              chưa. Ô trống tô nhạt cho dễ thấy chỗ hổng; gõ vào là lưu luôn vào danh mục. */}
                          <td className="p-2 align-top">
                            <textarea
                              rows={2}
                              value={yeuCauSua[d.math_form] ?? (yeuCau?.get(d.math_form) || "")}
                              onChange={e => setYeuCauSua(v => ({ ...v, [d.math_form]: e.target.value }))}
                              placeholder="Chưa có — gõ vào đây để lưu vào danh mục"
                              className={`w-full px-2 py-1.5 rounded-lg border text-[12px] outline-none resize-y ${
                                (yeuCauSua[d.math_form] ?? (yeuCau?.get(d.math_form) || "")).trim()
                                  ? "border-gray-200"
                                  : "border-amber-300 bg-amber-50/60"
                              }`}
                            />
                          </td>
                          <td className="p-2 text-center align-top">
                            <button onClick={() => xoaDong(i)} className="text-red-500 hover:bg-red-50 rounded px-2 py-1 text-xs font-bold">Xoá</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {dong && (
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-[12px] text-gray-500 font-medium">
              Máy chỉ đề xuất. Thầy cô sửa lại Bài, Dạng, Loại câu, Mức độ, số câu rồi hãy nhận.
              Ô <b>Yêu cầu cần đạt</b> tô vàng là dạng đó chưa có yêu cầu — gõ vào sẽ lưu luôn vào danh mục.
            </p>
            <div className="flex items-center gap-2">
              <button onClick={dongLai} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white text-sm font-bold">Huỷ</button>
              <button
                onClick={() => {
                  /* Lưu chữ Thầy cô vừa sửa vào danh mục trước, rồi mới nhận ma trận. */
                  for (const [dang, chu] of Object.entries(yeuCauSua)) {
                    if (chu.trim() && chu.trim() !== (yeuCau?.get(dang) || "").trim()) {
                      /* Kèm tên bài để chỉ ghi đúng bài đó, không đè sang chương khác
                         cùng tên dạng. */
                      onLuuYeuCau?.(dang, chu.trim(), (dong || []).find(x => x.math_form === dang)?.lesson);
                    }
                  }
                  onNhan(dong); dongLai();
                }}
                disabled={dong.length === 0 || soDongTrung > 0}
                title={soDongTrung > 0 ? "Còn dòng trùng nhau, sửa xong mới nhận được" : undefined}
                className="flex items-center gap-1.5 px-5 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-lg text-sm disabled:opacity-40 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Nhận {dong.length} dòng vào ma trận
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
