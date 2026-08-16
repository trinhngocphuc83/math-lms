"use client";

// Hàng đợi tự động bóc tách câu hỏi vào Ngân hàng.
//
// Khác với trang "Soạn câu hỏi 1 lượt" (chỉ xử lý được 1 lượt ảnh nhỏ trong 1
// lần gọi AI), trang này nhận NGUYÊN 1 bộ tài liệu (không giới hạn số ảnh/PDF),
// tự chia thành nhiều lô nhỏ và quét tuần tự - không cần ngồi canh từng đợt.
//
// NGUYÊN TẮC AN TOÀN: mặc định KHÔNG có câu nào tự lưu thẳng vào ngân hàng.
// Mọi câu quét được đều dừng ở "Bàn kiểm duyệt" để xem lại đầy đủ (nội dung có
// render công thức thật, đáp án, lời giải, phân loại, và nhất là ẢNH ĐÃ CẮT đặt
// cạnh ảnh trang gốc có khung đánh dấu để đối chiếu). Chỉ những câu được tích
// chọn mới được lưu. Ai muốn chạy nhanh như trước thì bật lại tuỳ chọn "Tự lưu
// câu sạch" ở phần cấu hình.
//
// Câu có Chương/Bài/Dạng toán không khớp danh mục có sẵn KHÔNG tự thêm âm thầm
// (khác trang "Soạn câu hỏi 1 lượt") - phải qua panel "Duyệt danh mục mới",
// gộp theo giá trị (nhiều câu cùng đề xuất 1 giá trị chỉ cần duyệt 1 lần).

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import QuestionEditorModal from "@/components/admin/QuestionEditorModal";
import QuestionPreviewCard, { type PreviewStatement } from "@/components/admin/QuestionPreviewCard";
import SourceImageWithBox from "@/components/admin/SourceImageWithBox";
import {
  type QuestionData,
  IMAGE_NEEDED_REGEX,
  IMAGE_PLACEHOLDER_STRIP_REGEX,
  scanFilesForQuestions,
} from "@/utils/aiQuestionScan";
import { saveQuestionsToBank } from "@/utils/questionBankSave";
import { autoCropImage, type NormalizedBox } from "@/utils/autoCropImage";
import { bankTypeLabel, difficultyLabel } from "@/utils/questionTypes";
import {
  Loader2, UploadCloud, Play, Pause, RotateCcw, X, CheckCircle2, AlertTriangle,
  FileText, Image as ImageIcon, ListChecks, Trash2, Pencil, Crop, EyeOff, ShieldCheck,
} from "lucide-react";

// ===== Kiểu dữ liệu nội bộ =====

interface ScanChunk {
  chunk_id: string;
  kind: 'images' | 'pdf';
  files: File[];
  fileNames: string[];
  status: 'pending' | 'processing' | 'success' | 'error';
  errorMessage?: string;
  foundCount?: number;
  autoSavedCount?: number;
  reviewCount?: number;
  pdfSizeWarning?: boolean;
}

type ReviewReason = 'duplicate' | 'missing_image' | 'image_auto_cropped' | 'clean';

interface ReviewItem {
  review_id: string;
  question: QuestionData;
  reasons: ReviewReason[];
  /** Tích chọn để lưu vào ngân hàng */
  selected: boolean;
  /** Ảnh trang gốc chứa câu này - để đối chiếu vùng AI đã cắt */
  sourceFile?: File;
  /** Khung tọa độ AI xác định (thang 0-1000) */
  cropBox?: NormalizedBox;
  /** Đã bấm xác nhận ảnh tự cắt hay chưa */
  imageConfirmed?: boolean;
}

interface WorkingQuestion {
  id: string;
  q: QuestionData;
  autoCropped: boolean;
  pendingCategoryKeys: string[];
  sourceFile?: File;
  cropBox?: NormalizedBox;
}

interface CategoryProposal {
  key: string;
  level: 'topic' | 'lesson' | 'math_form';
  value: string;
  waitingIds: string[];
}

const LEVEL_LABEL: Record<CategoryProposal['level'], string> = {
  topic: 'Chương',
  lesson: 'Bài học',
  math_form: 'Dạng toán',
};

