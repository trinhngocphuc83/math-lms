### BÀI 3. CẤP SỐ NHÂN
# PHẦN 1: TÓM TẮT LÝ THUYẾT TRỌNG TÂM

## 📖 1. ĐỊNH NGHĨA

Dãy số $\color{blue} (u_n)$ là **cấp số nhân** nếu từ số hạng thứ hai trở đi, mỗi số hạng đều bằng số hạng đứng trước **nhân** với một số không đổi $\color{blue} q$:

$$\color{blue} u_{n+1} = u_n \cdot q \quad \text{với mọi } n \in \mathbb{N}^*$$

Số $\color{blue} q$ gọi là **công bội**, tính bằng $\color{blue} q = \dfrac{u_{n+1}}{u_n}$ (với $\color{blue} u_n \ne 0$).

> ⚠️ **Điều kiện thường bị bỏ quên:** muốn lập tỉ số thì $\color{blue} u_1 \ne 0$ và $\color{blue} q \ne 0$. Dãy $\color{blue} 0, 0, 0, \ldots$ không được coi là cấp số nhân theo nghĩa dùng công thức tỉ số.

<!--QUIZ|Xác định số hạng, công bội|1|1-->

---

## 🛠 2. BA CÔNG THỨC PHẢI THUỘC

| Công thức | Viết | Dùng khi |
|---|---|---|
| **Số hạng tổng quát** | $\color{blue} u_n = u_1 \cdot q^{\,n-1}$ | biết $\color{blue} u_1, q$ |
| **Tính chất ba số liên tiếp** | $\color{blue} u_k^2 = u_{k-1} \cdot u_{k+1}$ | đề cho ba số liên tiếp |
| **Tổng $\color{blue} n$ số hạng đầu** | $\color{blue} S_n = u_1 \cdot \dfrac{1 - q^{\,n}}{1 - q}$ với $\color{blue} q \ne 1$ | tính tổng |

> ⚠️ Số mũ là $\color{blue} n-1$, **không phải** $\color{blue} n$. Kiểm nhanh: thay $\color{blue} n=1$ phải ra $\color{blue} u_1 \cdot q^0 = u_1$.

> ⚠️ Công thức tổng **chỉ đúng khi $\color{blue} q \ne 1$** (mẫu số khác 0). Trường hợp $\color{blue} q = 1$ thì mọi số hạng bằng nhau nên $\color{blue} S_n = n \cdot u_1$. Đề có tham số thì phải xét riêng trường hợp này, quên là mất điểm.

<!--QUIZ|Tính tổng các số hạng|1|1-->

---

## 📌 3. SO SÁNH CẤP SỐ CỘNG VÀ CẤP SỐ NHÂN

| | Cấp số cộng | Cấp số nhân |
|---|---|---|
| Quy luật | **cộng** thêm $\color{blue} d$ | **nhân** thêm $\color{blue} q$ |
| Tổng quát | $\color{blue} u_1 + (n-1)d$ — bậc nhất theo $\color{blue} n$ | $\color{blue} u_1 q^{\,n-1}$ — luỹ thừa theo $\color{blue} n$ |
| Ba số liên tiếp | $\color{blue} 2u_k = u_{k-1}+u_{k+1}$ | $\color{blue} u_k^2 = u_{k-1}u_{k+1}$ |
| Ngoài đời | mỗi tháng tiết kiệm thêm cùng **một số tiền** | mỗi tháng tăng thêm cùng **một tỉ lệ %** |

> 💡 Đọc đề thấy chữ "**mỗi năm tăng 8%**" là cấp số nhân với $\color{blue} q = 1{,}08$. Thấy "**mỗi năm tăng thêm 8 triệu**" mới là cấp số cộng. Một chữ "%" đổi hẳn bài toán.

---

# PHẦN 2: PHÂN DẠNG BÀI TẬP & PHƯƠNG PHÁP GIẢI

