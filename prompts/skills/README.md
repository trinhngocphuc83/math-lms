# Skill soạn bài và bóc câu (Antigravity)

Bốn skill Thầy dùng ngoài app để soạn nội dung, cộng tệp `GEMINI.md` quyết định skill nào
tự chạy khi tải ảnh lên mà không gõ câu lệnh.

| Tệp | Việc |
|---|---|
| `math-quiz-extractor.md` | Bóc câu Toán từ ảnh/PDF ra khối ```` ```quiz ```` |
| `physics-quiz-extractor.md` | Bóc câu Lý |
| `lesson-drafter.md` | Soạn bài giảng Toán (lý thuyết + phân dạng) |
| `physics-lesson-drafter.md` | Soạn bài giảng Lý |
| `GEMINI.md` | Luật tự kích hoạt skill khi tải ảnh lên |

## Bản chạy nằm ở đâu

Đây là **bản sao để có lịch sử sửa đổi**. Bản thật đang chạy nằm ở:

```
G:\My Drive\Antigravity\luyen-tap\fervent-archimedes\.agents\skills\
G:\My Drive\Antigravity\lythuyet-phandang\.agents\skills\
```

Sửa ở đâu thì phải chép sang chỗ kia, không thì hai bản lệch nhau.

## Soi lại sau mỗi lần sửa

```bash
node --experimental-strip-types prompts/skills/soat-vi-du.mjs
```

Lệnh này bóc từng khối ```` ```quiz ```` trong skill ra, đọc bằng **chính bộ đọc JSON của
app**, rồi cho **chính bộ kiểm thử đề** soi. Phải ra 0 lỗi.

Vì sao phải soi ví dụ chứ không chỉ đọc lời dặn: AI học theo ví dụ mạnh hơn học theo lời
dặn. Skill Toán từng dặn đúng ("nhân đôi gạch chéo") nhưng ví dụ lại viết bốn gạch chéo,
và AI làm theo ví dụ — sinh ra 74 câu hỏng trong ngân hàng, công thức in ra đứt giữa chừng
thành `Leftrightarrow x=3`. Đo ngày 07/09/2026: bản trước khi sửa **5 lỗi**, sau khi sửa
**0 lỗi** trên 13 câu ví dụ.

## Kết quả chạy thật qua AI (07/09/2026)

Ngoài phép soi tĩnh ở trên, còn chạy thẳng skill qua Gemini với một đề nhồi những chỗ hay
vỡ nhất (vectơ, tích phân, giới hạn, hệ phương trình, vô cùng, góc độ–phút, đáp số phân số),
rồi cho bộ kiểm thử của app soi kết quả. Ba vòng mỗi bản:

| Skill Toán · bóc câu | Bản cũ | Bản mới |
|---|---|---|
| Câu bóc được | 21 | 21 |
| Lỗi | **18** | **0** |
| Chỗ bốn-gạch-chéo trong JSON | **92** | 0 |
| Đáp số trả lời ngắn | `1/2`, `1/3`, `53°8'`, `5/6` — không tô được phiếu | `0,5` — hợp lệ |

Hai điều học được từ phép chạy này:

- Lỗi gạch chéo ở bản cũ **xuất hiện ngẫu nhiên**: hai vòng sạch, vòng thứ ba hỏng 92 chỗ
  cùng lúc. Đó là lý do trước đây "lúc được lúc không", rất khó lần ra.
- Lỗi đáp số không tô được phiếu thì **lần nào cũng có** — lỗi hệ thống, không phải xui.

Ba skill còn lại (Lý bóc câu, Toán soạn bài, Lý soạn bài) chạy một vòng: đều 0 lỗi, JSON
sạch gạch chéo, dấu `$` chẵn, và bài giảng ra đủ khuôn app đọc được — tiêu đề, mục I/II,
`## 📌 CÔNG THỨC CẦN NHỚ` với 5 dòng đúng khuôn `- **Tên** | $ct$ | dùng khi nào`.

Phần chưa kiểm được: khung toạ độ ảnh (`viTriHinhAnh`, `[IMAGE_PLACEHOLDER]`) — đề mẫu là
chữ, không có hình. Muốn kiểm phải đưa ảnh đề thật vào Antigravity.
