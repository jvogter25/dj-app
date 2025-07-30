// Production Time-Based and Geographic Preferences System
// Intelligent context adaptation based on time, location, and cultural factors

import { TrackAnalysis } from './trackDatabase'

// Time-based preference interfaces
interface TimePreference {
  id: string
  name: string
  timeRange: {
    startHour: number
    endHour: number
    days?: number[] // 0=Sunday, 1=Monday, etc.
  }
  preferences: {
    energyRange: { min: number, max: number }
    preferredGenres: { [genre: string]: number }
    tempoRange: { min: number, max: number }
    moodPreferences: { [mood: string]: number }
    transitionStyle: 'smooth' | 'energetic' | 'dramatic'
    volumePreference: number
  }
  culturalFactors?: {
    workingHours: boolean
    mealTimes: boolean
    socialPeakTimes: boolean
    religiousObservances: string[]
  }
}

// Geographic preference interfaces
interface GeographicPreference {
  id: string
  region: {
    country: string
    city?: string
    timezone: string
    coordinates?: { lat: number, lng: number }
  }
  culturalProfile: {
    primaryLanguages: string[]
    musicTraditions: string[]
    popularGenres: { [genre: string]: number }
    localArtists: string[]
    internationalOpenness: number // 0-1, how receptive to international music
  }
  timePatterns: {
    dinnerTime: { start: number, end: number }
    nightlife: { start: number, end: number }
    workingHours: { start: number, end: number }
    weekendPattern: 'friday_saturday' | 'saturday_sunday' | 'friday_sunday'
  }
  seasonalFactors?: {
    summer: { energyBoost: number, outdoorPreference: number }
    winter: { indoorPreference: number, cozinessPreference: number }
    holiday: { traditionalMusic: number, festiveMusic: number }
  }
}

// Combined context interface
interface TimeGeographicContext {
  currentTime: {
    timestamp: number
    hour: number
    dayOfWeek: number
    date: Date
    timezone: string
  }
  location: {
    country: string
    city: string
    timezone: string
    coordinates?: { lat: number, lng: number }
  }
  contextualFactors: {
    isWorkingHours: boolean
    isMealTime: boolean
    isNightlife: boolean
    isSocialPeakTime: boolean
    isWeekend: boolean
    isHoliday: boolean
    season: 'spring' | 'summer' | 'fall' | 'winter'
    weatherInfluence?: 'sunny' | 'rainy' | 'stormy' | 'snowy'
  }
}

class ProductionTimeGeographicPreferences {
  private timePreferences: Map<string, TimePreference> = new Map()
  private geographicPreferences: Map<string, GeographicPreference> = new Map()
  private userPreferences: Map<string, { timePrefs: string[], geoPrefs: string[] }> = new Map()
  
  constructor() {
    this.initializeDefaultPreferences()
  }
  
