"use client";

import React, { useRef, useState, useEffect } from "react";
import { Type, Palette, AlignLeft, AlignCenter, AlignRight, AlignJustify, Frame, Bold, Italic, Underline as UnderlineIcon, Smile, Eraser, ChevronDown, ChevronUp, Image as ImageIcon, Loader2, Heading } from "lucide-react";
import TextareaAutosize from 'react-textarea-autosize';

interface RichTextareaProps extends Omit<React.ComponentProps<typeof TextareaAutosize>, 'onChange' | 'value'> {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onValueChange?: (value: string) => void;
  collapsibleToolbar?: boolean;
  defaultToolbarExpanded?: boolean;
}

const wrapMultiLineSelection = (selectedText: string, wrapFn: (line: string) => string, stylePropToClean?: string) => {
  return selectedText.split('\n').map(line => {
    if (line.trim() === '') return line;
    
    let processedLine = line;
    if (stylePropToClean) {
        const regex = new RegExp(`${stylePropToClean}\\s*:\\s*[^;"]+;?`, 'gi');
        processedLine = processedLine.replace(regex, '');
    }

    // Match common Markdown block prefixes to keep them OUTSIDE the wrapping tag
    // This prevents breaking Markdown parsing (e.g., blockquotes, lists, headings)
    const prefixRegex = /^(\s*(?:(?:>\s*)+|#+\s+|[-*+]\s+|\d+\.\s+))(.*)$/;
    const match = processedLine.match(prefixRegex);
    
    if (match) {
        return match[1] + wrapFn(match[2]);
    }
    return wrapFn(processedLine);
  }).join('\n');
};

export default function RichTextarea({ value, onChange, onValueChange, className = "", collapsibleToolbar = true, defaultToolbarExpanded = true, ...props }: RichTextareaProps) {
  // Fallback: Nếu không truyền onChange, tạo handler tự động từ onValueChange
  const resolvedOnChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) onChange(e);
    if (onValueChange) onValueChange(e.target.value);
  }, [onChange, onValueChange]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [fontSize, setFontSize] = useState<string>("30");
  const [textColor, setTextColor] = useState<string>("#ef4444"); // Default red
  const [lineHeight, setLineHeight] = useState<string>("1.5");
  const [isClient, setIsClient] = useState(false);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(defaultToolbarExpanded);
  
  const [showIconMenu, setShowIconMenu] = useState(false);
  const iconMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textColorRef = useRef<HTMLSelectElement>(null);
  const fontSizeRef = useRef<HTMLInputElement>(null);
  // Ghi lại cỡ chữ lúc bắt đầu bấm vào ô, để khi rời ô mà số không đổi thì không áp dụng lại
  const sizeOnFocus = useRef<string>("30");
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

  const handleApplySize = (e?: React.MouseEvent | React.FormEvent | null, sizeOverride?: string) => {
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

    const effectiveSize = sizeOverride ?? fontSize;
    const sizePx = effectiveSize ? `${effectiveSize}px` : '40px';
    const wrappedText = wrapMultiLineSelection(selectedText, l => `<span style="font-size: ${sizePx}">${l}</span>`, 'font-size');
    const newValue = beforeText + wrappedText + afterText;

    if (onValueChange) {
      onValueChange(newValue);
    } else {
      const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
      resolvedOnChange(event);
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start, start + wrappedText.length);
      }
    }, 0);
  };

  const handleApplyHeading = (level: number | '') => {
    if (!level) return;
    if (!textareaRef.current) return;
    
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;

    const beforeText = val.substring(0, start);
    const afterText = val.substring(end);
    const prefix = '#'.repeat(level as number) + ' ';

    if (start === end) {
      const newValue = beforeText + prefix + afterText;
      if (onValueChange) {
        onValueChange(newValue);
      } else {
        const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
        resolvedOnChange(event);
      }
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(start + prefix.length, start + prefix.length);
        }
      }, 0);
      return;
    }

    const selectedText = val.substring(start, end);
    const wrappedText = selectedText.split('\n').map(l => {
        if (l.trim() === '') return l;
        return prefix + l.replace(/^#+\s*/, '');
    }).join('\n');
    
    const newValue = beforeText + wrappedText + afterText;
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
      resolvedOnChange(event);
    }
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start, start + wrappedText.length);
      }
    }, 0);
  };

  const handleApplyColor = (e?: React.MouseEvent | React.FormEvent | null, colorOverride?: string) => {
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

    const effectiveColor = colorOverride ?? textColor;
    const wrappedText = wrapMultiLineSelection(selectedText, l => `<span style="color: ${effectiveColor}">${l}</span>`, 'color');
    const newValue = beforeText + wrappedText + afterText;

    if (onValueChange) {
      onValueChange(newValue);
    } else {
      const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
      resolvedOnChange(event);
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start, start + wrappedText.length);
      }
    }, 0);
  };

  const handleApplyLineSpacing = (e?: React.MouseEvent | React.FormEvent | null, lineHeightOverride?: string) => {
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

    const effectiveLineHeight = lineHeightOverride ?? lineHeight;
    const wrappedText = wrapMultiLineSelection(selectedText, l => `<span style="line-height: ${effectiveLineHeight}">${l}</span>`, 'line-height');
    const newValue = beforeText + wrappedText + afterText;

    if (onValueChange) {
      onValueChange(newValue);
    } else {
      const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
      resolvedOnChange(event);
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

    const wrappedText = wrapMultiLineSelection(selectedText, l => `<span style="text-align: ${align}; display: block">${l}</span>`, 'text-align');
    const newValue = beforeText + wrappedText + afterText;

    if (onValueChange) {
      onValueChange(newValue);
    } else {
      const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
      resolvedOnChange(event);
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
      resolvedOnChange(event);
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
      resolvedOnChange(event);
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
      resolvedOnChange(event);
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
      resolvedOnChange(event);
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
          resolvedOnChange(event);
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
          resolvedOnChange(event);
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
            resolvedOnChange(event);
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
       resolvedOnChange(event);
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
          resolvedOnChange(ev);
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
          resolvedOnChange(ev);
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

  if (!isClient) return <TextareaAutosize minRows={props.rows || 3} maxRows={30} value={value} onChange={resolvedOnChange} className={className} {...props} />;

  // Lọc bớt class border/focus từ bên ngoài truyền vào vì ta đã có border ở thẻ bọc ngoài
  const innerClass = className.replace(/border-[a-zA-Z0-9-]+|rounded-[a-zA-Z0-9-]+|focus:[a-zA-Z0-9-]+|ring[a-zA-Z0-9-:]*/g, '').trim();

  return (
    <div className={`relative flex flex-col border border-gray-300 rounded-lg focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all bg-white ${className.includes('mt-') ? className.match(/mt-[0-9]+/)?.[0] : ''}`}>
      {/* Toolbar - khi đang mở, nút thu gọn nằm luôn trong thanh công cụ để không tốn thêm một dòng */}
      {collapsibleToolbar && !isToolbarExpanded && (
         <div className="bg-slate-50 border-b border-gray-200 px-2 py-0.5 sticky top-0 z-40 flex justify-end bg-gray-50 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setIsToolbarExpanded(true)}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded"
            >
              <ChevronDown className="w-3 h-3"/> <span>Định dạng</span>
            </button>
         </div>
      )}
      {(!collapsibleToolbar || isToolbarExpanded) && (
      <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 border-b border-gray-200 sticky top-0 z-40 overflow-x-auto scrollbar-hide whitespace-nowrap text-gray-700 shadow-sm shrink-0">
        
        <select onChange={e => { handleApplyHeading(e.target.value ? parseInt(e.target.value) : ''); e.target.value = ""; }} className="border border-gray-200 rounded bg-white text-[11px] font-semibold py-0.5 px-1 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer h-6 w-20">
          <option value="">Tiêu đề</option>
          <option value="1">H1</option>
          <option value="2">H2</option>
          <option value="3">H3</option>
          <option value="4">H4</option>
          <option value="5">H5</option>
        </select>

        <div className="w-px h-4 bg-gray-300 shrink-0"></div>

        <div className="flex items-center gap-1 shrink-0">
          <Type className="w-3.5 h-3.5 text-gray-400" />
          <form onSubmit={handleApplySize} className="flex items-center">
             <input
               ref={fontSizeRef}
               type="number"
               list="rt-font-sizes"
               value={fontSize}
               onChange={e => setFontSize(e.target.value)}
               onFocus={e => { sizeOnFocus.current = e.target.value; }}
               onBlur={e => {
                 const ta = textareaRef.current;
                 // Chỉ áp dụng khi có vùng bôi đen VÀ cỡ chữ thực sự đổi
                 if (!ta || ta.selectionStart === ta.selectionEnd) return;
                 if (!e.target.value || e.target.value === sizeOnFocus.current) return;
                 handleApplySize(null, e.target.value);
               }}
               title="Bôi đen chữ, nhập cỡ rồi ấn Enter"
               className="w-11 h-6 text-center border border-gray-200 rounded text-[11px] font-semibold p-0 text-indigo-700 bg-white"
               placeholder="px"
             />
             <datalist id="rt-font-sizes">
               <option value="16"></option><option value="18"></option><option value="20"></option>
               <option value="24"></option><option value="30"></option><option value="36"></option><option value="48"></option>
             </datalist>
          </form>
        </div>

        <div className="w-px h-4 bg-gray-300 shrink-0"></div>

        <div className="flex items-center gap-1 shrink-0">
          <Palette className="w-3.5 h-3.5 text-gray-400" />
          <select
            ref={textColorRef}
            value=""
            onChange={e => {
              const picked = e.target.value;
              e.target.value = ""; // trả về nhãn gốc để lần sau chọn lại cùng màu vẫn ăn
              if (!picked) return;
              setTextColor(picked);
              handleApplyColor(null, picked);
            }}
            title="Bôi đen chữ rồi chọn màu"
            className="border border-gray-200 rounded bg-white text-[11px] font-bold px-1 outline-none h-6 cursor-pointer w-20"
            style={{ color: textColor }}
          >
            <option value="">Màu chữ</option>
            <option value="#ef4444" style={{ color: '#ef4444' }}>Đỏ</option>
            <option value="#3b82f6" style={{ color: '#3b82f6' }}>Xanh</option>
            <option value="#22c55e" style={{ color: '#22c55e' }}>Lá</option>
            <option value="#eab308" style={{ color: '#eab308' }}>Vàng</option>
            <option value="#f97316" style={{ color: '#f97316' }}>Cam</option>
            <option value="#a855f7" style={{ color: '#a855f7' }}>Tím</option>
            <option value="#ec4899" style={{ color: '#ec4899' }}>Hồng</option>
            <option value="#000000" style={{ color: '#000000' }}>Đen</option>
          </select>
        </div>

        <div className="w-px h-4 bg-gray-300 shrink-0"></div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-gray-500">Giãn:</span>
          <select
            value=""
            onChange={e => {
              const picked = e.target.value;
              e.target.value = ""; // trả về nhãn gốc để lần sau chọn lại cùng mức vẫn ăn
              if (!picked) return;
              setLineHeight(picked);
              handleApplyLineSpacing(null, picked);
            }}
            title="Bôi đen chữ rồi chọn độ giãn dòng"
            className="border border-gray-200 rounded bg-white text-[11px] font-bold px-1 outline-none h-6 cursor-pointer w-14 text-teal-700"
          >
             <option value="">{lineHeight}</option>
             <option value="1.0">1.0</option><option value="1.15">1.15</option><option value="1.5">1.5</option><option value="2.0">2.0</option>
          </select>
        </div>

        <div className="w-px h-4 bg-gray-300 shrink-0"></div>

        <div className="flex items-center gap-0.5 shrink-0 bg-white border border-gray-200 rounded p-0.5">
           <button type="button" onClick={e => handleFormat('bold', e)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><Bold className="w-3 h-3" /></button>
           <button type="button" onClick={e => handleFormat('italic', e)} className="p-1 hover:bg-gray-100 rounded text-gray-600 italic"><Italic className="w-3 h-3" /></button>
           <button type="button" onClick={e => handleFormat('underline', e)} className="p-1 hover:bg-gray-100 rounded text-gray-600 underline"><UnderlineIcon className="w-3 h-3" /></button>
        </div>

        <div className="flex items-center gap-0.5 shrink-0 bg-white border border-gray-200 rounded p-0.5">
           <button type="button" onClick={e => handleApplyAlign('left', e)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><AlignLeft className="w-3 h-3" /></button>
           <button type="button" onClick={e => handleApplyAlign('center', e)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><AlignCenter className="w-3 h-3" /></button>
           <button type="button" onClick={e => handleApplyAlign('right', e)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><AlignRight className="w-3 h-3" /></button>
           <button type="button" onClick={e => handleApplyAlign('justify', e)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><AlignJustify className="w-3 h-3" /></button>
        </div>

        <div className="flex items-center gap-1 shrink-0 relative" ref={iconMenuRef}>
           <button type="button" onClick={() => setShowIconMenu(!showIconMenu)} className="flex items-center gap-0.5 px-1.5 h-6 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded">
             <Smile className="w-3 h-3" /> <ChevronDown className="w-3 h-3" />
           </button>
           {showIconMenu && (
            <div className="absolute top-full left-0 mt-1 p-1.5 bg-white border border-gray-200 rounded shadow-xl grid grid-cols-4 gap-1 z-50">
              {EMOJIS.map(emoji => (
                <button key={emoji} type="button" onClick={() => handleInsertIcon(emoji)} className="w-6 h-6 flex items-center justify-center hover:bg-indigo-50 rounded text-sm">{emoji}</button>
              ))}
            </div>
           )}
           <button type="button" onClick={handleRemoveAutoIcon} className="px-1.5 h-6 bg-white border border-gray-200 text-red-500 hover:bg-red-50 rounded"><Eraser className="w-3 h-3" /></button>
        </div>

        <button type="button" onClick={handleApplyBox} className="flex items-center gap-1 px-2 h-6 bg-white border border-gray-200 text-indigo-700 font-bold hover:bg-indigo-50 rounded shrink-0 text-[11px]">
          <Frame className="w-3 h-3" /> Khung
        </button>

        <div className="ml-auto shrink-0 flex items-center gap-1">
           <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
           <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center gap-1 px-2 h-6 bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 font-bold rounded text-[11px]">
             {isUploading ? <Loader2 className="w-3 h-3 animate-spin"/> : <ImageIcon className="w-3 h-3" />} Ảnh
           </button>
           {collapsibleToolbar && (
             <button
               type="button"
               onClick={() => setIsToolbarExpanded(false)}
               title="Thu gọn thanh định dạng"
               className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-indigo-700 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-200 transition-colors"
             >
               <ChevronUp className="w-3.5 h-3.5" />
             </button>
           )}
        </div>

      </div>
      )}
      <TextareaAutosize
        ref={textareaRef}
        value={value}
        onChange={resolvedOnChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        minRows={props.rows || 3}
        maxRows={30}
        className={`w-full p-4 border-none focus:ring-0 outline-none font-mono text-[15px] bg-transparent ${innerClass}`}
        {...props}
      />
      
      </div>
  );
}
