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

/** Độ sáng cảm nhận của một điểm ảnh. */
const doSang = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/**
 * Kéo giãn mức sáng để nền giấy về trắng tinh và nét mực về đen đậm.
 *
 * Bản cũ dùng ngưỡng CỨNG: điểm nào cả ba kênh ≥ 200 thì ép về trắng. Ảnh chụp bằng
 * điện thoại trong phòng thiếu sáng thì nền giấy chỉ tầm 150-180, không điểm nào chạm
 * ngưỡng, nên ảnh cắt ra vẫn xám xịt y như cũ - đúng chỗ thầy cô phàn nàn.
 *
 * Nay đo trên CHÍNH ảnh đó rồi kéo giãn tuyến tính về 0-255, nên ảnh sáng hay tối đều
 * ra nền trắng và nét rõ như nhau. Hai mốc đo lấy theo hai cách khác nhau, có lý do:
 *
 *   - Nền giấy: lấy ĐỈNH biểu đồ ở nửa sáng, tức mức xám xuất hiện nhiều nhất. Nền luôn
 *     chiếm phần lớn diện tích nên nó chính là đỉnh đó.
 *   - Nét mực: lấy phân vị 0,5% chứ KHÔNG lấy phân vị vài phần trăm. Hình vẽ toán lý chỉ
 *     là mấy đường kẻ mảnh, nét mực thường chiếm 2-3% điểm ảnh - lấy phân vị 4% là rơi
 *     trúng nền, ra dải sáng hẹp và hàm tưởng nhầm "ảnh gần một màu" rồi bỏ qua.
 *
 * Kéo giãn theo ĐỘ SÁNG rồi áp cùng một hệ số cho cả ba kênh, chứ không xử riêng từng
 * kênh - xử riêng sẽ làm lệch màu, hình vẽ có nét màu xanh đỏ bị đổi sắc.
 */
function canBangSang(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const soDiem = w * h;

  const bieuDo = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) bieuDo[Math.round(doSang(d[i], d[i + 1], d[i + 2]))]++;

  const phanVi = (p: number) => {
    let dem = 0;
    const moc = soDiem * p;
    for (let v = 0; v < 256; v++) { dem += bieuDo[v]; if (dem >= moc) return v; }
    return 255;
  };

  // Đỉnh biểu đồ ở nửa sáng = mức của nền giấy
  const giua = phanVi(0.5);
  let mucGiay = giua, dinh = -1;
  for (let v = giua; v < 256; v++) if (bieuDo[v] > dinh) { dinh = bieuDo[v]; mucGiay = v; }

  const mucMuc = phanVi(0.005);

  // Ảnh gần như một màu (hình đã trắng sẵn, hoặc vùng cắt hỏng) thì đừng đụng vào,
  // kéo giãn một dải quá hẹp chỉ tổ khuếch đại nhiễu thành lốm đốm.
  if (mucGiay - mucMuc < 40) return;

  const heSo = 255 / (mucGiay - mucMuc);
  const bang = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) bang[v] = Math.round((v - mucMuc) * heSo);

  for (let i = 0; i < d.length; i += 4) {
    const cu = doSang(d[i], d[i + 1], d[i + 2]);
    const moi = bang[Math.round(cu)];
    // Giữ nguyên tương quan màu: nhân cùng một tỉ lệ cho ba kênh
    const ti = cu > 0 ? moi / cu : 0;
    d[i] = Math.min(255, d[i] * ti);
    d[i + 1] = Math.min(255, d[i + 1] * ti);
    d[i + 2] = Math.min(255, d[i + 2] * ti);
  }
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Làm nét bằng unsharp mask: lấy ảnh trừ đi bản làm mờ của chính nó rồi cộng ngược lại.
 *
 * Bản cũ dùng nhân chập cứng [0,-1,0,-1,5,-1,0,-1,0] và CHỈ chạy khi ảnh bị phóng to.
 * Hai chỗ dở: ảnh cắt to sẵn thì không được làm nét lần nào, còn ảnh nhỏ thì bị làm nét
 * quá tay nên nét mực viền trắng lấp lánh. Nay lúc nào cũng làm nét, nhưng có tham số
 * `muc` để ảnh phóng to thì mạnh tay hơn ảnh vốn đã sắc.
 */
function lamNet(ctx: CanvasRenderingContext2D, w: number, h: number, muc: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const src = imageData.data;
  const ra = new Uint8ClampedArray(src.length);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const vt = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let tong = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = Math.min(w - 1, Math.max(0, x + kx));
            const py = Math.min(h - 1, Math.max(0, y + ky));
            tong += src[(py * w + px) * 4 + c];
          }
        }
        const mo = tong / 9;
        ra[vt + c] = src[vt + c] + muc * (src[vt + c] - mo);
      }
      ra[vt + 3] = src[vt + 3];
    }
  }
  imageData.data.set(ra);
  ctx.putImageData(imageData, 0, 0);
}

