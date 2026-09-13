/* Kế hoạch lớp 11 chương 1 (Lượng giác) - đọc tay 255 câu; dọn 14 dạng lạc ở Bài 5 ôn tập. */
import { writeFileSync } from 'fs';
const B1 = 'Bài 1. Giá trị lượng giác của góc lượng giác', B2 = 'Bài 2. Công thức lượng giác', B3 = 'Bài 3. Hàm số lượng giác', B4 = 'Bài 4. Phương trình lượng giác cơ bản', B5 = 'Bài 5. Ôn tập chương';
const A1 = 'Đổi đơn vị đo góc, tính độ dài cung tròn', A2 = 'Xác định số đo góc lượng giác, biểu diễn góc trên đường tròn lượng giác', A3 = 'Tính các giá trị lượng giác của một góc lượng giác',
  A4 = 'Rút gọn, tính giá trị biểu thức lượng giác bằng hệ thức cơ bản và góc liên quan đặc biệt', A5 = 'Bài toán thực tế về góc lượng giác và độ dài cung';
const C1 = 'Sử dụng công thức cộng', C2 = 'Sử dụng công thức nhân đôi, công thức hạ bậc', C3 = 'Sử dụng công thức biến đổi tổng thành tích, tích thành tổng', C4 = 'Chứng minh đẳng thức, nhận dạng tam giác bằng công thức lượng giác', C5 = 'Bài toán thực tế ứng dụng công thức lượng giác';
const H1 = 'Tìm tập xác định, tính chẵn lẻ của hàm số lượng giác', H2 = 'Chu kì và đồ thị của hàm số lượng giác', H3 = 'Giá trị lớn nhất và giá trị nhỏ nhất của hàm số lượng giác', H4 = 'Xét các mệnh đề về hàm số lượng giác (tập xác định, chu kì, tính chẵn lẻ, giá trị lớn nhất, nhỏ nhất)', H5 = 'Bài toán thực tế ứng dụng hàm số lượng giác';
const P1 = 'Giải phương trình sin x = a, cos x = a', P2 = 'Giải phương trình tan x = a, cot x = a', P3 = 'Giải phương trình lượng giác đưa về phương trình cơ bản', P4 = 'Biện luận số nghiệm của phương trình lượng giác chứa tham số', P5 = 'Ứng dụng phương trình lượng giác trong bài toán thực tế';
const dang = [
  { bai: B1, cu: 'Đổi đơn vị đo góc, độ dài cung tròn', moi: A1, yc: 'Đổi được số đo góc giữa độ và radian, tính được độ dài cung tròn khi biết bán kính và số đo cung.' },
  { bai: B1, cu: null, moi: A2, yc: 'Xác định được số đo của góc lượng giác, hệ thức Chasles và biểu diễn được góc lượng giác trên đường tròn lượng giác.', gop: ['Toán tổng hợp'] },
  { bai: B1, cu: 'Tính các giá trị lượng giác của một góc lượng giác', moi: A3, yc: 'Tính được các giá trị lượng giác của một góc lượng giác khi biết một giá trị lượng giác và khoảng của góc.' },
  { bai: B1, cu: 'Rút gọn biểu thức lượng giác cơ bản', moi: A4, yc: 'Rút gọn và tính được giá trị biểu thức lượng giác bằng các hệ thức cơ bản và giá trị lượng giác của các góc liên quan đặc biệt.' },
  { bai: B1, cu: null, moi: A5, yc: 'Vận dụng được số đo góc lượng giác, độ dài cung tròn để giải bài toán thực tế (bánh xe quay, kim đồng hồ, đu quay).' },

  { bai: B2, cu: 'Sử dụng công thức cộng, công thức nhân đôi', moi: C1, yc: 'Vận dụng được công thức cộng để tính giá trị lượng giác của tổng, hiệu hai góc và rút gọn biểu thức.' },
  { bai: B2, cu: null, moi: C2, yc: 'Vận dụng được công thức nhân đôi, công thức hạ bậc để tính giá trị lượng giác của góc 2a, a/2 và rút gọn biểu thức.' },
  { bai: B2, cu: 'Sử dụng công thức biến đổi tổng thành tích, tích thành tổng', moi: C3, yc: 'Vận dụng được công thức biến đổi tích thành tổng và tổng thành tích để rút gọn, tính giá trị biểu thức lượng giác.' },
  { bai: B2, cu: 'Toán tổng hợp', moi: C4, yc: 'Chứng minh được đẳng thức lượng giác và nhận dạng được tam giác từ hệ thức lượng giác cho trước.' },
  { bai: B2, cu: 'Bài toán thực tế ứng dụng công thức lượng giác', moi: C5, yc: 'Vận dụng được các công thức lượng giác để giải quyết bài toán thực tế (dao động điều hoà, góc nhìn, khoảng cách).' },

  { bai: B3, cu: H1, moi: H1, yc: 'Xác định được tập xác định và xét được tính chẵn, lẻ của hàm số lượng giác.' },
  { bai: B3, cu: H2, moi: H2, yc: 'Nhận biết được tính tuần hoàn, chu kì, khoảng đồng biến, nghịch biến và đồ thị của hàm số lượng giác; đọc được số nghiệm từ đồ thị.' },
  { bai: B3, cu: H3, moi: H3, yc: 'Tìm được giá trị lớn nhất, giá trị nhỏ nhất và tập giá trị của hàm số lượng giác.' },
  { bai: B3, cu: 'Toán tổng hợp', moi: H4, yc: 'Xét được tính đúng sai của các mệnh đề về tập xác định, chu kì, tính chẵn lẻ, giá trị lớn nhất, nhỏ nhất của một hàm số lượng giác.' },
  { bai: B3, cu: H5, moi: H5, yc: 'Giải quyết được bài toán thực tế gắn với mô hình hàm số lượng giác (thuỷ triều, số giờ có ánh sáng, guồng nước, dao động).' },

  { bai: B4, cu: P1, moi: P1, yc: 'Giải được phương trình lượng giác cơ bản dạng sin x = a, cos x = a và tìm được nghiệm trên một khoảng cho trước.' },
  { bai: B4, cu: P2, moi: P2, yc: 'Giải được phương trình lượng giác cơ bản dạng tan x = a, cot x = a và tìm được nghiệm trên một khoảng cho trước.' },
  { bai: B4, cu: null, moi: P3, yc: 'Giải được phương trình lượng giác đưa về phương trình cơ bản (phương trình tích, sin x = k·cos x, sin u = cos v).' },
  { bai: B4, cu: P4, moi: P4, yc: 'Biện luận được số nghiệm của phương trình lượng giác chứa tham số trên một khoảng cho trước.' },
  { bai: B4, cu: P5, moi: P5, yc: 'Vận dụng được phương trình lượng giác cơ bản để giải quyết bài toán thực tế (dao động, thuỷ triều, vòng quay).' },
  { bai: B5, cu: 'Tổng hợp lượng giác và phương trình lượng giác', moi: 'Bài tập tổng hợp chương 1', yc: 'Vận dụng tổng hợp kiến thức của chương 1 để giải các bài toán ôn tập, kiểm tra cuối chương.' },
];
const xoa = ['Bài toán thực tế ứng dụng công thức lượng giác', 'Đổi đơn vị đo góc, độ dài cung tròn', 'Xác định số đo của góc lượng giác', 'Sử dụng công thức biến đổi tổng thành tích, tích thành tổng',
  'Giải phương trình sin x = a, cos x = a', 'Chu kì và đồ thị của hàm số lượng giác', 'Sử dụng công thức cộng, công thức nhân đôi', 'Tính giá trị lượng giác của một góc, rút gọn biểu thức lượng giác',
  'Tìm tập xác định, tính chẵn lẻ của hàm số lượng giác', 'Giải tam giác và ứng dụng thực tế', 'Tính các giá trị lượng giác của một góc lượng giác', 'Giá trị lớn nhất và giá trị nhỏ nhất của hàm số lượng giác',
  'Bài toán thực tế ứng dụng hàm số lượng giác'].map(dang => ({ bai: B5, dang }));
