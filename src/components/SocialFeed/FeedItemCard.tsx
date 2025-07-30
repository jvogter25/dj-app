// Production Feed Item Card Component
// Reusable card for displaying feed items

import React, { useState, useCallback } from 'react'
import { 
  Heart, MessageCircle, Share2, Play, MoreHorizontal,
  Music, Users, Activity, Sparkles, Clock, 
  ChevronDown, ChevronUp, Bookmark, Flag
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { FeedItem } from '../../lib/socialFeedService'

interface FeedItemCardProps {
  item: FeedItem
  onLike?: (itemId: string) => Promise<void>
  onComment?: (itemId: string) => void
  onShare?: (itemId: string) => void
  onFollow?: (userId: string) => Promise<void>
  onPlayMix?: (mixId: string) => void
  onInteraction?: (itemId: string, type: string) => void
  showRelevanceScore?: boolean
  className?: string
}

export const FeedItemCard: React.FC<FeedItemCardProps> = ({
  item,
  onLike,
  onComment,
  onShare,
  onFollow,
  onPlayMix,
  onInteraction,
  showRelevanceScore = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLiked, setIsLiked] = useState(item.metadata?.isLiked || false)
  const [likeCount, setLikeCount] = useState(item.metadata?.likeCount || 0)
  const [showActions, setShowActions] = useState(false)

  // Get activity icon
  const getActivityIcon = () => {
    switch (item.itemType) {
      case 'mix_published':
        return <Music className="h-4 w-4 text-purple-400" />
      case 'mix_liked':
        return <Heart className="h-4 w-4 text-red-400" />
      case 'mix_commented':
        return <MessageCircle className="h-4 w-4 text-blue-400" />
      case 'mix_shared':
        return <Share2 className="h-4 w-4 text-green-400" />
      case 'user_followed':
        return <Users className="h-4 w-4 text-yellow-400" />
      case 'collaboration_started':
        return <Users className="h-4 w-4 text-purple-400" />
      case 'live_session_started':
        return <Activity className="h-4 w-4 text-red-400 animate-pulse" />
      case 'achievement_unlocked':
        return <Sparkles className="h-4 w-4 text-yellow-400" />
      default:
        return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  // Get activity text
  const getActivityText = () => {
    switch (item.itemType) {
      case 'mix_published':
        return 'published a new mix'
      case 'mix_liked':
        return 'liked a mix'
      case 'mix_commented':
        return 'commented on a mix'
      case 'mix_shared':
        return 'shared a mix'
      case 'user_followed':
        return 'started following'
      case 'collaboration_started':
        return 'started a collaboration'
      case 'live_session_started':
        return 'is live now'
      case 'achievement_unlocked':
        return 'unlocked an achievement'
      default:
        return 'posted'
    }
  }

  // Handle like
  const handleLike = useCallback(async () => {
    if (!onLike) return
    
    setIsLiked(!isLiked)
    setLikeCount((prev: number) => isLiked ? prev - 1 : prev + 1)
    
    try {
      await onLike(item.id)
    } catch (error) {
      // Revert on error
      setIsLiked(isLiked)
      setLikeCount((prev: number) => isLiked ? prev + 1 : prev - 1)
    }
  }, [item.id, isLiked, onLike])

  // Format engagement count
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-all ${className}`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {item.userAvatarUrl ? (
              <img
                src={item.userAvatarUrl}
                alt={item.userDisplayName}
                className="w-12 h-12 rounded-full cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onInteraction?.(item.id, 'profile_click')}
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
                <span className="text-white font-bold text-lg">
                  {item.userDisplayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* User info and content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <a 
                href="#"
                className="font-semibold text-white hover:text-purple-400 transition-colors"
                onClick={(e) => {
                  e.preventDefault()
                  onInteraction?.(item.id, 'profile_click')
                }}
              >
                {item.userDisplayName}
              </a>
              <span className="text-gray-400">{getActivityText()}</span>
              {item.targetUserId && (
                <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors">
                  @{item.metadata?.targetUserName || 'user'}
                </a>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              {getActivityIcon()}
              <Clock className="h-3 w-3" />
              <span>{formatDistanceToNow(new Date(item.createdAt))} ago</span>
            </div>
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <MoreHorizontal className="h-5 w-5 text-gray-400" />
            </button>

            {showActions && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    onInteraction?.(item.id, 'bookmark')
                    setShowActions(false)
                  }}
                  className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <Bookmark className="h-4 w-4" />
                  Save post
                </button>
                <button
                  onClick={() => {
                    onInteraction?.(item.id, 'report')
                    setShowActions(false)
                  }}
                  className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <Flag className="h-4 w-4" />
                  Report
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mt-3">
          <h3 className="text-lg font-medium text-white mb-1">{item.title}</h3>
          
          {item.description && (
            <p className={`text-gray-300 ${isExpanded ? '' : 'line-clamp-2'}`}>
              {item.description}
            </p>
          )}

          {item.description && item.description.length > 100 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-purple-400 hover:text-purple-300 mt-1 flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  Show less <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Show more <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mix Preview */}
      {item.mixId && item.thumbnailUrl && (
        <div className="relative group cursor-pointer" onClick={() => onPlayMix?.(item.mixId!)}>
          <img
            src={item.thumbnailUrl}
            alt="Mix cover"
            className="w-full h-64 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">{item.metadata?.mixTitle}</h4>
                  <p className="text-gray-300 text-sm">
                    {item.metadata?.mixGenre} • {item.metadata?.mixBpm} BPM • {item.metadata?.mixDuration}
                  </p>
                </div>
                <button className="p-3 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors">
                  <Play className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Engagement */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={handleLike}
              className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
                isLiked 
                  ? 'text-red-400 hover:bg-red-400/10' 
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm">{formatCount(likeCount)}</span>
            </button>

            <button
              onClick={() => onComment?.(item.id)}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-sm">{formatCount(item.metadata?.commentCount || 0)}</span>
            </button>

            <button
              onClick={() => onShare?.(item.id)}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Share2 className="h-5 w-5" />
              <span className="text-sm">{formatCount(item.metadata?.shareCount || 0)}</span>
            </button>
          </div>

          {/* View count */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Activity className="h-4 w-4" />
            <span>{formatCount(item.viewCount)} views</span>
          </div>
        </div>

        {/* Relevance score (dev mode) */}
        {showRelevanceScore && item.relevanceScore && (
          <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span>Relevance Score:</span>
              <span className="font-mono">{item.relevanceScore.toFixed(3)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FeedItemCard