import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Edit3, Clock, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import { studentMarkdownComponents } from '@/components/CustomMarkdownComponents';
import 'katex/dist/katex.min.css';

/**
 * Chấm tay một lượt luyện tập (bảng exam_results).
 *
 * Bản cũ là "Trạm chấm đa năng" có Phòng mổ AI: gửi ảnh + lệnh lên Gemini chấm nháp, kèm
 * đường lui sao chép prompt sang gemini.google.com. Thầy bỏ hẳn (20/9/2026): tự luận do
 * thầy cô chấm, không tiêu khoá API. Nay màn này chỉ còn: đọc đề, lời giải mẫu, bài làm
 * của em (chữ gõ + ảnh chụp), gõ điểm và lời phê từng câu, rồi LƯU CHỐT ĐIỂM.
 *
 * Lưu xong máy chủ gỡ cờ `_choChamTuLuan` nên lượt này rời hàng chờ và được tính điểm
 * thưởng tháng (goiTenVaDiem.quetDiemTuDong bỏ qua lượt còn cờ).
 */
interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultData: any;
  onUpdateSuccess: () => void;
}

const MD = ({ children }: { children: string }) => (
  <ReactMarkdown components={studentMarkdownComponents} remarkPlugins={[remarkMath, remarkBreaks, remarkGfm]} rehypePlugins={[rehypeKatex]} urlTransform={(url) => url}>
    {children}
  </ReactMarkdown>
);

