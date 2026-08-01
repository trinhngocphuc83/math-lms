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

export async function captureElement(element: HTMLElement): Promise<string> {
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
