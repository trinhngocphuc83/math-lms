### BÀI 2. HỆ THỨC LƯỢNG TRONG TAM GIÁC
# PHẦN 1: TÓM TẮT LÝ THUYẾT TRỌNG TÂM

**Quy ước kí hiệu** cho tam giác $\color{blue} ABC$ trong cả bài: $\color{blue} a = BC$, $\color{blue} b = CA$, $\color{blue} c = AB$ (cạnh đối diện đỉnh nào mang tên chữ thường của đỉnh ấy); $\color{blue} h_a, h_b, h_c$ là ba đường cao; $\color{blue} m_a, m_b, m_c$ là ba trung tuyến; $\color{blue} R$, $\color{blue} r$ là bán kính đường tròn ngoại tiếp, nội tiếp; $\color{blue} p = \dfrac{a + b + c}{2}$ là nửa chu vi; $\color{blue} S$ là diện tích.

---

## 📖 1. ĐỊNH LÍ CÔSIN

$$\color{blue} a^2 = b^2 + c^2 - 2bc\cos A$$
$$\color{blue} b^2 = c^2 + a^2 - 2ca\cos B$$
$$\color{blue} c^2 = a^2 + b^2 - 2ab\cos C$$

**Hệ quả** (tính góc khi biết ba cạnh):

$$\color{blue} \cos A = \dfrac{b^2 + c^2 - a^2}{2bc} \qquad \cos B = \dfrac{c^2 + a^2 - b^2}{2ca}$$
$$\color{blue} \cos C = \dfrac{a^2 + b^2 - c^2}{2ab}$$

> 💡 Định lí côsin là **định lí Pythagore có thêm số hạng hiệu chỉnh** $\color{blue} -2bc\cos A$: góc $\color{blue} A$ vuông thì $\color{blue} \cos A = 0$, trở về $\color{blue} a^2 = b^2 + c^2$; góc $\color{blue} A$ nhọn thì $\color{blue} a^2 < b^2 + c^2$; góc $\color{blue} A$ tù thì $\color{blue} a^2 > b^2 + c^2$. Dùng ngay dấu của $\color{blue} b^2 + c^2 - a^2$ để biết góc $\color{blue} A$ nhọn, vuông hay tù mà không cần tính góc.

---

## 📖 2. ĐỊNH LÍ SIN

$$\color{blue} \dfrac{a}{\sin A} = \dfrac{b}{\sin B} = \dfrac{c}{\sin C} = 2R$$

Suy ra $\color{blue} a = 2R\sin A$, $\color{blue} \sin A = \dfrac{a}{2R}$, $\color{blue} R = \dfrac{a}{2\sin A}$.

> ⚠️ Vế phải là $\color{blue} 2R$ chứ không phải $\color{blue} R$ — câu "công thức nào **sai**" hầu như lần nào cũng gài đúng chỗ này.
>
> ⚠️ Tìm góc bằng định lí sin thì $\color{blue} \sin B = k$ cho **hai** góc bù nhau. Cạnh $\color{blue} b$ không phải cạnh lớn nhất thì $\color{blue} B$ chắc chắn nhọn; nếu $\color{blue} b$ là cạnh lớn nhất thì phải xét cả trường hợp tù (hoặc dùng hệ quả định lí côsin cho chắc).

---

## 📖 3. CÔNG THỨC TÍNH DIỆN TÍCH TAM GIÁC

$$\color{blue} S = \dfrac{1}{2}ah_a = \dfrac{1}{2}bh_b = \dfrac{1}{2}ch_c$$
$$\color{blue} S = \dfrac{1}{2}bc\sin A = \dfrac{1}{2}ca\sin B = \dfrac{1}{2}ab\sin C$$
$$\color{blue} S = \dfrac{abc}{4R} \qquad S = pr$$
$$\color{blue} S = \sqrt{p(p-a)(p-b)(p-c)} \ \text{(công thức Heron)}$$

---

**Chọn công thức theo dữ kiện:**

| Đề cho | Dùng |
|---|---|
| hai cạnh và góc xen giữa | $\color{blue} S = \dfrac{1}{2}bc\sin A$ |
| ba cạnh | Heron |
| cần $\color{blue} R$ hoặc đề cho $\color{blue} R$ | $\color{blue} S = \dfrac{abc}{4R}$ |
| cần $\color{blue} r$ hoặc đề cho $\color{blue} r$ | $\color{blue} S = pr$ |
| cần đường cao | $\color{blue} h_a = \dfrac{2S}{a}$ |

---

## 📖 4. CÔNG THỨC ĐỘ DÀI ĐƯỜNG TRUNG TUYẾN

$$\color{blue} m_a^2 = \dfrac{2\left(b^2 + c^2\right) - a^2}{4} \qquad m_b^2 = \dfrac{2\left(c^2 + a^2\right) - b^2}{4}$$
$$\color{blue} m_c^2 = \dfrac{2\left(a^2 + b^2\right) - c^2}{4}$$

> 💡 Cách nhớ: trung tuyến từ đỉnh nào thì **cạnh đối diện đỉnh ấy mang dấu trừ**, hai cạnh kia nhân đôi. Công thức này chứng minh bằng định lí côsin trong hai tam giác $\color{blue} ABM$, $\color{blue} ACM$ (cộng lại thì $\color{blue} \cos\widehat{AMB} + \cos\widehat{AMC} = 0$).

