const fs = require('fs');
let code = fs.readFileSync('src/app/admin/exams/page.tsx', 'utf8');

if (!code.includes('exportQuestionsToWord')) {
  code = code.replace('import { createClient } from "@/utils/supabase/client";', 'import { createClient } from "@/utils/supabase/client";\nimport { exportQuestionsToWord } from "@/utils/docxExporter";');
}

const exportWordRegex = /const handleExportWord = async \(\) => \{[\s\S]*?\}\s*catch[\s\S]*?\}\s*\};/;
const newExportWord = `const handleExportWord = async () => {
    try {
      if(generatedQuestions.length === 0) return alert("Chưa có đề thi nào được sinh!");
      await exportQuestionsToWord(generatedQuestions, 'teacher');
    } catch (e: any) {
      alert("Lỗi xuất Word: " + e.message);
    }
  };`;

if (exportWordRegex.test(code)) {
  code = code.replace(exportWordRegex, newExportWord);
  fs.writeFileSync('src/app/admin/exams/page.tsx', code);
  console.log('Updated exams/page.tsx to use new exporter');
} else {
  console.log('Regex not matched');
}
