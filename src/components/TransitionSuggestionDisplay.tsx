import React, { useState, useEffect } from 'react'
import { 
  Sliders, Zap, Music, AlertTriangle, Info, ChevronRight,
  Volume2, Filter, Disc, Clock, TrendingUp, Sparkles
} from 'lucide-react'
import { TransitionSuggestion, CrossfaderCurve, EQAutomation } from '../lib/transitionSuggestionEngine'

interface TransitionSuggestionDisplayProps {
  suggestion: TransitionSuggestion | null
  onApply?: (suggestion: TransitionSuggestion) => void
  onTryAlternative?: (technique: string) => void
  className?: string
}

export const TransitionSuggestionDisplay: React.FC<TransitionSuggestionDisplayProps> = ({
  suggestion,
  onApply,
  onTryAlternative,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false)
  const [selectedAutomation, setSelectedAutomation] = useState<'crossfader' | 'eq' | 'effects'>('crossfader')

  if (!suggestion) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="text-center text-gray-400">
          <Sliders className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No transition suggestion available</p>
          <p className="text-sm mt-2">Load two tracks to see AI-powered mixing suggestions</p>
        </div>
      </div>
    )
  }

  const getCompatibilityColor = (value: number): string => {
    if (value > 0.8) return 'text-green-400'
    if (value > 0.6) return 'text-yellow-400'
    if (value > 0.4) return 'text-orange-400'
    return 'text-red-400'
  }

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-900/20'
      case 'intermediate': return 'text-yellow-400 bg-yellow-900/20'
      case 'advanced': return 'text-orange-400 bg-orange-900/20'
      case 'expert': return 'text-red-400 bg-red-900/20'
      default: return 'text-gray-400 bg-gray-900/20'
    }
  }

  const renderCrossfaderVisualization = (curve: CrossfaderCurve) => {
    const width = 200
    const height = 80
    const padding = 10
    
    // Generate path for curve
    const points = curve.keyPoints.map((point, index) => {
      const x = padding + (point.time * (width - 2 * padding))
      const y = padding + ((1 - (point.position + 1) / 2) * (height - 2 * padding))
      return { x, y, curve: point.curve }
    })

    let path = `M ${points[0].x} ${points[0].y}`
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      
      if (prev.curve === 'linear' || prev.curve === 'hold') {
        path += ` L ${curr.x} ${curr.y}`
      } else {
        // Bezier curve for smooth transitions
        const cp1x = prev.x + (curr.x - prev.x) * 0.5
        const cp1y = prev.y
        const cp2x = prev.x + (curr.x - prev.x) * 0.5
        const cp2y = curr.y
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`
      }
    }

    return (
      <svg width={width} height={height} className="bg-gray-900 rounded">
        {/* Grid lines */}
        <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} 
              stroke="#4B5563" strokeDasharray="2,2" />
        <line x1={width/2} y1={padding} x2={width/2} y2={height-padding} 
              stroke="#4B5563" strokeDasharray="2,2" />
        
        {/* Curve */}
        <path d={path} fill="none" stroke="#8B5CF6" strokeWidth="2" />
        
        {/* Points */}
        {points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="3" fill="#A78BFA" />
        ))}
        
        {/* Labels */}
        <text x={padding} y={height - 2} fontSize="10" fill="#9CA3AF">0s</text>
        <text x={width - padding - 20} y={height - 2} fontSize="10" fill="#9CA3AF">
          {curve.duration.toFixed(1)}s
        </text>
        <text x={5} y={padding + 5} fontSize="10" fill="#9CA3AF">B</text>
        <text x={5} y={height - padding + 5} fontSize="10" fill="#9CA3AF">A</text>
      </svg>
    )
  }

  const renderEQVisualization = (automations: EQAutomation[]) => {
    const bands = ['low', 'mid', 'high']
    const tracks = ['A', 'B']
    
    return (
      <div className="grid grid-cols-2 gap-4">
        {tracks.map(track => {
          const trackAutomations = automations.filter(a => a.track === track)
          
          return (
            <div key={track} className="bg-gray-900 rounded-lg p-3">
              <h5 className="text-sm font-medium mb-2">Track {track}</h5>
              <div className="space-y-2">
                {bands.map(band => {
                  const automation = trackAutomations.find(a => a.band === band)
                  if (!automation) return null
                  
                  return (
                    <div key={band} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-8 capitalize">{band}</span>
                      <div className="flex-1 bg-gray-800 rounded-full h-2 relative">
                        <div 
                          className="absolute left-0 top-0 h-full bg-purple-600 rounded-full transition-all"
                          style={{
                            width: `${automation.startValue * 100}%`,
                            opacity: 0.5
                          }}
                        />
                        <div 
                          className="absolute left-0 top-0 h-full bg-purple-400 rounded-full"
                          style={{
                            width: `${automation.endValue * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono text-gray-400">
                        {(automation.startValue * 100).toFixed(0)}→{(automation.endValue * 100).toFixed(0)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`bg-gray-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-500" />
            <h3 className="text-xl font-semibold">AI Transition Suggestion</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(suggestion.technique.difficulty)}`}>
              {suggestion.technique.difficulty}
            </span>
            <span className={`font-mono text-sm ${getCompatibilityColor(suggestion.confidence)}`}>
              {Math.round(suggestion.confidence * 100)}% confidence
            </span>
          </div>
        </div>

        {/* Technique Overview */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <h4 className="font-medium text-lg mb-2">{suggestion.technique.name}</h4>
          <p className="text-gray-400 text-sm mb-3">{suggestion.technique.description}</p>
          
          {/* Timing Info */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>Duration: {suggestion.timing.totalDuration.toFixed(1)}s</span>
            </div>
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-gray-400" />
              <span>Beat {suggestion.timing.startBeat} → {suggestion.timing.endBeat}</span>
            </div>
            {suggestion.timing.phraseLocked && (
              <div className="flex items-center gap-1 text-green-400">
                <Zap className="w-4 h-4" />
                <span className="text-xs">Phrase Locked</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compatibility Scores */}
      <div className="p-6 border-b border-gray-700">
        <h4 className="font-medium mb-3">Compatibility Analysis</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(suggestion.compatibility).map(([key, value]) => {
            if (key === 'overall') return null
            return (
              <div key={key} className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 capitalize mb-1">{key}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        value > 0.8 ? 'bg-green-500' :
                        value > 0.6 ? 'bg-yellow-500' :
                        value > 0.4 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${value * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono ${getCompatibilityColor(value)}`}>
                    {Math.round(value * 100)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Automation Details */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Automation Details</h4>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
          >
            {showDetails ? 'Hide' : 'Show'} Details
            <ChevronRight className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {showDetails && (
          <div className="space-y-4">
            {/* Automation Type Selector */}
            <div className="flex gap-2">
              {[
                { id: 'crossfader', label: 'Crossfader', icon: Sliders },
                { id: 'eq', label: 'EQ', icon: Volume2 },
                { id: 'effects', label: 'Effects', icon: Filter }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setSelectedAutomation(id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    selectedAutomation === id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Automation Visualization */}
            <div className="bg-gray-900 rounded-lg p-4">
              {selectedAutomation === 'crossfader' && (
                <div>
                  <h5 className="text-sm font-medium mb-3">Crossfader Curve</h5>
                  {renderCrossfaderVisualization(suggestion.crossfader)}
                  <p className="text-xs text-gray-400 mt-2">
                    Type: {suggestion.crossfader.type}
                  </p>
                </div>
              )}

              {selectedAutomation === 'eq' && (
                <div>
                  <h5 className="text-sm font-medium mb-3">EQ Automation</h5>
                  {renderEQVisualization(suggestion.eqAutomation)}
                </div>
              )}

              {selectedAutomation === 'effects' && (
                <div>
                  <h5 className="text-sm font-medium mb-3">Effect Automation</h5>
                  {suggestion.effectAutomation.length > 0 ? (
                    <div className="space-y-3">
                      {suggestion.effectAutomation.map((effect, index) => (
                        <div key={index} className="bg-gray-800 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium capitalize">{effect.effect}</span>
                            <span className="text-xs text-gray-400">Track {effect.track}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-400">Parameter:</span>
                              <span className="ml-2">{effect.parameter}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Trigger:</span>
                              <span className="ml-2 capitalize">{effect.trigger}</span>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-gray-700 rounded-full h-2">
                              <div 
                                className="h-2 bg-purple-500 rounded-full transition-all"
                                style={{ 
                                  width: `${(effect.endValue - effect.startValue) * 100}%`,
                                  marginLeft: `${effect.startValue * 100}%`
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono text-gray-400">
                              {(effect.startValue * 100).toFixed(0)}→{(effect.endValue * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">No effect automation needed for this transition</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        {suggestion.technique.tips.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              Pro Tips
            </h4>
            <div className="space-y-2">
              {suggestion.technique.tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <p className="text-sm text-gray-300">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alternative Suggestions */}
        {suggestion.alternativeSuggestions.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-3">Alternative Techniques</h4>
            <div className="space-y-2">
              {suggestion.alternativeSuggestions.map((alt, index) => (
                <button
                  key={index}
                  onClick={() => onTryAlternative?.(alt.technique)}
                  className="w-full bg-gray-900/50 hover:bg-gray-900 rounded-lg p-3 text-left transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{alt.technique}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">
                        {Math.round(alt.confidence * 100)}% match
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Apply Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => onApply?.(suggestion)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Disc className="w-5 h-5" />
            Apply Transition
          </button>
        </div>
      </div>
    </div>
  )
}