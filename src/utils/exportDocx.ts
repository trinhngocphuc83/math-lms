import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } from "docx";
import { saveAs } from "file-saver";

const base64ToUint8Array = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const processTextLine = async (textLine: string, defaultColor?: string, defaultBold: boolean = false) => {
  if (!textLine) return [new TextRun({ text: "" })];
  
  let decodedLine = textLine
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ');
  
  const elements: any[] = [];
  let remaining = decodedLine;

  while (remaining.length > 0) {
    const imgStart = remaining.toLowerCase().indexOf('<img');
    const mdStart = remaining.indexOf('![');
    
    let nextType: 'html' | 'md' | null = null;
    let startIndex = -1;
    
    if (imgStart !== -1 && mdStart !== -1) {
      if (imgStart < mdStart) {
        nextType = 'html';
        startIndex = imgStart;
      } else {
        nextType = 'md';
        startIndex = mdStart;
      }
    } else if (imgStart !== -1) {
      nextType = 'html';
      startIndex = imgStart;
    } else if (mdStart !== -1) {
      nextType = 'md';
      startIndex = mdStart;
    }

    if (startIndex === -1) {
      let plainText = remaining.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
      if (plainText) {
         elements.push(new TextRun({ text: plainText, color: defaultColor, bold: defaultBold }));
      }
      break;
    }
    
    if (startIndex > 0) {
      const textBefore = remaining.substring(0, startIndex);
      let plainText = textBefore.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
      if (plainText) {
         elements.push(new TextRun({ text: plainText, color: defaultColor, bold: defaultBold }));
      }
    }
    
    const afterStart = remaining.substring(startIndex);
    
    if (nextType === 'html') {
      const imgEnd = afterStart.indexOf('>');
      
      if (imgEnd === -1) {
        let plainText = afterStart.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
        if (plainText) {
           elements.push(new TextRun({ text: plainText, color: defaultColor, bold: defaultBold }));
        }
        break;
      }
      
      const imgTag = afterStart.substring(0, imgEnd + 1);
      remaining = afterStart.substring(imgEnd + 1);
      
      const srcMatch = imgTag.match(/src="(data:image\/([^;]+);base64,([^"]+))"/i) || imgTag.match(/src='(data:image\/([^;]+);base64,([^']+))'/i);
      if (srcMatch && srcMatch[3]) {
        try {
          const base64Data = srcMatch[3].replace(/\s+/g, '');
          const buffer = base64ToUint8Array(base64Data);
          elements.push(new ImageRun({
            data: buffer,
            transformation: { width: 300, height: 200 }
          } as any));
        } catch(e) {
          console.error("Lỗi parse ảnh base64:", e);
        }
      }
    } else if (nextType === 'md') {
      const bracketEnd = afterStart.indexOf('](');
      if (bracketEnd === -1) {
         elements.push(new TextRun({ text: "![", color: defaultColor, bold: defaultBold }));
         remaining = afterStart.substring(2);
         continue;
      }
      const parenEnd = afterStart.indexOf(')', bracketEnd);
      if (parenEnd === -1) {
         elements.push(new TextRun({ text: "![", color: defaultColor, bold: defaultBold }));
         remaining = afterStart.substring(2);
         continue;
      }
      
      const url = afterStart.substring(bracketEnd + 2, parenEnd).trim();
      remaining = afterStart.substring(parenEnd + 1);
      
      try {
         const imgData = await fetchImageWithDimensions(url);
         if (imgData) {
            elements.push(new ImageRun({
               data: imgData.buffer,
               transformation: { width: imgData.width, height: imgData.height }
            } as any));
         }
      } catch(e) {
         console.error("Lỗi fetch MD ảnh:", e);
      }
    }
  }
  
  return elements.length > 0 ? elements : [new TextRun({ text: "" })];
};

const fetchImageWithDimensions = async (url: string): Promise<{buffer: Uint8Array, width: number, height: number} | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Fetch image failed with status:", response.status);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    const dimensions = await new Promise<{width: number, height: number}>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = (e) => {
        console.error("Image load error", e);
        // Trả về kích thước mặc định nếu không đọc được
        resolve({ width: 400, height: 300 });
      };
      const blob = new Blob([arrayBuffer]);
      const objectUrl = URL.createObjectURL(blob);
      img.src = objectUrl;
    });

    let { width, height } = dimensions;
    const MAX_WIDTH = 500;
    if (width > MAX_WIDTH) {
       const ratio = MAX_WIDTH / width;
       width = MAX_WIDTH;
       height = Math.round(height * ratio);
    }

    return { buffer, width, height };
  } catch (err) {
    console.error("Error fetching image", err);
    return null;
  }
};

