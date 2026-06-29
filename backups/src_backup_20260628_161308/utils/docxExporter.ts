import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } from "docx";
import { saveAs } from "file-saver";

const processTextLine = (textLine: string, defaultColor?: string, defaultBold: boolean = false) => {
  if (!textLine) return [new TextRun({ text: "" })];
  
  // Split string keeping the img tags
  const parts = textLine.split(/(<img[^>]+>)/gi);
  const elements: any[] = [];
  
  parts.forEach(part => {
    if (!part) return;
    
    if (part.toLowerCase().startsWith('<img')) {
      const srcMatch = part.match(/src="(data:image\/([^;]+);base64,([a-zA-Z0-9+/=]+))"/i) || part.match(/src='(data:image\/([^;]+);base64,([a-zA-Z0-9+/=]+))'/i);
      
      if (srcMatch && srcMatch[3]) {
        try {
          const base64Data = srcMatch[3];
          const buffer = Buffer.from(base64Data, 'base64');
          elements.push(new ImageRun({
            data: buffer,
            transformation: { width: 300, height: 200 }
          } as any));
          return;
        } catch(e) {
          console.error("Lỗi parse ảnh base64:", e);
        }
      }
    } else {
      // Decode HTML entities
      let plainText = part.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      if (plainText) {
         elements.push(new TextRun({ text: plainText, color: defaultColor, bold: defaultBold }));
      }
    }
  });
  
  return elements.length > 0 ? elements : [new TextRun({ text: "" })];
};

const fetchImageWithDimensions = async (url: string): Promise<{buffer: Buffer, width: number, height: number} | null> => {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const dimensions = await new Promise<{width: number, height: number}>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      const blob = new Blob([arrayBuffer]);
      const objectUrl = URL.createObjectURL(blob);
      img.src = objectUrl;
    });

    let { width, height } = dimensions;
    const MAX_WIDTH = 500;
    if (width > MAX_WIDTH) {
       const ratio = MAX_WIDTH / width;
       width = MAX_WIDTH;
       height = height * ratio;
    }

    return { buffer, width, height };
  } catch (err) {
    console.error("Error fetching image", err);
    return null;
  }
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
      let imageData: {buffer: Buffer, width: number, height: number} | null = null;
      
      if (q.image_url) {
        imageData = await fetchImageWithDimensions(q.image_url);
      }

      const rawContent = q.content || "";
      const contentLines = rawContent.split('\n');
      let imageInserted = false;

      const titleLineText = contentLines[0].replace(/\[HÌNH VẼ.*\]|\[HINH VẼ.*\]|\[BẢNG BIẾN THIÊN\]/gi, '').trim();
      
      // Question Title
      childrenElements.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${i + 1}. `, bold: true, color: "0000FF" }),
            ...processTextLine(titleLineText)
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
                }),
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
                  }),
                ],
                alignment: AlignmentType.CENTER,
              })
            );
            imageInserted = true;
            
            const textWithoutMarker = line.replace(/\[HÌNH VẼ.*\]|\[HINH VẼ.*\]|\[BẢNG BIẾN THIÊN\]/gi, '').trim();
            if (textWithoutMarker) {
               childrenElements.push(new Paragraph({ children: processTextLine(textWithoutMarker) }));
            }
         } else {
            childrenElements.push(new Paragraph({ children: processTextLine(line) }));
         }
      }

      if (imageData && !imageInserted) {
         childrenElements.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageData.buffer,
                  transformation: { width: imageData.width, height: imageData.height },
                }),
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
              ...processTextLine(`${q.option_a || ""}    `),
              new TextRun({ text: `B. `, bold: true, color: "0000FF" }),
              ...processTextLine(`${q.option_b || ""}    `),
              new TextRun({ text: `C. `, bold: true, color: "0000FF" }),
              ...processTextLine(`${q.option_c || ""}    `),
              new TextRun({ text: `D. `, bold: true, color: "0000FF" }),
              ...processTextLine(`${q.option_d || ""}`),
            ],
            spacing: { before: 100, after: 200 }
          })
        );
      } else if (q.question_type === 'DS') {
        childrenElements.push(new Paragraph({ children: [new TextRun({ text: `a) `}), ...processTextLine(q.option_a || "")] }));
        childrenElements.push(new Paragraph({ children: [new TextRun({ text: `b) `}), ...processTextLine(q.option_b || "")] }));
        childrenElements.push(new Paragraph({ children: [new TextRun({ text: `c) `}), ...processTextLine(q.option_c || "")] }));
        childrenElements.push(new Paragraph({ children: [new TextRun({ text: `d) `}), ...processTextLine(q.option_d || "")], spacing: { after: 200 } }));
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
          const mLines = methodText.split('\n');
          mLines.forEach((line: string) => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              const elements = processTextLine(cleanLine(trimmedLine));
              elements.unshift(new TextRun({ text: "➤ ", color: "E67E22", bold: true })); // Orange icon
              childrenElements.push(new Paragraph({ children: elements }));
            }
          });
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
          const eLines = explanationText.split('\n');
          eLines.forEach((line: string) => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              const elements = processTextLine(cleanLine(trimmedLine));
              elements.unshift(new TextRun({ text: "➤ ", color: "27AE60", bold: true })); // Green icon
              childrenElements.push(new Paragraph({ children: elements }));
            }
          });
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
