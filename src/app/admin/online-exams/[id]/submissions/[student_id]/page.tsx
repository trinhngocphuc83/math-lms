"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, User, CheckCircle2, Clock, ListChecks, Info } from "lucide-react";
import { MathRenderer } from "@/components/MathRenderer";
import { chamTuDong } from "@/utils/examGrading";
import { dungBarem, congBuocDaTick, type Barem } from "@/utils/baremCham";

/**
 * Chấm tay bài thi online.
 *
 * Hai chỗ bản cũ làm sai, sửa hẳn ở đây:
 *
 * 1. Bản cũ TỰ TÍNH LẠI toàn bộ điểm bằng một bản sao luật chấm riêng, đã lỗi thời so với
 *    chamTuDong mà đường nộp bài dùng: Đúng/Sai chia đều số ý đúng cho 4 thay vì theo barem
 *    bậc thang 2025, Trả lời ngắn chỉ so chữ thường nên "0,5" khác "0.5". Hậu quả: thầy cô
 *    chỉ nhập điểm MỘT câu tự luận là điểm trắc nghiệm của cả bài bị tính lại sai - câu
 *    Đúng/Sai đúng 3 ý nhảy từ 0,5 lên 0,75.
 *
 * 2. Bản cũ tính lại từ đầu chứ không CỘNG DỒN. Nay: điểm cuối = điểm máy chấm (chốt ngay
 *    lúc nộp) + tổng điểm tự luận thầy cô chấm. Phần trắc nghiệm không đụng tới nữa.
 *
 * Thêm CỬA SỔ BAREM cho từng câu: tự chia lời giải mẫu thành các bước kèm điểm, tick bước
 * nào học sinh làm được thì điểm tự cộng. Vẫn gõ tay đè lên được - barem chỉ là gợi ý.
 */
