/* Kế hoạch lớp 8 chương 2 (Hằng đẳng thức) - đọc tay 377 câu trong scratch/soi-dang/lop8-c2.txt */
import { writeFileSync } from 'fs';
const B1 = 'Bài 1. Hiệu 2 bình phương. Bình phương của một tổng hay một hiệu', B2 = 'Bài 2. Lập phương của một tổng hay một hiệu', B3 = 'Bài 3. Tổng và hiệu 2 lập phương', B4 = 'Bài 4. Phân tích đa thức thành nhân tử', B5 = 'Bài 5. Ôn tập chương';
const TINH = 'Vận dụng hằng đẳng thức để tính', RG = 'Rút gọn và tính giá trị của biểu thức', CMDT = 'Chứng minh đẳng thức', KPT = 'Chứng minh giá trị của biểu thức không phụ thuộc vào các biến',
  TIMX = 'Tìm x thoả mãn đẳng thức', TH = 'Toán tổng hợp', GTLN = 'Tìm giá trị nhỏ nhất, lớn nhất', DUONG = 'Chứng minh giá trị của một biểu thức luôn dương (hay âm) với mọi giá trị của biến', CHIAHET = 'Chứng minh chia hết';
const A1 = 'Khai triển, viết gọn biểu thức bằng hằng đẳng thức hiệu hai bình phương, bình phương của một tổng, một hiệu', A2 = 'Tính nhanh giá trị biểu thức số bằng hằng đẳng thức', A3 = 'Rút gọn biểu thức và tính giá trị',
  A4 = 'Tính giá trị biểu thức khi biết hệ thức giữa các biến', A5 = 'Tìm x bằng hằng đẳng thức', A6 = 'Chứng minh đẳng thức, giá trị biểu thức không phụ thuộc vào biến', A7 = 'Tìm giá trị lớn nhất, giá trị nhỏ nhất của biểu thức',
  A7b = 'Chứng minh biểu thức luôn dương, luôn âm', A8 = 'Chứng minh chia hết và bài toán nâng cao', A9 = 'Bài toán thực tế về hằng đẳng thức';
const P1 = 'Khai triển, viết gọn biểu thức bằng hằng đẳng thức lập phương của một tổng, một hiệu', P2 = 'Tính nhanh giá trị biểu thức bằng hằng đẳng thức lập phương', P3 = 'Rút gọn biểu thức có lập phương của một tổng, một hiệu',
  P4 = 'Chứng minh đẳng thức, giá trị biểu thức không phụ thuộc vào biến', P5 = 'Tìm x bằng hằng đẳng thức lập phương', P6 = 'Bài toán thực tế về lập phương của một tổng, một hiệu', P7 = 'Bài toán nâng cao về lập phương của một tổng, một hiệu';
const C1 = 'Khai triển, viết gọn biểu thức bằng hằng đẳng thức tổng, hiệu hai lập phương', C2 = 'Tính nhanh giá trị biểu thức bằng hằng đẳng thức tổng, hiệu hai lập phương', C3 = 'Rút gọn biểu thức có tổng, hiệu hai lập phương',
  C4 = 'Tính giá trị biểu thức khi biết hệ thức giữa các biến', C5 = 'Chứng minh đẳng thức, giá trị biểu thức không phụ thuộc vào biến', C6 = 'Tìm x bằng hằng đẳng thức tổng, hiệu hai lập phương', C7 = 'Bài toán nâng cao về tổng, hiệu hai lập phương';
const D1 = 'Phân tích đa thức thành nhân tử bằng phương pháp đặt nhân tử chung', D2 = 'Phân tích đa thức thành nhân tử bằng phương pháp dùng hằng đẳng thức', D3 = 'Phân tích đa thức thành nhân tử bằng phương pháp nhóm hạng tử',
  D4 = 'Phân tích đa thức thành nhân tử bằng cách phối hợp nhiều phương pháp', D5 = 'Phân tích đa thức thành nhân tử bằng phương pháp tách, thêm bớt hạng tử, đặt ẩn phụ', D6 = 'Tìm x bằng phân tích đa thức thành nhân tử',
  D7 = 'Tính giá trị biểu thức bằng phân tích đa thức thành nhân tử', D8 = 'Bài toán thực tế về phân tích đa thức thành nhân tử', D9 = 'Chứng minh chia hết bằng phân tích đa thức thành nhân tử';
