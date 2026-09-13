/* Kế hoạch lớp 11 chương 2 (Dãy số - CSC - CSN) - đọc tay 740 câu trong scratch/soi-dang/lop11-c2.txt */
import { writeFileSync } from 'fs';
const B1 = 'Bài 1. Dãy số', B2 = 'Bài 2. Cấp số cộng', B3 = 'Bài 3. Cấp số nhân', B4 = 'Bài 4. Ôn tập chương';
const D1 = 'Nhận biết dãy số, cách cho một dãy số', D2 = 'Tính các số hạng của dãy số cho bằng công thức số hạng tổng quát', D3 = 'Tính các số hạng của dãy số cho bằng hệ thức truy hồi',
  D4 = 'Tìm công thức số hạng tổng quát của dãy số', D5 = 'Xác định vị trí của một số trong dãy số', D6 = 'Xét tính tăng, giảm của dãy số', D7 = 'Xét tính bị chặn của dãy số', D8 = 'Bài toán thực tế về dãy số';
const C1 = 'Nhận biết cấp số cộng, tìm số hạng tổng quát', C2 = 'Xác định số hạng, công sai của cấp số cộng', C3 = 'Tìm các số lập thành cấp số cộng (ba số, chèn số, số hạng liên tiếp)', C4 = 'Tính tổng các số hạng của cấp số cộng',
  C5 = 'Vận dụng cấp số cộng trong hình học, phương trình và bài toán nâng cao', C6 = 'Bài toán thực tế về cấp số cộng', C7 = 'Chứng minh tính chất của cấp số cộng', C8 = 'Xét các mệnh đề về cấp số cộng (số hạng, công sai, tổng)';
const N1 = 'Nhận biết cấp số nhân, tìm số hạng tổng quát', N2 = 'Xác định số hạng, công bội của cấp số nhân', N3 = 'Tìm các số lập thành cấp số nhân (ba số, chèn số, số hạng liên tiếp)', N4 = 'Tính tổng các số hạng của cấp số nhân',
  N5 = 'Vận dụng cấp số nhân trong hình học và phương trình', N6 = 'Bài toán thực tế về cấp số nhân', N7 = 'Chứng minh tính chất của cấp số nhân, dãy số là cấp số nhân', N8 = 'Xét các mệnh đề về cấp số nhân (số hạng, công bội, tổng)',
  N9 = 'Bài toán kết hợp cấp số cộng, cấp số nhân và bài toán nâng cao';
