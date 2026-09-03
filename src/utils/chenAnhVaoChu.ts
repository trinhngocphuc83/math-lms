/**
 * Chèn một tấm ảnh vào đoạn Markdown mà KHÔNG phá cấu trúc cấp.
 *
 * Vì sao cần: chỗ chèn ảnh cũ dán thẳng `\n![Hình ảnh](...)\n` ngay tại con trỏ, luôn ở
 * cột 0. Dán vào giữa một danh sách thì dòng ảnh không thụt lề nên nó CẮT ĐÔI danh sách:
 * mấy ý con phía dưới tuột hẳn lên cấp 1. Đo trên bài thật (Lý 10 - "Sự chuyển thể"):
 * hai ý "Bay hơi" và "Sôi" vốn là ý nhỏ của "Sự hoá hơi", sau khi chèn ảnh thì hiện ra
 * ngang hàng với "Sự hoá hơi" - dấu đầu dòng đổi từ "+" thành "–", và giãn dòng vống lên
 * vì danh sách bị tách làm hai.
 *
 * Cách chữa: đo bề rộng thụt lề mà một dòng con phải có để vẫn nằm trong ý đang đứng, rồi
 * đặt dòng ảnh đúng bằng bề rộng ấy. Đây là quy tắc Markdown chuẩn (đoạn nối tiếp của một
 * mục danh sách phải thụt bằng cột chữ của mục), không phải cú pháp riêng của dự án.
 */

/**
 * Bề rộng thụt lề để một dòng vẫn nằm TRONG ý ở dòng `dong`.
 *
 *   `- **Ý lớn:**`   -> 2   (lề 0 + dấu "-" + một dấu cách)
 *   `  - *Ý nhỏ:*`   -> 4
 *   `1. Mục`         -> 3
 *   `Đoạn văn thường`-> 0
 */
export function leTiepNoi(dong: string): number {
  const m = String(dong || '').match(/^(\s*)([-*+]|\d+[.)])(\s+)/);
  if (m) return m[1].length + m[2].length + m[3].length;
  const t = String(dong || '').match(/^(\s*)\S/);
  return t ? t[1].length : 0;
}

/** Dòng có chữ gần nhất tính ngược lên từ `tu` (kể cả chính nó). */
function dongNeoGanNhat(ds: string[], tu: number): string {
  let i = Math.min(tu, ds.length - 1);
  while (i >= 0 && !ds[i].trim()) i--;
  return i >= 0 ? ds[i] : '';
}

export interface KetQuaChenAnh {
  /** Đoạn chữ sau khi chèn. */
  chu: string;
  /** Chỗ đặt con trỏ sau khi chèn (ngay sau dòng ảnh). */
  conTro: number;
  /** Dòng ngay trên tấm ảnh - dùng làm NEO để tìm đúng chỗ ấy ở bản còn lại. */
  neo: string;
}

/**
 * Chèn `anhMd` vào `chu` tại vị trí con trỏ `viTri`, giữ nguyên cấu trúc cấp.
 *
 * Ảnh luôn được đặt thành một dòng riêng ngay SAU dòng con trỏ đang đứng (đứng ở đầu một
 * dòng có chữ thì đặt TRƯỚC dòng ấy - đúng ý "chèn ảnh vào chỗ này"), có dòng trống ngăn
 * hai bên và thụt lề theo ý đang chứa nó.
 */
export function chenAnhGiuCap(chu: string, viTri: number, anhMd: string): KetQuaChenAnh {
  const v = String(chu || '');
  if (!v.trim()) return { chu: anhMd + '\n', conTro: anhMd.length + 1, neo: '' };

  const cho = Math.max(0, Math.min(viTri, v.length));
  const ds = v.split('\n');

  /* Dòng chứa con trỏ + chỗ bắt đầu của dòng ấy. */
  let d = ds.length - 1;
  let dauDong = 0;
  let tich = 0;
  for (let i = 0; i < ds.length; i++) {
    const het = tich + ds[i].length;
    if (cho <= het) { d = i; dauDong = tich; break; }
    tich = het + 1;
  }

  /* Con trỏ đứng ở ĐẦU một dòng có chữ: Thầy cô muốn ảnh nằm TRÊN dòng ấy. */
  const chenTruoc = cho === dauDong && !!ds[d].trim() && d > 0;
  const sauDong = chenTruoc ? d - 1 : d;

  const dongNeo = dongNeoGanNhat(ds, sauDong);
  const le = ' '.repeat(leTiepNoi(dongNeo));

  const chen: string[] = [];
  if (ds[sauDong] !== undefined && ds[sauDong].trim()) chen.push('');
  chen.push(le + anhMd);
  if (sauDong + 1 < ds.length && ds[sauDong + 1].trim()) chen.push('');

  ds.splice(sauDong + 1, 0, ...chen);

  /* Con trỏ về cuối dòng ảnh. */
  const viTriAnh = sauDong + 1 + chen.indexOf(le + anhMd);
  let conTro = 0;
  for (let i = 0; i <= viTriAnh; i++) conTro += ds[i].length + (i < viTriAnh ? 1 : 0);

  return { chu: ds.join('\n'), conTro, neo: dongNeo.trim() };
}

/**
 * Chèn `anhMd` vào `chu` ngay sau dòng có nội dung đúng bằng `neo`.
 *
 * Dùng để đưa tấm ảnh vừa chèn ở một bản (E-learning hoặc Trình chiếu) sang bản còn lại.
 * Chỉ nhận khi neo xuất hiện ĐÚNG MỘT LẦN - hai lần trở lên thì không biết chỗ nào là
 * chỗ Thầy cô định chèn, thà không đụng vào còn hơn đặt nhầm chỗ.
 *
 * Trả về `null` nghĩa là không tìm được chỗ tương ứng.
 */
export function chenAnhTheoNeo(chu: string, neo: string, anhMd: string): string | null {
  const v = String(chu || '');
  const n = String(neo || '').trim();
  if (!v.trim() || n.length < 4) return null;
  if (v.includes(anhMd)) return v;          // bản kia đã có sẵn tấm này

  const ds = v.split('\n');
  const khop: number[] = [];
  for (let i = 0; i < ds.length; i++) if (ds[i].trim() === n) khop.push(i);
  if (khop.length !== 1) return null;

  const i = khop[0];
  const le = ' '.repeat(leTiepNoi(ds[i]));
  const chen: string[] = [''];
  chen.push(le + anhMd);
  if (i + 1 < ds.length && ds[i + 1].trim()) chen.push('');
  ds.splice(i + 1, 0, ...chen);
  return ds.join('\n');
}
