"use client";

import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

export const MathRenderer = ({ htmlContent }: { htmlContent: string }) => {
  if (!htmlContent) return null;

  const renderMixedContent = (text: string) => {
    // Chẻ chuỗi theo khối LaTeX $$...$$ hoặc $...$
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        // Khối toán Block
        return <BlockMath key={index} math={part.slice(2, -2)} />;
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        // Khối toán Inline
        return <InlineMath key={index} math={part.slice(1, -1)} />;
      }
      // Văn bản bình thường hoặc các thẻ HTML (như <img> do copy/paste ảnh)
      return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
    });
  };

  return <div className="leading-relaxed whitespace-pre-wrap">{renderMixedContent(htmlContent)}</div>;
};
