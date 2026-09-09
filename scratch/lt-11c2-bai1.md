### BÀI 1. DÃY SỐ
# PHẦN 1: TÓM TẮT LÝ THUYẾT TRỌNG TÂM

## 📖 1. DÃY SỐ LÀ GÌ

**Dãy số vô hạn** là một hàm số $\color{blue} u$ xác định trên tập số nguyên dương $\color{blue} \mathbb{N}^*$. Ta viết $\color{blue} u_n$ thay cho $\color{blue} u(n)$ và kí hiệu dãy số là $\color{blue} (u_n)$:

$$\color{blue} u_1,\ u_2,\ u_3,\ \ldots,\ u_n,\ \ldots$$

* $\color{blue} u_1$ là **số hạng đầu**.
* $\color{blue} u_n$ là **số hạng tổng quát** — số hạng thứ $\color{blue} n$.

**Dãy số hữu hạn** là hàm số xác định trên $\color{blue} M=\{1;2;\ldots;m\}$, viết là $\color{blue} u_1, u_2, \ldots, u_m$; khi đó $\color{blue} u_m$ là **số hạng cuối**.

> 💡 **Hiểu cho đúng:** dãy số **không phải** một tập hợp. Tập hợp thì không kể thứ tự và không lặp; dãy số thì thứ tự là tất cả — $\color{blue} 1, 2, 3$ và $\color{blue} 3, 2, 1$ là hai dãy khác nhau, còn dãy $\color{blue} 1, 1, 1, \ldots$ vẫn là dãy số hợp lệ.

<!--QUIZ|Xác định các số hạng của dãy số|1|1-->

---

## 🛠 2. BA CÁCH CHO MỘT DÃY SỐ

| Cách cho | Dạng viết | Muốn tìm $\color{blue} u_{100}$ thì |
|---|---|---|
| **Công thức tổng quát** | $\color{blue} u_n = f(n)$ | thay thẳng $\color{blue} n=100$, **một bước là xong** |
| **Hệ thức truy hồi** | cho $\color{blue} u_1$ và $\color{blue} u_{n+1}=g(u_n)$ | phải tính lần lượt $\color{blue} u_2, u_3, \ldots$ — **99 bước** |
| **Mô tả / liệt kê** | nêu cách xác định, hoặc kể ra | tuỳ quy luật |

> ⚠️ **Chỗ hay nhầm:** thấy dãy cho bởi truy hồi mà vội thay $\color{blue} n = 100$ vào vế phải. Công thức truy hồi **không phải** công thức tổng quát — nó chỉ nói số hạng sau tính từ số hạng trước.

<!--QUIZ|Xác định các số hạng của dãy số|1|2-->

---

## 📈 3. DÃY SỐ TĂNG, DÃY SỐ GIẢM

Dãy $\color{blue} (u_n)$ gọi là:

* **tăng** nếu $\color{blue} u_{n+1} > u_n$ với mọi $\color{blue} n \in \mathbb{N}^*$;
* **giảm** nếu $\color{blue} u_{n+1} < u_n$ với mọi $\color{blue} n \in \mathbb{N}^*$.

> ⚠️ Phải đúng với **MỌI** $\color{blue} n$. Mười số hạng đầu cùng tăng vẫn chưa kết luận được gì — dãy có thể quay đầu ở số hạng thứ mười một.

Dãy không tăng cũng không giảm thì gọi là dãy **không đơn điệu**, ví dụ $\color{blue} u_n = (-1)^n$.

---

## 🚧 4. DÃY SỐ BỊ CHẶN

* **Bị chặn trên** nếu có số $\color{blue} M$ sao cho $\color{blue} u_n \le M$ với mọi $\color{blue} n$.
* **Bị chặn dưới** nếu có số $\color{blue} m$ sao cho $\color{blue} u_n \ge m$ với mọi $\color{blue} n$.
* **Bị chặn** nếu vừa bị chặn trên vừa bị chặn dưới, tức là có $\color{blue} m \le u_n \le M$.