  // Initialize default time and geographic preferences
  private initializeDefaultPreferences(): void {
    // Time-based preferences
    const defaultTimePrefs: TimePreference[] = [
      {
        id: 'morning_warmup',
        name: 'Morning Warm-up',
        timeRange: { startHour: 6, endHour: 10 },
        preferences: {
          energyRange: { min: 0.2, max: 0.6 },
          preferredGenres: { 'chill': 0.4, 'acoustic': 0.3, 'soft_electronic': 0.2, 'jazz': 0.1 },
          tempoRange: { min: 80, max: 110 },
          moodPreferences: { 'peaceful': 0.4, 'uplifting': 0.3, 'contemplative': 0.3 },
          transitionStyle: 'smooth',
          volumePreference: 0.4
        },
        culturalFactors: {
          workingHours: true,
          mealTimes: false,
          socialPeakTimes: false,
          religiousObservances: []
        }
      },
      {
        id: 'lunch_break',
        name: 'Lunch Break',
        timeRange: { startHour: 11, endHour: 14 },
        preferences: {
          energyRange: { min: 0.4, max: 0.7 },
          preferredGenres: { 'pop': 0.3, 'indie': 0.25, 'soft_rock': 0.2, 'r&b': 0.15, 'folk': 0.1 },
          tempoRange: { min: 90, max: 125 },
          moodPreferences: { 'pleasant': 0.4, 'social': 0.3, 'energizing': 0.3 },
          transitionStyle: 'smooth',
          volumePreference: 0.5
        },
        culturalFactors: {
          workingHours: true,
          mealTimes: true,
          socialPeakTimes: false,
          religiousObservances: []
        }
      },
      {
        id: 'afternoon_focus',
        name: 'Afternoon Focus',
        timeRange: { startHour: 14, endHour: 17 },
        preferences: {
          energyRange: { min: 0.3, max: 0.6 },
          preferredGenres: { 'instrumental': 0.3, 'ambient': 0.25, 'minimal': 0.2, 'lo_fi': 0.15, 'post_rock': 0.1 },
          tempoRange: { min: 85, max: 115 },
          moodPreferences: { 'focused': 0.5, 'calm': 0.3, 'contemplative': 0.2 },
          transitionStyle: 'smooth',
          volumePreference: 0.4
        },
        culturalFactors: {
          workingHours: true,
          mealTimes: false,
          socialPeakTimes: false,
          religiousObservances: []
        }
      },
      {
        id: 'evening_social',
        name: 'Evening Social',
        timeRange: { startHour: 17, endHour: 22 },
        preferences: {
          energyRange: { min: 0.5, max: 0.8 },
          preferredGenres: { 'house': 0.25, 'pop': 0.2, 'dance': 0.2, 'funk': 0.15, 'disco': 0.1, 'soul': 0.1 },
          tempoRange: { min: 100, max: 130 },
          moodPreferences: { 'social': 0.4, 'upbeat': 0.3, 'groovy': 0.3 },
          transitionStyle: 'energetic',
          volumePreference: 0.6
        },
        culturalFactors: {
          workingHours: false,
          mealTimes: true,
          socialPeakTimes: true,
          religiousObservances: []
        }
      },
      {
        id: 'late_night_party',
        name: 'Late Night Party',
        timeRange: { startHour: 22, endHour: 4 },
        preferences: {
          energyRange: { min: 0.7, max: 1.0 },
          preferredGenres: { 'techno': 0.3, 'house': 0.25, 'electronic': 0.2, 'trance': 0.15, 'drum_and_bass': 0.1 },
          tempoRange: { min: 120, max: 140 },
          moodPreferences: { 'euphoric': 0.4, 'intense': 0.3, 'hypnotic': 0.3 },
          transitionStyle: 'dramatic',
          volumePreference: 0.8
        },
        culturalFactors: {
          workingHours: false,
          mealTimes: false,
          socialPeakTimes: true,
          religiousObservances: []
        }
      },
      {
        id: 'late_night_chill',
        name: 'Late Night Chill',
        timeRange: { startHour: 0, endHour: 6 },
        preferences: {
          energyRange: { min: 0.1, max: 0.5 },
          preferredGenres: { 'ambient': 0.3, 'downtempo': 0.25, 'chillout': 0.2, 'deep_house': 0.15, 'neo_soul': 0.1 },
          tempoRange: { min: 60, max: 100 },
          moodPreferences: { 'dreamy': 0.4, 'meditative': 0.3, 'intimate': 0.3 },
          transitionStyle: 'smooth',
          volumePreference: 0.3
        },
        culturalFactors: {
          workingHours: false,
          mealTimes: false,
          socialPeakTimes: false,
          religiousObservances: []
        }
      },
      {
        id: 'weekend_morning',
        name: 'Weekend Morning',
        timeRange: { startHour: 8, endHour: 12, days: [0, 6] },
        preferences: {
          energyRange: { min: 0.3, max: 0.7 },
          preferredGenres: { 'indie': 0.3, 'alternative': 0.25, 'soft_rock': 0.2, 'folk': 0.15, 'reggae': 0.1 },
          tempoRange: { min: 85, max: 120 },
          moodPreferences: { 'relaxed': 0.4, 'positive': 0.3, 'leisurely': 0.3 },
          transitionStyle: 'smooth',
          volumePreference: 0.5
        },
        culturalFactors: {
          workingHours: false,
          mealTimes: true,
          socialPeakTimes: false,
          religiousObservances: []
        }
      }
    ]
    
    defaultTimePrefs.forEach(pref => {
      this.timePreferences.set(pref.id, pref)
    })
    
    // Geographic preferences
    const defaultGeoPrefs: GeographicPreference[] = [
      {
        id: 'us_general',
        region: {
          country: 'US',
          timezone: 'America/New_York'
        },
        culturalProfile: {
          primaryLanguages: ['English'],
          musicTraditions: ['blues', 'jazz', 'country', 'rock', 'hip_hop'],
          popularGenres: { 'pop': 0.25, 'rock': 0.2, 'hip_hop': 0.15, 'country': 0.1, 'electronic': 0.1, 'r&b': 0.1, 'indie': 0.1 },
          localArtists: [],
          internationalOpenness: 0.7
        },
        timePatterns: {
          dinnerTime: { start: 17, end: 20 },
          nightlife: { start: 21, end: 2 },
          workingHours: { start: 9, end: 17 },
          weekendPattern: 'saturday_sunday'
        }
      },
      {
        id: 'uk_general',
        region: {
          country: 'UK',
          timezone: 'Europe/London'
        },
        culturalProfile: {
          primaryLanguages: ['English'],
          musicTraditions: ['rock', 'punk', 'electronic', 'drum_and_bass'],
          popularGenres: { 'rock': 0.25, 'pop': 0.2, 'electronic': 0.15, 'indie': 0.15, 'drum_and_bass': 0.1, 'house': 0.1, 'alternative': 0.05 },
          localArtists: [],
          internationalOpenness: 0.8
        },
        timePatterns: {
          dinnerTime: { start: 18, end: 21 },
          nightlife: { start: 20, end: 3 },
          workingHours: { start: 9, end: 17 },
          weekendPattern: 'friday_saturday'
        }
      },
      {
        id: 'germany_general',
        region: {
          country: 'DE',
          timezone: 'Europe/Berlin'
        },
        culturalProfile: {
          primaryLanguages: ['German', 'English'],
          musicTraditions: ['techno', 'krautrock', 'classical'],
          popularGenres: { 'techno': 0.3, 'house': 0.2, 'electronic': 0.15, 'pop': 0.15, 'rock': 0.1, 'classical': 0.05, 'ambient': 0.05 },
          localArtists: [],
          internationalOpenness: 0.9
        },
        timePatterns: {
          dinnerTime: { start: 18, end: 20 },
          nightlife: { start: 23, end: 6 },
          workingHours: { start: 8, end: 16 },
          weekendPattern: 'friday_saturday'
        }
      },
      {
        id: 'japan_general',
        region: {
          country: 'JP',
          timezone: 'Asia/Tokyo'
        },
        culturalProfile: {
          primaryLanguages: ['Japanese', 'English'],
          musicTraditions: ['j_pop', 'traditional', 'city_pop'],
          popularGenres: { 'j_pop': 0.3, 'electronic': 0.2, 'city_pop': 0.15, 'rock': 0.1, 'hip_hop': 0.1, 'ambient': 0.1, 'traditional': 0.05 },
          localArtists: [],
          internationalOpenness: 0.6
        },
        timePatterns: {
          dinnerTime: { start: 18, end: 21 },
          nightlife: { start: 20, end: 1 },
          workingHours: { start: 9, end: 18 },
          weekendPattern: 'saturday_sunday'
        }
      },
      {
        id: 'brazil_general',
        region: {
          country: 'BR',
          timezone: 'America/Sao_Paulo'
        },
        culturalProfile: {
          primaryLanguages: ['Portuguese', 'Spanish'],
          musicTraditions: ['samba', 'bossa_nova', 'funk_carioca', 'forró'],
          popularGenres: { 'brazilian': 0.25, 'latin': 0.2, 'pop': 0.15, 'electronic': 0.15, 'funk': 0.1, 'rock': 0.1, 'reggae': 0.05 },
          localArtists: [],
          internationalOpenness: 0.8
        },
        timePatterns: {
          dinnerTime: { start: 19, end: 22 },
          nightlife: { start: 22, end: 4 },
          workingHours: { start: 8, end: 17 },
          weekendPattern: 'friday_saturday'
        }
      }
    ]
    
    defaultGeoPrefs.forEach(pref => {
      this.geographicPreferences.set(pref.id, pref)
    })
  }
  
