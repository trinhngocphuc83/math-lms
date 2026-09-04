/**
 * SỬA LỖI KIỂM THỬ - vá từng chỗ hỏng mà bộ kiểm thử vừa chỉ ra.
 *
 * Chia hai loại rõ ràng:
 *
 *   MÁY TỰ SỬA - việc máy móc thuần tuý, không cần đoán ý: bỏ thẻ HTML còn sót, xoá chữ
 *   [HÌNH VẼ] thừa, gỡ in đậm sai chỗ, chuẩn hoá đáp án Đúng/Sai... Tức thì, không tốn
 *   lượt AI, và chạy lại bao nhiêu lần cũng ra một kết quả.
 *
 *   NHỜ AI - việc phải hiểu nội dung mới làm được: tách lời giải thành từng bước, soạn
 *   mục Phương pháp giải, sửa hai phương án trùng nhau. Chậm và tốn lượt AI.
 *
 * KHÔNG chỗ nào tự ghi thẳng vào ngân hàng. Sửa xong chỉ trả về BẢN NHÁP để Thầy cô soi
 * trước - sai một câu trong kho là sai mãi về sau, nên phải có người gật đầu.
 */

import { docDapAnDungSai, chuanHoaTraLoiNgan, tachBonY } from './chuanHoaCauHoi';
import { layCauHinhAI, goiGeminiTrenTrinhDuyet, GIAY_CHO_VIEC_NHO } from './geminiBrowser';
import type { CauDeSoat } from './kiemThuDe';

/** Những trường của câu hỏi mà việc sửa có thể đụng tới. */
export type BanVa = Partial<Pick<CauDeSoat,
  'content' | 'option_a' | 'option_b' | 'option_c' | 'option_d' | 'correct_answer' | 'explanation'>>;

export type CachSua = 'may' | 'ai' | null;

/** Bản vá kèm những lời phải nói rõ với Thầy cô (đã làm tròn, đã chuyển đơn vị...). */
export interface KetQuaSua { va: BanVa; ghiChu: string[] }

/** Lỗi này sửa được bằng cách nào. `null` là phải tự tay Thầy cô. */
export function suaDuocBang(maLoi: string): CachSua {
  switch (maLoi) {
    case 'conTheHTML':
    case 'conChuChoHinh':
    case 'inDamCumDai':
    case 'congThucRong':
    case 'dsDapAnSaiKhuon':
    case 'dsLapYTrongDe':
    case 'tlnKhongToDuoc':
    case 'dapAnSai':            // AI đã tính sẵn đáp án, chỉ việc thay
      return 'may';
    case 'loiGiaiMotDong':
    case 'khongCoLoiGiai':
    case 'thieuPhuongPhap':
    case 'latexTran':
    case 'phuongAnTrungNhau':
    case 'phuongAnLechDai':
    case 'phuongAnTongHop':
      return 'ai';
    default:
      return null;
  }
}

const chu = (x: any) => String(x ?? '');
const CAC_O = ['content', 'option_a', 'option_b', 'option_c', 'option_d'] as const;

/* ===================== MÁY TỰ SỬA ===================== */

/** Bỏ thẻ HTML còn sót, đổi <br> thành xuống dòng thật. */
function boTheHTML(s: string): string {
  return chu(s)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

/** Xoá cụm chờ hình khi câu đã có ảnh thật. */
function xoaChoHinh(s: string): string {
  return chu(s)
    .replace(/\[HÌNH VẼ[^\]]*\]|\[HINH VE[^\]]*\]|\[BẢNG BIẾN THIÊN\]|\[CÓ HÌNH ẢNH[^\]]*\]/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Gỡ in đậm quanh cụm dài, GIỮ nhấn mạnh ngắn (kiểu **không**). */
function goInDamCumDai(s: string): string {
  return chu(s).replace(/\*\*([^*]{1,300})\*\*/g, (nguyen, trong) => {
    const t = chu(trong).trim();
    return t.split(/\s+/).length > 3 ? t : nguyen;
  });
}

/** Xoá cặp $…$ rỗng. */
function xoaCongThucRong(s: string): string {
  return chu(s).replace(/\$\s*\$/g, '').replace(/[ \t]{2,}/g, ' ').trim();
}

/**
 * Sửa bằng máy. Trả về `null` nếu không sửa được gì (để giao diện khỏi hiện bản nháp rỗng).
 *
 * @param deXuat Bản AI đề nghị sẵn, dùng cho lỗi 'dapAnSai'.
 */
