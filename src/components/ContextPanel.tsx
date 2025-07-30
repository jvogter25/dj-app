// Production Context Panel Component
// Allows DJs to set and view context-aware recommendations

import React, { useState } from 'react'
import { DJContext } from '../lib/contextAwareSystem'
import { 
  MapPin, Users, Clock, Music, Zap, 
  TrendingUp, ChevronDown, ChevronUp,
  Building, Calendar, Cloud, Settings
} from 'lucide-react'

interface ContextPanelProps {
  context: DJContext
  onUpdateContext: (updates: Partial<DJContext>) => void
  onSetVenue: (type: DJContext['venue']['type'], info?: any) => void
  onSetEvent: (type: NonNullable<DJContext['event']>['type'], duration: number, info?: any) => void
  energyRecommendation?: any
  genreRecommendations?: Map<string, number>
  specialMoments?: any[]
  hints?: string[]
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  context,
  onUpdateContext,
  onSetVenue,
  onSetEvent,
  energyRecommendation,
  genreRecommendations,
  specialMoments,
  hints
}) => {
  const [expanded, setExpanded] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'venue' | 'audience' | 'recommendations'>('overview')
  
  // Local state for editing
  const [venueType, setVenueType] = useState(context.venue.type)
  const [audienceSize, setAudienceSize] = useState(context.audience.size)
  const [audienceEnergy, setAudienceEnergy] = useState(context.audience.energy)
  
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  const getVenueIcon = (type: string) => {
    switch (type) {
      case 'club': return '🏢'
      case 'festival': return '🎪'
      case 'warehouse': return '🏭'
      case 'bar': return '🍺'
      case 'outdoor': return '🌳'
      default: return '📍'
    }
  }
  
  const getEnergyColor = (energy: number): string => {
    if (energy > 0.8) return 'text-red-400'
    if (energy > 0.6) return 'text-orange-400'
    if (energy > 0.4) return 'text-yellow-400'
    if (energy > 0.2) return 'text-green-400'
    return 'text-blue-400'
  }
  
  const handleSaveContext = () => {
    onSetVenue(venueType as DJContext['venue']['type'])
    onUpdateContext({
      audience: {
        ...context.audience,
        size: audienceSize,
        energy: audienceEnergy
      }
    })
    setEditMode(false)
  }
  
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Context & Environment</h3>
            <span className="text-sm text-gray-400">
              {context.venue.type} • {formatTime(context.time.current)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!editMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditMode(true)
                }}
                className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>
      </div>
      
      {expanded && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('venue')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'venue'
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Venue
            </button>
            <button
              onClick={() => setActiveTab('audience')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'audience'
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Audience
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'recommendations'
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              AI Hints
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <span className="text-xs text-gray-400">Time</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {formatTime(context.time.current)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {context.time.isWeekend ? 'Weekend' : 'Weekday'}
                    </div>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Building className="h-4 w-4 text-purple-400" />
                      <span className="text-xs text-gray-400">Venue</span>
                    </div>
                    <div className="text-lg font-bold text-white flex items-center gap-1">
                      <span>{getVenueIcon(context.venue.type)}</span>
                      <span className="capitalize">{context.venue.type}</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-green-400" />
                      <span className="text-xs text-gray-400">Crowd</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {context.audience.size}
                    </div>
                    <div className="text-xs text-gray-500">
                      {context.audience.demographics.experienceLevel}
                    </div>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      <span className="text-xs text-gray-400">Energy</span>
                    </div>
                    <div className={`text-lg font-bold ${getEnergyColor(context.audience.energy)}`}>
                      {Math.round(context.audience.energy * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {context.audience.mood.trajectory}
                    </div>
                  </div>
                </div>
                
                {/* Event Info */}
                {context.event && (
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Event</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <span className="ml-2 text-white capitalize">
                          {context.event.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Progress:</span>
                        <span className="ml-2 text-white">
                          {context.event.duration.elapsed}/{context.event.duration.scheduled} min
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all duration-500"
                        style={{
                          width: `${(context.event.duration.elapsed / context.event.duration.scheduled) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'venue' && (
              <div className="space-y-4">
                {editMode ? (
                  <>
                    {/* Venue Type Selection */}
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Venue Type
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {['club', 'festival', 'warehouse', 'bar', 'outdoor', 'private'].map(type => (
                          <button
                            key={type}
                            onClick={() => setVenueType(type as any)}
                            className={`p-3 rounded-lg border transition-colors ${
                              venueType === type
                                ? 'bg-purple-600 border-purple-500 text-white'
                                : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
                            }`}
                          >
                            <div className="text-2xl mb-1">{getVenueIcon(type)}</div>
                            <div className="text-sm capitalize">{type}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Save/Cancel */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveContext}
                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-300">Current Venue</h4>
                        <span className="text-2xl">{getVenueIcon(context.venue.type)}</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Type:</span>
                          <span className="text-white capitalize">{context.venue.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Sound System:</span>
                          <span className="text-white capitalize">{context.venue.soundSystem || 'Unknown'}</span>
                        </div>
                        {context.venue.capacity && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Capacity:</span>
                            <span className="text-white">{context.venue.capacity}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'audience' && (
              <div className="space-y-4">
                {editMode ? (
                  <>
                    {/* Audience Size */}
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Audience Size
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="5000"
                        step="10"
                        value={audienceSize}
                        onChange={(e) => setAudienceSize(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-center text-white font-bold mt-1">{audienceSize}</div>
                    </div>
                    
                    {/* Audience Energy */}
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Crowd Energy
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={audienceEnergy * 100}
                        onChange={(e) => setAudienceEnergy(parseInt(e.target.value) / 100)}
                        className="w-full"
                      />
                      <div className={`text-center font-bold mt-1 ${getEnergyColor(audienceEnergy)}`}>
                        {Math.round(audienceEnergy * 100)}%
                      </div>
                    </div>
                    
                    {/* Save/Cancel */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveContext}
                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Audience Profile</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Size:</span>
                          <span className="text-white">{context.audience.size} people</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Energy:</span>
                          <span className={getEnergyColor(context.audience.energy)}>
                            {Math.round(context.audience.energy * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Mood:</span>
                          <span className="text-white capitalize">{context.audience.mood.current}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Experience:</span>
                          <span className="text-white capitalize">{context.audience.demographics.experienceLevel}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Energy History */}
                    {context.audience.responseHistory.length > 0 && (
                      <div className="bg-gray-900/50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Energy Trend</h4>
                        <div className="h-16 flex items-end gap-1">
                          {context.audience.responseHistory.slice(-20).map((response, idx) => (
                            <div
                              key={idx}
                              className="flex-1 bg-purple-500 rounded-t"
                              style={{ height: `${response.energy * 100}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'recommendations' && (
              <div className="space-y-4">
                {/* Energy Recommendation */}
                {energyRecommendation && (
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Energy Strategy
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Current Target:</span>
                        <span className={`font-bold ${getEnergyColor(energyRecommendation.currentTarget)}`}>
                          {Math.round(energyRecommendation.currentTarget * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Next Target:</span>
                        <span className={`font-bold ${getEnergyColor(energyRecommendation.nextTarget)}`}>
                          {Math.round(energyRecommendation.nextTarget * 100)}%
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 mt-2">
                        {energyRecommendation.reasoning}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Genre Recommendations */}
                {genreRecommendations && genreRecommendations.size > 0 && (
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      Recommended Genres
                    </h4>
                    <div className="space-y-2">
                      {Array.from(genreRecommendations.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([genre, weight]) => (
                          <div key={genre} className="flex items-center justify-between">
                            <span className="text-sm text-gray-300 capitalize">{genre}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-500"
                                  style={{ width: `${weight * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-10 text-right">
                                {Math.round(weight * 100)}%
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                {/* Special Moments */}
                {specialMoments && specialMoments.length > 0 && (
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Upcoming Moments
                    </h4>
                    <div className="space-y-2">
                      {specialMoments.map((moment, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white capitalize">
                              {moment.type}
                            </span>
                            <span className="text-xs text-gray-400">
                              in {moment.timeFromNow} min
                            </span>
                          </div>
                          <span className="text-xs text-purple-400">
                            {Math.round(moment.confidence * 100)}% confidence
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Contextual Hints */}
                {hints && hints.length > 0 && (
                  <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                    <h4 className="text-sm font-medium text-blue-300 mb-2">AI Hints</h4>
                    <ul className="space-y-1">
                      {hints.map((hint, idx) => (
                        <li key={idx} className="text-sm text-blue-200 flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">•</span>
                          <span>{hint}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}