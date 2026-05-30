import katex from 'katex';
import 'katex/dist/katex.min.css';

export function renderLatex(latex: string): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      output: 'html',
    });
  } catch {
    return latex;
  }
}

export function formatMathText(text: string): string {
  const mathRegex = /\$([^$]+)\$/g;

  return text.replace(mathRegex, (_, latex) => {
    return renderLatex(latex);
  });
}