## 💡 DẠNG 1: XÁC ĐỊNH SỐ HẠNG VÀ CÔNG BỘI

### 🛠 Phương pháp giải

#### Bước 1: Quy về hai ẩn $\color{blue} u_1$ và $\color{blue} q$

#### Bước 2: **Chia vế theo vế** hai phương trình
Đây là mẹo riêng của cấp số nhân: chia thì $\color{blue} u_1$ triệt tiêu, còn lại một phương trình chỉ có $\color{blue} q$.

$$\color{blue} \frac{u_1 q^{\,m-1}}{u_1 q^{\,k-1}} = q^{\,m-k}$$

#### Bước 3: Tìm $\color{blue} q$ rồi thay ngược lại tìm $\color{blue} u_1$

> ⚠️ Giải ra $\color{blue} q^2 = 4$ thì có **hai** nghiệm $\color{blue} q = 2$ và $\color{blue} q = -2$ — phải xét cả hai rồi mới loại theo điều kiện đề. Quên nghiệm âm là mất một nửa số điểm.

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** tính nhanh luỹ thừa, và tìm $\color{blue} n$ khi biết một số hạng.

**Tìm $\color{blue} n$** — ví dụ $\color{blue} u_1 = 3$, $\color{blue} q = 2$, hỏi số hạng thứ mấy bằng $\color{blue} 384$:

| Bước | Bấm |
|---|---|
| 1 | Nhập `3` `×` `2` `^` `(` `X` `−` `1` `)` |
| 2 | `ALPHA` `CALC` để ra dấu `=` |
| 3 | Nhập `384` |
| 4 | `SHIFT` `CALC` (SOLVE), giá trị khởi đầu `5`, rồi `=` |

Ra $\color{blue} X = 8$.

**Liệt kê số hạng:** `MENU` `8` (TABLE) với $\color{blue} f(x) = u_1 \cdot q^{\,x-1}$, Start `1`, End `10`, Step `1`.

> ⚠️ Cấp số nhân lớn rất nhanh, TABLE sẽ hiện dạng $\color{blue} 1{,}23 \times 10^{9}$ — đọc kĩ số mũ, đừng chép nhầm.
> SOLVE cho nghiệm gần đúng và **phụ thuộc giá trị khởi đầu**; với $\color{blue} q < 0$ thì hàm dao động, nên đoán khởi đầu gần nghiệm mới ra. Không ra thì đổi số khởi đầu.
> Máy chỉ để kiểm tra lại và chọn nhanh trắc nghiệm — bài tự luận vẫn phải trình bày.

---

> ### 📌 Ví dụ mẫu
>
> Cho cấp số nhân $\color{blue} (u_n)$ có $\color{blue} u_2 = 6$ và $\color{blue} u_5 = 48$. Tìm $\color{blue} u_1$ và $\color{blue} q$.
>
> Hướng dẫn giải:
> Viết theo $\color{blue} u_1$ và $\color{blue} q$:
> $\color{blue} u_2 = u_1 q = 6$
> $\color{blue} u_5 = u_1 q^4 = 48$
> Chia vế theo vế (được phép vì $\color{blue} u_2 \ne 0$):
> $\color{blue} \dfrac{u_1 q^4}{u_1 q} = \dfrac{48}{6} \Rightarrow q^3 = 8 \Rightarrow q = 2$.
> Thay lại: $\color{blue} u_1 \cdot 2 = 6 \Rightarrow u_1 = 3$.
>
> Vậy $\color{blue} u_1 = 3$, $\color{blue} q = 2$.
> (Ở đây $\color{blue} q^3 = 8$ chỉ có một nghiệm thực nên không phải xét thêm; gặp $\color{blue} q^2$ thì nhớ xét cả hai dấu.)

<!--QUIZ|Xác định số hạng, công bội|2|1,2-->

---

## 💡 DẠNG 2: TÌM CÔNG THỨC CỦA CẤP SỐ NHÂN

### 🛠 Phương pháp giải

