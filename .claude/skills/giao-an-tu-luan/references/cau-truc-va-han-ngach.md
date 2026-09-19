# Cấu trúc bài học và hạn ngạch — khuôn THCS 100% tự luận

Thầy chốt ngày 19/9/2026, sau khi soạn thử Toán 9 chương IV. Mọi con số dưới đây là quy ước,
đừng tự nghĩ lại.

## 1. Cây bài học trong app

```
Khoá "TOÁN 9 (CƠ BẢN)"
└─ CHƯƠNG IV: … (chương thường)
   ├─ Bài 1. <tên đúng như danh mục kho>
   │    ├─ theory   "Lý thuyết & Phương pháp giải (Bài giảng tương tác)"  ← + presentation_markdown
   │    ├─ practice "Bài tập ví dụ"        ← 8–10 câu tự luận có lời giải, 2 câu/dạng, NB–TH
   │    ├─ practice "Bài tập tự luyện"     ← 20 câu tự luận (14 TH · 3 NB · 3 VD)
   │    └─ document "Tài liệu & Video"
   ├─ Bài 2. …  (như trên)
   └─ (KHÔNG tạo "Bài K. Ôn tập chương" trong khoá học — bài ấy chỉ tồn tại trong danh mục kho)
└─ Ôn tập & Kiểm tra (chuyên đề loai = 'on-tap')
   └─ Cuối chương N
        ├─ theory   "Tổng hợp công thức cả chương"   ← bảng công thức, khuôn một dòng một công thức
        ├─ practice "ĐỀ 1" … "ĐỀ k"                 ← k = 3–5 đề, mỗi đề 5 bài tự luận
        └─ document "Tài liệu & Video"
```

Tên bài lấy **đúng từng chữ** từ `question_categories.lesson` của chương (trừ bài "Ôn tập
chương"). N trong "Cuối chương N" là số chương viết bằng chữ số (chương IV → 4). Đây đúng là
cách thầy đã đặt sẵn: Toán 9 có "Cuối chương 2 → ĐỀ 1", Toán 10 có "Cuối chương 3 → ĐỀ 1…5".

## 2. Hạn ngạch câu

| Module | Số câu | Cơ cấu mức | Nguồn |
|---|---|---|---|
| Câu tương tác trong lý thuyết | ≥ 1 câu mỗi mục lý thuyết, ≥ 2 câu mỗi dạng | dễ trước | NLC/TLN của kho; **không có thì đổi câu tự luận có đáp số thành trả lời ngắn** (`{{Q:<mã>:tln}}`), giữ `sourceQuestionId` |
| Bài tập ví dụ | 8–10 | chỉ NB, TH | kho, 2 câu/dạng, dạng đông câu lên trước |
| Bài tập tự luyện | 20 | **14 thông hiểu · 3 nhận biết · 3 vận dụng**, xếp dễ → khó, nhóm theo dạng | kho, xoay vòng dạng |
| Đề cuối chương | 3–5 đề × 5 bài | xem mục 3 | kho, cả chương, xoay vòng bài → dạng |

Kho thiếu mức nào thì bù bằng thông hiểu trước, rồi nhận biết, vận dụng; mức 4 (VDC) chỉ vào
bài 5 của đề. Câu đã dùng ở module nào thì không dùng lại ở module khác trong cùng chương —
so bằng `sourceQuestionId`, vân tay chữ **và vân tay số liệu** (cùng dạng + cùng bộ số trong đề).

## 3. Đề ôn tập cuối chương — 5 bài tự luận, 90 phút, 10 điểm

Khảo sát đề kiểm tra Toán 9 năm học 2024–2025, 2025–2026 (Quốc Oai, Xuân La, Nhật Tân, Chu Văn
An, Đống Đa, cụm chuyên môn 14 — Hà Nội): đề định kì **100% tự luận** đều là **5 bài, 90 phút,
1 trang**; các tỉnh khác chuộng 20–30% trắc nghiệm + 70–80% tự luận (Quảng Nam, Quảng Ninh,
Bắc Ninh). Ma trận theo Thông tư 22 / Công văn 7991 chia điểm theo mức **nhận biết 30–40% ·
thông hiểu 30–40% · vận dụng 20–30%** (trong đó vận dụng cao ≤ 10%).

Khuôn đề cuối chương của skill (thầy ưu tiên thông hiểu):

| Bài | Điểm | Mức | Lấy câu |
|---|---|---|---|
| Bài 1 | 2,0 | Nhận biết | câu 1 ý hoặc 2 ý ngắn |
| Bài 2 | 2,0 | Thông hiểu | |
| Bài 3 | 2,0 | Thông hiểu | |
| Bài 4 | 3,0 | Thông hiểu, ưu tiên câu **nhiều ý** (a, b, c) — hình học / ứng dụng thực tế | |
| Bài 5 | 1,0 | Vận dụng (kho không có thì vận dụng cao) | |

→ Tổng: NB 20% · TH 70% · VD 10% điểm; đúng tinh thần "ưu tiên thông hiểu" mà vẫn có câu
phân loại ở cuối. Năm bài lấy từ **năm dạng khác nhau**, xoay vòng qua các bài của chương
(bài ít câu xếp trước); các đề khác nhau không trùng câu. Đầu mỗi đề ghi "Thời gian 90 phút ·
10 điểm"; mỗi bài ghi điểm trong ngoặc.

Chương chỉ có 1–2 bài (ví dụ chương IV Toán 9) vẫn đủ: 5 dạng khác nhau là được.

## 4. Lý thuyết và phân dạng — theo sách giáo khoa của thầy

Thầy để sách ở ổ G (ví dụ `G:\My Drive\GIÁO ÁN DẠY THÊM\GIÁO TRÌNH TOÁN 9\<chương>\tl`):
SGK quét (chỉ có ảnh, phải render trang ra PNG mà đọc) và tài liệu bổ trợ có chữ (bóc chữ
bằng `pymupdf`). Dạng bài lấy theo **danh mục kho** của chương (tên dạng đúng từng chữ), thứ
tự dạng theo số câu trong kho giảm dần; mỗi dạng: phương pháp giải → (bấm máy nếu có) →
ví dụ mẫu tự viết → 2 câu tương tác từ kho.

Nguồn khảo sát đề: [THCS.TOANMATH.com — đề Hà Nội 2024–2026](https://thcs.toanmath.com/de-thi-hk1-toan-9),
[Quốc Oai 2024–2025](https://thcs.toanmath.com/2025/01/de-cuoi-ki-1-toan-9-nam-2024-2025-phong-gddt-quoc-oai-ha-noi.html),
[Xuân La 2024–2025](https://thcs.toanmath.com/2024/12/de-cuoi-hoc-ki-1-toan-9-nam-2024-2025-truong-thcs-xuan-la-ha-noi.html),
[Trọng Điểm – Quảng Ninh](https://thcs.toanmath.com/2025/01/de-cuoi-hoc-ky-1-toan-9-nam-2024-2025-truong-thcs-trong-diem-quang-ninh.html),
[Nguyễn Trãi – Quảng Nam](https://thcs.toanmath.com/2025/01/de-cuoi-ky-1-toan-9-nam-2024-2025-truong-thcs-nguyen-trai-quang-nam.html),
[Hướng dẫn ra đề theo Thông tư 22](https://www.studocu.vn/vn/document/truong-dai-hoc-thu-do-ha-noi/giao-duc-hoc-tieu-hoc/hd-ra-de-theo-tt-22-huong-dan-ra-de-theo-thong-tu-22/109579768).
