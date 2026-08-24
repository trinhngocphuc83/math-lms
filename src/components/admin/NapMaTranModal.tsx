"use client";

import { useRef, useState } from "react";
import { X, UploadCloud, Loader2, Wand2, AlertTriangle, CheckCircle2, FileText, Image as ImageIcon } from "lucide-react";
import { layCauHinhAI } from "@/utils/geminiBrowser";
import {
  docMaTranTuTep, khopDongMaTran, laFileWord, laFileAnh,
  type DongThoMaTran, type NguonKho, type NguonKhop,
} from "@/utils/docMaTranAI";
import { laFilePdf } from "@/utils/pdfToImages";
import { bankTypeLabel, difficultyLabel, BANK_TYPES, type BankType } from "@/utils/questionTypes";
import { diemMacDinh, soDiemVN } from "@/utils/deThi";

/**
 * Nạp ma trận có sẵn (ảnh chụp, PDF, Word) vào app.
 *
 * Máy chỉ ĐỌC ra chữ rồi đoán xem mỗi dòng ứng với dạng nào trong kho; quyết định
 * cuối cùng vẫn là của thầy cô. Vì thế luôn có một bảng soát lại trước khi nạp, và
 * dòng nào máy không dám chắc thì để trống bắt chọn tay chứ không gán bừa - gán bừa
 * thì đề ra sai dạng mà không ai biết.
 */

export interface DongNapMaTran extends DongThoMaTran {
  /** Tên dạng trong kho đã khớp; rỗng nghĩa là chưa chọn được. */
  dangTrongKho: string;
  /** Bài học khớp được từ tên máy đọc, dùng để lọc danh sách dạng cho gọn. */
  baiTrongKho: string;
  /** Khớp được nhờ tên bài, nhờ tên dạng, hay không khớp gì. */
  nguonKhop: NguonKhop;
  /** Độ giống giữa tên máy đọc và tên trong kho, để tô màu mức tin cậy. */
  diemKhop: number;
  /** Số câu kho đang có cho đúng (dạng, loại, mức) này. */
  soCauKho: number;
  chon: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Bài học, dạng toán và số câu kho đang có. */
  kho: NguonKho;
  onNap: (dong: DongNapMaTran[]) => void;
}

