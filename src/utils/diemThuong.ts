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

/**
 * Điểm thưởng chỉ tính từ tháng này trở đi.
 *
 * Thầy cô chốt: hệ điểm thưởng bắt đầu áp dụng từ tháng 09/2026. Bài làm của những tháng
 * trước đó KHÔNG quy ra điểm - lúc ấy học sinh chưa biết có luật này nên cộng lùi lại là
 * không công bằng, mà bảng xếp hạng cũng lệch hẳn.
 *
 * Máy quét tự bỏ qua mọi tháng cũ hơn mốc này. Thầy cô vẫn xem lại được các tháng cũ và
 * vẫn cộng/trừ tay bình thường nếu muốn.
 */
export const THANG_BAT_DAU_TINH_DIEM = '2026-09';

/** Tháng 'YYYY-MM' này đã tới mốc bắt đầu tính điểm chưa. So chuỗi là đủ vì dạng cố định. */
export function thangDuocTinhDiem(thang: string): boolean {
  return String(thang || '') >= THANG_BAT_DAU_TINH_DIEM;
}

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
 * `daCongCoBan` là SỐ ĐIỂM đã cộng cho từng bài ở lượt quét trước (khoá bài -> điểm), chứ
 * không phải chỉ đánh dấu "đã cộng rồi". Nhờ vậy em làm lại tốt hơn thì được cộng BÙ phần
 * chênh: trước đây bài 7 điểm cộng 1, sau em làm lại được 10 vẫn chỉ có 1 - trái hẳn với
 * việc gộp lần làm lại lấy điểm cao nhất mà chính chỗ này đang làm.
 *
 * `daTienBo` là những bài đã được thưởng tiến bộ rồi - đếm riêng vì dòng tiến bộ mang
 * cùng khoá bài với dòng điểm gốc.
 */
export function tinhCacLanCong(
  dsBai: BaiDaLam[],
  nguon: NguonDiem,
  daCongCoBan: Map<string, number>,
  daTienBo: Set<string> = new Set(),
): LanCong[] {
  const ra: LanCong[] = [];

  /* Chỉ giữ bài làm thật, xếp theo thời gian để so được bài trước - bài sau. */
  const bai = dsBai
    .filter(b => laBaiLamThat(b.diem))
    .sort((a, b) => a.luc.localeCompare(b.luc));

  bai.forEach((b, i) => {
    const canCo = quyDoiDiemBai(b.diem);
    const daCo = Number(daCongCoBan.get(b.khoa) || 0);
    if (canCo > daCo) {
      ra.push({
        nguon,
        diem: canCo - daCo,
        ly_do: daCo > 0
          ? `Làm lại tốt hơn: ${b.ten} — ${b.diem} điểm`
          : `${b.ten} — ${b.diem} điểm`,
        khoa: b.khoa,
      });
    }

    /* Thưởng tiến bộ: so với bài LIỀN TRƯỚC trong tháng, kể cả bài đó dưới mốc. */
    const truoc = bai[i - 1];
    if (!daTienBo.has(b.khoa) && truoc && duocThuongTienBo(truoc.diem, b.diem)) {
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
 * Một tháng 'YYYY-MM' bắt đầu và kết thúc lúc nào, TÍNH THEO GIỜ VIỆT NAM.
 *
 * Trước đây tính theo giờ UTC, lệch 7 tiếng: em làm bài lúc 22 giờ ngày cuối tháng thì
 * theo UTC đã sang tháng sau, còn em làm lúc 6 giờ sáng ngày mùng 1 thì vẫn bị xếp vào
 * tháng trước. Mà máy chỉ quét tháng đang xem, nên mấy bài rơi lệch tháng như thế dễ
 * không bao giờ được cộng.
 */
export const MUI_GIO_VN = 7;

export function khoangThangVN(thang: string): { tu: string; den: string } {
  const [n, t] = thang.split('-').map(Number);
  /* 00:00 ngày 1 giờ VN = 17:00 ngày cuối tháng trước theo UTC. */
  const tu = new Date(Date.UTC(n, t - 1, 1, -MUI_GIO_VN));
  const den = new Date(Date.UTC(t === 12 ? n + 1 : n, t === 12 ? 0 : t, 1, -MUI_GIO_VN));
  return { tu: tu.toISOString(), den: den.toISOString() };
}

/** Ngày (theo giờ VN) của một mốc thời gian ISO - dùng cho cột kiểu `date`. */
export function ngayVN(luc: string | Date): string {
  const d = new Date(luc);
  return new Date(d.getTime() + MUI_GIO_VN * 3600_000).toISOString().slice(0, 10);
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
