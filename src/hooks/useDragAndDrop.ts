import { useState, useCallback, useRef } from 'react'
import { AudioSource, AudioClip } from '../types/mixStudio'

interface DragState {
  isDragging: boolean
  draggedItem: AudioSource | null
  dropTarget: { trackId: string; time: number } | null
  dragPreview: { x: number; y: number; width: number } | null
}

interface UseDragAndDropOptions {
  pixelsPerSecond: number
  snapToGrid?: boolean
  gridSize?: number // in seconds
}

export const useDragAndDrop = (options: UseDragAndDropOptions) => {
  const { pixelsPerSecond, snapToGrid = true, gridSize = 0.25 } = options
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    dropTarget: null,
    dragPreview: null
  })
  
  const dragCounter = useRef(0)

  // Snap time to grid
  const snapTime = useCallback((time: number) => {
    if (!snapToGrid) return time
    return Math.round(time / gridSize) * gridSize
  }, [snapToGrid, gridSize])

  // Handle drag start from source browser
  const handleDragStart = useCallback((e: React.DragEvent, source: AudioSource) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('audio-source', JSON.stringify(source))
    
    // Create a custom drag image
    const dragImage = document.createElement('div')
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-1000px'
    dragImage.style.padding = '8px 12px'
    dragImage.style.backgroundColor = '#7C3AED'
    dragImage.style.color = 'white'
    dragImage.style.borderRadius = '4px'
    dragImage.style.fontSize = '12px'
    dragImage.style.fontWeight = '500'
    dragImage.textContent = source.name
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 0, 0)
    
    // Clean up after a moment
    setTimeout(() => document.body.removeChild(dragImage), 0)
    
    setDragState({
      isDragging: true,
      draggedItem: source,
      dropTarget: null,
      dragPreview: null
    })
  }, [])

  // Handle drag enter on timeline
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
  }, [])

  // Handle drag leave on timeline
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    dragCounter.current--
    if (dragCounter.current === 0) {
      setDragState(prev => ({ ...prev, dropTarget: null, dragPreview: null }))
    }
  }, [])

  // Handle drag over on timeline
  const handleDragOver = useCallback((
    e: React.DragEvent,
    rect: DOMRect,
    trackId: string,
    trackY: number,
    trackHeight: number
  ) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    
    if (!dragState.draggedItem) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Check if over this track
    if (y >= trackY && y < trackY + trackHeight) {
      const time = snapTime(x / pixelsPerSecond)
      const width = dragState.draggedItem.duration * pixelsPerSecond
      
      setDragState(prev => ({
        ...prev,
        dropTarget: { trackId, time },
        dragPreview: {
          x: time * pixelsPerSecond,
          y: trackY,
          width
        }
      }))
    }
  }, [dragState.draggedItem, pixelsPerSecond, snapTime])

  // Handle drop on timeline
  const handleDrop = useCallback((
    e: React.DragEvent,
    onClipAdd: (trackId: string, clip: AudioClip) => void
  ) => {
    e.preventDefault()
    dragCounter.current = 0
    
    const { dropTarget, draggedItem } = dragState
    
    if (dropTarget && draggedItem) {
      try {
        const audioSourceData = e.dataTransfer.getData('audio-source')
        if (audioSourceData) {
          const audioSource: AudioSource = JSON.parse(audioSourceData)
          
          // Create new clip
          const newClip: AudioClip = {
            id: crypto.randomUUID(),
            sourceId: audioSource.id,
            source: audioSource,
            startTime: dropTarget.time,
            duration: audioSource.duration,
            trimStart: 0,
            trimEnd: 0,
            fadeIn: 0,
            fadeOut: 0,
            volume: 1,
            effects: []
          }
          
          onClipAdd(dropTarget.trackId, newClip)
        }
      } catch (error) {
        console.error('Error handling drop:', error)
      }
    }
    
    // Reset drag state
    setDragState({
      isDragging: false,
      draggedItem: null,
      dropTarget: null,
      dragPreview: null
    })
  }, [dragState])

  // Handle drag end (cleanup)
  const handleDragEnd = useCallback(() => {
    dragCounter.current = 0
    setDragState({
      isDragging: false,
      draggedItem: null,
      dropTarget: null,
      dragPreview: null
    })
  }, [])


  return {
    dragState,
    handleDragStart,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleDragEnd
  }
}