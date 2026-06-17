const fs = require('fs');
const file = 'D:\\OneDrive - Sở GD&ĐT Quảng Ngãi\\Máy tính\\NHCH\\math-lms\\src\\app\\admin\\lessons\\editor\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update isDocumentModule -> isDocumentModule and isVideoModule
content = content.replace(
  "const isDocumentModule = moduleTitle.toLowerCase().includes('tài liệu tham khảo');",
  "const isDocumentModule = moduleTitle.toLowerCase().includes('tài liệu tham khảo');\n  const isVideoModule = moduleTitle.toLowerCase().includes('video');"
);

// 2. Update parsing logic
content = content.replace(
  "if (modData.title?.toLowerCase().includes('tài liệu tham khảo')) {",
  "if (modData.title?.toLowerCase().includes('tài liệu tham khảo') || modData.title?.toLowerCase().includes('video')) {"
);

// 3. Update saving logic
content = content.replace(
  "const isDoc = moduleTitle.toLowerCase().includes('tài liệu tham khảo');",
  "const isDoc = moduleTitle.toLowerCase().includes('tài liệu tham khảo') || moduleTitle.toLowerCase().includes('video');"
);

// 4. Update the UI
const oldUI = `{isDocumentModule ? (
             <div className="flex flex-col h-full bg-gray-50 p-6 overflow-y-auto">
                <div className="mb-6 flex justify-between items-center">
                   <h3 className="text-lg font-bold text-gray-800">Quản lý Tài liệu tải về</h3>
                   <button onClick={() => setDocList([...docList, { id: Math.random().toString(36).substring(7), title: '', url: '' }])} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors">+ Thêm tài liệu</button>
                </div>
                <div className="flex flex-col gap-4 max-w-4xl">
                   {docList.map((doc, idx) => (
                      <div key={doc.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 group relative hover:border-indigo-300 transition-colors">
                         <button onClick={() => setDocList(docList.filter(d => d.id !== doc.id))} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                         <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-indigo-500"/> Tiêu đề tài liệu</label>
                            <input type="text" value={doc.title} onChange={(e) => { const n = [...docList]; n[idx].title = e.target.value; setDocList(n); }} className="w-full text-sm font-medium border border-gray-200 rounded-lg p-3 focus:border-indigo-500 focus:outline-none" placeholder="VD: Đề thi thử số 01 (PDF)..." />
                         </div>
                         <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><LinkIcon className="w-3.5 h-3.5 text-blue-500"/> Link tải (Google Drive / OneDrive...)</label>
                            <input type="text" value={doc.url} onChange={(e) => { const n = [...docList]; n[idx].url = e.target.value; setDocList(n); }} className="w-full text-sm text-blue-600 border border-gray-200 rounded-lg p-3 focus:border-indigo-500 focus:outline-none font-mono" placeholder="https://..." />
                         </div>
                      </div>
                   ))}
                   {docList.length === 0 && (
                      <div className="text-center py-16 bg-white border-2 border-dashed border-gray-300 rounded-xl">
                         <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                         <p className="text-gray-500 font-medium mb-4">Chưa có tài liệu nào trong mục này.</p>
                         <button onClick={() => setDocList([{ id: Math.random().toString(36).substring(7), title: '', url: '' }])} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-100 transition-colors">+ Bấm để thêm tài liệu đầu tiên</button>
                      </div>
                   )}
                </div>
             </div>
          ) : (`;

const newUI = `{(isDocumentModule || isVideoModule) ? (
             <div className="flex flex-col h-full bg-gray-50 p-6 overflow-y-auto">
                <div className="mb-6 flex justify-between items-center">
                   <h3 className="text-lg font-bold text-gray-800">Quản lý {isVideoModule ? 'Video' : 'Tài liệu tải về'}</h3>
                   <button onClick={() => setDocList([...docList, { id: Math.random().toString(36).substring(7), title: '', url: '' }])} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors">+ Thêm {isVideoModule ? 'Video' : 'tài liệu'}</button>
                </div>
                <div className="flex flex-col gap-4 max-w-4xl">
                   {docList.map((doc, idx) => (
                      <div key={doc.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 group relative hover:border-indigo-300 transition-colors">
                         <button onClick={() => setDocList(docList.filter(d => d.id !== doc.id))} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                         <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">{isVideoModule ? <Video className="w-3.5 h-3.5 text-indigo-500"/> : <FileText className="w-3.5 h-3.5 text-indigo-500"/>} Tiêu đề {isVideoModule ? 'video' : 'tài liệu'}</label>
                            <input type="text" value={doc.title} onChange={(e) => { const n = [...docList]; n[idx].title = e.target.value; setDocList(n); }} className="w-full text-sm font-medium border border-gray-200 rounded-lg p-3 focus:border-indigo-500 focus:outline-none" placeholder={isVideoModule ? "VD: Video chữa câu 1-10..." : "VD: Đề thi thử số 01 (PDF)..."} />
                         </div>
                         <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><LinkIcon className="w-3.5 h-3.5 text-blue-500"/> Link {isVideoModule ? 'video (YouTube...)' : 'tải (Google Drive / OneDrive...)'}</label>
                            <input type="text" value={doc.url} onChange={(e) => { const n = [...docList]; n[idx].url = e.target.value; setDocList(n); }} className="w-full text-sm text-blue-600 border border-gray-200 rounded-lg p-3 focus:border-indigo-500 focus:outline-none font-mono" placeholder="https://..." />
                         </div>
                      </div>
                   ))}
                   {docList.length === 0 && (
                      <div className="text-center py-16 bg-white border-2 border-dashed border-gray-300 rounded-xl">
                         {isVideoModule ? <Video className="w-10 h-10 text-gray-300 mx-auto mb-3" /> : <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />}
                         <p className="text-gray-500 font-medium mb-4">Chưa có {isVideoModule ? 'video' : 'tài liệu'} nào trong mục này.</p>
                         <button onClick={() => setDocList([{ id: Math.random().toString(36).substring(7), title: '', url: '' }])} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-100 transition-colors">+ Bấm để thêm {isVideoModule ? 'video' : 'tài liệu'} đầu tiên</button>
                      </div>
                   )}
                </div>
             </div>
          ) : (`;

if (content.indexOf(oldUI) > -1) {
  content = content.replace(oldUI, newUI);
  console.log("Replaced UI successfully.");
} else {
  console.log("Could not find old UI block. Length check:", oldUI.length);
}

fs.writeFileSync(file, content);
console.log("Done updating admin page");
