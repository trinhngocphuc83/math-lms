// Nhờ AI soạn LẠI một câu cụ thể theo yêu cầu riêng của thầy cô, ngay tại chỗ đang xem.
//
// Khác với sinhBuCauHoi (soạn bù khi kho thiếu so với ma trận): ở đây kho có thể còn
// nhiều câu cùng dạng, nhưng KHÔNG câu nào vừa ý. Ví dụ thầy cần một câu tự luận chia
// hai ý a) b), mà cả kho không câu nào chia ý như vậy - bấm "Đổi câu khác" bao nhiêu lần
// cũng chỉ xoay vòng trong đúng những câu không dùng được.
//
// Nguyên tắc giữ nguyên như mọi đường AI khác: câu soạn ra KHÔNG tự vào đề. Nó phải qua
// chuẩn hoá, dò trùng, rồi thầy cô xem tận mắt và bấm nhận thì mới thay vào đề.

import { goiGeminiTrenTrinhDuyet, type CauHinhAI } from "./geminiBrowser";
import { chuanHoaCauHoi } from "./chuanHoaCauHoi";
import { taoKhoaSoSanh, timCauTrung, type KhoaSoSanh } from "./questionFingerprint";
import { docJsonCauHoi } from "./vaJson";
import { daoPhuongAn } from "./tronMaDe";
import {
  difficultyLabel, targetFormatPrompt,
  CORRECT_ANSWER_FORMAT_HINT, type BankType,
} from "./questionTypes";
import type { QuestionData } from "./aiQuestionScan";

export interface YeuCauSoanLai {
  /** Câu đang muốn thay - dùng làm mốc để AI giữ đúng chủ đề và độ khó. */
  cauGoc: any;
  /** Thầy cô dặn gì, VD "chia thành 2 ý a) b), ý b nâng cao hơn". */
  yeuCau: string;
  grade: string;
  subject: string;
  topic: string;
  lesson: string;
  math_form: string;
  question_type: BankType;
  difficulty: string;
  /** Soạn mấy phương án để chọn - nhiều hơn một thì đỡ phải gọi lại. */
  soPhuongAn: number;
}

export interface KetQuaSoanLai {
  cauMoi: QuestionData[];
  model: string;
  soBoQua: number;
}

const taMotCau = (q: any): string => {
  const p = [`Đề: ${String(q?.content || "").trim()}`];
  for (const [k, nhan] of [["option_a", "A"], ["option_b", "B"], ["option_c", "C"], ["option_d", "D"]] as const) {
    if (q?.[k]) p.push(`${nhan}. ${String(q[k]).trim()}`);
  }
  if (q?.correct_answer) p.push(`Đáp án: ${q.correct_answer}`);
  if (q?.explanation) p.push(`Lời giải: ${String(q.explanation).trim().slice(0, 600)}`);
  return p.join("\n");
};

function taoPrompt(yc: YeuCauSoanLai): string {
  return `Bạn là giáo viên ra đề. Thầy cô đang có một câu trong đề nhưng CHƯA VỪA Ý, và
muốn bạn soạn ${yc.soPhuongAn} câu mới để chọn thay vào.

CÂU ĐANG CÓ TRONG ĐỀ (chỉ để bạn biết chủ đề, độ khó và văn phong - KHÔNG được chép lại):
${taMotCau(yc.cauGoc)}

ĐIỀU THẦY CÔ DẶN - đây là yêu cầu QUAN TRỌNG NHẤT, phải làm đúng:
"""
${yc.yeuCau.trim()}
"""

YÊU CẦU PHÂN LOẠI - mọi câu đều phải giữ đúng như câu cũ:
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
1. Làm ĐÚNG điều thầy cô dặn ở trên. Dặn chia ý a) b) thì đề bài phải có đúng các ý đó,
   và lời giải phải giải riêng từng ý.
2. TUYỆT ĐỐI KHÔNG ra câu cần hình vẽ, đồ thị hay bảng biến thiên - hệ thống không vẽ
   được hình cho câu mới.
3. Mỗi câu phải TỰ CHỨA đủ dữ kiện, không tham chiếu "như hình trên", "như câu trên".
4. Không đánh số "Câu 1." ở đầu đề.
5. ${yc.soPhuongAn} câu phải KHÁC NHAU rõ rệt, không phải một câu đổi vài con số.
6. TỰ KIỂM TRA LẠI: soạn xong mỗi câu hãy tự giải lại từ đầu và đối chiếu với đáp án bạn
   ghi. Kiểm cả tính hợp lý (điều kiện xác định, mẫu số khác 0, biểu thức dưới căn không
   âm, kết quả có nghĩa thực tế). Phát hiện sai thì soạn lại câu đó chứ đừng trả về câu sai.`;
}

/**
 * Gọi AI soạn lại một câu theo yêu cầu.
 *
 * Chạy trên trình duyệt chứ không qua route máy chủ, vì route Vercel bị chặn cứng 60
 * giây mà soạn câu kèm lời giải chi tiết thường lâu hơn thế.
 */
export async function soanLaiMotCau(
  yc: YeuCauSoanLai,
  cauHinh: CauHinhAI,
  khoSoSanh: KhoaSoSanh[],
  onTienDo?: (moTa: string) => void,
): Promise<KetQuaSoanLai> {
  onTienDo?.(`Máy đang soạn ${yc.soPhuongAn} câu theo yêu cầu...`);

  const kq = await goiGeminiTrenTrinhDuyet(cauHinh, [{ text: taoPrompt(yc) }], {
    responseMimeType: "application/json",
    temperature: 0.85,
  });

  const doc = docJsonCauHoi(kq.text);
  const tho: any[] = doc.items || [];

  const cauMoi: QuestionData[] = [];
  let boQua = doc.soCauBoQua || 0;
  const khoaTrongLo: KhoaSoSanh[] = [];

  for (const r of tho) {
    const noiDung = String(r?.noiDung ?? r?.content ?? "").trim();
    if (!noiDung) { boQua++; continue; }

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

    // AI gần như luôn đặt đáp án đúng ở phương án A - đảo trước khi dò trùng để khoá
    // so sánh khớp với đúng câu sẽ được dùng.
    const q: QuestionData = daoPhuongAn({
      temp_id: `soanlai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
