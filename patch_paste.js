const fs = require('fs');

const file = 'D:/APP LMS/math-lms/src/app/student/lessons/[id]/AzotaExamUI.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Tìm hàm handleImageUpload
const handleImageUploadMatch = content.match(/const handleImageUpload = \(e: React\.ChangeEvent<HTMLInputElement>, qIndex: number\) => \{\s+if \(e\.target\.files\) \{/);

if (handleImageUploadMatch) {
    const processImageFilesCode = `  const processImageFiles = (files: FileList | File[], qIndex: number) => {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if(ev.target?.result) {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const MAX_DIM = 1200;
              
              if (width > height && width > MAX_DIM) {
                height *= MAX_DIM / width;
                width = MAX_DIM;
              } else if (height > width && height > MAX_DIM) {
                width *= MAX_DIM / height;
                height = MAX_DIM;
              }
              
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
              
              setAnswers(prev => {
                const currentAns = prev[qIndex.toString()] || {};
                const currentImages = currentAns.images || [];
                return { ...prev, [qIndex.toString()]: { ...currentAns, images: [...currentImages, compressedBase64] } };
              });
            };
            img.src = ev.target.result as string;
          }
        };
        reader.readAsDataURL(file);
      });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, qIndex: number) => {
    if (e.target.files && e.target.files.length > 0) {
       processImageFiles(e.target.files, qIndex);
       e.target.value = ''; // Reset input để có thể chọn lại file cũ
    }
  };

  const handlePasteImage = (e: React.ClipboardEvent<HTMLDivElement>, qIndex: number) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const imageFiles = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        e.preventDefault();
        processImageFiles(imageFiles, qIndex);
      }
    }
  };`;

    // Thay thế logic handleImageUpload cũ (khoảng 35 dòng)
    const oldCodeRegex = /const handleImageUpload = \(e: React\.ChangeEvent<HTMLInputElement>, qIndex: number\) => \{[\s\S]*?reader\.readAsDataURL\(file\);\s+\}\);\s+\}\s+\};/;
    content = content.replace(oldCodeRegex, processImageFilesCode);
}

// 2. Tìm khu vực tải ảnh lên và thêm Paste Zone
const uiRegex = /<div className="flex items-center gap-3">[\s\S]*?<label className="bg-white hover:bg-indigo-50 text-indigo-600 px-5 py-2\.5 rounded-xl font-bold shadow-sm border border-indigo-100 cursor-pointer transition-all flex items-center gap-2 text-sm">[\s\S]*?<UploadCloud className="w-4 h-4" \/> Tải ảnh bài giải lên[\s\S]*?<input [\s\S]*?className="hidden"[\s\S]*?onChange=\{\(e\) => handleImageUpload\(e, qIndex\)\}[\s\S]*?\/>[\s\S]*?<\/label>[\s\S]*?<span className="text-sm font-medium text-slate-500">[\s\S]*?\{answers\[qIndex\.toString\(\)\]\?\.images\?\.length \? `Đã tải lên \$\{answers\[qIndex\.toString\(\)\]\?\.images\?\.length\} ảnh` : "Chưa có ảnh nào"\}[\s\S]*?<\/span>[\s\S]*?<\/div>/;

const newUi = `<div 
                                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-2 border-dashed border-indigo-200 rounded-xl bg-white/50 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all cursor-text outline-none relative overflow-hidden"
                                tabIndex={0}
                                onPaste={(e) => handlePasteImage(e, qIndex)}
                                title="Nhấp vào khung này rồi ấn Ctrl+V để dán ảnh"
                             >
                                <div className="absolute inset-0 bg-indigo-50/20 pointer-events-none"></div>
                                <label className="relative bg-white hover:bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-xl font-bold shadow-sm border border-indigo-100 cursor-pointer transition-all flex items-center gap-2 text-sm whitespace-nowrap z-10 shrink-0">
                                   <UploadCloud className="w-4 h-4" /> Tải ảnh lên
                                   <input 
                                     type="file" 
                                     multiple
                                     accept="image/*" 
                                     className="hidden"
                                     onChange={(e) => handleImageUpload(e, qIndex)}
                                   />
                                </label>
                                <div className="flex flex-col relative z-10">
                                   <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                      Hoặc click vào khung này và ấn <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono text-slate-600 shadow-sm">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono text-slate-600 shadow-sm">V</kbd> để dán ảnh
                                   </span>
                                   <span className="text-xs font-medium text-slate-500 mt-1">
                                      {answers[qIndex.toString()]?.images?.length ? \`✅ Đã tải lên \${answers[qIndex.toString()]?.images?.length} ảnh\` : "Chưa có ảnh nào"}
                                   </span>
                                </div>
                             </div>`;

content = content.replace(uiRegex, newUi);

fs.writeFileSync(file, content, 'utf8');
console.log("Patch Paste Feature done.");
