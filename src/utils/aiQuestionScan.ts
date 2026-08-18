// Lõi dùng chung để quét ảnh/PDF bằng AI và bóc tách thành câu hỏi cho Ngân hàng.
// Trước đây logic này nằm nguyên trong src/app/admin/questions/editor/page.tsx
// (trang "Soạn câu hỏi 1 lượt"). Tách ra đây để trang "Hàng đợi tự động"
// (src/app/admin/questions/batch-queue/page.tsx) dùng lại đúng 1 chỗ, không
// copy lại prompt hàng trăm dòng - sửa 1 nơi, cả 2 trang cùng được sửa.

import { toBankType, toDifficultyCode } from "./questionTypes";

export interface QuestionData {
  temp_id?: string;
  question_id?: string;
  grade: string;
  subject: string;
  topic: string;
  lesson: string;
  math_form: string;
  question_type: string;
  difficulty: string;
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  image_url?: string;
  isDuplicate?: boolean;
  duplicateId?: string;
  isNewTopic?: boolean;
  isNewLesson?: boolean;
  isNewMathForm?: boolean;
  /** Khung tọa độ (chuẩn hóa 0-1000) của hình vẽ/đồ thị trong ảnh nguồn, do AI xác định - dùng để tự động cắt ảnh. */
  viTriHinhAnh?: { fileIndex: number; ymin: number; xmin: number; ymax: number; xmax: number };
}

/**
 * Dấu hiệu câu hỏi CẦN CHÈN ẢNH mà chưa có ảnh.
 *
 * Bản cũ chỉ dò "HÌNH VẼ | ĐỒ THỊ | như hình | BẢNG BIẾN THIÊN" nên bỏ sót hàng
 * loạt câu AI trả về dạng "[CÓ HÌNH ẢNH KÈM THEO]" (chứa "HÌNH ẢNH" chứ không
 * phải "HÌNH VẼ") - Bản đồ câu hỏi không báo động, giáo viên lưu vào ngân hàng
 * mà thiếu ảnh. Gom về một biểu thức bao quát cả placeholder trong ngoặc vuông.
 *
 * CỐ Ý KHÔNG dò riêng từ "ẢNH" trong ngoặc vuông: chữ "CẢNH" (trong "[CẢNH BÁO LỖI
 * ĐỀ]") chứa sẵn chuỗi con "ẢNH" nên mọi câu bị AI cảnh báo đều bị báo nhầm là thiếu
 * ảnh - và tệ hơn, STRIP bên dưới xóa luôn cả dòng cảnh báo đó khỏi đề bài. Rà ngân
 * hàng thật: mọi marker ảnh đều có chữ "HÌNH", nên chỉ cần "HÌNH" là đủ, không sót.
 */
export const IMAGE_NEEDED_REGEX = /\[IMAGE_PLACEHOLDER\]|\[[^\]]*(?:HÌNH|BẢNG|ĐỒ THỊ|CHÚ Ý)[^\]]*\]|HÌNH VẼ|HÌNH ẢNH|ĐỒ THỊ|BẢNG BIẾN THIÊN|BẢNG BIỂU|như hình|hình bên/i;

/**
 * Chỉ khớp marker dạng NGOẶC VUÔNG ("[HÌNH VẼ]", "[CÓ HÌNH ẢNH KÈM THEO]"...) - dùng
 * để XÓA marker sau khi đã tự động cắt ảnh xong. Không được dùng IMAGE_NEEDED_REGEX
 * (bản dò tìm) cho việc xóa: nó còn khớp cả cụm chữ thường như "như hình", "hình bên"
 * vốn có thể xuất hiện tự nhiên GIỮA câu (VD "...cạnh a như hình vẽ bên, tính...") -
 * nếu đem .replace() nguyên câu đó, phần đầu câu (chữ thường) bị xóa nhầm trước khi
 * đến marker ngoặc vuông thật sự ở cuối câu, làm hỏng văn bản đề bài. Có cờ "g" vì
 * .replace() không cờ "g" chỉ xóa đúng 1 lần khớp đầu tiên tìm thấy.
 */
export const IMAGE_PLACEHOLDER_STRIP_REGEX = /\[IMAGE_PLACEHOLDER\]|\[[^\]]*(?:HÌNH|BẢNG|ĐỒ THỊ|CHÚ Ý)[^\]]*\]/gi;

/** Nội dung đã có ảnh chèn sẵn dạng markdown `![...](...)` hay chưa. */
export const daChenAnh = (text: string | null | undefined): boolean =>
  /!\[[^\]]*\]\([^)]+\)/.test(text || '');

