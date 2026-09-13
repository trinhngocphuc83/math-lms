/* Kế hoạch lớp 12 chương 4 (Nguyên hàm - Tích phân): tách thực tế/nguyên hàm dạng cho trước khỏi 'Toán tổng hợp', gộp dạng song sinh, dọn 9 dạng lạc ở Bài 4 */
import { writeFileSync } from 'fs';
const B1 = 'Bài 1. Nguyên hàm', B2 = 'Bài 2. Tích phân', B3 = 'Bài 3. Ứng dụng hình học của tích phân', B4 = 'Bài 4. Ôn tập chương';
const N1 = 'Tính chất của nguyên hàm', N2 = 'Tìm họ nguyên hàm của hàm số', N3 = 'Tìm nguyên hàm thoả mãn điều kiện (tìm hằng số C)', N4 = 'Chứng minh, kiểm tra một hàm số là nguyên hàm của hàm số cho trước',
  N5 = 'Xét các mệnh đề về nguyên hàm', N6 = 'Xác định nguyên hàm có dạng cho trước (tìm hệ số a, b, c)', N7 = 'Bài toán thực tế về nguyên hàm (chuyển động, tăng trưởng)';
const I1 = 'Tính tích phân bằng định nghĩa và nguyên hàm cơ bản', I2 = 'Tích phân hàm chứa giá trị tuyệt đối', I3 = 'Sử dụng tính chất của tích phân', I4 = 'Sử dụng ý nghĩa hình học để tính tích phân',
  I5 = 'Tích phân của hàm số cho bởi nhiều công thức, hàm ẩn', I6 = 'Xét các mệnh đề về tích phân', I7 = 'Bài toán thực tế về tích phân (quãng đường, lưu lượng, tăng trưởng)';
const D1 = 'Tính diện tích hình thang cong bằng tích phân', D2 = 'Tính diện tích hình phẳng giới hạn bởi 1 đồ thị, trục hoành và 2 đường thẳng', D3 = 'Tính diện tích hình phẳng giới hạn bởi 2 đồ thị và 2 đường thẳng',
  D4 = 'Tính thể tích khối tròn xoay', D5 = 'Tính thể tích vật thể khi biết diện tích mặt cắt', D6 = 'Xét các mệnh đề về diện tích hình phẳng, thể tích', D7 = 'Bài toán thực tế về diện tích, thể tích bằng tích phân';
