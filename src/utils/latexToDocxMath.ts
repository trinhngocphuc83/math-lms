// Chuyển một biểu thức LaTeX (nội dung nằm giữa $...$ hoặc $$...$$) thành các đối tượng
// Math của thư viện "docx" (MathRun, MathFraction, MathRadical, MathSuperScript...).
// Đây chính là công thức Word/MathType THẬT (chuẩn OMML), học sinh/thầy cô có thể bấm
// vào sửa trực tiếp trong Word như mọi công thức khác, không cần chuyển đổi thủ công.

import {
  Math as DocxMath,
  MathRun,
  MathFraction,
  MathRadical,
  MathSuperScript,
  MathSubScript,
  MathSubSuperScript,
  MathRoundBrackets,
  MathSquareBrackets,
  MathCurlyBrackets,
  MathAngledBrackets,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Paragraph,
  WidthType,
  AlignmentType,
  XmlComponent,
  XmlAttributeComponent,
  createMathAccentCharacter,
  createMathBase,
} from "docx";

/* ===================== DẤU ĐỘI ĐẦU: VECTƠ, GẠCH NGANG, DẤU MŨ =====================

   Trước đây dấu được NỐI THẲNG vào chữ dưới dạng ký tự Unicode tổ hợp:
   \overrightarrow{AB} -> "AB" + U+20D7. Trên trình duyệt thì chồng đúng lên chữ,
   nhưng trong Word ký tự tổ hợp KHÔNG chồng - nó đứng riêng ra một ô. Nên
   $\overrightarrow{SA}$ in ra thành "SA" kèm một dấu gạch nhỏ bên cạnh: mũi tên
   vectơ mất hẳn. Trong kho Toán có 6107 lệnh vectơ ở 372 câu, kho Lý 711 lệnh ở
   172 câu - nghĩa là mọi đề hình học không gian in ra đều sai ký hiệu.

   Word có phần tử riêng cho việc này:
     <m:acc> dấu đội đầu (mũi tên vectơ, dấu ngã, dấu chấm, dấu ngang ngắn)
     <m:bar> gạch ngang KÉO DÀI hết biểu thức (dùng cho \overline)
   Thư viện docx chưa mở hai thẻ này ra qua API công khai nên dựng tay bằng
   XmlComponent. Vẫn là OMML chuẩn: mở trong Word bấm vào sửa được như mọi công
   thức khác, không phải ảnh hay chữ chết. */

/** Thẻ OMML tự dựng - thư viện docx chưa có sẵn. */
class TheOMML extends XmlComponent {
  constructor(ten: string, con: readonly any[] = []) {
    super(ten);
    con.forEach((c) => this.root.push(c));
  }
}

class ThuocTinhMVal extends XmlAttributeComponent<{ readonly val: string }> {
  protected readonly xmlKeys = { val: "m:val" };
}

/** <m:acc>: đội một dấu lên trên cả biểu thức. */
class MathAccent extends TheOMML {
  constructor(dau: string, children: readonly any[]) {
    super("m:acc", [
      new TheOMML("m:accPr", [createMathAccentCharacter({ accent: dau })]),
      createMathBase({ children: children as any }),
    ]);
  }
}

/** <m:bar>: gạch ngang kéo dài hết biểu thức, dùng cho \overline{abc}. */
class MathBar extends TheOMML {
  constructor(children: readonly any[]) {
    super("m:bar", [
      // Không ghi m:pos thì Word mặc định gạch DƯỚI - phải nói rõ "top".
      new TheOMML("m:barPr", [new TheOMML("m:pos", [new ThuocTinhMVal({ val: "top" })])]),
      createMathBase({ children: children as any }),
    ]);
  }
}

type MathComponent =
  | MathRun
  | MathFraction
  | MathRadical
  | MathSuperScript
  | MathSubScript
  | MathSubSuperScript
  | MathRoundBrackets
  | MathSquareBrackets
  | MathCurlyBrackets
  | MathAngledBrackets
  | MathAccent
  | MathBar;

