/* Kế hoạch lớp 8 chương 3 (Tứ giác) - đọc tay 269 câu trong scratch/soi-dang/lop8-c3.txt */
import { writeFileSync } from 'fs';
const B1 = 'Bài 1. Tứ giác', B2 = 'Bài 2. Hình thang cân', B3 = 'Bài 3. Hình bình hành', B4 = 'Bài 4. Hình chữ nhật', B5 = 'Bài 5. Hình thoi và hình vuông', B6 = 'Bài 6. Ôn tập chương';
const T1 = 'Nhận biết tứ giác, tứ giác lồi; đỉnh, cạnh, đường chéo', T2 = 'Tính số đo góc của tứ giác', T3 = 'Chứng minh về góc trong tứ giác (góc ngoài, tia phân giác)', T4 = 'Chứng minh và tính độ dài liên quan đến cạnh, đường chéo của tứ giác';
const H1 = 'Nhận biết hình thang, hình thang cân và tính chất', H2 = 'Tính số đo góc của hình thang, hình thang cân', H3 = 'Tính độ dài, chu vi của hình thang cân', H4 = 'Chứng minh tứ giác là hình thang, hình thang cân', H5 = 'Chứng minh đoạn thẳng, góc bằng nhau bằng tính chất hình thang cân';
const P1 = 'Tính số đo góc của hình bình hành', P2 = 'Nhận biết hình bình hành, tính chất và dấu hiệu nhận biết', P3 = 'Chứng minh đoạn thẳng, góc bằng nhau; tính độ dài bằng tính chất hình bình hành', P4 = 'Chứng minh tứ giác là hình bình hành',
  P5 = 'Chứng minh ba điểm thẳng hàng, ba đường thẳng đồng quy bằng hình bình hành', P6 = 'Bài toán thực tế về hình bình hành';
const R1 = 'Nhận biết hình chữ nhật, tính chất và dấu hiệu nhận biết', R2 = 'Tính độ dài, số đo góc trong hình chữ nhật; đường trung tuyến ứng với cạnh huyền', R3 = 'Chứng minh tứ giác là hình chữ nhật', R4 = 'Vận dụng tính chất hình chữ nhật để chứng minh vuông góc, bằng nhau';
const V1 = 'Nhận biết hình thoi, hình vuông; tính chất và dấu hiệu nhận biết', V2 = 'Tính độ dài, chu vi, diện tích, số đo góc của hình thoi, hình vuông', V3 = 'Chứng minh tứ giác là hình thoi', V4 = 'Chứng minh tứ giác là hình vuông',
  V5 = 'Vận dụng tính chất hình thoi, hình vuông để chứng minh, tính toán', V6 = 'Xác định dạng của tứ giác', V7 = 'Bài toán dựng hình và nâng cao về hình vuông';