> 💡 Số chặn **không duy nhất**. Nếu $\color{blue} M$ là một chặn trên thì mọi số lớn hơn $\color{blue} M$ cũng là chặn trên. Đề chỉ hỏi "có bị chặn không", không đòi số chặn tốt nhất — nên cứ chọn số nào dễ chứng minh nhất.

<!--QUIZ|Dãy số bị chặn|1|1-->

---

# PHẦN 2: PHÂN DẠNG BÀI TẬP & PHƯƠNG PHÁP GIẢI

## 💡 DẠNG 1: XÁC ĐỊNH SỐ HẠNG CỦA DÃY SỐ

### 🛠 Phương pháp giải

#### Bước 1: Nhận cách cho dãy
Nhìn xem đề cho **công thức tổng quát** $\color{blue} u_n=f(n)$ hay **hệ thức truy hồi**.

#### Bước 2: Tính
* Công thức tổng quát: thay thẳng giá trị $\color{blue} n$ cần tìm.
* Hệ thức truy hồi: tính **lần lượt** từ số hạng đầu, không nhảy cóc được.

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** liệt kê hàng loạt số hạng, khỏi bấm lại từng phép.

**Dãy cho bởi công thức tổng quát — dùng TABLE.** Ví dụ $\color{blue} u_n=\dfrac{2n+1}{n+2}$:

| Bước | Bấm |
|---|---|
| 1 | `MENU` `8` để vào Bảng số |
| 2 | Nhập $\color{blue} f(x)=\dfrac{2x+1}{x+2}$ rồi `=` |
| 3 | Start: `1` `=` · End: `10` `=` · Step: `1` `=` |
| 4 | Đọc cột $\color{blue} f(x)$ — chính là $\color{blue} u_1$ đến $\color{blue} u_{10}$ |

**Dãy cho bởi truy hồi — dùng `Ans`.** Ví dụ $\color{blue} u_1=3$, $\color{blue} u_{n+1}=2u_n+1$:

| Bước | Bấm |
|---|---|
| 1 | `3` `=` (đây là $\color{blue} u_1$) |
| 2 | `2` `×` `Ans` `+` `1` `=` → ra $\color{blue} u_2$ |
| 3 | Bấm `=` liên tiếp, mỗi lần ra một số hạng kế tiếp |

Truy hồi **hai bậc** như $\color{blue} u_{n+2}=u_{n+1}+u_n$ thì cần thêm `PreAns` (`SHIFT` `Ans`): bấm $\color{blue} u_1$ `=`, $\color{blue} u_2$ `=`, rồi `Ans` `+` `PreAns` `=` và giữ `=`.

> ⚠️ **TABLE không nhận công thức truy hồi** — đừng cố nhập $\color{blue} u_{n+1}$ vào đó. Và **`PreAns` bị xoá sạch khi đổi phương thức**: đang liệt kê dở mà nhảy sang TABLE xem một cái là mất, phải bấm lại từ đầu.
> Máy chỉ để kiểm tra lại và chọn nhanh trắc nghiệm — bài tự luận vẫn phải trình bày từng bước.

---

> ### 📌 Ví dụ mẫu
>
> Cho dãy số $\color{blue} (u_n)$ với $\color{blue} u_1 = 2$ và $\color{blue} u_{n+1} = 3u_n - 1$ với mọi $\color{blue} n \ge 1$. Tìm bốn số hạng đầu.
>
> Hướng dẫn giải:
> Dãy cho bởi hệ thức truy hồi nên phải tính lần lượt:
> $\color{blue} u_2 = 3u_1 - 1 = 3\cdot 2 - 1 = 5$
> $\color{blue} u_3 = 3u_2 - 1 = 3\cdot 5 - 1 = 14$
> $\color{blue} u_4 = 3u_3 - 1 = 3\cdot 14 - 1 = 41$
> Vậy bốn số hạng đầu là $\color{blue} 2,\ 5,\ 14,\ 41$.
>
> **Kiểm bằng máy:** `2` `=` rồi `3` `×` `Ans` `−` `1` `=` `=` `=` — màn hình lần lượt hiện $\color{blue} 5, 14, 41$.

