// Chuẩn hoá câu hỏi ngay sau khi AI bóc tách, trước khi đưa vào ngân hàng.
//
// AI trả về kết quả không phải lúc nào cũng đúng khuôn. Ba chỗ hay sai nhất, đo trên
// kho Vật lí 1066 câu:
//   - Câu Đúng/Sai: 19 câu có mệnh đề còn dính tiền tố "a)", và có câu để nguyên cả 4 ý
//     trong đề bài nên đề bị lặp hai lần.
//   - Câu Trả lời ngắn: 15/181 câu có đáp án không tô được vào 4 ô của phiếu (dài quá
//     4 ký tự, hoặc viết dạng khoa học "2,23.10^-4").
//   - Đáp án tự luận: công thức để trần, không bọc $...$ nên hiển thị ra chữ thô.
//
// Mọi chỗ sửa đều kèm câu chữ cảnh báo để thầy cô soát lại, KHÔNG sửa lặng lẽ.

/** Ký tự tối đa học sinh tô được ở phần Trả lời ngắn (Barem 2025). */
export const SO_KY_TU_TRA_LOI_NGAN = 4;

export interface KetQuaChuanHoa {
  content: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  /** Những chỗ đã tự sửa, để hiện cảnh báo cho thầy cô soát lại. */
  canhBao: string[];
}

/* ===================== CÂU ĐÚNG / SAI ===================== */

const RE_MOC_Y = /(?:^|\n|\\n)\s*([a-d])\s*[).:]\s*/g;

/** Bỏ tiền tố "a)" / "b." / "c:" ở đầu mệnh đề - phần nhãn đã có sẵn trên giao diện. */
export const boTienToY = (s: string | null | undefined): string =>
  String(s || '').replace(/^\s*[a-dA-D]\s*[).:]\s*/, '').trim();

/**
 * Tách 4 ý a) b) c) d) đang nằm lẫn trong đề bài.
 * Trả về null nếu không tách được đủ 4 ý (không đoán bừa).
 */
export function tachBonY(content: string | null | undefined): { dan: string; y: string[] } | null {
  const s = String(content || '');
  if (!s.trim()) return null;

  const re = new RegExp(RE_MOC_Y.source, 'g');
  const moc: { chu: string; batDau: number; ketThuc: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    moc.push({ chu: m[1], batDau: m.index, ketThuc: m.index + m[0].length });
  }
  if (moc.length < 4) return null;

  const bo = moc.filter((x, i) => x.chu === ['a', 'b', 'c', 'd'][i % 4]).slice(0, 4);
  if (bo.length < 4 || bo.map(x => x.chu).join('') !== 'abcd') return null;

  const y = bo.map((x, i) => s.slice(x.ketThuc, i < 3 ? bo[i + 1].batDau : s.length).trim());
  if (y.some(t => !t)) return null;

  return { dan: s.slice(0, bo[0].batDau).trim(), y };
}

/* ===================== CÂU TRẢ LỜI NGẮN ===================== */

/** Đáp án tô được vào 4 ô: chỉ chữ số, tối đa một dấu phẩy, có thể có dấu trừ đứng đầu. */
export const dapAnNganHopLe = (s: string | null | undefined): boolean => {
  const t = String(s || '').trim();
  return t.length > 0 && t.length <= SO_KY_TU_TRA_LOI_NGAN && /^-?\d+(,\d+)?$/.test(t);
};

/**
 * Gỡ phần trình bày để còn lại con số.
 *
 * Phải xử lý cả cách viết dấu phẩy kiểu LaTeX "{,}" - đây là dạng AI hay dùng nhất
 * ("$1{,}5$"), thiếu bước này thì một đáp án vốn hợp lệ vẫn bị coi là không tô được.
 */
function gonSo(raw: string): string {
  let t = String(raw || '').trim();
  t = t.replace(/\{\s*,\s*\}/g, ',');            // $1{,}5$ -> 1,5
  t = t.replace(/\$/g, '');
  t = t.replace(/\\text\s*\{[^}]*\}/g, '');   // bỏ đơn vị
  t = t.replace(/\\,|\\;|\\!|\\ |~/g, ' '); // dấu cách LaTeX
  t = t.replace(/\\cdot|\\times/g, '*');
  t = t.replace(/\s+/g, ' ').trim();
  return doiDauThapPhan(t);
}

