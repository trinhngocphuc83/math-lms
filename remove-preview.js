const fs = require('fs');
const files = [
  'D:/OneDrive - Sở GD&ĐT Quảng Ngãi/Máy tính/NHCH/math-lms/src/app/admin/lessons/editor/page.tsx',
  'D:/OneDrive - Sở GD&ĐT Quảng Ngãi/Máy tính/NHCH/math-lms/src/app/admin/lessons/editor/page-HP.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // 1. Remove state declarations
  content = content.replace(/const \[isFullscreenPreview, setIsFullscreenPreview\] = useState\(false\);\s*const activeSlideContent = serializeBlocksToMarkdown\(blocks\);\s*/, '');
  content = content.replace(/const \[isFullscreenPreview, setIsFullscreenPreview\] = useState\(false\);\s*/, '');
  
  // 2. Remove Live Preview Column & Modal Fullscreen Preview
  const previewRegex = /\s*{\/\* Live Preview Column \*\/\}[\s\S]*?(?={\/\* CROPPER MODAL OVERLAY \*\/})/;
  if (previewRegex.test(content)) {
      content = content.replace(previewRegex, '\n      ');
      console.log('Removed Live Preview blocks in ' + file);
  } else {
      console.log('Could not find Live Preview blocks in ' + file);
  }

  // 3. Make sure the remaining main container takes full width instead of sharing it
  // Wait, the main container was: <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden relative">
  // Since it's flex-1, if the sibling (Preview Column) is removed, it naturally takes 100% width!
  // However, the parent might still be `<div className="flex-1 flex flex-row gap-4 lg:gap-6 min-h-0 w-full overflow-hidden">`
  // We can just leave the flex-row gap-4, because with 1 child, it takes full width anyway. But removing gap is cleaner.
  content = content.replace(/className="flex-1 flex flex-row gap-4 lg:gap-6 min-h-0 w-full overflow-hidden"/, 'className="flex-1 flex flex-row min-h-0 w-full overflow-hidden"');

  fs.writeFileSync(file, content, 'utf8');
});
