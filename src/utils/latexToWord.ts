export function cleanLatexForWord(str: string): string {
  let res = str;
  if (!res) return res;

  // Xử lý các cặp dấu ngoặc nhọn lồng nhau một cách đơn giản
  // Thay thế phân số đơn giản
  while (res.match(/\\frac\{([^{}]+)\}\{([^{}]+)\}/)) {
    res = res.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (m, a, b) => {
      let num = a.includes('+') || a.includes('-') ? '(' + a + ')' : a;
      let den = b.includes('+') || b.includes('-') ? '(' + b + ')' : b;
      return num + '/' + den;
    });
  }

  // Replace text block
  res = res.replace(/\\text\{([^{}]+)\}/g, '$1');

  // Replace symbols
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

  // Remove math block markers if any are left
  res = res.replace(/\$\$/g, '').replace(/\$/g, '');
  
  // Remove \{ and \}
  res = res.replace(/\\\{/g, '{').replace(/\\\}/g, '}');

  return res.trim();
}
