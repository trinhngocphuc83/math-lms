import html2canvas from "html2canvas-pro";

export async function imgToBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('imgToBase64 error for', url, e);
    return url;
  }
}

/**
 * html2canvas KHÔNG vẽ được nội dung bên trong ô nhập liệu: giá trị của
 * `<input>`/`<textarea>`/`<select>` nằm ở thuộc tính DOM (`.value`), không phải
 * nội dung trong cây DOM, nên bản sao dùng để chụp chỉ còn cái hộp rỗng. Đó là lý do
 * ảnh báo cáo điểm xuất ra bị trống cột Điểm trong khi cột Nhận xét (chữ thường) vẫn hiện.
 *
 * Hàm này thay các ô nhập trong BẢN SAO bằng chữ thường mang đúng giá trị đang nhập,
 * giữ nguyên căn lề/phông chữ. Giao diện thật người dùng đang thao tác không bị đụng tới.
 */
function replaceFormFieldsWithText(originalEl: HTMLElement, clonedEl: HTMLElement) {
  const selector = 'input, textarea, select';
  const originals = Array.from(originalEl.querySelectorAll(selector)) as HTMLElement[];
  const clones = Array.from(clonedEl.querySelectorAll(selector)) as HTMLElement[];

  clones.forEach((clone, i) => {
    const source = originals[i];
    if (!source) return;

    // Ô tick / nút chọn thì html2canvas vẽ được, giữ nguyên
    const type = (source as HTMLInputElement).type;
    if (type === 'checkbox' || type === 'radio' || type === 'file') return;

    let text = '';
    if (source instanceof HTMLSelectElement) {
      text = source.options[source.selectedIndex]?.text ?? '';
    } else {
      text = (source as HTMLInputElement | HTMLTextAreaElement).value ?? '';
    }

    const style = window.getComputedStyle(source);
    const span = clonedEl.ownerDocument.createElement('span');
    span.textContent = text;
    span.style.display = 'inline-block';
    span.style.width = '100%';
    span.style.textAlign = style.textAlign;
    span.style.fontSize = style.fontSize;
    span.style.fontWeight = style.fontWeight;
    span.style.fontFamily = style.fontFamily;
    span.style.color = style.color;
    span.style.lineHeight = style.lineHeight;
    span.style.padding = style.padding;
    span.style.whiteSpace = 'pre-wrap';

    clone.replaceWith(span);
  });
}

export interface CaptureOptions {
  /**
   * Ép bề ngang (px) của vùng chụp. Dùng cho báo cáo cần khổ cố định: trên điện thoại
   * vùng báo cáo chỉ rộng ~390px nên bảng bị bóp, họ tên xuống dòng từng chữ, ảnh gửi
   * phụ huynh rất xấu. Ép khổ giúp ảnh xuất ra giống nhau trên mọi thiết bị.
   */
  width?: number;
}

export async function captureElement(element: HTMLElement, options?: CaptureOptions): Promise<string> {
  const imgs = element.querySelectorAll('img');
  const base64Map = new Map<string, string>();
  
  await Promise.all(
    Array.from(imgs).map(async (img) => {
      const src = img.src;
      if (src && !src.startsWith('data:') && !base64Map.has(src)) {
        base64Map.set(src, await imgToBase64(src));
      }
    })
  );

  // Ép khổ ngay trên phần tử thật trước khi chụp: html2canvas đo kích thước từ phần tử
  // gốc nên chỉnh trong onclone không đổi được khung ảnh. Khôi phục lại ở finally bên dưới.
  const styleCu = { width: element.style.width, maxWidth: element.style.maxWidth };
  if (options?.width) {
    element.style.width = `${options.width}px`;
    element.style.maxWidth = 'none';
  }

  try {
  const elementHeight = element.offsetHeight || 2000;
  const safeScale = elementHeight > 2000 ? 1 : 1.5;

  const canvas = await html2canvas(element, {
    scale: safeScale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDoc, clonedEl) => {
      clonedEl.style.position = 'static';
      clonedEl.style.opacity = '1';
      clonedEl.style.pointerEvents = 'auto';
      clonedEl.style.overflow = 'visible';

      replaceFormFieldsWithText(element, clonedEl);

      const clonedImgs = clonedEl.querySelectorAll('img');
      clonedImgs.forEach((img: HTMLImageElement) => {
        const b64 = base64Map.get(img.src);
        if (b64) {
          img.src = b64;
          img.removeAttribute('crossorigin');
          img.removeAttribute('crossOrigin');
        }
      });
    }
  });

    return canvas.toDataURL('image/png');
  } finally {
    element.style.width = styleCu.width;
    element.style.maxWidth = styleCu.maxWidth;
  }
}

export async function downloadOrShare(dataUrl: string, fileName: string) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.userAgent.includes("Mac") && "ontouchend" in document);
  
  if (isIOS && navigator.share) {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
        return;
      }
    } catch (e) {
      console.log('Share failed:', e);
    }
  }
  
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}
