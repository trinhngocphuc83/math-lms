# TỔNG HỢP CÔNG THỨC CHƯƠNG 3: CÁC SỐ ĐẶC TRƯNG ĐO MỨC ĐỘ PHÂN TÁN

## 📖 1. ĐỌC BẢNG GHÉP NHÓM

- **Cỡ mẫu** | $n = n_1 + n_2 + \cdots + n_k$ | cộng hết các tần số
- **Giá trị đại diện của một nhóm** | $c_i = \dfrac{u_i + u_{i+1}}{2}$ | trung điểm nhóm, dùng cho mọi phép tính trung bình và phương sai
- **Tần số tích luỹ** | $C_m = n_1 + n_2 + \cdots + n_{m-1}$ | cộng dồn từ trái sang, dùng để tìm nhóm chứa tứ phân vị
- **Độ rộng nhóm** | $u_{i+1} - u_i$ | thường bằng nhau ở mọi nhóm, nhưng phải kiểm chứ đừng đoán

## 📖 2. KHOẢNG BIẾN THIÊN

- **Khoảng biến thiên (ghép nhóm)** | $R = u_{k+1} - u_1$ | đầu mút phải của nhóm cuối trừ đầu mút trái của nhóm đầu CÓ SỐ LIỆU
- **Khoảng biến thiên (không ghép nhóm)** | $R = x_{\max} - x_{\min}$ | lấy thẳng hai đầu dãy đã sắp
- **Nhóm rỗng ở hai đầu** | bỏ qua, không tính vào $R$ | bẫy hay gặp nhất của dạng này

## 📖 3. TỨ PHÂN VỊ VÀ KHOẢNG TỨ PHÂN VỊ

- **Tứ phân vị (ghép nhóm)** | $Q_i = u_m + \dfrac{\frac{i\,n}{4} - C}{n_m}\left(u_{m+1} - u_m\right)$ | $[u_m;u_{m+1})$ là nhóm đầu tiên có tích luỹ $\ge \frac{i\,n}{4}$
- **Mốc tìm nhóm chứa $Q_1$** | $\dfrac{n}{4}$ | dò trên dòng tần số tích luỹ
- **Mốc tìm nhóm chứa $Q_2$** | $\dfrac{n}{2}$ | $Q_2$ chính là trung vị
- **Mốc tìm nhóm chứa $Q_3$** | $\dfrac{3n}{4}$ |
- **Khoảng tứ phân vị** | $\Delta_Q = Q_3 - Q_1$ | đo độ phân tán của nửa giữa, không bị ngoại lệ kéo lệch
- **Tứ phân vị (không ghép nhóm)** | $Q_2$ là trung vị cả mẫu, $Q_1$ và $Q_3$ là trung vị nửa dưới và nửa trên | cỡ mẫu lẻ thì không lấy $Q_2$ vào hai nửa

## 📖 4. GIÁ TRỊ NGOẠI LỆ

- **Ngưỡng dưới** | $Q_1 - 1{,}5\,\Delta_Q$ | nhỏ hơn ngưỡng này là ngoại lệ
- **Ngưỡng trên** | $Q_3 + 1{,}5\,\Delta_Q$ | lớn hơn ngưỡng này là ngoại lệ

## 📖 5. PHƯƠNG SAI VÀ ĐỘ LỆCH CHUẨN

- **Số trung bình (ghép nhóm)** | $\overline{x} = \dfrac{n_1 c_1 + n_2 c_2 + \cdots + n_k c_k}{n}$ | dùng giá trị đại diện, không dùng đầu mút
- **Phương sai (theo định nghĩa)** | $S^2 = \dfrac{\sum n_i \left(c_i - \overline{x}\right)^2}{n}$ | chia cho $n$, không phải $n-1$
- **Phương sai (công thức nhanh)** | $S^2 = \dfrac{\sum n_i c_i^{\,2}}{n} - \overline{x}^{\,2}$ | gọn hơn khi bấm máy, khỏi trừ từng số
- **Độ lệch chuẩn** | $S = \sqrt{S^2}$ | cùng đơn vị với số liệu nên đọc được trực tiếp
- **Phương sai (không ghép nhóm)** | $S^2 = \dfrac{\sum x_i^{\,2}}{n} - \overline{x}^{\,2}$ | cùng một công thức, chỉ khác là mỗi số liệu tính một lần
- **Hệ số biến thiên** | $\dfrac{S}{\overline{x}}$ | so độ đồng đều của hai mẫu có số trung bình lệch nhau nhiều

## 📖 6. CHỌN THƯỚC ĐO NÀO

- **Cần nhanh, mẫu sạch** | $R$ | chỉ nhìn hai đầu, rất nhạy với ngoại lệ
- **Mẫu có giá trị bất thường** | $\Delta_Q$ | bỏ hai đuôi nên không bị kéo lệch
- **Cần dùng hết số liệu** | $S$ | đo độ lệch trung bình quanh $\overline{x}$
- **So hai mẫu khác cỡ hoặc khác đơn vị** | $\dfrac{S}{\overline{x}}$ | so số tuyệt đối là không công bằng

## 🖩 7. BẤM MÁY CASIO fx-580VN X

- **Vào thống kê một biến** | `MENU` `6` rồi `1` | Tính tkê 1-biến
- **Bật cột tần số** | `SHIFT` `MENU` → `▼` → `3` (Thống kê) → `1` (Mở) | máy mặc định TẮT, không bật thì không nhập tần số được
- **Nhập số liệu ghép nhóm** | cột `x` nhập $c_i$, cột `n` nhập $n_i$ | sang cột `n` bằng `▶` rồi `▲`
- **Đọc kết quả** | `OPTN` rồi `3` (Tính 1-biến) | cuộn `▼` để xem hết
- **Lấy đúng dòng** | $\sigma^2 x$ là $S^2$, $\sigma x$ là $S$ | dòng $s^2x$ và $sx$ chia cho $n-1$, KHÔNG dùng
- **Tứ phân vị của mẫu ghép nhóm** | máy hiện $Q_1$, $Q_3$ nhưng SAI so với công thức sách | máy coi số liệu là rời rạc, sách thì nội suy trong nhóm - phải tính tay