export default function NapMaTranModal({ isOpen, onClose, kho, onNap }: Props) {
  const { danhSachDang, demKho } = kho;
  const [tepDaChon, setTepDaChon] = useState<File[]>([]);
  const [dangDoc, setDangDoc] = useState(false);
  const [tienDo, setTienDo] = useState("");
  const [loi, setLoi] = useState("");
  const [dong, setDong] = useState<DongNapMaTran[] | null>(null);
  const [modelDaDung, setModelDaDung] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const dongLai = () => {
    setTepDaChon([]); setDong(null); setLoi(""); setTienDo(""); setModelDaDung("");
    onClose();
  };

  /** Gắn kết quả khớp tên và số câu kho vào từng dòng máy đọc được. */
  const dungBangSoat = (tho: DongThoMaTran[]): DongNapMaTran[] =>
    tho.map((d) => {
      const k = khopDongMaTran(d.dangToan, d.loaiCau, d.mucDo, kho);
      const dangTrongKho = k.dang || "";
      return {
        ...d,
        dangTrongKho,
        baiTrongKho: k.bai || "",
        nguonKhop: k.nguon,
        diemKhop: k.diem,
        soCauKho: dangTrongKho ? demKho(dangTrongKho, d.loaiCau, d.mucDo) : 0,
        chon: !!dangTrongKho,
      };
    });

  const batDauDoc = async (files: File[]) => {
    if (files.length === 0) return;
    setDangDoc(true); setLoi(""); setDong(null); setTienDo("Đang xin khoá AI...");
    try {
      const cauHinh = await layCauHinhAI();
      const kq = await docMaTranTuTep(files, cauHinh, danhSachDang, setTienDo);
      if (kq.dong.length === 0) {
        setLoi("Máy không đọc được dòng nào có số câu. Thử chụp lại rõ hơn, hoặc dùng tệp Word thay cho ảnh.");
      } else {
        setDong(dungBangSoat(kq.dong));
        setModelDaDung(kq.model);
      }
    } catch (e: any) {
      setLoi(e?.message || "Không đọc được tệp.");
    } finally {
      setDangDoc(false); setTienDo("");
    }
  };

  const chonTep = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = Array.from(e.target.files || []);
    e.target.value = "";
    if (f.length === 0) return;
    setTepDaChon(f);
    batDauDoc(f);
  };

  const sua = (i: number, patch: Partial<DongNapMaTran>) => {
    setDong((prev) => {
      if (!prev) return prev;
      const ra = [...prev];
      const d = { ...ra[i], ...patch };
      // Đổi dạng / loại / mức thì phải đếm lại kho, nếu không con số cũ sẽ nói dối.
      if (patch.dangTrongKho !== undefined || patch.loaiCau !== undefined || patch.mucDo !== undefined) {
        d.soCauKho = d.dangTrongKho ? demKho(d.dangTrongKho, d.loaiCau, d.mucDo) : 0;
        if (patch.loaiCau !== undefined) d.diemMoiCau = diemMacDinh(patch.loaiCau);
        if (patch.dangTrongKho !== undefined) { d.diemKhop = 1; d.nguonKhop = "dang"; d.chon = !!patch.dangTrongKho; }
      }
      ra[i] = d;
      return ra;
    });
  };

  const daChon = (dong || []).filter((d) => d.chon && d.dangTrongKho);
  const chuaKhop = (dong || []).filter((d) => !d.dangTrongKho).length;
  const suyTuBai = (dong || []).filter((d) => d.dangTrongKho && d.nguonKhop === "bai").length;
  const thieuKho = daChon.filter((d) => d.soCau > d.soCauKho).length;

  /**
   * Bảng ma trận theo Công văn 7991 đếm câu Đúng/Sai theo Ý (mỗi câu 4 ý), còn app
   * đếm theo CÂU. Một đề chuẩn hiếm khi quá 4 câu Đúng/Sai, nên tổng vượt 4 gần như
   * chắc chắn là bảng đang đếm ý - để nguyên thì số câu và điểm bị thổi lên gấp bốn.
   * Chỉ cảnh báo chứ không tự quy đổi: 3 ý không chia được thành số câu nguyên, mà
   * ngân hàng chỉ lưu được câu Đúng/Sai trọn 4 ý.
   */
  const tongYDungSai = (dong || []).filter((d) => d.loaiCau === "DS").reduce((n, d) => n + d.soCau, 0);
  const nghiDemTheoY = tongYDungSai > 4;

  const bieuTuongTep = (f: File) =>
    laFileWord(f) ? <FileText className="w-4 h-4 text-blue-600" />
      : laFilePdf(f) ? <FileText className="w-4 h-4 text-red-600" />
      : laFileAnh(f) ? <ImageIcon className="w-4 h-4 text-emerald-600" />
      : <FileText className="w-4 h-4 text-gray-400" />;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1300px] max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Thanh đầu */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-teal-100 bg-teal-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Wand2 className="w-5 h-5 text-teal-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-black text-teal-900 truncate">Nạp ma trận từ ảnh hoặc tệp</h2>
            {modelDaDung && (
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white border border-teal-300 text-teal-700">
                {modelDaDung}
              </span>
            )}
          </div>
          <button onClick={dongLai} className="p-2 text-teal-600 hover:bg-teal-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">

          {/* Chọn tệp */}
          {!dong && (
            <div>
              <button
                onClick={() => inputRef.current?.click()}
                disabled={dangDoc}
                className="w-full border-2 border-dashed border-teal-300 rounded-2xl py-10 flex flex-col items-center gap-2 hover:bg-teal-50/60 transition-colors disabled:opacity-60"
              >
                {dangDoc
                  ? <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
                  : <UploadCloud className="w-10 h-10 text-teal-400" />}
                <span className="font-black text-teal-800">
                  {dangDoc ? (tienDo || "Đang xử lý...") : "Chọn ảnh chụp, tệp PDF hoặc tệp Word"}
                </span>
                {!dangDoc && (
                  <span className="text-xs text-gray-500 max-w-lg text-center">
                    Chọn được nhiều tệp một lúc. Tệp Word cho kết quả chính xác nhất vì máy đọc thẳng chữ,
                    không phải đoán chữ từ ảnh.
                  </span>
                )}
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx"
                onChange={chonTep}
                className="hidden"
              />

              {tepDaChon.length > 0 && !dangDoc && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tepDaChon.map((f, i) => (
                    <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700">
                      {bieuTuongTep(f)} {f.name}
                    </span>
                  ))}
                </div>
              )}

              {loi && (
                <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" /> <span>{loi}</span>
                </div>
              )}
            </div>
          )}

          {/* Bảng soát lại */}
          {dong && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Máy đọc được {dong.length} dòng
                </span>
                {chuaKhop > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-300">
                    {chuaKhop} dòng chưa khớp — hãy chọn tay
                  </span>
                )}
                {suyTuBai > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300">
                    {suyTuBai} dòng suy từ tên bài — hãy soát lại dạng
                  </span>
                )}
                {thieuKho > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-300">
                    {thieuKho} dòng kho không đủ câu
                  </span>
                )}
                <button
                  onClick={() => { setDong(null); setTepDaChon([]); }}
                  className="ml-auto px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold"
                >
                  Chọn tệp khác
                </button>
              </div>

              {nghiDemTheoY && (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-[13px] font-bold flex gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-sky-600" />
                  <span>
                    Bảng này đang đếm câu Đúng/Sai theo <b>Ý</b> — tổng {tongYDungSai} ý, tức khoảng{" "}
                    <b>{Math.round(tongYDungSai / 4)} câu</b> (mỗi câu Đúng/Sai có 4 ý).
                    App đếm theo <b>câu</b>, nên hãy sửa lại số ở các dòng Đúng/Sai trước khi nạp,
                    nếu không số câu và điểm sẽ bị thổi lên gấp bốn.
                  </span>
                </div>
              )}
              <p className="text-[12px] text-gray-500 font-medium">
                Bảng ma trận ghi <b>tên bài học</b>, còn ngân hàng xếp câu theo <b>dạng toán</b> — một bài có
                nhiều dạng. Dòng tô hổ phách là máy đã tìm đúng bài rồi <b>chọn tạm</b> dạng có sẵn nhiều câu
                nhất; thầy cô soát lại xem có đúng dạng mình muốn ra không. Dòng tô đỏ là chưa tìm ra bài nào.
              </p>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full min-w-[1000px] text-[13px]">
                  <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase font-black">
                    <tr>
                      <th className="p-2 w-10"></th>
                      <th className="p-2 text-left">Máy đọc được</th>
                      <th className="p-2 text-left w-[300px]">Dạng trong kho</th>
                      <th className="p-2 text-left w-[190px]">Loại câu</th>
                      <th className="p-2 text-left w-[150px]">Mức độ</th>
                      <th className="p-2 text-center w-20">Số câu</th>
                      <th className="p-2 text-center w-24">Điểm/câu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dong.map((d, i) => {
                      const thieu = d.dangTrongKho && d.soCau > d.soCauKho;
                      const vienChon = !d.dangTrongKho
                        ? "border-red-300 bg-red-50 text-red-800"
                        : d.diemKhop < 0.9
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-gray-200";
                      return (
                        <tr key={i} className={d.chon ? "" : "opacity-45"}>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={d.chon}
                              disabled={!d.dangTrongKho}
                              onChange={() => sua(i, { chon: !d.chon })}
                              className="w-4 h-4 accent-teal-600"
                            />
                          </td>
                          <td className="p-2">
                            <div className="font-bold text-gray-800">{d.dangToan}</div>
                            {d.chuong && <div className="text-[11px] text-gray-400">{d.chuong}</div>}
                          </td>
                          <td className="p-2">
                            <select
                              value={d.dangTrongKho}
                              onChange={(e) => sua(i, { dangTrongKho: e.target.value })}
                              className={`w-full px-2 py-1.5 rounded-lg border text-[12px] font-bold outline-none ${vienChon}`}
                            >
                              <option value="">-- chưa khớp, chọn tay --</option>
                              {d.baiTrongKho ? (
                                <>
                                  <optgroup label={`Dạng của ${d.baiTrongKho}`}>
                                    {kho.dangCuaBai(d.baiTrongKho).map((t) => (
                                      <option key={t} value={t}>{t} ({demKho(t, d.loaiCau, d.mucDo)} câu)</option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="Tất cả dạng khác">
                                    {danhSachDang.filter((t) => !kho.dangCuaBai(d.baiTrongKho).includes(t))
                                      .map((t) => <option key={t} value={t}>{t}</option>)}
                                  </optgroup>
                                </>
                              ) : (
                                danhSachDang.map((t) => <option key={t} value={t}>{t}</option>)
                              )}
                            </select>
                            {d.baiTrongKho && (
                              <div className="text-[10px] font-bold text-teal-600 mt-0.5 truncate">
                                khớp bài: {d.baiTrongKho}
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            <select
                              value={d.loaiCau}
                              onChange={(e) => sua(i, { loaiCau: e.target.value as BankType })}
                              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[12px] font-bold outline-none"
                            >
                              {BANK_TYPES.map((t) => <option key={t} value={t}>{bankTypeLabel(t)}</option>)}
                            </select>
                          </td>
                          <td className="p-2">
                            <select
                              value={d.mucDo}
                              onChange={(e) => sua(i, { mucDo: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[12px] font-bold outline-none"
                            >
                              {["1", "2", "3", "4"].map((m) => <option key={m} value={m}>{difficultyLabel(m)}</option>)}
                            </select>
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number" min={1} value={d.soCau}
                              onChange={(e) => sua(i, { soCau: Math.max(1, parseInt(e.target.value) || 1) })}
                              className={`w-16 px-2 py-1.5 rounded-lg border text-center font-bold outline-none ${thieu ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200"}`}
                            />
                            {d.dangTrongKho && (
                              <div className={`text-[10px] font-bold mt-0.5 ${thieu ? "text-red-600" : "text-gray-400"}`}>
                                kho: {d.soCauKho}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number" step="0.25" min={0} value={d.diemMoiCau}
                              onChange={(e) => sua(i, { diemMoiCau: Number(e.target.value) || 0 })}
                              className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-center font-bold outline-none"
                            />
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

        {/* Thanh cuối */}
        {dong && (
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
            <div className="text-[13px] font-bold text-gray-600">
              Sẽ nạp <span className="text-teal-700">{daChon.length}</span> dòng ·{" "}
              {daChon.reduce((s, d) => s + d.soCau, 0)} câu ·{" "}
              {soDiemVN(daChon.reduce((s, d) => s + d.soCau * d.diemMoiCau, 0))} điểm
            </div>
            <div className="flex items-center gap-2">
              <button onClick={dongLai} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white text-sm font-bold">
                Huỷ
              </button>
              <button
                onClick={() => { onNap(daChon); dongLai(); }}
                disabled={daChon.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-sm disabled:opacity-40 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Nạp {daChon.length} dòng vào ma trận
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
