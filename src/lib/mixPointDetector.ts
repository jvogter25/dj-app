// Production Mix Point Detection Engine
// Identifies optimal transition points between tracks using audio analysis

import { SpectralFeatures } from './spectralAnalysis'
import { MoodFeatures, EnergyCurveData } from './moodAnalysis'
import { EnhancedAnalysisResult } from './enhancedAudioAnalysis'

export interface MixPoint {
  timestamp: number // Seconds into the track
  type: 'intro' | 'outro' | 'breakdown' | 'buildup' | 'drop' | 'vocal_break' | 'instrumental'
  confidence: number // 0-1
  energy: number // 0-1
  harmonicStability: number // 0-1
  rhythmicStability: number // 0-1
  transitionSuitability: number // 0-1 overall score
  characteristics: {
    hasKick: boolean
    hasBass: boolean
    hasVocals: boolean
    hasLead: boolean
    complexity: 'minimal' | 'moderate' | 'complex'
    mood: string
  }
}

export interface TransitionWindow {
  startTime: number
  endTime: number
  duration: number
  type: 'smooth' | 'energy_shift' | 'breakdown' | 'drop_swap' | 'harmonic'
  confidence: number
  compatibility: {
    harmonic: number
    rhythmic: number
    energy: number
    mood: number
    overall: number
  }
}

export interface MixPointAnalysis {
  trackId: string
  duration: number
  mixPoints: MixPoint[]
  optimalInPoints: MixPoint[]
  optimalOutPoints: MixPoint[]
  transitionWindows: TransitionWindow[]
  structure: {
    intro: { start: number; end: number; confidence: number } | null
    outro: { start: number; end: number; confidence: number } | null
    mainSection: { start: number; end: number } | null
    breakdowns: Array<{ start: number; end: number; intensity: number }>
    drops: Array<{ timestamp: number; impact: number }>
  }
}

export class ProductionMixPointDetector {
  private readonly sampleRate = 44100
  private readonly frameSize = 2048
  private readonly hopSize = 512
  
  // Detection thresholds
  private readonly thresholds = {
    energyDrop: 0.3,
    energyRise: 0.4,
    spectralChange: 0.5,
    rhythmicChange: 0.3,
    minSectionDuration: 8, // seconds
    transitionWindowDuration: 16 // bars at 128 BPM
  }

  /**
   * Analyze track for optimal mix points
   */
  async analyzeMixPoints(
    analysisResult: EnhancedAnalysisResult,
    audioBuffer?: AudioBuffer
  ): Promise<MixPointAnalysis> {
    const spectralFeatures = analysisResult.spectralFeatures
    const moodFeatures = analysisResult.moodFeatures
    
    // Detect track structure
    const structure = this.detectTrackStructure(spectralFeatures, moodFeatures)
    
    // Find all potential mix points
    const allMixPoints = this.detectAllMixPoints(spectralFeatures, moodFeatures, structure)
    
    // Filter for optimal entry/exit points
    const optimalInPoints = this.selectOptimalInPoints(allMixPoints, structure)
    const optimalOutPoints = this.selectOptimalOutPoints(allMixPoints, structure)
    
    // Identify transition windows
    const transitionWindows = this.identifyTransitionWindows(
      allMixPoints,
      spectralFeatures,
      moodFeatures
    )
    
    return {
      trackId: analysisResult.trackId,
      duration: analysisResult.basicFeatures.duration,
      mixPoints: allMixPoints,
      optimalInPoints,
      optimalOutPoints,
      transitionWindows,
      structure
    }
  }

