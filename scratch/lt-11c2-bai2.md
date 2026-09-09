### BÀI 2. CẤP SỐ CỘNG
# PHẦN 1: TÓM TẮT LÝ THUYẾT TRỌNG TÂM

## 📖 1. ĐỊNH NGHĨA

Dãy số $\color{blue} (u_n)$ là **cấp số cộng** nếu từ số hạng thứ hai trở đi, mỗi số hạng đều bằng số hạng đứng trước cộng với một số không đổi $\color{blue} d$:

$$\color{blue} u_{n+1} = u_n + d \quad \text{với mọi } n \in \mathbb{N}^*$$

Số $\color{blue} d$ gọi là **công sai**, tính bằng $\color{blue} d = u_{n+1} - u_n$.

> 💡 **Cách nhận ra nhanh:** lấy hiệu hai số hạng liên tiếp ở vài chỗ khác nhau. Hiệu luôn ra cùng một số thì là cấp số cộng.

<!--QUIZ|Xác định số hạng, công sai|1|1-->

---

## 🛠 2. BA CÔNG THỨC PHẢI THUỘC

| Công thức | Viết | Dùng khi |
|---|---|---|
| **Số hạng tổng quát** | $\color{blue} u_n = u_1 + (n-1)d$ | biết $\color{blue} u_1, d$ — tìm số hạng bất kì |
| **Tính chất ba số liên tiếp** | $\color{blue} u_k = \dfrac{u_{k-1} + u_{k+1}}{2}$ | đề cho ba số liên tiếp |
| **Tổng $\color{blue} n$ số hạng đầu** | $\color{blue} S_n = \dfrac{n(u_1 + u_n)}{2} = \dfrac{n\left[2u_1 + (n-1)d\right]}{2}$ | tính tổng |

> ⚠️ **Chỗ sai kinh điển:** viết $\color{blue} u_n = u_1 + nd$. Là $\color{blue} (n-1)d$, không phải $\color{blue} nd$ — vì từ $\color{blue} u_1$ đến $\color{blue} u_n$ chỉ cộng thêm $\color{blue} d$ đúng $\color{blue} n-1$ lần. Kiểm nhanh: thay $\color{blue} n=1$ phải ra $\color{blue} u_1$.

<!--QUIZ|Tính tổng các số hạng|1|1-->

---

## 📌 3. HAI DẠNG CỦA CÔNG THỨC TỔNG

Hai cách viết $\color{blue} S_n$ ở trên là **một**, chỉ khác chỗ dùng:

* Biết $\color{blue} u_1$ và $\color{blue} u_n$ → dùng $\color{blue} S_n = \dfrac{n(u_1+u_n)}{2}$ (nhanh hơn).
* Biết $\color{blue} u_1$ và $\color{blue} d$ → dùng $\color{blue} S_n = \dfrac{n[2u_1+(n-1)d]}{2}$.

> 💡 **Tính chất rất hay dùng:** trong cấp số cộng, hai số hạng cách đều hai đầu có tổng bằng nhau:
> $$\color{blue} u_1 + u_n = u_2 + u_{n-1} = \cdots = u_k + u_{n-k+1}$$
> Đề cho $\color{blue} u_3 + u_{28} = 100$ và hỏi $\color{blue} S_{30}$ thì dùng ngay tính chất này: $\color{blue} u_1 + u_{30} = u_3 + u_{28} = 100$, suy ra $\color{blue} S_{30} = \dfrac{30 \cdot 100}{2} = 1500$ — khỏi cần tìm $\color{blue} u_1$ và $\color{blue} d$.

---

# PHẦN 2: PHÂN DẠNG BÀI TẬP & PHƯƠNG PHÁP GIẢI

## 💡 DẠNG 1: XÁC ĐỊNH SỐ HẠNG VÀ CÔNG SAI

### 🛠 Phương pháp giải

