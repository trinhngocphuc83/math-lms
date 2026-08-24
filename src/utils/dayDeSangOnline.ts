// Đẩy bộ đề vừa ra sang Kỳ thi Online, thay vì phải dán lại từng câu.
//
// Hai kho dữ liệu này có hình dạng khác nhau nên phải chuyển tay từng trường:
//
//   Ngân hàng câu hỏi        Kỳ thi Online (cột exam_data)
//   -----------------------  ---------------------------------------------
//   question_type NLC        type 'multiple_choice', đáp án là answerIndex 0-3
//   question_type DS         type 'true_false',      đáp án là answers[4] true/false
//   question_type TLN        type 'short_answer',    đáp án là correct_answers[0]
//   question_type TL         type 'essay',           đáp án là correct_answers[0]
//
// Chú ý: KHÔNG dùng bankTypeToBlockType() cho câu Đúng/Sai. Hàm đó trả về
// 'true_false_cluster' - đúng cho khối Luyện tập, nhưng trang Kỳ thi Online chỉ hiểu
// 'true_false'. Đẩy sai mã thì câu hiện ra trống trơn mà không báo lỗi gì.

import { toBankType } from "./questionTypes";
import { chiaPhanDeThi } from "./deThi";
import type { DauDe } from "./deThi";

const CHU_CAI = ["A", "B", "C", "D"];
const KHOA_O = ["option_a", "option_b", "option_c", "option_d"] as const;

const laDung = (ch: string): boolean => ch === "D" || ch === "T" || ch.toUpperCase() === "Đ";

/**
 * Đưa nội dung của kho về HTML mà trang Kỳ thi Online dựng được.
 *
 * Kho ghi ảnh kiểu Markdown `![Hình ảnh](địa chỉ)`, còn MathRenderer bên Kỳ thi Online
 * chỉ tách công thức `$...$` rồi đổ phần còn lại vào innerHTML - gặp cú pháp Markdown
 * là in nguyên chuỗi `![Hình ảnh](https://...)` ra màn hình cho học sinh đọc.
 */
export function sangHtml(raw: string | null | undefined): string {
  return String(raw || "")
    .replace(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g,
      '<img src="$1" style="max-width:100%;height:auto" alt="" />')
    .replace(/\n/g, "<br />");
}

/** Đổi một câu của ngân hàng thành một câu của Kỳ thi Online. */
export function sangCauOnline(q: any): any {
  const loai = toBankType(q?.question_type) || "NLC";
  const noiDung = sangHtml(q?.content);
  const oTho = KHOA_O.map(k => String(q?.[k] ?? "").trim());
  const o = oTho.filter(Boolean).map(sangHtml);

  if (loai === "NLC") {
    const dung = String(q?.correct_answer ?? "").trim().toUpperCase();
    return {
      type: "multiple_choice",
      question: noiDung,
      options: o,
      // Không đoán bừa khi thiếu đáp án: để -1 thì trang bên kia hiện "chưa có đáp án
      // đúng", còn để 0 là ngầm chấm phương án A là đúng cho cả lớp.
      answerIndex: CHU_CAI.indexOf(dung),
      explanation: sangHtml(q?.explanation),
    };
  }

  if (loai === "DS") {
    const chuoi = String(q?.correct_answer ?? "");
    return {
      type: "true_false",
      question: noiDung,
      options: oTho.map(sangHtml),
      answers: [0, 1, 2, 3].map(i => laDung(chuoi.charAt(i))),
      explanation: sangHtml(q?.explanation),
    };
  }

  return {
    type: loai === "TLN" ? "short_answer" : "essay",
    question: noiDung,
    options: [],
    correct_answers: [String(q?.correct_answer ?? "").trim()],
    answerText: String(q?.correct_answer ?? "").trim(),
    explanation: sangHtml(q?.explanation),
  };
}

/**
 * Tìm các câu thiếu đáp án hoặc đáp án không đọc được.
 *
 * Phải chặn trước khi đẩy: bên Kỳ thi Online, câu Đúng/Sai thiếu đáp án sẽ thành
 * bốn ý đều Sai, còn câu trắc nghiệm thành không có phương án nào đúng - máy vẫn
 * chấm bình thường và cả lớp mất điểm câu đó mà không ai biết vì sao.
 */
export function timCauThieuDapAn(cauHoi: any[]): { viTri: number; loai: string; trichDe: string }[] {
  const theoPhan = chiaPhanDeThi(cauHoi).flatMap(p => p.cauHoi);
  const ra: { viTri: number; loai: string; trichDe: string }[] = [];

  theoPhan.forEach((q, i) => {
    const loai = toBankType(q?.question_type) || "NLC";
    const dap = String(q?.correct_answer ?? "").trim();
    let hong = false;
    if (loai === "NLC") hong = CHU_CAI.indexOf(dap.toUpperCase()) < 0;
    else if (loai === "DS") hong = !/^[ĐDTSF]{4}$/i.test(dap);
    else if (loai === "TLN") hong = !dap;
    // Tự luận KHÔNG tính là thiếu: bài tự luận thầy cô chấm tay, lời giải nằm ở cột
    // riêng chứ không có đáp án cho máy so. Đo trên kho thật: 3316 câu tự luận không
    // có correct_answer - bắt hết thì cảnh báo dài vô ích rồi người dùng bấm bừa cho qua.
    else hong = false;
    if (hong) {
      ra.push({
        viTri: i + 1,
        loai,
        trichDe: String(q?.content ?? "").replace(/\s+/g, " ").slice(0, 60),
      });
    }
  });
  return ra;
}

export interface GoiDeOnline {
  title: string;
  exam_group_name: string;
  variant_name: string;
  description: string;
  exam_data: any[];
  duration_minutes: number;
  status: string;
  assigned_classes: any[];
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_results: boolean;
  max_cheat_warnings: number;
}

/** Lấy số phút từ chuỗi kiểu "90 phút". Không đọc được thì để 90. */
export function soPhut(thoiGian: string | undefined): number {
  const n = parseInt(String(thoiGian || "").replace(/\D+/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 90;
}

/**
 * Dựng gói dữ liệu để tạo một Kỳ thi Online từ bộ đề đang xem.
 *
 * Tạo ở trạng thái BẢN NHÁP chứ không phát hành ngay: kỳ thi còn thiếu lớp được giao,
 * giờ mở và giờ đóng - phát hành luôn là học sinh thấy đề trước khi thầy cô kịp đặt giờ.
 * Cũng KHÔNG bật trộn câu ở đây, vì thứ tự Phần I/II/III của đề chuẩn 2025 phải giữ.
 */
export function dungGoiDeOnline(cauHoi: any[], dauDe: DauDe, maDe?: string): GoiDeOnline {
  const theoPhan = chiaPhanDeThi(cauHoi).flatMap(p => p.cauHoi);
  const ten = [dauDe.tenKyThi, dauDe.monLop].filter(Boolean).join(" - ") || "Kỳ thi";

  return {
    title: maDe ? `${ten} (Mã ${maDe})` : ten,
    exam_group_name: ten,
    variant_name: maDe ? `Mã ${maDe}` : "Đề gốc",
    description: JSON.stringify({ namHoc: dauDe.namHoc, thoiGian: dauDe.thoiGian, maDe: maDe || dauDe.maDe }),
    exam_data: theoPhan.map(sangCauOnline),
    duration_minutes: soPhut(dauDe.thoiGian),
    status: "DRAFT",
    assigned_classes: [],
    shuffle_questions: false,
    shuffle_options: false,
    show_results: true,
    max_cheat_warnings: 3,
  };
}
