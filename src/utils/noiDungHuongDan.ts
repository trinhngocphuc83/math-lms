/**
 * Noi dung trang huong dan soan bai - MOT nguon dung cho ca hai cho:
 * hop "Huong dan" trong trinh soan va tep docs/huong-dan-soan-bai.md.
 *
 * SUA O docs/huong-dan-soan-bai.md roi chay scratch/dung-huong-dan.py,
 * dung sua thang tep nay.
 */

export const NOI_DUNG_HUONG_DAN = `Bảng tra nhanh cho trình soạn bài. Mở lại bất cứ lúc nào bằng nút **❓ Hướng dẫn** ở đầu
trang soạn.

---

## 1. Thanh công cụ — nút nào làm gì

| Nút | Việc | Ghi chú |
|---|---|---|
| **Tiêu đề** (ô chọn) | Đặt cấp tiêu đề | *Tiêu đề bài · Mục lớn · Mục nhỏ · Ý phụ*. Hệ thống **tự tô màu và khung** cho từng cấp — **không cần gõ thẻ \`<span>\`** |
| **T** + số | Cỡ chữ | Bôi đen chữ trước rồi mới đổi |
| **Màu chữ** | Đổi màu | Bôi đen trước |
| **Giãn** | Giãn dòng | 1.0 / 1.15 / 1.5 / 2.0 |
| **B** / *I* / U | Đậm / nghiêng / gạch chân | |
| ☰ ☰ ☰ ☰ | Căn trái / giữa / phải / đều | |
| **• Danh sách** | Gạch đầu dòng | Bấm lần nữa để bỏ |
| **1. Danh sách** | Đánh số | Bấm lần nữa để bỏ |
| **⇥ Thụt vào** | Lùi vào một cấp | Hoặc nhấn **Tab** |
| **⇤ Thụt ra** | Lùi ra một cấp | Hoặc nhấn **Shift + Tab** |
| **🪄 Dọn thẻ** | Đổi thẻ HTML gõ tay về Markdown chuẩn | Hỏi trước, xem danh sách việc rồi mới đổi |
| **Σ Công thức** | Chèn công thức LaTeX | Có xem trước ngay |
| **Khung** | Bọc đoạn vào khung | |
| **Ảnh** | Chèn ảnh | |

### Phím tắt

| Phím | Việc |
|---|---|
| \`Tab\` / \`Shift+Tab\` | Thụt dòng vào / ra |
| \`Ctrl+B\` / \`Ctrl+I\` / \`Ctrl+U\` | Đậm / nghiêng / gạch chân |
| \`Ctrl+L\` / \`Ctrl+E\` / \`Ctrl+R\` / \`Ctrl+J\` | Căn trái / giữa / phải / đều |
| \`Esc\` | Đóng ô sửa, quay về xem thành phẩm |

---

## 2. Quy ước Markdown của hệ thống

| Gõ thế này | Ra thế này |
|---|---|
| \`# Tên bài\` | Tiêu đề bài — chữ lớn, có thanh màu |
| \`## 💡 DẠNG 1: ...\` | Tên dạng bài — viên màu cam |
| \`### 💡 Phương pháp giải\` | Mục nhỏ — viền chàm |
| \`- ý một\` | Gạch đầu dòng |
| \`  - ý con\` | Ý con (thụt 2 dấu cách) |
| \`> nội dung\` | Khung trích dẫn — dùng cho **Ví dụ mẫu** |
| \`---\` | **Ngắt trang** — sang slide mới khi trình chiếu |
| \`$x^2 + 1$\` | Công thức nằm trong dòng chữ |
| \`![Hình](địa-chỉ)\` | Chèn ảnh, cỡ vừa |
| \`![Hình](địa-chỉ "nho")\` | Ảnh **nhỏ** (cao tối đa 180px) |
| \`![Hình](địa-chỉ "vua")\` | Ảnh **vừa** (320px) — mặc định |
| \`![Hình](địa-chỉ "to")\` | Ảnh **to** (520px) |

### Hai ảnh nằm ngang

Đặt **hai dòng ảnh sát nhau, không có dòng trống ở giữa**:

\`\`\`
![Hình 1](địa-chỉ-1)
![Hình 2](địa-chỉ-2)
\`\`\`

Muốn xếp dọc thì **để một dòng trống** giữa hai dòng ảnh. Trình soạn có nút
**Xếp ngang / Xếp dọc** để khỏi phải nhớ.

---

## 3. Câu lệnh cho "✨ Sửa bằng AI"

Bấm nút **Sửa bằng AI** ở đầu mỗi khối, rồi **gõ** hoặc **bấm micro và nói**. Máy sửa xong
sẽ hiện **bảng đối chiếu trước/sau** — đọc rồi bấm *Dùng bản mới* thì mới thay.

### Với khối câu hỏi

| Muốn gì | Nói / gõ |
|---|---|
| Đổi đáp án đúng | *"đổi đáp án đúng thành C"* |
| Phương án nhiễu dễ quá | *"làm các phương án nhiễu khó hơn"* |
| Đề dài dòng | *"viết lại đề cho ngắn gọn"* |
| Thiếu lời giải | *"thêm lời giải chi tiết từng bước"* |
| Đổi số liệu | *"đổi số 2 thành 3 và tính lại đáp án"* |
| Đổi mức độ | *"làm câu này khó hơn một chút"* |

### Với khối bài giảng

| Muốn gì | Nói / gõ |
|---|---|
| Đoạn dài dòng | *"viết lại đoạn này ngắn gọn hơn"* |
| Cần tách ý | *"chia thành 3 ý gạch đầu dòng"* |
| Thiếu ví dụ | *"thêm một ví dụ minh hoạ"* |
| Học sinh khó hiểu | *"giải thích lại cho dễ hiểu với học sinh lớp 10"* |
| Thiếu bước | *"thêm bước kiểm tra điều kiện vào phương pháp giải"* |

**Máy không được phép**: đổi ảnh, đổi công thức không được nhắc tới, hay bỏ bớt câu hỏi.
Nếu máy trả về thiếu một khối câu hỏi, hệ thống **từ chối luôn bản đó**.

---

## 4. Quy trình soạn một bài

1. **Soạn bằng AI** — tải tài liệu/ảnh lên, chọn E-learning hoặc Trình chiếu.
2. **Soát phần phân dạng**: mỗi Dạng bài phải có **ít nhất 2 câu tương tác**, và câu hỏi
   phải là **bài tính toán** đúng trọng tâm dạng đó. Thiếu thì bấm *Sửa bằng AI* và dặn
   *"thêm 2 câu tương tác tính toán cho dạng này"*.
3. **Soát mục 📌 CÔNG THỨC CẦN NHỚ** ở cuối bài. Chưa có thì bấm **Vào Sổ tay → Nhờ AI rút
   công thức từ bài**.
4. **Bấm "Vào Sổ tay"** để đưa công thức của bài vào Sổ tay công thức. Cái nào kho đã có sẽ
   **tự bỏ tick** — không lo trùng.
5. **Demo** — mở đúng phần vừa soạn trên giao diện học sinh để kiểm.
6. **Lưu**.

> Bài cũ có nhiều thẻ HTML gõ tay thì bấm **🪄 Dọn thẻ** một lần cho sạch. Nút này giữ
> nguyên câu hỏi, công thức và ảnh — chỉ bỏ thẻ thừa.

---

## 5. Sổ tay công thức

- **Chống trùng chạy trên TOÀN KHO**, không riêng chương đang mở. Gõ \`\\dfrac{a}{b}\` khi kho
  đã có \`\\frac{a}{b}\` vẫn bị bắt, vì hệ thống so **ý nghĩa công thức** chứ không so chữ.
- **Thêm tay cũng được kiểm**: trùng thì báo rõ bản đã có nằm ở chương nào. Thầy cô vẫn được
  lưu nếu cố ý.
- Nút **Dọn trùng** (chỉ hiện khi kho thật sự có bản trùng): bày từng nhóm cạnh nhau, chọn
  bản muốn giữ rồi mới xoá.
`;