/**
 * Câu hỏi này CÒN CẦN chèn ảnh hay không.
 *
 * Phải kiểm tra "đã có ảnh" TRƯỚC khi dò dấu hiệu cần ảnh, vì chính đoạn markdown ảnh
 * vừa chèn - `![Hình ảnh](https://...)` - lại khớp luôn IMAGE_NEEDED_REGEX (nó chứa
 * "[Hình ảnh]"). Thiếu bước này thì câu ĐÃ chèn ảnh xong vẫn bị báo đỏ "thiếu ảnh"
 * vĩnh viễn, người dùng không biết còn câu nào thật sự cần xử lý.
 */
export const canChenAnh = (
  text: string | null | undefined,
  imageUrl?: string | null,
): boolean => {
  if (imageUrl) return false;
  if (daChenAnh(text)) return false;
  return IMAGE_NEEDED_REGEX.test(text || '');
};

/* ============ CẢNH BÁO AI ĐÃ SỬA / NGHI SAI ĐỀ ============ */

/**
 * Dấu hiệu AI đã can thiệp vào đề gốc hoặc nghi đề bị sai.
 *
 * Câu lệnh chỉ dặn AI dùng đúng "[CÂU HỎI CÓ THỂ BỊ SAI ĐỀ, ĐÃ SỬA LẠI]", nhưng rà
 * ngân hàng thật thì AI còn tự đặt ra nhiều kiểu khác: "[CẢNH BÁO LỖI ĐỀ]" (hay gặp
 * nhất), "[CẢNH BÁO LỖI GIẢI]", hoặc kèm mô tả sau dấu hai chấm. Dò cứng đúng một
 * chuỗi thì bỏ sót quá nửa, nên bắt theo TỪ KHOÁ bên trong ngoặc vuông.
 *
 * Không đưa "CHÚ Ý" vào đây: từ đó đã thuộc nhóm marker ảnh (IMAGE_NEEDED_REGEX).
 */
export const AI_WARNING_REGEX =
  /\[[^\]]*(?:SAI ĐỀ|SỬA LẠI|CẢNH BÁO|LỖI ĐỀ|LỖI GIẢI)[^\]]*\]/i;

/** Câu hỏi có bị AI cảnh báo sai đề / đã sửa lại hay không (soi cả đề bài lẫn lời giải). */
export const coCanhBaoAI = (
  content: string | null | undefined,
  explanation?: string | null,
): boolean => AI_WARNING_REGEX.test(`${content || ''}\n${explanation || ''}`);

/** Lấy nguyên câu cảnh báo để hiện lên chú thích, giúp biết ngay AI đã sửa gì. */
export const layCanhBaoAI = (
  content: string | null | undefined,
  explanation?: string | null,
): string => {
  const m = `${content || ''}\n${explanation || ''}`.match(AI_WARNING_REGEX);
  return m ? m[0].replace(/^\[|\]$/g, '').trim() : '';
};

/* ============ CÂU ĐÚNG/SAI: TÁCH 4 Ý RA 4 MỆNH ĐỀ ============ */

/**
 * Đưa đáp án đúng của câu Đúng/Sai về chuỗi 4 ký tự Đ/S.
 *
 * AI hay trả về đủ kiểu: "a) Đ, b) S, c) Đ, d) Đ", "Đ S Đ S", "ĐSĐĐ", "DSDD"...
 * Nơi chấm điểm và nơi hiển thị đều mong đợi đúng 4 ký tự liền nhau, nên phải gom
 * về một dạng - nếu không, ô đáp án hiện lộn xộn ("SD D, b) Đ, c) S, d) Đ").
 */
export function chuanHoaDapAnDungSai(raw: string | null | undefined): string {
  const s = String(raw || '');
  if (!s.trim()) return '';
  // Ưu tiên dạng có nhãn ý: lấy chữ Đ/S (hoặc "Đúng"/"Sai") đứng ngay sau "a)", "b)"...
  //
  // Không dùng \b sau chữ Đ: "Đ" nằm ngoài bảng chữ Latin nên JS không coi là ký tự từ,
  // "c) Đ," không hề khớp - lúc đó chỉ nhặt được vài ý rồi trả về chuỗi cụt ("SS").
  const theoNhan = [...s.matchAll(/(?:^|[^A-Za-z])([a-dA-D])\s*[).:-]\s*([ĐđDdSs])/g)];
  if (theoNhan.length >= 2) {
    const map: Record<string, string> = {};
    theoNhan.forEach(m => { map[m[1].toLowerCase()] = /[ĐđDd]/.test(m[2]) ? 'Đ' : 'S'; });
    const ra = ['a', 'b', 'c', 'd'].map(k => map[k] || '').join('');
    // Chỉ nhận khi gom đủ cả 4 ý; thiếu ý nào thì để nhánh dưới nhặt lại cho chắc.
    if (ra.length === 4) return ra;
  }
  // Còn lại: nhặt mọi ký tự Đ/S theo thứ tự xuất hiện
  const chu = s.replace(/[^ĐđDdSs]/g, '');
  return [...chu].map(c => (/[ĐđDd]/.test(c) ? 'Đ' : 'S')).join('').slice(0, 4);
}

