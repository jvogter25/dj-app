// Production Trending Section Component
// Displays trending topics and content discovery

import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, Hash, Music, Users, Zap, 
  ChevronRight, RefreshCw, Filter, Globe,
  Clock, Calendar, Sparkles, Flame
} from 'lucide-react'
import { TrendingTopic } from '../../lib/socialFeedService'
import { useSocialFeed } from '../../hooks/useSocialFeed'

interface TrendingSectionProps {
  onTopicClick?: (topic: TrendingTopic) => void
  onMixClick?: (mixId: string) => void
  className?: string
}

type TimeWindow = 'hour' | 'day' | 'week' | 'month'
type TopicType = 'all' | 'genre' | 'artist' | 'technique' | 'hashtag' | 'challenge'

export const TrendingSection: React.FC<TrendingSectionProps> = ({
  onTopicClick,
  onMixClick,
  className = ''
}) => {
  const { trendingTopics } = useSocialFeed()
  
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('day')
  const [topicType, setTopicType] = useState<TopicType>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filter topics
  const filteredTopics = trendingTopics.filter(topic => 
    topicType === 'all' || topic.topicType === topicType
  )

  // Get topic icon
  const getTopicIcon = (type: TrendingTopic['topicType']) => {
    switch (type) {
      case 'genre':
        return <Music className="h-4 w-4" />
      case 'artist':
        return <Users className="h-4 w-4" />
      case 'technique':
        return <Zap className="h-4 w-4" />
      case 'hashtag':
        return <Hash className="h-4 w-4" />
      case 'challenge':
        return <Flame className="h-4 w-4" />
      default:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  // Get topic color
  const getTopicColor = (type: TrendingTopic['topicType'], velocity: number) => {
    if (velocity > 50) return 'text-red-400' // Hot
    if (velocity > 20) return 'text-orange-400' // Rising
    if (velocity > 0) return 'text-yellow-400' // Growing
    
    switch (type) {
      case 'genre':
        return 'text-purple-400'
      case 'artist':
        return 'text-blue-400'
      case 'technique':
        return 'text-green-400'
      case 'hashtag':
        return 'text-pink-400'
      case 'challenge':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  // Format velocity
  const formatVelocity = (velocity: number): string => {
    if (velocity > 100) return '🔥 +' + Math.round(velocity) + '%'
    if (velocity > 50) return '🚀 +' + Math.round(velocity) + '%'
    if (velocity > 0) return '↑ +' + Math.round(velocity) + '%'
    if (velocity < -10) return '↓ ' + Math.round(velocity) + '%'
    return '→ ' + Math.round(velocity) + '%'
  }

  // Refresh trending
  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Trigger refresh through context or API
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Trending</h2>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Time Window */}
          <div className="flex bg-gray-700 rounded-lg p-1">
            {(['hour', 'day', 'week', 'month'] as TimeWindow[]).map((window) => (
              <button
                key={window}
                onClick={() => setTimeWindow(window)}
                className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
                  timeWindow === window
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {window}
              </button>
            ))}
          </div>

          {/* Topic Type */}
          <select
            value={topicType}
            onChange={(e) => setTopicType(e.target.value as TopicType)}
            className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
          >
            <option value="all">All Topics</option>
            <option value="genre">Genres</option>
            <option value="artist">Artists</option>
            <option value="technique">Techniques</option>
            <option value="hashtag">Hashtags</option>
            <option value="challenge">Challenges</option>
          </select>
        </div>
      </div>

      {/* Trending List */}
      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
        {filteredTopics.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No trending topics found</p>
            <p className="text-sm text-gray-500 mt-2">Check back later for updates</p>
          </div>
        ) : (
          filteredTopics.map((topic, index) => (
            <div
              key={topic.id}
              className="group cursor-pointer hover:bg-gray-700/50 rounded-lg p-3 transition-all"
              onClick={() => onTopicClick?.(topic)}
            >
              <div className="flex items-start gap-3">
                {/* Rank */}
                <div className="flex-shrink-0 w-8 text-center">
                  <span className="text-2xl font-bold text-gray-500">
                    {index + 1}
                  </span>
                </div>

                {/* Topic Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={getTopicColor(topic.topicType, topic.velocity)}>
                      {getTopicIcon(topic.topicType)}
                    </span>
                    <h3 className="font-medium text-white group-hover:text-purple-400 transition-colors">
                      {topic.topicDisplayName}
                    </h3>
                    <span className="text-xs text-gray-500 uppercase">
                      {topic.topicType}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{topic.relatedMixes} mixes</span>
                    <span className={topic.velocity > 0 ? 'text-green-400' : 'text-gray-400'}>
                      {formatVelocity(topic.velocity)}
                    </span>
                    <span>Score: {Math.round(topic.score)}</span>
                  </div>

                  {/* Sample Mixes */}
                  {topic.sampleMixes && topic.sampleMixes.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {topic.sampleMixes.slice(0, 3).map((mix: any) => (
                        <div
                          key={mix.id}
                          className="relative group/mix"
                          onClick={(e) => {
                            e.stopPropagation()
                            onMixClick?.(mix.id)
                          }}
                        >
                          <img
                            src={mix.cover_image_url || '/placeholder-mix.jpg'}
                            alt={mix.title}
                            className="w-12 h-12 rounded object-cover group-hover/mix:opacity-80 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/mix:opacity-100 transition-opacity rounded flex items-center justify-center">
                            <ChevronRight className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      ))}
                      {topic.relatedMixes > 3 && (
                        <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center text-sm text-gray-400">
                          +{topic.relatedMixes - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-400 transition-colors flex-shrink-0" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* View All */}
      {filteredTopics.length > 0 && (
        <div className="p-4 border-t border-gray-700">
          <button className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
            <Globe className="h-4 w-4" />
            Explore All Trending
          </button>
        </div>
      )}
    </div>
  )
}

export default TrendingSection