#### Bước 1: Quy mọi thứ về hai ẩn $\color{blue} u_1$ và $\color{blue} d$
Mỗi dữ kiện của đề viết thành một phương trình theo $\color{blue} u_1, d$ nhờ $\color{blue} u_n = u_1 + (n-1)d$.

#### Bước 2: Giải hệ hai phương trình hai ẩn

#### Bước 3: Trả lời đúng thứ đề hỏi
Đề hỏi $\color{blue} u_{10}$ thì phải thay ngược lại, đừng dừng ở $\color{blue} u_1, d$.

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** giải hệ hai ẩn, và tìm $\color{blue} n$ khi biết một số hạng.

**Giải hệ hai ẩn** $\color{blue} \begin{cases} u_1 + 4d = 11 \\ u_1 + 9d = 26 \end{cases}$:

| Bước | Bấm |
|---|---|
| 1 | `MENU` `9` (Phương trình / Hàm số) |
| 2 | Chọn hệ phương trình bậc nhất **2 ẩn** |
| 3 | Nhập lần lượt các hệ số `1` `4` `11` rồi `1` `9` `26` |
| 4 | `=` để đọc nghiệm $\color{blue} u_1$ và $\color{blue} d$ |

**Tìm $\color{blue} n$ biết $\color{blue} u_n$** — ví dụ $\color{blue} u_1=5$, $\color{blue} d=3$, hỏi số hạng thứ mấy bằng $\color{blue} 92$:

| Bước | Bấm |
|---|---|
| 1 | Nhập `5` `+` `(` `X` `−` `1` `)` `×` `3` |
| 2 | `ALPHA` `CALC` để ra dấu `=` trong biểu thức |
| 3 | Nhập `92` |
| 4 | `SHIFT` `CALC` (SOLVE), nhập giá trị khởi đầu ví dụ `10`, rồi `=` |

Ra $\color{blue} X = 30$, tức $\color{blue} u_{30} = 92$.

> ⚠️ SOLVE cho **nghiệm gần đúng** bằng phương pháp Newton, và kết quả phụ thuộc giá trị khởi đầu. Máy ra `29.99999998` thì hiểu là $\color{blue} 30$; ra `30.4` thì kết luận **không có** số hạng nào bằng $\color{blue} 92$ — vì $\color{blue} n$ bắt buộc là số nguyên dương.
> Máy chỉ để kiểm tra lại và chọn nhanh trắc nghiệm — bài tự luận vẫn phải trình bày hệ phương trình.

---

> ### 📌 Ví dụ mẫu
>
> Cho cấp số cộng $\color{blue} (u_n)$ có $\color{blue} u_5 = 11$ và $\color{blue} u_{10} = 26$. Tìm $\color{blue} u_1$, $\color{blue} d$ và $\color{blue} u_{20}$.
>
> Hướng dẫn giải:
> Viết hai dữ kiện theo $\color{blue} u_1$ và $\color{blue} d$:
> $\color{blue} u_5 = u_1 + 4d = 11$
> $\color{blue} u_{10} = u_1 + 9d = 26$
> Trừ vế theo vế: $\color{blue} 5d = 15 \Rightarrow d = 3$.
> Thay lại: $\color{blue} u_1 = 11 - 4\cdot 3 = -1$.
> Khi đó $\color{blue} u_{20} = u_1 + 19d = -1 + 19 \cdot 3 = 56$.
>
> Vậy $\color{blue} u_1 = -1$, $\color{blue} d = 3$, $\color{blue} u_{20} = 56$.

<!--QUIZ|Xác định số hạng, công sai|2|1,2-->

---

## 💡 DẠNG 2: TÌM CÔNG THỨC CỦA CẤP SỐ CỘNG

### 🛠 Phương pháp giải

#### Bước 1: Tìm $\color{blue} u_1$ và $\color{blue} d$ như Dạng 1

