// Sinh nhiều mã đề từ một bộ câu đã chọn, để hai em ngồi cạnh nhau không làm cùng một đề.
//
// Hai việc phải làm cùng lúc và không được sai lệch nhau:
//   1. Đảo THỨ TỰ CÂU trong từng phần (không đảo giữa các phần, vì đề chuẩn 2025 bắt
//      buộc Phần I trắc nghiệm rồi mới tới Đúng/Sai, Trả lời ngắn, Tự luận).
//   2. Đảo PHƯƠNG ÁN trong từng câu, và dời đáp án đúng theo.
//
// Việc thứ hai là chỗ dễ hỏng nhất: đảo phương án mà quên dời đáp án thì cả tập bài
// chấm sai hết mà không ai phát hiện cho tới lúc trả bài.

import { toBankType } from "./questionTypes";
import { chiaPhanDeThi } from "./deThi";

export interface MaDe {
  /** Mã in trên đầu đề, ví dụ "101". */
  ma: string;
  cauHoi: any[];
}

/** Trộn Fisher-Yates. Không dùng sort(() => 0.5 - Math.random()): kiểu đó lệch, có vị trí gần như đứng yên. */
function tron<T>(ds: T[]): T[] {
  const a = [...ds];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CHU_CAI = ["A", "B", "C", "D"] as const;
const KHOA_O = ["option_a", "option_b", "option_c", "option_d"] as const;

/** Một ký tự đáp án Đúng/Sai có nghĩa là ĐÚNG hay không. */
const laDung = (ch: string): boolean => ch === "D" || ch === "T" || ch.toUpperCase() === "Đ";

/**
 * Đảo bốn phương án của một câu trắc nghiệm nhiều lựa chọn và dời đáp án đúng theo.
 *
 * Câu thiếu phương án (chỉ có A, B, C) thì để nguyên: đảo một tập không đủ bốn dễ đẩy
 * ô rỗng lên trước, in ra thành phương án trống.
 */
function daoPhuongAnNLC(q: any): any {
  const oCu = KHOA_O.map(k => String(q[k] ?? "").trim());
  if (oCu.some(v => !v)) return q;

  const dungCu = String(q.correct_answer ?? "").trim().toUpperCase();
  const viTriDung = CHU_CAI.indexOf(dungCu as any);
  if (viTriDung < 0) return q;   // không biết đáp án cũ thì đừng đụng vào

  const thuTu = tron([0, 1, 2, 3]);
  const moi: any = { ...q };
  thuTu.forEach((cu, i) => { moi[KHOA_O[i]] = oCu[cu]; });
  moi.correct_answer = CHU_CAI[thuTu.indexOf(viTriDung)];
  return moi;
}

/**
 * Đảo bốn ý của câu Đúng/Sai, dời luôn chuỗi đáp án bốn ký tự theo đúng thứ tự mới.
 */
function daoYDungSai(q: any): any {
  const yCu = KHOA_O.map(k => String(q[k] ?? "").trim());
  if (yCu.some(v => !v)) return q;

  const chuoi = String(q.correct_answer ?? "");
  if (chuoi.length < 4) return q;
  const dapCu = [0, 1, 2, 3].map(i => laDung(chuoi.charAt(i)));

  const thuTu = tron([0, 1, 2, 3]);
  const moi: any = { ...q };
  thuTu.forEach((cu, i) => { moi[KHOA_O[i]] = yCu[cu]; });
  moi.correct_answer = thuTu.map(cu => (dapCu[cu] ? "Đ" : "S")).join("");
  return moi;
}

/** Đảo phương án theo đúng loại câu. Trả lời ngắn và tự luận không có gì để đảo. */
export function daoPhuongAn(q: any): any {
  const loai = toBankType(q?.question_type);
  if (loai === "NLC") return daoPhuongAnNLC(q);
  if (loai === "DS") return daoYDungSai(q);
  return q;
}

/**
 * Sinh danh sách mã đề.
 *
 * Mã đầu tiên GIỮ NGUYÊN thứ tự và phương án gốc, để thầy cô đối chiếu được với bản
 * vừa xem trên màn hình; các mã sau mới trộn. Trộn trong từng phần chứ không trộn
 * xuyên phần, nếu không đề sẽ lẫn tự luận vào giữa trắc nghiệm.
 *
 * @param maBatDau Mã của đề đầu, thường là "101". Các mã sau cộng dần: 102, 103...
 */
export function taoCacMaDe(cauHoi: any[], soMa: number, maBatDau = "101"): MaDe[] {
  const soMaHopLe = Math.max(1, Math.min(Math.floor(soMa) || 1, 8));
  const goc = parseInt(maBatDau, 10);
  const maCua = (i: number) => (Number.isFinite(goc) ? String(goc + i) : `${maBatDau}-${i + 1}`);

  const ra: MaDe[] = [];
  for (let i = 0; i < soMaHopLe; i++) {
    if (i === 0) { ra.push({ ma: maCua(0), cauHoi }); continue; }
    const daoThuTu = chiaPhanDeThi(cauHoi).flatMap(p => tron(p.cauHoi));
    ra.push({ ma: maCua(i), cauHoi: daoThuTu.map(daoPhuongAn) });
  }
  return ra;
}

/* ===================== BẢNG ĐÁP ÁN ===================== */

export interface CotDapAn {
  ma: string;
  /** Đáp án theo đúng thứ tự câu của mã đó. */
  dapAn: string[];
}

/**
 * Đưa đáp án Đúng/Sai về cùng một bảng chữ Đ/S.
 *
 * Kho lưu lẫn lộn "DSDS", "TSST", "ĐSSĐ" tuỳ lúc nhập, mà mã trộn lại luôn sinh ra
 * Đ/S - để nguyên thì cùng một bảng đáp án có mã ghi kiểu này mã ghi kiểu kia, người
 * chấm dễ đọc nhầm chữ D thành Đúng ở mã này rồi lại tưởng là Sai ở mã khác.
 */
function chuanHoaDapAn(chuoi: string): string {
  if (!/^[ĐDTSF]{4}$/i.test(chuoi)) return chuoi;   // không phải chuỗi Đúng/Sai thì để nguyên
  return chuoi.split("").map(c => (laDung(c) ? "Đ" : "S")).join("");
}

/**
 * Bảng đáp án của mọi mã đề. Câu trong mỗi mã đã đảo nên đáp án phải đọc theo
 * chính thứ tự của mã đó, không được lấy chung một cột cho tất cả.
 */
export function bangDapAn(cacMa: MaDe[], chiaPhan = true): CotDapAn[] {
  return cacMa.map(md => {
    const ds = chiaPhan ? chiaPhanDeThi(md.cauHoi).flatMap(p => p.cauHoi) : md.cauHoi;
    return {
      ma: md.ma,
      dapAn: ds.map(q => chuanHoaDapAn(String(q?.correct_answer ?? "").trim()) || "—"),
    };
  });
}
