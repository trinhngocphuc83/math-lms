/**
 * Đọc mục "📌 CÔNG THỨC CẦN NHỚ" ở cuối bài giảng.
 *
 * Vì sao có mục này: đo trên 29 bài lý thuyết thật thì **0/29 bài** có tóm tắt công thức.
 * Lời dặn AI nay bắt buộc phải viết, mỗi công thức đúng một dòng theo khuôn:
 *
 *     - **Tên công thức** | $công thức LaTeX$ | dùng khi nào
 *
 * Khuôn cố định như vậy để một nút bấm là đưa thẳng vào Sổ tay được, không phải gõ lại.
 * Bài cũ chưa có mục này thì trình soạn có nút nhờ AI rút ra.
 */

export interface CongThucRut {
  title: string;
  latex_content: string;
  description: string;
}

/** Tiêu đề mục, chấp nhận cả khi thầy cô gõ thiếu emoji hoặc khác cấp tiêu đề. */
const MOC_MUC = /^#{1,4}\s*(?:📌\s*)?CÔNG THỨC CẦN NHỚ.*$/im;

/** Bài đã có mục công thức cuối bài chưa? */
export function coMucCongThuc(noiDung: string): boolean {
  return MOC_MUC.test(String(noiDung || ''));
}

/**
 * Rút các công thức trong mục cuối bài.
 *
 * Chỉ đọc phần TỪ tiêu đề mục trở đi, và dừng khi gặp tiêu đề cùng cấp tiếp theo - để
 * không quét nhầm các dòng gạch đầu dòng của phần lý thuyết phía trên.
 */
export function rutCongThucCuoiBai(noiDung: string): CongThucRut[] {
  const s = String(noiDung || '');
  const m = s.match(MOC_MUC);
  if (!m || m.index === undefined) return [];

  let doan = s.slice(m.index + m[0].length);
  // Dừng ở tiêu đề tiếp theo cùng cấp hoặc cao hơn
  const capMuc = (m[0].match(/^#+/) || ['##'])[0].length;
  const ketThuc = doan.search(new RegExp(`^#{1,${capMuc}}\\s`, 'm'));
  if (ketThuc > 0) doan = doan.slice(0, ketThuc);

  const ra: CongThucRut[] = [];
  for (const dong of doan.split('\n')) {
    const d = dong.trim();
    if (!d.startsWith('-') && !d.startsWith('*')) continue;

    // Tách theo dấu | : tên | công thức | dùng khi nào
    const phan = d.replace(/^[-*]\s*/, '').split('|').map(x => x.trim());
    if (phan.length < 2) continue;

    const ten = phan[0].replace(/\*\*/g, '').trim();
    const latex = phan[1].replace(/^\$+|\$+$/g, '').trim();
    if (!ten || !latex) continue;

    ra.push({
      title: ten,
      latex_content: latex,
      description: (phan[2] || '').replace(/\*\*/g, '').trim(),
    });
  }
  return ra;
}

/**
 * Lời dặn nhờ AI rút công thức từ một bài CHƯA có mục cuối bài.
 *
 * Trả về đúng khuôn dòng như trên để dùng chung một đường đọc, khỏi viết hai bộ đọc.
 */
export function dungPromptRutCongThuc(noiDungBai: string): string {
  return `Bạn là giáo viên Toán. Dưới đây là một bài giảng. Hãy rút ra các CÔNG THỨC TRỌNG TÂM
mà bài này thực sự có dùng.

QUY TẮC:
1. Chỉ lấy công thức THẬT SỰ xuất hiện hoặc được dùng trong bài. TUYỆT ĐỐI không bịa thêm
   công thức "cho đủ bộ".
2. Mỗi công thức viết ĐÚNG một dòng, đúng khuôn sau, không thêm bớt gì:
   - **Tên công thức** | $công thức LaTeX$ | dùng khi nào
3. Tên công thức phải gọi đúng tên toán học (VD "Định lý Cosin", "Diện tích tam giác theo
   hai cạnh và góc xen giữa"), không đặt tên chung chung như "Công thức 1".
4. Phần "dùng khi nào" viết ngắn, dưới 15 từ, nói rõ dùng trong tình huống nào.
5. Chỉ trả về các dòng đó, không lời dẫn, không tiêu đề.

BÀI GIẢNG:

${String(noiDungBai || '').slice(0, 18000)}`;
}
