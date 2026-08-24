// Nhờ AI soạn ma trận đề từ đầu, cho trường hợp thầy cô chưa có ma trận nào trong tay.
//
// Khác hẳn docMaTranAI.ts: tệp kia ĐỌC một bảng có sẵn, tệp này SOẠN ra bảng mới.
//
// Nguyên tắc: AI chỉ được chọn trong những ô kho ĐANG CÓ CÂU, và app kiểm lại từng
// dòng trước khi nhận. AI rất hay bịa ra tên dạng nghe hợp lý mà kho không hề có -
// nhận bừa thì ma trận trông đẹp nhưng đến lúc chọn câu mới lòi ra là rỗng.

import { goiGeminiTrenTrinhDuyet, type CauHinhAI } from "./geminiBrowser";
import { bankTypeLabel, difficultyLabel, toBankType, type BankType } from "./questionTypes";
import { mucDo7991, soDiemVN, type KhuonDe } from "./deThi";

/** Một ô kho đang có câu, tức là một lựa chọn hợp lệ cho AI. */
export interface ODeChon {
  topic: string;
  lesson: string;
  math_form: string;
  question_type: BankType;
  difficulty: string;
  soCau: number;
}

export interface DongMaTranAI {
  topic: string;
  lesson: string;
  math_form: string;
  question_type: BankType;
  difficulty: string;
  soCau: number;
  /** Vì sao AI chọn dòng này - hiện cho thầy cô soát. */
  lyDo?: string;
}

export interface KetQuaSoanMaTran {
  dong: DongMaTranAI[];
  model: string;
  /** Dòng AI đề xuất nhưng kho không có - đã loại, giữ lại để báo cho thầy cô. */
  dongBiLoai: string[];
}

/** Rút gọn kho thành danh sách ô để nhét vào prompt. Cắt bớt nếu quá dài. */
function keKho(o: ODeChon[], toiDa = 220): string {
  return o.slice(0, toiDa)
    .map(x => `${x.topic} | ${x.lesson} | ${x.math_form} | ${x.question_type} | ${x.difficulty} | ${x.soCau} câu`)
    .join("\n");
}

function moTaChiTieu(khuon: KhuonDe): string {
  const d: string[] = [];
  for (const [ma, ct] of Object.entries(khuon.chiTieu || {})) {
    if (!ct || (!ct.soCau && !ct.diemMoiCau)) continue;
    const tong = (ct.soCau || 0) * (ct.diemMoiCau || 0);
    d.push(`- ${bankTypeLabel(ma)}: ${ct.soCau ? `${ct.soCau} câu` : "tự chia"}` +
      `, mỗi câu ${soDiemVN(ct.diemMoiCau)} điểm, tổng ${soDiemVN(tong)} điểm`);
  }
  return d.join("\n") || "- Tự chia sao cho tổng 10 điểm";
}

function taoPrompt(o: ODeChon[], khuon: KhuonDe, tenKhuon: string, ghiChu: string): string {
  return `Bạn là tổ trưởng chuyên môn đang lập MA TRẬN ĐỀ KIỂM TRA theo Công văn 7991/BGDĐT-GDTrH.

CẤU TRÚC ĐỀ PHẢI ĐẠT (khuôn "${tenKhuon}"):
${moTaChiTieu(khuon)}

TỈ LỆ MỨC ĐỘ nên bám: Biết khoảng 40%, Hiểu khoảng 30%, Vận dụng khoảng 30% tổng số câu.
Mã mức độ: 1 = Biết, 2 = Hiểu, 3 và 4 = Vận dụng.

DANH SÁCH CÁC Ô NGÂN HÀNG ĐANG CÓ CÂU (Chương | Bài | Dạng | Loại | Mức | Số câu có):
${keKho(o)}

Nhiệm vụ: phân bổ số câu vào các ô trên sao cho đủ cấu trúc đề.

CHỈ trả về một mảng JSON, không giải thích gì thêm:
[
  {
    "topic": "chép NGUYÊN VĂN cột Chương",
    "lesson": "chép NGUYÊN VĂN cột Bài",
    "math_form": "chép NGUYÊN VĂN cột Dạng",
    "question_type": "NLC hoặc DS hoặc TLN hoặc TL",
    "difficulty": "1 hoặc 2 hoặc 3",
    "soCau": 2,
    "lyDo": "một câu ngắn vì sao chọn dạng này"
  }
]

QUY TẮC BẮT BUỘC:
1. CHỈ được chọn những ô CÓ TRONG DANH SÁCH TRÊN. Tuyệt đối không bịa thêm tên chương,
   tên bài hay tên dạng khác - kho không có thì đến lúc chọn câu sẽ rỗng.
2. Ba trường topic, lesson, math_form phải CHÉP NGUYÊN VĂN, không sửa chữ, không rút gọn.
3. "soCau" của mỗi dòng KHÔNG ĐƯỢC VƯỢT số câu kho đang có ở ô đó.
4. Trải đều qua nhiều Bài khác nhau, đừng dồn hết vào một bài. Bài nào là trọng tâm
   chương trình thì cho nhiều câu hơn.
5. Tổng số câu từng loại phải khớp cấu trúc đề đã nêu. Nếu kho không đủ để khớp, cứ lấy
   tối đa những gì có và bỏ qua phần thiếu - đừng bịa ô mới cho đủ số.
6. Không lặp lại cùng một bộ (Bài, Dạng, Loại, Mức) ở hai dòng khác nhau.${ghiChu ? `\n\nYÊU CẦU THÊM CỦA GIÁO VIÊN: ${ghiChu}` : ""}`;
}

