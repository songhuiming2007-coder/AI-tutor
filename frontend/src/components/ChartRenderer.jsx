import { useRef, useEffect } from 'react'
import * as echarts from 'echarts'
import { evaluate } from 'mathjs'

function FunctionPlot({ config }) {
  const chartRef = useRef(null)
  const instanceRef = useRef(null)

  useEffect(() => {
    if (!chartRef.current) return
    const chart = echarts.init(chartRef.current)
    instanceRef.current = chart

    const xMin = config.xRange[0]
    const xMax = config.xRange[1]
    const step = (xMax - xMin) / 100
    const xData = []
    for (let x = xMin; x <= xMax; x += step) {
      xData.push(parseFloat(x.toFixed(4)))
    }

    const series = config.functions.map((fn) => ({
      name: fn.label,
      type: 'line',
      data: xData.map((x) => {
        try {
          return [x, evaluate(fn.expr, { x })]
        } catch {
          return [x, null]
        }
      }),
      lineStyle: { width: 2, color: fn.color },
      itemStyle: { color: fn.color },
      symbol: 'none',
      smooth: true,
    }))

    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: config.functions.map((f) => f.label), top: 4 },
      grid: { left: 50, right: 20, top: 40, bottom: 40 },
      xAxis: {
        type: 'value',
        name: config.xLabel || 'x',
        min: xMin,
        max: xMax,
        splitLine: { lineStyle: { type: 'dashed' } },
      },
      yAxis: {
        type: 'value',
        name: config.yLabel || 'y',
        min: config.yRange ? config.yRange[0] : undefined,
        max: config.yRange ? config.yRange[1] : undefined,
        splitLine: { lineStyle: { type: 'dashed' } },
      },
      series,
    })

    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(chartRef.current)
    return () => {
      ro.disconnect()
      chart.dispose()
    }
  }, [config])

  return <div ref={chartRef} style={{ width: '100%', height: 280 }} />
}

function Geometry({ config }) {
  const chartRef = useRef(null)
  const instanceRef = useRef(null)

  useEffect(() => {
    if (!chartRef.current) return
    const chart = echarts.init(chartRef.current)
    instanceRef.current = chart

    // 计算所有点的范围来确定坐标轴
    const allPoints = []
    config.shapes.forEach((shape) => {
      if (shape.points) allPoints.push(...shape.points)
      if (shape.pos) allPoints.push(shape.pos)
    })

    const xs = allPoints.map((p) => p[0])
    const ys = allPoints.map((p) => p[1])
    const pad = 1

    const customSeries = []
    const markPoints = []

    config.shapes.forEach((shape) => {
      if (shape.kind === 'triangle' || shape.kind === 'polygon') {
        const pts = shape.points.map((p) => [p[0], p[1]])
        // 闭合路径
        if (pts.length > 0) pts.push(pts[0])

        customSeries.push({
          type: 'line',
          data: pts,
          lineStyle: { width: 2, color: shape.color || '#1D9E75' },
          itemStyle: { color: shape.color || '#1D9E75' },
          areaStyle: { color: (shape.color || '#1D9E75') + '20' },
          symbol: 'circle',
          symbolSize: 6,
          z: 2,
        })
      } else if (shape.kind === 'circle') {
        // 用参数方程画圆
        const cx = shape.center[0]
        const cy = shape.center[1]
        const r = shape.radius
        const circleData = []
        for (let i = 0; i <= 100; i++) {
          const angle = (2 * Math.PI * i) / 100
          circleData.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
        }
        customSeries.push({
          type: 'line',
          data: circleData,
          lineStyle: { width: 2, color: shape.color || '#1D9E75' },
          itemStyle: { color: shape.color || '#1D9E75' },
          symbol: 'none',
          z: 2,
        })
      } else if (shape.kind === 'label') {
        markPoints.push({
          name: shape.text,
          coord: shape.pos,
          value: shape.text,
          symbol: 'pin',
          symbolSize: 0,
          label: {
            show: true,
            formatter: shape.text,
            fontSize: 13,
            color: '#333',
            position: 'top',
          },
        })
      }
    })

    // 在第一个 series 上挂 markPoints
    if (customSeries.length > 0 && markPoints.length > 0) {
      customSeries[0].markPoint = { data: markPoints }
    }

    chart.setOption({
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: 'value',
        min: Math.min(...xs) - pad,
        max: Math.max(...xs) + pad,
        splitLine: { lineStyle: { type: 'dashed' } },
      },
      yAxis: {
        type: 'value',
        min: Math.min(...ys) - pad,
        max: Math.max(...ys) + pad,
        splitLine: { lineStyle: { type: 'dashed' } },
      },
      series: customSeries,
    })

    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(chartRef.current)
    return () => {
      ro.disconnect()
      chart.dispose()
    }
  }, [config])

  return <div ref={chartRef} style={{ width: '100%', height: 280 }} />
}

