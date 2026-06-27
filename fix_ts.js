const fs = require('fs');

const file = 'D:/APP LMS/math-lms/src/app/student/lessons/[id]/AzotaExamUI.tsx';
let content = fs.readFileSync(file, 'utf8');

// Sửa import ImageIcon
const importTextOld = `import { X, Save, CheckCircle2, AlertCircle, RefreshCw, Bot, Edit3, Type, Image as LucideImage, UploadCloud, Clock, Lightbulb } from 'lucide-react';`;
const importTextNew = `import { X, Save, CheckCircle2, AlertCircle, RefreshCw, Bot, Edit3, Type, Image as LucideImage, UploadCloud, Clock, Lightbulb, Image as ImageIcon } from 'lucide-react';`;

if (content.includes(importTextOld)) {
    content = content.replace(importTextOld, importTextNew);
} else {
    // Thử import khác
    const regex = /import \{([^}]+)\} from 'lucide-react';/;
    content = content.replace(regex, (match, p1) => {
        if (!p1.includes('ImageIcon')) {
            return `import {${p1}, Image as ImageIcon } from 'lucide-react';`;
        }
        return match;
    });
}

// Sửa missing globalImages
const submitOld = `setIsGradingAll(true);

    // 1. Đếm câu theo loại`;

const submitNew = `setIsGradingAll(true);
    const globalImages = Object.values(answers).flatMap((ans: any) => ans.images || []);

    // 1. Đếm câu theo loại`;

content = content.replace(submitOld, submitNew);

// Thêm Type
content = content.replace(/\(imgSrc, imgIdx\)/g, "(imgSrc: string, imgIdx: number)");

fs.writeFileSync(file, content, 'utf8');
console.log("Fix compile errors AzotaExamUI done.");
