/**
 * Dọn phần đề câu hỏi TRƯỚC KHI rót vào bài giảng.
 *
 * Kho có 4 câu bị lần bóc trước dán thêm dòng "[CÂU HỎI CÓ THỂ BỊ SAI ĐỀ, ĐÃ SỬA LẠI]"
 * ngay đầu đề. Đó là ghi chú cho thầy cô, không phải đề bài - để nguyên thì học sinh mở
 * bài ra là đọc thấy.
 *
 * Cố ý KHÔNG sửa vào kho: nhãn ấy là dấu vết câu từng bị sai đề, thầy cô còn cần biết.
 * Chỉ gỡ ở bản rót vào bài, kho giữ nguyên.
 */
export function donDe(noiDung) {
  return String(noiDung || '')
    .replace(/^\s*\[CÂU HỎI CÓ THỂ BỊ SAI ĐỀ[^\]]*\]\s*/i, '')
    .trim();
}

/**
 * Trả lời giải về dạng có xuống dòng thật.
 *
 * Kho lưu xuống dòng bằng kí tự thật là chính; một số câu (bóc từ JSON) lưu chuỗi hai kí tự
 * "\n". Phép thay "\n" -> xuống dòng hàng loạt từng làm hỏng lệnh LaTeX bắt đầu bằng n:
 * \neq thành xuống-dòng + "eq", in ra Word là "eq 440\sqrt{2}" giữa lời giải. Kho Lý có 13
 * câu, kho Toán 11 có 40 câu dính \neq hoặc \ne như thế.
 *
 * Nên: chỉ thay khi sau "\n" KHÔNG phải chữ cái tạo thành lệnh LaTeX.
 */
export function xuongDong(s) {
  /* Tệp này từng được ghi qua heredoc của shell, dấu chéo ngược bị nuốt mất một lớp: mẫu
     thành /\n(...)/ - bắt xuống dòng THẬT rồi thay bằng xuống dòng, tức không làm gì.
     Phải là hai dấu chéo trong mã nguồn: bắt dấu chéo ngược + chữ n. */
  return String(s || '').replace(/\\n(?!eq\b|e\b|abla\b|u\b|ot\b|ewline\b|onumber\b)/g, '\n').trim();
}