  /**
   * Compare two tracks for transition compatibility
   */
  async compareTracksForTransition(
    trackA: MixPointAnalysis,
    trackB: MixPointAnalysis,
    outPointA: MixPoint,
    inPointB: MixPoint
  ): Promise<{
    compatibility: number
    transitionType: string
    duration: number
    techniques: string[]
    warnings: string[]
  }> {
    // Calculate compatibility scores
    const harmonicCompat = this.calculateHarmonicCompatibility(outPointA, inPointB)
    const rhythmicCompat = this.calculateRhythmicCompatibility(outPointA, inPointB)
    const energyCompat = this.calculateEnergyCompatibility(outPointA, inPointB)
    const moodCompat = this.calculateMoodCompatibility(outPointA, inPointB)
    
    const overallCompat = (
      harmonicCompat * 0.3 +
      rhythmicCompat * 0.3 +
      energyCompat * 0.25 +
      moodCompat * 0.15
    )
    
    // Determine transition type
    const transitionType = this.determineTransitionType(
      outPointA,
      inPointB,
      energyCompat,
      rhythmicCompat
    )
    
    // Calculate optimal duration
    const duration = this.calculateTransitionDuration(
      transitionType,
      overallCompat,
      outPointA,
      inPointB
    )
    
    // Suggest techniques
    const techniques = this.suggestTransitionTechniques(
      transitionType,
      outPointA,
      inPointB,
      overallCompat
    )
    
    // Identify warnings
    const warnings = this.identifyTransitionWarnings(
      outPointA,
      inPointB,
      harmonicCompat,
      rhythmicCompat,
      energyCompat
    )
    
    return {
      compatibility: overallCompat,
      transitionType,
      duration,
      techniques,
      warnings
    }
  }

  private detectTrackStructure(
    spectralFeatures: SpectralFeatures,
    moodFeatures: MoodFeatures
  ) {
    const duration = spectralFeatures.spectralCentroid?.length * this.hopSize / this.sampleRate || 0
    
    // Detect intro
    const intro = this.detectIntro(spectralFeatures, moodFeatures)
    
    // Detect outro
    const outro = this.detectOutro(spectralFeatures, moodFeatures, duration)
    
    // Find main section
    const mainSection = {
      start: intro?.end || 0,
      end: outro?.start || duration
    }
    
    // Detect breakdowns
    const breakdowns = this.detectBreakdowns(spectralFeatures, moodFeatures)
    
    // Detect drops
    const drops = this.detectDrops(spectralFeatures, moodFeatures)
    
    return {
      intro,
      outro,
      mainSection,
      breakdowns,
      drops
    }
  }

  private detectIntro(
    spectralFeatures: SpectralFeatures,
    moodFeatures: MoodFeatures
  ): { start: number; end: number; confidence: number } | null {
    if (!spectralFeatures.spectralCentroid || !moodFeatures.energyCurve) {
      return null
    }
    
    const spectralCentroid = spectralFeatures.spectralCentroid
    
    // Look for low energy start that builds up
    let introEnd = -1
    let confidence = 0
    
    // Check first 60 seconds
    const maxFrames = Math.min(
      Math.floor(60 * this.sampleRate / this.hopSize),
      spectralCentroid.length
    )
    
    let lowEnergyFrames = 0
    let energyIncreasing = 0
    
    for (let i = 0; i < maxFrames; i++) {
      const time = i * this.hopSize / this.sampleRate
      const energy = this.getEnergyAtTime(moodFeatures.energyCurve, time)
      
      if (energy < 0.4) {
        lowEnergyFrames++
      }
      
      if (i > 10 && energy > this.getEnergyAtTime(moodFeatures.energyCurve, (i - 10) * this.hopSize / this.sampleRate)) {
        energyIncreasing++
      }
      
      // Look for significant energy jump
      if (i > 20 && energy > 0.6 && lowEnergyFrames > 10) {
        introEnd = time
        confidence = Math.min(lowEnergyFrames / 20, 1) * 0.8
        break
      }
    }
    
    if (introEnd > 0) {
      return {
        start: 0,
        end: introEnd,
        confidence
      }
    }
    
    return null
  }

