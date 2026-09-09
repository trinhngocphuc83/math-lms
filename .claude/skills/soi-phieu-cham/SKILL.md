---
name: soi-phieu-cham
description: Soi lại những câu mà bộ chấm phiếu tô tròn tự gắn cờ "nét mờ" hoặc "không chắc". Cắt ảnh phóng to đúng chỗ đó, nhìn bằng mắt để phân xử, rồi báo cáo chỗ nào máy đọc sai. Dùng khi thầy cô vừa quét một tập phiếu và muốn yên tâm mà không phải tự dò từng tờ.
---

# Soi lại chỗ máy gắn cờ

## Việc này giải quyết cái gì

Bộ đọc phiếu (`src/utils/docPhieuQuet.ts`) đo hình học thuần, không dùng AI. Nó chấm
đúng gần như tất cả, nhưng có một nhóm nhỏ câu nó **tự nhận là mình đuối** và gắn cờ:

| Cờ | Nghĩa | Máy có chấm không |
|---|---|---|
| `netMo` | nét tô nhạt, đo ra gần giống một vết bẩn | **CÓ** - đã tính điểm |
| `khongChac` | tô hai ô, hoặc tẩy chưa sạch | **KHÔNG** - để trống chờ người |

Đo trên 15 phiếu thật của lớp 12: **468/468 vết tô đọc đúng**, 42 câu còn lại xác nhận là
giấy trắng, và **11 câu bị gắn cờ** (0,7 câu mỗi tờ).

Skill này đi soi đúng 11 câu ấy. Nguyên tắc: **con số vứt mất hình dạng, ảnh thì không.**
Ô đo ra "đậm 0,17" có thể là vết bẩn, mà cũng có thể là ô tô chì kín bị ăn sáng loang lổ -
nhìn ảnh phóng to thì phân biệt trong một giây, nhìn con số thì chịu.

## Cách chạy

Chạy từ thư mục gốc của app (`D:\claude\math-lms` hoặc `D:\claude\physics-lms`) - script
cần `.env.local` và `src/utils/`.

### Bước 1 - cắt ảnh những chỗ bị gắn cờ

```
node --experimental-strip-types .claude/skills/soi-phieu-cham/scripts/cat-o-ngo.mjs "<thư mục ảnh>"
```

Thêm tên một tệp ở cuối nếu chỉ muốn soi một tờ. Kết quả ra `scratch/o-ngo/`:
mỗi chỗ một ảnh PNG phóng to, kèm `so-tay.json` ghi máy đọc ra gì và đo được bao nhiêu.

Không có chỗ nào bị gắn cờ thì script báo luôn - **xong việc, không cần soi gì cả.**

### Bước 2 - nhìn từng ảnh mà phân xử

Đọc `scratch/o-ngo/so-tay.json`, rồi **mở TỪNG ảnh PNG bằng công cụ Read** và tự trả lời:
em ấy đánh dấu ô nào, hay bỏ trống?

Nhìn cái gì:

- **Ô đã tô** thì lòng ô lốm đốm (chì ăn sáng) hoặc có nét mực rõ ràng, và dấu vết **dừng
  lại ở vành ô in sẵn**. Các em ở lớp này đánh dấu hai kiểu: tô chì kín, hoặc vẽ một vòng
  bút bi xanh bên trong ô. Kiểu vòng bút bi có độ đậm trung bình rất thấp mà mắt nhìn thì
  rõ mồn một - đây là ca hay bị gắn cờ nhất.
- **Vết bẩn** thì loang lệch, tràn qua vành ô, mờ đều, không theo hình ô.
- **Tẩy chưa sạch** thì còn bóng mờ của nét cũ, nhạt hơn hẳn nét mới ở ô khác cùng câu.
- So với **ba ô còn lại của chính câu đó** trong cùng tấm ảnh - cùng cây bút, cùng lực tay,
  nên chênh lệch thấy ngay.

Ghi phán xử vào `scratch/o-ngo/phan-xu.json`, một phần tử cho mỗi mục trong `so-tay.json`:

```json
[
  { "tep": "1788708048389__NLC-4.png", "nguoiDoc": "A", "chac": true, "ghiChu": "ô A tô chì kín, ba ô kia trắng" },
  { "tep": "1788708048489__TLN-2-2.png", "nguoiDoc": "", "chac": false, "ghiChu": "chỉ có vệt mờ tràn ra ngoài vành, không phải nét tô" }
]
```

