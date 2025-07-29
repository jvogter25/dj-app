import React, { useRef, useEffect, useState, useCallback } from 'react'
import { MixProject, Track, AudioClip } from '../../types/mixStudio'
import { Volume2, VolumeX, Headphones, Plus, Trash2, Scissors } from 'lucide-react'

// Extended AudioClip type with color
interface AudioClipWithColor extends AudioClip {
  color?: string
}

interface TimelineProps {
  project: MixProject
  currentTime: number
  zoom: number
  selectedTool: 'select' | 'split' | 'fade'
  isPlaying: boolean
  onTimeUpdate: (time: number) => void
  onClipAdd: (trackId: string, clip: AudioClipWithColor) => void
  onClipUpdate: (trackId: string, clipId: string, updates: Partial<AudioClipWithColor>) => void
  onClipDelete: (trackId: string, clipId: string) => void
  onTrackUpdate: (trackId: string, updates: Partial<Track>) => void
}

const TRACK_HEIGHT = 80
const RULER_HEIGHT = 30
const PIXELS_PER_SECOND = 20
const SNAP_THRESHOLD = 10 // pixels

export const EnhancedTimeline: React.FC<TimelineProps> = ({
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
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; width: number; trackIndex: number } | null>(null)
  const [isDraggingClip, setIsDraggingClip] = useState(false)
  const [clipDragInfo, setClipDragInfo] = useState<{ clip: AudioClipWithColor; trackId: string; offsetX: number } | null>(null)
  
  const pixelsPerSecond = PIXELS_PER_SECOND * zoom
  const totalWidth = Math.max(project.duration * pixelsPerSecond, containerRef.current?.clientWidth || 0)
  
  // Snap to grid
  const snapToGrid = useCallback((time: number) => {
    const gridSize = 60 / project.bpm // 1 beat in seconds
    return Math.round(time / gridSize) * gridSize
  }, [project.bpm])
  
  // Draw timeline components (same as original)
  const drawRuler = useCallback((ctx: CanvasRenderingContext2D, width: number) => {
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(0, 0, width, RULER_HEIGHT)
    
    ctx.strokeStyle = '#4b5563'
    ctx.lineWidth = 1
    
    const secondsPerMarker = zoom < 1 ? 5 : zoom < 2 ? 1 : 0.5
    ctx.fillStyle = '#9ca3af'
    ctx.font = '10px sans-serif'
    
    for (let time = 0; time <= project.duration; time += secondsPerMarker) {
      const x = time * pixelsPerSecond
      ctx.beginPath()
      ctx.moveTo(x, RULER_HEIGHT - 10)
      ctx.lineTo(x, RULER_HEIGHT)
      ctx.stroke()
      
      const minutes = Math.floor(time / 60)
      const seconds = time % 60
      const label = `${minutes}:${seconds.toString().padStart(2, '0')}`
      ctx.fillText(label, x + 2, RULER_HEIGHT - 12)
    }
  }, [pixelsPerSecond, project.duration, zoom])
  
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 0.5
    
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
    
    project.tracks.forEach((_, index) => {
      const y = RULER_HEIGHT + (index + 1) * TRACK_HEIGHT
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    })
  }, [pixelsPerSecond, project])
  
  const getClipColor = (clip: AudioClipWithColor) => {
    // Use color if available, otherwise determine by source type
    if (clip.color) return clip.color
    if (!clip.source.isEditable) return '#6b7280' // Gray for non-editable
    return '#7c3aed' // Purple default
  }
  
  const drawClip = useCallback((
    ctx: CanvasRenderingContext2D, 
    clip: AudioClipWithColor, 
    trackIndex: number,
    isSelected: boolean,
    isDragging: boolean = false
  ) => {
    const x = clip.startTime * pixelsPerSecond
    const y = RULER_HEIGHT + trackIndex * TRACK_HEIGHT + 10
    const width = clip.duration * pixelsPerSecond
    const height = TRACK_HEIGHT - 20
    
    // Clip background with transparency when dragging
    ctx.fillStyle = getClipColor(clip)
    if (isDragging) {
      ctx.globalAlpha = 0.5
    }
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
    
    ctx.globalAlpha = 1
    
    // Clip info
    ctx.fillStyle = '#ffffff'
    ctx.font = '12px sans-serif'
    const clipName = (clip as any).name || clip.source?.name || 'Untitled'
    ctx.fillText(clipName, x + 5, y + 20)
    
    // Duration
    const duration = clip.duration
    const mins = Math.floor(duration / 60)
    const secs = Math.floor(duration % 60)
    ctx.fillStyle = '#e5e7eb'
    ctx.font = '10px sans-serif'
    ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, x + 5, y + height - 5)
  }, [pixelsPerSecond])
  
  const drawPlayhead = useCallback((ctx: CanvasRenderingContext2D, height: number) => {
    const x = currentTime * pixelsPerSecond
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
    
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.moveTo(x - 5, 0)
    ctx.lineTo(x + 5, 0)
    ctx.lineTo(x, 10)
    ctx.closePath()
    ctx.fill()
  }, [currentTime, pixelsPerSecond])
  
  // Render timeline
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    drawRuler(ctx, canvas.width)
    drawGrid(ctx, canvas.width, canvas.height)
    
    // Draw clips
    project.tracks.forEach((track, trackIndex) => {
      track.clips.forEach(clip => {
        const isSelected = selectedClip?.trackId === track.id && selectedClip?.clipId === clip.id
        const isDragging = clipDragInfo?.clip.id === clip.id
        if (!isDragging) {
          drawClip(ctx, clip as AudioClipWithColor, trackIndex, isSelected)
        }
      })
    })
    
    // Draw drag preview
    if (dragPreview) {
      ctx.fillStyle = 'rgba(139, 92, 246, 0.3)'
      ctx.strokeStyle = '#8B5CF6'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      
      const y = RULER_HEIGHT + dragPreview.trackIndex * TRACK_HEIGHT + 10
      ctx.fillRect(dragPreview.x, y, dragPreview.width, TRACK_HEIGHT - 20)
      ctx.strokeRect(dragPreview.x, y, dragPreview.width, TRACK_HEIGHT - 20)
      ctx.setLineDash([])
    }
    
    // Draw dragging clip
    if (clipDragInfo && isDraggingClip) {
      const trackIndex = project.tracks.findIndex(t => t.id === clipDragInfo.trackId)
      if (trackIndex !== -1) {
        drawClip(ctx, clipDragInfo.clip, trackIndex, true, true)
      }
    }
    
    drawPlayhead(ctx, canvas.height)
  }, [project, currentTime, zoom, selectedClip, dragPreview, clipDragInfo, isDraggingClip, drawRuler, drawGrid, drawClip, drawPlayhead])
  
  // Handle drag over from AudioSourceBrowser
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    if (y < RULER_HEIGHT) {
      setDragPreview(null)
      return
    }
    
    const trackIndex = Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT)
    if (trackIndex >= 0 && trackIndex < project.tracks.length) {
      const audioSourceData = e.dataTransfer.types.includes('audio-source')
      if (audioSourceData) {
        const time = snapToGrid(x / pixelsPerSecond)
        setDragPreview({
          x: time * pixelsPerSecond,
          y: 0,
          width: 100, // Default width, will be updated when we have the actual duration
          trackIndex
        })
      }
    }
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) {
      setDragPreview(null)
    }
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragPreview(null)
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    if (y < RULER_HEIGHT) return
    
    const trackIndex = Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT)
    if (trackIndex >= 0 && trackIndex < project.tracks.length) {
      const track = project.tracks[trackIndex]
      const startTime = snapToGrid(x / pixelsPerSecond)
      
      try {
        const audioSourceData = e.dataTransfer.getData('audio-source')
        if (audioSourceData) {
          const audioSource = JSON.parse(audioSourceData)
          
          const newClip: AudioClipWithColor = {
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
            effects: [],
            color: getRandomColor()
          }
          
          onClipAdd(track.id, newClip)
        }
      } catch (error) {
        console.error('Error handling drop:', error)
      }
    }
  }
  
  // Handle timeline interactions
  const handleMouseDown = (e: React.MouseEvent) => {
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
    
    // Click on track
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
        
        // Start dragging
        if (selectedTool === 'select') {
          setIsDraggingClip(true)
          setClipDragInfo({
            clip: clickedClip as AudioClipWithColor,
            trackId: track.id,
            offsetX: x - (clickedClip.startTime * pixelsPerSecond)
          })
        }
      } else {
        setSelectedClip(null)
      }
    }
  }
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingClip || !clipDragInfo) return
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const newStartTime = snapToGrid((x - clipDragInfo.offsetX) / pixelsPerSecond)
    
    onClipUpdate(clipDragInfo.trackId, clipDragInfo.clip.id, {
      startTime: Math.max(0, newStartTime)
    })
  }
  
  const handleMouseUp = () => {
    setIsDraggingClip(false)
    setClipDragInfo(null)
  }
  
  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedClip && e.key === 'Delete') {
      onClipDelete(selectedClip.trackId, selectedClip.clipId)
      setSelectedClip(null)
    }
  }
  
  const getRandomColor = () => {
    const colors = [
      '#8B5CF6', // Purple
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#EC4899', // Pink
      '#14B8A6', // Teal
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }
  
  return (
    <div className="flex flex-1 bg-gray-900 overflow-hidden" onKeyDown={handleKeyDown} tabIndex={0}>
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
                title={track.isMuted ? 'Unmute' : 'Mute'}
              >
                <VolumeX className="w-3 h-3" />
              </button>
              <button
                onClick={() => onTrackUpdate(track.id, { isSolo: !track.isSolo })}
                className={`p-1 rounded transition-colors ${
                  track.isSolo ? 'bg-yellow-600' : 'hover:bg-gray-700'
                }`}
                title={track.isSolo ? 'Unsolo' : 'Solo'}
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
                title="Volume"
              />
            </div>
          </div>
        ))}
        <button
          className="w-full p-2 hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          onClick={() => {
            const newTrack: Track = {
              id: crypto.randomUUID(),
              name: `Track ${project.tracks.length + 1}`,
              clips: [],
              volume: 0.75,
              pan: 0,
              isMuted: false,
              isSolo: false,
              effects: []
            }
            // This would need to be handled by parent component
            console.log('Add track:', newTrack)
          }}
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
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          width={totalWidth}
          height={RULER_HEIGHT + project.tracks.length * TRACK_HEIGHT}
          className="cursor-pointer"
          style={{ cursor: isDraggingClip ? 'grabbing' : 'grab' }}
        />
        
        {/* Selected clip actions */}
        {selectedClip && (
          <div className="absolute top-2 right-2 bg-gray-800 rounded-lg p-2 flex gap-2">
            <button
              onClick={() => {
                onClipDelete(selectedClip.trackId, selectedClip.clipId)
                setSelectedClip(null)
              }}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Delete Clip"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Split Clip"
            >
              <Scissors className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}