/**
 * Tách 4 ý a) b) c) d) đang nằm lẫn trong đề bài của câu Đúng/Sai.
 *
 * AI thường trả nguyên cả 4 ý trong "noiDung" và bỏ trống dapAnA..D, khiến 4 ô Mệnh đề
 * trống trơn còn đề bài thì dài dòng lặp lại. Hàm này gỡ 4 ý ra, trả về phần dẫn đã
 * sạch để không hiển thị trùng hai lần.
 *
 * Trả về null nếu không tách được đủ 4 ý (không đoán bừa, giữ nguyên nội dung gốc).
 */
export function tachYDungSai(content: string | null | undefined): { dan: string; y: string[] } | null {
  const s = String(content || '');
  if (!s.trim()) return null;

  // Mỗi ý bắt đầu bằng "a)" / "a." / "a:" ở ĐẦU DÒNG để không cắt nhầm chữ "a)" nằm
  // giữa câu văn. Chấp nhận cả dấu xuống dòng THẬT lẫn "\n" viết dạng chữ (hai ký tự) -
  // rất nhiều câu trong ngân hàng lưu theo kiểu sau, bỏ sót thì không tách được ý nào.
  const re = /(?:^|\n|\\n)\s*([a-d])\s*[).:]\s*/g;
  const moc: { chu: string; batDau: number; ketThuc: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    moc.push({ chu: m[1], batDau: m.index, ketThuc: m.index + m[0].length });
  }
  if (moc.length < 4) return null;

  // Chỉ nhận đúng bộ a→b→c→d liên tiếp (phòng đề có nhiều cụm a) rải rác)
  const bo = moc.filter((x, i) => x.chu === ['a', 'b', 'c', 'd'][i % 4]).slice(0, 4);
  if (bo.length < 4 || bo.map(x => x.chu).join('') !== 'abcd') return null;

  const y = bo.map((x, i) => {
    const het = i < 3 ? bo[i + 1].batDau : s.length;
    return s.slice(x.ketThuc, het).trim();
  });
  if (y.some(t => !t)) return null;

  return { dan: s.slice(0, bo[0].batDau).trim(), y };
}

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

export const filesToGeminiParts = async (files: File[]) => {
  return Promise.all(
    files.map(async (file) => {
      const base64Data = await fileToBase64(file);
      return { inlineData: { data: base64Data, mimeType: file.type } };
    })
  );
};

export interface ScanPromptContext {
  globalGrade: string;
  globalSubject: string;
  globalTopics: string[];
  globalLesson: string;
  uniqueLessons: string[];
  uniqueForms: string[];
}

