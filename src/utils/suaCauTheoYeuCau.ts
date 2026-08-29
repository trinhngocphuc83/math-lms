import { goiGeminiTrenTrinhDuyet, type CauHinhAI } from "@/utils/geminiBrowser";

/**
 * Sửa MỘT câu hỏi đang soạn theo yêu cầu của thầy cô, bằng lời.
 *
 * Khác với "soạn lại" ở trang ra đề (soanLaiCauTheoYeuCau.ts): ở đó máy sinh ra câu MỚI
 * cùng dạng để thay thế; ở đây máy SỬA đúng câu đang có - đổi một con số, viết lại cho
 * gọn, làm phương án nhiễu khó hơn - và giữ nguyên mọi thứ thầy cô không nhắc tới.
 *
 * Gọi phía trình duyệt để khỏi đụng trần 60 giây của Vercel, giống các đường AI khác.
 */

export interface CauDangSoan {
  question?: string;
  options?: any[];
  answerIndex?: number;
  exactAnswer?: string;
  sampleAnswer?: string;
  explanation?: string;
  type?: string;
  [k: string]: any;
}

/** Lấy ra mọi ảnh Markdown trong một đoạn chữ, theo đúng thứ tự xuất hiện. */
export const layAnhTrongChu = (chu: string): string[] =>
  (String(chu || '').match(/!\[[^\]]*\]\([^)\s]+(?:\s+"[^"]*")?\)/g) || []);

function taoPrompt(cau: CauDangSoan, yeuCau: string): string {
  const laDungSai = cau.type === 'true_false_cluster';
  const dsPhuongAn = (cau.options || []).map((o: any, i: number) =>
    typeof o === 'string'
      ? `  ${['A', 'B', 'C', 'D'][i]}. ${o}`
      : `  ${['a', 'b', 'c', 'd'][i]}) ${o?.content || ''}  [${o?.isTrue ? 'ĐÚNG' : 'SAI'}]`
  ).join('\n');

  return `Bạn là giáo viên đang sửa một câu hỏi trong đề. Hãy sửa theo đúng yêu cầu bên dưới.

CÂU HIỆN TẠI (dạng: ${cau.type || 'multiple_choice'}):
Đề bài:
${cau.question || '(chưa có)'}

${dsPhuongAn ? `Phương án:\n${dsPhuongAn}\n` : ''}${
  !laDungSai && cau.answerIndex !== undefined ? `Đáp án đúng: ${['A', 'B', 'C', 'D'][cau.answerIndex]}\n` : ''
}${cau.exactAnswer ? `Đáp án: ${cau.exactAnswer}\n` : ''}${
  cau.explanation ? `Lời giải:\n${cau.explanation}\n` : ''
}
YÊU CẦU CỦA THẦY CÔ: ${yeuCau}

QUY TẮC BẮT BUỘC:
1. CHỈ sửa đúng thứ được yêu cầu. Mọi phần khác giữ NGUYÊN VĂN, không tự ý viết lại cho hay.
2. TUYỆT ĐỐI KHÔNG đụng vào các đoạn ảnh dạng ![...](...) - chép lại y nguyên, đúng vị trí cũ.
   Không thêm ảnh mới, không đổi địa chỉ ảnh.
3. Công thức viết bằng LaTeX bọc trong dấu $...$ như câu gốc.
4. Sửa đề thì phải soát lại đáp án và lời giải cho khớp - đừng để đề một đằng đáp án một nẻo.
5. Trả về ĐÚNG một đối tượng JSON, không kèm lời dẫn:
{
  "question": "đề bài sau khi sửa",
  "options": ${laDungSai
    ? '[{"content":"ý a","isTrue":true}, {"content":"ý b","isTrue":false}, {"content":"ý c","isTrue":true}, {"content":"ý d","isTrue":false}]'
    : '["phương án A","phương án B","phương án C","phương án D"]'},
  ${laDungSai ? '' : '"answerIndex": 0,'}
  "exactAnswer": "${cau.exactAnswer !== undefined ? 'đáp án nếu là câu trả lời ngắn' : ''}",
  "explanation": "lời giải sau khi sửa",
  "daSua": "một câu ngắn nói rõ đã sửa những gì"
}`;
}

export interface KetQuaSuaCau {
  cauMoi: CauDangSoan;
  /** Máy tự thuật lại đã sửa gì - để thầy cô soát nhanh trước khi nhận. */
  daSua: string;
}

export async function suaCauTheoYeuCau(
  cau: CauDangSoan,
  yeuCau: string,
  cauHinh: CauHinhAI,
): Promise<KetQuaSuaCau> {
  const kq = await goiGeminiTrenTrinhDuyet(cauHinh, [{ text: taoPrompt(cau, yeuCau) }], {
    responseMimeType: "application/json",
    // Đây là việc SỬA chứ không phải sáng tác - để máy bay bổng thì nó viết lại cả câu
    temperature: 0.3,
  });

  let tho: any;
  try {
    tho = JSON.parse((kq.text.match(/\{[\s\S]*\}/) || ['{}'])[0]);
  } catch {
    throw new Error('Máy trả về dữ liệu không đọc được. Thử nói lại yêu cầu ngắn gọn hơn.');
  }
  if (!tho.question && !tho.options) {
    throw new Error('Máy không trả về nội dung câu hỏi nào.');
  }

  /*
   * ẢNH: lấy lại từ bản GỐC, không tin ảnh máy trả về.
   *
   * Dù lời dặn đã nói rõ đừng đụng vào ảnh, máy vẫn có lúc bịa địa chỉ hoặc bỏ quên. Đề
   * gốc có ảnh mà bản sửa không có thì chép ảnh gốc vào cuối đề - thà thừa một dòng ảnh
   * còn hơn mất hình của câu hỏi.
   */
  const anhGoc = layAnhTrongChu(cau.question || '');
  let deMoi = String(tho.question || cau.question || '');
  const anhMoi = layAnhTrongChu(deMoi);
  if (anhGoc.length > 0) {
    if (anhMoi.length === 0) {
      deMoi = deMoi.trimEnd() + '\n\n' + anhGoc.join('\n');
    } else {
      // Có ảnh nhưng có thể máy sửa địa chỉ - trả từng cái về đúng ảnh gốc theo thứ tự
      let i = 0;
      deMoi = deMoi.replace(
        /!\[[^\]]*\]\([^)\s]+(?:\s+"[^"]*")?\)/g,
        () => anhGoc[i++] ?? anhGoc[anhGoc.length - 1] ?? '',
      );
    }
  }

  const cauMoi: CauDangSoan = { ...cau, question: deMoi };

  if (Array.isArray(tho.options) && tho.options.length > 0) {
    cauMoi.options = tho.options;
  }
  if (typeof tho.answerIndex === 'number' && tho.answerIndex >= 0 && tho.answerIndex <= 3) {
    cauMoi.answerIndex = tho.answerIndex;
  }
  if (typeof tho.exactAnswer === 'string' && tho.exactAnswer.trim()) {
    cauMoi.exactAnswer = tho.exactAnswer.trim();
  }
  if (typeof tho.explanation === 'string' && tho.explanation.trim()) {
    cauMoi.explanation = tho.explanation.trim();
  }

  return { cauMoi, daSua: String(tho.daSua || '').trim() || 'Máy không nói rõ đã sửa gì.' };
}

