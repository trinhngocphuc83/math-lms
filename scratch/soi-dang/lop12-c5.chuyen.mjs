/* Kế hoạch lớp 12 chương 5 (Phương pháp toạ độ trong không gian): gộp 9 dạng lẻ 1-2 câu ở Bài 2, đặt tên đúng việc, bổ sung dạng Bài 4 */
import { writeFileSync } from 'fs';
const B1 = 'Bài 1. Phương trình mặt phẳng', B2 = 'Bài 2. Phương trình đường thẳng trong không gian', B3 = 'Bài 3. Công thức tính góc trong không gian', B4 = 'Bài 4. Phương trình mặt cầu', B5 = 'Bài 5. Ôn tập chương';
const M1 = 'Nhận biết vectơ pháp tuyến, cặp vectơ chỉ phương, điểm thuộc mặt phẳng', M2 = 'Viết phương trình tổng quát của mặt phẳng', M3 = 'Xét vị trí tương đối của hai mặt phẳng', M4 = 'Tính khoảng cách từ một điểm đến mặt phẳng', M5 = 'Bài toán cực trị liên quan đến mặt phẳng', M6 = 'Bài toán thực tế về phương trình mặt phẳng';
const L1 = 'Nhận biết vectơ chỉ phương, điểm thuộc đường thẳng', L2 = 'Viết phương trình tham số, chính tắc của đường thẳng', L3 = 'Xét vị trí tương đối giữa đường thẳng và mặt phẳng, giữa hai đường thẳng', L4 = 'Tìm hình chiếu, điểm đối xứng qua đường thẳng, mặt phẳng',
  L5 = 'Tính khoảng cách liên quan đến đường thẳng', L6 = 'Đường vuông góc chung của hai đường thẳng chéo nhau', L7 = 'Bài toán cực trị và nâng cao về đường thẳng', L8 = 'Bài toán thực tế về phương trình đường thẳng';
