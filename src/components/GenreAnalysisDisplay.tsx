// Genre Analysis Display Component - Shows comprehensive genre classification results
import React, { useMemo } from 'react'
import { 
  Music, TrendingUp, Globe, Clock, MapPin, 
  Star, Zap, Volume2, Radio, Target, Award
} from 'lucide-react'
import { GenreClassificationResult, GenreLabel } from '../lib/genreClassification'

interface GenreAnalysisDisplayProps {
  genreAnalysis: GenreClassificationResult
  className?: string
}

export const GenreAnalysisDisplay: React.FC<GenreAnalysisDisplayProps> = ({
  genreAnalysis,
  className = ''
}) => {
  const formatPercent = (value: number): string => `${Math.round(value * 100)}%`

  const genreColors: Record<string, string> = {
    house: 'text-purple-400 bg-purple-600/20',
    techno: 'text-orange-400 bg-orange-600/20',
    trance: 'text-blue-400 bg-blue-600/20',
    dubstep: 'text-green-400 bg-green-600/20',
    drum_and_bass: 'text-red-400 bg-red-600/20',
    ambient: 'text-cyan-400 bg-cyan-600/20',
    breakbeat: 'text-yellow-400 bg-yellow-600/20',
    default: 'text-gray-400 bg-gray-600/20'
  }

  const getGenreColor = (genre: GenreLabel): string => {
    return genreColors[genre] || genreColors.default
  }

  const regionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    uk: Globe,
    us: Star,
    germany: MapPin,
    netherlands: MapPin,
    global: Globe
  }

  const eraLabels: Record<string, string> = {
    '90s': '1990s',
    '2000s': '2000s',
    '2010s': '2010s',
    '2020s': '2020s',
    'contemporary': 'Current'
  }

  // Sort subgenre markers by strength
  const sortedSubgenres = useMemo(() => {
    return Object.entries(genreAnalysis.subgenreMarkers)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5) // Top 5 subgenre markers
  }, [genreAnalysis.subgenreMarkers])

  // Sort cross-genre elements by strength
  const sortedCrossGenre = useMemo(() => {
    return genreAnalysis.crossGenreElements
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 4) // Top 4 cross-genre elements
  }, [genreAnalysis.crossGenreElements])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Primary Genre Classification */}
      <div className="bg-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Music className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-semibold">Genre Classification</h3>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-400">
              {formatPercent(genreAnalysis.confidence)}
            </div>
            <div className="text-sm text-gray-400">Confidence</div>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-2xl font-bold ${getGenreColor(genreAnalysis.primaryGenre)}`}>
            <Music className="w-8 h-8" />
            <span className="capitalize">{genreAnalysis.primaryGenre.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Secondary Genres */}
        {genreAnalysis.secondaryGenres.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 text-gray-300">Secondary Genres</h4>
            <div className="flex flex-wrap gap-2">
              {genreAnalysis.secondaryGenres.map(({ genre, confidence }) => (
                <div
                  key={genre}
                  className={`px-3 py-1 rounded-full text-sm ${getGenreColor(genre)}`}
                >
                  <span className="capitalize">{genre.replace('_', ' ')}</span>
                  <span className="ml-1 opacity-75">({formatPercent(confidence)})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Subgenre Markers */}
      {sortedSubgenres.length > 0 && (
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-400" />
            <h4 className="font-medium">Subgenre Characteristics</h4>
          </div>

          <div className="space-y-3">
            {sortedSubgenres.map(([marker, strength]) => (
              <div key={marker} className="flex items-center gap-3">
                <div className="w-20 text-sm capitalize font-medium text-blue-400">
                  {marker}
                </div>
                <div className="flex-1 bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${strength * 100}%` }}
                  />
                </div>
                <div className="w-12 text-sm text-right font-mono text-blue-400">
                  {formatPercent(strength)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-Genre Elements */}
      {sortedCrossGenre.length > 0 && (
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h4 className="font-medium">Cross-Genre Elements</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedCrossGenre.map((element, index) => (
              <div
                key={index}
                className="p-3 bg-gray-600 rounded-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium capitalize ${getGenreColor(element.genre).split(' ')[0]}`}>
                    {element.genre.replace('_', ' ')}
                  </span>
                  <span className="text-yellow-400 font-mono text-sm">
                    {formatPercent(element.strength)}
                  </span>
                </div>
                <div className="text-xs text-gray-400 capitalize">
                  {element.element}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cultural Context */}
      <div className="bg-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-cyan-400" />
          <h4 className="font-medium">Cultural Context</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Era */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 bg-purple-600/20 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-purple-400" />
            </div>
            <div className="font-medium text-purple-400">
              {eraLabels[genreAnalysis.culturalMarkers.era]}
            </div>
            <div className="text-xs text-gray-400">Era</div>
          </div>

          {/* Region */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 bg-green-600/20 rounded-full flex items-center justify-center">
              {React.createElement(regionIcons[genreAnalysis.culturalMarkers.region] || Globe, {
                className: "w-8 h-8 text-green-400"
              })}
            </div>
            <div className="font-medium text-green-400 uppercase">
              {genreAnalysis.culturalMarkers.region}
            </div>
            <div className="text-xs text-gray-400">Region</div>
          </div>

          {/* Underground Score */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 bg-orange-600/20 rounded-full flex items-center justify-center">
              <Radio className="w-8 h-8 text-orange-400" />
            </div>
            <div className="font-medium text-orange-400">
              {formatPercent(genreAnalysis.culturalMarkers.underground)}
            </div>
            <div className="text-xs text-gray-400">Underground</div>
          </div>

          {/* Commercial Appeal */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 bg-blue-600/20 rounded-full flex items-center justify-center">
              <Award className="w-8 h-8 text-blue-400" />
            </div>
            <div className="font-medium text-blue-400">
              {formatPercent(genreAnalysis.culturalMarkers.commercial)}
            </div>
            <div className="text-xs text-gray-400">Commercial</div>
          </div>
        </div>
      </div>

      {/* Genre Evolution Timeline */}
      {genreAnalysis.genreEvolution.length > 1 && (
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <h4 className="font-medium">Genre Evolution</h4>
          </div>

          <div className="space-y-2">
            {genreAnalysis.genreEvolution.map((segment, index) => {
              const duration = segment.timeSegment.end - segment.timeSegment.start
              const formatTime = (seconds: number) => {
                const mins = Math.floor(seconds / 60)
                const secs = Math.floor(seconds % 60)
                return `${mins}:${secs.toString().padStart(2, '0')}`
              }

              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="text-xs text-gray-400 w-16">
                    {formatTime(segment.timeSegment.start)}
                  </div>
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getGenreColor(segment.genre)}`}
                    style={{ width: `${Math.max(20, (duration / genreAnalysis.genreEvolution[genreAnalysis.genreEvolution.length - 1].timeSegment.end) * 80)}%` }}
                  >
                    <span className="text-sm capitalize font-medium">
                      {segment.genre.replace('_', ' ')}
                    </span>
                    <span className="text-xs opacity-75">
                      {formatPercent(segment.confidence)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Genre Confidence Breakdown */}
      <div className="bg-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Volume2 className="w-5 h-5 text-green-400" />
          <h4 className="font-medium">Classification Confidence</h4>
        </div>

        <div className="space-y-4">
          {/* Primary Genre Confidence */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300">Primary Classification</span>
              <span className="text-purple-400 font-mono">
                {formatPercent(genreAnalysis.confidence)}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-3">
              <div
                className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${genreAnalysis.confidence * 100}%` }}
              />
            </div>
          </div>

          {/* Secondary Genres Confidence */}
          {genreAnalysis.secondaryGenres.slice(0, 3).map(({ genre, confidence }) => (
            <div key={genre}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 capitalize text-sm">
                  {genre.replace('_', ' ')}
                </span>
                <span className="text-gray-400 font-mono text-sm">
                  {formatPercent(confidence)}
                </span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div
                  className="bg-gray-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${confidence * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Classification Quality Indicator */}
        <div className="mt-4 p-3 bg-gray-600 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Classification Quality</span>
            <span className={`text-sm font-medium ${
              genreAnalysis.confidence > 0.8 ? 'text-green-400' :
              genreAnalysis.confidence > 0.6 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {genreAnalysis.confidence > 0.8 ? 'Excellent' :
               genreAnalysis.confidence > 0.6 ? 'Good' : 'Uncertain'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}