#### Bước 2: Viết $\color{blue} u_n = u_1 + (n-1)d$ rồi **rút gọn về dạng $\color{blue} an + b$**
Cấp số cộng luôn có số hạng tổng quát là một **đa thức bậc nhất theo $\color{blue} n$**. Ngược lại cũng đúng: thấy $\color{blue} u_n = an+b$ là biết ngay đó là cấp số cộng với công sai $\color{blue} d = a$.

> 💡 Nhận ra điều này là được nửa bài: đề cho $\color{blue} u_n = 3n - 7$, hỏi công sai — trả lời ngay $\color{blue} d = 3$, không cần tính hiệu.

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** kiểm lại công thức vừa rút gọn có đúng không.

Sau khi có $\color{blue} u_n = an+b$, vào `MENU` `8` (TABLE), nhập $\color{blue} f(x) = ax+b$, cho Start `1`, End `6`, Step `1`. Đối chiếu sáu số hạng máy hiện với các số hạng đề cho — trùng hết là công thức đúng.

> ⚠️ Trùng sáu số hạng đầu chỉ là **kiểm tra**, không phải chứng minh. Nhưng nếu lệch dù chỉ một số thì chắc chắn mình rút gọn sai — đây là cách bắt lỗi nhanh nhất.

---

> ### 📌 Ví dụ mẫu
>
> Cho cấp số cộng $\color{blue} (u_n)$ có $\color{blue} u_1 = 4$ và $\color{blue} d = -2$. Viết công thức số hạng tổng quát và cho biết $\color{blue} -30$ là số hạng thứ mấy.
>
> Hướng dẫn giải:
> $\color{blue} u_n = u_1 + (n-1)d = 4 + (n-1)(-2) = 4 - 2n + 2 = -2n + 6$.
> Cho $\color{blue} u_n = -30$: $\color{blue} -2n + 6 = -30 \Rightarrow 2n = 36 \Rightarrow n = 18$.
> Vì $\color{blue} n = 18$ là số nguyên dương nên $\color{blue} -30$ là số hạng thứ $\color{blue} 18$.
>
> **Kiểm bằng máy:** TABLE với $\color{blue} f(x) = -2x + 6$ cho $\color{blue} 4, 2, 0, -2, \ldots$ — đúng dãy đề cho.

<!--QUIZ|Tìm công thức cấp số cộng|2|1,2-->

---

## 💡 DẠNG 3: TÍNH TỔNG CÁC SỐ HẠNG

### 🛠 Phương pháp giải

#### Bước 1: Xác định rõ đang cộng **bao nhiêu** số hạng
Đây là chỗ mất điểm nhiều nhất. Tổng từ $\color{blue} u_5$ đến $\color{blue} u_{20}$ có $\color{blue} 20 - 5 + 1 = 16$ số hạng, **không phải 15**.

#### Bước 2: Chọn công thức
* Biết hai đầu → $\color{blue} S = \dfrac{(\text{số số hạng})(\text{đầu} + \text{cuối})}{2}$.
* Biết $\color{blue} u_1, d$ → $\color{blue} S_n = \dfrac{n[2u_1+(n-1)d]}{2}$.

#### Bước 3: Tổng một khúc giữa thì lấy hiệu hai tổng
$$\color{blue} u_5 + u_6 + \cdots + u_{20} = S_{20} - S_4$$

> ⚠️ Là $\color{blue} S_{20} - S_4$, không phải $\color{blue} S_{20} - S_5$ — vì $\color{blue} S_5$ đã nuốt mất $\color{blue} u_5$ mà ta cần giữ.

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** cộng thẳng để đối chiếu với kết quả tính bằng công thức.

Tính $\color{blue} S = \displaystyle\sum_{k=1}^{20}(3k-1)$:

| Bước | Bấm |
|---|---|
| 1 | `SHIFT` `x` (chữ Σ in vàng phía trên phím) |
| 2 | Nhập `3` `X` `−` `1` |
| 3 | `→` rồi cận dưới `1` |
| 4 | `→` rồi cận trên `20` |
| 5 | `=` |

