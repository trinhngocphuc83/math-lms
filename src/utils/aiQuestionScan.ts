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
 */
export const IMAGE_NEEDED_REGEX = /\[IMAGE_PLACEHOLDER\]|\[[^\]]*(?:HÌNH|ẢNH|BẢNG|ĐỒ THỊ|CHÚ Ý)[^\]]*\]|HÌNH VẼ|HÌNH ẢNH|ĐỒ THỊ|BẢNG BIẾN THIÊN|BẢNG BIỂU|như hình|hình bên/i;

/**
 * Chỉ khớp marker dạng NGOẶC VUÔNG ("[HÌNH VẼ]", "[CÓ HÌNH ẢNH KÈM THEO]"...) - dùng
 * để XÓA marker sau khi đã tự động cắt ảnh xong. Không được dùng IMAGE_NEEDED_REGEX
 * (bản dò tìm) cho việc xóa: nó còn khớp cả cụm chữ thường như "như hình", "hình bên"
 * vốn có thể xuất hiện tự nhiên GIỮA câu (VD "...cạnh a như hình vẽ bên, tính...") -
 * nếu đem .replace() nguyên câu đó, phần đầu câu (chữ thường) bị xóa nhầm trước khi
 * đến marker ngoặc vuông thật sự ở cuối câu, làm hỏng văn bản đề bài. Có cờ "g" vì
 * .replace() không cờ "g" chỉ xóa đúng 1 lần khớp đầu tiên tìm thấy.
 */
export const IMAGE_PLACEHOLDER_STRIP_REGEX = /\[IMAGE_PLACEHOLDER\]|\[[^\]]*(?:HÌNH|ẢNH|BẢNG|ĐỒ THỊ|CHÚ Ý)[^\]]*\]/gi;

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

/** Gọi Gemini, tự xoay vòng qua các API key khi 1 key lỗi/quá tải. Ném lỗi gộp nếu TẤT CẢ key đều fail. */
export async function callGeminiWithKeyFallback(keys: string[], prompt: string, parts: any[]): Promise<string> {
  // Import động để tránh kéo thư viện Google AI vào những nơi không cần (VD trang chỉ hiển thị).
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  let lastErrorMsg = "";
  for (const apiKey of keys) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
      const result = await model.generateContent([prompt, ...parts]);
      return result.response.text();
    } catch (e: any) {
      console.warn("API Key lỗi, thử key tiếp theo...", e.message);
      lastErrorMsg = e.message;
    }
  }
  throw new Error("Tất cả các API key đều bị lỗi hoặc quá tải (503). Vui lòng thử lại sau. Lỗi cuối: " + lastErrorMsg);
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
        content: qContent,
        option_a: data.dapAnA || "",
        option_b: data.dapAnB || "",
        option_c: data.dapAnC || "",
        option_d: data.dapAnD || "",
        correct_answer: data.dapAnDung || "",
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
