# 📚 BÀI 2: MỘT SỐ HỆ THỨC GIỮA CẠNH, GÓC TRONG TAM GIÁC VUÔNG VÀ ỨNG DỤNG

---

# PHẦN 1: TÓM TẮT LÝ THUYẾT TRỌNG TÂM

---

### 1. Hệ thức giữa cạnh và góc trong tam giác vuông

Cho tam giác $ABC$ vuông tại $A$ có $BC = a$, $AC = b$, $AB = c$. Khi đó:

- **Cạnh góc vuông = cạnh huyền × sin góc đối = cạnh huyền × côsin góc kề:**
  $$b = a \sin B = a \cos C, \qquad c = a \sin C = a \cos B.$$
- **Cạnh góc vuông này = cạnh góc vuông kia × tang góc đối = cạnh góc vuông kia × côtang góc kề:**
  $$b = c \tan B = c \cot C, \qquad c = b \tan C = b \cot B.$$

**Cách nhớ:** muốn tính một cạnh góc vuông, nhìn xem góc đã biết là **góc đối** hay **góc kề** với cạnh ấy: có cạnh huyền thì dùng $\sin$ (đối) / $\cos$ (kề); có cạnh góc vuông kia thì dùng $\tan$ (đối) / $\cot$ (kề).

- **Suy ra:** cạnh huyền $a = \dfrac{b}{\sin B} = \dfrac{b}{\cos C}$; và $\tan B = \dfrac{b}{c}$ để tìm góc khi biết hai cạnh góc vuông.

{{Q:CH_1789054973577_azfd}}

---

### 2. Giải tam giác vuông

**Giải tam giác vuông** là tính tất cả các cạnh và các góc còn lại của tam giác vuông khi đã biết **hai yếu tố** (trong đó có ít nhất **một cạnh**), không kể góc vuông.

Ba trường hợp thường gặp (tam giác $ABC$ vuông tại $A$):

| Đã biết | Cách giải |
|---|---|
| Hai cạnh góc vuông $b, c$ | $a = \sqrt{b^2 + c^2}$; $\tan B = \dfrac{b}{c} \Rightarrow \widehat{B}$; $\widehat{C} = 90^\circ - \widehat{B}$. |
| Cạnh huyền $a$ và một cạnh góc vuông $b$ | $c = \sqrt{a^2 - b^2}$; $\sin B = \dfrac{b}{a} \Rightarrow \widehat{B}$; $\widehat{C} = 90^\circ - \widehat{B}$. |
| Một cạnh và một góc nhọn (ví dụ $a$ và $\widehat{B}$) | $\widehat{C} = 90^\circ - \widehat{B}$; $b = a \sin B$; $c = a \cos B$. |

- **Lưu ý khi làm tròn:** góc thường làm tròn đến độ (hoặc phút), cạnh làm tròn đến chữ số thập phân theo đề bài; **tính bằng số liệu gốc**, không dùng số đã làm tròn để tính tiếp.

{{Q:CH_1785600354339_y8qh}}

---

### 3. Ứng dụng thực tế: góc nâng, góc hạ

- **Góc nâng** là góc tạo bởi tia nhìn **lên** vật và phương nằm ngang; **góc hạ** là góc tạo bởi tia nhìn **xuống** vật và phương nằm ngang.
- Do hai đường nằm ngang song song nên **góc hạ từ vật xuống người quan sát bằng góc nâng từ người quan sát lên vật** (hai góc so le trong).
- **Mô hình chung:** chiều cao (cột, tháp, cây, toà nhà) là **cạnh đối** của góc nâng; khoảng cách trên mặt đất là **cạnh kề**; tia nhìn, thang, dây, dốc là **cạnh huyền**. Từ đó:
  $$\text{chiều cao} = \text{khoảng cách} \times \tan(\text{góc nâng}), \qquad \text{khoảng cách} = \dfrac{\text{chiều cao}}{\tan(\text{góc nâng})}.$$
- Nếu mắt người quan sát cách mặt đất $h_0$ thì **cộng thêm** $h_0$ vào chiều cao tính được.

{{Q:CH_1789186716743_zgyb}}

---

# PHẦN 2: PHÂN DẠNG BÀI TẬP & PHƯƠNG PHÁP GIẢI

---

