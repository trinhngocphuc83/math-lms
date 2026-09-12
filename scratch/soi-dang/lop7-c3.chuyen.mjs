import { writeFileSync } from 'fs';
const B1 = 'Bài 1. Góc ở vị trí đặc biệt - Tia phân giác của một góc', B2 = 'Bài 2. Hai đường thẳng song song và dấu hiệu nhận biết',
  B3 = 'Bài 3. Tiên đề Euclid. Tính chất hai đường thẳng song song', B4 = 'Bài 4. Định lý và chứng minh định lý', B5 = 'Bài 5. Ôn tập chương';
const dang = [
  { bai: B1, cu: 'Nhận biết góc (phụ, bù, chéo)', moi: 'Nhận biết hai góc kề bù, hai góc đối đỉnh', yc: 'Nhận biết được các cặp góc kề nhau, bù nhau, kề bù, đối đỉnh trên hình vẽ.' },
  { bai: B1, cu: 'Tính số đo góc', moi: 'Tính số đo góc (góc kề bù, đối đỉnh, tia phân giác)', yc: 'Tính được số đo góc dựa vào tính chất hai góc kề bù, hai góc đối đỉnh và tia phân giác của một góc.' },
  { bai: B1, cu: 'Chứng minh tia phân giác', moi: 'Chứng minh tia phân giác, hai góc bằng nhau', yc: 'Chứng minh được một tia là tia phân giác của một góc và hai góc bằng nhau dựa vào định nghĩa, tính chất góc kề bù, đối đỉnh.' },
  { bai: B1, cu: 'Chứng minh 2 đường thẳng vuông góc', moi: 'Chứng minh hai đường thẳng vuông góc (dùng góc kề bù, tia phân giác)', yc: 'Chứng minh được hai tia, hai đường thẳng vuông góc bằng cách tính góc qua tính chất góc kề bù và tia phân giác.' },

  { bai: B2, cu: 'Xác định góc (so le, đồng vị)', moi: 'Nhận biết các cặp góc so le trong, đồng vị', yc: 'Nhận biết được các cặp góc so le trong, đồng vị, trong cùng phía tạo bởi một đường thẳng cắt hai đường thẳng.' },
  { bai: B2, cu: 'Nhận biết, chứng minh 2 đường thẳng song song', moi: 'Chứng minh hai đường thẳng song song bằng dấu hiệu nhận biết', yc: 'Chứng minh được hai đường thẳng song song dựa vào cặp góc so le trong bằng nhau, đồng vị bằng nhau hoặc trong cùng phía bù nhau.' },

  { bai: B3, cu: 'Tiên đề Euclid', moi: 'Tiên đề Euclid', yc: 'Phát biểu và vận dụng được tiên đề Euclid về đường thẳng song song.' },
  { bai: B3, cu: 'Tính số đo góc', moi: 'Tính số đo góc bằng tính chất hai đường thẳng song song', yc: 'Tính được số đo góc bằng tính chất của hai đường thẳng song song (so le trong, đồng vị bằng nhau, trong cùng phía bù nhau), kể cả khi phải kẻ thêm đường thẳng song song.' },
  { bai: B3, cu: 'Chứng minh 2 góc bằng nhau', moi: 'Chứng minh hai góc bằng nhau, tia phân giác bằng tính chất song song', yc: 'Chứng minh được hai góc bằng nhau, một tia là tia phân giác dựa vào tính chất của hai đường thẳng song song.' },
  { bai: B3, cu: 'Chứng minh 2 đường thẳng song song', moi: 'Chứng minh hai đường thẳng song song (cùng song song, cùng vuông góc với đường thẳng thứ ba)', yc: 'Chứng minh được hai đường thẳng song song bằng quan hệ với đường thẳng thứ ba (cùng song song, cùng vuông góc) kết hợp dấu hiệu nhận biết.' },
  { bai: B3, cu: 'Chứng minh 2 đường thẳng vuông góc', moi: 'Chứng minh hai đường thẳng vuông góc bằng quan hệ song song', yc: 'Chứng minh được hai đường thẳng vuông góc dựa vào quan hệ giữa tính vuông góc và tính song song.' },

  { bai: B4, cu: 'Nhận biết, viết giả thuyết, kết luận của một định lý bằng ký hiệu', moi: 'Nhận biết định lí, viết giả thiết và kết luận', yc: 'Nhận biết được định lí, vẽ hình và viết được giả thiết, kết luận của định lí bằng kí hiệu.' },
  { bai: B4, cu: 'Chứng minh các định lý đơn giản', moi: 'Chứng minh định lí đơn giản', yc: 'Thực hiện được việc chứng minh một số định lí hình học đơn giản.' },
  { bai: B5, cu: 'Bài tập tổng hợp chương 3', moi: 'Bài tập tổng hợp chương 3', yc: 'Vận dụng tổng hợp kiến thức của chương 3 để giải các bài toán ôn tập, kiểm tra cuối chương.' },
];
const xoa = [
  { bai: B1, dang: 'Chứng minh 2 góc bằng nhau' }, { bai: B2, dang: 'Chứng minh 2 đường thẳng song song' }, { bai: B2, dang: 'Chứng minh 2 đường thẳng vuông góc' },
  { bai: B2, dang: 'Tính số đo góc' }, { bai: B3, dang: 'Chứng minh tia phân giác' }, { bai: B3, dang: 'Nhận biết, chứng minh 2 đường thẳng song song' },
];
const ids = (s) => s.trim().split(/[\s,]+/).filter(Boolean);
const M = [
  [B1, 'Tính số đo góc (góc kề bù, đối đỉnh, tia phân giác)', 'uupl bibe 5744 930o mvp4 o1v3'],
  [B1, 'Chứng minh tia phân giác, hai góc bằng nhau', 'cc7l xka8'],
  [B2, 'Chứng minh hai đường thẳng song song bằng dấu hiệu nhận biết', 'okhp dxzx 9vim zsu9 tv21 6xyw aglj dfsc ifmf'],
  [B3, 'Chứng minh hai đường thẳng vuông góc bằng quan hệ song song', 'vb8y e31b'],
  [B3, 'Tính số đo góc bằng tính chất hai đường thẳng song song', '26k6 toox 1y46 jx8l'],
  [B3, 'Chứng minh hai góc bằng nhau, tia phân giác bằng tính chất song song', 'uswp'],
  [B3, 'Chứng minh hai đường thẳng song song (cùng song song, cùng vuông góc với đường thẳng thứ ba)', 'dg69'],
];
const chuyen = {};
for (const [bai, d, s] of M) for (const id of ids(s)) { if (chuyen[id]) throw new Error('trùng ' + id); chuyen[id] = [bai, d]; }
writeFileSync('scratch/soi-dang/lop7-c3.ke-hoach.json', JSON.stringify({ lop: '7', chuong: 3, dang, xoa, chuyen }, null, 1));
console.log(Object.keys(chuyen).length, 'câu chuyển');
