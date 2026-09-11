---
name: soan-chuong-thpt
description: Soạn trọn một chương Toán THPT (lớp 10, 11, 12) trong app math-lms - lý thuyết và phân dạng, bài tập tự luyện rút từ ngân hàng câu hỏi, năm đề ôn tập cuối chương, bảng tổng hợp công thức, rồi xuất tài liệu Word bản giáo viên. Dùng skill này bất cứ khi nào thầy cô nhắc tới soạn cả một chương, dựng bài tập tự luyện cho một bài, làm đề ôn tập cuối chương, rút câu từ ngân hàng vào bài học, kiểm tra một chương đã đủ dạng chưa, hay xuất chương ra Word - kể cả khi họ chỉ nói ngắn gọn kiểu "làm chương 5 đi", "soạn tiếp bài 2", "xuất chương này ra Word", hoặc "chương này thiếu dạng nào không".
---

# Soạn trọn một chương THPT

Chương hoàn chỉnh gồm bốn phần, dựng theo đúng thứ tự này vì phần sau ăn theo phần trước:

1. **Lý thuyết và phân dạng** — mỗi bài một module `type = 'theory'`
2. **Bài tập tự luyện** — mỗi bài một module `title = 'Bài tập tự luyện'`, câu **rút từ kho**
3. **Năm đề ôn tập cuối chương** — trong chuyên đề ôn tập, bài `Cuối chương N`
4. **Bảng tổng hợp công thức cả chương** — module lý thuyết của bài `Cuối chương N`
5. **Xuất Word bản giáo viên** — mỗi bài một tệp

Đọc [references/cau-truc-va-han-ngach.md](references/cau-truc-va-han-ngach.md) **trước khi
rút câu**: ở đó có số câu từng loại theo khối lớp, phân bố mức, khuôn đề, và cách rút cho
khỏi lệch. Mấy con số ấy là quy ước thầy đã chốt, đừng tự nghĩ lại.

## Nguyên tắc xuyên suốt

**Đo trước khi dựng, đo lại sau khi dựng.** Đây là thói quen đã cứu công việc này nhiều
lần — nó lật ngược cả những kết luận tôi tưởng chắc. Trước khi soạn, chạy `soi-chuong.mjs`
để biết kho đang có gì; sau khi soạn, chạy lại để biết đã lấp được chỗ nào.

**Bài tập phải rút từ ngân hàng câu hỏi, không được tự nghĩ ra.** Kho là tài sản thầy gom
nhiều năm, câu trong đó đã qua dạy thật. Câu tự chế nhìn thì giống nhưng không có lời giải
chuẩn, không có ảnh đồ thị, và không truy ngược được. Mỗi câu rút vào phải kèm
`sourceQuestionId`.

**Bao quát cả chương, ưu tiên dạng hay ra kiểm tra.** Đừng dồn vào vài dạng dễ rút. Dạng
nào kho có nhiều câu thường là dạng hay ra đề — đó là tín hiệu tốt để xếp lên trước.

**Sao lưu trước mọi lần ghi đè cơ sở dữ liệu.** Ghi nội dung cũ ra `backups/<việc>-<ngày>/`
rồi mới `update`. Viết script ở chế độ thử trước, chỉ ghi thật khi thêm tham số `ghi`.

## Bước 1 — Soi chương trước khi bắt tay

```bash
node .claude/skills/soan-chuong-thpt/scripts/soi-chuong.mjs --lop 12 --chuong "NGUYÊN HÀM"
```

Cho ra ba thứ:

- **Phủ dạng** — kho có bao nhiêu dạng cho từng bài, bài giảng đã dạy mấy dạng, dạng nào
  còn bỏ trống. Đây là chỗ dễ hụt nhất: Bài 3 chương IV từng chỉ có **2 dạng** trong khi
  kho có **7 dạng · 215 câu** — ba dạng đông câu nhất (54, 48, 22 câu) không được nhắc tới
  dòng nào.

  Phủ dạng đo bằng **câu đã rút**, không đo bằng tên: câu tương tác trong bài giảng có
  `sourceQuestionId`, tra ngược ra dạng của nó trong kho là biết chắc. Ba dấu:

  | Dấu | Nghĩa |
  |---|---|
  | `·` | bài giảng đã rút câu của dạng này — yên tâm |
  | `~` | có nhắc tên nhưng chưa rút câu nào — thường vì kho chỉ có câu tự luận |
  | `✗` | không thấy dấu vết, gần như chắc là thiếu thật |

  Bản trước dò theo tên nên đặt tên hay hơn tên kho là bị báo thiếu — dạng kho tên
  *"Tự suy luận"* mà bài giảng gọi đúng bản chất là *"Bài toán thực tế"* thì máy kêu `✗`
  trong khi bài giảng dạy đủ. Báo động giả kiểu ấy làm người soạn quen tay bỏ qua dấu `✗`,
  hỏng luôn cái chuông.
