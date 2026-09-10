### BÀI 2. PHƯƠNG SAI VÀ ĐỘ LỆCH CHUẨN
# PHẦN 1: TÓM TẮT LÝ THUYẾT TRỌNG TÂM

## 📖 1. Ý TƯỞNG: ĐO ĐỘ PHÂN TÁN BẰNG KHOẢNG CÁCH TỚI SỐ TRUNG BÌNH

Khoảng biến thiên chỉ nhìn hai đầu, khoảng tứ phân vị chỉ nhìn nửa giữa. **Phương sai** nhìn **mọi số liệu**: nó đo xem trung bình mỗi số liệu lệch khỏi $\color{blue} \overline{x}$ bao xa.

Vì lệch trái và lệch phải triệt tiêu nhau, ta **bình phương** độ lệch trước khi lấy trung bình.

---

## 📖 2. SỐ TRUNG BÌNH CỦA MẪU GHÉP NHÓM

$$\color{blue} \overline{x} = \frac{n_1 c_1 + n_2 c_2 + \cdots + n_k c_k}{n}$$

với $\color{blue} c_i = \dfrac{u_i + u_{i+1}}{2}$ là giá trị đại diện của nhóm thứ $\color{blue} i$, và $\color{blue} n = n_1 + \cdots + n_k$.

<!--QUIZ|Tính phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm|1|1-->

---

## 📖 3. PHƯƠNG SAI VÀ ĐỘ LỆCH CHUẨN

**Phương sai** của mẫu ghép nhóm:

$$\color{blue} S^2 = \frac{n_1\left(c_1 - \overline{x}\right)^2 + n_2\left(c_2 - \overline{x}\right)^2 + \cdots + n_k\left(c_k - \overline{x}\right)^2}{n}$$

**Công thức tính nhanh** (dùng khi bấm máy, đỡ phải trừ từng số):

$$\color{blue} S^2 = \frac{n_1 c_1^2 + n_2 c_2^2 + \cdots + n_k c_k^2}{n} - \overline{x}^{\,2}$$

**Độ lệch chuẩn:** $\color{blue} S = \sqrt{S^2}$.

> ⚠️ **Chia cho $\color{blue} n$, không phải $\color{blue} n-1$.** Sách giáo khoa lớp 12 dùng mẫu số $\color{blue} n$. Máy tính bày ra **cả hai** — $\color{blue} \sigma^2 x$ (chia $\color{blue} n$) và $\color{blue} s^2 x$ (chia $\color{blue} n-1$) — nằm sát nhau. Lấy nhầm là sai, mà máy không hề báo. Xem kĩ ở mục bấm máy của Dạng 1.

**Ý nghĩa:** $\color{blue} S$ cùng đơn vị với số liệu nên đọc được trực tiếp. $\color{blue} S$ càng nhỏ thì số liệu càng chụm quanh $\color{blue} \overline{x}$, tức mẫu càng đồng đều.

<!--QUIZ|Tính phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm|1|2-->

---

# PHẦN 2: PHÂN DẠNG BÀI TẬP & PHƯƠNG PHÁP GIẢI

## 💡 DẠNG 1: TÍNH PHƯƠNG SAI VÀ ĐỘ LỆCH CHUẨN CỦA MẪU GHÉP NHÓM

### 🛠 Phương pháp giải

#### Bước 1: Lập giá trị đại diện $\color{blue} c_i$ cho từng nhóm
Trung điểm của nhóm: $\color{blue} c_i = \dfrac{u_i + u_{i+1}}{2}$.

#### Bước 2: Tính cỡ mẫu $\color{blue} n$ và số trung bình $\color{blue} \overline{x}$

#### Bước 3: Tính phương sai
Dùng công thức nhanh $\color{blue} S^2 = \dfrac{\sum n_i c_i^2}{n} - \overline{x}^{\,2}$ cho gọn.

#### Bước 4: Lấy căn để ra độ lệch chuẩn, trả lời kèm đơn vị

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** làm **trọn** Bước 2 và 3 — chỉ cần nhập giá trị đại diện và tần số.

**Bước 1 — vào phương thức Thống kê.** Bấm `MENU` `6`, màn hình hiện:

![Chọn kiểu tính thống kê](https://cmjithgtecypxmisbzvw.supabase.co/storage/v1/object/public/lesson_images/editor_images/casio-c3-01-chon-thong-ke.png)

Chọn `1` — *Tính tkê 1-biến*.

**Bước 2 — BẬT CỘT TẦN SỐ.** Máy để mặc định **tắt**, nên bảng nhập chỉ có mỗi cột `x`; không bật thì không nhập tần số vào đâu được. Bấm `SHIFT` `MENU` (SETUP) → `▼` → `3` (Thống kê):

![Hỏi BẬT tần số](https://cmjithgtecypxmisbzvw.supabase.co/storage/v1/object/public/lesson_images/editor_images/casio-c3-02-bat-tan-so.png)

Chọn `1` — *Mở*. Bảng nhập nay có **hai cột** `x` và `n`:

![Bảng nhập có hai cột](https://cmjithgtecypxmisbzvw.supabase.co/storage/v1/object/public/lesson_images/editor_images/casio-c3-03-hai-cot.png)

**Bước 3 — nhập số liệu.** Cột `x` nhập **giá trị đại diện**, cột `n` nhập **tần số**. Mỗi số một lần `=`; nhập hết cột `x` rồi bấm `▶` và `▲` để sang đầu cột `n`.

![Số liệu đã nhập xong](https://cmjithgtecypxmisbzvw.supabase.co/storage/v1/object/public/lesson_images/editor_images/casio-c3-04-da-nhap.png)

**Bước 4 — đọc kết quả.** Bấm `OPTN` rồi `3` (*Tính 1-biến*):

![Kết quả thống kê](https://cmjithgtecypxmisbzvw.supabase.co/storage/v1/object/public/lesson_images/editor_images/casio-c3-05-ket-qua.png)

| Máy hiện | Là gì | Dùng không |
|---|---|---|
| $\color{blue} \overline{x}$ | số trung bình | **có** |
| $\color{blue} \sigma^2 x$ | phương sai chia cho $\color{blue} n$ | **CHÍNH LÀ $\color{blue} S^2$ của sách** |
| $\color{blue} \sigma x$ | độ lệch chuẩn chia cho $\color{blue} n$ | **CHÍNH LÀ $\color{blue} S$ của sách** |
| $\color{blue} s^2 x$, $\color{blue} sx$ | chia cho $\color{blue} n-1$ | **KHÔNG** — đây là bẫy |

> ⚠️ Trong ảnh trên, $\color{blue} \sigma^2 x = 5{,}96$ còn $\color{blue} s^2 x = 6{,}1128\ldots$ — hai số nằm sát nhau, chỉ khác một chữ cái đầu dòng. **Lấy dòng có $\color{blue} \sigma$, đừng lấy dòng có $\color{blue} s$.**
>
> Cuộn `▼` thêm sẽ thấy `n`, `min(x)`, `max(x)`, và cả `Q₁`, `Med`, `Q₃` — nhưng **ba số tứ phân vị ấy KHÔNG dùng được cho mẫu ghép nhóm**, xem lời cảnh báo ở Bài 1 Dạng 2.
>
> Máy chỉ để kiểm tra lại và chọn nhanh trắc nghiệm; bài tự luận vẫn phải trình bày bảng $\color{blue} c_i$, $\color{blue} n_i$ và các bước tính.

---

> ### 📌 Ví dụ mẫu
>
> Thời gian (phút) chạy $\color{blue} 1000$m của $\color{blue} 40$ học sinh:
>
> | Thời gian | $\color{blue} [8;10)$ | $\color{blue} [10;12)$ | $\color{blue} [12;14)$ | $\color{blue} [14;16)$ | $\color{blue} [16;18)$ |
> |---|---|---|---|---|---|
> | Số học sinh | $\color{blue} 5$ | $\color{blue} 12$ | $\color{blue} 10$ | $\color{blue} 8$ | $\color{blue} 5$ |
>
> Tính phương sai và độ lệch chuẩn.
>
> Hướng dẫn giải:
> **Bước 1.** Giá trị đại diện: $\color{blue} 9;\ 11;\ 13;\ 15;\ 17$.
>
> **Bước 2.** $\color{blue} n = 40$ và
> $\color{blue} \overline{x} = \dfrac{5 \cdot 9 + 12 \cdot 11 + 10 \cdot 13 + 8 \cdot 15 + 5 \cdot 17}{40} = \dfrac{512}{40} = 12{,}8$ (phút).
>
> **Bước 3.** $\color{blue} \sum n_i c_i^2 = 5\cdot81 + 12\cdot121 + 10\cdot169 + 8\cdot225 + 5\cdot289 = 6792$.
> $\color{blue} S^2 = \dfrac{6792}{40} - 12{,}8^2 = 169{,}8 - 163{,}84 = 5{,}96$.
>
> **Bước 4.** $\color{blue} S = \sqrt{5{,}96} \approx 2{,}44$ (phút).
>
> **Kiểm bằng máy:** nhập đúng năm cặp $\color{blue} (9;5), (11;12), (13;10), (15;8), (17;5)$ rồi `OPTN` `3` — máy hiện $\color{blue} \overline{x} = 12{,}8$, $\color{blue} \sigma^2 x = 5{,}96$, $\color{blue} \sigma x = 2{,}441311123$. Khớp từng số.

<!--QUIZ|Tính phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm|2|1,2-->

---

## 💡 DẠNG 2: PHƯƠNG SAI VÀ ĐỘ LỆCH CHUẨN CỦA MẪU KHÔNG GHÉP NHÓM

### 🛠 Phương pháp giải

Khi đề cho **danh sách số liệu gốc**:

#### Bước 1: Tính số trung bình $\color{blue} \overline{x} = \dfrac{x_1 + x_2 + \cdots + x_n}{n}$

#### Bước 2: Tính phương sai
$$\color{blue} S^2 = \frac{\left(x_1 - \overline{x}\right)^2 + \cdots + \left(x_n - \overline{x}\right)^2}{n} = \frac{x_1^2 + \cdots + x_n^2}{n} - \overline{x}^{\,2}$$

#### Bước 3: $\color{blue} S = \sqrt{S^2}$

### 🖩 Bấm máy Casio fx-580VN X

Y hệt Dạng 1, chỉ khác ở chỗ **không cần bật cột tần số** nếu các số liệu đều khác nhau: `MENU` `6` `1` → nhập từng số, mỗi số một `=` → `OPTN` `3` → đọc $\color{blue} \sigma x$.

> ⚠️ Số liệu nào lặp lại nhiều lần thì vẫn nên bật cột tần số cho nhanh — nhập $\color{blue} (7; 5)$ gọn hơn gõ số $\color{blue} 7$ năm lần, và ít gõ nhầm hơn.
> Vẫn nhớ: lấy $\color{blue} \sigma x$, không lấy $\color{blue} sx$.

---

> ### 📌 Ví dụ mẫu
>
> Số con của $\color{blue} 5$ hộ gia đình: $\color{blue} 1;\ 2;\ 2;\ 3;\ 2$. Tính phương sai và độ lệch chuẩn.
>
> Hướng dẫn giải:
> $\color{blue} \overline{x} = \dfrac{1 + 2 + 2 + 3 + 2}{5} = \dfrac{10}{5} = 2$.
> $\color{blue} \sum x_i^2 = 1 + 4 + 4 + 9 + 4 = 22$.
> $\color{blue} S^2 = \dfrac{22}{5} - 2^2 = 4{,}4 - 4 = 0{,}4$.
> $\color{blue} S = \sqrt{0{,}4} \approx 0{,}63$ (con).

<!--QUIZ|Tính các số đặc trưng mức độ phân tán (mẫu không ghép nhóm)|1|3-->

---

## 💡 DẠNG 3: TOÁN TỔNG HỢP — SO SÁNH ĐỘ ĐỒNG ĐỀU CỦA HAI MẪU

### 🛠 Phương pháp giải

#### Bước 1: Tính $\color{blue} \overline{x}$ và $\color{blue} S$ cho **từng mẫu**

#### Bước 2: So sánh
* $\color{blue} \overline{x}$ cho biết mẫu nào **cao hơn** về mức trung bình.
* $\color{blue} S$ cho biết mẫu nào **đồng đều hơn** — $\color{blue} S$ nhỏ hơn là đồng đều hơn.

#### Bước 3: Hai mẫu lệch nhau nhiều về $\color{blue} \overline{x}$ thì đừng so $\color{blue} S$ trực tiếp
Lúc ấy so **hệ số biến thiên** $\color{blue} \dfrac{S}{\overline{x}}$ mới công bằng — cùng một độ lệch $\color{blue} 2$ kg thì với người $\color{blue} 50$ kg là nhiều, với voi $\color{blue} 3000$ kg là không đáng kể.

> 💡 Đề hay hỏi *"nên chọn ai vào đội tuyển?"*. Trả lời phải nói **cả hai** con số: ai điểm trung bình cao hơn, và ai ổn định hơn — rồi mới kết luận theo yêu cầu của đề.

---

> ### 📌 Ví dụ mẫu
>
> Hai bạn cùng làm $\color{blue} 10$ bài kiểm tra. An có $\color{blue} \overline{x} = 8{,}0$ và $\color{blue} S = 0{,}5$. Bình có $\color{blue} \overline{x} = 8{,}0$ và $\color{blue} S = 1{,}4$. Nên chọn ai đi thi?
>
> Hướng dẫn giải:
> Hai bạn có điểm trung bình **bằng nhau** ($\color{blue} 8{,}0$), nên phải nhìn sang độ lệch chuẩn.
> $\color{blue} S_{\text{An}} = 0{,}5 < S_{\text{Bình}} = 1{,}4$, nghĩa là điểm của An **chụm quanh $\color{blue} 8$** hơn hẳn, còn điểm của Bình lúc cao lúc thấp.
> Đi thi chỉ có một lần duy nhất nên cần người ổn định. **Chọn An.**

<!--QUIZ|Toán tổng hợp|1|3-->