const dang = [
  { bai: B1, cu: null, moi: D1, yc: 'Nhận biết được dãy số hữu hạn, vô hạn và các cách cho một dãy số (liệt kê, công thức số hạng tổng quát, hệ thức truy hồi, mô tả).' },
  { bai: B1, cu: 'Xác định các số hạng của dãy số', moi: D2, yc: 'Tính được các số hạng của dãy số khi biết công thức số hạng tổng quát.' },
  { bai: B1, cu: null, moi: D3, yc: 'Tính được các số hạng của dãy số cho bằng hệ thức truy hồi.' },
  { bai: B1, cu: 'Dự đoán công thức tổng quát', moi: D4, yc: 'Tìm được công thức số hạng tổng quát của dãy số từ các số hạng đầu, từ hệ thức truy hồi hoặc từ hình vẽ.' },
  { bai: B1, cu: null, moi: D5, yc: 'Xác định được một số cho trước là số hạng thứ mấy của dãy số.' },
  { bai: B1, cu: 'Xét tính tăng giảm của dãy số', moi: D6, yc: 'Xét được tính tăng, giảm của một dãy số cho trước bằng cách xét hiệu hoặc thương hai số hạng liên tiếp.', gop: ['Toán tổng hợp'] },
  { bai: B1, cu: 'Dãy số bị chặn', moi: D7, yc: 'Xét được tính bị chặn trên, bị chặn dưới, bị chặn của một dãy số cho trước.' },
  { bai: B1, cu: 'Bài toán thực tế về dãy số', moi: D8, yc: 'Vận dụng được kiến thức về dãy số để giải quyết một số vấn đề thực tiễn (lãi suất, tăng trưởng, hình vẽ theo quy luật).' },

  { bai: B2, cu: 'Tìm công thức cấp số cộng', moi: C1, yc: 'Nhận biết được một dãy số là cấp số cộng và xác định được công thức số hạng tổng quát của cấp số cộng.' },
  { bai: B2, cu: 'Xác định số hạng, công sai', moi: C2, yc: 'Tính được số hạng chưa biết, số hạng đầu và công sai của cấp số cộng từ các điều kiện cho trước.' },
  { bai: B2, cu: null, moi: C3, yc: 'Tìm được x để ba số lập thành cấp số cộng, chèn được các số vào giữa hai số và tìm được các số hạng liên tiếp của cấp số cộng khi biết tổng, tích.' },
  { bai: B2, cu: 'Tính tổng các số hạng', moi: C4, yc: 'Tính được tổng của n số hạng đầu của cấp số cộng và tìm được n khi biết tổng.' },
  { bai: B2, cu: null, moi: C5, yc: 'Vận dụng được cấp số cộng để giải bài toán về góc, cạnh của đa giác, nghiệm của phương trình và các bài toán nâng cao.', gop: ['Toán tổng hợp'] },
  { bai: B2, cu: null, moi: C6, yc: 'Vận dụng được cấp số cộng để giải quyết bài toán thực tế (xếp ghế, trồng cây, tiền lương, khoan giếng).' },
  { bai: B2, cu: 'Chứng minh', moi: C7, yc: 'Chứng minh được các hệ thức, tính chất của cấp số cộng và chứng minh ba số lập thành cấp số cộng.' },
  { bai: B2, cu: null, moi: C8, yc: 'Xét được tính đúng sai của các mệnh đề về số hạng, công sai, tổng của một cấp số cộng cho trước.' },

  { bai: B3, cu: 'Tìm công thức cấp số nhân', moi: N1, yc: 'Nhận biết được một dãy số là cấp số nhân và xác định được công thức số hạng tổng quát của cấp số nhân.' },
  { bai: B3, cu: 'Xác định số hạng, công bội', moi: N2, yc: 'Tính được số hạng chưa biết, số hạng đầu và công bội của cấp số nhân từ các điều kiện cho trước.' },
  { bai: B3, cu: null, moi: N3, yc: 'Tìm được x để ba số lập thành cấp số nhân, chèn được các số vào giữa hai số và tìm được các số hạng liên tiếp của cấp số nhân khi biết tổng, tích.' },
  { bai: B3, cu: 'Tính tổng các số hạng', moi: N4, yc: 'Tính được tổng của n số hạng đầu của cấp số nhân và các tổng đưa được về cấp số nhân.' },
  { bai: B3, cu: null, moi: N5, yc: 'Vận dụng được cấp số nhân để giải bài toán về dãy hình vuông, tam giác lồng nhau, góc, cạnh và nghiệm của phương trình.' },
  { bai: B3, cu: 'Toán tổng hợp', moi: N6, yc: 'Vận dụng được cấp số nhân để giải quyết bài toán thực tế (lãi kép, tăng trưởng dân số, vi khuẩn, chu kì bán rã, khấu hao).' },
  { bai: B3, cu: 'Chứng minh', moi: N7, yc: 'Chứng minh được các hệ thức, tính chất của cấp số nhân và chứng minh được một dãy số cho bằng hệ thức truy hồi là cấp số nhân.' },
  { bai: B3, cu: null, moi: N8, yc: 'Xét được tính đúng sai của các mệnh đề về số hạng, công bội, tổng của một cấp số nhân cho trước.' },
  { bai: B3, cu: null, moi: N9, yc: 'Giải được bài toán kết hợp cấp số cộng và cấp số nhân, tìm các số thoả mãn điều kiện và các bài toán nâng cao về cấp số nhân.' },
  { bai: B4, cu: 'Bài tập tổng hợp chương 2', moi: 'Bài tập tổng hợp chương 2', yc: 'Vận dụng tổng hợp kiến thức của chương 2 để giải các bài toán ôn tập, kiểm tra cuối chương.' },
];
const xoa = [];
const ids = (s) => s.trim().split(/[\s,]+/).filter(Boolean);
const M = [
  [B1, D1, 'opzc cmby u62p skay wi3r'],
  [B1, D3, '1dj2 dt75 iqrj qgy2 snf6 anf6 r0he tti1 vaf5 ykfm ubk1 bh03 4p7a zp84 lq4c 2rtp tpu3 i1pl g8kg 22lj 16ms z4qs 2wot jeuw olr7 drf9 q7bp ce7j'],
  [B1, D4, 'zeuk pwqg lbvt 8xjz texo hdnb sge3 irhl ziv0 jac2 55gd usfv dfl9 53qa 49h9 jf0v 8xj9 gqw8'],
  [B1, D5, 'ok1o jnh6 m3pb q0pa rfnx b8iu el08 5rdd r0za'],
  [B1, D6, 'trzo ry24 9k92 0mgd 8g6k'],
  [B2, C4, 'd0cp'],
  [B2, C1, 'mjuh ajfn y14s 58x8 2cu4 trho 44e6 2vm1 dlpa 74cr vau1'],
  [B2, C2, 'z847'],
  [B2, C3, '3yw7 oe77 l5v4 ayrl x6x1 0tq1 xl1e 5q3y p6dg hfvm 541l kxu8 upi4 wqmb xr6j nbfa 3oe4 qyzc i7zn p40f s792 0047 fct1 8apg uzm9'],
  [B2, C5, '7h4w v0yt rcbr 4zwu t4dd fi4r dx50 9cre ubpu tege wfjn t3d5 04rc 9n44 32he h4x6 dhcm u0mw ht4u 19lq tfbq kicd r5pu ef00 w60k uv9n mim2 lezu 874y agmf tzrw pkh6 8ht3 mmyp'],
  [B2, C6, '4gk4 he94 cfqz ttjd 6uhg rfe6 x0y9 k87k a9je 50ip 55s3 cjaz ug6e zb5x fe77 foqn ntqr ktha ebxf d3qc cta3 kggc qv77 nqnk 45pn 7b1w 7sbs n5va tdxw 8rsz klbh wrpp x45b n6c1 yqgt sne5 hmpj kave 5azg g0hs ghfj cf8t vm3s ofwq vu2q 35a3 in67 kwuq b885 5vnq e04d awjh 239f 4agx uiu0 e4yp vz4d n3l5 jlhz v8xw as9s'],
  [B2, C8, 'oi95 s5zh 1dgz 4gx2 jfjw 9a94 su2n n0d3 1wrv d5kl p8xn zc2g jyup m747 wjij ibci 8200 l6kk xdk1 667s 2uux df21'],
  [B3, N1, '3pg5 afff pm67 bqvz hcl5'],
  [B3, N3, 'wrel bgpw 5lxd t7wc c1ka gndh c8ph akz0 j1he 0b1j j7i7 6gbe 9rfk j1nj mrag 51xw rqc8 vzdb 4byy 25bl'],
  [B3, N5, 'lkwi 5wy2 n46a is81 tdlu c6f1 shuw mhoi qr9p i5al 2wrz v8qy mys5 1xsw 3797 72uu xj5z pnai omzl ye61 v1jz 8d5w'],
  [B3, N6, 'n3aq du8z gvfp vmbk mm57 ozag 6mfd laso 6phj 7oop uak1 uy4d e6ji'],
  [B3, N7, 'umaz 12x8 lzvp l3dy ijja be1q 3pyd mpip m7yr hqi5 t4w5'],
  [B3, N8, 'drel 5l8g zysa xjq4 znv8 mwe9 wss3 ovbj qycs ahf3 al0q kb6g stc8 14xt y5gg lxpj'],
  [B3, N9, 'wf0a hrfh 65ml zyrh 40sy y5hn yhwy ozk2 htii u8ec wo6z eid8 zsl2 fwyd 19yg f7il xz5r uhah'],
];
const chuyen = {};
for (const [bai, d, s] of M) for (const id of ids(s)) { if (chuyen[id]) throw new Error('trùng ' + id); chuyen[id] = [bai, d]; }
writeFileSync('scratch/soi-dang/lop11-c2.ke-hoach.json', JSON.stringify({ lop: '11', chuong: 2, dang, xoa, chuyen }, null, 1));
console.log(Object.keys(chuyen).length, 'câu chuyển');
