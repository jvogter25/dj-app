// Production Mix Discovery Component
// Advanced filtering and discovery by genre, BPM, key

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Search, Filter, Music, Clock, Hash, Sliders,
  TrendingUp, Grid, List, ChevronDown, X,
  Play, Heart, Download, Share2, Sparkles,
  Zap, Globe, Calendar, BarChart3
} from 'lucide-react'
import { useSocialFeed } from '../../hooks/useSocialFeed'
import { DiscoveryFilter } from '../../lib/socialFeedService'
import { MUSIC_KEYS, getCompatibleKeys } from '../../lib/musicTheory'

interface MixDiscoveryProps {
  onMixSelect?: (mixId: string) => void
  onPlayMix?: (mixId: string) => void
  className?: string
}

type ViewMode = 'grid' | 'list'
type SortBy = 'popularity' | 'quality' | 'relevance' | 'newest'

// Genre categories
const GENRE_CATEGORIES = {
  electronic: ['House', 'Techno', 'Trance', 'Drum & Bass', 'Dubstep', 'EDM', 'Ambient', 'Breakbeat'],
  hiphop: ['Hip Hop', 'Trap', 'R&B', 'Soul', 'Funk', 'Neo Soul'],
  latin: ['Reggaeton', 'Latin House', 'Salsa', 'Bachata', 'Merengue', 'Cumbia'],
  world: ['Afrobeat', 'Dancehall', 'Reggae', 'Soca', 'Bhangra', 'K-Pop'],
  other: ['Pop', 'Rock', 'Jazz', 'Classical', 'Country', 'Metal']
}

// Mood options
const MOOD_OPTIONS = [
  { value: 'energetic', label: 'Energetic', icon: '⚡' },
  { value: 'chill', label: 'Chill', icon: '😌' },
  { value: 'dark', label: 'Dark', icon: '🌑' },
  { value: 'uplifting', label: 'Uplifting', icon: '🌟' },
  { value: 'groovy', label: 'Groovy', icon: '🕺' },
  { value: 'emotional', label: 'Emotional', icon: '💫' },
  { value: 'aggressive', label: 'Aggressive', icon: '🔥' },
  { value: 'melodic', label: 'Melodic', icon: '🎵' }
]