const SYMBOL_MAP: Record<string, string> = {
  cdot: "·",
  times: "×",
  div: "÷",
  pm: "±",
  mp: "∓",
  leq: "≤",
  le: "≤",
  geq: "≥",
  ge: "≥",
  neq: "≠",
  ne: "≠",
  approx: "≈",
  equiv: "≡",
  sim: "∼",
  Rightarrow: "⇒",
  Leftarrow: "⇐",
  Leftrightarrow: "⇔",
  rightarrow: "→",
  leftarrow: "←",
  to: "→",
  longrightarrow: "⟶",
  infty: "∞",
  in: "∈",
  notin: "∉",
  subset: "⊂",
  subseteq: "⊆",
  supset: "⊃",
  cup: "∪",
  cap: "∩",
  emptyset: "∅",
  varnothing: "∅",
  forall: "∀",
  exists: "∃",
  angle: "∠",
  triangle: "△",
  perp: "⊥",
  parallel: "∥",
  circ: "∘",
  ldots: "…",
  cdots: "…",
  dots: "…",
  sum: "∑",
  prod: "∏",
  int: "∫",
  lim: "lim",
  log: "log",
  ln: "ln",
  sin: "sin",
  cos: "cos",
  tan: "tan",
  cot: "cot",
  min: "min",
  max: "max",
  quad: "  ",
  qquad: "    ",
  alpha: "α", beta: "β", gamma: "γ", Gamma: "Γ",
  delta: "δ", Delta: "Δ", epsilon: "ε", varepsilon: "ε",
  zeta: "ζ", eta: "η", theta: "θ", Theta: "Θ",
  iota: "ι", kappa: "κ", lambda: "λ", Lambda: "Λ",
  mu: "μ", nu: "ν", xi: "ξ", Xi: "Ξ",
  pi: "π", Pi: "Π", rho: "ρ", sigma: "σ", Sigma: "Σ",
  tau: "τ", phi: "φ", varphi: "φ", Phi: "Φ",
  chi: "χ", psi: "ψ", Psi: "Ψ", omega: "ω", Omega: "Ω",
  vartheta: "ϑ", varsigma: "ς", varrho: "ϱ", varpi: "ϖ", upsilon: "υ", Upsilon: "Υ",

  // Bổ sung sau khi rà 8215 câu hỏi thật trong ngân hàng: những lệnh dưới đây đang
  // được dùng nhiều nhưng chưa có trong bảng nên bị xuất ra Word thành CHỮ TRẦN
  // ("B setminus A" thay vì "B ∖ A").
  setminus: "∖",
  backslash: "\\",
  iff: "⟺",
  implies: "⟹",
  impliedby: "⟸",
  leftrightarrow: "↔",
  longleftrightarrow: "⟷",
  Longleftrightarrow: "⟺",
  Longrightarrow: "⟹",
  Longleftarrow: "⟸",
  longleftarrow: "⟵",
  uparrow: "↑", downarrow: "↓", updownarrow: "↕",
  mapsto: "↦", hookrightarrow: "↪", rightleftharpoons: "⇌",
  nearrow: "↗", searrow: "↘", nwarrow: "↖", swarrow: "↙",
  mid: "∣", nmid: "∤", vert: "|", Vert: "‖", nparallel: "∦",
  vdots: "⋮", ddots: "⋱",
  bullet: "•", square: "□", blacksquare: "■", triangleq: "≜",
  prime: "′",
  langle: "⟨", rangle: "⟩",
  propto: "∝", oplus: "⊕", ominus: "⊖", otimes: "⊗", odot: "⊙",
  subsetneq: "⊊", supseteq: "⊇", nsubseteq: "⊈", nsubset: "⊄",
  cong: "≅", simeq: "≃", ll: "≪", gg: "≫",
  star: "⋆", ast: "∗", dagger: "†", ddagger: "‡",
  degree: "°", partial: "∂", nabla: "∇",
  aleph: "ℵ", hbar: "ℏ", ell: "ℓ", wp: "℘",
  top: "⊤", bot: "⊥",
  vee: "∨", wedge: "∧", lor: "∨", land: "∧", neg: "¬", lnot: "¬",
  oint: "∮", iint: "∬", iiint: "∭", surd: "√",
  measuredangle: "∡", sphericalangle: "∢",
  doteq: "≐", asymp: "≍", bowtie: "⋈",
  therefore: "∴", because: "∵",
  colon: ":", cdotp: "·",
  // Hàm/toán tử viết đứng - LaTeX in dạng chữ đứng, giữ nguyên tên là đúng
  arcsin: "arcsin", arccos: "arccos", arctan: "arctan", arccot: "arccot",
  sinh: "sinh", cosh: "cosh", tanh: "tanh", coth: "coth",
  sec: "sec", csc: "csc", exp: "exp", det: "det", dim: "dim", ker: "ker",
  deg: "deg", gcd: "gcd", lcm: "lcm", sup: "sup", inf: "inf", arg: "arg",
  limsup: "lim sup", liminf: "lim inf", bmod: "mod",
};

