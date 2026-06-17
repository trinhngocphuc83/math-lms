const fs = require('fs');
const file = 'D:/OneDrive - Sở GD&ĐT Quảng Ngãi/Máy tính/NHCH/math-lms/src/app/admin/lessons/editor/page-HP.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetRegex = /<div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">([\s\S]*?)<div className="flex-1 overflow-auto bg-gray-100 p-6 flex flex-col items-center justify-center relative">/;

const replacement = `<div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50 shrink-0">
$1
            <div className="flex flex-1 overflow-hidden">
                {/* SIDEBAR SOURCE IMAGES */}
                <div className="w-44 bg-gray-50 border-r border-gray-200 p-3 flex flex-col gap-3 overflow-y-auto shrink-0 shadow-inner">
                    <div className="text-xs font-bold text-gray-500 uppercase text-center mb-2">Nguồn Ảnh Gốc</div>
                    {(() => {
                        const availableSourceImages = [
                            ...(lastAnalyzedImages || []),
                            ...(pendingImages || []).map(img => img.previewUrl)
                        ].filter(Boolean);

                        if (availableSourceImages.length === 0) {
                            return <div className="text-xs text-gray-400 text-center italic bg-white p-3 rounded border border-dashed border-gray-300">Không có ảnh gốc</div>;
                        }

                        return availableSourceImages.map((src, i) => (
                            <div 
                                key={i} 
                                onClick={() => setCropImageSrc(src)}
                                className={\`cursor-pointer border-2 rounded-xl overflow-hidden transition-all hover:border-orange-400 hover:-translate-y-0.5 \${cropImageSrc === src ? 'border-orange-600 shadow-md ring-4 ring-orange-100' : 'border-gray-200 opacity-70 hover:opacity-100'}\`}
                            >
                                <img src={src} className="w-full h-auto block object-cover bg-white" alt={\`Trang \${i+1}\`} />
                                <div className={\`text-[11px] text-center py-1.5 font-bold \${cropImageSrc === src ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'}\`}>Trang {i+1}</div>
                            </div>
                        ));
                    })()}
                </div>

                <div className="flex-1 overflow-auto bg-gray-100 p-6 flex flex-col items-center justify-center relative">`;

content = content.replace(targetRegex, replacement);

const targetRegex2 = /<div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center">/;
const replacement2 = `</div>\n            <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">`;

content = content.replace(targetRegex2, replacement2);

fs.writeFileSync(file, content, 'utf8');
console.log('Update HP file successful');
