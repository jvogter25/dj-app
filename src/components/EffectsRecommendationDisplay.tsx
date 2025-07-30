// Production Effects Recommendation Display Component
// Shows intelligent effect suggestions with visual automation curves

import React, { useState } from 'react'
import { EffectRecommendation, EffectPreset, EffectChain, EffectAutomationCurve } from '../lib/effectsRecommendationEngine'
import { Sparkles, Zap, Waves, Filter, Clock, AlertTriangle, ChevronDown, ChevronUp, Play } from 'lucide-react'

interface EffectsRecommendationDisplayProps {
  recommendations: EffectRecommendation[]
  transitionEffects: EffectRecommendation[]
  onApplyEffect: (recommendation: EffectRecommendation) => void
  isLoading: boolean
}

export const EffectsRecommendationDisplay: React.FC<EffectsRecommendationDisplayProps> = ({
  recommendations,
  transitionEffects,
  onApplyEffect,
  isLoading
}) => {
  const [expandedPresets, setExpandedPresets] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'general' | 'transition'>('general')

  const togglePresetExpansion = (presetId: string) => {
    const newExpanded = new Set(expandedPresets)
    if (newExpanded.has(presetId)) {
      newExpanded.delete(presetId)
    } else {
      newExpanded.add(presetId)
    }
    setExpandedPresets(newExpanded)
  }

  const getEffectIcon = (effectType: EffectChain['effectType']) => {
    switch (effectType) {
      case 'filter':
        return <Filter className="h-4 w-4" />
      case 'reverb':
      case 'delay':
        return <Waves className="h-4 w-4" />
      case 'gate':
      case 'sidechain':
        return <Zap className="h-4 w-4" />
      default:
        return <Sparkles className="h-4 w-4" />
    }
  }

  const getDifficultyColor = (difficulty: EffectPreset['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-500'
      case 'intermediate':
        return 'text-yellow-500'
      case 'advanced':
        return 'text-orange-500'
      case 'expert':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getCategoryBadgeColor = (category: EffectPreset['category']) => {
    switch (category) {
      case 'creative':
        return 'bg-purple-500/20 text-purple-400'
      case 'transition':
        return 'bg-blue-500/20 text-blue-400'
      case 'buildup':
        return 'bg-orange-500/20 text-orange-400'
      case 'breakdown':
        return 'bg-green-500/20 text-green-400'
      case 'ambient':
        return 'bg-cyan-500/20 text-cyan-400'
      case 'rhythmic':
        return 'bg-pink-500/20 text-pink-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const renderAutomationCurve = (automation: EffectAutomationCurve) => {
    const width = 120
    const height = 40
    const padding = 4

    // Generate curve points
    const points: string[] = []
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * (width - 2 * padding) + padding
      const progress = i / 10
      let y: number

      switch (automation.curveType) {
        case 'linear':
          y = automation.startValue + (automation.endValue - automation.startValue) * progress
          break
        case 'exponential':
          y = automation.startValue + (automation.endValue - automation.startValue) * Math.pow(progress, 2)
          break
        case 'logarithmic':
          y = automation.startValue + (automation.endValue - automation.startValue) * Math.log10(1 + progress * 9) / Math.log10(10)
          break
        case 'sine':
          y = automation.startValue + (automation.endValue - automation.startValue) * Math.sin(progress * Math.PI / 2)
          break
        case 'square':
          y = progress < 0.5 ? automation.startValue : automation.endValue
          break
        default:
          y = automation.startValue + (automation.endValue - automation.startValue) * progress
      }

      // Normalize to SVG coordinates (inverted Y)
      const svgY = height - (y * (height - 2 * padding) + padding)
      points.push(`${x},${svgY}`)
    }

    return (
      <svg width={width} height={height} className="mt-1">
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-blue-400"
        />
        <text x={padding} y={height - 2} className="text-[8px] fill-gray-500">{automation.parameter}</text>
      </svg>
    )
  }

  const renderEffectRecommendation = (recommendation: EffectRecommendation) => {
    const isExpanded = expandedPresets.has(recommendation.preset.id)

    return (
      <div
        key={recommendation.preset.id}
        className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="font-medium text-white">{recommendation.preset.name}</h4>
              <span className={`text-xs px-2 py-1 rounded-full ${getCategoryBadgeColor(recommendation.preset.category)}`}>
                {recommendation.preset.category}
              </span>
              <span className={`text-xs ${getDifficultyColor(recommendation.preset.difficulty)}`}>
                {recommendation.preset.difficulty}
              </span>
            </div>
            
            <p className="text-sm text-gray-400 mb-3">{recommendation.preset.description}</p>
            
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="h-4 w-16 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                    style={{ width: `${recommendation.confidence * 100}%` }}
                  />
                </div>
                <span className="text-gray-400">{Math.round(recommendation.confidence * 100)}% match</span>
              </div>
              
              <div className="flex items-center gap-1 text-gray-400">
                <Clock className="h-3 w-3" />
                <span>{recommendation.timing.duration}s</span>
              </div>
            </div>

            {/* Reasoning */}
            {recommendation.reasoning.length > 0 && (
              <div className="mt-3 space-y-1">
                {recommendation.reasoning.map((reason, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-gray-500">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {recommendation.warnings.length > 0 && (
              <div className="mt-3 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                {recommendation.warnings.map((warning, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-yellow-400">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Expanded details */}
            {isExpanded && (
              <div className="mt-4 space-y-3">
                {/* Effect chain */}
                <div>
                  <h5 className="text-xs font-medium text-gray-400 mb-2">Effect Chain</h5>
                  <div className="space-y-2">
                    {recommendation.preset.effects.map((effect, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2 bg-gray-900/50 rounded">
                        <div className="flex items-center gap-2">
                          {getEffectIcon(effect.effectType)}
                          <span className="text-sm text-gray-300 capitalize">{effect.effectType}</span>
                        </div>
                        {effect.automation && (
                          <div className="ml-auto">
                            {renderAutomationCurve(effect.automation)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alternatives */}
                {recommendation.alternatives.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-400 mb-2">Alternative Presets</h5>
                    <div className="flex gap-2 flex-wrap">
                      {recommendation.alternatives.map(alt => (
                        <span key={alt.id} className="text-xs px-2 py-1 bg-gray-700 rounded">
                          {alt.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Combines with */}
                {recommendation.combinesWith.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-400 mb-2">Combines Well With</h5>
                    <div className="flex gap-2 flex-wrap">
                      {recommendation.combinesWith.map(id => (
                        <span key={id} className="text-xs px-2 py-1 bg-gray-700 rounded">
                          {id.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 ml-4">
            <button
              onClick={() => onApplyEffect(recommendation)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
            >
              <Play className="h-3 w-3" />
              Apply
            </button>
            
            <button
              onClick={() => togglePresetExpansion(recommendation.preset.id)}
              className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const activeRecommendations = activeTab === 'general' ? recommendations : transitionEffects

  return (
    <div className="h-full flex flex-col">
      {/* Tab selector */}
      <div className="flex gap-2 mb-4 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'general'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          General Effects ({recommendations.length})
        </button>
        <button
          onClick={() => setActiveTab('transition')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'transition'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Transition Effects ({transitionEffects.length})
        </button>
      </div>

      {/* Recommendations list */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-3 text-gray-400">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span>Analyzing track for effect opportunities...</span>
            </div>
          </div>
        ) : activeRecommendations.length > 0 ? (
          activeRecommendations.map(renderEffectRecommendation)
        ) : (
          <div className="text-center text-gray-500 py-8">
            <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>No {activeTab} effect recommendations available</p>
            <p className="text-sm mt-1">Try analyzing a track first</p>
          </div>
        )}
      </div>
    </div>
  )
}