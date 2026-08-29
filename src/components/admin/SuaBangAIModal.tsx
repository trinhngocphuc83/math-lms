"use client";

import React from "react";
import { X, Loader2, Sparkles, Mic, MicOff, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useNhanGiongNoi } from "@/hooks/useNhanGiongNoi";
import { suaCauTheoYeuCau, suaBaiGiangTheoYeuCau, type CauDangSoan } from "@/utils/suaCauTheoYeuCau";
import { layCauHinhAI } from "@/utils/geminiBrowser";

/**
 * Nhờ AI sửa một câu đang soạn - gõ yêu cầu hoặc nói.
 *
 * KHÔNG ghi đè thẳng: máy sửa xong thì bày ra bảng đối chiếu trước/sau từng phần, thầy cô
 * đọc rồi mới bấm nhận. Sửa thẳng thì máy đổi lệch một con số cũng không ai biết.
 */

const GOI_Y_CAU_HOI = [
  'Đổi đáp án đúng thành C',
  'Làm các phương án nhiễu khó hơn',
  'Viết lại đề cho ngắn gọn',
  'Thêm lời giải chi tiết từng bước',
];

/* Bài giảng là văn xuôi nên gợi ý phải khác hẳn câu hỏi. */
const GOI_Y_BAI_GIANG = [
  'Viết lại đoạn này ngắn gọn hơn',
  'Chia thành 3 ý gạch đầu dòng',
  'Thêm một ví dụ minh hoạ',
  'Giải thích lại cho dễ hiểu hơn',
];

/** So sánh hai đoạn chữ, rút gọn để bày trong bảng đối chiếu. */
const gonLai = (s: any, dai = 260): string => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > dai ? t.slice(0, dai) + '…' : (t || '(trống)');
};