/** Chữ hoa kiểu "bảng đen" (\mathbb) - dùng nhiều cho các tập số ℕ ℤ ℚ ℝ ℂ. */
const MATHBB_MAP: Record<string, string> = {
  N: "ℕ", Z: "ℤ", Q: "ℚ", R: "ℝ", C: "ℂ", P: "ℙ", H: "ℍ", E: "𝔼", F: "𝔽", K: "𝕂",
};

/** Dấu phụ đặt trên ký tự (Unicode combining) cho \tilde, \dot, \bar... */
const ACCENT_MAP: Record<string, string> = {
  tilde: "̃", widetilde: "̃",
  dot: "̇", ddot: "̈",
  breve: "̆", check: "̌",
  acute: "́", grave: "̀",
  bar: "̄",
};

/**
 * Lệnh chỉ điều khiển cách TRÌNH BÀY, không mang nội dung toán học: cỡ dấu ngoặc,
 * vị trí chỉ số, kiểu hiển thị, khoảng trắng, kẻ ngang trong bảng. Bỏ qua hoàn toàn
 * (không có tham số kèm theo) - trước đây rơi vào nhánh mặc định nên bị in ra thành
 * chữ ("displaystyle", "limits", "hline") ngay giữa công thức.
 */
const IGNORED_COMMANDS = new Set([
  "limits", "nolimits", "displaystyle", "textstyle", "scriptstyle", "scriptscriptstyle",
  "big", "Big", "bigg", "Bigg", "bigl", "bigr", "Bigl", "Bigr", "biggl", "biggr", "Biggl", "Biggr",
  "hline", "nonumber", "notag", "smallskip", "medskip", "bigskip", "noindent",
]);

/** Lệnh đổi kiểu chữ: giữ nội dung, bỏ phần trang trí (Word không cần). */
const FONT_STYLE_COMMANDS = new Set([
  "mathbf", "mathcal", "mathfrak", "mathsf", "mathtt", "mathit", "boldsymbol", "bm",
  "textbf", "textit", "textrm", "textsf", "texttt", "emph", "underline",
]);

const STRUCTURAL_COMMANDS = new Set([
  "frac", "dfrac", "tfrac", "sqrt", "text", "mathrm", "operatorname",
  "left", "right", "begin", "end", "vec", "overrightarrow", "overline",
  "widehat", "hat", "mathbb", "color", "textcolor", "underbrace", "overbrace",
  "pmod", "substack", "hspace", "vspace", "phantom",
  ...IGNORED_COMMANDS, ...FONT_STYLE_COMMANDS, ...Object.keys(ACCENT_MAP),
]);

const KNOWN_COMMANDS = new Set([...Object.keys(SYMBOL_MAP), ...STRUCTURAL_COMMANDS]);

/**
 * Bật lên khi gặp lệnh LaTeX chưa dịch được trong lần parse hiện tại.
 *
 * Trước đây lệnh lạ bị in ra dưới dạng CHỮ TRẦN (mất dấu \), nên trong file Word
 * hiện "B setminus A", "mathbbN" - người đọc tưởng đề sai. Nay nơi gọi dựa vào cờ
 * này để xuất nguyên biểu thức LaTeX trong cặp $...$: đọc được và sửa được, thay vì
 * một công thức trông như hỏng.
 */
let coLenhChuaDich = false;

// Sửa lỗi dữ liệu cũ: chuỗi bị escape kép khiến lệnh LaTeX như "\\sqrt" biến thành
// hai dấu \ liền nhau. Chỉ gộp về 1 dấu \ khi phần chữ theo sau khớp với một lệnh đã biết
// (tránh nuốt nhầm dấu \\ dùng để xuống dòng trong hệ phương trình \begin{cases}).
function collapseDoubleBackslashBeforeKnownCommand(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] === "\\" && s[i + 1] === "\\") {
      let j = i + 2;
      while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
      const word = s.slice(i + 2, j);
      let matched = "";
      for (let len = word.length; len > 0; len--) {
        const candidate = word.slice(0, len);
        if (KNOWN_COMMANDS.has(candidate)) { matched = candidate; break; }
      }
      if (matched) {
        out += "\\" + matched;
        i += 2 + matched.length;
        continue;
      }
    }
    out += s[i];
    i++;
  }
  return out;
}

