// Cứu trường hợp AI trả lời DÀI QUÁ nên chuỗi JSON bị cắt cụt giữa chừng.
//
// Vì sao xảy ra: mỗi câu trả lời của Gemini Web có giới hạn độ dài. Bóc một đề 25-30 câu
// kèm lời giải chi tiết là chạm trần, câu trả lời đứt ngay giữa một chuỗi - kiểu
// `"question": "Một hộ dân định trồng đậu và cà trên diện tích $8a$. Nếu trồng đậu` rồi
// hết. Dán nguyên khối đó vào app thì hỏng cả lô, mà nhìn bằng mắt rất khó thấy đứt ở đâu.
//
// Ba việc ở đây:
//   1. LUAT_KHONG_CAT_CUT - lời dặn chèn vào mọi prompt thủ công, buộc AI thà ít câu chứ
//      không được đứt giữa chừng, và phải in [CÒN TIẾP] để biết còn nữa.
//   2. soatKhoiQuiz  - đọc phần thầy cô vừa dán: được mấy câu, có bị cụt không, và cắt ra
//      phần LÀNH LẶN để vẫn dùng được.
//   3. lenhNoiTiep   - sinh sẵn câu lệnh dán sang Gemini để nó làm nốt từ đúng chỗ dừng.

import { docJsonCauHoi } from './vaJson';

/** Lời dặn chống cắt cụt, chèn vào cuối mọi prompt thủ công. */
export const LUAT_KHONG_CAT_CUT = `
[QUY TẮC CHỐNG ĐỨT GIỮA CHỪNG - QUAN TRỌNG NHẤT, VI PHẠM LÀ HỎNG TOÀN BỘ]
Câu trả lời của bạn có giới hạn độ dài. TUYỆT ĐỐI KHÔNG được để đoạn mã đứt giữa chừng.
- Khi thấy sắp chạm giới hạn: DỪNG LẠI ở ranh giới GIỮA HAI CÂU HỎI, viết nốt dấu \`}\` của
  câu đang làm dở, đóng mảng bằng \`]\`, đóng khối bằng \`\`\` cho ĐÚNG CÚ PHÁP, rồi xuống dòng
  in đúng dòng này:
  [CÒN TIẾP: đã xong N câu]
  (N là số câu bạn vừa trả về trong tin nhắn này).
- TUYỆT ĐỐI KHÔNG bao giờ dừng ở giữa một chuỗi, giữa một công thức, hay giữa một object.
  Thà trả về ÍT CÂU HƠN nhưng đóng ngoặc đầy đủ, còn hơn nhiều câu mà đứt gãy.
- Khi tôi gõ "Tiếp tục", hãy làm nốt các câu CÒN LẠI trong một khối mã mới, đánh số tiếp
  chứ KHÔNG làm lại từ đầu và KHÔNG lặp lại câu đã trả về.`;

/** Kết quả soát đoạn văn bản thầy cô vừa dán. */
export interface KetQuaSoatDan {
  /** Có tìm thấy cấu trúc JSON nào không. */
  coJson: boolean;
  /** Số câu đọc được trọn vẹn. */
  soCau: number;
  /** Có bị cắt cụt giữa chừng không. */
  biCatCut: boolean;
  /** AI có tự báo [CÒN TIẾP] không. */
  coBaoConTiep: boolean;
  /** Văn bản đã dọn: phần cụt bị bỏ, ngoặc đóng đủ. Dán cái này vào bài là an toàn. */
  banSach: string;
  /** Vài chữ đầu của câu bị cụt, để thầy cô nhận ra đứt ở đâu. */
  cauBiCut: string;
}

/** Cắt chuỗi thành từng object `{...}` ở tầng ngoài cùng, bỏ qua ngoặc nằm trong chuỗi. */
function tachObject(s: string): { manh: string[]; hetO: number } {
  const manh: string[] = [];
  let sau = 0;
  let batDau = -1;
  let trongChuoi = false;
  let hetO = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' && s[i - 1] !== '\\') trongChuoi = !trongChuoi;
    if (trongChuoi) continue;
    if (c === '{') { if (sau === 0) batDau = i; sau++; }
    else if (c === '}') {
      sau--;
      if (sau === 0 && batDau !== -1) { manh.push(s.slice(batDau, i + 1)); batDau = -1; hetO = i + 1; }
    }
  }
  return { manh, hetO };
}

