const fs = require('fs');
const file = 'D:\\OneDrive - Sở GD&ĐT Quảng Ngãi\\Máy tính\\NHCH\\math-lms\\src\\app\\student\\lessons\\[id]\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

const videoComponent = `
const getYouTubeEmbedUrl = (url) => {
  if (!url) return '';
  const match = url.match(/(?:youtu\\.be\\/|youtube\\.com\\/(?:embed\\/|v\\/|watch\\?v=|watch\\?.+&v=))([^&?]+)/);
  if (match) return \`https://www.youtube.com/embed/\${match[1]}\`;
  return url;
};

const VideoListUI = ({ content }: { content: string }) => {
  const [videoList, setVideoList] = useState<{id: string, title: string, url: string}[]>([]);
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
    <div className="flex flex-col gap-8">
       {videoList.map((vid, idx) => {
          const embedUrl = getYouTubeEmbedUrl(vid.url);
          const isYouTube = embedUrl.includes('youtube.com/embed');
          return (
            <div key={vid.id || idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col gap-4">
              <h3 className="font-bold text-gray-800 text-xl flex items-center gap-2"><svg className="w-6 h-6 text-rose-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg> {vid.title || "Video không tên"}</h3>
              {isYouTube ? (
                <div className="relative w-full pb-[56.25%] rounded-xl overflow-hidden shadow-sm border border-gray-100">
                  <iframe src={embedUrl} allowFullScreen className="absolute top-0 left-0 w-full h-full border-none"></iframe>
                </div>
              ) : (
                <a href={vid.url} target="_blank" rel="noopener noreferrer" className="bg-rose-50 text-rose-600 px-6 py-4 rounded-xl font-bold flex items-center justify-between hover:bg-rose-100 transition-colors">
                  <span className="truncate">{vid.url}</span>
                  <span className="shrink-0 ml-4 flex items-center gap-2">Mở Video <ArrowRight className="w-4 h-4"/></span>
                </a>
              )}
            </div>
          );
       })}
    </div>
  );
};

// --- LOGIC CHẤM ĐIỂM BAREM 2025 ---
`;

if (content.indexOf('const VideoListUI') === -1) {
  content = content.replace('// --- LOGIC CHẤM ĐIỂM BAREM 2025 ---', videoComponent);
  console.log("Injected VideoListUI");
}

content = content.replace(
  "const isDocumentModule = activeModule?.title.toLowerCase().includes('tài liệu tham khảo');",
  "const isDocumentModule = activeModule?.title.toLowerCase().includes('tài liệu tham khảo');\n  const isVideoModule = activeModule?.title.toLowerCase().includes('video');"
);

content = content.replace(
  "{isDocumentModule ? (\n                  <DocumentDownloadUI content={activeModule.content_markdown || \"\"} />\n               ) : isPracticeModule ? (",
  "{isVideoModule ? (\n                  <VideoListUI content={activeModule.content_markdown || \"\"} />\n               ) : isDocumentModule ? (\n                  <DocumentDownloadUI content={activeModule.content_markdown || \"\"} />\n               ) : isPracticeModule ? ("
);

fs.writeFileSync(file, content);
console.log("Done updating student page");
