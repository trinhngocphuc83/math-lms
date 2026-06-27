const fs = require('fs');

const file = 'D:/APP LMS/math-lms/src/app/student/lessons/[id]/AzotaExamUI.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const newText1 = `                 {/* === TỰ LUẬN === */}
                 {isEssay && (
                    <div className="flex flex-col gap-4 ml-0 md:ml-12 mt-4 bg-slate-50/50 p-4 sm:p-5 rounded-2xl border-2 border-slate-100/60 transition-all hover:border-slate-200/80">
                       {!isSubmitted && (
                          <>
                             <div className="flex items-center gap-3">
                                <label className="bg-white hover:bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-xl font-bold shadow-sm border border-indigo-100 cursor-pointer transition-all flex items-center gap-2 text-sm">
                                   <UploadCloud className="w-4 h-4" /> Tải ảnh bài giải lên
                                   <input 
                                     type="file" 
                                     multiple
                                     accept="image/*" 
                                     className="hidden"
                                     onChange={(e) => handleImageUpload(e, qIndex)}
                                   />
                                </label>
                                <span className="text-sm font-medium text-slate-500">
                                   {answers[qIndex.toString()]?.images?.length ? \`Đã tải lên \${answers[qIndex.toString()]?.images?.length} ảnh\` : "Chưa có ảnh nào"}
                                </span>
                             </div>

                             {answers[qIndex.toString()]?.images?.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                                   {answers[qIndex.toString()].images.map((imgSrc, imgIdx) => (
                                      <div key={imgIdx} className="relative group rounded-xl overflow-hidden border-2 border-indigo-100 shadow-sm aspect-video sm:aspect-square">
                                         <img src={imgSrc} className="w-full h-full object-cover" />
                                         <button 
                                            onClick={() => removeImage(qIndex, imgIdx)}
                                            className="absolute top-1.5 right-1.5 bg-white/90 text-red-500 p-1.5 rounded-full shadow hover:bg-red-50 hover:text-red-600 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
                                         >
                                            <X className="w-3.5 h-3.5" />
                                         </button>
                                      </div>
                                   ))}
                                </div>
                             )}
                          </>
                       )}

                       {isSubmitted && answers[qIndex.toString()]?.images?.length > 0 && (
                          <div className="mt-2">
                             <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-slate-400" /> Ảnh bài làm đã nộp:
                             </h4>
                             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {answers[qIndex.toString()].images.map((imgSrc, imgIdx) => (
                                   <div key={imgIdx} className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                      <img src={imgSrc} className="w-full h-auto object-cover" />
                                   </div>
                                ))}
                             </div>
                          </div>
                       )}
                    </div>
                 )}`;

// Xóa lines 931 đến 1021 (tức là index 931 -> 1021) = 91 dòng
lines.splice(931, 91);

// Xóa lines 775 đến 786 (tức là index 775 -> 786) = 12 dòng, và thay bằng newText1
lines.splice(775, 12, newText1);

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log("Splice Done.");
