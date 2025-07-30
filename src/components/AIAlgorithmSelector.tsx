// Production AI Algorithm Selector Component
// Allows users to choose and configure different AI algorithms for suggestions

import React, { useState, useEffect } from 'react'
import { 
  Brain, Settings, Zap, Target, TrendingUp, 
  Music, Users, Clock, BarChart3, Sliders,
  ChevronDown, ChevronUp, Info, Star,
  CheckCircle, AlertTriangle, Gauge
} from 'lucide-react'

export interface AIAlgorithm {
  id: string
  name: string
  description: string
  category: 'harmonic' | 'rhythmic' | 'contextual' | 'learning' | 'hybrid'
  complexity: 'basic' | 'intermediate' | 'advanced' | 'expert'
  strengths: string[]
  weaknesses: string[]
  bestFor: string[]
  parameters: {
    [key: string]: {
      name: string
      description: string
      type: 'number' | 'boolean' | 'select'
      default: any
      min?: number
      max?: number
      step?: number
      options?: string[]
    }
  }
  performance: {
    speed: number // 1-5
    accuracy: number // 1-5
    versatility: number // 1-5
    learningRate: number // 1-5
  }
  requirements: {
    minTracks: number
    requiresUserData: boolean
    requiresContextData: boolean
    computeIntensive: boolean
  }
}

interface AIAlgorithmSelectorProps {
  algorithms: AIAlgorithm[]
  selectedAlgorithms: string[]
  algorithmWeights: { [algorithmId: string]: number }
  algorithmParams: { [algorithmId: string]: { [param: string]: any } }
  onSelectionChange: (algorithmIds: string[]) => void
  onWeightChange: (algorithmId: string, weight: number) => void
  onParameterChange: (algorithmId: string, param: string, value: any) => void
  onPresetLoad: (presetName: string) => void
  showAdvanced?: boolean
  maxAlgorithms?: number
}