/**
 * Sửa một ĐOẠN BÀI GIẢNG (văn xuôi) theo yêu cầu, khác với sửa câu hỏi ở trên.
 *
 * Bài giảng là chuỗi Markdown dài chứ không phải đối tượng có đề/phương án/đáp án, nên
 * phải có đường riêng: giữ nguyên cấu trúc tiêu đề, khối ```quiz``` và ảnh, chỉ sửa đúng
 * chỗ thầy cô dặn.
 */
export async function suaBaiGiangTheoYeuCau(
  noiDung: string,
  yeuCau: string,
  cauHinh: CauHinhAI,
): Promise<{ noiDungMoi: string; daSua: string }> {
  const prompt = `Bạn là giáo viên đang sửa một đoạn bài giảng. Sửa theo đúng yêu cầu bên dưới.

YÊU CẦU CỦA THẦY CÔ: ${yeuCau}

QUY TẮC BẮT BUỘC:
1. CHỈ sửa đúng thứ được yêu cầu. Phần khác giữ NGUYÊN VĂN, không tự viết lại cho hay.
2. TUYỆT ĐỐI KHÔNG đụng vào các khối \`\`\`quiz ... \`\`\` - chép lại y nguyên, đúng vị trí cũ.
3. TUYỆT ĐỐI KHÔNG đụng vào ảnh dạng ![...](...) - chép y nguyên, không đổi địa chỉ.
4. Giữ nguyên cấp tiêu đề (#, ##, ###) và dấu ngắt trang ---, trừ khi được yêu cầu đổi.
5. Công thức viết bằng LaTeX bọc trong $...$ như bản gốc.
6. Trả về ĐÚNG một đối tượng JSON, không kèm lời dẫn:
{ "noiDung": "toàn bộ đoạn sau khi sửa", "daSua": "một câu ngắn nói rõ đã sửa gì" }

ĐOẠN BÀI GIẢNG:

${String(noiDung || '')}`;

  const kq = await goiGeminiTrenTrinhDuyet(cauHinh, [{ text: prompt }], {
    responseMimeType: 'application/json',
    temperature: 0.3,
  });

  let tho: any;
  try {
    tho = JSON.parse((kq.text.match(/\{[\s\S]*\}/) || ['{}'])[0]);
  } catch {
    throw new Error('Máy trả về dữ liệu không đọc được. Thử nói lại yêu cầu ngắn gọn hơn.');
  }
  if (!tho.noiDung || typeof tho.noiDung !== 'string') {
    throw new Error('Máy không trả về nội dung bài giảng nào.');
  }

  /*
   * Soát lại khối quiz: máy hay "gọn lại" bằng cách nuốt mất câu hỏi. Số khối phải y
   * nguyên, thiếu là không nhận - thà bắt làm lại còn hơn mất câu.
   */
  const demQuiz = (t: string) => (t.match(/```quiz/g) || []).length;
  if (demQuiz(tho.noiDung) !== demQuiz(noiDung)) {
    throw new Error(
      `Máy làm mất câu hỏi trong bài (${demQuiz(noiDung)} → ${demQuiz(tho.noiDung)} khối). `
      + 'Không nhận bản này. Thử dặn ngắn gọn hơn, hoặc sửa tay.',
    );
  }

  return { noiDungMoi: tho.noiDung, daSua: String(tho.daSua || '').trim() || 'Máy không nói rõ đã sửa gì.' };
}
