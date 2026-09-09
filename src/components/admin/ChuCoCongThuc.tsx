"use client";

/**
 * Hiện một đoạn chữ có lẫn công thức LaTeX thành CHỮ ĐỌC ĐƯỢC.
 *
 * Khu ngân hàng câu hỏi trước nay bày chữ thô: "Một lực tĩnh điện $\overrightarrow{F}$
 * tác động lên..." - Thầy cô phải tự dịch trong đầu mới biết câu ấy hỏi gì, mà một trang
 * danh sách có tới vài chục câu. Chỗ nào chỉ để ĐỌC thì dựng công thức ra cho tường minh;
 * chỗ nào để SỬA thì vẫn giữ ô chữ thô, chỉ thêm khung xem trước bên cạnh.
 *
 * Cố ý làm nhẹ, không kéo cả bộ markdown: chỉ cần công thức, chữ đậm, chữ nghiêng và ảnh -
 * đúng những thứ có trong một câu hỏi. Bộ markdown đầy đủ nặng gấp nhiều lần và bày ra
 * một trang danh sách vài chục câu thì thấy rõ giật.
 */
import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/** Một mẩu sau khi cắt: chữ thường, công thức, hay ảnh. */
type Manh =
  | { loai: 'chu'; chu: string }
  | { loai: 'toan'; ct: string; khoi: boolean }
  | { loai: 'anh'; dc: string };

/**
 * Cắt chuỗi thành các mẩu.
 *
 * Thứ tự dò quan trọng: ảnh markdown trước, rồi `$$...$$`, rồi `$...$`. Dò `$` trước thì
 * cặp `$$` bị xé làm đôi thành hai công thức rỗng.
 */
function cat(chu: string): Manh[] {
  const ra: Manh[] = [];
  const re = /!\[[^\]]*\]\(([^)]+)\)|\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let cuoi = 0, m: RegExpExecArray | null;
  while ((m = re.exec(chu))) {
    if (m.index > cuoi) ra.push({ loai: 'chu', chu: chu.slice(cuoi, m.index) });
    if (m[1] !== undefined) ra.push({ loai: 'anh', dc: m[1].trim() });
    else if (m[2] !== undefined) ra.push({ loai: 'toan', ct: m[2], khoi: true });
    else ra.push({ loai: 'toan', ct: m[3], khoi: false });
    cuoi = m.index + m[0].length;
  }
  if (cuoi < chu.length) ra.push({ loai: 'chu', chu: chu.slice(cuoi) });
  return ra;
}

/** Chữ thường: dựng `**đậm**` và `*nghiêng*`, giữ nguyên xuống dòng. */
function ChuThuong({ chu }: { chu: string }) {
  const phan: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
  let cuoi = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(chu))) {
    if (m.index > cuoi) phan.push(chu.slice(cuoi, m.index));
    phan.push(m[1] !== undefined
      ? <strong key={i++}>{m[1]}</strong>
      : <em key={i++}>{m[2]}</em>);
    cuoi = m.index + m[0].length;
  }
  if (cuoi < chu.length) phan.push(chu.slice(cuoi));
  return <>{phan}</>;
}

export default function ChuCoCongThuc({
  chu, className = '', anAnh = false, gonMotDong = false,
}: {
  chu: string | null | undefined;
  className?: string;
  /** Bỏ ảnh, chỉ giữ chữ - dùng cho ô trích dẫn trong bảng danh sách. */
  anAnh?: boolean;
  /** Cắt gọn về một dòng, thừa thì "…" - cũng cho bảng danh sách. */
  gonMotDong?: boolean;
}) {
  const manh = React.useMemo(() => cat(String(chu || '')), [chu]);

  return (
    <span className={`${gonMotDong ? 'block truncate' : 'whitespace-pre-wrap'} ${className}`}>
      {manh.map((p, i) => {
        if (p.loai === 'chu') return <ChuThuong key={i} chu={p.chu} />;
        if (p.loai === 'anh') {
          if (anAnh) return <span key={i} className="text-[11px] text-gray-400"> [hình] </span>;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={p.dc} alt="Hình minh hoạ"
                 className="block max-h-56 w-auto max-w-full my-1.5 rounded-lg border border-slate-200" />
          );
        }
        /* Công thức hỏng thì hiện lại chữ LaTeX gốc kèm gạch chân đỏ - thà thấy chữ thô
           còn hơn thấy khoảng trắng, vì Thầy cô còn biết đường mà sửa. */
        try {
          const html = katex.renderToString(p.ct, {
            throwOnError: true,
            displayMode: p.khoi && !gonMotDong,
          });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return (
            <span key={i} title="Công thức chưa hợp lệ"
                  className="text-red-600 underline decoration-wavy decoration-red-400 font-mono text-[0.92em]">
              ${p.ct}$
            </span>
          );
        }
      })}
    </span>
  );
}
