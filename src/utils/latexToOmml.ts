// Chuyển một biểu thức LaTeX (nội dung nằm giữa $...$ hoặc $$...$$) thành XML OMML
// (Office Math Markup Language) để nhúng thẳng vào file Word dạng HTML (.doc).
// Word hiểu <m:oMath>...</m:oMath> ngay trong HTML và hiển thị thành công thức toán
// thật (căn, phân số, mũ, chỉ số...) chứ không cần cài thêm add-in MathType.
//
// Đây là một trình phân tích LaTeX rút gọn, chỉ hỗ trợ các cấu trúc thường gặp trong
// nội dung bài giảng (căn thức, phân số, mũ/chỉ số, hệ phương trình, các ký hiệu so
// sánh/toán tử phổ biến...). Lệnh không nhận diện được sẽ rơi về hiển thị tên lệnh dạng
// chữ thường (không bao giờ để sót dấu \ thô ra ngoài).

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
  quad: "  ",
  qquad: "    ",
  alpha: "α", beta: "β", gamma: "γ", Gamma: "Γ",
  delta: "δ", Delta: "Δ", epsilon: "ε", varepsilon: "ε",
  zeta: "ζ", eta: "η", theta: "θ", Theta: "Θ",
  iota: "ι", kappa: "κ", lambda: "λ", Lambda: "Λ",
  mu: "μ", nu: "ν", xi: "ξ", Xi: "Ξ",
  pi: "π", Pi: "Π", rho: "ρ", sigma: "σ", Sigma: "Σ",
  tau: "τ", phi: "φ", varphi: "φ", Phi: "Φ",
  chi: "χ", psi: "ψ", Psi: "Ψ", omega: "ω", Omega: "Ω",
};

const STRUCTURAL_COMMANDS = new Set([
  "frac", "dfrac", "tfrac", "sqrt", "text", "mathrm", "operatorname",
  "left", "right", "begin", "end", "vec", "overrightarrow", "overline",
]);

const KNOWN_COMMANDS = new Set([...Object.keys(SYMBOL_MAP), ...STRUCTURAL_COMMANDS]);

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function runXml(text: string, plainUpright: boolean = false): string {
  if (!text) return "";
  const rPr = plainUpright ? '<m:rPr><m:sty m:val="p"/></m:rPr>' : "";
  return `<m:r>${rPr}<m:t xml:space="preserve">${escapeXml(text)}</m:t></m:r>`;
}

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

type ParseResult = { xml: string; i: number };

function parseBraceRaw(s: string, i: number): ParseResult {
  if (s[i] !== "{") return { xml: "", i };
  const close = findMatchingBrace(s, i);
  return { xml: s.slice(i + 1, close), i: close + 1 };
}

function parseArg(s: string, i: number): ParseResult {
  if (s[i] === "{") {
    const close = findMatchingBrace(s, i);
    const inner = s.slice(i + 1, close);
    return { xml: parseSequence(inner), i: close + 1 };
  }
  return parseBaseUnit(s, i);
}

function readCommandName(s: string, i: number): { name: string; i: number } {
  // i trỏ vào ký tự ngay sau dấu \
  if (/[A-Za-z]/.test(s[i] || "")) {
    let j = i;
    while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
    return { name: s.slice(i, j), i: j };
  }
  // Lệnh 1 ký tự đặc biệt: \{ \} \$ \% \& \# \_ \\ ...
  return { name: s[i] || "", i: i + 1 };
}

function parseDelimChar(s: string, i: number): { ch: string; i: number } {
  if (s[i] === "\\" && s[i + 1] === "{") return { ch: "{", i: i + 2 };
  if (s[i] === "\\" && s[i + 1] === "}") return { ch: "}", i: i + 2 };
  if (s.slice(i, i + 2) === "\\|") return { ch: "‖", i: i + 2 };
  if (s[i] === ".") return { ch: "", i: i + 1 };
  return { ch: s[i] || "", i: i + 1 };
}