  // Get current time-geographic context
  getCurrentContext(location?: { country: string, city?: string, timezone?: string }): TimeGeographicContext {
    const now = new Date()
    const timezone = location?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    
    // Convert to local time if timezone is specified
    const localTime = location?.timezone ? 
      new Date(now.toLocaleString("en-US", { timeZone: location.timezone })) : 
      now
    
    const hour = localTime.getHours()
    const dayOfWeek = localTime.getDay()
    
    // Detect location if not provided
    const detectedLocation = location || this.detectLocation()
    
    // Ensure location has all required properties
    const safeLocation = {
      country: detectedLocation.country,
      city: detectedLocation.city || 'Unknown',
      timezone: detectedLocation.timezone || timezone
    }
    
    // Get geographic preference for location
    const geoPreference = this.getGeographicPreference(safeLocation.country)
    
    // Determine contextual factors
    const contextualFactors = {
      isWorkingHours: this.isWorkingHours(hour, dayOfWeek, geoPreference),
      isMealTime: this.isMealTime(hour, geoPreference),
      isNightlife: this.isNightlife(hour, geoPreference),
      isSocialPeakTime: this.isSocialPeakTime(hour, dayOfWeek),
      isWeekend: this.isWeekend(dayOfWeek, geoPreference),
      isHoliday: this.isHoliday(now),
      season: this.getSeason(now, safeLocation.country),
      weatherInfluence: undefined // Would integrate with weather API
    }
    
    return {
      currentTime: {
        timestamp: now.getTime(),
        hour,
        dayOfWeek,
        date: now,
        timezone
      },
      location: safeLocation,
      contextualFactors
    }
  }
  
