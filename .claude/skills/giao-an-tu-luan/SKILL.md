---
name: giao-an-tu-luan
description: Soạn trọn một chương Toán THCS (lớp 6, 7, 8, 9) trong app math-lms theo khuôn 100% TỰ LUẬN - lý thuyết và phân dạng có câu tương tác, mỗi bài một module "Bài tập ví dụ" và 20 câu "Bài tập tự luyện" rút từ ngân hàng, 3-5 đề ôn tập cuối chương kiểu 5 bài tự luận 90 phút, bảng tổng hợp công thức, rồi xuất Word bản giáo viên. Dùng khi thầy cô nhắc tới soạn chương / soạn bài / làm đề ôn cho LỚP 6-9, giáo án tự luận, đề tự luận, kể cả nói ngắn "soạn chương 5 toán 8", "làm đề ôn chương này". Lớp 10-12 (trắc nghiệm ba dạng thức) thì dùng skill thpt-12.
---

> Script chạy bằng launcher `npm run -s skill -- <đường dẫn> …` (skill nằm ở ổ G qua junction,
> `node …` trực tiếp không thấy node_modules) — xem README.md ở thư mục skills.

# Giáo án tự luận — soạn trọn một chương THCS

Khuôn do thầy chốt 19/9/2026 sau khi soạn thử Toán 9 chương IV; con số cụ thể ở
[references/cau-truc-va-han-ngach.md](references/cau-truc-va-han-ngach.md) — đọc trước khi bắt tay,
đừng tự nghĩ lại. Khác THPT ở bốn chỗ: **100% tự luận**; mỗi bài có thêm **Bài tập ví dụ**;
**không có bài Ôn tập chương trong khoá học** (bảng công thức và đề nằm ở `Cuối chương N`
trong chuyên đề Ôn tập & Kiểm tra); đề là **5 bài tự luận / 90 phút / 10 điểm**, 3–5 đề.

Chương hoàn chỉnh, dựng theo thứ tự này:

1. **Khung bài** — `dung-khung.mjs` tạo lesson + module theo danh mục kho
2. **Lý thuyết và phân dạng** — mỗi bài một tệp markdown tự viết, `dung-ly-thuyet.mjs` rót câu tương tác từ kho
3. **Rút câu** — `rut-cau.mjs` một lượt cho ví dụ, tự luyện, các đề
4. **Dựng module** — `dung-module.mjs`
5. **Bảng tổng hợp công thức** — tệp markdown, `dung-ly-thuyet.mjs --cuoi`
6. **Kiểm giáo án** → **Rà từng câu** → **xuất Word** → **mở app xem** — dùng script chung của skill `thpt-12`

Mọi script chạy từ **gốc repo** (cần `.env.local` của app; hàm dọn đề dùng chung nằm ở `_chung/` trong thư mục skills), tham số chung
`--lop "TOÁN 9" --chuong "HỆ THỨC LƯỢNG"` (khớp `ilike` với tên khoá / tên chương). Không có
`--ghi` thì chỉ in ra để soát.

## Nguyên tắc xuyên suốt (giữ nguyên từ skill THPT)

- **Đo trước, đo sau**: `npm run -s skill -- .claude/skills/thpt-12/scripts/soi-chuong.mjs --lop "TOÁN 9" --chuong "…"`.
- **Bài tập chỉ rút từ kho**, mỗi câu mang `sourceQuestionId`. Kho chưa đủ thì nạp thêm bằng
  skill `nap-bai-tap-vao-kho` (sách của thầy ở ổ G) trước, không tự chế câu.
- **Sao lưu trước khi ghi đè**; script nào cũng có chế độ thử.
- **Soạn xong chưa phải là xong**: phải qua kiem-giao-an 0 lỗi, rà từng câu, xuất Word sạch,
  và mở app nhìn bằng mắt. Chưa đủ bốn việc thì chưa báo thầy.

## Bước 1 — Khung bài

```bash
npm run -s skill -- .claude/skills/giao-an-tu-luan/scripts/dung-khung.mjs --lop "TOÁN 9" --chuong "HỆ THỨC LƯỢNG" --de 4 --ghi
```

Đọc danh mục kho của chương (`question_categories`, bỏ bài "Ôn tập chương"), tạo mỗi bài một
lesson **đúng tên kho** với 4 module: `Lý thuyết & Phương pháp giải (Bài giảng tương tác)` ·
`Bài tập ví dụ` · `Bài tập tự luyện` · `Tài liệu & Video`; và bài `Cuối chương N` (N lấy từ
số La Mã trong tên chương) trong chuyên đề `loai = 'on-tap'` với `Tổng hợp công thức cả chương`
· `ĐỀ 1…k` · `Tài liệu & Video`. Có sẵn thì giữ, chạy lại không đẻ trùng. Chương đã lỡ có bài
"Ôn tập chương" (như chương IV Toán 9) thì script không đụng, chỉ cảnh báo.

Danh mục kho chưa có bài nào cho chương → dừng, nạp kho trước (và hỏi thầy tên chương theo
[quy ước cây danh mục](../../../docs/quy-uoc-danh-muc.md)).