export default function SuaBangAIModal({
  isOpen, onClose, cau, onNhan,
}: {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Khối trắc nghiệm truyền vào một ĐỐI TƯỢNG câu hỏi; khối lý thuyết truyền vào CHUỖI
   * Markdown. Hai thứ khác hẳn nhau nên phải nhận diện rồi đi hai đường riêng.
   */
  cau: CauDangSoan | string | null;
  onNhan: (cauMoi: any) => void;
}) {
  const laBaiGiang = typeof cau === 'string';
  const cauHoi = laBaiGiang ? null : (cau as CauDangSoan | null);
  const GOI_Y = laBaiGiang ? GOI_Y_BAI_GIANG : GOI_Y_CAU_HOI;
  const [yeuCau, setYeuCau] = React.useState('');
  const [dangChay, setDangChay] = React.useState(false);
  const [loi, setLoi] = React.useState('');
  const [ketQua, setKetQua] = React.useState<{ cauMoi: CauDangSoan; daSua: string } | null>(null);

  const { hoTro: hoTroMic, dangNghe, loi: loiMic, batDauNghe } = useNhanGiongNoi(
    React.useCallback((chu: string) => setYeuCau(chu), []),
  );

  React.useEffect(() => {
    if (!isOpen) return;
    setYeuCau(''); setKetQua(null); setLoi('');
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const phim = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', phim);
    return () => document.removeEventListener('keydown', phim);
  }, [isOpen, onClose]);

  if (!isOpen || !cau) return null;

  const chay = async () => {
    if (!yeuCau.trim()) { setLoi('Thầy cô nói hoặc gõ yêu cầu trước đã.'); return; }
    setDangChay(true); setLoi(''); setKetQua(null);
    try {
      const cauHinh = await layCauHinhAI();
      if (laBaiGiang) {
        const kq = await suaBaiGiangTheoYeuCau(cau as string, yeuCau.trim(), cauHinh);
        setKetQua({ cauMoi: { question: kq.noiDungMoi } as any, daSua: kq.daSua });
      } else {
        setKetQua(await suaCauTheoYeuCau(cauHoi!, yeuCau.trim(), cauHinh));
      }
    } catch (e: any) {
      setLoi(e?.message || 'Không gọi được AI.');
    } finally {
      setDangChay(false);
    }
  };

  /** Một dòng đối chiếu; chỉ hiện khi thật sự có thay đổi. */
  const Dong = ({ ten, cu, moi }: { ten: string; cu: any; moi: any }) => {
    if (gonLai(cu, 9999) === gonLai(moi, 9999)) return null;
    return (
      <div className="border-b border-gray-100 py-2">
        <div className="text-[11px] font-black text-gray-400 uppercase tracking-wide mb-1">{ten}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="text-[12.5px] text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5 line-through decoration-gray-300">{gonLai(cu)}</div>
          <div className="text-[12.5px] text-emerald-800 bg-emerald-50 rounded-lg px-2.5 py-1.5 font-medium">{gonLai(moi)}</div>
        </div>
      </div>
    );
  };

  const chuPhuongAn = (o: any, i: number) =>
    typeof o === 'string' ? `${['A', 'B', 'C', 'D'][i]}. ${o}` : `${['a', 'b', 'c', 'd'][i]}) ${o?.content || ''} [${o?.isTrue ? 'Đ' : 'S'}]`;

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className="bg-white w-full sm:max-w-[760px] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        <div className="flex items-center gap-2 px-4 py-3 border-b border-violet-100 bg-violet-50 shrink-0 sm:rounded-t-2xl">
          <Sparkles className="w-5 h-5 text-violet-600 shrink-0" />
          <h2 className="text-[15px] font-black text-violet-900">
            {laBaiGiang ? 'Nhờ AI sửa bài giảng' : 'Nhờ AI sửa câu này'}
          </h2>
          <button onClick={onClose} className="ml-auto p-1.5 text-violet-600 hover:bg-violet-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          <div className="relative">
            <textarea
              value={yeuCau}
              onChange={e => setYeuCau(e.target.value)}
              rows={2}
              placeholder={dangNghe ? 'Đang nghe, Thầy cô nói đi...' : 'Gõ hoặc bấm micro: "đổi số 2 thành 3", "làm phương án nhiễu khó hơn"...'}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none resize-none transition-colors ${hoTroMic ? 'pr-12' : ''} ${dangNghe ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-300 focus:border-violet-400'}`}
            />
            {/* Chỉ hiện khi trình duyệt thật sự làm được */}
            {hoTroMic && (
              <button
                type="button" onClick={batDauNghe}
                title={dangNghe ? 'Đang nghe, bấm để dừng' : 'Bấm rồi nói yêu cầu'}
                className={`absolute right-2 top-2 p-2 rounded-full transition-colors ${dangNghe ? 'bg-red-500 text-white animate-pulse' : 'text-violet-600 hover:bg-violet-50'}`}
              >
                {dangNghe ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </div>
          {loiMic && <p className="text-[12px] text-red-600 font-bold mt-1.5">{loiMic}</p>}

          <div className="flex flex-wrap gap-1.5 mt-2">
            {GOI_Y.map(g => (
              <button key={g} onClick={() => setYeuCau(g)}
                      className="px-2.5 py-1 rounded-full text-[11.5px] font-bold bg-gray-100 text-gray-600 hover:bg-violet-100 hover:text-violet-700 transition-colors">
                {g}
              </button>
            ))}
          </div>

          <button onClick={chay} disabled={dangChay}
                  className="mt-3 w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-black py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
            {dangChay ? <><Loader2 className="w-4 h-4 animate-spin" /> Máy đang sửa...</> : <><Sparkles className="w-4 h-4" /> Nhờ AI sửa</>}
          </button>

          {loi && (
            <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-bold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {loi}
            </div>
          )}

          {ketQua && (
            <div className="mt-4">
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-violet-50 border border-violet-200 mb-2">
                <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                <span className="text-[13px] text-violet-900 font-bold">Máy nói: {ketQua.daSua}</span>
              </div>

              <div className="text-[11px] font-black text-gray-400 uppercase tracking-wide mb-1">
                Đối chiếu trước / sau — đọc kỹ rồi mới nhận
              </div>
              <Dong ten={laBaiGiang ? 'Nội dung bài giảng' : 'Đề bài'}
                    cu={laBaiGiang ? (cau as string) : cauHoi?.question}
                    moi={ketQua.cauMoi.question} />
              {(cauHoi?.options || []).map((o: any, i: number) => (
                <Dong key={i} ten={`Phương án ${['A', 'B', 'C', 'D'][i]}`}
                      cu={chuPhuongAn(o, i)} moi={chuPhuongAn((ketQua.cauMoi.options || [])[i], i)} />
              ))}
              {!laBaiGiang && (
                <>
                  <Dong ten="Đáp án đúng"
                        cu={cauHoi?.answerIndex !== undefined ? ['A', 'B', 'C', 'D'][cauHoi.answerIndex] : cauHoi?.exactAnswer}
                        moi={ketQua.cauMoi.answerIndex !== undefined ? ['A', 'B', 'C', 'D'][ketQua.cauMoi.answerIndex] : ketQua.cauMoi.exactAnswer} />
                  <Dong ten="Lời giải" cu={cauHoi?.explanation} moi={ketQua.cauMoi.explanation} />
                </>
              )}

              <div className="text-[12px] text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-2">
                {laBaiGiang
                  ? 'Ảnh và các khối câu hỏi trong bài được giữ nguyên - máy trả về thiếu một khối câu hỏi nào là hệ thống từ chối luôn bản đó.'
                  : 'Ảnh trong đề được giữ nguyên từ bản gốc, máy không được phép đổi.'}
              </div>
            </div>
          )}
        </div>

        {ketQua && (
          <div className="shrink-0 px-4 py-3 border-t border-gray-200 flex justify-end gap-2 bg-gray-50 sm:rounded-b-2xl">
            <button onClick={onClose} className="px-4 py-2 rounded-xl font-bold text-sm bg-white border border-gray-300 text-gray-600 hover:bg-gray-100">
              Bỏ, giữ bản cũ
            </button>
            <button onClick={() => { onNhan(laBaiGiang ? ketQua.cauMoi.question : ketQua.cauMoi); onClose(); }}
                    className="px-5 py-2 rounded-xl font-black text-sm bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm">
              Dùng bản mới
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
