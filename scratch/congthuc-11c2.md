# TỔNG HỢP CÔNG THỨC CHƯƠNG 2: DÃY SỐ – CẤP SỐ CỘNG – CẤP SỐ NHÂN

## 📖 1. DÃY SỐ

- **Dãy số vô hạn** | $u: \mathbb{N}^* \to \mathbb{R},\ n \mapsto u_n$ | định nghĩa: dãy số là hàm số trên tập số nguyên dương
- **Dãy số hữu hạn** | $u_1, u_2, \ldots, u_m$ | dãy chỉ có $m$ số hạng, $u_m$ là số hạng cuối
- **Cho bởi công thức tổng quát** | $u_n = f(n)$ | tìm được ngay số hạng bất kì, thay $n$ vào là xong
- **Cho bởi hệ thức truy hồi** | $u_1 = a,\ u_{n+1} = g(u_n)$ | phải tính lần lượt từ đầu, không nhảy cóc được
- **Dãy tăng** | $u_{n+1} > u_n\ \forall n \in \mathbb{N}^*$ | xét hiệu $u_{n+1} - u_n > 0$
- **Dãy giảm** | $u_{n+1} < u_n\ \forall n \in \mathbb{N}^*$ | xét hiệu $u_{n+1} - u_n < 0$
- **Xét đơn điệu bằng tỉ số** | $\dfrac{u_{n+1}}{u_n} > 1 \Rightarrow$ tăng | chỉ dùng khi mọi $u_n > 0$
- **Bị chặn trên** | $\exists M: u_n \le M\ \forall n$ | chứng minh dãy không vượt quá một mức
- **Bị chặn dưới** | $\exists m: u_n \ge m\ \forall n$ | chứng minh dãy không tụt dưới một mức
- **Bị chặn** | $m \le u_n \le M\ \forall n$ | vừa chặn trên vừa chặn dưới
- **Tách phần nguyên** | $\dfrac{an+b}{cn+d} = \dfrac{a}{c} + \dfrac{\text{const}}{cn+d}$ | mẹo chứng minh bị chặn cho dãy phân thức
- **Tổng sai phân** | $\displaystyle\sum_{k=1}^{n} \left(a_k - a_{k+1}\right) = a_1 - a_{n+1}$ | dãy cho bởi tổng, các phần giữa triệt tiêu
- **Tách phân thức quen thuộc** | $\dfrac{1}{k(k+1)} = \dfrac{1}{k} - \dfrac{1}{k+1}$ | đưa tổng về dạng sai phân
- **Tách phân thức lẻ** | $\dfrac{1}{(2k-1)(2k+1)} = \dfrac{1}{2}\left(\dfrac{1}{2k-1} - \dfrac{1}{2k+1}\right)$ | tổng các phân thức mẫu là tích hai số lẻ liên tiếp

## 📖 2. CẤP SỐ CỘNG

- **Định nghĩa cấp số cộng** | $u_{n+1} = u_n + d\ \forall n \in \mathbb{N}^*$ | hiệu hai số hạng liên tiếp luôn không đổi
- **Công sai** | $d = u_{n+1} - u_n$ | lấy số hạng sau trừ số hạng trước
- **Số hạng tổng quát** | $u_n = u_1 + (n-1)d$ | biết số hạng đầu và công sai, tìm số hạng thứ $n$
- **Dấu hiệu nhận biết theo công thức** | $u_n = an + b \Rightarrow d = a$ | tổng quát là đa thức bậc nhất theo $n$
- **Tính chất ba số hạng liên tiếp** | $u_k = \dfrac{u_{k-1} + u_{k+1}}{2}$ | đề cho ba số liên tiếp, hoặc chứng minh ba số lập thành cấp số cộng
- **Tổng cách đều hai đầu** | $u_k + u_{n-k+1} = u_1 + u_n$ | biết tổng hai số hạng bất kì cách đều là tính được $S_n$
- **Tổng $n$ số hạng đầu (biết hai đầu)** | $S_n = \dfrac{n\left(u_1 + u_n\right)}{2}$ | đã biết $u_1$ và $u_n$
- **Tổng $n$ số hạng đầu (biết công sai)** | $S_n = \dfrac{n\left[2u_1 + (n-1)d\right]}{2}$ | đã biết $u_1$ và $d$
- **Tổng một khúc giữa** | $u_k + u_{k+1} + \cdots + u_n = S_n - S_{k-1}$ | tổng từ số hạng thứ $k$ đến thứ $n$
- **Số số hạng của một khúc** | $n - k + 1$ | đếm số hạng từ thứ $k$ đến thứ $n$