## Bước 2 — Lý thuyết và phân dạng

Viết mỗi bài một tệp `scratch/giao-an-tu-luan/<chương>/lt-bai<N>.md` theo khuôn:

```markdown
# 📚 BÀI 1: TÊN BÀI
---
# PHẦN 1: TÓM TẮT LÝ THUYẾT TRỌNG TÂM
---
### 1. Mục lý thuyết      ← số + tên; bản trình chiếu tự đóng khung tím
(nội dung, công thức $…$, bảng bằng LaTeX array)
{{Q:CH_…}}                 ← câu tương tác rút từ kho, ít nhất 1 câu mỗi mục
---
# PHẦN 2: PHÂN DẠNG BÀI TẬP & PHƯƠNG PHÁP GIẢI
---
## 💡 DẠNG 1: TÊN DẠNG (viết hoa, đúng tên dạng trong kho)
### 💡 Phương pháp giải
- Bước 1… Bước 2…
### 🖩 Bấm máy Casio fx-580VN X      ← chỉ dạng bấm được (bảng markdown | Việc | Bấm | Kết quả |)
---
> ### 📌 Ví dụ mẫu
> đề
>
> Hướng dẫn giải:          ← đúng chữ này, bản trình chiếu tách slide ở đây
> từng bước
{{Q:CH_…}}
{{Q:CH_…:tln}}             ← ≥ 2 câu mỗi dạng
```

Nguồn để viết: sách thầy để ở ổ G (SGK quét → render trang PNG bằng `pymupdf` mà đọc; tài
liệu bổ trợ có chữ → `page.get_text()`), và **tên dạng lấy đúng từ danh mục kho**, xếp dạng
đông câu lên trước (dạng đông là dạng hay ra kiểm tra). Ví dụ mẫu tự viết, **đừng trùng số
liệu với câu tương tác** ngay dưới nó.

**Câu tương tác**: kho THCS gần như toàn tự luận (Toán 9 C4: 181 TL · 56 TLN · 7 NLC). Ưu tiên
NLC/TLN của kho; dạng nào không có thì **ép một câu tự luận có đáp số thành trả lời ngắn** bằng
`{{Q:<mã>:tln}}` — cần `correct_answer` ngắn trong kho ("13,77 cm", "62°" đều được, script tự
bỏ "≈" và đơn vị); thiếu thì ghi vào kho trước bằng `sua-cau-ra.mjs` (`"sua": {"correct_answer":
"14"}`). Khối ép mang cờ `epTuTuLuan` để kiem-giao-an, va-giao-an, sua-cau-ra không coi là
lệch loại / lệch đáp án. **Chỉ hỏi điều đã dạy** tới mục ấy; chương trình 2018 lớp 9 không còn
hệ thức $b^2 = ab'$, $h^2 = b'c'$ — câu kho dùng chúng thì loại.

```bash
npm run -s skill -- .claude/skills/giao-an-tu-luan/scripts/dung-ly-thuyet.mjs --lop "TOÁN 9" --chuong "HỆ THỨC LƯỢNG" --bai 1 --tep scratch/giao-an-tu-luan/<chương>/lt-bai1.md --ghi
```

Ghi cả `content_markdown` lẫn `presentation_markdown` (khung màu, tách slide) như các chương
Toán 9 đang có. Mã câu không có trong kho, hoặc ép TLN không được → script dừng và nói rõ.

## Bước 3 — Rút câu (một lượt cho cả chương)

```bash
npm run -s skill -- .claude/skills/giao-an-tu-luan/scripts/rut-cau.mjs --lop "TOÁN 9" --chuong "HỆ THỨC LƯỢNG" --de 4
```