  // Get contextually appropriate track recommendations
  getContextualRecommendations(
    availableTracks: TrackAnalysis[],
    context?: TimeGeographicContext
  ): Array<TrackAnalysis & { contextScore: number, reasons: string[] }> {
    const currentContext = context || this.getCurrentContext()
    
    // Get relevant time and geographic preferences
    const timePrefs = this.getActiveTimePreferences(currentContext)
    const geoPrefs = this.getGeographicPreference(currentContext.location.country)
    
    // Score each track based on context
    const scoredTracks = availableTracks.map(track => {
      const { score, reasons } = this.calculateContextualScore(track, timePrefs, geoPrefs, currentContext)
      
      return {
        ...track,
        contextScore: score,
        reasons
      }
    })
    
    // Sort by contextual score
    return scoredTracks.sort((a, b) => b.contextScore - a.contextScore)
  }
  
  // Calculate contextual score for a track
  private calculateContextualScore(
    track: TrackAnalysis,
    timePrefs: TimePreference[],
    geoPrefs: GeographicPreference | null,
    context: TimeGeographicContext
  ): { score: number, reasons: string[] } {
    let score = 0.5 // Base score
    const reasons: string[] = []
    
    // Time-based scoring
    timePrefs.forEach(timePref => {
      const timeWeight = 0.4 / timePrefs.length // Distribute time weight across active preferences
      
      // Energy appropriateness
      const trackEnergy = track.energy || 0.5
      if (trackEnergy >= timePref.preferences.energyRange.min && 
          trackEnergy <= timePref.preferences.energyRange.max) {
        score += timeWeight * 0.3
        reasons.push(`Good energy for ${timePref.name.toLowerCase()}`)
      }
      
      // Genre preference
      const trackGenre = track.genre?.toLowerCase() || 'unknown'
      const genreScore = timePref.preferences.preferredGenres[trackGenre] || 0
      if (genreScore > 0.1) {
        score += timeWeight * 0.3 * genreScore
        reasons.push(`${track.genre} fits ${timePref.name.toLowerCase()}`)
      }
      
      // Tempo appropriateness
      const trackTempo = track.tempo || 120
      if (trackTempo >= timePref.preferences.tempoRange.min && 
          trackTempo <= timePref.preferences.tempoRange.max) {
        score += timeWeight * 0.2
        reasons.push(`Tempo suits ${timePref.name.toLowerCase()}`)
      }
      
      // Mood matching
      const trackMood = this.inferMoodFromTrack(track)
      const moodScore = timePref.preferences.moodPreferences[trackMood] || 0
      if (moodScore > 0.1) {
        score += timeWeight * 0.2 * moodScore
        reasons.push(`${trackMood} mood matches time context`)
      }
    })
    
    // Geographic/cultural scoring
    if (geoPrefs) {
      const geoWeight = 0.3
      
      // Popular genre in region
      const trackGenre = track.genre?.toLowerCase() || 'unknown'
      const regionalPopularity = geoPrefs.culturalProfile.popularGenres[trackGenre] || 0
      if (regionalPopularity > 0.1) {
        score += geoWeight * 0.4 * regionalPopularity
        reasons.push(`Popular genre in ${geoPrefs.region.country}`)
      }
      
      // Language preference
      const trackLanguage = this.detectTrackLanguage(track)
      if (geoPrefs.culturalProfile.primaryLanguages.includes(trackLanguage)) {
        score += geoWeight * 0.2
        reasons.push(`Matches local language preferences`)
      }
      
      // International openness
      if (trackLanguage !== geoPrefs.culturalProfile.primaryLanguages[0]) {
        score += geoWeight * 0.2 * geoPrefs.culturalProfile.internationalOpenness
        if (geoPrefs.culturalProfile.internationalOpenness > 0.7) {
          reasons.push('Good fit for internationally diverse audience')
        }
      }
      
      // Traditional music bonus
      if (geoPrefs.culturalProfile.musicTraditions.includes(trackGenre)) {
        score += geoWeight * 0.2
        reasons.push(`Part of ${geoPrefs.region.country} musical tradition`)
      }
    }
    
    // Contextual factor adjustments
    const contextWeight = 0.3
    
    // Working hours adjustment
    if (context.contextualFactors.isWorkingHours) {
      const trackEnergy = track.energy || 0.5
      if (trackEnergy < 0.7) { // Prefer lower energy during work
        score += contextWeight * 0.2
        reasons.push('Appropriate energy for working hours')
      }
    }
    
    // Weekend adjustment
    if (context.contextualFactors.isWeekend) {
      const trackEnergy = track.energy || 0.5
      if (trackEnergy > 0.5) { // Allow higher energy on weekends
        score += contextWeight * 0.1
        reasons.push('Higher energy appropriate for weekend')
      }
    }
    
    // Nightlife adjustment
    if (context.contextualFactors.isNightlife) {
      const trackEnergy = track.energy || 0.5
      const trackTempo = track.tempo || 120
      if (trackEnergy > 0.6 && trackTempo > 110) {
        score += contextWeight * 0.3
        reasons.push('Perfect for nightlife energy')
      }
    }
    
    // Meal time adjustment
    if (context.contextualFactors.isMealTime) {
      const trackEnergy = track.energy || 0.5
      if (trackEnergy < 0.6 && track.instrumentalness && track.instrumentalness > 0.3) {
        score += contextWeight * 0.2
        reasons.push('Good background music for dining')
      }
    }
    
    // Holiday adjustment
    if (context.contextualFactors.isHoliday) {
      const trackGenre = track.genre?.toLowerCase() || 'unknown'
      if (trackGenre === 'holiday' || track.name?.toLowerCase().includes('christmas') || 
          track.name?.toLowerCase().includes('holiday')) {
        score += contextWeight * 0.4
        reasons.push('Perfect for holiday atmosphere')
      }
    }
    
    return {
      score: Math.max(0, Math.min(1, score)),
      reasons: reasons.slice(0, 3) // Limit to top 3 reasons
    }
  }
  
