"use client";

import React, { useRef, useState } from "react";
import {
  Loader2, ImageIcon, FileSpreadsheet, Lock, Unlock, RefreshCw, Trophy,
  TrendingUp, AlertTriangle, FileText, History,
} from "lucide-react";
import { captureElement, downloadOrShare } from "@/utils/imageExport";
import {
  layBangVinhDanh, quetDiemTuDong, quetBuNhieuThang, chotThang, boChotThang, daChotThang,
  type BangVinhDanh,
} from "@/app/actions/goiTenVaDiem";
import { LOI_CHUA_TAO_BANG, thangNay, thangTruoc } from "@/utils/goiTenVaDiem";
import PhieuPhuHuynhModal from "./PhieuPhuHuynhModal";
import LichSuDiemModal from "./LichSuDiemModal";

/**
 * Tổng kết điểm thưởng theo tháng: hai bảng xếp hạng, chốt tháng, và xuất báo cáo.
 *
 * HAI BẢNG TÁCH RIÊNG như Thầy cô chọn: TỔNG ĐIỂM để nhìn toàn cảnh, TIẾN BỘ để thưởng.
 * Tháng đầu chưa có gì để so thì bảng tiến bộ tự ẩn kèm lời giải thích, chứ không hiện
 * một bảng rỗng khó hiểu.
 */


