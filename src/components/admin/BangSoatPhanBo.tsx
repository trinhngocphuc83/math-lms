'use client';

import React from 'react';
import { X, AlertTriangle, CheckCircle2, Tag } from 'lucide-react';

/**
 * Bảng soát lại sau khi AI xếp chỗ cho cả lô câu hỏi.
 *
 * Vì sao cần: máy xếp một lượt vài chục câu vào Chương/Bài/Dạng khác nhau, mà giao diện
 * cũ chỉ báo đúng một dòng "AI đã xếp 22 câu". Thầy cô muốn biết TỪNG câu về đâu thì phải
 * cuộn hết danh sách rồi mở từng dropdown ra đối chiếu - không ai soát nổi kiểu đó, nên
 * rốt cuộc là đẩy vào kho mà chưa kiểm.
 *
 * Bảng này gom tất cả vào một chỗ, nhóm theo Chương để nhìn ra ngay câu bị xếp lạc, và
 * tô màu ba trạng thái: dạng có sẵn (xanh), dạng mới chờ duyệt (cam), không xếp được (đỏ).
 */

export interface DongSoat {
  id: string;
  subject?: string;
  topic?: string;
  lesson?: string;
  math_form?: string;
  difficulty?: string;
  dangMoi?: boolean;
  lyDo?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Danh sách câu hỏi đang soạn, để đánh đúng số "Câu N" như ngoài danh sách. */
  questions: any[];
  xepDuoc: DongSoat[];
  khongXep: { id: string; lyDo: string }[];
  /** Lô nào hỏng, câu trả lời bị cắt ngang... - nói thẳng thay vì giấu. */
  canhBao: string[];
  /** Nhấn vào một dòng thì đóng bảng và nhảy tới đúng câu đó trong danh sách. */
  onXemCau?: (id: string) => void;
}

const oNho: React.CSSProperties = {
  padding: '6px 8px', fontSize: 12, verticalAlign: 'top', borderBottom: '1px solid #f1f5f9',
};

