"use client";

// Hiển thị ảnh trang gốc kèm khung đỏ đánh dấu đúng vùng mà AI đã cắt ra làm
// hình minh họa cho câu hỏi. Dùng ở Bàn kiểm duyệt của trang Hàng đợi tự động
// (src/app/admin/questions/batch-queue/page.tsx) để đối chiếu nhanh: nhìn 1 cái
// là biết AI cắt đúng hình của câu đó hay cắt nhầm sang chỗ khác.

import React, { useEffect, useState } from "react";
import type { NormalizedBox } from "@/utils/autoCropImage";

export interface SourceImageWithBoxProps {
  /** Ảnh trang gốc (File còn giữ trong bộ nhớ từ lúc tải lên) */
  file?: File;
  /** Hoặc đường dẫn ảnh gốc có sẵn (blob URL / URL Supabase) khi không còn giữ File */
  src?: string;
  /** Khung tọa độ AI xác định, thang 0-1000. Bỏ trống thì chỉ hiện ảnh gốc. */
  box?: NormalizedBox;
  className?: string;
}

export default function SourceImageWithBox({ file, src, box, className = "" }: SourceImageWithBoxProps) {
  const [objectUrl, setObjectUrl] = useState("");

  useEffect(() => {
    if (!file) return;
    const created = URL.createObjectURL(file);
    setObjectUrl(created);
    return () => URL.revokeObjectURL(created);
  }, [file]);

  // Ưu tiên File (ảnh vừa tải lên, luôn đúng bản gốc), không có thì dùng src truyền vào
  const url = file ? objectUrl : (src || "");

  if (!url) {
    return <div className="text-xs text-gray-400 italic">Không còn ảnh trang gốc để đối chiếu.</div>;
  }

  return (
    // inline-block để khung bao ôm sát đúng kích thước ảnh sau khi co giãn -
    // nhờ vậy toạ độ % của khung đỏ trùng khớp với hệ toạ độ của chính ảnh.
    <div className={`relative inline-block max-w-full ${className}`} data-testid="source-image-wrap">
      <img src={url} alt="Ảnh trang gốc" className="max-h-72 w-auto rounded-lg border border-gray-300 block" data-testid="source-image" />
      {box && (
        // Thang 0-1000 -> phần trăm: chia 10
        <div
          data-testid="crop-box"
          className="absolute border-2 border-red-500 bg-red-500/10 pointer-events-none rounded-sm"
          style={{
            left: `${box.xmin / 10}%`,
            top: `${box.ymin / 10}%`,
            width: `${(box.xmax - box.xmin) / 10}%`,
            height: `${(box.ymax - box.ymin) / 10}%`,
          }}
        />
      )}
    </div>
  );
}