#### Bước 1: Tìm $\color{blue} u_1$ và $\color{blue} q$ như Dạng 1

#### Bước 2: Viết $\color{blue} u_n = u_1 \cdot q^{\,n-1}$

#### Bước 3: Rút gọn nếu đưa được về **một luỹ thừa duy nhất**
Ví dụ $\color{blue} u_n = 3 \cdot 2^{\,n-1} = \dfrac{3}{2} \cdot 2^{\,n}$. Cả hai cách viết đều đúng — chọn cách khớp với các phương án trong đề trắc nghiệm.

> 💡 **Chiều ngược lại hay được hỏi:** cho $\color{blue} u_n = 5 \cdot 3^{\,n}$, hỏi công bội. Viết lại $\color{blue} 5 \cdot 3^{\,n} = 15 \cdot 3^{\,n-1}$, vậy $\color{blue} u_1 = 15$ và $\color{blue} q = 3$. Cứ thấy dạng $\color{blue} a \cdot b^{\,n}$ là cấp số nhân với công bội $\color{blue} b$.

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** đối chiếu công thức vừa viết với các số hạng đề cho.

`MENU` `8` (TABLE), nhập $\color{blue} f(x) = u_1 \cdot q^{\,x-1}$, Start `1`, End `6`, Step `1`, rồi so từng số hạng với đề.

> ⚠️ Lệch ngay ở $\color{blue} f(1)$ thì gần như chắc là viết nhầm số mũ thành $\color{blue} q^{\,n}$ — đây là lỗi phổ biến nhất của dạng này.

---

> ### 📌 Ví dụ mẫu
>
> Cho cấp số nhân $\color{blue} (u_n)$ có $\color{blue} u_1 = 2$, $\color{blue} q = 3$. Viết công thức số hạng tổng quát và cho biết $\color{blue} 1458$ là số hạng thứ mấy.
>
> Hướng dẫn giải:
> $\color{blue} u_n = u_1 q^{\,n-1} = 2 \cdot 3^{\,n-1}$.
> Cho $\color{blue} u_n = 1458$:
> $\color{blue} 2 \cdot 3^{\,n-1} = 1458 \Rightarrow 3^{\,n-1} = 729 = 3^6 \Rightarrow n - 1 = 6 \Rightarrow n = 7$.
> Vậy $\color{blue} 1458$ là số hạng thứ $\color{blue} 7$.
>
> **Kiểm bằng máy:** TABLE với $\color{blue} f(x) = 2 \cdot 3^{\,x-1}$ — hàng $\color{blue} x = 7$ cho đúng $\color{blue} 1458$.

<!--QUIZ|Tìm công thức cấp số nhân|2|1,2-->

---

## 💡 DẠNG 3: TÍNH TỔNG CÁC SỐ HẠNG

### 🛠 Phương pháp giải

#### Bước 1: Kiểm $\color{blue} q$ có bằng $\color{blue} 1$ không
* $\color{blue} q = 1$: mọi số hạng bằng nhau, $\color{blue} S_n = n \cdot u_1$.
* $\color{blue} q \ne 1$: dùng $\color{blue} S_n = u_1 \cdot \dfrac{1-q^{\,n}}{1-q}$.

#### Bước 2: Đếm đúng số số hạng
Từ $\color{blue} u_1$ đến $\color{blue} u_n$ là $\color{blue} n$ số hạng; từ $\color{blue} u_k$ đến $\color{blue} u_n$ là $\color{blue} n-k+1$ số hạng.

#### Bước 3: Tổng một khúc giữa thì lấy hiệu
$$\color{blue} u_{k} + \cdots + u_{n} = S_n - S_{k-1}$$

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** cộng thẳng để đối chiếu kết quả tính bằng công thức.

$\color{blue} S = \displaystyle\sum_{k=1}^{10} 3 \cdot 2^{\,k-1}$:

| Bước | Bấm |
|---|---|
| 1 | `SHIFT` `x` (chữ Σ in vàng phía trên phím) |
| 2 | Nhập `3` `×` `2` `^` `(` `X` `−` `1` `)` |
| 3 | `→` rồi cận dưới `1` |
| 4 | `→` rồi cận trên `10` |
| 5 | `=` |

Ra $\color{blue} 3069$ — đúng bằng $\color{blue} 3 \cdot \dfrac{1-2^{10}}{1-2}$.

> ⚠️ Cấp số nhân tăng rất nhanh: cận trên lớn thì kết quả tràn hoặc máy chạy lâu, bấm `AC` để dừng.
> **"Tìm $\color{blue} n$ biết $\color{blue} S_n = \ldots$" thì không dùng được Σ** — SOLVE từ chối biểu thức chứa `Σ(`. Phải viết $\color{blue} u_1 \dfrac{1-q^{\,n}}{1-q}$ rồi mới SOLVE.

---

> ### 📌 Ví dụ mẫu
>
> Cho cấp số nhân $\color{blue} (u_n)$ có $\color{blue} u_1 = 3$, $\color{blue} q = 2$. Tính $\color{blue} S_{10}$.
>
> Hướng dẫn giải:
> Vì $\color{blue} q = 2 \ne 1$ nên
> $\color{blue} S_{10} = u_1 \cdot \dfrac{1 - q^{10}}{1 - q} = 3 \cdot \dfrac{1 - 2^{10}}{1 - 2} = 3 \cdot \dfrac{1 - 1024}{-1} = 3 \cdot 1023 = 3069$.
>
> Vậy $\color{blue} S_{10} = 3069$.

<!--QUIZ|Tính tổng các số hạng|2|2,3-->

---

## 💡 DẠNG 4: CHỨNG MINH MỘT DÃY LÀ CẤP SỐ NHÂN

### 🛠 Phương pháp giải

#### Bước 1: Nêu điều kiện $\color{blue} u_n \ne 0$ với mọi $\color{blue} n$
Không có bước này thì phép chia ở bước sau không hợp lệ.

#### Bước 2: Lập tỉ số $\color{blue} \dfrac{u_{n+1}}{u_n}$ rồi rút gọn

#### Bước 3: Ra hằng số thì kết luận
Tỉ số không còn chữ $\color{blue} n$ ⟹ dãy là cấp số nhân, công bội bằng chính hằng số ấy.

> 💡 Với dãy chứa luỹ thừa, dùng $\color{blue} \dfrac{a^{\,n+1}}{a^{\,n}} = a$ là rút gọn xong ngay.

> 🚫 **Dạng này không bấm máy được.** Tính vài số hạng thấy tỉ số bằng nhau **không phải là chứng minh** — dãy hoàn toàn có thể lệch ở số hạng thứ một trăm. Bài làm phải là phép biến đổi đại số đúng với mọi $\color{blue} n$.

---

> ### 📌 Ví dụ mẫu
>
> Cho dãy số $\color{blue} (u_n)$ với $\color{blue} u_n = 5 \cdot 4^{\,n}$. Chứng minh $\color{blue} (u_n)$ là cấp số nhân và tìm công bội.
>
> Hướng dẫn giải:
> Với mọi $\color{blue} n \in \mathbb{N}^*$ ta có $\color{blue} u_n = 5 \cdot 4^{\,n} \ne 0$, nên lập được tỉ số:
> $\color{blue} \dfrac{u_{n+1}}{u_n} = \dfrac{5 \cdot 4^{\,n+1}}{5 \cdot 4^{\,n}} = 4$.
> Tỉ số này là hằng số, không phụ thuộc $\color{blue} n$.
> Vậy $\color{blue} (u_n)$ là cấp số nhân với công bội $\color{blue} q = 4$ và số hạng đầu $\color{blue} u_1 = 5 \cdot 4 = 20$.

> 📝 **Luyện thêm dạng này ở phần Bài tập tự luyện.** Kho câu hỏi của dạng này hiện chỉ có
> câu tự luận, chưa có câu trắc nghiệm nào để đặt làm câu hỏi tương tác ở đây.