---

## 📖 5. GIẢI TAM GIÁC

*Giải tam giác* là tính **mọi cạnh và mọi góc** còn lại khi biết ba yếu tố, trong đó có ít nhất một cạnh:

| Biết | Làm |
|---|---|
| hai cạnh và góc xen giữa ($\color{blue} b, c, A$) | định lí côsin → $\color{blue} a$; hệ quả côsin → $\color{blue} B$; $\color{blue} C = 180^\circ - A - B$ |
| ba cạnh | hệ quả côsin → hai góc; góc thứ ba lấy $\color{blue} 180^\circ$ trừ |
| một cạnh và hai góc ($\color{blue} a, B, C$) | $\color{blue} A = 180^\circ - B - C$; định lí sin → $\color{blue} b, c$ |
| hai cạnh và góc **không** xen giữa ($\color{blue} a, b, A$) | định lí sin → $\color{blue} \sin B$, xét nhọn/tù; hoặc định lí côsin ra phương trình bậc hai theo cạnh chưa biết |

---

## 📖 6. ỨNG DỤNG THỰC TẾ

Đo chiều cao, khoảng cách không đi tới được: **vẽ tam giác chứa đại lượng cần tìm**, ghi các yếu tố đo được (một cạnh đo bằng thước, các góc đo bằng giác kế), rồi:

* biết hai góc → góc thứ ba → định lí sin;
* biết hai cạnh và góc xen giữa → định lí côsin;
* chiều cao thẳng đứng → sau khi tính được cạnh nghiêng, nhân với sin của góc nâng.

Kết quả thực tế **làm tròn theo yêu cầu của đề** (thường đến hàng phần mười), giữ đủ chữ số trong khi tính rồi mới làm tròn ở bước cuối.

---

# PHẦN 2: PHÂN DẠNG BÀI TẬP & PHƯƠNG PHÁP GIẢI

## 💡 DẠNG 1: TÍNH CẠNH, GÓC CỦA TAM GIÁC BẰNG ĐỊNH LÍ CÔSIN, ĐỊNH LÍ SIN

### 🛠 Phương pháp giải

#### Bước 1: Nhận diện dữ kiện
* Hai cạnh + góc **xen giữa** → định lí **côsin** tính cạnh thứ ba.
* Ba cạnh → **hệ quả** định lí côsin tính góc.
* Một cạnh + góc đối diện (kèm cạnh hoặc góc khác) → định lí **sin**; đề nhắc **bán kính $\color{blue} R$** thì gần như chắc là định lí sin.

#### Bước 2: Viết đúng công thức cho đúng cạnh - góc
Cạnh cần tìm ở vế trái, góc trong công thức phải là góc **đối diện** cạnh ấy: $\color{blue} a^2 = b^2 + c^2 - 2bc\cos A$ (cạnh $\color{blue} a$ đi với góc $\color{blue} A$).

#### Bước 3: Thay số, giữ dạng căn nếu là góc đặc biệt
$\color{blue} \cos 120^\circ = -\dfrac{1}{2}$ làm số hạng $\color{blue} -2bc\cos A$ **thành cộng**: $\color{blue} a^2 = b^2 + c^2 + bc$. Đây là chỗ hay sai dấu nhất.

#### Bước 4: Với điểm trên cạnh (trung điểm, chân phân giác, điểm chia tỉ số)
Tính $\color{blue} \cos$ của góc ở đỉnh chung bằng hệ quả côsin trong tam giác lớn, rồi áp dụng định lí côsin cho tam giác nhỏ chứa đoạn cần tìm. Trung tuyến thì dùng thẳng công thức $\color{blue} m_a$.

---

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** thay số vào công thức và lấy căn, tính góc từ côsin.

| Bước | Bấm |
|---|---|
| 1 | Đặt Degree: `SHIFT` `MENU` `2` `1` |
| 2 | Cạnh: `√` `(` `b²` `+` `c²` `–` `2` `×` `b` `×` `c` `×` `cos` `A` `°'"` `)` `=` |
| 3 | Góc: `SHIFT` `cos` `(` `(` `b²` `+` `c²` `–` `a²` `)` `÷` `(` `2bc` `)` `)` `=` |
| 4 | Đổi kết quả sang độ-phút: bấm `°'"` sau khi có kết quả |

> ⚠️ Nhập cả biểu thức trong **một dòng** rồi mới `=`; tính từng khúc rồi chép tay số làm tròn là lệch đáp án ở chữ số thập phân thứ nhất — đúng chỗ đề bắt làm tròn.

---

