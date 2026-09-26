"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Mic, Sparkles, Loader2, Play, Pause, Upload, Trash2, RefreshCw, Copy, Check,
  AlertTriangle, ClipboardList, Volume2,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { tachSlide } from '@/utils/tachSlide';
import { layCauHinhAI, goiGeminiTrenTrinhDuyet } from '@/utils/geminiBrowser';
import {
  type DoanGiong, type KichBanGiong, type ManhSlide,
  BoPhatGiong, NHIP_MAC_DINH, dungDanhSachManh, taiKichBan, urlTep,
} from '@/utils/giongBaiGiang';

/**
 * Thu giọng đọc AI cho bài giảng trong app — bản trong app của mạch thu âm slide PowerPoint.
 *
 * Ba việc, làm theo thứ tự như bên PowerPoint:
 *   1. AI soạn lời nháp cho từng mảnh slide, thầy cô sửa lại từng ô.
 *   2. Chép lời sang ElevenLabs, tạo giọng, tải mp3 về.
 *   3. Kéo mp3 vào đây — máy tự đo thời lượng, ghi vào kịch bản của bài.
 *
 * Máy chiếu và trang học sinh đọc cùng tệp `kich-ban.json` ấy nên không phải làm gì thêm.
 */

interface Khoa { id: string; title: string }
interface Bai { id: string; title: string }
interface Module { id: string; title: string; type: string; content_markdown: string | null; presentation_markdown: string | null }

/** Lượt web ElevenLabs tính khoảng 1,5 lần số chữ (đo trên hai tài khoản khi thu bài PowerPoint). */
const HE_SO_LUOT = 1.5;

const LOI_DAN_AI = `Bạn là giáo viên đang giảng bài trên lớp. Viết LỜI GIẢNG để đọc thành tiếng cho từng mảnh slide dưới đây.

LUẬT:
- Mỗi mảnh 2 đến 4 câu, bám sát chữ trên slide, KHÔNG thêm kiến thức ngoài slide.
- Câu ngắn, có nhịp, lôi cuốn, chống buồn ngủ. Mở mỗi mảnh bằng một câu móc ngắn.
- KHÔNG đọc công thức dài theo ký hiệu — diễn ý bằng lời ("bình phương cạnh huyền bằng tổng bình phương hai cạnh góc vuông").
- Số và ký hiệu viết bằng chữ để máy đọc đúng.
- Xưng "thầy" và gọi học sinh là "các em".
- Không đọc lại tiêu đề slide một cách máy móc, không nói "slide này", "như các em thấy trên màn hình".
- Mảnh chỉ có hình ảnh hoặc chỉ có tiêu đề mục thì để lời trống.

Trả về ĐÚNG một khối JSON, không giải thích gì thêm:
{"loi": [{"khoa": "s01", "loi": "..."}, ...]}`;

