// Production Search Service
// Advanced search functionality for users and mixes

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!
)

export interface SearchFilters {
  // Common filters
  query?: string
  type?: 'all' | 'mixes' | 'users' | 'tracks'
  sortBy?: 'relevance' | 'recent' | 'popular' | 'alphabetical'
  timeRange?: 'all' | 'today' | 'week' | 'month' | 'year'
  
  // Mix-specific filters
  genres?: string[]
  bpmMin?: number
  bpmMax?: number
  keySignatures?: string[]
  moods?: string[]
  durationMin?: number
  durationMax?: number
  hasStems?: boolean
  isCollaborative?: boolean
  
  // User-specific filters
  location?: string
  djStyles?: string[]
  verified?: boolean
  followersMin?: number
  
  // Advanced filters
  tags?: string[]
  excludeTags?: string[]
  language?: string
  license?: 'all' | 'free' | 'commercial'
}

export interface SearchResult {
  id: string
  type: 'mix' | 'user' | 'track'
  title: string
  description?: string
  thumbnail?: string
  metadata: any
  relevanceScore: number
  highlights: {
    title?: string[]
    description?: string[]
    tags?: string[]
  }
}

export interface SearchSuggestion {
  text: string
  type: 'query' | 'user' | 'mix' | 'tag' | 'genre'
  metadata?: any
}

export class SearchService {
  private searchHistory: string[] = []
  private popularSearches: Map<string, number> = new Map()

  // Perform advanced search
  async search(
    filters: SearchFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    results: SearchResult[]
    totalCount: number
    facets: Record<string, any>
  }> {
    try {
      const results: SearchResult[] = []
      let totalCount = 0
      const facets: Record<string, any> = {}

      // Determine what to search
      const searchTypes = filters.type === 'all' 
        ? ['mixes', 'users', 'tracks'] 
        : [filters.type]

      // Search each type
      for (const type of searchTypes) {
        if (type === 'mixes') {
          const mixResults = await this.searchMixes(filters, limit, offset)
          results.push(...mixResults.results)
          totalCount += mixResults.count
          facets.mixes = mixResults.facets
        } else if (type === 'users') {
          const userResults = await this.searchUsers(filters, limit, offset)
          results.push(...userResults.results)
          totalCount += userResults.count
          facets.users = userResults.facets
        }
      }

      // Sort combined results by relevance
      results.sort((a, b) => b.relevanceScore - a.relevanceScore)

      // Record search
      if (filters.query) {
        this.recordSearch(filters.query)
      }

      return {
        results: results.slice(0, limit),
        totalCount,
        facets
      }
    } catch (error) {
      console.error('Search error:', error)
      return { results: [], totalCount: 0, facets: {} }
    }
  }

  // Search mixes
  private async searchMixes(
    filters: SearchFilters,
    limit: number,
    offset: number
  ): Promise<{
    results: SearchResult[]
    count: number
    facets: any
  }> {
    let query = supabase
      .from('mixes')
      .select(`
        *,
        user:profiles!user_id(display_name, avatar_url),
        mix_discovery_metadata!inner(*)
      `, { count: 'exact' })

    // Apply text search
    if (filters.query) {
      // Use full-text search on mix_discovery_metadata
      query = query.textSearch('mix_discovery_metadata.search_vector', filters.query, {
        type: 'websearch',
        config: 'english'
      })
    }

    // Apply filters
    if (filters.genres && filters.genres.length > 0) {
      query = query.or(
        `genre.in.(${filters.genres.join(',')}),` +
        `mix_discovery_metadata.secondary_genres.cs.{${filters.genres.join(',')}}`
      )
    }

    if (filters.bpmMin !== undefined) {
      query = query.gte('bpm', filters.bpmMin)
    }
    if (filters.bpmMax !== undefined) {
      query = query.lte('bpm', filters.bpmMax)
    }

    if (filters.keySignatures && filters.keySignatures.length > 0) {
      query = query.in('key_signature', filters.keySignatures)
    }

    if (filters.moods && filters.moods.length > 0) {
      query = query.contains('mix_discovery_metadata.moods', filters.moods)
    }

    if (filters.durationMin !== undefined) {
      query = query.gte('duration_seconds', filters.durationMin)
    }
    if (filters.durationMax !== undefined) {
      query = query.lte('duration_seconds', filters.durationMax)
    }

    if (filters.hasStems !== undefined) {
      query = query.eq('has_stems', filters.hasStems)
    }

    if (filters.isCollaborative !== undefined) {
      query = query.eq('is_collaborative', filters.isCollaborative)
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }

    // Apply time range filter
    if (filters.timeRange && filters.timeRange !== 'all') {
      const timeRanges = {
        today: '1 day',
        week: '7 days',
        month: '30 days',
        year: '365 days'
      }
      query = query.gte('created_at', `now() - interval '${timeRanges[filters.timeRange]}'`)
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'recent':
        query = query.order('created_at', { ascending: false })
        break
      case 'popular':
        query = query.order('play_count', { ascending: false })
        break
      case 'alphabetical':
        query = query.order('title')
        break
      default:
        // Relevance sorting handled by text search
        break
    }

    // Only public mixes
    query = query.eq('is_public', true).eq('status', 'published')

    // Execute query
    const { data, count, error } = await query
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Transform to search results
    const results: SearchResult[] = (data || []).map(mix => ({
      id: mix.id,
      type: 'mix' as const,
      title: mix.title,
      description: mix.description,
      thumbnail: mix.cover_image_url,
      metadata: {
        genre: mix.genre,
        bpm: mix.bpm,
        key: mix.key_signature,
        duration: mix.duration_seconds,
        playCount: mix.play_count,
        likeCount: mix.like_count,
        user: mix.user
      },
      relevanceScore: this.calculateRelevanceScore(mix, filters),
      highlights: this.extractHighlights(mix, filters.query)
    }))

    // Calculate facets
    const facets = {
      genres: await this.getGenreFacets(),
      bpmRanges: this.getBPMRangeFacets(data || []),
      moods: await this.getMoodFacets()
    }

    return { results, count: count || 0, facets }
  }

