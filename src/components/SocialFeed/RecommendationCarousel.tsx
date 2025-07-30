// Production Recommendation Carousel Component
// AI-powered mix recommendations with feedback

import React, { useState, useRef, useEffect } from 'react'
import { 
  Sparkles, ChevronLeft, ChevronRight, Play, Heart,
  X, Info, RefreshCw, ThumbsUp, ThumbsDown,
  Music, Clock, Users, TrendingUp, Brain
} from 'lucide-react'
import { useSocialFeed } from '../../hooks/useSocialFeed'

interface RecommendationCarouselProps {
  onPlayMix?: (mixId: string) => void
  onMixClick?: (mixId: string) => void
  className?: string
}

export const RecommendationCarousel: React.FC<RecommendationCarouselProps> = ({
  onPlayMix,
  onMixClick,
  className = ''
}) => {
  const {
    recommendations,
    markRecommendationSeen,
    provideFeedback,
    generateRecommendations
  } = useSocialFeed()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showExplanation, setShowExplanation] = useState<string | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to current index
  useEffect(() => {
    if (carouselRef.current && recommendations.length > 0) {
      const scrollAmount = currentIndex * 320 // Card width + gap
      carouselRef.current.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
      })
    }
  }, [currentIndex, recommendations.length])

  // Navigate carousel
  const navigate = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentIndex(Math.max(0, currentIndex - 1))
    } else {
      setCurrentIndex(Math.min(recommendations.length - 1, currentIndex + 1))
    }
  }

  // Handle feedback
  const handleFeedback = async (
    recommendationId: string,
    feedback: 'positive' | 'negative' | 'neutral',
    interactionType?: string
  ) => {
    await provideFeedback(recommendationId, feedback)
    
    // Remove from view after negative feedback
    if (feedback === 'negative') {
      await markRecommendationSeen(recommendationId)
      // Move to next recommendation
      if (currentIndex === recommendations.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      }
    }
  }

  // Generate new recommendations
  const handleGenerateNew = async () => {
    setIsGenerating(true)
    await generateRecommendations()
    setIsGenerating(false)
    setCurrentIndex(0)
  }

  // Get reason icon
  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'genre_match':
        return <Music className="h-4 w-4" />
      case 'trending':
        return <TrendingUp className="h-4 w-4" />
      case 'high_quality':
        return <Sparkles className="h-4 w-4" />
      case 'similar_users':
        return <Users className="h-4 w-4" />
      case 'ai_predicted':
        return <Brain className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  // Format reason text
  const formatReason = (reason: string): string => {
    const reasonMap: Record<string, string> = {
      'genre_match': 'Matches your favorite genres',
      'bpm_match': 'Compatible BPM range',
      'mood_match': 'Aligns with your mood preferences',
      'trending': 'Currently trending',
      'high_quality': 'High quality mix',
      'similar_users': 'Popular with similar DJs',
      'ai_predicted': 'AI thinks you\'ll love this'
    }
    return reasonMap[reason] || reason.replace(/_/g, ' ')
  }

  if (recommendations.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Recommendations Yet</h3>
          <p className="text-gray-400 mb-4">We're still learning your preferences</p>
          <button
            onClick={handleGenerateNew}
            disabled={isGenerating}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            Generate Recommendations
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Recommended for You</h2>
            <span className="text-sm text-gray-400">
              ({currentIndex + 1} of {recommendations.length})
            </span>
          </div>
          
          <button
            onClick={handleGenerateNew}
            disabled={isGenerating}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 text-gray-400 ${isGenerating ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* AI Explanation */}
        <p className="text-sm text-gray-400 mt-2">
          Personalized recommendations based on your listening history and preferences
        </p>
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Previous Button */}
        {currentIndex > 0 && (
          <button
            onClick={() => navigate('prev')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-gray-900/80 hover:bg-gray-900 rounded-full transition-all"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
        )}

        {/* Next Button */}
        {currentIndex < recommendations.length - 1 && (
          <button
            onClick={() => navigate('next')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-gray-900/80 hover:bg-gray-900 rounded-full transition-all"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        )}

        {/* Cards */}
        <div
          ref={carouselRef}
          className="flex gap-4 p-4 overflow-x-hidden scroll-smooth"
        >
          {recommendations.map((rec, index) => (
            <div
              key={rec.id}
              className="flex-shrink-0 w-80 bg-gray-700 rounded-lg overflow-hidden"
              style={{ 
                opacity: index === currentIndex ? 1 : 0.5,
                transform: index === currentIndex ? 'scale(1)' : 'scale(0.95)',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Mix Cover */}
              <div className="relative h-48 group cursor-pointer" onClick={() => onMixClick?.(rec.mix.id)}>
                <img
                  src={rec.mix.cover_image_url || '/placeholder-mix.jpg'}
                  alt={rec.mix.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Play Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlayMix?.(rec.mix.id)
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 bg-purple-600 hover:bg-purple-700 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Play className="h-6 w-6 text-white" />
                </button>

                {/* Score Badge */}
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded-full text-xs text-white flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {Math.round(rec.score * 100)}% match
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-white mb-1 line-clamp-1">{rec.mix.title}</h3>
                <p className="text-sm text-gray-400 mb-3">by {rec.mix.user.display_name}</p>

                {/* Mix Details */}
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  <span>{rec.mix.genre}</span>
                  <span>•</span>
                  <span>{rec.mix.bpm} BPM</span>
                  <span>•</span>
                  <span>{Math.floor(rec.mix.duration_seconds / 60)}m</span>
                </div>

                {/* Reasons */}
                <div className="space-y-1 mb-4">
                  {rec.reason_codes.slice(0, 2).map((reason: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-purple-400">{getReasonIcon(reason)}</span>
                      <span>{formatReason(reason)}</span>
                    </div>
                  ))}
                  
                  {rec.reason_codes.length > 2 && (
                    <button
                      onClick={() => setShowExplanation(showExplanation === rec.id ? null : rec.id)}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      +{rec.reason_codes.length - 2} more reasons
                    </button>
                  )}
                </div>

                {/* Expanded Explanation */}
                {showExplanation === rec.id && (
                  <div className="mb-4 p-3 bg-gray-800 rounded text-xs text-gray-400">
                    <div className="space-y-1">
                      {rec.reason_codes.slice(2).map((reason: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-purple-400">{getReasonIcon(reason)}</span>
                          <span>{formatReason(reason)}</span>
                        </div>
                      ))}
                    </div>
                    {rec.explanation_json && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <pre className="text-xs">{JSON.stringify(rec.explanation_json, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleFeedback(rec.id, 'positive', 'play')
                      onPlayMix?.(rec.mix.id)
                    }}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Play Now
                  </button>
                  
                  <button
                    onClick={() => handleFeedback(rec.id, 'positive', 'like')}
                    className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                  >
                    <ThumbsUp className="h-4 w-4 text-white" />
                  </button>
                  
                  <button
                    onClick={() => handleFeedback(rec.id, 'negative', 'dismiss')}
                    className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                  >
                    <ThumbsDown className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="flex items-center justify-center gap-2 p-4">
        {recommendations.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex 
                ? 'bg-purple-500 w-6' 
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default RecommendationCarousel