const fs = require('fs');
const file = 'D:\\OneDrive - Sở GD&ĐT Quảng Ngãi\\Máy tính\\NHCH\\math-lms\\src\\app\\admin\\lessons\\editor\\BlockEditor.tsx';
let content = fs.readFileSync(file, 'utf8');

const newPreview = 
  '<div className="mt-6 flex flex-col items-center bg-slate-50/50 border border-slate-200 rounded-2xl p-6">\n' +
  '  <div className="text-xs font-bold text-indigo-500 mb-5 uppercase tracking-widest flex items-center gap-2">\n' +
  '     <MonitorPlay className="w-4 h-4" /> Giao diện xem trước (Mobile)\n' +
  '  </div>\n' +
  '  <div className="relative w-[320px] h-[580px] bg-white rounded-[2.5rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden flex flex-col shrink-0 ring-1 ring-black/5">\n' +
  '     {/* iPhone Notch */}\n' +
  '     <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-2xl w-32 mx-auto z-10 flex justify-center items-end pb-1">\n' +
  '        <div className="w-12 h-1.5 bg-black/20 rounded-full"></div>\n' +
  '     </div>\n' +
  '     {/* Mobile Status Bar */}\n' +
  '     <div className="h-6 w-full bg-white flex justify-between items-center px-5 pt-1 text-[10px] font-bold text-slate-800 shrink-0 z-0 relative">\n' +
  '        <span>9:41</span>\n' +
  '        <div className="flex items-center gap-1">\n' +
  '           <div className="w-3 h-2.5 bg-slate-800 rounded-sm"></div>\n' +
  '           <div className="w-3 h-2.5 bg-slate-800 rounded-full"></div>\n' +
  '           <div className="w-4 h-2.5 border border-slate-800 rounded-sm relative"><div className="absolute inset-y-[1px] left-[1px] right-[2px] bg-slate-800 rounded-[1px]"></div></div>\n' +
  '        </div>\n' +
  '     </div>\n' +
  '     {/* App Header */}\n' +
  '     <div className="h-12 bg-white border-b border-gray-100 flex items-center px-4 shrink-0 shadow-sm relative z-0">\n' +
  '        <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><MonitorPlay className="w-3 h-3" /></div>\n' +
  '        <span className="ml-3 font-bold text-gray-800 text-sm truncate">Học Sinh View</span>\n' +
  '     </div>\n' +
  '     {/* Screen Content */}\n' +
  '     <div className="flex-1 overflow-y-auto p-5 bg-gray-50/80 scroll-smooth no-scrollbar">\n' +
  '        <div className="break-words overflow-x-hidden prose prose-sm max-w-none prose-indigo bg-white p-4 rounded-xl shadow-sm border border-gray-100">\n' +
  '           {renderQuizContent(block.content)}\n' +
  '        </div>\n' +
  '     </div>\n' +
  '     {/* Home Indicator */}\n' +
  '     <div className="h-1 w-24 bg-slate-300 rounded-full mx-auto absolute bottom-2 inset-x-0"></div>\n' +
  '  </div>\n' +
  '</div>';

const regex = /<div className="bg-indigo-50\/50 border border-indigo-100 rounded-xl p-5 shadow-inner overflow-hidden">[\s\S]*?\{renderQuizContent\(block\.content\)\}[\s\S]*?<\/div>\s*<\/div>/;

if (regex.test(content)) {
  content = content.replace(regex, newPreview + '\n</div>');
  
  if (!content.includes('MonitorPlay')) {
    content = content.replace(
      'import { GripVertical, Plus, Trash2, Layout, Video, FileText, Image as ImageIcon, LinkIcon, Bold, Italic, Type, AlignLeft, AlignCenter, AlignRight, CheckSquare, List, Link2, Code, Heading1, Heading2, Quote, PlayCircle, SplitSquareVertical, ArrowUp, ArrowDown, ExternalLink, Settings, Eye, CheckCircle2, CropIcon, AlertTriangle, Upload, X } from "lucide-react";',
      'import { GripVertical, Plus, Trash2, Layout, Video, FileText, Image as ImageIcon, LinkIcon, Bold, Italic, Type, AlignLeft, AlignCenter, AlignRight, CheckSquare, List, Link2, Code, Heading1, Heading2, Quote, PlayCircle, SplitSquareVertical, ArrowUp, ArrowDown, ExternalLink, Settings, Eye, CheckCircle2, CropIcon, AlertTriangle, Upload, X, MonitorPlay } from "lucide-react";'
    );
  }
  
  fs.writeFileSync(file, content);
  console.log("Successfully replaced preview with mobile phone frame.");
} else {
  console.log("Regex not found.");
}