function findMatchingBrace(s: string, openIdx: number): number {
  let depth = 0;
  for (let k = openIdx; k < s.length; k++) {
    if (s[k] === "{") depth++;
    else if (s[k] === "}") {
      depth--;
      if (depth === 0) return k;
    }
  }
  return s.length;
}

type ParseResult = { nodes: MathComponent[]; i: number };

function nodesOf(text: string): MathComponent[] {
  return text ? [new MathRun(text)] : [];
}

function parseBraceRaw(s: string, i: number): { text: string; i: number } {
  if (s[i] !== "{") return { text: "", i };
  const close = findMatchingBrace(s, i);
  return { text: s.slice(i + 1, close), i: close + 1 };
}

function parseArg(s: string, i: number): ParseResult {
  if (s[i] === "{") {
    const close = findMatchingBrace(s, i);
    const inner = s.slice(i + 1, close);
    return { nodes: parseSequence(inner), i: close + 1 };
  }
  return parseBaseUnit(s, i);
}

function readCommandName(s: string, i: number): { name: string; i: number } {
  if (/[A-Za-z]/.test(s[i] || "")) {
    let j = i;
    while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
    return { name: s.slice(i, j), i: j };
  }
  return { name: s[i] || "", i: i + 1 };
}

function parseDelimChar(s: string, i: number): { ch: string; i: number } {
  if (s[i] === "\\" && s[i + 1] === "{") return { ch: "{", i: i + 2 };
  if (s[i] === "\\" && s[i + 1] === "}") return { ch: "}", i: i + 2 };
  if (s.slice(i, i + 2) === "\\|") return { ch: "|", i: i + 2 };
  if (s[i] === ".") return { ch: "", i: i + 1 };
  return { ch: s[i] || "", i: i + 1 };
}

function wrapBrackets(open: string, close: string, children: MathComponent[]): MathComponent[] {
  if (!open && !close) return children; // dấu ngoặc vô hình \left. ... \right.
  if (open === "(" || close === ")") return [new MathRoundBrackets({ children }) as unknown as MathComponent];
  if (open === "[" || close === "]") return [new MathSquareBrackets({ children }) as unknown as MathComponent];
  if (open === "{" || close === "}") return [new MathCurlyBrackets({ children }) as unknown as MathComponent];
  return [new MathAngledBrackets({ children }) as unknown as MathComponent];
}

/**
 * Dấu ngoặc bao ngoài của từng môi trường nhiều dòng.
 * Chuỗi rỗng nghĩa là không có dấu ngoặc bên đó.
 */
const MOI_TRUONG_NHIEU_DONG: Record<string, { mo: string; dong: string }> = {
  cases: { mo: "{", dong: "" },
  bmatrix: { mo: "[", dong: "]" },
  Bmatrix: { mo: "{", dong: "}" },
  pmatrix: { mo: "(", dong: ")" },
  vmatrix: { mo: "|", dong: "|" },
  matrix: { mo: "", dong: "" },
  smallmatrix: { mo: "", dong: "" },
  array: { mo: "", dong: "" },
  aligned: { mo: "", dong: "" },
  align: { mo: "", dong: "" },
  gathered: { mo: "", dong: "" },
  split: { mo: "", dong: "" },
};

function parseCasesBody(s: string, i: number, tenMoiTruong = "cases"): ParseResult {
  // i trỏ ngay sau "\begin{<tên>}"
  const rows: string[] = [];
  let depth = 0;
  let start = i;
  let k = i;
  const endMarker = `\\end{${tenMoiTruong}}`;
  while (k < s.length) {
    if (s.slice(k, k + endMarker.length) === endMarker && depth === 0) {
      rows.push(s.slice(start, k));
      k += endMarker.length;
      break;
    }
    if (s[k] === "{") depth++;
    else if (s[k] === "}") depth--;
    else if (s[k] === "\\" && s[k + 1] === "\\" && depth === 0) {
      rows.push(s.slice(start, k));
      k += 2;
      start = k;
      continue;
    }
    k++;
  }
  if (k >= s.length) rows.push(s.slice(start));

  const rowNodes = rows
    // "&" chỉ để căn cột trong LaTeX; ở đây thay bằng khoảng trắng. Bỏ luôn \hline
    // (kẻ ngang) vì dựng inline không có đường kẻ - bảng thật do exportDocx lo.
    .map((row) => row.replace(/\\hline/g, " ").replace(/&/g, " "))
    .filter((row) => row.trim().length > 0)
    .map((row) => parseSequence(row));

  const joined: MathComponent[] = [];
  rowNodes.forEach((nodes, idx) => {
    if (idx > 0) joined.push(new MathRun("   ;   "));
    joined.push(...nodes);
  });

  const ngoac = MOI_TRUONG_NHIEU_DONG[tenMoiTruong] || { mo: "", dong: "" };
  return { nodes: wrapBrackets(ngoac.mo, ngoac.dong, joined), i: k };
}