  // Get active time preferences for current context
  private getActiveTimePreferences(context: TimeGeographicContext): TimePreference[] {
    const activePrefs: TimePreference[] = []
    
    this.timePreferences.forEach(pref => {
      const isInTimeRange = this.isTimeInRange(
        context.currentTime.hour,
        context.currentTime.dayOfWeek,
        pref.timeRange
      )
      
      if (isInTimeRange) {
        activePrefs.push(pref)
      }
    })
    
    return activePrefs
  }
  
  // Check if current time is in preference range
  private isTimeInRange(hour: number, dayOfWeek: number, timeRange: TimePreference['timeRange']): boolean {
    // Check day restriction
    if (timeRange.days && !timeRange.days.includes(dayOfWeek)) {
      return false
    }
    
    // Handle overnight ranges (e.g., 22-4)
    if (timeRange.startHour > timeRange.endHour) {
      return hour >= timeRange.startHour || hour <= timeRange.endHour
    }
    
    return hour >= timeRange.startHour && hour <= timeRange.endHour
  }
  
  // Get geographic preference for country
  private getGeographicPreference(country: string): GeographicPreference | null {
    // Try exact match first
    let pref = Array.from(this.geographicPreferences.values())
      .find(p => p.region.country.toLowerCase() === country.toLowerCase())
    
    if (pref) return pref
    
    // Fallback to regional defaults
    const regionDefaults: { [key: string]: string } = {
      'US': 'us_general',
      'CA': 'us_general',
      'GB': 'uk_general',
      'UK': 'uk_general',
      'DE': 'germany_general',
      'AT': 'germany_general',
      'CH': 'germany_general',
      'JP': 'japan_general',
      'BR': 'brazil_general'
    }
    
    const defaultId = regionDefaults[country.toUpperCase()]
    return defaultId ? this.geographicPreferences.get(defaultId) || null : null
  }
  
