const fs = require('fs');
const file = 'D:\\OneDrive - Sở GD&ĐT Quảng Ngãi\\Máy tính\\NHCH\\math-lms\\src\\app\\admin\\lessons\\editor\\BlockEditor.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldPreview = \`<div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 shadow-inner overflow-hidden">
                          <div className="text-xs font-bold text-indigo-400 mb-3 uppercase tracking-wider">Xem tr\u01B0\u1EDBc:</div>
                          <div className="flex-1 min-w-0 break-words overflow-x-auto prose prose-sm sm:prose-base max-w-none prose-indigo">
                             {renderQuizContent(block.content)}
                          </div>
                       </div>\`;

const newPreview = \`<div className="mt-6 flex flex-col items-center bg-slate-50/50 border border-slate-200 rounded-2xl p-6">
                          <div className="text-xs font-bold text-indigo-500 mb-5 uppercase tracking-widest flex items-center gap-2">
                             <MonitorPlay className="w-4 h-4" /> Giao di\u1EC7n xem tr\u01B0\u1EDBc (Mobile)
                          </div>
                          <div className="relative w-[320px] h-[580px] bg-white rounded-[2.5rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden flex flex-col shrink-0 ring-1 ring-black/5">
                             {/* iPhone Notch */}
                             <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-2xl w-32 mx-auto z-10 flex justify-center items-end pb-1">
                                <div className="w-12 h-1.5 bg-black/20 rounded-full"></div>
                             </div>
                             
                             {/* Mobile Status Bar */}
                             <div className="h-6 w-full bg-white flex justify-between items-center px-5 pt-1 text-[10px] font-bold text-slate-800 shrink-0 z-0 relative">
                                <span>9:41</span>
                                <div className="flex items-center gap-1">
                                   <div className="w-3 h-2.5 bg-slate-800 rounded-sm"></div>
                                   <div className="w-3 h-2.5 bg-slate-800 rounded-full"></div>
                                   <div className="w-4 h-2.5 border border-slate-800 rounded-sm relative"><div className="absolute inset-y-[1px] left-[1px] right-[2px] bg-slate-800 rounded-[1px]"></div></div>
                                </div>
                             </div>

                             {/* App Header */}
                             <div className="h-12 bg-white border-b border-gray-100 flex items-center px-4 shrink-0 shadow-sm relative z-0">
                                <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><MonitorPlay className="w-3 h-3" /></div>
                                <span className="ml-3 font-bold text-gray-800 text-sm truncate">H\u1ECDc Sinh View</span>
                             </div>

                             {/* Screen Content */}
                             <div className="flex-1 overflow-y-auto p-5 bg-gray-50/80 scroll-smooth">
                                <div className="break-words overflow-x-hidden prose prose-sm max-w-none prose-indigo bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                   {renderQuizContent(block.content)}
                                </div>
                             </div>
                             
                             {/* Home Indicator */}
                             <div className="h-1 w-24 bg-slate-300 rounded-full mx-auto absolute bottom-2 inset-x-0"></div>
                          </div>
                       </div>\`;

// Since the exact old string might have whitespace differences, we will use a regex to replace it
const regex = /<div className="bg-indigo-50\/50 border border-indigo-100 rounded-xl p-5 shadow-inner overflow-hidden">[\s\S]*?\{renderQuizContent\(block\.content\)\}[\s\S]*?<\/div>\s*<\/div>/;

if (regex.test(content)) {
  content = content.replace(regex, newPreview);
  
  // Need to ensure MonitorPlay is imported
  if (!content.includes('MonitorPlay')) {
    content = content.replace(
      'import { GripVertical, Plus, Trash2, Layout, Video, FileText, Image as ImageIcon, LinkIcon, Bold, Italic, Type, AlignLeft, AlignCenter, AlignRight, CheckSquare, List, Link2, Code, Heading1, Heading2, Quote, PlayCircle, SplitSquareVertical, ArrowUp, ArrowDown, ExternalLink, Settings, Eye, CheckCircle2, CropIcon, AlertTriangle, Upload, X } from "lucide-react";',
      'import { GripVertical, Plus, Trash2, Layout, Video, FileText, Image as ImageIcon, LinkIcon, Bold, Italic, Type, AlignLeft, AlignCenter, AlignRight, CheckSquare, List, Link2, Code, Heading1, Heading2, Quote, PlayCircle, SplitSquareVertical, ArrowUp, ArrowDown, ExternalLink, Settings, Eye, CheckCircle2, CropIcon, AlertTriangle, Upload, X, MonitorPlay } from "lucide-react";'
    );
  }
  
  fs.writeFileSync(file, content);
  console.log("Successfully added mobile preview frame");
} else {
  console.log("Could not find the target block preview using regex.");
}
