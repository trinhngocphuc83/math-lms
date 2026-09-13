/* Kế hoạch lớp 9 chương 1-5: dạng đã đúng việc, chỉ chuyển các câu lạc dạng (đọc tay scratch/soi-dang/lop9-c*.txt). */
import { writeFileSync } from 'fs';
const ids = (s) => s.trim().split(/[\s,]+/).filter(Boolean);
const ghi = (chuong, dang, M, xoa = []) => {
  const chuyen = {};
  for (const [bai, d, s] of M) for (const id of ids(s)) { if (chuyen[id]) throw new Error('trùng ' + id); chuyen[id] = [bai, d]; }
  writeFileSync(`scratch/soi-dang/lop9-c${chuong}.ke-hoach.json`, JSON.stringify({ lop: '9', chuong, dang, xoa, chuyen }, null, 1));
  console.log('C' + chuong, Object.keys(chuyen).length, 'câu chuyển');
};
const giu = (bai, ten, yc) => ({ bai, cu: ten, moi: ten, yc });

{ // Chương 1
  const B1 = 'Bài 1. Khái niệm phương trình và hệ hai phương trình bậc nhất hai ẩn', B2 = 'Bài 2. Giải hệ hai phương trình bậc nhất hai ẩn', B3 = 'Bài 3. Giải bài toán bằng cách lập hệ phương trình', B4 = 'Bài 4. Ôn tập chương';
  const dang = [
    giu(B1, 'Nhận biết phương trình bậc nhất hai ẩn và nghiệm của phương trình', 'Nhận biết được phương trình bậc nhất hai ẩn, kiểm tra được một cặp số có là nghiệm và viết được nghiệm tổng quát.'),
    giu(B1, 'Biểu diễn tập nghiệm của phương trình bậc nhất hai ẩn trên mặt phẳng toạ độ', 'Viết được nghiệm tổng quát và biểu diễn được tập nghiệm của phương trình bậc nhất hai ẩn trên mặt phẳng toạ độ.'),
    giu(B1, 'Nhận biết hệ hai phương trình bậc nhất hai ẩn và nghiệm của hệ', 'Nhận biết được hệ hai phương trình bậc nhất hai ẩn và kiểm tra được một cặp số có là nghiệm của hệ hay không.'),
    giu(B1, 'Đoán nhận số nghiệm của hệ phương trình', 'Dự đoán được số nghiệm của hệ hai phương trình bậc nhất hai ẩn dựa vào vị trí tương đối của hai đường thẳng và tìm được tham số để hệ vô nghiệm, vô số nghiệm.'),
    giu(B1, 'Phương trình, hệ phương trình bậc nhất hai ẩn chứa tham số', 'Tìm được giá trị của tham số để một cặp số cho trước là nghiệm của phương trình, hệ phương trình bậc nhất hai ẩn.'),
    giu(B2, 'Giải hệ phương trình bằng phương pháp thế', 'Giải được hệ hai phương trình bậc nhất hai ẩn bằng phương pháp thế.'),
    giu(B2, 'Giải hệ phương trình bằng phương pháp cộng đại số', 'Giải được hệ hai phương trình bậc nhất hai ẩn bằng phương pháp cộng đại số.'),
    giu(B2, 'Giải hệ phương trình (chọn phương pháp phù hợp) và tính giá trị biểu thức theo nghiệm', 'Giải được hệ hai phương trình bậc nhất hai ẩn bằng phương pháp thích hợp và tính được giá trị biểu thức theo nghiệm.'),
    giu(B2, 'Giải hệ phương trình bằng cách đưa về hệ bậc nhất hai ẩn', 'Biến đổi được hệ phương trình có ngoặc, có mẫu số về hệ hai phương trình bậc nhất hai ẩn rồi giải.'),
    giu(B2, 'Giải hệ phương trình bằng phương pháp đặt ẩn phụ', 'Giải được hệ phương trình bằng cách đặt ẩn phụ đưa về hệ hai phương trình bậc nhất hai ẩn.'),
    giu(B2, 'Giải hệ phương trình bằng máy tính cầm tay', 'Sử dụng được máy tính cầm tay để tìm nghiệm của hệ hai phương trình bậc nhất hai ẩn.'),
    giu(B2, 'Hệ phương trình chứa tham số', 'Tìm được giá trị của tham số để hệ hai phương trình bậc nhất hai ẩn có nghiệm thoả mãn điều kiện cho trước.'),
    giu(B2, 'Tìm hệ số của hàm số, đa thức bằng cách giải hệ phương trình', 'Lập và giải được hệ hai phương trình bậc nhất hai ẩn để tìm hệ số của hàm số y = ax + b, của đa thức đồng nhất.'),
    giu(B2, 'Ứng dụng hệ phương trình để cân bằng phương trình hoá học', 'Vận dụng được hệ hai phương trình bậc nhất hai ẩn để tìm các hệ số cân bằng phương trình hoá học.'),
    giu(B2, 'Ứng dụng thực tế của hệ hai phương trình bậc nhất hai ẩn', 'Giải quyết được một số vấn đề thực tiễn đơn giản (mua bán, giá cả, số lượng) bằng hệ hai phương trình bậc nhất hai ẩn.'),
    giu(B3, 'Toán về quan hệ giữa các số, chữ số', 'Giải được bài toán tìm hai số hoặc số có hai chữ số khi biết các quan hệ giữa chúng bằng cách lập hệ phương trình.'),
    giu(B3, 'Toán chuyển động trên bộ', 'Giải được bài toán chuyển động (gặp nhau, đuổi nhau, thay đổi vận tốc) bằng cách lập hệ phương trình.'),
    giu(B3, 'Toán chuyển động của ca nô, thuyền trên dòng nước', 'Giải được bài toán chuyển động xuôi dòng, ngược dòng bằng cách lập hệ hai phương trình bậc nhất hai ẩn.'),
    giu(B3, 'Toán công việc, năng suất', 'Giải được bài toán làm chung - làm riêng, năng suất lao động, vòi nước chảy bằng cách lập hệ phương trình.'),
    giu(B3, 'Toán về tỉ số phần trăm', 'Giải được bài toán tăng giảm theo tỉ số phần trăm (sản lượng, giá bán, lãi suất) bằng cách lập hệ phương trình.'),
    giu(B3, 'Toán có nội dung hình học', 'Giải được bài toán về chu vi, diện tích, kích thước của hình bằng cách lập hệ phương trình.'),
    giu(B3, 'Toán thực tế khác (mua bán, sản xuất, phân chia)', 'Giải quyết được các tình huống thực tiễn khác (mua bán, sản xuất, phân chia, xếp chỗ) bằng cách lập hệ phương trình.'),
    giu(B4, 'Bài tập tổng hợp chương 1', 'Vận dụng tổng hợp kiến thức của chương 1 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ];
  ghi(1, dang, [
    [B1, 'Đoán nhận số nghiệm của hệ phương trình', 'h4xg 1mfl'],
    [B1, 'Phương trình, hệ phương trình bậc nhất hai ẩn chứa tham số', 'eho3 7a38'],
    [B2, 'Giải hệ phương trình (chọn phương pháp phù hợp) và tính giá trị biểu thức theo nghiệm', 'n9ks 2bvi 0buv'],
    [B2, 'Giải hệ phương trình bằng phương pháp đặt ẩn phụ', 'wgp1 lld3'],
    [B2, 'Hệ phương trình chứa tham số', '4fi7'],
    [B2, 'Tìm hệ số của hàm số, đa thức bằng cách giải hệ phương trình', '0ugn 2c9s zmj4 8fr1 kg1v'],
    [B3, 'Toán công việc, năng suất', 'gtjm 55e7'],
    [B3, 'Toán thực tế khác (mua bán, sản xuất, phân chia)', 'd783'],
    [B3, 'Toán chuyển động của ca nô, thuyền trên dòng nước', '0gol lnuc'],
  ]);
}
{ // Chương 2
  const B1 = 'Bài 1. Phương trình quy về phương trình bậc nhất một ẩn', B2 = 'Bài 2. Bất đẳng thức và tính chất', B3 = 'Bài 3. Bất phương trình bậc nhất một ẩn', B4 = 'Bài 4. Ôn tập chương';
  const dang = [
    giu(B1, 'Giải phương trình tích cơ bản', 'Giải được phương trình tích dạng (ax + b)(cx + d) = 0 bằng cách đưa về các phương trình bậc nhất.'),
    giu(B1, 'Giải phương trình đưa về phương trình tích', 'Giải được phương trình bằng cách chuyển vế, phân tích đa thức thành nhân tử để đưa về phương trình tích.'),
    giu(B1, 'Giải phương trình chứa ẩn ở mẫu', 'Tìm được điều kiện xác định, quy đồng khử mẫu để giải phương trình chứa ẩn ở mẫu và đối chiếu điều kiện.'),
    giu(B1, 'Giải phương trình bằng cách đặt ẩn phụ', 'Giải được phương trình bằng cách đặt ẩn phụ để đưa về phương trình tích hoặc phương trình bậc nhất.'),
    giu(B1, 'Giải bài toán bằng cách lập phương trình', 'Giải quyết được một số vấn đề thực tiễn bằng cách lập phương trình quy về phương trình bậc nhất một ẩn.'),
    giu(B2, 'Nhận biết bất đẳng thức, viết bất đẳng thức diễn tả một khẳng định', 'Nhận biết được bất đẳng thức và viết được bất đẳng thức diễn tả một khẳng định trong thực tế.'),
    giu(B2, 'So sánh hai số, hai biểu thức bằng tính chất của bất đẳng thức', 'Vận dụng được tính chất bắc cầu, tính chất liên hệ với phép cộng và phép nhân của bất đẳng thức để so sánh hai số, hai biểu thức.'),
    giu(B2, 'Chứng minh bất đẳng thức', 'Chứng minh được bất đẳng thức đơn giản bằng cách xét hiệu hoặc biến đổi tương đương, dùng hằng đẳng thức.'),
    giu(B2, 'Ứng dụng thực tế của bất đẳng thức', 'Vận dụng được bất đẳng thức và tính chất của nó để giải quyết một số vấn đề thực tiễn.'),
    giu(B3, 'Nhận biết bất phương trình bậc nhất một ẩn và nghiệm của nó', 'Nhận biết được bất phương trình bậc nhất một ẩn và kiểm tra được một số có là nghiệm của bất phương trình hay không.'),
    giu(B3, 'Giải bất phương trình bậc nhất một ẩn cơ bản', 'Giải được bất phương trình bậc nhất một ẩn dạng ax + b > 0 (hoặc <, ≥, ≤) và biểu diễn được tập nghiệm.'),
    giu(B3, 'Giải bất phương trình đưa về bất phương trình bậc nhất một ẩn', 'Giải được bất phương trình có ngoặc, có mẫu số hoặc phải thu gọn hai vế để đưa về bất phương trình bậc nhất một ẩn.'),
    giu(B3, 'Bất phương trình bậc nhất một ẩn chứa tham số', 'Tìm được giá trị của tham số để bất phương trình, phương trình có nghiệm thoả mãn điều kiện cho trước.'),
    giu(B3, 'Ứng dụng thực tế của bất phương trình bậc nhất một ẩn', 'Giải quyết được một số vấn đề thực tiễn (chi phí, số lượng tối đa, điểm số) bằng cách lập bất phương trình bậc nhất một ẩn.'),
    giu(B4, 'Bài tập tổng hợp chương 2', 'Vận dụng tổng hợp kiến thức của chương 2 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ];
  ghi(2, dang, [
    [B1, 'Giải phương trình chứa ẩn ở mẫu', 'egfv csfn 6vmr'],
    [B1, 'Giải phương trình bằng cách đặt ẩn phụ', 'pzu1'],
    [B2, 'So sánh hai số, hai biểu thức bằng tính chất của bất đẳng thức', 'qyp4 gjws'],
    [B3, 'Giải bất phương trình đưa về bất phương trình bậc nhất một ẩn', 'gpqv j4lh gchy qgcv'],
    [B3, 'Bất phương trình bậc nhất một ẩn chứa tham số', 'nu6j'],
  ]);
}
{ // Chương 3
  const B1 = 'Bài 1. Căn bậc hai và căn thức bậc hai', B2 = 'Bài 2. Khai căn bậc hai với phép nhân và phép chia', B3 = 'Bài 3. Biến đổi đơn giản và rút gọn biểu thức chứa căn thức bậc hai', B4 = 'Bài 4. Căn bậc ba và căn thức bậc ba', B5 = 'Bài 5. Ôn tập chương';
  const dang = [
    giu(B1, 'Tìm căn bậc hai, căn bậc hai số học của một số', 'Nhận biết được khái niệm căn bậc hai, căn bậc hai số học và tính được căn bậc hai của một số.'),
    giu(B1, 'So sánh các căn bậc hai', 'So sánh được hai căn bậc hai số học hoặc một số với một căn bậc hai.'),
    giu(B1, 'Tìm điều kiện xác định của căn thức bậc hai', 'Xác định được điều kiện để căn thức bậc hai có nghĩa và kiểm tra được giá trị của biến có thoả mãn hay không.'),
    giu(B1, 'Tính giá trị biểu thức chứa căn bậc hai', 'Tính được giá trị của biểu thức số chứa căn bậc hai và giá trị của căn thức bậc hai tại giá trị cho trước của biến.'),
    giu(B1, 'Rút gọn biểu thức dạng √A² = |A|', 'Vận dụng được hằng đẳng thức √A² = |A| để rút gọn biểu thức, khai căn biểu thức có dạng bình phương và căn lồng nhau.'),
    giu(B1, 'Ứng dụng thực tế của căn bậc hai', 'Giải quyết được một số vấn đề thực tiễn liên quan đến căn bậc hai (công thức vật lí, hình học).'),
    giu(B2, 'Khai căn bậc hai một tích, nhân các căn bậc hai', 'Vận dụng được quy tắc √(ab) = √a·√b để khai phương một tích, nhân các căn bậc hai và rút gọn.'),
    giu(B2, 'Khai căn bậc hai một thương, chia các căn bậc hai', 'Vận dụng được quy tắc √(a/b) = √a/√b để khai phương một thương, chia các căn bậc hai và rút gọn.'),
    giu(B2, 'So sánh các biểu thức chứa căn bậc hai', 'So sánh được các biểu thức chứa căn bậc hai bằng cách biến đổi về cùng dạng rồi so sánh biểu thức dưới dấu căn.'),
    giu(B2, 'Ứng dụng thực tế của khai căn tích, thương', 'Giải quyết được một số vấn đề thực tiễn cần khai căn một tích, một thương.'),
    giu(B3, 'Đưa thừa số ra ngoài, vào trong dấu căn', 'Thực hiện được phép đưa thừa số ra ngoài hoặc vào trong dấu căn bậc hai và rút gọn tổng các căn thức đồng dạng.'),
    giu(B3, 'Khử mẫu của biểu thức lấy căn, trục căn thức ở mẫu', 'Thực hiện được phép khử mẫu của biểu thức lấy căn và trục căn thức ở mẫu.'),
    giu(B3, 'Rút gọn biểu thức chứa căn thức bậc hai và tính giá trị', 'Rút gọn được biểu thức chứa căn thức bậc hai (biểu thức số và biểu thức chứa biến) và tính được giá trị của biểu thức.'),
    giu(B3, 'Giải phương trình chứa căn thức bậc hai', 'Giải được phương trình chứa căn thức bậc hai đơn giản bằng cách đưa thừa số ra ngoài dấu căn hoặc bình phương hai vế.'),
    giu(B3, 'Tìm x để biểu thức chứa căn nhận giá trị nguyên', 'Tìm được giá trị nguyên của biến để biểu thức chứa căn sau khi rút gọn nhận giá trị nguyên.'),
    giu(B3, 'Tìm giá trị lớn nhất, nhỏ nhất của biểu thức chứa căn', 'Tìm được giá trị lớn nhất hoặc nhỏ nhất của biểu thức chứa căn sau khi rút gọn.'),
    giu(B3, 'Ứng dụng thực tế của biểu thức chứa căn', 'Giải quyết được một số vấn đề thực tiễn có bối cảnh hình học bằng biến đổi biểu thức chứa căn.'),
    giu(B4, 'Tìm căn bậc ba của một số', 'Nhận biết được khái niệm căn bậc ba và tính được căn bậc ba của một số, kể cả bằng máy tính cầm tay.'),
    giu(B4, 'So sánh các căn bậc ba', 'So sánh được các căn bậc ba dựa vào tính chất a < b ⇔ ∛a < ∛b.'),
    giu(B4, 'Tìm điều kiện xác định của căn thức bậc ba', 'Xác định được điều kiện để căn thức bậc ba có nghĩa (biểu thức dưới dấu căn xác định).'),
    giu(B4, 'Tính giá trị, rút gọn biểu thức chứa căn bậc ba', 'Tính được giá trị và rút gọn được biểu thức chứa căn bậc ba, kể cả căn thức bậc ba tại giá trị cho trước của biến.'),
    giu(B4, 'Ứng dụng thực tế của căn bậc ba', 'Giải quyết được một số vấn đề thực tiễn liên quan đến căn bậc ba (thể tích khối lập phương, công thức thực nghiệm).'),
    giu(B5, 'Bài tập tổng hợp chương 3', 'Vận dụng tổng hợp kiến thức của chương 3 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ];
  ghi(3, dang, [
    [B1, 'Rút gọn biểu thức dạng √A² = |A|', 'ozox lsj6 y8zp xkvc 2ojb b1g8 dbd7 vaxl droc 8kzw 4ta3 hsvp novz v3nv'],
    [B1, 'Ứng dụng thực tế của căn bậc hai', 'cnc1'],
    [B2, 'Khai căn bậc hai một tích, nhân các căn bậc hai', 'ru3h 7vr0'],
    [B3, 'Khử mẫu của biểu thức lấy căn, trục căn thức ở mẫu', 'k2bh u8ho rggx cu6f haz5 54ay 5tfv 3aol de60 7dn2 8cq6 9ze2 3lb8 3h51 njtf gj0h q9pu o60j 6lfo 0zjz fjgy 130o 4wvs zynd p44o qkkz q3op 3dua y9io'],
    [B3, 'Rút gọn biểu thức chứa căn thức bậc hai và tính giá trị', '32pu 7zot hl7n hlev u9af qyu2 zzar n69p etka e72u 3rj6 6e5e meu7 n2kx kj23 a3tf s8bb vhu8 qyls trhj r1cf'],
    [B3, 'Đưa thừa số ra ngoài, vào trong dấu căn', 'fn9v rxcn w5b3 8st3 ea71 qs4h'],
    [B3, 'Giải phương trình chứa căn thức bậc hai', 'hjyb'],
    [B4, 'Tìm căn bậc ba của một số', 'qyf4 het1 m7i3 p8op mmqh ogk1 og7p 9pzw ubfv n67z 8bj3'],
  ]);
}
{ // Chương 4
  const B1 = 'Bài 1. Tỉ số lượng giác của góc nhọn', B2 = 'Bài 2. Một số hệ thức giữa cạnh, góc trong tam giác vuông và ứng dụng', B3 = 'Bài 3. Ôn tập chương';
  const dang = [
    giu(B1, 'Tính tỉ số lượng giác của góc nhọn trong tam giác vuông', 'Nhận biết được các tỉ số lượng giác sin, cos, tan, cot của góc nhọn và tính được chúng trong tam giác vuông khi biết độ dài các cạnh.'),
    giu(B1, 'Tỉ số lượng giác của hai góc phụ nhau và các góc đặc biệt', 'Vận dụng được quan hệ giữa tỉ số lượng giác của hai góc phụ nhau và giá trị tỉ số lượng giác của các góc 30°, 45°, 60° để tính, sắp xếp.'),
    giu(B1, 'Dùng máy tính cầm tay tính tỉ số lượng giác và tìm góc', 'Sử dụng được máy tính cầm tay để tính tỉ số lượng giác của một góc nhọn và tìm góc khi biết tỉ số lượng giác.'),
    giu(B1, 'Tính giá trị, rút gọn biểu thức lượng giác', 'Tính được các tỉ số lượng giác còn lại khi biết một tỉ số và rút gọn được biểu thức chứa các tỉ số lượng giác của một góc nhọn.'),
    giu(B1, 'Chứng minh hệ thức lượng giác', 'Chứng minh được các hệ thức giữa các tỉ số lượng giác của một góc nhọn và các hệ thức trong tam giác.'),
    giu(B2, 'Tính cạnh, góc trong tam giác vuông theo hệ thức lượng', 'Vận dụng được các hệ thức giữa cạnh và góc trong tam giác vuông để tính một cạnh hoặc một góc chưa biết.'),
    giu(B2, 'Giải tam giác vuông', 'Giải được tam giác vuông (tìm mọi cạnh và góc chưa biết) khi biết hai yếu tố trong đó có ít nhất một cạnh.'),
    { bai: B2, cu: 'Tính đường cao, diện tích bằng tỉ số lượng giác', moi: 'Giải tam giác nhọn; tính đường cao, diện tích bằng tỉ số lượng giác', yc: 'Giải được tam giác nhọn bằng cách kẻ đường cao và tính được đường cao, diện tích, các đoạn thẳng trong hình bằng tỉ số lượng giác.' },
    giu(B2, 'Ứng dụng thực tế: tính chiều cao, khoảng cách, góc nâng, góc hạ', 'Giải quyết được một số vấn đề thực tiễn về tính chiều cao, khoảng cách, góc nâng, góc hạ, độ dốc bằng tỉ số lượng giác.'),
    giu(B3, 'Bài tập tổng hợp chương 4', 'Vận dụng tổng hợp kiến thức của chương 4 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ];
  ghi(4, dang, [
    [B1, 'Tỉ số lượng giác của hai góc phụ nhau và các góc đặc biệt', '4kcd yuqa 02l0 0gjx pldz 0e3b'],
    [B1, 'Tính giá trị, rút gọn biểu thức lượng giác', 'pn1g fvzh'],
    [B2, 'Ứng dụng thực tế: tính chiều cao, khoảng cách, góc nâng, góc hạ', 'sotc wo4f qq9y d2pq rtv5 k4ep zwnu e8kq txgs'],
    [B2, 'Tính cạnh, góc trong tam giác vuông theo hệ thức lượng', 'w7n0 vqw5 azfd mjst y8qh'],
  ]);
}
{ // Chương 5
  const B1 = 'Bài 1. Mở đầu về đường tròn', B2 = 'Bài 2. Cung và dây của một đường tròn', B3 = 'Bài 3. Độ dài của cung tròn. Diện tích hình quạt tròn và hình vành khuyên', B4 = 'Bài 4. Vị trí tương đối của đường thẳng và đường tròn', B5 = 'Bài 5. Vị trí tương đối của hai đường tròn', B6 = 'Bài 6. Ôn tập chương';
  const dang = [
    giu(B1, 'Nhận biết đường tròn, hình tròn, vị trí của điểm so với đường tròn', 'Nhận biết được đường tròn, hình tròn, tâm, bán kính và xác định được vị trí của một điểm so với đường tròn.'),
    giu(B1, 'Sự xác định đường tròn, chứng minh các điểm cùng thuộc một đường tròn', 'Xác định được đường tròn đi qua các điểm cho trước và chứng minh được nhiều điểm cùng thuộc một đường tròn.'),
    giu(B1, 'Tính bán kính, khoảng cách liên quan đến đường tròn', 'Tính được bán kính đường tròn và khoảng cách giữa các điểm bằng định lí Pythagore, tính chất tam giác.'),
    giu(B1, 'Tính chất đối xứng của đường tròn', 'Nhận biết được tâm đối xứng, trục đối xứng của đường tròn và vận dụng để chứng minh.'),
    giu(B2, 'Số đo cung, góc ở tâm', 'Nhận biết được cung, dây, góc ở tâm và tính được số đo cung nhỏ, cung lớn.'),
    giu(B2, 'Quan hệ giữa dây và khoảng cách từ tâm đến dây, đường kính vuông góc với dây', 'Vận dụng được tính chất đường kính vuông góc với dây và liên hệ giữa dây với khoảng cách từ tâm đến dây để tính toán.'),
    giu(B2, 'So sánh độ dài hai dây và hai cung tương ứng', 'So sánh được hai dây, hai cung của một đường tròn dựa vào quan hệ giữa dây và cung, dây và khoảng cách đến tâm.'),
    giu(B2, 'Chứng minh hình học liên quan đến dây và cung', 'Chứng minh được các quan hệ bằng nhau, song song, vuông góc liên quan đến dây và cung của đường tròn.'),
    giu(B3, 'Tính độ dài đường tròn, cung tròn', 'Tính được độ dài đường tròn và độ dài cung tròn khi biết bán kính và số đo cung.'),
    giu(B3, 'Tính diện tích hình tròn, hình quạt tròn, hình vành khuyên', 'Tính được diện tích hình tròn, hình quạt tròn, hình viên phân và hình vành khuyên theo bán kính và số đo cung.'),
    giu(B3, 'Ứng dụng thực tế về độ dài cung và diện tích hình quạt', 'Giải quyết được một số vấn đề thực tiễn (bánh xe, đồng hồ, quạt giấy, vườn hoa) liên quan đến độ dài cung và diện tích hình quạt.'),
    giu(B4, 'Nhận biết vị trí tương đối của đường thẳng và đường tròn', 'Xác định được đường thẳng cắt, tiếp xúc hay không giao với đường tròn dựa vào khoảng cách từ tâm đến đường thẳng.'),
    giu(B4, 'Tính chất và dấu hiệu nhận biết tiếp tuyến', 'Nhận biết được tiếp tuyến của đường tròn, vận dụng được tính chất và dấu hiệu nhận biết để chứng minh một đường thẳng là tiếp tuyến.'),
    giu(B4, 'Tính chất hai tiếp tuyến cắt nhau', 'Vận dụng được tính chất của hai tiếp tuyến cắt nhau để chứng minh và tính toán.'),
    giu(B4, 'Chứng minh, tính toán với tiếp tuyến', 'Chứng minh và tính được độ dài, diện tích trong các hình có tiếp tuyến, đường tròn nội tiếp hình thang.'),
    giu(B5, 'Nhận biết vị trí tương đối của hai đường tròn', 'Xác định được hai đường tròn cắt nhau, tiếp xúc ngoài, tiếp xúc trong hay không giao nhau dựa vào đoạn nối tâm và các bán kính.'),
    giu(B5, 'Tính chất đường nối tâm', 'Vận dụng được tính chất đường nối tâm là trục đối xứng của hình gồm hai đường tròn để chứng minh.'),
    giu(B5, 'Tính toán với hai đường tròn cắt nhau, tiếp xúc nhau', 'Tính được độ dài dây chung, đoạn nối tâm, bán kính trong các bài toán về hai đường tròn cắt nhau, tiếp xúc nhau.'),
    giu(B6, 'Bài tập tổng hợp chương 5', 'Vận dụng tổng hợp kiến thức của chương 5 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ];
  ghi(5, dang, [
    [B2, 'Quan hệ giữa dây và khoảng cách từ tâm đến dây, đường kính vuông góc với dây', 'duid ekyj gueg tfi1'],
  ]);
}
