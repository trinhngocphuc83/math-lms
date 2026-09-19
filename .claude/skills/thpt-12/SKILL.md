---
name: thpt-12
description: Soạn trọn một chương Toán THPT (lớp 10, 11, 12) trong app math-lms theo khuôn đề thi tốt nghiệp - lý thuyết và phân dạng, bài tập tự luyện trắc nghiệm ba dạng thức (NLC, Đúng/Sai, trả lời ngắn) rút từ ngân hàng câu hỏi, năm đề ôn tập cuối chương, bảng tổng hợp công thức, rồi xuất Word bản giáo viên. Dùng khi thầy cô nhắc tới soạn cả một chương LỚP 10-12, dựng tự luyện cho một bài THPT, đề ôn cuối chương THPT, hay xuất chương THPT ra Word - kể cả nói ngắn "làm chương 5 đi", "soạn tiếp bài 2". Chương THCS (lớp 6-9, 100% tự luận) thì dùng skill giao-an-tu-luan.
---

> Script chạy bằng launcher `npm run -s skill -- <đường dẫn> …` (skill nằm ở ổ G qua junction,
> `node …` trực tiếp không thấy node_modules) — xem README.md ở thư mục skills.

# Soạn trọn một chương THPT (skill thpt-12)

Tên cũ `soan-chuong-thpt`, đổi thành `thpt-12` ngày 19/9/2026 khi tách khuôn THCS ra skill riêng
`giao-an-tu-luan` (100% tự luận, đề tự luận 5 bài). Các script dùng chung (soi-chuong,
kiem-giao-an, va-giao-an, ra-cau, sua-cau-ra, xuat-chuong-word, soi-word) nằm ở đây, skill THCS
gọi sang bằng đường dẫn `.claude/skills/thpt-12/scripts/`.

Chương hoàn chỉnh gồm các phần sau, dựng theo đúng thứ tự này vì phần sau ăn theo phần trước:

1. **Lý thuyết và phân dạng** — mỗi bài một module `type = 'theory'`
2. **Bài tập tự luyện** — mỗi bài một module `title = 'Bài tập tự luyện'`, câu **rút từ kho**
3. **Năm đề ôn tập cuối chương** — trong chuyên đề ôn tập, bài `Cuối chương N`
4. **Bảng tổng hợp công thức cả chương** — module lý thuyết của bài `Cuối chương N`
5. **Xuất Word bản giáo viên** — mỗi bài một tệp
6. **Kiểm lại toàn bộ giáo án** (Bước 7) — `kiem-giao-an.mjs` về 0 lỗi, rồi mở app xem bằng mắt
7. **Rà lại tính đúng đắn của TỪNG câu hỏi** (Bước 8) — `ra-cau.mjs` bày hết câu ra, giải lại
   từng câu, sửa bằng `sua-cau-ra.mjs`. Chưa làm bước này thì **chưa được báo xong**.

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
npm run -s skill -- .claude/skills/thpt-12/scripts/soi-chuong.mjs --lop 12 --chuong "NGUYÊN HÀM"
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

**Phân dạng trước, rút câu sau — và chỉ hỏi điều đã dạy.** Câu tương tác dưới DẠNG n phải
hỏi đúng kĩ năng của DẠNG n, và mọi khái niệm trong đề phải đã xuất hiện từ đầu bài tới hết
mục ấy. Đừng tin nhãn dạng trong kho: Toán 12 chương 3 từng có dạng "mẫu không ghép nhóm"
chứa toàn câu **tính số trung bình** (kiến thức lớp 11), máy rút hai câu ấy vào mục "mẫu
không ghép nhóm" — học sinh gặp câu hỏi về thứ bài chưa dạy một chữ. Trước khi rút, đọc đề
của vài câu trong dạng; thấy nhãn sai thì **gắn lại dạng trong kho** (có sao lưu) rồi mới
rút. Dạng nào kho không có câu thì **bỏ dạng đó khỏi bài**, không giữ mục trống, không tự
chế câu.

