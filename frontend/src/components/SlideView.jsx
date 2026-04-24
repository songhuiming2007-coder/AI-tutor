import { useRef, useState, useEffect, useCallback } from 'react'

export default function SlideView({ slides, currentIndex, onNext, onPrev }) {
  const slide = slides[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === slides.length - 1

  const audioRef = useRef(null)
  const preloadRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // 预加载下一页音频
  const preloadNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      const nextSlide = slides[currentIndex + 1]
      if (nextSlide.audio_url) {
        preloadRef.current = new Audio(nextSlide.audio_url)
      }
    }
  }, [currentIndex, slides])

  // 播放当前页音频
  const playAudio = useCallback(() => {
    if (!slide.audio_url) return

    // 如果已有音频在播放，先暂停
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    const audio = new Audio(slide.audio_url)
    audioRef.current = audio

    audio.play().then(() => {
      setIsPlaying(true)
    }).catch(err => {
      console.error('播放失败:', err)
      setIsPlaying(false)
    })

    audio.onended = () => {
      setIsPlaying(false)
    }
  }, [slide.audio_url])

  // 暂停音频
  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  // 切换播放/暂停
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pauseAudio()
    } else {
      playAudio()
    }
  }, [isPlaying, playAudio, pauseAudio])

  // 翻页时暂停当前音频并预加载下一页
  useEffect(() => {
    pauseAudio()
    preloadNext()
  }, [currentIndex, pauseAudio, preloadNext])

  // 组件卸载时暂停音频
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-between min-h-[80vh] p-8">
      {/* 标题 */}
      <h1 className="text-3xl font-bold text-center mb-8">
        {slide.title}
      </h1>

      {/* 要点列表 */}
      <ul className="list-disc list-inside text-left max-w-2xl mx-auto space-y-3 text-lg">
        {slide.bullets.map((bullet, i) => (
          <li key={i} className="text-gray-700">
            {bullet}
          </li>
        ))}
      </ul>

      {/* 音频控制 */}
      {slide.audio_url && (
        <button
          onClick={togglePlay}
          className="mt-6 px-8 py-3 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center gap-2"
        >
          {isPlaying ? (
            <>
              <span>⏸</span>
              <span>暂停</span>
            </>
          ) : (
            <>
              <span>▶</span>
              <span>播放</span>
            </>
          )}
        </button>
      )}

      {/* 底部控制栏 */}
      <div className="flex items-center gap-8 mt-8">
        <button
          onClick={onPrev}
          disabled={isFirst}
          className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          上一页
        </button>

        <span className="text-gray-500 text-lg">
          {currentIndex + 1} / {slides.length}
        </span>

        <button
          onClick={onNext}
          disabled={isLast}
          className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          下一页
        </button>
      </div>
    </div>
  )
}