Tổng một khúc giữa thì đổi cận: muốn $\color{blue} u_5 + \cdots + u_{20}$ thì cho cận dưới `5`, cận trên `20` — khỏi phải lấy hiệu hai tổng.

> ⚠️ **Đề hỏi ngược — "tìm $\color{blue} n$ biết $\color{blue} S_n = 2024$" — thì KHÔNG dùng được Σ:** SOLVE từ chối mọi biểu thức có chứa `Σ(`. Phải thay $\color{blue} S_n$ bằng công thức thu gọn $\color{blue} \dfrac{n[2u_1+(n-1)d]}{2}$ rồi mới SOLVE.
> Cận của Σ phải là số nguyên, bước nhảy luôn bằng 1.

---

> ### 📌 Ví dụ mẫu
>
> Cho cấp số cộng $\color{blue} (u_n)$ có $\color{blue} u_1 = 2$, $\color{blue} d = 3$. Tính tổng $\color{blue} 20$ số hạng đầu, rồi tính $\color{blue} u_{11} + u_{12} + \cdots + u_{20}$.
>
> Hướng dẫn giải:
> $\color{blue} S_{20} = \dfrac{20\left[2\cdot 2 + 19 \cdot 3\right]}{2} = \dfrac{20 \cdot 61}{2} = 610$.
> $\color{blue} S_{10} = \dfrac{10\left[2\cdot 2 + 9 \cdot 3\right]}{2} = \dfrac{10 \cdot 31}{2} = 155$.
> Tổng cần tìm gồm các số hạng từ thứ $\color{blue} 11$ đến thứ $\color{blue} 20$, nên bằng
> $\color{blue} S_{20} - S_{10} = 610 - 155 = 455$.
>
> **Kiểm bằng máy:** $\color{blue} u_n = 2 + (n-1)3 = 3n - 1$; bấm Σ với $\color{blue} 3X-1$, cận từ `11` đến `20` — ra đúng $\color{blue} 455$.

<!--QUIZ|Tính tổng các số hạng|2|2,3-->

---

## 💡 DẠNG 4: CHỨNG MINH MỘT DÃY LÀ CẤP SỐ CỘNG

### 🛠 Phương pháp giải

#### Bước 1: Lập hiệu $\color{blue} u_{n+1} - u_n$ theo $\color{blue} n$

#### Bước 2: Rút gọn hiệu đó
Nếu ra một **hằng số** (không còn chữ $\color{blue} n$) thì kết luận dãy là cấp số cộng với công sai bằng chính hằng số ấy.

#### Bước 3: Kết luận đủ ý
Phải nói rõ "với mọi $\color{blue} n \in \mathbb{N}^*$" và chỉ ra công sai $\color{blue} d$.

> 💡 Đề thường không cho $\color{blue} u_n$ trực tiếp mà cho một dãy phụ, kiểu "đặt $\color{blue} v_n = u_n - 3$, chứng minh $\color{blue} (v_n)$ là cấp số cộng". Cách làm không đổi: vẫn lập hiệu $\color{blue} v_{n+1} - v_n$.

> 🚫 **Dạng này không bấm máy được.** Máy tính vài số hạng rồi thấy hiệu bằng nhau — điều đó **không phải chứng minh**. Thay lời giải bằng vài số hạng đầu là lỗi bị trừ điểm nặng nhất ở phần tự luận. Muốn chắc thì tính thử vài số hạng để **định hướng**, nhưng bài làm phải là phép biến đổi đại số.

---

