interface PrismLike {
  languages: Record<string, unknown>
  highlight(code: string, grammar: unknown, language: string): string
}

interface KatexLike {
  renderToString(input: string, options: { throwOnError: boolean; displayMode?: boolean }): string
}

interface OptionalRenderGlobals {
  Prism?: PrismLike
  katex?: KatexLike
}

const globals = globalThis as OptionalRenderGlobals

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function renderMarkdown(markdown: string): string {
  if (!markdown) return ''

  const codeBlocks: string[] = []
  let text = markdown.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang: string, code: string) => {
    const html = renderCodeBlock(code, lang)
    codeBlocks.push(html)
    return `@@CODE_BLOCK_${codeBlocks.length - 1}@@`
  })

  text = escapeHtml(text)
  text = renderLatex(text)
  text = text
    .replace(/`([^`]+)`/g, '<code class="inline">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^### (.*)$/gm, '<h4>$1</h4>')
    .replace(/^## (.*)$/gm, '<h3>$1</h3>')
    .replace(/^\s*[-*•]\s+(.*)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')

  return text.replace(/@@CODE_BLOCK_(\d+)@@/g, (_match, index: string) => codeBlocks[Number(index)] ?? '')
}

function renderCodeBlock(code: string, lang: string): string {
  const language = lang || 'text'
  if (language === 'mermaid') {
    return `<pre class="mermaid">${escapeHtml(code)}</pre>`
  }

  const grammar = globals.Prism?.languages[language]
  const highlighted = globals.Prism && grammar
    ? globals.Prism.highlight(code, grammar, language)
    : escapeHtml(code)

  return `<pre class="code-block language-${language}"><code>${highlighted}</code></pre>`
}

function renderLatex(text: string): string {
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_match, formula: string) => renderFormula(formula, true))
    .replace(/\$([^$\n]+?)\$/g, (_match, formula: string) => renderFormula(formula, false))
}

function renderFormula(formula: string, displayMode: boolean): string {
  if (!globals.katex) {
    return displayMode
      ? `<div class="latex-fallback">${escapeHtml(formula)}</div>`
      : `<span class="latex-fallback">${escapeHtml(formula)}</span>`
  }
  return globals.katex.renderToString(formula, { throwOnError: false, displayMode })
}
