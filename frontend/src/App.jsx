import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from './components/Sidebar'
import SlideCard from './components/SlideCard'
import AudioPlayer from './components/AudioPlayer'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function SkeletonLoader() {
  return (
    <div style={{ padding: '24px 0' }}>
      <div className="skeleton" style={{ width: 120, height: 24, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: '80%', height: 28, marginBottom: 24 }} />
      <div className="skeleton" style={{ width: '100%', height: 18, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: '90%', height: 18, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: '70%', height: 18, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: '85%', height: 18, marginBottom: 24 }} />
      <div className="skeleton" style={{ width: '100%', height: 60, borderRadius: 8 }} />
    </div>
  )
}

function SlideSkeleton() {
  return (
    <div style={{
      backgroundColor: 'var(--color-background-secondary)',
      borderRadius: 12,
      padding: '24px 28px',
      marginBottom: 16,
    }}>
      <div className="skeleton" style={{ width: 80, height: 20, marginBottom: 16, borderRadius: 4 }} />
      <div className="skeleton" style={{ width: '60%', height: 24, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: '100%', height: 14, marginBottom: 10 }} />
      <div className="skeleton" style={{ width: '90%', height: 14, marginBottom: 10 }} />
      <div className="skeleton" style={{ width: '80%', height: 14 }} />
    </div>
  )
}

