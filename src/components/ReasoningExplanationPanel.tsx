// Production Reasoning Explanation Panel Component
// Provides detailed AI reasoning for track suggestions and transitions

import React, { useState } from 'react'
import { 
  Brain, ChevronDown, ChevronUp, Lightbulb, 
  TrendingUp, Music, Zap, Users, Clock,
  BarChart3, Target, AlertTriangle, CheckCircle,
  Info, Star, Gauge
} from 'lucide-react'

export interface ReasoningFactor {
  category: 'harmonic' | 'rhythmic' | 'energy' | 'mood' | 'contextual' | 'predictive' | 'learning'
  name: string
  value: number // 0-1
  weight: number // importance in final decision
  description: string
  details?: string
  confidence: number
}

export interface AIReasoning {
  suggestion: {
    type: 'track' | 'transition' | 'effect'
    item: any
    confidence: number
  }
  
  // Primary reasoning
  primary: {
    reason: string
    strength: number
    category: string
  }
  
  // Detailed factors
  factors: ReasoningFactor[]
  
  // Supporting evidence
  evidence: {
    historical: string[]
    contextual: string[]
    analytical: string[]
  }
  
  // Potential concerns
  concerns: {
    level: 'low' | 'medium' | 'high'
    issues: string[]
    mitigations: string[]
  }
  
  // Alternative options
  alternatives: {
    suggestion: any
    reason: string
    tradeoffs: string
  }[]
  
  // Learning insights
  learning: {
    userPattern: string
    improvement: string
    confidence: number
  }
}

interface ReasoningExplanationPanelProps {
  reasoning: AIReasoning
  onAskQuestion?: (question: string) => void
  onFeedback?: (helpful: boolean, comment?: string) => void
  showLearningInsights?: boolean
}

