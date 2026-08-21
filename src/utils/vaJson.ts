// Vá chuỗi JSON do AI trả về, đặc biệt cho đề Toán - Vật lí.
//
// Vì sao hay hỏng: công thức LaTeX đầy dấu gạch chéo ngược. Trong JSON, "\f" là ký tự
// đặc biệt (sang trang), "\t" là dấu tab... nên "$\frac{1}{2}$" viết thẳng vào JSON là
// chuỗi hỏng. AI rất hay quên nhân đôi dấu gạch chéo, nhất là khi thầy cô copy lời dặn
// sang web Gemini rồi dán kết quả ngược lại.
//
// Bản cũ chỉ gọi JSON.parse đúng một lần, hỏng là ném lỗi "định dạng JSON không hợp lệ"
// và mất trắng cả lô vài chục câu. Ở đây vá dần theo từng bước, và bước cuối còn cứu
// được từng câu một - một câu hỏng không kéo theo cả lô.

/** Các chữ cái được phép đứng sau dấu gạch chéo ngược trong JSON. */
const HOP_LE_SAU_GACH = '"\\/bfnrtu';

/** Nhân đôi những dấu gạch chéo ngược không hợp lệ, chừa lại các mã thoát đúng chuẩn. */
function vaGachCheo(s: string): string {
  let ra = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c !== '\\') { ra += c; continue; }
    const sau = s[i + 1];
    if (sau === undefined) { ra += '\\\\'; continue; }
    if (HOP_LE_SAU_GACH.includes(sau)) {
      // \u phải có đủ 4 chữ số hex mới là mã thoát hợp lệ
      if (sau === 'u' && !/^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6))) {
        ra += '\\\\'; continue;
      }
      ra += c + sau; i++; continue;
    }
    ra += '\\\\';
  }
  return ra;
}

/** Bỏ dấu phẩy thừa ngay trước dấu đóng ngoặc. */
const boPhayThua = (s: string): string => s.replace(/,(\s*[}\]])/g, '$1');

/** Thay ký tự xuống dòng thật nằm bên trong chuỗi bằng mã thoát. */
function vaXuongDongTrongChuoi(s: string): string {
  let ra = '';
  let trongChuoi = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' && s[i - 1] !== '\\') trongChuoi = !trongChuoi;
    if (trongChuoi && (c === '\n' || c === '\r')) { ra += '\\n'; continue; }
    if (trongChuoi && c === '\t') { ra += '\\t'; continue; }
    ra += c;
  }
  return ra;
}

/** Lấy phần thân JSON: bỏ rào ```json, cắt từ [ đến ] (hoặc bọc { } thành mảng). */
function layThanJson(raw: string): string {
  let s = String(raw || '');
  const rao = s.match(/```json\s*([\s\S]*?)```/i) || s.match(/```\s*([\s\S]*?)```/);
  if (rao) s = rao[1];

  const moMang = s.indexOf('[');
  const dongMang = s.lastIndexOf(']');
  if (moMang !== -1 && dongMang > moMang) return s.slice(moMang, dongMang + 1);

  const moObj = s.indexOf('{');
  const dongObj = s.lastIndexOf('}');
  if (moObj !== -1 && dongObj > moObj) return '[' + s.slice(moObj, dongObj + 1) + ']';

  throw new Error('Không tìm thấy cấu trúc JSON trong nội dung AI trả về.');
}

/** Cắt chuỗi thành từng object `{...}` ở tầng ngoài cùng, bỏ qua ngoặc nằm trong chuỗi. */
function tachTungObject(s: string): string[] {
  const ra: string[] = [];
  let sau = 0, batDau = -1, trongChuoi = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' && s[i - 1] !== '\\') trongChuoi = !trongChuoi;
    if (trongChuoi) continue;
    if (c === '{') { if (sau === 0) batDau = i; sau++; }
    else if (c === '}') {
      sau--;
      if (sau === 0 && batDau !== -1) { ra.push(s.slice(batDau, i + 1)); batDau = -1; }
    }
  }
  return ra;
}

export interface KetQuaVaJson {
  items: any[];
  /** Số câu phải bỏ vì hỏng nặng, để báo cho người dùng biết mà kiểm lại. */
  soCauBoQua: number;
  /** Đã phải vá hay không - dùng để nhắc thầy cô soát kỹ hơn. */
  daVa: boolean;
}

/**
 * Đọc JSON do AI trả về, tự vá các lỗi thường gặp.
 *
 * Thứ tự: thử nguyên trạng -> vá dần từng lớp -> cuối cùng cứu từng câu một.
 */
export function docJsonCauHoi(raw: string): KetQuaVaJson {
  const than = layThanJson(raw);

  const cacBuoc: { ten: string; ham: (s: string) => string }[] = [
    { ten: 'nguyên trạng', ham: (s) => s },
    { ten: 'bỏ dấu phẩy thừa', ham: boPhayThua },
    { ten: 'vá xuống dòng trong chuỗi', ham: (s) => vaXuongDongTrongChuoi(boPhayThua(s)) },
    { ten: 'nhân đôi gạch chéo LaTeX', ham: (s) => vaGachCheo(vaXuongDongTrongChuoi(boPhayThua(s))) },
  ];

  for (let i = 0; i < cacBuoc.length; i++) {
    try {
      const kq = JSON.parse(cacBuoc[i].ham(than));
      const items = Array.isArray(kq) ? kq : [kq];
      return { items, soCauBoQua: 0, daVa: i > 0 };
    } catch { /* thử bước vá tiếp theo */ }
  }

  // Cứu từng câu: một câu hỏng không được kéo theo cả lô
  const manh = tachTungObject(than);
  const items: any[] = [];
  let boQua = 0;
  for (const m of manh) {
    let xong = false;
    for (const b of cacBuoc) {
      try { items.push(JSON.parse(b.ham(m))); xong = true; break; } catch { /* thử tiếp */ }
    }
    if (!xong) boQua++;
  }

  if (items.length === 0) {
    throw new Error(
      'Không đọc được nội dung AI trả về, kể cả sau khi tự sửa. Thường do công thức có dấu gạch chéo '
      + 'chưa nhân đôi. Thầy cô thử bấm lại "Nhận diện JSON", hoặc quét lại bằng Hệ thống AI.',
    );
  }
  return { items, soCauBoQua: boQua, daVa: true };
}
