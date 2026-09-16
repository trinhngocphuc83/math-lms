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
 * Rút toàn bộ câu tương tác dùng được cho trò chơi.
 *
 * 'bai': mọi khối quiz trong module "Bài tập tự luyện" của bài đang chiếu; bài chưa có
 *        module ấy thì lấy mọi khối quiz của bài (bài giảng + luyện tập).
 * 'chuong': như trên nhưng gộp mọi bài trong cùng chương.
 *
 * Trả về đủ mọi câu, chưa xáo và chưa cắt số lượng — máy chiếu xáo rồi lấy đúng số câu
 * thầy đặt, để bấm "chơi lại" không phải hỏi máy chủ lần nữa.
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
    const cuaBai = (mods || []).filter(m => m.lesson_id === b.id);
    const tuLuyen = cuaBai.filter(m => /tự luyện/i.test(String(m.title || '')));
    for (const m of (tuLuyen.length ? tuLuyen : cuaBai)) bocKhoi(m.content_markdown, b.id);
  }

  /* Mức lấy từ kho theo sourceQuestionId; câu không truy ngược được thì mức 0 (tính +1). */
  const ids = Array.from(new Set(ra.map(r => r.quiz.sourceQuestionId).filter(Boolean)));
  const muc: Record<string, number> = {};
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await quanTri.from('questions').select('id, difficulty').in('id', ids.slice(i, i + 200));
    for (const q of data || []) muc[q.id] = Number(q.difficulty) || 0;
  }

  /* Bỏ câu trùng (cùng sourceQuestionId hoặc cùng đề) — cả chương hay có câu dùng ở hai bài */
  const daCo = new Set<string>();
  return ra.filter(r => {
    const k = r.quiz.sourceQuestionId || String(r.quiz.question).slice(0, 120);
    if (daCo.has(k)) return false;
    daCo.add(k); return true;
  }).map(r => ({
    quiz: r.quiz,
    muc: muc[r.quiz.sourceQuestionId] || 0,
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
