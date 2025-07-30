// Enhanced Slider component with full gesture support
// Supports both click-and-drag AND trackpad/wheel gestures
import React from 'react'
import { useGestureControls } from '../hooks/useGestureControls'

interface EnhancedSliderProps {
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
  sensitivity?: number
  className?: string
  disabled?: boolean
  orientation?: 'horizontal' | 'vertical'
  title?: string
  id?: string
  'aria-label'?: string
}

export const EnhancedSlider: React.FC<EnhancedSliderProps> = ({
  min,
  max,
  step = 1,
  value,
  onChange,
  sensitivity = 1,
  className = '',
  disabled = false,
  orientation = 'horizontal',
  title,
  id,
  'aria-label': ariaLabel
}) => {
  // Use gesture controls for trackpad/wheel support
  const gestureBindings = useGestureControls({
    min,
    max,
    value,
    onChange,
    sensitivity
  })

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = orientation === 'vertical' 
      ? 1 - (e.clientY - rect.top) / rect.height
      : (e.clientX - rect.left) / rect.width
    
    const newValue = min + (percent * (max - min))
    const steppedValue = Math.round(newValue / step) * step
    const clampedValue = Math.max(min, Math.min(max, steppedValue))
    
    onChange(clampedValue)
  }

  return (
    <div 
      className={`relative touch-none ${className}`}
      onClick={handleClick}
      {...(disabled ? {} : gestureBindings())}
    >
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className={`
          w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          ${orientation === 'vertical' ? 'writing-mode-vertical-lr' : ''}
        `}
        title={title}
        id={id}
        aria-label={ariaLabel}
      />
    </div>
  )
}

// Specialized component for circular/knob-style sliders (like EQ knobs)
interface EnhancedKnobProps {
  min: number
  max: number
  value: number
  onChange: (value: number) => void
  sensitivity?: number
  size?: 'sm' | 'md' | 'lg'
  color?: string
  label?: string
  disabled?: boolean
  className?: string
  title?: string
}

export const EnhancedKnob: React.FC<EnhancedKnobProps> = ({
  min,
  max,
  value,
  onChange,
  sensitivity = 1,
  size = 'md',
  color = 'gray',
  label,
  disabled = false,
  className = '',
  title
}) => {
  const gestureBindings = useGestureControls({
    min,
    max,
    value,
    onChange,
    sensitivity
  })

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  const knobSizeClasses = {
    sm: 'w-1 h-3',
    md: 'w-2 h-6',
    lg: 'w-3 h-8'
  }

  // Calculate rotation angle based on value
  const range = max - min
  const normalizedValue = (value - min) / range
  const rotation = (normalizedValue - 0.5) * 270 // -135° to +135°

  const handleKnobClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    // Calculate angle from center
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
    // Convert to 0-1 range (map -135° to +135° range)
    const normalizedAngle = (angle + Math.PI * 0.75) / (Math.PI * 1.5)
    const clampedAngle = Math.max(0, Math.min(1, normalizedAngle))
    
    const newValue = min + (clampedAngle * range)
    onChange(newValue)
  }

  return (
    <div className={`text-center ${className}`}>
      <div className="relative">
        {/* Hidden range input for keyboard accessibility */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
          title={title}
          aria-label={label}
        />
        
        {/* Visual knob */}
        <div 
          className={`
            ${sizeClasses[size]} 
            bg-gray-700 hover:bg-gray-600 rounded-full mx-auto mb-1 
            flex items-center justify-center transition-all border-2 
            ${value !== 0 ? `border-${color}-500` : 'border-transparent'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            touch-none
          `}
          onClick={handleKnobClick}
          {...(disabled ? {} : gestureBindings())}
        >
          <div 
            className={`
              ${knobSizeClasses[size]} 
              ${value !== 0 ? `bg-${color}-500` : 'bg-gray-400'} 
              rounded transition-all
            `}
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        </div>
      </div>
      
      {label && (
        <div className="space-y-1">
          <span className="text-xs text-gray-400">{label}</span>
          <div className={`text-xs font-mono ${value !== 0 ? `text-${color}-400` : 'text-gray-600'}`}>
            {value > 0 ? '+' : ''}{value}
          </div>
        </div>
      )}
    </div>
  )
}

// Specialized component for vertical fader-style sliders
interface EnhancedFaderProps {
  min: number
  max: number
  value: number
  onChange: (value: number) => void
  sensitivity?: number
  height?: number
  color?: string
  label?: string
  disabled?: boolean
  className?: string
  title?: string
}

export const EnhancedFader: React.FC<EnhancedFaderProps> = ({
  min,
  max,
  value,
  onChange,
  sensitivity = 1,
  height = 160,
  color = 'purple',
  label,
  disabled = false,
  className = '',
  title
}) => {
  const gestureBindings = useGestureControls({
    min,
    max,
    value,
    onChange,
    sensitivity
  })

  // Calculate fader position (inverted for vertical)
  const range = max - min
  const normalizedValue = (value - min) / range
  const position = (1 - normalizedValue) * 100 // Inverted for top-to-bottom

  const handleFaderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = 1 - (e.clientY - rect.top) / rect.height // Inverted for top-to-bottom
    const clampedPercent = Math.max(0, Math.min(1, percent))
    
    const newValue = min + (clampedPercent * range)
    onChange(newValue)
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {label && (
        <span className="text-xs text-gray-400 mb-2">{label}</span>
      )}
      
      <div 
        className={`
          relative bg-gray-700 rounded-lg w-8 touch-none
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{ height: `${height}px` }}
        onClick={handleFaderClick}
        {...(disabled ? {} : gestureBindings())}
      >
        {/* Hidden range input for accessibility */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
          style={{ writingMode: 'vertical-rl' as any, WebkitAppearance: 'slider-vertical' as any }}
          title={title}
          aria-label={label}
        />
        
        {/* Fader track */}
        <div className="absolute inset-x-0 inset-y-2 bg-gray-600 rounded-full" />
        
        {/* Fader handle */}
        <div 
          className={`
            absolute w-6 h-4 bg-${color}-500 rounded-sm shadow-lg
            transform -translate-x-0.5 transition-all duration-100
            ${disabled ? '' : 'hover:bg-' + color + '-400'}
          `}
          style={{ 
            top: `${position}%`,
            left: '50%',
            transform: 'translateX(-50%) translateY(-50%)'
          }}
        />
        
        {/* Value indicator */}
        <div className="absolute -right-8 top-1/2 transform -translate-y-1/2">
          <span className={`text-xs font-mono text-${color}-400`}>
            {Math.round(value)}
          </span>
        </div>
      </div>
    </div>
  )
}