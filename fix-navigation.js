const fs = require('fs');

function fixAdminEditors() {
  const files = [
    'D:/OneDrive - Sở GD&ĐT Quảng Ngãi/Máy tính/NHCH/math-lms/src/app/admin/lessons/editor/page.tsx',
    'D:/OneDrive - Sở GD&ĐT Quảng Ngãi/Máy tính/NHCH/math-lms/src/app/admin/lessons/editor/page-HP.tsx'
  ];

  files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // Fix 1: Demo Link in collapsed header
    const demoLink1 = /<Link href=\{`\/student\/lessons\/\$\{lessonId\}`\} target="_blank" onClick=\{\(e\)=>e\.stopPropagation\(\)\} className="bg-indigo-600([^>]+)>\s*<MonitorPlay className="w-3\.5 h-3\.5" \/> Demo\s*<\/Link>/g;
    content = content.replace(demoLink1, `<button onClick={async (e) => { e.stopPropagation(); await handleSaveToDB(); window.open(\`/student/lessons/\${lessonId}\`, '_blank'); }} className="bg-indigo-600$1>\n                   <MonitorPlay className="w-3.5 h-3.5" /> Demo\n                 </button>`);

    // Fix 2: Xem Hoc Sinh Link in expanded header
    const demoLink2 = /<Link href=\{`\/student\/lessons\/\$\{lessonId\}`\} target="_blank" className="bg-indigo-600([^>]+)>\s*<MonitorPlay className="w-4 h-4" \/> (Xem H[A-Za-z0-9_]+ c sinh|Xem Học sinh)\s*<\/Link>/g;
    content = content.replace(demoLink2, `<button onClick={async (e) => { e.stopPropagation(); await handleSaveToDB(); window.open(\`/student/lessons/\${lessonId}\`, '_blank'); }} className="bg-indigo-600$1>\n                    <MonitorPlay className="w-4 h-4" /> Xem Học sinh\n                  </button>`);

    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed Admin Editor Demo Links in ' + file);
  });
}

function fixStudentDashboard() {
  const file = 'D:/OneDrive - Sở GD&ĐT Quảng Ngãi/Máy tính/NHCH/math-lms/src/app/student/dashboard/page.tsx';
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Add expandedCourseId state
  if (!content.includes('const [expandedCourseId, setExpandedCourseId] = useState')) {
    content = content.replace(/const \[activeTab, setActiveTab\] = useState<TabType>\('schedule'\);/, `const [activeTab, setActiveTab] = useState<TabType>('schedule');\n  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);`);
  }

  // Next/Link import
  if (!content.includes('import Link from "next/link"')) {
    content = content.replace(/import { useEffect, useState } from "react";/, `import { useEffect, useState } from "react";\nimport Link from "next/link";`);
  }

  // Replace button and add accordion
  const buttonRegex = /<button className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-teal-600\/20 hover:bg-teal-700 group-hover:scale-105 transition-all">\s*([A-Za-z0-9_\s]+?) <ChevronRight className="w-4 h-4" \/>\s*<\/button>/g;
  
  const replaceStr = `<button onClick={() => setExpandedCourseId(expandedCourseId === course.id ? null : course.id)} className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all">
                            {expandedCourseId === course.id ? "Đóng" : "Vào lớp học"} <ChevronRight className={\`w-4 h-4 transition-transform \${expandedCourseId === course.id ? 'rotate-90' : ''}\`} />
                          </button>
                        </div>
                        {/* Accordion Danh sách bài giảng */}
                        {expandedCourseId === course.id && (
                          <div className="mt-4 bg-white rounded-xl shadow-inner border border-gray-100 p-2 animate-in fade-in slide-in-from-top-2">
                            <h4 className="font-bold text-gray-700 px-3 py-2 text-sm border-b border-gray-100 mb-2">Danh sách Bài giảng</h4>
                            {course.lessons && course.lessons.length > 0 ? (
                               <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                                 {course.lessons.map((lesson: any) => (
                                   <Link key={lesson.id} href={\`/student/lessons/\${lesson.id}\`} className="block px-3 py-2 hover:bg-teal-50 rounded-lg text-gray-600 hover:text-teal-700 transition-colors text-sm font-medium">
                                      {lesson.title}
                                   </Link>
                                 ))}
                               </div>
                            ) : (
                               <div className="text-gray-400 italic px-3 py-2 text-sm">Chưa có bài giảng nào</div>
                            )}
                          </div>
                        )}`;

  if (content.match(buttonRegex)) {
      // The original code has the button followed by `</div>` which closes the bg-gray-50 div.
      // We need to match the button and the closing div to insert our accordion cleanly.
      const blockRegex = /<button className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-teal-600\/20 hover:bg-teal-700 group-hover:scale-105 transition-all">[\s\S]*?<\/button>\s*<\/div>/g;
      
      content = content.replace(blockRegex, replaceStr);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Fixed Student Dashboard button in ' + file);
  } else {
      console.log('Could not find the button in Student Dashboard');
  }
}

fixAdminEditors();
fixStudentDashboard();
