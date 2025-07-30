// Production Crowd Response Prediction Model
// Predicts audience reaction and engagement based on audio features and context

import { SpectralFeatures } from './spectralAnalysis'
import { MoodFeatures } from './moodAnalysis'
import { VocalFeatures } from './vocalAnalysis'
import { GenreClassificationResult } from './genreClassification'

export interface CrowdContext {
  venue: {
    type: 'club' | 'festival' | 'warehouse' | 'bar' | 'concert_hall' | 'outdoor' | 'private'
    capacity: number
    atmosphere: 'intimate' | 'energetic' | 'underground' | 'mainstream' | 'experimental'
  }
  timeOfDay: {
    hour: number // 0-23
    dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
    isHoliday: boolean
  }
  audience: {
    estimatedSize: number
    energyLevel: number // 0-1 current energy
    engagement: number // 0-1 current engagement
    demographics: {
      primaryAgeGroup: '18-24' | '25-34' | '35-44' | '45+'
      musicPreference: 'mainstream' | 'underground' | 'mixed'
    }
  }
  setPosition: {
    phase: 'opening' | 'warmup' | 'peak' | 'cooldown' | 'closing'
    minutesPlayed: number
    minutesRemaining: number
  }
}

export interface CrowdResponse {
  predictedEngagement: number // 0-1
  predictedEnergy: number // 0-1
  danceability: number // 0-1
  singAlongPotential: number // 0-1
  crowdMovement: {
    type: 'sway' | 'bounce' | 'jump' | 'hands_up' | 'sing_along' | 'rest' | 'intense_dance'
    intensity: number // 0-1
    synchronization: number // 0-1 how unified the crowd movement is
  }
  emotionalResponse: {
    excitement: number // 0-1
    euphoria: number // 0-1
    relaxation: number // 0-1
    anticipation: number // 0-1
  }
  riskFactors: {
    energyDrop: number // 0-1 risk of losing crowd energy
    disengagement: number // 0-1 risk of crowd disengagement
    overStimulation: number // 0-1 risk of tiring the crowd
    moodMismatch: number // 0-1 risk of mood not matching crowd expectation
  }
  recommendations: {
    action: string
    confidence: number
    reasoning: string
  }[]
  peakMoments: {
    timestamp: number
    type: 'drop' | 'buildup' | 'breakdown' | 'vocal_hook' | 'surprise'
    expectedImpact: number // 0-1
  }[]
}

export class ProductionCrowdResponsePredictor {
  private readonly contextWeights = {
    venueType: 0.15,
    timeOfDay: 0.10,
    audienceEnergy: 0.20,
    setPosition: 0.15,
    audioFeatures: 0.40
  }

  private readonly venueProfiles = {
    club: {
      preferredEnergy: 0.8,
      preferredComplexity: 0.7,
      vocalTolerance: 0.6,
      experimentalTolerance: 0.4
    },
    festival: {
      preferredEnergy: 0.9,
      preferredComplexity: 0.5,
      vocalTolerance: 0.8,
      experimentalTolerance: 0.3
    },
    warehouse: {
      preferredEnergy: 0.85,
      preferredComplexity: 0.8,
      vocalTolerance: 0.3,
      experimentalTolerance: 0.7
    },
    bar: {
      preferredEnergy: 0.5,
      preferredComplexity: 0.3,
      vocalTolerance: 0.9,
      experimentalTolerance: 0.2
    },
    concert_hall: {
      preferredEnergy: 0.6,
      preferredComplexity: 0.6,
      vocalTolerance: 0.7,
      experimentalTolerance: 0.5
    },
    outdoor: {
      preferredEnergy: 0.8,
      preferredComplexity: 0.5,
      vocalTolerance: 0.7,
      experimentalTolerance: 0.4
    },
    private: {
      preferredEnergy: 0.6,
      preferredComplexity: 0.5,
      vocalTolerance: 0.8,
      experimentalTolerance: 0.3
    }
  }

