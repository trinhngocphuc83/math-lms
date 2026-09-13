/* Kế hoạch lớp 12 chương 2 (Vectơ, toạ độ không gian): gom dạng trùng tên rải ở 3 bài về đúng bài, dọn 7 dạng lạc ở Bài 4 */
import { writeFileSync } from 'fs';
const B1 = 'Bài 1. Vectơ trong không gian', B2 = 'Bài 2. Hệ trục toạ độ trong không gian', B3 = 'Bài 3. Biểu thức toạ độ của các phép toán vectơ', B4 = 'Bài 4. Ôn tập chương';
const V1 = 'Nhận biết vectơ, quy tắc hình hộp, tổng hiệu vectơ trong không gian', V2 = 'Biểu diễn vectơ, chứng minh đẳng thức vectơ trong không gian', V3 = 'Tính độ dài của vectơ trong hình không gian', V4 = 'Tính tích vô hướng, góc giữa hai vectơ trong không gian', V5 = 'Bài toán thực tế về vectơ trong không gian (lực, vận tốc)';
const H1 = 'Xác định toạ độ điểm, vectơ từ biểu diễn qua vectơ đơn vị', H2 = 'Xác định toạ độ các điểm đặc biệt (hình chiếu, điểm đối xứng, điểm thuộc mặt phẳng, trục)', H3 = 'Xác định toạ độ điểm thông qua khối hình học không gian', H4 = 'Bài toán thực tế về hệ trục toạ độ trong không gian';
const P1 = 'Xác định toạ độ của vectơ, biểu thức vectơ bằng toạ độ', P2 = 'Xác định toạ độ của điểm thoả điều kiện cho trước', P3 = 'Tính tích vô hướng, góc giữa hai vectơ bằng toạ độ', P4 = 'Tính độ dài, diện tích, thể tích và các đại lượng hình học bằng toạ độ', P5 = 'Bài toán thực tế về toạ độ vectơ (lực, vận tốc, vị trí)';
const dang = [
  { bai: B1, cu: 'Các quy tắc cơ bản của vectơ trong không gian', moi: V1, yc: 'Nhận biết được vectơ trong không gian, vận dụng được quy tắc ba điểm, quy tắc hình bình hành, quy tắc hình hộp để xác định vectơ tổng, hiệu.' },
  { bai: B1, cu: 'Biểu diễn và chứng minh đẳng thức vectơ có chứa điểm đặc biệt', moi: V2, yc: 'Biểu diễn được một vectơ theo các vectơ cho trước và chứng minh được đẳng thức vectơ có trung điểm, trọng tâm trong không gian.' },
  { bai: B1, cu: 'Tính độ dài của vectơ', moi: V3, yc: 'Tính được độ dài của vectơ tổng, hiệu trong hình hộp, tứ diện, hình chóp.' },
  { bai: B1, cu: 'Góc giữa hai vectơ và tích vô hướng', moi: V4, yc: 'Tính được tích vô hướng và góc giữa hai vectơ trong không gian bằng định nghĩa và tính chất.' },
  { bai: B1, cu: 'Toán thực tế - Lực', moi: V5, yc: 'Vận dụng được vectơ trong không gian để giải bài toán về hợp lực, vận tốc, cân bằng lực.' },

  { bai: B2, cu: 'Xác định tọa độ điểm, vectơ bằng biểu thức tọa độ, hệ thức vectơ', moi: H1, yc: 'Xác định được toạ độ của điểm, của vectơ từ biểu diễn qua các vectơ đơn vị và ngược lại; đọc được toạ độ trong hệ trục.' },
  { bai: B2, cu: 'Xác định tọa độ các điểm đặc biệt (Hình chiếu, điểm đối xứng, điểm thuộc mặt phẳng/trục)', moi: H2, yc: 'Xác định được toạ độ hình chiếu, điểm đối xứng của một điểm qua trục, mặt phẳng toạ độ và điểm thuộc trục, mặt phẳng toạ độ.' },
  { bai: B2, cu: 'Xác định tọa độ điểm thông qua khối hình học không gian', moi: H3, yc: 'Chọn được hệ trục toạ độ gắn với hình hộp chữ nhật, hình chóp, hình lăng trụ và xác định được toạ độ các đỉnh.' },
  { bai: B2, cu: 'Toán thực tế', moi: H4, yc: 'Vận dụng được hệ trục toạ độ trong không gian để mô tả vị trí trong bài toán thực tế.', gop: ['Toán thực tế - Tọa độ', 'Toán thực tế - Lực'] },

  { bai: B3, cu: 'Xác định tọa độ của vectơ, biểu thức vectơ', moi: P1, yc: 'Tính được toạ độ của vectơ tổng, hiệu, tích với một số và vectơ biểu diễn qua các vectơ khác; xét được hai vectơ cùng phương.' },
  { bai: B3, cu: 'Xác định tọa độ của điểm thỏa điều kiện cho trước', moi: P2, yc: 'Xác định được toạ độ trung điểm, trọng tâm, đỉnh hình bình hành và điểm thoả mãn hệ thức vectơ cho trước.', gop: ['Xác định tọa độ điểm, vectơ bằng biểu thức tọa độ, hệ thức vectơ'] },
  { bai: B3, cu: 'Góc giữa hai vectơ và tích vô hướng', moi: P3, yc: 'Tính được tích vô hướng, góc giữa hai vectơ bằng toạ độ và xét được hai vectơ vuông góc.' },
  { bai: B3, cu: 'Tính số đo của các đại lượng hình học', moi: P4, yc: 'Tính được độ dài đoạn thẳng, độ dài vectơ, chu vi, diện tích tam giác và các đại lượng hình học bằng toạ độ.' },
  { bai: B3, cu: 'Toán thực tế - Tọa độ', moi: P5, yc: 'Vận dụng được biểu thức toạ độ của các phép toán vectơ để giải bài toán thực tế về lực, vận tốc, vị trí.', gop: ['Toán thực tế - Lực'] },
  { bai: B4, cu: null, moi: 'Bài tập tổng hợp chương 2', yc: 'Vận dụng tổng hợp kiến thức của chương 2 để giải các bài toán ôn tập, kiểm tra cuối chương.' },
];
const xoa = [
  { bai: B3, dang: 'Xác định tọa độ điểm thông qua khối hình học không gian' }, { bai: B3, dang: 'Xác định tọa độ các điểm đặc biệt (Hình chiếu, điểm đối xứng, điểm thuộc mặt phẳng/trục)' },
  ...['Xác định tọa độ của vectơ, biểu thức vectơ', 'Xác định tọa độ điểm thông qua khối hình học không gian', 'Tính độ dài của vectơ', 'Góc giữa hai vectơ và tích vô hướng', 'Tính số đo của các đại lượng hình học', 'Xác định tọa độ của điểm thỏa điều kiện cho trước', 'Xác định tọa độ các điểm đặc biệt (Hình chiếu, điểm đối xứng, điểm thuộc mặt phẳng/trục)'].map(dang => ({ bai: B4, dang })),
];
const ids = (s) => s.trim().split(/[\s,]+/).filter(Boolean);
const M = [
  [B2, H3, '1ni9 ytm7 yvdk f5wx anwq qcbk 1klj'],
  [B2, H2, 'ffsd vnag vom4 m58m dzo2'],
  [B3, P1, 'wvdd egl1 28nd 9hot n8zk 639q yfn2 i72t'],
  [B3, P2, '03_0 03_1 03_2 03_3 03_4 08_0 54_3 u5tu 0gd6 7pcx qsef u1ca jlp9 9ouw'],
  [B3, P3, 'm6pl 8zc9 nluk 2dg7 0byc'],
  [B3, P4, 'drpa hhqs amzp k0s3 oxvz'],
];
const chuyen = {};
for (const [bai, d, s] of M) for (const id of ids(s)) { if (chuyen[id]) throw new Error('trùng ' + id); chuyen[id] = [bai, d]; }
writeFileSync('scratch/soi-dang/lop12-c2.ke-hoach.json', JSON.stringify({ lop: '12', chuong: 2, dang, xoa, chuyen }, null, 1));
console.log(Object.keys(chuyen).length, 'câu chuyển');
