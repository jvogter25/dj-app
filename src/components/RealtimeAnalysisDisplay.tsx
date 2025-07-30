// Production Real-time Analysis Display Component
// Visualizes real-time audio analysis data with performance metrics

import React, { useEffect, useRef, useState } from 'react'
import { RealtimeAnalysisResult } from '../lib/realtimeAudioAnalyzer'
import { Activity, Zap, Music, BarChart3, Radio, Volume2 } from 'lucide-react'

interface RealtimeAnalysisDisplayProps {
  analysis: RealtimeAnalysisResult | null
  isAnalyzing: boolean
  onToggleAnalysis?: () => void
}

export const RealtimeAnalysisDisplay: React.FC<RealtimeAnalysisDisplayProps> = ({
  analysis,
  isAnalyzing,
  onToggleAnalysis
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const [showDetails, setShowDetails] = useState(false)
  
  // Spectrum visualization
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !analysis) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const draw = () => {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      
      // Draw frequency spectrum
      const bands = Object.values(analysis.spectralBandEnergy)
      const barWidth = width / bands.length
      const gradient = ctx.createLinearGradient(0, height, 0, 0)
      gradient.addColorStop(0, 'rgba(147, 51, 234, 0.3)')
      gradient.addColorStop(0.5, 'rgba(147, 51, 234, 0.6)')
      gradient.addColorStop(1, 'rgba(147, 51, 234, 0.9)')
      
      bands.forEach((energy, i) => {
        const normalizedEnergy = Math.min(1, energy / 100)
        const barHeight = normalizedEnergy * height * 0.8
        const x = i * barWidth + barWidth * 0.1
        
        ctx.fillStyle = gradient
        ctx.fillRect(x, height - barHeight, barWidth * 0.8, barHeight)
      })
      
      // Draw beat indicator
      if (analysis.beatProbability > 0.7) {
        ctx.fillStyle = `rgba(239, 68, 68, ${analysis.beatProbability})`
        ctx.beginPath()
        ctx.arc(width - 20, 20, 10, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    
    draw()
  }, [analysis])
  
  // Chroma visualization
  const renderChromaWheel = () => {
    if (!analysis) return null
    
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const radius = 40
    const centerX = 60
    const centerY = 60
    
    return (
      <svg width="120" height="120" className="transform -rotate-90">
        {analysis.chromaVector.map((value, i) => {
          const angle = (i / 12) * Math.PI * 2
          const intensity = Math.min(1, value * 2)
          const x1 = centerX + Math.cos(angle) * radius * 0.6
          const y1 = centerY + Math.sin(angle) * radius * 0.6
          const x2 = centerX + Math.cos(angle) * radius * (0.6 + 0.4 * intensity)
          const y2 = centerY + Math.sin(angle) * radius * (0.6 + 0.4 * intensity)
          
          return (
            <g key={i}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={`hsl(${i * 30}, 70%, ${50 + intensity * 30}%)`}
                strokeWidth="4"
                strokeLinecap="round"
              />
              <text
                x={centerX + Math.cos(angle) * (radius + 15)}
                y={centerY + Math.sin(angle) * (radius + 15)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-gray-400 text-xs transform rotate-90"
                style={{ transformOrigin: `${centerX + Math.cos(angle) * (radius + 15)}px ${centerY + Math.sin(angle) * (radius + 15)}px` }}
              >
                {notes[i]}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }
  
  const getEnergyColor = (value: number): string => {
    if (value > 0.8) return 'text-red-400'
    if (value > 0.6) return 'text-orange-400'
    if (value > 0.4) return 'text-yellow-400'
    if (value > 0.2) return 'text-green-400'
    return 'text-blue-400'
  }
  
  if (!analysis && !isAnalyzing) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <div className="text-center">
          <Radio className="h-8 w-8 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">Real-time analysis not active</p>
          {onToggleAnalysis && (
            <button
              onClick={onToggleAnalysis}
              className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Start Analysis
            </button>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className={`h-5 w-5 ${isAnalyzing ? 'text-green-400 animate-pulse' : 'text-gray-400'}`} />
          <h3 className="text-lg font-semibold text-white">Real-time Analysis</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
          {onToggleAnalysis && (
            <button
              onClick={onToggleAnalysis}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                isAnalyzing 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isAnalyzing ? 'Stop' : 'Start'}
            </button>
          )}
        </div>
      </div>
      
      {analysis && (
        <>
          {/* Main Visualization */}
          <div className="p-4 space-y-4">
            {/* Spectrum */}
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Frequency Spectrum</span>
                <span className="text-xs text-gray-500">
                  Centroid: {Math.round(analysis.spectralCentroid)} Hz
                </span>
              </div>
              <canvas
                ref={canvasRef}
                width={400}
                height={100}
                className="w-full h-24 rounded"
              />
            </div>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Tempo */}
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Music className="h-4 w-4 text-purple-400" />
                  <span className="text-xs text-gray-400">Tempo</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {Math.round(analysis.tempo)}
                </div>
                <div className="text-xs text-gray-500">BPM</div>
              </div>
              
              {/* Energy */}
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs text-gray-400">Energy</span>
                </div>
                <div className={`text-2xl font-bold ${getEnergyColor(analysis.rms)}`}>
                  {Math.round(analysis.rms * 100)}%
                </div>
                <div className="text-xs text-gray-500">RMS Level</div>
              </div>
              
              {/* Loudness */}
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Volume2 className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-gray-400">Loudness</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {Math.round(analysis.loudness)}
                </div>
                <div className="text-xs text-gray-500">dB</div>
              </div>
              
              {/* Onset */}
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-gray-400">Onset</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {Math.round(analysis.onsetStrength * 100)}%
                </div>
                <div className="text-xs text-gray-500">Strength</div>
              </div>
            </div>
            
            {/* Harmonic Content */}
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Harmonic Content</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Harmonic:</span>
                      <span className="text-gray-300">{Math.round(analysis.harmonicEnergy)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Percussive:</span>
                      <span className="text-gray-300">{Math.round(analysis.percussiveEnergy)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Spectral Flux:</span>
                      <span className="text-gray-300">{analysis.spectralFlux.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Zero Crossings:</span>
                      <span className="text-gray-300">{analysis.zeroCrossingRate.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
                <div className="ml-4">
                  {renderChromaWheel()}
                </div>
              </div>
            </div>
          </div>
          
          {/* Detailed Analysis */}
          {showDetails && (
            <div className="p-4 pt-0 space-y-3">
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Spectral Features</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Centroid:</span>
                    <span className="ml-2 text-gray-300">{Math.round(analysis.spectralCentroid)} Hz</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Rolloff:</span>
                    <span className="ml-2 text-gray-300">{Math.round(analysis.spectralRolloff)} Hz</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Flatness:</span>
                    <span className="ml-2 text-gray-300">{analysis.spectralFlatness.toFixed(3)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Dynamic Range:</span>
                    <span className="ml-2 text-gray-300">{analysis.dynamicRange.toFixed(1)} dB</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Crest Factor:</span>
                    <span className="ml-2 text-gray-300">{analysis.crestFactor.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Beat Probability:</span>
                    <span className="ml-2 text-gray-300">{Math.round(analysis.beatProbability * 100)}%</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Band Energy</h4>
                <div className="space-y-2">
                  {Object.entries(analysis.spectralBandEnergy).map(([band, energy]) => (
                    <div key={band} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-16 capitalize">{band}:</span>
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-200"
                          style={{ width: `${Math.min(100, energy)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-10 text-right">
                        {Math.round(energy)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}