> ### 📌 Ví dụ mẫu
>
> Tam giác $\color{blue} ABC$ có $\color{blue} AB = 6$, $\color{blue} AC = 8$, $\color{blue} \widehat{A} = 60^\circ$ và $\color{blue} M$ là trung điểm của $\color{blue} BC$. Tính $\color{blue} BC$, $\color{blue} \cos B$ và $\color{blue} AM$.
>
> Hướng dẫn giải:
> **Tính $\color{blue} BC$** (hai cạnh và góc xen giữa → định lí côsin):
> $\color{blue} BC^2 = 6^2 + 8^2 - 2 \cdot 6 \cdot 8\cos 60^\circ = 100 - 48 = 52 \Rightarrow BC = 2\sqrt{13}$.
>
> **Tính $\color{blue} \cos B$** (ba cạnh → hệ quả): $\color{blue} \cos B = \dfrac{AB^2 + BC^2 - AC^2}{2 \cdot AB \cdot BC} = \dfrac{36 + 52 - 64}{2 \cdot 6 \cdot 2\sqrt{13}} = \dfrac{24}{24\sqrt{13}} = \dfrac{\sqrt{13}}{13}$.
>
> **Tính $\color{blue} AM$** (trung tuyến): $\color{blue} AM^2 = \dfrac{2\left(AB^2 + AC^2\right) - BC^2}{4} = \dfrac{2(36 + 64) - 52}{4} = 37 \Rightarrow AM = \sqrt{37}$.

```quiz
{
  "type": "multiple_choice",
  "question": "Cho $a$, $b$, $c$ là độ dài ba cạnh của tam giác $ABC$. Biết $b = 7$, $c = 5$, $\\cos A = \\dfrac{4}{5}$. Tính độ dài của $a$.",
  "options": [
    "$3\\sqrt{2}$.",
    "$\\dfrac{7\\sqrt{2}}{2}$.",
    "$\\dfrac{23}{8}$.",
    "$6$."
  ],
  "answerIndex": 0,
  "phuong_phap_giai": "Định lí côsin.",
  "cac_buoc_thuc_hien": [
    "$a^2 = 49 + 25 - 2 \\cdot 7 \\cdot 5 \\cdot \\dfrac{4}{5} = 18 \\Rightarrow a = 3\\sqrt{2}$.",
    "Chọn A."
  ],
  "sourceQuestionId": "a87d3b17-3983-4a8c-bd0b-90a92ac08c79",
  "maCauHoi": "CH_1789444264844_ra2t"
}
```

```quiz
{
  "type": "multiple_choice",
  "question": "Cho tam giác $ABC$ có $AB = 7$, $AC = 8$ và $\\widehat{A} = 60^\\circ$. Kết quả nào trong các kết quả sau là độ dài của cạnh $BC$?",
  "options": [
    "$7$.",
    "$47$.",
    "$\\sqrt{57}$.",
    "$2\\sqrt{57}$."
  ],
  "answerIndex": 2,
  "phuong_phap_giai": "Định lí côsin.",
  "cac_buoc_thuc_hien": [
    "$BC^2 = 49 + 64 - 2 \\cdot 7 \\cdot 8\\cos 60^\\circ = 57 \\Rightarrow BC = \\sqrt{57}$.",
    "Chọn C."
  ],
  "sourceQuestionId": "0f35c51a-800b-4527-8b00-9425bf6cb135",
  "maCauHoi": "CH_1789444264845_dd8y"
}
```

```quiz
{
  "type": "multiple_choice",
  "question": "Cho tam giác $ABC$ có $AB = 4$ cm, $BC = 7$ cm, $AC = 9$ cm. Giá trị $\\cos B$ là",
  "options": [
    "$\\dfrac{2}{7}$.",
    "$-\\dfrac{2}{7}$.",
    "$-\\dfrac{2}{3}$.",
    "$\\dfrac{1}{2}$."
  ],
  "answerIndex": 1,
  "phuong_phap_giai": "Hệ quả định lí côsin.",
  "cac_buoc_thuc_hien": [
    "$\\cos B = \\dfrac{AB^2 + BC^2 - AC^2}{2AB \\cdot BC} = \\dfrac{16 + 49 - 81}{56} = -\\dfrac{2}{7}$.",
    "Chọn B."
  ],
  "sourceQuestionId": "c388d100-5ca3-43a2-8209-33bba30653a5",
  "maCauHoi": "CH_1789444264846_sixw"
}
```

---

## 💡 DẠNG 2: GIẢI TAM GIÁC

### 🛠 Phương pháp giải

#### Bước 1: Liệt kê ba yếu tố đã biết, xếp vào một trong bốn trường hợp ở mục 5
Có góc thứ ba tính được ngay bằng tổng $\color{blue} 180^\circ$ thì tính trước.

#### Bước 2: Tính yếu tố kế tiếp bằng đúng định lí
* Biết một cạnh và góc đối diện nó → định lí sin cho mọi cạnh/góc khác.
* Chưa có cặp cạnh - góc đối diện → định lí côsin trước để tạo ra một cặp.

#### Bước 3: Kiểm tra góc tìm bằng định lí sin
Góc đối diện cạnh **lớn nhất** có thể tù: so $\color{blue} b^2$ với $\color{blue} a^2 + c^2$, hoặc tính bằng hệ quả côsin để không mất nghiệm. Tổng ba góc phải bằng $\color{blue} 180^\circ$.

---

### 🖩 Bấm máy Casio fx-580VN X

Giải tam giác là bài **bấm máy nhiều nhất** của chương: mỗi bước một phép tính. Lưu kết quả trung gian vào biến để không phải chép số:

