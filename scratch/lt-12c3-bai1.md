### BÀI 1. KHOẢNG BIẾN THIÊN VÀ KHOẢNG TỨ PHÂN VỊ
# PHẦN 1: TÓM TẮT LÝ THUYẾT TRỌNG TÂM

## 📖 1. MẪU SỐ LIỆU GHÉP NHÓM — NHỚ LẠI CÁCH ĐỌC

Mẫu số liệu ghép nhóm cho dưới dạng bảng: mỗi **nhóm** là một nửa khoảng $\color{blue} [u_i; u_{i+1})$, kèm **tần số** $\color{blue} n_i$ là số giá trị rơi vào nhóm ấy.

| Nhóm | $\color{blue} [u_1;u_2)$ | $\color{blue} [u_2;u_3)$ | … | $\color{blue} [u_k;u_{k+1})$ |
|---|---|---|---|---|
| Tần số | $\color{blue} n_1$ | $\color{blue} n_2$ | … | $\color{blue} n_k$ |

* **Cỡ mẫu:** $\color{blue} n = n_1 + n_2 + \cdots + n_k$.
* **Giá trị đại diện** của nhóm $\color{blue} [u_i;u_{i+1})$ là trung điểm $\color{blue} c_i = \dfrac{u_i + u_{i+1}}{2}$.

> ⚠️ Ghép nhóm là **đã mất số liệu gốc**. Ta không biết trong nhóm $\color{blue} [10;12)$ có những số nào, chỉ biết có bao nhiêu số. Mọi công thức của chương này đều là **xấp xỉ** — đó là lý do kết quả tính từ bảng ghép nhóm không trùng với kết quả tính từ số liệu gốc.

<!--QUIZ|Tìm khoảng biến thiên của mẫu số liệu ghép nhóm|1|1-->

---

## 📖 2. KHOẢNG BIẾN THIÊN

Khoảng biến thiên của mẫu ghép nhóm, kí hiệu $\color{blue} R$:

$$\color{blue} R = u_{k+1} - u_1$$

trong đó $\color{blue} u_1$ là **đầu mút trái của nhóm đầu tiên có tần số khác 0**, còn $\color{blue} u_{k+1}$ là **đầu mút phải của nhóm cuối cùng có tần số khác 0**.

> ⚠️ **Nhóm rỗng ở hai đầu thì bỏ qua.** Bảng có nhóm $\color{blue} [0;2)$ với tần số $\color{blue} 0$ thì không lấy $\color{blue} u_1 = 0$ — phải lấy đầu mút trái của nhóm đầu tiên **thật sự có số liệu**. Đây là bẫy hay gặp nhất của dạng này.

**Ý nghĩa:** $\color{blue} R$ càng lớn thì mẫu càng phân tán. Nhưng $\color{blue} R$ chỉ nhìn hai đầu nên **rất nhạy với giá trị ngoại lệ** — một số liệu bất thường là $\color{blue} R$ vọt lên, dù phần lớn số liệu vẫn chụm.

---

## 📖 3. TỨ PHÂN VỊ CỦA MẪU GHÉP NHÓM

Tứ phân vị thứ $\color{blue} i$ (với $\color{blue} i = 1, 2, 3$):

$$\color{blue} Q_i = u_m + \frac{\dfrac{i \cdot n}{4} - C}{n_m}\left(u_{m+1} - u_m\right)$$

trong đó:

* $\color{blue} [u_m; u_{m+1})$ là **nhóm chứa** $\color{blue} Q_i$ — nhóm đầu tiên có tần số tích luỹ $\color{blue} \ge \dfrac{i \cdot n}{4}$;
* $\color{blue} n_m$ là tần số của chính nhóm ấy;
* $\color{blue} C = n_1 + n_2 + \cdots + n_{m-1}$ là tần số tích luỹ của các nhóm **đứng trước**.

> 💡 Đọc công thức cho dễ nhớ: *đi tới đầu nhóm chứa nó, rồi tiến thêm một phần của bề rộng nhóm — phần ấy bằng tỉ lệ "còn thiếu bao nhiêu / nhóm này có bao nhiêu".*

---

## 📖 4. KHOẢNG TỨ PHÂN VỊ VÀ GIÁ TRỊ NGOẠI LỆ

$$\color{blue} \Delta_Q = Q_3 - Q_1$$

**Ý nghĩa:** $\color{blue} \Delta_Q$ đo độ phân tán của **nửa giữa** mẫu số liệu — 50% số liệu ở giữa. Vì bỏ qua hai đuôi nên nó **không bị giá trị ngoại lệ kéo lệch**, khác hẳn $\color{blue} R$.

Giá trị $\color{blue} x$ trong mẫu là **giá trị ngoại lệ** nếu