/**
 * Đưa dấu thập phân kiểu Anh về kiểu Việt: "102.1" -> "102,1".
 *
 * Ta viết số thập phân bằng dấu PHẨY, dấu chấm là để ngăn nhóm nghìn. Nhưng AI bóc câu
 * hay viết kiểu Anh, nên trong kho có cả hai lối.
 *
 * Trước đây mọi dấu chấm đều bị coi là ngăn nghìn rồi xoá đi, nên "102.1" hoá thành
 * "1021" - đáp án sai gấp mười lần mà nhìn vẫn đúng khuôn bốn ô, không ai phát hiện.
 * Đo trên kho: 58 câu Trả lời ngắn bên Toán và 32 câu bên Lý viết theo kiểu này.
 *
 * Cách phân biệt: chỉ coi là ngăn nghìn khi MỌI nhóm sau dấu chấm đều đúng ba chữ số
 * ("1.000", "12.345.678"); còn lại là dấu thập phân.
 */
function doiDauThapPhan(t: string): string {
  if (t.includes(',') || !t.includes('.')) return t;   // có phẩy rồi thì chấm là ngăn nghìn
  if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) return t;       // đúng khuôn ngăn nghìn, để yên
  if (/^-?\d+\.\d+$/.test(t)) return t.replace('.', ',');
  return t;
}

/**
 * Ghi thêm một lời dặn vào đề bài ("Làm tròn…", "Kết quả tính theo đơn vị…").
 *
 * Hai chỗ phải cẩn thận, đều lộ ra khi soi bản vá thật:
 *
 *   1. Đề đã có sẵn lời dặn làm tròn thì phải THAY, không được cộng thêm cái thứ hai -
 *      đề mà vừa bảo "làm tròn đến hàng phần chục" vừa bảo "làm tròn đến số nguyên" thì
 *      học sinh biết nghe ai.
 *   2. Đề kết thúc bằng ảnh minh hoạ thì lời dặn phải chèn TRƯỚC ảnh. Nối vào cuối chuỗi
 *      là chữ rơi xuống dưới hình, không ai đọc.
 */
function themGhiChuVaoDe(de: string, ghiChu: string): string {
  let s = String(de || '');
  s = s.replace(/\s*\((?:kết quả\s*)?làm tròn[^)]*\)\s*\.?/gi, ' ');
  s = s.replace(/\s*\(kết quả tính theo đơn vị[^)]*\)\s*\.?/gi, ' ');

  const viTriAnh = s.search(/\n*!\[[^\]]*\]\([^)]*\)\s*$/);
  if (viTriAnh >= 0) {
    const truoc = s.slice(0, viTriAnh).replace(/\s+$/, '');
    const anh = s.slice(viTriAnh).replace(/^\n+/, '');
    return `${truoc} ${ghiChu}\n\n${anh}`;
  }
  return s.replace(/\s+$/, '') + ' ' + ghiChu;
}

/**
 * Tách đơn vị đo dính sau con số: "1,44V" -> { so: "1,44", donVi: "V" }.
 *
 * Đơn vị không tô được vào ô số của phiếu, nhưng bỏ đi mà không nói gì thì học sinh mất
 * căn cứ. Nên tách ra rồi ghi vào đề bài, giống cách đang làm với luỹ thừa 10.
 */
function tachDonVi(t: string): { so: string; donVi: string } | null {
  const m = t.match(/^(-?[\d.,]+)\s*([A-Za-zÀ-ỹ%°]{1,6})$/);
  if (!m) return null;
  const so = doiDauThapPhan(m[1]);
  if (!/^-?\d+(,\d+)?$/.test(so)) return null;
  return { so, donVi: m[2] };
}

/** Đưa số quá dài về dạng a x 10^n để tô vừa số ô cho phép. */
function tachLuyThua(so: number): { dinhTri: string; soMu: number } | null {
  if (!Number.isFinite(so) || so === 0) return null;
  for (let mu = 1; mu <= 12; mu++) {
    const rut = so / Math.pow(10, mu);
    for (let le = 3; le >= 0; le--) {
      const t = rut.toFixed(le).replace('.', ',');
      // Chỉ nhận khi rút gọn xong dựng lại vẫn gần đúng số ban đầu (sai lệch dưới 0,5%)
      const dungLai = Number(t.replace(',', '.')) * Math.pow(10, mu);
      if (dapAnNganHopLe(t) && Math.abs(dungLai - so) <= Math.abs(so) * 0.005) {
        return { dinhTri: t, soMu: mu };
      }
    }
  }
  return null;
}

