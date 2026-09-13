/* Kế hoạch lớp 12 chương 1 - đọc tay 700 câu trong scratch/soi-dang/lop12-c1.txt; dọn 4 dạng lạc ở Bài 6, gộp dạng song sinh, tách tham số */
import { writeFileSync } from 'fs';
const B1 = 'Bài 1. Tính đơn điệu và cực trị của hàm số', B2 = 'Bài 2. Giá trị lớn nhất và giá trị nhỏ nhất của hàm số', B3 = 'Bài 3. Đường tiệm cận của đồ thị hàm số', B4 = 'Bài 4. Khảo sát sự biến thiên và vẽ đồ thị hàm số', B5 = 'Bài 5. Ứng dụng của đạo hàm', B6 = 'Bài 6. Ôn tập chương';
const A1 = 'Lý thuyết về tính đơn điệu và cực trị', A2 = 'Tìm khoảng đơn điệu dựa vào bảng biến thiên, bảng xét dấu', A3 = 'Tìm khoảng đơn điệu dựa vào đồ thị hàm số', A4 = 'Tìm khoảng đơn điệu dựa vào đồ thị đạo hàm', A5 = 'Tìm khoảng đơn điệu dựa vào biểu thức đạo hàm',
  A6 = 'Xét tính đơn điệu, tìm khoảng đơn điệu của hàm số cho bởi công thức', A7 = 'Tìm tham số để hàm số thỏa mãn điều kiện đơn điệu', A8 = 'Tìm cực trị, số điểm cực trị dựa vào bảng biến thiên, bảng xét dấu', A9 = 'Tìm cực trị của hàm số dựa vào đồ thị hàm số',
  A10 = 'Tìm cực trị, số điểm cực trị dựa vào đồ thị đạo hàm', A11 = 'Tìm cực trị, số điểm cực trị dựa vào biểu thức đạo hàm', A12 = 'Tìm cực trị, số điểm cực trị của hàm số cho bởi công thức', A13 = 'Tìm tham số để hàm số thỏa mãn điều kiện cực trị',
  A14 = 'Xét các mệnh đề về tính đơn điệu và cực trị của hàm số', A15 = 'Ứng dụng cực trị vào hình học', A16 = 'Bài toán thực tế về tính đơn điệu và cực trị';
const G1 = 'Tìm giá trị lớn nhất, nhỏ nhất của hàm số trên đoạn', G2 = 'Tìm giá trị lớn nhất, nhỏ nhất của hàm số trên khoảng, nửa khoảng', G3 = 'Tìm giá trị lớn nhất, nhỏ nhất dựa vào bảng biến thiên', G4 = 'Tìm giá trị lớn nhất, nhỏ nhất dựa vào đồ thị',
  G5 = 'Tìm tham số để giá trị lớn nhất, nhỏ nhất thỏa mãn điều kiện', G6 = 'Xét các mệnh đề về giá trị lớn nhất, nhỏ nhất của hàm số', G7 = 'Bài toán thực tế về giá trị lớn nhất, nhỏ nhất';
