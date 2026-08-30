"use client";

import React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  GraduationCap, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2,
  FileText, Video, Presentation, X, Check, ClipboardList, AlertTriangle,
} from "lucide-react";

/**
 * KHU ÔN TẬP & KIỂM TRA - phía Thầy cô.
 *
 * Xếp theo Khối → Hình thức kiểm tra → từng đề, để đề ôn tập có một chỗ ở đàng hoàng
 * thay vì nằm lẫn ở cuối cây bài giảng với mỗi khoá một tên khác nhau.
 *
 * KHÔNG dựng bảng mới và KHÔNG viết lại trình soạn đề. Đề vẫn là `lesson_modules` kiểu
 * `practice` như phần luyện tập, nên nút "Soạn đề" mở thẳng trình soạn đang dùng, và
 * học sinh làm bài bằng đúng màn làm bài cũ - điểm chạy vào bảng điểm như thường.
 *
 * Link tải đề và video sửa đề gắn theo TỪNG ĐỀ, cất ở hai cột `attachment_url` và
 * `video_url` vốn có sẵn trên `lesson_modules` (cả kho chỉ 2/319 mục dùng tới).
 */

const HINH_THUC_SAN = ['Cuối chương', 'Giữa kì I', 'Cuối kì I', 'Giữa kì II', 'Cuối kì II'];
const NHO_KHOI = 'on-tap-khoi-lan-truoc';

type Khoi = { id: string; title: string };
type HinhThuc = { id: string; title: string; order_index: number | null };
type De = {
  id: string; title: string; order_index: number | null;
  content_markdown: string | null; attachment_url: string | null; video_url: string | null;
};

