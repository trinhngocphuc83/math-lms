// So hai đoạn chữ theo TỪ để tô đúng chỗ khác nhau khi đối chiếu câu nghi trùng.
//
// Vì sao so theo từ chứ không theo ký tự: câu hỏi toán dày đặc LaTeX ($\frac{a}{b}$),
// so theo ký tự sẽ băm nát công thức thành hàng chục mảnh xanh đỏ xen kẽ, nhìn còn
// rối hơn không tô. So theo từ giữ nguyên mỗi cụm công thức làm một khối.

export type TrangThaiDoan = 'chung' | 'khac';

export interface DoanChu {
  chu: string;
  trangThai: TrangThaiDoan;
}

/** Cắt thành từ, GIỮ LẠI khoảng trắng để ghép lại không mất định dạng xuống dòng. */
function catTu(s: string): string[] {
  return String(s || '').split(/(\s+)/).filter(t => t !== '');
}

/**
 * Dãy con chung dài nhất giữa hai mảng từ, trả về bảng độ dài.
 * Câu hỏi thường vài trăm từ nên bảng n*m vẫn nhẹ.
 */
function bangLcs(a: string[], b: string[]): number[][] {
  const n = a.length, m = b.length;
  const d: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      d[i][j] = a[i] === b[j] ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
    }
  }
  return d;
}

/** Gộp các từ liền nhau cùng trạng thái thành một đoạn, cho ít thẻ HTML hơn. */
function gomDoan(tho: DoanChu[]): DoanChu[] {
  const ra: DoanChu[] = [];
  for (const d of tho) {
    const cuoi = ra[ra.length - 1];
    if (cuoi && cuoi.trangThai === d.trangThai) cuoi.chu += d.chu;
    else ra.push({ ...d });
  }
  return ra;
}

/**
 * So hai đoạn chữ, trả về hai danh sách đoạn đã đánh dấu chỗ khác.
 * Khoảng trắng luôn tính là phần chung để không tô loang cả dòng.
 */
export function soSanhTheoTu(traiRaw: string, phaiRaw: string): { trai: DoanChu[]; phai: DoanChu[] } {
  const a = catTu(traiRaw);
  const b = catTu(phaiRaw);
  const d = bangLcs(a, b);

  const trai: DoanChu[] = [];
  const phai: DoanChu[] = [];
  let i = 0, j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      trai.push({ chu: a[i], trangThai: 'chung' });
      phai.push({ chu: b[j], trangThai: 'chung' });
      i++; j++;
    } else if (d[i + 1][j] >= d[i][j + 1]) {
      trai.push({ chu: a[i], trangThai: /^\s+$/.test(a[i]) ? 'chung' : 'khac' });
      i++;
    } else {
      phai.push({ chu: b[j], trangThai: /^\s+$/.test(b[j]) ? 'chung' : 'khac' });
      j++;
    }
  }
  while (i < a.length) { trai.push({ chu: a[i], trangThai: /^\s+$/.test(a[i]) ? 'chung' : 'khac' }); i++; }
  while (j < b.length) { phai.push({ chu: b[j], trangThai: /^\s+$/.test(b[j]) ? 'chung' : 'khac' }); j++; }

  return { trai: gomDoan(trai), phai: gomDoan(phai) };
}

/** Tỉ lệ từ giống nhau (0-1), để hiện "khác N từ" cho thầy cô ước lượng nhanh. */
export function demTuKhac(doan: DoanChu[]): number {
  return doan.filter(d => d.trangThai === 'khac').reduce((n, d) => n + catTu(d.chu).filter(t => !/^\s+$/.test(t)).length, 0);
}
