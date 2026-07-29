export function cleanLatexForWord(str: string): string {
  let res = str;
  if (!res) return res;

  // Xử lý các cặp dấu ngoặc nhọn lồng nhau một cách đơn giản
  // TẠM BỎ: Không replace \frac để giữ nguyên cho MathType
  // while (res.match(/\\frac\{([^{}]+)\}\{([^{}]+)\}/)) {
  //   res = res.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (m, a, b) => {
  //     let num = a.includes('+') || a.includes('-') ? '(' + a + ')' : a;
  //     let den = b.includes('+') || b.includes('-') ? '(' + b + ')' : b;
  //     return num + '/' + den;
  //   });
  // }

  // Replace text block
  // TẠM BỎ cho MathType: res = res.replace(/\\text\{([^{}]+)\}/g, '$1');

  // TẠM BỎ: Không replace symbols thành Unicode để giữ nguyên cho MathType
  /*
  const syms: Record<string, string> = {
    '\\\\Leftrightarrow': '⇔',
    '\\\\Rightarrow': '⇒',
    '\\\\Leftarrow': '⇐',
    '\\\\times': '×',
    '\\\\div': '÷',
    '\\\\cdot': '.',
    '\\\\pm': '±',
    '\\\\mp': '∓',
    '\\\\infty': '∞',
    '\\\\pi': 'π',
    '\\\\alpha': 'α',
    '\\\\beta': 'β',
    '\\\\gamma': 'γ',
    '\\\\Delta': 'Δ',
    '\\\\delta': 'δ',
    '\\\\theta': 'θ',
    '\\\\omega': 'ω',
    '\\\\Omega': 'Ω',
    '\\\\lambda': 'λ',
    '\\\\mu': 'μ',
    '\\\\rho': 'ρ',
    '\\\\sigma': 'σ',
    '\\\\Sigma': 'Σ',
    '\\\\leq': '≤',
    '\\\\geq': '≥',
    '\\\\neq': '≠',
    '\\\\approx': '≈',
    '\\\\equiv': '≡',
    '\\\\sim': '∼',
    '\\\\rightarrow': '→',
    '\\\\leftarrow': '←',
    '\\\\circ': '°',
    '\\\\%': '%',
    '\\\\sqrt': '√',
    '\\\\angle': '∠',
    '\\\\triangle': '△',
    '\\\\perp': '⊥',
    '\\\\parallel': '∥',
    '\\\\in': '∈',
    '\\\\notin': '∉',
    '\\\\subset': '⊂',
    '\\\\cup': '∪',
    '\\\\cap': '∩',
    '\\\\emptyset': '∅',
    '\\\\forall': '∀',
    '\\\\exists': '∃'
  };

  for (let k in syms) {
    res = res.replace(new RegExp(k, 'g'), syms[k]);
  }

  // Replace basic powers
  res = res.replace(/\^2/g, '²')
           .replace(/\^3/g, '³')
           .replace(/\^0/g, '⁰')
           .replace(/\^1/g, '¹')
           .replace(/\^4/g, '⁴')
           .replace(/\^n/g, 'ⁿ');
           
  // Basic subscript (common in math)
  res = res.replace(/_1/g, '₁')
           .replace(/_2/g, '₂')
           .replace(/_3/g, '₃')
           .replace(/_0/g, '₀')
           .replace(/_n/g, 'ₙ');
  */

  // TẠM BỎ: Không xóa dấu $ để MathType nhận diện được
  // res = res.replace(/\$\$/g, '').replace(/\$/g, '');
  
  // Remove \{ and \}
  // TẠM BỎ cho MathType: res = res.replace(/\\\{/g, '{').replace(/\\\}/g, '}');

  return res.trim();
}
