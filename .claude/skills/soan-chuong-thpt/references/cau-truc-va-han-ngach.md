# Cấu trúc chương và hạn ngạch câu hỏi

Số liệu ở đây là quy ước của thầy, đã chốt qua nhiều vòng sửa. Đừng suy diễn lại từ đầu.

## Mã loại câu trong kho

Cột `question_type` của bảng `questions` lưu mã ngắn, không lưu tên đầy đủ:

| Mã | Nghĩa | Cách chấm |
|---|---|---|
| `NLC` | Trắc nghiệm nhiều lựa chọn (4 phương án, 1 đúng) | đúng/sai trọn câu |
| `DS` | Đúng/Sai, 4 ý a b c d | thang 0,1 – 0,25 – 0,5 – 1 theo số ý đúng |
| `TLN` | Trả lời ngắn (điền số) | đúng/sai trọn câu |
| `TL` | Tự luận | chấm tay theo barem |

Cột `difficulty` là 1–4: **1 nhận biết · 2 thông hiểu · 3 vận dụng · 4 vận dụng cao**.

## Bài tập tự luyện — mỗi bài học một module

| Khối | Cơ cấu | Ghi chú |
|---|---|---|
| **Lớp 12** | 20 NLC + 4 DS + 6 TLN = **30 câu** | **Không có tự luận.** Thầy đã chốt: đề tốt nghiệp không còn tự luận nên tự luyện cũng bỏ |
| **Lớp 10, 11** | 20 NLC + 4 DS + 6 TLN + 4 TL = **34 câu** | Bốn câu tự luận ở cuối |

Phân bố mức:

- **NLC chỉ lấy mức 1 và 2** (nhận biết và thông hiểu), tỉ lệ khoảng **40/60**. Đây là phần
  cho học sinh làm quen, để dành mức khó cho DS và TLN.
- **DS và TLN** chia **25 / 50 / 25** cho mức 2 / 3 / 4.
- **TL** (lớp 10, 11) ở mức 3–4.

TLN và tự luận phải **cân giữa bài toán thuần và toán thực tế** — chương nào cũng nên có
vài câu gắn tình huống đời sống.

## Năm đề ôn tập cuối chương

Đặt trong chuyên đề `loai = 'on-tap'`, bài tên `Cuối chương N`, mỗi đề là một module
`type = 'practice'`.

| Khối | Khuôn đề | Cơ cấu |
|---|---|---|
| **Lớp 10, 11** | `3-2-2-3` (khuôn dựng sẵn) | 3 phần theo khuôn của app |
| **Lớp 12** | khuôn tuỳ chỉnh **"TN THPT"**, id `f2260fcc-5ed4-43c9-9d44-b952503cf2c2` | 12 NLC × 0,25 + 4 DS × 1 + 6 TLN × 0,5 = 10 điểm, 22 câu |

Đề ôn tập nhắm **mức 7+**: lấy nhiều câu mức 2–3, vài câu mức 4 để phân loại.

## Rút câu sao cho không lệch

Rút theo vòng tròn **theo BÀI trước, dạng sau**, và **bài nào đang ít câu thì xếp trước**.

Làm ngược lại (dạng trước) thì hỏng thật: năm đề đầu tiên của chương IV từng dồn **63/110
câu vào Bài 1**, có đề chỉ được **1 câu Bài 3** — vì Bài 1 nhiều dạng hơn nên vòng lặp
theo dạng luôn quay về nó.

Trong mỗi ô, ưu tiên câu có `usage_count` thấp để kho được dùng đều và các đề khác nhau.

## Chống trùng

Trước khi chốt danh sách câu cho một module, so với các module **khác** trong cùng chương.

Phải **trừ chính module đang dựng lại** ra khỏi phép so (`.neq('title', TEN_MODULE)`).
Quên chuyện này thì lần dựng lại nào cũng thấy "trùng 100%" với chính nó: có lần báo
trùng 135 → 168 câu và Bài 3 chỉ còn rút được 1 câu.

## Khối câu hỏi trong bài giảng

Câu hỏi tương tác nằm trong `content_markdown` dưới dạng khối ```` ```quiz ```` chứa JSON.

Bắt buộc có `answerIndex` là **số thứ tự 0–3**. Bộ chấm chỉ so `selectedOpt === answerIndex`;
ghi đáp án ở `answer` (chuỗi) hay `correct_answer` (số) thì học sinh chọn đúng vẫn báo sai
và **không có dấu hiệu gì** — từng dính 19 khối, chỉ lộ khi bấm thử từng câu.

Câu rút từ kho phải kèm `sourceQuestionId` — đây là sợi dây để về sau xuất Word lấy lại
được bản ghi đầy đủ (lời giải, ảnh, barem) và để truy ngược khi câu trong kho được sửa.

Khuôn đầy đủ của một khối (trắc nghiệm):

```json
{
  "type": "multiple_choice",
  "question": "đề, ảnh/bảng nằm NGAY TRONG đề dưới dạng markdown hoặc $$\\begin{array}…$$",
  "options": ["…", "…", "…", "…"],
  "answerIndex": 2,
  "phuong_phap_giai": "một câu nêu cách làm",
  "cac_buoc_thuc_hien": ["Bước 1 …", "Bước 2 …", "Kết luận …"],
  "sourceQuestionId": "uuid trong kho",
  "maCauHoi": "CH_…"
}
```

- `phuong_phap_giai` + `cac_buoc_thuc_hien` là **bắt buộc**: app bày từng bước đánh số
  tròn khi bấm "Xem lời giải"; thiếu thì nút ấy không ra gì. Lấy từ `explanation` của kho
  (khuôn "Phương pháp giải:\n…\n\nLời giải:\n…"), mỗi dòng lời giải một bước.
- Ảnh để trong `question` (markdown), **không** để ở trường `imageUrl` riêng: hai màn hình
  từng đọc hai tên trường khác nhau, màn chiếu bỏ sót ảnh, câu "cho ở bảng sau" hiện ra
  không có bảng.
- Bảng số liệu viết bằng `$$\begin{array}{|c|c|} \hline … \end{array}$$`, không dùng ảnh
  cắt (xem SKILL.md, Bước 2).
- Đúng/Sai: `type: "true_false_cluster"`, `options: [{content, isTrue}]`. Trả lời ngắn:
  `type: "short_answer"`, `exactAnswer`.