export const ReasoningExplanationPanel: React.FC<ReasoningExplanationPanelProps> = ({
  reasoning,
  onAskQuestion,
  onFeedback,
  showLearningInsights = true
}) => {
  const [expanded, setExpanded] = useState(true)
  const [activeSection, setActiveSection] = useState<'overview' | 'factors' | 'evidence' | 'alternatives'>('overview')
  const [showExpertMode, setShowExpertMode] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState(false)
  
  const getCategoryIcon = (category: ReasoningFactor['category']) => {
    switch (category) {
      case 'harmonic': return <Music className="h-4 w-4 text-purple-400" />
      case 'rhythmic': return <Gauge className="h-4 w-4 text-blue-400" />
      case 'energy': return <Zap className="h-4 w-4 text-yellow-400" />
      case 'mood': return <TrendingUp className="h-4 w-4 text-green-400" />
      case 'contextual': return <Clock className="h-4 w-4 text-orange-400" />
      case 'predictive': return <Target className="h-4 w-4 text-red-400" />
      case 'learning': return <Brain className="h-4 w-4 text-pink-400" />
    }
  }
  
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-400'
    if (confidence >= 0.6) return 'text-yellow-400'
    if (confidence >= 0.4) return 'text-orange-400'
    return 'text-red-400'
  }
  
  const getConcernColor = (level: string): string => {
    switch (level) {
      case 'low': return 'text-green-400'
      case 'medium': return 'text-yellow-400'
      case 'high': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }
  
  const renderFactorDetails = (factor: ReasoningFactor) => (
    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getCategoryIcon(factor.category)}
          <h4 className="font-medium text-white">{factor.name}</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${getConfidenceColor(factor.confidence)}`}>
            {Math.round(factor.confidence * 100)}%
          </span>
          <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500"
              style={{ width: `${factor.value * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      <p className="text-sm text-gray-300 mb-2">{factor.description}</p>
      
      {factor.details && (
        <div className="text-xs text-gray-400 mt-2 p-2 bg-gray-800 rounded">
          {factor.details}
        </div>
      )}
      
      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
        <span>Impact Weight: {Math.round(factor.weight * 100)}%</span>
        <span>Value: {factor.value.toFixed(2)}</span>
      </div>
    </div>
  )
  
  const renderQuickQuestions = () => {
    const questions = [
      "Why is this better than other options?",
      "What could go wrong with this choice?",
      "How does this fit my playing style?",
      "What if the crowd doesn't respond well?",
      "Are there safer alternatives?"
    ]
    
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-400">Quick Questions</h4>
        <div className="flex flex-wrap gap-2">
          {questions.map((question, idx) => (
            <button
              key={idx}
              onClick={() => onAskQuestion?.(question)}
              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    )
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
            <h3 className="text-lg font-semibold text-white">AI Reasoning</h3>
            <span className={`text-sm ${getConfidenceColor(reasoning.suggestion.confidence)}`}>
              {Math.round(reasoning.suggestion.confidence * 100)}% confident
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
            <h3 className="text-lg font-semibold text-white">AI Reasoning</h3>
            <span className={`text-sm ${getConfidenceColor(reasoning.suggestion.confidence)}`}>
              {Math.round(reasoning.suggestion.confidence * 100)}% confident
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExpertMode(!showExpertMode)}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              {showExpertMode ? 'Simple' : 'Expert'} Mode
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Primary reasoning */}
        <div className="mt-3 p-3 bg-purple-500/10 rounded border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-200">Main Reason</span>
            <div className="flex-1 h-2 bg-purple-900/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500"
                style={{ width: `${reasoning.primary.strength * 100}%` }}
              />
            </div>
          </div>
          <p className="text-purple-100">{reasoning.primary.reason}</p>
        </div>
      </div>
      
      {/* Navigation tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'overview', label: 'Overview', icon: Info },
          { id: 'factors', label: 'Analysis', icon: BarChart3 },
          { id: 'evidence', label: 'Evidence', icon: CheckCircle },
          { id: 'alternatives', label: 'Options', icon: Target }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id as any)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeSection === id
                ? 'text-white border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-4">
        {activeSection === 'overview' && (
          <div className="space-y-4">
            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-gray-900/50 rounded">
                <div className={`text-2xl font-bold ${getConfidenceColor(reasoning.suggestion.confidence)}`}>
                  {Math.round(reasoning.suggestion.confidence * 100)}%
                </div>
                <div className="text-xs text-gray-400">Overall</div>
              </div>
              
              <div className="text-center p-3 bg-gray-900/50 rounded">
                <div className="text-2xl font-bold text-purple-400">
                  {reasoning.factors.length}
                </div>
                <div className="text-xs text-gray-400">Factors</div>
              </div>
              
              <div className="text-center p-3 bg-gray-900/50 rounded">
                <div className={`text-2xl font-bold ${getConcernColor(reasoning.concerns.level)}`}>
                  {reasoning.concerns.level.toUpperCase()}
                </div>
                <div className="text-xs text-gray-400">Risk</div>
              </div>
              
              <div className="text-center p-3 bg-gray-900/50 rounded">
                <div className="text-2xl font-bold text-blue-400">
                  {reasoning.alternatives.length}
                </div>
                <div className="text-xs text-gray-400">Options</div>
              </div>
            </div>
            
            {/* Top factors summary */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-3">Key Decision Factors</h4>
              <div className="space-y-2">
                {reasoning.factors
                  .sort((a, b) => (b.weight * b.value) - (a.weight * a.value))
                  .slice(0, 3)
                  .map((factor, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-900/30 rounded">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(factor.category)}
                        <span className="text-sm text-gray-300">{factor.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500"
                            style={{ width: `${factor.value * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-8 text-right">
                          {Math.round(factor.value * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            
            {/* Quick questions */}
            {onAskQuestion && renderQuickQuestions()}
          </div>
        )}
        
        {activeSection === 'factors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-400">Detailed Factor Analysis</h4>
              <select
                className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1"
                onChange={(e) => {
                  // Filter factors by category
                }}
              >
                <option value="all">All Categories</option>
                <option value="harmonic">Harmonic</option>
                <option value="rhythmic">Rhythmic</option>
                <option value="energy">Energy</option>
                <option value="mood">Mood</option>
                <option value="contextual">Contextual</option>
                <option value="predictive">Predictive</option>
                <option value="learning">Learning</option>
              </select>
            </div>
            
            <div className="space-y-3">
              {reasoning.factors
                .sort((a, b) => (b.weight * b.value) - (a.weight * a.value))
                .map((factor, idx) => (
                  <div key={idx}>
                    {renderFactorDetails(factor)}
                  </div>
                ))}
            </div>
            
            {showExpertMode && (
              <div className="mt-4 p-3 bg-gray-900/50 rounded border border-gray-600">
                <h5 className="text-xs font-medium text-gray-400 mb-2">Expert Analysis</h5>
                <div className="text-xs text-gray-300 space-y-1">
                  <div>Weighted Score: {reasoning.factors.reduce((sum, f) => sum + (f.weight * f.value), 0).toFixed(3)}</div>
                  <div>Confidence Variance: {(Math.max(...reasoning.factors.map(f => f.confidence)) - Math.min(...reasoning.factors.map(f => f.confidence))).toFixed(3)}</div>
                  <div>Factor Count: {reasoning.factors.length}</div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeSection === 'evidence' && (
          <div className="space-y-4">
            {/* Historical evidence */}
            {reasoning.evidence.historical.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Historical Evidence
                </h4>
                <div className="space-y-2">
                  {reasoning.evidence.historical.map((evidence, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-gray-900/30 rounded">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-300">{evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Contextual evidence */}
            {reasoning.evidence.contextual.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Contextual Evidence
                </h4>
                <div className="space-y-2">
                  {reasoning.evidence.contextual.map((evidence, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-gray-900/30 rounded">
                      <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-300">{evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Analytical evidence */}
            {reasoning.evidence.analytical.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytical Evidence
                </h4>
                <div className="space-y-2">
                  {reasoning.evidence.analytical.map((evidence, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-gray-900/30 rounded">
                      <Target className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-300">{evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Concerns */}
            {reasoning.concerns.issues.length > 0 && (
              <div className="p-3 bg-yellow-500/10 rounded border border-yellow-500/20">
                <h4 className="text-sm font-medium text-yellow-300 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Potential Concerns ({reasoning.concerns.level} risk)
                </h4>
                <div className="space-y-2">
                  {reasoning.concerns.issues.map((issue, idx) => (
                    <div key={idx} className="text-sm text-yellow-200">
                      • {issue}
                      {reasoning.concerns.mitigations[idx] && (
                        <div className="ml-4 mt-1 text-xs text-yellow-300/70">
                          Mitigation: {reasoning.concerns.mitigations[idx]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeSection === 'alternatives' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-400">Alternative Options</h4>
            
            {reasoning.alternatives.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No alternatives identified</p>
                <p className="text-xs mt-1">This appears to be the best option available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reasoning.alternatives.map((alt, idx) => (
                  <div key={idx} className="p-3 bg-gray-900/50 rounded border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-white">Alternative #{idx + 1}</h5>
                      <button className="text-xs text-purple-400 hover:text-purple-300">
                        Select This
                      </button>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{alt.reason}</p>
                    <div className="text-xs text-gray-400 p-2 bg-gray-800 rounded">
                      <span className="text-yellow-400">Tradeoffs:</span> {alt.tradeoffs}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Learning insights */}
        {showLearningInsights && (
          <div className="mt-6 p-3 bg-pink-500/10 rounded border border-pink-500/20">
            <h4 className="text-sm font-medium text-pink-300 mb-2 flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Learning Insights
            </h4>
            <div className="text-sm text-pink-200 space-y-1">
              <p><span className="text-pink-400">Your Pattern:</span> {reasoning.learning.userPattern}</p>
              <p><span className="text-pink-400">Improvement:</span> {reasoning.learning.improvement}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-pink-400">Learning Confidence:</span>
                <div className="w-24 h-2 bg-pink-900/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-pink-500"
                    style={{ width: `${reasoning.learning.confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs text-pink-300">
                  {Math.round(reasoning.learning.confidence * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Feedback */}
        {onFeedback && !feedbackGiven && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Was this explanation helpful?</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onFeedback(true)
                    setFeedbackGiven(true)
                  }}
                  className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                >
                  Yes, helpful
                </button>
                <button
                  onClick={() => {
                    onFeedback(false)
                    setFeedbackGiven(true)
                  }}
                  className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  Needs improvement
                </button>
              </div>
            </div>
          </div>
        )}
        
        {feedbackGiven && (
          <div className="mt-4 p-2 bg-green-500/10 rounded border border-green-500/20 text-center">
            <p className="text-sm text-green-300">Thanks for your feedback! 🎧</p>
          </div>
        )}
      </div>
    </div>
  )
}