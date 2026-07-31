const fs = require('fs');
let code = fs.readFileSync('src/components/admin/RichTextarea.tsx', 'utf8');

// Thay đổi định nghĩa wrapMultiLineSelection
const oldDef = 'const wrapMultiLineSelection = (selectedText: string, wrapFn: (line: string) => string) => {';
const newDef = 'const wrapMultiLineSelection = (selectedText: string, wrapFn: (line: string) => string, stylePropToClean?: string) => {';
code = code.replace(oldDef, newDef);

// Thay đổi ruột hàm wrapMultiLineSelection
const oldMapStart = 'return selectedText.split(\'\\n\').map(line => {\r\n    if (line.trim() === \'\') return line;\r\n    \r\n    // Match common Markdown block';
const oldMapStartLF = 'return selectedText.split(\'\\n\').map(line => {\n    if (line.trim() === \'\') return line;\n    \n    // Match common Markdown block';

const newLogic = eturn selectedText.split('\\n').map(line => {
    if (line.trim() === '') return line;
    
    let processedLine = line;
    if (stylePropToClean) {
        const regex = new RegExp(stylePropToClean + '\\\\s*:\\\\s*[^;"]+;?', 'gi');
        processedLine = processedLine.replace(regex, '');
    }
    
    // Match common Markdown block;
code = code.replace(oldMapStart, newLogic).replace(oldMapStartLF, newLogic);

// Cập nhật các lời gọi
code = code.replace(/const match = line\.match\(prefixRegex\);/g, 'const match = processedLine.match(prefixRegex);');
code = code.replace(/return wrapFn\(line\);/g, 'return wrapFn(processedLine);');

// 1. font-size
code = code.replace(
    /wrapMultiLineSelection\(selectedText, l => <span style="font-size: \$\{sizePx\}"> \+ \$\{l\}<\/span>\)/g, 
    'wrapMultiLineSelection(selectedText, l => <span style="font-size: "></span>, "font-size")'
);
// Fix template literal matching
code = code.replace(
    /wrapMultiLineSelection\(selectedText, l => <span style="font-size: \$\{sizePx\}">\$\{l\}<\/span>\)/g, 
    'wrapMultiLineSelection(selectedText, l => <span style="font-size: "></span>, "font-size")'
);


// 2. color
code = code.replace(
    /wrapMultiLineSelection\(selectedText, l => <span style="color: \$\{textColor\}">\$\{l\}<\/span>\)/g,
    'wrapMultiLineSelection(selectedText, l => <span style="color: "></span>, "color")'
);

// 3. line-height
code = code.replace(
    /wrapMultiLineSelection\(selectedText, l => <span style="line-height: \$\{lineHeight\}">\$\{l\}<\/span>\)/g,
    'wrapMultiLineSelection(selectedText, l => <span style="line-height: "></span>, "line-height")'
);

// 4. text-align
code = code.replace(
    /wrapMultiLineSelection\(selectedText, l => <span style="text-align: \$\{align\}; display: block">\$\{l\}<\/span>\)/g,
    'wrapMultiLineSelection(selectedText, l => <span style="text-align: ; display: block"></span>, "text-align")'
);

fs.writeFileSync('src/components/admin/RichTextarea.tsx', code);
console.log("Done");
