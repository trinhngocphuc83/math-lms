const fs = require('fs');
const files = [
  'D:/OneDrive - Sở GD&ĐT Quảng Ngãi/Máy tính/NHCH/math-lms/src/app/admin/lessons/editor/page.tsx',
  'D:/OneDrive - Sở GD&ĐT Quảng Ngãi/Máy tính/NHCH/math-lms/src/app/admin/lessons/editor/page-HP.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // We are missing the </div> that closes the main layout container.
  // We need to inject it right before {/* CROPPER MODAL OVERLAY */}
  const targetStr = '{/* CROPPER MODAL OVERLAY */}';
  if (content.includes(targetStr) && !content.includes('</div>\\n      {/* CROPPER MODAL OVERLAY */}')) {
      content = content.replace(targetStr, '</div>\\n      ' + targetStr);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Fixed syntax error in ' + file);
  } else {
      console.log('Target string not found or already fixed in ' + file);
  }
});
