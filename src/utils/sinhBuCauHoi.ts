// Nhờ AI soạn thêm câu khi ngân hàng không đủ so với ma trận.
//
// Đây là lối thoát cho tình huống: ma trận cần 5 câu "Tìm cực trị dựa vào bảng biến
// thiên" mức Vận dụng mà kho chỉ có 2. Trước đây thầy cô đành hạ số câu xuống cho khớp
// kho, tức là để cái kho quyết định đề thi thay vì để ma trận quyết định.
//
// Nguyên tắc không được phá: câu AI soạn KHÔNG tự động vào đề. Nó phải qua ba cửa -
// chuẩn hoá, dò trùng, rồi thầy cô duyệt từng câu - y như câu quét từ ảnh.

import { goiGeminiTrenTrinhDuyet, type CauHinhAI } from "./geminiBrowser";
import { chuanHoaCauHoi } from "./chuanHoaCauHoi";
import { taoKhoaSoSanh, timCauTrung, type KhoaSoSanh } from "./questionFingerprint";
import { docJsonCauHoi } from "./vaJson";
import { daoPhuongAn } from "./tronMaDe";
import {
  bankTypeLabel, difficultyLabel, targetFormatPrompt,
  CORRECT_ANSWER_FORMAT_HINT, type BankType,
} from "./questionTypes";
import type { QuestionData } from "./aiQuestionScan";

export interface YeuCauSinhBu {
  grade: string;
  subject: string;
  topic: string;
  lesson: string;
  math_form: string;
  question_type: BankType;
  difficulty: string;
  /** Số câu còn thiếu so với ma trận. */
  soCanThem: number;
  /** Vài câu cùng dạng lấy từ kho, làm mẫu để AI bám đúng phong cách và độ khó. */
  cauMau: any[];
}

export interface KetQuaSinhBu {
  cauMoi: QuestionData[];
  model: string;
  /** Câu AI trả về nhưng bị loại vì thiếu nội dung hoặc thiếu đáp án. */
  soBoQua: number;
}

const motCauMau = (q: any, i: number): string => {
  const p = [`--- CÂU MẪU ${i + 1} ---`, `Đề: ${String(q.content || "").trim()}`];
  for (const [k, nhan] of [["option_a", "A"], ["option_b", "B"], ["option_c", "C"], ["option_d", "D"]] as const) {
    if (q[k]) p.push(`${nhan}. ${String(q[k]).trim()}`);
  }
  if (q.correct_answer) p.push(`Đáp án: ${q.correct_answer}`);
  return p.join("\n");
};

function taoPrompt(yc: YeuCauSinhBu): string {
  const mau = yc.cauMau.length
    ? `\n\nDƯỚI ĐÂY LÀ ${yc.cauMau.length} CÂU CÙNG DẠNG ĐANG CÓ TRONG NGÂN HÀNG. Hãy bám đúng phong cách trình bày, độ khó và cách hỏi của chúng, NHƯNG KHÔNG ĐƯỢC chép lại hay chỉ đổi vài con số:\n\n${yc.cauMau.map(motCauMau).join("\n\n")}`
    : "";

  return `Bạn là giáo viên ra đề. Hãy soạn ĐÚNG ${yc.soCanThem} câu hỏi mới.

YÊU CẦU PHÂN LOẠI - mọi câu đều phải đúng:
- Lớp: ${yc.grade}
- Phân môn: ${yc.subject}
- Chương: ${yc.topic}
- Bài: ${yc.lesson}
- Dạng: ${yc.math_form}
- Mức độ: ${difficultyLabel(yc.difficulty)}
- ${targetFormatPrompt(yc.question_type)}

${CORRECT_ANSWER_FORMAT_HINT}

CHỈ trả về một mảng JSON, không giải thích gì thêm:
[
  {
    "noiDung": "Đề bài, công thức bọc trong $...$",
    "dapAnA": "...", "dapAnB": "...", "dapAnC": "...", "dapAnD": "...",
    "dapAnDung": "...",
    "loiGiai": "Lời giải chi tiết, công thức bọc trong $...$"
  }
]

QUY TẮC BẮT BUỘC:
1. TUYỆT ĐỐI KHÔNG ra câu cần hình vẽ, đồ thị hay bảng biến thiên - hệ thống không vẽ được hình cho câu mới.
2. Mỗi câu phải TỰ CHỨA đủ dữ kiện, không tham chiếu "như hình trên", "theo bảng đã cho".
3. Không đánh số "Câu 1." ở đầu đề.
4. ${yc.soCanThem} câu phải KHÁC NHAU rõ rệt về dữ kiện lẫn cách hỏi, không phải một câu đổi số.
5. TỰ KIỂM TRA LẠI: sau khi soạn xong mỗi câu, hãy tự giải lại từ đầu và đối chiếu với đáp án
   bạn ghi. Kiểm cả tính hợp lý (điều kiện xác định, mẫu số khác 0, biểu thức dưới căn không
   âm, kết quả có nghĩa thực tế). Phát hiện sai thì soạn lại câu đó chứ đừng trả về câu sai.${mau}`;
}

