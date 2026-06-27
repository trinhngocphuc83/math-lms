const fs = require('fs');

const file = 'D:/APP LMS/math-lms/src/app/student/lessons/[id]/AzotaExamUI.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldImportRegex = /import \{([^}]+)\} from 'lucide-react';/;
content = content.replace(oldImportRegex, (match, p1) => {
    if (!p1.includes('ImageIcon')) {
        return `import {${p1}, Image as ImageIcon } from 'lucide-react';`;
    }
    return match;
});

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed ImageIcon import');