const REASON_LABEL: Record<ReviewReason, { label: string; color: string }> = {
  clean: { label: 'Sạch - sẵn sàng lưu', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  duplicate: { label: 'Trùng lặp', color: 'bg-red-100 text-red-700 border-red-200' },
  missing_image: { label: 'Thiếu ảnh', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  image_auto_cropped: { label: 'Ảnh tự cắt - cần đối chiếu', color: 'bg-blue-100 text-blue-700 border-blue-200' },
};

type ReviewFilter = 'all' | ReviewReason;

const FILTER_TABS: { key: ReviewFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'image_auto_cropped', label: 'Ảnh tự cắt' },
  { key: 'missing_image', label: 'Thiếu ảnh' },
  { key: 'duplicate', label: 'Trùng lặp' },
  { key: 'clean', label: 'Sạch' },
];

const CHUNK_SIZE = 7;
const PDF_SIZE_WARNING_BYTES = 15 * 1024 * 1024;

function proposalKey(level: CategoryProposal['level'], value: string): string {
  return `${level}::${value}`;
}

function buildChunks(files: File[]): ScanChunk[] {
  const chunks: ScanChunk[] = [];
  let buffer: File[] = [];

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    chunks.push({
      chunk_id: `chunk_${chunks.length}_${Date.now()}`,
      kind: 'images',
      files: buffer,
      fileNames: buffer.map((f) => f.name),
      status: 'pending',
    });
    buffer = [];
  };

  for (const file of files) {
    if (file.type === 'application/pdf') {
      flushBuffer();
      chunks.push({
        chunk_id: `chunk_${chunks.length}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        kind: 'pdf',
        files: [file],
        fileNames: [file.name],
        status: 'pending',
        pdfSizeWarning: file.size > PDF_SIZE_WARNING_BYTES,
      });
      continue;
    }
    buffer.push(file);
    if (buffer.length >= CHUNK_SIZE) flushBuffer();
  }
  flushBuffer();

  return chunks;
}

/** Dựng danh sách phương án/mệnh đề để xem trước theo đúng loại câu hỏi. */
function buildStatements(q: QuestionData): PreviewStatement[] {
  if (q.question_type === 'NLC') {
    return ['A', 'B', 'C', 'D']
      .map((opt) => ({
        key: opt,
        label: opt,
        content: ((q as any)[`option_${opt.toLowerCase()}`] as string) || '',
        isCorrect: q.correct_answer === opt,
      }))
      .filter((s) => s.content);
  }
  if (q.question_type === 'DS') {
    return ['a', 'b', 'c', 'd']
      .map((opt, idx) => {
        const ch = q.correct_answer?.charAt(idx);
        const isTrue = ch === 'D' || ch === 'T' ? true : ch === 'S' || ch === 'F' ? false : undefined;
        return {
          key: opt,
          label: opt,
          content: ((q as any)[`option_${opt}`] as string) || '',
          isTrue,
        };
      })
      .filter((s) => s.content);
  }
  return [];
}

export default function BatchQueuePage() {
  const supabase = createClient();

  // Phân loại gốc (gợi ý AI) - giống panel ở trang Soạn câu hỏi 1 lượt
  const [globalGrade, setGlobalGrade] = useState("");
  const [globalSubject, setGlobalSubject] = useState("");
  const [globalTopics, setGlobalTopics] = useState<string[]>([]);
  const [globalLesson, setGlobalLesson] = useState("");

  const [categories, setCategories] = useState<any[]>([]);
  const [existingQuestions, setExistingQuestions] = useState<{ id: string; content: string }[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('question_categories').select('*');
      if (data) setCategories(data);

      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data: qPage } = await supabase.from('questions').select('question_id, content').range(page * pageSize, (page + 1) * pageSize - 1);
        if (!qPage || qPage.length === 0) break;
        allData = [...allData, ...qPage];
        if (qPage.length < pageSize) break;
        page++;
      }
      setExistingQuestions(allData.map((d) => ({ id: d.question_id, content: (d.content || "").trim().toLowerCase().replace(/\s+/g, '') })));
      setIsLoadingContext(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uniqueGrades = Array.from(new Set(categories.map((c) => c.grade))).filter(Boolean).sort();
  const uniqueSubjects = Array.from(new Set(categories.filter((c) => !globalGrade || c.grade === globalGrade).map((c) => c.subject))).filter(Boolean);
  const uniqueTopics = Array.from(new Set(categories.filter((c) => (!globalGrade || c.grade === globalGrade) && (!globalSubject || c.subject === globalSubject)).map((c) => c.topic))).filter(Boolean);
  const uniqueLessons = Array.from(new Set(categories.filter((c) => (!globalGrade || c.grade === globalGrade) && (!globalSubject || c.subject === globalSubject) && (globalTopics.length === 0 || globalTopics.includes(c.topic))).map((c) => c.lesson))).filter(Boolean);
  const uniqueForms = Array.from(new Set(categories.filter((c) => (!globalGrade || c.grade === globalGrade) && (!globalSubject || c.subject === globalSubject) && (globalTopics.length === 0 || globalTopics.includes(c.topic)) && (!globalLesson || c.lesson === globalLesson)).map((c) => c.math_form))).filter(Boolean);

  const scanCtx = useCallback(() => ({
    globalGrade, globalSubject, globalTopics, globalLesson,
    uniqueTopics, uniqueLessons, uniqueForms,
    existingQuestions,
  }), [globalGrade, globalSubject, globalTopics, globalLesson, uniqueTopics, uniqueLessons, uniqueForms, existingQuestions]);

  // Hàng đợi lô
  const [allFiles, setAllFiles] = useState<File[]>([]);
  const [chunks, setChunks] = useState<ScanChunk[]>([]);
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(-1);
  const stopRequestedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Mặc định TẮT: mọi câu đều phải qua bàn kiểm duyệt trước khi vào ngân hàng. */
  const [autoSaveClean, setAutoSaveClean] = useState(false);
  const autoSaveCleanRef = useRef(false);
  useEffect(() => { autoSaveCleanRef.current = autoSaveClean; }, [autoSaveClean]);

  const [savedTotal, setSavedTotal] = useState(0);
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
  const [waitingForCategory, setWaitingForCategory] = useState<WorkingQuestion[]>([]);
  const [pendingProposals, setPendingProposals] = useState<Record<string, CategoryProposal>>({});
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const picked = Array.from(e.target.files);
    setAllFiles((prev) => [...prev, ...picked]);
    e.target.value = '';
  };

  const handleBuildQueue = () => {
    if (allFiles.length === 0) return alert("Vui lòng chọn ảnh/PDF trước!");
    setChunks(buildChunks(allFiles));
    setCurrentChunkIndex(-1);
    setSavedTotal(0);
    setReviewQueue([]);
    setWaitingForCategory([]);
    setPendingProposals({});
  };

  const updateChunk = (index: number, patch: Partial<ScanChunk>) => {
    setChunks((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  // Đăng ký đề xuất danh mục mới - gộp theo giá trị, không hỏi lại nếu đã có đề xuất y hệt
  const registerCategoryProposals = (working: WorkingQuestion[]) => {
    setPendingProposals((prev) => {
      const next = { ...prev };
      for (const w of working) {
        for (const key of w.pendingCategoryKeys) {
          const existing = next[key];
          if (existing) {
            next[key] = { ...existing, waitingIds: [...existing.waitingIds, w.id] };
          } else {
            const [level, value] = key.split('::');
            next[key] = { key, level: level as CategoryProposal['level'], value, waitingIds: [w.id] };
          }
        }
      }
      return next;
    });
  };

  /** Phân loại các câu ĐÃ SẴN SÀNG (không còn chờ danh mục) -> bàn kiểm duyệt (hoặc tự lưu nếu bật tuỳ chọn). */
  const routeReadyQuestions = async (ready: WorkingQuestion[]) => {
    if (ready.length === 0) return;
    const toAutoSave: QuestionData[] = [];
    const toReview: ReviewItem[] = [];

    for (const w of ready) {
      const reasons: ReviewReason[] = [];
      if (w.q.isDuplicate) reasons.push('duplicate');
      if (w.autoCropped) reasons.push('image_auto_cropped');
      else if (!w.q.image_url && IMAGE_NEEDED_REGEX.test(w.q.content || '')) reasons.push('missing_image');

      const isClean = reasons.length === 0;

      // Chỉ câu thật sự sạch mới đủ điều kiện tự lưu, và chỉ khi người dùng bật tuỳ chọn
      if (isClean && autoSaveCleanRef.current) {
        toAutoSave.push(w.q);
        continue;
      }

      toReview.push({
        review_id: w.id,
        question: w.q,
        reasons: isClean ? ['clean'] : reasons,
        selected: !w.q.isDuplicate, // câu trùng lặp không tích sẵn
        sourceFile: w.sourceFile,
        cropBox: w.cropBox,
        imageConfirmed: false,
      });
    }

    if (toAutoSave.length > 0) {
      try {
        const result = await saveQuestionsToBank(supabase, toAutoSave);
        setSavedTotal((prev) => prev + result.insertedCount);
      } catch (e: any) {
        // Lỗi lưu (hiếm) - đưa về bàn kiểm duyệt để không mất dữ liệu
        toAutoSave.forEach((q) => toReview.push({ review_id: q.temp_id!, question: q, reasons: ['clean'], selected: true }));
      }
    }
    if (toReview.length > 0) {
      setReviewQueue((prev) => [...prev, ...toReview]);
    }
  };

  const processChunk = async (index: number, chunk: ScanChunk) => {
    updateChunk(index, { status: 'processing', errorMessage: undefined });
    try {
      const questions = await scanFilesForQuestions(chunk.files, scanCtx());
      const working: WorkingQuestion[] = [];

      for (const q of questions) {
        let autoCropped = false;
        let sourceFile: File | undefined;
        let cropBox: NormalizedBox | undefined;

        if (chunk.kind === 'images' && q.viTriHinhAnh && !q.image_url) {
          const srcFile = chunk.files[q.viTriHinhAnh.fileIndex];
          if (srcFile) {
            try {
              const url = await autoCropImage(supabase, srcFile, q.viTriHinhAnh);
              q.image_url = url;
              q.content = q.content.replace(IMAGE_PLACEHOLDER_STRIP_REGEX, '').replace(/\s{2,}/g, ' ').trim();
              autoCropped = true;
              sourceFile = srcFile;
              cropBox = q.viTriHinhAnh;
            } catch (e) {
              // Cắt lỗi (khung tọa độ không hợp lý...) - để nguyên, coi như câu thiếu ảnh bình thường
            }
          }
        }
        // Câu thiếu ảnh nhưng AI vẫn chỉ được trang nào (chỉ hỏng ở bước cắt) thì
        // giữ lại trang đó để người duyệt tự cắt tay. Nếu AI không xác định được
        // trang nào thì để trống - thà không hiện còn hơn hiện nhầm trang khác.
        if (!sourceFile && chunk.kind === 'images' && typeof q.viTriHinhAnh?.fileIndex === 'number') {
          sourceFile = chunk.files[q.viTriHinhAnh.fileIndex];
          cropBox = q.viTriHinhAnh;
        }

        const pendingKeys: string[] = [];
        if (q.isNewTopic) pendingKeys.push(proposalKey('topic', q.topic));
        if (q.isNewLesson) pendingKeys.push(proposalKey('lesson', q.lesson));
        if (q.isNewMathForm) pendingKeys.push(proposalKey('math_form', q.math_form));

        working.push({ id: q.temp_id!, q, autoCropped, pendingCategoryKeys: pendingKeys, sourceFile, cropBox });
      }

      const waiting = working.filter((w) => w.pendingCategoryKeys.length > 0);
      const ready = working.filter((w) => w.pendingCategoryKeys.length === 0);

      if (waiting.length > 0) {
        registerCategoryProposals(waiting);
        setWaitingForCategory((prev) => [...prev, ...waiting]);
      }
      await routeReadyQuestions(ready);

      const cleanCount = ready.filter((w) => !w.q.isDuplicate && !w.autoCropped && !(!w.q.image_url && IMAGE_NEEDED_REGEX.test(w.q.content || ''))).length;
      updateChunk(index, {
        status: 'success',
        foundCount: questions.length,
        autoSavedCount: autoSaveCleanRef.current ? cleanCount : 0,
        reviewCount: questions.length - (autoSaveCleanRef.current ? cleanCount : 0),
      });
    } catch (e: any) {
      updateChunk(index, { status: 'error', errorMessage: e.message || 'Lỗi không xác định - cần thử lại' });
    }
  };

  const runQueue = async (startIndex: number) => {
    setIsQueueRunning(true);
    stopRequestedRef.current = false;
    for (let i = startIndex; i < chunks.length; i++) {
      if (stopRequestedRef.current) break;
      const current = chunks[i];
      if (current.status === 'success') continue;
      setCurrentChunkIndex(i);
      await processChunk(i, current);
    }
    setIsQueueRunning(false);
    setCurrentChunkIndex(-1);
  };

  const handleStart = () => {
    if (chunks.length === 0) return;
    runQueue(0);
  };

  const handleStop = () => {
    stopRequestedRef.current = true;
  };

  const handleResume = () => {
    const nextIdx = chunks.findIndex((c) => c.status === 'pending' || c.status === 'error');
    if (nextIdx === -1) return;
    runQueue(nextIdx);
  };

  const handleRetryChunk = (index: number) => {
    if (isQueueRunning) return;
    setIsQueueRunning(true);
    processChunk(index, chunks[index]).finally(() => setIsQueueRunning(false));
  };

  // ===== Duyệt danh mục mới =====
  const resolveProposal = async (key: string, action: { type: 'approve' } | { type: 'remap'; to: string }) => {
    const proposal = pendingProposals[key];
    if (!proposal) return;

    const affectedIds = new Set(proposal.waitingIds);
    const affected = waitingForCategory.filter((w) => affectedIds.has(w.id));
    const stillWaiting0 = waitingForCategory.filter((w) => !affectedIds.has(w.id));

    if (action.type === 'approve') {
      const sample = affected[0]?.q;
      if (sample) {
        const insertData = { grade: sample.grade, subject: sample.subject, topic: sample.topic, lesson: sample.lesson, math_form: sample.math_form };
        const { error } = await supabase.from('question_categories').insert([insertData]);
        // Một câu hỏi có thể sinh nhiều đề xuất cùng lúc (Chương mới + Bài mới + Dạng
        // mới), nhưng cả ba đều ứng với ĐÚNG MỘT dòng danh mục. Duyệt cái đầu đã ghi
        // dòng đó rồi, nên cái thứ hai chắc chắn đụng khoá trùng (mã 23505) - đây là
        // chuyện bình thường, không phải lỗi. Trước đây bắt cứng mọi lỗi rồi thoát sớm
        // nên đề xuất không bao giờ được gỡ, người dùng bấm mãi không hết.
        const trungKhoa = (error as any)?.code === '23505';
        if (!error) setCategories((prev) => [...prev, insertData]);
        else if (!trungKhoa) { alert("Lỗi thêm danh mục: " + error.message); return; }
      }
    } else {
      for (const w of affected) {
        (w.q as any)[proposal.level] = action.to;
      }
    }

    const nowReady: WorkingQuestion[] = [];
    const stillWaitingAffected: WorkingQuestion[] = [];
    for (const w of affected) {
      const remainingKeys = w.pendingCategoryKeys.filter((k) => k !== key);
      if (remainingKeys.length === 0) nowReady.push({ ...w, pendingCategoryKeys: [] });
      else stillWaitingAffected.push({ ...w, pendingCategoryKeys: remainingKeys });
    }

    setWaitingForCategory([...stillWaiting0, ...stillWaitingAffected]);
    setPendingProposals((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    if (nowReady.length > 0) await routeReadyQuestions(nowReady);
  };

  // ===== Bàn kiểm duyệt =====
  const patchReviewItem = (reviewId: string, patch: Partial<ReviewItem>) => {
    setReviewQueue((prev) => prev.map((r) => (r.review_id === reviewId ? { ...r, ...patch } : r)));
  };

  const updateReviewQuestion = (reviewId: string, updated: QuestionData) => {
    setReviewQueue((prev) => prev.map((r) => {
      if (r.review_id !== reviewId) return r;
      // Người dùng đã tự cắt/sửa ảnh trong trình soạn thảo -> coi như đã đối chiếu xong
      const imageChanged = updated.image_url !== r.question.image_url;
      const reasons = imageChanged ? r.reasons.filter((rs) => rs !== 'missing_image') : r.reasons;
      return { ...r, question: updated, reasons, imageConfirmed: imageChanged ? true : r.imageConfirmed };
    }));
  };

  const removeReviewItem = (reviewId: string) => {
    setReviewQueue((prev) => prev.filter((r) => r.review_id !== reviewId));
  };

  const confirmAutoCroppedImage = (reviewId: string, keepImage: boolean) => {
    setReviewQueue((prev) => prev.map((r) => {
      if (r.review_id !== reviewId) return r;
      const updatedQuestion = keepImage ? r.question : { ...r.question, image_url: '' };
      return { ...r, question: updatedQuestion, imageConfirmed: true };
    }));
  };

  const toggleExpanded = (reviewId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) next.delete(reviewId);
      else next.add(reviewId);
      return next;
    });
  };

  const matchesFilter = (item: ReviewItem, filter: ReviewFilter) =>
    filter === 'all' ? true : item.reasons.includes(filter);

  const filteredReview = reviewQueue.filter((r) => matchesFilter(r, reviewFilter));
  const selectedItems = reviewQueue.filter((r) => r.selected);
  /** Ảnh tự cắt đã chọn lưu nhưng chưa bấm đối chiếu - cần cảnh báo trước khi lưu */
  const unconfirmedCropCount = selectedItems.filter((r) => r.reasons.includes('image_auto_cropped') && !r.imageConfirmed).length;

  const setSelectionForFiltered = (selected: boolean) => {
    const ids = new Set(filteredReview.map((r) => r.review_id));
    setReviewQueue((prev) => prev.map((r) => (ids.has(r.review_id) ? { ...r, selected } : r)));
  };

  const handleSaveSelected = async () => {
    if (selectedItems.length === 0) return alert("Chưa chọn câu nào để lưu.");
    if (unconfirmedCropCount > 0) {
      const ok = confirm(`Còn ${unconfirmedCropCount} câu có ảnh tự cắt mà thầy chưa bấm đối chiếu.\n\nẢnh cắt sai có thể làm câu hỏi sai lệch nghiêm trọng. Vẫn lưu?`);
      if (!ok) return;
    }
    const dupSelected = selectedItems.filter((r) => r.reasons.includes('duplicate')).length;
    if (dupSelected > 0) {
      const ok = confirm(`Trong số đã chọn có ${dupSelected} câu bị đánh dấu TRÙNG với câu đã có trong ngân hàng.\n\nVẫn lưu (ngân hàng sẽ có 2 bản giống nhau)?`);
      if (!ok) return;
    }
    if (!confirm(`Lưu ${selectedItems.length} câu đã chọn vào Ngân hàng câu hỏi?`)) return;

    setIsSaving(true);
    try {
      // Bỏ cờ isDuplicate: thầy đã tự tay tích chọn từng câu ở bàn kiểm duyệt nên
      // tôn trọng lựa chọn đó, không để hàm lưu âm thầm loại bớt câu đã chọn.
      const payload = selectedItems.map((r) => ({ ...r.question, isDuplicate: false }));
      const result = await saveQuestionsToBank(supabase, payload);
      setSavedTotal((prev) => prev + result.insertedCount);
      const savedIds = new Set(selectedItems.map((r) => r.review_id));
      setReviewQueue((prev) => prev.filter((r) => !savedIds.has(r.review_id)));
      alert(`Đã lưu ${result.insertedCount} câu vào Ngân hàng!`);
    } catch (e: any) {
      alert("Lỗi khi lưu: " + e.message);
    }
    setIsSaving(false);
  };

  const editingReviewItem = reviewQueue.find((r) => r.review_id === editingReviewId) || null;

  const totalProcessedChunks = chunks.filter((c) => c.status === 'success' || c.status === 'error').length;
  const totalFound = chunks.reduce((acc, c) => acc + (c.foundCount || 0), 0);
  const isQueueFinished = chunks.length > 0 && totalProcessedChunks === chunks.length && !isQueueRunning;
  const reasonCounts = reviewQueue.reduce((acc, r) => {
    for (const reason of r.reasons) acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <ListChecks className="w-7 h-7 text-emerald-600" /> Hàng đợi tự động - Bóc tách câu hỏi vào Ngân hàng
        </h1>
        <p className="text-gray-500 text-sm mt-1">Tải lên cả bộ tài liệu, hệ thống tự chia lô và quét. Mọi câu đều dừng ở Bàn kiểm duyệt để thầy xem trước khi lưu. Giữ tab này mở trong lúc chạy.</p>
      </div>

      {/* Phân loại gốc */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Phân loại gốc (gợi ý AI - có thể để trống)</h3>
        <div className="flex flex-wrap gap-3">
          <select value={globalGrade} onChange={(e) => setGlobalGrade(e.target.value)} className="border rounded-lg px-3 py-2 text-sm font-bold bg-white">
            <option value="">-- Lớp: Tự động --</option>
            {uniqueGrades.map((g) => <option key={g as string} value={g as string}>{g as string}</option>)}
          </select>
          <select value={globalSubject} onChange={(e) => setGlobalSubject(e.target.value)} className="border rounded-lg px-3 py-2 text-sm font-bold bg-white">
            <option value="">-- Phân môn: Tự động --</option>
            {uniqueSubjects.map((s) => <option key={s as string} value={s as string}>{s as string}</option>)}
          </select>
          <select
            value={globalTopics[0] || ""}
            onChange={(e) => setGlobalTopics(e.target.value ? [e.target.value] : [])}
            className="border rounded-lg px-3 py-2 text-sm font-bold bg-white max-w-xs"
          >
            <option value="">-- Chương: AI tự trích xuất --</option>
            {uniqueTopics.map((t) => <option key={t as string} value={t as string}>{t as string}</option>)}
          </select>
          <select value={globalLesson} onChange={(e) => setGlobalLesson(e.target.value)} className="border rounded-lg px-3 py-2 text-sm font-bold bg-white max-w-xs">
            <option value="">-- Bài học: AI tự trích xuất --</option>
            {uniqueLessons.map((l) => <option key={l as string} value={l as string}>{l as string}</option>)}
          </select>
        </div>

        <label className="mt-4 flex items-start gap-2.5 cursor-pointer bg-gray-50 border border-gray-200 rounded-xl p-3">
          <input type="checkbox" checked={autoSaveClean} onChange={(e) => setAutoSaveClean(e.target.checked)} className="mt-0.5 w-4 h-4 accent-emerald-600" />
          <span className="text-sm">
            <b className="text-gray-800">Tự lưu thẳng các câu sạch (chạy nhanh, không cần duyệt)</b>
            <span className="block text-xs text-gray-500 mt-0.5">
              Mặc định TẮT - mọi câu đều dừng ở Bàn kiểm duyệt để thầy kiểm tra. Chỉ bật khi cần chạy nhanh và chấp nhận không xem trước những câu không có dấu hiệu bất thường.
            </span>
          </span>
        </label>
      </div>

      {/* Chọn file + xây hàng đợi */}
      {chunks.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFilePick} />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-emerald-300 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-emerald-50/40 transition-colors"
          >
            <UploadCloud className="w-10 h-10 text-emerald-500 mb-2" />
            <p className="font-bold text-gray-700">Click để chọn TOÀN BỘ ảnh/PDF của tài liệu (không giới hạn số lượng)</p>
            <p className="text-xs text-gray-400 mt-1">Hệ thống sẽ tự chia thành các lô nhỏ để AI quét chính xác hơn.</p>
          </div>

          {allFiles.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-600">Đã chọn {allFiles.length} file</span>
                <button onClick={() => setAllFiles([])} className="text-xs text-red-500 font-bold hover:underline">Xóa hết</button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {allFiles.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-lg">
                    {f.type === 'application/pdf' ? <FileText className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                    {f.name}
                  </span>
                ))}
              </div>
              <button
                onClick={handleBuildQueue}
                disabled={isLoadingContext}
                className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-black shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isLoadingContext ? <Loader2 className="w-5 h-5 animate-spin" /> : <ListChecks className="w-5 h-5" />}
                Chia lô ({Math.ceil(allFiles.length / CHUNK_SIZE)} lô dự kiến)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tiến trình + danh sách lô */}
      {chunks.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div>
              <p className="font-bold text-gray-700">
                {isQueueRunning
                  ? `Đang xử lý lô ${currentChunkIndex + 1}/${chunks.length}... đã tìm ${totalFound} câu`
                  : isQueueFinished
                    ? `Đã xử lý xong ${chunks.length} lô - tìm được ${totalFound} câu`
                    : `${chunks.length} lô sẵn sàng`}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Câu đã lưu vào ngân hàng sẽ không mất; các câu đang chờ duyệt và lô chưa quét sẽ mất nếu đóng tab.</p>
            </div>
            <div className="flex items-center gap-2">
              {!isQueueRunning && currentChunkIndex === -1 && totalProcessedChunks === 0 && (
                <button onClick={handleStart} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5 hover:bg-emerald-700">
                  <Play className="w-4 h-4" /> Bắt đầu
                </button>
              )}
              {isQueueRunning && (
                <button onClick={handleStop} className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5 hover:bg-amber-600">
                  <Pause className="w-4 h-4" /> Dừng sau lô hiện tại
                </button>
              )}
              {!isQueueRunning && !isQueueFinished && totalProcessedChunks > 0 && (
                <button onClick={handleResume} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5 hover:bg-emerald-700">
                  <Play className="w-4 h-4" /> Tiếp tục
                </button>
              )}
              <button onClick={() => { setChunks([]); setAllFiles([]); }} className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50">
                Làm mới
              </button>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div className="bg-emerald-600 h-2.5 rounded-full transition-all" style={{ width: `${(totalProcessedChunks / chunks.length) * 100}%` }} />
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {chunks.map((c, i) => (
              <div key={c.chunk_id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm border ${
                c.status === 'success' ? 'bg-emerald-50 border-emerald-100' :
                c.status === 'error' ? 'bg-red-50 border-red-100' :
                c.status === 'processing' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  {c.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />}
                  {c.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {c.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
                  {c.status === 'pending' && <span className="w-4 h-4 shrink-0" />}
                  <span className="font-bold text-gray-700 shrink-0">Lô {i + 1}</span>
                  <span className="text-gray-400 truncate">{c.fileNames.join(', ')}</span>
                  {c.pdfSizeWarning && <span className="text-amber-600 text-[10px] font-bold shrink-0">⚠ PDF lớn</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.status === 'success' && (
                    <span className="text-emerald-700 text-xs font-bold">
                      {c.foundCount} câu{c.autoSavedCount ? ` · ${c.autoSavedCount} tự lưu` : ''}{c.reviewCount ? ` · ${c.reviewCount} chờ duyệt` : ''}
                    </span>
                  )}
                  {c.status === 'error' && (
                    <>
                      <span className="text-red-600 text-xs">{c.errorMessage}</span>
                      <button onClick={() => handleRetryChunk(i)} disabled={isQueueRunning} className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded hover:bg-red-200 flex items-center gap-1 disabled:opacity-50">
                        <RotateCcw className="w-3 h-3" /> Thử lại
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel Duyệt danh mục mới */}
      {Object.keys(pendingProposals).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-4">
          <h3 className="font-black text-amber-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Danh mục mới đang chờ duyệt ({Object.keys(pendingProposals).length})
          </h3>
          <div className="space-y-2">
            {Object.values(pendingProposals).map((p) => (
              <CategoryProposalCard
                key={p.key}
                proposal={p}
                existingOptions={p.level === 'topic' ? uniqueTopics : p.level === 'lesson' ? uniqueLessons : uniqueForms}
                onApprove={() => resolveProposal(p.key, { type: 'approve' })}
                onRemap={(to) => resolveProposal(p.key, { type: 'remap', to })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Thanh trạng thái tổng + mở bàn kiểm duyệt */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-6 text-sm">
          <div><span className="text-gray-400">Đã lưu vào ngân hàng:</span> <b className="text-emerald-600 text-lg">{savedTotal}</b></div>
          <div><span className="text-gray-400">Đang chờ danh mục:</span> <b className="text-amber-600 text-lg">{waitingForCategory.length}</b></div>
          <div><span className="text-gray-400">Chờ kiểm duyệt:</span> <b className="text-indigo-600 text-lg">{reviewQueue.length}</b></div>
        </div>
        <button
          onClick={() => setIsReviewOpen(true)}
          disabled={reviewQueue.length === 0}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm disabled:opacity-40 hover:bg-indigo-700 flex items-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" /> Mở bàn kiểm duyệt ({reviewQueue.length})
        </button>
      </div>

      {isQueueFinished && (
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-5">
          <h3 className="font-black text-emerald-800 mb-3">Báo cáo tổng kết</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3"><div className="text-gray-400 text-xs">Số lô đã xử lý</div><div className="text-xl font-black">{chunks.length}</div></div>
            <div className="bg-gray-50 rounded-xl p-3"><div className="text-gray-400 text-xs">Số câu tìm được</div><div className="text-xl font-black">{totalFound}</div></div>
            <div className="bg-emerald-50 rounded-xl p-3"><div className="text-emerald-600 text-xs">Đã lưu</div><div className="text-xl font-black text-emerald-700">{savedTotal}</div></div>
            <div className="bg-indigo-50 rounded-xl p-3"><div className="text-indigo-500 text-xs">Chờ kiểm duyệt</div><div className="text-xl font-black text-indigo-700">{reviewQueue.length}</div></div>
          </div>
          {Object.keys(reasonCounts).length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {Object.entries(reasonCounts).map(([reason, count]) => (
                <span key={reason} className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${REASON_LABEL[reason as ReviewReason].color}`}>
                  {REASON_LABEL[reason as ReviewReason].label}: {count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== BÀN KIỂM DUYỆT ===== */}
      {isReviewOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm p-2 md:p-4 flex justify-center items-center">
          <div className="bg-white rounded-2xl w-full max-w-[1400px] h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Đầu bàn duyệt */}
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 shrink-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" /> Bàn kiểm duyệt ({reviewQueue.length} câu)
                </h2>
                <button onClick={() => setIsReviewOpen(false)} className="p-2 text-gray-400 hover:text-red-600 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {FILTER_TABS.map((tab) => {
                  const count = tab.key === 'all' ? reviewQueue.length : (reasonCounts[tab.key] || 0);
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setReviewFilter(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        reviewFilter === tab.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {tab.label} ({count})
                    </button>
                  );
                })}
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <button onClick={() => setSelectionForFiltered(true)} className="text-xs font-bold text-indigo-600 hover:underline">Chọn tất cả</button>
                <button onClick={() => setSelectionForFiltered(false)} className="text-xs font-bold text-gray-500 hover:underline">Bỏ chọn tất cả</button>
              </div>
            </div>

            {/* Danh sách câu hỏi */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/60">
              {filteredReview.length === 0 && (
                <p className="text-center text-gray-400 py-16">Không có câu nào trong mục này.</p>
              )}
              {filteredReview.map((item) => {
                const q = item.question;
                const expanded = expandedIds.has(item.review_id);
                const needsCropCheck = item.reasons.includes('image_auto_cropped');
                return (
                  <div
                    key={item.review_id}
                    className={`bg-white border-2 rounded-2xl overflow-hidden transition-colors ${
                      item.selected ? 'border-emerald-300' : 'border-gray-200 opacity-70'
                    }`}
                  >
                    {/* Thanh đầu thẻ */}
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 flex-wrap">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => patchReviewItem(item.review_id, { selected: e.target.checked })}
                          className="w-4 h-4 accent-emerald-600"
                        />
                        <span className="text-xs font-bold text-gray-600">{item.selected ? 'Sẽ lưu' : 'Bỏ qua'}</span>
                      </label>

                      <div className="flex gap-1.5 flex-wrap flex-1 min-w-0">
                        {item.reasons.map((reason) => (
                          <span key={reason} className={`px-2 py-0.5 rounded text-[11px] font-bold border ${REASON_LABEL[reason].color}`}>
                            {REASON_LABEL[reason].label}
                          </span>
                        ))}
                        {needsCropCheck && item.imageConfirmed && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold border bg-emerald-100 text-emerald-700 border-emerald-200">✓ Đã đối chiếu ảnh</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => toggleExpanded(item.review_id)} className="text-xs font-bold text-gray-600 hover:bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">
                          {expanded ? 'Thu gọn' : 'Xem đáp án & lời giải'}
                        </button>
                        <button onClick={() => setEditingReviewId(item.review_id)} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200">
                          <Pencil className="w-3.5 h-3.5" /> Sửa
                        </button>
                        <button onClick={() => removeReviewItem(item.review_id)} className="flex items-center gap-1 text-xs font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                          <Trash2 className="w-3.5 h-3.5" /> Xóa
                        </button>
                      </div>
                    </div>

                    {/* Phân loại */}
                    <div className="px-4 pt-3 flex gap-1.5 flex-wrap text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">Lớp {q.grade} · {q.subject}</span>
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold">{q.topic || '(chưa có chương)'}</span>
                      <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-bold">{q.lesson || '(chưa có bài)'}</span>
                      <span className="px-2 py-0.5 rounded bg-pink-50 text-pink-700 font-bold">{q.math_form || '(chưa có dạng)'}</span>
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-bold">{bankTypeLabel(q.question_type)} · {difficultyLabel(q.difficulty)}</span>
                    </div>

                    {/* Nội dung câu hỏi - render công thức thật */}
                    <div className="p-4">
                      <QuestionPreviewCard
                        content={q.content}
                        imageUrl={q.image_url}
                        statements={expanded ? buildStatements(q) : []}
                        statementsLayout={q.question_type === 'DS' ? 'truefalse' : 'choice'}
                        correctAnswerDisplay={expanded ? q.correct_answer : undefined}
                        explanation={expanded ? q.explanation : undefined}
                      />

                      {/* Đối chiếu vùng cắt ảnh */}
                      {needsCropCheck && (
                        <CropReviewPanel
                          item={item}
                          onConfirm={() => confirmAutoCroppedImage(item.review_id, true)}
                          onReject={() => confirmAutoCroppedImage(item.review_id, false)}
                          onManualCrop={() => setEditingReviewId(item.review_id)}
                        />
                      )}

                      {/* Câu thiếu ảnh - cho xem ảnh trang gốc để tự cắt */}
                      {item.reasons.includes('missing_image') && (
                        <MissingImagePanel item={item} onManualCrop={() => setEditingReviewId(item.review_id)} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chân bàn duyệt */}
            <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center gap-3 shrink-0 flex-wrap">
              <div className="text-sm">
                <span className="font-black text-emerald-600 text-lg">{selectedItems.length}</span>
                <span className="text-gray-500"> / {reviewQueue.length} câu được chọn để lưu</span>
                {unconfirmedCropCount > 0 && (
                  <span className="ml-3 text-amber-600 font-bold text-xs">⚠ {unconfirmedCropCount} câu có ảnh tự cắt chưa đối chiếu</span>
                )}
              </div>
              <button
                onClick={handleSaveSelected}
                disabled={isSaving || selectedItems.length === 0}
                className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Lưu {selectedItems.length} câu đã chọn vào ngân hàng
              </button>
            </div>
          </div>
        </div>
      )}

      <QuestionEditorModal
        isOpen={!!editingReviewItem}
        onClose={() => setEditingReviewId(null)}
        question={(editingReviewItem?.question as any) ?? null}
        onSave={(updated: any) => {
          if (editingReviewId) updateReviewQuestion(editingReviewId, updated as QuestionData);
          setEditingReviewId(null);
        }}
      />
    </div>
  );
}

/** Khối đối chiếu ảnh tự cắt: ảnh đã cắt đặt cạnh ảnh trang gốc có khung đánh dấu. */
function CropReviewPanel({
  item, onConfirm, onReject, onManualCrop,
}: {
  item: ReviewItem;
  onConfirm: () => void;
  onReject: () => void;
  onManualCrop: () => void;
}) {
  const [showSource, setShowSource] = useState(false);

  return (
    <div className="mt-4 bg-blue-50/60 border border-blue-200 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <h4 className="text-xs font-black text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
          <Crop className="w-4 h-4" /> Đối chiếu ảnh AI đã cắt
        </h4>
        <button onClick={() => setShowSource((v) => !v)} className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1">
          {showSource ? <><EyeOff className="w-3.5 h-3.5" /> Ẩn ảnh trang gốc</> : <><ImageIcon className="w-3.5 h-3.5" /> Xem ảnh trang gốc (có khung đỏ vùng đã cắt)</>}
        </button>
      </div>

      <div className="flex gap-4 items-start flex-wrap">
        <div className="shrink-0">
          <div className="text-[11px] font-bold text-gray-500 mb-1">Ảnh sẽ chèn vào câu hỏi:</div>
          {item.question.image_url ? (
            <a href={item.question.image_url} target="_blank" rel="noreferrer">
              <img src={item.question.image_url} alt="Ảnh đã cắt" className="h-32 w-auto rounded border-2 border-blue-300 bg-white" />
            </a>
          ) : (
            <div className="h-32 w-40 flex items-center justify-center rounded border-2 border-dashed border-gray-300 text-xs text-gray-400 text-center px-2">
              Đã bỏ ảnh - câu hỏi chỉ còn chữ
            </div>
          )}
        </div>

        {showSource && (
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-gray-500 mb-1">Ảnh trang gốc - khung đỏ là vùng AI đã cắt:</div>
            <SourceImageWithBox file={item.sourceFile} box={item.cropBox} />
          </div>
        )}

        <div className="flex flex-col gap-1.5 shrink-0">
          <button onClick={onConfirm} className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-200 text-left">✅ Ảnh đúng - giữ nguyên</button>
          <button onClick={onManualCrop} className="text-xs font-bold bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-left">✂️ Cắt lại thủ công</button>
          <button onClick={onReject} className="text-xs font-bold bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 text-left">❌ Bỏ ảnh này</button>
        </div>
      </div>
    </div>
  );
}

/** Khối cho câu bị đánh dấu thiếu ảnh: hiện ảnh trang gốc để người duyệt tự cắt tay. */
function MissingImagePanel({ item, onManualCrop }: { item: ReviewItem; onManualCrop: () => void }) {
  const [showSource, setShowSource] = useState(false);

  return (
    <div className="mt-4 bg-orange-50/60 border border-orange-200 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-xs font-black text-orange-800 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" /> Câu này cần hình mà AI không xác định được vị trí
        </h4>
        <div className="flex items-center gap-2">
          {item.sourceFile && (
            <button onClick={() => setShowSource((v) => !v)} className="text-xs font-bold text-orange-700 hover:underline">
              {showSource ? 'Ẩn ảnh trang gốc' : 'Xem ảnh trang gốc'}
            </button>
          )}
          <button onClick={onManualCrop} className="text-xs font-bold bg-white border border-orange-300 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-50">
            ✂️ Cắt ảnh thủ công
          </button>
        </div>
      </div>
      {showSource && (
        <div className="mt-2">
          <SourceImageWithBox file={item.sourceFile} />
        </div>
      )}
    </div>
  );
}

function CategoryProposalCard({
  proposal, existingOptions, onApprove, onRemap,
}: {
  proposal: CategoryProposal;
  existingOptions: string[];
  onApprove: () => void;
  onRemap: (to: string) => void;
}) {
  const [remapTarget, setRemapTarget] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  return (
    <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded mr-2">{LEVEL_LABEL[proposal.level]} mới</span>
        <span className="font-bold text-gray-800">{proposal.value}</span>
        <span className="text-xs text-gray-500 ml-2">({proposal.waitingIds.length} câu đang chờ)</span>
      </div>
      <div className="flex items-center gap-2">
        <select value={remapTarget} onChange={(e) => setRemapTarget(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs bg-white">
          <option value="">-- Gộp vào mục có sẵn --</option>
          {existingOptions.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <button
          onClick={async () => { setIsBusy(true); await onRemap(remapTarget); setIsBusy(false); }}
          disabled={!remapTarget || isBusy}
          className="text-xs font-bold bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40"
        >
          Gộp
        </button>
        <button
          onClick={async () => { setIsBusy(true); await onApprove(); setIsBusy(false); }}
          disabled={isBusy}
          className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-1"
        >
          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Đồng ý thêm
        </button>
      </div>
    </div>
  );
}
