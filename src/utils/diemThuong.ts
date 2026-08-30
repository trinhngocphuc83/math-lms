/**
 * Quy đổi điểm bài làm sang điểm thưởng.
 *
 * KHÔNG lấy điểm thô. Bài kiểm tra thang 10 mà cộng thẳng thì một bài 9 điểm bằng cả
 * tháng phát biểu chăm chỉ (đo trên lớp thật: mỗi em được gọi 1-2 lần/tháng, tức 2-3
 * điểm), bảng xếp hạng sẽ thành bảng xếp hạng học lực - đúng cái cần tránh vì mục đích
 * là thưởng em TIẾN BỘ.
 *
 * Mốc do Thầy cô chốt: TỪ 7 được 1, TỪ 8 được 2, TỪ 9 được 3, đúng 10 được 4.
 * Là lớn hơn HOẶC BẰNG, nên 9.0 chẵn được 3, 8.0 chẵn được 2, 7.0 chẵn được 1.
 */

export type NguonDiem = 'tuong_tac' | 'kiem_tra' | 'luyen_tap' | 'thi_online' | 'tien_bo';

/** Bài dưới mốc thì được 0, KHÔNG bị trừ - trừ điểm vì bài kém dễ làm học sinh nản. */
export function quyDoiDiemBai(diemBai: number): number {
  const d = Number(diemBai);
  if (!Number.isFinite(d)) return 0;
  if (d >= 10) return 4;
  if (d >= 9) return 3;
  if (d >= 8) return 2;
  if (d >= 7) return 1;
  return 0;
}

/** Chênh lệch tối thiểu giữa hai bài liên tiếp để được thưởng tiến bộ. */
export const MUC_TIEN_BO = 1.5;

/**
 * Có được thưởng tiến bộ không: bài sau hơn bài trước từ 1,5 điểm.
 * Cả hai bài phải là bài LÀM THẬT (xem laBaiLamThat).
 */
export function duocThuongTienBo(diemTruoc: number, diemSau: number): boolean {
  return Number(diemSau) - Number(diemTruoc) >= MUC_TIEN_BO;
}

/**
 * Bài 0 điểm coi như BỎ DỞ, không tính là một lần làm bài.
 *
 * Đo trên kho thật: 56 bài luyện tập, điểm trung bình chỉ 2.04/10 vì rất nhiều bài 0.
 * Tính vào thì nhiều em bị kéo xuống oan, và mốc tiến bộ cũng lệch theo.
 */
export function laBaiLamThat(diemBai: number): boolean {
  const d = Number(diemBai);
  return Number.isFinite(d) && d > 0;
}

export interface BaiDaLam {
  /** Khoá để không cộng hai lần cho cùng một bài */
  khoa: string;
  ten: string;
  diem: number;
  luc: string;
}

export interface LanCong {
  nguon: NguonDiem;
  diem: number;
  ly_do: string;
  /** Cất vào cột lesson_id để lần sau biết bài này đã cộng rồi */
  khoa: string;
}

/**
 * Từ danh sách bài một em đã làm trong tháng, tính ra các lần cần cộng.
 *
 * `daCong` là những khoá đã ghi nhận trước đó - bỏ qua để MỖI BÀI CHỈ CỘNG MỘT LẦN dù
 * quét lại bao nhiêu lượt.
 */
export function tinhCacLanCong(
  dsBai: BaiDaLam[], nguon: NguonDiem, daCong: Set<string>,
): LanCong[] {
  const ra: LanCong[] = [];

  /* Chỉ giữ bài làm thật, xếp theo thời gian để so được bài trước - bài sau. */
  const bai = dsBai
    .filter(b => laBaiLamThat(b.diem))
    .sort((a, b) => a.luc.localeCompare(b.luc));

  bai.forEach((b, i) => {
    if (daCong.has(b.khoa)) return;

    const d = quyDoiDiemBai(b.diem);
    if (d > 0) {
      ra.push({
        nguon,
        diem: d,
        ly_do: `${b.ten} — ${b.diem} điểm`,
        khoa: b.khoa,
      });
    }

    /* Thưởng tiến bộ: so với bài LIỀN TRƯỚC trong tháng, kể cả bài đó dưới mốc. */
    const truoc = bai[i - 1];
    if (truoc && duocThuongTienBo(truoc.diem, b.diem)) {
      ra.push({
        nguon: 'tien_bo',
        diem: 1,
        ly_do: `Tiến bộ: ${truoc.diem} → ${b.diem} điểm (${b.ten})`,
        khoa: b.khoa,
      });
    }
  });

  return ra;
}

/**
 * Gộp nhiều lần làm CÙNG MỘT BÀI thành một, lấy lần điểm CAO NHẤT.
 *
 * Lấy lần cao nhất chứ không phải lần đầu, để khuyến khích làm lại cho tốt - kho thật có
 * em làm tới 6 lần một bài.
 */
export function gopLanLamLai(dsBai: BaiDaLam[]): BaiDaLam[] {
  const tot: Record<string, BaiDaLam> = {};
  for (const b of dsBai) {
    const cu = tot[b.khoa];
    if (!cu || Number(b.diem) > Number(cu.diem)) tot[b.khoa] = b;
  }
  return Object.values(tot);
}