function parseCommand(s: string, i: number): ParseResult {
  const { name, i: afterName } = readCommandName(s, i + 1);
  let i2 = afterName;

  switch (name) {
    case "frac":
    case "dfrac":
    case "tfrac": {
      const num = parseArg(s, i2); i2 = num.i;
      const den = parseArg(s, i2); i2 = den.i;
      return { nodes: [new MathFraction({ numerator: num.nodes, denominator: den.nodes })], i: i2 };
    }
    case "sqrt": {
      let degText = "";
      if (s[i2] === "[") {
        const close = s.indexOf("]", i2);
        const end = close === -1 ? s.length : close;
        degText = s.slice(i2 + 1, end);
        i2 = end === s.length ? s.length : end + 1;
      }
      const body = parseArg(s, i2); i2 = body.i;
      const degree = degText ? nodesOf(degText) : undefined;
      return { nodes: [new MathRadical({ children: body.nodes, degree })], i: i2 };
    }
    case "text":
    case "mathrm":
    case "operatorname": {
      const raw = parseBraceRaw(s, i2); i2 = raw.i;
      return { nodes: nodesOf(raw.text), i: i2 };
    }
    case "left": {
      const open = parseDelimChar(s, i2); i2 = open.i;
      const startInner = i2;
      let depth = 0;
      // "\left" dài 5 ký tự, "\right" dài 6 - bản cũ cắt dư 1 ký tự (6 và 7) nên phép
      // so sánh KHÔNG BAO GIỜ đúng: vòng lặp chạy hết chuỗi, dấu ngoặc nuốt trọn phần
      // còn lại của biểu thức và chữ "\right" lọt xuống nhánh lệnh-không-biết.
      while (i2 < s.length) {
        if (s.slice(i2, i2 + 5) === "\\left" && !/[A-Za-z]/.test(s[i2 + 5] || "")) depth++;
        if (s.slice(i2, i2 + 6) === "\\right" && !/[A-Za-z]/.test(s[i2 + 6] || "")) {
          if (depth === 0) break;
          depth--;
        }
        i2++;
      }
      const inner = s.slice(startInner, i2);
      let close = { ch: "", i: i2 };
      if (s.slice(i2, i2 + 6) === "\\right") close = parseDelimChar(s, i2 + 6);
      const innerNodes = parseSequence(inner);
      return { nodes: wrapBrackets(open.ch, close.ch, innerNodes), i: close.i };
    }
    case "begin": {
      const ten = parseBraceRaw(s, i2); i2 = ten.i;
      const tenMT = ten.text.trim();
      if (MOI_TRUONG_NHIEU_DONG[tenMT]) {
        // \begin{array}{|c|c|} có thêm phần khai báo cột ngay sau tên - bỏ qua,
        // vì dựng inline thì không kẻ cột được.
        if (tenMT === "array" && s[i2] === "{") i2 = parseBraceRaw(s, i2).i;
        return parseCasesBody(s, i2, tenMT);
      }
      // Môi trường lạ: báo lên để cả biểu thức xuất nguyên dạng $...$ (bản cũ in
      // thẳng chữ "begin" ra giữa công thức).
      coLenhChuaDich = true;
      return { nodes: [], i: i2 };
    }
    case "end": {
      // \end đã được parseCasesBody nuốt cùng thân môi trường; còn sót lại nghĩa là
      // môi trường không dựng được.
      const ten = parseBraceRaw(s, i2);
      if (!MOI_TRUONG_NHIEU_DONG[ten.text.trim()]) coLenhChuaDich = true;
      return { nodes: [], i: ten.i };
    }
    case "vec":
    case "overrightarrow": {
      // Dựng cả biểu thức bên trong rồi mới đội mũi tên lên, để \vec{a_1} hay
      // \overrightarrow{AB} + \overrightarrow{CD} đều đúng, không chỉ mỗi chữ trần.
      const arg = parseArg(s, i2); i2 = arg.i;
      return { nodes: [new MathAccent("⃗", arg.nodes)], i: i2 };
    }
    case "widehat":
    case "hat": {
      // Ký hiệu góc trong sách giáo khoa: dấu mũ ĐỘI LÊN cả cụm chữ - $\widehat{ABC}$
      // ra "ABC" có mũ nằm vắt ngang bên trên, đúng như Thầy cô viết tay.
      //
      // Trước đây xuất thành "∠ABC" vì cách cũ nối ký tự tổ hợp vào chữ, mà làm vậy
      // thì dấu mũ bám vào chữ CUỐI ("COÂ") chứ không nằm trên đỉnh góc. Nay có
      // <m:acc>, Word tự kéo dãn dấu mũ cho vừa hết cụm chữ nên không còn vướng đó.
      const arg = parseArg(s, i2); i2 = arg.i;
      return { nodes: [new MathAccent("̂", arg.nodes)], i: i2 };
    }
    case "mathbb": {
      const raw = parseBraceRaw(s, i2); i2 = raw.i;
      const inner = raw.text.trim();
      const mapped = [...inner].map((ch) => MATHBB_MAP[ch] ?? ch).join("");
      return { nodes: nodesOf(mapped), i: i2 };
    }
    case "color": {
      // Chỉ đổi màu chữ (1796 lần trong ngân hàng) - nuốt tham số màu, giữ nội dung
      // phía sau nguyên vẹn. Trước đây in ra chữ "color" ngay giữa công thức.
      const raw = parseBraceRaw(s, i2);
      return { nodes: [], i: raw.i };
    }
    case "textcolor": {
      const mau = parseBraceRaw(s, i2); i2 = mau.i;   // bỏ tên màu
      const noiDung = parseArg(s, i2); i2 = noiDung.i;
      return { nodes: noiDung.nodes, i: i2 };
    }
    case "underbrace":
    case "overbrace": {
      // Word (qua thư viện docx) chưa có dấu ngoặc nhọn ngang; giữ lại nội dung.
      const arg = parseArg(s, i2); i2 = arg.i;
      return { nodes: arg.nodes, i: i2 };
    }
    case "pmod": {
      const raw = parseBraceRaw(s, i2); i2 = raw.i;
      return { nodes: nodesOf(" (mod " + raw.text.trim() + ")"), i: i2 };
    }
    case "hspace":
    case "vspace":
    case "phantom": {
      const raw = parseBraceRaw(s, i2);
      return { nodes: nodesOf(" "), i: raw.i };
    }
    case "substack": {
      const raw = parseBraceRaw(s, i2); i2 = raw.i;
      return { nodes: parseSequence(raw.text.replace(/\\\\/g, " ")), i: i2 };
    }
    case "overline": {
      // Gạch ngang KÉO DÀI hết biểu thức - \overline{abc} là số có ba chữ số, mất
      // gạch là đọc thành tích a·b·c. Trước đây bỏ hẳn gạch vì thư viện docx không
      // có m:bar; nay dựng thẻ ấy tay (xem MathBar ở đầu tệp).
      const arg = parseArg(s, i2); i2 = arg.i;
      return { nodes: [new MathBar(arg.nodes)], i: i2 };
    }
    case "quad":
    case "qquad":
      return { nodes: nodesOf(SYMBOL_MAP[name]), i: i2 };
    case "%":
    case "$":
    case "&":
    case "#":
    case "_":
    case "{":
    case "}":
      return { nodes: nodesOf(name), i: i2 };
    default: {
      const sym = SYMBOL_MAP[name];
      if (sym !== undefined) return { nodes: nodesOf(sym), i: i2 };

      // Lệnh chỉ điều khiển trình bày (\displaystyle, \limits, \Big, \hline...):
      // bỏ hẳn, không sinh chữ nào.
      if (IGNORED_COMMANDS.has(name)) return { nodes: [], i: i2 };

      // Lệnh đổi kiểu chữ (\mathbf{...}, \boldsymbol{...}): giữ nội dung bên trong.
      if (FONT_STYLE_COMMANDS.has(name)) {
        const arg = parseArg(s, i2);
        return { nodes: arg.nodes, i: arg.i };
      }

      // Dấu phụ đặt trên ký tự (\bar{x}, \tilde{u}, \dot{y}...) - cũng đội bằng
      // <m:acc> chứ không nối ký tự tổ hợp vào chữ, cùng lý do với vectơ.
      const accent = ACCENT_MAP[name];
      if (accent !== undefined) {
        const arg = parseArg(s, i2);
        if (arg.i > i2) return { nodes: [new MathAccent(accent, arg.nodes)], i: arg.i };
        const base = parseBaseUnit(s, i2);
        return { nodes: [new MathAccent(accent, base.nodes)], i: base.i };
      }

      // Khoảng trắng LaTeX: \, \; \! \: \ (dấu cách sau dấu chéo)
      if (name === "," || name === ";" || name === ":" || name === " ") return { nodes: nodesOf(" "), i: i2 };
      if (name === "!") return { nodes: [], i: i2 };

      // Không nhận ra: KHÔNG đổ tên lệnh ra dạng chữ trần nữa (đó chính là nguyên nhân
      // file Word hiện "B setminus A"). Báo lên để nơi gọi xuất nguyên biểu thức LaTeX
      // trong cặp $...$ - vừa đọc được, vừa sửa lại được bằng tay.
      coLenhChuaDich = true;
      return { nodes: nodesOf("\\" + name), i: i2 };
    }
  }
}