$$\color{blue} x < Q_1 - 1{,}5\Delta_Q \quad \text{hoặc} \quad x > Q_3 + 1{,}5\Delta_Q$$

<!--QUIZ|Tìm các tứ phân vị, khoảng tứ phân vị và xác định giá trị ngoại lệ|1|1-->

---

# PHẦN 2: PHÂN DẠNG BÀI TẬP & PHƯƠNG PHÁP GIẢI

## 💡 DẠNG 1: TÌM KHOẢNG BIẾN THIÊN CỦA MẪU SỐ LIỆU GHÉP NHÓM

### 🛠 Phương pháp giải

#### Bước 1: Bỏ các nhóm rỗng ở hai đầu
Nhóm nào có tần số $\color{blue} 0$ thì coi như không có. Chỉ giữ từ nhóm đầu tiên có số liệu đến nhóm cuối cùng có số liệu.

#### Bước 2: Lấy hiệu hai đầu mút
$\color{blue} R = $ (đầu mút phải của nhóm cuối) $\color{blue} - $ (đầu mút trái của nhóm đầu).

#### Bước 3: Trả lời kèm đơn vị
Đơn vị của $\color{blue} R$ chính là đơn vị của số liệu.

> 🚫 **Dạng này không cần bấm máy.** Nó chỉ là một phép trừ hai số — mở máy ra còn lâu hơn nhẩm. Cái khó nằm ở bước 1: đọc đúng nhóm nào có số liệu.

---

> ### 📌 Ví dụ mẫu
>
> Thời gian (phút) chạy $\color{blue} 1000$m của $\color{blue} 40$ học sinh được ghi lại:
>
> | Thời gian | $\color{blue} [6;8)$ | $\color{blue} [8;10)$ | $\color{blue} [10;12)$ | $\color{blue} [12;14)$ | $\color{blue} [14;16)$ | $\color{blue} [16;18)$ |
> |---|---|---|---|---|---|---|
> | Số học sinh | $\color{blue} 0$ | $\color{blue} 5$ | $\color{blue} 12$ | $\color{blue} 10$ | $\color{blue} 8$ | $\color{blue} 5$ |
>
> Tìm khoảng biến thiên của mẫu số liệu ghép nhóm này.
>
> Hướng dẫn giải:
> Nhóm $\color{blue} [6;8)$ có tần số bằng $\color{blue} 0$ nên **bỏ qua**. Nhóm đầu tiên thật sự có số liệu là $\color{blue} [8;10)$, nhóm cuối cùng là $\color{blue} [16;18)$.
> Do đó $\color{blue} R = 18 - 8 = 10$ (phút).
>
> (Nếu vội lấy $\color{blue} 18 - 6 = 12$ thì sai — đó chính là bẫy nhóm rỗng.)

<!--QUIZ|Tìm khoảng biến thiên của mẫu số liệu ghép nhóm|2|1,2-->

---

## 💡 DẠNG 2: TÌM TỨ PHÂN VỊ, KHOẢNG TỨ PHÂN VỊ VÀ GIÁ TRỊ NGOẠI LỆ

### 🛠 Phương pháp giải

#### Bước 1: Lập dòng tần số tích luỹ
Cộng dồn từ trái sang phải. Đây là dòng quyết định — sai một ô là sai cả bài.

#### Bước 2: Tìm nhóm chứa $\color{blue} Q_i$
Tính mốc $\color{blue} \dfrac{i \cdot n}{4}$, rồi dò trên dòng tích luỹ xem **nhóm đầu tiên** nào có tích luỹ vượt qua (hoặc bằng) mốc ấy.

#### Bước 3: Thay vào công thức nội suy
$\color{blue} Q_i = u_m + \dfrac{\frac{i n}{4} - C}{n_m}\left(u_{m+1} - u_m\right)$

#### Bước 4: Tính $\color{blue} \Delta_Q = Q_3 - Q_1$, rồi xét ngoại lệ nếu đề hỏi
Ngưỡng: $\color{blue} Q_1 - 1{,}5\Delta_Q$ và $\color{blue} Q_3 + 1{,}5\Delta_Q$.

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** chỉ mỗi việc cộng tần số tích luỹ và bấm phép chia ở bước 3. Phần còn lại phải làm tay.