<!--QUIZ|Xác định các số hạng của dãy số|2|1,2-->

---

## 💡 DẠNG 2: DỰ ĐOÁN CÔNG THỨC TỔNG QUÁT

### 🛠 Phương pháp giải

#### Bước 1: Tính vài số hạng đầu
Thường sáu đến tám số hạng là đủ thấy quy luật.

#### Bước 2: Viết mỗi số hạng theo $\color{blue} n$
Mẹo: đừng rút gọn vội. Giữ nguyên dạng tích, dạng luỹ thừa thì quy luật lộ ra ngay — $\color{blue} 2, 4, 8, 16$ nên viết thành $\color{blue} 2^1, 2^2, 2^3, 2^4$.

#### Bước 3: Đoán công thức rồi **chứng minh bằng quy nạp**
Đây là bước bắt buộc, không được bỏ.

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** liệt kê nhanh sáu đến tám số hạng đầu để nhìn ra quy luật.

Dùng đúng cách bấm `Ans` ở Dạng 1: nhập số hạng đầu, `=`, nhập công thức truy hồi theo `Ans`, rồi giữ `=`.

> ⚠️ **Máy chỉ giúp ĐOÁN, không chứng minh được.** Liệt kê tám số hạng khớp không có nghĩa là công thức đúng với mọi $\color{blue} n$. Bài tự luận mà chỉ viết "ta thấy quy luật…" rồi kết luận là **mất gần hết điểm** — phải chứng minh quy nạp.

---

> ### 📌 Ví dụ mẫu
>
> Cho dãy số $\color{blue} (u_n)$: $\color{blue} u_1 = 1$, $\color{blue} u_{n+1} = u_n + 2n$. Dự đoán công thức tổng quát rồi chứng minh.
>
> Hướng dẫn giải:
> Tính vài số hạng đầu:
> $\color{blue} u_1 = 1$, $\color{blue} u_2 = 1 + 2 = 3$, $\color{blue} u_3 = 3 + 4 = 7$, $\color{blue} u_4 = 7 + 6 = 13$, $\color{blue} u_5 = 13 + 8 = 21$.
> Viết lại: $\color{blue} 1 = 0 + 1$, $\color{blue} 3 = 2 + 1$, $\color{blue} 7 = 6 + 1$, $\color{blue} 13 = 12 + 1$, $\color{blue} 21 = 20 + 1$.
> Các số $\color{blue} 0, 2, 6, 12, 20$ chính là $\color{blue} 0\cdot1,\ 1\cdot2,\ 2\cdot3,\ 3\cdot4,\ 4\cdot5$, tức $\color{blue} (n-1)n$.
> **Dự đoán:** $\color{blue} u_n = n^2 - n + 1$.
>
> **Chứng minh quy nạp.** Với $\color{blue} n=1$: $\color{blue} u_1 = 1 - 1 + 1 = 1$, đúng.
> Giả sử đúng với $\color{blue} n=k$, tức $\color{blue} u_k = k^2 - k + 1$. Khi đó
> $\color{blue} u_{k+1} = u_k + 2k = k^2 - k + 1 + 2k = k^2 + k + 1 = (k+1)^2 - (k+1) + 1$.
> Vậy công thức đúng với mọi $\color{blue} n \in \mathbb{N}^*$.

<!--QUIZ|Dự đoán công thức tổng quát|2|1,2-->

---

## 💡 DẠNG 3: XÉT TÍNH TĂNG, GIẢM CỦA DÃY SỐ

### 🛠 Phương pháp giải

**Cách 1 — xét hiệu $\color{blue} u_{n+1} - u_n$** (dùng được cho mọi dãy):
* hiệu $\color{blue} > 0$ với mọi $\color{blue} n$ ⟹ dãy tăng;
* hiệu $\color{blue} < 0$ với mọi $\color{blue} n$ ⟹ dãy giảm.

