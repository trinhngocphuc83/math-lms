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