export function suaBangMay(q: CauDeSoat, maLoi: string, deXuat?: BanVa): KetQuaSua | null {
  const va: BanVa = {};
  const ghiChu: string[] = [];
  const apChoMoiO = (ham: (s: string) => string) => {
    for (const o of CAC_O) {
      const cu = chu((q as any)[o]);
      if (!cu) continue;
      const moi = ham(cu);
      if (moi !== cu) (va as any)[o] = moi;
    }
  };

  switch (maLoi) {
    case 'conTheHTML': apChoMoiO(boTheHTML); break;
    case 'conChuChoHinh': apChoMoiO(xoaChoHinh); break;
    case 'inDamCumDai': apChoMoiO(goInDamCumDai); break;
    case 'congThucRong': apChoMoiO(xoaCongThucRong); break;

    case 'dsDapAnSaiKhuon': {
      const doc = docDapAnDungSai(chu(q.correct_answer));
      if (doc && doc !== chu(q.correct_answer).trim()) va.correct_answer = doc;
      break;
    }

    case 'dsLapYTrongDe': {
      /* Bốn ý đang nằm cả trong đề: cắt ra, giữ lại phần dẫn. Ô mệnh đề nào còn trống
         thì điền luôn - dùng lại tachBonY vốn đã chạy ở đường bóc câu. */
      const tach = tachBonY(chu(q.content));
      if (!tach) break;
      va.content = tach.dan;
      (['option_a', 'option_b', 'option_c', 'option_d'] as const).forEach((o, i) => {
        if (!chu((q as any)[o]).trim()) (va as any)[o] = tach.y[i];
      });
      break;
    }

    case 'tlnKhongToDuoc': {
      /* Dùng lại chuanHoaTraLoiNgan: nó vừa rút gọn đáp án vừa SỬA ĐỀ cho khớp
         ("làm tròn đến…", "tính theo đơn vị…") nên hai bên không lệch nhau. */
      const r = chuanHoaTraLoiNgan(chu(q.content), chu(q.correct_answer));
      if (r.correct_answer && r.correct_answer !== chu(q.correct_answer)) {
        va.correct_answer = r.correct_answer;
        if (r.content !== chu(q.content)) va.content = r.content;
        /* Làm tròn hay chuyển đơn vị là chuyện phải nói rõ, không được lặng lẽ. */
        ghiChu.push(...r.canhBao);
      }
      break;
    }

    case 'dapAnSai': {
      if (deXuat?.correct_answer && deXuat.correct_answer !== chu(q.correct_answer)) {
        va.correct_answer = deXuat.correct_answer;
      }
      break;
    }
  }

  return Object.keys(va).length ? { va, ghiChu } : null;
}

/* ===================== NHỜ AI SỬA ===================== */

const VIEC_AI: Record<string, string> = {
  loiGiaiMotDong:
    'Lời giải đang dồn hết vào một dòng. Hãy TÁCH thành nhiều dòng, mỗi bước biến đổi một'
    + ' dòng riêng, mỗi dòng bắt đầu bằng dấu "-". GIỮ NGUYÊN nội dung toán học, tuyệt đối'
    + ' không đổi số liệu, không đổi kết quả, không thêm bước mới.',
  khongCoLoiGiai:
    'Câu này chưa có lời giải. Hãy soạn lời giải chi tiết: mở đầu bằng dòng "Phương pháp'
    + ' giải:" nêu định hướng, rồi tới "Lời giải:" trình bày từng bước, mỗi bước một dòng'
    + ' bắt đầu bằng dấu "-", kết thúc bằng kết luận khớp với đáp án đã cho.',
  thieuPhuongPhap:
    'Lời giải chưa có mục định hướng. Hãy THÊM vào đầu lời giải một mục "Phương pháp giải:"'
    + ' gồm vài dòng nêu hướng tư duy và bẫy học sinh hay mắc. GIỮ NGUYÊN toàn bộ phần lời'
    + ' giải đang có ở phía sau.',
  latexTran:
    'Có công thức toán đang để trần ngoài cặp $…$, in ra sẽ thành chữ thô. Hãy bọc mọi biểu'
    + ' thức, biến số, phép tính vào cặp $…$. KHÔNG đổi nội dung toán học.',
  phuongAnTrungNhau:
    'Có hai phương án giống hệt nhau. Hãy sửa MỘT trong hai cho khác đi, thành một phương án'
    + ' nhiễu hợp lý (sai theo một lỗi học sinh hay mắc). KHÔNG được đụng vào phương án đúng.',
  phuongAnLechDai:
    'Bốn phương án lệch nhau quá nhiều về độ dài nên học sinh đoán mò trúng. Hãy viết lại cho'
    + ' bốn phương án tương đương nhau về độ dài và cấu trúc. KHÔNG đổi phương án nào đang đúng'
    + ' thành sai hay ngược lại.',
  phuongAnTongHop:
    'Có phương án kiểu "Cả A và B đều đúng" / "Tất cả đều đúng" / "Không có đáp án nào" - loại'
    + ' này bị cấm. Hãy thay bằng một khẳng định độc lập, sai theo một lỗi học sinh hay mắc.'
    + ' KHÔNG được đụng vào phương án đúng.',
};

