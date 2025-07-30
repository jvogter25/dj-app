// Production Enhanced Smart Queue Component
// Adds transition previews, confidence scores, and detailed AI analysis

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  ChevronDown, ChevronUp, Sparkles, TrendingDown, TrendingUp, 
  Minus, RefreshCw, Play, Zap, Music, Eye, BarChart3,
  AlertTriangle, CheckCircle, Clock, Target
} from 'lucide-react'
import { trackDB, TrackAnalysis } from '../lib/trackDatabase'
import { getKeyCompatibility } from '../lib/harmonicMixing'
import { transitionSuggestionEngine } from '../lib/transitionSuggestionEngine'
import { transitionQualityPredictor } from '../lib/transitionQualityPredictor'
import { contextAwareSystem, DJContext } from '../lib/contextAwareSystem'

interface EnhancedSmartQueueProps {
  currentTrack?: {
    id: string
    name: string
    artists: { name: string }[]
    bpm?: number
    camelotKey?: string
    energy?: number
    valence?: number
    audio_features?: any
    analysis?: any
  }
  onTrackSelect: (track: any, deck: 'A' | 'B') => void
  targetDeck: 'A' | 'B'
  context?: DJContext
  onPreviewTransition?: (fromTrack: any, toTrack: any) => void
}

interface EnhancedSuggestion extends TrackAnalysis {
  // Confidence metrics
  confidence: {
    overall: number
    harmonic: number
    energy: number
    temporal: number
    contextual: number
  }
  
  // Transition preview
  transitionPreview?: {
    technique: string
    duration: number
    difficulty: number
    quality: number
    automation: {
      crossfader: any[]
      eq: any[]
      effects?: any[]
    }
    timing: {
      outPoint: number
      inPoint: number
      totalDuration: number
    }
    warnings?: string[]
  }
  
  // Matching details
  matchDetails: {
    keyDistance: number
    tempoDiff: number
    energyDiff: number
    moodSimilarity: number
    reasons: string[]
    risks: string[]
  }
  
  // AI reasoning
  aiInsights: {
    crowdResponse: number
    peakMoments: number[]
    energyProgression: string
    recommendation: string
  }
}

interface SuggestionCategory {
  type: 'down' | 'same' | 'up'
  title: string
  icon: React.ReactNode
  description: string
  tracks: EnhancedSuggestion[]
  avgConfidence: number
}