export default function App() {
  const [topic, setTopic] = useState('')
  const [slides, setSlides] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [lessonId, setLessonId] = useState(null)
  const eventSourceRef = useRef(null)
  const streamingRef = useRef(false)

  const [lessons, setLessons] = useState(() => {
    const saved = localStorage.getItem('ai-tutor-lessons')
    return saved ? JSON.parse(saved) : []
  })

  const saveLesson = useCallback((lesson) => {
    setLessons(prev => {
      const updated = [lesson, ...prev.filter(l => l.id !== lesson.id)]
      localStorage.setItem('ai-tutor-lessons', JSON.stringify(updated))
      return updated
    })
  }, [])

  // 组件卸载时关闭 SSE
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const handleGenerate = () => {
    if (!topic.trim()) return

    // 关闭上一次的 SSE
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setLoading(true)
    setStreaming(true)
    streamingRef.current = true
    setError(null)
    setSlides([])
    setCurrentIndex(0)
    setLessonId(null)

    const url = `${API_BASE}/api/generate/stream?topic=${encodeURIComponent(topic.trim())}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    let currentTopic = topic.trim()

    es.addEventListener('slide', (e) => {
      const data = JSON.parse(e.data)
      const slide = {
        ...data.slide,
        audio_url: '',
      }
      setSlides(prev => [...prev, slide])
    })

    es.addEventListener('audio', (e) => {
      const data = JSON.parse(e.data)
      // audio_url 现在是 base64 data URL，直接使用
      setSlides(prev => prev.map(s =>
        s.index === data.index ? { ...s, audio_url: data.audio_url } : s
      ))
    })

    es.addEventListener('done', (e) => {
      const data = JSON.parse(e.data)
      setLessonId(data.lesson_id)
      streamingRef.current = false
      setStreaming(false)
      setLoading(false)
      es.close()
      eventSourceRef.current = null

      setSlides(prev => {
        const lesson = {
          id: data.lesson_id,
          topic: currentTopic,
          slides: prev,
          createdAt: new Date().toISOString(),
        }
        saveLesson(lesson)
        return prev
      })
    })

    // 服务端主动发的 error 事件
    es.addEventListener('error', (e) => {
      if (!streamingRef.current) return  // done 之后的忽略
      try {
        const data = JSON.parse(e.data)
        setError(data.message)
      } catch {
        // 非 JSON 的 error 事件（如连接断开），交给 onerror 处理
        return
      }
      streamingRef.current = false
      setStreaming(false)
      setLoading(false)
      es.close()
      eventSourceRef.current = null
    })

    es.onerror = () => {
      if (!streamingRef.current) return  // done 之后的自动重连忽略
      setError('连接中断，请重试')
      streamingRef.current = false
      setStreaming(false)
      setLoading(false)
      es.close()
      eventSourceRef.current = null
    }
  }

  const handleSelectLesson = (lesson) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setSlides(lesson.slides)
    setLessonId(lesson.id)
    setTopic(lesson.topic)
    setCurrentIndex(0)
    setError(null)
    setLoading(false)
    setStreaming(false)
    streamingRef.current = false
  }

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(prev + 1, slides.length - 1))
  }

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0))
  }

  const handleAudioEnded = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const currentSlide = slides && slides.length > 0 ? slides[currentIndex] : null
  const slideCount = slides ? slides.length : 0
  const progress = slideCount > 0 ? ((currentIndex + 1) / slideCount) * 100 : 0

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar onSelect={handleSelectLesson} currentId={lessonId} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '16px 32px',
            borderBottom: '0.5px solid var(--color-border-tertiary)',
            backgroundColor: 'var(--color-background-primary)',
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
            AI 课堂
          </h1>
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px',
            overflowY: 'auto',
          }}
        >
          {/* 输入行 */}
          <div style={{ width: '100%', maxWidth: 720, marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder="输入主题，例如：量子计算入门"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  fontSize: 14,
                  border: '1px solid var(--color-border-tertiary)',
                  borderRadius: 8,
                  outline: 'none',
                  backgroundColor: 'var(--color-background-primary)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <button
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                style={{
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 500,
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: loading || !topic.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !topic.trim() ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {streaming ? `生成中 ${slideCount}/18` : loading ? '连接中...' : '生成课程'}
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div
              style={{
                width: '100%',
                maxWidth: 720,
                padding: '12px 16px',
                backgroundColor: '#fce4ec',
                borderRadius: 8,
                color: '#c62828',
                fontSize: 14,
                marginBottom: 24,
              }}
            >
              {error}
            </div>
          )}

          {/* 流式进度条 */}
          {streaming && (
            <div style={{ width: '100%', maxWidth: 720, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  正在生成课程...
                </span>
                <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                  {slideCount} / 18 页
                </span>
              </div>
              <div style={{ height: 4, backgroundColor: '#e0e0e0', borderRadius: 2 }}>
                <div
                  style={{
                    height: 4,
                    width: `${(slideCount / 18) * 100}%`,
                    backgroundColor: 'var(--color-primary)',
                    borderRadius: 2,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
          )}

          {/* 初始骨架屏（尚未收到任何 slide 时）*/}
          {loading && slideCount === 0 && (
            <div style={{ width: '100%', maxWidth: 720 }}>
              <SkeletonLoader />
            </div>
          )}

          {/* 幻灯片内容 - 流式渐进显示 */}
          {slides && slideCount > 0 && (
            <div style={{ width: '100%', maxWidth: 720 }}>
              {/* 页内导航进度 */}
              {!streaming && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {currentSlide?.title}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                      {currentIndex + 1} / {slideCount}
                    </span>
                  </div>
                  <div style={{ height: 3, backgroundColor: '#e0e0e0', borderRadius: 2 }}>
                    <div
                      style={{
                        height: 3,
                        width: `${progress}%`,
                        backgroundColor: 'var(--color-primary)',
                        borderRadius: 2,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 当前页 SlideCard */}
              {currentSlide && (
                <SlideCard
                  slide={currentSlide}
                  index={currentIndex}
                  total={slideCount}
                />
              )}

              {/* 音频播放器 */}
              {currentSlide?.audio_url && (
                <AudioPlayer
                  audioUrl={currentSlide.audio_url}
                  onEnded={handleAudioEnded}
                />
              )}

              {/* 翻页按钮 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  style={{
                    padding: '10px 24px',
                    fontSize: 14,
                    backgroundColor: 'var(--color-background-secondary)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border-tertiary)',
                    borderRadius: 8,
                    cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentIndex === 0 ? 0.4 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  上一页
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentIndex >= slideCount - 1}
                  style={{
                    padding: '10px 24px',
                    fontSize: 14,
                    fontWeight: 500,
                    backgroundColor: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: currentIndex >= slideCount - 1 ? 'not-allowed' : 'pointer',
                    opacity: currentIndex >= slideCount - 1 ? 0.4 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {streaming && currentIndex >= slideCount - 1 ? '等待更多...' : '下一页'}
                </button>
              </div>
            </div>
          )}

          {/* 空状态 */}
          {!slides && !loading && !error && (
            <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--color-text-tertiary)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}> </div>
              <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                输入主题开始学习
              </div>
              <div style={{ fontSize: 14 }}>
                输入任意主题，AI 将为你生成结构化幻灯片课程
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
