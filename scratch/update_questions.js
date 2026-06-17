const fs = require('fs');

let code = fs.readFileSync('src/app/admin/questions/page.tsx', 'utf8');

// 1. Imports
code = code.replace(
  'AlertCircle, X, Trash2',
  'AlertCircle, X, Trash2, ChevronDown, FileDown, Eye'
);
code = code.replace(
  'import QuestionEditorModal from "@/components/admin/QuestionEditorModal";',
  'import QuestionEditorModal from "@/components/admin/QuestionEditorModal";\nimport PreviewQuestionModal from "@/components/admin/PreviewQuestionModal";\nimport { exportQuestionsToWord } from "@/utils/docxExporter";'
);

// 2. States
code = code.replace(
  'const [editingQuestion, setEditingQuestion] = useState<any>(null);',
  `const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [previewQuestion, setPreviewQuestion] = useState<any>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);`
);

// 3. Cascade Filters
const filterRegex = /const uniqueGrades = .*?const uniqueForms = .*?\.filter\(Boolean\);/s;
const newFilters = `const uniqueGrades = Array.from(new Set(categories.map(c => c.grade))).filter(Boolean).sort();
  const uniqueSubjects = Array.from(new Set(categories.filter(c => !filters.grade || c.grade === filters.grade).map(c => c.subject))).filter(Boolean);
  const uniqueTopics = Array.from(new Set(categories.filter(c => (!filters.grade || c.grade === filters.grade) && (!filters.subject || c.subject === filters.subject)).map(c => c.topic))).filter(Boolean);
  const uniqueLessons = Array.from(new Set(categories.filter(c => (!filters.grade || c.grade === filters.grade) && (!filters.subject || c.subject === filters.subject) && (!filters.topic || c.topic === filters.topic)).map(c => c.lesson))).filter(Boolean);
  const uniqueForms = Array.from(new Set(categories.filter(c => (!filters.grade || c.grade === filters.grade) && (!filters.subject || c.subject === filters.subject) && (!filters.topic || c.topic === filters.topic) && (!filters.lesson || c.lesson === filters.lesson)).map(c => c.math_form))).filter(Boolean);`;
code = code.replace(filterRegex, newFilters);

// 4. Export Word Logic
code = code.replace(
  'const handleFilterChange = (field: string, value: string) => {',
  `const handleExportDocx = async (type: 'student' | 'teacher') => {
    if (selectedQuestions.length === 0) return alert("Vui lòng chọn ít nhất 1 câu hỏi!");
    try {
      // Find full question data
      const selectedData = questions.filter(q => selectedQuestions.includes(q.id));
      await exportQuestionsToWord(selectedData, type);
      setIsExportMenuOpen(false);
    } catch(e: any) {
      alert("Lỗi xuất file: " + e.message);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuestions(questions.map(q => q.id));
    } else {
      setSelectedQuestions([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) setSelectedQuestions(prev => [...prev, id]);
    else setSelectedQuestions(prev => prev.filter(qId => qId !== id));
  };

  const truncateText = (text: string) => text ? (text.length > 80 ? text.substring(0, 80) + '...' : text) : '';

  const handleFilterChange = (field: string, value: string) => {`
);

// 5. Add Export Button in Row 2
code = code.replace(
  '<button \n            onClick={() => setIsCategoryModalOpen(true)}',
  `<div className="relative">
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-4 py-3 rounded-xl font-bold transition-all text-sm shadow-sm"
            >
              <FileDown className="w-4 h-4" /> Xuất Word <ChevronDown className="w-4 h-4" />
            </button>
            {isExportMenuOpen && (
              <div className="absolute top-full mt-2 left-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                <button onClick={() => handleExportDocx('student')} className="w-full text-left px-4 py-2 hover:bg-indigo-50 font-medium text-gray-700">Bản Học Sinh (Chỉ Đề)</button>
                <button onClick={() => handleExportDocx('teacher')} className="w-full text-left px-4 py-2 hover:bg-indigo-50 font-medium text-gray-700">Bản Giáo Viên (Có Lời giải)</button>
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsCategoryModalOpen(true)}`
);

// 6. Update Table Header
code = code.replace(
  '<th className="p-4 border-b border-gray-100">Mã CH</th>',
  `<th className="p-4 border-b border-gray-100 w-12">
                  <input type="checkbox" checked={selectedQuestions.length === questions.length && questions.length > 0} onChange={e => handleSelectAll(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                </th>
                <th className="p-4 border-b border-gray-100">Mã CH</th>`
);

// 7. Update Table Body - Checkbox
code = code.replace(
  '<td colSpan={5}',
  '<td colSpan={6}'
); // 2 places
code = code.replace(
  '<td colSpan={5}',
  '<td colSpan={6}'
);
code = code.replace(
  '<td className="p-4 font-bold text-gray-700 text-sm whitespace-nowrap">{q.question_id}</td>',
  `<td className="p-4">
                    <input type="checkbox" checked={selectedQuestions.includes(q.id)} onChange={e => handleSelectOne(q.id, e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                  </td>
                  <td className="p-4 font-bold text-gray-700 text-sm whitespace-nowrap">{q.question_id}</td>`
);

// 8. Update Table Body - Content
code = code.replace(
  '<td className="p-4">\n                    <div className="text-gray-600 text-sm">{q.content}</div>\n                  </td>',
  `<td className="p-4">
                    <div 
                      className="text-gray-600 text-sm cursor-pointer group-hover:text-indigo-600 transition-colors flex items-center gap-2"
                      onClick={() => setPreviewQuestion(q)}
                      title="Bấm để xem chi tiết"
                    >
                      <span>{truncateText(q.content)}</span>
                      <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md shrink-0 flex items-center gap-1">
                        <Eye className="w-3 h-3"/> Xem
                      </span>
                    </div>
                  </td>`
);

// 9. Add Preview Modal
code = code.replace(
  '<QuestionEditorModal',
  `<PreviewQuestionModal 
        isOpen={!!previewQuestion} 
        onClose={() => setPreviewQuestion(null)} 
        question={previewQuestion} 
      />
      <QuestionEditorModal`
);

fs.writeFileSync('src/app/admin/questions/page.tsx', code);
console.log('Update Complete');