**Mỗi câu tương tác phải mang lời giải từng bước.** Khối quiz có `phuong_phap_giai` (một
câu nêu cách làm) và `cac_buoc_thuc_hien` (mảng, mỗi phần tử một bước) — app bày thành
danh sách đánh số tròn khi thầy bấm "Xem lời giải". Lấy từ `explanation` của kho: phần
"Phương pháp giải:" vào `phuong_phap_giai`, mỗi dòng của "Lời giải:" thành một bước.
`va-giao-an.mjs` (Bước 7) làm việc này tự động cho câu còn thiếu.

**Bảng số liệu viết bằng LaTeX, không dùng ảnh cắt từ sách.** Ảnh bảng tần số cắt từ trang
sách cao 60–190 px, đặt cạnh đề trên màn chiếu thì chữ còn cao 10 px. Viết:

```
$$\begin{array}{|c|c|c|} \hline \text{Nhóm} & [10;12) & [12;14) \\ \hline \text{Tần số} & 5 & 12 \\ \hline \end{array}$$
```

App dựng bằng KaTeX sắc nét ở mọi cỡ, bộ xuất Word dựng thành bảng Word thật
(`latexToDocxTable`). Số thập phân trong ô viết `6{,}22`. Câu trong kho đang dùng ảnh bảng
thì đổi luôn trong kho (script mẫu: `scratch/bang-12c3.mjs`) rồi `va-giao-an.mjs
--dong-bo-de --thay-anh` để bài giảng hưởng theo. Hình vẽ thật (đồ thị, hình không gian)
mới để ảnh, và ảnh phải rộng **≥ 600 px**; nhỏ hơn thì cắt lại từ ảnh gốc bằng
`cat-anh.mjs` của skill nạp kho. Màn chiếu tự xếp ảnh rộng (tỉ lệ > 2,5) xuống dưới đề,
trải hết bề ngang; ảnh gần vuông mới đặt cạnh.

Bảng có **phân số trong ô** (bảng giá trị lượng giác) thì kết dòng bằng `\\[6pt]` thay vì
`\\`: KaTeX xếp dòng sát nhau, tử và mẫu của `\dfrac` chạm đường kẻ, nhìn từ cuối lớp thành
một mớ. Bộ xuất Word đã biết bỏ phần `[6pt]` (15/9/2026), đừng sợ nó lọt vào ô.

Nội dung bài giảng trong app **không phải markdown thuần**: nó có thẻ HTML để canh giữa và
vẽ khung màu trên màn hình. Cứ giữ nguyên lối ấy khi soạn — bộ xuất Word đã biết gỡ thẻ.

**Màn chiếu co cả slide lại cho vừa 1600×900** — slide nào dài là chữ nhỏ đi, không cuộn.
Ba chỗ hay dài quá: mục *Phương pháp giải* kèm luôn mục *Bấm máy* (tách bằng `---`, bấm máy
một slide riêng); ba công thức nối bằng `\qquad` trên một dòng `$$` (gãy giữa công thức —
mỗi công thức một dòng `$$`); bảng chọn công thức đặt chung slide với sáu công thức diện
tích. Lớp 10 chương 3 dính đủ ba (15/9/2026).

**Khối quiz: hoặc `answer`, hoặc `phuong_phap_giai` + `cac_buoc_thuc_hien` — không để cả
hai.** Màn chiếu bày *Phương pháp*, rồi nguyên văn `answer`, rồi các bước đánh số; để cả ba
thì lời giải hiện hai lần. Trắc nghiệm giữ phương pháp + bước; tự luận giữ `answer` (bài
giải mẫu bày ngay dưới đề). `va-giao-an.mjs` chỉ thêm bước cho khối *chưa có* lời giải nên
không tự dọn chỗ này — script rót câu phải đặt đúng từ đầu.

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
npm run -s skill -- --experimental-strip-types .claude/skills/thpt-12/scripts/xuat-chuong-word.mjs \
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
npm run -s skill -- .claude/skills/thpt-12/scripts/soi-word.mjs scratch/word/<thư mục vừa tạo>
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
| bảng chảy | Bảng LaTeX `\begin{array}…\hline` không thành bảng Word mà thành MỘT công thức dài, hàng ngăn bằng `;`, chữ `[6pt]` lọt ra |

