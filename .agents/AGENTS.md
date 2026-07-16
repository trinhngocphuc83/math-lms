# Quy tắc chung cho Hệ thống (Agent Rules)

Chào mừng Thầy/Cô! Đây là file cấu hình quy tắc (Rules) dành cho các Agent (Trợ lý AI) khi thao tác với dự án này. 
Thầy/Cô có thể viết bất kỳ quy tắc, nguyên tắc lập trình, quy ước viết code, hoặc hướng dẫn hành vi nào vào đây. Mỗi khi các Agent nhận nhiệm vụ, chúng tôi sẽ tự động đọc file này và tuân thủ tuyệt đối các quy định của Thầy/Cô.

Thầy/Cô có thể tạo các quy tắc theo định dạng `<RULE>` như ví dụ mẫu bên dưới. (Có thể xóa hoặc sửa các ví dụ này tùy ý).

---

## 📋 Mẫu Quy tắc (Rules)

<RULE[code_style]>
- Mọi biến và hàm phải được đặt tên bằng tiếng Anh, rõ nghĩa (Ví dụ: `calculateTotalPrice`, không dùng `tinhTong`).
- Sử dụng TypeScript strict mode. Không sử dụng kiểu `any` trừ khi bắt buộc.
- Nếu tạo một Component UI mới, phải ưu tiên sử dụng Tailwind CSS thay vì viết style riêng.
</RULE[code_style]>

<RULE[database_rules]>
- Khi thao tác với Supabase, luôn luôn sử dụng biến môi trường `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Không bao giờ lưu trực tiếp mật khẩu người dùng dưới dạng plain text.
- Mỗi bảng mới tạo trong DB bắt buộc phải có RLS (Row Level Security).
</RULE[database_rules]>

<RULE[user_experience]>
- Giao diện phải tương thích với mọi kích thước màn hình (Responsive Design).
- Thông báo lỗi (Error messages) phải được hiển thị bằng Tiếng Việt thân thiện với người dùng (Ví dụ: "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau").
</RULE[user_experience]>
<RULE[user_experience]>
- Luôn tuân thủ nguyên tắc hỏi trước khi làm, khi nào tôi đồng ý mới tiến hành làm.
- Luôn hỏi xây dựng trên hệ thống offline hay online
</RULE[user_experience]>
<RULE[user_experience]>
- Khi update các tính năng mới không bao giờ được làm mất các tính năng cũ đã hoạt động ổn định
</RULE[user_experience]>
---
*Gợi ý: Thầy/Cô cứ tự nhiên viết thêm các rule mới ở dưới cùng nhé!*
