// Xếp TỪNG câu hỏi về đúng Chương / Bài / Dạng đã có trong danh mục.
//
// Vì sao cần: tài liệu đưa vào thường là một ĐỀ KIỂM TRA, trải trên nhiều chương khác
// nhau. Bản cũ đọc đầu đề tài liệu ra một bối cảnh CHUNG rồi gán cho cả lô - đề Giữa kỳ I
// thì ra "Chương = BÀI KIỂM TRA, Bài = GKI", hai cái này không có trong danh mục nên đẩy
// vào kho là mọc thêm Chương/Bài rác, và mọi câu bị nhét chung một chỗ sai.
//
// Nay đưa cả CÂY DANH MỤC thật cho máy, bắt nó xếp từng câu về đúng một nhánh có sẵn.
// Câu nào không có dạng nào hợp thì được phép ĐỀ XUẤT dạng mới, nhưng phải nằm trong một
// Bài có thật, và phải qua tay thầy cô duyệt mới được thêm.

export const MUC_DO_HOP_LE = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'] as const;
export type MucDo = (typeof MUC_DO_HOP_LE)[number];

export interface CauCanPhanBo {
  id: string;
  question_type?: string;
  content: string;
}

/** Một dòng danh mục rút gọn, chỉ giữ phần cần cho việc xếp chỗ. */
export interface DongDanhMucGon {
  topic: string;
  lesson: string;
  math_form: string;
}

export interface KetQuaPhanBo {
  id: string;
  topic: string;
  lesson: string;
  math_form: string;
  /** true = dạng do máy đề xuất thêm, chưa có trong danh mục. */
  dangMoi: boolean;
  difficulty: MucDo;
  /** Vì sao xếp vào đây - để thầy cô soát nhanh. */
  lyDo?: string;
}

/** Gom danh mục thành cây Chương → Bài → các Dạng. */
export function dungCayDanhMuc(danhMuc: DongDanhMucGon[]): Map<string, Map<string, Set<string>>> {
  const cay = new Map<string, Map<string, Set<string>>>();
  for (const d of danhMuc) {
    const chuong = String(d.topic || '').trim();
    const bai = String(d.lesson || '').trim();
    const dang = String(d.math_form || '').trim();
    if (!chuong || !bai) continue;
    if (!cay.has(chuong)) cay.set(chuong, new Map());
    const bais = cay.get(chuong)!;
    if (!bais.has(bai)) bais.set(bai, new Set());
    if (dang) bais.get(bai)!.add(dang);
  }
  return cay;
}

/** Viết cây danh mục thành văn bản đánh số, để máy trích dẫn lại cho chính xác. */
export function vietCayThanhChu(cay: Map<string, Map<string, Set<string>>>): string {
  const dong: string[] = [];
  let iC = 0;
  for (const [chuong, bais] of cay) {
    iC++;
    dong.push(`CHƯƠNG ${iC}: ${chuong}`);
    for (const [bai, dangs] of bais) {
      dong.push(`  BÀI: ${bai}`);
      if (dangs.size === 0) dong.push('    (bài này chưa có dạng nào)');
      for (const d of dangs) dong.push(`    - ${d}`);
    }
  }
  return dong.join('\n');
}