export function buildScanPrompt(ctx: ScanPromptContext): string {
  const { globalGrade, globalSubject, globalTopics, globalLesson, uniqueLessons, uniqueForms } = ctx;
  const topicHint = globalTopics.length === 1 ? globalTopics[0] : 'Tự suy luận';
  const topicComment = globalTopics.length === 1
    ? '// BẮT BUỘC: GIỮ NGUYÊN CHUỖI NÀY, TUYỆT ĐỐI KHÔNG ĐƯỢC SỬA ĐỔI BẤT KỲ KÝ TỰ NÀO.'
    : '// BẮT BUỘC: Tên Chương hoặc Chủ đề (VD: Chương I. Phương trình). PHẢI LẤY TỪ DANH SÁCH BÊN DƯỚI.';

  const contextCategories = `
DANH SÁCH BÀI HỌC ĐÃ CÓ TRONG HỆ THỐNG:
${uniqueLessons.map((l) => `- ${l}`).join("\n")}

DANH SÁCH DẠNG TOÁN ĐÃ CÓ TRONG HỆ THỐNG:
${uniqueForms.map((f) => `- ${f}`).join("\n")}
`;

  return `TRƯỚC KHI BẮT ĐẦU, BẠN PHẢI:
1. Đọc THẬT KỸ TOÀN BỘ nội dung ảnh/file từ đầu đến cuối, không bỏ sót bất kỳ câu hỏi hay hình ảnh nào.
2. Đọc kỹ TOÀN BỘ yêu cầu trong prompt này trước khi trả lời. Mỗi quy tắc đều quan trọng.
3. Kiểm tra lại output JSON trước khi gửi để đảm bảo ĐÚNG cấu trúc, ĐÚNG nội dung và KHÔNG thiếu trường nào.

Bạn là chuyên gia Toán học. Hãy đọc (các) ảnh/file PDF này và bóc tách TẤT CẢ các câu hỏi có trong đó.
Trả về MỘT MẢNG JSON duy nhất (bắt đầu bằng [ và kết thúc bằng ]) chứa các object theo cấu trúc:
[
  {
    "lop": "${globalGrade || 'Tự suy luận'}",
    "phanMon": "${globalSubject || 'Tự suy luận'}",
    "chuyenDe": "${topicHint}", ${topicComment}
    "tenBai": "${globalLesson || 'Tự suy luận'}", ${globalLesson ? '// BẮT BUỘC: GIỮ NGUYÊN CHUỖI NÀY, TUYỆT ĐỐI KHÔNG ĐƯỢC SỬA ĐỔI BẤT KỲ KÝ TỰ NÀO.' : '// SO KHỚP VỚI DANH SÁCH BÊN DƯỚI. Nếu có bài tương tự, PHẢI COPY CHÍNH XÁC.'}
    "dangToan": "Tự suy luận", // SO KHỚP VỚI DANH SÁCH BÊN DƯỚI. Nếu có dạng tương tự, PHẢI COPY CHÍNH XÁC.
    "loaiCauHoi": "Tự suy luận (CHỈ ĐIỀN 1 TRONG 4: NLC, DS, TLN, TL)", // NLC (Trắc nghiệm), DS (Đúng/Sai), TLN (Trả lời ngắn), TL (Tự luận)
    "mucDo": "Tự suy luận (CHỈ ĐIỀN 1, 2, 3 HOẶC 4)", // 1(Nhận biết), 2(Thông hiểu), 3(Vận dụng), 4(Vận dụng cao)
    "noiDung": "Đề bài (BẮT BUỘC dùng LaTeX bọc trong $...$)",
    "dapAnA": "Nội dung A", "dapAnB": "Nội dung B", "dapAnC": "Nội dung C", "dapAnD": "Nội dung D",
    "dapAnDung": "A",
    "loiGiai": "Phương pháp giải:\\n[Ghi phương pháp ở đây]\\n\\nLời giải:\\n[Ghi lời giải chi tiết ở đây. BẮT BUỘC dùng ký tự \\n để xuống dòng cho từng ý/bước giải để dễ đọc!]",
    "isMultiLesson": false, // CHỈ GÁN TRUE NẾU LÀ CÂU HỎI ĐÚNG/SAI (DS) MÀ CÁC Ý NHỎ NẰM Ở NHIỀU BÀI HỌC KHÁC NHAU. MẶC ĐỊNH LÀ FALSE.
    "viTriHinhAnh": null // CHỈ ĐIỀN NẾU "noiDung" CÓ CHỨA "[HÌNH VẼ]"/"[CÓ HÌNH ẢNH KÈM THEO]": object {"fileIndex": (số thứ tự file ảnh chứa hình đó, đếm từ 0 theo đúng thứ tự file được gửi lên), "ymin": ..., "xmin": ..., "ymax": ..., "xmax": ...} - toạ độ khung bao quanh CHÍNH XÁC vùng hình vẽ/đồ thị/bảng đó trong ảnh gốc, chuẩn hóa theo thang 0-1000 (0=mép trên/trái, 1000=mép dưới/phải). Nếu không xác định được rõ ràng vị trí, để null - TUYỆT ĐỐI KHÔNG đoán bừa.
  }
]
  YÊU CẦU CỰC QUAN TRỌNG VỀ BÓC TÁCH: Bạn phải phân tích và bóc tách RẠCH RÒI 3 trường "chuyenDe" (Chương), "tenBai" (Bài học), và "dangToan" (Dạng toán). Tuyệt đối không gộp chung nội dung của chúng vào nhau. ĐẶC BIỆT CHÚ Ý TRƯỜNG "loaiCauHoi", nếu là bài tự luận chứng minh/tính toán (không có ABCD), BẮT BUỘC phải điền "TL".

  CƠ SỞ DỮ LIỆU ĐỐI CHIẾU:
  Bạn BẮT BUỘC PHẢI PHÂN LOẠI câu hỏi vào các Tên bài học và Dạng toán có trong danh sách dưới đây nếu có sự tương đồng. TUYỆT ĐỐI HẠN CHẾ TẠO MỚI (Chỉ được tự suy luận ra Dạng toán mới nếu trong danh sách thực sự không có dạng nào liên quan).
  ${contextCategories}

  LƯU Ý CỰC KỲ QUAN TRỌNG VỀ ĐỊNH DẠNG VÀ TÁCH CÂU:
  1. QUY TẮC TÁCH HOẶC GỘP Ý NHỎ:
     - TRƯỜNG HỢP TÁCH: Nếu một bài toán tự luận có các ý nhỏ (a, b, c...) hoàn toàn độc lập, không phụ thuộc nhau (VD: "Bài 1. Tính: a) 1+1 b) 2+2"). BẮT BUỘC TÁCH mỗi ý thành 1 object câu hỏi độc lập. Tự động ghép thêm "dẫn chung" vào từng ý.
     - TRƯỜNG HỢP GỘP (KHÔNG TÁCH): Nếu các ý nhỏ có liên quan mật thiết, dùng chung dữ kiện gốc, ý b phụ thuộc ý a (VD: "Cho biểu thức P... a) Rút gọn b) Tìm P max"). BẮT BUỘC GỘP CHUNG toàn bộ đề bài và các ý nhỏ thành MỘT câu hỏi tự luận duy nhất. Giữ nguyên các ký hiệu "a)", "b)".
  1b. CÂU ĐÚNG/SAI (DS) - TÁCH 4 Ý RA 4 Ô RIÊNG (RẤT QUAN TRỌNG):
     - 4 ý a), b), c), d) PHẢI nằm ở "dapAnA", "dapAnB", "dapAnC", "dapAnD" - mỗi ý một ô, và KHÔNG chép lại ký hiệu "a)", "b)" vào trong ô.
     - "noiDung" CHỈ giữ phần dẫn chung (câu mở đầu + dữ kiện + hình ảnh nếu có). TUYỆT ĐỐI KHÔNG để 4 ý đó lặp lại trong "noiDung".
     - Ví dụ đúng: noiDung = "Chọn đúng sai khi nói về cấu tạo chất:", dapAnA = "Các chất được cấu tạo từ các hạt riêng...", dapAnB = "...".
  2. QUY ĐỊNH ĐỐI VỚI CÂU HỎI ĐÚNG/SAI (DS) ĐA BÀI HỌC:
     Nếu câu hỏi DS có 4 ý thuộc về nhiều bài học khác nhau trong chương:
     - Bạn HÃY ĐẶT "isMultiLesson": true.
     - Bạn PHẢI gán "tenBai" là tên bài học xa nhất/mới nhất trong chương trình mà câu hỏi đề cập tới (Ví dụ ý A thuộc Bài 1, ý C thuộc Bài 3 => Gán "tenBai": "Bài 3").
     - Bạn PHẢI gán "dangToan": "Toán tổng hợp".
  3. GIỮ NGUYÊN DANH MỤC: Nếu trường "chuyenDe" hoặc "tenBai" trong mẫu JSON đã được điền sẵn một giá trị (Không phải chữ "Tự suy luận"), BẠN PHẢI GIỮ NGUYÊN CHÍNH XÁC CHUỖI ĐÓ, KHÔNG ĐƯỢC TỰ Ý CẮT BỎ CÁC TIỀN TỐ (như "Chương I.", "Bài 2.") HAY THAY ĐỔI BẤT KỲ KÝ TỰ NÀO.
  4. ĐỊNH DẠNG CÔNG THỨC TOÁN: Mọi công thức Toán học PHẢI được bọc trong $...$ (ví dụ: $\\frac{1}{2}$). Bạn cứ viết lệnh LaTeX chuẩn, KHÔNG ĐƯỢC dùng 2 dấu gạch chéo (\\\\) để escape lệnh trừ khi xuống dòng.
  5. NẾU TRONG ĐỀ CÓ HÌNH VẼ, ĐỒ THỊ, BẢNG BIẾN THIÊN, HOẶC BẢNG XÉT DẤU: Tuyệt đối KHÔNG cố gắng vẽ lại bằng Markdown, ASCII hay LaTeX. Thay vào đó, hãy chỉ ghi đúng chữ "[HÌNH VẼ]" hoặc "[BẢNG BIẾN THIÊN]" vào vị trí đó trong nội dung, VÀ điền thêm trường "viTriHinhAnh" như mô tả ở trên. Người dùng sẽ tự kiểm tra ảnh được tự động cắt ra.
  6. ÉP BUỘC TRƯỜNG ĐÁP ÁN ĐÚNG: Bạn TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ TRỐNG trường "dapAnDung".
     - Với câu Trắc nghiệm (NLC): Phải điền A, B, C hoặc D.
     - Với câu Đúng/Sai (DS): Phải điền chuỗi 4 ký tự Đ và S (VD: "Đ S Đ S" hoặc "ĐĐSĐ"). Hãy đọc kỹ đề bài và lời giải để suy ra. TUYỆT ĐỐI KHÔNG ĐƯỢC ĐỂ TRỐNG.
  7. XÓA TIỀN TỐ CÂU HỎI: TUYỆT ĐỐI KHÔNG đưa các chữ như "Câu 1.", "Bài 2:", "VD 3", "Ví dụ 4." vào trong nội dung của trường "noiDung". Bạn phải tự động loại bỏ các cụm từ này ở đầu câu hỏi.
  8. CÂU HỎI PHẢI ĐỘC LẬP VÀ TỰ CHỨA ĐẦY ĐỦ GIẢ THUYẾT: Mỗi câu hỏi sẽ được lưu RIÊNG BIỆT trong ngân hàng đề, nên TUYỆT ĐỐI KHÔNG ĐƯỢC viết kiểu tham chiếu ngữ cảnh bên ngoài như "Với các giả thiết như trong Ví dụ 5...", "Trong tình huống mở đầu...", "Trong Ví dụ 7...", "Theo bảng số liệu trên...". Nếu câu hỏi gốc trong ảnh có tham chiếu đến dữ kiện ở phần khác, BẠN PHẢI tự chép/nhúng đầy đủ toàn bộ dữ kiện cần thiết (số liệu, điều kiện, giả thuyết) vào trong "noiDung" để câu hỏi có thể hiểu được khi đứng một mình. Nếu không thể trích xuất đủ dữ kiện (ví dụ thiếu hình vẽ, bảng số liệu gốc không có trong ảnh), hãy BỎ QUA câu hỏi đó hoàn toàn, KHÔNG TẠO.
  9. NHẬN DẠNG HÌNH ẢNH ĐI KÈM CÂU HỎI: Nếu trong ảnh có đồ thị, hình vẽ, bảng số liệu hoặc sơ đồ ĐI KÈM một câu hỏi, TUYỆT ĐỐI KHÔNG mô tả chi tiết làm lệch nội dung gốc của câu hỏi. Thay vào đó, bạn chỉ cần quét kỹ và thêm một dòng thông báo "[CÓ HÌNH ẢNH KÈM THEO]" vào cuối trường "noiDung", VÀ điền trường "viTriHinhAnh". CHỈ ĐƯỢC PHÉP can thiệp/sửa đổi nội dung gốc của câu hỏi nếu bạn phát hiện câu hỏi bị sai đề, và trong trường hợp đó, PHẢI thêm một dòng thông báo "[CÂU HỎI CÓ THỂ BỊ SAI ĐỀ, ĐÃ SỬA LẠI]" để thông báo.`;
}