function parseBaseUnit(s: string, i: number): ParseResult {
  if (i >= s.length) return { nodes: [], i };
  const c = s[i];
  if (c === "\\") return parseCommand(s, i);
  if (c === "{") {
    const close = findMatchingBrace(s, i);
    return { nodes: parseSequence(s.slice(i + 1, close)), i: close + 1 };
  }
  if (c === "^" || c === "_") return { nodes: [], i: i + 1 };
  return { nodes: nodesOf(c), i: i + 1 };
}

function parseScriptArg(s: string, i: number): ParseResult {
  if (s[i] === "{") {
    const close = findMatchingBrace(s, i);
    return { nodes: parseSequence(s.slice(i + 1, close)), i: close + 1 };
  }
  return parseBaseUnit(s, i);
}

function parseAtomWithScripts(s: string, i: number): ParseResult {
  const base = parseBaseUnit(s, i);
  let i2 = base.i;
  let supNodes: MathComponent[] | null = null;
  let subNodes: MathComponent[] | null = null;

  while (i2 < s.length && (s[i2] === "^" || s[i2] === "_")) {
    if (s[i2] === "^") {
      const arg = parseScriptArg(s, i2 + 1);
      supNodes = [...(supNodes || []), ...arg.nodes];
      i2 = arg.i;
    } else {
      const arg = parseScriptArg(s, i2 + 1);
      subNodes = [...(subNodes || []), ...arg.nodes];
      i2 = arg.i;
    }
  }

  if (base.nodes.length === 0 && supNodes === null && subNodes === null) return { nodes: [], i: i2 };

  if (supNodes !== null && subNodes !== null) {
    return { nodes: [new MathSubSuperScript({ children: base.nodes, subScript: subNodes, superScript: supNodes })], i: i2 };
  }
  if (supNodes !== null) {
    return { nodes: [new MathSuperScript({ children: base.nodes, superScript: supNodes })], i: i2 };
  }
  if (subNodes !== null) {
    return { nodes: [new MathSubScript({ children: base.nodes, subScript: subNodes })], i: i2 };
  }
  return { nodes: base.nodes, i: i2 };
}

