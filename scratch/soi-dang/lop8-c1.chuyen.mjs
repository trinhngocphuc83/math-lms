/* Kế hoạch lớp 8 chương 1 (Đa thức) - đọc tay 505 câu trong scratch/soi-dang/lop8-c1.txt */
import { writeFileSync } from 'fs';
const B1 = 'Bài 1. Đơn thức', B2 = 'Bài 2. Đa thức nhiều biến', B3 = 'Bài 3. Phép cộng và trừ đa thức', B4 = 'Bài 4. Phép nhân đa thức', B5 = 'Bài 5. Phép chia đa thức cho đơn thức', B6 = 'Bài 6. Ôn tập chương';
const D1 = 'Nhận biết đơn thức; xác định hệ số, phần biến và bậc của đơn thức', D2 = 'Thu gọn đơn thức, nhân các đơn thức', D3 = 'Nhận biết các đơn thức đồng dạng',
  D4 = 'Cộng, trừ các đơn thức đồng dạng', D5 = 'Tìm đơn thức chưa biết trong đẳng thức', D6 = 'Bài toán nâng cao về đơn thức', D7 = 'Tính giá trị của đơn thức', D8 = 'Bài toán thực tế về đơn thức';
const E1 = 'Nhận biết đa thức; xác định hạng tử, hệ số và bậc của hạng tử', E2 = 'Thu gọn đa thức', E3 = 'Tìm bậc của đa thức', E4 = 'Tính giá trị của đa thức', E5 = 'Bài toán thực tế về đa thức', E6 = 'Bài toán nâng cao về đa thức';
const F1 = 'Cộng, trừ hai đa thức và rút gọn biểu thức', F3 = 'Tìm đa thức chưa biết trong đẳng thức', F4 = 'Tính giá trị của biểu thức sau khi cộng, trừ đa thức', F5 = 'Chứng minh giá trị biểu thức không phụ thuộc vào biến, luôn dương',
  F6 = 'Bài toán thực tế về cộng, trừ đa thức', F7 = 'Bài toán chia hết và nâng cao về cộng, trừ đa thức', F8 = 'Tìm x bằng phép cộng, trừ đa thức';
const G1 = 'Nhân đơn thức với đa thức', G2 = 'Nhân đa thức với đa thức', G3 = 'Rút gọn biểu thức và tính giá trị sau khi nhân đa thức', G4 = 'Tính giá trị biểu thức bằng cách hợp lí (thay số bằng biến)',
  G5 = 'Chứng minh đẳng thức, giá trị biểu thức không phụ thuộc vào biến', G6 = 'Tìm x bằng phép nhân đa thức', G7 = 'Bài toán thực tế về nhân đa thức';
const H1 = 'Chia đơn thức cho đơn thức', H2 = 'Chia đa thức cho đơn thức', H3 = 'Tìm điều kiện để phép chia là phép chia hết', H4 = 'Tính giá trị của biểu thức có phép chia đa thức cho đơn thức',
  H5 = 'Tìm đơn thức, đa thức chưa biết trong phép chia', H6 = 'Tìm x bằng phép chia đa thức cho đơn thức', H7 = 'Chứng minh giá trị biểu thức không phụ thuộc vào biến và bài toán nâng cao', H8 = 'Bài toán thực tế về chia đa thức cho đơn thức';