  private detectOutro(
    spectralFeatures: SpectralFeatures,
    moodFeatures: MoodFeatures,
    duration: number
  ): { start: number; end: number; confidence: number } | null {
    if (!spectralFeatures.spectralCentroid || !moodFeatures.energyCurve) {
      return null
    }
    
    const spectralCentroid = spectralFeatures.spectralCentroid
    
    // Look for energy decrease at end
    const startFrame = Math.max(0, spectralCentroid.length - Math.floor(60 * this.sampleRate / this.hopSize))
    
    let outroStart = -1
    let confidence = 0
    let energyDecreasing = 0
    
    for (let i = startFrame; i < spectralCentroid.length - 10; i++) {
      const time = i * this.hopSize / this.sampleRate
      const energy = this.getEnergyAtTime(moodFeatures.energyCurve, time)
      const futureEnergy = this.getEnergyAtTime(moodFeatures.energyCurve, (i + 10) * this.hopSize / this.sampleRate)
      
      if (futureEnergy < energy * 0.7) {
        energyDecreasing++
        
        if (outroStart < 0 && energy < 0.5) {
          outroStart = time
          confidence = 0.7
        }
      }
    }
    
    if (outroStart > 0 && energyDecreasing > 5) {
      return {
        start: outroStart,
        end: duration,
        confidence: Math.min(confidence + energyDecreasing * 0.05, 1)
      }
    }
    
    // Fallback: last 30 seconds if track is long enough
    if (duration > 90) {
      return {
        start: duration - 30,
        end: duration,
        confidence: 0.5
      }
    }
    
    return null
  }

  private detectBreakdowns(
    spectralFeatures: SpectralFeatures,
    moodFeatures: MoodFeatures
  ): Array<{ start: number; end: number; intensity: number }> {
    const breakdowns: Array<{ start: number; end: number; intensity: number }> = []
    
    if (!spectralFeatures.spectralBandEnergy || !moodFeatures.energyCurve) {
      return breakdowns
    }
    
    const bassEnergy = spectralFeatures.spectralBandEnergy.bass || []
    
    let inBreakdown = false
    let breakdownStart = 0
    let minEnergy = 1
    
    for (let i = 0; i < bassEnergy.length; i++) {
      const time = i * this.hopSize / this.sampleRate
      const bass = bassEnergy[i]
      const overallEnergy = this.getEnergyAtTime(moodFeatures.energyCurve, time)
      
      // Detect low bass energy sections
      if (!inBreakdown && bass < 0.3 && overallEnergy < 0.5) {
        inBreakdown = true
        breakdownStart = time
        minEnergy = overallEnergy
      } else if (inBreakdown && (bass > 0.5 || overallEnergy > 0.7)) {
        // End of breakdown
        const duration = time - breakdownStart
        if (duration > this.thresholds.minSectionDuration) {
          breakdowns.push({
            start: breakdownStart,
            end: time,
            intensity: 1 - minEnergy
          })
        }
        inBreakdown = false
      }
      
      if (inBreakdown) {
        minEnergy = Math.min(minEnergy, overallEnergy)
      }
    }
    
    return breakdowns
  }

  private detectDrops(
    spectralFeatures: SpectralFeatures,
    moodFeatures: MoodFeatures
  ): Array<{ timestamp: number; impact: number }> {
    const drops: Array<{ timestamp: number; impact: number }> = []
    
    if (!spectralFeatures.spectralBandEnergy || !moodFeatures.energyCurve) {
      return drops
    }
    
    const bassEnergy = spectralFeatures.spectralBandEnergy.bass || []
    
    for (let i = 10; i < bassEnergy.length - 10; i++) {
      const time = i * this.hopSize / this.sampleRate
      const currentBass = bassEnergy[i]
      const prevBass = bassEnergy[i - 10]
      const currentEnergy = this.getEnergyAtTime(moodFeatures.energyCurve, time)
      const prevEnergy = this.getEnergyAtTime(moodFeatures.energyCurve, (i - 10) * this.hopSize / this.sampleRate)
      
      // Detect significant energy increase
      if (currentBass > prevBass * 1.5 && 
          currentEnergy > prevEnergy * 1.3 &&
          currentBass > 0.6) {
        
        const impact = Math.min(
          (currentBass / prevBass) * (currentEnergy / prevEnergy) / 2,
          1
        )
        
        // Avoid duplicate drops
        const lastDrop = drops[drops.length - 1]
        if (!lastDrop || time - lastDrop.timestamp > 8) {
          drops.push({ timestamp: time, impact })
        }
      }
    }
    
    return drops
  }

