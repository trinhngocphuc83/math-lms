import sys

filepath = r'D:\APP LMS\math-lms\src\app\api\grade-batch\route.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace model
content = content.replace('model: "gemini-1.5-flash"', 'model: "gemini-3.5-flash"')

# Replace JSON extraction
new_extract = '''    const { essays, globalImages = [], serverId = 1 } = await request.json();

    if (!essays || !Array.isArray(essays) || essays.length === 0) {
      return NextResponse.json({ error: "Không có câu hỏi tự luận nào để chấm." }, { status: 400 });
    }'''

content = content.replace('''    const { essays, serverId = 1 } = await request.json();

    if (!essays || !Array.isArray(essays) || essays.length === 0) {
      return NextResponse.json({ error: "Không có câu hỏi tự luận nào để chấm." }, { status: 400 });
    }''', new_extract)


new_prompt = '''    // Xây dựng Parts cho Prompt
    const parts: any[] = [];
    parts.push({ text: `Bạn là một Giám khảo chấm thi Toán học cực kỳ tận tâm. Học sinh vừa nộp một bài kiểm tra có nhiều câu tự luận. 
Học sinh đã đính kèm các hình ảnh chứa TOÀN BỘ bài làm viết tay của mình.

NHIỆM VỤ CỦA BẠN:
1. Phân tích các hình ảnh bài làm đính kèm. Dựa vào nội dung câu hỏi, công thức toán học và các đánh dấu "Câu 1, Câu 2" của học sinh (nếu có) để nhận diện vùng hình ảnh chứa lời giải của từng câu.
2. Đối chiếu lời giải của học sinh với Barem (đáp án mẫu).
3. Chấm điểm cho TỪNG CÂU dựa trên thang điểm tối đa (maxScore) tương ứng.
4. Tóm tắt một nhận xét ngắn gọn (feedback) về lỗi sai hoặc điểm tốt.
5. BẮT BUỘC trả về kết quả dưới định dạng MẢNG JSON ARRAY.
Định dạng mảng phải CỰC KỲ CHÍNH XÁC như sau:
[
  {
    "qIndex": (Số thứ tự câu hỏi truyền vào),
    "scoreNumber": (Điểm số học sinh đạt được, là số thực),
    "feedback": "(Nhận xét của bạn)",
    "passed": (true nếu điểm >= 50% maxScore, ngược lại false),
    "score": "(Chuỗi dạng 'Điểm/Điểm_Tối_Đa', ví dụ '8/10')"
  },
  ...
]
KHÔNG trả về bất kỳ văn bản nào khác ngoài mảng JSON này.

--- THÔNG TIN CÁC CÂU HỎI TỰ LUẬN ---` });

    for (const essay of essays) {
      parts.push({ text: `
[CÂU HỎI qIndex: ${essay.qIndex}]
- Thang điểm: ${essay.maxScore}
- Đề bài: ${essay.question || 'Không có'}
- Đáp án mẫu: ${essay.sampleAnswer || 'Không có'}
`});
    }

    if (globalImages && globalImages.length > 0) {
      parts.push({ text: `\\n--- HÌNH ẢNH BÀI LÀM CỦA HỌC SINH (Chứa toàn bộ lời giải) ---` });
      for (const img of globalImages) {
        try {
          const base64Data = img.replace(/^data:image\\/\\w+;base64,/, '');
          parts.push({ inlineData: { data: base64Data, mimeType: "image/jpeg" } });
        } catch (e) {}
      }
    } else {
      parts.push({ text: `\\n--- KHÔNG CÓ HÌNH ẢNH BÀI LÀM NÀO ĐƯỢC NỘP ---` });
    }

    parts.push({ text: `\\nHãy phân tích và trả về định dạng JSON Array kết quả của ${essays.length} câu trên.` });'''

# Thay thế khối Prompt
start_idx = content.find('    // Xây dựng Parts cho Prompt')
end_idx = content.find('    let lastError = null;')
if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_prompt + '\n\n' + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Cập nhật Backend API grade-batch thành công!")