/** Bóc mảng JSON khỏi phần chữ AI trả về. */
function bocMang(raw: string): any[] {
  let t = String(raw || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const d = t.indexOf("["), c = t.lastIndexOf("]");
  if (d < 0 || c < d) throw new Error("Máy không trả về đúng dạng bảng.");
  const p = JSON.parse(t.slice(d, c + 1));
  if (!Array.isArray(p)) throw new Error("Máy không trả về đúng dạng bảng.");
  return p;
}

const chuan = (s: any) => String(s ?? "").replace(/\s+/g, " ").trim();

/**
 * Nhờ AI soạn ma trận.
 *
 * Mỗi dòng AI trả về đều phải khớp CHÍNH XÁC một ô trong danh sách kho; dòng nào không
 * khớp thì loại và ghi lại để báo. Đây là chỗ phải chặt tay: đo trên thực tế, AI hay
 * trả về tên dạng na ná nhưng không có thật, mà ma trận có dạng ma thì đến bước chọn
 * câu mới phát hiện, lúc đó thầy cô đã tưởng xong việc.
 */
export async function soanMaTranBangAI(
  oKho: ODeChon[],
  khuon: KhuonDe,
  tenKhuon: string,
  ghiChu: string,
  cauHinh: CauHinhAI,
  onTienDo?: (moTa: string) => void,
): Promise<KetQuaSoanMaTran> {
  if (oKho.length === 0) throw new Error("Kho chưa có câu nào trong phạm vi đang chọn.");

  onTienDo?.("Máy đang phân bổ số câu theo cấu trúc đề...");
  const kq = await goiGeminiTrenTrinhDuyet(cauHinh, [{ text: taoPrompt(oKho, khuon, tenKhuon, ghiChu) }], {
    responseMimeType: "application/json",
    temperature: 0.4,   // cần bám chặt danh sách kho, không cần bay bổng
  });

  const tho = bocMang(kq.text);
  const dong: DongMaTranAI[] = [];
  const dongBiLoai: string[] = [];
  const daCo = new Set<string>();

  for (const r of tho) {
    const topic = chuan(r?.topic);
    const lesson = chuan(r?.lesson);
    const math_form = chuan(r?.math_form);
    const loai = toBankType(r?.question_type) || "NLC";
    const muc = /^[1-4]$/.test(String(r?.difficulty ?? "")) ? String(r.difficulty) : "1";
    const soCau = Math.floor(Number(r?.soCau) || 0);

    const nhan = `${lesson || "(không rõ bài)"} · ${math_form || "(không rõ dạng)"} · ${bankTypeLabel(loai)} · ${difficultyLabel(muc)}`;
    if (soCau <= 0) { dongBiLoai.push(`${nhan} — số câu bằng 0`); continue; }

    const o = oKho.find(x =>
      chuan(x.topic) === topic && chuan(x.lesson) === lesson &&
      chuan(x.math_form) === math_form && x.question_type === loai && String(x.difficulty) === muc);

    if (!o) { dongBiLoai.push(`${nhan} — kho không có ô này`); continue; }

    const khoa = `${o.math_form}|${o.question_type}|${o.difficulty}`;
    if (daCo.has(khoa)) { dongBiLoai.push(`${nhan} — trùng dòng đã có`); continue; }
    daCo.add(khoa);

    dong.push({
      topic: o.topic, lesson: o.lesson, math_form: o.math_form,
      question_type: o.question_type, difficulty: o.difficulty,
      // Kẹp theo kho ở đây là ĐÚNG, khác với ô nhập tay: đây là số máy tự nghĩ ra,
      // để nó vượt kho thì thầy cô mở ra đã thấy ngay một bảng đầy cảnh báo đỏ.
      soCau: Math.min(soCau, o.soCau),
      lyDo: chuan(r?.lyDo) || undefined,
    });
  }

  return { dong, model: kq.model, dongBiLoai };
}

/** Đối chiếu ma trận vừa soạn với chỉ tiêu của khuôn đề, để giao diện báo lệch chỗ nào. */
export function doiChieuChiTieu(dong: DongMaTranAI[], khuon: KhuonDe) {
  const ra: { loai: BankType; can: number; co: number }[] = [];
  for (const [ma, ct] of Object.entries(khuon.chiTieu || {})) {
    if (!ct?.soCau) continue;
    const co = dong.filter(d => d.question_type === ma).reduce((s, d) => s + d.soCau, 0);
    ra.push({ loai: ma as BankType, can: ct.soCau, co });
  }
  return ra;
}

/** Đếm số câu theo ba mức của Công văn 7991, để hiện tỉ lệ Biết - Hiểu - Vận dụng. */
export function demTheoMuc(dong: DongMaTranAI[]) {
  const d = { "Biết": 0, "Hiểu": 0, "Vận dụng": 0 } as Record<string, number>;
  for (const x of dong) d[mucDo7991(x.difficulty)] += x.soCau;
  return d;
}
