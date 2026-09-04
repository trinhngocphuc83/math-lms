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

/**
 * Cứu những lệnh LaTeX bị JSON nuốt mất chữ cái đầu.
 *
 * Đây là loại hỏng ÂM THẦM, khó thấy nhất: "\text{ km/h}" viết thẳng vào JSON thì "\t"
 * là mã thoát HỢP LỆ (dấu tab), nên JSON.parse KHÔNG báo lỗi - nó lặng lẽ trả về một dấu
 * tab rồi "ext{ km/h}". In ra màn hình thành "$24\ ext{ km/h}$", công thức vỡ mà không
 * ai biết vì sao. Cùng lối đó: "\frac" thành "\f" + "rac", "\right" thành "\r" + "ight",
 * "\binom" thành "\b" + "inom".
 *
 * Vá trước khi phân tích, vì các bước sau chỉ chạy KHI JSON.parse ném lỗi - mà ở đây nó
 * không hề ném.
 *
 * Chỉ đụng khi chuỗi có dấu $ (tức là có LaTeX), và chỉ với bốn chữ t f b r kèm ít nhất
 * hai chữ cái nữa phía sau. Cố ý KHÔNG đụng "\n": xuống dòng là mã thoát dùng thật và
 * dùng nhiều, "...xong.\next..." mà sửa là hỏng ngược.
 */
function cuuLenhLatex(s: string): string {
  if (!s.includes('$')) return s;
  // (?<!\\) để không đụng chuỗi AI đã escape đúng chuẩn: "\\text" phải giữ nguyên,
  // sửa nữa là thành ba dấu gạch chéo rồi hỏng ngược.
  return s
    .replace(/(?<!\\)\\([tfbr])([a-zA-Z]{2,})/g, '\\\\$1$2')
    // Chữ "n" thì chỉ cứu đúng mấy lệnh gọi tên đầy đủ, không cứu theo kiểu chung chung.
    // Đếm trên kho Toán: "\n" + chữ cái gần như luôn là XUỐNG DÒNG rồi tới chữ tiếng Việt
    // (\nLời giải, \nVậy, \nTa có, \nSuy ra, \nGiải...), cứu bừa là phá sạch xuống dòng của
    // mọi lời giải. Nhưng \neq (867 lượt) và \notin (86 lượt) lại là lệnh thật, mà "eq" hay
    // "otin" thì không bao giờ mở đầu một dòng tiếng Việt nên nhận diện được chắc chắn.
    .replace(/(?<!\\)\\n(eq|otin|abla|earrow)\b/g, '\\\\n$1');
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
    /* Cứu lệnh LaTeX ĐẶT TRƯỚC "nguyên trạng": kiểu hỏng này không làm JSON.parse ném lỗi
       nên nếu để sau thì không bao giờ tới lượt. Và phải GHÉP vào mọi bước sau nữa - mỗi
       bước dựng lại từ chuỗi gốc, không nối tiếp nhau, nên bước sau mà quên cứu thì lệnh
       LaTeX lại bị nuốt y như cũ. */
    { ten: 'cứu lệnh LaTeX bị nuốt', ham: cuuLenhLatex },
    { ten: 'nguyên trạng', ham: (s) => s },
    { ten: 'bỏ dấu phẩy thừa', ham: (s) => boPhayThua(cuuLenhLatex(s)) },
    { ten: 'vá xuống dòng trong chuỗi', ham: (s) => vaXuongDongTrongChuoi(boPhayThua(cuuLenhLatex(s))) },
    { ten: 'nhân đôi gạch chéo LaTeX', ham: (s) => vaGachCheo(vaXuongDongTrongChuoi(boPhayThua(cuuLenhLatex(s)))) },
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
