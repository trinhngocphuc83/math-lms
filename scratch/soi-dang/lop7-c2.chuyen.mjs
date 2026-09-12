/* Kế hoạch lớp 7 chương 2 (Số thực): sinh tệp kế hoạch từ danh sách mã đã đọc tay. */
import { writeFileSync } from 'fs';
const B1 = 'Bài 1. Làm quen với số thập phân vô hạn tuần hoàn', B2 = 'Bài 2. Số vô tỉ - Căn bậc hai số học', B3 = 'Bài 3. Tập hợp các số thực', B4 = 'Bài 4. Ôn tập chương';
const dang = [
  { bai: B1, cu: 'Nhận biết & viết gọn số thập phân vô hạn tuần hoàn', moi: 'Nhận biết số thập phân hữu hạn, vô hạn tuần hoàn và viết gọn bằng chu kì', yc: 'Nhận biết được phân số nào viết được thành số thập phân hữu hạn hay vô hạn tuần hoàn và viết gọn được số thập phân vô hạn tuần hoàn bằng chu kì.' },
  { bai: B1, cu: null, moi: 'Đổi phân số sang số thập phân và ngược lại', yc: 'Viết được phân số dưới dạng số thập phân (hữu hạn hoặc vô hạn tuần hoàn) và viết được số thập phân hữu hạn, vô hạn tuần hoàn dưới dạng phân số tối giản.' },
  { bai: B1, cu: null, moi: 'Bài toán nâng cao về số thập phân vô hạn tuần hoàn', yc: 'Chứng minh được các đẳng thức có số thập phân vô hạn tuần hoàn và tìm được điều kiện để một phân số viết được dưới dạng số thập phân hữu hạn.' },
  { bai: B1, cu: 'So sánh hai số thực', moi: 'So sánh các số thập phân vô hạn tuần hoàn', yc: 'So sánh và sắp xếp được các số thập phân hữu hạn, vô hạn tuần hoàn.' },
  { bai: B1, cu: 'Làm tròn số với độ chính xác cho trước', moi: 'Làm tròn số với độ chính xác cho trước', yc: 'Làm tròn được số thập phân đến một hàng cho trước hoặc với độ chính xác cho trước.' },
  { bai: B1, cu: 'Ước lượng kết quả phép tính bằng cách làm tròn', moi: 'Ước lượng và bài toán thực tế về làm tròn số', yc: 'Ước lượng được kết quả phép tính bằng cách làm tròn và vận dụng làm tròn số vào bài toán thực tế.' },

  { bai: B2, cu: 'Nhận biết & ước lượng số vô tỉ', moi: 'Nhận biết số vô tỉ, chứng minh một số là số vô tỉ', yc: 'Nhận biết được số vô tỉ và chứng minh được một số cho trước (√2, √3, tổng của số hữu tỉ với số vô tỉ) là số vô tỉ.' },
  { bai: B2, cu: 'Tính căn bậc hai số học của một số', moi: 'Tính căn bậc hai số học của một số', yc: 'Tính được căn bậc hai số học của một số tự nhiên là số chính phương, phân số hoặc số thập phân có dạng bình phương.' },
  { bai: B2, cu: null, moi: 'Tìm căn bậc hai của một số', yc: 'Tìm được các căn bậc hai (dương và âm) của một số không âm và nhận biết được số âm không có căn bậc hai.' },
  { bai: B2, cu: null, moi: 'Tính giá trị biểu thức chứa căn bậc hai', yc: 'Tính được giá trị của biểu thức có nhiều căn bậc hai số học kết hợp với các phép tính khác.' },
  { bai: B2, cu: null, moi: 'Tìm x trong đẳng thức chứa căn bậc hai, x² = a', yc: 'Tìm được x trong các đẳng thức dạng √x = a, x² = a và các biểu thức chứa căn bậc hai đơn giản.' },
  { bai: B2, cu: 'Tính căn bậc hai số học bằng máy tính cầm tay', moi: 'Tính căn bậc hai số học bằng máy tính cầm tay', yc: 'Sử dụng được máy tính cầm tay để tính, làm tròn và so sánh căn bậc hai số học.' },
  { bai: B2, cu: 'Toán thực tế', moi: 'Bài toán thực tế về căn bậc hai số học', yc: 'Vận dụng được căn bậc hai số học để giải bài toán thực tế (tính cạnh hình vuông khi biết diện tích...).' },

  { bai: B3, cu: 'Nhận biết số thực – phân loại số hữu tỉ và số vô tỉ', moi: 'Nhận biết số thực, kí hiệu và quan hệ giữa các tập hợp số', yc: 'Nhận biết được số thực, phân biệt được số hữu tỉ với số vô tỉ và dùng đúng kí hiệu ∈, ∉, ⊂ với các tập hợp N, Z, Q, I, R.' },
  { bai: B3, cu: 'Tìm số đối của một số thực', moi: 'Tìm số đối của một số thực', yc: 'Xác định được số đối của một số thực cho trước.' },
  { bai: B3, cu: 'Biểu diễn số thực trên trục số', moi: 'Biểu diễn số thực trên trục số', yc: 'Biểu diễn được một số thực cho trước trên trục số.' },
  { bai: B3, cu: 'So sánh hai số thực', moi: 'So sánh các số thực', yc: 'So sánh và sắp xếp được các số thực, kể cả số có chứa căn bậc hai, bằng biểu diễn thập phân hoặc bình phương hai vế.' },
  { bai: B3, cu: 'Tính giá trị tuyệt đối và xác định dấu của một số thực', moi: 'Giá trị tuyệt đối của số thực và biểu thức chứa giá trị tuyệt đối', yc: 'Tính được giá trị tuyệt đối của một số thực, xác định được dấu và tính được giá trị biểu thức chứa dấu giá trị tuyệt đối.' },
  { bai: B3, cu: 'tìm số thực x thỏa mãn điều kiện về giá trị tuyệt đối', moi: 'Tìm x trong đẳng thức chứa giá trị tuyệt đối', yc: 'Tìm được số thực x thoả mãn đẳng thức dạng |ax + b| = c và các đẳng thức có tổng các giá trị tuyệt đối bằng 0.' },
  { bai: B3, cu: null, moi: 'Tìm giá trị lớn nhất, nhỏ nhất của biểu thức chứa giá trị tuyệt đối hoặc căn bậc hai', yc: 'Tìm được giá trị lớn nhất, nhỏ nhất của biểu thức chứa dấu giá trị tuyệt đối hoặc căn bậc hai dựa vào |A| ≥ 0, √A ≥ 0.' },
  { bai: B4, cu: 'Bài tập tổng hợp chương 2', moi: 'Bài tập tổng hợp chương 2', yc: 'Vận dụng tổng hợp kiến thức của chương 2 để giải các bài toán ôn tập, kiểm tra cuối chương.' },
];
const xoa = [
  { bai: B1, dang: 'Toán thực tế' }, { bai: B3, dang: 'Toán thực tế' }, { bai: B3, dang: 'Toán tổng hợp' },
  { bai: B3, dang: 'Tính căn bậc hai số học của một số' }, { bai: B3, dang: 'Làm tròn số với độ chính xác cho trước' }, { bai: B3, dang: 'Nhận biết & ước lượng số vô tỉ' },
];
const ids = (s) => s.trim().split(/[\s,]+/).filter(Boolean);
const M = [
  [B1, 'Đổi phân số sang số thập phân và ngược lại', 'p4bw om96 0csc s21f qtmo 399v aken u0p9 8ic1 3a6w bg8x 56g1 6p28 u4vc sgf0 fzxc srd4 02af sotx i106 oali taex kq5q 93z3 4r30 fsc4 30_6 30_2 30_4 30_0 30_3 30_1 30_5 30_7 30_8 c365 23_6 23_5 d343 30_9 0_10'],
  [B1, 'Bài toán nâng cao về số thập phân vô hạn tuần hoàn', 'x31p mvz2 gyeq 7dhu 5t8o'],
  [B1, 'Làm tròn số với độ chính xác cho trước', 'hdli gmm8 3r1v'],
  [B1, 'Ước lượng và bài toán thực tế về làm tròn số', '8xmk lxww'],
  [B2, 'Nhận biết số vô tỉ, chứng minh một số là số vô tỉ', 'vvq3 100d'],
  [B2, 'Tìm căn bậc hai của một số', '1y9h s2or sq2g rmk7 cjky qez8 w3nf gkok fxsx 05_7 06_9 6_11 6_12 6_13 6_14 6_15 6_16 6_17 6_18 6_19 6_20 6_22 6_23 6_25 6_26 6_27 6_28 6_29 6_30'],
  [B2, 'Tính giá trị biểu thức chứa căn bậc hai', 'bdvs bequ 5vc7 vna8 wl1d lohy cl9b dsn7 iez4 07tg c8x2 nswv wb3m lvz3 gdej 1mr6 klnd 0lzb yv66 hd0x w4tu eflc 05_3 9g8g p44x r8pb wxzd lf44'],
  [B2, 'Tìm x trong đẳng thức chứa căn bậc hai, x² = a', 'th3m rxrz ru8f vetr xlek dulp wj29 zq79 b5o4 cpky w0r7 i0ah jdpj z4px a3uy'],
  [B3, 'So sánh các số thực', 'qaje t3kg'],
  [B3, 'Giá trị tuyệt đối của số thực và biểu thức chứa giá trị tuyệt đối', 'tuki lb2b'],
  [B3, 'Tìm giá trị lớn nhất, nhỏ nhất của biểu thức chứa giá trị tuyệt đối hoặc căn bậc hai', 'x4zs 18ph yxne tsq3 7igc vvj7 bgz6'],
];
const chuyen = {};
for (const [bai, d, s] of M) for (const id of ids(s)) { if (chuyen[id]) throw new Error('trùng ' + id); chuyen[id] = [bai, d]; }
writeFileSync('scratch/soi-dang/lop7-c2.ke-hoach.json', JSON.stringify({ lop: '7', chuong: 2, dang, xoa, chuyen }, null, 1));
console.log(Object.keys(chuyen).length, 'câu chuyển');