function parseSequence(s: string): MathComponent[] {
  let i = 0;
  const out: MathComponent[] = [];
  let guard = 0;
  while (i < s.length && guard < 100000) {
    guard++;
    const before = i;
    const atom = parseAtomWithScripts(s, i);
    out.push(...atom.nodes);
    i = atom.i;
    if (i <= before) i = before + 1;
  }
  return out;
}

// API chính: chuyển 1 biểu thức LaTeX (không kèm dấu $) thành đối tượng Math của docx,
// sẵn sàng chèn vào children của Paragraph.
export function latexToDocxMath(latex: string): InstanceType<typeof DocxMath> {
  const raw = (latex || "").trim();
  if (!raw) return new DocxMath({ children: [] });
  try {
    const fixed = collapseDoubleBackslashBeforeKnownCommand(raw);
    const nodes = parseSequence(fixed);
    return new DocxMath({ children: nodes as any });
  } catch (e) {
    return new DocxMath({ children: [new MathRun(raw)] as any });
  }
}

/* ==================== BẢNG BIẾN THIÊN / BẢNG SỐ LIỆU ==================== */

/**
 * Nhận diện một biểu thức LaTeX là BẢNG CÓ KẺ Ô, tức \begin{array} kèm \hline.
 * Chỉ loại này mới dựng thành bảng Word; \begin{array}{l} không có \hline chỉ là
 * danh sách nhiều dòng nên vẫn để trong công thức.
 */
