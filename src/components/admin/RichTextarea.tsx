"use client";

import React, { useRef, useState, useEffect } from "react";
import { Type, Palette, AlignLeft, AlignCenter, AlignRight, AlignJustify, Frame, Bold, Italic, Underline as UnderlineIcon, Smile, Eraser, ChevronDown, ChevronUp, Image as ImageIcon, Loader2, Heading, Sigma, AlertTriangle, IndentIncrease, IndentDecrease, List, ListOrdered, Wand2 } from "lucide-react";
import { donTheThua } from "@/utils/donTheThua";
import TextareaAutosize from 'react-textarea-autosize';
import katex from "katex";
import "katex/dist/katex.min.css";
import LatexPalette from "./LatexPalette";
import { CURSOR_TOKEN, getMathAtCursor, isInsideMath } from "@/utils/mathText";

interface RichTextareaProps extends Omit<React.ComponentProps<typeof TextareaAutosize>, 'onChange' | 'value'> {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onValueChange?: (value: string) => void;
  collapsibleToolbar?: boolean;
  defaultToolbarExpanded?: boolean;
  /**
   * Chặn trước khi ô tự chèn ảnh dán vào.
   *
   * Trả về true nghĩa là bên ngoài đã xử lý xong tấm ảnh (ví dụ đọc nó thành câu hỏi),
   * ô KHÔNG chèn ảnh nữa. Trả về false thì ô chèn ảnh như xưa nay vẫn làm.
   */
  xuLyAnhDan?: (file: File) => Promise<boolean>;
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

export default function RichTextarea({ value, onChange, onValueChange, className = "", collapsibleToolbar = true, defaultToolbarExpanded = true, viTriBanDau, xuLyAnhDan, ...props }: RichTextareaProps & { viTriBanDau?: number }) {
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
  const [showLatexPalette, setShowLatexPalette] = useState(false);
  // Vị trí con trỏ, dùng để biết đang đứng trong công thức nào mà hiện xem trước
  const [cursorPos, setCursorPos] = useState(0);
  const iconMenuRef = useRef<HTMLDivElement>(null);
  // Nút mở bảng công thức - dùng làm mốc neo vị trí cho bảng
  const [latexButton, setLatexButton] = useState<HTMLButtonElement | null>(null);
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

    datConTro(start, start + wrappedText.length);
  };