/**
 * Đưa đáp án Trả lời ngắn về đúng khuôn 4 ký tự, và SỬA ĐỀ cho khớp.
 *
 * Hai cách xử lý, ưu tiên cách không làm mất độ chính xác:
 *   1. Viết dạng khoa học ("2,23.10^-4") -> giữ phần định trị làm đáp án, đưa luỹ thừa
 *      vào đề bài dưới dạng đơn vị: "(kết quả tính theo đơn vị 10^-4)".
 *   2. Vẫn dài quá 4 ký tự ("475,72") -> làm tròn vừa đủ số ô, và ghi rõ trong đề bài
 *      làm tròn đến đâu.
 *
 * Không xử lý được thì trả nguyên trạng kèm cảnh báo để thầy cô tự sửa.
 */
export function chuanHoaTraLoiNgan(content: string, dapAn: string): {
  content: string; correct_answer: string; canhBao: string[];
} {
  const canhBao: string[] = [];
  let de = String(content || '');
  let da = gonSo(dapAn);

  if (dapAnNganHopLe(da)) return { content: de, correct_answer: da, canhBao };
  if (!da) return { content: de, correct_answer: '', canhBao: ['Câu trả lời ngắn chưa có đáp án.'] };

  // --- Cách 0: đơn vị đo dính sau số ("1,44 V") -> đưa đơn vị vào đề, giữ nguyên con số ---
  const coDonVi = tachDonVi(da);
  if (coDonVi && dapAnNganHopLe(coDonVi.so)) {
    de = themGhiChuVaoDe(de, `(Kết quả tính theo đơn vị ${coDonVi.donVi}.)`);
    canhBao.push(`Đáp án có kèm đơn vị "${coDonVi.donVi}" nên đã chuyển đơn vị vào đề bài, đáp án còn "${coDonVi.so}". Thầy cô soát lại.`);
    return { content: de, correct_answer: coDonVi.so, canhBao };
  }
  if (coDonVi) da = coDonVi.so;

  // --- Cách 1: tách luỹ thừa 10 ra khỏi đáp án ---
  const mKhoaHoc = da.match(/^(-?[\d.,]+)\s*(?:\*|x|×)?\s*10\s*\^?\s*\{?\s*(-?\d+)\s*\}?/i);
  if (mKhoaHoc) {
    const dinhTri = mKhoaHoc[1].replace(/\./g, ',');
    const soMu = mKhoaHoc[2];
    if (dapAnNganHopLe(dinhTri)) {
      de = themGhiChuVaoDe(de, `(Kết quả tính theo đơn vị $10^{${soMu}}$.)`);
      canhBao.push(`Đáp án viết dạng khoa học nên đã chuyển luỹ thừa $10^{${soMu}}$ vào đề bài, đáp án còn "${dinhTri}". Thầy cô soát lại đơn vị.`);
      return { content: de, correct_answer: dinhTri, canhBao };
    }
    da = dinhTri; // còn dài thì để bước làm tròn bên dưới lo tiếp
  }

  // --- Cách 2: làm tròn cho vừa số ô ---
  const so = Number(da.replace(/\./g, '').replace(',', '.'));
  if (Number.isFinite(so)) {
    for (let le = 3; le >= 0; le--) {
      const lamTron = so.toFixed(le).replace('.', ',');
      if (dapAnNganHopLe(lamTron)) {
        if (lamTron !== da) {
          de = themGhiChuVaoDe(de, le > 0
            ? `(Làm tròn kết quả đến ${le} chữ số sau dấu phẩy.)`
            : '(Làm tròn kết quả đến số nguyên.)');
          canhBao.push(`Đáp án "${da}" dài quá ${SO_KY_TU_TRA_LOI_NGAN} ô nên đã làm tròn thành "${lamTron}" và ghi rõ trong đề. Thầy cô soát lại.`);
        }
        return { content: de, correct_answer: lamTron, canhBao };
      }
    }
  }

  // --- Cách 3: số quá lớn hoặc quá dài -> rút về a x 10^n, đưa luỹ thừa vào đề ---
  if (Number.isFinite(so)) {
    const rut = tachLuyThua(so);
    if (rut) {
      de = themGhiChuVaoDe(de, `(Kết quả tính theo đơn vị $10^{${rut.soMu}}$.)`);
      canhBao.push(`Đáp án "${da}" không tô vừa ${SO_KY_TU_TRA_LOI_NGAN} ô nên đã rút về "${rut.dinhTri}" kèm đơn vị $10^{${rut.soMu}}$ ghi trong đề. Thầy cô soát lại.`);
      return { content: de, correct_answer: rut.dinhTri, canhBao };
    }
  }

  canhBao.push(`Đáp án "${String(dapAn).trim()}" không tô được vào ${SO_KY_TU_TRA_LOI_NGAN} ô của phiếu trả lời và máy không tự sửa được. Thầy cô sửa lại đề hoặc đáp án.`);
  return { content: de, correct_answer: String(dapAn).trim(), canhBao };
}