export default function GradeSubmissionPage() {
  const params = useParams<{ id: string, student_id: string }>();
  const router = useRouter();

  const [submission, setSubmission] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /** Điểm từng câu tự luận do thầy cô nhập. */
  const [manualScores, setManualScores] = useState<Record<number, number>>({});
  /** Nhận xét từng câu, để học sinh biết mình mất điểm ở đâu. */
  const [feedbacks, setFeedbacks] = useState<Record<number, string>>({});
  /** Các bước barem đang được tick, theo từng câu. */
  const [buocDaTick, setBuocDaTick] = useState<Record<number, number[]>>({});
  const [moBarem, setMoBarem] = useState<Record<number, boolean>>({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/exams/${params.id}/submissions/${params.student_id}`);
      const data = await res.json();
      if (res.ok && data.submission) {
        setSubmission(data.submission);
        setExam(data.exam);
        const a = data.submission.answers || {};
        if (a.gradedScores) setManualScores(a.gradedScores);
        if (a.gradedFeedback) setFeedbacks(a.gradedFeedback);
        if (a.gradedSteps) setBuocDaTick(a.gradedSteps);
      } else {
        alert("Không tìm thấy bài nộp.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const examData: any[] = exam?.exam_data || [];
  const diemMoiCau = 10 / (examData.length || 1);
  const cauTuLuan = examData
    .map((q: any, idx: number) => ({ q, idx }))
    .filter(({ q }) => (q.type || 'multiple_choice') === 'essay');

  /**
   * Điểm phần máy chấm được.
   *
   * Ưu tiên con số đã chốt lúc nộp (_diemMayCham). Bài nộp từ trước khi có trường đó thì
   * tính lại bằng ĐÚNG chamTuDong - vẫn là một luật, không phải bản sao.
   */
  const diemMayCham = (() => {
    if (!submission || !examData.length) return 0;
    const daChot = submission.answers?._diemMayCham;
    if (typeof daChot === 'number') return daChot;
    return Math.round(chamTuDong(examData, submission.answers || {}, diemMoiCau).diem * 100) / 100;
  })();

  const diemTuLuan = cauTuLuan.reduce((t, { idx }) => t + (Number(manualScores[idx]) || 0), 0);
  const diemCuoi = Math.max(0, Math.min(10, Math.round((diemMayCham + diemTuLuan) * 100) / 100));
  const soCauChuaCham = cauTuLuan.filter(({ idx }) => manualScores[idx] === undefined || manualScores[idx] === null).length;

  /** Barem dựng từ lời giải mẫu của câu - tính lại khi đổi câu, rẻ nên không cần nhớ. */
  const baremCua = (q: any): Barem =>
    dungBarem(q.answerText || q.answer || q.explanation || '', diemMoiCau);

  const tickBuoc = (idx: number, thu: number, barem: Barem) => {
    setBuocDaTick(prev => {
      const dang = prev[idx] || [];
      const moi = dang.includes(thu) ? dang.filter(x => x !== thu) : [...dang, thu].sort((a, b) => a - b);
      // Tick tới đâu điểm chạy tới đó, thầy cô khỏi cộng nhẩm.
      setManualScores(s => ({ ...s, [idx]: congBuocDaTick(barem, moi) }));
      return { ...prev, [idx]: moi };
    });
  };

  const handleSave = async () => {
    if (soCauChuaCham > 0 &&
        !confirm(`Còn ${soCauChuaCham} câu tự luận chưa chấm. Lưu tạm và chấm nốt sau?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/exams/${params.id}/submissions/${params.student_id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: diemCuoi,
          answers: {
            ...submission.answers,
            gradedScores: manualScores,
            gradedFeedback: feedbacks,
            gradedSteps: buocDaTick,
          },
          // Chấm đủ mọi câu tự luận thì bài mới coi là xong - điểm cộng chỉ tính từ lúc này.
          xongTuLuan: soCauChuaCham === 0,
        }),
      });
      if (res.ok) {
        alert(soCauChuaCham === 0
          ? `Đã chốt điểm ${diemCuoi} cho bài này.`
          : `Đã lưu tạm. Còn ${soCauChuaCham} câu chưa chấm nên bài vẫn nằm trong hàng chờ.`);
        router.push(`/admin/online-exams/${params.id}/monitor`);
      } else {
        alert("Lỗi khi lưu điểm.");
      }
    } catch {
      alert("Lỗi kết nối.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Đang tải dữ liệu bài làm...</div>;
  if (!submission) return <div className="p-10 text-center text-red-500">Bài làm không tồn tại.</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <Link href={`/admin/online-exams/${params.id}/monitor`} className="text-slate-500 hover:text-indigo-600 flex items-center gap-2 mb-2 font-medium">
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </Link>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            Chấm Bài Tự Luận
          </h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <User className="w-4 h-4" />
            {submission.profiles?.full_name || 'Học sinh'}
            {submission.profiles?.class_name ? ` · ${submission.profiles.class_name}` : ''}
            <span className="text-slate-300">|</span>
            {exam?.title}
          </p>
        </div>

        {/* Bảng cộng dồn: thầy cô nhìn là biết điểm ở đâu ra */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-slate-500 font-bold uppercase">Máy chấm</div>
            <div className="text-xl font-black text-slate-700">{diemMayCham.toFixed(2)}</div>
          </div>
          <div className="text-2xl text-slate-300 font-black">+</div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-bold uppercase">Tự luận</div>
            <div className="text-xl font-black text-emerald-600">{diemTuLuan.toFixed(2)}</div>
          </div>
          <div className="text-2xl text-slate-300 font-black">=</div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-bold uppercase">Điểm cuối</div>
            <div className="text-3xl font-black text-indigo-600">{diemCuoi.toFixed(2)}</div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-2 bg-indigo-600 text-white font-bold px-5 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {soCauChuaCham === 0 ? 'Chốt điểm' : 'Lưu tạm'}
          </button>
        </div>
      </div>

      {soCauChuaCham > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-900 font-medium flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          Còn <b>{soCauChuaCham}</b> câu tự luận chưa chấm. Bài chỉ rời hàng chờ và được tính điểm cộng khi đã chấm đủ.
        </div>
      )}

      <div className="space-y-8">
        {examData.map((q: any, idx: number) => {
          const stuAns = submission.answers?.[idx];
          const isEssay = (q.type || 'multiple_choice') === 'essay';
          const barem = isEssay ? baremCua(q) : null;
          const daTick = buocDaTick[idx] || [];

          return (
            <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-lg">
                  Câu {idx + 1}
                  <span className="text-sm font-medium text-slate-500 ml-2">
                    ({isEssay ? 'Tự luận' : 'Máy đã chấm'}) · tối đa {diemMoiCau.toFixed(2)}đ
                  </span>
                </h3>
                {isEssay && barem && barem.buoc.length > 0 && (
                  <button
                    onClick={() => setMoBarem(p => ({ ...p, [idx]: !p[idx] }))}
                    className="text-xs font-bold bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-1.5"
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    {moBarem[idx] ? 'Ẩn barem' : 'Barem chấm'}
                  </button>
                )}
              </div>

              <div className="p-6">
                <div className="prose max-w-none text-slate-800 mb-6 font-medium">
                  <MathRenderer htmlContent={q.question} />
                </div>

                <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100 mb-6">
                  <div className="text-sm font-bold text-indigo-600 uppercase mb-2">Bài làm của học sinh</div>
                  {isEssay ? (
                    <div className="prose max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: stuAns || '<i>Không có bài làm</i>' }} />
                  ) : (
                    <div className="text-slate-700 font-bold">
                      {q.type === 'multiple_choice' && stuAns !== undefined && stuAns !== null
                        ? <MathRenderer htmlContent={q.options?.[stuAns]} />
                        : JSON.stringify(stuAns)}
                    </div>
                  )}
                </div>

                {isEssay && (
                  <>
                    {/* CỬA SỔ BAREM: tick bước nào học sinh làm được, điểm tự cộng */}
                    {moBarem[idx] && barem && (
                      <div className="mb-6 bg-sky-50 border border-sky-200 rounded-xl p-5">
                        <h4 className="font-black text-sky-800 mb-3 flex items-center gap-2">
                          <ListChecks className="w-4 h-4" /> Barem câu {idx + 1}
                          <span className="text-xs font-medium text-sky-600">
                            (tick bước học sinh làm được — điểm tự cộng, vẫn gõ tay đè lên được)
                          </span>
                        </h4>
                        {barem.buoc.length === 0 ? (
                          <p className="text-sm text-sky-900">
                            Câu này chưa có lời giải mẫu nên chưa dựng được barem. Thầy cô nhập điểm trực tiếp.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {barem.buoc.map(b => (
                              <label key={b.thu} className="flex items-start gap-3 bg-white rounded-lg px-3 py-2 border border-sky-100 cursor-pointer hover:border-sky-300">
                                <input
                                  type="checkbox"
                                  checked={daTick.includes(b.thu)}
                                  onChange={() => tickBuoc(idx, b.thu, barem)}
                                  className="mt-1 w-4 h-4 accent-sky-600"
                                />
                                <span className="flex-1 text-sm text-slate-700">
                                  <b className="text-sky-700">Bước {b.thu}.</b>{' '}
                                  <MathRenderer htmlContent={b.noiDung} />
                                </span>
                                <span className="text-sm font-black text-sky-700 shrink-0">{b.diem.toFixed(2)}đ</span>
                              </label>
                            ))}
                          </div>
                        )}
                        {/* Lời giải mẫu chỉ có một dòng thì barem chỉ được một bước: tick là
                            trọn điểm, không có nấc giữa. Nói thẳng ra để Thầy cô biết mà gõ
                            tay khi muốn cho điểm từng phần. */}
                        {barem.buoc.length > 0 && barem.buoc.length <= 2 && (
                          <p className="mt-3 text-sm text-slate-600 bg-white border border-sky-100 rounded-lg px-3 py-2">
                            Lời giải mẫu của câu này ngắn nên barem chỉ có {barem.buoc.length} bước
                            {barem.buoc.length === 1 ? ' — tick là trọn điểm' : ''}. Muốn cho điểm
                            từng phần thì gõ thẳng vào ô điểm.
                          </p>
                        )}

                        {/* Phương pháp giải KHÔNG phải một bước có điểm - học sinh không viết
                            câu ấy ra bài. Để riêng, mở ra xem khi cần. */}
                        {barem.phuongPhap && (
                          <details className="mt-3 text-sm">
                            <summary className="cursor-pointer font-bold text-sky-700 hover:text-sky-900">
                              Xem phương pháp giải (không tính điểm)
                            </summary>
                            <div className="mt-2 text-slate-700 bg-white border border-sky-100 rounded-lg px-3 py-2">
                              <MathRenderer htmlContent={barem.phuongPhap} />
                            </div>
                          </details>
                        )}

                        {barem.luuY && (
                          <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            {barem.luuY}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 bg-slate-50 rounded-xl p-5 border border-slate-200">
                        <label className="font-bold text-slate-700 text-sm block mb-2">
                          Nhận xét cho câu này (học sinh sẽ đọc được)
                        </label>
                        <textarea
                          value={feedbacks[idx] || ''}
                          onChange={(e) => setFeedbacks(p => ({ ...p, [idx]: e.target.value }))}
                          rows={3}
                          placeholder="Ví dụ: Đúng hướng nhưng thiếu điều kiện xác định, trừ 0,25đ."
                          className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200 flex flex-col justify-center items-center">
                        <label className="font-bold text-emerald-800 mb-2 text-sm text-center">ĐIỂM CÂU NÀY</label>
                        <input
                          type="number"
                          step="0.25"
                          min={0}
                          max={diemMoiCau}
                          value={manualScores[idx] !== undefined ? manualScores[idx] : ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '') { setManualScores(p => { const n = { ...p }; delete n[idx]; return n; }); return; }
                            // Kẹp trong [0, điểm tối đa của câu] - gõ nhầm 10 vào câu 1,0đ là vỡ tổng.
                            const so = Math.max(0, Math.min(diemMoiCau, parseFloat(v) || 0));
                            setManualScores(p => ({ ...p, [idx]: Math.round(so * 100) / 100 }));
                          }}
                          placeholder={`Tối đa ${diemMoiCau.toFixed(2)}`}
                          className="w-32 text-center text-2xl font-black text-emerald-700 px-4 py-2 border-2 border-emerald-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-100"
                        />
                        {manualScores[idx] !== undefined && (
                          <span className="mt-2 text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã chấm
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
