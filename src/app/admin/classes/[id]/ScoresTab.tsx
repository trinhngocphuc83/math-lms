"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { captureElement, downloadOrShare } from "@/utils/imageExport";
import { Loader2, ImageIcon, Save, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  layDsBaiKiemTra, luuBaiKiemTra, xoaBaiKiemTra, quetDiemTuDong, type BaiKiemTra,
} from "@/app/actions/goiTenVaDiem";
import { LOI_CHUA_TAO_BANG } from "@/utils/goiTenVaDiem";

export default function ScoresTab({ classId, classInfo, enrollments }: { classId: string, classInfo: any, enrollments: any[] }) {
  const [testName, setTestName] = useState("Bài kiểm tra 15 phút");
  const [passingScore, setPassingScore] = useState<number>(5.0);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [exportingImage, setExportingImage] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  /* Điểm PHẢI được lưu thật. Trước đây tệp này không nhập supabase dòng nào, Thầy cô
     nhập xong tải lại trang là mất sạch. */
  const [dsBai, setDsBai] = useState<BaiKiemTra[]>([]);
  const [baiDangMo, setBaiDangMo] = useState<string>('');   // '' = bài mới
  const [dangLuu, setDangLuu] = useState(false);
  const [dangTai, setDangTai] = useState(false);
  const [chuaTaoBang, setChuaTaoBang] = useState(false);
  const [bao, setBao] = useState('');

  const napDsBai = useCallback(async () => {
    setDangTai(true); setChuaTaoBang(false);
    try {
      setDsBai(await layDsBaiKiemTra(classId));
    } catch (e: any) {
      if (e?.message === LOI_CHUA_TAO_BANG) setChuaTaoBang(true);
    } finally {
      setDangTai(false);
    }
  }, [classId]);

  useEffect(() => { napDsBai(); }, [napDsBai]);

  /** Mở một bài đã lưu: đổ lại tên, mức đạt và điểm từng em. */
  const moBai = (id: string) => {
    setBaiDangMo(id);
    if (!id) { setScores({}); setTestName('Bài kiểm tra 15 phút'); setPassingScore(5); return; }
    const b = dsBai.find(x => x.id === id);
    if (!b) return;
    setTestName(b.ten_bai);
    setPassingScore(b.diem_dat);
    const d: Record<string, string> = {};
    for (const [sid, v] of Object.entries(b.diem)) d[sid] = String(v);
    setScores(d);
  };

  const luu = async () => {
    if (!testName.trim()) { setBao('Đặt tên bài kiểm tra trước đã.'); return; }
    setDangLuu(true); setBao('');
    try {
      const diem: Record<string, number | null> = {};
      for (const en of enrollments) {
        const sid = en.profiles?.id || en.id;
        const v = (scores[sid] ?? '').trim();
        diem[sid] = v === '' ? null : Number(v);
      }
      const id = await luuBaiKiemTra(
        classId,
        { id: baiDangMo || undefined, ten_bai: testName.trim(), diem_dat: passingScore },
        diem,
      );
      setBaiDangMo(id);
      await napDsBai();

      /* Lưu xong thì cộng điểm thưởng luôn - đỡ phải nhớ bấm thêm một nút nữa. */
      let them = '';
      try {
        const q = await quetDiemTuDong(classId);
        if (q.daChot) them = ' (tháng này đã chốt nên không cộng điểm thưởng)';
        else if (q.themMoi > 0) them = ` · đã cộng ${q.themDiem} điểm thưởng`;
      } catch { /* không cộng được thì thôi, điểm kiểm tra vẫn lưu rồi */ }

      setBao('Đã lưu điểm.' + them);
    } catch (e: any) {
      setBao(e?.message === LOI_CHUA_TAO_BANG
        ? 'Chưa tạo bảng dữ liệu - chạy tệp scratch/tao-bang-diem-thuong.sql trước.'
        : 'Không lưu được: ' + (e?.message || 'lỗi không rõ'));
    } finally {
      setDangLuu(false);
      setTimeout(() => setBao(''), 6000);
    }
  };

  const xoa = async () => {
    if (!baiDangMo) return;
    if (!confirm('Xoá hẳn bài kiểm tra này và điểm của cả lớp?')) return;
    await xoaBaiKiemTra(baiDangMo);
    moBai('');
    await napDsBai();
  };

  const handleScoreChange = (studentId: string, value: string) => {
    setScores(prev => ({ ...prev, [studentId]: value }));
  };

  const handleExportImage = async () => {
    if (!printRef.current) return;
    setExportingImage(true); 
    try {
      // Ép khổ 860px để bảng điểm không bị bóp khi thầy xuất ảnh từ điện thoại
      const dataUrl = await captureElement(printRef.current, { width: 860 });
      const fileName = `Bao_cao_diem_${classInfo?.name || 'Lop'}_${new Date().getTime()}.png`;
      await downloadOrShare(dataUrl, fileName);
    } catch (err: any) {
      console.error('Export image error:', err);
      alert(`Đã xảy ra lỗi khi xuất ảnh! Chi tiết: ${err.message || 'Unknown error'}`);
    }
    setExportingImage(false);
  };

  const getRemark = (scoreStr: string) => {
    if (!scoreStr || scoreStr.trim() === '') return null;
    const s = parseFloat(scoreStr);
    if (isNaN(s)) return null;
    if (s >= passingScore) return <span className="text-green-600 font-bold">Đạt</span>;
    return <span className="text-red-600 font-bold">Không đạt</span>;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bài đã lưu</label>
            <select value={baiDangMo} onChange={e => moBai(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 bg-white max-w-[240px]">
              <option value="">+ Bài mới</option>
              {dsBai.map(b => (
                <option key={b.id} value={b.id}>
                  {b.ten_bai} · {new Date(b.ngay).toLocaleDateString('vi-VN')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên bài kiểm tra</label>
            <input 
              type="text" 
              value={testName}
              onChange={e => setTestName(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Điểm đạt (≥)</label>
            <input 
              type="number" 
              step="0.5"
              min="0"
              max="10"
              value={passingScore}
              onChange={e => setPassingScore(parseFloat(e.target.value) || 0)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 w-24"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={luu}
            disabled={dangLuu || chuaTaoBang}
            className="bg-teal-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-teal-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {dangLuu ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Lưu điểm
          </button>
          {baiDangMo && (
            <button onClick={xoa} title="Xoá bài kiểm tra này"
                    className="bg-white border border-rose-200 text-rose-600 px-3 py-2.5 rounded-xl font-bold hover:bg-rose-50 transition-colors">
              <Trash2 size={18} />
            </button>
          )}
          <button 
            onClick={handleExportImage}
            disabled={exportingImage}
            className="bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors disabled:opacity-50 border border-indigo-100 shadow-sm"
          >
            {exportingImage ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
            Xuất ảnh báo cáo
          </button>
        </div>
      </div>

      {chuaTaoBang && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[13.5px] font-bold flex items-center gap-2">
          <AlertTriangle size={16} /> Chưa tạo bảng dữ liệu — chạy tệp scratch/tao-bang-diem-thuong.sql rồi tải lại trang.
        </div>
      )}
      {bao && (
        <div className="mb-4 p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-[13.5px] font-bold flex items-center gap-2">
          <CheckCircle2 size={16} /> {bao}
        </div>
      )}

      {/* Exportable Area */}
      <div ref={printRef} className="bg-white p-4">
        {/* Header with Logo */}
        <div className="flex items-center justify-between border-b-2 border-teal-600 pb-4 mb-4">
          <div className="flex items-center gap-4">
            <img src="/logo.jpg" alt="Logo" className="h-16 object-contain rounded-lg" />
            <div>
              <h3 className="text-xl font-black text-teal-700 uppercase">{classInfo?.name}</h3>
              <p className="text-gray-600 font-medium">Báo cáo điểm: <span className="text-gray-800 font-bold">{testName}</span></p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-gray-500">Ngày báo cáo</div>
            <div className="text-lg font-black text-gray-800">{new Date().toLocaleDateString('vi-VN')}</div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-3 border font-bold text-center w-16">STT</th>
              <th className="p-3 border font-bold">Họ và tên</th>
              <th className="p-3 border font-bold text-center w-32">Điểm</th>
              <th className="p-3 border font-bold text-center w-40">Nhận xét</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((enrollment, idx) => {
              const studentId = enrollment.profiles?.id || enrollment.id;
              return (
              <tr key={studentId} className="hover:bg-gray-50">
                <td className="p-2 border text-center font-medium text-gray-500">{idx + 1}</td>
                <td className="p-2 border font-bold text-gray-800">{enrollment.profiles?.full_name}</td>
                <td className="p-2 border text-center">
                  <input 
                    type="number" 
                    step="0.1"
                    min="0" max="10"
                    value={scores[studentId] || ''}
                    onChange={e => handleScoreChange(studentId, e.target.value)}
                    className="w-full text-center py-1 bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-teal-500 font-bold text-gray-800"
                  />
                </td>
                <td className="p-2 border text-center bg-gray-50/50">
                  {getRemark(scores[studentId])}
                </td>
              </tr>
            )})}
            {enrollments.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">Lớp chưa có học sinh nào.</td>
              </tr>
            )}
          </tbody>
        </table>
        
        <div className="mt-4 text-right text-xs text-gray-400 italic">
          * Đạt (≥ {passingScore} điểm) | Báo cáo được xuất tự động từ hệ thống
        </div>
      </div>
    </div>
  );
}
