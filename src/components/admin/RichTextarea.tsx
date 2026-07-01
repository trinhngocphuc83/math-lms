"use client";

import React, { useRef, useState, useEffect } from "react";
import { Type } from "lucide-react";

interface RichTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onValueChange?: (value: string) => void;
}

export default function RichTextarea({ value, onChange, onValueChange, className = "", ...props }: RichTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [fontSize, setFontSize] = useState<string>("24");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleApplySize = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textareaRef.current) return;
    
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    
    if (start === end) {
      alert("Vui lòng bôi đen đoạn văn bản hoặc công thức cần đổi cỡ chữ trước!");
      return;
    }

    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const sizePx = fontSize ? `${fontSize}px` : '24px';
    const wrappedText = `<span style="font-size: ${sizePx}">${selectedText}</span>`;
    const newValue = beforeText + wrappedText + afterText;

    // Trigger update
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      const event = {
        target: { value: newValue }
      } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(event);
    }

    // Khôi phục focus và selection
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start, start + wrappedText.length);
      }
    }, 0);
  };

  if (!isClient) return <textarea value={value} onChange={onChange} className={className} {...props} />;

  // Lọc bớt class border/focus từ bên ngoài truyền vào vì ta đã có border ở thẻ bọc ngoài
  const innerClass = className.replace(/border-[a-zA-Z0-9-]+|rounded-[a-zA-Z0-9-]+|focus:[a-zA-Z0-9-]+|ring[a-zA-Z0-9-:]*/g, '').trim();

  return (
    <div className={`relative flex flex-col border border-gray-300 rounded-lg focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all overflow-hidden bg-white ${className.includes('mt-') ? className.match(/mt-[0-9]+/)?.[0] : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-gray-200">
        <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded px-2 py-1 shadow-sm">
          <Type className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-bold text-gray-600">Cỡ chữ:</span>
          <form onSubmit={handleApplySize} className="flex items-center gap-1">
            <input 
              type="number" 
              value={fontSize} 
              onChange={e => setFontSize(e.target.value)}
              className="w-14 text-center border-none focus:ring-0 text-sm font-bold p-0 text-indigo-700 bg-transparent h-5"
              placeholder="px"
            />
            <span className="text-xs font-medium text-gray-400">px</span>
          </form>
        </div>
        <button 
          type="button"
          onClick={handleApplySize}
          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded text-xs font-bold transition-colors border border-indigo-200"
        >
          Áp dụng
        </button>
      </div>
      
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        className={`w-full p-4 border-none focus:ring-0 outline-none font-mono text-[15px] resize-y bg-transparent ${innerClass}`}
        {...props}
      />
    </div>
  );
}