const cleanHtmlNewlinesInTags = (html: string) => {
  if (!html) return "";
  return html.replace(/\\n/g, '\n')
             .replace(/\\{1,2}color\s*\{[^}]+\}/gi, '')
             .replace(/<img[^>]+>/gi, (match) => match.replace(/\n|\r/g, ''));
};

export const exportQuestionsToWord = async (questions: any[], exportType: 'student' | 'teacher') => {
  try {
    const childrenElements: any[] = [
      new Paragraph({ 
        text: "NGÂN HÀNG CÂU HỎI", 
        heading: HeadingLevel.HEADING_1, 
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    ];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      let imageData: {buffer: Uint8Array, width: number, height: number} | null = null;
      
      if (q.image_url) {
        imageData = await fetchImageWithDimensions(q.image_url);
      }

      let rawContent = cleanHtmlNewlinesInTags(q.content || "");
      const contentLines = rawContent.split('\n');
      let imageInserted = false;

      const titleLineText = contentLines[0].replace(/\[HÌNH VẼ.*\]|\[HINH VẼ.*\]|\[BẢNG BIẾN THIÊN\]/gi, '').trim();
      
      // Question Title
      childrenElements.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${i + 1}. `, bold: true, color: "0000FF" }),
            ...(await processTextLine(titleLineText))
          ],
          spacing: { before: 200 }
        })
      );
      
      if (imageData && contentLines[0].match(/\[HÌNH VẼ.*\]|\[HINH VẼ.*\]|\[BẢNG BIẾN THIÊN\]/gi)) {
         childrenElements.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageData.buffer,
                  transformation: { width: imageData.width, height: imageData.height },
                } as any),
              ],
              alignment: AlignmentType.CENTER,
            })
          );
          imageInserted = true;
      }
      
      for (let j = 1; j < contentLines.length; j++) {
         const line = contentLines[j];
         if (imageData && line.match(/\[HÌNH VẼ.*\]|\[HINH VẼ.*\]|\[BẢNG BIẾN THIÊN\]/gi)) {
            childrenElements.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imageData.buffer,
                    transformation: { width: imageData.width, height: imageData.height },
                  } as any),
                ],
                alignment: AlignmentType.CENTER,
              })
            );
            imageInserted = true;
            
            const textWithoutMarker = line.replace(/\[HÌNH VẼ.*\]|\[HINH VẼ.*\]|\[BẢNG BIẾN THIÊN\]/gi, '').trim();
            if (textWithoutMarker) {
               childrenElements.push(new Paragraph({ children: await processTextLine(textWithoutMarker) }));
            }
         } else {
            childrenElements.push(new Paragraph({ children: await processTextLine(line) }));
         }
      }

      if (imageData && !imageInserted) {
         childrenElements.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageData.buffer,
                  transformation: { width: imageData.width, height: imageData.height },
                } as any),
              ],
              alignment: AlignmentType.CENTER,
            })
          );
      }

      // Options
      if ((q.question_type === 'TN' || q.question_type === 'NLC')) {
        childrenElements.push(
          new Paragraph({
            children: [
              new TextRun({ text: `A. `, bold: true, color: "0000FF" }),
              ...(await processTextLine(cleanHtmlNewlinesInTags(`${q.option_a || ""}    `))),
              new TextRun({ text: `B. `, bold: true, color: "0000FF" }),
              ...(await processTextLine(cleanHtmlNewlinesInTags(`${q.option_b || ""}    `))),
              new TextRun({ text: `C. `, bold: true, color: "0000FF" }),
              ...(await processTextLine(cleanHtmlNewlinesInTags(`${q.option_c || ""}    `))),
              new TextRun({ text: `D. `, bold: true, color: "0000FF" }),
              ...(await processTextLine(cleanHtmlNewlinesInTags(`${q.option_d || ""}`))),
            ],
            spacing: { before: 100, after: 200 }
          })
        );
      } else if (q.question_type === 'DS') {
        childrenElements.push(new Paragraph({ children: [new TextRun({ text: `a) `}), ...(await processTextLine(cleanHtmlNewlinesInTags(q.option_a || "")))] }));
        childrenElements.push(new Paragraph({ children: [new TextRun({ text: `b) `}), ...(await processTextLine(cleanHtmlNewlinesInTags(q.option_b || "")))] }));
        childrenElements.push(new Paragraph({ children: [new TextRun({ text: `c) `}), ...(await processTextLine(cleanHtmlNewlinesInTags(q.option_c || "")))] }));
        childrenElements.push(new Paragraph({ children: [new TextRun({ text: `d) `}), ...(await processTextLine(cleanHtmlNewlinesInTags(q.option_d || "")))], spacing: { after: 200 } }));
      }

      // Teacher Solution
      if (exportType === 'teacher' && q.explanation) {
        let methodText = "";
        let explanationText = q.explanation;

        // Smart parsing
        const lowerExp = q.explanation.toLowerCase();
        const ppIndex = lowerExp.indexOf("phương pháp giải:");
        const ppIndex2 = lowerExp.indexOf("phương pháp giải");
        const lgIndex = lowerExp.indexOf("lời giải:");
        const lgIndex2 = lowerExp.indexOf("lời giải");

        let startPP = -1;
        let startLG = -1;

        if (ppIndex !== -1) startPP = ppIndex + "phương pháp giải:".length;
        else if (ppIndex2 !== -1) startPP = ppIndex2 + "phương pháp giải".length;

        if (lgIndex !== -1) startLG = lgIndex;
        else if (lgIndex2 !== -1) startLG = lgIndex2;

        if (startPP !== -1 && startLG !== -1 && startPP < startLG) {
          methodText = q.explanation.substring(startPP, startLG).trim();
          let lgOffset = lowerExp.indexOf("lời giải:") === startLG ? "lời giải:".length : "lời giải".length;
          explanationText = q.explanation.substring(startLG + lgOffset).trim();
        } else if (startPP !== -1 && startLG === -1) {
          methodText = q.explanation.substring(startPP).trim();
          explanationText = "";
        } else if (startPP === -1 && startLG !== -1) {
          let lgOffset = lowerExp.indexOf("lời giải:") === startLG ? "lời giải:".length : "lời giải".length;
          explanationText = q.explanation.substring(startLG + lgOffset).trim();
        }

        // Clean leading symbols like '-', '+', '*'
        const cleanLine = (line: string) => line.replace(/^[\-\+\*]\s*/, '');

        // 1. Output "Phương pháp giải" header
        childrenElements.push(
          new Paragraph({
            children: [new TextRun({ text: "Phương pháp giải", bold: true, color: "0000FF" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 }
          })
        );

        // 2. Output Method lines with icons
        if (methodText) {
          methodText = methodText.replace(/^\*\*/, "");
          const mLines = cleanHtmlNewlinesInTags(methodText).split('\n');
          for (const line of mLines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              const elements = await processTextLine(cleanLine(trimmedLine));
              elements.unshift(new TextRun({ text: "➤ ", color: "E67E22", bold: true })); // Orange icon
              childrenElements.push(new Paragraph({ children: elements }));
            }
          }
        }

        // 3. Output "Lời giải" header
        childrenElements.push(
          new Paragraph({
            children: [new TextRun({ text: "Lời giải", bold: true, color: "0000FF" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 200 }
          })
        );

        // 4. Output Explanation lines with icons
        if (explanationText) {
          explanationText = explanationText.replace(/^\*\*/, "");
          const eLines = cleanHtmlNewlinesInTags(explanationText).split('\n');
          for (const line of eLines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              const elements = await processTextLine(cleanLine(trimmedLine));
              elements.unshift(new TextRun({ text: "➤ ", color: "27AE60", bold: true })); // Green icon
              childrenElements.push(new Paragraph({ children: elements }));
            }
          }
        }
      }
    }

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              size: 24,
              font: "Times New Roman"
            }
          }
        }
      },
      sections: [{
        properties: {},
        children: childrenElements
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Ngan_Hang_Cau_Hoi_${exportType}.docx`);
    return true;
  } catch (e: any) {
    throw new Error(e.message);
  }
};
