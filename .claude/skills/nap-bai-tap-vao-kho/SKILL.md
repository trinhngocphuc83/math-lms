---
name: nap-bai-tap-vao-kho
description: Đưa bài tập từ tài liệu thầy để sẵn trong một thư mục (PDF quét, PDF chữ, Word, ảnh chụp sách bài tập, đề kiểm tra) vào Ngân hàng câu hỏi của app - đọc từng câu, chép lại thành LaTeX, xếp vào đúng chương/bài/dạng đang có trong danh mục, gắn mức độ, viết lời giải, cắt hình vẽ, soát trùng rồi ghi vào kho có sao lưu. Dùng khi thầy cô nói "nạp bài tập vào kho", "đưa tài liệu này vào ngân hàng câu hỏi", "bóc câu từ sách bài tập", "kho chương này chưa có câu, lấy từ tệp trong thư mục X", hoặc chỉ tay vào một thư mục tài liệu và bảo làm.
---

# Nạp bài tập từ tài liệu vào ngân hàng câu hỏi

Việc này là **chép đúng và xếp đúng** — không sáng tác. Câu nào trong tài liệu thì vào kho câu ấy,
đúng đề, đúng đáp án của tài liệu; lời giải thiếu thì tự viết nhưng phải giải ra đúng đáp án đó.
Kho là tài sản thầy gom nhiều năm, một câu sai đáp án lọt vào là đề nào rút phải cũng sai.

## Nguyên tắc

1. **Tên danh mục chép nguyên văn.** Tên chương, bài, dạng phải khớp từng chữ với danh mục
   đang có. Lệch một dấu chấm là kho đẻ dạng song sinh — kho Lý từng có ba biến thể của cùng
   một dạng. Bộ kiểm (`kiem-cau.mjs`) từ chối tên không có trong danh mục; **không tự thêm
   dạng mới** — thiếu dạng thì báo thầy, thầy quyết.
2. **Đọc bằng mắt, không đoán.** Ảnh mờ, công thức không chắc thì phóng to trang (`Read` ảnh
   từng trang) chứ không suy ra từ đáp án. Câu nào thật sự không đọc nổi thì bỏ và ghi vào báo
   cáo, không được bịa.
3. **Sao lưu và rút lại được.** Mỗi lượt ghi lưu danh sách mã câu; thầy không ưng thì rút
   nguyên lượt bằng một lệnh.
4. **Thử trước, ghi sau.** Mọi script mặc định chỉ thử; thêm `ghi` mới đụng kho.
5. **Viết tệp bằng công cụ Write/Edit, không dùng heredoc** — shell máy này nuốt dấu chéo
   ngược, LaTeX `\frac` thành `frac`, `\n` thành `n`. Đã dính bảy lần.

## Các bước

### 1. Kê tài liệu

```bash
node .claude/skills/nap-bai-tap-vao-kho/scripts/liet-ke-tai-lieu.mjs "<thư mục thầy để tài liệu>"
```

PDF được dựng thành ảnh từng trang ở `scratch/nap-kho/<tên>/trang-NN.png`; nếu PDF có lớp chữ
thì còn có `<tên>.txt` — **ưu tiên đọc chữ**, chỉ nhìn ảnh để soát công thức và lấy hình vẽ.
Word thành `<tên>.md` kèm ảnh trích sẵn. Tài liệu quét không có chữ thì đọc ảnh từng trang.

**Vở bài tập** (mỗi bài kèm hàng chục dòng chấm chấm để học sinh viết lời giải) thì lớp chữ
thường hỏng mã và ảnh từng trang gần như trống. Nén lại rồi mới đọc:

```bash
node .claude/skills/nap-bai-tap-vao-kho/scripts/nen-trang.mjs scratch/nap-kho/<tên> 333 347 bai15
```

Ra `scratch/nap-kho/nen/bai15-<k>.png`: bỏ dòng chấm và khoảng trắng, ghép nhiều trang thành
ảnh cao ≤ 2800 px, giữa các trang có vạch ghi số trang gốc để còn quay lại cắt hình. Một bài
15 trang thường nén còn 3–4 ảnh, đọc một lần là đủ đề.

### 2. Tải danh mục của khối

```bash
node .claude/skills/nap-bai-tap-vao-kho/scripts/tai-danh-muc.mjs --lop 9 --chuong "Đường tròn"
```

Ra `scratch/nap-kho/danh-muc-lop9.md`: từng dạng kèm **yêu cầu cần đạt** và số câu đang có.
Đọc kĩ yêu cầu cần đạt của các dạng trong bài định nạp — đó là căn cứ xếp câu, không phải tên
dạng. Dạng nào đang 0 câu là chỗ cần lấp trước.

### 3. Chép câu ra tệp JSON

Mỗi **bài** (hoặc mỗi tài liệu nhỏ) một tệp `scratch/nap-kho/<tên>.cau.json`, cỡ 20–40 câu cho
dễ soát:

```json
{
  "grade": "9",
  "subject": "Hình học",
  "nguon": "SBT Toán 9 KNTT tập 1, tr. 96–99",
  "cau": [
    {
      "topic": "Chương 5. Đường tròn",
      "lesson": "Bài 1. Mở đầu về đường tròn",
      "math_form": "Sự xác định đường tròn, chứng minh các điểm cùng thuộc một đường tròn",
      "question_type": "NLC",
      "difficulty": "2",
      "content": "Cho tam giác $ABC$ vuông tại $A$, $AB = 6$ cm, $AC = 8$ cm. Bán kính đường tròn đi qua ba đỉnh của tam giác bằng",
      "option_a": "$5$ cm.", "option_b": "$10$ cm.", "option_c": "$4$ cm.", "option_d": "$3$ cm.",
      "correct_answer": "A",
      "explanation": "Phương pháp giải:\nTâm đường tròn ngoại tiếp tam giác vuông là trung điểm cạnh huyền.\n\nLời giải:\n$BC = \\sqrt{6^2 + 8^2} = 10$ cm nên $R = \\dfrac{BC}{2} = 5$ cm.\nChọn A."
    }
  ]
}
```