/** Khoá đã dùng hết hạn mức của Google (429) - đổi sang khoá khác mới có tác dụng. */
const laLoiCanHanMuc = (msg: string): boolean =>
  /429|quota|exceeded|too many requests|resource has been exhausted/i.test(msg);

/** Model đang quá tải (503) - lỗi nằm ở phía Google, đổi khoá cũng vô ích. */
const laLoiQuaTai = (msg: string): boolean =>
  /503|service unavailable|overloaded|high demand/i.test(msg);

/** Báo về máy chủ để treo khoá đã cạn 24 giờ, lần quét sau khỏi thử lại cho mất thời gian. */
async function baoKhoaDaCan(key: string, reason: string) {
  try {
    await fetch('/api/admin/gemini-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, reason }),
    });
  } catch { /* báo được thì tốt, không thì thôi - không để việc này chặn luồng quét */ }
}

/**
 * Gọi Gemini, tự xoay vòng qua các API key. Ném lỗi gộp nếu TẤT CẢ key đều hỏng.
 *
 * Phân biệt hai loại lỗi thay vì gộp chung như bản cũ:
 *   - 429 (khoá cạn hạn mức): đổi khoá NGAY, đồng thời treo khoá đó lại để lần sau bỏ qua.
 *   - 503 (model quá tải): lỗi ở phía Google chứ không phải khoá, nên đổi khoá vô ích -
 *     chờ một nhịp ngắn rồi thử lại chính khoá đó, chỉ bỏ cuộc sau vài lần.
 */