// Predefined algorithm configurations
const DEFAULT_ALGORITHMS: AIAlgorithm[] = [
  {
    id: 'harmonic_classic',
    name: 'Classic Harmonic Mixing',
    description: 'Traditional Camelot Wheel-based harmonic matching with tempo compatibility',
    category: 'harmonic',
    complexity: 'basic',
    strengths: ['Key compatibility', 'Simple rules', 'Predictable results'],
    weaknesses: ['Limited creativity', 'No context awareness'],
    bestFor: ['Beginners', 'Traditional mixing', 'Safe transitions'],
    parameters: {
      keyWeight: {
        name: 'Key Compatibility Weight',
        description: 'How much to prioritize harmonic compatibility',
        type: 'number',
        default: 0.7,
        min: 0,
        max: 1,
        step: 0.1
      },
      tempoTolerance: {
        name: 'Tempo Tolerance (%)',
        description: 'Maximum tempo difference allowed',
        type: 'number',
        default: 6,
        min: 1,
        max: 20,
        step: 1
      },
      strictMode: {
        name: 'Strict Mode',
        description: 'Only suggest perfect harmonic matches',
        type: 'boolean',
        default: false
      }
    },
    performance: {
      speed: 5,
      accuracy: 4,
      versatility: 2,
      learningRate: 1
    },
    requirements: {
      minTracks: 10,
      requiresUserData: false,
      requiresContextData: false,
      computeIntensive: false
    }
  },
  {
    id: 'energy_progression',
    name: 'Energy Flow Algorithm',
    description: 'Focuses on energy curves and crowd psychology for optimal flow',
    category: 'rhythmic',
    complexity: 'intermediate',
    strengths: ['Energy management', 'Crowd psychology', 'Dynamic mixing'],
    weaknesses: ['Requires context', 'Complex setup'],
    bestFor: ['Club DJs', 'Long sets', 'Energy building'],
    parameters: {
      energySmoothing: {
        name: 'Energy Smoothing',
        description: 'How gradual energy changes should be',
        type: 'number',
        default: 0.3,
        min: 0,
        max: 1,
        step: 0.1
      },
      peakAwareness: {
        name: 'Peak Time Awareness',
        description: 'Adjust for peak hours vs warm-up',
        type: 'select',
        default: 'auto',
        options: ['warm-up', 'building', 'peak', 'cool-down', 'auto']
      },
      crowdResponseWeight: {
        name: 'Crowd Response Weight',
        description: 'How much to consider predicted crowd response',
        type: 'number',
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.1
      }
    },
    performance: {
      speed: 3,
      accuracy: 4,
      versatility: 5,
      learningRate: 3
    },
    requirements: {
      minTracks: 50,
      requiresUserData: false,
      requiresContextData: true,
      computeIntensive: true
    }
  },
  {
    id: 'contextual_ai',
    name: 'Contextual Intelligence',
    description: 'Advanced AI that considers time, venue, audience, and historical data',
    category: 'contextual',
    complexity: 'advanced',
    strengths: ['Context awareness', 'Venue adaptation', 'Time-based suggestions'],
    weaknesses: ['Requires setup', 'Data dependent'],
    bestFor: ['Professional DJs', 'Multiple venues', 'Adaptive mixing'],
    parameters: {
      venueWeight: {
        name: 'Venue Influence',
        description: 'How much venue type affects suggestions',
        type: 'number',
        default: 0.4,
        min: 0,
        max: 1,
        step: 0.1
      },
      timeWeight: {
        name: 'Time Influence',
        description: 'How much time of day affects suggestions',
        type: 'number',
        default: 0.3,
        min: 0,
        max: 1,
        step: 0.1
      },
      audienceAdaptation: {
        name: 'Audience Adaptation',
        description: 'Adapt to perceived audience response',
        type: 'boolean',
        default: true
      },
      geographicInfluence: {
        name: 'Geographic Influence',
        description: 'Consider regional music preferences',
        type: 'boolean',
        default: false
      }
    },
    performance: {
      speed: 2,
      accuracy: 5,
      versatility: 5,
      learningRate: 4
    },
    requirements: {
      minTracks: 100,
      requiresUserData: true,
      requiresContextData: true,
      computeIntensive: true
    }
  },
  {
    id: 'personal_learning',
    name: 'Personal Style Learner',
    description: 'Machine learning algorithm that adapts to your unique mixing style',
    category: 'learning',
    complexity: 'advanced',
    strengths: ['Personalization', 'Style learning', 'Continuous improvement'],
    weaknesses: ['Requires training', 'Slow initial learning'],
    bestFor: ['Experienced DJs', 'Unique styles', 'Long-term use'],
    parameters: {
      learningRate: {
        name: 'Learning Rate',
        description: 'How quickly to adapt to your choices',
        type: 'number',
        default: 0.1,
        min: 0.01,
        max: 0.5,
        step: 0.01
      },
      memoryDepth: {
        name: 'Memory Depth (days)',
        description: 'How far back to consider your mixing history',
        type: 'number',
        default: 30,
        min: 7,
        max: 365,
        step: 1
      },
      styleConsistency: {
        name: 'Style Consistency',
        description: 'Prefer consistent style vs exploration',
        type: 'number',
        default: 0.7,
        min: 0,
        max: 1,
        step: 0.1
      },
      negativeLearning: {
        name: 'Learn from Rejections',
        description: 'Learn from tracks you skip or reject',
        type: 'boolean',
        default: true
      }
    },
    performance: {
      speed: 3,
      accuracy: 3,
      versatility: 4,
      learningRate: 5
    },
    requirements: {
      minTracks: 200,
      requiresUserData: true,
      requiresContextData: false,
      computeIntensive: true
    }
  },
  {
    id: 'neural_similarity',
    name: 'Neural Similarity Engine',
    description: 'Deep learning model for advanced track similarity and transition quality',
    category: 'hybrid',
    complexity: 'expert',
    strengths: ['Deep analysis', 'Subtle patterns', 'High accuracy'],
    weaknesses: ['Resource intensive', 'Black box', 'Requires large dataset'],
    bestFor: ['Professional use', 'Complex music', 'High-quality suggestions'],
    parameters: {
      modelComplexity: {
        name: 'Model Complexity',
        description: 'Trade-off between accuracy and speed',
        type: 'select',
        default: 'balanced',
        options: ['fast', 'balanced', 'accurate', 'maximum']
      },
      featureWeights: {
        name: 'Feature Balance',
        description: 'Balance between audio and metadata features',
        type: 'number',
        default: 0.6,
        min: 0,
        max: 1,
        step: 0.1
      },
      confidenceThreshold: {
        name: 'Confidence Threshold',
        description: 'Minimum confidence for suggestions',
        type: 'number',
        default: 0.7,
        min: 0.1,
        max: 0.99,
        step: 0.01
      },
      noveltyBoost: {
        name: 'Novelty Boost',
        description: 'Encourage discovering new combinations',
        type: 'number',
        default: 0.2,
        min: 0,
        max: 1,
        step: 0.1
      }
    },
    performance: {
      speed: 1,
      accuracy: 5,
      versatility: 5,
      learningRate: 3
    },
    requirements: {
      minTracks: 500,
      requiresUserData: true,
      requiresContextData: true,
      computeIntensive: true
    }
  }
]

