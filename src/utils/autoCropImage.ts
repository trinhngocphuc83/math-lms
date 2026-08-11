// Tự động cắt ảnh minh họa (hình vẽ/đồ thị/bảng) ra khỏi ảnh trang gốc, dựa vào
// khung tọa độ (bounding box) do AI xác định khi quét câu hỏi (xem viTriHinhAnh
// trong src/utils/aiQuestionScan.ts), rồi tải ảnh đã cắt lên Supabase Storage.
//
// Chỉ áp dụng cho lô là ẢNH (JPG/PNG) - ảnh trang gốc đã có sẵn trong trình
// duyệt nên cắt trực tiếp bằng canvas được. Với PDF cần dựng trang thành ảnh
// trước (chưa làm ở bản này).

export interface NormalizedBox {
  /** Tọa độ chuẩn hóa theo thang 0-1000 (0 = mép trên/trái, 1000 = mép dưới/phải) */
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không đọc được ảnh gốc"));
    img.src = url;
  });
}

/** Làm nét cơ bản (unsharp mask 3x3) - chỉ nên dùng cho ảnh đã phóng to vì cắt nhỏ. */
function sharpenCanvas(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const src = imageData.data;
  const output = new Uint8ClampedArray(src.length);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = Math.min(w - 1, Math.max(0, x + kx));
            const py = Math.min(h - 1, Math.max(0, y + ky));
            sum += src[(py * w + px) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        output[(y * w + x) * 4 + c] = sum;
      }
      output[(y * w + x) * 4 + 3] = src[(y * w + x) * 4 + 3];
    }
  }
  imageData.data.set(output);
  ctx.putImageData(imageData, 0, 0);
}

/** Cắt vùng ảnh theo khung tọa độ chuẩn hóa, phóng to + làm nét nếu vùng cắt nhỏ. */
export async function cropImageFromBoundingBox(sourceFile: File, box: NormalizedBox): Promise<Blob> {
  const img = await loadImageFromFile(sourceFile);
  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    const x = Math.max(0, Math.round((box.xmin / 1000) * w));
    const y = Math.max(0, Math.round((box.ymin / 1000) * h));
    const x2 = Math.min(w, Math.round((box.xmax / 1000) * w));
    const y2 = Math.min(h, Math.round((box.ymax / 1000) * h));
    const cropW = Math.max(1, x2 - x);
    const cropH = Math.max(1, y2 - y);

    // Vùng cắt phải hợp lý: không phải gần trọn trang, không quá nhỏ (AI xác định sai vị trí)
    const areaRatio = (cropW * cropH) / (w * h);
    if (areaRatio > 0.9) throw new Error("Vùng ảnh AI xác định gần như cả trang - có thể sai vị trí");
    if (areaRatio < 0.004) throw new Error("Vùng ảnh AI xác định quá nhỏ - có thể sai vị trí");

    const needsUpscale = cropW < 500;
    const scale = needsUpscale ? Math.min(3, 700 / cropW) : 1;
    const outW = Math.max(1, Math.round(cropW * scale));
    const outH = Math.max(1, Math.round(cropH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x, y, cropW, cropH, 0, 0, outW, outH);

    if (needsUpscale) sharpenCanvas(ctx, outW, outH);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Không tạo được ảnh đã cắt"))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(img.src);
  }
}

/** Tải ảnh đã cắt lên Supabase Storage (dùng chung bucket `lesson_images` như QuestionEditorModal.tsx), trả về URL công khai. */
export async function uploadCroppedImage(supabase: any, blob: Blob): Promise<string> {
  const filePath = `questions/autocrop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
  const { error } = await supabase.storage.from('lesson_images').upload(filePath, blob, { contentType: 'image/png' });
  if (error) throw error;
  const { data } = supabase.storage.from('lesson_images').getPublicUrl(filePath);
  return data.publicUrl as string;
}

/** Hàm gộp: cắt + tải lên, trả về URL ảnh đã cắt. */
export async function autoCropImage(supabase: any, sourceFile: File, box: NormalizedBox): Promise<string> {
  const blob = await cropImageFromBoundingBox(sourceFile, box);
  return uploadCroppedImage(supabase, blob);
}
