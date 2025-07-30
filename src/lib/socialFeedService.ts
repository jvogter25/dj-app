// Production Social Feed Service
// Handles personalized feed generation and social interactions

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!
)

export interface FeedItem {
  id: string
  itemType: 'mix_published' | 'mix_liked' | 'mix_commented' | 'mix_shared' | 
            'user_followed' | 'collaboration_started' | 'mix_version_released' | 
            'achievement_unlocked' | 'contest_entry' | 'live_session_started'
  title: string
  description?: string
  thumbnailUrl?: string
  userId: string
  userDisplayName: string
  userAvatarUrl?: string
  mixId?: string
  targetUserId?: string
  collaborationId?: string
  metadata?: any
  createdAt: string
  relevanceScore?: number
  viewCount: number
  interactionCount: number
}

export interface TrendingTopic {
  id: string
  topicType: 'genre' | 'artist' | 'technique' | 'event' | 'hashtag' | 'challenge'
  topicValue: string
  topicDisplayName: string
  score: number
  velocity: number
  relatedMixes: number
  sampleMixes?: any[]
}

export interface UserInterest {
  id: string
  interestType: 'genre' | 'artist' | 'bpm_range' | 'mood' | 'mix_length' | 'technique'
  interestValue: string
  weight: number
  source: 'explicit' | 'implicit' | 'ml_derived'
}

export interface DiscoveryFilter {
  genres?: string[]
  bpmMin?: number
  bpmMax?: number
  keySignatures?: string[]
  moods?: string[]
  minDuration?: number
  maxDuration?: number
  sortBy?: 'popularity' | 'quality' | 'relevance' | 'newest'
}

export interface FollowInfo {
  followerId: string
  followingId: string
  followedAt: string
  notifyNewMix: boolean
  notifyLiveSession: boolean
}

