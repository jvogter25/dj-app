// Production Harmonic Wheel Component
// Interactive Camelot wheel for key-based mix discovery

import React, { useState, useRef, useEffect } from 'react'
import { Music, Info, Search, Sparkles } from 'lucide-react'
// Temporary implementation until musicTheory module is available
const MUSIC_KEYS: any[] = []
const getCompatibleKeys = (key: string): string[] => []
const getCamelotNumber = (key: string): number => 0

interface HarmonicWheelProps {
  selectedKeys?: string[]
  onKeySelect?: (keys: string[]) => void
  onSearchByKeys?: (keys: string[]) => void
  className?: string
}

// Camelot wheel positions (12 positions in a circle)
const WHEEL_POSITIONS = [
  { key: '8B', angle: 0, color: '#FF6B6B' },     // E♭m
  { key: '8A', angle: 30, color: '#4ECDC4' },    // G♭
  { key: '3B', angle: 60, color: '#45B7D1' },    // B♭m
  { key: '3A', angle: 90, color: '#96E6A1' },    // D♭
  { key: '10B', angle: 120, color: '#D4A5A5' },  // Fm
  { key: '10A', angle: 150, color: '#9A8C98' },  // A♭
  { key: '5B', angle: 180, color: '#C9ADA7' },   // Cm
  { key: '5A', angle: 210, color: '#F2CC8F' },   // E♭
  { key: '12B', angle: 240, color: '#E07A5F' },  // Gm
  { key: '12A', angle: 270, color: '#81B29A' },  // B♭
  { key: '7B', angle: 300, color: '#F2E9E4' },   // Dm
  { key: '7A', angle: 330, color: '#3D405B' }    // F
]

// Additional mappings for inner wheel
const INNER_WHEEL = [
  { key: '1B', angle: 0 },    // A♭m
  { key: '1A', angle: 30 },    // B
  { key: '6B', angle: 60 },    // E♭m
  { key: '6A', angle: 90 },    // G♭
  { key: '11B', angle: 120 },  // B♭m
  { key: '11A', angle: 150 },  // D♭
  { key: '4B', angle: 180 },   // Fm
  { key: '4A', angle: 210 },   // A♭
  { key: '9B', angle: 240 },   // Cm
  { key: '9A', angle: 270 },   // E♭
  { key: '2B', angle: 300 },   // Gm
  { key: '2A', angle: 330 }     // B♭
]

