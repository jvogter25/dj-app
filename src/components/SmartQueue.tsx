import React, { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp, Sparkles, TrendingDown, TrendingUp, Minus, RefreshCw } from 'lucide-react'
import { trackDB, TrackAnalysis } from '../lib/trackDatabase'
import { getKeyCompatibility } from '../lib/harmonicMixing'

interface SmartQueueProps {
  currentTrack?: {
    id: string
    name: string
    artists: { name: string }[]
    bpm?: number
    camelotKey?: string
    energy?: number
    valence?: number
    audio_features?: any
  }
  onTrackSelect: (track: any, deck: 'A' | 'B') => void
  targetDeck: 'A' | 'B'
}

interface SuggestionCategory {
  type: 'down' | 'same' | 'up'
  title: string
  icon: React.ReactNode
  description: string
  tracks: TrackAnalysis[]
}

export const SmartQueue: React.FC<SmartQueueProps> = ({ currentTrack, onTrackSelect, targetDeck }) => {
  const [expanded, setExpanded] = useState(true)
  const [suggestions, setSuggestions] = useState<SuggestionCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<'down' | 'same' | 'up'>('same')

  // Generate smart suggestions based on current track
  const generateSuggestions = useCallback(async () => {
    console.log('SmartQueue: Generating suggestions for:', {
      name: currentTrack?.name,
      bpm: currentTrack?.bpm,
      camelotKey: currentTrack?.camelotKey,
      energy: currentTrack?.energy,
      valence: currentTrack?.valence,
      hasAudioFeatures: !!currentTrack?.audio_features
    })
    
    if (!currentTrack?.bpm || !currentTrack?.camelotKey || currentTrack.camelotKey === 'Unknown') {
      console.log('Cannot generate suggestions - missing track features', {
        bpm: currentTrack?.bpm,
        camelotKey: currentTrack?.camelotKey,
        track: currentTrack
      })
      return
    }

    setLoading(true)
    try {
      const allTracks = await trackDB.getAllTracks()
      console.log(`Found ${allTracks.length} tracks in database for suggestions`)

      // Filter out current track and tracks without required data
      const availableTracks = allTracks.filter(t => 
        t.id !== currentTrack.id && 
        t.tempo && 
        t.camelotKey && 
        t.camelotKey !== 'Unknown'
      )
      
      console.log(`${availableTracks.length} tracks available for matching after filtering`)
      
      // If no tracks available, show empty suggestions
      if (availableTracks.length === 0) {
        setSuggestions([
          {
            type: 'down',
            title: 'Bring It Down',
            icon: <TrendingDown className="w-4 h-4" />,
            description: 'Lower energy, smoother vibes',
            tracks: []
          },
          {
            type: 'same',
            title: 'Keep The Vibe',
            icon: <Minus className="w-4 h-4" />,
            description: 'Similar energy and mood',
            tracks: []
          },
          {
            type: 'up',
            title: 'Pump It Up',
            icon: <TrendingUp className="w-4 h-4" />,
            description: 'Higher energy, build the crowd',
            tracks: []
          }
        ])
        return
      }

      // Calculate compatibility scores
      const scoredTracks = availableTracks.map(track => {
        const tempoCompatibility = 1 - Math.abs(track.tempo - currentTrack.bpm!) / currentTrack.bpm!
        const keyCompatibility = getKeyCompatibility(currentTrack.camelotKey!, track.camelotKey || '')
        const energyDiff = track.energy - (currentTrack.energy || 0.5)
        
        return {
          track,
          tempoScore: Math.max(0, tempoCompatibility),
          keyScore: keyCompatibility,
          energyDiff,
          totalScore: (tempoCompatibility * 0.4 + keyCompatibility * 0.6)
        }
      })

      // Sort by total score
      scoredTracks.sort((a, b) => b.totalScore - a.totalScore)

      // Categorize suggestions
      const categories: SuggestionCategory[] = [
        {
          type: 'down',
          title: 'Bring It Down',
          icon: <TrendingDown className="w-4 h-4" />,
          description: 'Lower energy, smoother vibes',
          tracks: scoredTracks
            .filter(s => s.energyDiff < -0.15 && s.totalScore > 0.5)
            .slice(0, 5)
            .map(s => s.track)
        },
        {
          type: 'same',
          title: 'Keep The Vibe',
          icon: <Minus className="w-4 h-4" />,
          description: 'Similar energy and mood',
          tracks: scoredTracks
            .filter(s => Math.abs(s.energyDiff) <= 0.15 && s.totalScore > 0.6)
            .slice(0, 5)
            .map(s => s.track)
        },
        {
          type: 'up',
          title: 'Pump It Up',
          icon: <TrendingUp className="w-4 h-4" />,
          description: 'Higher energy, build the crowd',
          tracks: scoredTracks
            .filter(s => s.energyDiff > 0.15 && s.totalScore > 0.5)
            .slice(0, 5)
            .map(s => s.track)
        }
      ]

      setSuggestions(categories)
      console.log('Suggestions generated:', categories.map(c => ({ type: c.type, count: c.tracks.length })))
    } catch (error) {
      console.error('Error generating suggestions:', error)
    } finally {
      setLoading(false)
    }
  }, [currentTrack])

  // Generate suggestions when current track changes
  useEffect(() => {
    if (currentTrack?.bpm && currentTrack?.camelotKey) {
      generateSuggestions()
    }
  }, [currentTrack, generateSuggestions])

  const selectedSuggestions = suggestions.find(s => s.type === selectedCategory)

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
          Smart Suggestions
          {currentTrack && (
            <span className="text-xs text-gray-400">
              for {currentTrack.name}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              generateSuggestions()
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
          {/* Category Tabs */}
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
              </button>
            ))}
          </div>

          {/* Track List */}
          {selectedSuggestions && (
            <div className="space-y-1">
              <p className="text-xs text-gray-400 mb-2">{selectedSuggestions.description}</p>
              
              {selectedSuggestions.tracks.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  <p>No suggestions available</p>
                  <p className="text-xs mt-1">Load more tracks to build your music library</p>
                </div>
              ) : (
                selectedSuggestions.tracks.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => {
                      // Pass the track with all its analyzed data
                      const enrichedTrack = {
                        ...track,
                        bpm: track.tempo,
                        audio_features: {
                          tempo: track.tempo,
                          energy: track.energy,
                          danceability: track.danceability,
                          valence: track.valence,
                          key: track.key,
                          mode: track.mode,
                          time_signature: track.time_signature,
                          loudness: track.loudness,
                          acousticness: track.acousticness,
                          instrumentalness: track.instrumentalness,
                          speechiness: track.speechiness
                        }
                      }
                      onTrackSelect(enrichedTrack, targetDeck)
                    }}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {track.name}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {track.artists.join(', ')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {/* Key */}
                        <div 
                          className="text-xs font-mono px-1 py-0.5 rounded"
                          style={{ 
                            backgroundColor: track.camelotKey ? `${getCamelotColor(track.camelotKey)}40` : 'transparent',
                            color: track.camelotKey ? getCamelotColor(track.camelotKey) : '#666'
                          }}
                        >
                          {track.camelotKey || '?'}
                        </div>
                        {/* BPM */}
                        <div className="text-xs font-mono text-gray-400">
                          {Math.round(track.tempo)}
                        </div>
                        {/* Compatibility */}
                        <div className="text-xs text-purple-400">
                          {Math.round(getKeyCompatibility(currentTrack.camelotKey!, track.camelotKey || '') * 100)}%
                        </div>
                      </div>
                    </div>
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

// Helper to get Camelot color (imported from harmonicMixing.ts)
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