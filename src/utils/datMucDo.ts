/**
 * ĐẶT MỨC ĐỘ NHẬN THỨC cho những câu còn để trống.
 *
 * Vì sao tách riêng: bộ kiểm thử đề báo "N câu chưa ghi mức độ nhận thức - không soát được
 * tỉ lệ ma trận", nhưng cảnh báo ấy là cảnh báo CẢ ĐỀ, không gắn vào câu nào, nên khung
 * sửa từng câu không đụng tới được. Thầy cô nhìn cảnh báo rồi phải tự mở Ngân hàng lọc ra
 * từng câu mà điền tay - mà mức độ trống thì thường trống cả lô mấy chục câu.
 *
 * Không dùng lại `buildDetectFormsPrompt`: bộ ấy xếp cả Chương/Bài/Dạng, nặng hơn hẳn và
 * có thể xê dịch phân loại đang đúng. Ở đây chỉ cần đúng một trường.
 */
import { layCauHinhAI, goiGeminiTrenTrinhDuyet } from "./geminiBrowser";
import { VALID_DIFFICULTIES } from "./detectFormsPrompt";

/** Mã lưu trong cơ sở dữ liệu là '1'..'4'; chữ hiển thị là bốn mức của Công văn 7991. */
export const MA_MUC_DO: Record<string, string> = {
  'Nhận biết': '1', 'Thông hiểu': '2', 'Vận dụng': '3', 'Vận dụng cao': '4',
};

export interface CauCanMucDo {
  /* Để tuỳ chọn cho khớp `CauDeSoat` của bộ kiểm thử; câu không có mã thì bỏ qua vì
     không biết ghi mức độ vào đâu. */
  id?: string;
  content?: string | null;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  explanation?: string | null;
  question_type?: string | null;
}

const chu = (s: any) => String(s ?? '');
/* Hình vẽ là thẻ <img> base64 cỡ vài KB - gửi đi vừa tốn lượt vừa vô ích cho việc đoán
   mức độ, nên cắt bỏ hẳn thay vì thay bằng mốc như bên suaLoiKiemThu (ở đây không trả
   nội dung câu về nên không cần dựng lại hình). */
const gonCau = (s: any, n = 400) =>
  chu(s).replace(/<img\b[^>]*>/gi, '[hình]').replace(/\s+/g, ' ').trim().slice(0, n);

/**
 * Hỏi AI mức độ cho từng câu. Trả về map id -> mã '1'..'4'.
 *
 * Câu nào AI không trả lời, hoặc trả về giá trị lạ, thì KHÔNG có trong map - thà để trống
 * như cũ còn hơn đặt bừa một mức, vì tỉ lệ ma trận tính theo đúng cột này.
 */
export async function doanMucDoNhieuCau(
  ds: CauCanMucDo[],
  onTienDo?: (xong: number, tong: number) => void,
): Promise<Record<string, string>> {
  const ra: Record<string, string> = {};
  if (ds.length === 0) return ra;

  const CO_LO = 12;
  const cauHinh = await layCauHinhAI();

  const coMa = ds.filter(q => String(q.id || '').trim());
  for (let i = 0; i < coMa.length; i += CO_LO) {
    const lo = coMa.slice(i, i + CO_LO);
    const prompt = `Bạn là giáo viên Toán THPT. Hãy xếp MỨC ĐỘ NHẬN THỨC cho từng câu hỏi dưới đây.

Bốn mức, theo đúng Công văn 7991:
- "Nhận biết": nhớ lại định nghĩa, công thức, nhận ra đối tượng. Một bước là xong.
- "Thông hiểu": áp dụng trực tiếp một công thức, hai đến ba bước tính quen thuộc.
- "Vận dụng": phải ghép nhiều kiến thức, hoặc chuyển tình huống thực tế thành mô hình toán.
- "Vận dụng cao": nhiều bước, có tham số, có biện luận, hoặc cần một ý tưởng riêng.

NGUYÊN TẮC:
- Nhìn vào việc HỌC SINH PHẢI LÀM để ra đáp số, đừng nhìn độ dài đề.
- Câu nào không đủ căn cứ để xếp thì bỏ qua, KHÔNG đoán bừa.

DANH SÁCH CÂU (JSON):
${JSON.stringify(lo.map(q => ({
      id: q.id,
      loai: chu(q.question_type),
      de: gonCau(q.content),
      phuongAn: [q.option_a, q.option_b, q.option_c, q.option_d].map(x => gonCau(x, 120)).filter(Boolean),
      loiGiai: gonCau(q.explanation, 500),
    })), null, 1)}

Chỉ trả về JSON thuần, không kèm lời nào khác:
[{"id": "...", "mucDo": "Thông hiểu"}]`;

    try {
      const kq = await goiGeminiTrenTrinhDuyet(cauHinh, [{ text: prompt }], { temperature: 0.1 }, 90);
      const than = kq.text.replace(/```json|```/gi, '').trim();
      const doc = JSON.parse(than.slice(than.indexOf('['), than.lastIndexOf(']') + 1));
      for (const r of Array.isArray(doc) ? doc : []) {
        const ten = String(r?.mucDo || '').trim();
        if (!(VALID_DIFFICULTIES as readonly string[]).includes(ten)) continue;
        if (!lo.some(q => q.id === String(r?.id))) continue;
        ra[String(r.id)] = MA_MUC_DO[ten];
      }
    } catch {
      /* Lô hỏng thì bỏ qua lô ấy, những lô khác vẫn chạy tiếp - hỏng một lô không nên
         làm mất công cả mấy chục câu đã đoán xong. */
    }
    onTienDo?.(Math.min(i + CO_LO, coMa.length), coMa.length);
  }
  return ra;
}
