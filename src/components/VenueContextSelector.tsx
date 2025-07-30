// Production Venue Context Selector Component
// Allows DJs to set venue type and event context for AI optimization

import React, { useState, useEffect } from 'react'
import { 
  MapPin, Calendar, Users, Clock, Music, 
  Home, Building, Coffee, PartyPopper, Heart,
  Briefcase, GraduationCap, ChevronDown, Settings,
  Star, Mic, Volume2, Wifi, Car, Plane, Wine
} from 'lucide-react'

export interface VenueProfile {
  id: string
  name: string
  type: VenueType
  capacity: number
  acoustics: 'excellent' | 'good' | 'average' | 'poor'
  soundSystem: SoundSystemProfile
  demographics: DemographicsProfile
  preferences: VenuePreferences
  location?: {
    city: string
    country: string
    timezone: string
  }
}

export interface EventContext {
  id: string
  type: EventType
  name?: string
  startTime: number
  expectedDuration: number
  expectedAttendance: number
  energyProfile: EnergyProfile
  musicPreferences: MusicPreferences
  specialRequirements?: string[]
}

type VenueType = 
  | 'nightclub' 
  | 'bar' 
  | 'lounge' 
  | 'restaurant' 
  | 'private_party' 
  | 'wedding' 
  | 'corporate' 
  | 'festival' 
  | 'concert_hall'
  | 'radio_show'
  | 'livestream'
  | 'home_studio'

type EventType =
  | 'regular_night'
  | 'special_event'
  | 'private_party'
  | 'wedding_ceremony'
  | 'wedding_reception'
  | 'corporate_event'
  | 'birthday_party'
  | 'graduation'
  | 'holiday_party'
  | 'charity_event'
  | 'product_launch'
  | 'album_release'
  | 'livestream'
  | 'podcast'
  | 'radio_show'

interface SoundSystemProfile {
  quality: 'professional' | 'semi_pro' | 'consumer' | 'basic'
  power: 'low' | 'medium' | 'high' | 'very_high'
  frequencyResponse: 'flat' | 'bass_heavy' | 'bright' | 'warm'
  roomTreatment: 'excellent' | 'good' | 'basic' | 'none'
}

interface DemographicsProfile {
  primaryAgeRange: { min: number, max: number }
  musicFamiliarity: 'expert' | 'enthusiast' | 'casual' | 'mixed'
  culturalBackground: 'local' | 'international' | 'mixed'
  socialStyle: 'dancing' | 'listening' | 'socializing' | 'mixed'
}

interface VenuePreferences {
  preferredGenres: { [genre: string]: number }
  energyTolerance: { min: number, max: number }
  volumeTolerance: { min: number, max: number }
  explicitContentPolicy: 'allowed' | 'restricted' | 'banned'
  transitionStyle: 'seamless' | 'noticeable' | 'dramatic' | 'mixed'
}

interface EnergyProfile {
  startingEnergy: number
  peakEnergy: number
  endingEnergy: number
  energyProgression: 'linear' | 'exponential' | 'plateau' | 'wave' | 'custom'
  peakTiming: number // percentage through event
}

interface MusicPreferences {
  primaryGenres: string[]
  avoidGenres: string[]
  eraPreferences: { [era: string]: number }
  languagePreferences: string[]
  explicitContent: boolean
  localMusic: boolean
}

interface VenueContextSelectorProps {
  currentVenue?: VenueProfile
  currentEvent?: EventContext
  onVenueChange: (venue: VenueProfile) => void
  onEventChange: (event: EventContext) => void
  savedVenues?: VenueProfile[]
  onSaveVenue?: (venue: VenueProfile) => void
  showAdvanced?: boolean
}

