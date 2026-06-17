const fs = require('fs');

let code = fs.readFileSync('src/app/admin/exams/page.tsx', 'utf8');

// 1. Thêm import icon
code = code.replace(
  'Sliders, Download, UploadCloud, Trash2, Printer, FileText, Settings, Database, Shuffle, CheckCircle, X',
  'Sliders, Download, UploadCloud, Trash2, Printer, FileText, Settings, Database, Shuffle, CheckCircle, X, ChevronDown, ChevronRight'
);

// 2. Thêm states mới
code = code.replace(
  'const [subject, setSubject] = useState("Đại số");',
  `const [subject, setSubject] = useState("Đại số");
  const [topicFilter, setTopicFilter] = useState("");
  const [topicList, setTopicList] = useState<string[]>([]);
  
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({});`
);

// 3. Thêm useEffect fetch Topics
const fetchTopicsHook = `
  useEffect(() => {
    const fetchTopics = async () => {
      if (!grade || !subject) {
        setTopicList([]);
        return;
      }
      const { data } = await supabase
        .from('question_categories')
        .select('topic')
        .eq('grade', grade)
        .eq('subject', subject);
      
      if (data) {
        const uniqueTopics = Array.from(new Set(data.map(d => d.topic))).filter(Boolean);
        setTopicList(uniqueTopics as string[]);
      }
    };
    fetchTopics();
  }, [grade, subject]);
`;

code = code.replace(
  'const fileInputRef = useRef<HTMLInputElement>(null);',
  `const fileInputRef = useRef<HTMLInputElement>(null);\n${fetchTopicsHook}`
);

// 4. Update fetchTreeAndInventory queries
code = code.replace(
  "if (subject) query = query.eq('subject', subject);",
  "if (subject) query = query.eq('subject', subject);\n      if (topicFilter) query = query.eq('topic', topicFilter);"
);
code = code.replace(
  "if (subject) qQuery = qQuery.eq('subject', subject);",
  "if (subject) qQuery = qQuery.eq('subject', subject);\n      if (topicFilter) qQuery = qQuery.eq('topic', topicFilter);"
);

// 5. Update Collapse/Expand handlers
const toggleFuncs = `
  const toggleTopic = (topic: string) => {
    setExpandedTopics(prev => ({ ...prev, [topic]: !prev[topic] }));
  };
  const toggleLesson = (lesson: string) => {
    setExpandedLessons(prev => ({ ...prev, [lesson]: !prev[lesson] }));
  };
`;
code = code.replace(
  'const getInventoryCount = (math_form: string) => {',
  `${toggleFuncs}\n  const getInventoryCount = (math_form: string) => {`
);

// 6. UI Dropdown Topic
const topicDropdown = `
              <select value={topicFilter} onChange={e=>setTopicFilter(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white max-w-[200px]">
                <option value="">-- Chuyên đề (Tất cả) --</option>
                {topicList.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
`;
code = code.replace(
  '<option value="Đại số và Giải tích">Đại số và Giải tích</option>\n              </select>',
  `<option value="Đại số và Giải tích">Đại số và Giải tích</option>\n              </select>\n${topicDropdown}`
);

// 7. UI TreeView Update
const oldTreeView = `{Object.entries(groupedCategories).map(([topic, lessons]) => (
                    <div key={topic} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                      <div className="font-bold text-gray-800 text-sm mb-2 text-indigo-900 border-b pb-1">{topic}</div>
                      <div className="space-y-3 pl-2">
                        {Object.entries(lessons).map(([lesson, mathForms]) => (
                          <div key={lesson}>
                            <div className="font-semibold text-gray-700 text-xs mb-1.5 flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div> {lesson}
                            </div>
                            <div className="space-y-1 pl-3">
                              {mathForms.map(form => {
                                const count = getInventoryCount(form.math_form);
                                return (
                                  <div 
                                    key={form.id} 
                                    onClick={() => addMathFormToMatrix(form)}
                                    className="text-[13px] text-gray-600 hover:text-teal-700 hover:bg-teal-50 px-2 py-1.5 rounded cursor-pointer transition-colors flex justify-between items-center group border border-transparent hover:border-teal-100"
                                  >
                                    <span className="truncate pr-2">{form.math_form}</span>
                                    <span className={\`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 \${count === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600 group-hover:bg-teal-200 group-hover:text-teal-800'}\`}>
                                      Kho: {count}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}`;

const newTreeView = `{Object.entries(groupedCategories).map(([topic, lessons]) => {
                    const isTopicExpanded = expandedTopics[topic] !== false; // Mặc định mở
                    return (
                    <div key={topic} className="border border-gray-100 rounded-lg p-2 bg-gray-50/50">
                      <div 
                        className="font-bold text-indigo-900 text-[13px] mb-1 flex items-center gap-1 cursor-pointer hover:bg-gray-200/50 p-1 rounded transition-colors"
                        onClick={() => toggleTopic(topic)}
                      >
                        {isTopicExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                        <span className="truncate" title={topic}>{topic}</span>
                      </div>
                      
                      {isTopicExpanded && (
                        <div className="space-y-2 pl-2 border-l border-indigo-100 ml-2.5 mt-2">
                          {Object.entries(lessons).map(([lesson, mathForms]) => {
                            const isLessonExpanded = expandedLessons[lesson] !== false; // Mặc định mở
                            return (
                            <div key={lesson} className="mb-2">
                              <div 
                                className="font-semibold text-gray-700 text-[12px] flex items-center gap-1 cursor-pointer hover:bg-gray-200/50 p-1.5 rounded transition-colors"
                                onClick={() => toggleLesson(lesson)}
                              >
                                {isLessonExpanded ? <ChevronDown className="w-3 h-3 text-teal-600 shrink-0" /> : <ChevronRight className="w-3 h-3 text-teal-600 shrink-0" />}
                                <span className="truncate" title={lesson}>{lesson}</span>
                              </div>
                              
                              {isLessonExpanded && (
                                <div className="space-y-0.5 pl-3 border-l border-teal-100 ml-2 mt-1">
                                  {mathForms.map(form => {
                                    const count = getInventoryCount(form.math_form);
                                    return (
                                      <div 
                                        key={form.id} 
                                        onClick={() => addMathFormToMatrix(form)}
                                        className="text-[12px] text-gray-600 hover:text-teal-700 hover:bg-teal-50 px-2 py-1.5 rounded cursor-pointer transition-colors flex justify-between items-center group border border-transparent hover:border-teal-100"
                                      >
                                        <span className="truncate pr-2" title={form.math_form}>{form.math_form}</span>
                                        <span className={\`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 \${count === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600 group-hover:bg-teal-200 group-hover:text-teal-800'}\`}>
                                          Kho: {count}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )})}
                        </div>
                      )}
                    </div>
                  )})}`;

code = code.replace(oldTreeView, newTreeView);

fs.writeFileSync('src/app/admin/exams/page.tsx', code);
console.log('Successfully updated exams/page.tsx UI for Topic Filter and TreeView Toggle');