  // Detect user location (simplified)
  private detectLocation(): { country: string, city: string, timezone: string } {
    // In production, this would use geolocation API or IP-based detection
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    // Simple timezone to country mapping
    const timezoneToCountry: { [key: string]: string } = {
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Chicago': 'US',
      'Europe/London': 'UK',
      'Europe/Berlin': 'DE',
      'Europe/Paris': 'FR',
      'Asia/Tokyo': 'JP',
      'America/Sao_Paulo': 'BR'
    }
    
    const country = timezoneToCountry[timezone] || 'US'
    
    return {
      country,
      city: 'Unknown',
      timezone
    }
  }
  
  // Contextual factor detection methods
  private isWorkingHours(hour: number, dayOfWeek: number, geoPrefs?: GeographicPreference | null): boolean {
    if (dayOfWeek === 0 || dayOfWeek === 6) return false // Weekend
    
    const workStart = geoPrefs?.timePatterns.workingHours.start || 9
    const workEnd = geoPrefs?.timePatterns.workingHours.end || 17
    
    return hour >= workStart && hour <= workEnd
  }
  
  private isMealTime(hour: number, geoPrefs?: GeographicPreference | null): boolean {
    const dinnerStart = geoPrefs?.timePatterns.dinnerTime.start || 17
    const dinnerEnd = geoPrefs?.timePatterns.dinnerTime.end || 20
    
    // Breakfast: 7-9, Lunch: 11-14, Dinner: varies by culture
    return (hour >= 7 && hour <= 9) || 
           (hour >= 11 && hour <= 14) || 
           (hour >= dinnerStart && hour <= dinnerEnd)
  }
  
  private isNightlife(hour: number, geoPrefs?: GeographicPreference | null): boolean {
    const nightStart = geoPrefs?.timePatterns.nightlife.start || 21
    const nightEnd = geoPrefs?.timePatterns.nightlife.end || 2
    
    if (nightStart > nightEnd) {
      return hour >= nightStart || hour <= nightEnd
    }
    
    return hour >= nightStart && hour <= nightEnd
  }
  
  private isSocialPeakTime(hour: number, dayOfWeek: number): boolean {
    // Weekday evening: 17-22, Weekend: 12-24
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return hour >= 12 && hour <= 24
    }
    