---

## 💡 DẠNG 5: TỔNG HỢP VÀ BÀI TOÁN THỰC TẾ

### 🛠 Phương pháp giải

#### Bước 1: Nhận ra dấu hiệu "nhân thêm cùng một tỉ lệ"
Lãi kép, tăng trưởng dân số, phân đôi vi khuẩn, khấu hao tài sản, phóng xạ — tất cả đều là cấp số nhân.

| Tình huống | Công bội |
|---|---|
| Tăng $\color{blue} r\%$ mỗi kì | $\color{blue} q = 1 + r$ |
| Giảm $\color{blue} r\%$ mỗi kì | $\color{blue} q = 1 - r$ |
| Còn lại $\color{blue} p\%$ giá trị mỗi kì | $\color{blue} q = p$ |
| Phân đôi mỗi kì | $\color{blue} q = 2$ |

#### Bước 2: Ghi rõ mốc đầu và độ dài một kì
Lãi suất "$\color{blue} 6\%$ một năm, kì hạn quý" thì mỗi kì chỉ $\color{blue} 1{,}5\%$ và một năm có $\color{blue} 4$ kì — đọc sót là sai cả bài.

#### Bước 3: Chọn công thức
Hỏi giá trị sau $\color{blue} n$ kì → dùng $\color{blue} u_n$. Hỏi **tổng góp** qua nhiều kì → dùng $\color{blue} S_n$.

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** chạy nhiều kì chỉ với một công thức.

Gửi $\color{blue} 100$ triệu, lãi $\color{blue} 0{,}5\%$ mỗi tháng, xem sau từng tháng:

| Bước | Bấm |
|---|---|
| 1 | `100` `=` |
| 2 | `Ans` `×` `1.005` `=` |
| 3 | Giữ `=`, mỗi lần là thêm một tháng |

Muốn biết **bao nhiêu kì thì đạt mốc** thì SOLVE trên $\color{blue} u_1 q^{\,x-1}$, hoặc lập TABLE rồi dò cột $\color{blue} f(x)$.

> ⚠️ Đếm nhầm số lần bấm `=` là sai cả bài mà máy không báo gì — luôn đối chiếu lại bằng công thức $\color{blue} u_n = u_1 q^{\,n-1}$.
> Câu hỏi "ít nhất bao nhiêu kì" mà SOLVE ra số lẻ thì làm tròn **lên**, không làm tròn theo thói quen.

---

> ### 📌 Ví dụ mẫu
>
> Một loại vi khuẩn cứ sau mỗi $\color{blue} 20$ phút lại phân đôi một lần. Ban đầu có $\color{blue} 1000$ con. Hỏi sau $\color{blue} 3$ giờ có bao nhiêu con?
>
> Hướng dẫn giải:
> Ba giờ bằng $\color{blue} 180$ phút, chia cho $\color{blue} 20$ phút được $\color{blue} 9$ lần phân đôi.
> Gọi $\color{blue} u_n$ là số vi khuẩn sau $\color{blue} n$ lần phân đôi, $\color{blue} u_0 = 1000$.
> Mỗi lần số vi khuẩn nhân đôi nên đây là cấp số nhân với $\color{blue} q = 2$:
> $\color{blue} u_n = 1000 \cdot 2^{\,n}$.
> Với $\color{blue} n = 9$: $\color{blue} u_9 = 1000 \cdot 2^9 = 1000 \cdot 512 = 512\,000$.
>
> Vậy sau $\color{blue} 3$ giờ có $\color{blue} 512\,000$ con vi khuẩn.
>
> **Kiểm bằng máy:** `1000` `=` rồi `Ans` `×` `2` `=` và bấm `=` đủ $\color{blue} 9$ lần — ra $\color{blue} 512000$.

<!--QUIZ|Toán tổng hợp|2|2,3-->
