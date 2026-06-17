const fs = require('fs');

// Update PreviewQuestionModal.tsx
let modalCode = fs.readFileSync('src/components/admin/PreviewQuestionModal.tsx', 'utf8');
modalCode = modalCode.replace(
  /question\.question_type === 'TN'/g,
  "(question.question_type === 'TN' || question.question_type === 'NLC')"
);
modalCode = modalCode.replace(
  /dangerouslySetInnerHTML=\{\{ __html: question\.content \}\}/g,
  "dangerouslySetInnerHTML={{ __html: question.content.replace(/\\[HINH VẼ ĐỒ THỊ\\]|\\[HÌNH VẼ ĐỒ THỊ\\]/gi, '') }}"
);
fs.writeFileSync('src/components/admin/PreviewQuestionModal.tsx', modalCode);
console.log('Updated PreviewQuestionModal.tsx');

// Update docxExporter.ts
let docxCode = fs.readFileSync('src/utils/docxExporter.ts', 'utf8');
docxCode = docxCode.replace(
  /q\.question_type === 'TN'/g,
  "(q.question_type === 'TN' || q.question_type === 'NLC')"
);
docxCode = docxCode.replace(
  /q\.content \? q\.content\.split\('\\n'\)/g,
  "q.content ? q.content.replace(/\\[HINH VẼ ĐỒ THỊ\\]|\\[HÌNH VẼ ĐỒ THỊ\\]/gi, '').split('\\n')"
);
fs.writeFileSync('src/utils/docxExporter.ts', docxCode);
console.log('Updated docxExporter.ts');