export default function ReviewModal({ isOpen, onClose, resultData, onUpdateSuccess }: ReviewModalProps) {
  const [answers, setAnswers] = useState<any>(null);
  const [editedScore, setEditedScore] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && resultData) {
      setAnswers(resultData.answers || { globalImages: [], gradingDetails: [] });
      setEditedScore(resultData.score || 0);
    }
  }, [isOpen, resultData]);

  if (!isOpen || !resultData) return null;

  const gradingDetails: any[] = answers?.gradingDetails || [];
  const globalImages: string[] = answers?.globalImages || [];
  const soChoCham = Number(answers?._choChamTuLuan || 0);
  const cauTuLuan = gradingDetails.filter((d) => d.type === 'essay');

  const handleSave = async () => {
    if (!confirm('Lưu điểm và lời phê này? Lượt làm sẽ rời hàng chờ chấm và được tính vào điểm thưởng tháng.')) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/update-exam-result', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resultData.id, score: editedScore, answers }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdateSuccess();
        onClose();
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (e: any) {
      alert('Lỗi kết nối: ' + e.message);
    }
    setIsSaving(false);
  };

  const handleDetailChange = (index: number, field: string, value: any) => {
    const newDetails = [...gradingDetails];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setAnswers({ ...answers, gradingDetails: newDetails });
  };

  /* Tổng điểm = cộng điểm từng câu trong bảng chi tiết (trắc nghiệm máy đã điền sẵn,
     tự luận thầy cô vừa gõ). */
  const congTuDong = () => {
    let total = 0;
    gradingDetails.forEach((d: any) => { total += Number(d.score || 0); });
    setEditedScore(Math.round(total * 100) / 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-6xl max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-indigo-50">
          <div>
            <h2 className="text-xl font-bold text-indigo-900">Chấm bài luyện tập</h2>
            <p className="text-sm text-indigo-700">Học sinh: <span className="font-bold">{resultData.profiles?.full_name}</span> · Bài: <span className="font-bold">{resultData.lessons?.title}</span></p>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-zinc-500 hover:text-red-500 hover:bg-red-50 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-indigo-600 font-semibold mb-1">ĐIỂM TỔNG KẾT</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number" step="0.01" value={editedScore}
                    onChange={(e) => setEditedScore(Number(e.target.value))}
                    className="w-24 px-3 py-2 text-2xl font-black text-indigo-700 border-2 border-indigo-200 rounded-lg focus:border-indigo-500 focus:ring-0 text-center"
                  />
                  <span className="text-xl font-bold text-indigo-300">/ 10</span>
                </div>
              </div>
              {soChoCham > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-sm font-bold border border-amber-200">
                  <Clock className="w-4 h-4" /> {cauTuLuan.length || soChoCham} câu tự luận chờ chấm
                </span>
              ) : resultData.is_reviewed ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-bold border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" /> Đã chốt
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button onClick={congTuDong} className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-xl font-semibold transition-colors text-sm">
                Cộng từ bảng chi tiết
              </button>
              <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                LƯU CHỐT ĐIỂM
              </button>
            </div>
          </div>

          {globalImages.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-zinc-700 mb-2">Ảnh bài làm em nộp chung cho cả bài:</p>
              <div className="flex gap-3 flex-wrap">
                {globalImages.map((img, i) => (
                  <img key={i} src={img} className="w-28 h-28 object-cover rounded-lg border border-zinc-200 shadow-sm cursor-pointer hover:scale-105 transition-transform" onClick={() => setZoomedImage(img)} title="Phóng to" />
                ))}
              </div>
            </div>
          )}

          <h3 className="font-bold text-lg mb-4 text-zinc-800 border-b pb-2 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-indigo-500" /> Chấm từng câu
          </h3>

          {gradingDetails.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 bg-zinc-50 rounded-xl">Lượt làm này không có bảng chi tiết từng câu (bài nộp từ bản cũ). Sửa điểm tổng ở trên rồi lưu.</div>
          ) : (
            <div className="flex flex-col gap-6">
              {gradingDetails.map((detail: any, i: number) => {
                const laTuLuan = detail.type === 'essay';
                return (
                  <div key={i} className={`border rounded-xl overflow-hidden shadow-sm ${laTuLuan ? 'border-amber-300' : 'border-zinc-200'}`}>
                    <div className={`p-4 border-b flex justify-between items-center ${laTuLuan ? 'bg-amber-50' : 'bg-zinc-50'}`}>
                      <h4 className="font-bold text-zinc-800 text-lg flex items-center gap-2">
                        Câu {detail.qIndex + 1}
                        {laTuLuan && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">Tự luận</span>}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-500">Điểm:</span>
                        <input
                          type="number" step="0.25" min={0} max={detail.maxScore}
                          value={detail.score ?? 0}
                          onChange={(e) => handleDetailChange(i, 'score', Number(e.target.value))}
                          className="w-20 p-1 text-center font-bold text-indigo-700 border rounded focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-zinc-500">/ {detail.maxScore}</span>
                      </div>
                    </div>

                    <div className="p-4 flex flex-col gap-3">
                      {detail.question && (
                        <div className="text-sm text-zinc-700 bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                          <strong className="text-amber-800">Đề bài:</strong>
                          <div className="prose prose-sm max-w-none mt-1"><MD>{String(detail.question)}</MD></div>
                          {detail.type === 'multiple_choice' && Array.isArray(detail.options) && (
                            <ul className="mt-2 list-none space-y-1">
                              {detail.options.map((opt: string, k: number) => (
                                <li key={k} className="pl-4 border-l-2 border-amber-200"><MD>{String(opt)}</MD></li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {!laTuLuan && detail.studentAnswer !== undefined && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                            <strong className="text-blue-800 block mb-1">Học sinh chọn/trả lời:</strong>
                            <div className="text-sm font-semibold text-zinc-800 break-words whitespace-pre-wrap">
                              {detail.type === 'true_false_cluster'
                                ? <ul className="list-disc list-inside">{Object.entries(detail.studentAnswer || {}).map(([idx, val]) => <li key={idx}>Ý {Number(idx) + 1}: {val ? 'Đúng' : 'Sai'}</li>)}</ul>
                                : String(detail.studentAnswer)}
                            </div>
                          </div>
                          <div className="bg-green-50/50 p-3 rounded-lg border border-green-100">
                            <strong className="text-green-800 block mb-1">Đáp án đúng:</strong>
                            <div className="text-sm font-semibold text-zinc-800 break-words whitespace-pre-wrap">
                              {detail.type === 'true_false_cluster'
                                ? <ul className="list-disc list-inside">{Array.isArray(detail.correctAnswer) && detail.correctAnswer.map((item: any, idx: number) => <li key={idx}>Ý {idx + 1}: {item.isTrue ? 'Đúng' : 'Sai'}</li>)}</ul>
                                : String(detail.correctAnswer || '')}
                            </div>
                          </div>
                        </div>
                      )}

                      {laTuLuan && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                            <strong className="text-blue-800 block mb-1">Bài làm của em (chữ gõ):</strong>
                            {detail.studentAnswer
                              ? <div className="prose prose-sm max-w-none text-zinc-800"><MD>{String(detail.studentAnswer)}</MD></div>
                              : <p className="text-sm italic text-zinc-500">Em không gõ chữ — xem ảnh bài làm bên dưới.</p>}
                          </div>
                          <div className="bg-green-50/50 p-3 rounded-lg border border-green-100">
                            <strong className="text-green-800 block mb-1">Lời giải mẫu để đối chiếu:</strong>
                            {detail.sampleAnswer
                              ? <div className="prose prose-sm max-w-none text-zinc-800"><MD>{String(detail.sampleAnswer)}</MD></div>
                              : <p className="text-sm italic text-zinc-500">Câu này chưa có lời giải mẫu trong bài.</p>}
                          </div>
                        </div>
                      )}

                      {detail.images && detail.images.length > 0 && (
                        <div>
                          <label className="block text-sm font-semibold text-zinc-700 mb-2">Ảnh bài làm của em:</label>
                          <div className="flex gap-3 flex-wrap">
                            {detail.images.map((img: string, k: number) => (
                              <img key={k} src={img} className="w-28 h-28 object-cover rounded-lg border border-zinc-200 shadow-sm cursor-pointer hover:scale-105 transition-transform" onClick={() => setZoomedImage(img)} title="Phóng to" />
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-semibold text-zinc-700 mb-1">Lời phê của thầy cô:</label>
                        <textarea
                          rows={3}
                          value={detail.feedback || ''}
                          placeholder={laTuLuan ? 'Ví dụ: Đúng hướng, thiếu điều kiện xác định — trừ 0,5.' : ''}
                          onChange={(e) => handleDetailChange(i, 'feedback', e.target.value)}
                          className="w-full p-3 text-sm text-zinc-700 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {zoomedImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setZoomedImage(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition">
            <X className="w-8 h-8" />
          </button>
          <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
