"use client";

import React, { useRef, useState, useEffect } from "react";
import { Type, Palette, AlignLeft, AlignCenter, AlignRight, AlignJustify, Frame, Bold, Italic, Underline as UnderlineIcon, Smile, Eraser, ChevronDown, Image as ImageIcon, Loader2 } from "lucide-react";
import TextareaAutosize from 'react-textarea-autosize';

interface RichTextareaProps extends Omit<React.ComponentProps<typeof TextareaAutosize>, 'onChange' | 'value'> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onValueChange?: (value: string) => void;
}

const wrapMultiLineSelection = (selectedText: string, wrapFn: (line: string) => string) => {
  return selectedText.split('\n').map(line => {
    if (line.trim() === '') return line;
    
    // Match common Markdown block prefixes to keep them OUTSIDE the wrapping tag
    // This prevents breaking Markdown parsing (e.g., blockquotes, lists, headings)
    const prefixRegex = /^(\s*(?:(?:>\s*)+|#+\s+|[-*+]\s+|\d+\.\s+))(.*)$/;
    const match = line.match(prefixRegex);
    
    if (match) {
        return match[1] + wrapFn(match[2]);
    }
    return wrapFn(line);
  }).join('\n');
};

export default function RichTextarea({ value, onChange, onValueChange, className = "", ...props }: RichTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [fontSize, setFontSize] = useState<string>("30");
  const [textColor, setTextColor] = useState<string>("#ef4444"); // Default red
  const [lineHeight, setLineHeight] = useState<string>("1.5");
  const [isClient, setIsClient] = useState(false);
  
  const [showIconMenu, setShowIconMenu] = useState(false);
  const iconMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textColorRef = useRef<HTMLSelectElement>(null);
  const fontSizeRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const EMOJIS = ["💡", "📌", "🎯", "🚀", "📝", "⚙️", "✅", "❌", "🔥", "✨", "👉", "⚠️"];

  useEffect(() => {
    setIsClient(true);
    const handleClickOutside = (event: MouseEvent) => {
      if (iconMenuRef.current && !iconMenuRef.current.contains(event.target as Node)) {
        setShowIconMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    const wrappedText = wrapMultiLineSelection(selectedText, l => `<span style="font-size: ${sizePx}">${l}</span>`);
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

    const wrappedText = wrapMultiLineSelection(selectedText, l => `<span style="color: ${textColor}">${l}</span>`);
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

    const wrappedText = wrapMultiLineSelection(selectedText, l => `<span style="line-height: ${lineHeight}">${l}</span>`);
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

    const wrappedText = wrapMultiLineSelection(selectedText, l => `<span style="text-align: ${align}; display: block">${l}</span>`);
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

    const wrappedText = `<div class="border-2 border-indigo-400 bg-indigo-50/50 px-[1em] py-[0.5em] rounded-[0.8em] shadow-sm my-[0.5em] w-fit max-w-full [&>p:last-child]:mb-0">\n\n${selectedText.trim()}\n\n</div>`;
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

  const handleFormat = (formatType: 'bold' | 'italic' | 'underline', e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!textareaRef.current) return;
    
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    
    if (start === end) {
      alert("Vui lòng bôi đen văn bản cần định dạng!");
      return;
    }

    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    let wrappedText = selectedText;
    if (formatType === 'bold') wrappedText = wrapMultiLineSelection(selectedText, l => `**${l}**`);
    else if (formatType === 'italic') wrappedText = wrapMultiLineSelection(selectedText, l => `*${l}*`);
    else if (formatType === 'underline') wrappedText = wrapMultiLineSelection(selectedText, l => `<u>${l}</u>`);

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

  const handleInsertIcon = (icon: string) => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;

    const newValue = val.substring(0, start) + icon + val.substring(end);
    if (onValueChange) onValueChange(newValue);
    else {
      const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(event);
    }

    setShowIconMenu(false);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + icon.length, start + icon.length);
      }
    }, 0);
  };

  const handleRemoveAutoIcon = () => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const val = ta.value;

    let lineStart = val.lastIndexOf('\n', start - 1) + 1;
    const newValue = val.substring(0, lineStart) + "&nbsp;" + val.substring(lineStart);
    
    if (onValueChange) onValueChange(newValue);
    else {
      const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(event);
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + 6, start + 6);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (props.onKeyDown) props.onKeyDown(e);
    
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;

    if (e.ctrlKey && e.shiftKey) {
      const key = e.key.toLowerCase();
      if (key === 'k') { e.preventDefault(); handleApplyBox(); return; }
      if (key === 'l') { e.preventDefault(); handleApplyAlign('left'); return; }
      if (key === 'e') { e.preventDefault(); handleApplyAlign('center'); return; }
      if (key === 'r') { e.preventDefault(); handleApplyAlign('right'); return; }
      if (key === 'j') { e.preventDefault(); handleApplyAlign('justify'); return; }
      if (key === 'm') { e.preventDefault(); setShowIconMenu(prev => !prev); return; }
      if (key === 'x') { e.preventDefault(); handleRemoveAutoIcon(); return; }
      if (key === 'c') { e.preventDefault(); textColorRef.current?.focus(); return; }
      if (key === 's') { e.preventDefault(); fontSizeRef.current?.focus(); return; }
    }
    
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      fileInputRef.current?.click();
      return;
    }

    if (e.ctrlKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      handleFormat('bold');
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      handleFormat('italic');
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      handleFormat('underline');
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      if (start === end) {
        const newValue = val.substring(0, start) + "\u00A0\u00A0\u00A0\u00A0" + val.substring(end);
        if (onValueChange) onValueChange(newValue);
        else {
          const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
          onChange(event);
        }
        setTimeout(() => {
          if (textareaRef.current) textareaRef.current.setSelectionRange(start + 4, start + 4);
        }, 0);
      }
    } else if (e.key === 'Backspace' && start === end && start > 0) {
      const textBeforeCursor = val.substring(0, start);
      if (textBeforeCursor.endsWith('\u00A0\u00A0\u00A0\u00A0')) {
        e.preventDefault();
        const deleteCount = 4;
        const newValue = val.substring(0, start - deleteCount) + val.substring(end);
        if (onValueChange) onValueChange(newValue);
        else {
          const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
          onChange(event);
        }
        setTimeout(() => {
          if (textareaRef.current) textareaRef.current.setSelectionRange(start - deleteCount, start - deleteCount);
        }, 0);
      } else {
        // Fallback for regular spaces deletion at the beginning of a line
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        const textOnLineBeforeCursor = val.substring(lineStart, start);
        if (textOnLineBeforeCursor.trim() === '' && textOnLineBeforeCursor.length > 0) {
          e.preventDefault();
          const deleteCount = textOnLineBeforeCursor.length % 2 !== 0 ? 1 : 2;
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
    }
  };

  const uploadAndInsertImage = async (file: File) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);
    
    setIsUploading(true);
    const tempText = beforeText + "\n⏳ Đang tải ảnh lên...\n" + afterText;
    
    if (onValueChange) onValueChange(tempText);
    else {
       const event = { target: { value: tempText } } as React.ChangeEvent<HTMLTextAreaElement>;
       onChange(event);
    }

    try {
       const { createClient } = await import("@/utils/supabase/client");
       const supabase = createClient();
       const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpg`;
       const filePath = `editor_images/${fileName}`;
       
       const { error } = await supabase.storage.from('lesson_images').upload(filePath, file);
       if (error) throw error;
       
       const { data: publicUrlData } = supabase.storage.from('lesson_images').getPublicUrl(filePath);
       const publicUrl = publicUrlData.publicUrl;
       
       const imgMd = `\n![Hình ảnh](${publicUrl})\n`;
       const newValue = beforeText + imgMd + afterText;
       
       if (onValueChange) onValueChange(newValue);
       else {
          const ev = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
          onChange(ev);
       }
       
       setTimeout(() => {
         if (textareaRef.current) {
           textareaRef.current.focus();
           textareaRef.current.setSelectionRange(start + imgMd.length, start + imgMd.length);
         }
       }, 0);
    } catch(err) {
       alert("Lỗi tải ảnh lên!");
       if (onValueChange) onValueChange(value);
       else {
          const ev = { target: { value: value } } as React.ChangeEvent<HTMLTextAreaElement>;
          onChange(ev);
       }
    } finally {
       setIsUploading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (props.onPaste) props.onPaste(e);
    if (e.defaultPrevented) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          e.stopPropagation();
          uploadAndInsertImage(file);
        }
        break;
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAndInsertImage(file);
    }
    e.target.value = '';
  };

  if (!isClient) return <TextareaAutosize minRows={props.rows || 3} maxRows={30} value={value} onChange={onChange} className={className} {...props} />;

  // Lọc bớt class border/focus từ bên ngoài truyền vào vì ta đã có border ở thẻ bọc ngoài
  const innerClass = className.replace(/border-[a-zA-Z0-9-]+|rounded-[a-zA-Z0-9-]+|focus:[a-zA-Z0-9-]+|ring[a-zA-Z0-9-:]*/g, '').trim();

  return (
    <div className={`relative flex flex-col border border-gray-300 rounded-lg focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all overflow-hidden bg-white ${className.includes('mt-') ? className.match(/mt-[0-9]+/)?.[0] : ''}`}>
      {/* Textarea */}
      <TextareaAutosize
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        minRows={props.rows || 3}
        maxRows={30}
        className={`w-full p-4 border-none focus:ring-0 outline-none font-mono text-[15px] bg-transparent ${innerClass}`}
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
                ref={fontSizeRef}
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
              ref={textColorRef}
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

        {/* Formatting Group */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded p-1 shadow-sm">
          <button 
            type="button"
            onClick={(e) => handleFormat('bold', e)}
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors font-bold"
            title="In đậm"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={(e) => handleFormat('italic', e)}
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors italic"
            title="In nghiêng"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={(e) => handleFormat('underline', e)}
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors underline"
            title="Gạch chân"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Icon Group */}
        <div className="flex items-center gap-1 bg-white border border-gray-300 rounded p-1 shadow-sm relative" ref={iconMenuRef}>
          <button 
            type="button"
            onClick={() => setShowIconMenu(!showIconMenu)}
            className="flex items-center gap-1 px-2 py-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="Thêm Icon"
          >
            <Smile className="w-4 h-4" /> <ChevronDown className="w-3 h-3" />
          </button>
          
          {showIconMenu && (
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-white border border-gray-200 rounded-lg shadow-xl grid grid-cols-4 gap-2 z-50">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleInsertIcon(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-indigo-50 rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <button 
            type="button"
            onClick={handleRemoveAutoIcon}
            className="px-2 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            title="Xoá Icon tự động ở dòng này"
          >
            <Eraser className="w-4 h-4" />
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

        {/* Image Upload Group */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded p-1 shadow-sm ml-auto">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-pink-700 font-bold hover:bg-pink-50 rounded transition-colors disabled:opacity-50"
            title="Chèn Hình Ảnh (Có thể dùng Ctrl+V để dán trực tiếp)"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />} 
            {isUploading ? "Đang tải..." : "Chèn Ảnh"}
          </button>
        </div>

      </div>
    </div>
  );
}
