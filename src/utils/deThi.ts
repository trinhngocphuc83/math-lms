// Những thứ dùng chung cho việc ra đề: đầu đề, điểm, khuôn cấu trúc đề, chia phần.
//
// Vì sao gom về một tệp: trang ma trận tự viết getTypeName/getDiffName riêng, trang
// chọn câu lại dùng bankTypeLabel/difficultyLabel, và mặc định loại câu hai nơi khác
// nhau ('TN' với 'NLC'). Sửa một nơi quên nơi kia là chuyện đã xảy ra.
//
// Chuẩn tham chiếu: Công văn 7991/BGDĐT-GDTrH ngày 17/12/2024.

import { toBankType, toDifficultyCode, type BankType } from "./questionTypes";

/** Tên lớp học in ở góc trái đầu đề. CHÉP SANG APP LÝ THÌ ĐỔI ĐÚNG DÒNG NÀY. */
export const TEN_LOP_HOC = "Lớp Toán Thầy Phúc";

/* ===================== ĐẦU ĐỀ ===================== */

export interface DauDe {
  tenLopHoc: string;
  tenKyThi: string;
  monLop: string;
  namHoc: string;
  thoiGian: string;
  maDe: string;
}

/** Năm học hiện tại theo mốc tháng 8: trước tháng 8 vẫn thuộc năm học trước. */
function namHocHienTai(): string {
  const now = new Date();
  const dau = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${dau} - ${dau + 1}`;
}

export function dauDeMacDinh(loaiDe = "", grade = "", subject = ""): DauDe {
  return {
    tenLopHoc: TEN_LOP_HOC,
    tenKyThi: (loaiDe || "Đề kiểm tra").toUpperCase(),
    monLop: [subject, grade && `Lớp ${grade}`].filter(Boolean).join(" - "),
    namHoc: namHocHienTai(),
    thoiGian: "90 phút",
    maDe: "101",
  };
}

/* ===================== MỨC ĐỘ ===================== */

export type MucDoBo = "Biết" | "Hiểu" | "Vận dụng";

export const MUC_DO_BO: MucDoBo[] = ["Biết", "Hiểu", "Vận dụng"];

/**
 * Gộp 4 mức của app về 3 mức của Công văn 7991.
 *
 * App lưu difficulty 1-4 (Nhận biết / Thông hiểu / Vận dụng / Vận dụng cao) nhưng
 * mẫu bảng của Bộ chỉ có ba cột Biết - Hiểu - Vận dụng, nên mức 3 và mức 4 phải
 * dồn vào chung cột "Vận dụng". Mọi bảng theo mẫu Bộ đều phải đi qua hàm này để
 * không ai tự quy đổi một kiểu khác.
 */
export function mucDo7991(difficulty: string | number | null | undefined): MucDoBo {
  const ma = toDifficultyCode(difficulty) ?? "1";
  if (ma === "1") return "Biết";
  if (ma === "2") return "Hiểu";
  return "Vận dụng";
}

/* ===================== ĐIỂM ===================== */

/** Điểm mỗi câu theo khuôn 2025. Thầy cô sửa lại từng dòng được. */
export const DIEM_MAC_DINH: Record<BankType, number> = {
  NLC: 0.25,
  DS: 1,
  TLN: 0.5,
  TL: 1,
};

export function diemMacDinh(questionType: string | null | undefined): number {
  const ma = toBankType(questionType);
  return ma ? DIEM_MAC_DINH[ma] : 0.25;
}

/** Một dòng ma trận kèm điểm. Giữ đúng các trường trang ma trận đang dùng. */
export interface DongMaTran {
  id: string;
  category_id?: string;
  math_form: string;
  topic?: string;
  lesson?: string;
  question_type: string;
  difficulty: string;
  count: number;
  max_count: number;
  diemMoiCau: number;
}

/** Cộng dồn về 2 chữ số thập phân để khỏi ra 9.999999999 do số thực. */
export function lamTron(x: number): number {
  return Math.round(x * 100) / 100;
}

/**
 * Điểm hiển thị kiểu Việt Nam: 0,25 -> "0,25"; 2 -> "2,0"; 0,75 -> "0,75".
 *
 * Điểm tròn vẫn ghi đủ một chữ số thập phân ("2,0" chứ không phải "2") cho đúng lối
 * trình bày của Công văn 7991. Không dùng toFixed(1) suông: nó làm tròn 0,75 thành
 * "0,8", sai số điểm của phần.
 */
export function soDiemVN(x: number): string {
  const r = lamTron(x);
  return (Number.isInteger(r * 10) ? r.toFixed(1) : String(r)).replace('.', ',');
}

export function tinhTongDiem(dong: DongMaTran[]): number {
  return lamTron(dong.reduce((s, d) => s + (d.count || 0) * (d.diemMoiCau || 0), 0));
}

export function tinhTongCau(dong: DongMaTran[]): number {
  return dong.reduce((s, d) => s + (d.count || 0), 0);
}

/** Tổng số câu và tổng điểm của từng loại câu, để hiện thanh tiến độ. */
export function gomTheoLoai(dong: DongMaTran[]): Record<BankType, { soCau: number; diem: number }> {
  const ra: Record<string, { soCau: number; diem: number }> = {
    NLC: { soCau: 0, diem: 0 }, DS: { soCau: 0, diem: 0 },
    TLN: { soCau: 0, diem: 0 }, TL: { soCau: 0, diem: 0 },
  };
  for (const d of dong) {
    const ma = toBankType(d.question_type);
    if (!ma) continue;
    ra[ma].soCau += d.count || 0;
    ra[ma].diem = lamTron(ra[ma].diem + (d.count || 0) * (d.diemMoiCau || 0));
  }
  return ra as Record<BankType, { soCau: number; diem: number }>;
}

/* ===================== KHUÔN CẤU TRÚC ĐỀ ===================== */

export interface ChiTieuLoai {
  soCau: number;
  diemMoiCau: number;
}

export interface KhuonDe {
  ten: string;
  moTa: string;
  chiTieu: Partial<Record<BankType, ChiTieuLoai>>;
}

/**
 * Các khuôn đề dựng sẵn. Chọn khuôn nào thì app đặt sẵn chỉ tiêu số câu và điểm
 * cho từng loại; thầy cô vẫn sửa lại từng dòng được - khuôn chỉ là điểm xuất phát.
 *
 * Khuôn '3-2-2-3' khớp đúng chân bảng của Phụ lục Công văn 7991:
 * tổng điểm 3,0 / 2,0 / 2,0 / 3,0 ứng với tỉ lệ 30 / 20 / 20 / 30.
 */
export const KHUON_DE: Record<string, KhuonDe> = {
  "3-2-2-3": {
    ten: "3-2-2-3 (chuẩn Công văn 7991)",
    moTa: "12 câu trắc nghiệm · 2 câu Đúng/Sai · 4 câu trả lời ngắn · 3,0 điểm tự luận",
    chiTieu: {
      NLC: { soCau: 12, diemMoiCau: 0.25 },
      DS: { soCau: 2, diemMoiCau: 1 },
      TLN: { soCau: 4, diemMoiCau: 0.5 },
      TL: { soCau: 3, diemMoiCau: 1 },
    },
  },
  "4-6": {
    ten: "4-6 (16 câu trắc nghiệm + tự luận)",
    moTa: "16 câu trắc nghiệm = 4,0 điểm · còn lại 6,0 điểm tự luận",
    chiTieu: {
      NLC: { soCau: 16, diemMoiCau: 0.25 },
      TL: { soCau: 6, diemMoiCau: 1 },
    },
  },
  "7-3": {
    ten: "7-3 (28 câu trắc nghiệm + tự luận)",
    moTa: "28 câu trắc nghiệm = 7,0 điểm · còn lại 3,0 điểm tự luận",
    chiTieu: {
      NLC: { soCau: 28, diemMoiCau: 0.25 },
      TL: { soCau: 3, diemMoiCau: 1 },
    },
  },
  tn100: {
    ten: "100% trắc nghiệm",
    moTa: "40 câu trắc nghiệm = 10,0 điểm",
    chiTieu: { NLC: { soCau: 40, diemMoiCau: 0.25 } },
  },
  tl100: {
    ten: "100% tự luận",
    moTa: "10,0 điểm tự luận",
    chiTieu: { TL: { soCau: 5, diemMoiCau: 2 } },
  },
  tuDo: {
    ten: "Tự do (không theo khuôn)",
    moTa: "Thầy cô tự đặt số câu và điểm cho từng dòng",
    chiTieu: {},
  },
};

export const MA_KHUON_DE = Object.keys(KHUON_DE);

/* ===================== CHIA PHẦN ĐỀ THI ===================== */

export interface PhanDeThi {
  ma: BankType;
  soLaMa: string;
  tieuDe: string;
  cauDan: string;
  cauHoi: any[];
  /** Số thứ tự câu đầu tiên của phần này trong toàn đề. */
  batDau: number;
}

const THU_TU_PHAN: BankType[] = ["NLC", "DS", "TLN", "TL"];

const TEN_PHAN: Record<BankType, string> = {
  NLC: "CÂU HỎI TRẮC NGHIỆM NHIỀU LỰA CHỌN",
  DS: "CÂU HỎI TRẮC NGHIỆM ĐÚNG/SAI",
  TLN: "CÂU HỎI TRẮC NGHIỆM TRẢ LỜI NGẮN",
  TL: "TỰ LUẬN",
};

function soLaMa(n: number): string {
  const bang: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let ra = "";
  for (const [gia, chu] of bang) {
    while (n >= gia) { ra += chu; n -= gia; }
  }
  return ra;
}

function cauDanCuaPhan(ma: BankType, tu: number, den: number): string {
  if (ma === "NLC")
    return `Thí sinh chọn một phương án đúng nhất cho mỗi câu hỏi từ Câu ${tu} đến Câu ${den}.`;
  if (ma === "DS")
    return `Thí sinh trả lời từ Câu ${tu} đến Câu ${den}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.`;
  if (ma === "TLN")
    return `Thí sinh trả lời từ Câu ${tu} đến Câu ${den}. Ghi kết quả vào ô trả lời tương ứng.`;
  return `Thí sinh trình bày lời giải chi tiết từ Câu ${tu} đến Câu ${den}.`;
}

/**
 * Gom câu hỏi thành các PHẦN I / II / III theo thứ tự trắc nghiệm trước, tự luận sau.
 *
 * Trước đây thứ tự câu trong đề là thứ tự dòng ma trận, nên trắc nghiệm và tự luận
 * nằm xen kẽ - in ra không dùng được. Hàm này cũng là chỗ quyết định SỐ THỨ TỰ của
 * từng câu, nên số hiện trên thẻ chọn câu phải lấy từ đây, không tính theo ma trận.
 */
export function chiaPhanDeThi(cauHoi: any[]): PhanDeThi[] {
  const nhom: Record<string, any[]> = { NLC: [], DS: [], TLN: [], TL: [] };
  for (const q of cauHoi) {
    const ma = toBankType(q?.question_type) ?? "NLC";
    nhom[ma].push(q);
  }

  const ra: PhanDeThi[] = [];
  let stt = 1;
  let chiSoPhan = 1;
  for (const ma of THU_TU_PHAN) {
    const ds = nhom[ma];
    if (!ds.length) continue;
    const batDau = stt;
    const ketThuc = stt + ds.length - 1;
    ra.push({
      ma,
      soLaMa: soLaMa(chiSoPhan),
      tieuDe: TEN_PHAN[ma],
      cauDan: cauDanCuaPhan(ma, batDau, ketThuc),
      cauHoi: ds,
      batDau,
    });
    stt = ketThuc + 1;
    chiSoPhan++;
  }
  return ra;
}

/** Danh sách câu ĐÃ xếp theo thứ tự phần - dùng khi xuất đề và khi đánh số. */
export function sapCauTheoPhan(cauHoi: any[]): any[] {
  return chiaPhanDeThi(cauHoi).flatMap(p => p.cauHoi);
}

/** Tổng điểm của một phần, tính theo bảng điểm của ma trận. */
export function diemCuaPhan(phan: PhanDeThi, dong: DongMaTran[]): number {
  const theoLoai = gomTheoLoai(dong);
  const chiTieu = theoLoai[phan.ma];
  // Chưa có ma trận (mở lại đề cũ) thì lấy điểm mặc định theo loại
  if (!chiTieu || chiTieu.soCau === 0) return lamTron(phan.cauHoi.length * DIEM_MAC_DINH[phan.ma]);
  const moiCau = chiTieu.diem / chiTieu.soCau;
  return lamTron(phan.cauHoi.length * moiCau);
}

/** Tên tệp Word gợi ý, bỏ dấu và ký tự lạ. */
export function tenTepDe(dauDe: DauDe, hauTo = ""): string {
  const goc = [dauDe.tenKyThi, dauDe.monLop, dauDe.maDe && `ma ${dauDe.maDe}`]
    .filter(Boolean).join(" ");
  const sach = goc
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d")
    .replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return (sach || "De_kiem_tra") + (hauTo ? "_" + hauTo : "");
}

/**
 * Tên có làm đứt truy vấn tới ngân hàng không.
 *
 * Tường lửa đứng trước Supabase coi chuỗi "${{" là dấu hiệu tấn công template
 * injection nên chặn thẳng mọi địa chỉ truy vấn có chứa nó, trả về trang chặn 403
 * KHÔNG kèm cờ CORS. Trình duyệt do đó chỉ báo được "TypeError: Failed to fetch",
 * giấu mất lý do thật, và cả trang chọn câu chết chứ không riêng dòng ma trận đó.
 *
 * Đã xảy ra thật ở app Lý: 13 dạng bị gõ sai LaTeX thành "${{X}}$" thay vì "$X$".
 * Dữ liệu đã nắn lại, nhưng thầy cô vẫn gõ tên dạng bằng tay và AI vẫn sinh tên mới,
 * nên giữ lối thoát này: tên nào dính thì bỏ lọc ở máy chủ, lọc lại tại máy người dùng.
 */
export const tenLamDutTruyVan = (ten: string): boolean =>
  String(ten ?? "").includes("${{");

/**
 * Nắn tên viết sai LaTeX "${{X}}$" về "$X$".
 *
 * Nắn THEO CẶP chứ không thay rời từng vế: tên đúng sẵn có kết thúc bằng "}}$" khi công
 * thức lồng nhau (ví dụ $\sqrt{\overline{v^2}}$) sẽ bị cắt cụt nếu thay rời.
 */
export const nanTenPhanLoai = (ten: string): string =>
  String(ten ?? "").replace(/\$\{\{([\s\S]*?)\}\}\$/g, "$$$1$$");
