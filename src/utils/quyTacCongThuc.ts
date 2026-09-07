/**
 * LỜI DẶN VỀ CÔNG THỨC, DÙNG CHUNG CHO MỌI PROMPT SINH NỘI DUNG TOÁN.
 *
 * Vì sao phải gom về một chỗ: trước đây mỗi prompt tự dặn một kiểu, và có nơi dặn NGƯỢC
 * nhau. Riêng trong prompt bóc câu, hai dòng cách nhau sáu chục dòng nói trái ngược: một
 * dòng bắt "nhân đôi mọi gạch chéo", một dòng cấm "dùng hai gạch chéo". AI nhận cả hai
 * cùng lúc nên viết lung tung - đo trên kho thật: 74 câu ngân hàng và 36 câu bài soạn
 * dính lỗi gạch chéo đôi, công thức in ra đứt giữa chừng.
 *
 * Bộ đọc JSON của app (vaJson.ts) CỨU ĐƯỢC trường hợp AI viết một gạch chéo, nhưng
 * KHÔNG cứu được trường hợp nhân đôi thừa - và cũng không nên cứu, vì không phân biệt
 * nổi với dấu xuống dòng thật trong \begin{cases}. Nên chặn từ prompt là cách duy nhất.
 */

/** Dặn AI viết công thức cho đúng. Chèn vào mọi prompt có sinh ra LaTeX. */
export const QUY_TAC_CONG_THUC = `QUY TẮC CÔNG THỨC - SAI LÀ CẢ BÀI IN RA HỎNG:
- Mọi công thức, ký hiệu, biến số phải bọc trong cặp $…$, và cặp $ phải ĐÓNG ĐỦ.
- Lệnh LaTeX viết CHUẨN, MỘT dấu gạch chéo: $\\frac{1}{2}$, $\\sqrt{5}$, $\\alpha$.
- TUYỆT ĐỐI KHÔNG nhân đôi gạch chéo: $\\\\frac{1}{2}$, $\\\\alpha$ là SAI. Hai gạch chéo
  là lệnh xuống dòng, công thức sẽ đứt giữa chừng rồi in phần sau ra thành chữ thô.
  Chỗ duy nhất được dùng hai gạch chéo là xuống dòng thật trong \\begin{cases},
  \\begin{array}, \\begin{aligned}.
- TUYỆT ĐỐI KHÔNG bỏ rơi dấu gạch chéo: $frac{6}{3,5}$, $widehat{ABC}$ là SAI.`;