export class SocialFeedService {
  // Follow/Unfollow user
  async toggleFollow(followerId: string, followingId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('toggle_follow', {
          p_follower_id: followerId,
          p_following_id: followingId
        })

      if (error) throw error
      return data as boolean
    } catch (error) {
      console.error('Error toggling follow:', error)
      throw error
    }
  }

  // Get user's followers
  async getFollowers(userId: string): Promise<FollowInfo[]> {
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select(`
          *,
          follower:profiles!follower_id(id, display_name, avatar_url)
        `)
        .eq('following_id', userId)
        .order('followed_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting followers:', error)
      return []
    }
  }

  // Get users that someone follows
  async getFollowing(userId: string): Promise<FollowInfo[]> {
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select(`
          *,
          following:profiles!following_id(id, display_name, avatar_url)
        `)
        .eq('follower_id', userId)
        .order('followed_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting following:', error)
      return []
    }
  }

  // Check if user follows another user
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .single()

      return !error && !!data
    } catch (error) {
      return false
    }
  }

  // Get personalized feed for user
  async getUserFeed(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<FeedItem[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_feed', {
          p_user_id: userId,
          p_limit: limit,
          p_offset: offset
        })

      if (error) throw error

      return (data || []).map((item: any) => ({
        id: item.feed_item_id,
        itemType: item.item_type,
        title: item.title,
        description: item.description,
        thumbnailUrl: item.thumbnail_url,
        userId: item.user_id,
        userDisplayName: item.user_display_name,
        userAvatarUrl: item.user_avatar_url,
        mixId: item.mix_id,
        createdAt: item.created_at,
        relevanceScore: item.relevance_score,
        viewCount: 0,
        interactionCount: 0
      }))
    } catch (error) {
      console.error('Error getting user feed:', error)
      return []
    }
  }

  // Create a feed item
  async createFeedItem(
    userId: string,
    itemType: FeedItem['itemType'],
    title: string,
    options?: {
      description?: string
      mixId?: string
      targetUserId?: string
      metadata?: any
      visibility?: 'public' | 'followers' | 'private'
    }
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .rpc('create_feed_item', {
          p_user_id: userId,
          p_item_type: itemType,
          p_title: title,
          p_description: options?.description,
          p_mix_id: options?.mixId,
          p_target_user_id: options?.targetUserId,
          p_metadata: options?.metadata || {}
        })

      if (error) throw error
      return data as string
    } catch (error) {
      console.error('Error creating feed item:', error)
      return null
    }
  }

  // Record feed interaction
  async recordInteraction(
    userId: string,
    feedItemId: string,
    interactionType: 'view' | 'click' | 'share' | 'hide' | 'report',
    interactionData?: any
  ): Promise<void> {
    try {
      await supabase
        .from('feed_interactions')
        .insert({
          user_id: userId,
          feed_item_id: feedItemId,
          interaction_type: interactionType,
          interaction_data: interactionData || {}
        })
    } catch (error) {
      console.error('Error recording interaction:', error)
    }
  }

  // Get trending topics
  async getTrendingTopics(
    topicType?: string,
    timeWindow: 'hour' | 'day' | 'week' | 'month' = 'day',
    limit: number = 20
  ): Promise<TrendingTopic[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_trending_content', {
          p_topic_type: topicType,
          p_time_window: timeWindow,
          p_limit: limit
        })

      if (error) throw error

      return (data || []).map((item: any) => ({
        id: item.topic_id,
        topicType: item.topic_type,
        topicValue: item.topic_value,
        topicDisplayName: item.topic_display_name,
        score: item.score,
        velocity: item.velocity,
        relatedMixes: item.related_mixes,
        sampleMixes: item.sample_mixes
      }))
    } catch (error) {
      console.error('Error getting trending topics:', error)
      return []
    }
  }

  // Discover mixes by criteria
  async discoverMixes(
    filters: DiscoveryFilter,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('discover_mixes', {
          p_genres: filters.genres,
          p_bpm_min: filters.bpmMin,
          p_bpm_max: filters.bpmMax,
          p_key_signatures: filters.keySignatures,
          p_moods: filters.moods,
          p_min_duration: filters.minDuration,
          p_max_duration: filters.maxDuration,
          p_sort_by: filters.sortBy || 'popularity',
          p_limit: limit,
          p_offset: offset
        })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error discovering mixes:', error)
      return []
    }
  }

  // Update user interests
  async updateUserInterest(
    userId: string,
    interestType: UserInterest['interestType'],
    interestValue: string,
    isPositive: boolean
  ): Promise<void> {
    try {
      await supabase
        .rpc('update_user_interest', {
          p_user_id: userId,
          p_interest_type: interestType,
          p_interest_value: interestValue,
          p_is_positive: isPositive
        })
    } catch (error) {
      console.error('Error updating user interest:', error)
    }
  }

  // Get user interests
  async getUserInterests(userId: string): Promise<UserInterest[]> {
    try {
      const { data, error } = await supabase
        .from('user_interests')
        .select('*')
        .eq('user_id', userId)
        .order('weight', { ascending: false })

      if (error) throw error

      return (data || []).map(item => ({
        id: item.id,
        interestType: item.interest_type,
        interestValue: item.interest_value,
        weight: item.weight,
        source: item.source
      }))
    } catch (error) {
      console.error('Error getting user interests:', error)
      return []
    }
  }

  // Generate recommendations for user
  async generateRecommendations(userId: string): Promise<void> {
    try {
      await supabase
        .rpc('generate_recommendations', {
          p_user_id: userId,
          p_algorithm_version: 'v1',
          p_limit: 20
        })
    } catch (error) {
      console.error('Error generating recommendations:', error)
    }
  }

  // Get user recommendations
  async getRecommendations(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('recommendation_queue')
        .select(`
          *,
          mix:mixes(
            id,
            title,
            description,
            genre,
            bpm,
            key_signature,
            duration_seconds,
            cover_image_url,
            user_id,
            play_count,
            like_count,
            user:profiles!user_id(display_name, avatar_url)
          )
        `)
        .eq('user_id', userId)
        .eq('is_seen', false)
        .order('score', { ascending: false })
        .order('priority', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting recommendations:', error)
      return []
    }
  }

  // Mark recommendation as seen
  async markRecommendationSeen(recommendationId: string): Promise<void> {
    try {
      await supabase
        .from('recommendation_queue')
        .update({ 
          is_seen: true,
          presented_at: new Date().toISOString()
        })
        .eq('id', recommendationId)
    } catch (error) {
      console.error('Error marking recommendation seen:', error)
    }
  }

  // Provide feedback on recommendation
  async provideFeedback(
    recommendationId: string,
    feedback: 'positive' | 'negative' | 'neutral',
    interactionType?: string
  ): Promise<void> {
    try {
      await supabase
        .from('recommendation_queue')
        .update({
          is_interacted: true,
          interaction_type: interactionType,
          feedback
        })
        .eq('id', recommendationId)
    } catch (error) {
      console.error('Error providing feedback:', error)
    }
  }

  // Get discovery categories
  async getDiscoveryCategories(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('discovery_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting discovery categories:', error)
      return []
    }
  }

  // Search users
  async searchUsers(query: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`display_name.ilike.%${query}%,bio.ilike.%${query}%`)
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error searching users:', error)
      return []
    }
  }

  // Get feed statistics
  async getFeedStats(userId: string): Promise<any> {
    try {
      const [followers, following, feedItems] = await Promise.all([
        this.getFollowers(userId),
        this.getFollowing(userId),
        supabase
          .from('feed_items')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
      ])

      return {
        followersCount: followers.length,
        followingCount: following.length,
        postsCount: feedItems.count || 0
      }
    } catch (error) {
      console.error('Error getting feed stats:', error)
      return {
        followersCount: 0,
        followingCount: 0,
        postsCount: 0
      }
    }
  }

  // Subscribe to real-time feed updates
  subscribeFeedUpdates(
    userId: string,
    onNewItem: (item: FeedItem) => void
  ): () => void {
    const subscription = supabase
      .channel(`feed:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feed_items',
          filter: `user_id=in.(${userId})`
        },
        (payload) => {
          onNewItem(payload.new as FeedItem)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  // Subscribe to trending updates
  subscribeTrendingUpdates(
    onUpdate: (topics: TrendingTopic[]) => void
  ): () => void {
    const subscription = supabase
      .channel('trending')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trending_topics'
        },
        async () => {
          const topics = await this.getTrendingTopics()
          onUpdate(topics)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }
}

// Export singleton instance
export const socialFeedService = new SocialFeedService()