/** Lấy ra vài chữ đầu của câu hỏi trong một mẩu JSON dở dang, để thầy cô nhận mặt. */
function tenCauTrongManh(manh: string): string {
  const m = manh.match(/"question"\s*:\s*"((?:[^"\\]|\\.){0,90})/);
  if (!m) return '';
  return m[1].replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Soát đoạn thầy cô vừa dán từ Gemini.
 *
 * Không ném lỗi: kể cả khi cụt vẫn trả về phần lành lặn để dùng được ngay, chứ mất trắng
 * cả lô hai ba chục câu chỉ vì câu cuối đứt thì quá phí.
 */
export function soatKhoiQuiz(raw: string): KetQuaSoatDan {
  const goc = String(raw || '');
  const coBaoConTiep = /\[\s*C[ÒO]N\s*TI[ẾE]P/i.test(goc);

  /* Lấy phần thân JSON. Không đòi phải có dấu ] đóng: chính lúc bị cắt cụt là lúc thiếu
     nó, mà đó mới là lúc cần cứu nhất. */
  let than = goc;
  const rao = goc.match(/```(?:quiz|json)?\s*([\s\S]*?)(?:```|$)/i);
  if (rao) than = rao[1];
  const moMang = than.indexOf('[');
  if (moMang !== -1) than = than.slice(moMang + 1);

  const { manh, hetO } = tachObject(than);
  if (manh.length === 0) {
    return { coJson: false, soCau: 0, biCatCut: false, coBaoConTiep, banSach: goc, cauBiCut: '' };
  }

  /* Sau object trọn vẹn cuối cùng mà còn sót chữ (không kể dấu phẩy, ngoặc đóng, rào mã)
     thì nghĩa là câu tiếp theo đã bắt đầu rồi bị đứt. */
  const conLai = than.slice(hetO).replace(/```/g, '').replace(/[\s,\]]/g, '');
  const biCatCut = conLai.length > 0;

  /* Vá luôn mấy lỗi thường gặp của AI (gạch chéo LaTeX chưa nhân đôi, xuống dòng thật
     nằm trong chuỗi...) rồi mới dựng lại bản sạch - dùng chung bộ vá đang chạy cho đường
     quét AI, để bản chèn vào bài LUÔN là JSON đọc được, chứ không chỉ đủ ngoặc. */
  const thanSach = '[\n' + manh.join(',\n') + '\n]';
  let banSach = '```quiz\n' + thanSach + '\n```';
  try {
    const kq = docJsonCauHoi(thanSach);
    if (kq.items.length > 0) banSach = '```quiz\n' + JSON.stringify(kq.items, null, 1) + '\n```';
  } catch { /* vá không nổi thì giữ bản đã đóng ngoặc, còn hơn không có gì */ }

  return {
    coJson: true,
    soCau: manh.length,
    biCatCut,
    coBaoConTiep,
    banSach,
    cauBiCut: biCatCut ? tenCauTrongManh(than.slice(hetO)) : '',
  };
}

/* ============================ CỨU KHỐI CÂU HỎI HỎNG RÀO ============================ */

/**
 * Đoạn chữ này có phải khối câu hỏi bị hỏng rào mã không.
 *
 * Dùng để quyết định có bày nút "Dựng lại thành câu hỏi" trên khối hay không, nên phải
 * nhẹ: chỉ nhìn dấu hiệu, không thử đọc cả JSON.
 */
export function laKhoiQuizHong(txt: string): boolean {
  const t = String(txt || '').trim();
  return /"question"\s*:/.test(t) && /"type"\s*:/.test(t);
}

/**
 * Cứu một khối CHỮ thực ra là khối câu hỏi bị hỏng rào mã.
 *
 * Dán từ Gemini về hay gặp: câu trả lời bị cắt cụt nên thiếu dấu ``` đóng, hoặc dán hai
 * đợt liền nhau thành số dấu rào lẻ. Khi đó bộ tách khối không nhận ra đây là câu hỏi,
 * đẩy nguyên đoạn JSON thành khối Văn bản - trên màn hiện ra một đống "type":
 * "multiple_choice"... và công thức vỡ hết (\ge thành "ge", \frac thành "frac").
 *
 * Gỡ rào, vá JSON bằng đúng bộ vá đang dùng cho đường quét AI, rồi trả về danh sách câu.
 * Chỉ nhận khi đọc ra câu có đủ "type" và "question" - khối lý thuyết lỡ có đoạn JSON
 * minh hoạ thì không bị bắt nhầm.
 */
export function cuuKhoiQuizHong(txt: string): any[] | null {
  const t = String(txt || '').trim();
  if (!laKhoiQuizHong(t)) return null;

  const than = t
    .replace(/^`{3,}\s*(?:quiz|json)?\s*/i, '')   // rào mở còn sót
    .replace(/^(?:quiz|json)\s*/i, '')            // chữ "quiz" trơ lại sau khi rào bị ăn
    .replace(/`{3,}\s*$/, '')                     // rào đóng còn sót
    .trim();

  try {
    const kq = docJsonCauHoi(than);
    const items = kq.items.filter((x: any) => x && x.type && x.question);
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

/**
 * Nhờ AI dựng lại khi hỏng nặng quá, bộ vá tại chỗ chịu thua.
 *
 * Chỉ bảo AI SỬA LẠI ĐỊNH DẠNG, tuyệt đối không cho nó viết thêm câu mới hay đổi nội
 * dung - thầy cô cần đúng đề gốc, không cần đề do máy nghĩ ra.
 */
export async function dungLaiCauHoiBangAI(
  txt: string,
  onTienDo?: (moTa: string) => void,
): Promise<any[]> {
  const { layCauHinhAI, goiGeminiTrenTrinhDuyet } = await import('./geminiBrowser');
  onTienDo?.('Đang xin khoá AI...');
  const cauHinh = await layCauHinhAI();

  const prompt = `Đoạn dưới đây LẼ RA là một mảng JSON các câu hỏi, nhưng đã bị hỏng định dạng
(thiếu ngoặc, thiếu dấu nháy, dấu gạch chéo LaTeX chưa nhân đôi, hoặc bị cắt cụt).

NHIỆM VỤ: dựng lại thành MẢNG JSON HỢP LỆ.

QUY TẮC BẮT BUỘC:
- GIỮ NGUYÊN nội dung từng câu: đề bài, phương án, đáp án, lời giải. TUYỆT ĐỐI KHÔNG viết
  thêm câu mới, KHÔNG sửa nội dung toán học, KHÔNG bỏ bớt câu nào đọc được.
- Câu nào bị cắt cụt giữa chừng, không đủ dữ kiện để khôi phục, thì BỎ HẲN câu đó chứ
  KHÔNG bịa thêm cho đủ.
- Công thức LaTeX trong JSON phải nhân đôi dấu gạch chéo (\\frac, \\ge...).
- CHỈ trả về mảng JSON, không rào mã, không lời dẫn.

ĐOẠN CẦN DỰNG LẠI:
${txt}`;

  onTienDo?.('Máy đang dựng lại các câu...');
  const kq = await goiGeminiTrenTrinhDuyet(cauHinh, [{ text: prompt }], {
    responseMimeType: 'application/json',
    temperature: 0,
  });

  const doc = docJsonCauHoi(kq.text);
  const items = doc.items.filter((x: any) => x && x.type && x.question);
  if (items.length === 0) throw new Error('Máy cũng không dựng lại được đoạn này.');
  return items;
}

/**
 * Câu lệnh dán sang Gemini để nó làm nốt phần còn lại.
 *
 * Nói rõ đã có bao nhiêu câu và câu cuối cùng là câu nào, để AI biết bắt đầu từ đâu -
 * chỉ gõ "Tiếp tục" trơn thì nó hay làm lại từ đầu hoặc nhảy cóc.
 */
export function lenhNoiTiep(soCauDaCo: number, cauBiCut?: string): string {
  const nhac = cauBiCut
    ? `\nCâu bị đứt giữa chừng bắt đầu bằng: "${cauBiCut.slice(0, 80)}..." - hãy LÀM LẠI TRỌN VẸN câu này rồi đi tiếp.`
    : '';
  return `Tin nhắn vừa rồi bị cắt cụt giữa chừng. Tôi đã lấy được ${soCauDaCo} câu đầu tiên rồi.${nhac}

Hãy TIẾP TỤC từ câu thứ ${soCauDaCo + 1} cho đến hết, trong MỘT khối mã \`\`\`quiz mới.
- KHÔNG lặp lại ${soCauDaCo} câu đã trả về.
- KHÔNG viết lời dẫn, chỉ trả về khối mã.
- Giữ nguyên định dạng JSON và mọi quy tắc đã dặn ở trên.
${LUAT_KHONG_CAT_CUT}`;
}