export async function callGeminiWithKeyFallback(keys: string[], prompt: string, parts: any[]): Promise<string> {
  // Import động để tránh kéo thư viện Google AI vào những nơi không cần (VD trang chỉ hiển thị).
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const SO_LAN_THU_LAI_QUA_TAI = 2;
  const CHO_MS = 2500;
  let lastErrorMsg = "";
  let soKhoaCan = 0;

  for (const apiKey of keys) {
    for (let lan = 0; lan <= SO_LAN_THU_LAI_QUA_TAI; lan++) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.7-flash" });
        const result = await model.generateContent([prompt, ...parts]);
        return result.response.text();
      } catch (e: any) {
        lastErrorMsg = e?.message || String(e);

        if (laLoiCanHanMuc(lastErrorMsg)) {
          soKhoaCan++;
          console.warn(`Khoá ***${apiKey.slice(-4)} đã cạn hạn mức, chuyển khoá khác.`);
          void baoKhoaDaCan(apiKey, lastErrorMsg);
          break; // sang khoá tiếp theo
        }

        if (laLoiQuaTai(lastErrorMsg) && lan < SO_LAN_THU_LAI_QUA_TAI) {
          console.warn(`Model đang quá tải, chờ ${CHO_MS}ms rồi thử lại (lần ${lan + 1})...`);
          await new Promise(r => setTimeout(r, CHO_MS));
          continue; // thử lại chính khoá này
        }

        console.warn("Khoá lỗi, thử khoá tiếp theo...", lastErrorMsg);
        break;
      }
    }
  }

  if (soKhoaCan > 0 && soKhoaCan === keys.length) {
    throw new Error(
      `Cả ${keys.length} khoá AI đều đã dùng hết hạn mức trong ngày `
      + '(gói miễn phí của Google chỉ cho 20 lượt/ngày mỗi khoá). '
      + 'Vui lòng chờ sang ngày mới, thêm khoá mới ở trang Cài đặt Cổng A.I, hoặc nâng cấp gói trả phí.',
    );
  }
  throw new Error("Tất cả các API key đều bị lỗi hoặc quá tải. Vui lòng thử lại sau. Lỗi cuối: " + lastErrorMsg);
}