/** Nới thêm mỗi phía bao nhiêu phần khung, để không lẹm mất chữ hay đầu mũi tên sát mép. */
const BIEN_DEM = 0.03;

/** Cắt vùng ảnh theo khung tọa độ chuẩn hóa, phóng to + làm nét nếu vùng cắt nhỏ. */
export async function cropImageFromBoundingBox(sourceFile: File, box: NormalizedBox): Promise<Blob> {
  const img = await loadImageFromFile(sourceFile);
  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    // AI hay trả khung bám sát hình nên cắt ra bị lẹm chữ chú thích và cụt đầu mũi tên.
    // Nới mỗi phía một chút rồi kẹp lại trong mép ảnh.
    const demNgang = ((box.xmax - box.xmin) * BIEN_DEM);
    const demDoc = ((box.ymax - box.ymin) * BIEN_DEM);
    const xminNoi = Math.max(0, box.xmin - demNgang);
    const yminNoi = Math.max(0, box.ymin - demDoc);
    const xmaxNoi = Math.min(1000, box.xmax + demNgang);
    const ymaxNoi = Math.min(1000, box.ymax + demDoc);

    const x = Math.max(0, Math.round((xminNoi / 1000) * w));
    const y = Math.max(0, Math.round((yminNoi / 1000) * h));
    const x2 = Math.min(w, Math.round((xmaxNoi / 1000) * w));
    const y2 = Math.min(h, Math.round((ymaxNoi / 1000) * h));
    const cropW = Math.max(1, x2 - x);
    const cropH = Math.max(1, y2 - y);

    // Vùng cắt phải hợp lý: không phải gần trọn trang, không quá nhỏ (AI xác định sai vị trí)
    const areaRatio = (cropW * cropH) / (w * h);
    if (areaRatio > 0.9) throw new Error("Vùng ảnh AI xác định gần như cả trang - có thể sai vị trí");
    if (areaRatio < 0.004) throw new Error("Vùng ảnh AI xác định quá nhỏ - có thể sai vị trí");

    // Phóng to rộng tay hơn bản cũ (ngưỡng 500 -> 900, trần 3x -> 4x): hình vẽ cắt ra
    // thường chỉ rộng 300-600px, in lên giấy A4 là rỗ hết. Phóng to trước rồi mới làm
    // nét thì nét mực dày dặn, in ra sắc.
    const needsUpscale = cropW < 900;
    const scale = needsUpscale ? Math.min(4, 1200 / cropW) : 1;
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

    // Thứ tự có ý nghĩa: cân sáng TRƯỚC rồi mới làm nét. Làm nét trước thì nhiễu của nền
    // giấy cũng được khuếch đại lên, cân sáng sau sẽ đẩy đám nhiễu đó thành lốm đốm đen.
    canBangSang(ctx, outW, outH);
    lamNet(ctx, outW, outH, needsUpscale ? 0.9 : 0.45);

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

/**
 * Tải ẢNH TRANG GỐC lên Storage, trả về URL công khai.
 *
 * Trước đây phần "ảnh nguồn" của mỗi câu lưu địa chỉ `blob:` do trình duyệt cấp. Loại
 * địa chỉ đó chỉ sống trong đúng một phiên mở trang, nên hôm sau mở lại bài là khung
 * Smart Cropper hiện ảnh vỡ và không cắt lại tay được nữa. Lưu hẳn lên Storage thì ảnh
 * nguồn còn mãi.
 *
 * Cùng một tệp gọi nhiều lần chỉ tải lên một lần, nhờ bộ nhớ đệm theo tên+cỡ tệp.
 */
const boNhoDemAnhNguon = new Map<string, string>();

export async function uploadSourceImage(supabase: any, file: File): Promise<string> {
  const khoa = `${file.name}|${file.size}|${file.lastModified}`;
  const daCo = boNhoDemAnhNguon.get(khoa);
  if (daCo) return daCo;

  const duoi = file.type === 'image/png' ? 'png' : 'jpg';
  const filePath = `sources/page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${duoi}`;
  const { error } = await supabase.storage
    .from('lesson_images')
    .upload(filePath, file, { contentType: file.type || 'image/jpeg' });
  if (error) throw error;

  const { data } = supabase.storage.from('lesson_images').getPublicUrl(filePath);
  const url = data.publicUrl as string;
  boNhoDemAnhNguon.set(khoa, url);
  return url;
}

/** Hàm gộp: cắt + tải lên, trả về URL ảnh đã cắt. */
export async function autoCropImage(supabase: any, sourceFile: File, box: NormalizedBox): Promise<string> {
  const blob = await cropImageFromBoundingBox(sourceFile, box);
  return uploadCroppedImage(supabase, blob);
}
