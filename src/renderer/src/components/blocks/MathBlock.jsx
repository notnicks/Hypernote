import 'katex/dist/katex.min.css'
import katex from 'katex'
import { useEffect, useRef } from 'react'

export default function MathBlock({ content }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    katex.render(content, containerRef.current, {
      throwOnError: false,
      displayMode: true
    })
  }, [content])

  return (
    <div className="my-4 p-4 rounded bg-slate-50 dark:bg-slate-900 overflow-x-auto text-center">
      <div ref={containerRef} />
    </div>
  )
}