## 📖 3. CẤP SỐ NHÂN

- **Định nghĩa cấp số nhân** | $u_{n+1} = u_n \cdot q\ \forall n \in \mathbb{N}^*$ | tỉ số hai số hạng liên tiếp luôn không đổi
- **Công bội** | $q = \dfrac{u_{n+1}}{u_n}$ | cần $u_n \ne 0$
- **Số hạng tổng quát** | $u_n = u_1 \cdot q^{\,n-1}$ | biết số hạng đầu và công bội
- **Dấu hiệu nhận biết theo công thức** | $u_n = a \cdot b^{\,n} \Rightarrow q = b$ | tổng quát có dạng luỹ thừa theo $n$
- **Tính chất ba số hạng liên tiếp** | $u_k^2 = u_{k-1} \cdot u_{k+1}$ | chứng minh ba số lập thành cấp số nhân
- **Chia vế theo vế** | $\dfrac{u_m}{u_k} = q^{\,m-k}$ | giải hệ tìm $q$, số hạng đầu tự triệt tiêu
- **Tổng $n$ số hạng đầu** | $S_n = u_1 \cdot \dfrac{1 - q^{\,n}}{1 - q}$ | chỉ dùng khi $q \ne 1$
- **Tổng khi công bội bằng 1** | $S_n = n \cdot u_1$ | trường hợp $q = 1$, mọi số hạng bằng nhau

## 📖 4. BÀI TOÁN THỰC TẾ

- **Tăng đều một lượng** | $u_n = u_1 + (n-1)d$ | mỗi kì cộng thêm cùng một số — cấp số cộng
- **Tăng đều một tỉ lệ** | $u_n = u_0(1 + r)^n$ | mỗi kì tăng $r\%$ — cấp số nhân, lãi kép, tăng trưởng
- **Giảm đều một tỉ lệ** | $u_n = u_0(1 - r)^n$ | khấu hao, phân rã, mất giá $r\%$ mỗi kì
- **Vừa sinh lãi vừa trả bớt** | $u_{n+1} = u_n(1 + r) - a$ | vay trả góp, mỗi kì trả $a$
- **Lãi kép nhiều kì trong năm** | $r_{\text{kì}} = \dfrac{r_{\text{năm}}}{\text{số kì}}$ | lãi suất năm, kì hạn tháng hoặc quý

## 🖩 5. BẤM MÁY CASIO fx-580VN X

- **Liệt kê số hạng (tổng quát)** | `MENU` `8` → nhập $f(x) = u_n$ → Start · End · Step | dãy cho bởi công thức tổng quát
- **Liệt kê số hạng (truy hồi)** | nhập $u_1$ `=` → công thức theo `Ans` `=` → giữ `=` | TABLE không nhận công thức truy hồi
- **Truy hồi hai bậc** | $u_1$ `=` $u_2$ `=` → `Ans` `+` `PreAns` `=` | `PreAns` là `SHIFT` `Ans`, chỉ dùng ở phương thức Calculate
- **Tính tổng** | `SHIFT` `x` → $f(X)$ → `→` cận dưới → `→` cận trên → `=` | cận phải là số nguyên, bước nhảy luôn bằng 1
- **Tìm $n$ từ một số hạng** | nhập biểu thức `ALPHA` `CALC` giá trị → `SHIFT` `CALC` | SOLVE cho nghiệm gần đúng, $n$ phải là số nguyên dương
- **Giải hệ hai ẩn** | `MENU` `9` → hệ bậc nhất 2 ẩn → nhập hệ số | tìm $u_1$ và $d$ (hoặc $q$) từ hai dữ kiện
- **Giới hạn phải nhớ** | SOLVE không giải được biểu thức chứa `Σ(` | tìm $n$ từ $S_n$ thì phải thay bằng công thức thu gọn