/**
 * Nhờ AI sửa một lỗi. Trả về bản vá, hoặc null nếu AI không sửa được.
 *
 * Prompt luôn nói rõ ĐƯỢC ĐỘNG VÀO GÌ và CẤM ĐỔI GÌ: sửa định dạng mà tiện tay đổi luôn
 * số liệu thì đề hỏng nặng hơn lúc chưa sửa.
 */
export async function suaBangAI(q: CauDeSoat, maLoi: string): Promise<KetQuaSua | null> {
  const viec = VIEC_AI[maLoi];
  if (!viec) return null;

  const prompt = `Bạn là biên tập viên đề thi. Dưới đây là MỘT câu hỏi cần sửa đúng MỘT chỗ.

VIỆC CẦN LÀM: ${viec}

NGUYÊN TẮC BẤT DI BẤT DỊCH:
- Chỉ sửa đúng chỗ được yêu cầu. Mọi thứ khác giữ nguyên từng chữ.
- KHÔNG đổi số liệu, KHÔNG đổi đáp án đúng, KHÔNG đổi ý nghĩa câu hỏi.
- Mọi công thức toán phải nằm trong cặp $…$.
- Chỉ trả về những trường THỰC SỰ có thay đổi.

CÂU HỎI HIỆN TẠI (JSON):
${JSON.stringify({
    content: chu(q.content),
    option_a: chu(q.option_a), option_b: chu(q.option_b),
    option_c: chu(q.option_c), option_d: chu(q.option_d),
    correct_answer: chu(q.correct_answer),
    explanation: chu(q.explanation),
  }, null, 1)}

Chỉ trả về JSON thuần, không kèm lời nào khác, chứa CÁC TRƯỜNG ĐÃ ĐỔI:
{"content": "...", "option_a": "...", "explanation": "..."}`;

  const cauHinh = await layCauHinhAI();
  const kq = await goiGeminiTrenTrinhDuyet(
    cauHinh, [{ text: prompt }], { temperature: 0.2 }, GIAY_CHO_VIEC_NHO,
  );

  const than = kq.text.replace(/```json|```/gi, '').trim();
  let doc: any;
  try {
    doc = JSON.parse(than.slice(than.indexOf('{'), than.lastIndexOf('}') + 1));
  } catch {
    return null;
  }

  const va: BanVa = {};
  for (const o of [...CAC_O, 'correct_answer', 'explanation'] as const) {
    const moi = doc?.[o];
    if (typeof moi !== 'string') continue;
    if (moi.trim() && moi !== chu((q as any)[o])) (va as any)[o] = moi;
  }
  return Object.keys(va).length ? { va, ghiChu: [] } : null;
}

/* ===================== SO SÁNH TRƯỚC / SAU ===================== */

export const TEN_TRUONG: Record<string, string> = {
  content: 'Đề bài',
  option_a: 'Phương án A', option_b: 'Phương án B',
  option_c: 'Phương án C', option_d: 'Phương án D',
  correct_answer: 'Đáp án',
  explanation: 'Lời giải',
};

/** Danh sách trường đã đổi, kèm giá trị cũ và mới - để bày bảng so sánh. */
export function cacChoDoi(q: CauDeSoat, va: BanVa): { truong: string; ten: string; cu: string; moi: string }[] {
  return Object.keys(va).map(o => ({
    truong: o,
    ten: TEN_TRUONG[o] || o,
    cu: chu((q as any)[o]),
    moi: chu((va as any)[o]),
  }));
}
