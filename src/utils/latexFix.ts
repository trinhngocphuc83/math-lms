export function fixLatexExt(text: string | null | undefined) {
    if (!text) return '';
    return text.replace(/\u0009ext/g, '\\text')
               .replace(/\\\u0009ext/g, '\\text')
               .replace(/\\text([WkgCJVAmHzNsK]+)\b/g, '\\text{$1}')
               .replace(/\bext(W|kg|C|J|V|A|m|Hz|N|s|K|g|lít|rad|Pa)\b/g, '\\text{$1}');
}
