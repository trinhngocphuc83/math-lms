"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { X, Download, FileText, Shuffle, Loader2, AlertTriangle } from 'lucide-react';
import { exportQuestionsToWord } from '@/utils/exportDocx';
import { exportPhieuTraLoi } from '@/utils/phieuTraLoi';
import { exportHuongDanCham } from '@/utils/huongDanCham';
import { soatDeTruocKhiInPhieu } from '@/utils/chamPhieuQuet';
import { taoCacMaDe } from '@/utils/tronMaDe';
import {
  type DauDe, dauDeMacDinh, chiaPhanDeThi, DIEM_MAC_DINH, soDiemVN, tenTepDe,
} from '@/utils/deThi';
import { BANK_TYPE_LABELS } from '@/utils/questionTypes';
import { cauKhoTuMarkdown } from '@/utils/khoiQuizSangCauKho';

/**
 * Xuất một bài Luyện tập / đề ôn tập ra Word THEO ĐÚNG KHUÔN của Quản lý Đề thi.
 *
 * Trước đây nút "Xuất Giáo Án (Word)" ở trình soạn chỉ có hai bản (học sinh / giáo viên)
 * đi đường giaoAnWord: đề in ra không có đầu đề, không chia PHẦN I/II/III, không có phiếu
 * trả lời, hướng dẫn chấm, trộn mã. Hộp này gọi lại NGUYÊN bộ xuất của Quản lý Đề thi
 * (exportDocx · phieuTraLoi · huongDanCham · tronMaDe) sau khi đổi các khối quiz sang
 * khuôn kho bằng khoiQuizSangCauKho - một bộ dựng, hai chỗ dùng, không lệch nhau.
 *
 * Đầu đề, điểm từng phần, số mã đề nhớ theo từng bài trong localStorage để lần sau xuất
 * lại không phải gõ.
 */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Markdown của bài (đã gộp từ các khối) - hộp tự bóc khối quiz. */
  markdown: string;
  tenBai: string;
  /** Tên khoá học, để đoán "Môn - Lớp" cho đầu đề (ví dụ "TOÁN 12 (CƠ BẢN)"). */
  tenKhoa?: string;
  /** Khoá nhớ cấu hình (thường là id bài / module). */
  khoaNho?: string;
}


function doanMonLop(tenKhoa: string): string {
  const t = String(tenKhoa || '');
  const lop = t.match(/\b(1[0-2]|[6-9])\b/)?.[1];
  const mon = /toán/i.test(t) ? 'Toán' : /vật lí|vật lý|lý\b|lí\b/i.test(t) ? 'Vật lí' : '';
  return [mon, lop && `Lớp ${lop}`].filter(Boolean).join(' - ');
}

export default function XuatDeTuBaiModal({ isOpen, onClose, markdown, tenBai, tenKhoa, khoaNho }: Props) {
  const cauHoi = useMemo(() => (isOpen ? cauKhoTuMarkdown(markdown) : []), [isOpen, markdown]);
  const cacPhan = useMemo(() => chiaPhanDeThi(cauHoi), [cauHoi]);

  const [dauDe, setDauDe] = useState<DauDe>(() => dauDeMacDinh());
  const [diemPhan, setDiemPhan] = useState<Record<string, number>>({});
  const [soMaDe, setSoMaDe] = useState(1);
  const [dangXuat, setDangXuat] = useState<string | null>(null);

  const khoaLuu = `xuat-de-tu-bai:${khoaNho || tenBai}`;

  /* Mở hộp: nạp cấu hình đã nhớ, không có thì dựng mặc định từ tên bài + khoá + số câu. */
  useEffect(() => {
    if (!isOpen) return;
    let nho: any = null;
    try { nho = JSON.parse(localStorage.getItem(khoaLuu) || 'null'); } catch { /* bỏ */ }
    const macDinh = dauDeMacDinh(tenBai || 'Đề kiểm tra');
    macDinh.monLop = doanMonLop(tenKhoa || '');
    setDauDe(nho?.dauDe ? { ...macDinh, ...nho.dauDe } : macDinh);
    setSoMaDe(Number(nho?.soMaDe) || 1);
    const dp: Record<string, number> = {};
    for (const p of cacPhan) {
      dp[p.ma] = typeof nho?.diemPhan?.[p.ma] === 'number'
        ? nho.diemPhan[p.ma]
        : Math.round(p.cauHoi.length * DIEM_MAC_DINH[p.ma] * 100) / 100;
    }
    setDiemPhan(dp);
  }, [isOpen, khoaLuu, tenBai, tenKhoa, cacPhan]);

  const nho = () => {
    try { localStorage.setItem(khoaLuu, JSON.stringify({ dauDe, diemPhan, soMaDe })); } catch { /* bỏ */ }
  };

  if (!isOpen) return null;

  const tongDiem = cacPhan.reduce((t, p) => t + (diemPhan[p.ma] || 0), 0);
  const thieuDapAn = cauHoi.filter((q) => q.question_type !== 'TL' && !q.correct_answer).length;
  const dungMaDe = () => (soMaDe > 1 ? taoCacMaDe(cauHoi, soMaDe, dauDe.maDe || '101') : undefined);

  const chay = async (nhan: string, viec: () => Promise<unknown>) => {
    if (cauHoi.length === 0) return alert('Bài này chưa có câu hỏi nào (khối quiz).');
    nho();
    setDangXuat(nhan);
    try { await viec(); }
    catch (e: any) { alert(`Lỗi xuất ${nhan}: ${e?.message || e}`); }
    finally { setDangXuat(null); }
  };

  const xuatDe = (loai: 'student' | 'teacher') => chay(loai === 'student' ? 'Đề cho học sinh' : 'Đề kèm lời giải', () =>
    exportQuestionsToWord(cauHoi, loai, tenTepDe(dauDe), { dauDe, chiaPhan: true, diemPhan, maDe: dungMaDe() }));

  const xuatPhieu = () => chay('Phiếu trả lời', async () => {
    /* Phiếu tô tròn chỉ có bốn ô cho mỗi câu trả lời ngắn - đáp số dài, có chữ, hay
       Đúng/Sai thiếu ý thì học sinh không có chỗ tô. Báo trước lúc còn trên màn hình. */
    const vuong = soatDeTruocKhiInPhieu(
      cacPhan.filter((p) => p.ma !== 'TL').map((p) => ({
        ma: p.ma, cauHoi: p.cauHoi,
        diemMoiCau: p.cauHoi.length ? (diemPhan[p.ma] || 0) / p.cauHoi.length : 0,
      })),
    );
    if (vuong.length > 0) {
      const ds = vuong.slice(0, 8).map((v) => `• ${v.phan} · Câu ${v.cau}: ${v.viSao}${v.dapAn ? ` (đang là "${v.dapAn}")` : ''}`).join('\n');
      if (!confirm(`${vuong.length} câu học sinh KHÔNG TÔ ĐƯỢC lên phiếu:\n\n${ds}${vuong.length > 8 ? `\n… và ${vuong.length - 8} câu nữa.` : ''}\n\nVẫn in phiếu?`)) return;
    }
    await exportPhieuTraLoi({ dauDe, cacPhan, diemPhan }, tenTepDe(dauDe));
  });

  const xuatHuongDan = () => chay('Hướng dẫn chấm', () =>
    exportHuongDanCham({ dauDe, cacPhan, diemPhan }, tenTepDe(dauDe)));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex justify-between items-center bg-indigo-50">
          <div>
            <h2 className="text-lg font-black text-indigo-900 flex items-center gap-2"><FileText className="w-5 h-5" /> Xuất đề ra Word</h2>
            <p className="text-xs text-indigo-700 mt-0.5">Cùng khuôn với Quản lý Đề thi: đầu đề · PHẦN I/II/III · phiếu trả lời · hướng dẫn chấm · trộn mã đề</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-zinc-500 hover:text-red-500 hover:bg-red-50"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {cauHoi.length === 0 ? (
            <div className="p-6 text-center bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-semibold">
              Bài này chưa có câu hỏi nào (khối quiz) để dựng đề.
            </div>
          ) : (
            <>
              {/* Cơ cấu đề: mỗi phần bao nhiêu câu, bao nhiêu điểm - điểm sửa được */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-4 py-2 font-black">Phần</th>
                      <th className="text-center px-4 py-2 font-black">Số câu</th>
                      <th className="text-center px-4 py-2 font-black">Điểm phần</th>
                      <th className="text-center px-4 py-2 font-black">Điểm / câu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cacPhan.map((p) => (
                      <tr key={p.ma} className="border-t border-gray-100">
                        <td className="px-4 py-2 font-bold text-gray-800">Phần {p.soLaMa}. {BANK_TYPE_LABELS[p.ma]}</td>
                        <td className="px-4 py-2 text-center font-bold">{p.cauHoi.length}</td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="number" step="0.25" min={0} value={diemPhan[p.ma] ?? 0}
                            onChange={(e) => setDiemPhan((prev) => ({ ...prev, [p.ma]: Number(e.target.value) || 0 }))}
                            className="w-20 text-center border border-gray-300 rounded-md px-2 py-1 font-bold text-indigo-700"
                          />
                        </td>
                        <td className="px-4 py-2 text-center text-gray-500">
                          {p.cauHoi.length ? soDiemVN((diemPhan[p.ma] || 0) / p.cauHoi.length) : '-'}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-4 py-2 font-black text-gray-800">Tổng</td>
                      <td className="px-4 py-2 text-center font-black">{cauHoi.length}</td>
                      <td className={`px-4 py-2 text-center font-black ${Math.abs(tongDiem - 10) < 0.01 ? 'text-emerald-700' : 'text-rose-600'}`}>{soDiemVN(tongDiem)}</td>
                      <td className="px-4 py-2 text-center text-xs text-gray-500">{Math.abs(tongDiem - 10) < 0.01 ? 'đủ 10 điểm' : 'chưa tròn 10'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {thieuDapAn > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span><b>{thieuDapAn}</b> câu trắc nghiệm chưa có đáp án trong bài — hướng dẫn chấm và bảng đáp án sẽ để trống những câu ấy. Nên sửa trong trình soạn trước.</span>
                </div>
              )}

              {/* Đầu đề */}
              <div>
                <h3 className="text-sm font-black text-gray-700 mb-2">Đầu đề in trên giấy</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {([
                    ['tenLopHoc', 'Tên lớp học'],
                    ['tenKyThi', 'Tên kỳ kiểm tra'],
                    ['monLop', 'Môn - Lớp'],
                    ['namHoc', 'Năm học'],
                    ['thoiGian', 'Thời gian làm bài'],
                    ['maDe', 'Mã đề'],
                  ] as [keyof DauDe, string][]).map(([khoa, nhan]) => (
                    <label key={khoa} className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-gray-500 uppercase">{nhan}</span>
                      <input
                        value={dauDe[khoa]}
                        onChange={(e) => setDauDe((prev) => ({ ...prev, [khoa]: e.target.value }))}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-bold text-gray-700" title="Mã đầu giữ nguyên thứ tự đang xem; các mã sau đảo thứ tự câu và phương án, đáp án dời theo">
                <Shuffle className="w-4 h-4 text-violet-600" /> Số mã đề
                <select value={soMaDe} onChange={(e) => setSoMaDe(Number(e.target.value) || 1)} className="border border-gray-300 rounded-md px-2 py-1 font-bold">
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="text-xs font-medium text-gray-500">{soMaDe > 1 ? `${soMaDe} mã trong cùng một tệp, cuối tệp có bảng đáp án các mã` : 'một đề, không trộn'}</span>
              </label>
            </>
          )}
        </div>

        {cauHoi.length > 0 && (
          <div className="px-5 py-4 border-t bg-gray-50 grid grid-cols-2 md:grid-cols-4 gap-2">
            {([
              ['Đề cho học sinh', 'Chỉ đề, không đáp án', 'bg-blue-600 hover:bg-blue-700', () => xuatDe('student')],
              ['Đề kèm lời giải', 'Bản của giáo viên', 'bg-indigo-600 hover:bg-indigo-700', () => xuatDe('teacher')],
              ['Phiếu trả lời', 'Lưới tô + dòng kẻ tự luận', 'bg-teal-600 hover:bg-teal-700', xuatPhieu],
              ['Hướng dẫn chấm', 'Đáp án, biểu điểm', 'bg-rose-600 hover:bg-rose-700', xuatHuongDan],
            ] as [string, string, string, () => void][]).map(([nhan, moTa, mau, onClick]) => (
              <button
                key={nhan} onClick={onClick} disabled={dangXuat !== null}
                className={`${mau} text-white rounded-xl px-3 py-2.5 text-left disabled:opacity-60 transition-colors`}
              >
                <span className="font-black text-sm flex items-center gap-1.5">
                  {dangXuat === nhan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {nhan}
                </span>
                <span className="block text-[11px] opacity-80 mt-0.5">{moTa}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