  private detectAllMixPoints(
    spectralFeatures: SpectralFeatures,
    moodFeatures: MoodFeatures,
    structure: any
  ): MixPoint[] {
    const mixPoints: MixPoint[] = []
    
    // Add structural points
    if (structure.intro) {
      mixPoints.push(this.createMixPoint(
        structure.intro.end,
        'intro',
        structure.intro.confidence,
        spectralFeatures,
        moodFeatures
      ))
    }
    
    if (structure.outro) {
      mixPoints.push(this.createMixPoint(
        structure.outro.start,
        'outro',
        structure.outro.confidence,
        spectralFeatures,
        moodFeatures
      ))
    }
    
    // Add breakdown points
    structure.breakdowns.forEach((breakdown: any) => {
      mixPoints.push(this.createMixPoint(
        breakdown.start,
        'breakdown',
        0.8,
        spectralFeatures,
        moodFeatures
      ))
      
      // Buildup after breakdown
      if (breakdown.end < structure.mainSection.end) {
        mixPoints.push(this.createMixPoint(
          breakdown.end - 8,
          'buildup',
          0.7,
          spectralFeatures,
          moodFeatures
        ))
      }
    })
    
    // Add drop points
    structure.drops.forEach((drop: any) => {
      mixPoints.push(this.createMixPoint(
        drop.timestamp,
        'drop',
        drop.impact,
        spectralFeatures,
        moodFeatures
      ))
    })
    
    // Detect instrumental sections
    const instrumentalSections = this.detectInstrumentalSections(
      spectralFeatures,
      moodFeatures,
      structure
    )
    instrumentalSections.forEach(section => {
      mixPoints.push(this.createMixPoint(
        section.start,
        'instrumental',
        section.confidence,
        spectralFeatures,
        moodFeatures
      ))
    })
    
    // Sort by timestamp
    return mixPoints.sort((a, b) => a.timestamp - b.timestamp)
  }

  private createMixPoint(
    timestamp: number,
    type: MixPoint['type'],
    confidence: number,
    spectralFeatures: SpectralFeatures,
    moodFeatures: MoodFeatures
  ): MixPoint {
    const frameIdx = Math.floor(timestamp * this.sampleRate / this.hopSize)
    
    // Extract characteristics at this point
    const characteristics = this.extractPointCharacteristics(
      frameIdx,
      spectralFeatures,
      moodFeatures
    )
    
    // Calculate suitability scores
    const energy = this.getEnergyAtTime(
      moodFeatures.energyCurve,
      timestamp
    )
    
    const harmonicStability = this.calculateHarmonicStabilityAtPoint(
      frameIdx,
      spectralFeatures
    )
    
    const rhythmicStability = this.calculateRhythmicStabilityAtPoint(
      frameIdx,
      spectralFeatures
    )
    
    const transitionSuitability = this.calculateTransitionSuitability(
      type,
      energy,
      harmonicStability,
      rhythmicStability,
      characteristics
    )
    
    return {
      timestamp,
      type,
      confidence,
      energy,
      harmonicStability,
      rhythmicStability,
      transitionSuitability,
      characteristics
    }
  }

  private extractPointCharacteristics(
    frameIdx: number,
    spectralFeatures: SpectralFeatures,
    moodFeatures: MoodFeatures
  ) {
    const bassEnergy = spectralFeatures.spectralBandEnergy?.bass?.[frameIdx] || 0
    const midEnergy = spectralFeatures.spectralBandEnergy?.mid?.[frameIdx] || 0
    const highEnergy = spectralFeatures.spectralBandEnergy?.presence?.[frameIdx] || 0
    
    const hasKick = bassEnergy > 0.6
    const hasBass = bassEnergy > 0.3
    const hasVocals = false // Would need vocal features at specific time
    const hasLead = midEnergy > 0.5 && highEnergy > 0.4
    
    const totalEnergy = bassEnergy + midEnergy + highEnergy
    const complexity: MixPoint['characteristics']['complexity'] = 
      totalEnergy > 2 ? 'complex' :
      totalEnergy > 1 ? 'moderate' : 'minimal'
    
    const mood = moodFeatures.primaryMood || 'neutral'
    
    return {
      hasKick,
      hasBass,
      hasVocals,
      hasLead,
      complexity,
      mood
    }
  }