// Algorithm presets
const ALGORITHM_PRESETS = {
  beginner: {
    name: 'Beginner Friendly',
    description: 'Simple, safe suggestions for new DJs',
    algorithms: ['harmonic_classic'],
    weights: { harmonic_classic: 1.0 }
  },
  professional: {
    name: 'Professional Mix',
    description: 'Balanced approach for experienced DJs',
    algorithms: ['harmonic_classic', 'energy_progression', 'contextual_ai'],
    weights: { harmonic_classic: 0.3, energy_progression: 0.4, contextual_ai: 0.3 }
  },
  creative: {
    name: 'Creative Explorer',
    description: 'AI-powered creative suggestions',
    algorithms: ['neural_similarity', 'personal_learning'],
    weights: { neural_similarity: 0.6, personal_learning: 0.4 }
  },
  adaptive: {
    name: 'Fully Adaptive',
    description: 'All algorithms working together',
    algorithms: ['harmonic_classic', 'energy_progression', 'contextual_ai', 'personal_learning', 'neural_similarity'],
    weights: { 
      harmonic_classic: 0.2, 
      energy_progression: 0.25, 
      contextual_ai: 0.25, 
      personal_learning: 0.2, 
      neural_similarity: 0.1 
    }
  }
}

export const AIAlgorithmSelector: React.FC<AIAlgorithmSelectorProps> = ({
  algorithms = DEFAULT_ALGORITHMS,
  selectedAlgorithms,
  algorithmWeights,
  algorithmParams,
  onSelectionChange,
  onWeightChange,
  onParameterChange,
  onPresetLoad,
  showAdvanced = false,
  maxAlgorithms = 5
}) => {
  const [expanded, setExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState<'selection' | 'weights' | 'parameters' | 'presets'>('selection')
  const [selectedAlgorithmForParams, setSelectedAlgorithmForParams] = useState<string | null>(null)
  const [showRequirements, setShowRequirements] = useState(false)

  // Get algorithm by ID
  const getAlgorithm = (id: string) => algorithms.find(a => a.id === id)

  // Get category icon
  const getCategoryIcon = (category: AIAlgorithm['category']) => {
    switch (category) {
      case 'harmonic': return <Music className="h-4 w-4 text-purple-400" />
      case 'rhythmic': return <Gauge className="h-4 w-4 text-blue-400" />
      case 'contextual': return <Clock className="h-4 w-4 text-orange-400" />
      case 'learning': return <Brain className="h-4 w-4 text-green-400" />
      case 'hybrid': return <Zap className="h-4 w-4 text-yellow-400" />
    }
  }

  // Get complexity color
  const getComplexityColor = (complexity: AIAlgorithm['complexity']) => {
    switch (complexity) {
      case 'basic': return 'text-green-400'
      case 'intermediate': return 'text-yellow-400'
      case 'advanced': return 'text-orange-400'
      case 'expert': return 'text-red-400'
    }
  }

  // Check if algorithm requirements are met
  const checkRequirements = (algorithm: AIAlgorithm) => {
    // This would check against actual data in a real implementation
    return {
      met: true, // Simplified
      issues: [] as string[]
    }
  }

  // Render performance radar
  const renderPerformanceRadar = (performance: AIAlgorithm['performance']) => {
    const metrics = [
      { key: 'speed', label: 'Speed', value: performance.speed },
      { key: 'accuracy', label: 'Accuracy', value: performance.accuracy },
      { key: 'versatility', label: 'Versatility', value: performance.versatility },
      { key: 'learningRate', label: 'Learning', value: performance.learningRate }
    ]

    return (
      <div className="grid grid-cols-2 gap-2">
        {metrics.map(metric => (
          <div key={metric.key} className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{metric.label}:</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < metric.value ? 'bg-purple-400' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Render parameter control
  const renderParameterControl = (algorithm: AIAlgorithm, paramKey: string) => {
    const param = algorithm.parameters[paramKey]
    const currentValue = algorithmParams[algorithm.id]?.[paramKey] ?? param.default

    const handleChange = (value: any) => {
      onParameterChange(algorithm.id, paramKey, value)
    }

    switch (param.type) {
      case 'number':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                {param.name}
              </label>
              <span className="text-sm text-gray-400 font-mono">
                {currentValue}
              </span>
            </div>
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step}
              value={currentValue}
              onChange={(e) => handleChange(parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500">{param.description}</p>
          </div>
        )

      case 'boolean':
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={currentValue}
                onChange={(e) => handleChange(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-300">
                {param.name}
              </span>
            </label>
            <p className="text-xs text-gray-500">{param.description}</p>
          </div>
        )

      case 'select':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              {param.name}
            </label>
            <select
              value={currentValue}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
            >
              {param.options?.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">{param.description}</p>
          </div>
        )
    }
  }

  if (!expanded) {
    return (
      <div className="bg-gray-800/50 rounded-lg border border-gray-700">
        <button
          onClick={() => setExpanded(true)}
          className="w-full p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">AI Algorithms</h3>
            <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded-full text-xs">
              {selectedAlgorithms.length} active
            </span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">AI Algorithms</h3>
            <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded-full text-xs">
              {selectedAlgorithms.length} active
            </span>
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'selection', label: 'Selection', icon: CheckCircle },
          { id: 'weights', label: 'Weights', icon: BarChart3 },
          { id: 'parameters', label: 'Parameters', icon: Settings },
          { id: 'presets', label: 'Presets', icon: Star }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'selection' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Select up to {maxAlgorithms} algorithms to combine their suggestions
              </p>
              <button
                onClick={() => setShowRequirements(!showRequirements)}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                {showRequirements ? 'Hide' : 'Show'} Requirements
              </button>
            </div>

            <div className="space-y-3">
              {algorithms.map(algorithm => {
                const isSelected = selectedAlgorithms.includes(algorithm.id)
                const canSelect = selectedAlgorithms.length < maxAlgorithms || isSelected
                const requirements = checkRequirements(algorithm)

                return (
                  <div
                    key={algorithm.id}
                    className={`p-4 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-purple-500/10 border-purple-500/30'
                        : canSelect
                        ? 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                        : 'bg-gray-900/30 border-gray-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onSelectionChange([...selectedAlgorithms, algorithm.id])
                            } else {
                              onSelectionChange(selectedAlgorithms.filter(id => id !== algorithm.id))
                            }
                          }}
                          disabled={!canSelect}
                          className="rounded"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getCategoryIcon(algorithm.category)}
                          <h4 className="font-medium text-white">{algorithm.name}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded ${getComplexityColor(algorithm.complexity).replace('text-', 'bg-').replace('400', '500/20')}`}>
                            {algorithm.complexity}
                          </span>
                        </div>

                        <p className="text-sm text-gray-300 mb-3">{algorithm.description}</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <h5 className="text-xs font-medium text-green-400 mb-1">Strengths</h5>
                            <ul className="text-xs text-gray-400 space-y-0.5">
                              {algorithm.strengths.slice(0, 2).map((strength, idx) => (
                                <li key={idx}>• {strength}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h5 className="text-xs font-medium text-orange-400 mb-1">Best For</h5>
                            <ul className="text-xs text-gray-400 space-y-0.5">
                              {algorithm.bestFor.slice(0, 2).map((use, idx) => (
                                <li key={idx}>• {use}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h5 className="text-xs font-medium text-gray-400 mb-1">Performance</h5>
                            {renderPerformanceRadar(algorithm.performance)}
                          </div>
                        </div>

                        {showRequirements && (
                          <div className="mt-3 p-3 bg-gray-900/50 rounded border border-gray-700">
                            <h5 className="text-xs font-medium text-gray-400 mb-2">Requirements</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Min Tracks:</span>
                                <span className="text-gray-300">{algorithm.requirements.minTracks}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">User Data:</span>
                                <span className={algorithm.requirements.requiresUserData ? 'text-orange-300' : 'text-green-300'}>
                                  {algorithm.requirements.requiresUserData ? 'Required' : 'Optional'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Context:</span>
                                <span className={algorithm.requirements.requiresContextData ? 'text-orange-300' : 'text-green-300'}>
                                  {algorithm.requirements.requiresContextData ? 'Required' : 'Optional'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Compute:</span>
                                <span className={algorithm.requirements.computeIntensive ? 'text-red-300' : 'text-green-300'}>
                                  {algorithm.requirements.computeIntensive ? 'High' : 'Low'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'weights' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Adjust how much each algorithm influences the final suggestions
            </p>

            {selectedAlgorithms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>Select algorithms first to adjust their weights</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedAlgorithms.map(algorithmId => {
                  const algorithm = getAlgorithm(algorithmId)
                  if (!algorithm) return null

                  const weight = algorithmWeights[algorithmId] || 0

                  return (
                    <div key={algorithmId} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(algorithm.category)}
                          <span className="font-medium text-white">{algorithm.name}</span>
                        </div>
                        <span className="text-sm text-gray-400 font-mono">
                          {Math.round(weight * 100)}%
                        </span>
                      </div>
                      
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={weight}
                        onChange={(e) => onWeightChange(algorithmId, parseFloat(e.target.value))}
                        className="w-full"
                      />
                      
                      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 transition-all"
                          style={{ width: `${weight * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}

                <div className="mt-6 p-3 bg-gray-900/50 rounded border border-gray-700">
                  <div className="text-xs text-gray-400 mb-2">Weight Distribution</div>
                  <div className="flex h-4 rounded-full overflow-hidden">
                    {selectedAlgorithms.map((algorithmId, idx) => {
                      const algorithm = getAlgorithm(algorithmId)
                      const weight = algorithmWeights[algorithmId] || 0
                      const colors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500']
                      
                      return (
                        <div
                          key={algorithmId}
                          className={`${colors[idx % colors.length]} transition-all`}
                          style={{ width: `${weight * 100}%` }}
                          title={`${algorithm?.name}: ${Math.round(weight * 100)}%`}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'parameters' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Fine-tune algorithm behavior with custom parameters
              </p>
              {selectedAlgorithms.length > 1 && (
                <select
                  value={selectedAlgorithmForParams || ''}
                  onChange={(e) => setSelectedAlgorithmForParams(e.target.value || null)}
                  className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
                >
                  <option value="">All Algorithms</option>
                  {selectedAlgorithms.map(algorithmId => {
                    const algorithm = getAlgorithm(algorithmId)
                    return (
                      <option key={algorithmId} value={algorithmId}>
                        {algorithm?.name}
                      </option>
                    )
                  })}
                </select>
              )}
            </div>

            {selectedAlgorithms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Settings className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>Select algorithms first to configure their parameters</p>
              </div>
            ) : (
              <div className="space-y-6">
                {selectedAlgorithms
                  .filter(algorithmId => !selectedAlgorithmForParams || algorithmId === selectedAlgorithmForParams)
                  .map(algorithmId => {
                    const algorithm = getAlgorithm(algorithmId)
                    if (!algorithm) return null

                    return (
                      <div key={algorithmId} className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
                          {getCategoryIcon(algorithm.category)}
                          <h4 className="font-medium text-white">{algorithm.name}</h4>
                        </div>

                        <div className="space-y-4">
                          {Object.entries(algorithm.parameters).map(([paramKey]) => (
                            <div key={paramKey}>
                              {renderParameterControl(algorithm, paramKey)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'presets' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Quick configurations for common DJ scenarios
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(ALGORITHM_PRESETS).map(([presetId, preset]) => (
                <div
                  key={presetId}
                  className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-white">{preset.name}</h4>
                    <button
                      onClick={() => onPresetLoad(presetId)}
                      className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                    >
                      Load
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-300 mb-3">{preset.description}</p>
                  
                  <div className="space-y-2">
                    <div className="text-xs text-gray-400">Algorithms:</div>
                    <div className="flex flex-wrap gap-1">
                      {preset.algorithms.map(algorithmId => {
                        const algorithm = getAlgorithm(algorithmId)
                        return (
                          <span
                            key={algorithmId}
                            className="px-2 py-1 bg-gray-700 text-xs rounded flex items-center gap-1"
                          >
                            {algorithm && getCategoryIcon(algorithm.category)}
                            {algorithm?.name}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}