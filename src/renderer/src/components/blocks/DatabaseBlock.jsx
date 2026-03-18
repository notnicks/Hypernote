import { useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule, themeAlpine } from 'ag-grid-community'

ModuleRegistry.registerModules([AllCommunityModule])

export default function DatabaseBlock({ content, theme }) {
  const { rowData, columnDefs } = useMemo(() => {
    try {
      // Content should be a JSON array of objects
      const data = JSON.parse(content)
      if (Array.isArray(data) && data.length > 0) {
        const columns = Object.keys(data[0]).map((key) => ({
          field: key,
          sortable: true,
          filter: true,
          flex: 1
        }))
        return { rowData: data, columnDefs: columns }
      }
      return { rowData: [], columnDefs: [] }
    } catch {
      return { rowData: [], columnDefs: [] }
    }
  }, [content])

  return (
    <div
      className="my-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
      style={{ height: '300px', width: '100%' }}
    >
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        theme={theme === 'dark' ? themeAlpine.withPart('color-scheme', 'dark') : themeAlpine}
      />
    </div>
  )
}
