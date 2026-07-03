const fs = require('fs');
let code = fs.readFileSync('src/app/admin/exam-results/page.tsx', 'utf8');

// 1. Add modules state
if (!code.includes('const [modules, setModules]')) {
    code = code.replace(
        'const [lessons, setLessons] = useState<any[]>([]);',
        'const [lessons, setLessons] = useState<any[]>([]);\n  const [modules, setModules] = useState<any[]>([]);'
    );
}

// 2. Add selectedModuleId state
if (!code.includes('const [selectedModuleId, setSelectedModuleId]')) {
    code = code.replace(
        'const [selectedLessonId, setSelectedLessonId] = useState<string>("all");',
        'const [selectedLessonId, setSelectedLessonId] = useState<string>("all");\n  const [selectedModuleId, setSelectedModuleId] = useState<string>("all");'
    );
}

// 3. Update fetchData
if (!code.includes('setModules(data.modules || []);')) {
    code = code.replace(
        'setLessons(data.lessons || []);',
        'setLessons(data.lessons || []);\n      setModules(data.modules || []);'
    );
}

// 4. Update selectedModuleId reset
if (!code.includes('setSelectedModuleId("all");')) {
    code = code.replace(
        'setSelectedLessonId("all");\n  }, [selectedClassId]);',
        'setSelectedLessonId("all");\n  }, [selectedClassId]);\n\n  // Reset module selection when lesson changes\n  useEffect(() => {\n    setSelectedModuleId("all");\n  }, [selectedLessonId]);'
    );
}

// 5. Update filtering logic
if (!code.includes('const matchesModule =')) {
    code = code.replace(
        'const matchesLesson = selectedLessonId === "all" || r.lesson_id === selectedLessonId;\n\n      return matchesSearch && matchesClass && matchesLesson;',
        'const matchesLesson = selectedLessonId === "all" || r.lesson_id === selectedLessonId;\n      const matchesModule = selectedModuleId === "all" || r.module_id === selectedModuleId;\n\n      return matchesSearch && matchesClass && matchesLesson && matchesModule;'
    );
}

// 6. Update UI to show the dropdown
if (!code.includes('value={selectedModuleId}')) {
    const filterUI = `            <select
              value={selectedLessonId}
              onChange={e => setSelectedLessonId(e.target.value)}
              className="w-full md:w-64 px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
            >
              <option value="all">Tất cả bài học</option>
              {filteredLessons.map(ls => (
                <option key={ls.id} value={ls.id}>{ls.title}</option>
              ))}
            </select>
            {selectedLessonId !== "all" && modules.filter(m => m.lesson_id === selectedLessonId).length > 0 && (
              <select
                value={selectedModuleId}
                onChange={e => setSelectedModuleId(e.target.value)}
                className="w-full md:w-64 px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
              >
                <option value="all">Tất cả phần luyện tập</option>
                {modules
                  .filter(m => m.lesson_id === selectedLessonId)
                  .map((m, index) => (
                  <option key={m.id} value={m.id}>
                    {m.title || \`Phần luyện tập \${index + 1}\`}
                  </option>
                ))}
              </select>
            )}`;
    
    code = code.replace(
        /<select\s+value=\{selectedLessonId\}[\s\S]*?<\/select>/,
        filterUI
    );
}

// 7. Update table column for Bài học
if (!code.includes('result.module_id &&')) {
    const oldColumn = `<span className="text-sm font-semibold text-zinc-900 max-w-[250px] truncate" title={result.lessons?.title}>
                            {result.lessons?.title || "Không rõ bài học"}
                          </span>`;
                          
    const newColumn = `<span className="text-sm font-semibold text-zinc-900 max-w-[250px] truncate" title={result.lessons?.title}>
                            {result.lessons?.title || "Không rõ bài học"}
                          </span>
                          {result.module_id && (
                            <span className="text-[11px] text-zinc-500 font-medium truncate max-w-[250px] block mt-0.5" title={modules.find((m: any) => m.id === result.module_id)?.title || "Phần luyện tập"}>
                                {modules.find((m: any) => m.id === result.module_id)?.title || "Phần luyện tập"}
                            </span>
                          )}`;
    
    code = code.replace(oldColumn, newColumn);
}

fs.writeFileSync('src/app/admin/exam-results/page.tsx', code);
console.log('Successfully patched page.tsx!');