**Cách 2 — xét tỉ số $\color{blue} \dfrac{u_{n+1}}{u_n}$** (chỉ dùng khi **mọi** $\color{blue} u_n > 0$):
* tỉ số $\color{blue} > 1$ ⟹ dãy tăng; tỉ số $\color{blue} < 1$ ⟹ dãy giảm.

> ⚠️ Cách 2 mà quên kiểm $\color{blue} u_n > 0$ là **kết luận ngược**: dãy âm thì chia cho số âm, bất đẳng thức đổi chiều.

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** nhìn nhanh dãy đang đi lên hay đi xuống, để biết mình cần chứng minh chiều nào.

| Bước | Bấm |
|---|---|
| 1 | `MENU` `8` |
| 2 | Nhập $\color{blue} f(x)$ là công thức tổng quát rồi `=` |
| 3 | Start `1`, End `20`, Step `1` |
| 4 | Nhìn cột $\color{blue} f(x)$: đi lên đều là dãy tăng, đi xuống đều là dãy giảm |

> ⚠️ Đây **chỉ là dự đoán**, tuyệt đối không phải lời giải. Hai mươi số hạng cùng tăng không chứng minh được điều gì cho số hạng thứ một nghìn. Nhìn xong vẫn phải xét hiệu $\color{blue} u_{n+1}-u_n$ như trên.
> Máy còn có ích ở chiều ngược lại: thấy cột $\color{blue} f(x)$ lúc lên lúc xuống thì biết ngay dãy **không đơn điệu**, khỏi mất công chứng minh nhầm hướng.

---

> ### 📌 Ví dụ mẫu
>
> Xét tính tăng, giảm của dãy số $\color{blue} u_n = \dfrac{n-1}{n+1}$.
>
> Hướng dẫn giải:
> Xét hiệu:
> $\color{blue} u_{n+1} - u_n = \dfrac{n}{n+2} - \dfrac{n-1}{n+1} = \dfrac{n(n+1) - (n-1)(n+2)}{(n+2)(n+1)} = \dfrac{n^2+n - (n^2+n-2)}{(n+2)(n+1)} = \dfrac{2}{(n+1)(n+2)}$.
> Với mọi $\color{blue} n \in \mathbb{N}^*$ thì $\color{blue} (n+1)(n+2) > 0$ nên hiệu luôn dương.
> Vậy dãy số đã cho là **dãy tăng**.

<!--QUIZ|Xét tính tăng giảm của dãy số|2|1,2-->

---

## 💡 DẠNG 4: XÉT TÍNH BỊ CHẶN CỦA DÃY SỐ

### 🛠 Phương pháp giải

#### Bước 1: Đoán số chặn
Tính vài số hạng để thấy dãy quanh quẩn ở khoảng nào.

#### Bước 2: Chứng minh bất đẳng thức với mọi $\color{blue} n$
Kĩ thuật hay dùng nhất là **tách phần nguyên**:
$$\color{blue} \frac{an+b}{cn+d} = \frac{a}{c} + \frac{\text{hằng số}}{cn+d}$$
Tách xong thì phần thay đổi chỉ còn một phân thức, chặn rất dễ.

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** đoán số chặn trước khi ngồi chứng minh.

Lập TABLE như Dạng 3 nhưng cho $\color{blue} n$ chạy xa: Start `1`, End `50`, Step `1`. Nhìn cột $\color{blue} f(x)$ xem nó tiến dần về số nào, và nó nằm giữa hai số nào.

> ⚠️ Máy chạy tới $\color{blue} n=50$ rồi dừng, còn đề hỏi **mọi** $\color{blue} n$. Con số nhìn được chỉ là **gợi ý cho bước 1**; bước 2 vẫn phải chứng minh bằng đại số.

---