/**
 * Gọi AI soạn thêm câu cho MỘT ô ma trận đang thiếu.
 *
 * Chạy trên trình duyệt chứ không qua route máy chủ: route Vercel bị chặn cứng 60 giây,
 * mà soạn 5 câu kèm lời giải chi tiết thì thường lâu hơn thế.
 */
export async function sinhBuMotO(
  yc: YeuCauSinhBu,
  cauHinh: CauHinhAI,
  khoSoSanh: KhoaSoSanh[],
  onTienDo?: (moTa: string) => void,
): Promise<KetQuaSinhBu> {
  onTienDo?.(`Máy đang soạn ${yc.soCanThem} câu ${bankTypeLabel(yc.question_type)}...`);

  const kq = await goiGeminiTrenTrinhDuyet(cauHinh, [{ text: taoPrompt(yc) }], {
    responseMimeType: "application/json",
    temperature: 0.8,   // soạn đề mới thì cần khác nhau, không như đọc bảng
  });

  const doc = docJsonCauHoi(kq.text);
  const tho: any[] = doc.items || [];

  const cauMoi: QuestionData[] = [];
  let boQua = doc.soCauBoQua || 0;
  const khoaTrongLo: KhoaSoSanh[] = [];

  for (const r of tho) {
    const noiDung = String(r?.noiDung ?? r?.content ?? "").trim();
    if (!noiDung) { boQua++; continue; }

    // Chuẩn hoá y như câu quét từ ảnh: tách ý Đúng/Sai, nắn đáp án trả lời ngắn,
    // bọc công thức tự luận. Bỏ qua bước này thì câu AI soạn hay lệch định dạng.
    const chuan = chuanHoaCauHoi({
      question_type: yc.question_type,
      content: noiDung,
      option_a: String(r?.dapAnA ?? r?.option_a ?? ""),
      option_b: String(r?.dapAnB ?? r?.option_b ?? ""),
      option_c: String(r?.dapAnC ?? r?.option_c ?? ""),
      option_d: String(r?.dapAnD ?? r?.option_d ?? ""),
      correct_answer: String(r?.dapAnDung ?? r?.correct_answer ?? ""),
    });

    if (!String(chuan.correct_answer || "").trim()) { boQua++; continue; }

    // AI gần như luôn đặt đáp án đúng ở phương án A - đo trên lượt chạy thật: 4/4 câu
    // đều là A. Đề mà đáp án nằm một chỗ thì học sinh đoán cũng trúng. Đảo ngay tại
    // đây, TRƯỚC khi dò trùng, để khoá so sánh khớp với câu thật sự được lưu.
    const q: QuestionData = daoPhuongAn({
      temp_id: `bu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      grade: yc.grade, subject: yc.subject,
      topic: yc.topic, lesson: yc.lesson, math_form: yc.math_form,
      question_type: yc.question_type, difficulty: yc.difficulty,
      content: chuan.content,
      option_a: chuan.option_a, option_b: chuan.option_b,
      option_c: chuan.option_c, option_d: chuan.option_d,
      correct_answer: chuan.correct_answer,
      explanation: String(r?.loiGiai ?? r?.explanation ?? ""),
      image_url: "",
      canhBaoChuanHoa: chuan.canhBao,
    });

    // Dò trùng với cả kho lẫn các câu vừa sinh trong cùng lượt này. similar-generator
    // bỏ trống hẳn khâu này rồi ghi thẳng vào kho - không được lặp lại lỗi đó.
    const ketQua = timCauTrung(
      { id: q.temp_id!, content: q.content, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d },
      [...khoSoSanh, ...khoaTrongLo],
    );
    q.isDuplicate = ketQua.mucDo === "trung" || ketQua.mucDo === "nghi";
    q.duplicateId = ketQua.idCauGiong;
    q.mucDoTrung = ketQua.mucDo;
    q.lyDoTrung = ketQua.lyDo;
    q.diemTrung = ketQua.diem;

    khoaTrongLo.push(taoKhoaSoSanh({
      id: q.temp_id!, content: q.content,
      option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
    }));

    cauMoi.push(q);
  }

  return { cauMoi, model: kq.model, soBoQua: boQua };
}
