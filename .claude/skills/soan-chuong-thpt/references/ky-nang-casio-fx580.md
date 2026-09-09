# Kĩ năng bấm máy Casio fx-580VN X

Tài liệu này để **soạn mục "Bấm máy Casio" trong từng dạng bài**. Không phải dạng nào cũng
bấm được — mục 1 nói rõ khi nào ghi, khi nào tuyệt đối không ghi.

---

## 1. Luật: khi nào ghi mục bấm máy, khi nào không

**Ghi khi** dạng ấy có một phép tính số cụ thể mà máy làm được: tính số hạng, tính tổng,
giải phương trình tìm $n$, liệt kê để dự đoán quy luật.

**KHÔNG ghi khi:**

- Dạng **chứng minh** (chứng minh một dãy là cấp số cộng, chứng minh bị chặn, quy nạp).
  Máy không chứng minh được. Ghi vào là dạy học sinh thay lời giải bằng vài số hạng đầu —
  đúng cái sai mà đề thi tự luận trừ điểm nặng nhất.
- Dạng hỏi **lý thuyết** hoặc hỏi **điều kiện tổng quát** (tìm điều kiện của tham số $m$ để
  dãy tăng với **mọi** $n$). Máy thử được vài giá trị, không thử được mọi $n$.
- Dạng mà bấm máy **lâu hơn** làm tay. Đừng nhét cho đủ.

**Câu phải nói rõ vai trò.** Máy tính ở đây là để **kiểm tra lại kết quả** và để **chọn
nhanh trong trắc nghiệm**. Bài tự luận vẫn phải trình bày lời giải; đáp số bấm máy ra
không phải là bài làm. Mỗi mục bấm máy nên có một câu nhắc đúng ý này, đừng để học sinh
hiểu là được phép thay thế.

---

## 2. Bốn công cụ dùng được, kèm phím

Máy phải ở phương thức **Calculate** (bấm `MENU` `1`) trừ khi nói khác.

| Công cụ | Phím | Làm được gì |
|---|---|---|
| **Σ (tổng)** | `SHIFT` `x` — chữ Σ in vàng phía trên phím | Cộng dồn một biểu thức theo biến chạy |
| **Ans / PreAns** | `Ans` là phím riêng · `PreAns` = `SHIFT` `Ans` | Dãy truy hồi: lấy lại một, hai kết quả liền trước |
| **TABLE** | `MENU` `8` | Lập bảng giá trị $f(x)$, liệt kê hàng loạt số hạng |
| **SOLVE** | `SHIFT` `CALC` | Giải gần đúng một phương trình một ẩn |

