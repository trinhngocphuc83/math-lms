const fs = require('fs');
const files = [
  'D:/OneDrive - Sở GD&ĐT Quảng Ngãi/Máy tính/NHCH/math-lms/src/app/admin/lessons/editor/page.tsx',
  'D:/OneDrive - Sở GD&ĐT Quảng Ngãi/Máy tính/NHCH/math-lms/src/app/admin/lessons/editor/page-HP.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Search for the section where the image markdown is appended and the block is updated
  const searchPattern = /b\.content \+= imageMarkdown;\s*\}\s*setBlocks\(newBlocks\);\s*setIsCropModalOpen\(false\);/;
  
  const replaceStr = `b.content += imageMarkdown;
                }
                setBlocks(newBlocks);
                setIsCropModalOpen(false);
                setTimeout(() => alert("Đã chèn ảnh thành công!\\n\\n💡 MẸO: Ảnh vừa được chèn vào cuối ô Soạn thảo dưới dạng mã Markdown ![Hình minh họa](...).\\nBạn có thể Bôi đen -> Cắt (Ctrl+X) -> và Dán (Ctrl+V) mã này đến chính xác vị trí mà bạn muốn chèn ảnh!"), 500);`;

  if (content.match(searchPattern)) {
      content = content.replace(searchPattern, replaceStr);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Updated handleUploadCroppedImage successfully in ' + file);
  } else {
      console.log('Could not find target pattern in ' + file);
  }
});
