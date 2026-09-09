/**
 * Tách một câu Đúng/Sai của kho thành phần đề chung và bốn ý.
 *
 * Kho lưu cả bốn ý nằm chung trong `content`, còn `option_a..d` chỉ ghi Đúng/Sai và
 * `correct_answer` là chuỗi bốn ký tự kiểu "SSĐĐ". Khối true_false_cluster của app lại cần
 * mảng {content, isTrue}, nên phải tách ra.
 *
 * KHO DÙNG HAI LỐI ĐÁNH Ý KHÁC NHAU, đo trên chương 2 lớp 11 mới lộ:
 *   Bài 1, Bài 2 phần lớn đánh  a)  b)  c)  d)   mỗi ý một dòng
 *   Bài 3 phần lớn đánh         A.  B.  C.  D.   cũng mỗi ý một dòng
 * Bộ tách chỉ biết lối đầu thì Bài 3 rơi mất 21/23 câu mà không báo gì - nó chỉ lặng lẽ
 * trả về null rồi câu bị bỏ qua. Nên thử lần lượt cả hai lối, lối nào tìm đủ bốn nhãn
 * theo đúng thứ tự thì dùng.
 */

const LOI_DANH = [
  { ten: 'a)', nhan: ['a', 'b', 'c', 'd'], mau: (ch) => `(^|\\n)\\s*${ch}\\s*\\)` },
  { ten: 'A.', nhan: ['A', 'B', 'C', 'D'], mau: (ch) => `(^|\\n)\\s*${ch}\\s*\\.` },
];

import { donDe } from './donDeCauHoi.mjs';

export function tachYDungSai(q) {
  const dap = String(q.correct_answer || '').toUpperCase().replace(/[^ĐS]/g, '');
  if (dap.length !== 4) return null;
  const noi = donDe(q.content);

  for (const loi of LOI_DANH) {
    const viTri = [];
    let hong = false;
    for (const ch of loi.nhan) {
      const re = new RegExp(loi.mau(ch), 'g');
      let m, cuoi = -1;
      while ((m = re.exec(noi))) cuoi = m.index + m[0].length;   // lấy lần xuất hiện cuối
      if (cuoi < 0) { hong = true; break; }
      viTri.push(cuoi);
    }
    if (hong) continue;
    if (!viTri.every((v, i) => i === 0 || v > viTri[i - 1])) continue;

    const dauY = noi.lastIndexOf('\n', viTri[0] - 1);
    const de = noi.slice(0, dauY < 0 ? viTri[0] : dauY).trim();
    if (!de) continue;

    const y = viTri.map((v, i) => {
      if (i + 1 >= viTri.length) return noi.slice(v).trim();
      const ke = noi.lastIndexOf('\n', viTri[i + 1] - 1);
      return noi.slice(v, ke > v ? ke : viTri[i + 1]).trim();
    });
    if (y.some(t => !t)) continue;

    return { de, y: y.map((t, i) => ({ content: t, isTrue: dap[i] === 'Đ' })) };
  }
  return null;
}
