/* Lớp 10 chương 3-9 (kho gần như trống): dựng đủ dạng theo SGK KNTT Toán 10, yêu cầu cần đạt; dạng ôn tập về quy ước. */
import { writeFileSync } from 'fs';
const KH = {};
const d = (bai, cu, moi, yc) => ({ bai, cu, moi, yc });
{ const B1 = 'Bài 1. Giá trị lượng giác của một góc từ 0° đến 180°', B2 = 'Bài 2. Hệ thức lượng trong tam giác', B3 = 'Bài 3. Ôn tập chương';
  KH[3] = [
    d(B1, 'Tính giá trị lượng giác của một góc, rút gọn biểu thức lượng giác', 'Tính giá trị lượng giác của một góc từ 0° đến 180°', 'Tính được giá trị lượng giác của các góc đặc biệt, của góc bù nhau, phụ nhau và bằng máy tính cầm tay.'),
    d(B1, null, 'Tính giá trị lượng giác còn lại, rút gọn và chứng minh biểu thức lượng giác', 'Vận dụng được các hệ thức cơ bản (sin² + cos² = 1, tan·cot = 1...) để tính giá trị lượng giác còn lại, rút gọn và chứng minh biểu thức lượng giác.'),
    d(B1, 'Tìm góc khi biết giá trị lượng giác', 'Tìm góc khi biết giá trị lượng giác', 'Tìm được góc từ 0° đến 180° khi biết một giá trị lượng giác của nó, kể cả bằng máy tính cầm tay.'),
    d(B2, 'Định lí côsin, định lí sin và tính các yếu tố trong tam giác', 'Tính cạnh, góc của tam giác bằng định lí côsin, định lí sin', 'Vận dụng được định lí côsin, định lí sin để tính cạnh, góc, bán kính đường tròn ngoại tiếp của tam giác.'),
    d(B2, 'Tính diện tích tam giác', 'Tính diện tích tam giác, bán kính đường tròn nội tiếp, đường cao', 'Tính được diện tích tam giác bằng các công thức (½ab·sinC, công thức Heron, pr, abc/4R) và suy ra đường cao, bán kính đường tròn nội tiếp.'),
    d(B2, 'Giải tam giác và ứng dụng thực tế', 'Giải tam giác', 'Giải được tam giác (tìm mọi cạnh, góc còn lại) khi biết ba yếu tố trong đó có ít nhất một cạnh.'),
    d(B2, null, 'Chứng minh hệ thức, nhận dạng tam giác', 'Chứng minh được các hệ thức trong tam giác và nhận dạng được tam giác từ hệ thức cho trước bằng định lí côsin, định lí sin.'),
    d(B2, null, 'Ứng dụng thực tế của hệ thức lượng trong tam giác', 'Vận dụng được hệ thức lượng trong tam giác để đo khoảng cách, chiều cao trong thực tế.'),
    d(B3, 'Tổng hợp hệ thức lượng và giải tam giác', 'Bài tập tổng hợp chương 3', 'Vận dụng tổng hợp kiến thức của chương 3 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Các khái niệm mở đầu', B2 = 'Bài 2. Tổng và hiệu của hai vectơ', B3 = 'Bài 3. Tích của một vectơ với một số', B4 = 'Bài 4. Vectơ trong mặt phẳng tọa độ', B5 = 'Bài 5. Tích vô hướng của hai vectơ', B6 = 'Bài 6. Ôn tập chương';
  KH[4] = [
    d(B1, 'Xác định vectơ, hai vectơ cùng phương, cùng hướng, bằng nhau', 'Xác định vectơ, hai vectơ cùng phương, cùng hướng, bằng nhau', 'Nhận biết được vectơ, vectơ-không, hai vectơ cùng phương, cùng hướng, bằng nhau và đếm được số vectơ trong hình.'),
    d(B1, null, 'Tính độ dài của vectơ trong hình', 'Tính được độ dài vectơ dựa vào độ dài đoạn thẳng trong hình vuông, hình chữ nhật, tam giác đều.'),
    d(B2, 'Xác định tổng, hiệu của hai vectơ (quy tắc ba điểm, quy tắc hình bình hành)', 'Xác định tổng, hiệu của hai vectơ (quy tắc ba điểm, quy tắc hình bình hành)', 'Xác định được vectơ tổng, vectơ hiệu bằng quy tắc ba điểm, quy tắc hình bình hành, quy tắc trừ.'),
    d(B2, 'Chứng minh đẳng thức vectơ (phép cộng, trừ)', 'Chứng minh đẳng thức vectơ (phép cộng, trừ)', 'Chứng minh được đẳng thức vectơ bằng quy tắc ba điểm, quy tắc hình bình hành, tính chất trung điểm, trọng tâm.'),
    d(B2, null, 'Tính độ dài của vectơ tổng, vectơ hiệu', 'Tính được độ dài của vectơ tổng, vectơ hiệu trong hình vuông, tam giác đều, hình chữ nhật.'),
    d(B2, 'Toán thực tế - Lực', 'Bài toán thực tế về tổng hợp lực, vận tốc', 'Vận dụng được phép cộng, trừ vectơ để giải bài toán về hợp lực, vận tốc tổng hợp trong thực tế.'),
    d(B3, 'Xác định tích của một vectơ với một số', 'Xác định tích của một vectơ với một số', 'Xác định được vectơ k·a (phương, hướng, độ dài) và dựng được vectơ tích.'),
    d(B3, 'Phân tích một vectơ theo hai vectơ không cùng phương', 'Phân tích một vectơ theo hai vectơ không cùng phương', 'Biểu thị được một vectơ theo hai vectơ không cùng phương và theo trung điểm, trọng tâm.'),
    d(B3, 'Chứng minh ba điểm thẳng hàng, hai đường thẳng song song bằng vectơ', 'Chứng minh ba điểm thẳng hàng, hai đường thẳng song song bằng vectơ', 'Chứng minh được ba điểm thẳng hàng, hai đường thẳng song song bằng điều kiện hai vectơ cùng phương.'),
    d(B3, null, 'Chứng minh đẳng thức vectơ có trung điểm, trọng tâm', 'Chứng minh được đẳng thức vectơ liên quan đến trung điểm đoạn thẳng, trọng tâm tam giác và xác định điểm thoả mãn đẳng thức vectơ.'),
    d(B3, 'Tính độ dài của vectơ', 'Tính độ dài của vectơ tích với một số', 'Tính được độ dài vectơ dạng k·a + m·b trong tam giác, hình vuông, hình chữ nhật.'),
    d(B4, 'Tìm tọa độ của vectơ, tọa độ điểm', 'Tìm tọa độ của vectơ, tọa độ điểm', 'Tìm được toạ độ của vectơ, toạ độ điểm (trung điểm, trọng tâm, đỉnh thứ tư hình bình hành) trong mặt phẳng toạ độ.'),
    d(B4, 'Các phép toán vectơ bằng tọa độ', 'Các phép toán vectơ bằng tọa độ', 'Thực hiện được phép cộng, trừ, nhân với số bằng toạ độ và tính được độ dài vectơ, khoảng cách hai điểm.'),
    d(B4, null, 'Xét cùng phương, thẳng hàng bằng tọa độ', 'Xét được hai vectơ cùng phương, ba điểm thẳng hàng và phân tích vectơ theo hai vectơ bằng toạ độ.'),
    d(B4, null, 'Bài toán thực tế về vectơ trong mặt phẳng tọa độ', 'Vận dụng được toạ độ vectơ để giải bài toán thực tế (vị trí, chuyển động, lực).'),
    d(B5, 'Tính tích vô hướng của hai vectơ và ứng dụng', 'Tính tích vô hướng của hai vectơ', 'Tính được tích vô hướng của hai vectơ bằng định nghĩa và bằng toạ độ.'),
    d(B5, 'Tính góc giữa hai vectơ', 'Tính góc giữa hai vectơ', 'Tính được góc giữa hai vectơ bằng tích vô hướng và xét được hai vectơ vuông góc.'),
    d(B5, null, 'Chứng minh vuông góc, tính độ dài bằng tích vô hướng', 'Vận dụng được tích vô hướng để chứng minh hai đường thẳng vuông góc, tính độ dài đoạn thẳng và chứng minh đẳng thức.'),
    d(B5, null, 'Bài toán thực tế về tích vô hướng (công của lực)', 'Vận dụng được tích vô hướng để tính công của lực và giải bài toán thực tế.'),
    d(B6, 'Tổng hợp các phép toán vectơ và tọa độ', 'Bài tập tổng hợp chương 4', 'Vận dụng tổng hợp kiến thức của chương 4 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Số gần đúng và sai số', B2 = 'Bài 2. Các số đặc trưng đo xu thế trung tâm', B3 = 'Bài 3. Các số đặc trưng đo độ phân tán', B4 = 'Bài 4. Ôn tập chương';
  KH[5] = [
    d(B1, 'Xác định số gần đúng, sai số tuyệt đối, sai số tương đối', 'Xác định số gần đúng, sai số tuyệt đối, sai số tương đối', 'Nhận biết được số gần đúng, tính được sai số tuyệt đối, độ chính xác và sai số tương đối.'),
    d(B1, 'Xác định quy tròn số, chữ số đáng tin', 'Quy tròn số gần đúng, xác định chữ số chắc', 'Quy tròn được số gần đúng với độ chính xác cho trước và xác định được chữ số chắc.'),
    d(B2, 'Tính số trung bình, trung vị, tứ phân vị, mốt', 'Tính số trung bình, trung vị, tứ phân vị, mốt', 'Tính được số trung bình, trung vị, tứ phân vị, mốt của mẫu số liệu không ghép nhóm cho dưới dạng dãy số hoặc bảng tần số.'),
    d(B2, 'Ý nghĩa các số đặc trưng đo xu thế trung tâm', 'Ý nghĩa và lựa chọn số đặc trưng đo xu thế trung tâm', 'Giải thích được ý nghĩa, lựa chọn được số đặc trưng phù hợp để đại diện cho mẫu số liệu và so sánh hai mẫu.'),
    d(B3, 'Tính khoảng biến thiên, khoảng tứ phân vị', 'Tính khoảng biến thiên, khoảng tứ phân vị, phát hiện giá trị bất thường', 'Tính được khoảng biến thiên, khoảng tứ phân vị và phát hiện được giá trị bất thường của mẫu số liệu.'),
    d(B3, 'Tính phương sai, độ lệch chuẩn', 'Tính phương sai, độ lệch chuẩn', 'Tính được phương sai, độ lệch chuẩn của mẫu số liệu không ghép nhóm.'),
    d(B3, null, 'Ý nghĩa các số đặc trưng đo độ phân tán, so sánh hai mẫu số liệu', 'Giải thích được ý nghĩa của các số đặc trưng đo độ phân tán và so sánh được độ phân tán của hai mẫu số liệu.'),
    d(B4, 'Tổng hợp các số đặc trưng của mẫu số liệu', 'Bài tập tổng hợp chương 5', 'Vận dụng tổng hợp kiến thức của chương 5 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Hàm số', B2 = 'Bài 2. Hàm số bậc hai', B3 = 'Bài 3. Dấu của tam thức bậc hai', B4 = 'Bài 4. Phương trình quy về phương trình bậc hai', B5 = 'Bài 5. Ôn tập chương';
  KH[6] = [
    d(B1, null, 'Nhận biết hàm số, tính giá trị của hàm số', 'Nhận biết được hàm số cho bằng công thức, bảng, đồ thị và tính được giá trị của hàm số tại điểm cho trước.'),
    d(B1, 'Tìm tập xác định, tập giá trị của hàm số', 'Tìm tập xác định, tập giá trị của hàm số', 'Tìm được tập xác định của hàm số cho bằng công thức (chứa căn, mẫu) và tập giá trị của hàm số đơn giản.'),
    d(B1, 'Xét tính đồng biến, nghịch biến của hàm số', 'Xét tính đồng biến, nghịch biến của hàm số', 'Xét được tính đồng biến, nghịch biến của hàm số trên một khoảng bằng định nghĩa hoặc bằng đồ thị.'),
    d(B1, null, 'Đồ thị của hàm số và bài toán thực tế về hàm số', 'Đọc được thông tin từ đồ thị hàm số và lập được hàm số biểu thị đại lượng trong tình huống thực tế.'),
    d(B2, 'Lập bảng biến thiên và vẽ đồ thị hàm số bậc hai', 'Lập bảng biến thiên và vẽ đồ thị hàm số bậc hai', 'Xác định được đỉnh, trục đối xứng, lập được bảng biến thiên và vẽ được đồ thị hàm số bậc hai.'),
    d(B2, 'Xác định hàm số bậc hai khi biết một số yếu tố', 'Xác định hàm số bậc hai khi biết một số yếu tố', 'Xác định được hệ số a, b, c của hàm số bậc hai khi biết đỉnh, trục đối xứng, điểm đi qua hoặc đồ thị.'),
    d(B2, null, 'Tìm giá trị lớn nhất, nhỏ nhất của hàm số bậc hai', 'Tìm được giá trị lớn nhất, giá trị nhỏ nhất của hàm số bậc hai trên tập xác định hoặc trên một đoạn.'),
    d(B2, null, 'Bài toán thực tế về hàm số bậc hai', 'Vận dụng được hàm số bậc hai để giải bài toán thực tế (quỹ đạo, cổng parabol, tối ưu diện tích, doanh thu).'),
    d(B3, 'Xét dấu tam thức bậc hai', 'Xét dấu tam thức bậc hai', 'Xét được dấu của tam thức bậc hai dựa vào biệt thức và hệ số a.'),
    d(B3, 'Giải bất phương trình bậc hai một ẩn', 'Giải bất phương trình bậc hai một ẩn', 'Giải được bất phương trình bậc hai một ẩn và bất phương trình đưa về tích, thương các tam thức.'),
    d(B3, 'Ứng dụng dấu tam thức bậc hai (tìm điều kiện của tham số m)', 'Tìm tham số để tam thức không đổi dấu, bất phương trình nghiệm đúng với mọi x', 'Tìm được giá trị của tham số để tam thức bậc hai luôn dương, luôn âm, phương trình bậc hai có nghiệm, bất phương trình nghiệm đúng với mọi x.'),
    d(B3, null, 'Bài toán thực tế về bất phương trình bậc hai', 'Vận dụng được dấu tam thức bậc hai để giải bài toán thực tế (lợi nhuận, quỹ đạo, điều kiện an toàn).'),
    d(B4, 'Giải phương trình chứa căn thức dạng sqrt(f(x)) = sqrt(g(x))', 'Giải phương trình dạng √f(x) = √g(x)', 'Giải được phương trình dạng √f(x) = √g(x) bằng cách bình phương hai vế và thử lại nghiệm.'),
    d(B4, 'Giải phương trình chứa căn thức dạng sqrt(f(x)) = g(x)', 'Giải phương trình dạng √f(x) = g(x)', 'Giải được phương trình dạng √f(x) = g(x) bằng cách bình phương hai vế và thử lại nghiệm.'),
    d(B4, null, 'Bài toán thực tế về phương trình quy về phương trình bậc hai', 'Vận dụng được phương trình chứa căn để giải bài toán thực tế (khoảng cách, thời gian, chi phí).'),
    d(B5, 'Tổng hợp hàm số, đồ thị, tam thức bậc hai, phương trình quy về bậc hai', 'Bài tập tổng hợp chương 6', 'Vận dụng tổng hợp kiến thức của chương 6 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Phương trình đường thẳng', B2 = 'Bài 2. Vị trí tương đối giữa hai đường thẳng. Góc và khoảng cách', B3 = 'Bài 3. Đường tròn trong mặt phẳng tọa độ', B4 = 'Bài 4. Ba đường conic', B5 = 'Bài 5. Ôn tập chương';
  KH[7] = [
    d(B1, null, 'Xác định vectơ pháp tuyến, vectơ chỉ phương, điểm thuộc đường thẳng', 'Xác định được vectơ pháp tuyến, vectơ chỉ phương của đường thẳng và kiểm tra được điểm thuộc đường thẳng.'),
    d(B1, 'Viết phương trình tham số, phương trình tổng quát của đường thẳng', 'Viết phương trình tham số, phương trình tổng quát của đường thẳng', 'Viết được phương trình tham số, phương trình tổng quát của đường thẳng khi biết điểm và vectơ chỉ phương, vectơ pháp tuyến hoặc hai điểm.'),
    d(B1, 'Chuyển đổi giữa các dạng phương trình đường thẳng', 'Chuyển đổi giữa các dạng phương trình đường thẳng', 'Chuyển được phương trình đường thẳng giữa dạng tham số, tổng quát, chính tắc, hệ số góc.'),
    d(B1, null, 'Viết phương trình các đường thẳng đặc biệt trong tam giác', 'Viết được phương trình đường cao, đường trung tuyến, đường trung trực, đường thẳng qua một điểm và song song hoặc vuông góc với đường thẳng cho trước.'),
    d(B2, 'Xét vị trí tương đối giữa hai đường thẳng', 'Xét vị trí tương đối giữa hai đường thẳng', 'Xét được vị trí tương đối (cắt nhau, song song, trùng nhau, vuông góc) của hai đường thẳng và tìm được giao điểm.'),
    d(B2, 'Tính góc giữa hai đường thẳng', 'Tính góc giữa hai đường thẳng', 'Tính được góc giữa hai đường thẳng bằng vectơ pháp tuyến hoặc vectơ chỉ phương.'),
    d(B2, 'Tính khoảng cách từ một điểm đến một đường thẳng', 'Tính khoảng cách từ một điểm đến một đường thẳng', 'Tính được khoảng cách từ một điểm đến một đường thẳng, khoảng cách giữa hai đường thẳng song song và vận dụng tính diện tích tam giác.'),
    d(B2, null, 'Tìm điểm, viết phương trình đường thẳng thoả mãn điều kiện về góc, khoảng cách', 'Tìm được điểm, viết được phương trình đường thẳng thoả mãn điều kiện về khoảng cách, góc, đường phân giác.'),
    d(B2, null, 'Bài toán thực tế về vị trí tương đối, góc và khoảng cách', 'Vận dụng được góc và khoảng cách trong mặt phẳng toạ độ để giải bài toán thực tế.'),
    d(B3, 'Xác định tâm và bán kính đường tròn', 'Nhận biết phương trình đường tròn, xác định tâm và bán kính', 'Nhận biết được phương trình đường tròn và xác định được tâm, bán kính từ phương trình.'),
    d(B3, 'Viết phương trình đường tròn', 'Viết phương trình đường tròn', 'Viết được phương trình đường tròn khi biết tâm và bán kính, đường kính, tâm và tiếp xúc với đường thẳng, đi qua ba điểm.'),
    d(B3, 'Viết phương trình tiếp tuyến của đường tròn', 'Viết phương trình tiếp tuyến của đường tròn', 'Viết được phương trình tiếp tuyến của đường tròn tại một điểm thuộc đường tròn và tiếp tuyến thoả mãn điều kiện cho trước.'),
    d(B3, null, 'Vị trí tương đối của đường thẳng và đường tròn, bài toán thực tế', 'Xét được vị trí tương đối của đường thẳng và đường tròn, tìm được giao điểm và vận dụng vào bài toán thực tế.'),
    d(B4, 'Nhận biết, viết phương trình chính tắc của Elip', 'Nhận biết, viết phương trình chính tắc của elip', 'Nhận biết được phương trình chính tắc của elip, xác định được tiêu điểm, đỉnh, trục và viết được phương trình chính tắc của elip.'),
    d(B4, 'Nhận biết, viết phương trình chính tắc của Hypebol', 'Nhận biết, viết phương trình chính tắc của hypebol', 'Nhận biết được phương trình chính tắc của hypebol, xác định được tiêu điểm, đỉnh và viết được phương trình chính tắc của hypebol.'),
    d(B4, 'Nhận biết, viết phương trình chính tắc của Parabol', 'Nhận biết, viết phương trình chính tắc của parabol', 'Nhận biết được phương trình chính tắc của parabol, xác định được tiêu điểm, đường chuẩn và viết được phương trình chính tắc của parabol.'),
    d(B4, null, 'Bài toán thực tế về ba đường conic', 'Vận dụng được ba đường conic để giải bài toán thực tế (quỹ đạo, cổng vòm, ăng-ten parabol).'),
    d(B5, 'Tổng hợp phương pháp tọa độ mặt phẳng (đường thẳng, đường tròn, ba đường conic)', 'Bài tập tổng hợp chương 7', 'Vận dụng tổng hợp kiến thức của chương 7 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Quy tắc đếm', B2 = 'Bài 2. Hoán vị, chỉnh hợp và tổ hợp', B3 = 'Bài 3. Nhị thức Newton', B4 = 'Bài 4. Ôn tập chương';
  KH[8] = [
    d(B1, 'Vận dụng quy tắc cộng', 'Vận dụng quy tắc cộng', 'Vận dụng được quy tắc cộng để đếm số cách chọn trong các tình huống đơn giản.'),
    d(B1, 'Vận dụng quy tắc nhân', 'Vận dụng quy tắc nhân', 'Vận dụng được quy tắc nhân để đếm số cách thực hiện công việc gồm nhiều công đoạn.'),
    d(B1, 'Kết hợp quy tắc cộng và quy tắc nhân', 'Kết hợp quy tắc cộng và quy tắc nhân, sơ đồ hình cây', 'Kết hợp được quy tắc cộng và quy tắc nhân, vẽ sơ đồ hình cây để đếm trong các bài toán lập số, chọn đồ vật, đường đi.'),
    d(B2, 'Bài toán đếm sử dụng hoán vị', 'Bài toán đếm sử dụng hoán vị', 'Nhận biết được hoán vị và vận dụng công thức n! để đếm số cách sắp xếp.'),
    d(B2, 'Bài toán đếm sử dụng chỉnh hợp', 'Bài toán đếm sử dụng chỉnh hợp', 'Nhận biết được chỉnh hợp và vận dụng công thức A(n,k) để đếm số cách chọn có thứ tự.'),
    d(B2, 'Bài toán đếm sử dụng tổ hợp', 'Bài toán đếm sử dụng tổ hợp', 'Nhận biết được tổ hợp và vận dụng công thức C(n,k) để đếm số cách chọn không có thứ tự.'),
    d(B2, null, 'Phối hợp hoán vị, chỉnh hợp, tổ hợp và quy tắc đếm', 'Phối hợp được hoán vị, chỉnh hợp, tổ hợp với quy tắc cộng, quy tắc nhân trong bài toán đếm có điều kiện.'),
    d(B2, null, 'Tính giá trị, giải phương trình có hoán vị, chỉnh hợp, tổ hợp', 'Tính được giá trị biểu thức và giải được phương trình đơn giản chứa n!, A(n,k), C(n,k), kể cả bằng máy tính cầm tay.'),
    d(B3, 'Khai triển nhị thức Newton (với n = 4, n = 5)', 'Khai triển nhị thức Newton (với n = 4, n = 5)', 'Khai triển được (a + b)⁴, (a + b)⁵ bằng công thức nhị thức Newton hoặc tam giác Pascal.'),
    d(B3, 'Tìm hệ số của số hạng trong khai triển nhị thức Newton', 'Tìm hệ số, số hạng trong khai triển nhị thức Newton', 'Tìm được hệ số của một số hạng trong khai triển (a + b)ⁿ với n = 4, 5.'),
    d(B3, null, 'Ứng dụng nhị thức Newton để tính giá trị, chứng minh', 'Vận dụng được nhị thức Newton để tính gần đúng, tính tổng các hệ số và chứng minh đẳng thức đơn giản.'),
    d(B4, 'Tổng hợp quy tắc đếm, hoán vị, chỉnh hợp, tổ hợp, nhị thức Newton', 'Bài tập tổng hợp chương 8', 'Vận dụng tổng hợp kiến thức của chương 8 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
{ const B1 = 'Bài 1. Biến cố và định nghĩa cổ điển của xác suất', B2 = 'Bài 2. Thực hành tính xác suất theo định nghĩa cổ điển', B3 = 'Bài 3. Ôn tập chương';
  KH[9] = [
    d(B1, 'Xác định không gian mẫu và biến cố', 'Mô tả không gian mẫu và biến cố', 'Mô tả được không gian mẫu, biến cố, biến cố đối và đếm được số phần tử của chúng trong phép thử đơn giản.'),
    d(B1, 'Tính xác suất bằng định nghĩa cổ điển', 'Tính xác suất bằng định nghĩa cổ điển', 'Tính được xác suất của biến cố bằng định nghĩa cổ điển khi liệt kê được không gian mẫu.'),
    d(B1, null, 'Nhận biết ý nghĩa của xác suất, xác suất của biến cố đối', 'Vận dụng được tính chất P(A̅) = 1 − P(A), nhận biết được biến cố chắc chắn, không thể và ý nghĩa thực tế của xác suất.'),
    d(B2, null, 'Tính xác suất bằng sơ đồ hình cây', 'Tính được xác suất của biến cố bằng cách dùng sơ đồ hình cây để liệt kê các kết quả.'),
    d(B2, 'Tính xác suất sử dụng quy tắc đếm (hoán vị, chỉnh hợp, tổ hợp)', 'Tính xác suất sử dụng quy tắc đếm (hoán vị, chỉnh hợp, tổ hợp)', 'Tính được xác suất của biến cố bằng cách dùng hoán vị, chỉnh hợp, tổ hợp để đếm số kết quả.'),
    d(B2, null, 'Tính xác suất bằng biến cố đối', 'Tính được xác suất của biến cố thông qua biến cố đối trong các bài toán "có ít nhất".'),
    d(B2, null, 'Bài toán thực tế về xác suất cổ điển', 'Vận dụng được xác suất cổ điển để giải bài toán thực tế (chọn đội, rút thẻ, kiểm tra sản phẩm).'),
    d(B3, 'Tổng hợp tính xác suất bằng phương pháp tổ hợp', 'Bài tập tổng hợp chương 9', 'Vận dụng tổng hợp kiến thức của chương 9 để giải các bài toán ôn tập, kiểm tra cuối chương.'),
  ]; }
for (const c of [3, 4, 5, 6, 7, 8, 9]) writeFileSync(`scratch/soi-dang/lop10-c${c}.ke-hoach.json`, JSON.stringify({ lop: '10', chuong: c, dang: KH[c], xoa: [], chuyen: {} }, null, 1));
console.log('ok');
