"use server";

import { createClient } from '@supabase/supabase-js';
import { assertStaff } from '@/utils/auth/guard';
import { congDiem } from '@/app/actions/goiTenVaDiem';

/**
 * Trò chơi trên lớp — phần chạy trên máy chủ.
 *
 * Hai việc: rút câu cho một trận, và ghi điểm vào sổ điểm thưởng. Cả hai phải đi qua máy
 * chủ: bảng `questions` (để lấy MỨC của câu) và `enrollments` có RLS chặn trình duyệt.
 */

const quanTri = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type NguonCau = 'bai' | 'chuong';

export interface CauTroChoi {
  /** Khối quiz đúng như trong module (type, question, options, answerIndex, exactAnswer, lời giải…) */
  quiz: any;
  /** Mức trong kho: 1 nhận biết · 2 thông hiểu · 3–4 vận dụng. 0 = không rõ. */
  muc: number;
  /** Bài chứa câu — để bảng tổng kết ghi "Bài 2 · câu 3" */
  tenBai: string;
}

const MAU_QUIZ = /```quiz[ \t]*\r?\n([\s\S]*?)```/g;

/**
 * Rút câu cho trò chơi từ BỘ CÂU HỎI TRÒ CHƠI (module type 'game') do thầy soạn.
 *
 * Thầy chốt 16/9/2026: không lấy thẳng từ Bài tập tự luyện — ở đó có câu tự luận 8 ý,
 * không chơi được. Bộ câu hỏi trò chơi là module riêng, thầy đưa câu vào (rút kho, hoặc
 * nhập từ tự luyện / đề rồi TÁCH từng ý thành từng câu). 'bai': module game của bài đang
 * chiếu; 'chuong': module game của mọi bài trong chương. Không có module nào thì trả rỗng
 * để màn cài đặt chỉ thầy đi tạo.
 *
 * Trả về đủ mọi câu, chưa xáo và chưa cắt số lượng — máy chiếu xáo rồi lấy đúng số câu.
 */
export async function layCauTroChoi(lessonId: string, nguon: NguonCau): Promise<CauTroChoi[]> {
  await assertStaff();
  const { data: bai } = await quanTri.from('lessons').select('id, title, chapter_id').eq('id', lessonId).maybeSingle();
  if (!bai) return [];

  let dsBai: { id: string; title: string }[] = [{ id: bai.id, title: bai.title }];
  if (nguon === 'chuong' && bai.chapter_id) {
    const { data } = await quanTri.from('lessons').select('id, title').eq('chapter_id', bai.chapter_id).order('order_index');
    if (data?.length) dsBai = data;
  }

  const { data: mods } = await quanTri
    .from('lesson_modules')
    .select('lesson_id, title, type, content_markdown')
    .in('lesson_id', dsBai.map(b => b.id));

  const tenBai = Object.fromEntries(dsBai.map(b => [b.id, b.title]));
  const ra: { quiz: any; lesson_id: string }[] = [];
  const bocKhoi = (md: string, lesson_id: string) => {
    for (const m of String(md || '').matchAll(MAU_QUIZ)) {
      try {
        const q = JSON.parse(m[1]);
        for (const x of Array.isArray(q) ? q : [q]) {
          if (x && typeof x === 'object' && x.question) ra.push({ quiz: x, lesson_id });
        }
      } catch { /* khối viết sai thì bỏ */ }
    }
  };
  for (const b of dsBai) {
    for (const m of (mods || []).filter(m => m.lesson_id === b.id && m.type === 'game')) bocKhoi(m.content_markdown, b.id);
  }

  /* Mức lấy từ kho theo sourceQuestionId; câu không truy ngược được thì mức 0 (tính +1). */
  const ids = Array.from(new Set(ra.map(r => r.quiz.sourceQuestionId).filter(Boolean)));
  const muc: Record<string, number> = {};
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await quanTri.from('questions').select('id, difficulty').in('id', ids.slice(i, i + 200));
    for (const q of data || []) muc[q.id] = Number(q.difficulty) || 0;
  }

  /* Bỏ câu trùng theo ĐỀ (câu tách từ một câu gốc có cùng sourceQuestionId nhưng đề khác) */
  const daCo = new Set<string>();
  return ra.filter(r => {
    const k = String(r.quiz.question).replace(/\s+/g, ' ').slice(0, 160);
    if (daCo.has(k)) return false;
    daCo.add(k); return true;
  }).map(r => ({
    quiz: r.quiz,
    /* Mức: thầy đặt trong khối (`muc`) thắng; không có thì tra kho theo sourceQuestionId */
    muc: Number(r.quiz.muc) || muc[r.quiz.sourceQuestionId] || 0,
    tenBai: tenBai[r.lesson_id] || '',
  }));
}

/**
 * Ghi điểm của một lượt trong trò chơi vào sổ điểm thưởng (âm hay dương đều ghi).
 * Dùng chung `congDiem` với bảng Gọi tên nên mọi luật (tháng đã chốt thì không ghi) giữ nguyên.
 */
export async function ghiDiemTroChoi(
  classId: string,
  studentId: string,
  diem: number,
  lyDo: string,
  lessonId?: string | null,
): Promise<{ duoc: boolean; tong: number }> {
  return congDiem(classId, { student_id: studentId, diem, ly_do: lyDo, nguon: 'tro_choi' }, lessonId);
}

/** Một câu ứng viên để nhập vào bộ câu hỏi trò chơi. */
export interface CauNguon {
  moduleId: string;
  tenModule: string;
  tenBai: string;
  quiz: any;
  muc: number;
}

/**
 * Liệt kê mọi câu tương tác trong các module của bài (và cả chương) — trừ module game —
 * để thầy chọn đưa vào bộ câu hỏi trò chơi. Kèm mức tra từ kho.
 */
export async function layCauNguonTroChoi(lessonId: string): Promise<CauNguon[]> {
  await assertStaff();
  const { data: bai } = await quanTri.from('lessons').select('id, title, chapter_id').eq('id', lessonId).maybeSingle();
  if (!bai) return [];
  let dsBai: { id: string; title: string }[] = [{ id: bai.id, title: bai.title }];
  if (bai.chapter_id) {
    const { data } = await quanTri.from('lessons').select('id, title').eq('chapter_id', bai.chapter_id).order('order_index');
    if (data?.length) dsBai = [{ id: bai.id, title: bai.title }, ...data.filter(b => b.id !== bai.id)];
  }
  const tenBai = Object.fromEntries(dsBai.map(b => [b.id, b.title]));
  const { data: mods } = await quanTri
    .from('lesson_modules').select('id, lesson_id, title, type, content_markdown, order_index')
    .in('lesson_id', dsBai.map(b => b.id)).neq('type', 'game').order('order_index');
  const ra: CauNguon[] = [];
  for (const m of mods || []) {
    for (const x of String(m.content_markdown || '').matchAll(MAU_QUIZ)) {
      try {
        const q = JSON.parse(x[1]);
        for (const k of Array.isArray(q) ? q : [q]) {
          if (k && typeof k === 'object' && k.question) ra.push({ moduleId: m.id, tenModule: m.title, tenBai: tenBai[m.lesson_id] || '', quiz: k, muc: 0 });
        }
      } catch { /* bỏ khối hỏng */ }
    }
  }
  const ids = Array.from(new Set(ra.map(r => r.quiz.sourceQuestionId).filter(Boolean)));
  const muc: Record<string, number> = {};
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await quanTri.from('questions').select('id, difficulty').in('id', ids.slice(i, i + 200));
    for (const q of data || []) muc[q.id] = Number(q.difficulty) || 0;
  }
  for (const r of ra) r.muc = Number(r.quiz.muc) || muc[r.quiz.sourceQuestionId] || 0;
  return ra;
}
