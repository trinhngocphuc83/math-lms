// Đọc bảng ma trận đề thi từ ảnh chụp, tệp PDF hoặc tệp Word rồi trả về các dòng thô.
//
// Vì sao cần: thầy cô thường đã có sẵn ma trận do tổ chuyên môn phát, dưới dạng ảnh
// chụp hoặc file Word. Gõ tay lại vào app mất cả buổi. Đọc bằng máy rồi để thầy cô
// soát lại nhanh hơn nhiều.
//
// Việc khớp tên dạng toán về đúng danh mục trong kho KHÔNG làm ở đây - hàm này chỉ
// đọc ra chữ, còn khớp là việc của trang gọi nó, vì chỉ trang đó mới biết kho đang
// có những dạng nào.

import { chuanHoaNguonThanhAnh, laFilePdf } from "./pdfToImages";
import { filesToGeminiParts } from "./aiQuestionScan";
import { goiGeminiTrenTrinhDuyet, type CauHinhAI } from "./geminiBrowser";
import { doGiongNhau } from "./questionFingerprint";
import { toBankType, type BankType } from "./questionTypes";
import { diemMacDinh } from "./deThi";

/** Một dòng ma trận máy đọc được, chưa khớp với kho. */
export interface DongThoMaTran {
  dangToan: string;
  loaiCau: BankType;
  mucDo: string;      // '1'..'4'
  soCau: number;
  diemMoiCau: number;
  /** Chương/bài máy đọc được, chỉ dùng để thầy cô đối chiếu cho dễ nhận ra dòng. */
  chuong?: string;
}

export const laFileWord = (f: File): boolean =>
  /\.docx?$/i.test(f.name) || /officedocument\.wordprocessingml/i.test(f.type);

export const laFileAnh = (f: File): boolean => /^image\//i.test(f.type);

/** Lấy chữ trong tệp Word. Đọc thẳng chữ chính xác hơn nhiều so với chụp ảnh rồi nhìn. */
async function docChuTuWord(file: File): Promise<string> {
  // mammoth khong kem tep khai bao kieu cho ban chay tren trinh duyet.
  // @ts-ignore
  const mammoth: any = await import("mammoth/mammoth.browser");
  const buf = await file.arrayBuffer();
  // Lấy HTML chứ không lấy chữ trơn: giữ được thẻ <table> nên máy còn biết đâu là
  // hàng, đâu là cột. Chữ trơn thì cả bảng dính thành một khối, đọc sai ngay.
  const kq = await (mammoth.convertToHtml ? mammoth.convertToHtml({ arrayBuffer: buf }) : mammoth.default.convertToHtml({ arrayBuffer: buf }));
  return String(kq?.value || "");
}

