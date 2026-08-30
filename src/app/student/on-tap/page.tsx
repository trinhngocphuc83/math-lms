"use client";

import React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  ClipboardList, FileText, Video, Loader2, ChevronRight, ArrowLeft, X, PlayCircle,
} from "lucide-react";

/**
 * KHU ÔN TẬP & KIỂM TRA - phía học sinh.
 *
 * Lý do có trang này: muốn làm một đề ôn tập, em phải bấm năm lần - trang chủ, thẻ khoá
 * học, "Vào lớp học", mở chương, chọn bài, rồi còn phải tìm đúng thẻ Luyện tập. Ở đây
 * hai lần bấm là đang làm bài.
 *
 * Không dựng màn làm bài mới: bấm "Làm bài" là sang thẳng màn làm bài quen thuộc
 * (/student/lessons/...?moduleId=...), nên nộp bài, chấm điểm, làm lại y hệt phần
 * luyện tập và điểm vẫn chạy vào sổ điểm như thường.
 *
 * Khối lấy từ khoá học đã duyệt của chính em, không phải chọn.
 */

type De = {
  id: string; title: string; order_index: number | null;
  content_markdown: string | null; attachment_url: string | null; video_url: string | null;
};
type HinhThuc = { id: string; title: string; order_index: number | null; dsDe: De[] };

const demCau = (md: string | null) => ((md || '').match(/```quiz/g) || []).length;

/** Đổi link YouTube thường thành link nhúng xem được ngay trong trang. */
const linkNhung = (url: string) => {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
};

export default function OnTapHocSinh() {
  const supabase = createClient();
  const [dangTai, setDangTai] = React.useState(true);
  const [tenKhoi, setTenKhoi] = React.useState('');
  const [dsHinhThuc, setDsHinhThuc] = React.useState<HinhThuc[]>([]);
  const [dangMo, setDangMo] = React.useState<HinhThuc | null>(null);
  const [videoDangXem, setVideoDangXem] = React.useState<De | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/student/my-course');
        const { course_id } = await r.json();
        if (!course_id) { setDangTai(false); return; }

        const { data: kh } = await supabase
          .from('courses').select('title').eq('id', course_id).single();
        setTenKhoi(kh?.title || '');

        const { data: ch } = await supabase
          .from('chapters').select('id').eq('course_id', course_id).eq('loai', 'on-tap').limit(1);
        const idChuong = ch?.[0]?.id;
        if (!idChuong) { setDangTai(false); return; }

        const { data: ls } = await supabase
          .from('lessons').select('id, title, order_index')
          .eq('chapter_id', idChuong).order('order_index');

        const ids = (ls || []).map(l => l.id);
        const { data: md } = ids.length
          ? await supabase.from('lesson_modules')
              .select('id, lesson_id, title, order_index, content_markdown, attachment_url, video_url')
              .in('lesson_id', ids).eq('type', 'practice').order('order_index')
          : { data: [] as any[] };

        setDsHinhThuc((ls || []).map(l => ({
          ...l,
          dsDe: (md || []).filter((m: any) => m.lesson_id === l.id) as De[],
        })));
      } finally {
        setDangTai(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dangTai) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6">

      <div className="flex items-center gap-3 mb-6">
        {dangMo ? (
          <button onClick={() => setDangMo(null)}
                  className="w-11 h-11 rounded-2xl bg-white border border-gray-200 flex items-center
                             justify-center shrink-0 hover:border-teal-400 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        ) : (
          <div className="w-11 h-11 rounded-2xl bg-teal-600 flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-[21px] font-black text-gray-800 leading-tight truncate">
            {dangMo ? dangMo.title : 'Ôn tập & Kiểm tra'}
          </h1>
          <p className="text-[13px] text-gray-500 truncate">
            {dangMo ? `${dangMo.dsDe.length} đề` : (tenKhoi || 'Chưa gắn khoá học')}
          </p>
        </div>
      </div>

      {/* Chưa có gì để ôn */}
      {dsHinhThuc.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center">
          <p className="text-[14px] text-gray-500 leading-relaxed">
            Chưa có đề ôn tập nào cho khối của em.<br />Thầy cô sẽ đăng đề trước mỗi kì kiểm tra.
          </p>
        </div>
      )}

      {/* Tầng 1 - các hình thức kiểm tra */}
      {!dangMo && dsHinhThuc.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {dsHinhThuc.map(h => (
            <button key={h.id} onClick={() => setDangMo(h)}
                    className="text-left rounded-2xl border border-gray-200 bg-white px-5 py-4
                               hover:border-teal-400 hover:shadow-sm transition-all flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15.5px] font-black text-gray-800 truncate">{h.title}</div>
                <div className="text-[12.5px] text-gray-400">
                  {h.dsDe.length > 0 ? `${h.dsDe.length} đề` : 'Chưa có đề'}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Tầng 2 - các đề trong một hình thức */}
      {dangMo && (
        <div className="space-y-3">
          {dangMo.dsDe.length === 0 && (
            <p className="text-[14px] text-gray-500 text-center py-10">Mục này chưa có đề nào.</p>
          )}

          {dangMo.dsDe.map(de => (
            <div key={de.id} className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
              <div className="text-[15.5px] font-black text-gray-800">{de.title}</div>
              <div className="text-[12.5px] text-gray-400 mb-3">{demCau(de.content_markdown)} câu</div>

              <div className="flex flex-wrap gap-2">
                <Link href={`/student/lessons/${dangMo.id}?moduleId=${de.id}`}
                      className="px-4 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-[13.5px]
                                 hover:bg-teal-700 transition-colors flex items-center gap-2">
                  <PlayCircle className="w-4 h-4" /> Làm bài
                </Link>

                {de.attachment_url && (
                  <a href={de.attachment_url} target="_blank" rel="noopener noreferrer"
                     className="px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700
                                font-bold text-[13.5px] hover:bg-indigo-100 transition-colors flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Tải đề
                  </a>
                )}

                {de.video_url && (
                  <button onClick={() => setVideoDangXem(de)}
                          className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700
                                     font-bold text-[13.5px] hover:bg-rose-100 transition-colors flex items-center gap-2">
                    <Video className="w-4 h-4" /> Video sửa đề
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Xem video sửa đề ngay tại chỗ, khỏi sang YouTube */}
      {videoDangXem && (
        <div className="fixed inset-0 z-[90] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
             onClick={() => setVideoDangXem(null)}>
          <div onClick={e => e.stopPropagation()}
               className="bg-white w-full max-w-[860px] rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-rose-600 flex items-center gap-2.5">
              <Video className="w-5 h-5 text-white shrink-0" />
              <h2 className="text-[15px] font-black text-white truncate">Video sửa đề — {videoDangXem.title}</h2>
              <button onClick={() => setVideoDangXem(null)} className="ml-auto p-1 text-white/80 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full pb-[56.25%] bg-black">
              <iframe src={linkNhung(videoDangXem.video_url || '')} allowFullScreen
                      className="absolute inset-0 w-full h-full border-none" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