| Bước | Bấm |
|---|---|
| 1 | Tính cạnh $\color{blue} a$ rồi lưu: `... =` `SHIFT` `RCL` (STO) `A` |
| 2 | Tính góc: `SHIFT` `cos` `(` `(` `b²` `+` `c²` `–` `ALPHA` `A` `x²` `)` `÷` `(2bc)` `)` `=` — dùng đúng giá trị chưa làm tròn |
| 3 | Góc còn lại: `180` `–` (tổng hai góc) `=` |

> ⚠️ Nếu tính góc bằng `SHIFT` `sin` thì máy chỉ cho góc nhọn — xem lại Bước 3 của phương pháp trước khi ghi đáp án.

---

> ### 📌 Ví dụ mẫu
>
> Giải tam giác $\color{blue} ABC$ biết $\color{blue} AB = 15$, $\color{blue} AC = 21$, $\color{blue} \widehat{A} = 30^\circ$ (làm tròn đến hàng phần mười).
>
> Hướng dẫn giải:
> **Cạnh $\color{blue} BC$** (hai cạnh, góc xen giữa): $\color{blue} BC^2 = 15^2 + 21^2 - 2 \cdot 15 \cdot 21\cos 30^\circ \approx 120{,}4 \Rightarrow BC \approx 11{,}0$.
>
> **Góc $\color{blue} B$.** Nếu dùng định lí sin: $\color{blue} \sin B = \dfrac{AC\sin A}{BC} \approx 0{,}957 \Rightarrow B \approx 73{,}2^\circ$ **hoặc** $\color{blue} 106{,}8^\circ$. Cạnh $\color{blue} AC = 21$ là cạnh lớn nhất nên $\color{blue} B$ là góc lớn nhất; kiểm tra $\color{blue} AC^2 = 441 > AB^2 + BC^2 \approx 345$, vậy $\color{blue} B$ **tù**: $\color{blue} B \approx 106{,}9^\circ$ (tính thẳng bằng hệ quả côsin: $\color{blue} \cos B = \dfrac{225 + 120{,}4 - 441}{2 \cdot 15 \cdot 10{,}97} \approx -0{,}290$).
>
> **Góc $\color{blue} C$** $\color{blue} \approx 180^\circ - 30^\circ - 106{,}9^\circ = 43{,}1^\circ$.
>
> (Tài liệu giải bằng định lí sin rồi lấy $\color{blue} B \approx 72{,}7^\circ$ là **sai** — mất nghiệm góc tù.)

```quiz
{
  "type": "multiple_choice",
  "question": "Cho $\\triangle ABC$ vuông tại $B$ và có $\\widehat{C} = 25^\\circ$. Số đo của góc $A$ là:",
  "options": [
    "$A = 65^\\circ$.",
    "$A = 60^\\circ$.",
    "$A = 155^\\circ$.",
    "$A = 75^\\circ$."
  ],
  "answerIndex": 0,
  "phuong_phap_giai": "Tổng ba góc trong tam giác bằng $180^\\circ$.",
  "cac_buoc_thuc_hien": [
    "$A = 180^\\circ - 90^\\circ - 25^\\circ = 65^\\circ$.",
    "Chọn A."
  ],
  "sourceQuestionId": "aa9ea906-9185-4cb1-bf32-6b0ce88ef8d6",
  "maCauHoi": "CH_1789292862132_2wum"
}
```

```quiz
{
  "type": "multiple_choice",
  "question": "Tam giác $ABC$ có $a = 16{,}8$; $\\widehat{B} = 56^\\circ 13'$; $\\widehat{C} = 71^\\circ$. Cạnh $c$ bằng bao nhiêu (làm tròn đến hàng phần mười)?",
  "options": [
    "$29{,}9$.",
    "$14{,}1$.",
    "$17{,}5$.",
    "$19{,}9$."
  ],
  "answerIndex": 3,
  "phuong_phap_giai": "Tính $\\widehat{A}$ rồi dùng định lí sin $c = \\dfrac{a\\sin C}{\\sin A}$.",
  "cac_buoc_thuc_hien": [
    "$\\widehat{A} = 180^\\circ - 56^\\circ 13' - 71^\\circ = 52^\\circ 47'$.\n$c = \\dfrac{16{,}8 \\cdot \\sin 71^\\circ}{\\sin 52^\\circ 47'} \\approx \\dfrac{16{,}8 \\cdot 0{,}9455}{0{,}7966} \\approx 19{,}9$.",
    "Chọn D."
  ],
  "sourceQuestionId": "20528260-adf6-4fb7-a58e-24a29af8df6c",
  "maCauHoi": "CH_1789292862157_667j"
}
```

```quiz
{
  "type": "multiple_choice",
  "question": "Cho tam giác $ABC$ có $AC = 29$; $\\widehat{A} = 80^\\circ$; $\\widehat{C} = 35^\\circ$. Tính độ dài cạnh $BC$ (làm tròn kết quả đến hàng phần mười).",
  "options": [
    "$31{,}5$.",
    "$31{,}2$.",
    "$32{,}6$.",
    "$30{,}6$."
  ],
  "answerIndex": 0,
  "phuong_phap_giai": "Tính $\\widehat{B}$ rồi dùng định lí sin $\\dfrac{BC}{\\sin A} = \\dfrac{AC}{\\sin B}$.",
  "cac_buoc_thuc_hien": [
    "$\\widehat{B} = 180^\\circ - 80^\\circ - 35^\\circ = 65^\\circ$.\n$BC = \\dfrac{AC\\sin A}{\\sin B} = \\dfrac{29\\sin 80^\\circ}{\\sin 65^\\circ} \\approx 31{,}5$.",
    "Chọn A."
  ],
  "sourceQuestionId": "0d639d79-b321-427e-b4d4-21625e5a7da6",
  "maCauHoi": "CH_1789293034151_xatg"
}
```