## 💡 DẠNG 1: TÍNH CẠNH, GÓC TRONG TAM GIÁC VUÔNG THEO HỆ THỨC LƯỢNG

### 💡 Phương pháp giải
- **Bước 1:** Vẽ hình, đánh dấu góc vuông, ghi số liệu đã biết lên hình.
- **Bước 2:** Với cạnh cần tính, xác định góc đã biết là **đối** hay **kề** với nó và cạnh đã biết là **huyền** hay **góc vuông**, rồi chọn đúng hệ thức:
  - đối + huyền → $\sin$; kề + huyền → $\cos$; đối + cạnh góc vuông kia → $\tan$; kề + cạnh góc vuông kia → $\cot$.
- **Bước 3:** Bấm máy, làm tròn theo yêu cầu. Muốn tìm **góc**: lập tỉ số từ hai cạnh đã biết rồi dùng `SHIFT` `sin`/`cos`/`tan`.

---

> ### 📌 Ví dụ mẫu
>
> Cho tam giác $ABC$ vuông tại $A$ có $BC = 10$ cm, $\widehat{B} = 36^\circ$. Tính $AB$, $AC$ (làm tròn đến chữ số thập phân thứ hai).
>
> Hướng dẫn giải:
>
> $AC$ là cạnh **đối** của góc $B$, $BC$ là cạnh huyền nên $AC = BC \cdot \sin B = 10 \sin 36^\circ \approx 10 \cdot 0{,}5878 \approx 5{,}88$ (cm).
>
> $AB$ là cạnh **kề** của góc $B$ nên $AB = BC \cdot \cos B = 10 \cos 36^\circ \approx 10 \cdot 0{,}8090 \approx 8{,}09$ (cm).
>
> *Kiểm tra:* $5{,}88^2 + 8{,}09^2 \approx 34{,}6 + 65{,}4 = 100 = 10^2$ ✓.

{{Q:CH_1785600354339_w7n0}}

{{Q:CH_1785600354339_vqw5}}

---

## 💡 DẠNG 2: GIẢI TAM GIÁC VUÔNG

### 💡 Phương pháp giải
- Liệt kê **hai yếu tố đã biết** rồi tra bảng ba trường hợp ở Phần 1, mục 2.
- **Thứ tự tính:** góc nhọn còn lại trước (nếu biết một góc) → cạnh theo hệ thức $\sin, \cos, \tan$ → cạnh cuối có thể kiểm tra lại bằng Pythagore.
- Biết **hai cạnh**: tìm cạnh thứ ba bằng Pythagore, tìm **một** góc bằng tỉ số lượng giác (chọn tỉ số dùng đúng hai cạnh **đề cho**, không dùng cạnh vừa làm tròn), góc còn lại lấy $90^\circ$ trừ đi.

---

> ### 📌 Ví dụ mẫu
>
> Giải tam giác $ABC$ vuông tại $A$, biết $AB = 5$ cm, $AC = 12$ cm (góc làm tròn đến độ).
>
> Hướng dẫn giải:
>
> Cạnh huyền: $BC = \sqrt{AB^2 + AC^2} = \sqrt{25 + 144} = 13$ (cm).
>
> $\tan B = \dfrac{AC}{AB} = \dfrac{12}{5} = 2{,}4 \Rightarrow \widehat{B} \approx 67^\circ$ (bấm `SHIFT` `tan` `2.4`).
>
> $\widehat{C} = 90^\circ - \widehat{B} \approx 23^\circ$.
>
> Vậy $BC = 13$ cm, $\widehat{B} \approx 67^\circ$, $\widehat{C} \approx 23^\circ$.

---

## 💡 DẠNG 3: GIẢI TAM GIÁC NHỌN; TÍNH ĐƯỜNG CAO, DIỆN TÍCH BẰNG TỈ SỐ LƯỢNG GIÁC

### 💡 Phương pháp giải
- Tam giác **không vuông** thì **kẻ thêm đường cao** để tách thành hai tam giác vuông có chung cạnh đường cao.
- **Biết hai góc và cạnh xen giữa** ($BC = a$, $\widehat{B}$, $\widehat{C}$): kẻ $AH \perp BC$, đặt $AH = h$ thì $BH = h \cot B$, $CH = h \cot C$ và $BH + CH = a$, suy ra $h = \dfrac{a}{\cot B + \cot C}$.
- **Biết hai cạnh và góc xen giữa** ($AB$, $AC$, $\widehat{A}$): kẻ $BH \perp AC$ thì $BH = AB \sin A$, $AH = AB \cos A$, $HC = AC - AH$, rồi $BC = \sqrt{BH^2 + HC^2}$.
- **Diện tích:** $S = \dfrac{1}{2} \cdot \text{đáy} \cdot \text{đường cao}$, trong đó đường cao tính bằng $\sin$: $S_{ABC} = \dfrac{1}{2} AB \cdot AC \cdot \sin A$.

