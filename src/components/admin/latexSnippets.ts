import { CURSOR_TOKEN } from '@/utils/mathText';

export interface LatexSnippet {
  /** Tên hiển thị khi rê chuột, cũng là từ khoá tìm kiếm chính */
  label: string;
  /** Mẫu LaTeX chèn vào, dùng CURSOR_TOKEN để đánh dấu chỗ đặt con trỏ */
  latex: string;
  /**
   * LaTeX dùng để vẽ hình xem trước trên nút.
   * Bỏ trống thì lấy `latex` sau khi xoá CURSOR_TOKEN.
   */
  preview?: string;
  /** Từ khoá phụ không dấu, giúp tìm kiếm dễ hơn */
  keywords?: string;
}

export interface LatexCategory {
  id: string;
  label: string;
  /** Số cột hiển thị trong lưới - ký hiệu ngắn thì để nhiều cột */
  columns: number;
  items: LatexSnippet[];
}

const C = CURSOR_TOKEN;

export const LATEX_CATEGORIES: LatexCategory[] = [
  {
    id: 'fraction',
    label: 'Phân số & Căn',
    columns: 4,
    items: [
      { label: 'Phân số', latex: `\\frac{${C}}{}`, preview: '\\frac{a}{b}', keywords: 'frac chia' },
      { label: 'Phân số lớn', latex: `\\dfrac{${C}}{}`, preview: '\\dfrac{a}{b}', keywords: 'dfrac' },
      { label: 'Căn bậc hai', latex: `\\sqrt{${C}}`, preview: '\\sqrt{a}', keywords: 'sqrt can' },
      { label: 'Căn bậc n', latex: `\\sqrt[n]{${C}}`, preview: '\\sqrt[n]{a}', keywords: 'sqrt can bac n' },
      { label: 'Trị tuyệt đối', latex: `\\left| ${C} \\right|`, preview: '\\left| a \\right|', keywords: 'tri tuyet doi abs' },
      { label: 'Ngoặc tròn lớn', latex: `\\left( ${C} \\right)`, preview: '\\left( a \\right)', keywords: 'ngoac tron' },
      { label: 'Ngoặc vuông lớn', latex: `\\left[ ${C} \\right]`, preview: '\\left[ a \\right]', keywords: 'ngoac vuong' },
      { label: 'Phần trăm', latex: `${C}\\%`, preview: '\\%', keywords: 'phan tram percent' },
    ],
  },
  {
    id: 'power',
    label: 'Lũy thừa & Chỉ số',
    columns: 4,
    items: [
      { label: 'Lũy thừa', latex: `^{${C}}`, preview: 'x^{n}', keywords: 'luy thua mu power' },
      { label: 'Chỉ số dưới', latex: `_{${C}}`, preview: 'x_{n}', keywords: 'chi so duoi subscript' },
      { label: 'Vừa mũ vừa chỉ số', latex: `_{${C}}^{}`, preview: 'x_{i}^{n}', keywords: 'mu chi so' },
      { label: 'Bình phương', latex: `^{2}${C}`, preview: 'x^{2}', keywords: 'binh phuong' },
      { label: 'Lập phương', latex: `^{3}${C}`, preview: 'x^{3}', keywords: 'lap phuong' },
      { label: 'e mũ', latex: `e^{${C}}`, preview: 'e^{x}', keywords: 'e mu exp' },
      { label: 'Lô-ga-rit', latex: `\\log_{${C}}`, preview: '\\log_{a}', keywords: 'log logarit' },
      { label: 'Lô-ga-rit tự nhiên', latex: `\\ln ${C}`, preview: '\\ln x', keywords: 'ln logarit tu nhien' },
    ],
  },
  {
    id: 'greek',
    label: 'Chữ Hy Lạp',
    columns: 6,
    items: [
      { label: 'alpha', latex: '\\alpha', keywords: 'alpha' },
      { label: 'beta', latex: '\\beta', keywords: 'beta' },
      { label: 'gamma', latex: '\\gamma', keywords: 'gamma' },
      { label: 'delta', latex: '\\delta', keywords: 'delta' },
      { label: 'epsilon', latex: '\\varepsilon', keywords: 'epsilon' },
      { label: 'theta', latex: '\\theta', keywords: 'theta' },
      { label: 'lambda', latex: '\\lambda', keywords: 'lambda' },
      { label: 'mu', latex: '\\mu', keywords: 'mu' },
      { label: 'pi', latex: '\\pi', keywords: 'pi' },
      { label: 'rho', latex: '\\rho', keywords: 'rho' },
      { label: 'sigma', latex: '\\sigma', keywords: 'sigma' },
      { label: 'phi', latex: '\\varphi', keywords: 'phi' },
      { label: 'omega', latex: '\\omega', keywords: 'omega' },
      { label: 'Delta hoa', latex: '\\Delta', keywords: 'delta hoa' },
      { label: 'Sigma hoa', latex: '\\Sigma', keywords: 'sigma hoa' },
      { label: 'Omega hoa', latex: '\\Omega', keywords: 'omega hoa' },
    ],
  },
  {
    id: 'operator',
    label: 'Toán tử & So sánh',
    columns: 6,
    items: [
      { label: 'Nhân', latex: '\\times', keywords: 'nhan times' },
      { label: 'Chia', latex: '\\div', keywords: 'chia div' },
      { label: 'Cộng trừ', latex: '\\pm', keywords: 'cong tru plus minus' },
      { label: 'Trừ cộng', latex: '\\mp', keywords: 'tru cong' },
      { label: 'Khác', latex: '\\neq', keywords: 'khac not equal' },
      { label: 'Nhỏ hơn hoặc bằng', latex: '\\leq', keywords: 'nho hon hoac bang' },
      { label: 'Lớn hơn hoặc bằng', latex: '\\geq', keywords: 'lon hon hoac bang' },
      { label: 'Xấp xỉ', latex: '\\approx', keywords: 'xap xi approx' },
      { label: 'Thuộc', latex: '\\in', keywords: 'thuoc in' },
      { label: 'Không thuộc', latex: '\\notin', keywords: 'khong thuoc' },
      { label: 'Tập con', latex: '\\subset', keywords: 'tap con subset' },
      { label: 'Hợp', latex: '\\cup', keywords: 'hop union' },
      { label: 'Giao', latex: '\\cap', keywords: 'giao intersect' },
      { label: 'Tập rỗng', latex: '\\varnothing', keywords: 'tap rong empty' },
      { label: 'Suy ra', latex: '\\Rightarrow', keywords: 'suy ra implies' },
      { label: 'Tương đương', latex: '\\Leftrightarrow', keywords: 'tuong duong iff' },
      { label: 'Mũi tên', latex: '\\to', keywords: 'mui ten arrow' },
      { label: 'Với mọi', latex: '\\forall', keywords: 'voi moi forall' },
      { label: 'Tồn tại', latex: '\\exists', keywords: 'ton tai exists' },
      { label: 'Vô cực', latex: '\\infty', keywords: 'vo cuc infinity' },
      { label: 'Độ', latex: '^{\\circ}', preview: '90^{\\circ}', keywords: 'do degree' },
      { label: 'Góc', latex: `\\widehat{${C}}`, preview: '\\widehat{ABC}', keywords: 'goc angle' },
      { label: 'Song song', latex: '\\parallel', keywords: 'song song parallel' },
      { label: 'Vuông góc', latex: '\\perp', keywords: 'vuong goc perp' },
    ],
  },
  {
    id: 'calculus',
    label: 'Tích phân & Giới hạn',
    columns: 3,
    items: [
      { label: 'Tích phân', latex: `\\int ${C}\\,dx`, preview: '\\int f(x)\\,dx', keywords: 'tich phan integral' },
      { label: 'Tích phân xác định', latex: `\\int_{a}^{b} ${C}\\,dx`, preview: '\\int_{a}^{b} f(x)\\,dx', keywords: 'tich phan xac dinh' },
      { label: 'Tổng Sigma', latex: `\\sum_{i=1}^{n} ${C}`, preview: '\\sum_{i=1}^{n} a_i', keywords: 'tong sum sigma' },
      { label: 'Tích', latex: `\\prod_{i=1}^{n} ${C}`, preview: '\\prod_{i=1}^{n} a_i', keywords: 'tich product' },
      { label: 'Giới hạn', latex: `\\lim_{x \\to ${C}}`, preview: '\\lim_{x \\to a}', keywords: 'gioi han limit' },
      { label: 'Giới hạn vô cực', latex: `\\lim_{x \\to +\\infty} ${C}`, preview: '\\lim_{x \\to +\\infty}', keywords: 'gioi han vo cuc' },
      { label: 'Đạo hàm', latex: `${C}'`, preview: "f'(x)", keywords: 'dao ham derivative' },
      { label: 'Đạo hàm cấp hai', latex: `${C}''`, preview: "f''(x)", keywords: 'dao ham cap hai' },
      { label: 'Đạo hàm dy/dx', latex: `\\dfrac{d${C}}{dx}`, preview: '\\dfrac{dy}{dx}', keywords: 'dao ham dy dx' },
    ],
  },
  {
    id: 'structure',
    label: 'Hệ & Ma trận',
    columns: 3,
    items: [
      { label: 'Hệ phương trình', latex: `\\begin{cases} ${C} \\\\  \\end{cases}`, preview: '\\begin{cases} x+y=1 \\\\ x-y=0 \\end{cases}', keywords: 'he phuong trinh cases' },
      { label: 'Ma trận', latex: `\\begin{bmatrix} ${C} &  \\\\  &  \\end{bmatrix}`, preview: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', keywords: 'ma tran matrix' },
      { label: 'Định thức', latex: `\\begin{vmatrix} ${C} &  \\\\  &  \\end{vmatrix}`, preview: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', keywords: 'dinh thuc determinant' },
      { label: 'Vectơ', latex: `\\vec{${C}}`, preview: '\\vec{u}', keywords: 'vecto vector' },
      { label: 'Vectơ AB', latex: `\\overrightarrow{${C}}`, preview: '\\overrightarrow{AB}', keywords: 'vecto ab' },
      { label: 'Gạch trên', latex: `\\overline{${C}}`, preview: '\\overline{AB}', keywords: 'gach tren overline' },
    ],
  },
];
