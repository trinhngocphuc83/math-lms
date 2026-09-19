# 📚 BÀI 1: TỈ SỐ LƯỢNG GIÁC CỦA GÓC NHỌN

---

# PHẦN 1: TÓM TẮT LÝ THUYẾT TRỌNG TÂM

---

### 1. Khái niệm tỉ số lượng giác của góc nhọn

Cho góc nhọn $\alpha$. Xét tam giác $ABC$ vuông tại $A$ có $\widehat{B} = \alpha$. Khi đó $AC$ là **cạnh đối**, $AB$ là **cạnh kề** của góc $\alpha$, $BC$ là **cạnh huyền**.

- $\sin \alpha = \dfrac{\text{cạnh đối}}{\text{cạnh huyền}} = \dfrac{AC}{BC}$
- $\cos \alpha = \dfrac{\text{cạnh kề}}{\text{cạnh huyền}} = \dfrac{AB}{BC}$
- $\tan \alpha = \dfrac{\text{cạnh đối}}{\text{cạnh kề}} = \dfrac{AC}{AB}$
- $\cot \alpha = \dfrac{\text{cạnh kề}}{\text{cạnh đối}} = \dfrac{AB}{AC}$

**Mẹo nhớ:** *"Sin đi học – Cos không hư – Tan đoàn kết – Cot kết đoàn"* (Sin = **Đ**ối/**H**uyền, Cos = **K**ề/**H**uyền, Tan = **Đ**ối/**K**ề, Cot = **K**ề/**Đ**ối).

- **Chú ý:** Với góc nhọn $\alpha$ ta luôn có $0 < \sin \alpha < 1$, $0 < \cos \alpha < 1$ (vì cạnh huyền là cạnh dài nhất) và $\tan \alpha \cdot \cot \alpha = 1$, tức là $\cot \alpha = \dfrac{1}{\tan \alpha}$.

{{Q:CH_1789054973577_kuvv}}

---

### 2. Tỉ số lượng giác của các góc đặc biệt

$$\begin{array}{|c|c|c|c|} \hline \alpha & 30^\circ & 45^\circ & 60^\circ \\ \hline \sin \alpha & \dfrac{1}{2} & \dfrac{\sqrt{2}}{2} & \dfrac{\sqrt{3}}{2} \\[6pt] \hline \cos \alpha & \dfrac{\sqrt{3}}{2} & \dfrac{\sqrt{2}}{2} & \dfrac{1}{2} \\[6pt] \hline \tan \alpha & \dfrac{\sqrt{3}}{3} & 1 & \sqrt{3} \\[6pt] \hline \cot \alpha & \sqrt{3} & 1 & \dfrac{\sqrt{3}}{3} \\[6pt] \hline \end{array}$$

- **Cách nhớ:** Dòng $\sin$ tăng dần $\dfrac{\sqrt{1}}{2}, \dfrac{\sqrt{2}}{2}, \dfrac{\sqrt{3}}{2}$; dòng $\cos$ đọc ngược lại; $\tan = \dfrac{\sin}{\cos}$.

{{Q:CH_1789054973577_0e3b}}

---

### 3. Tỉ số lượng giác của hai góc phụ nhau

Nếu hai góc **phụ nhau** ($\alpha + \beta = 90^\circ$) thì **sin góc này bằng côsin góc kia, tang góc này bằng côtang góc kia**:

$$\sin \alpha = \cos \beta, \quad \cos \alpha = \sin \beta, \quad \tan \alpha = \cot \beta, \quad \cot \alpha = \tan \beta.$$

- **Hệ quả hay dùng:** $\sin \alpha = \cos (90^\circ - \alpha)$, $\tan \alpha = \cot (90^\circ - \alpha)$. Ví dụ $\sin 70^\circ = \cos 20^\circ$, $\tan 25^\circ = \cot 65^\circ$.
- Trong tam giác $ABC$ vuông tại $A$, hai góc $B$ và $C$ phụ nhau nên $\sin B = \cos C$, $\tan B = \cot C$.

{{Q:CH_1789054973577_pldz}}

---

### 4. Dùng máy tính cầm tay tính tỉ số lượng giác và tìm góc

- **Đặt máy ở chế độ độ:** bấm `SHIFT` `MENU` (SETUP) → chọn *Angle Unit* → *Degree* (màn hình hiện chữ **D**).
- **Tính $\sin$, $\cos$, $\tan$:** bấm phím tương ứng, nhập số đo góc, bấm `°'"` để nhập độ – phút. Ví dụ $\sin 32^\circ 15'$: `sin` `32` `°'"` `15` `°'"` `=` $\approx 0{,}5336$.
- **Tính $\cot$:** $\cot \alpha = \dfrac{1}{\tan \alpha}$ — bấm `1` `÷` `tan` góc `=`, hoặc bấm $\tan$ rồi bấm `x⁻¹`.
- **Tìm góc khi biết $\sin$, $\cos$, $\tan$:** dùng `SHIFT` `sin` ($\sin^{-1}$), `SHIFT` `cos`, `SHIFT` `tan`, rồi bấm `°'"` để đổi kết quả sang độ – phút – giây.
- **Tìm góc khi biết $\cot \alpha = m$:** tính $\tan \alpha = \dfrac{1}{m}$ rồi bấm `SHIFT` `tan` `(` `1` `÷` `m` `)` `=`.

{{Q:CH_1785600354339_0gjx}}

---

# PHẦN 2: PHÂN DẠNG BÀI TẬP & PHƯƠNG PHÁP GIẢI

---

## 💡 DẠNG 1: TÍNH TỈ SỐ LƯỢNG GIÁC CỦA GÓC NHỌN TRONG TAM GIÁC VUÔNG

### 💡 Phương pháp giải
- **Bước 1:** Xác định tam giác vuông chứa góc cần tính; gọi tên **cạnh đối, cạnh kề, cạnh huyền** của góc đó.
- **Bước 2:** Nếu chưa đủ ba cạnh, dùng **định lí Pythagore** $BC^2 = AB^2 + AC^2$ để tìm cạnh còn thiếu.
- **Bước 3:** Lập tỉ số theo định nghĩa: $\sin = \dfrac{\text{đối}}{\text{huyền}}$, $\cos = \dfrac{\text{kề}}{\text{huyền}}$, $\tan = \dfrac{\text{đối}}{\text{kề}}$, $\cot = \dfrac{\text{kề}}{\text{đối}}$. Rút gọn phân số.

---

> ### 📌 Ví dụ mẫu
>
> Cho tam giác $ABC$ vuông tại $A$ có $AB = 6$ cm, $AC = 8$ cm. Tính các tỉ số lượng giác của góc $B$ và góc $C$.
>
> Hướng dẫn giải:
>
> Theo định lí Pythagore: $BC = \sqrt{AB^2 + AC^2} = \sqrt{36 + 64} = 10$ (cm).
>
> Với góc $B$: cạnh đối là $AC = 8$, cạnh kề là $AB = 6$, cạnh huyền $BC = 10$:
> $$\sin B = \dfrac{AC}{BC} = \dfrac{4}{5},\quad \cos B = \dfrac{AB}{BC} = \dfrac{3}{5},\quad \tan B = \dfrac{AC}{AB} = \dfrac{4}{3},\quad \cot B = \dfrac{3}{4}.$$
>
> Với góc $C$ (phụ với góc $B$): $\sin C = \cos B = \dfrac{3}{5}$, $\cos C = \sin B = \dfrac{4}{5}$, $\tan C = \cot B = \dfrac{3}{4}$, $\cot C = \dfrac{4}{3}$.

{{Q:CH_1785600354339_ukil}}

{{Q:CH_1789186358200_t1tt}}

---

## 💡 DẠNG 2: TỈ SỐ LƯỢNG GIÁC CỦA HAI GÓC PHỤ NHAU VÀ CÁC GÓC ĐẶC BIỆT

### 💡 Phương pháp giải
- **Đưa về góc phụ nhau:** $\sin \alpha = \cos(90^\circ - \alpha)$, $\tan \alpha = \cot(90^\circ - \alpha)$. Nhờ đó viết mọi tỉ số về tỉ số của góc nhỏ hơn $45^\circ$, hoặc **ghép cặp** hai góc có tổng $90^\circ$ để rút gọn.
- **Cặp ghép hay gặp:** $\sin^2 \alpha + \sin^2 (90^\circ - \alpha) = \sin^2 \alpha + \cos^2 \alpha = 1$; $\tan \alpha \cdot \tan (90^\circ - \alpha) = \tan \alpha \cdot \cot \alpha = 1$; $\dfrac{\sin \alpha}{\cos (90^\circ - \alpha)} = 1$.
- **Góc đặc biệt:** thay giá trị trong bảng $30^\circ, 45^\circ, 60^\circ$ rồi tính; nhớ $\sin^2 45^\circ = \cos^2 45^\circ = \dfrac{1}{2}$.

---

> ### 📌 Ví dụ mẫu
>
> Không dùng máy tính, tính giá trị các biểu thức:
> a) $A = \sin 25^\circ - \cos 65^\circ + \tan 40^\circ \cdot \tan 50^\circ$;
> b) $B = \sin^2 20^\circ + \sin^2 70^\circ + \cos^2 45^\circ$.
>
> Hướng dẫn giải:
>
> a) Vì $25^\circ + 65^\circ = 90^\circ$ nên $\cos 65^\circ = \sin 25^\circ$; vì $40^\circ + 50^\circ = 90^\circ$ nên $\tan 50^\circ = \cot 40^\circ$.
> Do đó $A = \sin 25^\circ - \sin 25^\circ + \tan 40^\circ \cdot \cot 40^\circ = 0 + 1 = 1$.
>
> b) Vì $20^\circ + 70^\circ = 90^\circ$ nên $\sin 70^\circ = \cos 20^\circ$, suy ra $\sin^2 20^\circ + \sin^2 70^\circ = \sin^2 20^\circ + \cos^2 20^\circ = 1$.
> Lại có $\cos^2 45^\circ = \left(\dfrac{\sqrt{2}}{2}\right)^2 = \dfrac{1}{2}$. Vậy $B = 1 + \dfrac{1}{2} = \dfrac{3}{2}$.

{{Q:CH_1789186358205_fekx}}

{{Q:CH_1789186358231_r3mi}}

{{Q:CH_1789186358217_ep42}}

---

## 💡 DẠNG 3: DÙNG MÁY TÍNH CẦM TAY TÍNH TỈ SỐ LƯỢNG GIÁC VÀ TÌM GÓC

### 💡 Phương pháp giải
- **Tính tỉ số lượng giác của góc cho trước:** kiểm tra máy ở chế độ **D** (độ) → bấm `sin`/`cos`/`tan`, nhập góc (dùng `°'"` cho phút) → làm tròn theo yêu cầu. Với $\cot$: lấy $1 : \tan$.
- **Tìm góc khi biết một tỉ số lượng giác:** bấm `SHIFT` `sin`/`cos`/`tan`, nhập giá trị → `=` → bấm `°'"` để đọc độ, phút, giây → làm tròn đến phút (giây $\ge 30$ thì làm tròn lên).
- **Bài toán hình:** lập tỉ số lượng giác của góc cần tìm từ hai cạnh đã biết (theo định nghĩa) rồi mới bấm máy tìm góc.

### 🖩 Bấm máy Casio fx-580VN X

| Việc | Bấm | Kết quả |
|---|---|---|
| $\sin 27^\circ$ | `sin` `27` `=` | $0{,}4540$ |
| $\cos 32^\circ 15'$ | `cos` `32` `°'"` `15` `°'"` `=` | $0{,}8457$ |
| $\cot 35^\circ 23'$ | `1` `÷` `tan` `35` `°'"` `23` `°'"` `=` | $1{,}4080$ |
| $\sin \alpha = 0{,}3214 \Rightarrow \alpha$ | `SHIFT` `sin` `0.3214` `=` `°'"` | $18^\circ 44' 51'' \approx 18^\circ 45'$ |
| $\cot \alpha = 1{,}5384 \Rightarrow \alpha$ | `SHIFT` `tan` `(` `1` `÷` `1.5384` `)` `=` `°'"` | $33^\circ 1'$ |

---

> ### 📌 Ví dụ mẫu
>
> Một cái thang dài $5$ m dựa vào tường, chân thang cách chân tường $2$ m. Tính góc $\alpha$ tạo bởi thang và mặt đất (làm tròn đến độ).
>
> Hướng dẫn giải:
>
> Thang, tường và mặt đất tạo thành tam giác vuông tại chân tường; thang là **cạnh huyền** ($5$ m), khoảng cách chân thang – chân tường là **cạnh kề** của góc $\alpha$ ($2$ m).
>
> Theo định nghĩa: $\cos \alpha = \dfrac{2}{5} = 0{,}4$.
>
> Bấm `SHIFT` `cos` `0.4` `=` được $\alpha \approx 66{,}42^\circ \approx 66^\circ$.

{{Q:CH_1789186358220_sotc}}

{{Q:CH_1789186716724_xh6w}}

---

## 💡 DẠNG 4: TÍNH GIÁ TRỊ, RÚT GỌN BIỂU THỨC LƯỢNG GIÁC

### 💡 Phương pháp giải
Với góc nhọn $\alpha$, ta có các **hệ thức cơ bản** (suy ra từ định nghĩa và định lí Pythagore):
- $\sin^2 \alpha + \cos^2 \alpha = 1$;
- $\tan \alpha = \dfrac{\sin \alpha}{\cos \alpha}$, $\cot \alpha = \dfrac{\cos \alpha}{\sin \alpha}$, $\tan \alpha \cdot \cot \alpha = 1$;
- $1 + \tan^2 \alpha = \dfrac{1}{\cos^2 \alpha}$, $1 + \cot^2 \alpha = \dfrac{1}{\sin^2 \alpha}$.

**Tính các tỉ số còn lại khi biết một tỉ số:** biết $\sin$ (hoặc $\cos$) → dùng $\sin^2 + \cos^2 = 1$ tìm tỉ số kia (lấy giá trị **dương** vì góc nhọn) → $\tan = \dfrac{\sin}{\cos}$, $\cot = \dfrac{1}{\tan}$. Biết $\tan$ → dùng $1 + \tan^2 = \dfrac{1}{\cos^2}$.

**Rút gọn biểu thức:** đổi $\tan, \cot$ về $\sin, \cos$; nhóm theo hằng đẳng thức; thay $\sin^2 \alpha + \cos^2 \alpha = 1$.

---

> ### 📌 Ví dụ mẫu
>
> Cho góc nhọn $\alpha$ có $\cos \alpha = \dfrac{5}{13}$. Tính $\sin \alpha$, $\tan \alpha$, $\cot \alpha$.
>
> Hướng dẫn giải:
>
> Vì $\sin^2 \alpha + \cos^2 \alpha = 1$ nên $\sin^2 \alpha = 1 - \dfrac{25}{169} = \dfrac{144}{169}$. Do $\alpha$ nhọn, $\sin \alpha > 0$ nên $\sin \alpha = \dfrac{12}{13}$.
>
> $\tan \alpha = \dfrac{\sin \alpha}{\cos \alpha} = \dfrac{12}{13} : \dfrac{5}{13} = \dfrac{12}{5}$; $\cot \alpha = \dfrac{1}{\tan \alpha} = \dfrac{5}{12}$.

{{Q:CH_1785600354339_fvzh}}

{{Q:CH_1785600354339_pn1g}}

{{Q:CH_1789186358234_qyfc}}

---

## 💡 DẠNG 5: CHỨNG MINH HỆ THỨC LƯỢNG GIÁC

### 💡 Phương pháp giải
- **Cách 1 – Dùng định nghĩa:** vẽ tam giác $ABC$ vuông tại $A$ với $\widehat{B} = \alpha$; thay $\sin \alpha = \dfrac{AC}{BC}$, $\cos \alpha = \dfrac{AB}{BC}$, … vào hai vế rồi biến đổi về cùng một biểu thức (thường dùng $AB^2 + AC^2 = BC^2$).
- **Cách 2 – Dùng hệ thức cơ bản:** biến đổi vế phức tạp bằng $\sin^2 \alpha + \cos^2 \alpha = 1$, $\tan \alpha = \dfrac{\sin \alpha}{\cos \alpha}$, các hằng đẳng thức $a^2 - b^2$, $(a \pm b)^2$, $a^3 + b^3$.
- **Cách 3 – Biến đổi tương đương:** với đẳng thức chứa phân thức, quy đồng rồi chứng minh tử thức bằng nhau.

---

> ### 📌 Ví dụ mẫu
>
> Cho góc nhọn $\alpha$. Chứng minh rằng $1 + \tan^2 \alpha = \dfrac{1}{\cos^2 \alpha}$.
>
> Hướng dẫn giải:
>
> Ta có $1 + \tan^2 \alpha = 1 + \dfrac{\sin^2 \alpha}{\cos^2 \alpha} = \dfrac{\cos^2 \alpha + \sin^2 \alpha}{\cos^2 \alpha} = \dfrac{1}{\cos^2 \alpha}$ (vì $\sin^2 \alpha + \cos^2 \alpha = 1$).
>
> Vậy đẳng thức được chứng minh. Tương tự, $1 + \cot^2 \alpha = \dfrac{1}{\sin^2 \alpha}$.

{{Q:CH_1789186358233_5k5k}}