const demCau = (md: string | null) => ((md || '').match(/```quiz/g) || []).length;

export default function KhuOnTap() {
  const supabase = createClient();

  const [dsKhoi, setDsKhoi] = React.useState<Khoi[]>([]);
  const [khoiId, setKhoiId] = React.useState('');
  const [chuongId, setChuongId] = React.useState<string | null>(null);
  const [dsHinhThuc, setDsHinhThuc] = React.useState<HinhThuc[]>([]);
  const [hinhThucId, setHinhThucId] = React.useState('');
  const [dsDe, setDsDe] = React.useState<De[]>([]);

  const [dangTai, setDangTai] = React.useState(true);
  const [dangLuu, setDangLuu] = React.useState(false);
  const [loi, setLoi] = React.useState('');
  const [moThemHinhThuc, setMoThemHinhThuc] = React.useState(false);
  const [tenHinhThucMoi, setTenHinhThucMoi] = React.useState('');
  const [deDangSua, setDeDangSua] = React.useState<De | null>(null);

  /* ------------------------------------------------------------------ nạp khối */
  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.from('courses').select('id, title').order('title');
      const ds = (data as Khoi[]) || [];
      setDsKhoi(ds);
      const nho = localStorage.getItem(NHO_KHOI);
      setKhoiId(nho && ds.some(k => k.id === nho) ? nho : (ds[0]?.id || ''));
      setDangTai(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------------------- nạp hình thức của khối */
  const napHinhThuc = React.useCallback(async (idKhoi: string) => {
    if (!idKhoi) return;
    setDangTai(true); setLoi('');
    const { data: ch, error } = await supabase
      .from('chapters').select('id').eq('course_id', idKhoi).eq('loai', 'on-tap').limit(1);

    if (error) {
      /* Chưa chạy tệp SQL thì cột `loai` chưa có - báo cho rõ thay vì im lặng trống trơn. */
      setLoi(/loai/.test(error.message)
        ? 'Chưa chạy tệp scratch/tao-khu-on-tap.sql cho dự án Supabase này.'
        : error.message);
      setDsHinhThuc([]); setDsDe([]); setChuongId(null); setDangTai(false);
      return;
    }

    const idChuong = ch?.[0]?.id || null;
    setChuongId(idChuong);
    if (!idChuong) { setDsHinhThuc([]); setHinhThucId(''); setDsDe([]); setDangTai(false); return; }

    const { data: ls } = await supabase
      .from('lessons').select('id, title, order_index')
      .eq('chapter_id', idChuong).order('order_index');
    const ds = (ls as HinhThuc[]) || [];
    setDsHinhThuc(ds);
    setHinhThucId(v => (ds.some(h => h.id === v) ? v : (ds[0]?.id || '')));
    setDangTai(false);
  }, [supabase]);

  React.useEffect(() => {
    if (!khoiId) return;
    localStorage.setItem(NHO_KHOI, khoiId);
    napHinhThuc(khoiId);
  }, [khoiId, napHinhThuc]);

  /* --------------------------------------------------------- nạp đề của hình thức */
  const napDe = React.useCallback(async (idHinhThuc: string) => {
    if (!idHinhThuc) { setDsDe([]); return; }
    const { data } = await supabase
      .from('lesson_modules')
      .select('id, title, order_index, content_markdown, attachment_url, video_url')
      .eq('lesson_id', idHinhThuc).eq('type', 'practice').order('order_index');
    setDsDe((data as De[]) || []);
  }, [supabase]);

  React.useEffect(() => { napDe(hinhThucId); }, [hinhThucId, napDe]);

  /* ------------------------------------------------------------------ thêm/sửa */

  /** Khoá nào chưa có hộp Ôn tập thì dựng lúc cần, khỏi tạo sẵn 11 hộp rỗng. */
  const baoDamCoChuong = async (): Promise<string | null> => {
    if (chuongId) return chuongId;
    const { data: max } = await supabase
      .from('chapters').select('order_index').eq('course_id', khoiId)
      .order('order_index', { ascending: false }).limit(1);
    const { data, error } = await supabase.from('chapters').insert([{
      course_id: khoiId,
      title: 'Ôn tập & Kiểm tra',
      loai: 'on-tap',
      order_index: (max?.[0]?.order_index || 0) + 1,
    }]).select('id').single();
    if (error) { setLoi('Không tạo được hộp Ôn tập: ' + error.message); return null; }
    setChuongId(data.id);
    return data.id;
  };

  const themHinhThuc = async (ten: string) => {
    const t = ten.trim();
    if (!t || dangLuu) return;
    setDangLuu(true);
    const idChuong = await baoDamCoChuong();
    if (!idChuong) { setDangLuu(false); return; }
    const { data, error } = await supabase.from('lessons').insert([{
      course_id: khoiId,
      chapter_id: idChuong,
      title: t,
      order_index: dsHinhThuc.length + 1,
      content_jsonb: {},
    }]).select('id').single();
    setDangLuu(false);
    if (error) { setLoi('Không thêm được hình thức: ' + error.message); return; }
    setMoThemHinhThuc(false); setTenHinhThucMoi('');
    await napHinhThuc(khoiId);
    setHinhThucId(data.id);
  };

  const xoaHinhThuc = async (h: HinhThuc) => {
    const soDe = h.id === hinhThucId ? dsDe.length : -1;
    if (!window.confirm(
      `Xoá hình thức "${h.title}"?\n\n` +
      (soDe > 0 ? `Toàn bộ ${soDe} đề bên trong sẽ mất theo và KHÔNG lấy lại được.\n` : '') +
      'Kết quả học sinh đã làm vẫn còn trong sổ điểm.'
    )) return;
    await supabase.from('lesson_modules').delete().eq('lesson_id', h.id);
    await supabase.from('lessons').delete().eq('id', h.id);
    await napHinhThuc(khoiId);
  };

  const themDe = async () => {
    if (!hinhThucId || dangLuu) return;
    setDangLuu(true);
    /* Chỉ chèn ĐÚNG một mục đề. Trang Khóa học kèm thêm 2 mục "Lý thuyết" và "Tài liệu"
       cho mỗi bài, nên 5 bài kiểm tra cũ đang mang 10 mục rỗng - ở đây không lặp lại. */
    const { error } = await supabase.from('lesson_modules').insert([{
      lesson_id: hinhThucId,
      type: 'practice',
      title: `ĐỀ ${dsDe.length + 1}`,
      order_index: dsDe.length + 1,
    }]);
    setDangLuu(false);
    if (error) { setLoi('Không thêm được đề: ' + error.message); return; }
    napDe(hinhThucId);
  };

  const luuDe = async (de: De) => {
    setDangLuu(true);
    const { error } = await supabase.from('lesson_modules').update({
      title: de.title.trim() || 'Đề chưa đặt tên',
      attachment_url: de.attachment_url?.trim() || null,
      video_url: de.video_url?.trim() || null,
    }).eq('id', de.id);
    setDangLuu(false);
    if (error) { setLoi('Không lưu được: ' + error.message); return; }
    setDeDangSua(null);
    napDe(hinhThucId);
  };

  const xoaDe = async (de: De) => {
    if (!window.confirm(
      `Xoá đề "${de.title}" (${demCau(de.content_markdown)} câu)?\n\n` +
      'Không lấy lại được. Điểm học sinh đã làm vẫn còn trong sổ điểm.'
    )) return;
    await supabase.from('lesson_modules').delete().eq('id', de.id);
    napDe(hinhThucId);
  };

  const doiChoDe = async (i: number, huong: -1 | 1) => {
    const j = i + huong;
    if (j < 0 || j >= dsDe.length) return;
    const a = dsDe[i], b = dsDe[j];
    await supabase.from('lesson_modules').update({ order_index: b.order_index }).eq('id', a.id);
    await supabase.from('lesson_modules').update({ order_index: a.order_index }).eq('id', b.id);
    napDe(hinhThucId);
  };

  const hinhThucDangChon = dsHinhThuc.find(h => h.id === hinhThucId);
  const conLaiDeThem = HINH_THUC_SAN.filter(t => !dsHinhThuc.some(h => h.title === t));

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0">
          <ClipboardList className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-[21px] font-black text-gray-800 leading-tight">Ôn tập &amp; Kiểm tra</h1>
          <p className="text-[13px] text-gray-500">
            Đề ôn tập của từng khối, xếp theo hình thức kiểm tra — học sinh vào thẳng, không phải lần theo bài giảng
          </p>
        </div>
      </div>

      {loi && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[13.5px]
                        font-semibold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {loi}
        </div>
      )}

      {/* Tầng 1 - chọn khối */}
      <div className="mb-5">
        <div className="text-[11.5px] font-black text-gray-400 uppercase tracking-wider mb-2">Khối</div>
        <div className="flex flex-wrap gap-2">
          {dsKhoi.map(k => (
            <button key={k.id} onClick={() => setKhoiId(k.id)}
                    className={`px-3.5 py-2 rounded-xl text-[13px] font-bold border transition-colors ${
                      k.id === khoiId
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                    }`}>
              <GraduationCap className="w-4 h-4 inline mr-1.5 -mt-0.5" />{k.title}
            </button>
          ))}
        </div>
      </div>

      {dangTai ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : (
        <div className="grid md:grid-cols-[260px_1fr] gap-5 items-start">

          {/* Tầng 2 - hình thức kiểm tra */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200
                            text-[11.5px] font-black text-gray-500 uppercase tracking-wider">
              Hình thức kiểm tra
            </div>

            {dsHinhThuc.length === 0 && (
              <p className="px-4 py-5 text-[13px] text-gray-400 leading-relaxed">
                Khối này chưa có mục nào. Thêm một hình thức để bắt đầu.
              </p>
            )}

            {dsHinhThuc.map(h => (
              <button key={h.id} onClick={() => setHinhThucId(h.id)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 flex items-center gap-2
                                  transition-colors group ${
                        h.id === hinhThucId ? 'bg-indigo-50 border-l-[3px] border-l-indigo-600' : 'hover:bg-gray-50'
                      }`}>
                <span className={`flex-1 text-[13.5px] font-bold ${
                  h.id === hinhThucId ? 'text-indigo-800' : 'text-gray-700'}`}>{h.title}</span>
                <span onClick={e => { e.stopPropagation(); xoaHinhThuc(h); }}
                      title="Xoá hình thức này"
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-rose-600 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </span>
              </button>
            ))}

            <div className="p-3">
              {moThemHinhThuc ? (
                <div className="space-y-2">
                  {conLaiDeThem.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {conLaiDeThem.map(t => (
                        <button key={t} onClick={() => themHinhThuc(t)} disabled={dangLuu}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200
                                           text-[12px] font-bold hover:bg-indigo-100 disabled:opacity-50">
                          + {t}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <input value={tenHinhThucMoi}
                           onChange={e => setTenHinhThucMoi(e.target.value)}
                           onKeyDown={e => { if (e.key === 'Enter') themHinhThuc(tenHinhThucMoi); }}
                           placeholder="Hoặc gõ tên khác…"
                           className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[12.5px]
                                      outline-none focus:border-indigo-500" />
                    <button onClick={() => themHinhThuc(tenHinhThucMoi)} disabled={dangLuu || !tenHinhThucMoi.trim()}
                            className="px-2.5 rounded-lg bg-indigo-600 text-white disabled:opacity-40">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setMoThemHinhThuc(false); setTenHinhThucMoi(''); }}
                            className="px-2.5 rounded-lg border border-gray-200 text-gray-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setMoThemHinhThuc(true)}
                        className="w-full py-2 rounded-xl border border-dashed border-gray-300 text-gray-500
                                   text-[12.5px] font-bold hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                  + Thêm hình thức
                </button>
              )}
            </div>
          </div>

          {/* Tầng 3 - danh sách đề */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
              <span className="text-[11.5px] font-black text-gray-500 uppercase tracking-wider">
                {hinhThucDangChon ? `Đề — ${hinhThucDangChon.title}` : 'Đề'}
              </span>
              {hinhThucId && (
                <button onClick={themDe} disabled={dangLuu}
                        className="ml-auto px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[12.5px]
                                   font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Thêm đề
                </button>
              )}
            </div>

            {!hinhThucId ? (
              <p className="px-4 py-10 text-[13.5px] text-gray-400 text-center">
                Chọn một hình thức kiểm tra ở bên trái.
              </p>
            ) : dsDe.length === 0 ? (
              <p className="px-4 py-10 text-[13.5px] text-gray-400 text-center">
                Chưa có đề nào. Bấm <b>Thêm đề</b> rồi bấm <b>Soạn đề</b> để nhập câu hỏi.
              </p>
            ) : dsDe.map((de, i) => (
              <div key={de.id} className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-gray-800 truncate">{de.title}</div>
                  <div className="text-[12px] text-gray-400 flex items-center gap-2.5 mt-0.5">
                    <span>{demCau(de.content_markdown)} câu</span>
                    {de.attachment_url && <span className="text-emerald-600 font-bold">• có link tải đề</span>}
                    {de.video_url && <span className="text-rose-600 font-bold">• có video sửa</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link href={`/admin/lessons/editor?lessonId=${hinhThucId}&moduleId=${de.id}`}
                        className="px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200
                                   text-[12.5px] font-bold hover:bg-orange-100 flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5" /> Soạn đề
                  </Link>
                  <a href={`/present/${hinhThucId}?moduleId=${de.id}`} target="_blank" rel="noopener noreferrer"
                     className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200
                                text-[12.5px] font-bold hover:bg-amber-100 flex items-center gap-1.5">
                    <Presentation className="w-3.5 h-3.5" /> Chữa bài
                  </a>
                  <button onClick={() => setDeDangSua({ ...de })} title="Đổi tên, gắn link tải đề và video sửa đề"
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300">
                    <FileText className="w-4 h-4" />
                  </button>
                  <button onClick={() => doiChoDe(i, -1)} disabled={i === 0}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-400 disabled:opacity-30 hover:text-gray-700">
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => doiChoDe(i, 1)} disabled={i === dsDe.length - 1}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-400 disabled:opacity-30 hover:text-gray-700">
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button onClick={() => xoaDe(de)}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-rose-600 hover:border-rose-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hộp sửa đề: tên + link tải đề + link video sửa */}
      {deDangSua && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
             onClick={() => setDeDangSua(null)}>
          <div onClick={e => e.stopPropagation()}
               className="bg-white w-full max-w-[520px] rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-indigo-600 flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-white" />
              <h2 className="text-[15px] font-black text-white">Thông tin đề</h2>
              <button onClick={() => setDeDangSua(null)} className="ml-auto p-1 text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11.5px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                  Tên đề
                </label>
                <input value={deDangSua.title}
                       onChange={e => setDeDangSua({ ...deDangSua, title: e.target.value })}
                       className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-500
                                  outline-none text-[14px] font-bold" />
              </div>

              <div>
                <label className="text-[11.5px] font-black text-gray-400 uppercase tracking-wider mb-1.5
                                  flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Link tải đề
                </label>
                <input value={deDangSua.attachment_url || ''}
                       onChange={e => setDeDangSua({ ...deDangSua, attachment_url: e.target.value })}
                       placeholder="Dán link Google Drive của tệp đề…"
                       className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-500
                                  outline-none text-[13px]" />
                <p className="text-[12px] text-gray-400 mt-1">Học sinh bấm là mở ra, in giấy làm bài được.</p>
              </div>

              <div>
                <label className="text-[11.5px] font-black text-gray-400 uppercase tracking-wider mb-1.5
                                  flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" /> Link video sửa đề
                </label>
                <input value={deDangSua.video_url || ''}
                       onChange={e => setDeDangSua({ ...deDangSua, video_url: e.target.value })}
                       placeholder="Dán link YouTube…"
                       className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-500
                                  outline-none text-[13px]" />
                <p className="text-[12px] text-gray-400 mt-1">Xem được ngay trong app, không phải sang YouTube.</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setDeDangSua(null)}
                        className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-[13.5px]">
                  Thôi
                </button>
                <button onClick={() => luuDe(deDangSua)} disabled={dangLuu}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-[13.5px]
                                   hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {dangLuu ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