function taoPrompt(danhSachDang: string[]): string {
  const keDang = danhSachDang.length
    ? `\n\nDANH SÁCH DẠNG TOÁN ĐANG CÓ TRONG NGÂN HÀNG (hãy chép CHÍNH XÁC tên từ danh sách này nếu tìm được dòng tương ứng):\n- ${danhSachDang.join("\n- ")}`
    : "";

  return `Bạn đang đọc BẢNG MA TRẬN ĐỀ KIỂM TRA của giáo viên Việt Nam (theo Công văn 7991/BGDĐT-GDTrH).

Nhiệm vụ: bóc toàn bộ các dòng của bảng ra thành JSON. CHỈ trả về JSON, không giải thích gì thêm.

Định dạng bắt buộc - một mảng, mỗi phần tử một dòng:
[
  {
    "chuong": "tên chương hoặc chủ đề, để chuỗi rỗng nếu không có",
    "dangToan": "tên dạng toán / nội dung đơn vị kiến thức",
    "loaiCau": "NLC hoặc DS hoặc TLN hoặc TL",
    "mucDo": "1 hoặc 2 hoặc 3",
    "soCau": 2,
    "diemMoiCau": 0.25
  }
]

QUY ƯỚC LOẠI CÂU:
- "NLC" = trắc nghiệm nhiều lựa chọn (nhiều phương án lựa chọn, TNKQ nhiều lựa chọn)
- "DS" = trắc nghiệm đúng/sai
- "TLN" = trả lời ngắn
- "TL" = tự luận

QUY ƯỚC MỨC ĐỘ (bảng thường chia 3 cột Biết - Hiểu - Vận dụng):
- Cột "Biết" / "Nhận biết" -> "1"
- Cột "Hiểu" / "Thông hiểu" -> "2"
- Cột "Vận dụng" / "Vận dụng cao" -> "3"

QUY TẮC QUAN TRỌNG:
1. Bảng ma trận thường có MỘT dòng ứng với NHIỀU ô số câu ở các cột mức độ và loại câu khác nhau. Hãy TÁCH thành nhiều phần tử JSON, mỗi phần tử ứng với MỘT ô có số câu lớn hơn 0.
   Ví dụ: dòng "Bài 1. Đơn thức" có 2 câu ở cột NLC-Biết và 1 câu ở cột TLN-Hiểu
   -> phải trả về 2 phần tử riêng biệt.
2. Ô trống, ô ghi "0" hoặc dấu gạch thì BỎ QUA, không tạo phần tử.
3. Ô ghi kiểu "1 (C3)" hoặc "2 ý (C1a)" thì chỉ lấy CON SỐ đứng đầu làm "soCau".
4. Nếu bảng không ghi điểm mỗi câu thì để "diemMoiCau": 0 - hệ thống sẽ tự điền theo loại câu.
5. Bỏ qua các dòng tổng cộng, dòng "Tổng", dòng "Tỉ lệ %".
6. Nếu ảnh mờ hoặc không đọc chắc được một ô nào, cứ bỏ ô đó chứ TUYỆT ĐỐI KHÔNG đoán bừa số câu.${keDang}`;
}

/** Bóc mảng JSON ra khỏi phần chữ AI trả về (hay bị bọc trong dấu nháy ba). */
function bocMangJson(raw: string): any[] {
  let t = String(raw || "").trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const dau = t.indexOf("[");
  const cuoi = t.lastIndexOf("]");
  if (dau === -1 || cuoi === -1 || cuoi < dau) throw new Error("Máy không trả về đúng dạng bảng.");
  const parsed = JSON.parse(t.slice(dau, cuoi + 1));
  if (!Array.isArray(parsed)) throw new Error("Máy không trả về đúng dạng bảng.");
  return parsed;
}

export interface KetQuaDocMaTran {
  dong: DongThoMaTran[];
  model: string;
  /** Số dòng máy trả về nhưng thiếu dữ liệu nên bị loại. */
  soDongBoQua: number;
}

/**
 * Đọc ma trận từ danh sách tệp. Ảnh và PDF thì gửi hình cho máy nhìn; tệp Word thì
 * bóc chữ ra gửi đi, chính xác hơn hẳn vì không phải đoán chữ từ ảnh.
 */
