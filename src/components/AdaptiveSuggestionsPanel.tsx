// Production Adaptive Suggestions Panel Component
// Displays AI-powered suggestions with detailed reasoning

import React, { useState } from 'react'
import { AdaptiveSuggestion } from '../lib/adaptiveSuggestionEngine'
import { 
  Brain, Music, Zap, TrendingUp, Sparkles, 
  ChevronDown, ChevronUp, Check, X, Info,
  Clock, AlertCircle, ThumbsUp, ThumbsDown
} from 'lucide-react'

interface AdaptiveSuggestionsPanelProps {
  suggestions: AdaptiveSuggestion[]
  onAccept: (suggestionId: string) => void
  onReject: (suggestionId: string, reason?: string) => void
  getSuggestionStatus: (suggestionId: string) => 'pending' | 'accepted' | 'rejected'
  isLoading?: boolean
  confidenceStats?: any
}

export const AdaptiveSuggestionsPanel: React.FC<AdaptiveSuggestionsPanelProps> = ({
  suggestions,
  onAccept,
  onReject,
  getSuggestionStatus,
  isLoading,
  confidenceStats
}) => {
  const [expanded, setExpanded] = useState(true)
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [filterType, setFilterType] = useState<'all' | AdaptiveSuggestion['type']>('all')
  
  const getSuggestionIcon = (type: AdaptiveSuggestion['type']) => {
    switch (type) {
      case 'track': return <Music className="h-4 w-4 text-purple-400" />
      case 'transition': return <Zap className="h-4 w-4 text-yellow-400" />
      case 'effect': return <Sparkles className="h-4 w-4 text-blue-400" />
      case 'energy': return <TrendingUp className="h-4 w-4 text-green-400" />
      case 'special': return <AlertCircle className="h-4 w-4 text-orange-400" />
    }
  }
  
  const getTimingColor = (timing: AdaptiveSuggestion['timing']) => {
    switch (timing) {
      case 'immediate': return 'text-red-400'
      case 'next': return 'text-orange-400'
      case 'upcoming': return 'text-yellow-400'
      case 'future': return 'text-gray-400'
    }
  }
  
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-400'
    if (confidence >= 0.6) return 'text-yellow-400'
    if (confidence >= 0.4) return 'text-orange-400'
    return 'text-red-400'
  }
  
  const filteredSuggestions = filterType === 'all' 
    ? suggestions 
    : suggestions.filter(s => s.type === filterType)
  
  const renderSuggestionContent = (suggestion: AdaptiveSuggestion) => {
    switch (suggestion.type) {
      case 'track':
        return (
          <div className="space-y-1">
            <div className="font-medium text-white">
              {suggestion.suggestion.track?.name}
            </div>
            <div className="text-sm text-gray-400">
              {suggestion.suggestion.track?.artists?.join(', ')}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-purple-400">
                {Math.round((suggestion.suggestion.track?.matchScore || 0) * 100)}% match
              </span>
              {suggestion.suggestion.track?.tempo && (
                <span className="text-gray-500">
                  {Math.round(suggestion.suggestion.track.tempo)} BPM
                </span>
              )}
              {suggestion.suggestion.track?.camelotKey && (
                <span className="text-gray-500">
                  {suggestion.suggestion.track.camelotKey}
                </span>
              )}
            </div>
          </div>
        )
      
      case 'transition':
        return (
          <div className="space-y-1">
            <div className="font-medium text-white">
              {suggestion.suggestion.transition?.technique}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span>{suggestion.suggestion.transition?.duration}s duration</span>
              <span>Difficulty: {suggestion.suggestion.transition?.difficulty}/5</span>
            </div>
          </div>
        )
      
      case 'effect':
        return (
          <div className="space-y-1">
            <div className="font-medium text-white">
              {suggestion.suggestion.effects?.[0]?.type} Effect
            </div>
            <div className="text-sm text-gray-400">
              {suggestion.suggestion.effects?.[0]?.preset} preset
            </div>
          </div>
        )
      
      case 'energy':
        return (
          <div className="space-y-1">
            <div className="font-medium text-white">
              Energy {suggestion.suggestion.energyAdjustment?.method.replace('_', ' ')}
            </div>
            <div className="text-sm text-gray-400">
              Target: {Math.round((suggestion.suggestion.energyAdjustment?.target || 0) * 100)}%
            </div>
          </div>
        )
      
      case 'special':
        return (
          <div className="space-y-1">
            <div className="font-medium text-white capitalize">
              {suggestion.suggestion.specialMoment?.type} Moment
            </div>
            <div className="text-sm text-gray-400">
              In {suggestion.suggestion.specialMoment?.countdown} minutes
            </div>
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
            <h3 className="text-lg font-semibold text-white">AI Suggestions</h3>
            {suggestions.length > 0 && (
              <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded-full text-xs">
                {suggestions.length}
              </span>
            )}
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
            <h3 className="text-lg font-semibold text-white">AI Suggestions</h3>
            {isLoading && (
              <div className="animate-pulse text-xs text-gray-400">Analyzing...</div>
            )}
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
        
        {/* Confidence Stats */}
        {confidenceStats && (
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
            <span>
              Avg Confidence: 
              <span className={`ml-1 ${getConfidenceColor(confidenceStats.average)}`}>
                {Math.round(confidenceStats.average * 100)}%
              </span>
            </span>
            {confidenceStats.byType.map((stat: any) => (
              <span key={stat.type} className="flex items-center gap-1">
                {getSuggestionIcon(stat.type)}
                <span className={getConfidenceColor(stat.confidence)}>
                  {Math.round(stat.confidence * 100)}%
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Filter Tabs */}
      <div className="flex border-b border-gray-700">
        {(['all', 'track', 'transition', 'effect', 'energy', 'special'] as const).map(type => {
          const count = type === 'all' 
            ? suggestions.length 
            : suggestions.filter(s => s.type === type).length
          
          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                filterType === type
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {type === 'all' ? 'All' : getSuggestionIcon(type as AdaptiveSuggestion['type'])}
              <span className="capitalize">{type}</span>
              {count > 0 && (
                <span className="text-xs opacity-70">({count})</span>
              )}
            </button>
          )
        })}
      </div>
      
      {/* Suggestions List */}
      <div className="p-4">
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>No {filterType === 'all' ? '' : filterType} suggestions available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSuggestions.map(suggestion => {
              const status = getSuggestionStatus(suggestion.id)
              const isSelected = selectedSuggestion === suggestion.id
              
              return (
                <div
                  key={suggestion.id}
                  className={`rounded-lg border transition-all ${
                    status === 'accepted' 
                      ? 'bg-green-500/10 border-green-500/30'
                      : status === 'rejected'
                      ? 'bg-red-500/10 border-red-500/30 opacity-50'
                      : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {/* Main Content */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="mt-1">
                        {getSuggestionIcon(suggestion.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        {renderSuggestionContent(suggestion)}
                        
                        {/* Primary Reasoning */}
                        <div className="mt-2 text-sm text-gray-400">
                          {suggestion.reasoning.primary}
                        </div>
                        
                        {/* Timing & Priority */}
                        <div className="mt-2 flex items-center gap-3 text-xs">
                          <span className={`flex items-center gap-1 ${getTimingColor(suggestion.timing)}`}>
                            <Clock className="h-3 w-3" />
                            {suggestion.timing}
                          </span>
                          <span className="text-gray-500">
                            Priority: {Math.round(suggestion.priority * 100)}%
                          </span>
                          <span className={getConfidenceColor(suggestion.confidence)}>
                            {Math.round(suggestion.confidence * 100)}% confident
                          </span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      {status === 'pending' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onAccept(suggestion.id)}
                            className="p-2 hover:bg-green-500/20 rounded transition-colors"
                            title="Accept suggestion"
                          >
                            <ThumbsUp className="h-4 w-4 text-green-400" />
                          </button>
                          <button
                            onClick={() => onReject(suggestion.id)}
                            className="p-2 hover:bg-red-500/20 rounded transition-colors"
                            title="Reject suggestion"
                          >
                            <ThumbsDown className="h-4 w-4 text-red-400" />
                          </button>
                          <button
                            onClick={() => setSelectedSuggestion(
                              isSelected ? null : suggestion.id
                            )}
                            className="p-2 hover:bg-gray-700 rounded transition-colors"
                            title="Show details"
                          >
                            <Info className="h-4 w-4 text-gray-400" />
                          </button>
                        </div>
                      )}
                      
                      {status === 'accepted' && (
                        <Check className="h-5 w-5 text-green-400" />
                      )}
                      
                      {status === 'rejected' && (
                        <X className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    
                    {/* Warnings */}
                    {suggestion.suggestion.track?.warnings && 
                     suggestion.suggestion.track.warnings.length > 0 && (
                      <div className="mt-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                        {suggestion.suggestion.track.warnings.map((warning, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-yellow-200">
                            <AlertCircle className="h-3 w-3" />
                            {warning}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Expanded Details */}
                  {isSelected && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-700 pt-3">
                      {/* Factors */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Decision Factors</h4>
                        <div className="space-y-1">
                          {suggestion.reasoning.factors.map((factor, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-gray-500 capitalize">
                                {factor.factor}:
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-300">{factor.description}</span>
                                <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-purple-500"
                                    style={{ width: `${factor.impact * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Alternatives */}
                      {suggestion.reasoning.alternatives && 
                       suggestion.reasoning.alternatives.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-400 mb-2">Alternatives</h4>
                          <ul className="space-y-1">
                            {suggestion.reasoning.alternatives.map((alt, idx) => (
                              <li key={idx} className="text-xs text-gray-500 flex items-start gap-1">
                                <span>•</span>
                                <span>{alt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Metadata */}
                      <div className="text-xs text-gray-600">
                        <div>Generated: {new Date(suggestion.metadata.generatedAt).toLocaleTimeString()}</div>
                        <div>Expires: {new Date(suggestion.metadata.expiresAt).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}