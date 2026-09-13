/* Lớp 11 chương 3-9 (kho gần như trống): dựng đủ dạng theo SGK KNTT Toán 11, yêu cầu cần đạt; dạng ôn tập về quy ước. */
import { writeFileSync } from 'fs';
const KH = {};
const d = (bai, cu, moi, yc, gop) => ({ bai, cu, moi, yc, ...(gop ? { gop } : {}) });
{ const B1 = 'Bài 1. Mẫu số liệu ghép nhóm', B2 = 'Bài 2. Các số đặc trưng đo xu thế trung tâm', B3 = 'Bài 3. Ôn tập chương';
  KH[3] = [
    d(B1, 'Ghép nhóm mẫu số liệu', 'Ghép nhóm mẫu số liệu, lập bảng tần số ghép nhóm', 'Chuyển được mẫu số liệu không ghép nhóm sang mẫu số liệu ghép nhóm với độ dài nhóm cho trước và lập được bảng tần số ghép nhóm.', ['Lập bảng tần số ghép nhóm']),
    d(B1, null, 'Đọc và mô tả bảng tần số ghép nhóm', 'Đọc được bảng tần số ghép nhóm, xác định được độ dài nhóm, giá trị đại diện, tần số của mỗi nhóm và cỡ mẫu.'),
    d(B2, 'Tính số trung bình của mẫu số liệu ghép nhóm', 'Tính số trung bình của mẫu số liệu ghép nhóm', 'Tính được số trung bình của mẫu số liệu ghép nhóm bằng giá trị đại diện của các nhóm.'),
    d(B2, 'Tính trung vị, tứ phân vị, mốt của mẫu số liệu ghép nhóm', 'Tính trung vị, tứ phân vị của mẫu số liệu ghép nhóm', 'Xác định được nhóm chứa trung vị, tứ phân vị và tính được trung vị, tứ phân vị của mẫu số liệu ghép nhóm.'),
    d(B2, null, 'Tính mốt của mẫu số liệu ghép nhóm', 'Xác định được nhóm chứa mốt và tính được mốt của mẫu số liệu ghép nhóm.'),
    d(B2, null, 'Ý nghĩa và so sánh hai mẫu số liệu bằng số đặc trưng', 'Giải thích được ý nghĩa của số trung bình, trung vị, mốt và so sánh được hai mẫu số liệu ghép nhóm bằng các số đặc trưng.'),
    d(B3, 'Tổng hợp số đặc trưng của mẫu số liệu ghép nhóm', 'Bài tập tổng hợp chương 3', 'Vận dụng tổng hợp kiến thức của chương 3 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Đường thẳng và mặt phẳng trong không gian', B2 = 'Bài 2. Hai đường thẳng song song', B3 = 'Bài 3. Đường thẳng và mặt phẳng song song', B4 = 'Bài 4. Hai mặt phẳng song song', B5 = 'Bài 5. Phép chiếu song song', B6 = 'Bài 6. Ôn tập chương';
  KH[4] = [
    d(B1, null, 'Nhận biết các tính chất thừa nhận, cách xác định mặt phẳng', 'Nhận biết được các tính chất thừa nhận của hình học không gian và các cách xác định một mặt phẳng; xét được tính đúng sai của các mệnh đề.'),
    d(B1, 'Xác định giao tuyến của hai mặt phẳng', 'Xác định giao tuyến của hai mặt phẳng', 'Tìm được giao tuyến của hai mặt phẳng bằng cách tìm hai điểm chung.'),
    d(B1, 'Xác định giao điểm của đường thẳng và mặt phẳng', 'Xác định giao điểm của đường thẳng và mặt phẳng', 'Tìm được giao điểm của đường thẳng và mặt phẳng bằng cách chọn mặt phẳng phụ chứa đường thẳng.'),
    d(B1, null, 'Chứng minh ba điểm thẳng hàng, ba đường thẳng đồng quy', 'Chứng minh được ba điểm thẳng hàng, ba đường thẳng đồng quy bằng tính chất giao tuyến của hai mặt phẳng.'),
    d(B1, 'Thiết diện của hình chóp', 'Xác định thiết diện của hình chóp cắt bởi mặt phẳng', 'Xác định được thiết diện của hình chóp, hình lăng trụ cắt bởi mặt phẳng đi qua ba điểm cho trước.'),
    d(B2, null, 'Nhận biết vị trí tương đối của hai đường thẳng trong không gian', 'Nhận biết được hai đường thẳng song song, cắt nhau, chéo nhau, trùng nhau trong không gian và trong các hình chóp, lăng trụ.'),
    d(B2, 'Chứng minh hai đường thẳng song song', 'Chứng minh hai đường thẳng song song', 'Chứng minh được hai đường thẳng song song bằng đường trung bình, định lí Thalès và tính chất bắc cầu.'),
    d(B2, 'Giao tuyến song song', 'Tìm giao tuyến của hai mặt phẳng chứa hai đường thẳng song song', 'Tìm được giao tuyến của hai mặt phẳng lần lượt chứa hai đường thẳng song song bằng định lí về giao tuyến của ba mặt phẳng.'),
    d(B3, null, 'Nhận biết vị trí tương đối của đường thẳng và mặt phẳng', 'Nhận biết được đường thẳng song song, cắt hoặc nằm trong mặt phẳng và xét được tính đúng sai của các mệnh đề liên quan.'),
    d(B3, 'Chứng minh đường thẳng song song với mặt phẳng', 'Chứng minh đường thẳng song song với mặt phẳng', 'Chứng minh được đường thẳng song song với mặt phẳng bằng cách chỉ ra đường thẳng song song với một đường thẳng nằm trong mặt phẳng.'),
    d(B3, null, 'Tìm giao tuyến bằng quan hệ song song giữa đường thẳng và mặt phẳng', 'Tìm được giao tuyến của hai mặt phẳng khi một mặt phẳng chứa đường thẳng song song với mặt phẳng kia.'),
    d(B3, 'Dựng thiết diện song song với một đường thẳng', 'Xác định thiết diện của hình chóp cắt bởi mặt phẳng song song với đường thẳng', 'Xác định được thiết diện của hình chóp cắt bởi mặt phẳng đi qua một điểm và song song với một hoặc hai đường thẳng.'),
    d(B4, null, 'Nhận biết vị trí tương đối của hai mặt phẳng, hình lăng trụ, hình hộp', 'Nhận biết được hai mặt phẳng song song, cắt nhau và các yếu tố của hình lăng trụ, hình hộp; xét được tính đúng sai của các mệnh đề.'),
    d(B4, 'Chứng minh hai mặt phẳng song song', 'Chứng minh hai mặt phẳng song song', 'Chứng minh được hai mặt phẳng song song bằng cách chỉ ra hai đường thẳng cắt nhau của mặt phẳng này cùng song song với mặt phẳng kia.'),
    d(B4, 'Định lí Thalès trong không gian', 'Vận dụng định lí Thalès trong không gian, tính tỉ số đoạn thẳng', 'Vận dụng được định lí Thalès trong không gian để chứng minh và tính tỉ số, độ dài đoạn thẳng.'),
    d(B4, null, 'Xác định thiết diện của hình chóp cắt bởi mặt phẳng song song với mặt phẳng cho trước', 'Xác định được thiết diện của hình chóp, hình lăng trụ cắt bởi mặt phẳng song song với một mặt phẳng cho trước.'),
    d(B5, 'Dựng hình chiếu song song của một hình', 'Xác định hình chiếu song song của điểm, đoạn thẳng, hình', 'Xác định được hình chiếu song song của điểm, đường thẳng, đoạn thẳng, hình phẳng và nêu được tính chất của phép chiếu song song.'),
    d(B5, 'Hình biểu diễn của một hình không gian', 'Vẽ hình biểu diễn của một hình không gian', 'Vẽ được hình biểu diễn của tam giác, hình bình hành, hình thang, đường tròn, hình chóp, hình lăng trụ.'),
    d(B6, 'Tổng hợp quan hệ song song trong không gian', 'Bài tập tổng hợp chương 4', 'Vận dụng tổng hợp kiến thức của chương 4 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Giới hạn của dãy số', B2 = 'Bài 2. Giới hạn của hàm số', B3 = 'Bài 3. Hàm số liên tục', B4 = 'Bài 4. Ôn tập chương';
  KH[5] = [
    d(B1, null, 'Nhận biết dãy số có giới hạn 0, giới hạn hữu hạn, giới hạn vô cực', 'Nhận biết được dãy số có giới hạn 0, giới hạn hữu hạn, giới hạn vô cực bằng định nghĩa và các giới hạn cơ bản.'),
    d(B1, 'Tính giới hạn của dãy số dạng phân thức, chứa căn', 'Tính giới hạn của dãy số dạng phân thức', 'Tính được giới hạn của dãy số có dạng phân thức bằng cách chia tử và mẫu cho lũy thừa cao nhất của n.'),
    d(B1, null, 'Tính giới hạn của dãy số chứa căn, chứa lũy thừa', 'Tính được giới hạn của dãy số chứa căn thức (nhân liên hợp) và chứa lũy thừa (chia cho cơ số lớn nhất).'),
    d(B1, null, 'Tính giới hạn vô cực của dãy số', 'Tính được giới hạn vô cực của dãy số bằng cách đặt nhân tử và các quy tắc giới hạn vô cực.'),
    d(B1, 'Tổng của cấp số nhân lùi vô hạn', 'Tổng của cấp số nhân lùi vô hạn', 'Tính được tổng của cấp số nhân lùi vô hạn và vận dụng để viết số thập phân vô hạn tuần hoàn thành phân số, giải bài toán thực tế.'),
    d(B2, 'Giới hạn tại một điểm', 'Tính giới hạn của hàm số tại một điểm', 'Tính được giới hạn của hàm số tại một điểm bằng cách thay giá trị, phân tích nhân tử, nhân liên hợp để khử dạng 0/0.'),
    d(B2, 'Giới hạn tại vô cực, giới hạn một bên', 'Tính giới hạn một bên của hàm số', 'Tính được giới hạn một bên của hàm số và vận dụng để xét sự tồn tại giới hạn của hàm số cho bởi nhiều công thức.'),
    d(B2, null, 'Tính giới hạn của hàm số tại vô cực', 'Tính được giới hạn của hàm số khi x tiến tới vô cực đối với hàm phân thức, hàm chứa căn.'),
    d(B2, null, 'Tính giới hạn vô cực của hàm số', 'Tính được giới hạn vô cực của hàm số tại một điểm và tại vô cực bằng các quy tắc về giới hạn vô cực.'),
    d(B2, null, 'Bài toán thực tế về giới hạn của hàm số', 'Vận dụng được giới hạn của hàm số để giải bài toán thực tế (nồng độ, chi phí, vận tốc).'),
    d(B3, 'Xét tính liên tục của hàm số tại một điểm, trên một khoảng', 'Xét tính liên tục của hàm số tại một điểm', 'Xét được tính liên tục của hàm số tại một điểm, kể cả hàm số cho bởi nhiều công thức.'),
    d(B3, null, 'Xét tính liên tục của hàm số trên một khoảng, tìm tham số để hàm số liên tục', 'Xét được tính liên tục của hàm số trên tập xác định và tìm được giá trị tham số để hàm số liên tục tại một điểm, trên R.'),
    d(B3, 'Chứng minh phương trình có nghiệm', 'Chứng minh phương trình có nghiệm', 'Vận dụng được tính liên tục của hàm số để chứng minh phương trình có nghiệm trên một khoảng.'),
    d(B4, 'Tổng hợp giới hạn và hàm số liên tục', 'Bài tập tổng hợp chương 5', 'Vận dụng tổng hợp kiến thức của chương 5 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Luỹ thừa với số mũ thực', B2 = 'Bài 2. Lôgarit', B3 = 'Bài 3. Hàm số mũ và hàm số lôgarit', B4 = 'Bài 4. Phương trình, bất phương trình mũ và lôgarit', B5 = 'Bài 5. Ôn tập chương';
  KH[6] = [
    d(B1, null, 'Tính giá trị biểu thức chứa luỹ thừa, căn bậc n', 'Tính được giá trị biểu thức chứa luỹ thừa với số mũ nguyên, hữu tỉ và căn bậc n bằng các tính chất của luỹ thừa.'),
    d(B1, 'Rút gọn biểu thức chứa luỹ thừa', 'Rút gọn biểu thức chứa luỹ thừa với số mũ thực', 'Rút gọn được biểu thức chứa luỹ thừa với số mũ thực và viết được biểu thức chứa căn dưới dạng luỹ thừa với số mũ hữu tỉ.'),
    d(B1, 'So sánh các cơ số, số mũ', 'So sánh các luỹ thừa', 'So sánh được hai luỹ thừa dựa vào tính chất đơn điệu của luỹ thừa theo cơ số và số mũ.'),
    d(B1, null, 'Bài toán thực tế về luỹ thừa', 'Vận dụng được luỹ thừa với số mũ thực để giải bài toán thực tế (lãi kép, tăng trưởng, phân rã).'),
    d(B2, null, 'Nhận biết lôgarit, tính lôgarit bằng định nghĩa', 'Nhận biết được khái niệm lôgarit và tính được lôgarit của một số bằng định nghĩa, kể cả bằng máy tính cầm tay.'),
    d(B2, 'Tính giá trị, rút gọn biểu thức lôgarit', 'Tính giá trị, rút gọn biểu thức lôgarit', 'Tính được giá trị và rút gọn được biểu thức chứa lôgarit bằng các tính chất của lôgarit và công thức đổi cơ số.'),
    d(B2, 'Phân tích lôgarit theo các lôgarit cho trước', 'Biểu diễn lôgarit theo các lôgarit cho trước', 'Biểu diễn được một lôgarit theo các lôgarit cho trước (theo a, b) bằng các tính chất và công thức đổi cơ số.'),
    d(B2, null, 'Bài toán thực tế về lôgarit', 'Vận dụng được lôgarit để giải bài toán thực tế (độ pH, độ lớn động đất, cường độ âm, thời gian tăng trưởng).'),
    d(B3, 'Tìm tập xác định, tính đơn điệu, đồ thị hàm số mũ, lôgarit', 'Tìm tập xác định của hàm số mũ, hàm số lôgarit', 'Tìm được tập xác định của hàm số mũ, hàm số lôgarit.'),
    d(B3, null, 'Xét tính đơn điệu và nhận dạng đồ thị hàm số mũ, hàm số lôgarit', 'Nhận biết được tính đơn điệu, tính chất của hàm số mũ, hàm số lôgarit và nhận dạng được đồ thị của chúng.'),
    d(B3, null, 'So sánh các số bằng tính đơn điệu của hàm số mũ, lôgarit', 'So sánh được các luỹ thừa, các lôgarit dựa vào tính đơn điệu của hàm số mũ, hàm số lôgarit.'),
    d(B3, null, 'Bài toán thực tế về hàm số mũ, hàm số lôgarit', 'Vận dụng được hàm số mũ, hàm số lôgarit để giải bài toán thực tế (tăng trưởng dân số, lãi kép, phân rã phóng xạ).'),
    d(B4, 'Giải phương trình, bất phương trình mũ cơ bản', 'Giải phương trình mũ', 'Giải được phương trình mũ cơ bản và phương trình mũ đưa về cùng cơ số, đặt ẩn phụ, lôgarit hoá.'),
    d(B4, 'Giải phương trình, bất phương trình lôgarit cơ bản', 'Giải phương trình lôgarit', 'Giải được phương trình lôgarit cơ bản và phương trình lôgarit đưa về cùng cơ số, đặt ẩn phụ, có điều kiện xác định.'),
    d(B4, null, 'Giải bất phương trình mũ', 'Giải được bất phương trình mũ cơ bản và bất phương trình mũ đưa về cùng cơ số, đặt ẩn phụ.'),
    d(B4, null, 'Giải bất phương trình lôgarit', 'Giải được bất phương trình lôgarit cơ bản và bất phương trình lôgarit đưa về cùng cơ số, có điều kiện xác định.'),
    d(B4, null, 'Bài toán thực tế về phương trình, bất phương trình mũ và lôgarit', 'Vận dụng được phương trình, bất phương trình mũ và lôgarit để giải bài toán thực tế (thời gian gửi tiết kiệm, tăng trưởng, phân rã).'),
    d(B5, 'Tổng hợp hàm số mũ, lôgarit và phương trình', 'Bài tập tổng hợp chương 6', 'Vận dụng tổng hợp kiến thức của chương 6 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Hai đường thẳng vuông góc', B2 = 'Bài 2. Đường thẳng vuông góc với mặt phẳng', B3 = 'Bài 3. Phép chiếu vuông góc. Góc giữa đường thẳng và mặt phẳng', B4 = 'Bài 4. Hai mặt phẳng vuông góc', B5 = 'Bài 5. Khoảng cách', B6 = 'Bài 6. Thể tích', B7 = 'Bài 7. Ôn tập chương';
  KH[7] = [
    d(B1, 'Tính góc giữa hai đường thẳng trong không gian', 'Tính góc giữa hai đường thẳng trong không gian', 'Tính được góc giữa hai đường thẳng trong không gian bằng cách dựng đường thẳng song song hoặc dùng vectơ.'),
    d(B1, 'Chứng minh hai đường thẳng vuông góc', 'Chứng minh hai đường thẳng vuông góc', 'Chứng minh được hai đường thẳng vuông góc trong không gian bằng góc giữa hai đường thẳng hoặc tích vô hướng.'),
    d(B2, 'Chứng minh đường thẳng vuông góc với mặt phẳng', 'Chứng minh đường thẳng vuông góc với mặt phẳng', 'Chứng minh được đường thẳng vuông góc với mặt phẳng bằng cách chỉ ra đường thẳng vuông góc với hai đường thẳng cắt nhau trong mặt phẳng.'),
    d(B2, null, 'Chứng minh hai đường thẳng vuông góc bằng quan hệ vuông góc với mặt phẳng', 'Chứng minh được hai đường thẳng vuông góc bằng cách chỉ ra một đường thẳng vuông góc với mặt phẳng chứa đường thẳng kia.'),
    d(B2, 'Mối liên hệ giữa quan hệ song song và quan hệ vuông góc', 'Vận dụng liên hệ giữa quan hệ song song và quan hệ vuông góc', 'Vận dụng được các định lí về liên hệ giữa quan hệ song song và quan hệ vuông góc, tính chất mặt phẳng trung trực để chứng minh.'),
    d(B2, null, 'Xác định thiết diện của hình chóp cắt bởi mặt phẳng vuông góc với đường thẳng', 'Xác định được thiết diện của hình chóp cắt bởi mặt phẳng đi qua một điểm và vuông góc với một đường thẳng cho trước.'),
    d(B3, 'Dựng hình chiếu vuông góc', 'Xác định hình chiếu vuông góc của điểm, đường thẳng lên mặt phẳng', 'Xác định được hình chiếu vuông góc của một điểm, một đường thẳng lên mặt phẳng và vận dụng định lí ba đường vuông góc.'),
    d(B3, 'Tính góc giữa đường thẳng và mặt phẳng', 'Tính góc giữa đường thẳng và mặt phẳng', 'Xác định và tính được góc giữa đường thẳng và mặt phẳng trong hình chóp, hình lăng trụ.'),
    d(B4, 'Tính góc giữa hai mặt phẳng (góc nhị diện)', 'Nhận biết góc nhị diện, tính góc giữa hai mặt phẳng', 'Xác định được góc phẳng nhị diện và tính được góc giữa hai mặt phẳng trong hình chóp, hình lăng trụ.', undefined),
    d(B4, 'Chứng minh hai mặt phẳng vuông góc', 'Chứng minh hai mặt phẳng vuông góc', 'Chứng minh được hai mặt phẳng vuông góc bằng cách chỉ ra một mặt phẳng chứa đường thẳng vuông góc với mặt phẳng kia.'),
    d(B4, null, 'Vận dụng tính chất hai mặt phẳng vuông góc để chứng minh, tính toán', 'Vận dụng được tính chất của hai mặt phẳng vuông góc, hình lăng trụ đứng, hình chóp đều để chứng minh vuông góc và tính độ dài, góc.'),
    d(B5, 'Khoảng cách từ điểm đến mặt phẳng', 'Tính khoảng cách từ một điểm đến đường thẳng, mặt phẳng', 'Tính được khoảng cách từ một điểm đến đường thẳng, từ một điểm đến mặt phẳng bằng cách dựng hình chiếu vuông góc.'),
    d(B5, null, 'Tính khoảng cách giữa đường thẳng và mặt phẳng song song, hai mặt phẳng song song', 'Tính được khoảng cách giữa đường thẳng và mặt phẳng song song, giữa hai mặt phẳng song song.'),
    d(B5, 'Khoảng cách giữa hai đường thẳng chéo nhau', 'Tính khoảng cách giữa hai đường thẳng chéo nhau', 'Tính được khoảng cách giữa hai đường thẳng chéo nhau bằng đường vuông góc chung hoặc quy về khoảng cách từ điểm đến mặt phẳng.'),
    d(B5, null, 'Bài toán thực tế về khoảng cách', 'Vận dụng được khoảng cách trong không gian để giải bài toán thực tế.'),
    d(B6, 'Tính thể tích khối chóp, khối lăng trụ', 'Tính thể tích khối chóp', 'Tính được thể tích khối chóp khi biết diện tích đáy và chiều cao, kể cả khi phải xác định chân đường cao.'),
    d(B6, null, 'Tính thể tích khối lăng trụ, khối hộp', 'Tính được thể tích khối lăng trụ, khối hộp chữ nhật, khối lập phương.'),
    d(B6, null, 'Tính thể tích khối chóp cụt đều và bài toán thực tế về thể tích', 'Tính được thể tích khối chóp cụt đều và vận dụng thể tích để giải bài toán thực tế.'),
    d(B7, 'Tổng hợp quan hệ vuông góc, khoảng cách, thể tích', 'Bài tập tổng hợp chương 7', 'Vận dụng tổng hợp kiến thức của chương 7 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ].map(x => { delete x.gop; return x; }); }
{ const B1 = 'Bài 1. Biến cố hợp, biến cố giao, biến cố độc lập', B2 = 'Bài 2. Công thức cộng xác suất', B3 = 'Bài 3. Công thức nhân xác suất cho hai biến cố độc lập', B4 = 'Bài 4. Ôn tập chương';
  KH[8] = [
    d(B1, 'Xác định biến cố hợp, biến cố giao, biến cố xung khắc', 'Xác định biến cố hợp, biến cố giao, biến cố xung khắc', 'Mô tả được biến cố hợp, biến cố giao, biến cố xung khắc và biểu diễn được biến cố qua các biến cố cho trước.'),
    d(B1, 'Nhận biết biến cố độc lập', 'Nhận biết biến cố độc lập', 'Nhận biết được hai biến cố độc lập trong các phép thử thực tế.'),
    d(B2, 'Tính xác suất bằng công thức cộng cho biến cố xung khắc và không xung khắc', 'Tính xác suất bằng công thức cộng cho hai biến cố xung khắc', 'Tính được xác suất của biến cố hợp của hai biến cố xung khắc bằng công thức cộng.'),
    d(B2, null, 'Tính xác suất bằng công thức cộng cho hai biến cố bất kì', 'Tính được xác suất của biến cố hợp của hai biến cố bất kì bằng công thức P(A ∪ B) = P(A) + P(B) − P(AB).'),
    d(B2, null, 'Bài toán thực tế về công thức cộng xác suất', 'Vận dụng được công thức cộng xác suất để giải bài toán thực tế (khảo sát, chọn học sinh, sản phẩm).'),
    d(B3, 'Tính xác suất bằng công thức nhân', 'Tính xác suất bằng công thức nhân cho hai biến cố độc lập', 'Tính được xác suất của biến cố giao của hai biến cố độc lập bằng công thức nhân.'),
    d(B3, null, 'Kết hợp công thức cộng và công thức nhân xác suất', 'Tính được xác suất của biến cố bằng cách kết hợp công thức cộng, công thức nhân và biến cố đối.'),
    d(B3, 'Ứng dụng xác suất vào bài toán thực tế', 'Bài toán thực tế về công thức nhân xác suất', 'Vận dụng được công thức nhân xác suất để giải bài toán thực tế (bắn bia, thi đấu, kiểm tra sản phẩm, di truyền).'),
    d(B4, 'Tổng hợp các quy tắc tính xác suất', 'Bài tập tổng hợp chương 8', 'Vận dụng tổng hợp kiến thức của chương 8 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Định nghĩa và ý nghĩa của đạo hàm', B2 = 'Bài 2. Các quy tắc tính đạo hàm', B3 = 'Bài 3. Đạo hàm cấp hai', B4 = 'Bài 4. Ôn tập chương';
  KH[9] = [
    d(B1, 'Tính đạo hàm bằng định nghĩa', 'Tính đạo hàm bằng định nghĩa', 'Tính được đạo hàm của hàm số tại một điểm và trên một khoảng bằng định nghĩa.'),
    d(B1, 'Viết phương trình tiếp tuyến của đồ thị hàm số', 'Viết phương trình tiếp tuyến của đồ thị hàm số', 'Viết được phương trình tiếp tuyến của đồ thị hàm số tại một điểm, khi biết hệ số góc hoặc đi qua một điểm.'),
    d(B1, null, 'Ý nghĩa vật lí của đạo hàm (vận tốc tức thời, cường độ dòng điện)', 'Vận dụng được ý nghĩa vật lí của đạo hàm để tính vận tốc tức thời, cường độ dòng điện tức thời, tốc độ thay đổi.'),
    d(B2, 'Tính đạo hàm của tổng, hiệu, tích, thương', 'Tính đạo hàm của hàm đa thức, phân thức, hàm chứa căn', 'Tính được đạo hàm của hàm đa thức, hàm phân thức, hàm chứa căn bằng các quy tắc đạo hàm của tổng, hiệu, tích, thương.'),
    d(B2, 'Đạo hàm của hàm hợp', 'Tính đạo hàm của hàm hợp', 'Tính được đạo hàm của hàm hợp bằng công thức (u^n)\', (√u)\', (1/u)\'.'),
    d(B2, null, 'Tính đạo hàm của hàm số lượng giác', 'Tính được đạo hàm của các hàm số lượng giác và hàm hợp của chúng.'),
    d(B2, null, 'Tính đạo hàm của hàm số mũ, hàm số lôgarit', 'Tính được đạo hàm của hàm số mũ, hàm số lôgarit và hàm hợp của chúng.'),
    d(B2, null, 'Vận dụng đạo hàm để giải phương trình, bất phương trình, chứng minh đẳng thức', 'Giải được phương trình, bất phương trình chứa đạo hàm và chứng minh được đẳng thức liên quan đến đạo hàm.'),
    d(B2, null, 'Bài toán thực tế về đạo hàm', 'Vận dụng được đạo hàm để giải bài toán thực tế (tốc độ thay đổi, chi phí biên, vận tốc).'),
    d(B3, 'Tính đạo hàm cấp hai', 'Tính đạo hàm cấp hai', 'Tính được đạo hàm cấp hai của hàm số và giá trị đạo hàm cấp hai tại một điểm.'),
    d(B3, 'Bài toán chuyển động (vận tốc, gia tốc)', 'Ý nghĩa cơ học của đạo hàm cấp hai (gia tốc)', 'Vận dụng được ý nghĩa cơ học của đạo hàm cấp hai để tính gia tốc tức thời của chuyển động.'),
    d(B4, 'Tổng hợp các quy tắc tính đạo hàm và ứng dụng', 'Bài tập tổng hợp chương 9', 'Vận dụng tổng hợp kiến thức của chương 9 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
for (const c of [3, 4, 5, 6, 7, 8, 9]) writeFileSync(`scratch/soi-dang/lop11-c${c}.ke-hoach.json`, JSON.stringify({ lop: '11', chuong: c, dang: KH[c], xoa: [], chuyen: {} }, null, 1));
console.log('ok');