export async function docMaTranTuTep(
  files: File[],
  cauHinh: CauHinhAI,
  danhSachDang: string[],
  onTienDo?: (moTa: string) => void,
): Promise<KetQuaDocMaTran> {
  if (files.length === 0) throw new Error("Chưa chọn tệp nào.");

  const tepWord = files.filter(laFileWord);
  const tepKhac = files.filter(f => !laFileWord(f));

  const parts: any[] = [{ text: taoPrompt(danhSachDang) }];

  for (const f of tepWord) {
    onTienDo?.(`Đang đọc chữ trong ${f.name}...`);
    const html = await docChuTuWord(f);
    if (!html.trim()) throw new Error(`Không đọc được nội dung trong ${f.name}.`);
    parts.push({ text: `\n\nNỘI DUNG BẢNG (dạng HTML lấy từ tệp Word "${f.name}"):\n${html}` });
  }

  if (tepKhac.length > 0) {
    const coPdf = tepKhac.some(laFilePdf);
    if (coPdf) onTienDo?.("Đang dựng trang PDF thành ảnh...");
    const anh = await chuanHoaNguonThanhAnh(tepKhac, onTienDo);
    if (anh.length === 0) throw new Error("Không dựng được ảnh nào từ tệp đã chọn.");
    onTienDo?.(`Đang gửi ${anh.length} ảnh cho máy đọc...`);
    parts.push(...(await filesToGeminiParts(anh)));
  }

  onTienDo?.("Máy đang đọc bảng...");
  const kq = await goiGeminiTrenTrinhDuyet(cauHinh, parts, {
    responseMimeType: "application/json",
    temperature: 0,   // đọc bảng là việc chép lại, không được sáng tạo
  });

  const tho = bocMangJson(kq.text);
  const dong: DongThoMaTran[] = [];
  let boQua = 0;

  for (const r of tho) {
    const dangToan = String(r?.dangToan || "").trim();
    const soCau = Math.floor(Number(r?.soCau) || 0);
    if (!dangToan || soCau <= 0) { boQua++; continue; }

    const loaiCau = toBankType(String(r?.loaiCau || "")) || "NLC";
    let mucDo = String(r?.mucDo || "").trim();
    if (!/^[1-4]$/.test(mucDo)) mucDo = "1";

    const diemDoc = Number(r?.diemMoiCau) || 0;
    dong.push({
      chuong: String(r?.chuong || "").trim() || undefined,
      dangToan,
      loaiCau,
      mucDo,
      soCau,
      diemMoiCau: diemDoc > 0 ? diemDoc : diemMacDinh(loaiCau),
    });
  }

  return { dong, model: kq.model, soDongBoQua: boQua };
}

/* ===================== KHỚP DÒNG ĐỌC ĐƯỢC VỚI KHO ===================== */