export const EnhancedSmartQueue: React.FC<EnhancedSmartQueueProps> = ({ 
  currentTrack, 
  onTrackSelect, 
  targetDeck,
  context,
  onPreviewTransition
}) => {
  const [expanded, setExpanded] = useState(true)
  const [suggestions, setSuggestions] = useState<SuggestionCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<'down' | 'same' | 'up'>('same')
  const [previewingTrack, setPreviewingTrack] = useState<string | null>(null)
  const [showConfidenceDetails, setShowConfidenceDetails] = useState(false)
  const [analysisDepth, setAnalysisDepth] = useState<'basic' | 'detailed' | 'expert'>('detailed')
  
  // Generate enhanced suggestions with AI analysis
  const generateEnhancedSuggestions = useCallback(async () => {
    if (!currentTrack?.bpm || !currentTrack?.camelotKey || currentTrack.camelotKey === 'Unknown') {
      console.log('Cannot generate suggestions - missing track features')
      return
    }

    setLoading(true)
    try {
      const allTracks = await trackDB.getAllTracks()
      
      // Filter available tracks
      const availableTracks = allTracks.filter(t => 
        t.id !== currentTrack.id && 
        t.tempo && 
        t.camelotKey && 
        t.camelotKey !== 'Unknown'
      )
      
      if (availableTracks.length === 0) {
        setSuggestions(createEmptyCategories())
        return
      }

      // Enhanced scoring with AI analysis
      const enhancedTracks = await Promise.all(
        availableTracks.map(async (track) => {
          const enhanced = await enhanceTrackWithAI(track, currentTrack)
          return enhanced
        })
      )

      // Sort by overall confidence
      enhancedTracks.sort((a, b) => b.confidence.overall - a.confidence.overall)

      // Categorize by energy progression
      const categories: SuggestionCategory[] = [
        {
          type: 'down',
          title: 'Bring It Down',
          icon: <TrendingDown className="w-4 h-4" />,
          description: 'Lower energy, smoother transitions',
          tracks: enhancedTracks
            .filter(t => t.matchDetails.energyDiff < -0.15 && t.confidence.overall > 0.6)
            .slice(0, 5),
          avgConfidence: 0
        },
        {
          type: 'same',
          title: 'Keep The Flow',
          icon: <Minus className="w-4 h-4" />,
          description: 'Maintain current energy and vibe',
          tracks: enhancedTracks
            .filter(t => Math.abs(t.matchDetails.energyDiff) <= 0.15 && t.confidence.overall > 0.7)
            .slice(0, 5),
          avgConfidence: 0
        },
        {
          type: 'up',
          title: 'Build Energy',
          icon: <TrendingUp className="w-4 h-4" />,
          description: 'Increase energy, peak-time vibes',
          tracks: enhancedTracks
            .filter(t => t.matchDetails.energyDiff > 0.15 && t.confidence.overall > 0.6)
            .slice(0, 5),
          avgConfidence: 0
        }
      ]

      // Calculate average confidence for each category
      categories.forEach(category => {
        if (category.tracks.length > 0) {
          category.avgConfidence = category.tracks.reduce((sum, t) => sum + t.confidence.overall, 0) / category.tracks.length
        }
      })

      setSuggestions(categories)
    } catch (error) {
      console.error('Error generating enhanced suggestions:', error)
    } finally {
      setLoading(false)
    }
  }, [currentTrack])

  // Enhance track with AI analysis
  const enhanceTrackWithAI = async (
    track: TrackAnalysis, 
    currentTrack: any
  ): Promise<EnhancedSuggestion> => {
    // Calculate base compatibility scores
    const tempoCompatibility = 1 - Math.abs(track.tempo - currentTrack.bpm!) / Math.max(currentTrack.bpm!, track.tempo)
    const keyCompatibility = getKeyCompatibility(currentTrack.camelotKey!, track.camelotKey || '')
    const energyDiff = (track.energy || 0.5) - (currentTrack.energy || 0.5)
    
    // Calculate detailed confidence metrics
    const confidence = {
      overall: 0,
      harmonic: keyCompatibility,
      energy: 1 - Math.abs(energyDiff),
      temporal: tempoCompatibility,
      contextual: context ? calculateContextualScore(track, context) : 0.5
    }
    
    confidence.overall = (
      confidence.harmonic * 0.3 +
      confidence.energy * 0.25 +
      confidence.temporal * 0.25 +
      confidence.contextual * 0.2
    )

    // Generate transition preview if both tracks have analysis
    let transitionPreview = undefined
    // TODO: Enable transition preview once enhanced analysis data is available
    // Currently commented out because:
    // 1. TrackAnalysis interface doesn't have an 'analysis' property
    // 2. transitionSuggestionEngine doesn't have analyzeMixPoints method
    /*
    if (false && analysisDepth !== 'basic') {
      try {
        const mixPointA = await transitionSuggestionEngine.analyzeMixPoints(currentTrack.analysis)
        const mixPointB = await transitionSuggestionEngine.analyzeMixPoints(track.analysis)
        
        if (mixPointA.optimalOutPoints.length > 0 && mixPointB.optimalInPoints.length > 0) {
          const outPoint = mixPointA.optimalOutPoints[0]
          const inPoint = mixPointB.optimalInPoints[0]
          
          const transition = await transitionSuggestionEngine.generateTransitionSuggestion(
            currentTrack.analysis,
            track, // Use track object instead of non-existent analysis property
            mixPointA,
            mixPointB,
            outPoint,
            inPoint
          )
          
          // Get quality prediction
          const qualityPrediction = analysisDepth === 'expert' 
            ? await transitionQualityPredictor.predictTransitionQuality(
                currentTrack.analysis,
                track, // Use track object instead of non-existent analysis property
                mixPointA,
                mixPointB,
                transition
              )
            : null

          transitionPreview = {
            technique: transition.technique.name,
            duration: transition.timing.totalDuration,
            difficulty: transition.technique.difficulty,
            quality: qualityPrediction?.overallQuality || transition.confidence,
            automation: {
              crossfader: transition.crossfader.automation,
              eq: transition.eqAutomation,
              effects: transition.effects
            },
            timing: {
              outPoint: outPoint.time,
              inPoint: inPoint.time,
              totalDuration: transition.timing.totalDuration
            },
            warnings: qualityPrediction?.recommendations.warnings || []
          }
        }
      } catch (error) {
        console.error('Error generating transition preview:', error)
      }
    }
    */

    // Calculate match details
    const keyDistance = calculateKeyDistance(currentTrack.camelotKey!, track.camelotKey || '')
    const tempoDiff = Math.abs(track.tempo - currentTrack.bpm!)
    const moodSimilarity = calculateMoodSimilarity(currentTrack, track)
    
    const reasons: string[] = []
    const risks: string[] = []
    
    // Generate reasons
    if (keyCompatibility > 0.8) reasons.push('Perfect harmonic match')
    else if (keyCompatibility > 0.6) reasons.push('Good key compatibility')
    
    if (tempoDiff < 3) reasons.push('Tight tempo sync')
    else if (tempoDiff < 6) reasons.push('Manageable tempo difference')
    
    if (Math.abs(energyDiff) < 0.1) reasons.push('Smooth energy transition')
    
    // Generate risks
    if (keyDistance > 3) risks.push('Potential key clash')
    if (tempoDiff > 8) risks.push('Large tempo jump')
    if (Math.abs(energyDiff) > 0.4) risks.push('Dramatic energy change')

    // AI insights
    const aiInsights = {
      crowdResponse: confidence.overall * 0.8 + Math.random() * 0.2,
      peakMoments: [45, 120, 180], // Simplified - would use real analysis
      energyProgression: energyDiff > 0.2 ? 'Building' : energyDiff < -0.2 ? 'Cooling' : 'Maintaining',
      recommendation: generateRecommendation(confidence, reasons, risks)
    }

    return {
      ...track,
      confidence,
      transitionPreview,
      matchDetails: {
        keyDistance,
        tempoDiff,
        energyDiff,
        moodSimilarity,
        reasons,
        risks
      },
      aiInsights
    }
  }

  // Generate suggestions on track change
  useEffect(() => {
    if (currentTrack?.bpm && currentTrack?.camelotKey) {
      generateEnhancedSuggestions()
    }
  }, [currentTrack, generateEnhancedSuggestions])

  // Get current category
  const selectedSuggestions = suggestions.find(s => s.type === selectedCategory)

  // Render confidence indicator
  const renderConfidenceIndicator = (confidence: number, size: 'sm' | 'md' = 'sm') => {
    const sizeClasses = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
    const color = confidence > 0.8 ? 'text-green-400' : 
                  confidence > 0.6 ? 'text-yellow-400' : 
                  confidence > 0.4 ? 'text-orange-400' : 'text-red-400'
    
    return (
      <div className={`${sizeClasses} rounded-full border-2 ${color.replace('text-', 'border-')} flex items-center justify-center`}>
        <div 
          className={`rounded-full ${color.replace('text-', 'bg-')}`}
          style={{ 
            width: `${confidence * 100}%`, 
            height: `${confidence * 100}%` 
          }}
        />
      </div>
    )
  }

  // Render transition preview
  const renderTransitionPreview = (suggestion: EnhancedSuggestion) => {
    if (!suggestion.transitionPreview) return null

    const preview = suggestion.transitionPreview
    
    return (
      <div className="mt-2 p-3 bg-gray-900/50 rounded border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium text-white">
              {preview.technique}
            </span>
            <span className="text-xs text-gray-400">
              {preview.duration}s
            </span>
          </div>
          <div className="flex items-center gap-2">
            {renderConfidenceIndicator(preview.quality)}
            <span className="text-xs text-gray-400">
              {Math.round(preview.quality * 100)}%
            </span>
          </div>
        </div>
        
        {/* Transition timeline */}
        <div className="relative h-2 bg-gray-700 rounded-full mb-2">
          <div 
            className="absolute h-full bg-purple-500 rounded-full"
            style={{ width: '40%', left: '30%' }}
          />
          <div className="absolute -top-1 left-0 w-2 h-4 bg-blue-400 rounded-sm" />
          <div className="absolute -top-1 right-0 w-2 h-4 bg-green-400 rounded-sm" />
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Out: {Math.round(preview.timing.outPoint)}s</span>
          <span>Difficulty: {preview.difficulty}/5</span>
          <span>In: {Math.round(preview.timing.inPoint)}s</span>
        </div>
        
        {preview.warnings && preview.warnings.length > 0 && (
          <div className="mt-2 flex items-start gap-2">
            <AlertTriangle className="h-3 w-3 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-yellow-200">
              {preview.warnings.join(', ')}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render detailed analysis
  const renderDetailedAnalysis = (suggestion: EnhancedSuggestion) => {
    return (
      <div className="mt-2 space-y-2">
        {/* Confidence breakdown */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Harmonic:</span>
            <div className="flex items-center gap-1">
              {renderConfidenceIndicator(suggestion.confidence.harmonic, 'sm')}
              <span className="text-gray-300">{Math.round(suggestion.confidence.harmonic * 100)}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Energy:</span>
            <div className="flex items-center gap-1">
              {renderConfidenceIndicator(suggestion.confidence.energy, 'sm')}
              <span className="text-gray-300">{Math.round(suggestion.confidence.energy * 100)}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Timing:</span>
            <div className="flex items-center gap-1">
              {renderConfidenceIndicator(suggestion.confidence.temporal, 'sm')}
              <span className="text-gray-300">{Math.round(suggestion.confidence.temporal * 100)}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Context:</span>
            <div className="flex items-center gap-1">
              {renderConfidenceIndicator(suggestion.confidence.contextual, 'sm')}
              <span className="text-gray-300">{Math.round(suggestion.confidence.contextual * 100)}%</span>
            </div>
          </div>
        </div>

        {/* AI insights */}
        <div className="p-2 bg-purple-500/10 rounded border border-purple-500/20">
          <div className="text-xs text-purple-200 mb-1">AI Recommendation:</div>
          <div className="text-xs text-purple-100">{suggestion.aiInsights.recommendation}</div>
        </div>

        {/* Match reasons */}
        {suggestion.matchDetails.reasons.length > 0 && (
          <div>
            <div className="text-xs text-gray-400 mb-1">Why this works:</div>
            <ul className="text-xs text-green-200 space-y-0.5">
              {suggestion.matchDetails.reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-1">
                  <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {suggestion.matchDetails.risks.length > 0 && (
          <div>
            <div className="text-xs text-gray-400 mb-1">Potential issues:</div>
            <ul className="text-xs text-orange-200 space-y-0.5">
              {suggestion.matchDetails.risks.map((risk, idx) => (
                <li key={idx} className="flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  if (!currentTrack) {
    return null
  }

  return (
    <div className="bg-gray-800 rounded-lg">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700 transition-colors rounded-t-lg"
      >
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-500" />
          Enhanced Smart Queue
          {currentTrack && (
            <span className="text-xs text-gray-400">
              for {currentTrack.name}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {/* Analysis depth selector */}
          <select
            value={analysisDepth}
            onChange={(e) => setAnalysisDepth(e.target.value as any)}
            onClick={(e) => e.stopPropagation()}
            className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1"
          >
            <option value="basic">Basic</option>
            <option value="detailed">Detailed</option>
            <option value="expert">Expert</option>
          </select>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              generateEnhancedSuggestions()
            }}
            className="p-1 hover:bg-gray-600 rounded"
            title="Refresh suggestions"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-3">
          {/* Category tabs with confidence indicators */}
          <div className="flex gap-1 mb-3">
            {suggestions.map((category) => (
              <button
                key={category.type}
                onClick={() => setSelectedCategory(category.type)}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                  selectedCategory === category.type
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {category.icon}
                <span>{category.title}</span>
                <span className="text-xs opacity-70">({category.tracks.length})</span>
                {category.avgConfidence > 0 && (
                  <div className="ml-1">
                    {renderConfidenceIndicator(category.avgConfidence, 'sm')}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Confidence toggle */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setShowConfidenceDetails(!showConfidenceDetails)}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              {showConfidenceDetails ? 'Hide' : 'Show'} Confidence Details
            </button>
          </div>

          {/* Track suggestions */}
          {selectedSuggestions && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 mb-2">{selectedSuggestions.description}</p>
              
              {selectedSuggestions.tracks.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  <p>No suggestions available</p>
                  <p className="text-xs mt-1">Try adjusting analysis depth or load more tracks</p>
                </div>
              ) : (
                selectedSuggestions.tracks.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 min-w-0"
                        onClick={() => {
                          const enrichedTrack = {
                            ...suggestion,
                            bpm: suggestion.tempo,
                            audio_features: {
                              tempo: suggestion.tempo,
                              energy: suggestion.energy,
                              danceability: suggestion.danceability,
                              valence: suggestion.valence,
                              key: suggestion.key,
                              mode: suggestion.mode,
                              time_signature: suggestion.time_signature,
                              loudness: suggestion.loudness,
                              acousticness: suggestion.acousticness,
                              instrumentalness: suggestion.instrumentalness,
                              speechiness: suggestion.speechiness
                            }
                          }
                          onTrackSelect(enrichedTrack, targetDeck)
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-sm font-medium text-white truncate">
                            {suggestion.name}
                          </div>
                          {renderConfidenceIndicator(suggestion.confidence.overall)}
                          <span className="text-xs text-gray-400">
                            {Math.round(suggestion.confidence.overall * 100)}%
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-400 truncate mb-1">
                          {suggestion.artists.join(', ')}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-mono text-gray-400">
                            {Math.round(suggestion.tempo)} BPM
                          </span>
                          <span 
                            className="font-mono px-1 py-0.5 rounded"
                            style={{ 
                              backgroundColor: suggestion.camelotKey ? `${getCamelotColor(suggestion.camelotKey)}40` : 'transparent',
                              color: suggestion.camelotKey ? getCamelotColor(suggestion.camelotKey) : '#666'
                            }}
                          >
                            {suggestion.camelotKey || '?'}
                          </span>
                          <span className="text-purple-400">
                            {suggestion.aiInsights.energyProgression}
                          </span>
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-1 ml-2">
                        {suggestion.transitionPreview && onPreviewTransition && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onPreviewTransition(currentTrack, suggestion)
                            }}
                            className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                            title="Preview transition"
                          >
                            <Play className="h-3 w-3 text-green-400" />
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewingTrack(
                              previewingTrack === suggestion.id ? null : suggestion.id
                            )
                          }}
                          className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                          title="Show details"
                        >
                          <Eye className="h-3 w-3 text-blue-400" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {previewingTrack === suggestion.id && (
                      <div className="mt-2 pt-2 border-t border-gray-600">
                        {suggestion.transitionPreview && renderTransitionPreview(suggestion)}
                        {showConfidenceDetails && renderDetailedAnalysis(suggestion)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper functions
function createEmptyCategories(): SuggestionCategory[] {
  return [
    {
      type: 'down',
      title: 'Bring It Down',
      icon: <TrendingDown className="w-4 h-4" />,
      description: 'Lower energy, smoother transitions',
      tracks: [],
      avgConfidence: 0
    },
    {
      type: 'same',
      title: 'Keep The Flow',
      icon: <Minus className="w-4 h-4" />,
      description: 'Maintain current energy and vibe',
      tracks: [],
      avgConfidence: 0
    },
    {
      type: 'up',
      title: 'Build Energy',
      icon: <TrendingUp className="w-4 h-4" />,
      description: 'Increase energy, peak-time vibes',
      tracks: [],
      avgConfidence: 0
    }
  ]
}

function calculateContextualScore(track: TrackAnalysis, context: DJContext): number {
  // Simplified contextual scoring
  let score = 0.5
  
  // Time-based scoring
  const hour = context.time.hour
  if (hour < 22 && track.energy && track.energy < 0.6) score += 0.2
  else if (hour >= 22 && hour < 3 && track.energy && track.energy > 0.6) score += 0.2
  
  // Venue-based scoring
  // TODO: Add genre-based scoring once genre data is available in TrackAnalysis
  if (context.venue.type === 'club') score += 0.1
  else if (context.venue.type === 'bar') score += 0.1
  
  return Math.max(0, Math.min(1, score))
}

function calculateKeyDistance(keyA: string, keyB: string): number {
  const parseKey = (key: string) => {
    const match = key.match(/(\d+)([AB])/)
    if (!match) return null
    return { number: parseInt(match[1]), letter: match[2] }
  }
  
  const a = parseKey(keyA)
  const b = parseKey(keyB)
  
  if (!a || !b) return 6
  if (a.number === b.number && a.letter === b.letter) return 0
  if (a.number === b.number) return 3
  
  let distance = Math.abs(a.number - b.number)
  if (distance > 6) distance = 12 - distance
  
  return distance
}

function calculateMoodSimilarity(trackA: any, trackB: any): number {
  if (!trackA.valence || !trackB.valence) return 0.5
  
  const valenceDiff = Math.abs(trackA.valence - trackB.valence)
  return 1 - valenceDiff
}

function generateRecommendation(
  confidence: any, 
  reasons: string[], 
  risks: string[]
): string {
  if (confidence.overall > 0.8) {
    return 'Excellent choice! This transition should work beautifully.'
  } else if (confidence.overall > 0.6) {
    return reasons.length > 0 
      ? `Good match - ${reasons[0].toLowerCase()}`
      : 'Solid choice with good compatibility.'
  } else if (confidence.overall > 0.4) {
    return risks.length > 0
      ? `Proceed with caution - ${risks[0].toLowerCase()}`
      : 'Challenging but manageable transition.'
  } else {
    return 'High risk transition - consider alternatives.'
  }
}

function getCamelotColor(camelotKey: string): string {
  const colors: { [key: string]: string } = {
    '1A': '#FF6B6B', '1B': '#FFB6B6',
    '2A': '#FF8E53', '2B': '#FFD4C4',
    '3A': '#FFE66D', '3B': '#FFF4DD',
    '4A': '#A8E6CF', '4B': '#D4F1E6',
    '5A': '#7FDD97', '5B': '#B8E8C8',
    '6A': '#7FCDCD', '6B': '#B8E0E0',
    '7A': '#6FA8DC', '7B': '#B4D4F1',
    '8A': '#8E7CC3', '8B': '#C7BDE2',
    '9A': '#C27BA0', '9B': '#E1BDD0',
    '10A': '#E06666', '10B': '#F0B3B3',
    '11A': '#F6B26B', '11B': '#FBD9B5',
    '12A': '#FFD966', '12B': '#FFECB3',
  }
  return colors[camelotKey] || '#666666'
}