- **Khối trắc nghiệm thiếu `answerIndex`** — phải bằng 0.
- **Hạn ngạch bài tập tự luyện** — đủ số câu chưa, cơ cấu loại và mức có đúng không.

## Bước 2 — Lý thuyết và phân dạng

Mỗi bài cần đủ các dạng mà kho đang có. Mỗi dạng gồm:

```markdown
## 💡 DẠNG n: TÊN DẠNG VIẾT HOA
### 🛠 Phương pháp giải
#### Bước 1: ...
#### Bước 2: ...
### 🖩 Bấm máy Casio fx-580VN X   ← chỉ những dạng bấm được, xem tài liệu riêng
---
> ### 📌 Ví dụ mẫu
> đề bài
---
> Hướng dẫn giải:
> từng bước

```quiz   ← hai câu tương tác RÚT TỪ KHO, có answerIndex và sourceQuestionId
```

**Kĩ năng bấm máy** — đọc [references/ky-nang-casio-fx580.md](references/ky-nang-casio-fx580.md).
Ở đó có tổ hợp phím, cú pháp, và quan trọng nhất là **giới hạn** của từng công cụ (SOLVE
không giải nổi phương trình có `Σ`, TABLE không nhận công thức truy hồi, PreAns bay sạch khi
đổi phương thức) — mấy chỗ ấy máy không báo gì cho ra hồn, học sinh chỉ thấy sai mà không
hiểu vì sao.

Tài liệu ấy cũng nói rõ **khi nào KHÔNG được ghi mục bấm máy**: dạng chứng minh, dạng hỏi
điều kiện đúng với mọi $n$, và dạng bấm máy còn lâu hơn làm tay. Nhét mục bấm máy vào dạng
chứng minh là dạy học sinh thay lời giải bằng vài số hạng đầu.

Mỗi dạng ít nhất hai câu tương tác, xếp từ dễ đến khó. Câu phải giải được bằng **đúng**
phương pháp vừa trình bày, và phải tính ra con số cụ thể — hỏi lý thuyết suông thì học
sinh học xong vẫn không làm được bài.

Nội dung bài giảng trong app **không phải markdown thuần**: nó có thẻ HTML để canh giữa và
vẽ khung màu trên màn hình. Cứ giữ nguyên lối ấy khi soạn — bộ xuất Word đã biết gỡ thẻ.

## Bước 3 — Bài tập tự luyện

Rút từ kho theo hạn ngạch trong tài liệu tham chiếu. Đặt module này **lên trên** các module
"Luyện tập N" đã có (mấy cái đó là đề ôn tập theo bài, để nguyên).

Chống trùng: so với các module **khác** trong cùng chương, nhớ **trừ chính module đang dựng
lại** ra khỏi phép so. Quên là báo trùng với chính nó.

## Bước 4 — Năm đề ôn tập cuối chương

Rút theo vòng tròn **theo bài trước, dạng sau**, bài nào ít câu xếp trước. Xem lý do trong
tài liệu tham chiếu — làm ngược lại thì đề dồn hết vào Bài 1.

## Bước 5 — Bảng tổng hợp công thức

Module lý thuyết của bài `Cuối chương N`. Mỗi công thức **đúng một dòng** theo khuôn:

```
- **Tên công thức** | $công thức LaTeX$ | dùng khi nào
```

Khuôn phải đúng vì cả bộ xuất Word lẫn Sổ tay công thức đều đọc theo nó. Dấu `|` nằm trong
công thức (trị tuyệt đối, `$\ln|x|$`) **không phải** vách cột — bộ xuất đã biết phân biệt.

## Bước 6 — Xuất Word bản giáo viên

```bash
node --experimental-strip-types .claude/skills/soan-chuong-thpt/scripts/xuat-chuong-word.mjs \
     --lop 12 --chuong "NGUYÊN HÀM" --cuoi "Cuối chương 4" --tach