const chuanHoaTen = (s: string): string => String(s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
  .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Ngưỡng khớp tên. Để cao vì đo trên kho thật: "Tính đơn điệu và cực trị của hàm số"
 * (tên BÀI) giống "Lý thuyết về tính đơn điệu và cực trị" (tên DẠNG) tới mức lọt
 * ngưỡng thấp - khớp nhầm mà nhìn vẫn tưởng đúng, nguy hơn là không khớp.
 */
export const NGUONG_KHOP_TEN = 0.78;

/** Bỏ tiền tố "Bài 3." / "Chương 1." để so tên cho đúng phần chữ. */
const boSoThuTu = (s: string): string => String(s || '').replace(/^\s*(?:B[aà]i|Ch[uư][oơ]ng)\s*\d+\s*[.:-]?\s*/i, '');

/** Từ nối, không mang nghĩa nên không tính khi xét bao chứa. */
const TU_NOI = new Set(['va', 'cua', 'de', 'cac', 'mot', 'so', 'trong', 'cho', 'den', 'voi', 'the', 'khi']);

const tuCoNghia = (s: string): string[] =>
  s.split(' ').filter((t) => t.length >= 2 && !TU_NOI.has(t));

/**
 * Tên ngắn có nằm trọn trong tên dài không.
 *
 * Sách giáo khoa ghi dài hơn tên trong kho: ma trận thật ghi "Ứng dụng đạo hàm để giải
 * quyết một số vấn đề liên quan đến thực tiễn", còn kho chỉ ghi "Bài 5. Ứng dụng của
 * đạo hàm". Đo độ giống theo cụm ba chữ thì trượt vì phần đuôi dài lấn át, nhưng mọi
 * từ có nghĩa của tên ngắn đều nằm trong tên dài - đó mới là dấu hiệu đúng.
 */
function baoChuaHetTu(a: string, b: string): boolean {
  const ta = tuCoNghia(a);
  const tb = tuCoNghia(b);
  if (ta.length < 2 || tb.length < 2) return false;
  const [ngan, dai] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const kho = new Set(dai);
  return ngan.every((t) => kho.has(t));
}

function timGanNhat(tenDoc: string, danhSach: string[]): { ten: string | null; diem: number } {
  const a = chuanHoaTen(boSoThuTu(tenDoc));
  if (!a) return { ten: null, diem: 0 };

  let tot: { ten: string; diem: number } | null = null;
  let bao: { ten: string; diem: number } | null = null;

  for (const ten of danhSach) {
    const b = chuanHoaTen(boSoThuTu(ten));
    if (!b) continue;
    if (a === b) return { ten, diem: 1 };
    const d = doGiongNhau(a, b);
    if (!tot || d > tot.diem) tot = { ten, diem: d };
    // Giữ riêng ứng viên bao chứa, chọn cái giống nhất trong nhóm đó
    if (baoChuaHetTu(a, b) && (!bao || d > bao.diem)) bao = { ten, diem: d };
  }

  if (tot && tot.diem >= NGUONG_KHOP_TEN) return tot;
  // Bao chứa hết từ thì nhận, nhưng trả điểm vừa phải để giao diện vẫn bắt soát lại
  if (bao) return { ten: bao.ten, diem: Math.max(bao.diem, 0.7) };
  return { ten: null, diem: tot ? tot.diem : 0 };
}

export interface NguonKho {
  /** Tên các bài học kho đang có. */
  danhSachBai: string[];
  /** Tên các dạng toán kho đang có. */
  danhSachDang: string[];
  /** Các dạng toán thuộc một bài. */
  dangCuaBai: (bai: string) => string[];
  /** Kho có bao nhiêu câu cho đúng bộ ba (dạng, loại, mức). */
  demKho: (dang: string, loai: BankType, mucDo: string) => number;
}

export type NguonKhop = 'bai' | 'dang' | 'khong';

export interface KetQuaKhopDong {
  /** Bài học khớp được, nếu tên máy đọc là tên bài. */
  bai: string | null;
  /** Dạng toán chốt lại để đưa vào ma trận. */
  dang: string | null;
  diem: number;
  nguon: NguonKhop;
}

/**
 * Khớp một dòng ma trận máy đọc được về dạng toán trong kho.
 *
 * Thứ tự thử là BÀI TRƯỚC, DẠNG SAU - không phải ngược lại. Bảng ma trận theo Công
 * văn 7991 có cột "Nội dung / đơn vị kiến thức" ghi TÊN BÀI HỌC, không ghi dạng toán.
 * Đo trên ma trận thật lớp 12: cả 22 dòng đều là tên bài. Khớp thẳng vào tên dạng thì
 * trượt gần hết, mà vài dòng lại khớp nhầm sang một dạng chỉ trùng vài chữ.
 *
 * Khớp được bài rồi thì chọn tạm dạng nào của bài đó đang có sẵn nhiều câu nhất cho
 * đúng loại và mức đang cần - đây chỉ là đề xuất, giao diện vẫn bắt thầy cô soát lại.
 */
export function khopDongMaTran(
  tenDoc: string,
  loai: BankType,
  mucDo: string,
  kho: NguonKho,
): KetQuaKhopDong {
  const theoBai = timGanNhat(tenDoc, kho.danhSachBai);
  if (theoBai.ten) {
    const ds = kho.dangCuaBai(theoBai.ten);
    let chon: string | null = null;
    let nhieuNhat = -1;
    for (const d of ds) {
      const n = kho.demKho(d, loai, mucDo);
      if (n > nhieuNhat) { nhieuNhat = n; chon = d; }
    }
    return { bai: theoBai.ten, dang: chon, diem: theoBai.diem, nguon: 'bai' };
  }

  const theoDang = timGanNhat(tenDoc, kho.danhSachDang);
  if (theoDang.ten) return { bai: null, dang: theoDang.ten, diem: theoDang.diem, nguon: 'dang' };

  return { bai: null, dang: null, diem: Math.max(theoBai.diem, theoDang.diem), nguon: 'khong' };
}