---

> ### 📌 Ví dụ mẫu
>
> Cho tam giác $ABC$ có $AB = 8$ cm, $AC = 5$ cm, $\widehat{A} = 60^\circ$. Tính đường cao $BH$ ($H \in AC$), diện tích tam giác $ABC$ và độ dài $BC$ (làm tròn đến chữ số thập phân thứ hai).
>
> Hướng dẫn giải:
>
> Trong tam giác $ABH$ vuông tại $H$: $BH = AB \sin A = 8 \sin 60^\circ = 8 \cdot \dfrac{\sqrt{3}}{2} = 4\sqrt{3} \approx 6{,}93$ (cm); $AH = AB \cos A = 8 \cdot \dfrac{1}{2} = 4$ (cm).
>
> Diện tích: $S = \dfrac{1}{2} AC \cdot BH = \dfrac{1}{2} \cdot 5 \cdot 4\sqrt{3} = 10\sqrt{3} \approx 17{,}32$ (cm²).
>
> $HC = AC - AH = 5 - 4 = 1$ (cm). Trong tam giác $BHC$ vuông tại $H$: $BC = \sqrt{BH^2 + HC^2} = \sqrt{48 + 1} = 7$ (cm).

{{Q:CH_1789186716737_1f88}}

{{Q:CH_1789186716717_p1n7}}

---

## 💡 DẠNG 4: ỨNG DỤNG THỰC TẾ — TÍNH CHIỀU CAO, KHOẢNG CÁCH, GÓC NÂNG, GÓC HẠ

### 💡 Phương pháp giải
- **Bước 1 – Vẽ mô hình:** vật thẳng đứng (cây, tháp, tường) ⟂ mặt đất; tia nhìn / tia nắng / thang / dốc là cạnh huyền → được **tam giác vuông**. Ghi rõ đâu là góc nâng (hạ), đâu là cạnh đã biết.
- **Bước 2 – Chọn hệ thức:** cần chiều cao khi biết khoảng cách → $\tan$; cần chiều cao khi biết chiều dài thang/dốc → $\sin$; cần góc khi biết hai cạnh → tỉ số lượng giác rồi bấm máy tìm góc.
- **Bước 3 – Tính và kết luận:** nhớ **cộng chiều cao mắt** (nếu có), ghi đơn vị, làm tròn đúng yêu cầu.
- **Hai lần quan sát** (hai góc nâng tới cùng một đỉnh): đặt chiều cao là $h$, viết hai khoảng cách $\dfrac{h}{\tan \alpha}$ và $\dfrac{h}{\tan \beta}$, hiệu (hoặc tổng) của chúng bằng khoảng cách hai vị trí quan sát → giải ra $h$.

---

> ### 📌 Ví dụ mẫu
>
> Một người đứng cách chân một toà tháp $40$ m, nhìn lên đỉnh tháp với góc nâng $52^\circ$. Biết mắt người đó cách mặt đất $1{,}6$ m. Tính chiều cao của tháp (làm tròn đến mét).
>
> Hướng dẫn giải:
>
> Gọi $O$ là mắt người, $H$ là điểm trên tháp ngang tầm mắt, $T$ là đỉnh tháp. Tam giác $OHT$ vuông tại $H$ có $OH = 40$ m và $\widehat{HOT} = 52^\circ$.
>
> $HT = OH \cdot \tan 52^\circ = 40 \tan 52^\circ \approx 40 \cdot 1{,}2799 \approx 51{,}2$ (m).
>
> Chiều cao tháp $= HT + 1{,}6 \approx 51{,}2 + 1{,}6 = 52{,}8 \approx 53$ (m).

{{Q:CH_1789186716740_f9s9}}

{{Q:CH_1789186716742_685c}}

{{Q:CH_1789186716725_hr1s}}

{{Q:CH_1789186358222_wo4f}}
