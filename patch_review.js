const fs = require('fs');

const file = 'D:/APP LMS/math-lms/src/app/admin/exam-results/ReviewModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldText1 = `                      {detail.question && (
                        <div className="text-sm text-zinc-700 bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                          <strong className="text-amber-800">Đề bài:</strong> {detail.question}
                        </div>
                      )}`;

const newText1 = `                      {detail.question && (
                        <div className="text-sm text-zinc-700 bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                          <strong className="text-amber-800">Đề bài:</strong> {detail.question}
                        </div>
                      )}

                      {/* Hiển thị Ảnh Bài Làm Từng Câu */}
                      {detail.images && detail.images.length > 0 && (
                        <div>
                           <label className="block text-sm font-semibold text-zinc-700 mb-2">Ảnh bài làm của học sinh:</label>
                           <div className="flex gap-3 flex-wrap">
                              {detail.images.map((img, imgIdx) => (
                                 <div key={imgIdx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-200 shadow-sm group">
                                    <img src={img} className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => setZoomedImage(img)} title="Phóng to" />
                                 </div>
                              ))}
                           </div>
                        </div>
                      )}`;

// Trong AI Box, sửa "images" thành "(detail.images && detail.images.length > 0 ? detail.images : images)" để tương thích ngược. 
// Nếu đã nộp từng câu thì lấy detail.images, nếu không thì lấy images (globalImages cũ)
const oldText2 = `                              {images.length === 0 ? (
                                <p className="text-sm text-red-500 italic">Không có ảnh để chọn.</p>
                              ) : (
                                <div className="flex gap-2 flex-wrap">
                                  {images.map((img: string, imgIdx: number) => {`;

const newText2 = `                              {!(detail.images && detail.images.length > 0) && images.length === 0 ? (
                                <p className="text-sm text-red-500 italic">Không có ảnh để chọn.</p>
                              ) : (
                                <div className="flex gap-2 flex-wrap">
                                  {((detail.images && detail.images.length > 0) ? detail.images : images).map((img: string, imgIdx: number) => {`;

if(content.includes(oldText1)) {
    content = content.replace(oldText1, newText1);
    console.log("Replaced text 1 successfully.");
} else {
    console.log("Could not find text 1");
}

if(content.includes(oldText2)) {
    content = content.replace(oldText2, newText2);
    console.log("Replaced text 2 successfully.");
} else {
    console.log("Could not find text 2");
}

fs.writeFileSync(file, content, 'utf8');
console.log("Saved.");