export const HarmonicWheel: React.FC<HarmonicWheelProps> = ({
  selectedKeys = [],
  onKeySelect,
  onSearchByKeys,
  className = ''
}) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [showCompatible, setShowCompatible] = useState(true)
  const [showInfo, setShowInfo] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  // Get all Camelot keys for a given key notation
  const getCamelotKeys = (keyNotation: string): string[] => {
    const musicKey = MUSIC_KEYS.find(k => k.notation === keyNotation)
    if (!musicKey) return []
    return [musicKey.camelot, ...(musicKey.alternativeCamelot || [])]
  }

  // Check if a Camelot key is selected
  const isKeySelected = (camelotKey: string): boolean => {
    return selectedKeys.some(key => {
      const camelotKeys = getCamelotKeys(key)
      return camelotKeys.includes(camelotKey)
    })
  }

  // Check if a key is compatible with selected keys
  const isKeyCompatible = (camelotKey: string): boolean => {
    if (selectedKeys.length === 0) return false
    
    return selectedKeys.some(selectedKey => {
      const compatibleKeys = getCompatibleKeys(selectedKey)
      return compatibleKeys.some(compatKey => {
        const camelotKeys = getCamelotKeys(compatKey)
        return camelotKeys.includes(camelotKey)
      })
    })
  }

  // Handle key click
  const handleKeyClick = (camelotKey: string) => {
    // Find the music key for this Camelot key
    const musicKey = MUSIC_KEYS.find(k => 
      k.camelot === camelotKey || k.alternativeCamelot?.includes(camelotKey)
    )
    
    if (!musicKey) return

    const newKeys = isKeySelected(camelotKey)
      ? selectedKeys.filter(k => k !== musicKey.notation)
      : [...selectedKeys, musicKey.notation]

    onKeySelect?.(newKeys)
  }

  // Get key info
  const getKeyInfo = (camelotKey: string) => {
    const musicKey = MUSIC_KEYS.find(k => 
      k.camelot === camelotKey || k.alternativeCamelot?.includes(camelotKey)
    )
    return musicKey
  }

  // Draw the wheel
  const centerX = 200
  const centerY = 200
  const outerRadius = 180
  const innerRadius = 120
  const innerInnerRadius = 60

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Harmonic Mixing Wheel</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showCompatible}
              onChange={(e) => setShowCompatible(e.target.checked)}
              className="rounded border-gray-600"
            />
            <span className="text-gray-300">Show compatible</span>
          </label>
          
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <Info className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Info */}
      {showInfo && (
        <div className="mb-4 p-3 bg-gray-700 rounded-lg text-sm text-gray-300">
          <p className="mb-2">Click keys to select them for searching.</p>
          <p className="mb-2">Compatible keys are highlighted when you select a key.</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div>
              <strong>Perfect match:</strong> Same key
            </div>
            <div>
              <strong>Energy boost:</strong> +1 number
            </div>
            <div>
              <strong>Mood change:</strong> Inner/outer switch
            </div>
            <div>
              <strong>Smooth mix:</strong> ±1 position
            </div>
          </div>
        </div>
      )}

      {/* Wheel Container */}
      <div className="flex justify-center mb-4">
        <svg
          ref={svgRef}
          width="400"
          height="400"
          viewBox="0 0 400 400"
          className="select-none"
        >
          {/* Outer wheel segments */}
          {WHEEL_POSITIONS.map((pos, index) => {
            const startAngle = (pos.angle - 15) * Math.PI / 180
            const endAngle = (pos.angle + 15) * Math.PI / 180
            const selected = isKeySelected(pos.key)
            const compatible = showCompatible && isKeyCompatible(pos.key)
            const keyInfo = getKeyInfo(pos.key)

            // Calculate path
            const x1 = centerX + outerRadius * Math.cos(startAngle)
            const y1 = centerY + outerRadius * Math.sin(startAngle)
            const x2 = centerX + outerRadius * Math.cos(endAngle)
            const y2 = centerY + outerRadius * Math.sin(endAngle)
            const x3 = centerX + innerRadius * Math.cos(endAngle)
            const y3 = centerY + innerRadius * Math.sin(endAngle)
            const x4 = centerX + innerRadius * Math.cos(startAngle)
            const y4 = centerY + innerRadius * Math.sin(startAngle)

            const path = `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 0 0 ${x4} ${y4} Z`

            return (
              <g key={pos.key}>
                <path
                  d={path}
                  fill={selected ? pos.color : compatible ? `${pos.color}88` : `${pos.color}44`}
                  stroke={selected ? '#fff' : compatible ? pos.color : '#374151'}
                  strokeWidth={selected ? 3 : 1}
                  className="cursor-pointer transition-all hover:opacity-80"
                  onClick={() => handleKeyClick(pos.key)}
                  onMouseEnter={() => setHoveredKey(pos.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
                
                {/* Key label */}
                <text
                  x={centerX + (outerRadius - 30) * Math.cos(pos.angle * Math.PI / 180)}
                  y={centerY + (outerRadius - 30) * Math.sin(pos.angle * Math.PI / 180)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-white text-sm font-medium pointer-events-none"
                >
                  {pos.key}
                </text>
                
                {/* Musical notation */}
                {keyInfo && (
                  <text
                    x={centerX + (outerRadius - 50) * Math.cos(pos.angle * Math.PI / 180)}
                    y={centerY + (outerRadius - 50) * Math.sin(pos.angle * Math.PI / 180)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-gray-300 text-xs pointer-events-none"
                  >
                    {keyInfo.notation}
                  </text>
                )}
              </g>
            )
          })}

          {/* Inner wheel segments */}
          {INNER_WHEEL.map((pos) => {
            const startAngle = (pos.angle - 15) * Math.PI / 180
            const endAngle = (pos.angle + 15) * Math.PI / 180
            const selected = isKeySelected(pos.key)
            const compatible = showCompatible && isKeyCompatible(pos.key)
            const keyInfo = getKeyInfo(pos.key)

            const x1 = centerX + innerRadius * Math.cos(startAngle)
            const y1 = centerY + innerRadius * Math.sin(startAngle)
            const x2 = centerX + innerRadius * Math.cos(endAngle)
            const y2 = centerY + innerRadius * Math.sin(endAngle)
            const x3 = centerX + innerInnerRadius * Math.cos(endAngle)
            const y3 = centerY + innerInnerRadius * Math.sin(endAngle)
            const x4 = centerX + innerInnerRadius * Math.cos(startAngle)
            const y4 = centerY + innerInnerRadius * Math.sin(startAngle)

            const path = `M ${x1} ${y1} A ${innerRadius} ${innerRadius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerInnerRadius} ${innerInnerRadius} 0 0 0 ${x4} ${y4} Z`

            return (
              <g key={pos.key}>
                <path
                  d={path}
                  fill={selected ? '#9333EA' : compatible ? '#9333EA88' : '#37415144'}
                  stroke={selected ? '#fff' : compatible ? '#9333EA' : '#374151'}
                  strokeWidth={selected ? 3 : 1}
                  className="cursor-pointer transition-all hover:opacity-80"
                  onClick={() => handleKeyClick(pos.key)}
                  onMouseEnter={() => setHoveredKey(pos.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
                
                <text
                  x={centerX + (innerRadius - 25) * Math.cos(pos.angle * Math.PI / 180)}
                  y={centerY + (innerRadius - 25) * Math.sin(pos.angle * Math.PI / 180)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-white text-xs font-medium pointer-events-none"
                >
                  {pos.key}
                </text>
              </g>
            )
          })}

          {/* Center circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={innerInnerRadius}
            fill="#1F2937"
            stroke="#374151"
            strokeWidth="2"
          />
          
          <text
            x={centerX}
            y={centerY - 10}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-400 text-sm"
          >
            Camelot
          </text>
          
          <text
            x={centerX}
            y={centerY + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-400 text-sm"
          >
            Wheel
          </text>
        </svg>
      </div>

      {/* Hovered Key Info */}
      {hoveredKey && (
        <div className="mb-4 p-3 bg-gray-700 rounded-lg text-center">
          <p className="text-white font-medium">{hoveredKey}</p>
          {getKeyInfo(hoveredKey) && (
            <p className="text-gray-300 text-sm">
              {getKeyInfo(hoveredKey)!.notation} - {getKeyInfo(hoveredKey)!.name}
            </p>
          )}
        </div>
      )}

      {/* Selected Keys */}
      {selectedKeys.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2">Selected keys:</p>
          <div className="flex flex-wrap gap-2">
            {selectedKeys.map(key => (
              <span
                key={key}
                className="px-3 py-1 bg-purple-600 text-white text-sm rounded-full"
              >
                {key}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search Button */}
      <button
        onClick={() => onSearchByKeys?.(selectedKeys)}
        disabled={selectedKeys.length === 0}
        className={`w-full py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
          selectedKeys.length > 0
            ? 'bg-purple-600 hover:bg-purple-700 text-white'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        <Search className="h-4 w-4" />
        Find Mixes in Compatible Keys
      </button>
    </div>
  )
}

export default HarmonicWheel