> ⚠️ **CẨN THẬN: máy CÓ hiện $\color{blue} Q_1$, $\color{blue} Q_3$ — nhưng KHÔNG PHẢI tứ phân vị của mẫu ghép nhóm.**
>
> Nhập đúng bảng ví dụ dưới đây vào phương thức Thống kê rồi bấm `OPTN` → `3` (Tính 1-biến), máy hiện:
>
> ![Máy hiện Q1, Med, Q3](https://cmjithgtecypxmisbzvw.supabase.co/storage/v1/object/public/lesson_images/editor_images/casio-c3-06-tu-phan-vi.png)
>
> Máy cho $\color{blue} Q_1 = 11$ và $\color{blue} Q_3 = 15$. Nhưng công thức nội suy của sách cho $\color{blue} Q_1 = 10{,}8\overline{3}$ và $\color{blue} Q_3 = 14{,}75$.
>
> Vì sao lệch: máy coi mỗi giá trị đại diện là một **số rời rạc** lặp lại $\color{blue} n_i$ lần, còn sách thì **nội suy bên trong nhóm**. Hai cách hiểu khác nhau nên ra hai số khác nhau — và máy **không báo gì cả**. Chép số của máy vào bài là mất điểm.
>
> **Chốt: dạng này TÍNH TAY bằng công thức. Chỉ dùng máy cho các phép cộng, chia lẻ.**

---

> ### 📌 Ví dụ mẫu
>
> Cho mẫu số liệu ghép nhóm về thời gian (phút) chạy của $\color{blue} 40$ học sinh:
>
> | Thời gian | $\color{blue} [8;10)$ | $\color{blue} [10;12)$ | $\color{blue} [12;14)$ | $\color{blue} [14;16)$ | $\color{blue} [16;18)$ |
> |---|---|---|---|---|---|
> | Số học sinh | $\color{blue} 5$ | $\color{blue} 12$ | $\color{blue} 10$ | $\color{blue} 8$ | $\color{blue} 5$ |
>
> Tìm $\color{blue} Q_1$, $\color{blue} Q_3$ và khoảng tứ phân vị.
>
> Hướng dẫn giải:
> **Bước 1.** Tần số tích luỹ: $\color{blue} 5;\ 17;\ 27;\ 35;\ 40$. Cỡ mẫu $\color{blue} n = 40$.
>
> **Bước 2 và 3 — tìm $\color{blue} Q_1$.** Mốc $\color{blue} \dfrac{n}{4} = 10$. Nhóm đầu tiên có tích luỹ $\color{blue} \ge 10$ là $\color{blue} [10;12)$ (tích luỹ $\color{blue} 17$), với $\color{blue} C = 5$ và $\color{blue} n_m = 12$.
> $\color{blue} Q_1 = 10 + \dfrac{10 - 5}{12}(12 - 10) = 10 + \dfrac{5}{6} = \dfrac{65}{6} \approx 10{,}83$.
>
> **Tìm $\color{blue} Q_3$.** Mốc $\color{blue} \dfrac{3n}{4} = 30$. Nhóm đầu tiên có tích luỹ $\color{blue} \ge 30$ là $\color{blue} [14;16)$ (tích luỹ $\color{blue} 35$), với $\color{blue} C = 27$ và $\color{blue} n_m = 8$.
> $\color{blue} Q_3 = 14 + \dfrac{30 - 27}{8}(16 - 14) = 14 + \dfrac{3}{4} = 14{,}75$.
>
> **Bước 4.** $\color{blue} \Delta_Q = 14{,}75 - \dfrac{65}{6} = \dfrac{47}{12} \approx 3{,}92$ (phút).

<!--QUIZ|Tìm các tứ phân vị, khoảng tứ phân vị và xác định giá trị ngoại lệ|2|1,2-->

---

## 💡 DẠNG 3: CÁC SỐ ĐẶC TRƯNG CỦA MẪU KHÔNG GHÉP NHÓM

### 🛠 Phương pháp giải

Khi đề cho **danh sách số liệu gốc** chứ không phải bảng nhóm:

#### Bước 1: Sắp xếp số liệu theo thứ tự không giảm

#### Bước 2: Khoảng biến thiên
$\color{blue} R = x_{\max} - x_{\min}$ — lấy thẳng hai đầu danh sách đã sắp.

#### Bước 3: Tứ phân vị
* $\color{blue} Q_2$ là **trung vị** của cả mẫu.
* $\color{blue} Q_1$ là trung vị của **nửa dưới**, $\color{blue} Q_3$ là trung vị của **nửa trên**.
* Cỡ mẫu **lẻ** thì **không lấy** $\color{blue} Q_2$ vào cả hai nửa.

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** ở dạng này máy làm được **toàn bộ** — và số máy cho là số đúng, vì số liệu vốn đã rời rạc, không có chuyện nội suy trong nhóm như Dạng 2.

| Bước | Bấm |
|---|---|
| 1 | `MENU` `6` rồi `1` (Tính tkê 1-biến) |
| 2 | Nhập lần lượt từng số liệu, mỗi số một lần `=` |
| 3 | `OPTN` `3` (Tính 1-biến) |
| 4 | Cuộn `▼` để đọc `min(x)`, `Q₁`, `Med`, `Q₃`, `max(x)` |

![Máy hiện n, min, Q1, Med, Q3](https://cmjithgtecypxmisbzvw.supabase.co/storage/v1/object/public/lesson_images/editor_images/casio-c3-06-tu-phan-vi.png)

> ⚠️ Số liệu có giá trị lặp lại thì **bật cột tần số** cho nhanh (xem Bài 2), nhập mỗi giá trị một dòng kèm số lần lặp — đừng gõ tay hai chục dòng giống nhau.
> Máy chỉ để kiểm tra lại và chọn nhanh trắc nghiệm; bài tự luận vẫn phải trình bày các bước sắp xếp và chia nửa.

---

> ### 📌 Ví dụ mẫu
>
> Điểm kiểm tra của $\color{blue} 11$ học sinh: $\color{blue} 4;\ 5;\ 5;\ 6;\ 7;\ 7;\ 8;\ 8;\ 9;\ 9;\ 10$.
> Tìm khoảng biến thiên và khoảng tứ phân vị.
>
> Hướng dẫn giải:
> Dãy đã sắp xếp, cỡ mẫu $\color{blue} n = 11$ (lẻ).
> $\color{blue} R = 10 - 4 = 6$.
> $\color{blue} Q_2$ là số ở giữa — số thứ $\color{blue} 6$, tức $\color{blue} Q_2 = 7$.
> Nửa dưới (không lấy $\color{blue} Q_2$): $\color{blue} 4;5;5;6;7$ → $\color{blue} Q_1 = 5$.
> Nửa trên: $\color{blue} 8;8;9;9;10$ → $\color{blue} Q_3 = 9$.
> Vậy $\color{blue} \Delta_Q = 9 - 5 = 4$.

<!--QUIZ|Tính các số đặc trưng mức độ phân tán (mẫu không ghép nhóm)|2|1,2-->

---

## 💡 DẠNG 4: TOÁN TỔNG HỢP — SO SÁNH VÀ ĐỌC BẢNG

### 🛠 Phương pháp giải

Dạng này thường hỏi **so sánh độ phân tán của hai mẫu**, hoặc cho một bảng rồi hỏi nhiều khẳng định đúng/sai cùng lúc.

#### Bước 1: Đọc kĩ mỗi khẳng định hỏi về đại lượng nào
$\color{blue} R$, $\color{blue} Q_1$, $\color{blue} Q_3$, $\color{blue} \Delta_Q$ hay ngoại lệ — mỗi đại lượng một cách tính, đừng nhầm.

#### Bước 2: Tính đúng một lần rồi dùng lại
Lập sẵn dòng tần số tích luỹ và tính sẵn $\color{blue} n$, $\color{blue} Q_1$, $\color{blue} Q_3$ — hầu hết các ý đều dựa vào mấy số ấy.

#### Bước 3: So sánh thì phải cùng thước đo
Hai mẫu khác đơn vị, hoặc khác cỡ mẫu, thì **không so $\color{blue} R$ với nhau được** — dùng $\color{blue} \Delta_Q$ hoặc độ lệch chuẩn (Bài 2) sẽ công bằng hơn.

> 💡 **Câu hỏi hay gặp nhất:** *"Mẫu nào phân tán hơn?"* Nếu đề có nhắc tới giá trị bất thường thì trả lời theo $\color{blue} \Delta_Q$, vì $\color{blue} R$ bị chính giá trị ấy kéo lệch.

---

> ### 📌 Ví dụ mẫu
>
> Hai xạ thủ cùng bắn $\color{blue} 20$ phát. Mẫu A có $\color{blue} R = 6$, $\color{blue} \Delta_Q = 1{,}5$. Mẫu B có $\color{blue} R = 4$, $\color{blue} \Delta_Q = 2{,}5$. Xạ thủ nào bắn ổn định hơn?
>
> Hướng dẫn giải:
> Theo $\color{blue} R$ thì B có vẻ ổn định hơn ($\color{blue} 4 < 6$). Nhưng $\color{blue} R$ chỉ nhìn hai phát bắn xa nhất.
> Theo $\color{blue} \Delta_Q$ — thước đo của **nửa giữa**, tức phần lớn các phát bắn — thì A ổn định hơn hẳn ($\color{blue} 1{,}5 < 2{,}5$).
> Vậy A có $\color{blue} R$ lớn chỉ vì một vài phát lệch bất thường, còn phần lớn các phát của A chụm hơn của B. **Kết luận: A ổn định hơn.**

<!--QUIZ|Toán tổng hợp|2|3,4-->
