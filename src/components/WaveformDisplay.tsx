import React, { useRef, useEffect, useState, useCallback } from 'react'
import { WaveformData } from '../lib/waveformGenerator'

interface WaveformDisplayProps {
  waveformData?: WaveformData | null
  progress?: number // 0-1
  color?: string
  progressColor?: string
  height?: number
  className?: string
  onSeek?: (progress: number) => void
  showPlayhead?: boolean
  markers?: Array<{
    position: number // 0-1
    color: string
    label?: string
  }>
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  waveformData,
  progress = 0,
  color = '#8B5CF6',
  progressColor = '#A78BFA',
  height = 100,
  className = '',
  onSeek,
  showPlayhead = true,
  markers = []
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height })
  const animationFrameRef = useRef<number>(0)
  
  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }
    
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [height])
  
  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !waveformData) return
    
    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)
    
    const peaks = waveformData.peaks
    const barWidth = dimensions.width / peaks[0].length
    const halfHeight = dimensions.height / 2
    
    // Draw waveform bars
    peaks[0].forEach((peak, i) => {
      const x = i * barWidth
      const topPeak = peak * halfHeight * 0.9
      const bottomPeak = peaks[1][i] * halfHeight * 0.9
      
      // Draw unplayed portion
      ctx.fillStyle = color + '40' // 40 = 25% opacity
      ctx.fillRect(x, halfHeight - topPeak, barWidth - 1, topPeak)
      ctx.fillRect(x, halfHeight, barWidth - 1, bottomPeak)
      
      // Draw played portion
      if (progress > 0) {
        const progressX = progress * dimensions.width
        if (x < progressX) {
          ctx.fillStyle = progressColor
          ctx.fillRect(x, halfHeight - topPeak, barWidth - 1, topPeak)
          ctx.fillRect(x, halfHeight, barWidth - 1, bottomPeak)
        }
      }
    })
    
    // Draw center line
    ctx.strokeStyle = color + '20'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, halfHeight)
    ctx.lineTo(dimensions.width, halfHeight)
    ctx.stroke()
    
    // Draw markers
    markers.forEach(marker => {
      const x = marker.position * dimensions.width
      
      ctx.strokeStyle = marker.color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, dimensions.height)
      ctx.stroke()
      
      if (marker.label) {
        ctx.fillStyle = marker.color
        ctx.font = '10px monospace'
        ctx.fillText(marker.label, x + 3, 12)
      }
    })
    
    // Draw playhead
    if (showPlayhead && progress > 0 && progress < 1) {
      const x = progress * dimensions.width
      
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, dimensions.height)
      ctx.stroke()
      
      // Playhead glow effect
      ctx.shadowBlur = 10
      ctx.shadowColor = '#ffffff'
      ctx.strokeStyle = '#ffffff80'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, dimensions.height)
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }, [waveformData, progress, dimensions, color, progressColor, showPlayhead, markers])
  
  // Redraw on changes
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    animationFrameRef.current = requestAnimationFrame(drawWaveform)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [drawWaveform])
  
  // Handle click to seek
  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || !canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const seekProgress = x / rect.width
    
    onSeek(Math.max(0, Math.min(1, seekProgress)))
  }
  
  // Show loading state
  if (!waveformData) {
    return (
      <div 
        ref={containerRef}
        className={`relative bg-gray-800 rounded ${className}`}
        style={{ height }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="animate-pulse">Generating waveform...</div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div 
      ref={containerRef}
      className={`relative bg-gray-900 rounded overflow-hidden ${className}`}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0 cursor-pointer"
        onClick={handleClick}
      />
    </div>
  )
}

// Scrolling waveform for live playback
export const ScrollingWaveform: React.FC<WaveformDisplayProps & {
  visibleDuration?: number // Duration visible in viewport (seconds)
}> = ({
  waveformData,
  progress = 0,
  visibleDuration = 30,
  ...props
}) => {
  const [viewportStart, setViewportStart] = useState(0)
  
  useEffect(() => {
    if (!waveformData) return
    
    const totalDuration = waveformData.duration
    const currentTime = progress * totalDuration
    const halfVisible = visibleDuration / 2
    
    // Center playhead in viewport
    let newStart = currentTime - halfVisible
    newStart = Math.max(0, Math.min(totalDuration - visibleDuration, newStart))
    
    setViewportStart(newStart / totalDuration)
  }, [progress, waveformData, visibleDuration])
  
  if (!waveformData) {
    return <WaveformDisplay waveformData={null} {...props} />
  }
  
  // Extract visible portion of waveform
  const visibleRatio = visibleDuration / waveformData.duration
  const startIndex = Math.floor(viewportStart * waveformData.peaks[0].length)
  const endIndex = Math.ceil((viewportStart + visibleRatio) * waveformData.peaks[0].length)
  
  const visibleWaveform: WaveformData = {
    ...waveformData,
    peaks: [
      waveformData.peaks[0].slice(startIndex, endIndex),
      waveformData.peaks[1].slice(startIndex, endIndex)
    ]
  }
  
  // Adjust progress for visible portion
  const visibleProgress = (progress - viewportStart) / visibleRatio
  
  return (
    <WaveformDisplay
      waveformData={visibleWaveform}
      progress={visibleProgress}
      {...props}
    />
  )
}