/* Lớp 8 chương 4-10 (kho 0 câu): dựng đủ dạng theo SGK KNTT Toán 8, đặt yêu cầu cần đạt; đổi tên dạng ôn tập về quy ước. */
import { writeFileSync } from 'fs';
const KH = {};
const d = (bai, cu, moi, yc) => ({ bai, cu, moi, yc });
{ const B1 = 'Bài 1. Định lí Thalès trong tam giác', B2 = 'Bài 2. Đường trung bình của tam giác', B3 = 'Bài 3. Tính chất đường phân giác của tam giác', B4 = 'Bài 4. Ôn tập chương';
  KH[4] = [
    d(B1, null, 'Nhận biết đoạn thẳng tỉ lệ, viết tỉ số các đoạn thẳng', 'Nhận biết được hai đoạn thẳng tỉ lệ với hai đoạn thẳng khác và viết được các tỉ số đoạn thẳng theo định lí Thalès.'),
    d(B1, 'Tính độ dài đoạn thẳng', 'Tính độ dài đoạn thẳng bằng định lí Thalès', 'Tính được độ dài đoạn thẳng chưa biết trong tam giác có đường thẳng song song với một cạnh bằng định lí Thalès.'),
    d(B1, 'Chứng minh các hệ thức hình học và đường thẳng song song', 'Chứng minh hai đường thẳng song song bằng định lí Thalès đảo', 'Chứng minh được hai đường thẳng song song bằng định lí Thalès đảo và chứng minh được các hệ thức về tỉ số đoạn thẳng.'),
    d(B1, null, 'Bài toán thực tế về định lí Thalès', 'Vận dụng được định lí Thalès để đo gián tiếp khoảng cách, chiều cao trong thực tế.'),
    d(B2, 'Nhận biết, chứng minh đường trung bình của tam giác', 'Nhận biết, chứng minh đường trung bình của tam giác', 'Nhận biết được đường trung bình của tam giác và chứng minh được một đoạn thẳng là đường trung bình.'),
    d(B2, 'Tính độ dài đoạn thẳng, chứng minh hai đường thẳng song song bằng đường trung bình', 'Tính độ dài đoạn thẳng bằng tính chất đường trung bình', 'Tính được độ dài đoạn thẳng bằng tính chất đường trung bình của tam giác (song song và bằng nửa cạnh thứ ba).'),
    d(B2, null, 'Chứng minh song song, bằng nhau, thẳng hàng bằng đường trung bình', 'Vận dụng được tính chất đường trung bình để chứng minh hai đường thẳng song song, đoạn thẳng bằng nhau, ba điểm thẳng hàng, tứ giác là hình bình hành.'),
    d(B2, null, 'Bài toán thực tế về đường trung bình của tam giác', 'Vận dụng được tính chất đường trung bình của tam giác để giải bài toán thực tế.'),
    d(B3, 'Tính tỉ số đoạn thẳng, độ dài đoạn thẳng', 'Tính độ dài, tỉ số đoạn thẳng bằng tính chất đường phân giác', 'Tính được độ dài, tỉ số các đoạn thẳng trên cạnh đối diện bằng tính chất đường phân giác của tam giác.'),
    d(B3, 'Chứng minh các hệ thức hình học', 'Chứng minh hệ thức, đường phân giác bằng tính chất đường phân giác', 'Chứng minh được các hệ thức về tỉ số đoạn thẳng và chứng minh được một tia là tia phân giác dựa vào tính chất đường phân giác của tam giác.'),
    d(B3, null, 'Bài toán thực tế về tính chất đường phân giác', 'Vận dụng được tính chất đường phân giác của tam giác để giải bài toán thực tế.'),
    d(B4, 'Tổng hợp về định lí Thalès, đường trung bình và phân giác', 'Bài tập tổng hợp chương 4', 'Vận dụng tổng hợp kiến thức của chương 4 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Thu thập và phân loại dữ liệu', B2 = 'Bài 2. Biểu diễn dữ liệu bằng bảng, biểu đồ', B3 = 'Bài 3. Phân tích số liệu thống kê dựa vào biểu đồ', B4 = 'Bài 4. Ôn tập chương';
  KH[5] = [
    d(B1, 'Thu thập, phân loại và tổ chức dữ liệu', 'Thu thập dữ liệu và xác định phương pháp thu thập', 'Xác định được phương pháp thu thập dữ liệu (trực tiếp, gián tiếp) phù hợp và thu thập được dữ liệu cho một vấn đề.'),
    d(B1, null, 'Phân loại dữ liệu định tính, định lượng', 'Phân loại được dữ liệu định tính (định danh, biểu thị thứ bậc) và dữ liệu định lượng (rời rạc, liên tục).'),
    d(B1, null, 'Nhận biết tính hợp lí của dữ liệu', 'Nhận biết được dữ liệu không hợp lí trong bảng thống kê và chỉ ra được lí do.'),
    d(B2, 'Lựa chọn và vẽ biểu đồ phù hợp', 'Lựa chọn biểu đồ phù hợp với dữ liệu', 'Lựa chọn được loại biểu đồ (tranh, cột, cột kép, hình quạt tròn, đoạn thẳng) phù hợp với dữ liệu và mục đích biểu diễn.'),
    d(B2, null, 'Vẽ biểu đồ biểu diễn dữ liệu từ bảng thống kê', 'Vẽ được biểu đồ cột, cột kép, đoạn thẳng, hình quạt tròn biểu diễn dữ liệu từ bảng thống kê.'),
    d(B2, 'Đọc và phân tích số liệu từ biểu đồ (biểu đồ tranh, cột, quạt, đoạn thẳng)', 'Đọc dữ liệu từ biểu đồ và lập bảng thống kê', 'Đọc được số liệu từ biểu đồ tranh, cột, cột kép, hình quạt tròn, đoạn thẳng và lập được bảng thống kê tương ứng.'),
    d(B2, null, 'Chuyển đổi dữ liệu giữa các dạng biểu đồ', 'Chuyển được dữ liệu từ dạng biểu đồ này sang dạng biểu đồ khác (cột sang hình quạt tròn, bảng sang biểu đồ).'),
    d(B3, 'Đánh giá sự hợp lí của số liệu', 'Phát hiện vấn đề, nhận xét số liệu từ biểu đồ', 'Phát hiện được vấn đề hoặc quy luật đơn giản, so sánh và nhận xét được số liệu dựa vào biểu đồ.'),
    d(B3, 'Nhận biết xu hướng và đưa ra dự đoán', 'Nhận biết xu hướng và đưa ra dự đoán', 'Nhận biết được xu hướng tăng, giảm của dữ liệu trên biểu đồ đoạn thẳng và đưa ra được dự đoán hợp lí.'),
    d(B3, null, 'Nhận biết biểu đồ biểu diễn sai lệch và cách khắc phục', 'Nhận biết được biểu đồ có cách biểu diễn gây hiểu sai (trục không bắt đầu từ 0, tỉ lệ không phù hợp) và nêu được cách khắc phục.'),
    d(B4, 'Tổng hợp thống kê và biểu đồ', 'Bài tập tổng hợp chương 5', 'Vận dụng tổng hợp kiến thức của chương 5 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Phân thức đại số', B2 = 'Bài 2. Tính chất cơ bản của phân thức đại số', B3 = 'Bài 3. Phép cộng và phép trừ phân thức đại số', B4 = 'Bài 4. Phép nhân và phép chia phân thức đại số', B5 = 'Bài 5. Ôn tập chương';
  KH[6] = [
    d(B1, 'Nhận biết phân thức đại số, tìm điều kiện xác định của phân thức', 'Nhận biết phân thức đại số, tìm điều kiện xác định', 'Nhận biết được phân thức đại số, tử thức, mẫu thức và tìm được điều kiện xác định của phân thức.'),
    d(B1, null, 'Nhận biết hai phân thức bằng nhau', 'Kiểm tra được hai phân thức bằng nhau bằng định nghĩa A/B = C/D khi AD = BC và tìm được đa thức chưa biết trong đẳng thức hai phân thức.'),
    d(B1, 'Tính giá trị của phân thức tại giá trị cho trước của biến', 'Tính giá trị của phân thức', 'Tính được giá trị của phân thức tại giá trị cho trước của biến (kiểm tra điều kiện xác định).'),
    d(B1, null, 'Viết phân thức biểu thị đại lượng trong bài toán thực tế', 'Viết được phân thức biểu thị đại lượng (vận tốc, thời gian, năng suất...) trong tình huống thực tế.'),
    d(B2, 'Rút gọn phân thức đại số', 'Rút gọn phân thức đại số', 'Rút gọn được phân thức bằng cách phân tích tử và mẫu thành nhân tử rồi chia cho nhân tử chung, kể cả khi phải đổi dấu.'),
    d(B2, 'Quy đồng mẫu thức nhiều phân thức', 'Quy đồng mẫu thức nhiều phân thức', 'Tìm được mẫu thức chung và quy đồng được mẫu thức của hai hay nhiều phân thức.'),
    d(B2, null, 'Vận dụng tính chất cơ bản của phân thức để chứng minh, tìm đa thức', 'Vận dụng được tính chất cơ bản của phân thức để chứng minh hai phân thức bằng nhau, tìm đa thức trong đẳng thức và rút gọn rồi tính giá trị.'),
    d(B3, 'Cộng, trừ hai phân thức cùng mẫu', 'Cộng, trừ các phân thức cùng mẫu', 'Thực hiện được phép cộng, phép trừ các phân thức có cùng mẫu thức.'),
    d(B3, 'Cộng, trừ hai phân thức khác mẫu', 'Cộng, trừ các phân thức khác mẫu', 'Thực hiện được phép cộng, phép trừ các phân thức có mẫu thức khác nhau bằng cách quy đồng mẫu thức.'),
    d(B3, null, 'Rút gọn biểu thức có phép cộng, trừ phân thức và tính giá trị', 'Rút gọn được biểu thức có nhiều phép cộng, trừ phân thức (dùng tính chất giao hoán, kết hợp) và tính được giá trị tại giá trị cho trước của biến.'),
    d(B3, null, 'Bài toán thực tế về cộng, trừ phân thức', 'Vận dụng được phép cộng, trừ phân thức để giải bài toán thực tế về thời gian, vận tốc, năng suất.'),
    d(B4, 'Nhân hai hay nhiều phân thức', 'Nhân các phân thức đại số', 'Thực hiện được phép nhân các phân thức và rút gọn kết quả.'),
    d(B4, 'Chia hai phân thức', 'Chia các phân thức đại số', 'Thực hiện được phép chia phân thức bằng cách nhân với phân thức nghịch đảo.'),
    d(B4, null, 'Rút gọn biểu thức có nhiều phép toán với phân thức', 'Rút gọn được biểu thức có phối hợp các phép cộng, trừ, nhân, chia phân thức theo đúng thứ tự thực hiện phép tính.'),
    d(B4, null, 'Bài toán thực tế về nhân, chia phân thức', 'Vận dụng được phép nhân, chia phân thức để giải bài toán thực tế.'),
    d(B5, 'Rút gọn biểu thức và tính giá trị của phân thức tổng hợp', 'Bài tập tổng hợp chương 6', 'Vận dụng tổng hợp kiến thức của chương 6 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Phương trình bậc nhất một ẩn', B2 = 'Bài 2. Giải bài toán bằng cách lập phương trình', B3 = 'Bài 3. Khái niệm hàm số và đồ thị của hàm số', B4 = 'Bài 4. Hàm số bậc nhất và đồ thị của hàm số bậc nhất', B5 = 'Bài 5. Hệ số góc của đường thẳng', B6 = 'Bài 6. Ôn tập chương';
  KH[7] = [
    d(B1, 'Nhận biết phương trình bậc nhất một ẩn', 'Nhận biết phương trình bậc nhất một ẩn, kiểm tra nghiệm', 'Nhận biết được phương trình bậc nhất một ẩn ax + b = 0 (a ≠ 0), xác định được hệ số và kiểm tra được một số có là nghiệm của phương trình hay không.'),
    d(B1, 'Giải phương trình bậc nhất một ẩn và phương trình đưa về dạng bậc nhất', 'Giải phương trình bậc nhất một ẩn', 'Giải được phương trình bậc nhất một ẩn dạng ax + b = 0.'),
    d(B1, null, 'Giải phương trình đưa được về dạng bậc nhất một ẩn', 'Giải được phương trình đưa về dạng ax + b = 0 bằng quy tắc chuyển vế, quy tắc nhân, phá ngoặc, quy đồng khử mẫu số.'),
    d(B1, null, 'Tìm điều kiện của tham số để phương trình thoả mãn yêu cầu', 'Tìm được giá trị của tham số để phương trình bậc nhất có nghiệm cho trước, vô nghiệm hoặc có vô số nghiệm.'),
    d(B2, null, 'Biểu diễn đại lượng bằng biểu thức chứa ẩn', 'Biểu diễn được các đại lượng chưa biết theo ẩn và các đại lượng đã biết trong bài toán thực tế.'),
    d(B2, 'Giải bài toán chuyển động, năng suất, tỉ lệ phần trăm, hình học bằng cách lập phương trình', 'Giải bài toán chuyển động bằng cách lập phương trình', 'Giải được bài toán chuyển động (cùng chiều, ngược chiều, xuôi ngược dòng) bằng cách lập phương trình bậc nhất.'),
    d(B2, null, 'Giải bài toán năng suất, công việc bằng cách lập phương trình', 'Giải được bài toán về năng suất lao động, làm chung làm riêng bằng cách lập phương trình.'),
    d(B2, null, 'Giải bài toán về số, tuổi, tỉ lệ phần trăm bằng cách lập phương trình', 'Giải được bài toán tìm số, tuổi, tỉ lệ phần trăm, lãi suất bằng cách lập phương trình.'),
    d(B2, null, 'Giải bài toán có nội dung hình học bằng cách lập phương trình', 'Giải được bài toán về chu vi, diện tích, kích thước hình bằng cách lập phương trình.'),
    d(B3, 'Nhận biết hàm số, tính giá trị của hàm số', 'Nhận biết hàm số, tính giá trị của hàm số', 'Nhận biết được đại lượng này là hàm số của đại lượng kia, viết được công thức và tính được giá trị của hàm số tại giá trị cho trước của biến.'),
    d(B3, 'Xác định tọa độ điểm, vẽ đồ thị hàm số trên mặt phẳng tọa độ', 'Xác định toạ độ điểm trên mặt phẳng toạ độ', 'Xác định được toạ độ của một điểm và biểu diễn được điểm có toạ độ cho trước trên mặt phẳng toạ độ.'),
    d(B3, null, 'Đồ thị của hàm số, kiểm tra điểm thuộc đồ thị', 'Nhận biết được đồ thị của hàm số, kiểm tra được một điểm có thuộc đồ thị hay không và đọc được giá trị từ đồ thị.'),
    d(B4, 'Nhận biết hàm số bậc nhất', 'Nhận biết hàm số bậc nhất, xác định hệ số a, b', 'Nhận biết được hàm số bậc nhất y = ax + b (a ≠ 0), xác định được hệ số a, b và tìm điều kiện của tham số để hàm số là hàm số bậc nhất.'),
    d(B4, 'Vẽ đồ thị của hàm số bậc nhất y = ax + b', 'Vẽ đồ thị của hàm số bậc nhất', 'Vẽ được đồ thị của hàm số y = ax + b bằng cách xác định hai điểm, tìm được giao điểm với các trục toạ độ.'),
    d(B4, null, 'Xác định hàm số bậc nhất khi biết điều kiện', 'Xác định được hệ số a, b của hàm số bậc nhất khi biết đồ thị đi qua điểm cho trước hoặc thoả mãn điều kiện.'),
    d(B4, null, 'Bài toán thực tế về hàm số bậc nhất', 'Lập được hàm số bậc nhất biểu thị đại lượng trong tình huống thực tế (cước phí, tiền lương, nhiệt độ...) và vận dụng để tính toán.'),
    d(B5, 'Tìm hệ số góc của đường thẳng', 'Nhận biết hệ số góc, góc tạo bởi đường thẳng với trục Ox', 'Nhận biết được hệ số góc của đường thẳng y = ax + b và mối liên hệ giữa hệ số góc với góc tạo bởi đường thẳng và trục Ox.'),
    d(B5, 'Nhận biết hai đường thẳng song song, cắt nhau dựa vào hệ số góc', 'Nhận biết hai đường thẳng song song, cắt nhau, trùng nhau', 'Nhận biết được hai đường thẳng song song, cắt nhau, trùng nhau dựa vào hệ số góc và tung độ gốc.'),
    d(B5, null, 'Tìm điều kiện của tham số để hai đường thẳng song song, cắt nhau', 'Tìm được giá trị của tham số để hai đường thẳng song song, cắt nhau, trùng nhau hoặc cắt nhau tại một điểm trên trục toạ độ.'),
    d(B5, null, 'Viết phương trình đường thẳng khi biết hệ số góc và điểm đi qua', 'Xác định được đường thẳng y = ax + b khi biết hệ số góc và một điểm đi qua hoặc song song với đường thẳng cho trước.'),
    d(B6, 'Tổng hợp về phương trình và hàm số bậc nhất', 'Bài tập tổng hợp chương 7', 'Vận dụng tổng hợp kiến thức của chương 7 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Kết quả có thể và kết quả thuận lợi', B2 = 'Bài 2. Cách tính xác suất của biến cố bằng tỉ số', B3 = 'Bài 3. Mối liên hệ giữa xác suất thực nghiệm với xác suất và ứng dụng', B4 = 'Bài 4. Ôn tập chương';
  KH[8] = [
    d(B1, 'Liệt kê các kết quả có thể của phép thử ngẫu nhiên', 'Liệt kê các kết quả có thể của hành động, thực nghiệm', 'Liệt kê được các kết quả có thể của một hành động, thực nghiệm (gieo xúc xắc, rút thẻ, quay vòng quay...).'),
    d(B1, 'Xác định số kết quả thuận lợi cho một biến cố', 'Xác định các kết quả thuận lợi cho biến cố', 'Xác định được các kết quả thuận lợi cho một biến cố và đếm được số kết quả thuận lợi.'),
    d(B2, 'Tính xác suất của biến cố trong các trò chơi (tung đồng xu, xúc xắc, rút thẻ...)', 'Tính xác suất của biến cố bằng tỉ số', 'Tính được xác suất của biến cố bằng tỉ số giữa số kết quả thuận lợi và số kết quả có thể khi các kết quả đồng khả năng.'),
    d(B2, null, 'Tính xác suất khi thực hiện hai hành động liên tiếp', 'Liệt kê được các kết quả có thể khi thực hiện hai hành động (gieo hai xúc xắc, tung hai đồng xu, chọn hai thẻ) và tính được xác suất của biến cố.'),
    d(B2, null, 'Bài toán thực tế về xác suất của biến cố', 'Vận dụng được cách tính xác suất bằng tỉ số để giải bài toán thực tế (chọn học sinh, sản phẩm, vé số...).'),
    d(B3, 'Tính xác suất thực nghiệm', 'Tính xác suất thực nghiệm của biến cố', 'Tính được xác suất thực nghiệm của biến cố từ dữ liệu thống kê số lần thực hiện và số lần xảy ra.'),
    d(B3, 'Ứng dụng xác suất thực nghiệm để ước lượng xác suất của biến cố', 'Ước lượng xác suất bằng xác suất thực nghiệm', 'Ước lượng được xác suất của biến cố bằng xác suất thực nghiệm khi số lần thực hiện đủ lớn và vận dụng để dự đoán số lần xảy ra.'),
    d(B3, null, 'Ứng dụng xác suất thực nghiệm trong thực tế', 'Vận dụng được mối liên hệ giữa xác suất thực nghiệm và xác suất để giải bài toán thực tế (tỉ lệ phế phẩm, dự báo, kiểm tra chất lượng).'),
    d(B4, 'Tổng hợp về biến cố và tính xác suất', 'Bài tập tổng hợp chương 8', 'Vận dụng tổng hợp kiến thức của chương 8 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Hai tam giác đồng dạng', B2 = 'Bài 2. Ba trường hợp đồng dạng của hai tam giác', B3 = 'Bài 3. Định lí Pythagore và ứng dụng', B4 = 'Bài 4. Các trường hợp đồng dạng của hai tam giác vuông', B5 = 'Bài 5. Hình đồng dạng', B6 = 'Bài 6. Ôn tập chương';
  KH[9] = [
    d(B1, 'Nhận biết hai tam giác đồng dạng, viết kí hiệu', 'Nhận biết hai tam giác đồng dạng, viết kí hiệu và tỉ số đồng dạng', 'Nhận biết được hai tam giác đồng dạng, viết đúng kí hiệu theo thứ tự đỉnh tương ứng và xác định được tỉ số đồng dạng.'),
    d(B1, 'Sử dụng tính chất của hai tam giác đồng dạng để tính độ dài cạnh, số đo góc', 'Tính độ dài cạnh, số đo góc từ hai tam giác đồng dạng', 'Tính được độ dài cạnh, số đo góc, chu vi của tam giác khi biết hai tam giác đồng dạng và tỉ số đồng dạng.'),
    d(B1, null, 'Chứng minh hai tam giác đồng dạng bằng định lí về đường thẳng song song với một cạnh', 'Chứng minh được hai tam giác đồng dạng khi có đường thẳng song song với một cạnh của tam giác và vận dụng tính chất.'),
    d(B2, 'Chứng minh hai tam giác đồng dạng (c-c-c, c-g-c, g-g)', 'Chứng minh hai tam giác đồng dạng (c.c.c, c.g.c, g.g)', 'Chứng minh được hai tam giác đồng dạng theo trường hợp cạnh-cạnh-cạnh, cạnh-góc-cạnh, góc-góc.'),
    d(B2, 'Tính độ dài đoạn thẳng, chứng minh các hệ thức hình học dựa vào tam giác đồng dạng', 'Tính độ dài đoạn thẳng, chứng minh hệ thức bằng tam giác đồng dạng', 'Vận dụng được tam giác đồng dạng để tính độ dài đoạn thẳng và chứng minh các hệ thức dạng tích, tỉ số.'),
    d(B2, null, 'Chứng minh góc bằng nhau, tia phân giác, đường thẳng song song bằng tam giác đồng dạng', 'Vận dụng được tam giác đồng dạng để chứng minh hai góc bằng nhau, tia phân giác, hai đường thẳng song song.'),
    d(B2, null, 'Bài toán thực tế về tam giác đồng dạng', 'Vận dụng được tam giác đồng dạng để đo gián tiếp chiều cao, khoảng cách trong thực tế.'),
    d(B3, 'Tính độ dài cạnh trong tam giác vuông', 'Tính độ dài cạnh trong tam giác vuông bằng định lí Pythagore', 'Tính được độ dài cạnh còn lại của tam giác vuông khi biết hai cạnh bằng định lí Pythagore.'),
    d(B3, 'Nhận biết tam giác vuông bằng định lí Pythagore đảo', 'Nhận biết tam giác vuông bằng định lí Pythagore đảo', 'Kiểm tra được một tam giác có là tam giác vuông hay không bằng định lí Pythagore đảo.'),
    d(B3, null, 'Tính độ dài đoạn thẳng trong hình có tam giác vuông', 'Tính được độ dài đường cao, đường chéo, cạnh trong hình chữ nhật, hình thang, tam giác cân bằng cách vận dụng định lí Pythagore.'),
    d(B3, null, 'Bài toán thực tế về định lí Pythagore', 'Vận dụng được định lí Pythagore để giải bài toán thực tế (thang dựa tường, khoảng cách, chiều cao).'),
    d(B4, 'Chứng minh hai tam giác vuông đồng dạng', 'Chứng minh hai tam giác vuông đồng dạng', 'Chứng minh được hai tam giác vuông đồng dạng theo trường hợp góc nhọn, hai cạnh góc vuông, cạnh huyền - cạnh góc vuông.'),
    d(B4, 'Tính độ dài đường cao, cạnh trong tam giác vuông', 'Tính độ dài đoạn thẳng, chứng minh hệ thức bằng tam giác vuông đồng dạng', 'Vận dụng được tam giác vuông đồng dạng để tính độ dài đường cao, hình chiếu, cạnh và chứng minh các hệ thức trong tam giác vuông.'),
    d(B4, null, 'Tỉ số diện tích, tỉ số đường cao của hai tam giác đồng dạng', 'Vận dụng được tỉ số đường cao bằng tỉ số đồng dạng, tỉ số diện tích bằng bình phương tỉ số đồng dạng để tính toán.'),
    d(B4, null, 'Bài toán thực tế về tam giác vuông đồng dạng', 'Vận dụng được tam giác vuông đồng dạng để đo gián tiếp chiều cao, khoảng cách trong thực tế.'),
    d(B5, 'Nhận biết các hình đồng dạng trong thực tiễn', 'Nhận biết hình đồng dạng, hình đồng dạng phối cảnh', 'Nhận biết được hai hình đồng dạng, hình đồng dạng phối cảnh (vị tự) và chỉ ra được tỉ số đồng dạng.'),
    d(B5, null, 'Vẽ hình đồng dạng phối cảnh và tính kích thước hình đồng dạng', 'Vẽ được hình đồng dạng phối cảnh với tỉ số cho trước và tính được kích thước, chu vi, diện tích của hình đồng dạng.'),
    d(B6, 'Tổng hợp định lí Pythagore và tam giác đồng dạng', 'Bài tập tổng hợp chương 9', 'Vận dụng tổng hợp kiến thức của chương 9 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Hình chóp tam giác đều', B2 = 'Bài 2. Hình chóp tứ giác đều', B3 = 'Bài 3. Ôn tập chương';
  KH[10] = [
    d(B1, 'Nhận biết đỉnh, mặt đáy, mặt bên, cạnh bên của hình chóp tam giác đều', 'Nhận biết các yếu tố của hình chóp tam giác đều', 'Mô tả được đỉnh, mặt đáy, mặt bên, cạnh bên, chiều cao, trung đoạn của hình chóp tam giác đều và nhận biết hình khai triển.'),
    d(B1, 'Tính diện tích xung quanh, thể tích của hình chóp tam giác đều', 'Tính diện tích xung quanh, thể tích của hình chóp tam giác đều', 'Tính được diện tích xung quanh, diện tích toàn phần, thể tích của hình chóp tam giác đều và tính ngược một yếu tố khi biết diện tích, thể tích.'),
    d(B1, null, 'Bài toán thực tế về hình chóp tam giác đều', 'Giải được bài toán thực tế về diện tích, thể tích của vật có dạng hình chóp tam giác đều.'),
    d(B2, 'Nhận biết đỉnh, mặt đáy, mặt bên, cạnh bên của hình chóp tứ giác đều', 'Nhận biết các yếu tố của hình chóp tứ giác đều', 'Mô tả được đỉnh, mặt đáy, mặt bên, cạnh bên, chiều cao, trung đoạn của hình chóp tứ giác đều và nhận biết hình khai triển.'),
    d(B2, 'Tính diện tích xung quanh, thể tích của hình chóp tứ giác đều', 'Tính diện tích xung quanh, thể tích của hình chóp tứ giác đều', 'Tính được diện tích xung quanh, diện tích toàn phần, thể tích của hình chóp tứ giác đều và tính ngược một yếu tố khi biết diện tích, thể tích.'),
    d(B2, null, 'Bài toán thực tế về hình chóp tứ giác đều', 'Giải được bài toán thực tế về diện tích, thể tích của vật có dạng hình chóp tứ giác đều (kim tự tháp, lều, mái nhà...).'),
    d(B3, 'Tổng hợp tính toán liên quan đến hình chóp', 'Bài tập tổng hợp chương 10', 'Vận dụng tổng hợp kiến thức của chương 10 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
for (const c of [4, 5, 6, 7, 8, 9, 10]) writeFileSync(`scratch/soi-dang/lop8-c${c}.ke-hoach.json`, JSON.stringify({ lop: '8', chuong: c, dang: KH[c], xoa: [], chuyen: {} }, null, 1));
console.log('ok');