Cho từng bài: **Bài tập ví dụ** (2 câu/dạng, chỉ NB–TH, tối đa 10) và **Bài tập tự luyện**
(20 câu: 14 TH · 3 NB · 3 VD, xoay vòng dạng); rồi **k đề**, mỗi đề 5 bài `[NB, TH, TH, TH
nhiều ý, VD]` thuộc 5 dạng khác nhau, xoay vòng qua các bài của **kho** (kể cả câu của "Ôn tập
chương"), bài 5 các đề không cùng dạng. Loại: câu hỏng theo bộ kiểm thử của app, câu không có
lời giải, câu nhắc "hình bên" mà không có ảnh, câu đã chèn trong lý thuyết, câu trùng nhau —
so bằng id, vân tay chữ **và vân tay số liệu** (cùng dạng + cùng bộ số; chính cái này bắt được
"AB = 5, AC = 12" viết hai lối mà vân tay chữ bỏ qua). Xuất `scratch/giao-an-tu-luan/<chương>/rut.json`.

In ra `✗ THIẾU` ở đâu thì kho chỗ ấy mỏng: nạp thêm kho, hoặc báo thầy — không hạ chuẩn.
`--loai CH_a,CH_b` để loại thêm câu sau khi rà (dùng hệ thức ngoài chương trình, trùng đề…).

## Bước 4 — Dựng module

```bash
npm run -s skill -- .claude/skills/giao-an-tu-luan/scripts/dung-module.mjs --lop "TOÁN 9" --chuong "HỆ THỨC LƯỢNG" --ghi
```

Mỗi câu một khối `quiz` tự luận: `answer` = "Phương pháp giải: … Lời giải: …" tách từ
`explanation` của kho, `sourceQuestionId`, `maCauHoi`, `muc`. Ví dụ và tự luyện nhóm theo dạng
(`### 💡 tên dạng`), câu đánh "**Câu n** *(mức)*"; đề đánh "**Bài n** *(điểm · mức)*", điểm
`2 · 2 · 2 · 3 · 1`, đầu đề ghi "Thời gian 90 phút · 10 điểm".

## Bước 5 — Bảng tổng hợp công thức

Tệp `scratch/giao-an-tu-luan/<chương>/cong-thuc.md`, mỗi công thức **đúng một dòng**:

```
- **Tên công thức** | $công thức$ | dùng khi nào
```

Cột tên **không chứa LaTeX** (đưa điều kiện sang cột công thức) — bộ xuất Word in cột ấy
thành chữ thường, có `$…$` là ra chữ thô. Rồi:

```bash
npm run -s skill -- .claude/skills/giao-an-tu-luan/scripts/dung-ly-thuyet.mjs --lop "TOÁN 9" --chuong "HỆ THỨC LƯỢNG" --cuoi --tep scratch/giao-an-tu-luan/<chương>/cong-thuc.md --ghi
```

## Bước 6 — Kiểm, rà, xuất Word, xem app (script chung ở `thpt-12`)

```bash
npm run -s skill -- .claude/skills/thpt-12/scripts/kiem-giao-an.mjs --lop "TOÁN 9" --chuong "HỆ THỨC LƯỢNG" --cuoi "Cuối chương 4"
npm run -s skill -- .claude/skills/thpt-12/scripts/ra-cau.mjs      --lop "TOÁN 9" --chuong "HỆ THỨC LƯỢNG" --cuoi "Cuối chương 4"
npm run -s skill -- .claude/skills/thpt-12/scripts/sua-cau-ra.mjs  scratch/ra-cau/<chương>-sua.json ghi
npm run -s skill -- --experimental-strip-types .claude/skills/thpt-12/scripts/xuat-chuong-word.mjs --lop "TOÁN 9" --chuong "HỆ THỨC LƯỢNG" --cuoi "Cuối chương 4" --tach
npm run -s skill -- .claude/skills/thpt-12/scripts/soi-word.mjs scratch/word/<thư mục vừa tạo>
npm run -s skill -- .claude/skills/nap-bai-tap-vao-kho/scripts/kiem-danh-muc.mjs
```

Ý nghĩa từng lỗi của kiem-giao-an, cách đọc tệp rà câu, khuôn tệp sửa, cách soi Word — xem
Bước 7, Bước 8 và mục "Viết script: đừng dùng heredoc" trong `thpt-12/SKILL.md`; áp dụng
nguyên xi. Word xuất **mỗi bài một tệp** (lý thuyết → bài tập ví dụ → tự luyện) + tệp tổng
hợp công thức + mỗi đề một tệp; tổng hợp công thức và đề lấy từ `Cuối chương N`.

Rà câu: **đọc và giải lại từng câu** (106 câu là bình thường). Bốn kiểu sai riêng của kho THCS
đã bắt được (Toán 9 C4, sửa 17/106): kiến thức ngoài chương trình mới; nhầm phần thập phân của
độ thành phút ($59{,}04^\circ$ → "$59^\circ 04'$"); trùng đề khác lời văn; `correct_answer` của
câu tự luận chứa nguyên lời giải (Word in hai lần) → thay bằng đáp số ngắn. Sửa xong chạy lại
kiem-giao-an, `dung-module.mjs --ghi` không cần (sua-cau-ra đã dựng lại khối), nhưng **rút lại**
(`rut-cau.mjs --loai …`) nếu loại câu; khi rút lại, danh sách "đã dùng" chỉ tính module lý
thuyết — không tính các module đang dựng lại (tính vào là tự loại chính mình).

Cuối cùng mở app (Chrome của thầy, đi qua Claude in Chrome): trình chiếu một bài, bấm vài câu
tương tác, xem đáp án và lời giải từng bước; mở một đề trong Cuối chương N. Rồi mới báo thầy —
nói rõ đã rà bao nhiêu câu, sửa câu nào, chỗ nào kho còn mỏng.

## Bẫy đã gặp

- Heredoc của shell nuốt dấu chéo ngược (`\sin` → `sin`, JSON sửa câu vỡ) — viết tệp bằng
  công cụ Write/Edit, xem `thpt-12/SKILL.md`.
- `String.replace` với chuỗi có `$$` — dùng hàm thay thế.
- Kho viết số thập phân cả `2,5` lẫn `2{,}5`; vân tay số liệu phải quy về một kiểu (script đã làm).
- Chép khuôn từ chương thầy dựng tay trước đó (Toán 9 C3 có "Luyện tập 1/2" trong bài Ôn tập
  chương) là sai — quy ước đúng là đề ở `Cuối chương N`. Khuôn nằm ở tệp references, không nằm ở
  dữ liệu cũ.