> ### 📌 Ví dụ mẫu
>
> Cho dãy số $\color{blue} (u_n)$ với $\color{blue} u_n = 5 - 4n$. Chứng minh $\color{blue} (u_n)$ là cấp số cộng và tìm công sai.
>
> Hướng dẫn giải:
> Với mọi $\color{blue} n \in \mathbb{N}^*$, xét hiệu:
> $\color{blue} u_{n+1} - u_n = \left[5 - 4(n+1)\right] - \left[5 - 4n\right] = 5 - 4n - 4 - 5 + 4n = -4$.
> Hiệu này là một hằng số, không phụ thuộc $\color{blue} n$.
> Vậy $\color{blue} (u_n)$ là cấp số cộng với công sai $\color{blue} d = -4$.

<!--QUIZ|Chứng minh|2|2,3-->

---

## 💡 DẠNG 5: TỔNG HỢP VÀ BÀI TOÁN THỰC TẾ

### 🛠 Phương pháp giải

#### Bước 1: Dịch tình huống sang ngôn ngữ cấp số cộng
Dấu hiệu nhận ra: đại lượng **tăng (hoặc giảm) thêm cùng một lượng** sau mỗi bước — mỗi tháng tiết kiệm thêm cùng một số tiền, mỗi hàng ghế nhiều hơn hàng trước cùng một số ghế, mỗi năm lương tăng thêm cùng một mức.

> ⚠️ Phân biệt với cấp số nhân: **cộng thêm** cùng một lượng là cấp số cộng; **nhân thêm** cùng một tỉ lệ (tăng $\color{blue} r\%$) là cấp số nhân.

#### Bước 2: Xác định $\color{blue} u_1$, $\color{blue} d$ và **số thứ tự cần tìm**
Cẩn thận mốc đầu: "năm đầu tiên" thường là $\color{blue} u_1$, nhưng "sau 1 năm" có thể là $\color{blue} u_2$.

#### Bước 3: Áp công thức, trả lời kèm đơn vị

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** dò nhanh xem cần bao nhiêu bước thì đạt mục tiêu.

Bài kiểu "tiết kiệm được bao nhiêu tháng thì đủ $\color{blue} S$ triệu" là bài **tìm $\color{blue} n$ từ $\color{blue} S_n$**: viết $\color{blue} S_n$ theo công thức thu gọn rồi SOLVE như Dạng 1.

Hoặc dùng TABLE cho $\color{blue} f(x) = \dfrac{x\left[2u_1+(x-1)d\right]}{2}$, Start `1`, End `30`, rồi dò cột $\color{blue} f(x)$ xem vượt mốc ở hàng nào — cách này còn thấy được cả hàng liền trước, tiện khi đề hỏi "ít nhất bao nhiêu tháng".

> ⚠️ Đừng để Σ trong biểu thức đưa vào SOLVE — máy từ chối. Và $\color{blue} n$ ra lẻ thì phải làm tròn **lên** với câu hỏi "ít nhất bao nhiêu", chứ không làm tròn theo thói quen.

---

> ### 📌 Ví dụ mẫu
>
> Một hội trường có $\color{blue} 20$ hàng ghế. Hàng đầu có $\color{blue} 15$ ghế, mỗi hàng sau nhiều hơn hàng liền trước $\color{blue} 2$ ghế. Hỏi hội trường có bao nhiêu ghế?
>
> Hướng dẫn giải:
> Gọi $\color{blue} u_n$ là số ghế ở hàng thứ $\color{blue} n$. Mỗi hàng hơn hàng trước đúng $\color{blue} 2$ ghế nên $\color{blue} (u_n)$ là cấp số cộng với $\color{blue} u_1 = 15$, $\color{blue} d = 2$.
> Tổng số ghế là tổng $\color{blue} 20$ số hạng đầu:
> $\color{blue} S_{20} = \dfrac{20\left[2 \cdot 15 + 19 \cdot 2\right]}{2} = \dfrac{20 \cdot 68}{2} = 680$.
> Vậy hội trường có $\color{blue} 680$ ghế.

<!--QUIZ|Toán tổng hợp|2|2,3-->
