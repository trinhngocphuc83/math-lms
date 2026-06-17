const fs = require('fs');
const file = 'D:\\OneDrive - Sở GD&ĐT Quảng Ngãi\\Máy tính\\NHCH\\math-lms\\src\\app\\student\\lessons\\[id]\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update imports
content = content.replace(
  "import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, XCircle, AlertCircle } from \"lucide-react\";",
  "import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, XCircle, AlertCircle, List, PlayCircle, FileText, Download } from \"lucide-react\";"
);

// 2. We will use a regex or string replacement to completely replace DocumentDownloadUI and VideoListUI.
// To do this safely, we will cut from "const DocumentDownloadUI" down to "// --- LOGIC CHẤM ĐIỂM BAREM 2025 ---"
const startMarker = "const DocumentDownloadUI = ({ content }: { content: string }) => {";
const endMarker = "// --- LOGIC CHẤM ĐIỂM BAREM 2025 ---";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex > -1 && endIndex > -1) {
  const newComponents = \`const DocumentDownloadUI = ({ content }: { content: string }) => {
  const [docList, setDocList] = useState<{id: string, title: string, url: string}[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
     try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) setDocList(parsed);
     } catch(e) {}
  }, [content]);

  if (docList.length === 0) {
     return <div className="p-10 text-center bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-500 font-medium">Chưa có tài liệu nào trong mục này.</div>;
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="w-full md:w-[35%] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden shrink-0 sticky top-[130px]">
          <div className="bg-gray-50 border-b border-gray-200 p-4 font-bold text-gray-700 flex items-center gap-2">
             <List className="w-5 h-5 text-indigo-600"/> Danh sách Tài liệu
          </div>
          <div className="flex flex-col max-h-[60vh] overflow-y-auto no-scrollbar">
             {docList.map((doc, idx) => (
                <button 
                  key={doc.id || idx} 
                  onClick={() => setActiveIndex(idx)}
                  className={\`text-left px-5 py-4 border-b border-gray-100 transition-colors flex items-center gap-3 hover:bg-indigo-50/50 \${activeIndex === idx ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}\`}
                >
                   <FileText className={\`w-5 h-5 shrink-0 \${activeIndex === idx ? 'text-indigo-600' : 'text-gray-400'}\`} />
                   <span className={\`text-sm font-medium line-clamp-2 \${activeIndex === idx ? 'text-indigo-700 font-bold' : 'text-gray-600'}\`}>
                      {doc.title || "Tài liệu không tên"}
                   </span>
                </button>
             ))}
          </div>
       </div>

       <div className="w-full md:w-[65%]">
          {(() => {
             const activeDoc = docList[activeIndex];
             if (!activeDoc) return null;
             return (
               <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col gap-6 items-center text-center">
                  <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
                     <FileText className="w-10 h-10 text-indigo-500"/>
                  </div>
                  <div className="flex flex-col gap-2">
                     <h3 className="font-bold text-gray-800 text-2xl">{activeDoc.title || "Tài liệu không tên"}</h3>
                     <a href={activeDoc.url} target="_blank" className="text-sm text-blue-500 hover:underline line-clamp-1">{activeDoc.url}</a>
                  </div>
                  <a href={activeDoc.url} target="_blank" rel="noopener noreferrer" className="mt-4 bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all hover:-translate-y-1 flex items-center justify-center gap-3 text-lg w-full sm:w-auto">
                     <Download className="w-6 h-6" />
                     Tải xuống ngay
                  </a>
               </div>
             );
          })()}
       </div>
    </div>
  );
};

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return '';
  const match = url.match(/(?:youtu\\.be\\/|youtube\\.com\\/(?:embed\\/|v\\/|watch\\?v=|watch\\?.+&v=))([^&?]+)/);
  if (match) return \`https://www.youtube.com/embed/\${match[1]}\`;
  return url;
};

const VideoListUI = ({ content }: { content: string }) => {
  const [videoList, setVideoList] = useState<{id: string, title: string, url: string}[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
     try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) setVideoList(parsed);
     } catch(e) {}
  }, [content]);

  if (videoList.length === 0) {
     return <div className="p-10 text-center bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-500 font-medium">Chưa có video nào trong mục này.</div>;
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="w-full md:w-[35%] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden shrink-0 sticky top-[130px]">
          <div className="bg-gray-50 border-b border-gray-200 p-4 font-bold text-gray-700 flex items-center gap-2">
             <List className="w-5 h-5 text-rose-600"/> Danh sách Video
          </div>
          <div className="flex flex-col max-h-[60vh] overflow-y-auto no-scrollbar">
             {videoList.map((vid, idx) => (
                <button 
                  key={vid.id || idx} 
                  onClick={() => setActiveIndex(idx)}
                  className={\`text-left px-5 py-4 border-b border-gray-100 transition-colors flex items-center gap-3 hover:bg-rose-50/50 \${activeIndex === idx ? 'bg-rose-50 border-l-4 border-l-rose-600' : 'border-l-4 border-l-transparent'}\`}
                >
                   <PlayCircle className={\`w-5 h-5 shrink-0 \${activeIndex === idx ? 'text-rose-600' : 'text-gray-400'}\`} />
                   <span className={\`text-sm font-medium line-clamp-2 \${activeIndex === idx ? 'text-rose-700 font-bold' : 'text-gray-600'}\`}>
                      {vid.title || "Video không tên"}
                   </span>
                </button>
             ))}
          </div>
       </div>

       <div className="w-full md:w-[65%] flex flex-col gap-4">
          {(() => {
             const activeVid = videoList[activeIndex];
             if (!activeVid) return null;
             const embedUrl = getYouTubeEmbedUrl(activeVid.url);
             const isYouTube = embedUrl.includes('youtube.com/embed');
             
             return (
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col gap-4">
                 <h3 className="font-bold text-gray-800 text-xl flex items-center gap-2">
                    <svg className="w-6 h-6 text-rose-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg> 
                    {activeVid.title || "Video không tên"}
                 </h3>
                 {isYouTube ? (
                   <div className="relative w-full pb-[56.25%] rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-black">
                     <iframe src={embedUrl} allowFullScreen className="absolute top-0 left-0 w-full h-full border-none"></iframe>
                   </div>
                 ) : (
                   <a href={activeVid.url} target="_blank" rel="noopener noreferrer" className="bg-rose-50 text-rose-600 px-6 py-4 rounded-xl font-bold flex items-center justify-between hover:bg-rose-100 transition-colors">
                     <span className="truncate">{activeVid.url}</span>
                     <span className="shrink-0 ml-4 flex items-center gap-2">Mở Video <ArrowRight className="w-4 h-4"/></span>
                   </a>
                 )}
               </div>
             );
          })()}
       </div>
    </div>
  );
};

// --- LOGIC CHẤM ĐIỂM BAREM 2025 ---
`;

  content = content.substring(0, startIndex) + newComponents + content.substring(endIndex + endMarker.length);
  console.log("Successfully replaced DocumentDownloadUI and VideoListUI");
} else {
  console.log("Could not find start/end markers");
}

fs.writeFileSync(file, content);
