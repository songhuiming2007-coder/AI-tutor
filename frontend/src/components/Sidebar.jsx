import { useState, useEffect } from 'react'

export default function Sidebar({ onSelect, currentId }) {
  const [lessons, setLessons] = useState([])

  useEffect(() => {
    const saved = localStorage.getItem('ai-tutor-lessons')
    if (saved) {
      setLessons(JSON.parse(saved))
    }
  }, [])

  const handleClick = (lesson) => {
    onSelect(lesson)
  }

  return (
    <div
      style={{
        width: 260,
        minHeight: '100vh',
        backgroundColor: 'var(--color-background-primary)',
        borderRight: '0.5px solid var(--color-border-tertiary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo 区 */}
      <div
        style={{
          padding: '20px 16px',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          AI 课堂
        </div>
      </div>

      {/* 课程历史列表 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {lessons.length === 0 ? (
          <div style={{ padding: '16px', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            暂无课程记录
          </div>
        ) : (
          lessons.map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => handleClick(lesson)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: currentId === lesson.id ? 'var(--color-background-secondary)' : 'transparent',
                borderRight: currentId === lesson.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (currentId !== lesson.id) {
                  e.currentTarget.style.backgroundColor = 'var(--color-background-secondary)'
                }
              }}
              onMouseLeave={(e) => {
                if (currentId !== lesson.id) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              <div style={{ fontSize: 14, color: 'var(--color-text-primary)', fontWeight: 500 }}>
                {lesson.topic}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                {lesson.slides.length}页 · {new Date(lesson.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}