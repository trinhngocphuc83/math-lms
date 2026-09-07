# Tự động kích hoạt Skill Bóc tách

Khi người dùng tải lên hình ảnh hoặc tài liệu mà **không kèm theo câu lệnh nào** (hoặc câu lệnh rất ngắn như "giúp với", "làm đi"), **TUYỆT ĐỐI KHÔNG được hỏi lại "Bạn muốn tôi làm gì?"**. 

Hãy mặc định thực hiện ngay quy trình sau:
1. Xem xét nội dung hình ảnh/tài liệu được tải lên.
2. Nếu nội dung là bài tập Toán học: Lập tức áp dụng hướng dẫn của skill `math-quiz-extractor` để bóc tách câu hỏi ra định dạng JSON.
3. Nếu nội dung là bài tập Vật lý: Lập tức áp dụng hướng dẫn của skill `physics-quiz-extractor` để bóc tách câu hỏi ra định dạng JSON.
4. KHÔNG ĐƯỢC HỎI LẠI người dùng. Cứ thế âm thầm phân tích và xuất thẳng kết quả mã `quiz` như hướng dẫn của skill.