const T1 = 'Nhận biết tiệm cận từ giới hạn của hàm số', T2 = 'Tìm tiệm cận của đồ thị hàm số cho bởi công thức', T3 = 'Xác định tiệm cận qua đồ thị, bảng biến thiên', T4 = 'Tìm tham số liên quan đến tiệm cận', T5 = 'Xét các mệnh đề về tiệm cận và đồ thị hàm phân thức', T6 = 'Bài toán thực tế về tiệm cận';
const K1 = 'Nhận dạng đồ thị hàm số', K2 = 'Xác định hệ số, tâm đối xứng, giao điểm với trục toạ độ từ đồ thị', K3 = 'Phân tích, tổng hợp tính chất đồ thị hàm số', K4 = 'Sự tương giao của hai đồ thị', K5 = 'Tiếp tuyến và yếu tố hình học', K6 = 'Bài toán thực tế về khảo sát hàm số';
const U1 = 'Bài toán tối ưu trong thực tế', U2 = 'Thiết lập mô hình toán học và khảo sát', U3 = 'Khảo sát hàm số thực tế (cho sẵn công thức)', U4 = 'Đọc thông tin từ đồ thị, bảng biến thiên trong bài toán thực tế';
const dang = [
  { bai: B1, cu: A1, moi: A1, yc: 'Nhận biết được tính đơn điệu, điểm cực trị, giá trị cực trị và các mệnh đề lí thuyết về đơn điệu, cực trị.' },
  { bai: B1, cu: 'Tìm khoảng đơn điệu dựa vào bảng biến thiên', moi: A2, yc: 'Xác định được các khoảng đồng biến, nghịch biến của hàm số dựa vào bảng biến thiên, bảng xét dấu đạo hàm.' },
  { bai: B1, cu: A3, moi: A3, yc: 'Xác định được các khoảng đồng biến, nghịch biến của hàm số dựa vào đồ thị hàm số.' },
  { bai: B1, cu: A4, moi: A4, yc: 'Xác định được các khoảng đồng biến, nghịch biến của hàm số dựa vào đồ thị của đạo hàm.' },
  { bai: B1, cu: null, moi: A5, yc: 'Xác định được các khoảng đồng biến, nghịch biến của hàm số khi biết biểu thức đạo hàm.' },
  { bai: B1, cu: 'Xét tính đơn điệu của hàm số cho bởi công thức', moi: A6, yc: 'Xét được tính đơn điệu và tìm được các khoảng đồng biến, nghịch biến của hàm số cho bởi công thức.', gop: ['Tìm khoảng đơn điệu của hàm số cho bởi công thức'] },
  { bai: B1, cu: A7, moi: A7, yc: 'Tìm được giá trị của tham số để hàm số đồng biến, nghịch biến trên R hoặc trên một khoảng cho trước.' },
  { bai: B1, cu: 'Tìm cực trị của hàm số dựa vào bảng biến thiên', moi: A8, yc: 'Xác định được điểm cực trị, giá trị cực trị và số điểm cực trị của hàm số dựa vào bảng biến thiên, bảng xét dấu.', gop: ['Tìm số điểm cực trị dựa vào bảng biến thiên'] },
  { bai: B1, cu: A9, moi: A9, yc: 'Xác định được điểm cực trị, giá trị cực trị của hàm số dựa vào đồ thị hàm số.' },
  { bai: B1, cu: 'Tìm cực trị của hàm số dựa vào đồ thị đạo hàm', moi: A10, yc: 'Xác định được các điểm cực trị, số điểm cực trị của hàm số dựa vào đồ thị của đạo hàm.', gop: ['Tìm số điểm cực trị dựa vào đồ thị đạo hàm'] },
  { bai: B1, cu: 'Tìm cực trị dựa vào biểu thức đạo hàm', moi: A11, yc: 'Xác định được các điểm cực trị, số điểm cực trị của hàm số khi biết biểu thức đạo hàm.', gop: ['Tìm số điểm cực trị dựa vào biểu thức đạo hàm'] },
  { bai: B1, cu: 'Tìm cực trị của hàm số cho bởi công thức', moi: A12, yc: 'Tính được toạ độ điểm cực trị, giá trị cực trị và số điểm cực trị của hàm số cho bởi công thức.', gop: ['Tìm số điểm cực trị của hàm số cho bởi công thức'] },
  { bai: B1, cu: A13, moi: A13, yc: 'Tìm được giá trị của tham số để hàm số có cực trị thoả mãn điều kiện cho trước.' },
  { bai: B1, cu: 'Toán tổng hợp', moi: A14, yc: 'Xét được tính đúng sai của các mệnh đề về tính đơn điệu, cực trị của một hàm số cho bởi công thức, bảng biến thiên hoặc đồ thị.' },
  { bai: B1, cu: A15, moi: A15, yc: 'Tính được khoảng cách, độ dài, diện tích liên quan đến các điểm cực trị của đồ thị hàm số.' },
  { bai: B1, cu: 'Toán thực tế', moi: A16, yc: 'Giải quyết được bài toán thực tế bằng tính đơn điệu và cực trị của hàm số (chuyển động, lợi nhuận, nhiệt độ).' },

  { bai: B2, cu: 'Min-Max trên đoạn', moi: G1, yc: 'Tìm được giá trị lớn nhất, giá trị nhỏ nhất của hàm số trên một đoạn bằng đạo hàm.' },
  { bai: B2, cu: 'Min-Max trên khoảng', moi: G2, yc: 'Tìm được giá trị lớn nhất, giá trị nhỏ nhất của hàm số trên khoảng, nửa khoảng hoặc trên tập xác định bằng bảng biến thiên.' },
  { bai: B2, cu: 'Min-max bằng bảng biến thiên', moi: G3, yc: 'Xác định được giá trị lớn nhất, giá trị nhỏ nhất của hàm số dựa vào bảng biến thiên cho trước.' },
  { bai: B2, cu: 'Min-max bằng đồ thị', moi: G4, yc: 'Xác định được giá trị lớn nhất, giá trị nhỏ nhất của hàm số dựa vào đồ thị cho trước.' },
  { bai: B2, cu: 'Min-max chứa tham số m', moi: G5, yc: 'Tìm được giá trị của tham số để giá trị lớn nhất, giá trị nhỏ nhất của hàm số thoả mãn điều kiện cho trước.' },
  { bai: B2, cu: 'Toán tổng hợp', moi: G6, yc: 'Xét được tính đúng sai của các mệnh đề về giá trị lớn nhất, giá trị nhỏ nhất của một hàm số.' },
  { bai: B2, cu: 'Toán thực tế', moi: G7, yc: 'Vận dụng được giá trị lớn nhất, giá trị nhỏ nhất của hàm số để giải bài toán tối ưu trong thực tế (chi phí, diện tích, thể tích).', gop: ['Ứng dụng thực tế của cực trị'] },

  { bai: B3, cu: 'Lý thuyết và định nghĩa', moi: T1, yc: 'Nhận biết được tiệm cận đứng, tiệm cận ngang, tiệm cận xiên của đồ thị hàm số từ các giới hạn cho trước.' },
  { bai: B3, cu: 'Tìm tiệm cận bằng biểu thức đại số', moi: T2, yc: 'Tìm được phương trình các đường tiệm cận đứng, ngang, xiên và số đường tiệm cận của đồ thị hàm số cho bởi công thức.' },
  { bai: B3, cu: T3, moi: T3, yc: 'Xác định được các đường tiệm cận của đồ thị hàm số dựa vào đồ thị hoặc bảng biến thiên.' },
  { bai: B3, cu: null, moi: T4, yc: 'Tìm được giá trị của tham số để đồ thị hàm số có tiệm cận thoả mãn điều kiện cho trước.' },
  { bai: B3, cu: 'Bài toán tổng hợp đồ thị hàm số', moi: T5, yc: 'Xét được tính đúng sai của các mệnh đề về tiệm cận, tâm đối xứng và các tính chất của đồ thị hàm phân thức.' },
  { bai: B3, cu: 'Toán thực tế', moi: T6, yc: 'Giải quyết được bài toán thực tế có mô hình hàm phân thức và ý nghĩa của tiệm cận (chi phí trung bình, nồng độ, dân số).' },

  { bai: B4, cu: K1, moi: K1, yc: 'Nhận biết được công thức hàm số tương ứng với đồ thị hoặc bảng biến thiên cho trước.' },
  { bai: B4, cu: 'Xác định yếu tố đặc trưng của đồ thị', moi: K2, yc: 'Xác định được dấu các hệ số, tâm đối xứng, giao điểm với trục toạ độ của đồ thị hàm số bậc ba, hàm phân thức.', gop: ['Xác định dấu các hệ số của hàm bậc ba dựa vào đồ thị'] },
  { bai: B4, cu: K3, moi: K3, yc: 'Vận dụng được các tính chất về đơn điệu, cực trị, tiệm cận để phân tích đồ thị và xét tính đúng sai của các mệnh đề.', gop: ['Toán tổng hợp'] },
  { bai: B4, cu: 'Bài toán tổng hợp đồ thị hàm số', moi: K4, yc: 'Xác định được số giao điểm, toạ độ giao điểm của hai đồ thị và biện luận số nghiệm của phương trình bằng đồ thị.' },
  { bai: B4, cu: K5, moi: K5, yc: 'Vận dụng được đạo hàm để giải bài toán về tiếp tuyến và các yếu tố hình học liên quan đến đồ thị hàm số.' },
  { bai: B4, cu: 'Toán thực tế', moi: K6, yc: 'Vận dụng được khảo sát hàm số để giải quyết bài toán thực tế.' },

  { bai: B5, cu: 'Toán thực tế', moi: U1, yc: 'Giải quyết được bài toán tối ưu trong thực tế (chi phí, doanh thu, khoảng cách, kích thước) bằng đạo hàm.' },
  { bai: B5, cu: U2, moi: U2, yc: 'Thiết lập được mô hình hàm số từ tình huống thực tế và vận dụng đạo hàm để khảo sát, tìm giá trị tối ưu.' },
  { bai: B5, cu: U3, moi: U3, yc: 'Khảo sát được hàm số cho sẵn công thức trong bài toán thực tế (nồng độ thuốc, dân số, chi phí) để trả lời câu hỏi.' },
  { bai: B5, cu: 'Đọc đồ thị, bảng biến thiên, bảng xét dấu', moi: U4, yc: 'Đọc được thông tin về xu hướng, giá trị lớn nhất, nhỏ nhất từ đồ thị, bảng biến thiên trong bài toán thực tế.' },
  { bai: B6, cu: null, moi: 'Bài tập tổng hợp chương 1', yc: 'Vận dụng tổng hợp kiến thức của chương 1 để giải các bài toán ôn tập, kiểm tra cuối chương.' },
];
const xoa = ['Toán tổng hợp', 'Bài toán tổng hợp đồ thị hàm số', 'Toán thực tế', 'Đọc đồ thị, bảng biến thiên, bảng xét dấu'].map(dang => ({ bai: B6, dang }));
const ids = (s) => s.trim().split(/[\s,]+/).filter(Boolean);
const M = [
  [B1, A5, '14_2 219_6 009_1 39_0 35_7 35_8 35_9 33_0'],
  [B1, A7, '609_2 07_0 07_1 07_2 07_3 07_4 07_5 07_6 07_7 07_8 07_9 07_10 07_11 7_12 7_13 7_14 7_15 7_16 00_0 700_1 700_2 700_3 700_4 w8km 17_9 05_20 00_9 04_7 45_19 554_16 2_18 48_9 05_0 05_1 05_2 05_3 05_4 05_5 05_6 05_7 05_8 05_9 05_10 05_11 05_12 05_13 05_14 05_15 05_16 05_18 05_19 05_21 33_6'],
  [B1, A13, '48_16 04_4 819_15 57_1 2_10 20_0 20_1 20_2 20_3 20_4 ysm7 ppmh'],
  [B1, A14, 'xgu3 33_1 08_9 609_12 iqz8 dygz za9q rxrd on5z jwo8 c49b hovl 44uo nkhr 1_12 39_13 2kws 009_6 009_5 09_7 x8m0 qsj1 08_10'],
  [B1, A16, '919_2 919_3'],
  [B2, G6, 'jt3t apzp 6jzd occy 2954_12 0954_11 0954_10 6u3k 2954_14 2954_15'],
  [B3, T4, '14_12 45_10 18_14 18_15 11_10 17_7 08_3 04_6 819_8 419_16 59tl'],
  [B4, K3, '554_18 48_18 dsz0 gfc5 e0qr dxge 9hkf q3mv'],
  [B4, K4, '11_6 00_6 419_6 42_5 57_5 14_13 11_19'],
  [B5, U1, '009_11 09_13'],
];
const chuyen = {};
for (const [bai, d, s] of M) for (const id of ids(s)) { if (chuyen[id]) throw new Error('trùng ' + id); chuyen[id] = [bai, d]; }
writeFileSync('scratch/soi-dang/lop12-c1.ke-hoach.json', JSON.stringify({ lop: '12', chuong: 1, dang, xoa, chuyen }, null, 1));
console.log(Object.keys(chuyen).length, 'câu chuyển');