export interface ParseContext {
  existingQuestions: { id: string; content: string }[];
  uniqueTopics: string[];
  uniqueLessons: string[];
  uniqueForms: string[];
  globalGrade: string;
  globalSubject: string;
  globalTopics: string[];
}

/** Bóc tách JSON thô AI trả về thành danh sách câu hỏi đã chuẩn hóa. Ném lỗi nếu JSON hỏng (không tự alert). */
export function parseExtractedQuestionsJson(rawText: string, ctx: ParseContext): QuestionData[] {
  let jsonStr = rawText;
  const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/) || rawText.match(/```\n([\s\S]*?)\n```/);
  if (jsonMatch) jsonStr = jsonMatch[1];

  const firstBracket = jsonStr.indexOf('[');
  const lastBracket = jsonStr.lastIndexOf(']');

  let parsedData: any[] = [];

  if (firstBracket !== -1) {
    jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
  } else {
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1) {
      jsonStr = '[' + jsonStr.substring(firstBrace, lastBrace + 1) + ']';
    } else {
      throw new Error("Không tìm thấy cấu trúc JSON");
    }
  }

  try {
    parsedData = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error("AI trả về định dạng JSON không hợp lệ. Vui lòng thử lại.");
  }

  const { existingQuestions, uniqueTopics, uniqueLessons, uniqueForms, globalGrade, globalSubject, globalTopics } = ctx;

  const newQuestions: QuestionData[] = parsedData
    .map((data) => {
      let qContent = data.noiDung || "";
      qContent = qContent.replace(/^(?:(?:Câu|Bài|VD|Ví\s*dụ)\s*\d+[a-zA-Z]?\s*[:.-]?\s*)+/i, "");

      const normalizedContent = qContent.trim().toLowerCase().replace(/\s+/g, '');
      const duplicateMatch = existingQuestions.find((eq) => eq.content === normalizedContent && eq.content !== "");

      const topic = data.chuyenDe || (globalTopics.length === 1 ? globalTopics[0] : "");
      const lesson = data.tenBai || "";
      const math_form = data.dangToan || "";
      const isNewTopic = topic !== "" && !uniqueTopics.includes(topic);
      const isNewLesson = lesson !== "" && !uniqueLessons.includes(lesson);
      const isNewMathForm = math_form !== "" && !uniqueForms.includes(math_form);

      let parsedQuestionType = String(data.loaiCauHoi || "NLC");
      if (parsedQuestionType.toLowerCase().includes("trắc nghiệm")) parsedQuestionType = "NLC";
      else if (parsedQuestionType.toLowerCase().includes("đúng/sai") || parsedQuestionType.toLowerCase().includes("đúng sai")) parsedQuestionType = "DS";
      else if (parsedQuestionType.toLowerCase().includes("ngắn")) parsedQuestionType = "TLN";
      else if (parsedQuestionType.toLowerCase().includes("tự luận") || parsedQuestionType === "essay") parsedQuestionType = "TL";
      else parsedQuestionType = toBankType(parsedQuestionType) ?? "NLC";

      const parsedDifficulty = toDifficultyCode(data.mucDo) ?? "1";

      let viTriHinhAnh: QuestionData["viTriHinhAnh"] = undefined;
      if (data.viTriHinhAnh && typeof data.viTriHinhAnh === 'object') {
        const v = data.viTriHinhAnh;
        if ([v.fileIndex, v.ymin, v.xmin, v.ymax, v.xmax].every((n) => typeof n === 'number')) {
          viTriHinhAnh = { fileIndex: v.fileIndex, ymin: v.ymin, xmin: v.xmin, ymax: v.ymax, xmax: v.xmax };
        }
      }

      // Câu Đúng/Sai mà AI để nguyên 4 ý trong đề bài và bỏ trống 4 ô mệnh đề: tự gỡ
      // 4 ý ra. Chỉ làm khi 4 ô ĐỀU trống, để không ghi đè kết quả AI đã tách đúng.
      const dsChuaTach = parsedQuestionType === "DS"
        && !data.dapAnA && !data.dapAnB && !data.dapAnC && !data.dapAnD;
      const dsTach = dsChuaTach ? tachYDungSai(qContent) : null;

      const questionData: QuestionData = {
        temp_id: `TEMP_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
        grade: data.lop || globalGrade || "12",
        subject: data.phanMon || globalSubject || "Đại số",
        topic,
        lesson,
        math_form,
        isNewTopic,
        isNewLesson,
        isNewMathForm,
        question_type: parsedQuestionType,
        difficulty: parsedDifficulty,
        content: dsTach ? dsTach.dan : qContent,
        option_a: dsTach ? dsTach.y[0] : (data.dapAnA || ""),
        option_b: dsTach ? dsTach.y[1] : (data.dapAnB || ""),
        option_c: dsTach ? dsTach.y[2] : (data.dapAnC || ""),
        option_d: dsTach ? dsTach.y[3] : (data.dapAnD || ""),
        correct_answer: parsedQuestionType === "DS"
          ? chuanHoaDapAnDungSai(data.dapAnDung)
          : (data.dapAnDung || ""),
        explanation: data.loiGiai || "",
        image_url: data.image_url || "",
        isDuplicate: !!duplicateMatch,
        duplicateId: duplicateMatch ? duplicateMatch.id : undefined,
        viTriHinhAnh,
      };

      const parsedItems: QuestionData[] = [questionData];

      if (data.loaiCauHoi === "DS" && data.isMultiLesson === true) {
        const cloneData: QuestionData = {
          ...questionData,
          temp_id: `TEMP_${Math.random().toString(36).substring(2, 9)}_${Date.now()}_clone`,
          lesson: "Ôn tập chương",
          isNewLesson: !uniqueLessons.includes("Ôn tập chương"),
          isDuplicate: false,
          duplicateId: undefined,
        };
        parsedItems.push(cloneData);
      }

      return parsedItems;
    })
    .flat();

  return newQuestions;
}

export interface ScanContext extends ScanPromptContext, ParseContext {}

/** Hàm gộp: quét 1 lô file (ảnh/PDF) và trả về danh sách câu hỏi đã bóc tách. */
export async function scanFilesForQuestions(files: File[], ctx: ScanContext): Promise<QuestionData[]> {
  const keyRes = await fetch('/api/admin/gemini-key');
  const keyData = await keyRes.json();
  if (!keyRes.ok || !keyData.keys || keyData.keys.length === 0) {
    throw new Error(keyData.error || "Không thể cấp phát khóa AI.");
  }

  const prompt = buildScanPrompt(ctx);
  const parts = await filesToGeminiParts(files);
  const text = await callGeminiWithKeyFallback(keyData.keys, prompt, parts);
  return parseExtractedQuestionsJson(text, ctx);
}
