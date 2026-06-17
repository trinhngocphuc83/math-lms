const fs = require('fs');
const files = [
  'D:/OneDrive - Sở GD&ĐT Quảng Ngãi/Máy tính/NHCH/math-lms/src/app/admin/lessons/editor/page.tsx',
  'D:/OneDrive - Sở GD&ĐT Quảng Ngãi/Máy tính/NHCH/math-lms/src/app/admin/lessons/editor/page-HP.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Regex to find the broken layout wrapper
  const searchPattern = /<div className="flex-1 flex flex-col min-h-0">\s*<div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden relative">/;
  
  const replaceStr = `<div className="flex-1 flex flex-row gap-4 lg:gap-6 min-h-0 w-full overflow-hidden">
          <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden relative">`;

  if (content.match(searchPattern)) {
      content = content.replace(searchPattern, replaceStr);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Fixed flex layout successfully in ' + file);
  } else {
      console.log('Could not find broken layout pattern in ' + file);
  }
});