Cột **bảng chảy** là bài học 15/9/2026: bảng giá trị lượng giác Toán 10 chương 3 xuất ra
thành một dòng công thức chảy dài với `; [6pt]` giữa các hàng, mà soi-word bản trước
báo "✓ sạch" — vì đó là công thức Word hợp lệ, cột "LaTeX thô" không bắt được, còn tôi
chỉ tin máy. Bộ dựng giáo án (`giaoAnWord.ts`) khi ấy chỉ biết bảng **markdown**; bảng
LaTeX đi chung đường công thức. Nay nó dựng `\begin{array}` có `\hline` thành bảng Word
thật như bộ đề thi, và soi-word có cột đo riêng. Nhưng bài học lớn hơn là: **soi-word
báo sạch chưa phải là sạch — bài có bảng thì phải mở tệp Word ra nhìn bảng ấy**.

Cột **bảng** phải khác 0 nếu bài có bảng. Đây là chỗ từng hỏng im lặng: bộ dựng giáo án
không biết bảng markdown, nên mọi dòng `| Bước | Bấm |` rơi xuống nhánh chữ thường và in
ra nguyên một mớ dấu gạch đứng. Trên màn hình app thì vẫn đẹp — app có bộ dựng bảng riêng
— nên chỉ mở tệp Word ra mới thấy. **Có bảng trong bài thì bắt buộc mở tệp Word xem lại**,
đừng tin mỗi màn hình.

Số `<m:oMath>` phải xấp xỉ số công thức trong nội dung; bằng 0 nghĩa là công thức hỏng hết.

## Bước 7 — Kiểm lại toàn bộ giáo án, rồi mở app xem bằng mắt

Soạn xong **chưa phải là xong**. Bảy lỗi dưới đây đều im lặng trên màn hình soạn, chỉ lộ
khi mở bài dạy lên trước lớp — thầy bắt được cả bảy trong một buổi (12/9/2026, Toán 12
chương 3):

```bash
npm run -s skill -- .claude/skills/thpt-12/scripts/kiem-giao-an.mjs --lop 12 --chuong "PHÂN TÁN"
```

| Lỗi | Nghĩa |
|---|---|
| THIẾU DỮ LIỆU | đề nói "cho ở bảng sau" mà không có bảng, không có ảnh |
| HỎI ĐIỀU CHƯA DẠY | đề nhắc khái niệm (số trung bình, phương sai, tích phân…) mà từ đầu bài tới mục ấy chưa dạy |
| LẠC DẠNG | dạng-trong-kho của câu không khớp mục chứa nó, hoặc khác các câu cùng mục |
| THIẾU LỜI GIẢI | khối không có `phuong_phap_giai` / `cac_buoc_thuc_hien` / `answer` |
| ẢNH NHỎ | ảnh trong đề rộng dưới 600 px |
| ĐÁP ÁN LỆCH | `answerIndex` / `exactAnswer` khác đáp án của câu gốc trong kho |
| THIẾU answerIndex | chọn đúng vẫn báo sai |

Phải về **0 lỗi**. Phần máy tự sửa được thì để máy sửa (chạy thử trước, có `ghi` mới ghi,
sao lưu vào `backups/va-giao-an-<ngày>/`):

```bash
npm run -s skill -- .claude/skills/thpt-12/scripts/va-giao-an.mjs --lop 12 --chuong "PHÂN TÁN" --dong-bo-de ghi
```

Nó thêm lời giải từng bước từ kho, ghép ảnh rời vào đề, chép lại đề từ kho sau khi kho
được sửa, thay ảnh bảng bằng bảng LaTeX theo bản đồ `--thay-anh <tệp.json>`, và gắn
`sourceQuestionId` cho khối đề ôn tập dựng bằng đường cũ. Câu HỎI ĐIỀU CHƯA DẠY và LẠC
DẠNG thì người phải xử: gắn lại dạng trong kho, chọn câu khác, hoặc bỏ dạng.