  private calculateHarmonicStabilityAtPoint(
    frameIdx: number,
    spectralFeatures: SpectralFeatures
  ): number {
    if (!spectralFeatures.chromaVector || frameIdx >= spectralFeatures.chromaVector.length) {
      return 0.5
    }
    
    // Check harmonic stability in surrounding frames
    const windowSize = 10
    const startIdx = Math.max(0, frameIdx - windowSize)
    const endIdx = Math.min(spectralFeatures.chromaVector.length - 1, frameIdx + windowSize)
    
    let stability = 0
    const currentChroma = spectralFeatures.chromaVector[frameIdx]
    
    for (let i = startIdx; i <= endIdx; i++) {
      if (i !== frameIdx) {
        const similarity = this.chromaSimilarity(currentChroma, spectralFeatures.chromaVector[i])
        stability += similarity
      }
    }
    
    return stability / (endIdx - startIdx)
  }

  private calculateRhythmicStabilityAtPoint(
    frameIdx: number,
    spectralFeatures: SpectralFeatures
  ): number {
    if (!spectralFeatures.onsetStrength || frameIdx >= spectralFeatures.onsetStrength.length) {
      return 0.5
    }
    
    // Check rhythm consistency
    const windowSize = 20
    const startIdx = Math.max(0, frameIdx - windowSize)
    const endIdx = Math.min(spectralFeatures.onsetStrength.length - 1, frameIdx + windowSize)
    
    const onsets = spectralFeatures.onsetStrength.slice(startIdx, endIdx + 1)
    const mean = onsets.reduce((sum, val) => sum + val, 0) / onsets.length
    const variance = onsets.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / onsets.length
    
    // Lower variance = more stable
    return Math.max(0, 1 - Math.sqrt(variance))
  }

  private calculateTransitionSuitability(
    type: MixPoint['type'],
    energy: number,
    harmonicStability: number,
    rhythmicStability: number,
    characteristics: MixPoint['characteristics']
  ): number {
    let suitability = 0
    
    switch (type) {
      case 'intro':
        // Intros are great for mixing in
        suitability = 0.9 * harmonicStability + 0.1 * (1 - energy)
        break
        
      case 'outro':
        // Outros are great for mixing out
        suitability = 0.8 * harmonicStability + 0.2 * (1 - energy)
        break
        
      case 'breakdown':
        // Breakdowns good for creative transitions
        suitability = 0.6 * harmonicStability + 0.3 * (1 - energy) + 0.1 * rhythmicStability
        break
        
      case 'buildup':
        // Buildups need timing precision
        suitability = 0.5 * rhythmicStability + 0.3 * harmonicStability + 0.2 * energy
        break
        
      case 'drop':
        // Drops are risky but impactful
        suitability = 0.4 * rhythmicStability + 0.3 * energy + 0.3 * harmonicStability
        break
        
      case 'instrumental':
        // Instrumentals are versatile
        suitability = 0.4 * harmonicStability + 0.4 * rhythmicStability + 0.2 * (characteristics.complexity === 'complex' ? 0 : 1)
        break
        
      case 'vocal_break':
        // Vocal breaks need careful handling
        suitability = 0.5 * harmonicStability + 0.3 * rhythmicStability + 0.2 * (1 - energy)
        break
    }
    
    return Math.min(1, Math.max(0, suitability))
  }