  // Search users
  private async searchUsers(
    filters: SearchFilters,
    limit: number,
    offset: number
  ): Promise<{
    results: SearchResult[]
    count: number
    facets: any
  }> {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })

    // Apply text search
    if (filters.query) {
      query = query.or(
        `display_name.ilike.%${filters.query}%,` +
        `bio.ilike.%${filters.query}%,` +
        `location.ilike.%${filters.query}%`
      )
    }

    // Apply filters
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`)
    }

    if (filters.djStyles && filters.djStyles.length > 0) {
      query = query.contains('dj_styles', filters.djStyles)
    }

    if (filters.verified !== undefined) {
      query = query.eq('is_verified', filters.verified)
    }

    if (filters.followersMin !== undefined) {
      query = query.gte('followers_count', filters.followersMin)
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'recent':
        query = query.order('created_at', { ascending: false })
        break
      case 'popular':
        query = query.order('followers_count', { ascending: false })
        break
      case 'alphabetical':
        query = query.order('display_name')
        break
    }

    // Execute query
    const { data, count, error } = await query
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Transform to search results
    const results: SearchResult[] = (data || []).map(user => ({
      id: user.id,
      type: 'user' as const,
      title: user.display_name,
      description: user.bio,
      thumbnail: user.avatar_url,
      metadata: {
        location: user.location,
        djStyles: user.dj_styles,
        followersCount: user.followers_count,
        mixCount: user.mix_count,
        isVerified: user.is_verified
      },
      relevanceScore: this.calculateUserRelevanceScore(user, filters),
      highlights: this.extractHighlights(user, filters.query)
    }))

    // Calculate facets
    const facets = {
      locations: this.getLocationFacets(data || []),
      djStyles: this.getDJStyleFacets(data || [])
    }

    return { results, count: count || 0, facets }
  }

  // Get search suggestions
  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    if (!query || query.length < 2) return []

    const suggestions: SearchSuggestion[] = []

    try {
      // Get query suggestions from search history
      const historySuggestions = this.searchHistory
        .filter(h => h.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map(text => ({ text, type: 'query' as const }))

      suggestions.push(...historySuggestions)

      // Get user suggestions
      const { data: users } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .ilike('display_name', `${query}%`)
        .limit(3)

      if (users) {
        suggestions.push(...users.map(user => ({
          text: user.display_name,
          type: 'user' as const,
          metadata: { id: user.id, avatar: user.avatar_url }
        })))
      }

      // Get mix suggestions
      const { data: mixes } = await supabase
        .from('mixes')
        .select('id, title, genre')
        .ilike('title', `${query}%`)
        .eq('is_public', true)
        .limit(3)

      if (mixes) {
        suggestions.push(...mixes.map(mix => ({
          text: mix.title,
          type: 'mix' as const,
          metadata: { id: mix.id, genre: mix.genre }
        })))
      }

      // Get tag suggestions
      const { data: tags } = await supabase
        .from('mix_discovery_metadata')
        .select('hashtags')
        .contains('hashtags', [query])
        .limit(5)

      if (tags) {
        const uniqueTags = new Set<string>()
        tags.forEach(t => t.hashtags?.forEach((tag: string) => {
          if (tag.toLowerCase().includes(query.toLowerCase())) {
            uniqueTags.add(tag)
          }
        }))
        
        suggestions.push(...Array.from(uniqueTags).slice(0, 3).map(tag => ({
          text: tag,
          type: 'tag' as const
        })))
      }

      return suggestions.slice(0, 10)
    } catch (error) {
      console.error('Error getting suggestions:', error)
      return suggestions
    }
  }

  // Calculate relevance score for mixes
  private calculateRelevanceScore(mix: any, filters: SearchFilters): number {
    let score = 0

    // Text match score
    if (filters.query) {
      const query = filters.query.toLowerCase()
      if (mix.title.toLowerCase().includes(query)) score += 10
      if (mix.description?.toLowerCase().includes(query)) score += 5
      if (mix.tags?.some((tag: string) => tag.toLowerCase().includes(query))) score += 3
    }

    // Filter match score
    if (filters.genres?.includes(mix.genre)) score += 5
    if (filters.moods?.some(mood => mix.mix_discovery_metadata?.moods?.includes(mood))) score += 3

    // Popularity score
    score += Math.log10(mix.play_count + 1) * 2
    score += Math.log10(mix.like_count + 1)

    // Recency score
    const daysOld = (Date.now() - new Date(mix.created_at).getTime()) / (1000 * 60 * 60 * 24)
    score += Math.max(0, 10 - daysOld / 30)

    return score
  }

  // Calculate relevance score for users
  private calculateUserRelevanceScore(user: any, filters: SearchFilters): number {
    let score = 0

    // Text match score
    if (filters.query) {
      const query = filters.query.toLowerCase()
      if (user.display_name.toLowerCase().includes(query)) score += 10
      if (user.bio?.toLowerCase().includes(query)) score += 5
    }

    // Popularity score
    score += Math.log10(user.followers_count + 1) * 3
    score += Math.log10(user.mix_count + 1) * 2

    // Verification bonus
    if (user.is_verified) score += 5

    return score
  }

  // Extract search highlights
  private extractHighlights(item: any, query?: string): any {
    if (!query) return {}

    const highlights: any = {}
    const terms = query.toLowerCase().split(' ')

    // Highlight matching terms
    const highlightText = (text: string): string[] => {
      const matches: string[] = []
      terms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi')
        const match = text.match(regex)
        if (match) {
          matches.push(...match)
        }
      })
      return matches
    }

    if (item.title) {
      highlights.title = highlightText(item.title)
    }
    if (item.description) {
      highlights.description = highlightText(item.description)
    }
    if (item.tags) {
      highlights.tags = item.tags.filter((tag: string) => 
        terms.some(term => tag.toLowerCase().includes(term))
      )
    }

    return highlights
  }

  // Get genre facets
  private async getGenreFacets(): Promise<Record<string, number>> {
    const { data } = await supabase
      .from('mixes')
      .select('genre')
      .eq('is_public', true)
      .eq('status', 'published')

    const facets: Record<string, number> = {}
    data?.forEach(mix => {
      if (mix.genre) {
        facets[mix.genre] = (facets[mix.genre] || 0) + 1
      }
    })

    return facets
  }

  // Get BPM range facets
  private getBPMRangeFacets(mixes: any[]): Record<string, number> {
    const ranges = {
      'Slow (60-100)': 0,
      'Medium (100-128)': 0,
      'Fast (128-150)': 0,
      'Very Fast (150+)': 0
    }

    mixes.forEach(mix => {
      if (mix.bpm < 100) ranges['Slow (60-100)']++
      else if (mix.bpm < 128) ranges['Medium (100-128)']++
      else if (mix.bpm < 150) ranges['Fast (128-150)']++
      else ranges['Very Fast (150+)']++
    })

    return ranges
  }

  // Get mood facets
  private async getMoodFacets(): Promise<Record<string, number>> {
    const { data } = await supabase
      .from('mix_discovery_metadata')
      .select('moods')

    const facets: Record<string, number> = {}
    data?.forEach(item => {
      item.moods?.forEach((mood: string) => {
        facets[mood] = (facets[mood] || 0) + 1
      })
    })

    return facets
  }

  // Get location facets
  private getLocationFacets(users: any[]): Record<string, number> {
    const facets: Record<string, number> = {}
    users.forEach(user => {
      if (user.location) {
        // Extract country/city
        const location = user.location.split(',')[0].trim()
        facets[location] = (facets[location] || 0) + 1
      }
    })
    return facets
  }

  // Get DJ style facets
  private getDJStyleFacets(users: any[]): Record<string, number> {
    const facets: Record<string, number> = {}
    users.forEach(user => {
      user.dj_styles?.forEach((style: string) => {
        facets[style] = (facets[style] || 0) + 1
      })
    })
    return facets
  }

  // Record search for history
  private recordSearch(query: string): void {
    // Add to history
    this.searchHistory = [
      query,
      ...this.searchHistory.filter(q => q !== query)
    ].slice(0, 50)

    // Update popular searches
    const count = this.popularSearches.get(query) || 0
    this.popularSearches.set(query, count + 1)

    // Store in localStorage
    try {
      localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory))
    } catch (e) {
      console.error('Failed to save search history:', e)
    }
  }

  // Get search history
  getSearchHistory(): string[] {
    return this.searchHistory
  }

  // Get popular searches
  getPopularSearches(limit: number = 10): string[] {
    return Array.from(this.popularSearches.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query]) => query)
  }

  // Clear search history
  clearSearchHistory(): void {
    this.searchHistory = []
    localStorage.removeItem('searchHistory')
  }

  // Initialize from localStorage
  constructor() {
    try {
      const saved = localStorage.getItem('searchHistory')
      if (saved) {
        this.searchHistory = JSON.parse(saved)
      }
    } catch (e) {
      console.error('Failed to load search history:', e)
    }
  }
}

// Export singleton instance
export const searchService = new SearchService()