const dang = [
  { bai: B1, cu: 'Nhận dạng tứ giác', moi: T1, yc: 'Nhận biết được tứ giác, tứ giác lồi và chỉ ra được đỉnh, cạnh, đường chéo, góc của tứ giác; vẽ được tứ giác khi biết các yếu tố.', gop: ['Vẽ tứ giác khi biết 5 yếu tố'] },
  { bai: B1, cu: 'Tính số đo góc', moi: T2, yc: 'Tính được số đo góc của tứ giác bằng định lí tổng các góc của tứ giác bằng 360°, kể cả góc ngoài và góc giữa hai tia phân giác.' },
  { bai: B1, cu: 'Chứng minh và tính toán với tứ giác', moi: T3, yc: 'Chứng minh được các hệ thức về góc trong tứ giác (tổng góc ngoài, góc tạo bởi tia phân giác) từ định lí tổng các góc.' },
  { bai: B1, cu: 'Chứng minh hệ thức giữa các độ dài. Tính độ dài', moi: T4, yc: 'Chứng minh được bất đẳng thức về cạnh, đường chéo, chu vi của tứ giác và tính được độ dài bằng bất đẳng thức tam giác, định lí Pythagore.' },

  { bai: B2, cu: 'Nhận biết hình thang, hình thang cân', moi: H1, yc: 'Nhận biết được hình thang, hình thang cân, hình thang vuông và phát biểu đúng tính chất về cạnh bên, góc, đường chéo, trục đối xứng của hình thang cân.' },
  { bai: B2, cu: 'Tính số đo góc', moi: H2, yc: 'Tính được số đo góc của hình thang, hình thang cân từ quan hệ hai góc kề một cạnh bên bù nhau và hai góc kề một đáy bằng nhau.' },
  { bai: B2, cu: 'Tính độ dài đoạn thẳng', moi: H3, yc: 'Tính được cạnh bên, đường cao, chu vi của hình thang cân bằng cách kẻ đường cao và dùng định lí Pythagore.' },
  { bai: B2, cu: null, moi: H4, yc: 'Chứng minh được tứ giác là hình thang, hình thang cân bằng định nghĩa và dấu hiệu nhận biết (hai góc kề một đáy bằng nhau, hai đường chéo bằng nhau).' },
  { bai: B2, cu: 'Chứng minh 2 góc bằng nhau, 2 đoạn thẳng bằng nhau', moi: H5, yc: 'Vận dụng được tính chất hình thang cân để chứng minh đoạn thẳng, góc bằng nhau, tam giác cân và các quan hệ hình học.', gop: ['Chứng minh và tính toán với hình thang cân'] },

  { bai: B3, cu: 'Chứng minh 2 góc bằng nhau, tính số đo góc', moi: P1, yc: 'Tính được số đo các góc của hình bình hành từ tính chất hai góc đối bằng nhau, hai góc kề một cạnh bù nhau.' },
  { bai: B3, cu: null, moi: P2, yc: 'Nhận biết được hình bình hành, phát biểu đúng tính chất về cạnh, góc, đường chéo và các dấu hiệu nhận biết hình bình hành.' },
  { bai: B3, cu: 'Chứng minh 2 đoạn thẳng bằng nhau, các quan hệ về độ dài. Tính độ dài đoạn thẳng', moi: P3, yc: 'Vận dụng được tính chất hình bình hành để chứng minh đoạn thẳng, góc bằng nhau, đường thẳng song song và tính độ dài đoạn thẳng.', gop: ['Chứng minh và tính toán với hình bình hành'] },
  { bai: B3, cu: 'Chứng minh tứ giác là hình bình hành', moi: P4, yc: 'Chứng minh được tứ giác là hình bình hành bằng các dấu hiệu nhận biết.' },
  { bai: B3, cu: 'Chứng minh 3 điểm thẳng hàng, 3 đường thẳng đồng quy', moi: P5, yc: 'Vận dụng được tính chất hai đường chéo hình bình hành cắt nhau tại trung điểm mỗi đường để chứng minh ba điểm thẳng hàng, ba đường thẳng đồng quy.' },
  { bai: B3, cu: null, moi: P6, yc: 'Vận dụng được tính chất hình bình hành để giải bài toán thực tế.' },

  { bai: B4, cu: 'Dấu hiệu nhận biết hình chữ nhật', moi: R1, yc: 'Nhận biết được hình chữ nhật, phát biểu đúng tính chất về cạnh, góc, đường chéo và các dấu hiệu nhận biết hình chữ nhật.', gop: ['Chứng minh quan hệ bằng nhau'] },
  { bai: B4, cu: null, moi: R2, yc: 'Tính được độ dài đường chéo, cạnh, số đo góc của hình chữ nhật và độ dài đường trung tuyến ứng với cạnh huyền của tam giác vuông.' },
  { bai: B4, cu: 'Chứng minh tứ giác là hình chữ nhật', moi: R3, yc: 'Chứng minh được tứ giác là hình chữ nhật bằng các dấu hiệu nhận biết.' },
  { bai: B4, cu: 'Chứng minh quan hệ vuông góc', moi: R4, yc: 'Vận dụng được tính chất hình chữ nhật và đường trung tuyến ứng với cạnh huyền để chứng minh vuông góc, đoạn thẳng bằng nhau và tính độ dài.', gop: ['Chứng minh và tính toán với hình chữ nhật'] },

  { bai: B5, cu: 'Dấu hiệu nhận biết hình thoi', moi: V1, yc: 'Nhận biết được hình thoi, hình vuông; phát biểu đúng tính chất về cạnh, góc, đường chéo, trục đối xứng và các dấu hiệu nhận biết.', gop: ['Dấu hiệu nhận biết hình vuông', 'Chứng minh quan hệ bằng nhau'] },
  { bai: B5, cu: null, moi: V2, yc: 'Tính được cạnh, chu vi, diện tích, đường chéo, số đo góc của hình thoi, hình vuông.' },
  { bai: B5, cu: 'Chứng minh tứ giác là hình thoi', moi: V3, yc: 'Chứng minh được tứ giác là hình thoi bằng các dấu hiệu nhận biết.' },
  { bai: B5, cu: 'Chứng minh tứ giác là hình vuông', moi: V4, yc: 'Chứng minh được tứ giác là hình vuông bằng các dấu hiệu nhận biết.' },
  { bai: B5, cu: 'Tính chất và bài tập hình thoi, hình vuông', moi: V5, yc: 'Vận dụng được tính chất hình thoi, hình vuông để chứng minh đoạn thẳng, góc bằng nhau, vuông góc, thẳng hàng, đồng quy và tính toán.', gop: ['Chứng minh quan hệ vuông góc', 'Chứng minh 2 đoạn thẳng bằng nhau, các quan hệ về độ dài. Tính độ dài đoạn thẳng', 'Chứng minh 2 góc bằng nhau, 2 đoạn thẳng bằng nhau', 'Chứng minh 3 điểm thẳng hàng, 3 đường thẳng đồng quy'] },
  { bai: B5, cu: 'Nhận dạng tứ giác', moi: V6, yc: 'Xác định được tứ giác cho trước là hình thang cân, hình bình hành, hình chữ nhật, hình thoi hay hình vuông và tìm được điều kiện để tứ giác trở thành hình đặc biệt.' },
  { bai: B5, cu: null, moi: V7, yc: 'Giải được bài toán dựng hình vuông và các bài toán nâng cao về hình vuông.' },
  { bai: B6, cu: 'Bài tập tổng hợp chương 3', moi: 'Bài tập tổng hợp chương 3', yc: 'Vận dụng tổng hợp kiến thức của chương 3 để giải các bài toán ôn tập, kiểm tra cuối chương.' },
];
const xoa = [];
const ids = (s) => s.trim().split(/[\s,]+/).filter(Boolean);
const M = [
  [B1, T3, '00wd g402 3s9m qv89'],
  [B1, T4, 'od0k'],
  [B2, H3, 'mkrf'],
  [B2, H4, 'u1eu 2306 nxvs q0rb l12u 4jlk tv8l 501h'],
  [B3, P2, 'ly3w pteu hcmp dw9h rmrx q2ut tnil tmio nubr lvc9 q98d nrdn wlub'],
  [B3, P3, 'kwl9 9fkj ja6d'],
  [B3, P6, 'rv1l'],
  [B4, R1, '53xt'],
  [B4, R2, 'cwgo owcg 4h3e 1wf2 qsso'],
  [B4, R3, 'mh9m 7zd9'],
  [B5, V1, '16tf nj7t berz'],
  [B5, V2, 'yefg ge4j 39pa e5yq rah8 1z7g bq0l f07a s31z o39b'],
  [B5, V3, '7gqd clsm ctdl uish'],
  [B5, V4, 'qcpk'],
  [B5, V5, 'i7gq b72k'],
  [B5, V6, '1h18 n5ig evvm khl8'],
  [B5, V7, 'ck1j omb1 tlfn'],
];
const chuyen = {};
for (const [bai, d, s] of M) for (const id of ids(s)) { if (chuyen[id]) throw new Error('trùng ' + id); chuyen[id] = [bai, d]; }
writeFileSync('scratch/soi-dang/lop8-c3.ke-hoach.json', JSON.stringify({ lop: '8', chuong: 3, dang, xoa, chuyen }, null, 1));
console.log(Object.keys(chuyen).length, 'câu chuyển');