function BarChart({ config }) {
  const chartRef = useRef(null)

  useEffect(() => {
    if (!chartRef.current) return
    const chart = echarts.init(chartRef.current)

    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: config.series.map((s) => s.name), top: 4 },
      grid: { left: 50, right: 20, top: 40, bottom: 40 },
      xAxis: {
        type: 'category',
        data: config.categories,
        name: config.xLabel || '',
      },
      yAxis: {
        type: 'value',
        name: config.yLabel || '',
      },
      series: config.series.map((s) => ({
        name: s.name,
        type: 'bar',
        data: s.data,
        itemStyle: { color: s.color || '#1D9E75', borderRadius: [4, 4, 0, 0] },
      })),
    })

    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(chartRef.current)
    return () => {
      ro.disconnect()
      chart.dispose()
    }
  }, [config])

  return <div ref={chartRef} style={{ width: '100%', height: 280 }} />
}

function NumberLine({ config }) {
  const { min, max, points = [], highlight = [] } = config
  const width = 600
  const height = 120
  const padding = 40
  const lineY = 60
  const usable = width - 2 * padding

  const toX = (val) => padding + ((val - min) / (max - min)) * usable

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', margin: '0 auto' }}>
      {/* 主线 */}
      <line x1={padding} y1={lineY} x2={width - padding} y2={lineY} stroke="#333" strokeWidth={2} />
      {/* 箭头 */}
      <polygon points={`${width - padding},${lineY - 5} ${width - padding},${lineY + 5} ${width - padding + 8},${lineY}`} fill="#333" />
      <polygon points={`${padding},${lineY - 5} ${padding},${lineY + 5} ${padding - 8},${lineY}`} fill="#333" />

      {/* 高亮区间 */}
      {highlight.map(([lo, hi], i) => (
        <rect
          key={i}
          x={toX(lo)}
          y={lineY - 6}
          width={toX(hi) - toX(lo)}
          height={12}
          rx={6}
          fill="#1D9E7530"
          stroke="#1D9E75"
          strokeWidth={1}
        />
      ))}

      {/* 刻度点 */}
      {points.map((pt, i) => {
        const x = toX(pt.value)
        return (
          <g key={i}>
            {pt.open ? (
              <circle cx={x} cy={lineY} r={6} fill="white" stroke="#1D9E75" strokeWidth={2} />
            ) : (
              <circle cx={x} cy={lineY} r={6} fill="#1D9E75" />
            )}
            <text x={x} y={lineY + 24} textAnchor="middle" fontSize={12} fill="#666">
              {pt.label || pt.value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function StepsDiagram({ config }) {
  const steps = (config.steps || []).slice(0, 6)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '16px 0' }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: i === steps.length - 1 ? '#1D9E75' : '#f8f9fa',
              color: i === steps.length - 1 ? '#fff' : 'var(--color-text-primary)',
              border: '1px solid',
              borderColor: i === steps.length - 1 ? '#1D9E75' : 'var(--color-border-tertiary)',
              borderRadius: 8,
              fontSize: 13,
              maxWidth: 400,
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontWeight: 600, marginRight: 6 }}>步骤 {i + 1}</span>
            {step}
          </div>
          {i < steps.length - 1 && (
            <svg width="20" height="24" viewBox="0 0 20 24" style={{ margin: '4px 0' }}>
              <line x1="10" y1="0" x2="10" y2="16" stroke="#1D9E75" strokeWidth={2} />
              <polygon points="4,16 10,22 16,16" fill="#1D9E75" />
            </svg>
          )}
        </div>
      ))}
    </div>
  )
}

export default function ChartRenderer({ chart }) {
  if (!chart) return null

  const { type, config } = chart

  switch (type) {
    case 'function_plot':
      return <FunctionPlot config={config} />
    case 'geometry':
      return <Geometry config={config} />
    case 'bar_chart':
      return <BarChart config={config} />
    case 'number_line':
      return <NumberLine config={config} />
    case 'steps_diagram':
      return <StepsDiagram config={config} />
    default:
      return null
  }
}
