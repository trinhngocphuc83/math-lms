const fs = require('fs');
let code = fs.readFileSync('src/components/admin/RichTextarea.tsx', 'utf8');

// 1. Loại bỏ overflow-hidden để sticky hoạt động được
code = code.replace('transition-all overflow-hidden bg-white', 'transition-all bg-white');

// 2. Tìm index
const idxTextareaStart = code.indexOf('{/* Textarea */}');
const idxToolbarStart = code.indexOf('{/* Toolbar */}');
let idxEnd = code.lastIndexOf('</div>\n  );\n}'); // Try LF
if (idxEnd === -1) {
    idxEnd = code.lastIndexOf('</div>\r\n  );\r\n}'); // Try CRLF
}
if (idxEnd === -1) {
    console.log("Could not find end tag.");
    process.exit(1);
}

const textareaPart = code.substring(idxTextareaStart, idxToolbarStart);
let toolbarPart = code.substring(idxToolbarStart, idxEnd);

// 3. Đổi border và thêm sticky top-0 z-40 để toolbar ghim chặt bên trên
toolbarPart = toolbarPart.replace(/border-t border-gray-200 px-3 py-1/g, 'border-b border-gray-200 px-3 py-1 sticky top-0 z-40');
toolbarPart = toolbarPart.replace(/border-t border-gray-200/g, 'border-b border-gray-200 sticky top-0 z-40 shadow-sm');

// 4. Lắp ráp (Toolbar trước, Textarea sau)
const newCode = code.substring(0, idxTextareaStart) + toolbarPart + "\n      " + textareaPart + code.substring(idxEnd);

fs.writeFileSync('src/components/admin/RichTextarea.tsx', newCode);
console.log("Done");