> Cú pháp Σ, giới hạn của Σ và SOLVE, cách dùng PreAns và số hiệu menu Table đều lấy từ
> [tài liệu chính hãng Casio](https://support.casio.com/global/vi/fx/manual/fx-580VNX_VI/).
> Riêng **tổ hợp phím vào Σ** lấy từ hướng dẫn tiếng Việt (tài liệu hãng chỉ in hình phím),
> nên khi soạn cứ mô tả thêm "chữ Σ in vàng phía trên phím" để thầy cô tự đối chiếu.

---

## 3. Giới hạn — chỗ học sinh sập, phải viết vào bài

Đây là phần đáng giá nhất của tài liệu này. Mấy giới hạn dưới đây **không hiện thông báo
gì cho ra hồn**, học sinh chỉ thấy máy báo lỗi hoặc ra số sai mà không hiểu vì sao.

**Σ:**
- Cận trên và cận dưới **phải là số nguyên**, bước nhảy cố định bằng 1, và
  $-10^{10} < a \le b < 10^{10}$.
- Trong biểu thức **không được lồng** thêm `Σ(`, `∫`, `d/dx(`, `∏(`, `Pol(`, `Rec(`, `÷R`.
- Cận trên lớn thì máy chạy lâu; bấm `AC` để dừng.

**SOLVE:**
- Chỉ chạy ở phương thức **Calculate**.
- Giải bằng **phương pháp Newton — nghiệm gần đúng**, không phải nghiệm chính xác. Ra
  `2.999999998` thì hiểu là 3, nhưng phải tự đối chiếu, đừng chép nguyên.
- **Kết quả phụ thuộc giá trị khởi đầu.** Đoán xa quá thì máy không tìm ra, hoặc tìm ra
  nghiệm khác. Không ra thì đổi giá trị khởi đầu gần nghiệm hơn.
- **Không giải được phương trình có chứa `Σ(`.** Hệ quả trực tiếp cho chương dãy số: bài
  *"tìm $n$ biết $S_n = 2024$"* **phải** thay $S_n$ bằng **công thức thu gọn** rồi mới
  SOLVE — viết dưới dạng Σ thì máy từ chối.
- Biến cần tìm không có mặt trong biểu thức thì báo `Variable ERROR`.

**PreAns:**
- **Chỉ dùng được ở phương thức Calculate**, và **bị xoá sạch khi chuyển sang phương thức
  khác**. Đang liệt kê dở dãy Fibonacci mà nhảy sang TABLE xem một cái là mất, quay lại
  phải bấm từ đầu.

**TABLE:**
- Chỉ lập bảng cho $f(x)$ theo một biến chạy đều. **Không nhận công thức truy hồi** — dãy
  cho bởi $u_{n+1} = f(u_n)$ thì phải dùng `Ans`/`PreAns`, đừng bắt học sinh mò trong TABLE.

---

## 4. Bốn công thức bấm máy hay dùng nhất

### 4.1 Liệt kê số hạng khi biết công thức tổng quát — TABLE

Dãy $u_n = \dfrac{2n+1}{n+2}$, cần $u_1$ đến $u_{10}$:

`MENU` `8` → nhập $f(x) = \dfrac{2x+1}{x+2}$ → `=` → Start: `1` `=` → End: `10` `=` →
Step: `1` `=`

Máy hiện bảng, cột $f(x)$ chính là dãy số hạng. Dùng phím lên xuống để đọc.

### 4.2 Liệt kê số hạng khi dãy cho bởi truy hồi — Ans / PreAns

Dãy $u_1 = 3$, $u_{n+1} = 2u_n + 1$:

`3` `=` → `2` `×` `Ans` `+` `1` `=` → rồi bấm `=` liên tiếp, mỗi lần ra một số hạng mới.

Truy hồi **hai bậc** như $u_{n+2} = u_{n+1} + u_n$ với $u_1 = u_2 = 1$:

`1` `=` → `1` `=` → `Ans` `+` `PreAns` `=` → bấm `=` liên tiếp. Ra `1, 1, 2, 3, 5, …`

### 4.3 Tính tổng — Σ

$S = \sum_{k=1}^{20} (3k - 1)$:

`SHIFT` `x` → nhập `3` `X` `−` `1` → `→` → cận dưới `1` → `→` → cận trên `20` → `=`

Với cấp số cộng, cấp số nhân thì **vẫn nên tính bằng công thức thu gọn trước**, rồi lấy Σ
để **kiểm tra lại** — nhanh và không sợ nhầm dấu.

### 4.4 Tìm $n$ — SOLVE

Cấp số cộng $u_1 = 5$, $d = 3$, hỏi số hạng thứ mấy bằng $92$:

`5` `+` `(` `X` `−` `1` `)` `×` `3` `ALPHA` `CALC` (dấu `=`) `92` → `SHIFT` `CALC` →
máy hỏi giá trị khởi đầu, nhập một số hợp lý (ví dụ `10`) → `=`

Ra $X = 30$. Nhớ đối chiếu: $n$ phải là **số nguyên dương**; máy ra `29.999…` thì là 30,
ra `30.4` thì kết luận **không có** số hạng nào bằng 92.

---

## 5. Bảng tra: chương Dãy số – Cấp số cộng – Cấp số nhân

| Dạng | Bấm máy được gì | Ghi chú bắt buộc |
|---|---|---|
| Xác định các số hạng của dãy | TABLE (tổng quát) · Ans/PreAns (truy hồi) | TABLE không nhận truy hồi |
| Dự đoán công thức tổng quát | Ans/PreAns liệt kê 6–8 số hạng rồi đoán quy luật | Đoán xong **vẫn phải chứng minh quy nạp** |
| Xét tính tăng giảm | TABLE nhìn cột $f(x)$ đi lên hay đi xuống | Chỉ để **dự đoán**; lời giải phải xét $u_{n+1} - u_n$ |
| Dãy bị chặn | TABLE với $n$ lớn để đoán chặn trên/dưới | Như trên — vài chục số hạng không phải chứng minh |
| Xác định số hạng, công sai / công bội | SOLVE tìm $n$ · giải hệ hai ẩn bằng `MENU` `9` | SOLVE ra nghiệm gần đúng |
| Tính tổng các số hạng | Σ, hoặc công thức thu gọn rồi Σ kiểm lại | Tìm $n$ từ $S_n$ thì **không** được để Σ trong SOLVE |
| Tìm công thức cấp số cộng / cấp số nhân | Giải hệ bằng `MENU` `9` | |
| Chứng minh (là CSC, là CSN, quy nạp) | **KHÔNG** | Máy không chứng minh được — đừng ghi mục bấm máy |
| Toán tổng hợp | Tuỳ câu | Chỉ ghi khi thật sự rút ngắn được |

---

## 6. Khuôn viết trong bài giảng

Đặt **sau** phần *Phương pháp giải*, **trước** *Ví dụ mẫu* — học sinh phải hiểu cách làm
tay đã, rồi mới biết máy giúp được khúc nào.

```markdown
### 🖩 Bấm máy Casio fx-580VN X

**Việc máy làm giúp:** <một câu, nói rõ máy làm khúc nào>

| Bước | Bấm |
|---|---|
| 1 | ... |
| 2 | ... |

> ⚠️ <giới hạn cụ thể của dạng này, lấy từ mục 3>
> Máy chỉ để kiểm tra lại và chọn nhanh trắc nghiệm — bài tự luận vẫn phải trình bày.
```

Phím viết trong dấu nháy ngược: `SHIFT`, `MENU` `8`, `Ans`. Đừng viết "bấm nút màu vàng" —
thầy cô đọc trên bảng chiếu không thấy màu.