  private selectOptimalInPoints(
    allPoints: MixPoint[],
    structure: any
  ): MixPoint[] {
    const inPoints: MixPoint[] = []
    
    // Intro is usually the best in point
    const introPoint = allPoints.find(p => p.type === 'intro')
    if (introPoint && introPoint.transitionSuitability > 0.7) {
      inPoints.push(introPoint)
    }
    
    // Instrumental sections are good
    const instrumentals = allPoints
      .filter(p => p.type === 'instrumental' && p.transitionSuitability > 0.6)
      .slice(0, 2)
    inPoints.push(...instrumentals)
    
    // First breakdown can work
    const firstBreakdown = allPoints.find(p => p.type === 'breakdown')
    if (firstBreakdown && firstBreakdown.transitionSuitability > 0.5) {
      inPoints.push(firstBreakdown)
    }
    
    // Sort by suitability
    return inPoints.sort((a, b) => b.transitionSuitability - a.transitionSuitability).slice(0, 3)
  }

  private selectOptimalOutPoints(
    allPoints: MixPoint[],
    structure: any
  ): MixPoint[] {
    const outPoints: MixPoint[] = []
    
    // Outro is usually the best out point
    const outroPoint = allPoints.find(p => p.type === 'outro')
    if (outroPoint && outroPoint.transitionSuitability > 0.7) {
      outPoints.push(outroPoint)
    }
    
    // Last breakdown before outro
    const breakdowns = allPoints
      .filter(p => p.type === 'breakdown')
      .sort((a, b) => b.timestamp - a.timestamp)
    
    if (breakdowns.length > 0 && breakdowns[0].transitionSuitability > 0.6) {
      outPoints.push(breakdowns[0])
    }
    
    // Instrumental sections
    const instrumentals = allPoints
      .filter(p => p.type === 'instrumental' && 
        (!structure.outro || p.timestamp < structure.outro.start))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 2)
    
    outPoints.push(...instrumentals)
    