Quy ước chép (đúng lối kho đang dùng, xem vài câu cùng bài trước khi chép):

| Việc | Cách |
|---|---|
| Công thức | `$...$`, công thức riêng dòng `$$...$$`. Số thập phân `$0{,}5$`, đơn vị để ngoài `$` hoặc `\text{cm}` |
| Loại câu | `NLC` 4 phương án A–D · `DS` bốn ý ở `option_a..d`, đáp án `ĐSĐS` · `TLN` đáp án là số, dấu phẩy thập phân, **≤ 4 ô** (đổi đơn vị/cách làm tròn nếu quá) · `TL` tự luận |
| Mức | `1` biết · `2` hiểu · `3` vận dụng · `4` vận dụng cao. Sách bài tập cơ bản đa số 1–2, bài "*" hoặc cuối bài 3, bài ôn tập chương nâng cao 4 |
| Lời giải | Khuôn `Phương pháp giải:\n…\n\nLời giải:\n…`, cuối NLC ghi `Chọn X.`; DS ghi từng ý `a) Đúng …` |
| Câu tự luận gốc | Tài liệu phần lớn là tự luận. Giữ `TL` nếu bài nhiều ý; bài một ý hỏi ra số thì **chuyển thành TLN**; bài hỏi đúng/sai nhiều ý thì thành `DS`. Không tự chế phương án nhiễu để ép thành NLC trừ khi tài liệu là đề trắc nghiệm |
| Hình vẽ | Cắt từ ảnh trang: `cat-anh.mjs trang-05.png x y w h ten --xem` → mở `scratch/nap-kho/xem/ten.png` xem đúng khung chưa → chạy lại không `--xem` để tải, dán dòng `![Hình ảnh](url)` vào cuối `content`. Đề có hình mà không nhúng thì câu vô dụng |
| Đề nhiều ý a) b) c) | Với TL giữ nguyên trong `content`; với TLN/NLC tách mỗi ý thành một câu, chép lại đủ giả thiết |

Xếp dạng theo **yêu cầu cần đạt** chứ không theo chữ trùng trong tên. Bài tập tổng hợp cuối
chương thì vào dạng "Bài tập tổng hợp chương N" của bài "Bài K. Ôn tập chương" (K = số bài + 1).
Tên bài đánh số **từ 1 trong mỗi chương** (không đánh liên tục theo SGK).

### 4. Soát

```bash
node .claude/skills/nap-bai-tap-vao-kho/scripts/kiem-cau.mjs scratch/nap-kho/<tên>.cau.json
```

`✗` là lỗi phải sửa (danh mục sai tên, thiếu phương án, đáp án sai khuôn, dấu `$` lẻ, trùng
hệt câu trong kho, trùng trong tệp). `⚠` là cảnh báo: *rất giống câu trong kho* thì mở câu
ấy ra so — cùng đề khác số thì giữ, cùng hệt chỉ khác cách trình bày thì bỏ.

### 5. Ghi

```bash
node .claude/skills/nap-bai-tap-vao-kho/scripts/ghi-cau.mjs scratch/nap-kho/<tên>.cau.json       # thử
node .claude/skills/nap-bai-tap-vao-kho/scripts/ghi-cau.mjs scratch/nap-kho/<tên>.cau.json ghi   # ghi
```

Script tự chạy lại bộ soát và từ chối nếu còn lỗi. Ghi xong in ra lệnh rút lại:
`ghi-cau.mjs --rut backups/nap-kho-<ngày>/<tên>-<giờ>.json`.

### 6. Đo lại và báo

Chạy lại `tai-danh-muc.mjs` để thấy số câu từng dạng sau khi nạp, rồi kiểm cây danh mục:

```bash
node .claude/skills/nap-bai-tap-vao-kho/scripts/kiem-danh-muc.mjs
```

Phải về **0 ✗** (quy ước ở [docs/quy-uoc-danh-muc.md](../../../docs/quy-uoc-danh-muc.md):
`Chương N. Tên`, `Bài N. Tên` đánh lại từ 1 mỗi chương, `Bài K. Ôn tập chương`, bốn phân
môn). Chương/bài mới không có trong cây chuẩn thì báo thầy, được duyệt mới `--cap-nhat`.
Báo cho thầy theo khuôn:

- Nạp bao nhiêu câu, từ tài liệu nào, vào bài/dạng nào (bảng số câu theo dạng)
- Cơ cấu loại và mức
- **Câu bỏ qua và lí do** (không đọc được, trùng kho, thiếu hình, đáp án tài liệu sai)
- Dạng trong tài liệu mà danh mục chưa có — đề nghị tên, chờ thầy duyệt
- Lệnh rút lại lượt vừa ghi

## Bẫy đã gặp

- **Tài liệu sai đáp án** không hiếm (một câu trong kho có đáp án 2,21 trong khi lời giải ra
  2,12). Giải lại mỗi câu trước khi ghi đáp án; lệch thì ghi theo lời giải và báo.
- **Ảnh nằm trong phương án** (câu "hình nào đúng"): bốn hình là bốn phương án, mỗi phương án
  một dòng `![Hình ảnh](url)`.
- **Số câu trong một trang sách bài tập** thường 8–15; một tệp PDF 20 trang là hơn 200 câu —
  chia theo bài, ghi từng tệp, đừng gom một lượt.
- `question_id` phải theo khuôn `CH_<mili giây>_<4 kí tự>`; script đã lo, đừng tự đặt.
