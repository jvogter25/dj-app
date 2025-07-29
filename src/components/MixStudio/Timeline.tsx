import React, { useRef, useEffect, useState, useCallback } from 'react'
import { MixProject, Track, AudioClip } from '../../types/mixStudio'
import { Volume2, VolumeX, Headphones, Plus } from 'lucide-react'

interface TimelineProps {
  project: MixProject
  currentTime: number
  zoom: number
  selectedTool: 'select' | 'split' | 'fade'
  isPlaying: boolean
  onTimeUpdate: (time: number) => void
  onClipAdd: (trackId: string, clip: AudioClip) => void
  onClipUpdate: (trackId: string, clipId: string, updates: Partial<AudioClip>) => void
  onClipDelete: (trackId: string, clipId: string) => void
  onTrackUpdate: (trackId: string, updates: Partial<Track>) => void
}

const TRACK_HEIGHT = 80
const RULER_HEIGHT = 30
const PIXELS_PER_SECOND = 20

export const Timeline: React.FC<TimelineProps> = ({
  project,
  currentTime,
  zoom,
  selectedTool,
  isPlaying,
  onTimeUpdate,
  onClipAdd,
  onClipUpdate,
  onClipDelete,
  onTrackUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedClip, setSelectedClip] = useState<{ trackId: string; clipId: string } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, time: 0 })
  
  const pixelsPerSecond = PIXELS_PER_SECOND * zoom
  const totalWidth = project.duration * pixelsPerSecond
  
  // Draw timeline ruler
  const drawRuler = (ctx: CanvasRenderingContext2D, width: number) => {
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(0, 0, width, RULER_HEIGHT)
    
    ctx.strokeStyle = '#4b5563'
    ctx.lineWidth = 1
    
    // Draw time markers
    const secondsPerMarker = zoom < 1 ? 5 : zoom < 2 ? 1 : 0.5
    ctx.fillStyle = '#9ca3af'
    ctx.font = '10px sans-serif'
    
    for (let time = 0; time <= project.duration; time += secondsPerMarker) {
      const x = time * pixelsPerSecond
      ctx.beginPath()
      ctx.moveTo(x, RULER_HEIGHT - 10)
      ctx.lineTo(x, RULER_HEIGHT)
      ctx.stroke()
      
      // Time label
      const minutes = Math.floor(time / 60)
      const seconds = time % 60
      const label = `${minutes}:${seconds.toString().padStart(2, '0')}`
      ctx.fillText(label, x + 2, RULER_HEIGHT - 12)
    }
  }
  
  // Draw grid
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 0.5
    
    // Vertical lines (beat grid)
    const beatsPerBar = 4
    const secondsPerBeat = 60 / project.bpm
    const secondsPerBar = secondsPerBeat * beatsPerBar
    
    for (let time = 0; time <= project.duration; time += secondsPerBar) {
      const x = time * pixelsPerSecond
      ctx.beginPath()
      ctx.moveTo(x, RULER_HEIGHT)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    
    // Horizontal lines (track separators)
    project.tracks.forEach((_, index) => {
      const y = RULER_HEIGHT + (index + 1) * TRACK_HEIGHT
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    })
  }
  
  // Draw audio clip
  const drawClip = (
    ctx: CanvasRenderingContext2D, 
    clip: AudioClip, 
    trackIndex: number,
    isSelected: boolean
  ) => {
    const x = clip.startTime * pixelsPerSecond
    const y = RULER_HEIGHT + trackIndex * TRACK_HEIGHT + 10
    const width = clip.duration * pixelsPerSecond
    const height = TRACK_HEIGHT - 20
    
    // Clip background
    ctx.fillStyle = clip.source.isEditable ? '#7c3aed' : '#6b7280'
    if (isSelected) {
      ctx.fillStyle = '#a78bfa'
    }
    ctx.fillRect(x, y, width, height)
    
    // Clip border
    ctx.strokeStyle = isSelected ? '#ffffff' : '#000000'
    ctx.lineWidth = isSelected ? 2 : 1
    ctx.strokeRect(x, y, width, height)
    
    // Fade handles
    if (clip.fadeIn > 0) {
      const fadeWidth = clip.fadeIn * pixelsPerSecond
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + fadeWidth, y)
      ctx.lineTo(x, y + height)
      ctx.closePath()
      ctx.fill()
    }
    
    if (clip.fadeOut > 0) {
      const fadeWidth = clip.fadeOut * pixelsPerSecond
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.beginPath()
      ctx.moveTo(x + width, y)
      ctx.lineTo(x + width - fadeWidth, y)
      ctx.lineTo(x + width, y + height)
      ctx.closePath()
      ctx.fill()
    }
    
    // Clip info
    ctx.fillStyle = '#ffffff'
    ctx.font = '12px sans-serif'
    ctx.fillText(clip.source.name, x + 5, y + 15)
    ctx.fillStyle = '#e5e7eb'
    ctx.font = '10px sans-serif'
    ctx.fillText(clip.source.artist, x + 5, y + 28)
    
    // Placeholder indicator
    if (!clip.source.isEditable) {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.2)'
      ctx.fillRect(x, y, width, height)
      ctx.fillStyle = '#fbbf24'
      ctx.font = '10px sans-serif'
      ctx.fillText('Replace with local file', x + 5, y + height - 5)
    }
  }
  
  // Draw playhead
  const drawPlayhead = (ctx: CanvasRenderingContext2D, height: number) => {
    const x = currentTime * pixelsPerSecond
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
    
    // Playhead handle
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.moveTo(x - 5, 0)
    ctx.lineTo(x + 5, 0)
    ctx.lineTo(x, 10)
    ctx.closePath()
    ctx.fill()
  }
  
  // Render timeline
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw components
    drawRuler(ctx, canvas.width)
    drawGrid(ctx, canvas.width, canvas.height)
    
    // Draw clips
    project.tracks.forEach((track, trackIndex) => {
      track.clips.forEach(clip => {
        const isSelected = selectedClip?.trackId === track.id && selectedClip?.clipId === clip.id
        drawClip(ctx, clip, trackIndex, isSelected)
      })
    })
    
    // Draw playhead
    drawPlayhead(ctx, canvas.height)
  }, [project, currentTime, zoom, selectedClip, pixelsPerSecond])
  
  // Handle timeline click
  const handleTimelineClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Click on ruler - set playhead
    if (y < RULER_HEIGHT) {
      const newTime = x / pixelsPerSecond
      onTimeUpdate(Math.max(0, Math.min(project.duration, newTime)))
      return
    }
    
    // Click on track - select clip or clear selection
    const trackIndex = Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT)
    if (trackIndex >= 0 && trackIndex < project.tracks.length) {
      const track = project.tracks[trackIndex]
      const clickTime = x / pixelsPerSecond
      
      // Find clicked clip
      const clickedClip = track.clips.find(clip => 
        clickTime >= clip.startTime && clickTime <= clip.startTime + clip.duration
      )
      
      if (clickedClip) {
        setSelectedClip({ trackId: track.id, clipId: clickedClip.id })
      } else {
        setSelectedClip(null)
      }
    }
  }
  
  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    if (y < RULER_HEIGHT) return
    
    const trackIndex = Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT)
    if (trackIndex >= 0 && trackIndex < project.tracks.length) {
      const track = project.tracks[trackIndex]
      const startTime = x / pixelsPerSecond
      
      try {
        const audioSourceData = e.dataTransfer.getData('audio-source')
        if (audioSourceData) {
          const audioSource = JSON.parse(audioSourceData)
          
          // Create new clip
          const newClip: AudioClip = {
            id: crypto.randomUUID(),
            sourceId: audioSource.id,
            source: audioSource,
            startTime: Math.max(0, startTime),
            duration: audioSource.duration,
            trimStart: 0,
            trimEnd: 0,
            fadeIn: 0,
            fadeOut: 0,
            volume: 1,
            effects: []
          }
          
          onClipAdd(track.id, newClip)
        }
      } catch (error) {
        console.error('Error handling drop:', error)
      }
    }
  }
  
  return (
    <div className="flex flex-1 bg-gray-900 overflow-hidden">
      {/* Track Headers */}
      <div className="w-48 bg-gray-800 border-r border-gray-700">
        <div className="h-[30px] bg-gray-800 border-b border-gray-700" />
        {project.tracks.map((track) => (
          <div
            key={track.id}
            className="h-[80px] border-b border-gray-700 p-2 flex flex-col justify-between"
          >
            <input
              type="text"
              value={track.name}
              onChange={(e) => onTrackUpdate(track.id, { name: e.target.value })}
              className="bg-transparent text-sm font-medium focus:outline-none focus:bg-gray-700 px-1 rounded"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => onTrackUpdate(track.id, { isMuted: !track.isMuted })}
                className={`p-1 rounded transition-colors ${
                  track.isMuted ? 'bg-red-600' : 'hover:bg-gray-700'
                }`}
              >
                <VolumeX className="w-3 h-3" />
              </button>
              <button
                onClick={() => onTrackUpdate(track.id, { isSolo: !track.isSolo })}
                className={`p-1 rounded transition-colors ${
                  track.isSolo ? 'bg-yellow-600' : 'hover:bg-gray-700'
                }`}
              >
                <Headphones className="w-3 h-3" />
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={track.volume * 100}
                onChange={(e) => onTrackUpdate(track.id, { volume: parseInt(e.target.value) / 100 })}
                className="w-16 h-1"
              />
            </div>
          </div>
        ))}
        <button
          onClick={() => console.log('Add track')}
          className="w-full p-2 hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Add Track</span>
        </button>
      </div>
      
      {/* Timeline Canvas */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <canvas
          ref={canvasRef}
          width={totalWidth}
          height={RULER_HEIGHT + project.tracks.length * TRACK_HEIGHT}
          onClick={handleTimelineClick}
          className="cursor-pointer"
        />
      </div>
    </div>
  )
}