> ### 📌 Ví dụ mẫu
>
> Chứng minh dãy số $\color{blue} u_n = \dfrac{2n+1}{n+1}$ bị chặn.
>
> Hướng dẫn giải:
> Tách phần nguyên: $\color{blue} u_n = \dfrac{2(n+1)-1}{n+1} = 2 - \dfrac{1}{n+1}$.
>
> **Chặn dưới:** với $\color{blue} n \ge 1$ thì $\color{blue} n+1 \ge 2$ nên $\color{blue} \dfrac{1}{n+1} \le \dfrac{1}{2}$, suy ra $\color{blue} u_n \ge 2 - \dfrac{1}{2} = \dfrac{3}{2}$.
>
> **Chặn trên:** vì $\color{blue} \dfrac{1}{n+1} > 0$ nên $\color{blue} u_n = 2 - \dfrac{1}{n+1} < 2$.
>
> Vậy $\color{blue} \dfrac{3}{2} \le u_n < 2$ với mọi $\color{blue} n$, tức dãy số **bị chặn**.

<!--QUIZ|Dãy số bị chặn|2|1,2-->

---

## 💡 DẠNG 5: BÀI TOÁN THỰC TẾ — LÃI KÉP VÀ TĂNG TRƯỞNG

### 🛠 Phương pháp giải

#### Bước 1: Gọi $\color{blue} u_n$ là đại lượng cần theo dõi sau $\color{blue} n$ kì
Ghi rõ **một kì là bao lâu** (tháng, quý, năm) và **$\color{blue} u_0$ hay $\color{blue} u_1$ là lúc nào** — đây là chỗ mất điểm nhiều nhất, không phải chỗ tính toán.

#### Bước 2: Lập hệ thức truy hồi từ tình huống
* Tăng $\color{blue} r\%$ mỗi kì: $\color{blue} u_{n+1} = u_n(1+r)$.
* Giảm $\color{blue} r\%$ mỗi kì: $\color{blue} u_{n+1} = u_n(1-r)$.
* Vừa sinh lãi vừa trả bớt $\color{blue} a$ mỗi kì: $\color{blue} u_{n+1} = u_n(1+r) - a$.

#### Bước 3: Trả lời đúng đơn vị và làm tròn theo yêu cầu đề

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** chạy hết $\color{blue} n$ kì mà chỉ bấm một công thức.

Ví dụ gửi $\color{blue} 100$ triệu, lãi $\color{blue} 0{,}6\%$ mỗi tháng, hỏi sau 12 tháng:

| Bước | Bấm |
|---|---|
| 1 | `100` `=` |
| 2 | `Ans` `×` `1.006` `=` |
| 3 | Bấm `=` thêm 11 lần nữa — mỗi lần là một tháng |

Vay trả góp thì đổi bước 2 thành `Ans` `×` `1.006` `−` `2` (trả 2 triệu mỗi tháng).

> ⚠️ Đếm nhầm số lần bấm `=` là sai cả bài, mà máy không báo gì. Cách chắc ăn: bấm xong đối chiếu với công thức $\color{blue} u_n = u_0(1+r)^n$ — hai kết quả phải trùng.

---

> ### 📌 Ví dụ mẫu
>
> Ông An gửi tiết kiệm $\color{blue} 100$ triệu đồng, lãi suất $\color{blue} 6\%$ một năm theo hình thức lãi kép, kì hạn một năm. Hỏi sau $\color{blue} 3$ năm ông An nhận được bao nhiêu tiền cả vốn lẫn lãi?
>
> Hướng dẫn giải:
> Gọi $\color{blue} u_n$ là số tiền (triệu đồng) sau $\color{blue} n$ năm, $\color{blue} u_0 = 100$.
> Mỗi năm số tiền được nhân thêm $\color{blue} 1 + 6\% = 1{,}06$, nên $\color{blue} u_{n+1} = 1{,}06\, u_n$.
> Đây là dãy nhân liên tiếp cùng một số, do đó $\color{blue} u_n = 100 \cdot (1{,}06)^n$.
> Với $\color{blue} n = 3$: $\color{blue} u_3 = 100 \cdot (1{,}06)^3 = 119{,}1016$ (triệu đồng).
> Vậy sau 3 năm ông An nhận được khoảng $\color{blue} 119{,}102$ triệu đồng.
>
> **Kiểm bằng máy:** `100` `=` rồi `Ans` `×` `1.06` `=` `=` `=` — ra đúng $\color{blue} 119{,}1016$.

