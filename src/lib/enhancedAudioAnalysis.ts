// Enhanced Audio Analysis integration layer
// Connects spectral analysis with track processing and database storage

import { supabase } from './supabase'
import { spectralAnalyzer, SpectralFeatures } from './spectralAnalysis'
import { moodAnalyzer, MoodFeatures } from './moodAnalysis'
import { vocalAnalyzer, VocalFeatures } from './vocalAnalysis'
import { genreClassifier, GenreClassificationResult } from './genreClassification'
import { productionDemucsProcessor } from './productionDemucs'
import { duplicateDetection } from './duplicateDetection'

export interface EnhancedAnalysisResult {
  trackId: string
  basicFeatures: {
    duration: number
    sampleRate: number
    channels: number
    bitrate: number
    format: string
  }
  spectralFeatures: SpectralFeatures
  moodFeatures: MoodFeatures
  vocalFeatures: VocalFeatures
  genreAnalysis: GenreClassificationResult
  audioFingerprint: {
    chromaprint: string
    mfcc: string
    spectralHash: string
    confidence: number
  }
  stemSeparation?: {
    available: boolean
    quality: 'high' | 'medium' | 'fast'
    stems: Array<{
      type: 'drums' | 'bass' | 'vocals' | 'other'
      url: string
      size: number
    }>
  }
  duplicateAnalysis: {
    processed: boolean
    matches: Array<{
      trackId: string
      similarity: number
      algorithm: string
    }>
  }
  processingMetadata: {
    analyzedAt: Date
    processingTime: number
    version: string
    config: any
  }
}

export interface AnalysisProgress {
  stage: 'uploading' | 'preprocessing' | 'spectral_analysis' | 'mood_analysis' | 'vocal_analysis' | 'genre_classification' | 'fingerprinting' | 'stem_separation' | 'duplicate_detection' | 'storing' | 'complete' | 'error'
  progress: number
  message: string
  error?: string
}

export interface AnalysisConfig {
  enableSpectralAnalysis: boolean
  enableMoodAnalysis: boolean
  enableVocalAnalysis: boolean
  enableGenreClassification: boolean
  enableStemSeparation: boolean
  enableDuplicateDetection: boolean
  spectralConfig?: {
    frameSize?: number
    hopSize?: number
    melBands?: number
    enableHarmonicPercussive?: boolean
  }
  moodConfig?: {
    enableEnergyAnalysis?: boolean
    enableEmotionalDimensions?: boolean
    enableGenreMarkers?: boolean
    energyResolution?: 'low' | 'medium' | 'high'
  }
  stemConfig?: {
    model?: 'htdemucs' | 'htdemucs_ft' | 'mdx_extra'
    quality?: 'high' | 'medium' | 'fast'
  }
  duplicateConfig?: {
    threshold?: number
    algorithms?: Array<'chromaprint' | 'mfcc' | 'spectral_hash'>
  }
}

export class EnhancedAudioAnalyzer {
  private readonly version = '1.0.0'
  private activeAnalysis = new Map<string, AbortController>()