---

## 💡 DẠNG 3: TÍNH DIỆN TÍCH TAM GIÁC, BÁN KÍNH ĐƯỜNG TRÒN NỘI TIẾP, ĐƯỜNG CAO

### 🛠 Phương pháp giải

#### Bước 1: Tính diện tích bằng công thức hợp với dữ kiện (bảng ở mục 3)
Ba cạnh → Heron; hai cạnh và góc xen giữa → $\color{blue} \dfrac{1}{2}bc\sin A$. Đề cho góc mà chưa đủ cạnh thì tính cạnh còn thiếu bằng định lí côsin/sin trước.

#### Bước 2: Từ $S$ suy ra đại lượng đề hỏi
* Đường cao: $\color{blue} h_a = \dfrac{2S}{a}$.
* Bán kính nội tiếp: $\color{blue} r = \dfrac{S}{p}$.
* Bán kính ngoại tiếp: $\color{blue} R = \dfrac{abc}{4S}$, hoặc nhanh hơn $\color{blue} R = \dfrac{a}{2\sin A}$ khi biết một cặp cạnh - góc đối diện.
* Đường phân giác trong $\color{blue} AD$: dùng $\color{blue} S_{ABC} = S_{ABD} + S_{ACD} = \dfrac{1}{2}c \cdot AD\sin\dfrac{A}{2} + \dfrac{1}{2}b \cdot AD\sin\dfrac{A}{2}$ (chỉ làm khi $\color{blue} \dfrac{A}{2}$ là góc đặc biệt).

#### Bước 3: Tam giác vuông thì dùng lối tắt
$\color{blue} S = \dfrac{1}{2}$(tích hai cạnh góc vuông), $\color{blue} R = \dfrac{1}{2}$(cạnh huyền), $\color{blue} r = \dfrac{b + c - a}{2}$.

---

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** Heron với ba cạnh lẻ. Lưu nửa chu vi vào biến rồi bấm một dòng:

| Bước | Bấm |
|---|---|
| 1 | `(` `a` `+` `b` `+` `c` `)` `÷` `2` `=` `SHIFT` `RCL` `P` (STO vào P) |
| 2 | `√` `(` `ALPHA` `P` `(` `ALPHA` `P` `–` `a` `)` `(` `ALPHA` `P` `–` `b` `)` `(` `ALPHA` `P` `–` `c` `)` `)` `=` |
| 3 | Cần $\color{blue} r$: lấy kết quả `÷` `ALPHA` `P` `=` |

> ⚠️ Đáp án trắc nghiệm hay để dạng $\color{blue} 3\sqrt{39}$: máy cho $\color{blue} 18{,}735$; bấm từng phương án để so, hoặc bình phương kết quả ($\color{blue} 351 = 9 \cdot 39$) để nhận ra dạng căn.

---

> ### 📌 Ví dụ mẫu
>
> Tam giác $\color{blue} ABC$ có $\color{blue} AB = 5$, $\color{blue} BC = 7$, $\color{blue} CA = 8$. Tính diện tích, đường cao $\color{blue} h_a$ kẻ từ $\color{blue} A$, bán kính $\color{blue} r$ và $\color{blue} R$.
>
> Hướng dẫn giải:
> $\color{blue} p = \dfrac{5 + 7 + 8}{2} = 10$; Heron: $\color{blue} S = \sqrt{10 \cdot 5 \cdot 3 \cdot 2} = \sqrt{300} = 10\sqrt{3}$.
> Đường cao kẻ từ $\color{blue} A$ ứng với cạnh $\color{blue} a = BC = 7$: $\color{blue} h_a = \dfrac{2S}{a} = \dfrac{20\sqrt{3}}{7}$.
> $\color{blue} r = \dfrac{S}{p} = \sqrt{3}$; $\color{blue} R = \dfrac{abc}{4S} = \dfrac{7 \cdot 8 \cdot 5}{40\sqrt{3}} = \dfrac{7\sqrt{3}}{3}$.
> (Kiểm tra bằng đường khác: $\color{blue} \cos A = \dfrac{64 + 25 - 49}{80} = \dfrac{1}{2}$, $\color{blue} A = 60^\circ$, $\color{blue} R = \dfrac{a}{2\sin A} = \dfrac{7}{\sqrt{3}}$ — khớp.)

```quiz
{
  "type": "multiple_choice",
  "question": "Cho $\\triangle ABC$ có $a = 6$, $b = 8$, $c = 10$. Diện tích $S$ của tam giác trên là:",
  "options": [
    "$48$.",
    "$24$.",
    "$12$.",
    "$30$."
  ],
  "answerIndex": 1,
  "phuong_phap_giai": "Kiểm tra $a^2 + b^2 = c^2$ để nhận ra tam giác vuông, hoặc dùng công thức Heron.",
  "cac_buoc_thuc_hien": [
    "$6^2 + 8^2 = 10^2$ nên tam giác vuông tại $C$, $S = \\dfrac{1}{2} \\cdot 6 \\cdot 8 = 24$.",
    "Chọn B."
  ],
  "sourceQuestionId": "c3be33ea-ceef-49b0-a73c-a8d61bf6c225",
  "maCauHoi": "CH_1789292862143_ps2a"
}
```