export const MixDiscovery: React.FC<MixDiscoveryProps> = ({
  onMixSelect,
  onPlayMix,
  className = ''
}) => {
  const { discoverMixes, updateInterest } = useSocialFeed()

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('popularity')
  const [showFilters, setShowFilters] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])
  
  // Filters
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [bpmRange, setBpmRange] = useState<[number, number]>([100, 150])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [durationRange, setDurationRange] = useState<[number, number]>([0, 60])
  
  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [onlyHarmonicMatches, setOnlyHarmonicMatches] = useState(false)
  const [minQualityScore, setMinQualityScore] = useState(0)

  // Perform search
  const performSearch = useCallback(async () => {
    setIsSearching(true)

    const filters: DiscoveryFilter = {
      genres: selectedGenres.length > 0 ? selectedGenres : undefined,
      bpmMin: bpmRange[0],
      bpmMax: bpmRange[1],
      keySignatures: selectedKeys.length > 0 ? selectedKeys : undefined,
      moods: selectedMoods.length > 0 ? selectedMoods : undefined,
      minDuration: durationRange[0] * 60, // Convert to seconds
      maxDuration: durationRange[1] * 60,
      sortBy
    }

    try {
      const discoveredMixes = await discoverMixes(filters)
      
      // Apply additional client-side filters
      let filtered = discoveredMixes
      
      if (minQualityScore > 0) {
        filtered = filtered.filter(mix => mix.quality_score >= minQualityScore)
      }
      
      if (onlyHarmonicMatches && selectedKeys.length > 0) {
        const compatibleKeys = new Set<string>()
        selectedKeys.forEach(key => {
          getCompatibleKeys(key).forEach(k => compatibleKeys.add(k))
        })
        filtered = filtered.filter(mix => compatibleKeys.has(mix.key_signature))
      }

      setResults(filtered)
    } catch (error) {
      console.error('Error discovering mixes:', error)
    } finally {
      setIsSearching(false)
    }
  }, [
    selectedGenres, bpmRange, selectedKeys, selectedMoods, 
    durationRange, sortBy, minQualityScore, onlyHarmonicMatches,
    discoverMixes
  ])

  // Initial search
  useEffect(() => {
    performSearch()
  }, []) // Only on mount

  // Toggle genre selection
  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    )
  }

  // Toggle key selection
  const toggleKey = (key: string) => {
    setSelectedKeys(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    )
  }

  // Toggle mood selection
  const toggleMood = (mood: string) => {
    setSelectedMoods(prev => 
      prev.includes(mood) 
        ? prev.filter(m => m !== mood)
        : [...prev, mood]
    )
  }

  // Clear all filters
  const clearFilters = () => {
    setSelectedGenres([])
    setBpmRange([100, 150])
    setSelectedKeys([])
    setSelectedMoods([])
    setDurationRange([0, 60])
    setMinQualityScore(0)
    setOnlyHarmonicMatches(false)
  }

  // Track interest when selecting filters
  useEffect(() => {
    selectedGenres.forEach(genre => updateInterest('genre', genre, true))
    selectedMoods.forEach(mood => updateInterest('mood', mood, true))
  }, [selectedGenres, selectedMoods, updateInterest])

  // Render mix card
  const renderMixCard = (mix: any) => (
    <div
      key={mix.mix_id}
      className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-purple-500 transition-all cursor-pointer group"
      onClick={() => onMixSelect?.(mix.mix_id)}
    >
      {/* Cover Image */}
      <div className="relative h-48">
        <img
          src={mix.cover_image_url || '/placeholder-mix.jpg'}
          alt={mix.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        {/* Play Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPlayMix?.(mix.mix_id)
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-3 bg-purple-600 hover:bg-purple-700 rounded-full opacity-0 group-hover:opacity-100 transition-all"
        >
          <Play className="h-6 w-6 text-white" />
        </button>

        {/* Match Score */}
        {mix.match_score > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded-full text-xs text-white flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {Math.round((mix.match_score / 8.5) * 100)}% match
          </div>
        )}

        {/* Duration */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {Math.floor(mix.duration_seconds / 60)}:{(mix.duration_seconds % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-white mb-1 line-clamp-1">{mix.title}</h3>
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{mix.description}</p>

        {/* Details */}
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
          <span className="px-2 py-1 bg-gray-700 rounded">{mix.genre}</span>
          <span>{mix.bpm} BPM</span>
          <span>{mix.key_signature}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-gray-400">
              <Heart className="h-4 w-4" />
              {mix.popularity_score ? Math.round(mix.popularity_score * 100) : 0}
            </span>
            <span className="flex items-center gap-1 text-gray-400">
              <BarChart3 className="h-4 w-4" />
              {mix.quality_score ? Math.round(mix.quality_score * 100) : 0}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-gray-700 rounded transition-colors">
              <Download className="h-4 w-4 text-gray-400" />
            </button>
            <button className="p-1 hover:bg-gray-700 rounded transition-colors">
              <Share2 className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`flex gap-6 ${className}`}>
      {/* Filters Sidebar */}
      {showFilters && (
        <div className="w-80 flex-shrink-0">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </h3>
              <button
                onClick={clearFilters}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                Clear all
              </button>
            </div>

            {/* Genre Filter */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Genre</h4>
              <div className="space-y-2">
                {Object.entries(GENRE_CATEGORIES).map(([category, genres]) => (
                  <div key={category}>
                    <p className="text-xs text-gray-500 uppercase mb-1">{category}</p>
                    <div className="flex flex-wrap gap-2">
                      {genres.map(genre => (
                        <button
                          key={genre}
                          onClick={() => toggleGenre(genre)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            selectedGenres.includes(genre)
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BPM Range */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-300 mb-3">BPM Range</h4>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="number"
                  value={bpmRange[0]}
                  onChange={(e) => setBpmRange([parseInt(e.target.value), bpmRange[1]])}
                  className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  min="60"
                  max="200"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  value={bpmRange[1]}
                  onChange={(e) => setBpmRange([bpmRange[0], parseInt(e.target.value)])}
                  className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  min="60"
                  max="200"
                />
              </div>
              <input
                type="range"
                min="60"
                max="200"
                value={bpmRange[0]}
                onChange={(e) => setBpmRange([parseInt(e.target.value), bpmRange[1]])}
                className="w-full"
              />
            </div>

            {/* Key Filter */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Key</h4>
              <div className="grid grid-cols-4 gap-2">
                {MUSIC_KEYS.map(key => (
                  <button
                    key={key.notation}
                    onClick={() => toggleKey(key.notation)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      selectedKeys.includes(key.notation)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {key.notation}
                  </button>
                ))}
              </div>
              {onlyHarmonicMatches && selectedKeys.length > 0 && (
                <p className="text-xs text-purple-400 mt-2">
                  Showing harmonic matches only
                </p>
              )}
            </div>

            {/* Mood Filter */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Mood</h4>
              <div className="grid grid-cols-2 gap-2">
                {MOOD_OPTIONS.map(mood => (
                  <button
                    key={mood.value}
                    onClick={() => toggleMood(mood.value)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                      selectedMoods.includes(mood.value)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <span>{mood.icon}</span>
                    <span>{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Filter */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Duration (minutes)</h4>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={durationRange[0]}
                  onChange={(e) => setDurationRange([parseInt(e.target.value), durationRange[1]])}
                  className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  min="0"
                  max="120"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  value={durationRange[1]}
                  onChange={(e) => setDurationRange([durationRange[0], parseInt(e.target.value)])}
                  className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  min="0"
                  max="120"
                />
              </div>
            </div>

            {/* Advanced Options */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full py-2 text-sm text-purple-400 hover:text-purple-300 flex items-center justify-center gap-2"
            >
              <Sliders className="h-4 w-4" />
              Advanced Options
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 pt-4 border-t border-gray-700">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={onlyHarmonicMatches}
                    onChange={(e) => setOnlyHarmonicMatches(e.target.checked)}
                    className="rounded border-gray-600"
                  />
                  <span className="text-sm text-gray-300">Harmonic matches only</span>
                </label>

                <div>
                  <label className="text-sm text-gray-300">Min Quality Score</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={minQualityScore * 100}
                    onChange={(e) => setMinQualityScore(parseInt(e.target.value) / 100)}
                    className="w-full mt-1"
                  />
                  <span className="text-xs text-gray-500">{Math.round(minQualityScore * 100)}%</span>
                </div>
              </div>
            )}

            {/* Apply Button */}
            <button
              onClick={performSearch}
              disabled={isSearching}
              className="w-full mt-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Search className="h-4 w-4" />
              {isSearching ? 'Searching...' : 'Apply Filters'}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex-1">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white mb-1">Discover Mixes</h2>
              <p className="text-gray-400">
                {results.length} mixes found
                {selectedGenres.length > 0 && ` in ${selectedGenres.join(', ')}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
              >
                <option value="popularity">Most Popular</option>
                <option value="quality">Highest Quality</option>
                <option value="relevance">Most Relevant</option>
                <option value="newest">Newest First</option>
              </select>

              {/* View Mode */}
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Toggle Filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Filter className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Grid/List */}
        {isSearching ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4" />
              <p className="text-gray-400">Discovering mixes...</p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <Music className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No mixes found matching your criteria</p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {results.map(renderMixCard)}
          </div>
        )}
      </div>
    </div>
  )
}

export default MixDiscovery