  /**
   * Predict crowd response for a track given context
   */
  async predictCrowdResponse(
    spectralFeatures: SpectralFeatures,
    moodFeatures: MoodFeatures,
    vocalFeatures: VocalFeatures,
    genreAnalysis: GenreClassificationResult,
    context: CrowdContext,
    audioBuffer?: AudioBuffer,
    tempo: number = 128
  ): Promise<CrowdResponse> {
    // Extract audio characteristics
    const audioCharacteristics = this.extractAudioCharacteristics(
      spectralFeatures,
      moodFeatures,
      vocalFeatures,
      genreAnalysis,
      tempo
    )

    // Analyze context factors
    const contextFactors = this.analyzeContextFactors(context)

    // Predict base responses
    const baseEngagement = this.predictEngagement(audioCharacteristics, contextFactors)
    const baseEnergy = this.predictEnergy(audioCharacteristics, contextFactors)
    const danceability = this.predictDanceability(audioCharacteristics, contextFactors)
    const singAlong = this.predictSingAlongPotential(vocalFeatures, contextFactors)

    // Predict crowd movement
    const crowdMovement = this.predictCrowdMovement(
      audioCharacteristics,
      contextFactors,
      baseEnergy,
      danceability
    )

    // Predict emotional response
    const emotionalResponse = this.predictEmotionalResponse(
      audioCharacteristics,
      moodFeatures,
      contextFactors
    )

    // Assess risk factors
    const riskFactors = this.assessRiskFactors(
      audioCharacteristics,
      contextFactors,
      baseEngagement,
      baseEnergy
    )

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      audioCharacteristics,
      contextFactors,
      riskFactors
    )

    // Identify peak moments
    const peakMoments = audioBuffer ? 
      await this.identifyPeakMoments(audioBuffer, spectralFeatures, moodFeatures) :
      []

