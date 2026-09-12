# Quy ước cây danh mục ngân hàng câu hỏi

Thầy chốt ngày 12/9/2026 sau khi soi thấy "Toán 12 mà có hằng đẳng thức". Mọi câu đưa vào
kho — bóc bằng AI, nạp từ tài liệu, đẩy từ bài giảng, gõ tay — đều phải theo đúng năm trường
này. Cây chuẩn đã duyệt nằm ở [cay-danh-muc.json](cay-danh-muc.json); bộ kiểm
`kiem-danh-muc.mjs` (skill `nap-bai-tap-vao-kho`) đo kho theo đúng bảng dưới.

| Trường | Khuôn | Ví dụ đúng | Ví dụ sai đã gặp |
|---|---|---|---|
| `grade` | chuỗi số `"7"`…`"12"` | `"12"` | `"Lớp 12"` |
| `subject` | một trong **Đại số · Hình học · Giải tích · Thống kê** (xác suất xếp vào Thống kê) | `Thống kê` | chương thống kê lớp 12 để `Đại số` |
| `topic` | `Chương N. Tên chương` — N Ả Rập, đúng số chương của **SGK Kết nối tri thức** | `Chương 3. Căn bậc hai và căn bậc ba` | `CHƯƠNG III: …`, `Chương 2. Hằng đẳng thức` ở lớp 12 |
| `lesson` | `Bài N. Tên bài` — N **đánh lại từ 1 trong mỗi chương**; bài ôn tập là `Bài K. Ôn tập chương` với K = số bài + 1 | `Bài 1. Tỉ số lượng giác của góc nhọn` · `Bài 3. Ôn tập chương` | `Bài 11. Tỉ số…` (đánh liên tục), `Ôn tập chương I`, `Bài 2: hệ bất…`, `Bài 1 Tứ giác` |
| `math_form` | tên dạng, hoa chữ đầu, không dấu chấm cuối, một tên cho một dạng | `Tìm x thoả mãn đẳng thức` | `thoã`, `Rút gọn và tính giá trị biểu thức` song song với `…của biểu thức` |

Mỗi chương có **đúng một** bài ôn tập, mang một dạng `Bài tập tổng hợp chương N`. Tên bài
trong **cây khoá học** (bảng `lessons`) phải **trùng từng chữ** với tên bài trong kho — bài
giảng tra dạng của bài bằng tên, lệch một dấu là "kho không có dạng nào".

## Cách giữ cho kho không lệch nữa

1. **Cửa chung trong app** — `src/utils/quyUocDanhMuc.ts` chuẩn hoá hình thức (dấu chấm,
   hoa thường, La Mã → Ả Rập, chính tả) cho mọi dòng danh mục đi qua `boSungYeuCauCanDat`,
   tức cả 5 đường tạo danh mục. Máy không đoán được sai lớp / sai chương — việc đó là của
   bước 2.
2. **Bộ kiểm** — sau mỗi lần nạp câu, soạn chương, sửa danh mục:
   ```bash
   node .claude/skills/nap-bai-tap-vao-kho/scripts/kiem-danh-muc.mjs
   ```
   Phải về **0 ✗**. Nó đo: khuôn từng trường, một chương một tên, một chương một phân môn,
   số bài liền 1..n, bài ôn tập đúng K, câu ngoài danh mục, tên bài khoá học lệch kho, và
   chương/bài **chưa có trong cây chuẩn** (⚠). Chương mới đúng SGK thì
   `kiem-danh-muc.mjs --cap-nhat` để nhận vào cây chuẩn; sai thì sửa kho.
3. **Không tự thêm chương, bài, dạng mới** ngoài cây chuẩn khi nạp hay soạn. Thiếu thì hỏi
   thầy, được duyệt mới thêm rồi `--cap-nhat`.
4. Mọi lần sửa hàng loạt đều có sao lưu trong `backups/<việc>-<ngày>/` và chạy thử trước khi
   `ghi`.

## Lịch sử dọn (12/9/2026)

- 10 câu hằng đẳng thức gắn nhầm lớp 12 → lớp 8; lớp 8 chương 2 gộp hai cây về một cây SGK
  (262 câu đọc lại và chia về Bài 1/2/3 theo hằng đẳng thức dùng; 97 câu phân tích đa thức
  → Bài 4).
- Lớp 9 đánh số bài lại từ 1 trong mỗi chương (trước đánh liên tục 1–32).
- Bài ôn tập thống nhất `Bài K. Ôn tập chương` ở cả kho lẫn khoá học; thêm bài ôn tập cho
  10 chương còn thiếu.
- Lớp 10 chương 1: 163 câu dồn ở bài ôn tập chia lại về Bài 1 / Bài 2 theo dạng.
- Thống kê lớp 12, lớp 7 về phân môn Thống kê; sửa chính tả `biễu`, `thoã`, `HIệu`, viết
  hoa, dấu chấm; 25 tên bài trong khoá học đổi cho khớp kho.
- Sao lưu: `backups/don-cay-danh-muc-20260912`, `thong-nhat-cay-20260912`,
  `gop-hdt-lop8-20260912`, `khop-ten-bai-20260912`.
