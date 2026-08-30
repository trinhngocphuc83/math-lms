/**
 * Noi dung trang huong dan soan bai - MOT nguon dung cho ca hai cho:
 * hop "Huong dan" trong trinh soan va tep docs/huong-dan-soan-bai.md.
 *
 * SUA O docs/huong-dan-soan-bai.md roi chay scratch/dung-huong-dan.py,
 * dung sua thang tep nay.
 */

export const NOI_DUNG_HUONG_DAN = `Bảng tra nhanh. Mở lại bất cứ lúc nào bằng nút **❓ Hướng dẫn** — có ở **trang soạn bài**,
**trang lớp học** và **màn hình trình chiếu**.

Phần 1–5 nói về soạn bài và Sổ tay. Phần 6–10 nói về lúc đứng lớp: gọi tên, cộng điểm,
vinh danh và điều khiển bằng điện thoại.

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

### Nút ở đầu mỗi khối

| Nút | Việc |
|---|---|
| **Vào Sổ tay** | Đưa mục 📌 CÔNG THỨC CẦN NHỚ của bài vào Sổ tay công thức |
| **Sửa bằng AI** | Nhờ AI sửa khối này — gõ hoặc nói |
| **Xem Trước** | Chia đôi màn hình: sửa bên trái, xem kết quả bên phải |
| **⋯** | Đưa lên / xuống, sửa lỗi LaTeX, chèn thêm ảnh |
| **🗑️** | Xoá khối này (có hỏi lại trước) |

### Thanh ảnh (hiện khi khối có ảnh)

| Nút | Việc |
|---|---|
| **Nhỏ / Vừa / To** | Đổi cỡ mọi ảnh trong khối |
| **⇄ Xếp ngang / ⇅ Xếp dọc** | Chỉ hiện khi có từ 2 ảnh trở lên |
| **✨ Vẽ lại** | Nhờ AI vẽ lại hình bằng **nét vector** — in cỡ nào cũng sắc. Nút **tô vàng** nghĩa là máy chấm ảnh đó hơi mờ, nên vẽ lại. Nhiều ảnh thì nút đánh số theo thứ tự ảnh |
| **Chèn thêm ảnh** | Cắt và chèn thêm một ảnh nữa |

> Khi soạn bài bằng AI, hình trong bài **tự động** được cắt và ưu tiên vẽ lại bằng nét
> vector — đúng cỗ máy phần Luyện tập và Ngân hàng câu hỏi đang dùng. Nút *Vẽ lại* ở trên
> là để làm lại thủ công khi cần.

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
- **Chuyển công thức sang chương khác**: mở nút sửa ✏️ → ô **Thuộc chương** → chọn chương
  mới → Lưu. Trước đây thiếu ô này nên phải chép sang rồi xoá bản cũ, quên xoá là thành trùng.
- **Sắp thứ tự** bằng mũi tên ▲ ▼ ở mỗi công thức. Cần bật một lần: chạy
  \`scratch/them-cot-thutu-formulas.sql\` trong Supabase → SQL Editor. Chưa chạy thì không có
  mũi tên, mọi thứ khác vẫn bình thường.
- Nút **Dọn trùng** (chỉ hiện khi kho thật sự có bản trùng): bày từng nhóm cạnh nhau, chọn
  bản muốn giữ rồi mới xoá.

---

## 6. Gọi tên học sinh (vòng quay)

Mở bằng nút **🎲 Gọi tên & Điểm** ở **trang lớp học**, hoặc nút cùng tên trên thanh điều
khiển lúc **trình chiếu** (phím tắt **G**).

| Nút | Việc |
|---|---|
| **QUAY** | Băng tên cuộn rồi dừng, nổ pháo giấy và đọc tên "Mời em ..." |
| **+ Đúng** | Cộng 1 điểm, và nói "Em ... được cộng 1 điểm" |
| **− Chưa được** | Trừ 1 điểm, và nói "Em ... bị trừ 1 điểm" |
| **Vắng** | Em này **đã được gọi** nhưng hôm nay không có mặt → bỏ qua trong buổi này thôi |
| **Bỏ lại** | **Quay nhầm** → coi như chưa từng gọi, em vẫn nằm nguyên trong vòng |
| **Tải sẵn giọng** | Lấy trước giọng đọc cả lớp — bấm một lần trước buổi dạy |
| 🔊 | Tắt/bật nhạc quay số |
| 🔄 | Tải lại danh sách lớp (vừa thêm học sinh ở tab khác) |

**Không gọi trùng:** quay trúng ai thì em đó **tạm ẩn**, hết cả lớp mới sang vòng mới. Số
đếm *"Vòng 2 · còn 5/16"* cho biết đang ở đâu.

**Nhớ xuyên suốt:** trạng thái khoá theo **lớp**, không theo bài. Quay ở bài A rồi mở bài
B, hay mở từ trang lớp học, vẫn nối liền một mạch.

**Thêm / bớt học sinh thì tự cập nhật.** Thêm em mới giữa vòng là em đó vào ngay vòng đang
chạy; bớt em là biến khỏi vòng quay và khỏi số đếm. Không phải dọn gì.

### Giọng đọc

Ba lớp dự phòng, **không bao giờ im lặng**: giọng AI → bản đã đọc lần trước (đọc tức thì,
**mất mạng vẫn được**) → giọng máy → chuông. Dưới tên có ghi đang dùng giọng nào.

> **Lần đầu đọc một cái tên mất vài giây** vì phải gọi Google. Bấm **Tải sẵn giọng** một
> lần trước buổi dạy thì cả buổi đọc ngay. Hạn mức giọng AI mỗi ngày có giới hạn — tải hết
> thì nút tự dừng và báo *"mai bấm tiếp"*, số đã tải vẫn dùng được.

---

## 7. Điểm thưởng — điểm ở đâu ra

| Nguồn | Cách cộng |
|---|---|
| **Phát biểu trên lớp** | Đúng \`+1\` · chưa được \`−1\` (thầy cô bấm ở vòng quay) |
| **Luyện tập · Kiểm tra · Thi online** | từ **7** → \`+1\` · từ **8** → \`+2\` · từ **9** → \`+3\` · **10** → \`+4\` |
| **Thưởng tiến bộ** | Bài sau hơn bài trước **từ 1,5 điểm** → \`+1\` |

Bốn quy tắc phụ:

- Bài **dưới 7 điểm được 0, KHÔNG bị trừ**. Chỉ trừ ở phần phát biểu trên lớp.
- Làm lại nhiều lần thì lấy **lần điểm cao nhất** — khuyến khích làm lại cho tốt.
- **Bài 0 điểm coi như bỏ dở**, bỏ qua hẳn, không tính là một lần làm bài.
- **Mỗi bài chỉ cộng một lần** dù bấm quét lại bao nhiêu lượt.

**Điểm không tự chạy nền.** Bấm **"Cập nhật điểm từ bài làm"** ở tab Tổng kết tháng, hoặc
nó tự chạy mỗi khi thầy cô **lưu điểm kiểm tra**.

**Học sinh xem được** ở mục **Điểm thưởng** trên màn hình của em: tổng điểm tháng, so với
tháng trước, và từng lần cộng/trừ kèm lý do.

---

## 8. Nhập điểm kiểm tra và tổng kết tháng

**Tab Báo điểm:** gõ điểm từng em rồi bấm **Lưu điểm**. Ô **"Bài đã lưu"** cho mở lại bài
cũ để sửa. Ô để trống nghĩa là em đó chưa có điểm. Lưu xong hệ thống cộng điểm thưởng luôn.

**Tab Tổng kết tháng:**

| Nút | Việc |
|---|---|
| **Cập nhật điểm từ bài làm** | Quét bài luyện tập và kiểm tra, cộng cho bài chưa cộng |
| **Chốt tháng** | Khoá lại, không cộng/trừ được nữa. Quét nốt trước khi khoá. **Mở khoá lại được** nếu chốt nhầm |
| **Ảnh** · **Excel** | Bảng cả lớp |
| **Phiếu phụ huynh** | Phiếu riêng từng em, có trang trí — **xuất ảnh** gửi Zalo, hoặc Excel để lưu hồ sơ |

Hai bảng xếp hạng tách riêng: **Tổng điểm** để nhìn toàn cảnh, **Tiến bộ** để khen thưởng.
Tháng đầu chưa có gì để so thì bảng tiến bộ tự ẩn.

---

## 9. Sân khấu vinh danh

Mở bằng nút **🏆 Sân khấu vinh danh** ở trang lớp học. Chiếu lên tivi cuối tháng.

Bấm **BẮT ĐẦU LỄ VINH DANH** rồi để đó: trống dồn → lộ hạng ba → hạng nhì → hạng nhất,
mỗi lần một tràng pháo giấy và xướng tên, kết bằng tiếng kèn. Xong mới hiện bảng cả lớp.

**Nhạc** để trong thư mục \`public/am-thanh/\`:

| Tệp | Dùng cho |
|---|---|
| \`vinh-danh.mp3\` | Nhạc nền sân khấu |
| \`quay-so.mp3\` | Nhạc lúc vòng quay đang quay |
| \`fanfare.mp3\` | Tiếng kèn — **chưa có thì hệ thống tự tạo** |
| \`trong.mp3\` | Trống dồn — **chưa có thì hệ thống tự tạo** |

Thả tệp đúng tên vào là hệ thống tự ưu tiên dùng tệp thật.

---

## 10. Điều khiển bằng điện thoại

Đang trình chiếu, bấm nút **📱** trên thanh điều khiển → hiện **mã QR** và **mã 6 ký tự**.
Lấy điện thoại quét là xong. Lần đầu sẽ hỏi đăng nhập — dùng đúng tài khoản của thầy cô.

Trên điện thoại có ba tầng:

1. **Slide đang chiếu**
2. **Slide kế tiếp** — biết sắp giảng gì mà không phải quay đầu nhìn bảng
3. **Hàng nút** — ◀ ▶ to nhất; thêm 🎲 Gọi tên · 🏆 Vinh danh · ⛶ Toàn màn hình

Mở vòng quay thì hàng nút **đổi hẳn** thành **QUAY** to kèm **+1 · −1 · Vắng · Bỏ lại**.
Bấm nút có **rung nhẹ** báo đã ăn — lớp ồn, nhìn màn hình không kịp.

> **Điện thoại rớt mạng không ảnh hưởng bài giảng** — máy chiếu vẫn chạy, cắm lại là tự
> khớp. Ngược lại, **tải lại trang trình chiếu thì mã đổi**, phải quét lại mã mới.
>
> **Đang trình chiếu thì để cửa sổ đó nổi lên trước.** Vòng quay dùng hiệu ứng mà trình
> duyệt tự tạm dừng khi cửa sổ nằm ở nền — băng tên sẽ đứng im.
`;
