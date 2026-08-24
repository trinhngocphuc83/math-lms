// Nhờ AI soạn "Yêu cầu cần đạt" cho từng Dạng, để dựng cột cùng tên trong Bản đặc tả
// (mẫu số 2 của Phụ lục kèm Công văn 7991/BGDĐT-GDTrH).
//
// Vì sao cần: kho có hàng trăm dạng chưa soạn, gõ tay hết thì mất cả tháng, mà bản đặc
// tả đang phải lấy tạm chính tên dạng thay thế - nộp tổ chuyên môn nhìn rất thô.
//
// Hai nguồn để máy bám, theo đúng thứ tự ưu tiên:
//   1. CÂU HỎI THẬT trong kho thuộc dạng đó - biết chính xác thầy cô đang ra kiểu gì.
//   2. Không có câu nào thì bám CHƯƠNG TRÌNH GDPT 2018 và sách giáo khoa của bài đó.
// Dòng nào phải suy từ sách sẽ được đánh dấu để thầy cô soát kỹ hơn.

import { goiGeminiTrenTrinhDuyet, type CauHinhAI } from "./geminiBrowser";

export interface DangCanSoan {
  id: string;
  grade: string;
  subject: string;
  topic: string;
  lesson: string;
  math_form: string;
  /** Vài câu thật trong kho thuộc dạng này. Rỗng thì máy phải bám sách giáo khoa. */
  cauMau: string[];
}

export interface YeuCauDaSoan {
  id: string;
  math_form: string;
  lesson: string;
  yeuCau: string;
  /** true khi kho không có câu nào, máy phải suy từ chương trình và sách giáo khoa. */
  theoSach: boolean;
  chon: boolean;
}

export interface KetQuaSoanYeuCau {
  ketQua: YeuCauDaSoan[];
  model: string;
  /** Dạng máy trả về nhưng không khớp id nào đã gửi đi - đã loại. */
  soBoQua: number;
}

/** Cắt bớt câu mẫu cho gọn prompt: chỉ cần đủ để máy nhận ra dạng đang hỏi gì. */
const gonCau = (s: string, n = 150): string =>
  String(s || "").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

function moTaMotDang(d: DangCanSoan, i: number): string {
  const dong = [
    `### DẠNG ${i + 1}`,
    `id: ${d.id}`,
    `Lớp ${d.grade} · ${d.subject}`,
    `Chương: ${d.topic}`,
    `Bài: ${d.lesson}`,
    `Tên dạng: ${d.math_form}`,
  ];
  if (d.cauMau.length) {
    dong.push(`Câu hỏi thật đang có trong kho thuộc dạng này:`);
    d.cauMau.forEach((c, k) => dong.push(`  ${k + 1}. ${gonCau(c)}`));
  } else {
    dong.push(`(Kho CHƯA CÓ câu nào thuộc dạng này - hãy bám Chương trình GDPT 2018 và sách giáo khoa của bài trên.)`);
  }
  return dong.join("\n");
}

function taoPrompt(ds: DangCanSoan[]): string {
  return `Bạn là tổ trưởng chuyên môn đang viết cột "Yêu cầu cần đạt" cho BẢN ĐẶC TẢ ĐỀ KIỂM TRA theo Công văn 7991/BGDĐT-GDTrH.

Với mỗi dạng dưới đây, viết MỘT câu mô tả yêu cầu cần đạt.

CÁCH VIẾT - bám đúng lối của Chương trình GDPT 2018:
- Bắt đầu bằng động từ chỉ mức độ: "Nhận biết được...", "Mô tả được...", "Giải thích được...",
  "Thực hiện được...", "Tính được...", "Vận dụng được...", "Giải quyết được..."
- Một câu duy nhất, không quá 30 từ, không xuống dòng, không gạch đầu dòng.
- Nói rõ HỌC SINH LÀM ĐƯỢC GÌ, không mô tả lại tên dạng.
  Sai:  "Tìm cực trị của hàm số dựa vào bảng biến thiên"  (chép lại tên dạng)
  Đúng: "Xác định được điểm cực đại, điểm cực tiểu và giá trị cực trị của hàm số khi cho bảng biến thiên"
- Dùng thuật ngữ đúng sách giáo khoa, không dùng từ địa phương hay từ tự chế.
- KHÔNG bọc công thức trong dấu $, viết bằng lời.

NGUỒN ĐỂ BÁM, theo thứ tự ưu tiên:
1. Nếu có "Câu hỏi thật đang có trong kho": bám vào đó, vì đó chính là kiểu bài giáo viên đang ra.
2. Nếu kho chưa có câu nào: bám Chương trình GDPT 2018 và sách giáo khoa của đúng bài đó.

CHỈ trả về một mảng JSON, không giải thích gì thêm:
[
  { "id": "chép nguyên id đã cho", "yeuCau": "câu yêu cầu cần đạt" }
]

Phải trả về ĐỦ ${ds.length} phần tử, mỗi dạng một phần tử, giữ nguyên id.

${ds.map(moTaMotDang).join("\n\n")}`;
}

