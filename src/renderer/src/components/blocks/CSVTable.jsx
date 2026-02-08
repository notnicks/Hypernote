export default function CSVTable({ data }) {
  if (!data) return null

  const rows = data
    .trim()
    .split('\n')
    .map((row) => row.split(',').map((cell) => cell.trim()))
  const headers = rows[0]
  const body = rows.slice(1)

  return (
    <div className="my-4 overflow-x-auto rounded border dark:border-slate-700">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-xs">
          <tr>
            {headers.map((header, i) => (
              <th key={i} className="px-4 py-2 border-b dark:border-slate-700">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr
              key={i}
              className="border-b last:border-0 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