    return hour >= 17 && hour <= 22
  }
  
  private isWeekend(dayOfWeek: number, geoPrefs?: GeographicPreference | null): boolean {
    const pattern = geoPrefs?.timePatterns.weekendPattern || 'saturday_sunday'
    
    switch (pattern) {
      case 'friday_saturday':
        return dayOfWeek === 5 || dayOfWeek === 6
      case 'friday_sunday':
        return dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0
      case 'saturday_sunday':
      default:
        return dayOfWeek === 6 || dayOfWeek === 0
    }
  }
  
  private isHoliday(date: Date): boolean {
    // Simplified holiday detection - would integrate with holiday API
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    // Major holidays (simplified)
    const holidays = [
      { month: 12, day: 25 }, // Christmas
      { month: 1, day: 1 },   // New Year
      { month: 7, day: 4 },   // Independence Day (US)
      { month: 10, day: 31 }  // Halloween
    ]
    
    return holidays.some(holiday => holiday.month === month && holiday.day === day)
  }
  
  private getSeason(date: Date, country: string): 'spring' | 'summer' | 'fall' | 'winter' {
    const month = date.getMonth() + 1
    
    // Northern hemisphere default
    if (month >= 3 && month <= 5) return 'spring'
    if (month >= 6 && month <= 8) return 'summer'
    if (month >= 9 && month <= 11) return 'fall'
    return 'winter'
  }
  
  // Helper methods for track analysis
  private inferMoodFromTrack(track: TrackAnalysis): string {
    const energy = track.energy || 0.5
    const valence = track.valence || 0.5
    const danceability = track.danceability || 0.5
    
    if (energy > 0.7 && valence > 0.7) return 'euphoric'
    if (energy > 0.6 && danceability > 0.7) return 'groovy'
    if (energy < 0.4 && valence < 0.4) return 'melancholic'
    if (energy < 0.5 && valence > 0.6) return 'peaceful'
    if (energy > 0.6 && valence < 0.4) return 'intense'
    if (valence > 0.6) return 'upbeat'
    if (energy < 0.4) return 'calm'
    
    return 'pleasant'
  }
  
  private detectTrackLanguage(track: TrackAnalysis): string {
    // Simplified language detection - would use more sophisticated analysis
    const artistName = track.artists?.[0]?.toLowerCase() || ''
    const trackName = track.name?.toLowerCase() || ''
    
    // Very basic detection based on artist/track name patterns
    if (artistName.includes('mc') || trackName.includes('feat.')) return 'English'
    if (track.genre?.includes('j_pop') || track.genre?.includes('japanese')) return 'Japanese'
    if (track.genre?.includes('latin') || track.genre?.includes('spanish')) return 'Spanish'
    if (track.genre?.includes('brazilian') || track.genre?.includes('portuguese')) return 'Portuguese'
    
    return 'English' // Default assumption
  }
  
  // Public methods for customization
  addTimePreference(preference: TimePreference): void {
    this.timePreferences.set(preference.id, preference)
  }
  
  addGeographicPreference(preference: GeographicPreference): void {
    this.geographicPreferences.set(preference.id, preference)
  }
  
  setUserPreferences(userId: string, timePrefs: string[], geoPrefs: string[]): void {
    this.userPreferences.set(userId, { timePrefs, geoPrefs })
  }
  
  getUserContextualRecommendations(
    userId: string,
    availableTracks: TrackAnalysis[],
    context?: TimeGeographicContext
  ): Array<TrackAnalysis & { contextScore: number, reasons: string[] }> {
    const userPrefs = this.userPreferences.get(userId)
    if (!userPrefs) {
      return this.getContextualRecommendations(availableTracks, context)
    }
    
    // Apply user-specific preferences here
    // This would modify the scoring based on user's preferred time and geo settings
    return this.getContextualRecommendations(availableTracks, context)
  }
  
  // Get preference statistics
  getPreferenceStats(): {
    timePreferences: number
    geographicPreferences: number
    userPreferences: number
  } {
    return {
      timePreferences: this.timePreferences.size,
      geographicPreferences: this.geographicPreferences.size,
      userPreferences: this.userPreferences.size
    }
  }
}

// Export singleton instance
export const timeGeographicPreferences = new ProductionTimeGeographicPreferences()

// Export types
export type { TimePreference, GeographicPreference, TimeGeographicContext }