/**
 * Đưa phần CHỮ ra khỏi công thức, chỉ để lại công thức thật trong $...$.
 *
 * Vì sao cần: bộ dựng công thức (KaTeX) không có phông cho chữ tiếng Việt có dấu, nên
 * "$30\text{ km}$" hay "$\text{Tổng thời gian}$" in ra bị vỡ chữ, mất dấu, có chỗ còn bị
 * cắt cụt. Chữ nằm ngoài $...$ thì trình duyệt tự lo, chưa bao giờ hỏng.
 *
 *   "$30\text{ km}$"                 ->  "$30$ km"
 *   "$\text{Vận tốc } v = 5$"        ->  "Vận tốc $v = 5$"
 *   "$a \text{ và } b$"              ->  "$a$ và $b$"
 *
 * BA CHỖ TUYỆT ĐỐI KHÔNG ĐƯỢC TÁCH, vì tách ra là công thức vỡ hẳn:
 *   - trong ngoặc nhọn của lệnh khác:  \frac{\text{quãng đường}}{\text{thời gian}}
 *   - trong môi trường:                \begin{cases} A & \text{khi } A \ge 0 ... \end{cases}
 *   - trong cặp \left ... \right:      \left( \text{a} \right)
 * Nên chỉ tách khi \text nằm ở TẦNG NGOÀI CÙNG của khối công thức.
 */

/** Các lệnh bọc chữ mà ta muốn gỡ ra ngoài. */
const LENH_CHU = ['text', 'textrm', 'textnormal', 'textbf', 'textit', 'mathrm'];

interface Manh { loai: 'toan' | 'chu'; noiDung: string }

/**
 * Cắt ruột một khối công thức thành từng mảnh toán / chữ.
 * Trả về null nếu không có gì để tách (để bên gọi giữ nguyên khối, khỏi đụng vào).
 */
function catRuot(ruot: string): Manh[] | null {
  const manh: Manh[] = [];
  let dem = '';           // phần toán đang gom
  let sauNgoac = 0;       // độ sâu ngoặc nhọn
  let sauMoiTruong = 0;   // độ sâu \begin ... \end
  let sauLeftRight = 0;   // độ sâu \left ... \right
  let coTach = false;

  for (let i = 0; i < ruot.length; i++) {
    const c = ruot[i];

    if (c === '\\') {
      const con = ruot.slice(i);

      const mBegin = con.match(/^\\begin\s*\{[^}]*\}/);
      if (mBegin) { sauMoiTruong++; dem += mBegin[0]; i += mBegin[0].length - 1; continue; }
      const mEnd = con.match(/^\\end\s*\{[^}]*\}/);
      if (mEnd) { sauMoiTruong = Math.max(0, sauMoiTruong - 1); dem += mEnd[0]; i += mEnd[0].length - 1; continue; }
      if (/^\\left/.test(con)) { sauLeftRight++; dem += '\\left'; i += 4; continue; }
      if (/^\\right/.test(con)) { sauLeftRight = Math.max(0, sauLeftRight - 1); dem += '\\right'; i += 5; continue; }

      const mChu = con.match(new RegExp(`^\\\\(${LENH_CHU.join('|')})\\s*\\{`));
      if (mChu && sauNgoac === 0 && sauMoiTruong === 0 && sauLeftRight === 0) {
        // Tìm ngoặc đóng khớp với ngoặc mở của lệnh chữ này
        let j = i + mChu[0].length;
        let sau = 1;
        for (; j < ruot.length && sau > 0; j++) {
          if (ruot[j] === '{') sau++;
          else if (ruot[j] === '}') sau--;
        }
        if (sau !== 0) { dem += c; continue; }   // thiếu ngoặc đóng -> để nguyên cho an toàn
        const trongNgoac = ruot.slice(i + mChu[0].length, j - 1);
        /*
         * Chỉ kéo ra ngoài khi bên trong LÀ CHỮ THẬT.
         *
         * Gặp thật trong kho Lý: "\text{mm/^\circ\text{C}}" - bên trong lại có "^\circ" và
         * một "\text" lồng nữa. Kéo nguyên cụm đó ra ngoài công thức là hỏng hẳn: "^\circ"
         * mất nghĩa, "\text{C}" thành chữ thô. Nên hễ bên trong còn dấu gạch chéo, dấu mũ,
         * dấu gạch dưới, ngoặc nhọn hay $ thì để nguyên, không đụng tới.
         */
        if (/[\\^_{}$]/.test(trongNgoac)) { dem += c; continue; }
        manh.push({ loai: 'toan', noiDung: dem });
        manh.push({ loai: 'chu', noiDung: trongNgoac });
        dem = '';
        coTach = true;
        i = j - 1;
        continue;
      }

      // Lệnh thường: nuốt cả tên lệnh để không nhầm "\textrm" với "\t" + "extrm"
      const mLenh = con.match(/^\\[a-zA-Z]+/);
      if (mLenh) { dem += mLenh[0]; i += mLenh[0].length - 1; continue; }
      dem += c;
      continue;
    }

    if (c === '{') sauNgoac++;
    else if (c === '}') sauNgoac = Math.max(0, sauNgoac - 1);
    dem += c;
  }

  if (!coTach) return null;
  manh.push({ loai: 'toan', noiDung: dem });
  return manh;
}

