import { useRef, useState, useEffect, useCallback } from 'react'

export default function AudioPlayer({ audioUrl, onEnded }) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!audioUrl) return

    const audio = new Audio(audioUrl)
    audioRef.current = audio

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration)
    })

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
    })

    audio.addEventListener('ended', () => {
      setIsPlaying(false)
      setCurrentTime(0)
      if (onEnded) onEnded()
    })

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', () => {})
      audio.removeEventListener('timeupdate', () => {})
      audio.removeEventListener('ended', () => {})
    }
  }, [audioUrl, onEnded])

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true)
      }).catch(console.error)
    }
  }, [isPlaying])

  const handleSeek = useCallback((e) => {
    if (!audioRef.current) return
    const time = parseFloat(e.target.value)
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }, [])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (!audioUrl) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0' }}>
      {/* 播放/暂停按钮 */}
      <button
        onClick={togglePlay}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          backgroundColor: '#4caf50',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
            <path d="M4 2L14 8L4 14V2Z" />
          </svg>
        )}
      </button>

      {/* 时间显示 */}
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', minWidth: 35, textAlign: 'right' }}>
        {formatTime(currentTime)}
      </div>

      {/* 进度条 */}
      <div style={{ flex: 1, position: 'relative', height: 4 }}>
        {/* 背景轨道 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: '#e0e0e0',
            borderRadius: 2,
          }}
        />
        {/* 已播放部分 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${progress}%`,
            height: 4,
            backgroundColor: '#4caf50',
            borderRadius: 2,
            transition: 'width 0.1s linear',
          }}
        />
        {/* 滑块 */}
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          style={{
            position: 'absolute',
            top: -4,
            left: 0,
            width: '100%',
            height: 12,
            opacity: 0,
            cursor: 'pointer',
          }}
        />
      </div>

      {/* 总时长 */}
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', minWidth: 35 }}>
        {formatTime(duration)}
      </div>
    </div>
  )
}