export function laBangKeO(latex: string): boolean {
  const s = String(latex || "");
  return /\\begin\s*\{array\}/.test(s) && /\\hline/.test(s);
}

/** Tách thân bảng thành mảng hàng, mỗi hàng là mảng ô (theo dấu & và \\). */
function tachOBang(than: string): string[][] {
  const hang: string[][] = [];
  let o: string[] = [];
  let batDau = 0;
  let depth = 0;
  const chotO = (den: number) => { o.push(than.slice(batDau, den)); batDau = den; };
  for (let k = 0; k < than.length; k++) {
    if (than[k] === "{") depth++;
    else if (than[k] === "}") depth--;
    else if (depth === 0 && than[k] === "&") { chotO(k); batDau = k + 1; }
    else if (depth === 0 && than[k] === "\\" && than[k + 1] === "\\") {
      chotO(k); batDau = k + 2; k++;
      hang.push(o); o = [];
    }
  }
  o.push(than.slice(batDau));
  hang.push(o);
  return hang
    .map((h) => h.map((c) => c.replace(/\\hline/g, "").trim()))
    .filter((h) => h.some((c) => c.length > 0));
}

/**
 * Dựng bảng Word thật từ \begin{array}{|c|c|}...\hline...\end{array}.
 *
 * Dùng bảng Word (có đường kẻ, chỉnh được độ rộng cột) thay vì nhét vào công thức:
 * bảng số liệu ghép nhóm và bảng biến thiên vốn là BẢNG, để trong công thức thì mất
 * hết đường kẻ, các số dồn thành một dòng dài không đọc được.
 *
 * Nội dung từng ô vẫn đi qua trình dịch công thức nên $\frac{a}{b}$ trong ô vẫn ra
 * công thức Word bình thường.
 */
export function latexToDocxTable(latex: string): InstanceType<typeof Table> | null {
  const s = String(latex || "");
  const m = s.match(/\\begin\s*\{array\}\s*(\{[^}]*\})?([\s\S]*?)\\end\s*\{array\}/);
  if (!m) return null;
  const hang = tachOBang(m[2] || "");
  if (hang.length === 0) return null;
  const soCot = Math.max(...hang.map((h) => h.length));

  const rows = hang.map((h) => new TableRow({
    children: Array.from({ length: soCot }, (_, c) => new TableCell({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [latexToDocxElement(h[c] ?? "")] as any,
      })],
      width: { size: Math.floor(100 / soCot), type: WidthType.PERCENTAGE },
    })),
  }));

  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

/**
 * Bản dùng khi XUẤT FILE WORD: trả về công thức Word thật nếu dịch trọn vẹn, còn nếu
 * gặp lệnh LaTeX chưa hỗ trợ thì trả về đoạn chữ "$...$" giữ nguyên LaTeX gốc.
 *
 * Lý do: một công thức dịch thiếu trông như đề bị sai (chữ "setminus" nằm giữa dòng),
 * trong khi "$B \setminus A$" thì giáo viên đọc hiểu ngay và sửa lại được. Thà thấy
 * LaTeX thô còn hơn thấy công thức hỏng.
 */
export function latexToDocxElement(
  latex: string,
  opts?: { color?: string; bold?: boolean },
): InstanceType<typeof DocxMath> | InstanceType<typeof TextRun> {
  const raw = (latex || "").trim();
  if (!raw) return new DocxMath({ children: [] });
  try {
    const fixed = collapseDoubleBackslashBeforeKnownCommand(raw);
    coLenhChuaDich = false;
    const nodes = parseSequence(fixed);
    if (coLenhChuaDich) {
      return new TextRun({ text: `$${raw}$`, color: opts?.color, bold: opts?.bold });
    }
    return new DocxMath({ children: nodes as any });
  } catch (e) {
    return new TextRun({ text: `$${raw}$`, color: opts?.color, bold: opts?.bold });
  }
}