  /**
   * Perform comprehensive audio analysis on uploaded track
   */
  async analyzeTrack(
    audioFile: File | ArrayBuffer,
    trackId: string,
    userId: string,
    config: AnalysisConfig,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<EnhancedAnalysisResult> {
    const startTime = Date.now()
    const abortController = new AbortController()
    this.activeAnalysis.set(trackId, abortController)

    try {
      // Convert File to ArrayBuffer if needed
      let audioArrayBuffer: ArrayBuffer
      if (audioFile instanceof File) {
        onProgress?.({
          stage: 'uploading',
          progress: 0,
          message: 'Reading audio file...'
        })
        audioArrayBuffer = await audioFile.arrayBuffer()
      } else {
        audioArrayBuffer = audioFile
      }

      // Decode audio for analysis
      onProgress?.({
        stage: 'preprocessing',
        progress: 10,
        message: 'Decoding audio data...'
      })

      const audioContext = new AudioContext({ sampleRate: 44100 })
      const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer.slice(0))

      // Extract basic audio features
      const basicFeatures = {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        bitrate: this.estimateBitrate(audioArrayBuffer, audioBuffer.duration),
        format: audioFile instanceof File ? this.getAudioFormat(audioFile.name) : 'unknown'
      }

      // Initialize result object
      const result: EnhancedAnalysisResult = {
        trackId,
        basicFeatures,
        spectralFeatures: {} as SpectralFeatures,
        moodFeatures: {} as MoodFeatures,
        vocalFeatures: {} as VocalFeatures,
        genreAnalysis: {} as GenreClassificationResult,
        audioFingerprint: {
          chromaprint: '',
          mfcc: '',
          spectralHash: '',
          confidence: 0
        },
        duplicateAnalysis: {
          processed: false,
          matches: []
        },
        processingMetadata: {
          analyzedAt: new Date(),
          processingTime: 0,
          version: this.version,
          config
        }
      }

      // Check for cancellation
      if (abortController.signal.aborted) {
        throw new Error('Analysis cancelled')
      }

      // Spectral Analysis
      if (config.enableSpectralAnalysis) {
        onProgress?.({
          stage: 'spectral_analysis',
          progress: 20,
          message: 'Performing spectral analysis...'
        })

        try {
          result.spectralFeatures = await spectralAnalyzer.analyzeSpectrum(audioBuffer)
          
          onProgress?.({
            stage: 'spectral_analysis',
            progress: 35,
            message: 'Spectral analysis complete'
          })
        } catch (error) {
          console.error('Spectral analysis failed:', error)
          // Continue with other analyses even if spectral analysis fails
        }
      }

      // Mood and Energy Analysis
      if (config.enableMoodAnalysis && result.spectralFeatures) {
        onProgress?.({
          stage: 'mood_analysis',
          progress: 40,
          message: 'Analyzing mood and energy patterns...'
        })

        try {
          result.moodFeatures = await moodAnalyzer.analyzeMoodAndEnergy(
            result.spectralFeatures,
            audioBuffer
          )
          
          onProgress?.({
            stage: 'mood_analysis',
            progress: 45,
            message: `Detected ${result.moodFeatures.primaryMood} mood with ${Math.round(result.moodFeatures.moodConfidence * 100)}% confidence`
          })
        } catch (error) {
          console.error('Mood analysis failed:', error)
          // Continue with other analyses even if mood analysis fails
        }
      }

      // Vocal Analysis
      if (config.enableVocalAnalysis) {
        onProgress?.({
          stage: 'vocal_analysis',
          progress: 50,
          message: 'Analyzing vocal content and characteristics...'
        })

        try {
          result.vocalFeatures = await vocalAnalyzer.analyzeVocals(audioBuffer)
          
          const vocalStatus = result.vocalFeatures.hasVocals ? 
            `Found vocals (${Math.round(result.vocalFeatures.vocalDensity * 100)}% coverage)` :
            'No vocals detected'
          
          onProgress?.({
            stage: 'vocal_analysis',
            progress: 55,
            message: vocalStatus
          })
        } catch (error) {
          console.error('Vocal analysis failed:', error)
          // Continue with other analyses even if vocal analysis fails
        }
      }

      // Genre Classification
      if (config.enableGenreClassification) {
        onProgress?.({
          stage: 'genre_classification',
          progress: 60,
          message: 'Classifying genre and style...'
        })

        try {
          result.genreAnalysis = await genreClassifier.classifyGenre(
            result.spectralFeatures,
            result.moodFeatures,
            result.vocalFeatures,
            audioBuffer
          )
          
          onProgress?.({
            stage: 'genre_classification',
            progress: 65,
            message: `Classified as ${result.genreAnalysis.primaryGenre} (${Math.round(result.genreAnalysis.confidence * 100)}% confidence)`
          })
        } catch (error) {
          console.error('Genre classification failed:', error)
          // Continue with other analyses even if genre classification fails
        }
      }

      // Audio Fingerprinting for Duplicate Detection
      if (config.enableDuplicateDetection) {
        onProgress?.({
          stage: 'fingerprinting',
          progress: 70,
          message: 'Generating audio fingerprints...'
        })

        try {
          const algorithms = config.duplicateConfig?.algorithms || ['chromaprint', 'spectral_hash']
          const fingerprints: any = {}

          for (const algorithm of algorithms) {
            const fingerprint = await duplicateDetection.generateFingerprint(
              audioArrayBuffer,
              trackId,
              algorithm
            )
            
            if (fingerprint) {
              fingerprints[algorithm] = fingerprint.fingerprint
              if (algorithm === 'chromaprint') {
                result.audioFingerprint.confidence = fingerprint.confidence
              }
            }
          }

          result.audioFingerprint = {
            chromaprint: fingerprints.chromaprint || '',
            mfcc: fingerprints.mfcc || '',
            spectralHash: fingerprints.spectral_hash || '',
            confidence: result.audioFingerprint.confidence
          }

          onProgress?.({
            stage: 'fingerprinting',
            progress: 75,
            message: 'Audio fingerprinting complete'
          })
        } catch (error) {
          console.error('Audio fingerprinting failed:', error)
        }
      }

      // Check for cancellation before expensive operations
      if (abortController.signal.aborted) {
        throw new Error('Analysis cancelled')
      }

      // Stem Separation (optional)
      if (config.enableStemSeparation) {
        onProgress?.({
          stage: 'stem_separation',
          progress: 80,
          message: 'Separating audio stems...'
        })

        try {
          const stemConfig = {
            model: config.stemConfig?.model || 'htdemucs',
            device: 'cpu' as const,
            shifts: config.stemConfig?.quality === 'high' ? 3 : 1,
            overlap: 0.25,
            splitSize: 256,
            jobs: 1,
            float32: true,
            int24: false
          }

          const stemResult = await productionDemucsProcessor.separateStems(
            audioArrayBuffer,
            trackId,
            stemConfig,
            (stemProgress) => {
              onProgress?.({
                stage: 'stem_separation',
                progress: 80 + (stemProgress.progress * 0.10), // 80-90%
                message: stemProgress.message
              })
            }
          )

          if (stemResult.success && stemResult.stems.length > 0) {
            result.stemSeparation = {
              available: true,
              quality: stemResult.quality,
              stems: stemResult.stems
                .filter(stem => stem.stemType !== 'full')
                .map(stem => ({
                  type: stem.stemType as 'drums' | 'bass' | 'vocals' | 'other',
                  url: stem.url || '',
                  size: 0 // Placeholder - would be calculated from actual file
                }))
            }
          }

          onProgress?.({
            stage: 'stem_separation',
            progress: 90,
            message: 'Stem separation complete'
          })
        } catch (error) {
          console.error('Stem separation failed:', error)
          result.stemSeparation = {
            available: false,
            quality: 'medium',
            stems: []
          }
        }
      }

      // Duplicate Detection
      if (config.enableDuplicateDetection && result.audioFingerprint.chromaprint) {
        onProgress?.({
          stage: 'duplicate_detection',
          progress: 92,
          message: 'Searching for duplicates...'
        })

        try {
          const threshold = config.duplicateConfig?.threshold || 0.85
          const matches = await duplicateDetection.findDuplicates(trackId, threshold, userId)

          result.duplicateAnalysis = {
            processed: true,
            matches: matches.map(match => ({
              trackId: match.trackB,
              similarity: match.similarity,
              algorithm: match.algorithm
            }))
          }

          onProgress?.({
            stage: 'duplicate_detection',
            progress: 95,
            message: `Found ${matches.length} potential duplicates`
          })
        } catch (error) {
          console.error('Duplicate detection failed:', error)
          result.duplicateAnalysis.processed = false
        }
      }

      // Store analysis results in database
      onProgress?.({
        stage: 'storing',
        progress: 97,
        message: 'Storing analysis results...'
      })

      await this.storeAnalysisResults(result, userId)

      // Update processing metadata
      result.processingMetadata.processingTime = Date.now() - startTime

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Analysis complete!'
      })