const G1 = 'Tính góc giữa hai đường thẳng', G2 = 'Tính góc giữa đường thẳng và mặt phẳng', G3 = 'Tính góc giữa hai mặt phẳng', G4 = 'Xét các mệnh đề về góc trong không gian', G5 = 'Bài toán thực tế về góc trong không gian';
const C1 = 'Nhận biết phương trình mặt cầu, tìm tâm và bán kính', C2 = 'Viết phương trình mặt cầu', C3 = 'Vị trí tương đối giữa mặt phẳng và mặt cầu', C4 = 'Bài toán thực tế về mặt cầu';
const dang = [
  { bai: B1, cu: null, moi: M1, yc: 'Xác định được vectơ pháp tuyến, cặp vectơ chỉ phương của mặt phẳng và kiểm tra được điểm thuộc mặt phẳng.' },
  { bai: B1, cu: M2, moi: M2, yc: 'Viết được phương trình tổng quát của mặt phẳng khi biết điểm và vectơ pháp tuyến, cặp vectơ chỉ phương, ba điểm, hoặc song song, vuông góc với mặt phẳng, đường thẳng cho trước.', gop: ['Viết phương trình mặt phẳng'] },
  { bai: B1, cu: M3, moi: M3, yc: 'Xét được vị trí tương đối (song song, trùng, cắt, vuông góc) của hai mặt phẳng và tìm được tham số thoả điều kiện.' },
  { bai: B1, cu: M4, moi: M4, yc: 'Tính được khoảng cách từ một điểm đến mặt phẳng, giữa hai mặt phẳng song song và vận dụng vào hình chóp, lăng trụ.' },
  { bai: B1, cu: 'Bài toán cực trị', moi: M5, yc: 'Giải được bài toán cực trị về khoảng cách, thể tích liên quan đến mặt phẳng và điểm.' },
  { bai: B1, cu: null, moi: M6, yc: 'Vận dụng được phương trình mặt phẳng để giải bài toán thực tế (mái nhà, sân khấu, tấm kính nghiêng).' },

  { bai: B2, cu: 'Nhận biết điểm thuộc đường thẳng', moi: L1, yc: 'Xác định được vectơ chỉ phương của đường thẳng và kiểm tra được điểm thuộc đường thẳng.' },
  { bai: B2, cu: L2, moi: L2, yc: 'Viết được phương trình tham số, chính tắc của đường thẳng khi biết điểm và vectơ chỉ phương, hai điểm, giao tuyến hai mặt phẳng, hoặc vuông góc với mặt phẳng.' },
  { bai: B2, cu: L3, moi: L3, yc: 'Xét được vị trí tương đối giữa hai đường thẳng (song song, cắt, chéo, trùng) và giữa đường thẳng với mặt phẳng, tìm được giao điểm.', gop: ['Vị trí tương đối, cắt nhau'] },
  { bai: B2, cu: 'Hình chiếu, điểm đối xứng', moi: L4, yc: 'Tìm được hình chiếu vuông góc và điểm đối xứng của một điểm qua đường thẳng, mặt phẳng.', gop: ['Điểm đối xứng, hình chiếu'] },
  { bai: B2, cu: 'Khoảng cách', moi: L5, yc: 'Tính được khoảng cách từ một điểm đến đường thẳng, giữa hai đường thẳng song song và hai đường thẳng chéo nhau.', gop: ['Khoảng cách giữa hai đường thẳng chéo nhau'] },
  { bai: B2, cu: L6, moi: L6, yc: 'Viết được phương trình đường vuông góc chung của hai đường thẳng chéo nhau.' },
  { bai: B2, cu: 'Bài toán cực trị', moi: L7, yc: 'Giải được bài toán cực trị, đường phân giác, tâm đường tròn ngoại tiếp và các bài toán nâng cao về đường thẳng trong không gian.', gop: ['Bài toán tổng hợp (Đường phân giác)', 'Tâm đường tròn ngoại tiếp, trục của tam giác'] },
  { bai: B2, cu: L8, moi: L8, yc: 'Vận dụng được phương trình đường thẳng để giải bài toán thực tế (máy bay, cáp treo, tia sáng, đường giao thông).', gop: ['Bài toán tổng hợp'] },

  { bai: B3, cu: G1, moi: G1, yc: 'Tính được góc giữa hai đường thẳng bằng vectơ chỉ phương trong hệ toạ độ và trong hình chóp, lăng trụ.' },
  { bai: B3, cu: G2, moi: G2, yc: 'Tính được góc giữa đường thẳng và mặt phẳng bằng vectơ chỉ phương và vectơ pháp tuyến.' },
  { bai: B3, cu: G3, moi: G3, yc: 'Tính được góc giữa hai mặt phẳng bằng hai vectơ pháp tuyến.' },
  { bai: B3, cu: 'Toán tổng hợp', moi: G4, yc: 'Xét được tính đúng sai của các mệnh đề và giải được bài toán tổng hợp về góc, khoảng cách trong hình chóp, lăng trụ bằng toạ độ.' },
  { bai: B3, cu: 'Toán thực tế', moi: G5, yc: 'Vận dụng được công thức tính góc để giải bài toán thực tế (mái nhà, sân khấu, tháp, dốc).' },

  { bai: B4, cu: C1, moi: C1, yc: 'Nhận biết được phương trình mặt cầu và xác định được tâm, bán kính từ phương trình.' },
  { bai: B4, cu: C2, moi: C2, yc: 'Viết được phương trình mặt cầu khi biết tâm và bán kính, đường kính, tâm và tiếp xúc với mặt phẳng, đi qua các điểm.' },
  { bai: B4, cu: C3, moi: C3, yc: 'Xét được vị trí tương đối giữa mặt phẳng và mặt cầu, tìm được tâm và bán kính đường tròn giao tuyến.' },
  { bai: B4, cu: null, moi: C4, yc: 'Vận dụng được phương trình mặt cầu để giải bài toán thực tế (vùng phủ sóng, vệ tinh, GPS).' },
  { bai: B5, cu: 'Tổng hợp phương pháp tọa độ không gian (mặt phẳng, đường thẳng, mặt cầu)', moi: 'Bài tập tổng hợp chương 5', yc: 'Vận dụng tổng hợp kiến thức của chương 5 để giải các bài toán ôn tập, kiểm tra cuối chương.' },
];
const xoa = [];
const ids = (s) => s.trim().split(/[\s,]+/).filter(Boolean);
const M = [
  [B2, L8, 'i1uj'],
  [B3, G5, 'va25 11xv'],
];
const chuyen = {};
for (const [bai, d, s] of M) for (const id of ids(s)) { if (chuyen[id]) throw new Error('trùng ' + id); chuyen[id] = [bai, d]; }
writeFileSync('scratch/soi-dang/lop12-c5.ke-hoach.json', JSON.stringify({ lop: '12', chuong: 5, dang, xoa, chuyen }, null, 1));
console.log(Object.keys(chuyen).length, 'câu chuyển');