export default function BangSoatPhanBo({
  isOpen, onClose, questions, xepDuoc, khongXep, canhBao, onXemCau,
}: Props) {
  if (!isOpen) return null;

  const soThuTu = (id: string) => questions.findIndex(q => q.id === id) + 1;
  const trichNoiDung = (id: string) => {
    const q = questions.find(x => x.id === id);
    return String(q?.content || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '[hình]').replace(/\s+/g, ' ').slice(0, 90);
  };

  // Gom theo Chương để nhìn ra ngay câu bị xếp lạc sang chương khác
  const theoChuong = new Map<string, DongSoat[]>();
  for (const d of xepDuoc) {
    const khoa = `${d.subject || '(chưa rõ phân môn)'} › ${d.topic || '(chưa rõ chương)'}`;
    if (!theoChuong.has(khoa)) theoChuong.set(khoa, []);
    theoChuong.get(khoa)!.push(d);
  }
  const soDangMoi = xepDuoc.filter(d => d.dangMoi).length;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, width: 'min(1000px, 100%)', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
      >
        {/* Đầu bảng */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15.5, color: '#0f172a' }}>
              Soát lại: AI đã xếp câu hỏi về đâu?
            </div>
            <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
              Kiểm tra trước khi đẩy vào Ngân hàng. Thấy câu nào lạc chỗ thì nhấn vào dòng đó để sửa.
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', lineHeight: 0 }}>
            <X style={{ width: 18, height: 18, color: '#475569' }} />
          </button>
        </div>

        {/* Tóm tắt */}
        <div style={{ padding: '10px 18px', display: 'flex', flexWrap: 'wrap', gap: 8, borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
            {xepDuoc.length} câu đã xếp · {theoChuong.size} nhánh
          </span>
          {soDangMoi > 0 && (
            <span style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
              {soDangMoi} Dạng mới chờ Thầy cô duyệt
            </span>
          )}
          {khongXep.length > 0 && (
            <span style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
              {khongXep.length} câu chưa xếp được
            </span>
          )}
        </div>

        {/* Thân bảng */}
        <div style={{ overflowY: 'auto', padding: '4px 18px 14px' }}>
          {canhBao.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', margin: '10px 0', fontSize: 12, color: '#92400e' }}>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <AlertTriangle style={{ width: 14, height: 14 }} /> Có lô chạy không trọn vẹn
              </div>
              {canhBao.map((c, i) => <div key={i}>• {c}</div>)}
              <div style={{ marginTop: 4 }}>
                Các câu thiếu vẫn nằm trong danh sách, Thầy cô bấm lại nút AI để chạy tiếp phần còn lại.
              </div>
            </div>
          )}

          {Array.from(theoChuong.entries()).map(([nhanh, ds]) => (
            <div key={nhanh} style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#334155', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag style={{ width: 13, height: 13, color: '#a21caf' }} />
                {nhanh}
                <span style={{ fontWeight: 500, color: '#94a3b8' }}>· {ds.length} câu</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 52 }} /><col /><col style={{ width: 200 }} />
                  <col style={{ width: 180 }} /><col style={{ width: 96 }} />
                </colgroup>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: 11, textAlign: 'left' }}>
                    <th style={{ ...oNho, fontWeight: 700 }}>Câu</th>
                    <th style={{ ...oNho, fontWeight: 700 }}>Nội dung</th>
                    <th style={{ ...oNho, fontWeight: 700 }}>Bài</th>
                    <th style={{ ...oNho, fontWeight: 700 }}>Dạng</th>
                    <th style={{ ...oNho, fontWeight: 700 }}>Mức độ</th>
                  </tr>
                </thead>
                <tbody>
                  {ds.map(d => (
                    <tr
                      key={d.id}
                      onClick={() => onXemCau?.(d.id)}
                      style={{ cursor: onXemCau ? 'pointer' : 'default', background: d.dangMoi ? '#fffbf5' : '#fff' }}
                    >
                      <td style={{ ...oNho, fontWeight: 700, color: '#334155' }}>{soThuTu(d.id)}</td>
                      <td style={{ ...oNho, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {trichNoiDung(d.id)}
                        {d.lyDo && <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>↳ {d.lyDo}</div>}
                      </td>
                      <td style={{ ...oNho, color: '#475569' }}>{d.lesson}</td>
                      <td style={{ ...oNho, color: d.dangMoi ? '#9a3412' : '#166534', fontWeight: 600 }}>
                        {d.math_form}
                        {d.dangMoi && <div style={{ fontSize: 10.5, fontWeight: 700 }}>DẠNG MỚI — chờ duyệt</div>}
                      </td>
                      <td style={{ ...oNho, color: '#475569' }}>{d.difficulty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {khongXep.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#b91c1c', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle style={{ width: 13, height: 13 }} />
                Chưa xếp được — Thầy cô chọn tay giúp
              </div>
              {khongXep.map(k => (
                <div
                  key={k.id}
                  onClick={() => onXemCau?.(k.id)}
                  style={{ cursor: onXemCau ? 'pointer' : 'default', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px', marginBottom: 4, fontSize: 12, color: '#7f1d1d' }}
                >
                  <b>Câu {soThuTu(k.id)}</b>: {trichNoiDung(k.id)}
                  <div style={{ fontSize: 11, marginTop: 2 }}>↳ {k.lyDo}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chân bảng */}
        <div style={{ padding: '10px 18px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 style={{ width: 14, height: 14, color: '#16a34a' }} />
            Mọi câu vẫn sửa được bằng tay ở danh sách phía sau.
          </div>
          <button
            type="button" onClick={onClose}
            style={{ padding: '8px 22px', background: '#a21caf', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, color: '#fff', cursor: 'pointer' }}
          >
            Đã xem, đóng lại
          </button>
        </div>
      </div>
    </div>
  );
}