  /**
   * Đặt cấp tiêu đề cho DÒNG đang đứng (hoặc mọi dòng đang bôi đen).
   *
   * Bản cũ có hai chỗ hỏng:
   *  - Không bôi đen thì nó chèn dấu # NGAY TẠI CON TRỎ, nên đang đứng giữa dòng là ra
   *    "Trong mặt### phẳng". Phải áp cho cả dòng.
   *  - Đang là ### mà chọn ## thì cũ chồng thêm dấu #. Phải thay cấp, không cộng dồn.
   */
  /**
   * Áp một trong BẢY cấp cho (các) dòng đang chọn.
   *
   * Cấp 1-4 là TIÊU ĐỀ (# ## ### ####). Cấp 5-7 là BA BẬC GẠCH ĐẦU DÒNG lồng nhau -
   * Markdown vốn có sẵn ba bậc này nên chạy đúng ở cả ba nơi (soạn thảo, học sinh, trình
   * chiếu), không phải chế thêm cú pháp. Dấu hiện ra ("–", "+", "•") do bộ định dạng vẽ,
   * chứ trong bài vẫn là "-" chuẩn.
   */
  const handleApplyHeading = (level: number | '') => {
    if (!level || !textareaRef.current) return;
    const { val, dauDong, cuoiDong } = layVungDong();
    const c = level as number;
    const prefix = c <= 4 ? '#'.repeat(c) + ' ' : '  '.repeat(c - 5) + '- ';

    const doan = val.slice(dauDong, cuoiDong);
    /* Gỡ mọi dấu cấp cũ (cả # lẫn gạch đầu dòng có thụt lề) rồi mới đặt dấu mới, để đổi
       qua đổi lại giữa các cấp không bị chồng dấu. */
    const moi = doan.split('\n')
      .map(l => (l.trim() === '' ? l : prefix + l.replace(/^\s*(?:#{1,6}\s*|[-*+]\s+)/, '')))
      .join('\n');

    /*
     * Con trỏ ĐỨNG NGUYÊN CHỖ CŨ, chỉ dịch theo phần dấu # vừa thêm/bớt ở đầu dòng.
     * Nhảy về cuối dòng thì đang gõ dở giữa câu lại phải bấm chuột về chỗ cũ.
     */
    const ta = textareaRef.current;
    const dongCu = doan.split('\n')[0];
    const dongMoi = moi.split('\n')[0];
    const lech = dongMoi.length - dongCu.length;
    const cu = ta.selectionStart;
    const conTro = Math.max(dauDong, Math.min(cu + lech, dauDong + dongMoi.length));

    datGiaTri(val.slice(0, dauDong) + moi + val.slice(cuoiDong), conTro);
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

    datConTro(start, start + wrappedText.length);
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

    datConTro(start, start + wrappedText.length);
  };

  /** Ghi giá trị mới vào ô soạn, dùng chung cho mấy nút mới bên dưới. */
  /*
   * Vị trí con trỏ phải đặt lại SAU khi React vẽ xong giá trị mới.
   *
   * Ô soạn là controlled: React gán lại thuộc tính value, và trình duyệt tự đẩy con trỏ
   * về CUỐI. setTimeout(...,0) có khi chạy trước lượt vẽ đó nên vị trí vừa đặt bị xoá -
   * đúng cái cảm giác "chọn tiêu đề xong con trỏ nhảy về cuối khối". useLayoutEffect chạy
   * ngay sau khi DOM cập nhật nên đặt lại là ăn chắc.
   */
  const viTriCho = useRef<{ tu: number; den: number; cuon: number } | null>(null);
  React.useLayoutEffect(() => {
    const v = viTriCho.current;
    const ta = textareaRef.current;
    if (!v || !ta) return;
    viTriCho.current = null;
    /*
     * preventScroll + đặt lại scrollTop: GIỮ NGUYÊN CHỖ ĐANG NHÌN.
     *
     * Không có hai thứ này thì bấm một nút định dạng là ô soạn nhảy tuốt xuống cuối
     * khối - trình duyệt tự cuộn khi ô được focus lại và khi giá trị bị thay cả chuỗi.
     */
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(v.tu, v.den);
    ta.scrollTop = v.cuon;
  });

  /** Hẹn đặt con trỏ - sẽ áp ngay sau khi React vẽ xong, xem viTriCho ở trên. */
  const datConTro = (tu: number, den?: number) => {
    viTriCho.current = { tu, den: den ?? tu, cuon: textareaRef.current?.scrollTop ?? 0 };
  };

  /*
   * Mở ô soạn ở ĐÚNG CHỖ thầy cô vừa nhấp.
   *
   * autoFocus của trình duyệt luôn đặt con trỏ ở CUỐI. Khối lý thuyết trung bình 8.767
   * ký tự nên nhấp vào đoạn nào cũng rơi xuống đáy rồi phải cuộn ngược lên mò.
   */
  useEffect(() => {
    if (viTriBanDau === undefined) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const v = Math.max(0, Math.min(viTriBanDau, ta.value.length));
    /* preventScroll: chỉ cuộn BÊN TRONG ô, không kéo cả trang nhảy theo. */
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(v, v);
    /* Kéo dòng đó vào tầm nhìn: ước lượng theo tỉ lệ ký tự, đủ dùng cho chữ đều dòng. */
    if (ta.scrollHeight > ta.clientHeight && ta.value.length > 0) {
      ta.scrollTop = Math.max(0, (v / ta.value.length) * ta.scrollHeight - ta.clientHeight / 2);
    }
    /*
     * Phụ thuộc isClient chứ KHÔNG phải mảng rỗng.
     *
     * Lần vẽ đầu tiên component trả về nhánh chưa gắn ref (còn chờ isClient), nên hiệu
     * ứng chạy lúc textareaRef vẫn null rồi thôi luôn - con trỏ không bao giờ được đặt.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  const datGiaTri = (giaTri: string, chonTu?: number, chonDen?: number) => {
    if (chonTu !== undefined) datConTro(chonTu, chonDen);
    if (onValueChange) onValueChange(giaTri);
    else resolvedOnChange({ target: { value: giaTri } } as React.ChangeEvent<HTMLTextAreaElement>);
  };

  /** Phạm vi dòng đang được chọn (hoặc dòng đang đặt con trỏ). */
  const layVungDong = () => {
    const ta = textareaRef.current!;
    const val = ta.value;
    const dauDong = val.lastIndexOf('\n', ta.selectionStart - 1) + 1;
    let cuoiDong = val.indexOf('\n', ta.selectionEnd);
    if (cuoiDong === -1) cuoiDong = val.length;
    return { val, dauDong, cuoiDong };
  };

  /**
   * Thụt dòng vào / ra.
   *
   * Thụt theo cấp DANH SÁCH THẬT của Markdown (thêm/bớt 2 dấu cách trước dấu gạch đầu
   * dòng), không đẻ thêm cú pháp riêng - nhờ vậy xuất Word, trình chiếu, giao diện học
   * sinh đều hiểu. Thanh công cụ trước đây không hề có nút này.
   */
  const handleThutDong = (vao: boolean, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!textareaRef.current) return;
    const { val, dauDong, cuoiDong } = layVungDong();
    const doan = val.slice(dauDong, cuoiDong);
    const moiDoan = doan.split('\n').map(d => {
      if (!d.trim()) return d;
      if (vao) return '  ' + d;
      return d.replace(/^ {1,2}/, '');
    }).join('\n');
    datGiaTri(val.slice(0, dauDong) + moiDoan + val.slice(cuoiDong), dauDong, dauDong + moiDoan.length);
  };

  /** Biến các dòng đang chọn thành danh sách gạch đầu dòng hoặc đánh số. */
  const handleDanhSach = (kieu: 'cham' | 'so', e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!textareaRef.current) return;
    const { val, dauDong, cuoiDong } = layVungDong();
    const cacDong = val.slice(dauDong, cuoiDong).split('\n');
    // Đang là danh sách rồi thì bấm lần nữa là bỏ - một nút làm cả hai chiều
    const dangLa = cacDong.filter(d => d.trim()).every(d => /^\s*(?:[-*]|\d+\.)\s/.test(d));
    let dem = 0;
    const moiDoan = cacDong.map(d => {
      if (!d.trim()) return d;
      const khongDau = d.replace(/^(\s*)(?:[-*]|\d+\.)\s+/, '$1');
      if (dangLa) return khongDau;
      dem++;
      const le = (khongDau.match(/^\s*/) || [''])[0];
      return le + (kieu === 'cham' ? '- ' : `${dem}. `) + khongDau.trimStart();
    }).join('\n');
    datGiaTri(val.slice(0, dauDong) + moiDoan + val.slice(cuoiDong), dauDong, dauDong + moiDoan.length);
  };

  /**
   * Dọn thẻ HTML gõ tay trong cả ô soạn.
   *
   * Đo trên 29 bài thật: 63 thẻ gõ tay rải trong 8 bài, và có bài tiêu đề phải bọc ba lớp
   * span lồng nhau. Có xem trước rồi mới đổi - đây là đụng vào bài giảng đã soạn công phu.
   */
  const handleDonThe = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const kq = donTheThua(value);
    if (kq.soTheTruoc === 0) {
      alert('Nội dung này không có thẻ HTML gõ tay nào - không cần dọn.');
      return;
    }
    if (kq.daLam.length === 0) {
      alert(`Có ${kq.soTheTruoc} thẻ HTML nhưng đều đang dùng đúng việc (đặt màu/cỡ chữ) - không có gì để dọn.`);
      return;
    }
    const dongY = confirm(
      `Sẽ dọn ${kq.soTheTruoc - kq.soTheSau} thẻ HTML thừa:\n\n` +
      kq.daLam.map(v => `   • ${v}`).join('\n') +
      `\n\nCâu hỏi, công thức và ảnh giữ nguyên. Đồng ý?`
    );
    if (dongY) datGiaTri(kq.noiDungMoi);
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

    datConTro(start, start + wrappedText.length);
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

    datConTro(start, start + wrappedText.length);
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

    datConTro(start, start + wrappedText.length);
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
    datConTro(start + icon.length, start + icon.length);
  };

  /**
   * Chèn một mẫu LaTeX vào ô soạn thảo.
   * - Nếu con trỏ chưa nằm trong công thức thì tự bọc thêm cặp $...$
   * - Nếu đang bôi đen thì đưa phần bôi đen vào đúng ô cần điền của mẫu
   * - Con trỏ nhảy tới vị trí đánh dấu bằng CURSOR_TOKEN trong mẫu
   */
  const handleInsertLatex = (snippet: string) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.substring(start, end);

    // Đang ở giữa cặp $...$ rồi thì không bọc thêm nữa
    const alreadyInMath = isInsideMath(value, start);

    let body = snippet;
    if (selected) {
      body = snippet.includes(CURSOR_TOKEN)
        ? snippet.replace(CURSOR_TOKEN, selected)
        : snippet + selected;
    }

    const inserted = alreadyInMath ? body : `$${body}$`;
    const tokenIndex = inserted.indexOf(CURSOR_TOKEN);
    const cleanText = inserted.split(CURSOR_TOKEN).join('');
    const caretAt = tokenIndex === -1 ? start + cleanText.length : start + tokenIndex;

    const newValue = value.substring(0, start) + cleanText + value.substring(end);

    if (onValueChange) onValueChange(newValue);
    else {
      const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
      resolvedOnChange(event);
    }

    setShowLatexPalette(false);
    datConTro(caretAt);
    setCursorPos(caretAt);
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

    datConTro(start + 6, start + 6);
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
      if (key === 'f') { e.preventDefault(); handleInsertLatex(`\\frac{${CURSOR_TOKEN}}{}`); return; }
    }

    // Ctrl + M: chèn nhanh cặp $...$ để gõ công thức
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      handleInsertLatex(CURSOR_TOKEN);
      return;
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
        datConTro(start + 4);
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
        datConTro(start - deleteCount);
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
          datConTro(start - deleteCount);
        }
      }
    }
  };

  /**
   * @param viTri Chỗ chèn đã đo SẴN từ lúc dán.
   *
   * Cần tham số này vì đường "hỏi ảnh là gì rồi mới chèn": bấm nút trong hộp hỏi là ô
   * soạn thảo đóng lại (OSuaTaiCho đóng khi bấm ra ngoài), textareaRef thành null, đọc
   * vị trí lúc đó thì hàm lặng lẽ thoát ra và ảnh không bao giờ được chèn.
   */
  const uploadAndInsertImage = async (file: File, viTri?: { start: number; end: number }) => {
    const ta = textareaRef.current;
    if (!ta && !viTri) return;
    const start = viTri ? viTri.start : ta!.selectionStart;
    const end = viTri ? viTri.end : ta!.selectionEnd;
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
       // Dùng chung lối tải với đường "dán ảnh ra câu hỏi" (utils/docCauHoiTuAnh)
       // để hai bên cùng một kho, một kiểu đặt tên tệp.
       const { taiAnhLenKho } = await import("@/utils/docCauHoiTuAnh");
       const publicUrl = await taiAnhLenKho(file);

       const imgMd = `\n![Hình ảnh](${publicUrl})\n`;
       const newValue = beforeText + imgMd + afterText;
       
       if (onValueChange) onValueChange(newValue);
       else {
          const ev = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
          resolvedOnChange(ev);
       }
       
       datConTro(start + imgMd.length, start + imgMd.length);
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
          // preventDefault phải gọi NGAY, trước mọi await: chờ xong rồi mới gọi thì
          // trình duyệt đã dán xong địa chỉ ảnh vào ô mất rồi.
          e.preventDefault();
          e.stopPropagation();
          if (xuLyAnhDan) {
            // Đo chỗ chèn NGAY BÂY GIỜ: hỏi xong thì ô soạn thảo có thể đã đóng.
            const ta = textareaRef.current;
            const viTri = { start: ta?.selectionStart ?? value.length, end: ta?.selectionEnd ?? value.length };
            xuLyAnhDan(file).then(daXuLy => { if (!daXuLy) uploadAndInsertImage(file, viTri); });
          } else {
            uploadAndInsertImage(file);
          }
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

  // Công thức đang chứa con trỏ (nếu có) và kết quả vẽ thử.
  // Phải đặt TRƯỚC lệnh return sớm bên dưới, nếu không thứ tự hook sẽ đổi giữa các lần render.
  const mathPreview = React.useMemo(() => {
    if (!isClient) return null;

    const region = getMathAtCursor(value, cursorPos);
    if (!region || !region.content.trim()) return null;

    try {
      const html = katex.renderToString(region.content, {
        throwOnError: true,
        displayMode: region.display,
      });
      return { html, error: null as string | null };
    } catch (err: any) {
      const raw = typeof err?.message === 'string' ? err.message : 'không đọc được';
      // Bỏ tiền tố kỹ thuật của KaTeX cho gọn
      const message = raw.replace(/^KaTeX parse error:\s*/i, '');
      return { html: null as string | null, error: message };
    }
  }, [value, cursorPos, isClient]);

  if (!isClient) return <TextareaAutosize minRows={props.rows || 3} maxRows={30} value={value} onChange={resolvedOnChange} className={className} {...props} />;

  // Lọc bớt class border/focus từ bên ngoài truyền vào vì ta đã có border ở thẻ bọc ngoài
  const innerClass = className.replace(/border-[a-zA-Z0-9-]+|rounded-[a-zA-Z0-9-]+|focus:[a-zA-Z0-9-]+|ring[a-zA-Z0-9-:]*/g, '').trim();

  // Theo dõi vị trí con trỏ để biết đang đứng trong công thức nào
  const handleSelectionChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPos(e.currentTarget.selectionStart ?? 0);
  };

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
          {/* Đặt tên theo việc chứ không theo H1..H5: bộ chữ của hệ thống đã tô sẵn màu
              và khung cho từng cấp, nên chỉ cần chọn ở đây, KHÔNG phải gõ thẻ span. */}
          <option value="">Cấp</option>
          <option value="1">Đề bài</option>
          <option value="2">I, II, III</option>
          <option value="3">1. 2. 3.</option>
          <option value="4">a) b) c)</option>
          <option value="5">–  Ý lớn</option>
          <option value="6">+  Ý nhỏ</option>
          <option value="7">•  Ý phụ</option>
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
           {/* Thụt dòng và danh sách - thanh công cụ trước đây thiếu hẳn hai nhóm này */}
           <button type="button" onClick={e => handleDanhSach('cham', e)} title="Danh sách gạch đầu dòng" className="p-1 hover:bg-gray-100 rounded text-gray-600"><List className="w-3 h-3" /></button>
           <button type="button" onClick={e => handleDanhSach('so', e)} title="Danh sách đánh số" className="p-1 hover:bg-gray-100 rounded text-gray-600"><ListOrdered className="w-3 h-3" /></button>
           <button type="button" onClick={e => handleThutDong(true, e)} title="Thụt vào (hoặc nhấn Tab)" className="p-1 hover:bg-gray-100 rounded text-gray-600"><IndentIncrease className="w-3 h-3" /></button>
           <button type="button" onClick={e => handleThutDong(false, e)} title="Thụt ra (hoặc nhấn Shift+Tab)" className="p-1 hover:bg-gray-100 rounded text-gray-600"><IndentDecrease className="w-3 h-3" /></button>
           <div className="w-px h-4 bg-gray-300 shrink-0"></div>
           <button type="button" onClick={handleDonThe} title="Dọn thẻ HTML gõ tay, đổi về Markdown chuẩn" className="p-1 hover:bg-amber-100 rounded text-amber-700"><Wand2 className="w-3 h-3" /></button>
           <div className="w-px h-4 bg-gray-300 shrink-0"></div>
           <button type="button" onClick={e => handleApplyAlign('left', e)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><AlignLeft className="w-3 h-3" /></button>
           <button type="button" onClick={e => handleApplyAlign('center', e)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><AlignCenter className="w-3 h-3" /></button>
           <button type="button" onClick={e => handleApplyAlign('right', e)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><AlignRight className="w-3 h-3" /></button>
           <button type="button" onClick={e => handleApplyAlign('justify', e)} className="p-1 hover:bg-gray-100 rounded text-gray-600"><AlignJustify className="w-3 h-3" /></button>
        </div>

        <div className="w-px h-4 bg-gray-300 shrink-0"></div>

        {/* Bảng ký hiệu Toán */}
        <div className="flex items-center shrink-0">
           <button
             ref={setLatexButton}
             type="button"
             onMouseDown={e => e.preventDefault()}
             onClick={() => setShowLatexPalette(v => !v)}
             title="Bảng công thức Toán (Ctrl+M chèn nhanh $...$, Ctrl+Shift+F phân số)"
             className={`flex items-center gap-1 px-2 h-6 rounded border font-bold text-[11px] transition-colors ${
               showLatexPalette
                 ? 'bg-indigo-600 text-white border-indigo-600'
                 : 'bg-white border-gray-200 text-indigo-700 hover:bg-indigo-50'
             }`}
           >
             <Sigma className="w-3 h-3" /> Công thức <ChevronDown className="w-3 h-3" />
           </button>
           {showLatexPalette && (
             <LatexPalette
               anchor={latexButton}
               onPick={handleInsertLatex}
               onClose={() => setShowLatexPalette(false)}
             />
           )}
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
        onSelect={handleSelectionChange}
        onClick={handleSelectionChange}
        onFocus={handleSelectionChange}
        minRows={props.rows || 3}
        maxRows={30}
        className={`w-full p-4 border-none focus:ring-0 outline-none font-mono text-[15px] bg-transparent ${innerClass}`}
        {...props}
      />

      {/* Xem trước công thức ngay tại chỗ khi con trỏ đang đứng trong cặp $...$ */}
      {mathPreview && (
        <div className={`flex items-start gap-2 px-3 py-1.5 border-t text-[13px] ${
          mathPreview.error
            ? 'bg-red-50 border-red-100'
            : 'bg-emerald-50/60 border-emerald-100'
        }`}>
          {mathPreview.error ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
              <span className="text-red-700 text-[12px] leading-snug">
                Công thức chưa hợp lệ: {mathPreview.error}
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide shrink-0 mt-1">Xem trước</span>
              <span
                className="overflow-x-auto text-gray-900"
                dangerouslySetInnerHTML={{ __html: mathPreview.html as string }}
              />
            </>
          )}
        </div>
      )}

      </div>
  );
}