const dang = [
  { bai: B1, cu: N1, moi: N1, yc: 'Nhận biết được khái niệm, tính chất của nguyên hàm và vận dụng để tính nguyên hàm của tổng, hiệu, tích với hằng số.' },
  { bai: B1, cu: N2, moi: N2, yc: 'Tìm được họ nguyên hàm của hàm đa thức, phân thức, luỹ thừa, mũ, lượng giác bằng bảng nguyên hàm và tính chất.' },
  { bai: B1, cu: 'Tìm hàm số khi biết đạo hàm (tìm hàng số C)', moi: N3, yc: 'Tìm được nguyên hàm cụ thể của hàm số thoả mãn điều kiện cho trước (đi qua một điểm, giá trị tại một điểm).' },
  { bai: B1, cu: 'Chứng minh nguyên hàm', moi: N4, yc: 'Chứng minh, kiểm tra được một hàm số là nguyên hàm của hàm số cho trước bằng đạo hàm.' },
  { bai: B1, cu: 'Toán tổng hợp', moi: N5, yc: 'Xét được tính đúng sai của các mệnh đề về nguyên hàm của một hoặc nhiều hàm số cho trước.' },
  { bai: B1, cu: null, moi: N6, yc: 'Xác định được các hệ số của nguyên hàm có dạng cho trước bằng cách đạo hàm và đồng nhất hệ số.' },
  { bai: B1, cu: null, moi: N7, yc: 'Vận dụng được nguyên hàm để giải bài toán thực tế về chuyển động (vận tốc, gia tốc, quãng đường), tốc độ tăng trưởng.' },

  { bai: B2, cu: I1, moi: I1, yc: 'Tính được tích phân của hàm đa thức, phân thức, mũ, lượng giác bằng định nghĩa và bảng nguyên hàm.', gop: ['Tính tích phân'] },
  { bai: B2, cu: I2, moi: I2, yc: 'Tính được tích phân của hàm số chứa giá trị tuyệt đối bằng cách xét dấu và tách đoạn.' },
  { bai: B2, cu: null, moi: I3, yc: 'Vận dụng được các tính chất của tích phân (tách đoạn, tổ hợp tuyến tính, đổi cận) để tính tích phân khi biết một số tích phân cho trước.' },
  { bai: B2, cu: I4, moi: I4, yc: 'Tính được tích phân của một số hàm số đơn giản bằng ý nghĩa hình học (diện tích hình thang cong, hình tròn).' },
  { bai: B2, cu: 'Xác định hàm số từ đẳng thức đạo hàm', moi: I5, yc: 'Tính được tích phân của hàm số cho bởi nhiều công thức và xác định được hàm số, tích phân từ đẳng thức chứa đạo hàm.' },
  { bai: B2, cu: 'Bài toán tổng hợp đồ thị hàm số', moi: I6, yc: 'Xét được tính đúng sai của các mệnh đề về tích phân của các hàm số cho trước.' },
  { bai: B2, cu: 'Ứng dụng tích phân - Toán thực tế', moi: I7, yc: 'Vận dụng được tích phân để giải bài toán thực tế về quãng đường, lưu lượng, tăng trưởng, công.' },

  { bai: B3, cu: 'Sử dụng ý nghĩa hình học để tính tích phân', moi: D1, yc: 'Tính được diện tích hình thang cong giới hạn bởi đồ thị hàm số, trục hoành và hai đường thẳng bằng tích phân.' },
  { bai: B3, cu: D2, moi: D2, yc: 'Tính được diện tích hình phẳng giới hạn bởi một đồ thị, trục hoành và hai đường thẳng, kể cả khi hàm số đổi dấu.' },
  { bai: B3, cu: D3, moi: D3, yc: 'Tính được diện tích hình phẳng giới hạn bởi hai đồ thị và hai đường thẳng, kể cả khi phải tìm hoành độ giao điểm.' },
  { bai: B3, cu: D4, moi: D4, yc: 'Tính được thể tích khối tròn xoay sinh ra khi quay hình phẳng quanh trục Ox.' },
  { bai: B3, cu: D5, moi: D5, yc: 'Tính được thể tích vật thể khi biết diện tích mặt cắt vuông góc với trục.' },
  { bai: B3, cu: 'Bài toán tổng hợp đồ thị hàm số', moi: D6, yc: 'Xét được tính đúng sai của các mệnh đề về diện tích hình phẳng, thể tích khối tròn xoay và các yếu tố đồ thị liên quan.' },
  { bai: B3, cu: 'Ứng dụng tích phân - Toán thực tế', moi: D7, yc: 'Vận dụng được tích phân để tính diện tích, thể tích của vật thể trong thực tế (cổng parabol, cốc rượu, hầm biogas, chi tiết máy).' },
  { bai: B4, cu: null, moi: 'Bài tập tổng hợp chương 4', yc: 'Vận dụng tổng hợp kiến thức của chương 4 để giải các bài toán ôn tập, kiểm tra cuối chương.' },
];
const xoa = ['Tính tích phân', 'Ứng dụng tích phân - Toán thực tế', 'Tính diện tích hình phẳng giới hạn bởi 2 đồ thị và 2 đường thẳng', 'Tính tích phân bằng định nghĩa và nguyên hàm cơ bản', 'Bài toán tổng hợp đồ thị hàm số',
  'Tìm họ nguyên hàm của hàm số', 'Tìm hàm số khi biết đạo hàm (tìm hàng số C)', 'Tính thể tích khối tròn xoay', 'Tính diện tích hình phẳng giới hạn bởi 1 đồ thị, trục hoành và 2 đường thẳng'].map(dang => ({ bai: B4, dang }));
const ids = (s) => s.trim().split(/[\s,]+/).filter(Boolean);
const M = [
  [B1, N2, 'okxn 2mr3'],
  [B1, N3, 'pya8'],
  [B1, N5, 'gxsg'],
  [B1, N6, 'pzgn ywke crf2 df8o 8znv 0eh2 ne30 199x esx1 w2k6 dpbw'],
  [B1, N7, 'zq0a 6td3 ipb2 9ifv sqc4 o32f 60oy lopm ejsp 0i4m p9iv q53g acrs tw0b 0pli p1wk ptqq'],
  [B2, I1, '57me'],
  [B2, I3, '70r6 nsor 9ess jbdl ezet 85rt visz 56sg kqqg vgge'],
  [B2, I4, '0w7x'],
  [B2, I5, 's7cb dzub 1q9f wchi 3188 lyl9 deil yyst 6eyv suhh'],
  [B2, I7, 't9f6 4qou'],
  [B3, D2, 'hnkj'],
  [B3, D3, 'c0dw'],
  [B3, D4, 'jjk8 fdb3'],
  [B3, D6, 'me9c'],
  [B3, D7, 'iebp q531 fqhv v9ba'],
];
const chuyen = {};
for (const [bai, d, s] of M) for (const id of ids(s)) { if (chuyen[id]) throw new Error('trùng ' + id); chuyen[id] = [bai, d]; }
writeFileSync('scratch/soi-dang/lop12-c4.ke-hoach.json', JSON.stringify({ lop: '12', chuong: 4, dang, xoa, chuyen }, null, 1));
console.log(Object.keys(chuyen).length, 'câu chuyển');
