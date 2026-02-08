import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose'
})

const Mermaid = ({ chart, theme }) => {
  const ref = useRef(null)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default'
    })
  }, [theme])

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return

      try {
        setError(null)
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaid.render(id, chart)
        setSvg(svg)
      } catch (err) {
        console.error('Mermaid render error:', err)
        setError('Invalid Mermaid syntax')
      }
    }

    renderChart()
  }, [chart, theme])

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 text-red-600 rounded text-sm font-mono">
        {error}
        <pre className="mt-2 text-xs opacity-75">{chart}</pre>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className="mermaid-container my-4 flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export default Mermaid