```quiz
{
  "type": "multiple_choice",
  "question": "Tính diện tích tam giác $ABC$ có $AB = 12$; $AC = 8$; $\\widehat{BAC} = 30^\\circ$.",
  "options": [
    "$24\\sqrt{2}$.",
    "$48$.",
    "$24$.",
    "$24\\sqrt{3}$."
  ],
  "answerIndex": 2,
  "phuong_phap_giai": "$S = \\dfrac{1}{2}AB \\cdot AC\\sin A$.",
  "cac_buoc_thuc_hien": [
    "$S = \\dfrac{1}{2} \\cdot 12 \\cdot 8 \\cdot \\sin 30^\\circ = 48 \\cdot \\dfrac{1}{2} = 24$.",
    "Chọn C."
  ],
  "sourceQuestionId": "9fe10444-835e-4b90-ae5f-b67eec5720ac",
  "maCauHoi": "CH_1789292862144_ahvm"
}
```

```quiz
{
  "type": "multiple_choice",
  "question": "Cho $\\triangle ABC$ có $a = 2$, $b = 6$, $\\widehat{C} = 135^\\circ$. Diện tích của tam giác là:",
  "options": [
    "$4$.",
    "$6\\sqrt{2}$.",
    "$3\\sqrt{2}$.",
    "$4\\sqrt{3}$."
  ],
  "answerIndex": 2,
  "phuong_phap_giai": "$S = \\dfrac{1}{2}ab\\sin C$.",
  "cac_buoc_thuc_hien": [
    "$S = \\dfrac{1}{2} \\cdot 2 \\cdot 6 \\cdot \\sin 135^\\circ = 6 \\cdot \\dfrac{\\sqrt{2}}{2} = 3\\sqrt{2}$.",
    "Chọn C."
  ],
  "sourceQuestionId": "4ecf28fc-3499-4db6-bffa-15b00eb3c67c",
  "maCauHoi": "CH_1789293034153_j2yk"
}
```

---

## 💡 DẠNG 4: CHỨNG MINH HỆ THỨC, NHẬN DẠNG TAM GIÁC

### 🛠 Phương pháp giải

#### Bước 1: Đưa hệ thức về toàn cạnh
* $\color{blue} \sin A = \dfrac{a}{2R}$, $\color{blue} \sin B = \dfrac{b}{2R}$, $\color{blue} \sin C = \dfrac{c}{2R}$ — mọi hệ thức về sin của các góc đều thành hệ thức về cạnh.
* $\color{blue} \cos A = \dfrac{b^2 + c^2 - a^2}{2bc}$ — mọi $\color{blue} \cos$ của góc cũng thành cạnh.
* Diện tích, đường cao, bán kính: $\color{blue} S = \dfrac{1}{2}bc\sin A = \dfrac{abc}{4R} = pr$, $\color{blue} h_a = \dfrac{2S}{a}$.

#### Bước 2: Rút gọn đại số
Thường ra một trong ba kết luận: $\color{blue} b = c$ (**cân**), $\color{blue} a^2 = b^2 + c^2$ (**vuông**), hoặc $\color{blue} \cos A = \dfrac{1}{2}$ / $\color{blue} -\dfrac{1}{2}$ (góc $\color{blue} 60^\circ$ / $\color{blue} 120^\circ$).

#### Bước 3: Kết luận đầy đủ
Cân **tại đỉnh nào**, vuông **tại đỉnh nào** — đề hỏi "đặc điểm đầy đủ" là muốn ghi rõ đỉnh. Hai kết luận cùng lúc (cân và có góc $\color{blue} 60^\circ$) thì là tam giác đều.

> 🚫 Dạng chứng minh **không bấm máy**: thử vài bộ số chỉ để đoán kết luận, không thay được biến đổi.

---

> ### 📌 Ví dụ mẫu
>
> Tam giác $\color{blue} ABC$ thoả mãn $\color{blue} \sin A = 2\sin B\cos C$. Tam giác $\color{blue} ABC$ có đặc điểm gì?
>
> Hướng dẫn giải:
> Đưa về cạnh: $\color{blue} \dfrac{a}{2R} = 2 \cdot \dfrac{b}{2R} \cdot \dfrac{a^2 + b^2 - c^2}{2ab}$.
> Rút gọn: $\color{blue} a = \dfrac{a^2 + b^2 - c^2}{a} \Leftrightarrow a^2 = a^2 + b^2 - c^2 \Leftrightarrow b = c$.
> Vậy tam giác $\color{blue} ABC$ **cân tại $\color{blue} A$**.