/* ===================== ĐÁP ÁN TỰ LUẬN ===================== */

/**
 * Bọc công thức để trần vào cặp $...$ cho hiển thị đúng kiểu MathType.
 *
 * Chỉ đụng vào phần NẰM NGOÀI các cặp $...$ sẵn có, để không bọc chồng lên công thức
 * đã đúng. Bọc theo từng cụm liền mạch chứ không bọc từng lệnh rời, tránh cắt vụn
 * "\frac{a}{b}" thành nhiều đoạn.
 */
export function bocCongThucTuLuan(raw: string | null | undefined): { text: string; daSua: boolean } {
  const s = String(raw || '');
  if (!s.trim()) return { text: s, daSua: false };

  const phan = s.split(/(\$[^$]*\$)/g); // giữ nguyên những đoạn đã có $...$
  let daSua = false;

  const ra = phan.map(doan => {
    if (doan.startsWith('$') && doan.endsWith('$')) return doan;
    // Cụm công thức: bắt đầu bằng lệnh LaTeX, kéo theo ngoặc/chỉ số/luỹ thừa liền sau
    return doan.replace(
      /(\\(?:d?frac|sqrt|text|times|cdot|vec|overline|sum|int|alpha|beta|pi|Delta|Omega|mu|lambda|omega)\b[^\s,.;:)]*(?:\{[^{}]*\}|\^\{?[^\s{}]*\}?|_\{?[^\s{}]*\}?)*)/g,
      (m) => { daSua = true; return `$${m}$`; },
    );
  }).join('');

  return { text: ra, daSua };
}

/* ===================== GỌI CHUNG ===================== */

/**
 * Chuẩn hoá một câu hỏi vừa bóc tách. Trả về bản đã sửa kèm danh sách cảnh báo.
 */
/** Đáp án Đúng/Sai đã đúng khuôn 4 ký tự chưa (chấp nhận cả D, T, F lẫn Đ, S). */
export const dapAnDungSaiDungKhuon = (s: string | null | undefined): boolean =>
  /^[ĐDTSF]{4}$/i.test(String(s || '').trim());

/**
 * Đọc đáp án Đúng/Sai viết theo đủ kiểu về dạng chuẩn "ĐSSĐ".
 *
 * Kho ghi lẫn lộn tới tám kiểu: "Đ, Đ, Đ, S" / "A-Đ, B-S, C-S, D-Đ" / "1-S, 2-Đ, 3-S,
 * 4-Đ" / "a) Sai, b) Đúng, c) Đúng, d) Sai" / "Đúng, Sai, Đúng, Sai" / xuống dòng từng
 * ý / "A: Đ, B: S..." / và cả "$2+xy$: Sai; $3xy^2z$: Đúng..." có LaTeX lẫn dấu hai
 * chấm. Tất cả đều nói đủ bốn trạng thái nên đọc ra được, không phải đoán.
 *
 * Trả về null khi KHÔNG chắc chắn - lúc đó phải để nguyên cho thầy cô tự sửa, vì đoán
 * sai một ký tự là chấm sai cả tập bài mà không ai phát hiện.
 */
