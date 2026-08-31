/**
 * Dán ẢNH một câu hỏi vào ô soạn thảo → ra ngay KHỐI CÂU HỎI đàng hoàng.
 *
 * Vì sao cần: đường dán mã JSON từ Gemini hay đứt giữa chừng, có câu ra méo hoặc mất
 * hẳn. Lúc đó thầy cô đang cầm sẵn cái đề - chỉ việc chụp/cắt đúng câu đó rồi dán vào
 * ô đang soạn, khỏi phải mò sửa mã JSON hay bắt AI làm lại cả lượt.
 *
 * Trả về ĐÚNG hình dạng khối câu hỏi của trang soạn bài (type/question/options/
 * answerIndex/exactAnswer/answer) chứ không phải hình dạng của Ngân hàng câu hỏi -
 * hai bên khác trường nhau, trộn vào là khối hiện ra trống trơn.
 */

import { docJsonCauHoi } from './vaJson';
import { filesToGeminiParts } from './aiQuestionScan';
import { goiGeminiTrenTrinhDuyet, layCauHinhAI } from './geminiBrowser';

/** Chỗ AI đánh dấu "câu này có hình" để ta thay bằng chính tấm ảnh vừa dán. */
export const DAU_CO_HINH = '[CÓ HÌNH ẢNH KÈM THEO]';

const LOI_DAN = `Trong (các) ảnh này có câu hỏi/bài tập. Hãy BÓC RA thành JSON.

QUY TẮC BẮT BUỘC:
1. CHÉP ĐÚNG NGUYÊN VĂN đề bài, phương án và đáp án trong ảnh. TUYỆT ĐỐI KHÔNG tự nghĩ
   thêm câu mới, KHÔNG đổi số liệu, KHÔNG bỏ bớt phương án.
2. Ảnh có mấy câu thì trả về bấy nhiêu phần tử, theo đúng thứ tự trong ảnh. Bỏ chữ
   "Câu 1.", "Bài 2." ở đầu đề - hệ thống tự đánh số lại.
3. Công thức toán bọc trong $...$ (VD: $x^2 \\ge 4$). KHÔNG bọc chữ tiếng Việt trong $.
   Phân số dùng \\frac{tử}{mẫu}, góc dùng \\widehat{...}, hệ dùng \\begin{cases}...\\end{cases}.
4. Trong chuỗi JSON, MỌI dấu gạch chéo phải NHÂN ĐÔI: viết \\\\frac, \\\\ge, \\\\Rightarrow.
5. Câu nào có hình vẽ/đồ thị/bảng biến thiên thì chèn đúng chữ ${DAU_CO_HINH} vào ĐÚNG
   CHỖ hình xuất hiện trong đề, KHÔNG mô tả hình bằng lời.
6. Đề trong ảnh KHÔNG cho đáp án thì tự giải rồi điền đáp án đúng, và ghi lời giải vào
   trường "answer".
7. CHỈ trả về mảng JSON, không rào mã, không lời dẫn, không cắt cụt giữa chừng.

HÌNH DẠNG TỪNG LOẠI:
[
  { "type": "multiple_choice", "question": "...", "options": ["...","...","...","..."],
    "answerIndex": 0, "answer": "lời giải chi tiết" },
  { "type": "true_false_cluster", "question": "dẫn đề chung",
    "options": [ { "id": "a", "content": "...", "isTrue": true },
                 { "id": "b", "content": "...", "isTrue": false } ],
    "answer": "lời giải" },
  { "type": "short_answer", "question": "...", "exactAnswer": "7", "answer": "lời giải" },
  { "type": "essay", "question": "...", "answer": "lời giải chi tiết" }
]`;

/**
 * Đưa một tấm ảnh lên kho ảnh bài giảng, trả về địa chỉ công khai.
 *
 * Tách riêng ở đây để ô soạn thảo và đường đọc câu hỏi dùng chung một lối tải, khỏi
 * mỗi nơi một kiểu đặt tên tệp.
 */
export async function taiAnhLenKho(file: File): Promise<string> {
  const { createClient } = await import('@/utils/supabase/client');
  const supabase = createClient();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpg`;
  const filePath = `editor_images/${fileName}`;

  const { error } = await supabase.storage.from('lesson_images').upload(filePath, file);
  if (error) throw error;

  return supabase.storage.from('lesson_images').getPublicUrl(filePath).data.publicUrl;
}

/**
 * Đọc (các) ảnh thành danh sách khối câu hỏi.
 *
 * @param onTienDo Báo đang làm tới đâu, để ô soạn thảo hiện chữ chờ cho đỡ sốt ruột.
 */
export async function docCauHoiTuAnh(
  files: File[],
  onTienDo?: (moTa: string) => void,
): Promise<any[]> {
  if (files.length === 0) throw new Error('Chưa có ảnh nào để đọc.');

  onTienDo?.('Đang xin khoá AI...');
  const cauHinh = await layCauHinhAI();

  onTienDo?.('Máy đang đọc ảnh...');
  const parts = await filesToGeminiParts(files);
  const kq = await goiGeminiTrenTrinhDuyet(cauHinh, [{ text: LOI_DAN }, ...parts], {
    responseMimeType: 'application/json',
    temperature: 0,
  });

  const doc = docJsonCauHoi(kq.text);
  const items = doc.items.filter((x: any) => x && x.type && x.question);
  if (items.length === 0) throw new Error('Không đọc ra câu hỏi nào trong ảnh này.');

  /* Bỏ chữ "Câu 3." lỡ còn sót ở đầu đề - số thứ tự do khối tự đánh lại. */
  items.forEach((it: any) => {
    it.question = String(it.question).replace(/^(Câu|Bài)\s*\d+[\.\:\-\s]*/i, '');
  });

  return items;
}

/**
 * Gắn chính tấm ảnh vừa dán vào câu nào AI bảo là "có hình".
 *
 * Không cắt cúp gì cả: ảnh thầy cô dán vào thường đã là đúng một câu, để nguyên còn
 * hơn cắt trượt mất nửa hình.
 */
export function ganAnhVaoCau(items: any[], diaChiAnh: string): void {
  const anhMd = `\n\n![Hình vẽ](${diaChiAnh})\n\n`;
  items.forEach((it: any) => {
    if (String(it.question || '').includes(DAU_CO_HINH)) {
      it.question = String(it.question).split(DAU_CO_HINH).join(anhMd);
    }
  });
}

/** Câu nào AI báo có hình mà chưa gắn ảnh - để biết có cần tải ảnh lên hay không. */
export function coCauCanAnh(items: any[]): boolean {
  return items.some((it: any) => String(it?.question || '').includes(DAU_CO_HINH));
}