```quiz
{
  "type": "multiple_choice",
  "question": "Cho tam giác $ABC$. Khẳng định nào sau đây là đúng?",
  "options": [
    "$S_{\\triangle ABC} = \\dfrac{1}{2}a \\cdot b \\cdot c$.",
    "$\\dfrac{a}{\\sin A} = R$.",
    "$\\cos B = \\dfrac{b^2 + c^2 - a^2}{2bc}$.",
    "$m_c^2 = \\dfrac{2b^2 + 2a^2 - c^2}{4}$."
  ],
  "answerIndex": 3,
  "phuong_phap_giai": "Nhớ các công thức: diện tích, định lí sin, hệ quả định lí côsin, độ dài đường trung tuyến.",
  "cac_buoc_thuc_hien": [
    "A sai (phải là $S = \\dfrac{abc}{4R}$); B sai ($\\dfrac{a}{\\sin A} = 2R$); C sai (đó là $\\cos A$). D đúng: $m_c^2 = \\dfrac{2a^2 + 2b^2 - c^2}{4}$.",
    "Chọn D."
  ],
  "sourceQuestionId": "25f28b19-3e29-4ee1-b8ad-6c403d231d65",
  "maCauHoi": "CH_1789293034167_v00y"
}
```

```quiz
{
  "type": "multiple_choice",
  "question": "Tính số đo góc $A$ của tam giác $ABC$ biết $a^2 = b^2 + c^2 + \\sqrt{2}bc$.",
  "options": [
    "$60^\\circ$.",
    "$45^\\circ$.",
    "$135^\\circ$.",
    "$150^\\circ$."
  ],
  "answerIndex": 2,
  "phuong_phap_giai": "So sánh với định lí côsin $a^2 = b^2 + c^2 - 2bc\\cos A$.",
  "cac_buoc_thuc_hien": [
    "$-2bc\\cos A = \\sqrt{2}bc \\Rightarrow \\cos A = -\\dfrac{\\sqrt{2}}{2} \\Rightarrow \\widehat{A} = 135^\\circ$.",
    "Chọn C."
  ],
  "sourceQuestionId": "8e49234e-f8d8-436d-a4a4-7807c12693b8",
  "maCauHoi": "CH_1789292862147_022d"
}
```

```quiz
{
  "type": "multiple_choice",
  "question": "Cho tam giác $ABC$ có $b^2 + c^2 - a^2 = \\sqrt{3}bc$. Lựa chọn mệnh đề đúng.",
  "options": [
    "$100^\\circ > \\widehat{BAC} > 50^\\circ$.",
    "$\\widehat{ABC} + \\widehat{ACB} = 150^\\circ$.",
    "$\\widehat{ABC} > 160^\\circ$.",
    "$\\widehat{BAC} = 60^\\circ$."
  ],
  "answerIndex": 1,
  "phuong_phap_giai": "Tính $\\cos A$ bằng hệ quả định lí côsin.",
  "cac_buoc_thuc_hien": [
    "$\\cos A = \\dfrac{b^2 + c^2 - a^2}{2bc} = \\dfrac{\\sqrt{3}}{2} \\Rightarrow \\widehat{A} = 30^\\circ$, suy ra $\\widehat{B} + \\widehat{C} = 150^\\circ$.",
    "Chọn B."
  ],
  "sourceQuestionId": "4a001262-687e-4f90-bb86-47285239f5a2",
  "maCauHoi": "CH_1789292862148_h8fe"
}
```

---

## 💡 DẠNG 5: ỨNG DỤNG THỰC TẾ CỦA HỆ THỨC LƯỢNG TRONG TAM GIÁC

### 🛠 Phương pháp giải

#### Bước 1: Vẽ hình, đặt tên điểm, chuyển lời văn thành tam giác
* "Góc nâng / góc nhìn so với phương ngang" là góc giữa đường ngắm và **đường nằm ngang**; vật thẳng đứng (tháp, cây) tạo góc vuông với mặt đất.
* Hai vị trí quan sát thẳng hàng với chân tháp: tam giác có một góc là **góc ngoài** ($\color{blue} 180^\circ - $ góc nâng ở vị trí gần) và góc ở đỉnh bằng **hiệu hai góc nâng**.
* Hướng đi $\color{blue} N\alpha^\circ E$, $\color{blue} S\beta^\circ E$…: góc giữa hai hướng đi tính từ phương bắc - nam.

#### Bước 2: Chọn định lí
Biết hai góc và một cạnh → **định lí sin** tìm cạnh nghiêng; biết hai đoạn đường và góc giữa chúng → **định lí côsin** tìm khoảng cách thẳng.

#### Bước 3: Đổi ra đại lượng đề hỏi
Chiều cao $\color{blue} =$ cạnh nghiêng $\color{blue} \times \sin$(góc nâng), cộng thêm chiều cao máy đo/tầm mắt nếu có; quãng đường tiết kiệm $\color{blue} =$ đường cũ $\color{blue} -$ đường hầm; thời gian $\color{blue} =$ quãng đường $\color{blue} \div$ vận tốc (chú ý đơn vị km - m, giờ - phút).

---

### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** toàn bộ phần số. Bấm **một biểu thức trọn vẹn** dạng $\color{blue} \dfrac{AB\sin\alpha}{\sin\gamma}\cdot\sin\beta$ rồi mới làm tròn: `20` `×` `sin` `125` `°'"` `÷` `sin` `40` `°'"` `×` `sin` `75` `°'"` `=`. Góc có phút nhập bằng phím `°'"` giữa độ và phút.