```

`--tach` cho mỗi bài một tệp. Nên dùng: gộp cả chương thì MathType chuyển 3000 công thức
sẽ treo máy; mỗi tệp 300–600 công thức thì chuyển được.

Script gọi lại **đúng hai bộ dựng của app** — `noiDungGiaoAnSangWord` cho lý thuyết và
`dungNoiDungWord` cho bài tập, cùng bộ mà Quản lý Đề thi đang dùng. Đừng dựng bản thứ hai:
đã thử và lệch ngay ba chỗ (ngắt trang ở mỗi dấu `---` nên đọc không liền mạch, mất sạch
câu hỏi tương tác, sai phông chữ).

Script cũng nén ảnh lúc tải — kho toàn ảnh chụp nguyên trang, có tấm gần 6 MB; một chương
từng nặng 14 MB mà 13.9 MB là ảnh.

Rồi soi tệp vừa xuất:

```bash
node .claude/skills/soan-chuong-thpt/scripts/soi-word.mjs scratch/word/<thư mục vừa tạo>
```

Cần thấy **0 ở cả bốn cột rác**. Mấy kiểu hỏng này đều im lặng — mở ra mới biết, mà tài
liệu 200 câu thì không ai đọc hết:

| Cột | Nghĩa khi khác 0 |
|---|---|
| thẻ | Thẻ HTML in ra nguyên văn giữa bài |
| LaTeX thô | Công thức không dựng được, ra chữ `\frac{...}` |
| dấu sao | Dấu nhấn mạnh markdown chưa dựng thành chữ đậm |
| chữ màu | Màu trên màn hình lọt vào bản in (bản in để chữ đen) |
| gạch đứng | Bảng markdown in ra nguyên dấu `|` thay vì thành bảng thật |

Cột **bảng** phải khác 0 nếu bài có bảng. Đây là chỗ từng hỏng im lặng: bộ dựng giáo án
không biết bảng markdown, nên mọi dòng `| Bước | Bấm |` rơi xuống nhánh chữ thường và in
ra nguyên một mớ dấu gạch đứng. Trên màn hình app thì vẫn đẹp — app có bộ dựng bảng riêng
— nên chỉ mở tệp Word ra mới thấy. **Có bảng trong bài thì bắt buộc mở tệp Word xem lại**,
đừng tin mỗi màn hình.

Số `<m:oMath>` phải xấp xỉ số công thức trong nội dung; bằng 0 nghĩa là công thức hỏng hết.

## Chạy script Node đụng vào mã của app

Bộ dựng của app viết bằng TypeScript, nên phải `node --experimental-strip-types`. Ba chỗ
vướng đã biết:

- Node **không chịu bóc kiểu** cho tệp nằm dưới `node_modules` → thư mục tạm phải đặt ở
  gốc repo (script đã làm sẵn: `.tam-word/`).
- Đường dẫn tương đối phải ghi rõ đuôi `.ts` → script tự thêm khi chép.
- Node không có `window.atob`, `URL.createObjectURL`, `Image` → script đã dựng bản thay thế;
  thiếu `Image` thì mọi câu có đồ thị **mất hình mà không báo lỗi**.

## Viết script: đừng dùng heredoc

Shell ở máy này **nuốt dấu chéo ngược** trong heredoc — `\n` thành `n`, `\\` thành `\`,
regex vỡ. Đã dính đủ số lần để rút ra: viết tệp bằng công cụ Write/Edit, chạy bằng `node`.
Python heredoc cũng vướng tương tự khi chuỗi có dấu chéo.

Một bẫy nữa: trong chuỗi thay thế của `String.replace`, `$$` và `` $` `` là ký hiệu đặc
biệt — chúng nuốt dấu `$` và chèn nhầm cả khúc văn bản phía trước. Dùng **hàm** thay thế
chứ đừng dùng chuỗi.

Bẫy thứ ba, im lặng hơn cả: lời giải trong kho thỉnh thoảng lưu xuống dòng bằng chuỗi hai
kí tự `\n`, nên script hay có `.replace(/\\n/g, '\n')`. Phép ấy **ăn luôn `\neq`, `\ne`,
`\nabla`** — thành xuống dòng + `eq`, in ra Word là `eq 440√2` giữa lời giải. Kho Toán 11
có 40 câu, kho Lý 13 câu mang `\neq`. Dùng `xuongDong()` trong `scratch/donDeCauHoi.mjs`
(đã chừa các lệnh ấy), và `soi-neq-hong.mjs` để đo lại sau khi ghi.

## Tệp Word đang mở trong Word

Mỗi lần chạy, script ghi đè vào **cùng một thư mục** `scratch/word/<tên chương>/` — chạy lại
sau khi sửa lỗi thì bản cũ biến mất, thầy chỉ thấy một thư mục duy nhất.

Trước đây tên thư mục có gài mốc giờ, nên mỗi lần chạy lại lại đẻ thêm một thư mục nữa: xuất
xong soi thấy lỗi, sửa rồi xuất lại là có hai thư mục **trông y hệt nhau** mà một cái hỏng.
Không có cách nào nhìn tên mà biết cái nào là bản đã sửa.

Mốc giờ chỉ còn dùng làm đường lui: nếu có tệp **đang mở trong Word** thì ghi đè báo bận
(EBUSY/EPERM), script tự lánh sang `<tên chương>-<giờ>/` và **báo rõ trên màn hình** rằng
phải đóng Word rồi xoá thư mục thừa.