    return outPoints.sort((a, b) => b.transitionSuitability - a.transitionSuitability).slice(0, 3)
  }

  private identifyTransitionWindows(
    mixPoints: MixPoint[],
    spectralFeatures: SpectralFeatures,
    moodFeatures: MoodFeatures
  ): TransitionWindow[] {
    const windows: TransitionWindow[] = []
    
    // Look for extended sections with stable characteristics
    for (let i = 0; i < mixPoints.length - 1; i++) {
      const startPoint = mixPoints[i]
      const endPoint = mixPoints[i + 1]
      const duration = endPoint.timestamp - startPoint.timestamp
      
      if (duration >= this.thresholds.transitionWindowDuration) {
        const window = this.analyzeTransitionWindow(
          startPoint,
          endPoint,
          spectralFeatures,
          moodFeatures
        )
        
        if (window.confidence > 0.5) {
          windows.push(window)
        }
      }
    }
    
    return windows
  }

  private analyzeTransitionWindow(
    startPoint: MixPoint,
    endPoint: MixPoint,
    spectralFeatures: SpectralFeatures,
    moodFeatures: MoodFeatures
  ): TransitionWindow {
    const duration = endPoint.timestamp - startPoint.timestamp
    
    // Determine window type
    let type: TransitionWindow['type'] = 'smooth'
    
    if (startPoint.type === 'breakdown' || endPoint.type === 'buildup') {
      type = 'breakdown'
    } else if (Math.abs(startPoint.energy - endPoint.energy) > 0.4) {
      type = 'energy_shift'
    } else if (startPoint.harmonicStability > 0.8 && endPoint.harmonicStability > 0.8) {
      type = 'harmonic'
    } else if (endPoint.type === 'drop') {
      type = 'drop_swap'
    }
    
    // Calculate compatibility scores
    const compatibility = {
      harmonic: (startPoint.harmonicStability + endPoint.harmonicStability) / 2,
      rhythmic: (startPoint.rhythmicStability + endPoint.rhythmicStability) / 2,
      energy: 1 - Math.abs(startPoint.energy - endPoint.energy),
      mood: 1, // Would need mood comparison
      overall: 0
    }
    
    compatibility.overall = (
      compatibility.harmonic * 0.3 +
      compatibility.rhythmic * 0.3 +
      compatibility.energy * 0.25 +
      compatibility.mood * 0.15
    )
    
    const confidence = compatibility.overall * 
      Math.min(duration / this.thresholds.transitionWindowDuration, 1)
    
    return {
      startTime: startPoint.timestamp,
      endTime: endPoint.timestamp,
      duration,
      type,
      confidence,
      compatibility
    }
  }

  private detectInstrumentalSections(
    spectralFeatures: SpectralFeatures,
    moodFeatures: MoodFeatures,
    structure: any
  ): Array<{ start: number; confidence: number }> {
    // Simplified - in production would use vocal detection
    const sections: Array<{ start: number; confidence: number }> = []
    
    // Look for sections with low mid/high energy but consistent rhythm
    if (spectralFeatures.spectralBandEnergy) {
      const midEnergy = spectralFeatures.spectralBandEnergy.mid || []
      const highEnergy = spectralFeatures.spectralBandEnergy.highMid || []
      
      for (let i = 0; i < midEnergy.length - 100; i += 50) {
        const avgMid = midEnergy.slice(i, i + 100).reduce((a, b) => a + b, 0) / 100
        const avgHigh = highEnergy.slice(i, i + 100).reduce((a, b) => a + b, 0) / 100
        
        if (avgMid < 0.3 && avgHigh < 0.3) {
          const time = i * this.hopSize / this.sampleRate
          
          // Check if not in breakdown
          const inBreakdown = structure.breakdowns.some((b: any) => 
            time >= b.start && time <= b.end
          )
          
          if (!inBreakdown) {
            sections.push({
              start: time,
              confidence: 0.7
            })
          }
        }
      }
    }
    
    return sections
  }

  // Helper methods

  private getEnergyAtTime(energyCurve: EnergyCurveData | undefined, time: number): number {
    if (!energyCurve || !energyCurve.timestamps || energyCurve.timestamps.length === 0) return 0.5
    
    // Find closest time point
    let closestIdx = 0
    let minDiff = Math.abs(energyCurve.timestamps[0] - time)
    
    for (let i = 1; i < energyCurve.timestamps.length; i++) {
      const diff = Math.abs(energyCurve.timestamps[i] - time)
      if (diff < minDiff) {
        minDiff = diff
        closestIdx = i
      }
    }
    
    return energyCurve.energy[closestIdx] || 0.5
  }

  private chromaSimilarity(chroma1: number[], chroma2: number[]): number {
    if (!chroma1 || !chroma2 || chroma1.length !== chroma2.length) return 0
    
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0
    
    for (let i = 0; i < chroma1.length; i++) {
      dotProduct += chroma1[i] * chroma2[i]
      norm1 += chroma1[i] * chroma1[i]
      norm2 += chroma2[i] * chroma2[i]
    }
    
    if (norm1 === 0 || norm2 === 0) return 0
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }

  private calculateHarmonicCompatibility(pointA: MixPoint, pointB: MixPoint): number {
    // Simplified - in production would use actual harmonic analysis
    return (pointA.harmonicStability + pointB.harmonicStability) / 2
  }

  private calculateRhythmicCompatibility(pointA: MixPoint, pointB: MixPoint): number {
    return (pointA.rhythmicStability + pointB.rhythmicStability) / 2
  }

  private calculateEnergyCompatibility(pointA: MixPoint, pointB: MixPoint): number {
    return 1 - Math.abs(pointA.energy - pointB.energy)
  }

  private calculateMoodCompatibility(pointA: MixPoint, pointB: MixPoint): number {
    return pointA.characteristics.mood === pointB.characteristics.mood ? 1 : 0.5
  }

  private determineTransitionType(
    outPoint: MixPoint,
    inPoint: MixPoint,
    energyCompat: number,
    rhythmicCompat: number
  ): string {
    if (outPoint.type === 'outro' && inPoint.type === 'intro') {
      return 'classic_blend'
    }
    
    if (outPoint.type === 'breakdown' || inPoint.type === 'breakdown') {
      return 'breakdown_swap'
    }
    
    if (energyCompat < 0.5) {
      return 'energy_cut'
    }
    
    if (rhythmicCompat > 0.8 && energyCompat > 0.7) {
      return 'smooth_blend'
    }
    
    if (outPoint.type === 'drop' || inPoint.type === 'drop') {
      return 'drop_mix'
    }
    
    return 'standard_transition'
  }

  private calculateTransitionDuration(
    type: string,
    compatibility: number,
    outPoint: MixPoint,
    inPoint: MixPoint
  ): number {
    const baseDuration = {
      classic_blend: 32,
      breakdown_swap: 16,
      energy_cut: 4,
      smooth_blend: 24,
      drop_mix: 8,
      standard_transition: 16
    }
    
    let duration = baseDuration[type as keyof typeof baseDuration] || 16
    
    // Adjust based on compatibility
    if (compatibility < 0.5) {
      duration *= 0.5 // Shorter transition for poor compatibility
    } else if (compatibility > 0.8) {
      duration *= 1.5 // Longer transition for great compatibility
    }
    
    return Math.round(duration)
  }

  private suggestTransitionTechniques(
    type: string,
    outPoint: MixPoint,
    inPoint: MixPoint,
    compatibility: number
  ): string[] {
    const techniques: string[] = []
    
    // Type-specific techniques
    switch (type) {
      case 'classic_blend':
        techniques.push('Gradual volume fade')
        techniques.push('Bass swap at halfway point')
        if (compatibility > 0.7) {
          techniques.push('Extended blend possible')
        }
        break
        
      case 'breakdown_swap':
        techniques.push('Cut during breakdown')
        techniques.push('Use reverb/delay for smoothing')
        techniques.push('Loop breakdown section')
        break
        
      case 'energy_cut':
        techniques.push('Quick cut on beat')
        techniques.push('Use effects to mask transition')
        techniques.push('Consider using scratch or spin-back')
        break
        
      case 'smooth_blend':
        techniques.push('Long EQ sweep')
        techniques.push('Gradual tempo adjustment if needed')
        techniques.push('Layer elements progressively')
        break
        
      case 'drop_mix':
        techniques.push('Align drops precisely')
        techniques.push('Quick bass swap')
        techniques.push('Use high-pass filter on outgoing')
        break
    }
    
    // General techniques based on characteristics
    if (!outPoint.characteristics.hasVocals && !inPoint.characteristics.hasVocals) {
      techniques.push('Full frequency blend possible')
    }
    
    if (outPoint.characteristics.complexity === 'minimal' && 
        inPoint.characteristics.complexity === 'minimal') {
      techniques.push('Clean mix with minimal EQ needed')
    }
    
    return techniques
  }

  private identifyTransitionWarnings(
    outPoint: MixPoint,
    inPoint: MixPoint,
    harmonicCompat: number,
    rhythmicCompat: number,
    energyCompat: number
  ): string[] {
    const warnings: string[] = []
    
    if (harmonicCompat < 0.3) {
      warnings.push('Key clash likely - use EQ aggressively')
    }
    
    if (rhythmicCompat < 0.4) {
      warnings.push('Rhythm mismatch - consider beat matching carefully')
    }
    
    if (energyCompat < 0.3) {
      warnings.push('Large energy gap - may lose crowd momentum')
    }
    
    if (outPoint.characteristics.hasVocals && inPoint.characteristics.hasVocals) {
      warnings.push('Vocal clash possible - use EQ to separate')
    }
    
    if (outPoint.type === 'drop' && inPoint.type === 'drop') {
      warnings.push('Double drop - timing is critical')
    }
    
    if (outPoint.characteristics.complexity === 'complex' && 
        inPoint.characteristics.complexity === 'complex') {
      warnings.push('Both tracks are busy - careful EQ needed')
    }
    
    return warnings
  }
}

// Export singleton instance
export const mixPointDetector = new ProductionMixPointDetector()