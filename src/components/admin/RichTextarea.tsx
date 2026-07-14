"use client";

import React, { useRef, useState, useEffect } from "react";
import { Type, Palette, AlignLeft, AlignCenter, AlignRight, AlignJustify, Frame } from "lucide-react";

interface RichTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onValueChange?: (value: string) => void;
}

export default function RichTextarea({ value, onChange, onValueChange, className = "", ...props }: RichTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [fontSize, setFontSize] = useState<string>("30");
  const [textColor, setTextColor] = useState<string>("#ef4444"); // Default red
  const [lineHeight, setLineHeight] = useState<string>("1.5");
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

    const sizePx = fontSize ? `${fontSize}px` : '40px';
    const wrappedText = `<span style="font-size: ${sizePx}">${selectedText}</span>`;
    const newValue = beforeText + wrappedText + afterText;

    if (onValueChange) {
      onValueChange(newValue);
    } else {
      const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(event);
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start, start + wrappedText.length);
      }
    }, 0);
  };

  const handleApplyColor = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textareaRef.current) return;
    
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    
    if (start === end) {
      alert("Vui lòng bôi đen đoạn văn bản hoặc công thức cần đổi màu trước!");
      return;
    }

    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const wrappedText = `<span style="color: ${textColor}">${selectedText}</span>`;
    const newValue = beforeText + wrappedText + afterText;

    if (onValueChange) {
      onValueChange(newValue);
    } else {
      const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(event);
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start, start + wrappedText.length);
      }
    }, 0);
  };

  const handleApplyLineSpacing = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textareaRef.current) return;
    
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    
    if (start === end) {
      alert("Vui lòng bôi đen đoạn văn bản cần giãn dòng trước!");
      return;
    }

    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const wrappedText = `<span style="line-height: ${lineHeight}; display: block">${selectedText}</span>`;
    const newValue = beforeText + wrappedText + afterText;

    if (onValueChange) {
      onValueChange(newValue);
    } else {
      const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(event);
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start, start + wrappedText.length);
      }
    }, 0);
  };

  const handleApplyAlign = (align: 'left' | 'center' | 'right' | 'justify', e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!textareaRef.current) return;
    
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    
    if (start === end) {
      alert("Vui lòng bôi đen đoạn văn bản cần canh lề trước!");
      return;
    }

    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const wrappedText = `<span style="text-align: ${align}; display: block">${selectedText}</span>`;
    const newValue = beforeText + wrappedText + afterText;

    if (onValueChange) {
      onValueChange(newValue);
    } else {
      const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(event);
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start, start + wrappedText.length);
      }
    }, 0);
  };

  const handleApplyBox = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!textareaRef.current) return;
    
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    
    if (start === end) {
      alert("Vui lòng bôi đen đoạn văn bản cần đóng khung trước!");
      return;
    }

    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const wrappedText = `<div class="border-2 border-indigo-400 bg-indigo-50/50 p-[1em] rounded-[0.8em] shadow-sm my-[1em]">${selectedText}</div>`;
    const newValue = beforeText + wrappedText + afterText;

    if (onValueChange) {
      onValueChange(newValue);
    } else {
      const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(event);
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start, start + wrappedText.length);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (props.onKeyDown) props.onKeyDown(e);
    
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;

    if (e.key === 'Tab') {
      e.preventDefault();
      if (start === end) {
        const newValue = val.substring(0, start) + "  " + val.substring(end);
        if (onValueChange) onValueChange(newValue);
        else {
          const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
          onChange(event);
        }
        setTimeout(() => {
          if (textareaRef.current) textareaRef.current.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
    } else if (e.key === 'Backspace' && start === end && start > 0) {
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const textBeforeCursor = val.substring(lineStart, start);
      if (textBeforeCursor.trim() === '' && textBeforeCursor.length > 0) {
        e.preventDefault();
        const deleteCount = textBeforeCursor.length % 2 !== 0 ? 1 : 2;
        const newValue = val.substring(0, start - deleteCount) + val.substring(end);
        if (onValueChange) onValueChange(newValue);
        else {
          const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
          onChange(event);
        }
        setTimeout(() => {
          if (textareaRef.current) textareaRef.current.setSelectionRange(start - deleteCount, start - deleteCount);
        }, 0);
      }
    }
  };

  if (!isClient) return <textarea value={value} onChange={onChange} className={className} {...props} />;

  // Lọc bớt class border/focus từ bên ngoài truyền vào vì ta đã có border ở thẻ bọc ngoài
  const innerClass = className.replace(/border-[a-zA-Z0-9-]+|rounded-[a-zA-Z0-9-]+|focus:[a-zA-Z0-9-]+|ring[a-zA-Z0-9-:]*/g, '').trim();

  return (
    <div className={`relative flex flex-col border border-gray-300 rounded-lg focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all overflow-hidden bg-white ${className.includes('mt-') ? className.match(/mt-[0-9]+/)?.[0] : ''}`}>
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        className={`w-full p-4 border-none focus:ring-0 outline-none font-mono text-[15px] resize-y bg-transparent ${innerClass}`}
        {...props}
      />
      
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 px-3 py-2 bg-slate-50 border-t border-gray-200">
        
        {/* Font Size Group */}
        <div className="flex items-center gap-2">
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
            Đổi cỡ
          </button>
        </div>

        {/* Text Color Group */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded px-2 py-1 shadow-sm">
            <Palette className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-600">Màu chữ:</span>
            <select
              value={textColor}
              onChange={e => setTextColor(e.target.value)}
              className="border-none focus:ring-0 text-sm font-bold p-0 text-gray-700 bg-transparent h-5 cursor-pointer outline-none pl-1"
              style={{ color: textColor }}
            >
              <option value="#ef4444" style={{ color: '#ef4444' }}>Đỏ</option>
              <option value="#3b82f6" style={{ color: '#3b82f6' }}>Xanh dương</option>
              <option value="#22c55e" style={{ color: '#22c55e' }}>Xanh lá</option>
              <option value="#eab308" style={{ color: '#eab308' }}>Vàng</option>
              <option value="#f97316" style={{ color: '#f97316' }}>Cam</option>
              <option value="#a855f7" style={{ color: '#a855f7' }}>Tím</option>
              <option value="#ec4899" style={{ color: '#ec4899' }}>Hồng</option>
              <option value="#000000" style={{ color: '#000000' }}>Đen</option>
              <option value="#ffffff" style={{ color: '#000000', backgroundColor: '#e5e7eb' }}>Trắng</option>
            </select>
          </div>
          <button 
            type="button"
            onClick={handleApplyColor}
            className="bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-1.5 rounded text-xs font-bold transition-colors border border-orange-200"
          >
            Đổi màu
          </button>
        </div>

        {/* Line Spacing Group */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded px-2 py-1 shadow-sm">
            <span className="text-xs font-bold text-gray-600">Giãn dòng:</span>
            <select
              value={lineHeight}
              onChange={e => setLineHeight(e.target.value)}
              className="border-none focus:ring-0 text-sm font-bold p-0 text-teal-700 bg-transparent h-5 cursor-pointer outline-none pl-1"
            >
              <option value="1.0">1.0</option>
              <option value="1.15">1.15</option>
              <option value="1.5">1.5</option>
              <option value="2.0">2.0</option>
              <option value="2.5">2.5</option>
              <option value="3.0">3.0</option>
            </select>
          </div>
          <button 
            type="button"
            onClick={handleApplyLineSpacing}
            className="bg-teal-50 hover:bg-teal-100 text-teal-700 px-3 py-1.5 rounded text-xs font-bold transition-colors border border-teal-200"
          >
            Đổi giãn dòng
          </button>
        </div>

        {/* Alignment Group */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded p-1 shadow-sm">
          <button 
            type="button"
            onClick={(e) => handleApplyAlign('left', e)}
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="Canh trái"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={(e) => handleApplyAlign('center', e)}
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="Canh giữa"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={(e) => handleApplyAlign('right', e)}
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="Canh phải"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={(e) => handleApplyAlign('justify', e)}
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="Canh đều 2 bên"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>

        {/* Box Group */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded p-1 shadow-sm">
          <button 
            type="button"
            onClick={handleApplyBox}
            className="flex items-center gap-1.5 px-3 py-1.5 text-indigo-700 font-bold hover:bg-indigo-50 rounded transition-colors"
            title="Đóng khung đoạn văn bản"
          >
            <Frame className="w-4 h-4" /> Đóng khung
          </button>
        </div>

      </div>
    </div>
  );
}
