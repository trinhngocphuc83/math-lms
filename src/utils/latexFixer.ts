export function fixLatexText(text: string): string {
    let fixed = text;
    fixed = fixed.replace(/\[cite_start\]/g, "").replace(/\[cite_end\]/g, "");
    fixed = fixed.replace(/\{\{\s*begincases\s*\}\}/g, "\\begin{cases}");
    fixed = fixed.replace(/\{\{\s*endcases\s*\}\}/g, "\\end{cases}");
    fixed = fixed.replace(/\\rightarrow/g, "\\rightarrow ");
    
    // Sửa lỗi ngắt dòng cho TẤT CẢ các hệ phương trình:
    // AI thường sinh ra 2 dấu gạch chéo (\\) nhưng Markdown cần 4 dấu (\\\\) để xuống dòng trong KaTeX
    fixed = fixed.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (match, inner) => {
        // Tìm chữ "\\" (được biểu diễn là "\\\\" trong chuỗi JS) mà chưa phải là 4 dấu, đổi thành "\\\\\\\\"
        let fixedInner = inner.replace(/(?<!\\)\\\\(?!\\)/g, "\\\\\\\\");
        return `\\begin{cases}${fixedInner}\\end{cases}`;
    });

    // Tự động bọc dấu $$ (block math) cho hệ phương trình nếu AI quên bọc
    // Block math giúp công thức xuống dòng độc lập và hiển thị to rõ hơn
    fixed = fixed.replace(/(?<!\$)\\begin\{cases\}[\s\S]*?\\end\{cases\}(?!\$)/g, "$$$$$&$$$$");
    
    return fixed;
}

export function applyLatexFixToActiveElement(): boolean {
    if (typeof document === 'undefined') return false;
    
    const activeEl = document.activeElement as HTMLTextAreaElement | HTMLInputElement;
    if (!activeEl || (activeEl.tagName !== 'TEXTAREA' && activeEl.tagName !== 'INPUT')) {
        return false;
    }

    const start = activeEl.selectionStart;
    const end = activeEl.selectionEnd;

    // Nếu không có vùng chọn (bôi đen), trả về false để áp dụng sửa đổi toàn bộ
    if (start === null || end === null || start === end) {
        return false;
    }

    const val = activeEl.value;
    const selected = val.substring(start, end);

    const fixedSelected = fixLatexText(selected);

    // Thay thế text trong vùng bôi đen
    activeEl.setRangeText(fixedSelected, start, end, 'select');

    // Kích hoạt sự kiện onInput để React (thông qua onChange) nhận diện thay đổi state
    const event = new Event('input', { bubbles: true });
    activeEl.dispatchEvent(event);
    
    return true; // Đã xử lý bôi đen thành công
}
