import { useGesture } from '@use-gesture/react'
import { useRef } from 'react'

interface GestureControlOptions {
  min: number
  max: number
  value: number
  onChange: (value: number) => void
  sensitivity?: number
}

export const useGestureControls = ({
  min,
  max,
  value,
  onChange,
  sensitivity = 1
}: GestureControlOptions) => {
  const startValue = useRef(value)

  const bind = useGesture({
    onWheel: ({ delta: [deltaX, deltaY], event, ctrlKey }) => {
      // Only respond to trackpad gestures (horizontal scroll or with ctrl key)
      if (Math.abs(deltaX) > Math.abs(deltaY) || ctrlKey) {
        event.preventDefault()
        event.stopPropagation()
        
        const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY
        const range = max - min
        const changeAmount = (delta / 100) * range * sensitivity
        
        const newValue = Math.max(min, Math.min(max, value - changeAmount))
        onChange(newValue)
      }
    },
    onPinch: ({ offset: [scale], event }) => {
      // Pinch gesture for fine control
      event.preventDefault()
      event.stopPropagation()
      const range = max - min
      const normalizedScale = (scale - 1) * sensitivity
      const newValue = Math.max(min, Math.min(max, startValue.current + (normalizedScale * range)))
      onChange(newValue)
    },
    onPinchStart: () => {
      startValue.current = value
    },
    onDrag: ({ movement: [mx, my], event, touches }) => {
      // Only respond to multi-touch drag (2 fingers)
      if (touches === 2) {
        event.preventDefault()
        event.stopPropagation()
        const delta = Math.abs(mx) > Math.abs(my) ? mx : -my
        const range = max - min
        const changeAmount = (delta / 200) * range * sensitivity
        
        const newValue = Math.max(min, Math.min(max, startValue.current + changeAmount))
        onChange(newValue)
      }
    },
    onDragStart: ({ touches }) => {
      if (touches === 2) {
        startValue.current = value
      }
    }
  }, {
    wheel: { 
      preventDefault: true,
      eventOptions: { passive: false }
    },
    pinch: { 
      preventDefault: true,
      eventOptions: { passive: false }
    },
    drag: { 
      preventDefault: true,
      filterTaps: true,
      eventOptions: { passive: false }
    }
  })

  return bind
}

// Hook for jog wheel control (for scratching/nudging)
export const useJogWheel = (onRotate: (delta: number) => void) => {
  const lastAngle = useRef<number | null>(null)
  const center = useRef<{ x: number, y: number } | null>(null)

  const bind = useGesture({
    onDragStart: ({ event }) => {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      center.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      }
      lastAngle.current = null
    },
    onDrag: ({ xy: [x, y], event }) => {
      if (!center.current) return
      
      // Calculate angle from center
      const angle = Math.atan2(
        y - center.current.y,
        x - center.current.x
      )
      
      if (lastAngle.current !== null) {
        let delta = angle - lastAngle.current
        
        // Handle angle wrap-around
        if (delta > Math.PI) delta -= 2 * Math.PI
        if (delta < -Math.PI) delta += 2 * Math.PI
        
        onRotate(delta)
      }
      
      lastAngle.current = angle
    },
    onDragEnd: () => {
      lastAngle.current = null
    }
  })

  return bind
}