export default function ThuGiongPage() {
  const supabase = useMemo(() => createClient(), []);

  const [khoas, setKhoas] = useState<Khoa[]>([]);
  const [bais, setBais] = useState<Bai[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [khoaId, setKhoaId] = useState('');
  const [baiId, setBaiId] = useState('');
  const [moduleId, setModuleId] = useState('');

  const [manhs, setManhs] = useState<ManhSlide[]>([]);
  const [kichBan, setKichBan] = useState<KichBanGiong>({ phien_ban: 1, nhip: NHIP_MAC_DINH, cap_nhat: '', doan: [] });
  const [dangTai, setDangTai] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [dangSoan, setDangSoan] = useState(false);
  const [dangPhat, setDangPhat] = useState<string | null>(null);
  const [daChep, setDaChep] = useState<string | null>(null);
  const [nhatKy, setNhatKy] = useState<string>('');

  const phat = useRef<BoPhatGiong | null>(null);
  const oTep = useRef<HTMLInputElement>(null);
  const khoaDangTai = useRef<string | null>(null);

  useEffect(() => {
    phat.current = new BoPhatGiong(NHIP_MAC_DINH);
    phat.current.onXong = () => setDangPhat(null);
    return () => phat.current?.dung();
  }, []);

  /* Danh sách khoá học → bài → module */
  useEffect(() => {
    supabase.from('courses').select('id,title').order('title').then(({ data }) => setKhoas(data || []));
  }, [supabase]);

  useEffect(() => {
    if (!khoaId) { setBais([]); setBaiId(''); return; }
    supabase.from('lessons').select('id,title').eq('course_id', khoaId).order('order_index')
      .then(({ data }) => { setBais(data || []); setBaiId(''); setModuleId(''); });
  }, [khoaId, supabase]);

  useEffect(() => {
    if (!baiId) { setModules([]); setModuleId(''); return; }
    supabase.from('lesson_modules')
      .select('id,title,type,content_markdown,presentation_markdown')
      .eq('lesson_id', baiId).order('order_index')
      .then(({ data }) => {
        const ds = (data || []) as Module[];
        setModules(ds);
        /* Mặc định chọn module lý thuyết - đó là bài giảng, chỗ cần giọng đọc. */
        setModuleId(ds.find(m => m.type === 'theory')?.id || ds[0]?.id || '');
      });
  }, [baiId, supabase]);

  const module = modules.find(m => m.id === moduleId);
  const markdown = module?.presentation_markdown || module?.content_markdown || '';

  /* Đổi module: dựng lại danh sách mảnh và nạp kịch bản đã thu */
  useEffect(() => {
    if (!moduleId || !markdown) { setManhs([]); setKichBan({ phien_ban: 1, nhip: NHIP_MAC_DINH, cap_nhat: '', doan: [] }); return; }
    setManhs(dungDanhSachManh(markdown));
    setDangTai(true);
    taiKichBan(moduleId, true).then(kb => {
      setKichBan(kb || { phien_ban: 1, nhip: NHIP_MAC_DINH, cap_nhat: '', doan: [] });
      setDangTai(false);
    });
  }, [moduleId, markdown]);

  const theoKhoa = useMemo(() => new Map(kichBan.doan.map(d => [d.khoa, d])), [kichBan]);

  /** Ghép mảnh trên slide với đoạn trong kịch bản, kèm trạng thái để tô màu. */
  const dong = manhs.map(m => {
    const d = theoKhoa.get(m.khoa);
    const lechChu = !!d?.mp3 && !!d.chuKy && d.chuKy !== m.chuKy;
    return {
      ...m,
      loi: d?.loi || '',
      mp3: d?.mp3 || '',
      giay: d?.giay,
      trangThai: !d?.loi ? 'trong' : !d.mp3 ? 'cho-thu' : lechChu ? 'lech' : 'xong',
    } as const;
  });

  const hangDoi = dong.filter(d => d.loi && !d.mp3);
  const soXong = dong.filter(d => d.mp3).length;
  const soLech = dong.filter(d => d.trangThai === 'lech').length;
  const kyTuChoThu = hangDoi.reduce((t, d) => t + d.loi.length, 0);

  /* ───────────────────────────────────────────────── ghi kịch bản ─── */

  const ghiKichBan = async (doanMoi: DoanGiong[], im = false) => {
    const kb: KichBanGiong = { phien_ban: 1, nhip: kichBan.nhip || NHIP_MAC_DINH, cap_nhat: new Date().toISOString(), doan: doanMoi };
    setKichBan(kb);
    if (!im) setDangLuu(true);
    try {
      const r = await fetch('/api/admin/giong-bai-giang', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viec: 'ghi-kich-ban', moduleId, kichBan: kb }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
    } catch (e: any) {
      alert('Không ghi được kịch bản: ' + (e?.message || e));
    } finally {
      setDangLuu(false);
    }
  };

  /** Sửa lời một đoạn (chỉ giữ trong máy; bấm Lưu lời giảng mới ghi lên kho). */
  const datLoi = (m: ManhSlide, loi: string) => {
    const cu = kichBan.doan.filter(d => d.khoa !== m.khoa);
    const truoc = theoKhoa.get(m.khoa);
    const moi: DoanGiong = {
      khoa: m.khoa, slide: m.slide, manh: m.manh, loi,
      chuKy: truoc?.chuKy || m.chuKy, mp3: truoc?.mp3, giay: truoc?.giay,
    };
    setKichBan({ ...kichBan, doan: [...cu, moi].sort(sapXep) });
  };

  const sapXep = (a: DoanGiong, b: DoanGiong) => (a.slide - b.slide) || (a.manh - b.manh);

  /* ───────────────────────────────────────────────── AI soạn lời ─── */

  const aiSoanLoi = async () => {
    if (!manhs.length) return;
    const daCo = dong.filter(d => d.loi).length;
    if (daCo > 0 && !confirm(`${daCo} mảnh đã có lời. AI chỉ viết cho những mảnh CÒN TRỐNG, không đè lên lời thầy đã sửa. Tiếp tục?`)) return;

    setDangSoan(true);
    setNhatKy('Đang xin khoá AI…');
    try {
      const cauHinh = await layCauHinhAI();
      const canViet = dong.filter(d => !d.loi);
      const goi = canViet.map(d => `### ${d.khoa} (slide ${d.slide + 1}${d.manh > 0 ? `, ý ${d.manh + 1}` : ''})\n${layNoiDungManh(markdown, d)}`).join('\n\n');
      setNhatKy(`Đang viết lời cho ${canViet.length} mảnh…`);
      const kq = await goiGeminiTrenTrinhDuyet(
        cauHinh,
        [`${LOI_DAN_AI}\n\nTÊN BÀI: ${bais.find(b => b.id === baiId)?.title || ''}\n\nCÁC MẢNH SLIDE:\n\n${goi}`],
        { responseMimeType: 'application/json' },
      );
      const j = JSON.parse(kq.text.replace(/^```json\s*|\s*```$/g, ''));
      const bang = new Map<string, string>((j.loi || []).map((x: any) => [String(x.khoa), String(x.loi || '')]));
      const doanMoi = manhs.map(m => {
        const cu = theoKhoa.get(m.khoa);
        const loi = cu?.loi || bang.get(m.khoa) || '';
        return { khoa: m.khoa, slide: m.slide, manh: m.manh, loi, chuKy: cu?.chuKy || m.chuKy, mp3: cu?.mp3, giay: cu?.giay } as DoanGiong;
      }).filter(d => d.loi || d.mp3);
      await ghiKichBan(doanMoi.sort(sapXep));
      setNhatKy(`AI viết xong ${bang.size} mảnh (model ${kq.model}). Thầy đọc lại và sửa trước khi thu.`);
    } catch (e: any) {
      setNhatKy('');
      alert('AI chưa viết được: ' + (e?.message || e));
    } finally {
      setDangSoan(false);
    }
  };

  /* ───────────────────────────────────────────────── nghe & tải mp3 ─── */

  const nghe = async (khoa: string, mp3: string) => {
    if (dangPhat === khoa) { phat.current?.dung(); setDangPhat(null); return; }
    setDangPhat(khoa);
    const ok = await phat.current?.phat(urlTep(moduleId, mp3));
    if (!ok) { setDangPhat(null); alert('Không phát được tệp này.'); }
  };

  const chonTep = (khoa: string) => { khoaDangTai.current = khoa; oTep.current?.click(); };

  /** Đo thời lượng thật của mp3 để máy chiếu biết khi nào sang ý kế tiếp. */
  const doThoiLuong = (tep: File): Promise<number> => new Promise(giai => {
    const u = URL.createObjectURL(tep);
    const a = new Audio(u);
    a.onloadedmetadata = () => { giai(Math.round((a.duration || 0) * 10) / 10); URL.revokeObjectURL(u); };
    a.onerror = () => { giai(0); URL.revokeObjectURL(u); };
  });

  const nhanTep = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const teps = Array.from(e.target.files || []);
    e.target.value = '';
    if (!teps.length) return;

    /* Một tệp cho một đoạn đã chỉ định; nhiều tệp thì rải theo ĐÚNG THỨ TỰ HÀNG ĐỢI -
       tệp ElevenLabs tải về mang tên theo giờ nên không khớp được bằng tên. */
    const dich = khoaDangTai.current
      ? [khoaDangTai.current]
      : hangDoi.map(d => d.khoa).slice(0, teps.length);
    khoaDangTai.current = null;
    if (!dich.length) return alert('Không còn đoạn nào đang chờ thu.');

    let doanMoi = [...kichBan.doan];
    for (let i = 0; i < Math.min(teps.length, dich.length); i++) {
      const khoa = dich[i];
      setNhatKy(`Đang tải ${i + 1}/${dich.length}: ${khoa}…`);
      const giay = await doThoiLuong(teps[i]);
      const fd = new FormData();
      fd.append('viec', 'tai-mp3'); fd.append('moduleId', moduleId); fd.append('khoa', khoa); fd.append('tep', teps[i]);
      const r = await fetch('/api/admin/giong-bai-giang', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) { alert(`Không tải được ${khoa}: ${j.error}`); break; }
      const m = manhs.find(x => x.khoa === khoa);
      const cu = doanMoi.find(d => d.khoa === khoa);
      const moi: DoanGiong = {
        khoa, slide: m?.slide ?? cu?.slide ?? 0, manh: m?.manh ?? cu?.manh ?? 0,
        loi: cu?.loi || '', chuKy: m?.chuKy || cu?.chuKy || '', mp3: j.ten, giay,
      };
      doanMoi = [...doanMoi.filter(d => d.khoa !== khoa), moi];
      /* Tỉ lệ chữ/giây ngoài khoảng 11–24 là dấu hiệu tải nhầm bản khác (phép đo dùng khi
         thu bài PowerPoint). Chỉ cảnh báo, không chặn. */
      const tyLe = giay > 0 ? (moi.loi.length / giay) : 0;
      if (moi.loi && giay > 1 && (tyLe < 8 || tyLe > 28)) {
        setNhatKy(`⚠ ${khoa}: ${moi.loi.length} chữ / ${giay}s = ${tyLe.toFixed(1)} chữ mỗi giây — nghe lại xem có tải nhầm đoạn không.`);
      }
    }
    await ghiKichBan(doanMoi.sort(sapXep));
    setNhatKy(nk => nk.startsWith('⚠') ? nk : `Đã tải xong ${Math.min(teps.length, dich.length)} đoạn.`);
  };

  const xoaGiong = async (khoa: string, mp3: string) => {
    if (!confirm(`Xoá giọng của đoạn ${khoa}? Lời giảng vẫn giữ nguyên.`)) return;
    await fetch('/api/admin/giong-bai-giang', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viec: 'xoa-mp3', moduleId, ten: mp3 }),
    });
    await ghiKichBan(kichBan.doan.map(d => d.khoa === khoa ? { ...d, mp3: undefined, giay: undefined } : d));
  };

  const chepLoi = (khoa: string, loi: string) => {
    navigator.clipboard?.writeText(loi);
    setDaChep(khoa);
    setTimeout(() => setDaChep(null), 1500);
  };

  const mau: Record<string, string> = {
    trong: 'bg-white border-gray-200',
    'cho-thu': 'bg-amber-50/60 border-amber-200',
    xong: 'bg-emerald-50/50 border-emerald-200',
    lech: 'bg-rose-50 border-rose-300',
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
          <Mic className="w-8 h-8 text-indigo-600" /> Thu giọng bài giảng
        </h1>
        <p className="text-slate-500 mt-1">
          AI viết lời nháp → thầy sửa → chép sang ElevenLabs tạo giọng → kéo tệp mp3 vào đây.
          Máy chiếu và trang học sinh tự phát, chữ hiện theo lời.
        </p>
      </div>

      {/* Chọn bài */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase">Khoá học</span>
          <select value={khoaId} onChange={e => setKhoaId(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">— Chọn —</option>
            {khoas.map(k => <option key={k.id} value={k.id}>{k.title}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase">Bài</span>
          <select value={baiId} onChange={e => setBaiId(e.target.value)} disabled={!bais.length} className="border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50">
            <option value="">— Chọn —</option>
            {bais.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase">Mục trong bài</span>
          <select value={moduleId} onChange={e => setModuleId(e.target.value)} disabled={!modules.length} className="border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50">
            {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </label>
      </div>

      {moduleId && (
        <>
          {/* Tổng quan + việc chung */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-sm font-bold text-slate-700">
              {manhs.length} mảnh đọc được · <span className="text-emerald-700">{soXong} đã thu</span>
              {hangDoi.length > 0 && <> · <span className="text-amber-700">{hangDoi.length} chờ thu</span></>}
              {soLech > 0 && <> · <span className="text-rose-700">{soLech} lệch chữ</span></>}
            </span>
            {hangDoi.length > 0 && (
              <span className="text-xs font-semibold text-slate-500">
                {kyTuChoThu.toLocaleString('vi-VN')} ký tự ≈ {Math.round(kyTuChoThu * HE_SO_LUOT).toLocaleString('vi-VN')} lượt ElevenLabs
              </span>
            )}
            <div className="ml-auto flex flex-wrap gap-2">
              <button onClick={aiSoanLoi} disabled={dangSoan || !manhs.length}
                className="flex items-center gap-1.5 bg-violet-100 border border-violet-300 text-violet-800 font-bold text-sm px-3 py-2 rounded-xl hover:bg-violet-200 disabled:opacity-50">
                {dangSoan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} AI soạn lời còn trống
              </button>
              <button onClick={() => ghiKichBan(kichBan.doan)} disabled={dangLuu}
                className="flex items-center gap-1.5 bg-indigo-600 text-white font-bold text-sm px-3 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                {dangLuu ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Lưu lời giảng
              </button>
              <button onClick={() => chepLoi('tat-ca', hangDoi.map(d => `[${d.khoa}] ${d.loi}`).join('\n\n'))}
                disabled={!hangDoi.length}
                title="Chép cả hàng đợi để dán sang ElevenLabs"
                className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 font-bold text-sm px-3 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50">
                <ClipboardList className="w-4 h-4" /> Chép hàng đợi
              </button>
              <button onClick={() => chonTep('')} disabled={!hangDoi.length}
                title="Kéo cả nắm mp3 vừa tải từ ElevenLabs — máy rải theo đúng thứ tự hàng đợi"
                className="flex items-center gap-1.5 bg-teal-600 text-white font-bold text-sm px-3 py-2 rounded-xl hover:bg-teal-700 disabled:opacity-50">
                <Upload className="w-4 h-4" /> Tải nhiều mp3
              </button>
              <button onClick={() => taiKichBan(moduleId, true).then(kb => kb && setKichBan(kb))}
                className="p-2 rounded-xl border border-gray-300 text-gray-500 hover:bg-gray-50" title="Tải lại">
                <RefreshCw className={`w-4 h-4 ${dangTai ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {nhatKy && (
            <div className={`px-4 py-2.5 rounded-xl text-sm font-semibold ${nhatKy.startsWith('⚠') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'}`}>
              {nhatKy}
            </div>
          )}

          {soLech > 0 && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span><b>{soLech} đoạn</b> có chữ trên slide đã đổi sau khi thu — giọng đang đọc bản cũ. Sửa lời rồi thu lại đoạn đó.</span>
            </div>
          )}

          {/* Bảng từng mảnh */}
          <div className="space-y-3">
            {dong.map(d => (
              <div key={d.khoa} className={`rounded-2xl border p-4 ${mau[d.trangThai]}`}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-20">
                    <div className="font-black text-slate-800 text-sm">{d.khoa}</div>
                    <div className="text-[11px] text-slate-500">
                      Slide {d.slide + 1}{d.manh > 0 ? ` · ý ${d.manh + 1}` : ''}
                    </div>
                    {d.trangThai === 'xong' && <div className="text-[11px] font-bold text-emerald-700 mt-1">✓ {d.giay}s</div>}
                    {d.trangThai === 'lech' && <div className="text-[11px] font-bold text-rose-700 mt-1">⚠ chữ đã đổi</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-slate-500 mb-2 line-clamp-2">{d.trich}</p>
                    <textarea
                      value={d.loi}
                      onChange={e => datLoi(d, e.target.value)}
                      onBlur={() => ghiKichBan(kichBan.doan, true)}
                      rows={2}
                      placeholder="Lời giảng để đọc thành tiếng — để trống thì mảnh này không đọc."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y bg-white focus:border-indigo-400 outline-none"
                    />
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                      <span>{d.loi.length} ký tự</span>
                      {d.loi && <button onClick={() => chepLoi(d.khoa, d.loi)} className="flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800">
                        {daChep === d.khoa ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} chép lời
                      </button>}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col gap-1.5">
                    {d.mp3 ? (
                      <>
                        <button onClick={() => nghe(d.khoa, d.mp3)} className="p-2 rounded-lg bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50" title="Nghe thử">
                          {dangPhat === d.khoa ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button onClick={() => chonTep(d.khoa)} className="p-2 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50" title="Thay bằng tệp khác">
                          <Upload className="w-4 h-4" />
                        </button>
                        <button onClick={() => xoaGiong(d.khoa, d.mp3)} className="p-2 rounded-lg bg-white border border-rose-300 text-rose-600 hover:bg-rose-50" title="Xoá giọng">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => chonTep(d.khoa)} disabled={!d.loi}
                        className="p-2 rounded-lg bg-white border border-teal-300 text-teal-700 hover:bg-teal-50 disabled:opacity-40" title="Tải mp3 cho đoạn này">
                        <Upload className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!dangTai && manhs.length === 0 && (
              <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-gray-200">
                Mục này không có nội dung slide để đọc.
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm">
            <Volume2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Tạo giọng trên <a href="https://elevenlabs.io/app/speech-synthesis/text-to-speech" target="_blank" rel="noopener noreferrer" className="font-bold underline">ElevenLabs</a>:
              chọn giọng → model Eleven v3 → dán lời từng đoạn → Generate → tải mp3 → kéo vào đây.
              Gói miễn phí 10.000 lượt/tháng, lượt tính ≈ 1,5 lần số chữ.
            </span>
          </div>
        </>
      )}

      <input ref={oTep} type="file" accept="audio/mpeg,audio/mp3,.mp3" multiple onChange={nhanTep} className="hidden" />
    </div>
  );
}

/** Nội dung gốc của một mảnh, để đưa cho AI viết lời (cắt bớt cho khỏi tốn hạn mức). */
function layNoiDungManh(markdown: string, d: { slide: number; manh: number }): string {
  const sl = tachSlide(markdown);
  return String(sl[d.slide]?.[d.manh] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 900);
}
