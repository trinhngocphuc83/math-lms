/* Sinh bảng "chuyen" cho kế hoạch lớp 7 chương 1 từ các danh sách mã đọc tay, ghi vào tệp kế hoạch. */
import { readFileSync, writeFileSync } from 'fs';
const B1 = 'Bài 1. Tập hợp số hữu tỉ', B2 = 'Bài 2. Cộng, trừ, nhân, chia số hữu tỉ',
  B3 = 'Bài 3. Lũy thừa với số mũ tự nhiên của số hữu tỉ', B4 = 'Bài 4. Thứ tự thực hiện các phép toán, quy tắc chuyển vế';
const ids = (s) => s.trim().split(/[\s,]+/).filter(Boolean);
const M = [
  [B1, 'Số đối của một số hữu tỉ', '2usl l79t hn8r m0jb rcyr'],
  [B1, 'Các phân số cùng biểu diễn một số hữu tỉ', 'onox'],
  [B1, 'Biểu diễn số hữu tỉ trên trục số', '38f6 umwd 8w10 3c5e f5ye 96ox xft8 xyet vfdu 9xze n45d xu5i'],
  [B1, 'Nhận biết số hữu tỉ dương, số hữu tỉ âm', 'bz3u 9zwc i2cz fd9p q9d2 o137 mjzf'],
  [B1, 'Tìm số nguyên x để biểu thức nhận giá trị nguyên', 'tqpu reys xk2x l488 y9tm ppri nuq7 3c05 gse8 s538 zbr2 ka32 824s'],
  [B1, 'Tìm số hữu tỉ thoả mãn điều kiện so sánh', '5bkw r1zh 1l0t m6up 55g6'],

  [B2, 'Thực hiện phép tính cộng, trừ, nhân, chia số hữu tỉ', 'vx0n 0jqw s9nm wm2y 92ty sy2q oi9f'],
  [B2, 'Tính hợp lí bằng tính chất của các phép tính',
    '198o bq0k d3wo mdzk oifb vhgl pppy 8d92 b1dv 37h4 0lrg ihl6 k92q 0ewr ayns 3mpi wn6v rfsk ece8 6u7s ub8c s3z7 dw9m 8u6x vzam 0ejh ko96 bf5l xbgn by9r '
    + '2rgh jda6 x1pz upfe haa1 ma2j 2pax zczv tbbp d08c 2qta w7vk ebcv rj0w achl 0xrr zla9 ejks uwos xo6c 9mum mh01 9lso 5tu0 fj5j lco5 02y7 7g2w vh6z osv0 1man a7jt 27fd e4fq hjjr iidb ekuh zntq tmsf qzkv jlzj 3f77 bu64 d3df dtce ksix wnsl 00yz'],
  [B2, 'Tính tổng dãy số có quy luật', 'kaeb'],
  [B2, 'Viết một số hữu tỉ dưới dạng tổng hoặc hiệu của hai số hữu tỉ', 'bm9g ha25'],
  [B2, 'Bài toán thực tế về các phép tính với số hữu tỉ', 'qjh8 wii7 59l7'],

  [B3, 'Nhận biết lũy thừa, các công thức về lũy thừa', 'e3q1 4l7k fcbi mjed cucr'],
  [B3, 'Tính lũy thừa của một số hữu tỉ', 'yew3'],
  [B3, 'Nhân, chia hai lũy thừa cùng cơ số, lũy thừa của lũy thừa',
    '2dq3 hdfg q10p a3ro f2mi b0mp 9a6r 2nau 1iy1 ee07 2gs4 2kki sjro wqzp rkn8 0r4o 0mz9 1sud gdr5 0p3r 3lkc q3av aa2t i4op 1xsn ycke ec8e sq6l w30j y4fx h3ka ryig 63t1 j2t2 oufd fkko x7zr i0mu 3pek 3wxl dqfo kyep cw4a gh7h'],
  [B3, 'Tính giá trị biểu thức có lũy thừa', '04ns'],
  [B3, 'Tìm cơ số x khi biết lũy thừa',
    'xaxi gobv nyzc y6io btaa gujr 4tos vlfx qqnu x3zi auys tal1 wtm0 tyvz ldb0 yt30 8peh n35q 8ggp k84j ujha uj3k lo7l wz2c 6e0p hexp k9lb n8lf 20f3 lspn cezn 6wei u2d4 l270'],
  [B3, 'So sánh các lũy thừa', 'lyls o0aj 6xf7 vd22'],
  [B3, 'Ứng dụng thực tế của lũy thừa (kí hiệu khoa học)', 'gdn5 zfgl c27u'],

  [B4, 'Nhận biết thứ tự thực hiện các phép tính và quy tắc chuyển vế', 'i9j0 5x4q gpcl'],
  [B4, 'Thực hiện phép tính theo thứ tự (biểu thức có dấu ngoặc, có lũy thừa)', '7z01 e3f2'],
  [B4, 'Tìm x bằng quy tắc chuyển vế', 'kz7e c4he 0zch vr7c hmdo s13x nkud qs9a jpsz kp4g fxbq 2roe ru9c 9pcb 9mr1 7nqy 5jpj hh0z xml2 w5ce'],
  [B4, 'Bài toán thực tế về thứ tự thực hiện phép tính', 'x72l'],
];
const chuyen = {};
for (const [bai, dang, s] of M) for (const id of ids(s)) { if (chuyen[id]) throw new Error('trùng mã ' + id); chuyen[id] = [bai, dang]; }
const p = 'scratch/soi-dang/lop7-c1.ke-hoach.json';
const kh = JSON.parse(readFileSync(p, 'utf8'));
kh.chuyen = chuyen;
writeFileSync(p, JSON.stringify(kh, null, 1));
console.log(Object.keys(chuyen).length, 'câu chuyển');