export function dungPromptPhanBo(params: {
  cauHoi: CauCanPhanBo[];
  cayChu: string;
  grade: string;
  subject: string;
}): string {
  const { cauHoi, cayChu, grade, subject } = params;

  const dsCau = cauHoi.map((q, i) =>
    `--- CÂU ${i + 1} (id: ${q.id}) ---\n${String(q.content || '').replace(/\s+/g, ' ').slice(0, 900)}`
  ).join('\n\n');

  return `Bạn là giáo viên đang sắp xếp câu hỏi vào ngân hàng đề.

DANH MỤC HIỆN CÓ (lớp ${grade}, phân môn ${subject}) - đây là DANH SÁCH ĐÓNG:
${cayChu}

NHIỆM VỤ: với TỪNG câu hỏi dưới đây, xếp nó về đúng một nhánh trong danh mục trên.

QUY TẮC BẮT BUỘC:
1. "topic" và "lesson" PHẢI chép NGUYÊN VĂN từ danh mục trên. TUYỆT ĐỐI không tự đặt tên
   chương hay bài mới, không ghi những thứ như "Bài kiểm tra", "Giữa kỳ I", "Đề số 1".
2. Mỗi câu xếp về đúng bài mà kiến thức của câu đó thuộc về. Tài liệu này là một ĐỀ THI
   nên các câu THƯỜNG THUỘC NHIỀU CHƯƠNG KHÁC NHAU - đừng dồn hết vào một bài.
3. "math_form" ưu tiên chọn trong danh sách dạng của đúng bài đó, và đặt "dangMoi": false.
   Chỉ khi thật sự không dạng nào hợp thì mới tự đặt tên dạng mới, đặt "dangMoi": true, và
   tên đó phải mô tả đúng kiểu bài (VD "Tính khoảng cách từ điểm đến mặt phẳng"), không
   được chung chung như "Bài tập", "Câu hỏi khác".
4. "difficulty" chọn đúng một trong: ${MUC_DO_HOP_LE.join(' | ')}.
5. "id" chép nguyên văn, không tự đổi. Phải trả về ĐỦ ${cauHoi.length} câu, không bỏ sót câu nào.
6. "lyDo" ghi ngắn gọn vì sao xếp vào đó (dưới 15 từ).

CÁC CÂU HỎI:

${dsCau}`;
}

/**
 * Đọc kết quả và SOÁT LẠI với cây danh mục thật.
 *
 * Không tin thẳng những gì máy trả về: máy vẫn có lúc bịa tên chương hoặc ghi sai chính
 * tả tên bài. Câu nào không khớp được vào một nhánh có thật thì trả về trong danh sách
 * "khongXep" để thầy cô tự gán, chứ không lẳng lặng tạo nhánh mới.
 */
export function docKetQuaPhanBo(
  raw: string,
  cay: Map<string, Map<string, Set<string>>>,
  chuanTen: (s: string) => string,
): { xepDuoc: KetQuaPhanBo[]; khongXep: { id: string; lyDo: string }[] } {
  let tho: any[] = [];
  try {
    tho = JSON.parse((raw.match(/\[[\s\S]*\]/) || ['[]'])[0]);
  } catch {
    return { xepDuoc: [], khongXep: [] };
  }

  // Bảng tra theo tên đã chuẩn hoá, để lệch dấu hay hoa thường vẫn khớp
  const traChuong = new Map<string, string>();
  for (const c of cay.keys()) traChuong.set(chuanTen(c), c);

  const xepDuoc: KetQuaPhanBo[] = [];
  const khongXep: { id: string; lyDo: string }[] = [];

  for (const r of tho) {
    const id = String(r?.id ?? '').trim();
    if (!id) continue;

    const chuong = traChuong.get(chuanTen(String(r?.topic ?? '')));
    if (!chuong) { khongXep.push({ id, lyDo: `máy ghi Chương "${r?.topic}" - không có trong danh mục` }); continue; }

    const bais = cay.get(chuong)!;
    const traBai = new Map<string, string>();
    for (const b of bais.keys()) traBai.set(chuanTen(b), b);
    const bai = traBai.get(chuanTen(String(r?.lesson ?? '')));
    if (!bai) { khongXep.push({ id, lyDo: `máy ghi Bài "${r?.lesson}" - không có trong Chương đó` }); continue; }

    const dangCoSan = bais.get(bai)!;
    const traDang = new Map<string, string>();
    for (const d of dangCoSan) traDang.set(chuanTen(d), d);
    const tenDangMay = String(r?.math_form ?? '').trim();
    const dangKhop = traDang.get(chuanTen(tenDangMay));

    if (!tenDangMay) { khongXep.push({ id, lyDo: 'máy không ghi Dạng nào' }); continue; }

    const mucDo = (MUC_DO_HOP_LE as readonly string[]).includes(String(r?.difficulty))
      ? (String(r?.difficulty) as MucDo)
      : 'Thông hiểu';

    xepDuoc.push({
      id,
      topic: chuong,
      lesson: bai,
      math_form: dangKhop || tenDangMay,
      // Khớp được dạng có sẵn thì KHÔNG phải dạng mới, dù máy có tự nhận là mới
      dangMoi: !dangKhop,
      difficulty: mucDo,
      lyDo: String(r?.lyDo ?? '').trim() || undefined,
    });
  }

  return { xepDuoc, khongXep };
}