/** Ghép các mảnh lại: phần toán bọc $...$, phần chữ để trần. */
function ghepManh(manh: Manh[]): string {
  const ra: string[] = [];
  for (const m of manh) {
    if (m.loai === 'chu') { ra.push(m.noiDung); continue; }
    /*
     * Cắt dấu gạch chéo cụt ở cuối khối toán.
     *
     * "0,2\ \text{mm}" là "0,2" + lệnh cách mỏng "\ " + chữ. Kéo chữ ra rồi thì "\ " đứng
     * chơ vơ cuối công thức, thành "$0,2\$" - LaTeX hỏng. Đo trong kho Lý mới lòi ra.
     */
    const t = m.noiDung.replace(/\\[,;:!]?\s*$/, '').trim();
    if (!t) continue;                       // khối toán rỗng thì bỏ hẳn, khỏi để "$$"
    ra.push('$' + t + '$');
  }
  /*
   * Nối các mảnh, chỉ chèn dấu cách ĐÚNG CHỖ CẦN.
   *
   * Phần chữ thường đã mang sẵn dấu cách của nó ("\text{ km}" cho ra " km") nên hầu hết
   * chỗ nối là nối thẳng. Nhưng có chỗ không: "17\text{ m/s} \neq 8\text{ m/s}" cắt ra
   * thành chữ " m/s" rồi tới công thức "\neq 8", nối thẳng là dính thành "m/s$\neq 8$".
   * Nên chèn một dấu cách khi hai bên đều không có, và bên phải không mở đầu bằng dấu câu.
   *
   * Cố ý KHÔNG dùng regex chèn quanh mọi dấu "$": bản đầu làm thế thì chèn nhầm cả vào
   * bên trong công thức, ra "$30 $ km".
   */
  let out = '';
  for (const p of ra) {
    if (out && !/\s$/.test(out) && !/^[\s.,;:!?)\]}%°]/.test(p)) out += ' ';
    out += p;
  }
  return out.replace(/[ \t]{2,}/g, ' ');
}

/**
 * Tách chữ ra khỏi mọi khối công thức trong một chuỗi.
 * Khối nào không có lệnh chữ ở tầng ngoài cùng thì giữ nguyên từng ký tự.
 */
export function tachChuKhoiCongThuc(s: string | null | undefined): string {
  const chu = String(s ?? '');
  if (!chu.includes('$')) return chu;

  // Bắt cả $$...$$ lẫn $...$; $$ phải đứng trước để không bị $ nuốt mất.
  return chu.replace(/\$\$([\s\S]*?)\$\$|\$([^$\n]*?)\$/g, (khoi, ruotDoi, ruotDon) => {
    const ruot = ruotDoi !== undefined ? ruotDoi : ruotDon;
    if (ruot === undefined) return khoi;
    const manh = catRuot(ruot);
    if (!manh) return khoi;
    const ra = ghepManh(manh);
    // Không cứu được gì (ví dụ cả khối chỉ toàn chữ và ra chuỗi rỗng) thì giữ nguyên.
    return ra.trim() ? ra : khoi;
  });
}

/** Có chữ tiếng Việt (có dấu, hoặc đ/Đ) nằm trong công thức không? */
export function coChuVietTrongCongThuc(s: string | null | undefined): boolean {
  const chu = String(s ?? '');
  if (!chu.includes('$')) return false;
  const re = /\$\$([\s\S]*?)\$\$|\$([^$\n]*?)\$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(chu)) !== null) {
    const ruot = m[1] !== undefined ? m[1] : m[2];
    if (ruot && /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/.test(ruot)) return true;
  }
  return false;
}
