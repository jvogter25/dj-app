// Production Personalized Feed Component
// Algorithm-driven social feed with real-time updates

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Activity, TrendingUp, Users, Music, Heart, MessageCircle,
  Share2, Play, MoreHorizontal, RefreshCw, Filter,
  Sparkles, Clock, Globe, ChevronRight, X, Eye, EyeOff
} from 'lucide-react'
import { useSocialFeed } from '../../hooks/useSocialFeed'
import { FeedItem, TrendingTopic, UserInterest } from '../../lib/socialFeedService'
import { formatDistanceToNow } from 'date-fns'
import FeedItemCard from './FeedItemCard'

interface PersonalizedFeedProps {
  className?: string
}

export const PersonalizedFeed: React.FC<PersonalizedFeedProps> = ({ className = '' }) => {
  const {
    feedItems,
    trendingTopics,
    recommendations,
    feedStats,
    toggleFollow,
    createPost,
    recordInteraction,
    updateInterest,
    loadMore,
    refresh,
    markRecommendationSeen,
    provideFeedback,
    isLoading,
    isLoadingMore,
    hasMore,
    error
  } = useSocialFeed({ feedType: 'personal', autoRefresh: true })

  const [selectedFilter, setSelectedFilter] = useState<'all' | 'following' | 'trending'>('all')
  const [showTrending, setShowTrending] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const feedEndRef = useRef<HTMLDivElement>(null)
  
  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (feedEndRef.current) {
      observer.observe(feedEndRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, loadMore])

  // Record view interactions
  const handleItemView = useCallback((itemId: string) => {
    recordInteraction(itemId, 'view')
  }, [recordInteraction])

  // Toggle item expansion
  const toggleItemExpansion = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
        handleItemView(itemId)
      }
      return newSet
    })
  }, [handleItemView])

  // Handle recommendation feedback
  const handleRecommendationFeedback = useCallback(async (
    recommendationId: string,
    feedback: 'positive' | 'negative' | 'neutral'
  ) => {
    await provideFeedback(recommendationId, feedback)
    await markRecommendationSeen(recommendationId)
  }, [provideFeedback, markRecommendationSeen])

  // Get feed icon based on item type
  const getFeedIcon = (itemType: FeedItem['itemType']) => {
    switch (itemType) {
      case 'mix_published':
        return <Music className="h-4 w-4" />
      case 'mix_liked':
        return <Heart className="h-4 w-4" />
      case 'mix_commented':
        return <MessageCircle className="h-4 w-4" />
      case 'mix_shared':
        return <Share2 className="h-4 w-4" />
      case 'user_followed':
        return <Users className="h-4 w-4" />
      case 'live_session_started':
        return <Activity className="h-4 w-4 text-red-400" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  // Render feed item
  const renderFeedItem = (item: FeedItem) => {
    const isExpanded = expandedItems.has(item.id)
    
    return (
      <div
        key={item.id}
        className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-all"
      >
        <div className="flex items-start gap-3">
          {/* User Avatar */}
          <div className="flex-shrink-0">
            {item.userAvatarUrl ? (
              <img
                src={item.userAvatarUrl}
                alt={item.userDisplayName}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-white font-medium">
                  {item.userDisplayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-white">{item.userDisplayName}</span>
              <div className="flex items-center gap-1 text-gray-400">
                {getFeedIcon(item.itemType)}
                <span className="text-sm">{formatDistanceToNow(new Date(item.createdAt))} ago</span>
              </div>
            </div>

            <h3 className="text-white font-medium mb-2">{item.title}</h3>
            
            {item.description && (
              <p className={`text-gray-300 ${isExpanded ? '' : 'line-clamp-2'}`}>
                {item.description}
              </p>
            )}

            {/* Mix Preview */}
            {item.mixId && item.thumbnailUrl && (
              <div className="mt-3 relative group cursor-pointer">
                <img
                  src={item.thumbnailUrl}
                  alt="Mix cover"
                  className="w-full h-48 object-cover rounded-lg"
                  onClick={() => recordInteraction(item.id, 'click')}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Play className="h-12 w-12 text-white" />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-3">
              <button className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                <Heart className="h-4 w-4" />
                <span className="text-sm">{item.metadata?.likeCount || 0}</span>
              </button>
              
              <button className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">{item.metadata?.commentCount || 0}</span>
              </button>
              
              <button 
                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                onClick={() => recordInteraction(item.id, 'share')}
              >
                <Share2 className="h-4 w-4" />
                <span className="text-sm">Share</span>
              </button>

              <div className="flex-1" />

              <button
                onClick={() => toggleItemExpansion(item.id)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>

              <div className="relative group">
                <button className="p-1 hover:bg-gray-700 rounded transition-colors">
                  <MoreHorizontal className="h-4 w-4 text-gray-400" />
                </button>
                
                <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => recordInteraction(item.id, 'hide')}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <EyeOff className="h-4 w-4" />
                    Hide this post
                  </button>
                  <button
                    onClick={() => recordInteraction(item.id, 'report')}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Report
                  </button>
                </div>
              </div>
            </div>

            {/* Relevance Score (dev mode) */}
            {process.env.NODE_ENV === 'development' && item.relevanceScore && (
              <div className="mt-2 text-xs text-gray-500">
                Relevance: {item.relevanceScore.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Render trending sidebar
  const renderTrendingSidebar = () => (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-400" />
          <h3 className="font-medium text-white">Trending Now</h3>
        </div>
        <button 
          onClick={() => setShowTrending(!showTrending)}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      <div className="space-y-3">
        {trendingTopics.slice(0, 5).map((topic) => (
          <div
            key={topic.id}
            className="cursor-pointer hover:bg-gray-700/50 rounded p-2 transition-colors"
            onClick={() => {
              // Map topic types to supported interest types
              const interestTypeMap: Record<string, UserInterest['interestType'] | null> = {
                genre: 'genre',
                artist: 'artist',
                technique: 'technique',
                mood: 'mood',
                event: null,
                hashtag: null,
                challenge: null
              }
              
              const mappedType = interestTypeMap[topic.topicType]
              if (mappedType) {
                updateInterest(mappedType, topic.topicValue, true)
              }
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-white">
                #{topic.topicDisplayName}
              </span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{topic.relatedMixes} mixes</span>
              {topic.velocity > 0 && (
                <span className="text-green-400">↑ {Math.round(topic.velocity)}%</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-yellow-400" />
            <h3 className="font-medium text-white">Recommended for You</h3>
          </div>

          <div className="space-y-3">
            {recommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className="bg-gray-700/50 rounded p-3"
              >
                <h4 className="text-sm font-medium text-white mb-1">
                  {rec.mix?.title}
                </h4>
                <p className="text-xs text-gray-400 mb-2">
                  by {rec.mix?.user?.display_name}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRecommendationFeedback(rec.id, 'positive')}
                    className="flex-1 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                  >
                    Listen
                  </button>
                  <button
                    onClick={() => handleRecommendationFeedback(rec.id, 'negative')}
                    className="p-1 hover:bg-gray-600 rounded transition-colors"
                  >
                    <X className="h-3 w-3 text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-6 ${className}`}>
      {/* Main Feed */}
      <div className="flex-1">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Your Feed</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={refresh}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                <Filter className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Feed Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-gray-300">{feedStats.followersCount} followers</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-400" />
              <span className="text-gray-300">{feedStats.followingCount} following</span>
            </div>
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-gray-400" />
              <span className="text-gray-300">{feedStats.postsCount} posts</span>
            </div>
          </div>
        </div>

        {/* Feed Items */}
        {isLoading && feedItems.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-lg border border-gray-700 p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded w-1/4 mb-2" />
                    <div className="h-3 bg-gray-700 rounded w-3/4 mb-2" />
                    <div className="h-32 bg-gray-700 rounded mt-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {feedItems.map(renderFeedItem)}
            
            {feedItems.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No posts in your feed yet</p>
                <p className="text-sm text-gray-500">Follow other DJs to see their mixes here</p>
              </div>
            )}

            {/* Load More Trigger */}
            <div ref={feedEndRef} className="h-1" />
            
            {isLoadingMore && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
              </div>
            )}
            
            {!hasMore && feedItems.length > 0 && (
              <div className="text-center py-4 text-gray-500">
                You've reached the end
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar */}
      {showTrending && (
        <div className="w-80 flex-shrink-0">
          {renderTrendingSidebar()}
        </div>
      )}
    </div>
  )
}

export default PersonalizedFeed