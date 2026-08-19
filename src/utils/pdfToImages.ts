// Dựng từng trang PDF thành ảnh PNG để dùng chung cho mọi tính năng có "chèn nguồn".
//
// Vì sao cần: AI đọc được PDF, nhưng cỗ máy tự cắt hình minh hoạ (autoCropImage.ts) lại
// vẽ lên canvas nên chỉ nhận ảnh. Trước đây thầy cô nạp PDF thì AI vẫn bóc được chữ,
// nhưng hình vẽ không cắt được và khung "Smart Cropper" hiện ảnh vỡ - vì thẻ <img>
// không vẽ được PDF. Dựng trang thành ảnh ngay từ đầu thì mọi khâu phía sau chỉ còn
// phải làm việc với ảnh.
//
// Worker của pdf.js được để sẵn ở /public/pdf.worker.min.mjs thay vì để bộ đóng gói tự
// lo: cách này chạy giống nhau ở cả máy cục bộ lẫn bản đã triển khai, không phụ thuộc
// Turbopack hay webpack.

/** Độ phân giải khi dựng trang. 2.0 ≈ 150 DPI - đủ nét để cắt hình mà tệp không quá nặng. */
const TI_LE_DUNG_TRANG = 2.0;

/** Trần số trang xử lý một lần, tránh treo máy khi lỡ nạp tệp hàng trăm trang. */
export const SO_TRANG_TOI_DA = 30;

let daDatWorker = false;

async function napPdfjs() {
  const pdfjs: any = await import('pdfjs-dist');
  if (!daDatWorker) {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    daDatWorker = true;
  }
  return pdfjs;
}

export const laFilePdf = (file: File): boolean =>
  file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

/**
 * Dựng mọi trang của một tệp PDF thành danh sách ảnh PNG.
 *
 * @param onTienDo Gọi sau mỗi trang để hiện tiến trình cho người dùng (trang, tổng số).
 */
export async function pdfSangDanhSachAnh(
  file: File,
  onTienDo?: (trang: number, tong: number) => void,
): Promise<File[]> {
  const pdfjs = await napPdfjs();
  const dulieu = await file.arrayBuffer();
  const tepPdf = await pdfjs.getDocument({ data: dulieu }).promise;

  const tongTrang = Math.min(tepPdf.numPages, SO_TRANG_TOI_DA);
  const ketQua: File[] = [];
  const tenGoc = file.name.replace(/\.pdf$/i, '');

  for (let i = 1; i <= tongTrang; i++) {
    const trang = await tepPdf.getPage(i);
    const khungNhin = trang.getViewport({ scale: TI_LE_DUNG_TRANG });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(khungNhin.width);
    canvas.height = Math.round(khungNhin.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas để dựng trang PDF');

    // PDF không có nền: không tô trắng thì trang ra nền đen khi lưu PNG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await trang.render({ canvas, canvasContext: ctx, viewport: khungNhin }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Không dựng được trang PDF'))), 'image/png');
    });

    ketQua.push(new File([blob], `${tenGoc}_trang${i}.png`, { type: 'image/png' }));
    onTienDo?.(i, tongTrang);
  }

  try { await tepPdf.destroy(); } catch { /* dọn dẹp, hỏng cũng không sao */ }
  return ketQua;
}

/**
 * Chuẩn hoá danh sách tệp nguồn thành danh sách ẢNH.
 *
 * Dùng ở mọi chỗ nhận "chèn nguồn": PDF được tách thành từng trang ảnh, ảnh giữ nguyên,
 * các loại khác (Word...) trả về nguyên trạng để nơi gọi tự xử lý phần chữ như trước.
 *
 * PDF hỏng thì bỏ qua đúng tệp đó và báo qua `onLoi`, không làm chết cả lượt nạp.
 */
export async function chuanHoaNguonThanhAnh(
  files: File[],
  onTienDo?: (moTa: string) => void,
  onLoi?: (file: File, loi: string) => void,
): Promise<File[]> {
  const ra: File[] = [];

  for (const f of files) {
    if (!laFilePdf(f)) {
      ra.push(f);
      continue;
    }
    try {
      onTienDo?.(`Đang dựng trang từ ${f.name}...`);
      const trangAnh = await pdfSangDanhSachAnh(f, (trang, tong) => {
        onTienDo?.(`Đang dựng ${f.name}: trang ${trang}/${tong}`);
      });
      ra.push(...trangAnh);
    } catch (e: any) {
      console.warn('Không dựng được PDF thành ảnh:', f.name, e?.message);
      onLoi?.(f, e?.message || 'Không đọc được tệp PDF');
    }
  }

  return ra;
}