    return {
      predictedEngagement: baseEngagement,
      predictedEnergy: baseEnergy,
      danceability,
      singAlongPotential: singAlong,
      crowdMovement,
      emotionalResponse,
      riskFactors,
      recommendations,
      peakMoments
    }
  }

  private extractAudioCharacteristics(
    spectralFeatures: SpectralFeatures,
    moodFeatures: MoodFeatures,
    vocalFeatures: VocalFeatures,
    genreAnalysis: GenreClassificationResult,
    tempo: number = 128
  ) {
    // Calculate average energy across frequency bands
    const bassEnergy = spectralFeatures.spectralBandEnergy?.bass?.reduce((sum, val) => sum + val, 0) / 
      (spectralFeatures.spectralBandEnergy?.bass?.length || 1) || 0
    const midEnergy = spectralFeatures.spectralBandEnergy?.mid?.reduce((sum, val) => sum + val, 0) / 
      (spectralFeatures.spectralBandEnergy?.mid?.length || 1) || 0
    const highEnergy = spectralFeatures.spectralBandEnergy?.presence?.reduce((sum, val) => sum + val, 0) / 
      (spectralFeatures.spectralBandEnergy?.presence?.length || 1) || 0

    // Calculate rhythm characteristics
    const rhythmStrength = spectralFeatures.onsetStrength?.reduce((sum, val) => sum + val, 0) / 
      (spectralFeatures.onsetStrength?.length || 1) || 0
    const beatStrength = spectralFeatures.rhythmPatterns?.length > 0 ? 0.8 : 0.3

    return {
      energy: {
        bass: bassEnergy,
        mid: midEnergy,
        high: highEnergy,
        overall: (bassEnergy + midEnergy + highEnergy) / 3,
        variance: moodFeatures.energyCurve?.energyStdDev || 0.3
      },
      rhythm: {
        tempo,
        strength: rhythmStrength,
        beatStrength,
        complexity: this.calculateRhythmComplexity(spectralFeatures)
      },
      mood: {
        valence: moodFeatures.valence || 0.5,
        arousal: moodFeatures.arousal || 0.5,
        dominance: moodFeatures.dominance || 0.5,
        primary: moodFeatures.primaryMood
      },
      vocal: {
        presence: vocalFeatures.hasVocals ? vocalFeatures.vocalDensity : 0,
        type: vocalFeatures.vocalSegments?.length > 0 ? vocalFeatures.vocalSegments[0].vocalType : 'lead',
        intelligibility: vocalFeatures.vocalCharacteristics?.harmonicToNoiseRatio || 0
      },
      genre: {
        primary: genreAnalysis.primaryGenre,
        confidence: genreAnalysis.confidence,
        underground: genreAnalysis.culturalMarkers?.underground || 0.5
      }
    }
  }

  private analyzeContextFactors(context: CrowdContext) {
    const venueProfile = this.venueProfiles[context.venue.type]
    
    // Time-based energy expectations
    const hourEnergy = this.getHourEnergyExpectation(
      context.timeOfDay.hour,
      context.timeOfDay.dayOfWeek
    )

    // Set phase expectations
    const phaseEnergy = this.getPhaseEnergyExpectation(context.setPosition.phase)
    
    // Audience readiness
    const audienceReadiness = this.calculateAudienceReadiness(
      context.audience,
      context.setPosition
    )

    return {
      venue: venueProfile,
      timeExpectation: hourEnergy,
      phaseExpectation: phaseEnergy,
      audienceReadiness,
      crowdSize: context.audience.estimatedSize,
      currentEnergy: context.audience.energyLevel,
      currentEngagement: context.audience.engagement
    }
  }

  private predictEngagement(audioChar: any, contextFactors: any): number {
    // Base engagement from audio features
    let engagement = 0

    // Rhythm and beat matching
    engagement += audioChar.rhythm.strength * 0.25
    engagement += audioChar.rhythm.beatStrength * 0.20

    // Energy matching context
    const energyMatch = 1 - Math.abs(audioChar.energy.overall - contextFactors.phaseExpectation)
    engagement += energyMatch * 0.20

    // Mood alignment
    const moodScore = this.calculateMoodAlignment(audioChar.mood, contextFactors)
    engagement += moodScore * 0.15

    // Vocal engagement (context dependent)
    const vocalEngagement = audioChar.vocal.presence * contextFactors.venue.vocalTolerance
    engagement += vocalEngagement * 0.10

    // Audience readiness factor
    engagement *= (0.7 + contextFactors.audienceReadiness * 0.3)

    // Current engagement momentum
    const momentum = contextFactors.currentEngagement * 0.1
    engagement += momentum

    return Math.min(1, Math.max(0, engagement))
  }

  private predictEnergy(audioChar: any, contextFactors: any): number {
    let energy = 0

    // Bass energy is primary driver
    energy += audioChar.energy.bass * 0.35

    // Tempo contribution
    const tempoFactor = this.normalizeTempoEnergy(audioChar.rhythm.tempo)
    energy += tempoFactor * 0.25

    // High frequency excitement
    energy += audioChar.energy.high * 0.15

    // Rhythm strength
    energy += audioChar.rhythm.strength * 0.15

    // Context modulation
    const contextModulation = this.calculateEnergyModulation(contextFactors)
    energy *= contextModulation

    // Variance adds dynamics
    energy += audioChar.energy.variance * 0.1

    return Math.min(1, Math.max(0, energy))
  }

  private predictDanceability(audioChar: any, contextFactors: any): number {
    let danceability = 0

    // Strong beat is essential
    danceability += audioChar.rhythm.beatStrength * 0.35

    // Optimal tempo range (120-130 BPM)
    const tempoScore = this.calculateTempoDanceability(audioChar.rhythm.tempo)
    danceability += tempoScore * 0.25

    // Bass drives movement
    danceability += audioChar.energy.bass * 0.20

    // Not too complex
    const complexityPenalty = Math.max(0, 1 - audioChar.rhythm.complexity * 0.5)
    danceability *= complexityPenalty

    // Groove factor from mood
    if (audioChar.mood.arousal > 0.6) {
      danceability += 0.15
    }

    // Venue factor
    danceability *= contextFactors.venue.preferredEnergy

    return Math.min(1, Math.max(0, danceability))
  }

  private predictSingAlongPotential(vocalFeatures: VocalFeatures, contextFactors: any): number {
    if (!vocalFeatures.hasVocals) return 0

    let potential = 0

    // Vocal presence and clarity
    potential += vocalFeatures.vocalDensity * 0.3
    potential += (vocalFeatures.vocalCharacteristics?.harmonicToNoiseRatio || 0) * 0.3

    // Repetitive vocals (hooks)
    if (vocalFeatures.vocalSegments && vocalFeatures.vocalSegments.length > 0) {
      const repetitions = this.detectVocalRepetitions(vocalFeatures.vocalSegments)
      potential += Math.min(repetitions / 4, 1) * 0.2
    }

    // Lead vocal type is best for sing-along
    const mainVocalType = vocalFeatures.vocalSegments?.find(s => s.vocalType === 'lead')
    if (mainVocalType) {
      potential += 0.2
    }

    // Context acceptance
    potential *= contextFactors.venue.vocalTolerance

    return Math.min(1, Math.max(0, potential))
  }

  private predictCrowdMovement(
    audioChar: any,
    contextFactors: any,
    energy: number,
    danceability: number
  ) {
    // Determine movement type based on characteristics
    let movementType: CrowdResponse['crowdMovement']['type'] = 'sway'
    let intensity = 0.3
    let synchronization = 0.5

    if (energy > 0.8 && danceability > 0.7) {
      movementType = 'jump'
      intensity = energy
      synchronization = 0.8
    } else if (energy > 0.7 && audioChar.energy.bass > 0.7) {
      movementType = 'intense_dance'
      intensity = energy * 0.9
      synchronization = 0.7
    } else if (audioChar.vocal.presence > 0.7 && audioChar.vocal.intelligibility > 0.6) {
      movementType = 'sing_along'
      intensity = 0.6
      synchronization = 0.9
    } else if (energy > 0.5 && danceability > 0.6) {
      movementType = 'bounce'
      intensity = energy * 0.8
      synchronization = 0.7
    } else if (audioChar.mood.arousal > 0.7) {
      movementType = 'hands_up'
      intensity = audioChar.mood.arousal
      synchronization = 0.8
    } else if (energy < 0.3) {
      movementType = 'rest'
      intensity = 0.2
      synchronization = 0.3
    }

    // Adjust for context
    intensity *= contextFactors.audienceReadiness
    synchronization *= (contextFactors.crowdSize / 1000) // Larger crowds sync better

    return {
      type: movementType,
      intensity: Math.min(1, Math.max(0, intensity)),
      synchronization: Math.min(1, Math.max(0, synchronization))
    }
  }

  private predictEmotionalResponse(
    audioChar: any,
    moodFeatures: MoodFeatures,
    contextFactors: any
  ) {
    const emotions = {
      excitement: 0,
      euphoria: 0,
      relaxation: 0,
      anticipation: 0
    }

    // Excitement from energy and rhythm
    emotions.excitement = (audioChar.energy.overall * 0.4 + 
                          audioChar.rhythm.strength * 0.3 + 
                          audioChar.mood.arousal * 0.3)

    // Euphoria from mood and energy peaks
    if (moodFeatures.primaryMood === 'euphoric' || moodFeatures.primaryMood === 'uplifting') {
      emotions.euphoria = 0.8
    } else {
      emotions.euphoria = audioChar.mood.valence * audioChar.energy.overall * 0.7
    }

    // Relaxation inverse to energy
    emotions.relaxation = (1 - audioChar.energy.overall) * 0.5 + 
                         (1 - audioChar.mood.arousal) * 0.5

    // Anticipation from energy variance and build-ups
    emotions.anticipation = audioChar.energy.variance * 0.5 +
                           (moodFeatures.energyVariability || 0) * 0.5

    // Context modulation
    const crowdStateMultiplier = 0.7 + contextFactors.currentEngagement * 0.3
    Object.keys(emotions).forEach(key => {
      emotions[key as keyof typeof emotions] *= crowdStateMultiplier
      emotions[key as keyof typeof emotions] = Math.min(1, Math.max(0, emotions[key as keyof typeof emotions]))
    })

    return emotions
  }

  private assessRiskFactors(
    audioChar: any,
    contextFactors: any,
    engagement: number,
    energy: number
  ) {
    const risks = {
      energyDrop: 0,
      disengagement: 0,
      overStimulation: 0,
      moodMismatch: 0
    }

    // Energy drop risk
    const energyDelta = contextFactors.currentEnergy - energy
    if (energyDelta > 0.3) {
      risks.energyDrop = energyDelta
    }

    // Disengagement risk
    if (engagement < 0.4) {
      risks.disengagement = 1 - engagement
    }
    if (audioChar.rhythm.complexity > 0.8 && contextFactors.venue.preferredComplexity < 0.5) {
      risks.disengagement += 0.3
    }

    // Over-stimulation risk
    const sustainedHighEnergy = energy > 0.8 && contextFactors.currentEnergy > 0.8
    if (sustainedHighEnergy && contextFactors.setPosition.minutesPlayed > 45) {
      risks.overStimulation = 0.5 + (contextFactors.setPosition.minutesPlayed - 45) / 60
    }

    // Mood mismatch risk
    const expectedMood = this.getExpectedMood(contextFactors)
    const moodAlignment = this.calculateMoodAlignment(audioChar.mood, { expectedMood })
    risks.moodMismatch = 1 - moodAlignment

    // Normalize all risks to 0-1
    Object.keys(risks).forEach(key => {
      risks[key as keyof typeof risks] = Math.min(1, Math.max(0, risks[key as keyof typeof risks]))
    })

    return risks
  }

  private generateRecommendations(
    audioChar: any,
    contextFactors: any,
    riskFactors: any
  ): CrowdResponse['recommendations'] {
    const recommendations: CrowdResponse['recommendations'] = []

    // High energy drop risk
    if (riskFactors.energyDrop > 0.6) {
      recommendations.push({
        action: 'Consider a smoother energy transition or add a buildup before this track',
        confidence: riskFactors.energyDrop,
        reasoning: 'Large energy drop detected that might lose crowd momentum'
      })
    }

    // Disengagement risk
    if (riskFactors.disengagement > 0.7) {
      if (audioChar.rhythm.complexity > 0.8) {
        recommendations.push({
          action: 'Track may be too complex for this crowd - consider a simpler alternative',
          confidence: 0.8,
          reasoning: 'High rhythmic complexity detected for venue type'
        })
      } else {
        recommendations.push({
          action: 'Add effects or layer with another track to increase engagement',
          confidence: 0.7,
          reasoning: 'Low predicted engagement for current crowd state'
        })
      }
    }

    // Over-stimulation risk
    if (riskFactors.overStimulation > 0.6) {
      recommendations.push({
        action: 'Consider a breakdown or lower energy track to give the crowd a breather',
        confidence: riskFactors.overStimulation,
        reasoning: 'Crowd has been at high energy for extended period'
      })
    }

    // Positive recommendations
    if (audioChar.vocal.presence > 0.7 && contextFactors.venue.vocalTolerance > 0.7) {
      recommendations.push({
        action: 'Great vocal track for sing-along moment - consider using loop on the hook',
        confidence: 0.8,
        reasoning: 'Strong vocals detected that match venue preference'
      })
    }

    if (audioChar.energy.bass > 0.8 && contextFactors.phaseExpectation > 0.7) {
      recommendations.push({
        action: 'Perfect time for this bass-heavy track - maximize the drop impact',
        confidence: 0.9,
        reasoning: 'Strong bass energy aligns with crowd expectations'
      })
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence).slice(0, 3)
  }

  private async identifyPeakMoments(
    audioBuffer: AudioBuffer,
    spectralFeatures: SpectralFeatures,
    moodFeatures: MoodFeatures
  ): Promise<CrowdResponse['peakMoments']> {
    const peaks: CrowdResponse['peakMoments'] = []
    
    // Identify drops from energy curve
    if (moodFeatures.energyCurve) {
      const drops = this.findEnergyDrops(moodFeatures.energyCurve)
      drops.forEach(drop => {
        peaks.push({
          timestamp: drop.time,
          type: 'drop',
          expectedImpact: drop.intensity
        })
      })
    }

    // Identify buildups
    if (spectralFeatures.spectralCentroid) {
      const buildups = this.findBuildups(spectralFeatures.spectralCentroid, audioBuffer.duration)
      buildups.forEach(buildup => {
        peaks.push({
          timestamp: buildup.time,
          type: 'buildup',
          expectedImpact: buildup.intensity
        })
      })
    }

    // Identify vocal hooks
    if (moodFeatures.moodProgression) {
      const vocalHooks = this.findVocalHooks(moodFeatures.moodProgression)
      vocalHooks.forEach(hook => {
        peaks.push({
          timestamp: hook.time,
          type: 'vocal_hook',
          expectedImpact: hook.impact
        })
      })
    }

    return peaks.sort((a, b) => a.timestamp - b.timestamp)
  }

  // Helper methods

  private calculateRhythmComplexity(spectralFeatures: SpectralFeatures): number {
    if (!spectralFeatures.rhythmPatterns || spectralFeatures.rhythmPatterns.length === 0) {
      return 0.3 // Default moderate complexity
    }

    // Analyze rhythm pattern variation
    const patterns = spectralFeatures.rhythmPatterns
    let variation = 0
    
    // Calculate variation between consecutive patterns
    for (let i = 1; i < patterns.length; i++) {
      let diff = 0
      for (let j = 0; j < patterns[i].length && j < patterns[i-1].length; j++) {
        diff += Math.abs(patterns[i][j] - patterns[i-1][j])
      }
      variation += diff
    }
    
    const avgVariation = variation / (patterns.length - 1)
    const complexity = Math.min(avgVariation / 2, 1) // Normalize to 0-1
    
    return complexity
  }

  private getHourEnergyExpectation(hour: number, dayOfWeek: string): number {
    // Weekend peak hours
    if (['friday', 'saturday'].includes(dayOfWeek)) {
      if (hour >= 23 || hour <= 2) return 0.9
      if (hour >= 21 && hour <= 23) return 0.7
      if (hour >= 2 && hour <= 4) return 0.8
    }

    // Weekday patterns
    if (hour >= 22 && hour <= 24) return 0.6
    if (hour >= 0 && hour <= 2) return 0.7
    if (hour >= 20 && hour <= 22) return 0.5

    return 0.4
  }

  private getPhaseEnergyExpectation(phase: CrowdContext['setPosition']['phase']): number {
    const phaseEnergy = {
      opening: 0.3,
      warmup: 0.5,
      peak: 0.9,
      cooldown: 0.6,
      closing: 0.4
    }
    return phaseEnergy[phase]
  }

  private calculateAudienceReadiness(
    audience: CrowdContext['audience'],
    setPosition: CrowdContext['setPosition']
  ): number {
    let readiness = audience.engagement

    // Warm-up period boost
    if (setPosition.phase === 'warmup' && setPosition.minutesPlayed > 20) {
      readiness += 0.2
    }

    // Peak time maximum readiness
    if (setPosition.phase === 'peak') {
      readiness = Math.max(readiness, 0.8)
    }

    // Fatigue factor
    if (setPosition.minutesPlayed > 90) {
      readiness *= 0.8
    }

    return Math.min(1, Math.max(0, readiness))
  }

  private calculateMoodAlignment(mood: any, contextFactors: any): number {
    if (!contextFactors.expectedMood) return 0.5

    // Simple mood matching (in production, use more sophisticated comparison)
    let alignment = 0.5

    if (mood.valence > 0.6 && contextFactors.expectedMood === 'positive') {
      alignment = 0.8
    } else if (mood.arousal > 0.7 && contextFactors.expectedMood === 'energetic') {
      alignment = 0.9
    } else if (mood.valence < 0.4 && contextFactors.expectedMood === 'dark') {
      alignment = 0.85
    }

    return alignment
  }

  private normalizeTempoEnergy(tempo: number): number {
    // Peak energy around 128-130 BPM
    if (tempo >= 125 && tempo <= 132) return 1.0
    if (tempo >= 120 && tempo <= 135) return 0.9
    if (tempo >= 115 && tempo <= 140) return 0.8
    if (tempo >= 100 && tempo <= 115) return 0.6
    if (tempo >= 140 && tempo <= 150) return 0.7
    if (tempo < 100 || tempo > 150) return 0.4
    return 0.5
  }

  private calculateTempoDanceability(tempo: number): number {
    // Optimal dance tempos
    if (tempo >= 120 && tempo <= 130) return 1.0
    if (tempo >= 115 && tempo <= 135) return 0.9
    if (tempo >= 110 && tempo <= 140) return 0.8
    if (tempo >= 100 && tempo <= 110) return 0.6
    if (tempo >= 90 && tempo <= 100) return 0.5
    return 0.3
  }

  private calculateEnergyModulation(contextFactors: any): number {
    let modulation = 1.0

    // Current crowd state
    modulation *= (0.5 + contextFactors.currentEnergy * 0.5)

    // Venue preference
    modulation *= (0.7 + contextFactors.venue.preferredEnergy * 0.3)

    // Time expectation
    modulation *= (0.8 + contextFactors.timeExpectation * 0.2)

    return modulation
  }

  private detectVocalRepetitions(vocalSegments: any[]): number {
    // Count similar vocal segments (simplified)
    const segmentPatterns = new Map<string, number>()
    
    vocalSegments.forEach(segment => {
      const pattern = `${segment.type}_${Math.round(segment.duration)}`
      segmentPatterns.set(pattern, (segmentPatterns.get(pattern) || 0) + 1)
    })

    let maxRepetitions = 0
    segmentPatterns.forEach(count => {
      maxRepetitions = Math.max(maxRepetitions, count)
    })

    return maxRepetitions
  }

  private getExpectedMood(contextFactors: any): string {
    if (contextFactors.phaseExpectation > 0.8) return 'energetic'
    if (contextFactors.phaseExpectation < 0.4) return 'chill'
    if (contextFactors.venue.preferredEnergy > 0.7) return 'positive'
    if (contextFactors.venue.experimentalTolerance > 0.6) return 'dark'
    return 'neutral'
  }

  private findEnergyDrops(energyCurve: any): Array<{ time: number; intensity: number }> {
    const drops: Array<{ time: number; intensity: number }> = []
    
    if (!energyCurve.timestamps || !energyCurve.energy || energyCurve.timestamps.length < 2) return drops

    for (let i = 1; i < energyCurve.timestamps.length; i++) {
      const prevEnergy = energyCurve.energy[i - 1]
      const currEnergy = energyCurve.energy[i]
      
      // Significant energy increase (drop)
      if (currEnergy - prevEnergy > 0.3) {
        drops.push({
          time: energyCurve.timestamps[i],
          intensity: currEnergy
        })
      }
    }

    return drops
  }

  private findBuildups(spectralCentroid: number[], duration: number): Array<{ time: number; intensity: number }> {
    const buildups: Array<{ time: number; intensity: number }> = []
    const timePerFrame = duration / spectralCentroid.length

    // Look for sustained increases in spectral centroid
    for (let i = 10; i < spectralCentroid.length - 10; i++) {
      let increasingFrames = 0
      let totalIncrease = 0

      // Check next 10 frames
      for (let j = 0; j < 10; j++) {
        if (spectralCentroid[i + j] > spectralCentroid[i + j - 1]) {
          increasingFrames++
          totalIncrease += spectralCentroid[i + j] - spectralCentroid[i + j - 1]
        }
      }

      if (increasingFrames > 7 && totalIncrease > 500) {
        buildups.push({
          time: i * timePerFrame,
          intensity: Math.min(totalIncrease / 1000, 1)
        })
        i += 10 // Skip ahead to avoid duplicates
      }
    }

    return buildups
  }

  private findVocalHooks(moodProgression: any[]): Array<{ time: number; impact: number }> {
    const hooks: Array<{ time: number; impact: number }> = []
    
    // Look for euphoric or uplifting moments (often coincide with vocal hooks)
    moodProgression.forEach(segment => {
      if ((segment.mood === 'euphoric' || segment.mood === 'uplifting') && 
          segment.confidence > 0.7) {
        hooks.push({
          time: segment.startTime,
          impact: segment.confidence
        })
      }
    })

    return hooks
  }
}

// Export singleton instance
export const crowdResponsePredictor = new ProductionCrowdResponsePredictor()