export const VenueContextSelector: React.FC<VenueContextSelectorProps> = ({
  currentVenue,
  currentEvent,
  onVenueChange,
  onEventChange,
  savedVenues = [],
  onSaveVenue,
  showAdvanced = false
}) => {
  const [activeTab, setActiveTab] = useState<'venue' | 'event' | 'saved'>('venue')
  const [isCreatingVenue, setIsCreatingVenue] = useState(false)
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [venueForm, setVenueForm] = useState<Partial<VenueProfile>>(currentVenue || {})
  const [eventForm, setEventForm] = useState<Partial<EventContext>>(currentEvent || {})

  // Venue type configurations
  const venueTypeConfigs = {
    nightclub: {
      icon: <PartyPopper className="h-4 w-4" />,
      label: 'Nightclub',
      defaults: {
        capacity: 300,
        acoustics: 'good' as const,
        soundSystem: {
          quality: 'professional' as const,
          power: 'high' as const,
          frequencyResponse: 'bass_heavy' as const,
          roomTreatment: 'good' as const
        },
        demographics: {
          primaryAgeRange: { min: 21, max: 35 },
          musicFamiliarity: 'enthusiast' as const,
          culturalBackground: 'mixed' as const,
          socialStyle: 'dancing' as const
        },
        preferences: {
          preferredGenres: { 'electronic': 0.4, 'house': 0.3, 'techno': 0.2, 'trance': 0.1 },
          energyTolerance: { min: 0.6, max: 1.0 },
          volumeTolerance: { min: 0.7, max: 1.0 },
          explicitContentPolicy: 'allowed' as const,
          transitionStyle: 'seamless' as const
        }
      }
    },
    bar: {
      icon: <Coffee className="h-4 w-4" />,
      label: 'Bar/Pub',
      defaults: {
        capacity: 80,
        acoustics: 'average' as const,
        soundSystem: {
          quality: 'semi_pro' as const,
          power: 'medium' as const,
          frequencyResponse: 'warm' as const,
          roomTreatment: 'basic' as const
        },
        demographics: {
          primaryAgeRange: { min: 25, max: 45 },
          musicFamiliarity: 'casual' as const,
          culturalBackground: 'local' as const,
          socialStyle: 'socializing' as const
        },
        preferences: {
          preferredGenres: { 'rock': 0.3, 'pop': 0.25, 'indie': 0.2, 'classic': 0.15, 'folk': 0.1 },
          energyTolerance: { min: 0.3, max: 0.8 },
          volumeTolerance: { min: 0.4, max: 0.8 },
          explicitContentPolicy: 'restricted' as const,
          transitionStyle: 'noticeable' as const
        }
      }
    },
    restaurant: {
      icon: <Coffee className="h-4 w-4" />,
      label: 'Restaurant',
      defaults: {
        capacity: 60,
        acoustics: 'good' as const,
        soundSystem: {
          quality: 'consumer' as const,
          power: 'low' as const,
          frequencyResponse: 'warm' as const,
          roomTreatment: 'good' as const
        },
        demographics: {
          primaryAgeRange: { min: 30, max: 60 },
          musicFamiliarity: 'casual' as const,
          culturalBackground: 'mixed' as const,
          socialStyle: 'listening' as const
        },
        preferences: {
          preferredGenres: { 'jazz': 0.3, 'acoustic': 0.25, 'soft_rock': 0.2, 'bossa_nova': 0.15, 'classical': 0.1 },
          energyTolerance: { min: 0.2, max: 0.6 },
          volumeTolerance: { min: 0.2, max: 0.6 },
          explicitContentPolicy: 'banned' as const,
          transitionStyle: 'seamless' as const
        }
      }
    },
    wedding: {
      icon: <Heart className="h-4 w-4" />,
      label: 'Wedding',
      defaults: {
        capacity: 150,
        acoustics: 'average' as const,
        soundSystem: {
          quality: 'semi_pro' as const,
          power: 'medium' as const,
          frequencyResponse: 'flat' as const,
          roomTreatment: 'basic' as const
        },
        demographics: {
          primaryAgeRange: { min: 20, max: 70 },
          musicFamiliarity: 'mixed' as const,
          culturalBackground: 'mixed' as const,
          socialStyle: 'mixed' as const
        },
        preferences: {
          preferredGenres: { 'pop': 0.3, 'classic_hits': 0.25, 'soul': 0.2, 'dance': 0.15, 'country': 0.1 },
          energyTolerance: { min: 0.3, max: 0.9 },
          volumeTolerance: { min: 0.4, max: 0.9 },
          explicitContentPolicy: 'banned' as const,
          transitionStyle: 'noticeable' as const
        }
      }
    },
    corporate: {
      icon: <Briefcase className="h-4 w-4" />,
      label: 'Corporate Event',
      defaults: {
        capacity: 200,
        acoustics: 'good' as const,
        soundSystem: {
          quality: 'professional' as const,
          power: 'medium' as const,
          frequencyResponse: 'flat' as const,
          roomTreatment: 'excellent' as const
        },
        demographics: {
          primaryAgeRange: { min: 25, max: 55 },
          musicFamiliarity: 'casual' as const,
          culturalBackground: 'mixed' as const,
          socialStyle: 'socializing' as const
        },
        preferences: {
          preferredGenres: { 'jazz': 0.3, 'soft_rock': 0.25, 'pop': 0.2, 'instrumental': 0.15, 'lounge': 0.1 },
          energyTolerance: { min: 0.2, max: 0.7 },
          volumeTolerance: { min: 0.3, max: 0.7 },
          explicitContentPolicy: 'banned' as const,
          transitionStyle: 'seamless' as const
        }
      }
    },
    lounge: {
      icon: <Wine className="h-4 w-4" />,
      label: 'Lounge',
      defaults: {
        capacity: 100,
        acoustics: 'good' as const,
        soundSystem: {
          quality: 'semi_pro' as const,
          power: 'medium' as const,
          frequencyResponse: 'warm' as const,
          roomTreatment: 'good' as const
        },
        demographics: {
          primaryAgeRange: { min: 25, max: 45 },
          musicFamiliarity: 'casual' as const,
          culturalBackground: 'mixed' as const,
          socialStyle: 'socializing' as const
        },
        preferences: {
          preferredGenres: { 'jazz': 0.3, 'soul': 0.3, 'ambient': 0.2, 'downtempo': 0.2 },
          energyTolerance: { min: 0.2, max: 0.6 },
          volumeTolerance: { min: 0.3, max: 0.6 },
          explicitContentPolicy: 'restricted' as const,
          transitionStyle: 'seamless' as const
        }
      }
    },
    livestream: {
      icon: <Wifi className="h-4 w-4" />,
      label: 'Live Stream',
      defaults: {
        capacity: 1000,
        acoustics: 'excellent' as const,
        soundSystem: {
          quality: 'professional' as const,
          power: 'high' as const,
          frequencyResponse: 'flat' as const,
          roomTreatment: 'excellent' as const
        },
        demographics: {
          primaryAgeRange: { min: 16, max: 45 },
          musicFamiliarity: 'enthusiast' as const,
          culturalBackground: 'international' as const,
          socialStyle: 'listening' as const
        },
        preferences: {
          preferredGenres: { 'electronic': 0.4, 'hip_hop': 0.2, 'pop': 0.2, 'house': 0.2 },
          energyTolerance: { min: 0.4, max: 1.0 },
          volumeTolerance: { min: 0.6, max: 1.0 },
          explicitContentPolicy: 'restricted' as const,
          transitionStyle: 'seamless' as const
        }
      }
    }
  }

  // Event type configurations
  const eventTypeConfigs = {
    regular_night: {
      icon: <Calendar className="h-4 w-4" />,
      label: 'Regular Night',
      energyProfile: {
        startingEnergy: 0.4,
        peakEnergy: 0.8,
        endingEnergy: 0.6,
        energyProgression: 'linear' as const,
        peakTiming: 0.7
      }
    },
    wedding_reception: {
      icon: <Heart className="h-4 w-4" />,
      label: 'Wedding Reception',
      energyProfile: {
        startingEnergy: 0.5,
        peakEnergy: 0.9,
        endingEnergy: 0.3,
        energyProgression: 'wave' as const,
        peakTiming: 0.6
      }
    },
    corporate_event: {
      icon: <Briefcase className="h-4 w-4" />,
      label: 'Corporate Event',
      energyProfile: {
        startingEnergy: 0.3,
        peakEnergy: 0.6,
        endingEnergy: 0.4,
        energyProgression: 'plateau' as const,
        peakTiming: 0.5
      }
    },
    birthday_party: {
      icon: <PartyPopper className="h-4 w-4" />,
      label: 'Birthday Party',
      energyProfile: {
        startingEnergy: 0.6,
        peakEnergy: 0.95,
        endingEnergy: 0.4,
        energyProgression: 'exponential' as const,
        peakTiming: 0.8
      }
    },
    livestream: {
      icon: <Wifi className="h-4 w-4" />,
      label: 'Live Stream',
      energyProfile: {
        startingEnergy: 0.7,
        peakEnergy: 0.9,
        endingEnergy: 0.8,
        energyProgression: 'wave' as const,
        peakTiming: 0.6
      }
    }
  }

  // Create new venue
  const createVenue = () => {
    if (!venueForm.type || !venueForm.name) return

    const config = venueTypeConfigs[venueForm.type as keyof typeof venueTypeConfigs]
    if (!config) return

    const newVenue: VenueProfile = {
      id: `venue_${Date.now()}`,
      name: venueForm.name,
      type: venueForm.type as VenueType,
      ...config.defaults,
      ...venueForm
    }

    onVenueChange(newVenue)
    if (onSaveVenue) {
      onSaveVenue(newVenue)
    }
    setIsCreatingVenue(false)
    setVenueForm({})
  }

  // Create new event
  const createEvent = () => {
    if (!eventForm.type || !eventForm.startTime) return

    const config = eventTypeConfigs[eventForm.type as keyof typeof eventTypeConfigs]
    if (!config) return

    const newEvent: EventContext = {
      id: `event_${Date.now()}`,
      type: eventForm.type as EventType,
      name: eventForm.name || config.label,
      startTime: eventForm.startTime,
      expectedDuration: eventForm.expectedDuration || 4 * 60 * 60 * 1000, // 4 hours default
      expectedAttendance: eventForm.expectedAttendance || currentVenue?.capacity || 100,
      energyProfile: config.energyProfile,
      musicPreferences: {
        primaryGenres: Object.keys(currentVenue?.preferences.preferredGenres || {}),
        avoidGenres: [],
        eraPreferences: { '2010s': 0.4, '2020s': 0.3, '2000s': 0.2, '90s': 0.1 },
        languagePreferences: ['English'],
        explicitContent: currentVenue?.preferences.explicitContentPolicy === 'allowed',
        localMusic: false
      },
      ...eventForm
    }

    onEventChange(newEvent)
    setIsCreatingEvent(false)
    setEventForm({})
  }

  // Render venue form
  const renderVenueForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Venue Name
        </label>
        <input
          type="text"
          value={venueForm.name || ''}
          onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          placeholder="Enter venue name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Venue Type
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(venueTypeConfigs).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setVenueForm({ ...venueForm, type: type as VenueType })}
              className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                venueForm.type === type
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              {config.icon}
              <span className="text-sm">{config.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Capacity
          </label>
          <input
            type="number"
            value={venueForm.capacity || ''}
            onChange={(e) => setVenueForm({ ...venueForm, capacity: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            placeholder="100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Acoustics
          </label>
          <select
            value={venueForm.acoustics || 'average'}
            onChange={(e) => setVenueForm({ ...venueForm, acoustics: e.target.value as any })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="average">Average</option>
            <option value="poor">Poor</option>
          </select>
        </div>
      </div>

      {showAdvanced && (
        <div className="space-y-4 p-4 bg-gray-900/50 rounded-lg border border-gray-600">
          <h4 className="font-medium text-white">Advanced Settings</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sound Quality
              </label>
              <select
                value={venueForm.soundSystem?.quality || 'semi_pro'}
                onChange={(e) => setVenueForm({
                  ...venueForm,
                  soundSystem: { 
                    quality: e.target.value as any,
                    power: venueForm.soundSystem?.power || 'medium',
                    frequencyResponse: venueForm.soundSystem?.frequencyResponse || 'flat',
                    roomTreatment: venueForm.soundSystem?.roomTreatment || 'basic'
                  }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="professional">Professional</option>
                <option value="semi_pro">Semi-Professional</option>
                <option value="consumer">Consumer</option>
                <option value="basic">Basic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Power Level
              </label>
              <select
                value={venueForm.soundSystem?.power || 'medium'}
                onChange={(e) => setVenueForm({
                  ...venueForm,
                  soundSystem: { 
                    quality: venueForm.soundSystem?.quality || 'semi_pro',
                    power: e.target.value as any,
                    frequencyResponse: venueForm.soundSystem?.frequencyResponse || 'flat',
                    roomTreatment: venueForm.soundSystem?.roomTreatment || 'basic'
                  }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="very_high">Very High</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={createVenue}
          disabled={!venueForm.name || !venueForm.type}
          className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Create Venue
        </button>
        <button
          onClick={() => setIsCreatingVenue(false)}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )

  // Render event form
  const renderEventForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Event Name (Optional)
        </label>
        <input
          type="text"
          value={eventForm.name || ''}
          onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          placeholder="Event name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Event Type
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(eventTypeConfigs).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setEventForm({ ...eventForm, type: type as EventType })}
              className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                eventForm.type === type
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              {config.icon}
              <span className="text-sm">{config.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Start Time
          </label>
          <input
            type="datetime-local"
            value={eventForm.startTime ? new Date(eventForm.startTime).toISOString().slice(0, 16) : ''}
            onChange={(e) => setEventForm({ ...eventForm, startTime: new Date(e.target.value).getTime() })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Duration (hours)
          </label>
          <input
            type="number"
            value={eventForm.expectedDuration ? eventForm.expectedDuration / (60 * 60 * 1000) : 4}
            onChange={(e) => setEventForm({ 
              ...eventForm, 
              expectedDuration: parseInt(e.target.value) * 60 * 60 * 1000 
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            placeholder="4"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Expected Attendance
        </label>
        <input
          type="number"
          value={eventForm.expectedAttendance || currentVenue?.capacity || 100}
          onChange={(e) => setEventForm({ ...eventForm, expectedAttendance: parseInt(e.target.value) })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          placeholder="100"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={createEvent}
          disabled={!eventForm.type || !eventForm.startTime}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Create Event
        </button>
        <button
          onClick={() => setIsCreatingEvent(false)}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Venue & Event Context</h3>
        </div>
        
        {/* Current context display */}
        <div className="mt-3 flex items-center gap-4 text-sm">
          {currentVenue && (
            <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full">
              {venueTypeConfigs[currentVenue.type as keyof typeof venueTypeConfigs]?.icon || <MapPin className="h-4 w-4" />}
              <span className="text-purple-200">{currentVenue.name}</span>
            </div>
          )}
          
          {currentEvent && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full">
              {eventTypeConfigs[currentEvent.type as keyof typeof eventTypeConfigs]?.icon || <Calendar className="h-4 w-4" />}
              <span className="text-blue-200">{currentEvent.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'venue', label: 'Venue', icon: Building },
          { id: 'event', label: 'Event', icon: Calendar },
          { id: 'saved', label: 'Saved', icon: Star }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'venue' && (
          <div className="space-y-4">
            {currentVenue && !isCreatingVenue ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">Current Venue</h4>
                  <button
                    onClick={() => setIsCreatingVenue(true)}
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    Change Venue
                  </button>
                </div>
                
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-600">
                  <div className="flex items-center gap-3 mb-3">
                    {venueTypeConfigs[currentVenue.type as keyof typeof venueTypeConfigs]?.icon || <MapPin className="h-4 w-4" />}
                    <div>
                      <h5 className="font-medium text-white">{currentVenue.name}</h5>
                      <p className="text-sm text-gray-400">{venueTypeConfigs[currentVenue.type as keyof typeof venueTypeConfigs]?.label || currentVenue.type}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Capacity:</span>
                      <span className="text-white ml-2">{currentVenue.capacity}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Acoustics:</span>
                      <span className="text-white ml-2 capitalize">{currentVenue.acoustics}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Sound System:</span>
                      <span className="text-white ml-2 capitalize">{currentVenue.soundSystem.quality}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Content Policy:</span>
                      <span className="text-white ml-2 capitalize">{currentVenue.preferences.explicitContentPolicy}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h4 className="font-medium text-white mb-4">
                  {isCreatingVenue ? 'Create New Venue' : 'Select or Create Venue'}
                </h4>
                {renderVenueForm()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'event' && (
          <div className="space-y-4">
            {currentEvent && !isCreatingEvent ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">Current Event</h4>
                  <button
                    onClick={() => setIsCreatingEvent(true)}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Change Event
                  </button>
                </div>
                
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-600">
                  <div className="flex items-center gap-3 mb-3">
                    {eventTypeConfigs[currentEvent.type as keyof typeof eventTypeConfigs]?.icon || <Calendar className="h-4 w-4" />}
                    <div>
                      <h5 className="font-medium text-white">{currentEvent.name}</h5>
                      <p className="text-sm text-gray-400">{eventTypeConfigs[currentEvent.type as keyof typeof eventTypeConfigs]?.label || currentEvent.type}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Start:</span>
                      <span className="text-white ml-2">
                        {new Date(currentEvent.startTime).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-white ml-2">
                        {currentEvent.expectedDuration / (60 * 60 * 1000)}h
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Attendance:</span>
                      <span className="text-white ml-2">{currentEvent.expectedAttendance}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Peak Energy:</span>
                      <span className="text-white ml-2">
                        {Math.round(currentEvent.energyProfile.peakEnergy * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h4 className="font-medium text-white mb-4">
                  {isCreatingEvent ? 'Create New Event' : 'Select or Create Event'}
                </h4>
                {renderEventForm()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">Saved Venues</h4>
            
            {savedVenues.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>No saved venues yet</p>
                <p className="text-xs mt-1">Create venues to save them for quick access</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedVenues.map(venue => (
                  <div
                    key={venue.id}
                    className="p-3 bg-gray-900/50 rounded-lg border border-gray-600 hover:border-gray-500 cursor-pointer transition-colors"
                    onClick={() => onVenueChange(venue)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {venueTypeConfigs[venue.type as keyof typeof venueTypeConfigs]?.icon || <MapPin className="h-4 w-4" />}
                        <div>
                          <h5 className="font-medium text-white">{venue.name}</h5>
                          <p className="text-sm text-gray-400">
                            {venueTypeConfigs[venue.type as keyof typeof venueTypeConfigs]?.label || venue.type} • {venue.capacity} capacity
                          </p>
                        </div>
                      </div>
                      
                      {currentVenue?.id === venue.id && (
                        <div className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                          Active
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}