> 📝 **Luyện thêm dạng này ở phần Bài tập tự luyện.** Kho câu hỏi của dạng này hiện gần như
> toàn câu tự luận, chưa có câu trắc nghiệm nào để đặt làm câu hỏi tương tác ở đây.

---

## 💡 DẠNG 6: TỔNG HỢP — DÃY SỐ CHO BỞI MỘT TỔNG

### 🛠 Phương pháp giải

Khi $\color{blue} u_n$ chính là một tổng $\color{blue} n$ số hạng, đừng cộng thẳng. Làm theo hai bước:

#### Bước 1: Tách mỗi số hạng thành hiệu hai phần liên tiếp
Ví dụ quen thuộc nhất:
$$\color{blue} \frac{1}{k(k+1)} = \frac{1}{k} - \frac{1}{k+1}, \qquad \frac{1}{(2k-1)(2k+1)} = \frac{1}{2}\left(\frac{1}{2k-1} - \frac{1}{2k+1}\right)$$

#### Bước 2: Cộng lại, các phần giữa triệt tiêu từng đôi
Chỉ còn phần đầu và phần cuối — gọi là **tổng sai phân** (tổng kính viễn vọng).

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** tính thẳng tổng để kiểm tra công thức mình vừa rút gọn.

$\color{blue} S = \displaystyle\sum_{k=1}^{20} \frac{1}{k(k+1)}$:

| Bước | Bấm |
|---|---|
| 1 | `SHIFT` `x` (chữ Σ in vàng phía trên phím) |
| 2 | Nhập $\color{blue} \dfrac{1}{X(X+1)}$ |
| 3 | `→` rồi nhập cận dưới `1` |
| 4 | `→` rồi nhập cận trên `20` |
| 5 | `=` |

Ra $\color{blue} \dfrac{20}{21}$ — đúng bằng công thức rút gọn $\color{blue} 1 - \dfrac{1}{n+1}$ với $\color{blue} n = 20$.

> ⚠️ Cận của Σ **phải là số nguyên**, bước nhảy luôn bằng 1, và **không lồng được** Σ trong Σ. Cận trên lớn quá thì máy chạy rất lâu — bấm `AC` để dừng.
> Σ chỉ tính được tổng **một con số cụ thể**. Đề hỏi tổng theo $\color{blue} n$ tổng quát thì máy chịu, phải rút gọn bằng tay; lúc đó dùng Σ với vài giá trị $\color{blue} n$ để **thử lại công thức** vừa tìm.

---

> ### 📌 Ví dụ mẫu
>
> Cho dãy số $\color{blue} u_n = \dfrac{1}{1\cdot 2} + \dfrac{1}{2\cdot 3} + \cdots + \dfrac{1}{n(n+1)}$. Rút gọn $\color{blue} u_n$ và xét tính bị chặn.
>
> Hướng dẫn giải:
> Tách: $\color{blue} \dfrac{1}{k(k+1)} = \dfrac{1}{k} - \dfrac{1}{k+1}$.
> Cộng từ $\color{blue} k=1$ đến $\color{blue} k=n$:
> $\color{blue} u_n = \left(\dfrac{1}{1}-\dfrac{1}{2}\right) + \left(\dfrac{1}{2}-\dfrac{1}{3}\right) + \cdots + \left(\dfrac{1}{n}-\dfrac{1}{n+1}\right)$.
> Các phần giữa triệt tiêu từng đôi, còn lại
> $\color{blue} u_n = 1 - \dfrac{1}{n+1} = \dfrac{n}{n+1}$.
> Vì $\color{blue} \dfrac{1}{n+1} > 0$ nên $\color{blue} u_n < 1$; lại có $\color{blue} u_n \ge u_1 = \dfrac{1}{2} > 0$.
> Vậy $\color{blue} \dfrac{1}{2} \le u_n < 1$, dãy số **bị chặn**.

<!--QUIZ|Toán tổng hợp|2|2,3-->