Cả hai script soi **cả bản trình chiếu** (`presentation_markdown`) — trang soạn bài lưu
hai bản, màn chiếu ưu tiên bản trình chiếu, sửa mỗi bản nội dung thì trên lớp vẫn thấy
bản cũ. Nhãn "(trình chiếu)" sau tên module là đang nói bản ấy.

Kiểm luôn cây danh mục — soạn chương hay đụng tên bài, tên dạng:

```bash
npm run -s skill -- .claude/skills/nap-bai-tap-vao-kho/scripts/kiem-danh-muc.mjs
```

Phải về 0 ✗ theo [docs/quy-uoc-danh-muc.md](../../../docs/quy-uoc-danh-muc.md). Tên bài trong
khoá học phải trùng từng chữ với tên bài trong kho, bài ôn tập là `Bài K. Ôn tập chương`.

Xong máy rồi thì **mở app** (thầy đăng nhập Chrome, đi qua Claude in Chrome) bấm từng
câu tương tác trên màn chiếu: bảng có đọc được từ cuối lớp không, "Xem lời giải" có ra
từng bước không, diễn giải có chỗ nào nói sai kiến thức không. Chỉ khi nhìn thấy bằng
mắt mới được báo là xong.

Đường màn chiếu: `/present/<lessonId>?moduleId=<moduleId>`, phím → sang slide, phím F
toàn màn hình. Bản chạy cục bộ (`npm run dev`) đòi đăng nhập mà tôi không được gõ mật
khẩu, nên sửa mã app thì **đẩy lên Vercel rồi xem qua Chrome của thầy**. Đừng đổi cỡ cửa
sổ Chrome giữa chừng: slide lệch khung cho tới khi tải lại trang.

Tham số `--lop` của mọi script trong skill so khớp `ilike` với tên khoá học: phải ghi
`--lop "TOÁN 10"`, ghi `--lop 10` là trúng "TOÁN CHUYÊN VÀO 10".

## Bước 8 — Rà lại tính đúng đắn của từng câu hỏi

`kiem-giao-an` chỉ soi **hình thức** (thiếu ảnh, lạc dạng, `answerIndex` lệch so với kho). Nó
không biết đáp án trong kho có **đúng** hay không — mà kho là nơi sai nằm sẵn: câu bóc từ
tài liệu mang theo cả lỗi của tài liệu, câu do AI bóc thì thêm lỗi của AI. Toán 12 chương 3
(9/2026) qua kiem-giao-an 0 lỗi, thầy mở ra thấy "sai rất nhiều câu hỏi". Từ đó, chương nào
cũng phải qua bước này, và **chưa rà thì chưa được báo xong**.

```bash
npm run -s skill -- .claude/skills/thpt-12/scripts/ra-cau.mjs --lop "TOÁN 10" --chuong "Hệ thức lượng" --cuoi "Cuối chương 3"
```

Nó bày **mọi câu** của chương (bài giảng, tự luyện, đề — mỗi câu một lần, kèm chỗ đang dùng)
ra `scratch/ra-cau/<chương>.md`: đề, phương án (đánh dấu ✔ phương án đang chọn), đáp án
TLN, bốn ý Đúng/Sai với nhãn, và lời giải đang ghi. Rồi **đọc hết tệp ấy, giải lại từng
câu** — 200 câu là chuyện bình thường, đọc theo từng khúc 700 dòng. Không có máy nào kiểm
được toán đúng hay sai; mấy cờ máy gắn (`NGHI ĐÁP ÁN`, `LG KHÔNG KHỚP`, `ĐS MỘT MÀU`,
`TLN >4 Ô`…) chỉ là chỗ nên đọc kĩ hơn, **không phải danh sách lỗi** — lần rà lớp 10 chương 3
máy gắn 9 cờ thì cả 9 là báo giả, còn hai câu sai thật thì máy không thấy.

Hai kiểu sai hay gặp mà chỉ giải lại mới lộ:

- **Đề tự mâu thuẫn**: "B nằm giữa A và D" nhưng góc nâng tại A lớn hơn tại B (điểm gần
  chân tháp hơn phải có góc nâng lớn hơn); tính đúng ra 61,4 m mà bốn phương án là 18 · 18,5
  · 60 · 60,5 — tài liệu gốc đã sai, kho chép nguyên.
- **Làm tròn nhập nhằng**: kết quả đúng bằng −0,65 mà đề bắt làm tròn tới hàng phần mười —
  học sinh ghi −0,6 hay −0,7 đều có lí. Đổi đề hỏi $20P$ để đáp án là số nguyên.

Ghi kết luận vào `scratch/ra-cau/<chương>-sua.json` (khuôn in ở cuối tệp .md: `ma`,
`ket_luan`, `sua` gồm các cột của bảng `questions`, hoặc `bo: true`), rồi:

```bash
npm run -s skill -- .claude/skills/thpt-12/scripts/sua-cau-ra.mjs scratch/ra-cau/<chương>-sua.json ghi
```

Nó sửa kho **và** dựng lại khối quiz trong mọi module đang dùng câu ấy (kể cả bản trình
chiếu), cùng quy tắc lời giải với script rót câu; `bo: true` thì gỡ khỏi bài và gắn cờ
`[CÂU HỎI CÓ THỂ BỊ SAI ĐỀ - …]` vào đề trong kho để lần rút sau không lấy lại. Sửa xong
chạy lại `kiem-giao-an.mjs` và xuất lại Word.

Khi báo thầy, nói rõ **đã rà bao nhiêu câu, sửa câu nào, vì sao** — không nói "đã kiểm"
chung chung.

Ba kiểu sai nữa bắt được ở Toán 9 chương IV (19/9/2026, 106 câu, sửa 17):

- **Kiến thức ngoài chương trình**: kho Toán 9 có câu giải bằng $AB^2 = BH \cdot BC$,
  $OH^2 = MH \cdot HN$ (hệ thức cạnh – đường cao, chương trình **cũ**; Toán 9 mới chỉ học tỉ số
  lượng giác), có câu dùng $\sin 120^\circ$ (góc tù). Giải lại bằng kiến thức đang dạy, hoặc
  loại câu.
- **Nhầm phần thập phân của độ thành phút**: $\tan^{-1} 1{,}667 = 59{,}04^\circ$ ghi thành
  $59^\circ 04'$ (đúng là $59^\circ 2'$). Cứ thấy số phút trùng hai chữ số sau dấu phẩy là nghi.
- **Trùng đề khác lời văn** giữa các module: "AB = 5, AC = 12" và "AB = 5 cm, AC = 12 cm,
  tính TSLG góc B" là một bài, vân tay chữ của app không bắt được, hai câu lọt vào hai đề.
  Chống bằng **vân tay số liệu** (dạng + bộ số trong đề, nhớ quy `2{,}5` về `2,5` trước) — xem
  `scratch/l9c4/rut-tu-luyen.mjs`. Khi rút lại, danh sách "câu đã dùng" chỉ tính module lý
  thuyết, không tính module đang dựng lại (tính vào là tự loại chính mình).
- **`correct_answer` của câu tự luận chứa nguyên lời giải** (4/181 câu): Word in "Đáp án:"
  cả trang rồi "Lời giải" thêm lần nữa. Thay bằng đáp số ngắn.

## THCS thì sang skill `giao-an-tu-luan`

Toán 6-9 có khuôn khác hẳn (100% tự luận, mỗi bài 20 câu tự luyện + bài tập ví dụ, 3-5 đề tự
luận 5 bài ở "Cuối chương N"). Đừng ép khuôn THPT vào; chi tiết ở
`.claude/skills/giao-an-tu-luan/SKILL.md`. `xuat-chuong-word.mjs` ở đây phục vụ cả hai: nhận
`--cuoi "Cuối chương N"` (THPT lẫn THCS đều đặt đề ở chuyên đề Ôn tập & Kiểm tra) và xuất thêm
module "Bài tập ví dụ" nếu bài có.

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
