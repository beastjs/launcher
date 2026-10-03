import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import typescript from 'shiki/langs/typescript.mjs'
import githubDark from 'shiki/themes/github-dark.mjs'

// Only the TypeScript grammar and one theme enter the browser bundle.
const highlighter = createHighlighterCoreSync({
  langs: [typescript],
  themes: [githubDark],
  engine: createJavaScriptRegexEngine()
})

export function highlightTypeScript(source: string) {
  const { tokens } = highlighter.codeToTokens(source, { lang: 'typescript', theme: 'github-dark' })
  return tokens.flatMap((line, index) => [
    ...line.map(token => ({
      content: token.content,
      style: {
        color: token.color,
        fontStyle: token.fontStyle && token.fontStyle & 1 ? 'italic' : undefined,
        fontWeight: token.fontStyle && token.fontStyle & 2 ? 'bold' : undefined,
        textDecoration: token.fontStyle && token.fontStyle & 4 ? 'underline' : undefined
      }
    })),
    ...(index < tokens.length - 1 ? [{ content: '\n', style: {} }] : [])
  ])
}
