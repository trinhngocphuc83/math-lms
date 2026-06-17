const fs = require('fs');
const file = 'D:\\OneDrive - Sở GD&ĐT Quảng Ngãi\\Máy tính\\NHCH\\math-lms\\src\\app\\student\\lessons\\[id]\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update imports
content = content.replace(
  "import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, XCircle, AlertCircle } from \"lucide-react\";",
  "import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, XCircle, AlertCircle, List, PlayCircle, FileText, Download } from \"lucide-react\";"
);

// 2. Replace block
const newComponents = fs.readFileSync('D:\\OneDrive - Sở GD&ĐT Quảng Ngãi\\Máy tính\\NHCH\\math-lms\\new_components.txt', 'utf8');
const startMarker = "const DocumentDownloadUI = ({ content }: { content: string }) => {";
const endMarker = "// --- LOGIC CHẤM ĐIỂM BAREM 2025 ---";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex > -1 && endIndex > -1) {
  content = content.substring(0, startIndex) + newComponents + '\n\n' + content.substring(endIndex);
  console.log("Successfully replaced DocumentDownloadUI and VideoListUI");
} else {
  console.log("Could not find start/end markers");
}

fs.writeFileSync(file, content);