export default function TongKetThangTab({ classId, classInfo }: { classId: string; classInfo: any }) {
  const [thang, setThang] = React.useState(thangNay());
  const [bang, setBang] = React.useState<BangVinhDanh | null>(null);
  const [daChot, setDaChot] = React.useState(false);
  const [dangTai, setDangTai] = React.useState(false);
  const [dangLam, setDangLam] = React.useState('');
  const [chuaTaoBang, setChuaTaoBang] = React.useState(false);
  const [bao, setBao] = React.useState('');
  const khungAnh = useRef<HTMLDivElement>(null);
  /* Phiếu phụ huynh tách ra hộp riêng: có trang trí và xuất ẢNH, vì phụ huynh nhận qua
     Zalo thì một tấm ảnh mở ra là thấy ngay. */
  const [moPhieu, setMoPhieu] = useState(false);
  /* Bấm vào tên một em để xem em ấy được cộng những gì. */
  const [emDangXem, setEmDangXem] = useState<{ id: string; ten: string } | null>(null);

  const cacThang = React.useMemo(() => {
    const ra = [thangNay()];
    for (let i = 0; i < 11; i++) ra.push(thangTruoc(ra[ra.length - 1]));
    return ra;
  }, []);

  const nap = React.useCallback(async () => {
    setDangTai(true); setChuaTaoBang(false);
    try {
      setBang(await layBangVinhDanh(classId, thang));
      setDaChot(await daChotThang(classId, thang));
    } catch (e: any) {
      if (e?.message === LOI_CHUA_TAO_BANG) setChuaTaoBang(true);
      else setBao(e?.message || 'Không đọc được bảng.');
    } finally {
      setDangTai(false);
    }
  }, [classId, thang]);

  React.useEffect(() => { nap(); }, [nap]);

  /**
   * Mở tab lên là quét luôn, khỏi phải nhớ bấm nút.
   *
   * Trước đây điểm từ bài làm CHỈ xuất hiện khi Thầy cô bấm "Cập nhật điểm từ bài làm".
   * Không ai bấm thì em làm bài tốt vẫn 0 điểm, mà nhìn vào bảng thì tưởng em chưa làm gì
   * - đúng cảnh "app tổng có điểm mà app học sinh không thấy". Quét lại nhiều lần không
   * sao: mỗi bài chỉ cộng một lần, làm lại tốt hơn thì cộng bù phần chênh.
   */
  const daQuetChoThang = useRef<Set<string>>(new Set());
  React.useEffect(() => {
    const khoa = `${classId}|${thang}`;
    if (daQuetChoThang.current.has(khoa)) return;
    daQuetChoThang.current.add(khoa);
    (async () => {
      try {
        const q = await quetDiemTuDong(classId, thang);
        if (q.themMoi > 0) {
          setBao(`Vừa cộng thêm ${q.themDiem} điểm từ ${q.themMoi} lượt bài làm chưa được tính.`);
          setTimeout(() => setBao(''), 6000);
          await nap();
        }
      } catch { /* chưa tạo bảng hoặc lỗi mạng thì thôi, nút quét tay vẫn còn đó */ }
    })();
  }, [classId, thang, nap]);

  const nhac = (chu: string) => { setBao(chu); setTimeout(() => setBao(''), 6000); };

  /**
   * Quét bù 12 tháng gần đây.
   *
   * Nút "Cập nhật điểm từ bài làm" chỉ quét ĐÚNG tháng đang mở. Tháng nào chưa từng ai
   * bấm thì bài làm tháng ấy không bao giờ thành điểm - đo trên kho Toán 12 có 9 lượt bài
   * từ 7 điểm trở lên của tháng 6, 7, 8 nằm im như vậy.
   */
  const quetBu = async () => {
    if (!confirm('Quét lại 12 tháng gần đây và cộng bù những bài chưa được tính?\n\nMỗi bài vẫn chỉ cộng một lần. Tháng đã chốt được giữ nguyên.')) return;
    setDangLam('bu');
    try {
      const q = await quetBuNhieuThang(classId, 12);
      nhac(q.themMoi > 0
        ? `Đã cộng bù ${q.themDiem} điểm từ ${q.themMoi} lượt bài làm.`
          + (q.boQua.length ? ` Bỏ qua ${q.boQua.length} tháng đã chốt.` : '')
        : 'Không có bài nào bị bỏ sót.');
      await nap();
    } catch (e: any) { nhac('Không quét bù được: ' + (e?.message || '')); }
    setDangLam('');
  };

  const quet = async () => {
    setDangLam('quet');
    try {
      const q = await quetDiemTuDong(classId, thang);
      nhac(q.daChot ? 'Tháng này đã chốt, không cộng thêm được.'
        : q.themMoi > 0 ? `Đã cộng thêm ${q.themDiem} điểm từ ${q.themMoi} lượt bài làm.`
        : 'Không có bài nào mới để cộng.');
      await nap();
    } catch (e: any) { nhac('Không quét được: ' + (e?.message || '')); }
    setDangLam('');
  };

  const doiKhoa = async () => {
    if (!daChot && !confirm(`Chốt tháng ${thang}? Sau khi chốt sẽ không cộng/trừ điểm được nữa.`)) return;
    setDangLam('khoa');
    try {
      if (daChot) { await boChotThang(classId, thang); nhac('Đã mở khoá lại tháng này.'); }
      else { const r = await chotThang(classId, thang); nhac(`Đã chốt tháng. Quét nốt được ${r.daQuet} lượt bài làm trước khi khoá.`); }
      await nap();
    } catch (e: any) { nhac('Không đổi được: ' + (e?.message || '')); }
    setDangLam('');
  };

  const xuatAnh = async () => {
    if (!khungAnh.current) return;
    setDangLam('anh');
    try {
      const url = await captureElement(khungAnh.current, { width: 900 });
      await downloadOrShare(url, `Diem_thuong_${classInfo?.name || 'Lop'}_${thang}.png`);
    } catch (e: any) { nhac('Không xuất được ảnh: ' + (e?.message || '')); }
    setDangLam('');
  };

  const xuatExcel = async () => {
    setDangLam('excel');
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(`Thang ${thang}`);
      ws.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Họ và tên', key: 'ten', width: 28 },
        { header: 'Điểm tháng này', key: 'nay', width: 16 },
        { header: 'Tháng trước', key: 'truoc', width: 14 },
        { header: 'Mức tăng', key: 'tang', width: 12 },
      ];
      ws.getRow(1).font = { bold: true };
      (bang?.theoTong || []).forEach((d, i) => ws.addRow({
        stt: i + 1, ten: d.hs.ten, nay: d.tong, truoc: d.truoc, tang: d.tang,
      }));

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Diem_thuong_${classInfo?.name || 'Lop'}_${thang}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e: any) { nhac('Không xuất được Excel: ' + (e?.message || '')); }
    setDangLam('');
  };

  if (chuaTaoBang) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-bold flex items-center gap-2">
          <AlertTriangle size={18} /> Chưa tạo bảng dữ liệu — chạy tệp
          <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200">scratch/tao-bang-diem-thuong.sql</code>
          rồi tải lại trang.
        </div>
      </div>
    );
  }

  const nut = (dang: string) => dangLam === dang;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Thanh công cụ */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select value={thang} onChange={e => setThang(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-700 bg-white outline-none focus:border-teal-500">
          {cacThang.map(t => (
            <option key={t} value={t}>Tháng {t.split('-').reverse().join('/')}</option>
          ))}
        </select>

        <button onClick={quet} disabled={!!dangLam || daChot}
                title="Đọc lại bài luyện tập và bài kiểm tra rồi cộng điểm cho bài chưa cộng"
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50">
          {nut('quet') ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
          Cập nhật điểm từ bài làm
        </button>

        <button onClick={quetBu} disabled={!!dangLam}
                title="Quét lại 12 tháng gần đây, cộng bù những bài chưa được tính điểm"
                className="bg-white border border-amber-300 text-amber-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-50 disabled:opacity-50">
          {nut('bu') ? <Loader2 size={17} className="animate-spin" /> : <History size={17} />}
          Quét bù tháng trước
        </button>

        <button onClick={doiKhoa} disabled={!!dangLam}
                className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 ${
                  daChot ? 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-50'
                         : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
          {nut('khoa') ? <Loader2 size={17} className="animate-spin" />
            : daChot ? <Unlock size={17} /> : <Lock size={17} />}
          {daChot ? 'Mở khoá tháng' : 'Chốt tháng'}
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button onClick={xuatAnh} disabled={!!dangLam}
                  className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-100 disabled:opacity-50">
            {nut('anh') ? <Loader2 size={17} className="animate-spin" /> : <ImageIcon size={17} />} Ảnh
          </button>
          <button onClick={xuatExcel} disabled={!!dangLam}
                  className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-100 disabled:opacity-50">
            {nut('excel') ? <Loader2 size={17} className="animate-spin" /> : <FileSpreadsheet size={17} />} Excel
          </button>
          <button onClick={() => setMoPhieu(true)} disabled={!!dangLam}
                  title="Phiếu riêng từng em, có trang trí - xuất ảnh gửi Zalo cho phụ huynh"
                  className="bg-amber-50 text-amber-800 border border-amber-100 px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-100 disabled:opacity-50">
            <FileText size={17} /> Phiếu phụ huynh
          </button>
        </div>
      </div>

      {daChot && (
        <div className="mb-4 p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-[13.5px] font-bold flex items-center gap-2">
          <Lock size={16} /> Tháng này đã chốt — không cộng/trừ điểm được nữa. Vẫn xuất báo cáo và mở sân khấu vinh danh bình thường.
        </div>
      )}
      {bao && (
        <div className="mb-4 p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-[13.5px] font-bold">{bao}</div>
      )}

      {dangTai ? (
        <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
      ) : (
        <div ref={khungAnh} className="bg-white p-4">
          <div className="flex items-center justify-between border-b-2 border-teal-600 pb-4 mb-4">
            <div className="flex items-center gap-4">
              <img src="/logo.jpg" alt="Logo" className="h-16 object-contain rounded-lg" />
              <div>
                <h3 className="text-xl font-black text-teal-700 uppercase">{classInfo?.name}</h3>
                <p className="text-gray-600 font-medium">
                  Điểm thưởng tháng <span className="text-gray-800 font-bold">{thang.split('-').reverse().join('/')}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-gray-500">Ngày xuất</div>
              <div className="text-lg font-black text-gray-800">{new Date().toLocaleDateString('vi-VN')}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <BangXep ten="TỔNG ĐIỂM THÁNG" Icon={Trophy} onChon={setEmDangXem}
                     ds={(bang?.theoTong || []).map(d => ({ id: d.hs.id, ten: d.hs.ten, so: d.tong }))} />
            {bang?.coThangTruoc ? (
              <BangXep ten="TIẾN BỘ NHẤT" Icon={TrendingUp} onChon={setEmDangXem}
                       ds={(bang?.theoTienBo || []).map(d => ({
                         id: d.hs.id, ten: d.hs.ten, so: d.tang, phu: `${d.truoc} → ${d.tong}`,
                       }))} />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 flex items-center">
                <p className="text-gray-500 text-[13.5px] leading-relaxed">
                  <b>Chưa có bảng tiến bộ.</b> Tháng trước
                  ({thangTruoc(thang).split('-').reverse().join('/')}) chưa có điểm nào nên
                  chưa so được. Từ tháng sau bảng này sẽ tự hiện.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 text-right text-xs text-gray-400 italic">
            * Điểm thưởng gồm: phát biểu trên lớp, bài luyện tập, bài kiểm tra và thi online
            đạt từ 7 điểm, và thưởng tiến bộ. Báo cáo xuất tự động từ hệ thống.
          </div>
        </div>
      )}

      <LichSuDiemModal hs={emDangXem} onClose={() => setEmDangXem(null)} />

      <PhieuPhuHuynhModal
        isOpen={moPhieu}
        onClose={() => setMoPhieu(false)}
        classId={classId}
        classInfo={classInfo}
        thang={thang}
        bang={bang}
      />
    </div>
  );
}

function BangXep({ ten, Icon, ds, onChon }: {
  ten: string; Icon: any;
  ds: { id?: string; ten: string; so: number; phu?: string }[];
  /* Bấm vào một dòng để xem em ấy được cộng những gì. Dùng div chứ không dùng button:
     bảng này còn được chụp thành ẢNH để gửi phụ huynh, thêm thẻ nút vào là ảnh lệch. */
  onChon?: (hs: { id: string; ten: string }) => void;
}) {
  const huy = ['🥇', '🥈', '🥉'];
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-100 flex items-center gap-2">
        <Icon size={17} className="text-teal-700" />
        <span className="font-black text-gray-700 tracking-wide text-[14px]">{ten}</span>
      </div>
      {ds.length === 0 ? (
        <p className="p-5 text-center text-gray-400 text-sm">Chưa có học sinh nào.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {ds.map((d, i) => (
            <div key={d.ten + i}
                 onClick={() => { if (onChon && d.id) onChon({ id: d.id, ten: d.ten }); }}
                 title={onChon && d.id ? 'Xem em này được cộng những gì' : undefined}
                 className={`flex items-center gap-3 px-4 py-2 ${onChon && d.id ? 'cursor-pointer hover:bg-teal-50/60' : ''}`}>
              <span className="w-7 text-center font-black text-gray-400">{huy[i] || i + 1}</span>
              <span className="flex-1 min-w-0 font-bold text-gray-800 truncate">{d.ten}</span>
              {d.phu && <span className="text-[12px] text-gray-400 shrink-0">{d.phu}</span>}
              <span className={`font-black shrink-0 w-12 text-right ${d.so > 0 ? 'text-emerald-600' : d.so < 0 ? 'text-rose-500' : 'text-gray-400'}`}>
                {d.so > 0 ? '+' : ''}{d.so}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
