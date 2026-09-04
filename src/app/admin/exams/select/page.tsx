"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { exportQuestionsToWord } from "@/utils/exportDocx";
import { dungPhuLucBang } from "@/utils/exportBangDeThi";
import { taoCacMaDe } from "@/utils/tronMaDe";
import { dungGoiDeOnline, timCauThieuDapAn } from "@/utils/dayDeSangOnline";
import QuestionEditorModal from "@/components/admin/QuestionEditorModal";
import QuestionPreviewCard, { type PreviewStatement } from "@/components/admin/QuestionPreviewCard";
import MenuGon, { MucMenu, NhomMenu, NganMenu } from "@/components/admin/MenuGon";
import SoanLaiCauModal, { type OSoanLai } from "@/components/admin/SoanLaiCauModal";
import { bankTypeLabel, difficultyLabel } from "@/utils/questionTypes";
import {
  Loader2, Pencil, Shuffle, ArrowLeft, ArrowRight, Printer, Download,
  CheckCircle, FileText, CheckSquare, Square, RotateCcw, Type, Replace, Plus, ListChecks, X,
  Save, AlertTriangle, Send, Sparkles, Trash2, Copy, ShieldCheck
} from "lucide-react";
import { taoKhoaSoSanh, doGiongNhau, NGUONG_NGHI_TRUNG } from "@/utils/questionFingerprint";
import KiemThuDeModal from "@/components/admin/KiemThuDeModal";
import { gomTheoLoai } from "@/utils/deThi";
import { exportPhieuTraLoi } from "@/utils/phieuTraLoi";
import { exportHuongDanCham } from "@/utils/huongDanCham";
import {
  type DauDe, type DongMaTran, dauDeMacDinh, diemMacDinh, tinhTongDiem,
  chiaPhanDeThi, sapCauTheoPhan, soCauTheoPhan, diemCuaPhan, tenTepDe, soDiemVN,
  tenLamDutTruyVan } from "@/utils/deThi";

interface MatrixItemDraft {
  id: string;
  math_form: string;
  topic?: string;
  question_type: string;
  difficulty: string;
  count: number;
  diemMoiCau?: number;
}

interface LineState {
  item: MatrixItemDraft;
  candidates: any[];
  selectedIds: Set<string>;
}

function questionStatements(q: any): { statements: PreviewStatement[]; layout: 'choice' | 'truefalse' } {
  if (q.question_type === 'NLC') {
    const correctLetter = String(q.correct_answer || '').trim().toUpperCase();
    const statements = ['a', 'b', 'c', 'd']
      .map(opt => {
        const val = q[`option_${opt}`];
        if (!val) return null;
        return { key: opt, label: opt.toUpperCase(), content: val, isCorrect: correctLetter === opt.toUpperCase() } as PreviewStatement;
      })
      .filter((s): s is PreviewStatement => !!s);
    return { statements, layout: 'choice' };
  }
  if (q.question_type === 'DS') {
    const correctStr = String(q.correct_answer || '');
    const statements = ['a', 'b', 'c', 'd']
      .map((opt, i) => {
        const val = q[`option_${opt}`];
        if (!val) return null;
        const ch = correctStr.charAt(i);
        const isTrue = ch ? (ch === 'D' || ch === 'T' || ch.toUpperCase() === 'Đ') : undefined;
        return { key: opt, label: opt, content: val, isTrue } as PreviewStatement;
      })
      .filter((s): s is PreviewStatement => !!s);
    return { statements, layout: 'truefalse' };
  }
  return { statements: [], layout: 'choice' };
}