      // Clean up
      audioContext.close()
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: 'Analysis failed',
        error: errorMessage
      })

      throw new Error(`Enhanced audio analysis failed: ${errorMessage}`)
    } finally {
      this.activeAnalysis.delete(trackId)
    }
  }

  /**
   * Cancel ongoing analysis
   */
  cancelAnalysis(trackId: string): boolean {
    const controller = this.activeAnalysis.get(trackId)
    if (controller) {
      controller.abort()
      this.activeAnalysis.delete(trackId)
      return true
    }
    return false
  }

  /**
   * Get analysis results from database
   */
  async getAnalysisResults(trackId: string): Promise<EnhancedAnalysisResult | null> {
    try {
      const { data, error } = await supabase
        .from('enhanced_analysis')
        .select('*')
        .eq('track_id', trackId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No results found
        }
        throw error
      }

      return this.deserializeAnalysisResult(data)
    } catch (error) {
      console.error('Error fetching analysis results:', error)
      return null
    }
  }

  /**
   * Get tracks with similar spectral features
   */
  async findSimilarTracks(
    trackId: string,
    userId?: string,
    limit: number = 10
  ): Promise<Array<{
    trackId: string
    similarity: number
    features: string[]
  }>> {
    try {
      // Get the reference track's spectral features
      const referenceAnalysis = await this.getAnalysisResults(trackId)
      if (!referenceAnalysis || !referenceAnalysis.spectralFeatures) {
        return []
      }

      // Query for tracks with similar spectral characteristics
      let query = supabase
        .from('enhanced_analysis')
        .select('track_id, spectral_features, processed_tracks!inner(user_id, name, artist)')
        .neq('track_id', trackId)
        .limit(100) // Get more candidates for similarity comparison

      if (userId) {
        query = query.eq('processed_tracks.user_id', userId)
      }

      const { data, error } = await query

      if (error) throw error

      // Compute similarity scores
      const similarities: Array<{
        trackId: string
        similarity: number
        features: string[]
      }> = []

      const refFeatures = referenceAnalysis.spectralFeatures

      for (const candidate of data) {
        const candidateFeatures = candidate.spectral_features
        if (!candidateFeatures) continue

        const similarity = this.computeSpectralSimilarity(refFeatures, candidateFeatures)
        const similarFeatures = this.identifySimilarFeatures(refFeatures, candidateFeatures)

        if (similarity > 0.3) { // Threshold for similarity
          similarities.push({
            trackId: candidate.track_id,
            similarity,
            features: similarFeatures
          })
        }
      }

      // Sort by similarity and return top results
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)

    } catch (error) {
      console.error('Error finding similar tracks:', error)
      return []
    }
  }

  /**
   * Get spectral analysis statistics for user's library
   */
  async getLibraryStatistics(userId: string): Promise<{
    totalTracks: number
    averageEnergy: number
    genreDistribution: Record<string, number>
    tempoDistribution: Record<string, number>
    keyDistribution: Record<string, number>
  }> {
    try {
      const { data, error } = await supabase
        .from('enhanced_analysis')
        .select(`
          spectral_features,
          processed_tracks!inner(user_id, audio_features)
        `)
        .eq('processed_tracks.user_id', userId)

      if (error) throw error

      const stats = {
        totalTracks: data.length,
        averageEnergy: 0,
        genreDistribution: {} as Record<string, number>,
        tempoDistribution: {} as Record<string, number>,
        keyDistribution: {} as Record<string, number>
      }

      if (data.length === 0) return stats

      let totalEnergy = 0

      for (const track of data) {
        if (track.spectral_features?.statistics?.mean?.[0]) {
          totalEnergy += track.spectral_features.statistics.mean[0]
        }

        // Process audio features for distributions
        const audioFeatures = (track as any).audio_features
        if (audioFeatures) {
          // Tempo distribution
          const tempo = Math.round(audioFeatures.tempo / 10) * 10 // Group by 10 BPM ranges
          const tempoRange = `${tempo}-${tempo + 9}`
          stats.tempoDistribution[tempoRange] = (stats.tempoDistribution[tempoRange] || 0) + 1

          // Key distribution
          const key = this.getKeyName(audioFeatures.key)
          stats.keyDistribution[key] = (stats.keyDistribution[key] || 0) + 1
        }
      }

      stats.averageEnergy = totalEnergy / data.length

      return stats
    } catch (error) {
      console.error('Error computing library statistics:', error)
      return {
        totalTracks: 0,
        averageEnergy: 0,
        genreDistribution: {},
        tempoDistribution: {},
        keyDistribution: {}
      }
    }
  }

  // Private helper methods

  private async storeAnalysisResults(result: EnhancedAnalysisResult, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('enhanced_analysis')
        .upsert({
          track_id: result.trackId,
          user_id: userId,
          basic_features: result.basicFeatures,
          spectral_features: result.spectralFeatures,
          mood_features: result.moodFeatures,
          vocal_features: result.vocalFeatures,
          genre_analysis: result.genreAnalysis,
          audio_fingerprint: result.audioFingerprint,
          stem_separation: result.stemSeparation,
          duplicate_analysis: result.duplicateAnalysis,
          processing_metadata: result.processingMetadata,
          analyzed_at: result.processingMetadata.analyzedAt.toISOString(),
          version: result.processingMetadata.version
        })

      if (error) throw error
    } catch (error) {
      console.error('Error storing analysis results:', error)
      throw error
    }
  }

  private deserializeAnalysisResult(data: any): EnhancedAnalysisResult {
    return {
      trackId: data.track_id,
      basicFeatures: data.basic_features,
      spectralFeatures: data.spectral_features,
      moodFeatures: data.mood_features,
      vocalFeatures: data.vocal_features,
      genreAnalysis: data.genre_analysis,
      audioFingerprint: data.audio_fingerprint,
      stemSeparation: data.stem_separation,
      duplicateAnalysis: data.duplicate_analysis,
      processingMetadata: {
        ...data.processing_metadata,
        analyzedAt: new Date(data.analyzed_at)
      }
    }
  }

  private estimateBitrate(arrayBuffer: ArrayBuffer, duration: number): number {
    // Rough bitrate estimation
    const fileSizeKb = arrayBuffer.byteLength / 1024
    const durationMinutes = duration / 60
    return Math.round((fileSizeKb * 8) / durationMinutes) // kbps
  }

  private getAudioFormat(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase()
    const formatMap: Record<string, string> = {
      'mp3': 'MP3',
      'wav': 'WAV',
      'flac': 'FLAC',
      'm4a': 'M4A',
      'aac': 'AAC',
      'ogg': 'OGG',
      'opus': 'OPUS'
    }
    return formatMap[extension || ''] || 'Unknown'
  }

  private computeSpectralSimilarity(features1: SpectralFeatures, features2: SpectralFeatures): number {
    try {
      let totalSimilarity = 0
      let comparisons = 0

      // Compare spectral centroids
      if (features1.spectralCentroid && features2.spectralCentroid) {
        const centroidSim = this.computeArraySimilarity(features1.spectralCentroid, features2.spectralCentroid)
        totalSimilarity += centroidSim * 0.3
        comparisons += 0.3
      }

      // Compare MFCC features
      if (features1.mfcc && features2.mfcc) {
        const mfccSim = this.computeMatrixSimilarity(features1.mfcc, features2.mfcc)
        totalSimilarity += mfccSim * 0.4
        comparisons += 0.4
      }

      // Compare chroma vectors
      if (features1.chromaVector && features2.chromaVector) {
        const chromaSim = this.computeMatrixSimilarity(features1.chromaVector, features2.chromaVector)
        totalSimilarity += chromaSim * 0.3
        comparisons += 0.3
      }

      return comparisons > 0 ? totalSimilarity / comparisons : 0
    } catch (error) {
      console.error('Error computing spectral similarity:', error)
      return 0
    }
  }

  private computeArraySimilarity(arr1: number[], arr2: number[]): number {
    if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) return 0

    const minLength = Math.min(arr1.length, arr2.length)
    let similarity = 0

    for (let i = 0; i < minLength; i++) {
      const diff = Math.abs(arr1[i] - arr2[i])
      const maxVal = Math.max(Math.abs(arr1[i]), Math.abs(arr2[i]))
      similarity += maxVal > 0 ? 1 - (diff / maxVal) : 1
    }

    return similarity / minLength
  }

  private computeMatrixSimilarity(matrix1: number[][], matrix2: number[][]): number {
    if (!matrix1 || !matrix2 || matrix1.length === 0 || matrix2.length === 0) return 0

    const minFrames = Math.min(matrix1.length, matrix2.length)
    let totalSimilarity = 0

    for (let frame = 0; frame < minFrames; frame++) {
      totalSimilarity += this.computeArraySimilarity(matrix1[frame], matrix2[frame])
    }

    return totalSimilarity / minFrames
  }

  private identifySimilarFeatures(features1: SpectralFeatures, features2: SpectralFeatures): string[] {
    const similarFeatures: string[] = []

    // Check tempo similarity
    if (features1.statistics && features2.statistics) {
      const tempo1 = features1.statistics.mean[0] || 0
      const tempo2 = features2.statistics.mean[0] || 0
      if (Math.abs(tempo1 - tempo2) < 10) {
        similarFeatures.push('tempo')
      }
    }

    // Check energy distribution similarity
    if (features1.spectralBandEnergy && features2.spectralBandEnergy) {
      const bands = ['bass', 'mid', 'presence'] as const
      for (const band of bands) {
        const energy1 = features1.spectralBandEnergy[band]
        const energy2 = features2.spectralBandEnergy[band]
        if (energy1 && energy2) {
          const avgEnergy1 = energy1.reduce((sum, val) => sum + val, 0) / energy1.length
          const avgEnergy2 = energy2.reduce((sum, val) => sum + val, 0) / energy2.length
          if (Math.abs(avgEnergy1 - avgEnergy2) < 0.1) {
            similarFeatures.push(band)
          }
        }
      }
    }

    // Check harmonic content similarity
    if (features1.harmonicRatio && features2.harmonicRatio) {
      const avgHarmonic1 = features1.harmonicRatio.reduce((sum, val) => sum + val, 0) / features1.harmonicRatio.length
      const avgHarmonic2 = features2.harmonicRatio.reduce((sum, val) => sum + val, 0) / features2.harmonicRatio.length
      if (Math.abs(avgHarmonic1 - avgHarmonic2) < 0.15) {
        similarFeatures.push('harmonics')
      }
    }

    return similarFeatures
  }

  private getKeyName(keyNumber: number): string {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    return keys[keyNumber] || 'Unknown'
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Cancel all active analyses
    this.activeAnalysis.forEach(controller => {
      controller.abort()
    })
    this.activeAnalysis.clear()

    // Dispose of analyzer resources
    spectralAnalyzer.dispose()
  }
}

// Singleton instance for production use
export const enhancedAudioAnalyzer = new EnhancedAudioAnalyzer()