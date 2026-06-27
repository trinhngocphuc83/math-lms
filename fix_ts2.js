const fs = require('fs');

const file = 'D:/APP LMS/math-lms/src/app/admin/exam-results/ReviewModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Thêm Type
content = content.replace(/\(img, imgIdx\)/g, "(img: string, imgIdx: number)");

fs.writeFileSync(file, content, 'utf8');
console.log("Fix compile errors ReviewModal done.");
