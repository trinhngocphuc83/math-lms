/* Lớp 7 chương 6-10 (kho 0 câu): dựng đủ dạng theo SGK KNTT tập 2, đặt yêu cầu cần đạt; đổi tên dạng ôn tập về quy ước. */
import { writeFileSync } from 'fs';
const KH = {};
const d = (bai, cu, moi, yc) => ({ bai, cu, moi, yc });
{ const B1 = 'Bài 1. Tỉ lệ thức', B2 = 'Bài 2. Tính chất của dãy tỉ số bằng nhau', B3 = 'Bài 3. Đại lượng tỉ lệ thuận', B4 = 'Bài 4. Đại lượng tỉ lệ nghịch', B5 = 'Bài 5. Ôn tập chương';
  KH[6] = [
    d(B1, null, 'Nhận biết tỉ lệ thức, tìm các tỉ số lập thành tỉ lệ thức', 'Nhận biết được tỉ lệ thức và kiểm tra được hai tỉ số cho trước có lập thành tỉ lệ thức hay không.'),
    d(B1, 'Lập tỉ lệ thức từ các số cho trước', 'Lập tỉ lệ thức từ các số hoặc đẳng thức cho trước', 'Lập được tất cả các tỉ lệ thức từ bốn số cho trước hoặc từ một đẳng thức tích ad = bc.'),
    d(B1, 'Tìm thành phần chưa biết trong tỉ lệ thức', 'Tìm thành phần chưa biết trong tỉ lệ thức', 'Tìm được x trong tỉ lệ thức bằng tính chất cơ bản của tỉ lệ thức (tích trung tỉ bằng tích ngoại tỉ).'),
    d(B2, 'Tìm các số chưa biết dựa vào dãy tỉ số bằng nhau', 'Tìm các số chưa biết khi biết tổng hoặc hiệu của chúng', 'Vận dụng được tính chất của dãy tỉ số bằng nhau để tìm hai hay ba số chưa biết khi biết tổng hoặc hiệu của chúng.'),
    d(B2, null, 'Tìm các số chưa biết khi biết tích hoặc tổng bình phương', 'Tìm được các số chưa biết trong dãy tỉ số bằng nhau khi biết tích của chúng hoặc tổng các bình phương bằng cách đặt ẩn phụ.'),
    d(B2, null, 'Chứng minh đẳng thức từ tỉ lệ thức', 'Chứng minh được đẳng thức giữa các tỉ số bằng cách đặt tỉ số bằng k hoặc dùng tính chất dãy tỉ số bằng nhau.'),
    d(B2, 'Bài toán thực tế về dãy tỉ số bằng nhau (chia tỉ lệ)', 'Bài toán thực tế chia một đại lượng theo tỉ lệ', 'Giải được bài toán thực tế chia một số thành các phần tỉ lệ với các số cho trước bằng tính chất dãy tỉ số bằng nhau.'),
    d(B3, 'Nhận biết hai đại lượng tỉ lệ thuận, tìm hệ số tỉ lệ', 'Nhận biết hai đại lượng tỉ lệ thuận, tìm hệ số tỉ lệ và viết công thức', 'Nhận biết được hai đại lượng tỉ lệ thuận, tìm được hệ số tỉ lệ và viết được công thức liên hệ y = kx.'),
    d(B3, null, 'Lập bảng giá trị tương ứng của hai đại lượng tỉ lệ thuận', 'Hoàn thành được bảng giá trị tương ứng và tính được giá trị của đại lượng này khi biết giá trị của đại lượng kia.'),
    d(B3, 'Bài toán thực tế về đại lượng tỉ lệ thuận', 'Bài toán thực tế về đại lượng tỉ lệ thuận', 'Giải được bài toán thực tế về hai đại lượng tỉ lệ thuận (quãng đường - thời gian, khối lượng - thể tích, tiền - số lượng...).'),
    d(B3, null, 'Chia một số thành các phần tỉ lệ thuận với các số cho trước', 'Chia được một số thành các phần tỉ lệ thuận với các số cho trước và giải các bài toán thực tế tương ứng.'),
    d(B4, 'Nhận biết hai đại lượng tỉ lệ nghịch, tìm hệ số tỉ lệ', 'Nhận biết hai đại lượng tỉ lệ nghịch, tìm hệ số tỉ lệ và viết công thức', 'Nhận biết được hai đại lượng tỉ lệ nghịch, tìm được hệ số tỉ lệ và viết được công thức liên hệ y = a/x.'),
    d(B4, null, 'Lập bảng giá trị tương ứng của hai đại lượng tỉ lệ nghịch', 'Hoàn thành được bảng giá trị tương ứng và tính được giá trị của đại lượng này khi biết giá trị của đại lượng kia.'),
    d(B4, 'Bài toán thực tế về đại lượng tỉ lệ nghịch', 'Bài toán thực tế về đại lượng tỉ lệ nghịch', 'Giải được bài toán thực tế về hai đại lượng tỉ lệ nghịch (số máy - số ngày, vận tốc - thời gian, số người - số ngày làm...).'),
    d(B4, null, 'Chia một số thành các phần tỉ lệ nghịch với các số cho trước', 'Chia được một số thành các phần tỉ lệ nghịch với các số cho trước và giải các bài toán thực tế tương ứng.'),
    d(B5, 'Tổng hợp các bài toán tỉ lệ thức và đại lượng tỉ lệ', 'Bài tập tổng hợp chương 6', 'Vận dụng tổng hợp kiến thức của chương 6 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Biểu thức đại số', B2 = 'Bài 2. Đa thức một biến', B3 = 'Bài 3. Phép cộng và phép trừ đa thức một biến', B4 = 'Bài 4. Phép nhân đa thức một biến', B5 = 'Bài 5. Phép chia đa thức một biến', B6 = 'Bài 6. Ôn tập chương';
  KH[7] = [
    d(B1, 'Viết biểu thức đại số theo yêu cầu', 'Viết biểu thức đại số biểu thị đại lượng', 'Viết được biểu thức đại số biểu thị các đại lượng (chu vi, diện tích, quãng đường, số tiền...) trong tình huống cho trước.'),
    d(B1, 'Tính giá trị của biểu thức đại số tại các giá trị cho trước của biến', 'Tính giá trị của biểu thức đại số', 'Tính được giá trị của biểu thức đại số khi biết giá trị của các biến.'),
    d(B2, 'Nhận biết đa thức một biến, xác định bậc, hệ số cao nhất, hệ số tự do', 'Nhận biết đơn thức, đa thức một biến; xác định bậc, hệ số', 'Nhận biết được đơn thức, đa thức một biến và xác định được bậc, hệ số cao nhất, hệ số tự do của đa thức.'),
    d(B2, null, 'Thu gọn và sắp xếp đa thức một biến', 'Thu gọn được đa thức một biến và sắp xếp được theo lũy thừa giảm dần hoặc tăng dần của biến.'),
    d(B2, null, 'Tính giá trị của đa thức một biến', 'Tính được giá trị của đa thức một biến tại giá trị cho trước của biến.'),
    d(B2, 'Tìm nghiệm của đa thức một biến', 'Kiểm tra và tìm nghiệm của đa thức một biến', 'Kiểm tra được một số có là nghiệm của đa thức hay không và tìm được nghiệm của đa thức một biến trong trường hợp đơn giản.'),
    d(B3, 'Cộng hai đa thức một biến', 'Cộng hai đa thức một biến', 'Thực hiện được phép cộng hai đa thức một biến theo hàng ngang và theo cột dọc.'),
    d(B3, 'Trừ hai đa thức một biến', 'Trừ hai đa thức một biến', 'Thực hiện được phép trừ hai đa thức một biến theo hàng ngang và theo cột dọc.'),
    d(B3, null, 'Tìm đa thức chưa biết trong đẳng thức', 'Tìm được đa thức chưa biết khi biết tổng hoặc hiệu của nó với một đa thức cho trước.'),
    d(B3, null, 'Bài toán thực tế về cộng, trừ đa thức', 'Lập được đa thức biểu thị đại lượng và vận dụng phép cộng, trừ đa thức để giải bài toán thực tế.'),
    d(B4, 'Nhân đơn thức với đa thức', 'Nhân đơn thức với đa thức', 'Thực hiện được phép nhân đơn thức với đa thức một biến.'),
    d(B4, 'Nhân đa thức với đa thức', 'Nhân đa thức với đa thức', 'Thực hiện được phép nhân hai đa thức một biến và thu gọn kết quả.'),
    d(B4, null, 'Rút gọn biểu thức và tính giá trị sau khi nhân đa thức', 'Rút gọn được biểu thức có phép nhân đa thức rồi tính giá trị hoặc chứng tỏ giá trị không phụ thuộc vào biến.'),
    d(B5, null, 'Chia đơn thức cho đơn thức, chia đa thức cho đơn thức', 'Thực hiện được phép chia đơn thức cho đơn thức và phép chia đa thức cho đơn thức trong trường hợp chia hết.'),
    d(B5, 'Chia đa thức cho đa thức (chia hết và chia có dư)', 'Chia đa thức cho đa thức (chia hết và chia có dư)', 'Thực hiện được phép chia đa thức một biến cho đa thức một biến, xác định được thương và dư.'),
    d(B5, null, 'Tìm điều kiện để phép chia đa thức là phép chia hết', 'Tìm được giá trị của tham số để đa thức chia hết cho đa thức cho trước hoặc xác định được dư của phép chia.'),
    d(B6, 'Tổng hợp các phép toán với đa thức một biến', 'Bài tập tổng hợp chương 7', 'Vận dụng tổng hợp kiến thức của chương 7 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Làm quen với biến cố', B2 = 'Bài 2. Làm quen với xác suất của biến cố', B3 = 'Bài 3. Ôn tập chương';
  KH[8] = [
    d(B1, 'Nhận biết biến cố chắc chắn, biến cố không thể và biến cố ngẫu nhiên', 'Nhận biết biến cố chắc chắn, biến cố không thể, biến cố ngẫu nhiên', 'Phân loại được biến cố chắc chắn, biến cố không thể, biến cố ngẫu nhiên trong các tình huống gieo xúc xắc, rút thẻ, chọn bóng, thời tiết...'),
    d(B1, null, 'Liệt kê các kết quả thuận lợi cho biến cố', 'Liệt kê được các kết quả có thể xảy ra của phép thử và các kết quả làm cho biến cố xảy ra.'),
    d(B2, null, 'Xác suất của biến cố chắc chắn, biến cố không thể và các biến cố đồng khả năng', 'Nhận biết được xác suất của biến cố chắc chắn bằng 1, biến cố không thể bằng 0 và tính được xác suất của k biến cố đồng khả năng bằng 1/k.'),
    d(B2, 'Tính xác suất của biến cố ngẫu nhiên trong một số trò chơi đơn giản', 'Tính xác suất của biến cố trong trò chơi gieo xúc xắc, rút thẻ, chọn bóng', 'Tính được xác suất của biến cố ngẫu nhiên trong các trò chơi đơn giản khi các kết quả đồng khả năng.'),
    d(B2, null, 'Bài toán thực tế về xác suất của biến cố', 'Vận dụng được xác suất của biến cố để trả lời câu hỏi trong tình huống thực tế (dự báo, chọn ngẫu nhiên học sinh, sản phẩm...).'),
    d(B3, 'Tổng hợp về biến cố và xác suất', 'Bài tập tổng hợp chương 8', 'Vận dụng tổng hợp kiến thức của chương 8 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Quan hệ giữa góc và cạnh đối diện trong một tam giác', B2 = 'Bài 2. Quan hệ giữa đường vuông góc và đường xiên', B3 = 'Bài 3. Quan hệ giữa ba cạnh của một tam giác',
    B4 = 'Bài 4. Sự đồng quy của ba đường trung tuyến, ba đường phân giác trong một tam giác', B5 = 'Bài 5. Sự đồng quy của ba đường trung trực, ba đường cao trong một tam giác', B6 = 'Bài 6. Ôn tập chương';
  KH[9] = [
    d(B1, 'So sánh các góc trong một tam giác khi biết độ dài các cạnh', 'So sánh các góc trong một tam giác khi biết độ dài các cạnh', 'So sánh được các góc của một tam giác khi biết độ dài ba cạnh (góc đối diện với cạnh lớn hơn thì lớn hơn).'),
    d(B1, 'So sánh các cạnh trong một tam giác khi biết số đo các góc', 'So sánh các cạnh trong một tam giác khi biết số đo các góc', 'So sánh được các cạnh của một tam giác khi biết số đo các góc, kể cả khi phải tính góc còn lại.'),
    d(B1, null, 'Vận dụng quan hệ giữa góc và cạnh đối diện để chứng minh, giải bài toán thực tế', 'Vận dụng được quan hệ giữa góc và cạnh đối diện (cạnh huyền lớn nhất, cạnh đối diện góc tù lớn nhất) để chứng minh bất đẳng thức độ dài và giải bài toán thực tế.'),
    d(B2, 'Nhận biết đường vuông góc, đường xiên, hình chiếu', 'Nhận biết đường vuông góc, đường xiên, khoảng cách từ một điểm đến một đường thẳng', 'Nhận biết được đường vuông góc, đường xiên kẻ từ một điểm đến một đường thẳng và khoảng cách từ điểm đó đến đường thẳng.'),
    d(B2, 'Vận dụng định lí để so sánh đường vuông góc và đường xiên', 'So sánh đường vuông góc và đường xiên', 'So sánh được độ dài các đoạn thẳng kẻ từ một điểm đến một đường thẳng dựa vào quan hệ đường vuông góc ngắn hơn đường xiên.'),
    d(B2, null, 'Bài toán thực tế về đường vuông góc và đường xiên', 'Vận dụng được quan hệ giữa đường vuông góc và đường xiên để giải bài toán thực tế (đường đi ngắn nhất, khoảng cách ngắn nhất).'),
    d(B3, 'Kiểm tra ba độ dài có thể là ba cạnh của một tam giác', 'Kiểm tra ba độ dài có là ba cạnh của một tam giác', 'Kiểm tra được ba độ dài cho trước có là độ dài ba cạnh của một tam giác hay không bằng bất đẳng thức tam giác.'),
    d(B3, 'Ước lượng độ dài cạnh thứ ba của tam giác (bất đẳng thức tam giác)', 'Tìm độ dài cạnh thứ ba của tam giác', 'Tìm được khoảng giá trị hoặc giá trị nguyên của cạnh thứ ba, độ dài cạnh của tam giác cân, khi biết hai cạnh còn lại.'),
    d(B3, null, 'Chứng minh bất đẳng thức độ dài bằng bất đẳng thức tam giác', 'Chứng minh được các bất đẳng thức về độ dài đoạn thẳng, chu vi bằng cách vận dụng bất đẳng thức tam giác.'),
    d(B3, null, 'Bài toán thực tế về bất đẳng thức tam giác', 'Vận dụng được bất đẳng thức tam giác để giải bài toán thực tế (vị trí trạm, đường đi ngắn nhất...).'),
    d(B4, 'Tính chất ba đường trung tuyến (trọng tâm) của tam giác', 'Tính độ dài đoạn thẳng nhờ tính chất trọng tâm', 'Tính được độ dài các đoạn thẳng trên đường trung tuyến dựa vào tính chất trọng tâm cách đỉnh một khoảng bằng 2/3 độ dài đường trung tuyến.'),
    d(B4, null, 'Chứng minh bằng tính chất ba đường trung tuyến', 'Vận dụng được sự đồng quy của ba đường trung tuyến để chứng minh một điểm là trọng tâm, ba điểm thẳng hàng, hai đoạn thẳng bằng nhau.'),
    d(B4, 'Tính chất ba đường phân giác (tâm đường tròn nội tiếp) của tam giác', 'Vận dụng tính chất ba đường phân giác của tam giác', 'Vận dụng được tính chất giao điểm ba đường phân giác cách đều ba cạnh để tính góc, chứng minh tia phân giác và các quan hệ trong tam giác.'),
    d(B5, 'Tính chất ba đường trung trực (tâm đường tròn ngoại tiếp) của tam giác', 'Vận dụng tính chất ba đường trung trực của tam giác', 'Vận dụng được tính chất giao điểm ba đường trung trực cách đều ba đỉnh để chứng minh, xác định điểm cách đều ba điểm và tính góc.'),
    d(B5, 'Tính chất ba đường cao (trực tâm) của tam giác', 'Vận dụng tính chất ba đường cao của tam giác', 'Vận dụng được sự đồng quy của ba đường cao để xác định trực tâm, chứng minh hai đường thẳng vuông góc và tính góc.'),
    d(B5, null, 'Đường trung tuyến, phân giác, trung trực, đường cao trong tam giác cân, tam giác đều', 'Vận dụng được tính chất trong tam giác cân đường trung tuyến ứng với cạnh đáy đồng thời là đường phân giác, đường trung trực, đường cao để chứng minh tam giác cân và các quan hệ liên quan.'),
    d(B6, 'Tổng hợp kiến thức về các yếu tố trong tam giác', 'Bài tập tổng hợp chương 9', 'Vận dụng tổng hợp kiến thức của chương 9 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Hình hộp chữ nhật và hình lập phương', B2 = 'Bài 2. Hình lăng trụ đứng tam giác và hình lăng trụ đứng tứ giác', B3 = 'Bài 3. Ôn tập chương';
  KH[10] = [
    d(B1, 'Nhận biết các yếu tố của hình hộp chữ nhật, hình lập phương', 'Nhận biết các yếu tố của hình hộp chữ nhật, hình lập phương', 'Mô tả được đỉnh, cạnh, mặt, đường chéo của hình hộp chữ nhật, hình lập phương và nhận biết được hình khai triển của chúng.'),
    d(B1, 'Tính diện tích xung quanh, diện tích toàn phần', 'Tính diện tích xung quanh, diện tích toàn phần của hình hộp chữ nhật, hình lập phương', 'Tính được diện tích xung quanh, diện tích toàn phần của hình hộp chữ nhật, hình lập phương và tính ngược một kích thước khi biết diện tích.'),
    d(B1, 'Tính thể tích', 'Tính thể tích của hình hộp chữ nhật, hình lập phương', 'Tính được thể tích của hình hộp chữ nhật, hình lập phương và tính ngược một kích thước khi biết thể tích.'),
    d(B1, null, 'Bài toán thực tế về hình hộp chữ nhật, hình lập phương', 'Giải được bài toán thực tế về diện tích, thể tích của hình hộp chữ nhật, hình lập phương (bể nước, thùng hàng, sơn tường...).'),
    d(B2, 'Nhận biết các yếu tố của hình lăng trụ đứng tam giác, tứ giác', 'Nhận biết các yếu tố của hình lăng trụ đứng tam giác, hình lăng trụ đứng tứ giác', 'Mô tả được đỉnh, cạnh, mặt đáy, mặt bên, chiều cao của hình lăng trụ đứng tam giác, tứ giác và nhận biết được hình khai triển của chúng.'),
    d(B2, 'Tính diện tích xung quanh của hình lăng trụ đứng', 'Tính diện tích xung quanh, diện tích toàn phần của hình lăng trụ đứng', 'Tính được diện tích xung quanh, diện tích toàn phần của hình lăng trụ đứng tam giác, tứ giác.'),
    d(B2, 'Tính thể tích của hình lăng trụ đứng', 'Tính thể tích của hình lăng trụ đứng', 'Tính được thể tích của hình lăng trụ đứng tam giác, tứ giác và tính ngược chiều cao, diện tích đáy khi biết thể tích.'),
    d(B2, null, 'Bài toán thực tế về hình lăng trụ đứng', 'Giải được bài toán thực tế về diện tích, thể tích của hình lăng trụ đứng (lều trại, khúc gỗ, bể bơi...).'),
    d(B3, 'Tổng hợp tính toán diện tích, thể tích các hình khối thực tiễn', 'Bài tập tổng hợp chương 10', 'Vận dụng tổng hợp kiến thức của chương 10 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
for (const c of [6, 7, 8, 9, 10]) writeFileSync(`scratch/soi-dang/lop7-c${c}.ke-hoach.json`, JSON.stringify({ lop: '7', chuong: c, dang: KH[c], xoa: [], chuyen: {} }, null, 1));
console.log('ok');
