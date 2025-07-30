// Production Advanced Search Component
// Comprehensive search interface for users and mixes

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Search, X, Filter, Clock, TrendingUp, Hash,
  Music, Users, Sparkles, ChevronDown, Globe,
  Calendar, MapPin, Award, Mic, Loader
} from 'lucide-react'
import { searchService, SearchFilters, SearchResult, SearchSuggestion } from '../../lib/searchService'
import { useDebounce } from '../../hooks/useDebounce'
import { formatDistanceToNow } from 'date-fns'

interface AdvancedSearchProps {
  onResultClick?: (result: SearchResult) => void
  onClose?: () => void
  className?: string
}

type SearchTab = 'all' | 'mixes' | 'users' | 'tracks'

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onResultClick,
  onClose,
  className = ''
}) => {
  // State
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<SearchTab>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [facets, setFacets] = useState<Record<string, any>>({})
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [popularSearches, setPopularSearches] = useState<string[]>([])

  // Filters
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    sortBy: 'relevance',
    timeRange: 'all'
  })

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  // Load search history and popular searches
  useEffect(() => {
    setSearchHistory(searchService.getSearchHistory())
    setPopularSearches(searchService.getPopularSearches())
  }, [])

  // Get suggestions when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchService.getSuggestions(debouncedQuery).then(setSuggestions)
    } else {
      setSuggestions([])
    }
  }, [debouncedQuery])

  // Perform search
  const performSearch = useCallback(async (searchQuery?: string) => {
    const q = searchQuery || query
    if (!q && Object.keys(filters).length === 1) return

    setIsSearching(true)
    setShowSuggestions(false)

    try {
      const searchFilters: SearchFilters = {
        ...filters,
        query: q,
        type: activeTab
      }

      const { results: searchResults, totalCount: count, facets: searchFacets } = 
        await searchService.search(searchFilters)

      setResults(searchResults)
      setTotalCount(count)
      setFacets(searchFacets)

      // Update history
      if (q) {
        setSearchHistory(searchService.getSearchHistory())
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }, [query, filters, activeTab])

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch()
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text)
    performSearch(suggestion.text)
  }

  // Handle filter change
  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Clear search
  const clearSearch = () => {
    setQuery('')
    setResults([])
    setTotalCount(0)
    setSuggestions([])
    searchInputRef.current?.focus()
  }

  // Get result icon
  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'mix':
        return <Music className="h-5 w-5 text-purple-400" />
      case 'user':
        return <Users className="h-5 w-5 text-blue-400" />
      case 'track':
        return <Mic className="h-5 w-5 text-green-400" />
      default:
        return <Search className="h-5 w-5 text-gray-400" />
    }
  }

  // Render search result
  const renderSearchResult = (result: SearchResult) => (
    <div
      key={`${result.type}-${result.id}`}
      className="p-4 hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-700 last:border-0"
      onClick={() => onResultClick?.(result)}
    >
      <div className="flex items-start gap-3">
        {/* Icon/Thumbnail */}
        <div className="flex-shrink-0">
          {result.thumbnail ? (
            <img
              src={result.thumbnail}
              alt={result.title}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
              {getResultIcon(result.type)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-white">
              {/* Highlight matching text */}
              {result.highlights?.title ? (
                <span dangerouslySetInnerHTML={{
                  __html: result.title.replace(
                    new RegExp(`(${result.highlights.title.join('|')})`, 'gi'),
                    '<mark class="bg-yellow-500/30 text-yellow-300">$1</mark>'
                  )
                }} />
              ) : (
                result.title
              )}
            </h3>
            <span className="text-xs text-gray-500 uppercase">{result.type}</span>
          </div>

          {result.description && (
            <p className="text-sm text-gray-400 line-clamp-2">
              {result.highlights?.description ? (
                <span dangerouslySetInnerHTML={{
                  __html: result.description.replace(
                    new RegExp(`(${result.highlights.description.join('|')})`, 'gi'),
                    '<mark class="bg-yellow-500/30 text-yellow-300">$1</mark>'
                  )
                }} />
              ) : (
                result.description
              )}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            {result.type === 'mix' && (
              <>
                <span>{result.metadata.genre}</span>
                <span>•</span>
                <span>{result.metadata.bpm} BPM</span>
                <span>•</span>
                <span>{Math.floor(result.metadata.duration / 60)}m</span>
                <span>•</span>
                <span>{result.metadata.playCount} plays</span>
              </>
            )}
            {result.type === 'user' && (
              <>
                {result.metadata.location && (
                  <>
                    <MapPin className="h-3 w-3" />
                    <span>{result.metadata.location}</span>
                    <span>•</span>
                  </>
                )}
                <span>{result.metadata.followersCount} followers</span>
                <span>•</span>
                <span>{result.metadata.mixCount} mixes</span>
                {result.metadata.isVerified && (
                  <>
                    <span>•</span>
                    <Award className="h-3 w-3 text-blue-400" />
                  </>
                )}
              </>
            )}
          </div>

          {/* Highlighted tags */}
          {result.highlights?.tags && result.highlights.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {result.highlights.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Relevance Score (dev mode) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-600">
            Score: {result.relevanceScore.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-4">
          {/* Search Input */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search for mixes, users, or tracks..."
                className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-600 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </form>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <Filter className="h-5 w-5" />
          </button>

          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mt-4">
          {(['all', 'mixes', 'users', 'tracks'] as SearchTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                if (query || Object.keys(filters).length > 1) {
                  performSearch()
                }
              }}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || searchHistory.length > 0) && !isSearching && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Search Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-2">
              <p className="text-xs text-gray-500 uppercase px-2 py-1">Suggestions</p>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-700 rounded transition-colors flex items-center gap-3"
                >
                  {suggestion.type === 'query' && <Search className="h-4 w-4 text-gray-400" />}
                  {suggestion.type === 'user' && <Users className="h-4 w-4 text-blue-400" />}
                  {suggestion.type === 'mix' && <Music className="h-4 w-4 text-purple-400" />}
                  {suggestion.type === 'tag' && <Hash className="h-4 w-4 text-green-400" />}
                  <span className="text-white">{suggestion.text}</span>
                  {suggestion.metadata?.genre && (
                    <span className="text-xs text-gray-500">{suggestion.metadata.genre}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Search History */}
          {searchHistory.length > 0 && !query && (
            <div className="p-2 border-t border-gray-700">
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-xs text-gray-500 uppercase">Recent Searches</p>
                <button
                  onClick={() => {
                    searchService.clearSearchHistory()
                    setSearchHistory([])
                  }}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
              {searchHistory.slice(0, 5).map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(search)
                    performSearch(search)
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-700 rounded transition-colors flex items-center gap-3"
                >
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-300">{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* Popular Searches */}
          {popularSearches.length > 0 && !query && (
            <div className="p-2 border-t border-gray-700">
              <p className="text-xs text-gray-500 uppercase px-2 py-1">Popular Searches</p>
              {popularSearches.slice(0, 5).map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(search)
                    performSearch(search)
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-700 rounded transition-colors flex items-center gap-3"
                >
                  <TrendingUp className="h-4 w-4 text-purple-400" />
                  <span className="text-gray-300">{search}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="p-4 border-b border-gray-700 bg-gray-700/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Sort By */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value="relevance">Relevance</option>
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>

            {/* Time Range */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Time Range</label>
              <select
                value={filters.timeRange}
                onChange={(e) => updateFilter('timeRange', e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>

            {/* Mix-specific filters */}
            {(activeTab === 'all' || activeTab === 'mixes') && (
              <>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Has Stems</label>
                  <select
                    value={filters.hasStems?.toString() || 'all'}
                    onChange={(e) => updateFilter('hasStems', e.target.value === 'all' ? undefined : e.target.value === 'true')}
                    className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="all">All</option>
                    <option value="true">With Stems</option>
                    <option value="false">Without Stems</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Collaborative</label>
                  <select
                    value={filters.isCollaborative?.toString() || 'all'}
                    onChange={(e) => updateFilter('isCollaborative', e.target.value === 'all' ? undefined : e.target.value === 'true')}
                    className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="all">All</option>
                    <option value="true">Collaborative</option>
                    <option value="false">Solo</option>
                  </select>
                </div>
              </>
            )}

            {/* User-specific filters */}
            {(activeTab === 'all' || activeTab === 'users') && (
              <>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Verified</label>
                  <select
                    value={filters.verified?.toString() || 'all'}
                    onChange={(e) => updateFilter('verified', e.target.value === 'all' ? undefined : e.target.value === 'true')}
                    className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="all">All</option>
                    <option value="true">Verified Only</option>
                    <option value="false">Not Verified</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Min Followers</label>
                  <input
                    type="number"
                    value={filters.followersMin || ''}
                    onChange={(e) => updateFilter('followersMin', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  />
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => performSearch()}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
          >
            Apply Filters
          </button>
        </div>
      )}

      {/* Results */}
      <div className="max-h-[600px] overflow-y-auto">
        {isSearching ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-8 w-8 text-purple-500 animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <>
            {/* Results header */}
            <div className="px-4 py-2 bg-gray-700/30 text-sm text-gray-400">
              Found {totalCount} results
              {query && <span> for "{query}"</span>}
            </div>

            {/* Results list */}
            {results.map(renderSearchResult)}

            {/* Facets */}
            {Object.keys(facets).length > 0 && (
              <div className="p-4 border-t border-gray-700 bg-gray-700/30">
                <p className="text-sm font-medium text-gray-300 mb-3">Refine by</p>
                <div className="space-y-3">
                  {facets.mixes?.genres && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Genres</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(facets.mixes.genres)
                          .sort((a, b) => b[1] as number - (a[1] as number))
                          .slice(0, 5)
                          .map(([genre, count]) => (
                            <button
                              key={genre}
                              onClick={() => {
                                updateFilter('genres', [genre])
                                performSearch()
                              }}
                              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 transition-colors"
                            >
                              <>{genre} ({count})</>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : query || Object.keys(filters).length > 1 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No results found</p>
            <p className="text-sm text-gray-500">Try different keywords or filters</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">Start typing to search</p>
            <p className="text-sm text-gray-500">Find mixes, users, and tracks</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdvancedSearch