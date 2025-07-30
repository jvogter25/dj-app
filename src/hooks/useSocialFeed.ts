// Production Social Feed Hook
// React hook for managing social feed state and interactions

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSupabase } from './useSupabase'
import { 
  socialFeedService,
  FeedItem,
  TrendingTopic,
  UserInterest,
  DiscoveryFilter
} from '../lib/socialFeedService'

interface UseSocialFeedProps {
  feedType?: 'personal' | 'following' | 'trending' | 'discover'
  filters?: DiscoveryFilter
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseSocialFeedReturn {
  // Feed data
  feedItems: FeedItem[]
  trendingTopics: TrendingTopic[]
  recommendations: any[]
  
  // User data
  followers: any[]
  following: any[]
  interests: UserInterest[]
  
  // Stats
  feedStats: {
    followersCount: number
    followingCount: number
    postsCount: number
  }
  
  // Actions
  toggleFollow: (targetUserId: string) => Promise<boolean>
  createPost: (type: FeedItem['itemType'], title: string, options?: any) => Promise<boolean>
  recordInteraction: (itemId: string, type: 'view' | 'click' | 'share' | 'hide' | 'report') => Promise<void>
  updateInterest: (type: UserInterest['interestType'], value: string, isPositive: boolean) => Promise<void>
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  
  // Discover
  discoverMixes: (filters: DiscoveryFilter) => Promise<any[]>
  searchUsers: (query: string) => Promise<any[]>
  
  // Recommendations
  generateRecommendations: () => Promise<void>
  markRecommendationSeen: (id: string) => Promise<void>
  provideFeedback: (id: string, feedback: 'positive' | 'negative' | 'neutral') => Promise<void>
  
  // State
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: string | null
}

const ITEMS_PER_PAGE = 20

export const useSocialFeed = ({
  feedType = 'personal',
  filters,
  autoRefresh = false,
  refreshInterval = 30000 // 30 seconds
}: UseSocialFeedProps = {}): UseSocialFeedReturn => {
  const { user } = useSupabase()
  
  // State
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [interests, setInterests] = useState<UserInterest[]>([])
  const [feedStats, setFeedStats] = useState({
    followersCount: 0,
    followingCount: 0,
    postsCount: 0
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)

  // Load initial data
  const loadInitialData = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const [
        feedData,
        trendingData,
        recommendationsData,
        followersData,
        followingData,
        interestsData,
        statsData
      ] = await Promise.all([
        feedType === 'personal' 
          ? socialFeedService.getUserFeed(user.id, ITEMS_PER_PAGE, 0)
          : feedType === 'discover' && filters
          ? socialFeedService.discoverMixes(filters, ITEMS_PER_PAGE, 0)
          : [],
        socialFeedService.getTrendingTopics(),
        socialFeedService.getRecommendations(user.id, 10),
        socialFeedService.getFollowers(user.id),
        socialFeedService.getFollowing(user.id),
        socialFeedService.getUserInterests(user.id),
        socialFeedService.getFeedStats(user.id)
      ])

      setFeedItems(feedData)
      setTrendingTopics(trendingData)
      setRecommendations(recommendationsData)
      setFollowers(followersData)
      setFollowing(followingData)
      setInterests(interestsData)
      setFeedStats(statsData)
      setHasMore(feedData.length === ITEMS_PER_PAGE)
      setOffset(ITEMS_PER_PAGE)
    } catch (err) {
      console.error('Error loading feed:', err)
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setIsLoading(false)
    }
  }, [user, feedType, filters])

  // Load more items
  const loadMore = useCallback(async () => {
    if (!user || isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    try {
      const moreItems = feedType === 'personal'
        ? await socialFeedService.getUserFeed(user.id, ITEMS_PER_PAGE, offset)
        : feedType === 'discover' && filters
        ? await socialFeedService.discoverMixes(filters, ITEMS_PER_PAGE, offset)
        : []

      setFeedItems(prev => [...prev, ...moreItems])
      setHasMore(moreItems.length === ITEMS_PER_PAGE)
      setOffset(prev => prev + ITEMS_PER_PAGE)
    } catch (err) {
      console.error('Error loading more:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [user, feedType, filters, offset, isLoadingMore, hasMore])

  // Toggle follow
  const toggleFollow = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user) return false

    try {
      const isNowFollowing = await socialFeedService.toggleFollow(user.id, targetUserId)
      
      // Update local state
      if (isNowFollowing) {
        // Added to following
        const targetUser = await socialFeedService.searchUsers(targetUserId)
        if (targetUser[0]) {
          setFollowing(prev => [...prev, targetUser[0]])
          setFeedStats(prev => ({
            ...prev,
            followingCount: prev.followingCount + 1
          }))
        }
      } else {
        // Removed from following
        setFollowing(prev => prev.filter(f => f.following_id !== targetUserId))
        setFeedStats(prev => ({
          ...prev,
          followingCount: Math.max(0, prev.followingCount - 1)
        }))
      }
      
      return isNowFollowing
    } catch (err) {
      console.error('Error toggling follow:', err)
      return false
    }
  }, [user])

  // Create post
  const createPost = useCallback(async (
    type: FeedItem['itemType'],
    title: string,
    options?: any
  ): Promise<boolean> => {
    if (!user) return false

    try {
      const itemId = await socialFeedService.createFeedItem(user.id, type, title, options)
      if (itemId) {
        // Refresh feed to show new item
        await loadInitialData()
        return true
      }
      return false
    } catch (err) {
      console.error('Error creating post:', err)
      return false
    }
  }, [user, loadInitialData])

  // Record interaction
  const recordInteraction = useCallback(async (
    itemId: string,
    type: 'view' | 'click' | 'share' | 'hide' | 'report'
  ) => {
    if (!user) return

    try {
      await socialFeedService.recordInteraction(user.id, itemId, type)
      
      // Hide item if hidden or reported
      if (type === 'hide' || type === 'report') {
        setFeedItems(prev => prev.filter(item => item.id !== itemId))
      }
    } catch (err) {
      console.error('Error recording interaction:', err)
    }
  }, [user])

  // Update interest
  const updateInterest = useCallback(async (
    type: UserInterest['interestType'],
    value: string,
    isPositive: boolean
  ) => {
    if (!user) return

    try {
      await socialFeedService.updateUserInterest(user.id, type, value, isPositive)
      // Refresh interests
      const updatedInterests = await socialFeedService.getUserInterests(user.id)
      setInterests(updatedInterests)
    } catch (err) {
      console.error('Error updating interest:', err)
    }
  }, [user])

  // Discover mixes
  const discoverMixes = useCallback(async (filters: DiscoveryFilter): Promise<any[]> => {
    try {
      return await socialFeedService.discoverMixes(filters)
    } catch (err) {
      console.error('Error discovering mixes:', err)
      return []
    }
  }, [])

  // Search users
  const searchUsers = useCallback(async (query: string): Promise<any[]> => {
    try {
      return await socialFeedService.searchUsers(query)
    } catch (err) {
      console.error('Error searching users:', err)
      return []
    }
  }, [])

  // Generate recommendations
  const generateRecommendations = useCallback(async () => {
    if (!user) return

    try {
      await socialFeedService.generateRecommendations(user.id)
      // Refresh recommendations
      const newRecommendations = await socialFeedService.getRecommendations(user.id)
      setRecommendations(newRecommendations)
    } catch (err) {
      console.error('Error generating recommendations:', err)
    }
  }, [user])

  // Mark recommendation seen
  const markRecommendationSeen = useCallback(async (id: string) => {
    try {
      await socialFeedService.markRecommendationSeen(id)
      // Remove from local state
      setRecommendations(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error('Error marking recommendation seen:', err)
    }
  }, [])

  // Provide feedback
  const provideFeedback = useCallback(async (
    id: string,
    feedback: 'positive' | 'negative' | 'neutral'
  ) => {
    try {
      await socialFeedService.provideFeedback(id, feedback)
      // Update local state
      setRecommendations(prev => 
        prev.map(r => r.id === id ? { ...r, feedback } : r)
      )
    } catch (err) {
      console.error('Error providing feedback:', err)
    }
  }, [])

  // Refresh
  const refresh = useCallback(async () => {
    setOffset(0)
    await loadInitialData()
  }, [loadInitialData])

  // Initial load
  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !user) return

    const interval = setInterval(() => {
      loadInitialData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loadInitialData, user])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return

    // Subscribe to feed updates
    const unsubscribeFeed = socialFeedService.subscribeFeedUpdates(
      user.id,
      (newItem) => {
        setFeedItems(prev => [newItem, ...prev])
      }
    )

    // Subscribe to trending updates
    const unsubscribeTrending = socialFeedService.subscribeTrendingUpdates(
      (topics) => {
        setTrendingTopics(topics)
      }
    )

    return () => {
      unsubscribeFeed()
      unsubscribeTrending()
    }
  }, [user])

  return {
    // Feed data
    feedItems,
    trendingTopics,
    recommendations,
    
    // User data
    followers,
    following,
    interests,
    
    // Stats
    feedStats,
    
    // Actions
    toggleFollow,
    createPost,
    recordInteraction,
    updateInterest,
    loadMore,
    refresh,
    
    // Discover
    discoverMixes,
    searchUsers,
    
    // Recommendations
    generateRecommendations,
    markRecommendationSeen,
    provideFeedback,
    
    // State
    isLoading,
    isLoadingMore,
    hasMore,
    error
  }
}

export default useSocialFeed