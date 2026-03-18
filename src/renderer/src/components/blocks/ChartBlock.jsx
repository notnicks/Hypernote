import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function ChartBlock({ content, theme }) {
  const config = useMemo(() => {
    try {
      return JSON.parse(content)
    } catch (e) {
      console.error('Failed to parse chart block config:', e)
      return { type: 'bar', data: [{ name: 'Error', value: 0 }] }
    }
  }, [content])

  const { type = 'bar', data = [], xKey = 'name', yKeys = ['value'] } = config

  const textColor = theme === 'dark' ? '#cbd5e1' : '#475569'
  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0'

  const renderChart = () => {
    if (type === 'line') {
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey={xKey} stroke={textColor} />
          <YAxis stroke={textColor} />
          <Tooltip
            contentStyle={{
              backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
              borderColor: gridColor,
              color: textColor
            }}
          />
          <Legend />
          {yKeys.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={COLORS[i % COLORS.length]}
              activeDot={{ r: 8 }}
            />
          ))}
        </LineChart>
      )
    }

    if (type === 'pie') {
      return (
        <PieChart>
          <Tooltip
            contentStyle={{
              backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
              borderColor: gridColor,
              color: textColor
            }}
          />
          <Legend />
          <Pie
            data={data}
            nameKey={xKey}
            dataKey={yKeys[0] || 'value'}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      )
    }

    // Default to bar
    return (
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey={xKey} stroke={textColor} />
        <YAxis stroke={textColor} />
        <Tooltip
          contentStyle={{
            backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
            borderColor: gridColor,
            color: textColor
          }}
        />
        <Legend />
        {yKeys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} />
        ))}
      </BarChart>
    )
  }

  return (
    <div
      className={`my-4 p-4 border rounded-lg ${theme === 'dark' ? 'border-slate-800 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}
      style={{ height: '300px' }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}