export function docDapAnDungSai(raw: string | null | undefined): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (dapAnDungSaiDungKhuon(s)) {
    return s.split('').map(c => (/[ĐDT]/i.test(c) ? 'Đ' : 'S')).join('');
  }

  const phan = s.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
  if (phan.length !== 4) return null;

  const ra: string[] = [];
  for (const p of phan) {
    // Bỏ nhãn "a)", "1-", "A:", hoặc mọi thứ đứng trước dấu hai chấm cuối cùng
    let v = p.includes(':') ? p.slice(p.lastIndexOf(':') + 1) : p.replace(/^\s*[a-dA-D1-4]\s*[).:\-–]\s*/, '');
    v = v.trim();

    const chu = v.match(/(đúng|dung|sai|true|false)\s*$/i);
    if (chu) ra.push(/đúng|dung|true/i.test(chu[1]) ? 'Đ' : 'S');
    else if (/^[ĐDT]$/i.test(v)) ra.push('Đ');
    else if (/^[SF]$/i.test(v)) ra.push('S');
    else return null;
  }
  return ra.join('');
}

export function chuanHoaCauHoi(q: {
  question_type: string;
  content: string;
  option_a?: string; option_b?: string; option_c?: string; option_d?: string;
  correct_answer?: string;
}): KetQuaChuanHoa {
  const canhBao: string[] = [];
  let content = String(q.content || '');
  let [a, b, c, d] = [q.option_a || '', q.option_b || '', q.option_c || '', q.option_d || ''];
  let correct = String(q.correct_answer || '');

  if (q.question_type === 'DS') {
    const thieuMenhDe = ![a, b, c, d].every(x => String(x).trim());

    // Đề bài còn nguyên 4 ý -> gỡ ra
    const tach = tachBonY(content);
    if (tach) {
      if (thieuMenhDe) {
        [a, b, c, d] = tach.y;
        canhBao.push('Bốn ý a, b, c, d còn nằm trong đề bài nên máy đã tách ra thành 4 mệnh đề.');
      } else {
        canhBao.push('Bốn ý a, b, c, d bị lặp cả trong đề bài lẫn ô mệnh đề nên máy đã bỏ phần trong đề bài.');
      }
      content = tach.dan;
    } else if (thieuMenhDe) {
      canhBao.push('Câu Đúng/Sai còn thiếu mệnh đề mà máy không tách được từ đề bài. Thầy cô bổ sung.');
    }

    // Mệnh đề còn tiền tố "a)" -> bỏ, vì giao diện đã có sẵn nhãn
    const truoc = [a, b, c, d].join('|');
    [a, b, c, d] = [a, b, c, d].map(boTienToY);
    if ([a, b, c, d].join('|') !== truoc) {
      canhBao.push('Đã bỏ tiền tố "a)", "b)"... thừa ở đầu các mệnh đề.');
    }

    // Đáp án viết tự do -> gom về khuôn 4 ký tự. Không gom thì mọi nơi đọc đáp án
    // (chấm bài, trộn mã đề, đẩy sang Kỳ thi Online) đều coi như câu này chưa có đáp án.
    if (!dapAnDungSaiDungKhuon(correct)) {
      const doc = docDapAnDungSai(correct);
      if (doc) {
        canhBao.push(`Đáp án Đúng/Sai viết là "${correct.slice(0, 30)}" nên máy đã gom về "${doc}".`);
        correct = doc;
      } else if (correct.trim()) {
        canhBao.push('Đáp án Đúng/Sai không đọc ra được đủ bốn trạng thái. Thầy cô sửa lại theo khuôn ĐSSĐ.');
      }
    } else {
      const doc = docDapAnDungSai(correct);
      if (doc && doc !== correct) correct = doc;   // gom D/T về Đ cho thống nhất
    }
  }

  if (q.question_type === 'TLN') {
    const kq = chuanHoaTraLoiNgan(content, correct);
    content = kq.content;
    correct = kq.correct_answer;
    canhBao.push(...kq.canhBao);
  }

  if (q.question_type === 'TL') {
    const kq = bocCongThucTuLuan(correct);
    if (kq.daSua) {
      correct = kq.text;
      canhBao.push('Đáp án tự luận có công thức để trần nên máy đã bọc lại cho hiển thị đúng.');
    }
  }

  return { content, option_a: a, option_b: b, option_c: c, option_d: d, correct_answer: correct, canhBao };
}