> ⚠️ Kết quả đề hỏi "làm tròn đến hàng phần mười" mà phương án cách nhau đúng $\color{blue} 0{,}1$: nhập lại cả biểu thức, đừng chép số trung gian làm tròn.

---

> ### 📌 Ví dụ mẫu
>
> Từ hai vị trí $\color{blue} A$ và $\color{blue} B$ cách nhau $\color{blue} 15$ m trên mặt đất, thẳng hàng với chân $\color{blue} C$ của một toà nhà ($\color{blue} B$ nằm giữa $\color{blue} A$ và $\color{blue} C$), người ta nhìn thấy đỉnh $\color{blue} D$ của toà nhà dưới góc nâng $\color{blue} 35^\circ$ (tại $\color{blue} A$) và $\color{blue} 40^\circ$ (tại $\color{blue} B$). Tính chiều cao $\color{blue} CD$ (làm tròn đến hàng phần mười).
>
> Hướng dẫn giải:
> **Tam giác $\color{blue} ABD$:** $\color{blue} \widehat{DAB} = 35^\circ$; $\color{blue} \widehat{ABD} = 180^\circ - 40^\circ = 140^\circ$ (góc ngoài); $\color{blue} \widehat{ADB} = 40^\circ - 35^\circ = 5^\circ$.
> Định lí sin: $\color{blue} BD = \dfrac{AB\sin\widehat{DAB}}{\sin\widehat{ADB}} = \dfrac{15\sin 35^\circ}{\sin 5^\circ} \approx 98{,}7$ (m).
> **Tam giác $\color{blue} BCD$ vuông tại $\color{blue} C$:** $\color{blue} CD = BD\sin 40^\circ = \dfrac{15\sin 35^\circ\sin 40^\circ}{\sin 5^\circ} \approx 63{,}5$ (m).

```quiz
{
  "type": "multiple_choice",
  "question": "Nhà bạn Bình có gác lửng cao so với nền nhà là $3$ m. Ba của bạn Bình cần đặt một chiếc thang đi lên gác, biết khi đặt thang phải để thang tạo với mặt đất một góc $70^\\circ$ thì đảm bảo sự an toàn khi sử dụng. Chiều dài của chiếc thang cần làm là (làm tròn đến hàng phần trăm theo đơn vị mét)",
  "options": [
    "$3$.",
    "$3{,}19$.",
    "$3{,}5$.",
    "$3{,}4$."
  ],
  "answerIndex": 1,
  "phuong_phap_giai": "Tam giác vuông: $\\sin 70^\\circ = \\dfrac{3}{BC}$.",
  "cac_buoc_thuc_hien": [
    "$BC = \\dfrac{3}{\\sin 70^\\circ} \\approx 3{,}19$ (m).",
    "Chọn B."
  ],
  "sourceQuestionId": "af3af1d1-1056-4ef7-b83b-77f41fe30af2",
  "maCauHoi": "CH_1789444264871_nvxv"
}
```

```quiz
{
  "type": "multiple_choice",
  "question": "Để xác định bán kính của chiếc đĩa cổ hình tròn bị vỡ một phần, các nhà khảo cổ lấy ba điểm $A$, $B$, $C$ trên vành đĩa và tiến hành đo đạc thu được kết quả như sau: cạnh $AB \\approx 9{,}5$ cm, $\\widehat{ACB} \\approx 60^\\circ$. Bán kính của chiếc đĩa xấp xỉ là",
  "options": [
    "$5{,}5$ cm.",
    "$18$ cm.",
    "$11$ cm.",
    "$9{,}5$ cm."
  ],
  "answerIndex": 0,
  "phuong_phap_giai": "Định lí sin: $R = \\dfrac{AB}{2\\sin C}$.",
  "cac_buoc_thuc_hien": [
    "$R = \\dfrac{9{,}5}{2\\sin 60^\\circ} \\approx 5{,}5$ (cm).",
    "Chọn A."
  ],
  "sourceQuestionId": "f6fc588d-bea9-483e-8341-9c5e49f25aa8",
  "maCauHoi": "CH_1789444264855_8ot0"
}
```

```quiz
{
  "type": "multiple_choice",
  "question": "Mảnh vườn hình tam giác của gia đình bạn Minh có chiều dài các cạnh là $MN = 20$ m, $NP = 28$ m, $MP = 32$ m. Hỏi diện tích mảnh vườn của gia đình bạn Minh là bao nhiêu mét vuông (làm tròn đến hàng phần mười)?",
  "options": [
    "$316{,}7$ (m$^2$).",
    "$320$ (m$^2$).",
    "$277{,}1$ (m$^2$).",
    "$280$ (m$^2$)."
  ],
  "answerIndex": 2,
  "phuong_phap_giai": "Công thức Heron.",
  "cac_buoc_thuc_hien": [
    "$p = 40$; $S = \\sqrt{40 \\cdot 20 \\cdot 12 \\cdot 8} = \\sqrt{76800} \\approx 277{,}1$ (m$^2$).",
    "Chọn C."
  ],
  "sourceQuestionId": "c55c8bb7-4be6-46eb-8d47-006dfac10690",
  "maCauHoi": "CH_1789444264865_m500"
}
```
