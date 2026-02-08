import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function CodeBlock({ language, code, theme }) {
  return (
    <div className="my-4 rounded overflow-hidden text-sm">
      <div className="bg-slate-200 dark:bg-slate-700 px-4 py-1 text-xs font-mono opacity-70 uppercase tracking-wider">
        {language || 'text'}
      </div>
      <SyntaxHighlighter
        language={language}
        style={theme === 'dark' ? vscDarkPlus : coy}
        customStyle={{ margin: 0, borderRadius: 0 }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
