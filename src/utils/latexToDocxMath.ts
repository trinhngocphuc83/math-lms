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
} from "docx";

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
  | MathAngledBrackets;

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
};

const STRUCTURAL_COMMANDS = new Set([
  "frac", "dfrac", "tfrac", "sqrt", "text", "mathrm", "operatorname",
  "left", "right", "begin", "end", "vec", "overrightarrow", "overline",
]);

const KNOWN_COMMANDS = new Set([...Object.keys(SYMBOL_MAP), ...STRUCTURAL_COMMANDS]);

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

function parseCasesBody(s: string, i: number): ParseResult {
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
    .map((row) => row.replace(/&/g, " "))
    .filter((row) => row.trim().length > 0)
    .map((row) => parseSequence(row));

  const joined: MathComponent[] = [];
  rowNodes.forEach((nodes, idx) => {
    if (idx > 0) joined.push(new MathRun("   ;   "));
    joined.push(...nodes);
  });

  return { nodes: wrapBrackets("{", "", joined), i: k };
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
      while (i2 < s.length) {
        if (s.slice(i2, i2 + 6) === "\\left" && !/[A-Za-z]/.test(s[i2 + 5] || "")) depth++;
        if (s.slice(i2, i2 + 7) === "\\right" && !/[A-Za-z]/.test(s[i2 + 6] || "")) {
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
      if (s.slice(i2, i2 + 7) === "{cases}") return parseCasesBody(s, i2 + 7);
      return { nodes: nodesOf("begin"), i: i2 };
    }
    case "vec":
    case "overrightarrow": {
      const raw = parseBraceRaw(s, i2); i2 = raw.i;
      const inner = raw.text.replace(/\\/g, "");
      return { nodes: nodesOf(inner + "⃗"), i: i2 };
    }
    case "overline": {
      // Thư viện docx chưa hỗ trợ gạch ngang trên đầu (m:bar) qua API công khai,
      // đành hiển thị nội dung bên trong mà không có gạch ngang.
      const arg = parseArg(s, i2); i2 = arg.i;
      return { nodes: arg.nodes, i: i2 };
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
      return { nodes: nodesOf(name || "\\"), i: i2 };
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