- `nguoiDoc`: ô mình đọc ra (`"A"`, `"Đ"`, `"7"`, `","`...). Để `""` nghĩa là **bỏ trống**.
- `chac`: nhìn ảnh mà vẫn phân vân thì để `false` - mục đó sẽ được đẩy lên cho thầy cô.

### Bước 3 - tổng kết

```
node --experimental-strip-types .claude/skills/soi-phieu-cham/scripts/tong-ket.mjs
```

In ra ba nhóm:

- **KHỚP** - mắt đọc giống máy. Không phải làm gì.
- **LỆCH** - mắt đọc khác máy. Đây là chỗ máy chấm sai, phải sửa tay trong app.
- **CÒN PHÂN VÂN** - `chac: false`. Chỉ những mục này mới cần thầy cô ngó.

Báo lại cho thầy cô đúng ba con số ấy, và liệt kê chi tiết nhóm LỆCH cùng nhóm CÒN PHÂN VÂN
(tờ nào, câu nào, máy đọc gì, mình đọc gì). Nhóm KHỚP thì chỉ cần một dòng tổng số.

## Sửa lại trong app

Skill này **không tự ghi vào cơ sở dữ liệu** - cố ý như vậy, vì điểm là thứ không được sửa
sau lưng. Chỗ lệch thì sửa trong trang **Chấm bài quét ảnh**: mở bài của em đó, ô chọn đáp
án ở cột bên phải sửa được ngay, điểm tự tính lại. Câu có dấu kính lúp chính là câu bị gắn
cờ `netMo`, dấu tam giác là `khongChac`.

## Nói thẳng về giới hạn

Skill này **không xoá được hẳn việc kiểm tra**, và đừng hứa với thầy cô như vậy.

Nó thu hẹp chỗ phải nhìn từ *cả tập phiếu* xuống còn *những câu máy tự nhận là đuối*, rồi
xử lý phần lớn số đó bằng mắt. Cái còn lại đúng bằng nhóm CÒN PHÂN VÂN - thường là 0.

Nó cũng **không thay được bộ đo**. Máy đo chạy lại bao nhiêu lần cũng ra một con số, có
thể kiểm chứng từng ô; mắt nhìn thì lần nào cũng có thể khác. Nên thứ tự là: máy chấm
trước, mắt chỉ soi lại chỗ máy đã tự khoanh vùng. **Đừng bao giờ đảo ngược thứ tự này** -
đừng đọc cả tờ bằng mắt, vì một lớp 40 em là hơn 1.300 quyết định, sai vài câu rải rác thì
không ai biết ở đâu mà tìm.

## Nếu số câu bị gắn cờ tăng vọt

Bình thường 0-1 câu mỗi tờ. Vọt lên 5-10 câu mỗi tờ là dấu hiệu của việc khác, đừng ngồi
soi từng cái:

- Ảnh chụp thiếu sáng hoặc quá nghiêng → chụp lại, lấy trọn bốn góc lưới.
- Cả lớp dùng bút bi mực nhạt → xem lại `PHU_DUT_KHOAT` trong `docPhieuQuet.ts`, và đo lại
  bằng `scratch/do-dac-trung-o.mjs` trước khi đổi bất cứ con số nào.
- In phiếu bị mờ hoặc co giãn → mốc đen/mốc trắng in sẵn không còn đúng, bộ đọc sẽ báo
  "không tìm được neo" chứ không gắn cờ.

**Luật chung khi đụng vào ngưỡng:** nới ngưỡng thì phải chạy lại `scratch/thu-doc-phieu.mjs`
(sáu ca "không được đọc bừa") và `scratch/cham-anh-that.mjs` (15 ảnh thật). Đo cả hai
chiều, đừng chỉ đo chiều mình mong.

Ba bộ đo ấy nằm ở `scratch/` của **app Toán** - vì ảnh phiếu thật đang có là của lớp Toán 12.
Bên app Lý chỉ có hai script của skill này; muốn đo ngưỡng thì đo ở app Toán, sửa
`docPhieuQuet.ts` xong rồi chép sang - hai app dùng chung y hệt tệp đó.