function SelectContent() {
  const searchParams = useSearchParams();
  const draftKey = searchParams.get('draft');
  const boDeParam = searchParams.get('boDe');
  const supabase = createClient();

  const [examType, setExamType] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [lines, setLines] = useState<LineState[]>([]);
  /** Các cặp câu nghi trùng vừa rà được, khoá theo id câu để tô viền cảnh báo. */
  const [nghiTrung, setNghiTrung] = useState<Map<string, { doGiong: number; cungVoi: string }>>(new Map());
  const [dangRaSoat, setDangRaSoat] = useState(false);
  const [dangXoa, setDangXoa] = useState<string | null>(null);
  /* Khung kiểm thử đề - soi cấu trúc, công thức, lời giải, thẩm mỹ; và soi cả nội
     dung bằng AI nếu Thầy cô bấm thêm. */
  const [moKiemThu, setMoKiemThu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState<'select' | 'final'>('select');
  // Cỡ chữ xem trước. Mặc định "nhỏ gọn" vì màn chọn câu xếp hai cột, để cỡ vừa thì mỗi
  // câu chiếm gần trọn màn hình. Ghi nhớ lựa chọn để lần sau mở lại vẫn đúng ý thầy cô.
  const [coChu, setCoChu] = useState<'sm' | 'md' | 'lg'>('sm');

  useEffect(() => {
    const daLuu = localStorage.getItem('exam_select_co_chu');
    if (daLuu === 'sm' || daLuu === 'md' || daLuu === 'lg') setCoChu(daLuu);
  }, []);

  const doiCoChu = (c: 'sm' | 'md' | 'lg') => {
    setCoChu(c);
    localStorage.setItem('exam_select_co_chu', c);
  };
  /**
   * Dòng ma trận đang mở khung đổi câu (chỉ số trong `lines`), và câu đang muốn thay.
   *
   * Màn chính chỉ bày đúng số câu của đề cho gọn. Muốn đổi câu nào thì bấm vào câu đó,
   * khung này mở ra với TOÀN BỘ câu trong kho cùng dạng - cùng mức độ - cùng dạng thức
   * để chọn lại. Dùng khung mở đè thay vì mở tab mới vì dữ liệu ma trận nằm trong bộ nhớ
   * của tab hiện tại, mở tab mới là mất hết lựa chọn đang làm dở.
   */
  const [dongDangDoi, setDongDangDoi] = useState<number | null>(null);
  const [cauDangDoi, setCauDangDoi] = useState<string | null>(null);

  const moKhungDoiCau = (lineIdx: number, questionId: string | null) => {
    setDongDangDoi(lineIdx);
    setCauDangDoi(questionId);
  };

  /** Câu đang nhờ AI soạn lại theo yêu cầu riêng. */
  const [oSoanLai, setOSoanLai] = useState<OSoanLai | null>(null);

  /**
   * Thay một câu trong đề bằng câu AI vừa soạn.
   *
   * Nhét câu mới vào chính danh sách ứng viên của dòng đó rồi đổi lựa chọn sang nó, chứ
   * không nạp lại cả trang: nạp lại là mất hết những câu thầy cô đã tick ở các dòng khác.
   * Câu mới đã được lưu vào ngân hàng trước khi gọi tới đây nên nó có id thật.
   */
  const thayCauDaSoanLai = (lineIdx: number, idCauCu: string, cauMoi: any) => {
    setChuaLuu(true);
    setLines(prev => prev.map((l, i) => {
      if (i !== lineIdx) return l;
      const moi = {
        ...cauMoi,
        id: cauMoi.id || cauMoi.temp_id,
        usage_count: 0,
        question_type: l.item.question_type,
        difficulty: l.item.difficulty,
        math_form: l.item.math_form,
      };
      // Đặt đúng chỗ câu cũ để thứ tự câu trong đề không nhảy lung tung
      const viTri = l.candidates.findIndex(q => q.id === idCauCu);
      const dsMoi = [...l.candidates];
      if (viTri >= 0) dsMoi.splice(viTri, 0, moi); else dsMoi.push(moi);

      const chon = new Set(l.selectedIds);
      chon.delete(idCauCu);
      chon.add(moi.id);
      return { ...l, candidates: dsMoi, selectedIds: chon };
    }));
  };

  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);

  /**
   * Số mã đề sinh ra khi xuất. Mã đầu giữ nguyên bản đang xem trên màn hình, các mã
   * sau đảo thứ tự câu trong từng phần và đảo phương án, đáp án dời theo.
   */
  const [soMaDe, setSoMaDe] = useState(1);
  const [dangDayOnline, setDangDayOnline] = useState(false);

  /**
   * Yêu cầu cần đạt của từng dạng, khoá là tên dạng. Dùng cho cột cùng tên trong
   * Bản đặc tả. Dạng nào thầy cô chưa soạn thì bảng tạm lấy chính tên dạng.
   */
  const [yeuCauCanDat, setYeuCauCanDat] = useState<Map<string, string>>(new Map());

  // Đầu đề in trên giấy và khuôn cấu trúc đề, nhận từ trang ma trận
  const [khuonDe, setKhuonDe] = useState("");
  const [dauDe, setDauDe] = useState<DauDe>(() => dauDeMacDinh());

  // Bộ đề đã lưu: có id thì lần lưu sau là cập nhật đúng bộ đó, không tạo bản mới
  const [boDeId, setBoDeId] = useState<string | null>(null);
  const [dangLuuBoDe, setDangLuuBoDe] = useState(false);
  const [dangLuuNhap, setDangLuuNhap] = useState(false);
  // Có thay đổi chưa lưu thì chặn đóng tab, tránh mất công chọn câu
  const [chuaLuu, setChuaLuu] = useState(false);

  /**
   * Nạp dữ liệu: hoặc từ ma trận vừa dựng (?draft=...), hoặc mở lại một bộ đề đã lưu
   * (?boDe=...). Mở lại bộ đề đã lưu thì đọc thẳng từ cơ sở dữ liệu, không cần đi qua
   * bộ nhớ trình duyệt - nhờ vậy đổi máy vẫn mở được đúng đề đã ra.
   */
  useEffect(() => {
    if (boDeParam) { moLaiBoDe(boDeParam); return; }
    if (!draftKey) { setIsLoading(false); setLoadError("Thiếu thông tin ma trận (draft key)."); return; }
    const raw = localStorage.getItem(draftKey);
    if (!raw) { setIsLoading(false); setLoadError("Không tìm thấy dữ liệu ma trận - có thể tab này đã hết hạn, hãy quay lại trang trước và bấm lại."); return; }
    try {
      const draft = JSON.parse(raw);
      setExamType(draft.examType || "");
      setGrade(draft.grade || "");
      setSubject(draft.subject || "");
      setKhuonDe(draft.khuonDe || "");
      if (draft.dauDe) setDauDe(draft.dauDe);
      loadCandidates(draft.matrixItems || [], draft.grade, draft.subject);
    } catch (e) {
      setIsLoading(false);
      setLoadError("Dữ liệu ma trận bị lỗi.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, boDeParam]);

  /** Mở lại một bộ đề đã lưu: dựng lại các dòng từ bản chụp câu hỏi trong đề. */
  const moLaiBoDe = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/bo-de?id=' + id);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'không đọc được bộ đề');

      const bd = d.boDe;
      setBoDeId(bd.id);
      setExamType(bd.loai_de || "");
      setGrade(bd.grade || "");
      setSubject(bd.subject || "");
      setKhuonDe(bd.khuon_de || "");
      if (bd.dau_de) setDauDe(bd.dau_de);
      setIsFinalized(!!bd.da_chot);

      // Dựng lại từng dòng ma trận, ứng viên chính là các câu đã chụp trong đề.
      // Cố ý KHÔNG đọc lại từ ngân hàng: đề đã lưu phải giữ đúng nội dung lúc in.
      const cauHoi: any[] = bd.cau_hoi || [];
      const maTran: MatrixItemDraft[] = bd.ma_tran || [];
      const dong: LineState[] = maTran.length
        ? maTran.map(item => {
            const thuoc = cauHoi.filter(q =>
              q.math_form === item.math_form &&
              String(q.question_type) === String(item.question_type) &&
              String(q.difficulty) === String(item.difficulty));
            return { item, candidates: thuoc, selectedIds: new Set(thuoc.map(q => q.id)) };
          })
        : [{
            item: { id: 'tatca', math_form: '(đề đã lưu)', question_type: 'NLC', difficulty: '1', count: cauHoi.length },
            candidates: cauHoi,
            selectedIds: new Set(cauHoi.map(q => q.id)),
          }];
      setLines(dong);
      setStep('final');
      setChuaLuu(false);
    } catch (e: any) {
      setLoadError("Không mở được bộ đề đã lưu: " + (e?.message || 'lỗi không rõ'));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Rà soát các câu ĐANG CHỌN xem có cặp nào na ná nhau.
   *
   * Dùng lại đúng bộ so trong utils/questionFingerprint - cùng cỗ máy đang canh trùng lúc
   * bóc câu mới vào kho, nên ngưỡng và cách chấm giống hệt, không có chuyện chỗ này bảo
   * trùng chỗ kia bảo không.
   *
   * Chỉ SO các câu đang chọn với nhau: đó là những câu sắp in ra đề, trùng ở đây mới là
   * trùng thật sự đáng lo.
   */
  const raSoatTrung = () => {
    setDangRaSoat(true);
    try {
      const dsCau: any[] = [];
      lines.forEach(l => l.candidates.forEach(q => { if (l.selectedIds.has(q.id)) dsCau.push(q); }));

      const khoa = dsCau.map(q => taoKhoaSoSanh({
        id: q.id, content: q.content,
        option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
      }));

      const ra = new Map<string, { doGiong: number; cungVoi: string }>();
      for (let i = 0; i < khoa.length; i++) {
        for (let j = i + 1; j < khoa.length; j++) {
          const diem = doGiongNhau(khoa[i].khuonChu, khoa[j].khuonChu);
          if (diem < NGUONG_NGHI_TRUNG) continue;
          const nhan = (a: number, b: number) => {
            const cu = ra.get(dsCau[a].id);
            if (!cu || cu.doGiong < diem) {
              ra.set(dsCau[a].id, { doGiong: diem, cungVoi: String(dsCau[b].content || '').slice(0, 80) });
            }
          };
          nhan(i, j); nhan(j, i);
        }
      }
      setNghiTrung(ra);
      alert(ra.size === 0
        ? `Đã rà ${dsCau.length} câu đang chọn — không thấy câu nào nghi trùng.`
        : `Đã rà ${dsCau.length} câu đang chọn — ${ra.size} câu nghi trùng, đã tô viền đỏ.\n\n`
          + 'Thầy/Cô xem lại rồi bấm "Đổi câu khác" hoặc "Xoá khỏi ngân hàng".');
    } finally {
      setDangRaSoat(false);
    }
  };

  /**
   * Xoá HẲN một câu khỏi ngân hàng, ngay từ màn chọn câu.
   *
   * Soát đề mới là lúc nhìn ra câu trùng, mà trước đây phải nhớ rồi sang trang Ngân hàng
   * câu hỏi tìm lại - dễ quên. Xoá xong thì bỏ câu khỏi danh sách và chọn bù câu khác cho
   * đủ số, không để hụt câu.
   */
  const xoaKhoiNganHang = async (q: any, lineIdx: number) => {
    const de = String(q.content || '').replace(/\s+/g, ' ').slice(0, 120);
    if (!window.confirm(`Xoá HẲN câu này khỏi ngân hàng câu hỏi?\n\n"${de}..."\n\nXoá rồi không lấy lại được.`)) return;

    setDangXoa(q.id);
    try {
      const { error } = await supabase.from('questions').delete().eq('id', q.id);
      if (error) throw error;

      setLines(prev => prev.map((l, i) => {
        if (i !== lineIdx) return l;
        const conLai = l.candidates.filter(c => c.id !== q.id);
        const chon = new Set(l.selectedIds); chon.delete(q.id);
        /* Chọn bù cho đủ số câu của dòng ma trận, ưu tiên câu ít dùng nhất. */
        if (chon.size < l.item.count) {
          const bu = conLai.filter(c => !chon.has(c.id))
            .sort((a, b) => (a.usage_count || 0) - (b.usage_count || 0));
          for (const c of bu) { if (chon.size >= l.item.count) break; chon.add(c.id); }
        }
        return { ...l, candidates: conLai, selectedIds: chon };
      }));
      setNghiTrung(prev => { const m = new Map(prev); m.delete(q.id); return m; });
    } catch (e: any) {
      alert('Không xoá được: ' + (e?.message || 'lỗi không rõ'));
    } finally {
      setDangXoa(null);
    }
  };

  const defaultSelect = (candidates: any[], count: number): Set<string> => {
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const sorted = shuffled.sort((a, b) => (a.usage_count || 0) - (b.usage_count || 0));
    return new Set(sorted.slice(0, count).map(q => q.id));
  };

  const loadCandidates = async (matrixItems: MatrixItemDraft[], gradeVal: string, subjectVal: string) => {
    setIsLoading(true);
    try {
      /* Phân môn có thể là nhiều môn gộp lại ("Đại số + Hình học") vì đề kiểm tra định
         kỳ thường có cả hai. So bằng dấu bằng với chuỗi gộp thì không khớp câu nào -
         phải tách ra rồi so theo danh sách. */
      const dsPhanMon = String(subjectVal || '').split('+').map(x => x.trim()).filter(Boolean);
      const results: LineState[] = [];
      const PAGE_SIZE = 1000;
      for (const item of matrixItems) {
        // Supabase/PostgREST mặc định chỉ trả tối đa 1000 dòng một lần. Dạng toán nào
        // có hơn 1000 câu thì bản cũ bị thiếu ứng viên mà không hề báo gì.
        const candidates: any[] = [];
        // Tên dạng dính "${{" làm tường lửa chặn cả truy vấn (xem tenLamDutTruyVan).
        // Gặp tên như vậy thì lọc theo dạng ngay tại đây thay vì nhờ máy chủ lọc.
        const locTaiCho = tenLamDutTruyVan(item.math_form);
        for (let from = 0; ; from += PAGE_SIZE) {
          let query = supabase.from('questions').select('*')
            .eq('question_type', item.question_type)
            .eq('difficulty', item.difficulty)
            .range(from, from + PAGE_SIZE - 1);
          if (!locTaiCho) query = query.eq('math_form', item.math_form);
          if (gradeVal) query = query.eq('grade', gradeVal);
          if (dsPhanMon.length) query = query.in('subject', dsPhanMon);
          const { data, error } = await query;
          if (error) throw error;
          const page = data || [];
          candidates.push(...(locTaiCho ? page.filter((q: any) => q.math_form === item.math_form) : page));
          if (page.length < PAGE_SIZE) break;
        }
        results.push({ item, candidates, selectedIds: defaultSelect(candidates, item.count) });
      }
      setLines(results);
    } catch (e: any) {
      setLoadError("Lỗi tải câu hỏi: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCandidate = (lineIdx: number, qid: string) => {
    setChuaLuu(true);
    setLines(prev => prev.map((l, i) => {
      if (i !== lineIdx) return l;
      const next = new Set(l.selectedIds);
      if (next.has(qid)) next.delete(qid); else next.add(qid);
      return { ...l, selectedIds: next };
    }));
  };

  const reroll = (lineIdx: number) => {
    setChuaLuu(true);
    setLines(prev => prev.map((l, i) => i === lineIdx ? { ...l, selectedIds: defaultSelect(l.candidates, l.item.count) } : l));
  };

  const selectAll = (lineIdx: number, on: boolean) => {
    setChuaLuu(true);
    setLines(prev => prev.map((l, i) => i === lineIdx ? { ...l, selectedIds: on ? new Set(l.candidates.map(q => q.id)) : new Set<string>() } : l));
  };

  const handleSaveEdit = async (updatedQuestion: any) => {
    try {
      const { id, ...rest } = updatedQuestion;
      const { error } = await supabase.from('questions').update(rest).eq('id', id);
      if (error) throw error;
      setLines(prev => prev.map(l => ({
        ...l,
        candidates: l.candidates.map(q => q.id === id ? { ...q, ...rest } : q),
      })));
      alert("Đã lưu câu hỏi vào ngân hàng!");
    } catch (e: any) {
      alert("Lỗi lưu câu hỏi: " + e.message);
    }
  };

  const totalSelected = lines.reduce((acc, l) => acc + l.selectedIds.size, 0);
  const totalTarget = lines.reduce((acc, l) => acc + l.item.count, 0);

  /**
   * Câu hỏi của đề, ĐÃ xếp theo thứ tự phần (trắc nghiệm trước, tự luận sau).
   *
   * Trước đây thứ tự là thứ tự dòng ma trận nên trắc nghiệm và tự luận nằm xen kẽ,
   * in ra không dùng được. Số thứ tự câu phải lấy theo thứ tự này, không theo ma trận.
   */
  const cauDaChon = lines.flatMap(l => l.candidates.filter(q => l.selectedIds.has(q.id)));
  const finalQuestions = sapCauTheoPhan(cauDaChon);
  const cacPhan = chiaPhanDeThi(cauDaChon);

  const dongMaTran: DongMaTran[] = lines.map(l => ({
    id: l.item.id,
    math_form: l.item.math_form,
    topic: l.item.topic,
    question_type: l.item.question_type,
    difficulty: l.item.difficulty,
    count: l.selectedIds.size,
    max_count: l.candidates.length,
    diemMoiCau: l.item.diemMoiCau ?? diemMacDinh(l.item.question_type),
  }));
  const tongDiemDe = tinhTongDiem(dongMaTran);

  /** Điểm từng phần, để in vào tiêu đề "PHẦN I. ... (3,0 điểm)". */
  const diemPhan: Record<string, number> = Object.fromEntries(
    cacPhan.map(p => [p.ma, diemCuaPhan(p, dongMaTran)])
  );

  /* Số câu hiển thị lấy đúng cách đánh số của BẢN IN: mỗi phần đánh lại từ Câu 1,
     kèm mã "I.7" phân biệt bốn câu cùng mang số 1 trong một đề. Màn này và tệp Word
     dùng chung một hàm nên không thể lệch nhau. */
  const soCau = soCauTheoPhan(cauDaChon);
  const soThuTuTrongDe = new Map<string, number>();
  soCau.forEach((v, id) => soThuTuTrongDe.set(id, v.so));

  /** Dòng ma trận của mỗi câu đã chọn, để màn "Xem đề hoàn chỉnh" bỏ được một câu mà
   * không cần mở khung đổi câu - bấm bỏ là gọi thẳng toggleCandidate(lineIdx, id). */
  const dongCuaCau = new Map<string, number>();
  lines.forEach((l, i) => l.candidates.forEach(q => { if (l.selectedIds.has(q.id)) dongCuaCau.set(q.id, i); }));

  /* ===================== LƯU BỘ ĐỀ ===================== */

  const tenDeGoiY = () =>
    [examType || 'Đề kiểm tra', subject, grade && `Lớp ${grade}`, dauDe.maDe && `mã ${dauDe.maDe}`]
      .filter(Boolean).join(' · ');

  /** Lưu bộ đề vào hệ thống. `chotDe` = true thì cộng thêm lượt dùng cho từng câu. */
  const luuBoDe = async (chotDe = false) => {
    if (finalQuestions.length === 0) return alert("Chưa chọn câu hỏi nào!");
    if (chotDe) setIsFinalizing(true); else setDangLuuBoDe(true);
    try {
      const res = await fetch('/api/admin/bo-de', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: boDeId, ten: tenDeGoiY(), loaiDe: examType, grade, subject, khuonDe,
          dauDe, maTran: lines.map(l => ({ ...l.item, count: l.selectedIds.size })),
          cauHoi: finalQuestions, tongDiem: tongDiemDe, chotDe,
        }),
      });
      const d = await res.json();
      if (!res.ok) { alert('Không lưu được bộ đề: ' + (d.error || 'lỗi không rõ')); return; }

      setBoDeId(d.id);
      setChuaLuu(false);
      if (chotDe) {
        setIsFinalized(true);
        if (draftKey) localStorage.removeItem(draftKey);
      }
      if (d.canhBao) alert(d.canhBao);
      else if (d.boQuaChot) alert('Đề này đã chốt trước đó rồi, đã lưu lại nội dung mới nhưng KHÔNG cộng lượt dùng lần hai.');
      else if (chotDe) alert(`Đã chốt đề và cộng lượt dùng cho ${d.daCong} câu.`);
      else alert('Đã lưu bộ đề. Đóng tab rồi mở lại từ danh sách vẫn còn nguyên.');
    } catch {
      alert('Lỗi kết nối khi lưu bộ đề.');
    } finally {
      setIsFinalizing(false);
      setDangLuuBoDe(false);
    }
  };

  /** Lưu tạm phiên chọn câu, dùng chung bảng bản nháp với trang ma trận. */
  const luuNhap = async () => {
    if (lines.length === 0) return alert('Chưa có gì để lưu tạm!');
    setDangLuuNhap(true);
    try {
      const res = await fetch('/api/admin/ban-nhap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loai: 'ra_de', khoa: 'chon-cau',
          ten: `${examType || 'Đề'} · ${totalSelected} câu đã chọn`,
          soCau: totalSelected,
          duLieu: {
            examType, grade, subject, khuonDe, dauDe,
            matrixItems: lines.map(l => ({ ...l.item, count: l.selectedIds.size })),
            idDaChon: lines.map(l => [...l.selectedIds]),
          },
        }),
      });
      const d = await res.json();
      alert(res.ok ? 'Đã lưu tạm phiên chọn câu.' : 'Không lưu tạm được: ' + (d.error || 'lỗi không rõ'));
    } catch {
      alert('Lỗi kết nối khi lưu tạm.');
    } finally {
      setDangLuuNhap(false);
    }
  };

  // Chặn đóng tab khi còn thay đổi chưa lưu - tránh mất công chọn câu
  useEffect(() => {
    if (!chuaLuu) return;
    const chan = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', chan);
    return () => window.removeEventListener('beforeunload', chan);
  }, [chuaLuu]);

  // Nạp yêu cầu cần đạt một lần khi mở trang; cột chưa có thì bỏ qua, không chặn việc chính
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('question_categories')
        .select('math_form, yeu_cau_can_dat');
      if (error || !data) return;
      const m = new Map<string, string>();
      for (const c of data) {
        const dang = String(c.math_form || '').trim();
        const yc = String((c as any).yeu_cau_can_dat || '').trim();
        if (dang && yc) m.set(dang, yc);
      }
      setYeuCauCanDat(m);
    })();
  }, []);

  /**
   * Đẩy đề sang Kỳ thi Online. Trộn mã thì mỗi mã thành một kỳ thi riêng cùng nhóm.
   *
   * Tạo ở trạng thái BẢN NHÁP: kỳ thi còn thiếu lớp được giao và giờ mở/đóng, phát
   * hành luôn là học sinh thấy đề trước khi thầy cô kịp đặt giờ.
   */
  const handleDaySangOnline = async () => {
    if (finalQuestions.length === 0) return alert("Chưa chọn câu hỏi nào!");

    // Câu thiếu đáp án mà đẩy lên là máy chấm sai âm thầm: câu Đúng/Sai thành bốn ý
    // đều Sai, câu trắc nghiệm thành không phương án nào đúng. Phải hỏi lại cho rõ.
    const thieu = timCauThieuDapAn(finalQuestions);
    if (thieu.length > 0) {
      const ds = thieu.map(t => `  Câu ${t.viTri} (${t.loai}): ${t.trichDe}...`).join("\n");
      if (!confirm(`${thieu.length} câu CHƯA CÓ ĐÁP ÁN trong ngân hàng:\n\n${ds}\n\nĐẩy lên thì máy vẫn chấm, và cả lớp sẽ mất điểm những câu này. Nên sửa đáp án trong ngân hàng trước.\n\nVẫn tiếp tục?`)) return;
    }

    const cacMa = soMaDe > 1 ? taoCacMaDe(finalQuestions, soMaDe, dauDe.maDe || "101") : null;
    const soKy = cacMa ? cacMa.length : 1;
    if (!confirm(`Tạo ${soKy} kỳ thi online ở dạng BẢN NHÁP từ đề này?\n\nSau đó thầy cô vào Kỳ thi Online để giao lớp và đặt giờ mở/đóng rồi mới phát hành.`)) return;

    setDangDayOnline(true);
    try {
      const goi = cacMa
        ? cacMa.map(md => dungGoiDeOnline(md.cauHoi, dauDe, md.ma))
        : [dungGoiDeOnline(finalQuestions, dauDe)];

      let xong = 0;
      for (const g of goi) {
        const res = await fetch("/api/admin/exams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(g),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Lỗi tạo kỳ thi");
        xong++;
      }
      if (confirm(`Đã tạo ${xong} kỳ thi ở dạng bản nháp.\n\nMở trang Kỳ thi Online để giao lớp và đặt giờ ngay bây giờ?`)) {
        window.open("/admin/online-exams", "_blank");
      }
    } catch (e: any) {
      alert("Không đẩy được sang Kỳ thi Online: " + (e?.message || "lỗi không rõ"));
    } finally {
      setDangDayOnline(false);
    }
  };

  const handlePrint = () => window.print();

  /** Trộn mã ngay lúc xuất chứ không giữ trong bộ nhớ: mỗi lần xuất là một bộ mã mới. */
  const dungMaDe = () => (soMaDe > 1 ? taoCacMaDe(finalQuestions, soMaDe, dauDe.maDe || "101") : undefined);

  const handleExportWordStudent = async () => {
    try {
      if (finalQuestions.length === 0) return alert("Chưa chọn câu hỏi nào!");
      await exportQuestionsToWord(finalQuestions, 'student', tenTepDe(dauDe), { dauDe, chiaPhan: true, diemPhan, maDe: dungMaDe(), boDeId: boDeId || undefined });
    } catch (e: any) { alert("Lỗi xuất Word: " + e.message); }
  };

  const handleExportWordTeacher = async () => {
    try {
      if (finalQuestions.length === 0) return alert("Chưa chọn câu hỏi nào!");
      await exportQuestionsToWord(finalQuestions, 'teacher', tenTepDe(dauDe), { dauDe, chiaPhan: true, diemPhan, maDe: dungMaDe(), boDeId: boDeId || undefined });
    } catch (e: any) { alert("Lỗi xuất Word: " + e.message); }
  };

  /**
   * Trọn gói một tệp: Ma trận + Bản đặc tả (khổ ngang) rồi tới Đề và Lời giải.
   *
   * Hai bảng dựng từ CÁC CÂU ĐANG CHỌN chứ không từ ma trận đã cấu hình, nên bảng in
   * ra luôn khớp với đề đang cầm - kể cả khi thầy cô chọn lệch so với mục tiêu.
   */
  /**
   * Phiếu trả lời - tờ giấy học sinh làm bài.
   *
   * Dựng theo đúng các phần CÓ THẬT trong đề, số ô bằng số câu, và số dòng kẻ chấm của
   * mỗi câu tự luận tính từ độ dài lời giải nên không chừa thiếu cũng không phí giấy.
   */
  const handleExportPhieu = async () => {
    try {
      if (finalQuestions.length === 0) return alert("Chưa chọn câu hỏi nào!");
      await exportPhieuTraLoi(
        { dauDe, cacPhan, diemPhan, boDeId: boDeId || undefined },
        tenTepDe(dauDe),
      );
    } catch (e: any) { alert("Lỗi xuất phiếu: " + e.message); }
  };

  /** Bản hướng dẫn chấm và biểu điểm - tệp giáo viên cầm khi ngồi chấm. */
  const handleExportHuongDanCham = async () => {
    try {
      if (finalQuestions.length === 0) return alert("Chưa chọn câu hỏi nào!");
      await exportHuongDanCham(
        { dauDe, cacPhan, diemPhan, boDeId: boDeId || undefined },
        tenTepDe(dauDe),
      );
    } catch (e: any) { alert("Lỗi xuất hướng dẫn chấm: " + e.message); }
  };

  const handleExportTronGoi = async () => {
    try {
      if (finalQuestions.length === 0) return alert("Chưa chọn câu hỏi nào!");
      const phuLuc = dungPhuLucBang(finalQuestions, dongMaTran, yeuCauCanDat);
      await exportQuestionsToWord(finalQuestions, 'teacher', tenTepDe(dauDe), {
        dauDe, chiaPhan: true, diemPhan, phuLuc, maDe: dungMaDe(), boDeId: boDeId || undefined,
      });
    } catch (e: any) { alert("Lỗi xuất trọn gói: " + e.message); }
  };

  /**
   * Chốt đề: LƯU bộ đề rồi mới cộng lượt dùng, cả hai việc làm ở máy chủ.
   *
   * Bản cũ chỉ cộng usage_count ngay tại trình duyệt, await từng câu trong vòng lặp và
   * không hề đọc error - đề 40 câu là 40 lượt gọi, lỗi bị nuốt im lặng, và bản đề thì
   * KHÔNG được lưu ở đâu cả nên đóng tab là mất trắng.
   */
  const handleFinalizeExam = async () => {
    await luuBoDe(true);
    // Cập nhật lại số lượt dùng đang hiện trên thẻ cho khớp
    setLines(prev => prev.map(l => ({
      ...l,
      candidates: l.candidates.map(q => l.selectedIds.has(q.id) ? { ...q, usage_count: (q.usage_count || 0) + 1 } : q),
    })));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <p className="text-gray-500 font-medium">Đang tải danh sách câu hỏi trong kho...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-3 text-center px-6">
        <p className="text-red-600 font-bold">{loadError}</p>
        <p className="text-gray-500 text-sm">Hãy quay lại tab cấu hình ma trận và bấm lại nút để mở tab xem trước mới.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Thanh trên cùng */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-5 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-base font-black text-gray-800 leading-tight truncate">{examType || "Đề thi"}</h1>
            <p className="text-[12px] text-gray-500 leading-tight">
              {grade ? `Lớp ${grade}` : ""}{grade && subject ? " · " : ""}{subject}
              {step === 'select' && (
                <> · Đã chọn <b className={totalSelected === totalTarget ? "text-emerald-600" : "text-amber-600"}>{totalSelected}</b> / mục tiêu {totalTarget} câu</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            {/* Cỡ chữ: xem trên máy để nhỏ gọn, trình chiếu cho lớp thì phóng to. Chỉ còn
                ba chữ A to nhỏ dần - đủ hiểu mà không ăn mất một mảng thanh công cụ. */}
            <div className="flex items-center gap-0.5 bg-gray-100 border border-gray-200 rounded-lg p-0.5" title="Cỡ chữ hiển thị">
              <Type className="w-3.5 h-3.5 text-gray-400 mx-1" />
              {([['sm', 'A', 'Nhỏ gọn'], ['md', 'A', 'Vừa'], ['lg', 'A', 'Lớn']] as const).map(([ma, chu, ten], i) => (
                <button
                  key={ma}
                  onClick={() => doiCoChu(ma)}
                  title={ten}
                  className={`w-6 h-6 rounded-md font-black transition-colors leading-none ${
                    i === 0 ? 'text-[10px]' : i === 1 ? 'text-[12px]' : 'text-[14px]'
                  } ${coChu === ma ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {chu}
                </button>
              ))}
            </div>

            {/* Lưu tạm: giữ phiên chọn câu đang làm dở, hiện ở cả hai bước */}
            <button
              onClick={luuNhap}
              disabled={dangLuuNhap}
              title="Lưu tạm - giữ phiên chọn câu đang làm dở để lần sau mở lại"
              className="flex items-center gap-1.5 border border-amber-500 text-amber-700 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg font-bold text-[13px] bg-white disabled:opacity-50"
            >
              {dangLuuNhap ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu tạm
            </button>

            {chuaLuu && (
              <span
                title="Có thay đổi chưa lưu"
                className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-1.5 py-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Chưa lưu
              </span>
            )}

          {/* Rà câu nghi trùng TRƯỚC khi chốt đề. Bộ so đã có sẵn trong app (dùng lúc bóc
              câu mới vào kho), soi bằng mắt qua mấy chục câu thì không ra. */}
          {step === 'select' && (
            <button
              onClick={raSoatTrung}
              disabled={dangRaSoat || totalSelected < 2}
              title="Rà các câu đang chọn xem có cặp nào na ná nhau"
              className="bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50
                         px-3 py-2 rounded-lg font-black text-[13px] flex items-center gap-1.5"
            >
              {dangRaSoat
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ShieldCheck className="w-4 h-4" />} Rà câu trùng
            </button>
          )}

          {/* Kiểm thử đề: soi cấu trúc - công thức - lời giải - thẩm mỹ ngay tức thì, và
              soi được cả nội dung bằng AI. Đặt cạnh nút rà trùng vì cùng một việc: soát
              đề trước khi in. */}
          <button
            onClick={() => setMoKiemThu(true)}
            disabled={totalSelected === 0}
            title="Rà toàn bộ đề theo Sổ tay Kiểm thử: cấu trúc, công thức, lời giải, định dạng"
            className="bg-white border border-teal-300 text-teal-700 hover:bg-teal-50 disabled:opacity-50
                       px-3 py-2 rounded-lg font-black text-[13px] flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" /> Kiểm thử đề
          </button>

          {step === 'select' ? (
            <button
              onClick={() => setStep('final')}
              disabled={totalSelected === 0}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg font-black text-[13px] shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              Xem đề hoàn chỉnh ({totalSelected} câu) <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            /*
             * Thanh công cụ gom lại còn một hàng.
             *
             * Bản cũ bày cả 9 nút to ra ngoài, xếp thành hai hàng và đẩy nội dung đề
             * xuống quá nửa màn hình - đúng cái làm thầy cô không soi được đề. Nay chỉ
             * giữ ngoài việc dùng nhiều nhất (quay lại, chốt đề), còn lại gom theo nhóm.
             */
            <div className="flex items-center gap-2 flex-wrap print:hidden">
              <button
                onClick={() => setStep('select')}
                title="Quay lại màn chọn câu"
                className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-2.5 py-1.5 rounded-lg font-bold text-[13px] hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" /> Chọn câu
              </button>

              {/* Số mã đề để ngoài vì nó đổi kết quả của CẢ xuất tệp lẫn đẩy sang thi
                  online - giấu vào một menu thì menu kia dùng nhầm mà không hay. */}
              <label
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-gray-300 bg-white text-[13px] font-bold text-gray-700"
                title="Mã đầu giữ nguyên bản đang xem; các mã sau đảo thứ tự câu và phương án, đáp án dời theo"
              >
                <Shuffle className="w-3.5 h-3.5 text-violet-600" />
                Mã đề
                <select
                  value={soMaDe}
                  onChange={e => setSoMaDe(Number(e.target.value) || 1)}
                  className="border border-gray-200 rounded-md px-1.5 py-0.5 text-[13px] font-bold outline-none"
                >
                  {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>

              <MenuGon nhan="In & Xuất" icon={<Download className="w-4 h-4" />} rong="w-[300px]">
                <MucMenu
                  icon={<Printer className="w-4 h-4 text-teal-600" />}
                  nhan="In trực tiếp trên web"
                  moTa="Mở hộp in của trình duyệt"
                  onClick={handlePrint}
                />
                <NganMenu />
                <NhomMenu nhan="Xuất tệp Word" />
                <MucMenu
                  icon={<Download className="w-4 h-4 text-blue-600" />}
                  nhan="Đề cho học sinh"
                  moTa="Chỉ đề, không kèm đáp án"
                  onClick={handleExportWordStudent}
                />
                <MucMenu
                  icon={<Download className="w-4 h-4 text-indigo-600" />}
                  nhan="Đề kèm lời giải"
                  moTa="Bản của giáo viên"
                  onClick={handleExportWordTeacher}
                />
                <MucMenu
                  icon={<Download className="w-4 h-4 text-teal-600" />}
                  nhan="Phiếu trả lời"
                  moTa="Tờ giấy học sinh làm bài: lưới trắc nghiệm và dòng kẻ chấm tự luận"
                  onClick={handleExportPhieu}
                />
                <MucMenu
                  icon={<Download className="w-4 h-4 text-rose-600" />}
                  nhan="Hướng dẫn chấm"
                  moTa="Đáp án các phần, bảng lũy tiến Đúng/Sai và biểu điểm tự luận"
                  onClick={handleExportHuongDanCham}
                />
                <MucMenu
                  icon={<Download className="w-4 h-4 text-violet-600" />}
                  nhan="Trọn gói"
                  moTa="Ma trận + Bản đặc tả theo mẫu Công văn 7991, kèm đề và lời giải, trong một tệp"
                  onClick={handleExportTronGoi}
                />
              </MenuGon>

              <MenuGon nhan="Lưu & Gửi" icon={<Save className="w-4 h-4" />} rong="w-[300px]">
                <MucMenu
                  icon={dangLuuBoDe ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-purple-600" />}
                  nhan="Lưu bộ đề"
                  moTa="Lưu vào hệ thống, mở lại được sau này"
                  disabled={dangLuuBoDe}
                  onClick={() => luuBoDe(false)}
                />
                <MucMenu
                  icon={dangDayOnline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-sky-600" />}
                  nhan="Đẩy sang Kỳ thi Online"
                  moTa="Tạo kỳ thi ở dạng bản nháp từ chính đề này"
                  disabled={dangDayOnline}
                  onClick={handleDaySangOnline}
                />
              </MenuGon>

              <button
                onClick={handleFinalizeExam}
                disabled={isFinalizing || isFinalized}
                title="Cộng số lần đã dùng cho từng câu trong ngân hàng"
                className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 text-[13px] shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {isFinalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {isFinalized ? "Đã chốt đề" : "Chốt đề"}
              </button>
            </div>
          )}
          </div>
        </div>
      </div>

      {step === 'select' ? (
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
          {lines.length === 0 && (
            <div className="text-center text-gray-400 py-20">Không có dạng toán nào trong ma trận.</div>
          )}
          {lines.map((line, lineIdx) => {
            const selectedCount = line.selectedIds.size;
            const isMatch = selectedCount === line.item.count;
            return (
              <div key={line.item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-bold text-gray-800">{line.item.math_form}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-700">{bankTypeLabel(line.item.question_type)}</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-700">{difficultyLabel(line.item.difficulty)}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isMatch ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        Đã chọn: {selectedCount} / mục tiêu {line.item.count}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => reroll(lineIdx)} className="flex items-center gap-1.5 text-xs font-bold border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                      <RotateCcw className="w-3.5 h-3.5" /> Chọn ngẫu nhiên lại
                    </button>
                    <button onClick={() => selectAll(lineIdx, true)} className="flex items-center gap-1.5 text-xs font-bold border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                      <CheckSquare className="w-3.5 h-3.5" /> Chọn tất cả
                    </button>
                    <button onClick={() => selectAll(lineIdx, false)} className="flex items-center gap-1.5 text-xs font-bold border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                      <Square className="w-3.5 h-3.5" /> Bỏ chọn hết
                    </button>
                    <button onClick={() => moKhungDoiCau(lineIdx, null)} className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
                      <ListChecks className="w-3.5 h-3.5" /> Xem cả {line.candidates.length} câu cùng dạng
                    </button>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {line.candidates.length === 0 && (
                    <div className="col-span-full text-center text-gray-400 py-6 text-sm">Không có câu hỏi nào trong kho khớp dạng này.</div>
                  )}
                  {/* Chỉ bày những câu ĐANG nằm trong đề. Muốn xem các câu khác cùng dạng
                      thì bấm "Đổi câu khác" - đỡ phải cuộn qua hàng chục câu không dùng tới. */}
                  {line.candidates.filter(q => line.selectedIds.has(q.id)).map(q => {
                    const isChecked = true;
                    const soThuTu = soThuTuTrongDe.get(q.id);
                    const { statements, layout } = questionStatements(q);
                    return (
                      <div key={q.id} className={`rounded-xl border-2 transition-colors ${
                        nghiTrung.has(q.id)
                          ? 'border-rose-400 bg-rose-50/50'
                          : isChecked ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        {/* Câu bị bộ rà chấm là na ná câu khác trong cùng đề - nói rõ giống
                            câu nào để Thầy cô tự quyết giữ hay bỏ. */}
                        {nghiTrung.has(q.id) && (
                          <div className="flex items-start gap-2 px-3 pt-2.5 text-[11.5px] font-bold text-rose-700">
                            <Copy className="w-3.5 h-3.5 shrink-0 mt-[1px]" />
                            <span>
                              Nghi trùng {Math.round((nghiTrung.get(q.id)!.doGiong) * 100)}% với:{' '}
                              <i className="font-medium">“{nghiTrung.get(q.id)!.cungVoi}…”</i>
                            </span>
                          </div>
                        )}
                        <div className="p-3 flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Số của câu trong đề hoàn chỉnh, để từ đề quay lại đây tìm đúng câu cần đổi */}
                            {soThuTu && (
                              <div className="mb-1.5">
                                <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-black px-2 py-0.5 rounded-md">
                                  Câu {soThuTu} của đề
                                </span>
                              </div>
                            )}
                            <QuestionPreviewCard
                              content={q.content}
                              imageUrl={q.image_url}
                              statements={statements}
                              statementsLayout={layout}
                              correctAnswerDisplay={q.question_type === 'TLN' || q.question_type === 'TL' ? (q.correct_answer || undefined) : undefined}
                              size={coChu}
                            />
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                              Đã dùng: {q.usage_count || 0} lần
                            </span>
                            <button
                              onClick={() => moKhungDoiCau(lineIdx, q.id)}
                              className="flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-lg whitespace-nowrap"
                            >
                              <Replace className="w-3.5 h-3.5" /> Đổi câu khác
                            </button>
                            {/* Kho không có câu nào vừa ý thì nhờ AI soạn hẳn câu mới theo
                                yêu cầu - "Đổi câu khác" chỉ xoay vòng trong đúng những câu
                                đang có, dạng nào kho nghèo thì bấm mãi vẫn thế. */}
                            <button
                              onClick={() => setOSoanLai({ dongIdx: lineIdx, cauGoc: q, grade, subject: q.subject || subject })}
                              title="Kho không có câu vừa ý thì nhờ AI soạn câu mới theo yêu cầu"
                              className="flex items-center gap-1 text-xs font-bold text-violet-700 hover:bg-violet-50 px-2 py-1 rounded-lg border border-violet-300 whitespace-nowrap"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Soạn lại theo ý
                            </button>
                            <button
                              onClick={() => setEditingQuestion(q)}
                              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Sửa
                            </button>
                            {/* Soát đề mới là lúc nhìn ra câu trùng - xoá được ngay tại đây,
                                khỏi phải nhớ rồi sang trang Ngân hàng tìm lại. */}
                            <button
                              onClick={() => xoaKhoiNganHang(q, lineIdx)}
                              disabled={dangXoa === q.id}
                              title="Xoá hẳn câu này khỏi ngân hàng câu hỏi"
                              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 px-2 py-1 rounded-lg border border-rose-200 whitespace-nowrap"
                            >
                              {dangXoa === q.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />} Xoá khỏi kho
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Chưa đủ số câu mục tiêu thì mời chọn thêm ngay tại chỗ */}
                  {selectedCount < line.item.count && line.candidates.length > 0 && (
                    <button
                      onClick={() => moKhungDoiCau(lineIdx, null)}
                      className="min-h-[120px] rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 font-bold flex flex-col items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-6 h-6" />
                      {/* Nút MỜI bấm để tự tay chọn - không phải câu tự sinh ra. Sau "Bỏ chọn
                          hết" (selectedCount = 0), đổi chữ để khỏi tưởng nhầm là máy tự thêm lại. */}
                      {selectedCount === 0 ? `Bấm để chọn ${line.item.count} câu` : `Chọn thêm ${line.item.count - selectedCount} câu`}
                      <span className="text-xs font-medium text-indigo-500">
                        {selectedCount === 0
                          ? `Chưa chọn câu nào - kho có ${line.candidates.length} câu cùng dạng này`
                          : `Kho có ${line.candidates.length} câu cùng dạng này`}
                      </span>
                    </button>
                  )}

                  {selectedCount === 0 && line.candidates.length === 0 && (
                    <div className="col-span-full text-center text-gray-400 py-6 text-sm">
                      Chưa chọn câu nào cho dạng này.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div id="print-area" className="max-w-5xl mx-auto px-8 py-8 bg-white" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt' }}>

          {/* Đầu đề hai cột như đề in thật: lớp học bên trái, thông tin kỳ thi bên phải */}
          <div className="flex justify-between items-start gap-8 mb-6">
            <div className="text-center font-bold uppercase leading-relaxed">
              <div>{dauDe.tenLopHoc}</div>
              <div className="mt-2 inline-block border border-black px-3 py-0.5 text-[11pt]">ĐỀ CHÍNH THỨC</div>
            </div>
            <div className="text-center font-bold leading-relaxed">
              <div className="uppercase">{dauDe.tenKyThi || "ĐỀ KIỂM TRA"}</div>
              {dauDe.monLop && <div className="font-normal">Môn: {dauDe.monLop}</div>}
              {dauDe.namHoc && <div className="font-normal">Năm học: {dauDe.namHoc}</div>}
              {dauDe.thoiGian && <div className="font-normal">Thời gian làm bài: {dauDe.thoiGian}</div>}
              {dauDe.maDe && <div className="font-normal">Mã đề: {dauDe.maDe}</div>}
            </div>
          </div>

          {/* Chia PHẦN I / II / III theo khuôn 2025: trắc nghiệm trước, tự luận sau */}
          {cacPhan.map(phan => (
            <div key={phan.ma} className="mb-6">
              <div className="font-bold mb-1">
                PHẦN {phan.soLaMa}. {phan.tieuDe}
                <span className="font-normal"> ({soDiemVN(diemCuaPhan(phan, dongMaTran))} điểm)</span>
              </div>
              <div className="italic mb-3 text-[11pt]">{phan.cauDan}</div>

              {phan.cauHoi.map(q => {
                const { statements, layout } = questionStatements(q);
                return (
                  <div key={q.id} className="mb-5">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-bold">Câu {soThuTuTrongDe.get(q.id)}.</span>
                      {/* Mã câu chỉ để Thầy cô dò trên màn hình - IN RA THÌ ẨN, cả khi in
                          thẳng từ trình duyệt lẫn khi xuất Word. */}
                      <span className="print:hidden text-[10px] text-gray-400 font-mono">[{soCau.get(q.id)?.ma}]</span>
                      {/* Nhãn và nút dưới đây: KHÔNG in ra giấy */}
                      <span className="print:hidden inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Đã xuất hiện: {q.usage_count || 0} lần
                      </span>
                      <button
                        onClick={() => {
                          const lineIdx = dongCuaCau.get(q.id);
                          if (lineIdx !== undefined) setOSoanLai({ dongIdx: lineIdx, cauGoc: q, grade, subject: q.subject || subject });
                        }}
                        title="Kho không có câu vừa ý thì nhờ AI soạn câu mới theo yêu cầu"
                        className="print:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-300 hover:bg-violet-100"
                      >
                        <Sparkles className="w-3 h-3" /> Soạn lại theo ý
                      </button>
                      <button
                        onClick={() => {
                          const lineIdx = dongCuaCau.get(q.id);
                          if (lineIdx !== undefined) toggleCandidate(lineIdx, q.id);
                        }}
                        title="Bỏ câu này khỏi đề"
                        className="print:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                      >
                        <X className="w-3 h-3" /> Bỏ câu này
                      </button>
                    </div>
                    <QuestionPreviewCard
                      content={q.content}
                      imageUrl={q.image_url}
                      statements={statements}
                      statementsLayout={layout}
                      correctAnswerDisplay={q.question_type === 'TLN' || q.question_type === 'TL' ? (q.correct_answer || undefined) : undefined}
                      size={coChu}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          <div className="text-center italic text-[11pt] mt-8">--- HẾT ---</div>
        </div>
      )}

      {/* ===== Khung đổi câu: toàn bộ câu cùng dạng - cùng mức độ - cùng dạng thức ===== */}
      {dongDangDoi !== null && lines[dongDangDoi] && (() => {
        const line = lines[dongDangDoi];
        const daChon = line.selectedIds.size;
        const duMucTieu = daChon === line.item.count;
        const dongIdx = dongDangDoi;
        return (
          <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm p-3 md:p-5 flex items-center justify-center">
            <div className="bg-white rounded-2xl w-full max-w-[1500px] h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/70 flex items-start justify-between gap-4 shrink-0 flex-wrap">
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-gray-800">{line.item.math_form}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-700">{bankTypeLabel(line.item.question_type)}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-700">{difficultyLabel(line.item.difficulty)}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${duMucTieu ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      Đã chọn: {daChon} / mục tiêu {line.item.count}
                    </span>
                    <span className="text-[11px] font-bold text-gray-400">
                      Kho có {line.candidates.length} câu cùng dạng, cùng mức độ, cùng dạng thức
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button onClick={() => reroll(dongIdx)} className="flex items-center gap-1.5 text-xs font-bold border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                    <RotateCcw className="w-3.5 h-3.5" /> Chọn ngẫu nhiên lại
                  </button>
                  <button onClick={() => selectAll(dongIdx, false)} className="flex items-center gap-1.5 text-xs font-bold border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                    <Square className="w-3.5 h-3.5" /> Bỏ chọn hết
                  </button>
                  <button onClick={() => { setDongDangDoi(null); setCauDangDoi(null); }} className="p-2 text-gray-400 hover:text-red-600 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-gray-50/40">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {line.candidates.map(q => {
                    const isChecked = line.selectedIds.has(q.id);
                    const laCauDangDoi = q.id === cauDangDoi;
                    const soThuTu = soThuTuTrongDe.get(q.id);
                    const { statements, layout } = questionStatements(q);
                    return (
                      <div
                        key={q.id}
                        ref={laCauDangDoi ? (el) => { el?.scrollIntoView({ block: 'center' }); } : undefined}
                        className={`rounded-xl border-2 transition-colors ${
                          laCauDangDoi ? 'border-amber-400 bg-amber-50/40'
                            : isChecked ? 'border-indigo-300 bg-indigo-50/30'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="p-3 flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCandidate(dongIdx, q.id)}
                            className="mt-1.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="mb-1.5 flex items-center gap-2 flex-wrap">
                              {soThuTu && (
                                <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-black px-2 py-0.5 rounded-md">
                                  Câu {soThuTu} của đề
                                </span>
                              )}
                              {laCauDangDoi && (
                                <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[11px] font-black px-2 py-0.5 rounded-md">
                                  Câu đang muốn đổi
                                </span>
                              )}
                            </div>
                            <QuestionPreviewCard
                              content={q.content}
                              imageUrl={q.image_url}
                              statements={statements}
                              statementsLayout={layout}
                              correctAnswerDisplay={q.question_type === 'TLN' || q.question_type === 'TL' ? (q.correct_answer || undefined) : undefined}
                              size={coChu}
                            />
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                              Đã dùng: {q.usage_count || 0} lần
                            </span>
                            <button
                              onClick={() => setEditingQuestion(q)}
                              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Sửa
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between gap-3 flex-wrap shrink-0">
                <span className={`text-sm font-bold ${duMucTieu ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {duMucTieu ? 'Đã đủ số câu mục tiêu.' : `Còn thiếu ${line.item.count - daChon} câu so với mục tiêu.`}
                </span>
                <button
                  onClick={() => { setDongDangDoi(null); setCauDangDoi(null); }}
                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-emerald-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Xong
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <KiemThuDeModal
        mo={moKiemThu}
        onDong={() => setMoKiemThu(false)}
        cacPhan={cacPhan}
        chiTieu={Object.fromEntries(Object.entries(gomTheoLoai(dongMaTran))
          .filter(([, v]) => v.soCau > 0)
          .map(([k, v]) => [k, { soCau: v.soCau, diemMoiCau: v.soCau ? v.diem / v.soCau : 0 }])) as any}
        diemPhan={diemPhan}
        tenKhuon={khuonDe}
        dongMaTran={lines.map(l => ({
          ten: l.item.topic || l.item.math_form || 'Dạng',
          can: l.item.count || 0,
          co: l.selectedIds.size,
        }))}
      />

      <QuestionEditorModal
        isOpen={!!editingQuestion}
        onClose={() => setEditingQuestion(null)}
        question={editingQuestion}
        onSave={handleSaveEdit}
      />

      {/* Kho không có câu vừa ý thì nhờ AI soạn hẳn câu mới theo yêu cầu, ngay tại câu đó. */}
      <SoanLaiCauModal
        isOpen={!!oSoanLai}
        onClose={() => setOSoanLai(null)}
        o={oSoanLai}
        onThay={thayCauDaSoanLai}
      />
    </div>
  );
}

export default function ExamSelectPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>}>
      <SelectContent />
    </Suspense>
  );
}