const dang = [
  { bai: B1, cu: 'Nhận biết các đơn thức nhiều biến, đa thức nhiều biến', moi: D1, yc: 'Nhận biết được đơn thức, đơn thức thu gọn và xác định được hệ số, phần biến, bậc của đơn thức.', gop: ['Tìm bậc đa thức'] },
  { bai: B1, cu: 'Thu gọn đa thức', moi: D2, yc: 'Thu gọn được đơn thức và thực hiện được phép nhân các đơn thức, chỉ ra hệ số, phần biến, bậc của kết quả.', gop: ['Thu gọn đơn thức', 'Rút gọn và tính giá trị biểu thức'] },
  { bai: B1, cu: 'Nhận biết các đơn thức đồng dạng', moi: D3, yc: 'Nhận biết được các đơn thức đồng dạng và xếp được các đơn thức thành từng nhóm đồng dạng.' },
  { bai: B1, cu: 'Cộng, trừ các đơn thức đồng dạng', moi: D4, yc: 'Thực hiện được phép cộng, phép trừ các đơn thức đồng dạng.' },
  { bai: B1, cu: 'Tìm đơn thức thỏa mãn đẳng thức', moi: D5, yc: 'Tìm được đơn thức chưa biết trong đẳng thức có phép cộng, trừ, nhân đơn thức.' },
  { bai: B1, cu: null, moi: D6, yc: 'Giải được các bài toán nâng cao về đơn thức: xét dấu của đơn thức, tổng các lũy thừa bậc chẵn bằng 0, so sánh giá trị các đơn thức.', gop: ['Chứng minh'] },
  { bai: B1, cu: 'Tính giá trị của đa thức', moi: D7, yc: 'Tính được giá trị của đơn thức (sau khi thu gọn nếu cần) tại giá trị cho trước của các biến.', gop: ['Tính giá trị của biểu thức', 'Tính tổng và hiệu đa thức'] },
  { bai: B1, cu: 'Toán thực tế', moi: D8, yc: 'Lập được đơn thức biểu thị đại lượng trong tình huống thực tế và tính được giá trị của nó.' },

  { bai: B2, cu: 'Nhận biết đa thức, hạng tử của đa thức', moi: E1, yc: 'Nhận biết được đa thức nhiều biến, chỉ ra được các hạng tử và xác định được hệ số, bậc của từng hạng tử.', gop: ['Nhận biết các đơn thức nhiều biến, đa thức nhiều biến'] },
  { bai: B2, cu: 'Thu gọn đa thức', moi: E2, yc: 'Thu gọn được đa thức nhiều biến bằng cách cộng, trừ các hạng tử đồng dạng.' },
  { bai: B2, cu: 'Tìm bậc đa thức', moi: E3, yc: 'Xác định được bậc của đa thức nhiều biến sau khi thu gọn.' },
  { bai: B2, cu: 'Tính giá trị của đa thức', moi: E4, yc: 'Tính được giá trị của đa thức nhiều biến (sau khi thu gọn nếu cần) tại giá trị cho trước của các biến.' },
  { bai: B2, cu: 'Toán thực tế', moi: E5, yc: 'Lập được đa thức biểu thị diện tích, thể tích, số tiền... trong tình huống thực tế và tính được giá trị của nó.' },
  { bai: B2, cu: null, moi: E6, yc: 'Giải được các bài toán nâng cao về đa thức: tìm giá trị nhỏ nhất, tìm nghiệm, đa thức có tham số.', gop: ['Rút gọn và tính giá trị biểu thức'] },

  { bai: B3, cu: 'Tính tổng và hiệu đa thức', moi: F1, yc: 'Thực hiện được phép cộng, phép trừ hai đa thức nhiều biến và rút gọn được biểu thức có dấu ngoặc.' },
  { bai: B3, cu: 'Tìm đa thức thõa mãn đẳng thức', moi: F3, yc: 'Tìm được đa thức chưa biết khi biết tổng hoặc hiệu của nó với một đa thức cho trước.' },
  { bai: B3, cu: null, moi: F4, yc: 'Rút gọn được biểu thức bằng phép cộng, trừ đa thức rồi tính giá trị tại giá trị cho trước của các biến.', gop: ['Tính giá trị của đa thức'] },
  { bai: B3, cu: 'Chứng minh', moi: F5, yc: 'Chứng minh được giá trị của biểu thức không phụ thuộc vào biến hoặc luôn dương, luôn âm bằng phép cộng, trừ đa thức.' },
  { bai: B3, cu: 'Toán thực tế', moi: F6, yc: 'Vận dụng được phép cộng, trừ đa thức để giải bài toán thực tế về chu vi, diện tích, số tiền.' },
  { bai: B3, cu: 'Dạng toán chia hết', moi: F7, yc: 'Giải được các bài toán chia hết và bài toán nâng cao (đa thức bậc cao, tìm nghiệm nguyên) bằng phép cộng, trừ đa thức.', gop: ['Tìm bậc đa thức'] },
  { bai: B3, cu: null, moi: F8, yc: 'Tìm được x trong đẳng thức có phép cộng, trừ các đa thức.' },

  { bai: B4, cu: 'Phép nhân đa thức', moi: G1, yc: 'Thực hiện được phép nhân đơn thức với đa thức.' },
  { bai: B4, cu: null, moi: G2, yc: 'Thực hiện được phép nhân đa thức với đa thức và thu gọn kết quả.' },
  { bai: B4, cu: 'Rút gọn và tính giá trị biểu thức', moi: G3, yc: 'Rút gọn được biểu thức có phép nhân đa thức và tính được giá trị tại giá trị cho trước của biến.' },
  { bai: B4, cu: null, moi: G4, yc: 'Tính được giá trị biểu thức bằng cách hợp lí: thay số bằng biến rồi rút gọn, dùng các hệ thức đối xứng.', gop: ['Tính giá trị của biểu thức'] },
  { bai: B4, cu: 'Chứng minh', moi: G5, yc: 'Chứng minh được đẳng thức và chứng minh được giá trị của biểu thức không phụ thuộc vào biến bằng phép nhân đa thức.' },
  { bai: B4, cu: 'Tìm x', moi: G6, yc: 'Tìm được x trong đẳng thức có phép nhân đa thức bằng cách khai triển và thu gọn.' },
  { bai: B4, cu: 'Toán thực tế', moi: G7, yc: 'Vận dụng được phép nhân đa thức để giải bài toán thực tế về diện tích, thể tích, chuyển động.' },

  { bai: B5, cu: 'Chia đơn thức cho đơn thức', moi: H1, yc: 'Thực hiện được phép chia đơn thức cho đơn thức trong trường hợp chia hết.' },
  { bai: B5, cu: 'Chia đa thức cho đơn thức', moi: H2, yc: 'Thực hiện được phép chia đa thức cho đơn thức trong trường hợp chia hết.' },
  { bai: B5, cu: 'Phép chia hết', moi: H3, yc: 'Tìm được số tự nhiên n để đơn thức, đa thức chia hết cho đơn thức cho trước.', gop: ['Dạng toán chia hết'] },
  { bai: B5, cu: 'Tính giá trị của biểu thức', moi: H4, yc: 'Rút gọn được biểu thức có phép chia đa thức cho đơn thức rồi tính giá trị tại giá trị cho trước của biến.', gop: ['Rút gọn và tính giá trị biểu thức'] },
  { bai: B5, cu: 'Tìm đơn thức thỏa mãn đẳng thức', moi: H5, yc: 'Tìm được đơn thức, đa thức chưa biết trong đẳng thức có phép chia.', gop: ['Tìm đa thức thõa mãn đẳng thức'] },
  { bai: B5, cu: 'Tìm x', moi: H6, yc: 'Tìm được x trong đẳng thức có phép chia đa thức cho đơn thức.' },
  { bai: B5, cu: 'Chứng minh', moi: H7, yc: 'Chứng minh được giá trị biểu thức không phụ thuộc vào biến, luôn dương và giải được bài toán nâng cao về phép chia đa thức.' },
  { bai: B5, cu: 'Toán thực tế', moi: H8, yc: 'Vận dụng được phép chia đa thức cho đơn thức để tính kích thước hình, chiều cao, diện tích đáy trong bài toán thực tế.' },
  { bai: B6, cu: 'Bài tập tổng hợp chương 1', moi: 'Bài tập tổng hợp chương 1', yc: 'Vận dụng tổng hợp kiến thức của chương 1 để giải các bài toán ôn tập, kiểm tra cuối chương.' },
];
const xoa = [
  { bai: B2, dang: 'Tính tổng và hiệu đa thức' }, { bai: B2, dang: 'Tìm x' },
  { bai: B3, dang: 'Tính giá trị của biểu thức' },
  { bai: B4, dang: 'Tìm đơn thức thỏa mãn đẳng thức' },
];
const ids = (s) => s.trim().split(/[\s,]+/).filter(Boolean);
const M = [
  [B1, D1, 'q1yd cg0v rtf0'],
  [B1, D2, 'y5s8 4ufz 58x0 wkm0 nxqt 2mh3 5g36 csxx 3ppb grni fho4 om7i'],
  [B1, D3, 'yvhr tehh'],
  [B1, D4, 'gtrv mpqk elfn'],
  [B1, D5, 'owea'],
  [B1, D6, '3y92 rhuy ksyf d5ct z2e5'],
  [B1, D8, '6agj'],
  [B2, E1, '9zu6 xtfu 9rgt'],
  [B2, E2, '9z7i 1423 xuhc pcfq 29ug 8xda o4u2 b3xu 4fm5 lazp bkrv b6mt hp09'],
  [B2, E3, '9d5r'],
  [B2, E4, '17s0 o2cz 8yeg htkb c1e4 8dpz 0rc2'],
  [B2, E6, 'slvt'],
  [B3, F1, 'bpb4'],
  [B3, F4, '1ete zy1s vwts x8uc b6bz'],
  [B3, F7, '3liq 26n8 haou'],
  [B3, F8, '485o axqt'],
  [B4, G2, 't4ox e9oj a5w7 2ac2 zmch 094o 3q6v kuwh 2siq krbe oq5q jnr6 otno jlau z47e koq1 8uab fxbh hnrf'],
  [B4, G4, 'l135 2rs9 loxf qd5s d094 q6m2 vu2h 8s1p sokm'],
  [B5, H1, '9xhu'],
  [B5, H2, 'cm5z'],
  [B5, H5, 'fvn3 wr9z'],
  [B5, H7, 'y9xy'],
];
const chuyen = {};
for (const [bai, d, s] of M) for (const id of ids(s)) { if (chuyen[id]) throw new Error('trùng ' + id); chuyen[id] = [bai, d]; }
writeFileSync('scratch/soi-dang/lop8-c1.ke-hoach.json', JSON.stringify({ lop: '8', chuong: 1, dang, xoa, chuyen }, null, 1));
console.log(Object.keys(chuyen).length, 'câu chuyển');