function bocMang(raw: string): any[] {
  const t = String(raw || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const d = t.indexOf("["), c = t.lastIndexOf("]");
  if (d < 0 || c < d) throw new Error("Máy không trả về đúng dạng danh sách.");
  const p = JSON.parse(t.slice(d, c + 1));
  if (!Array.isArray(p)) throw new Error("Máy không trả về đúng dạng danh sách.");
  return p;
}

/** Bao nhiêu dạng gửi đi một lượt. Nhiều quá thì máy trả thiếu, ít quá thì gọi nhiều lần. */
export const SO_DANG_MOI_LUOT = 12;

/**
 * Soạn yêu cầu cần đạt cho một lô dạng.
 *
 * Chia lô nhỏ chứ không gửi cả trăm dạng một lượt: đo trên thực tế, prompt càng dài thì
 * máy càng hay bỏ sót phần tử cuối, mà bỏ sót thì thầy cô không biết dạng nào chưa có.
 */
export async function soanYeuCauMotLo(
  ds: DangCanSoan[],
  cauHinh: CauHinhAI,
): Promise<{ ketQua: YeuCauDaSoan[]; model: string; soBoQua: number }> {
  if (ds.length === 0) return { ketQua: [], model: "", soBoQua: 0 };

  const kq = await goiGeminiTrenTrinhDuyet(cauHinh, [{ text: taoPrompt(ds) }], {
    responseMimeType: "application/json",
    temperature: 0.3,   // viết chuẩn mực, không cần sáng tạo
  });

  const tho = bocMang(kq.text);
  const theoId = new Map(ds.map(d => [d.id, d]));
  const ketQua: YeuCauDaSoan[] = [];
  let boQua = 0;

  for (const r of tho) {
    const id = String(r?.id ?? "").trim();
    const yeuCau = String(r?.yeuCau ?? "").replace(/\s+/g, " ").trim();
    const d = theoId.get(id);
    if (!d || !yeuCau) { boQua++; continue; }
    ketQua.push({
      id,
      math_form: d.math_form,
      lesson: d.lesson,
      yeuCau,
      theoSach: d.cauMau.length === 0,
      chon: true,
    });
    theoId.delete(id);
  }

  // Dạng nào máy quên trả về thì tính là bỏ qua, để giao diện báo còn thiếu bao nhiêu
  boQua += theoId.size;
  return { ketQua, model: kq.model, soBoQua: boQua };
}

/**
 * Soạn cho nhiều dạng, tự chia lô và báo tiến độ.
 *
 * Lỗi ở một lô KHÔNG làm hỏng cả lượt chạy: giữ lại những lô đã xong rồi báo lô nào
 * hỏng, chứ chạy mười lô mà lô cuối hỏng rồi mất trắng cả chín lô trước thì quá phí.
 */
export async function soanYeuCauNhieuLo(
  ds: DangCanSoan[],
  cauHinh: CauHinhAI,
  onTienDo?: (moTa: string) => void,
): Promise<KetQuaSoanYeuCau & { loLoi: string[] }> {
  const ketQua: YeuCauDaSoan[] = [];
  const loLoi: string[] = [];
  let model = "";
  let soBoQua = 0;

  const soLo = Math.ceil(ds.length / SO_DANG_MOI_LUOT);
  for (let i = 0; i < soLo; i++) {
    const lo = ds.slice(i * SO_DANG_MOI_LUOT, (i + 1) * SO_DANG_MOI_LUOT);
    onTienDo?.(`Đang soạn lô ${i + 1}/${soLo} (${lo.length} dạng)...`);
    try {
      const kq = await soanYeuCauMotLo(lo, cauHinh);
      ketQua.push(...kq.ketQua);
      soBoQua += kq.soBoQua;
      if (kq.model) model = kq.model;
    } catch (e: any) {
      loLoi.push(`Lô ${i + 1}: ${e?.message || "lỗi không rõ"}`);
      soBoQua += lo.length;
    }
  }

  return { ketQua, model, soBoQua, loLoi };
}
