import ChartRenderer from './ChartRenderer'

const TAG_MAP = {
  intro: { text: '课程引入', color: '#e3f2fd' },
  background: { text: '知识背景', color: '#f3e5f5' },
  concept: { text: '核心概念', color: '#fce4ec' },
  example: { text: '例题精讲', color: '#fff3e0' },
  mistake: { text: '常见错误', color: '#fff3e0' },
  edge_case: { text: '特殊情况', color: '#e0f7fa' },
  connection: { text: '知识联系', color: '#e8f5e9' },
  practice: { text: '变式练习', color: '#e8eaf6' },
  summary: { text: '课程总结', color: '#e8f5e9' },
  memory: { text: '记忆技巧', color: '#fce4ec' },
  exam: { text: '真题演练', color: '#fbe9e7' },
  closing: { text: '课程结语', color: '#e0f2f1' },
}

// 从 index 估算类型的兼容逻辑（当 slide_type 缺失时）
function getTagFromIndex(index) {
  if (index === 0) return TAG_MAP.intro
  if (index === 1) return TAG_MAP.background
  if (index <= 4) return TAG_MAP.concept
  if (index <= 8) return TAG_MAP.example
  if (index === 9) return TAG_MAP.mistake
  if (index === 10) return TAG_MAP.edge_case
  if (index === 11) return TAG_MAP.connection
  if (index <= 13) return TAG_MAP.practice
  if (index === 14) return TAG_MAP.summary
  if (index === 15) return TAG_MAP.memory
  if (index === 16) return TAG_MAP.exam
  return TAG_MAP.closing
}

export default function SlideCard({ slide, index, total }) {
  const tag = TAG_MAP[slide.slide_type] || getTagFromIndex(index)
  const isExamplePage = slide.slide_type === 'example' || (index >= 5 && index <= 8)

  return (
    <div
      style={{
        backgroundColor: 'var(--color-background-secondary)',
        borderRadius: 12,
        padding: '24px 28px',
        marginBottom: 16,
      }}
    >
      {/* 标签 */}
      <div
        style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: 4,
          backgroundColor: tag.color,
          fontSize: 12,
          color: 'var(--color-text-secondary)',
          marginBottom: 16,
        }}
      >
        {tag.text}
      </div>

      {/* 标题 */}
      <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 16px 0' }}>
        {slide.title}
      </h2>

      {/* 要点列表 */}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {slide.bullets.map((bullet, i) => (
          <li
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: 10,
              fontSize: 14,
              color: 'var(--color-text-primary)',
              lineHeight: 1.6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
                marginTop: 7,
                marginRight: 10,
                flexShrink: 0,
              }}
            />
            {bullet}
          </li>
        ))}
      </ul>

      {/* 图表 */}
      {slide.chart && (
        <div style={{ marginTop: 16 }}>
          <ChartRenderer chart={slide.chart} />
        </div>
      )}

      {/* 例题框 */}
      {isExamplePage && slide.narration && (
        <div
          style={{
            marginTop: 16,
            padding: '16px 20px',
            borderLeft: '3px solid var(--color-primary)',
            backgroundColor: 'var(--color-background-primary)',
            borderRadius: '0 8px 8px 0',
          }}
        >
          <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
            {slide.narration}
          </div>
        </div>
      )}
    </div>
  )
}