const dang = [
  { bai: B1, cu: TINH, moi: A1, yc: 'Khai triển được bình phương của một tổng, một hiệu, tích của tổng và hiệu; viết được biểu thức dưới dạng bình phương hoặc hiệu hai bình phương; điền đúng hạng tử còn thiếu.' },
  { bai: B1, cu: null, moi: A2, yc: 'Tính nhanh được giá trị của biểu thức số bằng cách đưa về hằng đẳng thức hiệu hai bình phương, bình phương của một tổng, một hiệu.' },
  { bai: B1, cu: RG, moi: A3, yc: 'Rút gọn được biểu thức có hằng đẳng thức rồi tính giá trị tại giá trị cho trước của biến.' },
  { bai: B1, cu: null, moi: A4, yc: 'Tính được giá trị của biểu thức khi biết tổng, hiệu, tích của các biến hoặc khi các biến thoả mãn đẳng thức có tổng bình phương bằng 0.' },
  { bai: B1, cu: TIMX, moi: A5, yc: 'Tìm được x trong đẳng thức bằng cách khai triển hằng đẳng thức và thu gọn.' },
  { bai: B1, cu: CMDT, moi: A6, yc: 'Chứng minh được đẳng thức và chứng minh được giá trị biểu thức không phụ thuộc vào biến bằng hằng đẳng thức.', gop: [KPT] },
  { bai: B1, cu: GTLN, moi: A7, yc: 'Tìm được giá trị lớn nhất, giá trị nhỏ nhất của đa thức bậc hai (một hoặc nhiều biến) bằng cách đưa về bình phương của một tổng, một hiệu.' },
  { bai: B1, cu: DUONG, moi: A7b, yc: 'Chứng minh được biểu thức luôn dương, luôn âm với mọi giá trị của biến bằng cách đưa về bình phương cộng hằng số.' },
  { bai: B1, cu: CHIAHET, moi: A8, yc: 'Chứng minh được tính chia hết và giải được các bài toán nâng cao (số chính phương, đề thi học sinh giỏi) bằng hằng đẳng thức.', gop: [TH] },
  { bai: B1, cu: null, moi: A9, yc: 'Vận dụng được hằng đẳng thức để giải bài toán thực tế về diện tích, chu vi.' },

  { bai: B2, cu: TINH, moi: P1, yc: 'Khai triển được lập phương của một tổng, một hiệu; viết được đa thức dưới dạng lập phương của một tổng, một hiệu; điền đúng hạng tử còn thiếu.' },
  { bai: B2, cu: null, moi: P2, yc: 'Tính nhanh được giá trị của biểu thức bằng cách viết gọn thành lập phương của một tổng, một hiệu.' },
  { bai: B2, cu: RG, moi: P3, yc: 'Rút gọn được biểu thức có lập phương của một tổng, một hiệu.' },
  { bai: B2, cu: CMDT, moi: P4, yc: 'Chứng minh được đẳng thức và chứng minh được giá trị biểu thức không phụ thuộc vào biến bằng hằng đẳng thức lập phương.', gop: [KPT] },
  { bai: B2, cu: TIMX, moi: P5, yc: 'Tìm được x trong đẳng thức có lập phương của một tổng, một hiệu.' },
  { bai: B2, cu: TH, moi: P6, yc: 'Vận dụng được hằng đẳng thức lập phương để giải bài toán thực tế về thể tích.' },
  { bai: B2, cu: GTLN, moi: P7, yc: 'Giải được các bài toán nâng cao về lập phương của một tổng, một hiệu (giá trị lớn nhất, chứng minh số học).', gop: [CHIAHET] },

  { bai: B3, cu: TINH, moi: C1, yc: 'Khai triển được tích dạng (a + b)(a² - ab + b²), (a - b)(a² + ab + b²); viết được tổng, hiệu hai lập phương thành tích; điền đúng hạng tử còn thiếu.' },
  { bai: B3, cu: RG, moi: C2, yc: 'Tính nhanh được giá trị của biểu thức bằng hằng đẳng thức tổng, hiệu hai lập phương.' },
  { bai: B3, cu: null, moi: C3, yc: 'Rút gọn được biểu thức có tổng, hiệu hai lập phương.' },
  { bai: B3, cu: null, moi: C4, yc: 'Tính được x³ + y³, x³ - y³ và các biểu thức liên quan khi biết tổng, hiệu, tích của x và y.' },
  { bai: B3, cu: CMDT, moi: C5, yc: 'Chứng minh được đẳng thức và chứng minh được giá trị biểu thức không phụ thuộc vào biến bằng hằng đẳng thức tổng, hiệu hai lập phương.', gop: [KPT] },
  { bai: B3, cu: TIMX, moi: C6, yc: 'Tìm được x trong đẳng thức có tổng, hiệu hai lập phương.' },
  { bai: B3, cu: TH, moi: C7, yc: 'Giải được các bài toán nâng cao về a³ + b³ + c³ - 3abc, giá trị nhỏ nhất và đề thi học sinh giỏi.', gop: [GTLN, CHIAHET] },

  { bai: B4, cu: 'Phương pháp đặt nhân tử chung', moi: D1, yc: 'Phân tích được đa thức thành nhân tử bằng phương pháp đặt nhân tử chung, kể cả khi phải đổi dấu để xuất hiện nhân tử chung.' },
  { bai: B4, cu: 'Phương pháp dùng hằng đẳng thức', moi: D2, yc: 'Phân tích được đa thức thành nhân tử bằng cách vận dụng các hằng đẳng thức đáng nhớ.' },
  { bai: B4, cu: 'Phương pháp nhóm hạng tử', moi: D3, yc: 'Phân tích được đa thức thành nhân tử bằng phương pháp nhóm hạng tử để xuất hiện nhân tử chung hoặc hằng đẳng thức.' },
  { bai: B4, cu: 'Phối hợp nhiều phương pháp', moi: D4, yc: 'Phân tích được đa thức thành nhân tử bằng cách phối hợp đặt nhân tử chung, dùng hằng đẳng thức và nhóm hạng tử.' },
  { bai: B4, cu: 'Phương pháp tách 1 hạng tử thành nhiều hạng tử', moi: D5, yc: 'Phân tích được đa thức thành nhân tử bằng phương pháp tách hạng tử, thêm bớt hạng tử hoặc đặt ẩn phụ.', gop: ['Phương pháp đổi biến', 'Phương pháp thêm bớt cùng 1 hạng tử'] },
  { bai: B4, cu: 'Tìm x', moi: D6, yc: 'Tìm được x bằng cách đưa đẳng thức về dạng tích bằng 0 nhờ phân tích đa thức thành nhân tử.' },
  { bai: B4, cu: 'Tính giá trị biểu thức', moi: D7, yc: 'Tính nhanh được giá trị của biểu thức bằng cách phân tích đa thức thành nhân tử rồi thay số.' },
  { bai: B4, cu: null, moi: D8, yc: 'Vận dụng được phân tích đa thức thành nhân tử để giải bài toán thực tế về diện tích, lãi suất, độ dài.' },
  { bai: B4, cu: 'Chứng minh biểu thức chia hết cho một số', moi: D9, yc: 'Chứng minh được biểu thức chia hết cho một số bằng cách phân tích đa thức thành nhân tử.' },
  { bai: B5, cu: 'Bài tập tổng hợp chương 2', moi: 'Bài tập tổng hợp chương 2', yc: 'Vận dụng tổng hợp kiến thức của chương 2 để giải các bài toán ôn tập, kiểm tra cuối chương.' },
];
const xoa = [{ bai: B2, dang: DUONG }, { bai: B3, dang: DUONG }];
const ids = (s) => s.trim().split(/[\s,]+/).filter(Boolean);
const M = [
  [B1, A2, 'tvs3 j905 fxxj ipgo bdet 0f4x 1p0b doyv j6nq 6p2s h8zg mfqi dvsm hkhd 3sdc 8qyy sq7p 8dkb'],
  [B1, A3, 'bmjy rv2r'],
  [B1, A4, 'vgiw 9vj8 bi90 dcqo oqod 0qjv i8ni vv1u'],
  [B1, A8, 'sfxq'],
  [B1, A9, 'oktj 1a0a'],
  [B2, P2, '32cj bijm j96b kgel uqn5 23ux ozon bh65 9cw9 ztr4 2mbl vs4r'],
  [B3, C1, 'iysc j1tp f8eh yung t9qh'],
  [B3, C2, 'e3wb wk04 5xn7'],
  [B3, C3, 'oacb 0xq7 3t6g 9b1m atua xkau'],
  [B3, C4, 'dk6d oiuj 49wh x91z 1yyr'],
  [B3, C6, '5m1u 0haz'],
  [B4, D8, 'fgmy fyq9 ijlc 563h'],
];
const chuyen = {};
for (const [bai, d, s] of M) for (const id of ids(s)) { if (chuyen[id]) throw new Error('trùng ' + id); chuyen[id] = [bai, d]; }
writeFileSync('scratch/soi-dang/lop8-c2.ke-hoach.json', JSON.stringify({ lop: '8', chuong: 2, dang, xoa, chuyen }, null, 1));
console.log(Object.keys(chuyen).length, 'câu chuyển');