function parseCasesBody(s: string, i: number): { xml: string; i: number } {
  // i trỏ ngay sau "\begin{cases}"
  const rows: string[] = [];
  let depth = 0;
  let start = i;
  let k = i;
  const endMarker = "\\end{cases}";
  while (k < s.length) {
    if (s.slice(k, k + endMarker.length) === endMarker && depth === 0) {
      rows.push(s.slice(start, k));
      k += endMarker.length;
      const rowsXml = rows
        .map((row) => row.replace(/&/g, " "))
        .filter((row) => row.trim().length > 0)
        .map((row) => `<m:e>${parseSequence(row)}</m:e>`)
        .join("");
      const xml = `<m:d><m:dPr><m:begChr m:val="{"/><m:endChr m:val=""/></m:dPr><m:e><m:eqArr>${rowsXml}</m:eqArr></m:e></m:d>`;
      return { xml, i: k };
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
  // Không tìm thấy \end{cases}: coi phần còn lại là 1 hàng duy nhất
  rows.push(s.slice(start));
  const rowsXml = rows
    .map((row) => row.replace(/&/g, " "))
    .filter((row) => row.trim().length > 0)
    .map((row) => `<m:e>${parseSequence(row)}</m:e>`)
    .join("");
  return {
    xml: `<m:d><m:dPr><m:begChr m:val="{"/><m:endChr m:val=""/></m:dPr><m:e><m:eqArr>${rowsXml}</m:eqArr></m:e></m:d>`,
    i: s.length,
  };
}

function parseCommand(s: string, i: number): ParseResult {
  // s[i] === '\\'
  const { name, i: afterName } = readCommandName(s, i + 1);
  let i2 = afterName;

  switch (name) {
    case "frac":
    case "dfrac":
    case "tfrac": {
      const num = parseArg(s, i2); i2 = num.i;
      const den = parseArg(s, i2); i2 = den.i;
      return { xml: `<m:f><m:num>${num.xml}</m:num><m:den>${den.xml}</m:den></m:f>`, i: i2 };
    }
    case "sqrt": {
      let deg = "";
      if (s[i2] === "[") {
        const close = s.indexOf("]", i2);
        const end = close === -1 ? s.length : close;
        deg = s.slice(i2 + 1, end);
        i2 = end === s.length ? s.length : end + 1;
      }
      const body = parseArg(s, i2); i2 = body.i;
      if (deg) {
        return { xml: `<m:rad><m:radPr><m:degHide m:val="0"/></m:radPr><m:deg>${runXml(deg)}</m:deg><m:e>${body.xml}</m:e></m:rad>`, i: i2 };
      }
      return { xml: `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${body.xml}</m:e></m:rad>`, i: i2 };
    }
    case "text":
    case "mathrm":
    case "operatorname": {
      const raw = parseBraceRaw(s, i2); i2 = raw.i;
      return { xml: runXml(raw.xml, true), i: i2 };
    }
    case "left": {
      const open = parseDelimChar(s, i2); i2 = open.i;
      let inner = "";
      let depth = 0;
      while (i2 < s.length) {
        if (s.slice(i2, i2 + 6) === "\\left" && !/[A-Za-z]/.test(s[i2 + 5] || "")) { depth++; }
        if (s.slice(i2, i2 + 7) === "\\right" && !/[A-Za-z]/.test(s[i2 + 6] || "")) {
          if (depth === 0) break;
          depth--;
        }
        i2++;
      }
      inner = s.slice(open.i, i2);
      let close = { ch: "", i: i2 };
      if (s.slice(i2, i2 + 6) === "\\right") {
        close = parseDelimChar(s, i2 + 6);
      }
      const innerXml = parseSequence(inner);
      return {
        xml: `<m:d><m:dPr><m:begChr m:val="${escapeXml(open.ch)}"/><m:endChr m:val="${escapeXml(close.ch)}"/></m:dPr><m:e>${innerXml}</m:e></m:d>`,
        i: close.i,
      };
    }
    case "begin": {
      if (s.slice(i2, i2 + 7) === "{cases}") {
        return parseCasesBody(s, i2 + 7);
      }
      return { xml: runXml("begin"), i: i2 };
    }
    case "vec":
    case "overrightarrow": {
      const raw = parseBraceRaw(s, i2); i2 = raw.i;
      const inner = raw.xml.replace(/\\/g, "");
      return { xml: runXml(inner + "⃗"), i: i2 };
    }
    case "overline": {
      const arg = parseArg(s, i2); i2 = arg.i;
      return { xml: `<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>${arg.xml}</m:e></m:bar>`, i: i2 };
    }
    case "quad":
    case "qquad":
      return { xml: runXml(SYMBOL_MAP[name]), i: i2 };
    case "%":
    case "$":
    case "&":
    case "#":
    case "_":
    case "{":
    case "}":
      return { xml: runXml(name), i: i2 };
    default: {
      const sym = SYMBOL_MAP[name];
      if (sym !== undefined) return { xml: runXml(sym, /^[a-z]+$/.test(name) === false), i: i2 };
      // Lệnh lạ: hiển thị tên lệnh dạng chữ thường thay vì để lộ dấu \ thô
      return { xml: runXml(name || "\\"), i: i2 };
    }
  }
}

function parseBaseUnit(s: string, i: number): ParseResult {
  if (i >= s.length) return { xml: "", i };
  const c = s[i];
  if (c === "\\") return parseCommand(s, i);
  if (c === "{") {
    const close = findMatchingBrace(s, i);
    return { xml: parseSequence(s.slice(i + 1, close)), i: close + 1 };
  }
  if (c === "^" || c === "_") {
    // Ký tự mũ/chỉ số đứng lẻ loi (không có cơ số phía trước) - bỏ qua để tránh vòng lặp vô hạn
    return { xml: "", i: i + 1 };
  }
  return { xml: runXml(c), i: i + 1 };
}

function parseScriptArg(s: string, i: number): ParseResult {
  if (s[i] === "{") {
    const close = findMatchingBrace(s, i);
    return { xml: parseSequence(s.slice(i + 1, close)), i: close + 1 };
  }
  return parseBaseUnit(s, i);
}

function parseAtomWithScripts(s: string, i: number): ParseResult {
  const base = parseBaseUnit(s, i);
  let i2 = base.i;
  let supXml: string | null = null;
  let subXml: string | null = null;

  while (i2 < s.length && (s[i2] === "^" || s[i2] === "_")) {
    if (s[i2] === "^") {
      const arg = parseScriptArg(s, i2 + 1);
      supXml = (supXml || "") + arg.xml;
      i2 = arg.i;
    } else {
      const arg = parseScriptArg(s, i2 + 1);
      subXml = (subXml || "") + arg.xml;
      i2 = arg.i;
    }
  }

  if (!base.xml && supXml === null && subXml === null) return { xml: "", i: i2 };

  if (supXml !== null && subXml !== null) {
    return { xml: `<m:sSubSup><m:e>${base.xml}</m:e><m:sub>${subXml}</m:sub><m:sup>${supXml}</m:sup></m:sSubSup>`, i: i2 };
  }
  if (supXml !== null) {
    return { xml: `<m:sSup><m:e>${base.xml}</m:e><m:sup>${supXml}</m:sup></m:sSup>`, i: i2 };
  }
  if (subXml !== null) {
    return { xml: `<m:sSub><m:e>${base.xml}</m:e><m:sub>${subXml}</m:sub></m:sSub>`, i: i2 };
  }
  return { xml: base.xml, i: i2 };
}

function parseSequence(s: string): string {
  let i = 0;
  let out = "";
  let guard = 0;
  while (i < s.length && guard < 100000) {
    guard++;
    const before = i;
    const atom = parseAtomWithScripts(s, i);
    out += atom.xml;
    i = atom.i;
    if (i <= before) i = before + 1; // an toàn: luôn tiến lên, không bao giờ treo
  }
  return out;
}

// API chính: chuyển 1 biểu thức LaTeX (không kèm dấu $) thành "<m:oMath>...</m:oMath>"
export function latexToOmmlXml(latex: string): string {
  const raw = (latex || "").trim();
  if (!raw) return "";
  try {
    const fixed = collapseDoubleBackslashBeforeKnownCommand(raw);
    const inner = parseSequence(fixed);
    return `<m:oMath>${inner}</m:oMath>`;
  } catch (e) {
    return `<m:oMath>${runXml(raw)}</m:oMath>`;
  }
}