const ids = (s) => s.trim().split(/[\s,]+/).filter(Boolean);
const M = [
  [B1, A1, 'ol65'],
  [B1, A2, 'vcb4 y6oi cnnx 0jxe 88kw tufl a35h 97gj w9a1 go9y lv8m c3py qxeu'],
  [B1, A3, 'atmy 83ip dt5w'],
  [B1, A4, 'pwf5 1pta wlob 2xwt'],
  [B1, A5, '9dt1 6msy ey8g hl08 7oti 31mn nd52 jfi9 9pwk bpeb yg1t'],
  [B2, C2, 'chyk jyfw ldy7 a0st hufy 1q1n vivk iwck w026 s30k 1psk usc9 leo4 60dc trd2 x743 m4vl b4fi lw0h hiir e85i p57s jvbz 8chl d399 h8h8'],
  [B2, C1, 'z2qm jbwz'],
  [B2, C3, '2mv2 b5he x6cg'],
  [B2, C5, 'l567 06xu'],
  [B3, H1, 'fldb 5vye'],
  [B3, H2, 'skzs kioc z6yj fw2g'],
  [B3, H3, '1bpk rlwr kldm kkve k74t'],
  [B3, H4, 'u12x okjz kd58 v9kt zrdt k3z4'],
  [B3, H5, '4c8b 5nwh u1yy ellh u6u1 jcmu'],
  [B4, P1, '9pok dh9h o00j nik5'],
  [B4, P3, 'ld76 tpn9'],
  [B4, P4, 'w0k5 mabz'],
];
const chuyen = {};
for (const [bai, d, s] of M) for (const id of ids(s)) { if (chuyen[id]) throw new Error('trùng ' + id); chuyen[id] = [bai, d]; }
writeFileSync('scratch/soi-dang/lop11-c1.ke-hoach.json', JSON.stringify({ lop: '11', chuong: 1, dang, xoa, chuyen }, null, 1));
console.log(Object.keys(chuyen).length, 'câu chuyển');
