import { useState, useCallback, useRef } from 'react'
import { duplicateDetection, DuplicateMatch, DuplicateGroup, TrackFingerprint } from '../lib/duplicateDetection'

export interface UseDuplicateDetectionReturn {
  // Detection state
  isProcessing: boolean
  progress: number
  error: string | null
  
  // Results
  duplicates: DuplicateMatch[]
  groups: DuplicateGroup[]
  fingerprints: TrackFingerprint[]
  
  // Actions
  generateFingerprint: (
    audioFile: File | ArrayBuffer,
    trackId: string,
    algorithm?: 'chromaprint' | 'mfcc' | 'spectral_hash'
  ) => Promise<TrackFingerprint | null>
  
  findDuplicates: (
    trackId: string,
    threshold?: number,
    userId?: string
  ) => Promise<DuplicateMatch[]>
  
  processBatch: (
    tracks: Array<{ id: string; audioFile: File | ArrayBuffer }>
  ) => Promise<{ fingerprints: TrackFingerprint[]; duplicates: DuplicateMatch[] }>
  
  createGroup: (tracks: string[], primaryTrack?: string) => Promise<DuplicateGroup>
  updateGroupStatus: (groupId: string, status: 'confirmed' | 'dismissed') => Promise<boolean>
  
  loadGroups: (userId: string) => Promise<DuplicateGroup[]>
  
  clearResults: () => void
  clearError: () => void
  
  // Utilities
  compareFingerprints: (fp1: string, fp2: string, algorithm: string) => Promise<number>
  formatSimilarity: (similarity: number) => string
  getSimilarityLevel: (similarity: number) => 'high' | 'medium' | 'low'
}

export const useDuplicateDetection = (): UseDuplicateDetectionReturn => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([])
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [fingerprints, setFingerprints] = useState<TrackFingerprint[]>([])
  
  const processingRef = useRef<boolean>(false)

  const generateFingerprint = useCallback(async (
    audioFile: File | ArrayBuffer,
    trackId: string,
    algorithm: 'chromaprint' | 'mfcc' | 'spectral_hash' = 'chromaprint'
  ): Promise<TrackFingerprint | null> => {
    if (processingRef.current) {
      throw new Error('Another operation is already in progress')
    }

    processingRef.current = true
    setIsProcessing(true)
    setError(null)
    setProgress(0)

    try {
      setProgress(25)
      const fingerprint = await duplicateDetection.generateFingerprint(audioFile, trackId, algorithm)
      
      if (fingerprint) {
        setProgress(75)
        const success = await duplicateDetection.storeFingerprint(fingerprint)
        
        if (success) {
          setFingerprints(prev => [...prev, fingerprint])
          setProgress(100)
          return fingerprint
        } else {
          throw new Error('Failed to store fingerprint')
        }
      } else {
        throw new Error('Failed to generate fingerprint')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      return null
    } finally {
      setIsProcessing(false)
      processingRef.current = false
      setTimeout(() => setProgress(0), 2000)
    }
  }, [])

  const findDuplicates = useCallback(async (
    trackId: string,
    threshold: number = 0.85,
    userId?: string
  ): Promise<DuplicateMatch[]> => {
    if (processingRef.current) {
      throw new Error('Another operation is already in progress')
    }

    processingRef.current = true
    setIsProcessing(true)
    setError(null)
    setProgress(0)

    try {
      setProgress(50)
      const matches = await duplicateDetection.findDuplicates(trackId, threshold, userId)
      
      setDuplicates(matches)
      setProgress(100)
      
      return matches
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find duplicates'
      setError(errorMessage)
      return []
    } finally {
      setIsProcessing(false)
      processingRef.current = false
      setTimeout(() => setProgress(0), 2000)
    }
  }, [])

  const processBatch = useCallback(async (
    tracks: Array<{ id: string; audioFile: File | ArrayBuffer }>
  ): Promise<{ fingerprints: TrackFingerprint[]; duplicates: DuplicateMatch[] }> => {
    if (processingRef.current) {
      throw new Error('Another operation is already in progress')
    }

    processingRef.current = true
    setIsProcessing(true)
    setError(null)
    setProgress(0)

    try {
      const result = await duplicateDetection.processBatch(
        tracks,
        (processed, total) => {
          setProgress((processed / total) * 100)
        }
      )

      setFingerprints(prev => [...prev, ...result.fingerprints])
      setDuplicates(result.duplicates)

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch processing failed'
      setError(errorMessage)
      return { fingerprints: [], duplicates: [] }
    } finally {
      setIsProcessing(false)
      processingRef.current = false
      setTimeout(() => setProgress(0), 2000)
    }
  }, [])

  const createGroup = useCallback(async (
    tracks: string[], 
    primaryTrack?: string
  ): Promise<DuplicateGroup> => {
    setError(null)

    try {
      const group = await duplicateDetection.createDuplicateGroup(tracks, primaryTrack)
      setGroups(prev => [group, ...prev])
      return group
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create group'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  const updateGroupStatus = useCallback(async (
    groupId: string, 
    status: 'confirmed' | 'dismissed'
  ): Promise<boolean> => {
    setError(null)

    try {
      const success = await duplicateDetection.updateDuplicateGroupStatus(groupId, status)
      
      if (success) {
        setGroups(prev => prev.map(group => 
          group.id === groupId ? { ...group, status } : group
        ))
      }
      
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update group status'
      setError(errorMessage)
      return false
    }
  }, [])

  const loadGroups = useCallback(async (userId: string): Promise<DuplicateGroup[]> => {
    setError(null)

    try {
      const loadedGroups = await duplicateDetection.getDuplicateGroups(userId)
      setGroups(loadedGroups)
      return loadedGroups
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load groups'
      setError(errorMessage)
      return []
    }
  }, [])

  const compareFingerprints = useCallback(async (
    fp1: string, 
    fp2: string, 
    algorithm: string
  ): Promise<number> => {
    try {
      return await duplicateDetection.compareFingerprints(fp1, fp2, algorithm)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Comparison failed'
      setError(errorMessage)
      return 0
    }
  }, [])

  const clearResults = useCallback(() => {
    setDuplicates([])
    setGroups([])
    setFingerprints([])
    setProgress(0)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const formatSimilarity = useCallback((similarity: number): string => {
    return `${(similarity * 100).toFixed(1)}%`
  }, [])

  const getSimilarityLevel = useCallback((similarity: number): 'high' | 'medium' | 'low' => {
    if (similarity >= 0.9) return 'high'
    if (similarity >= 0.75) return 'medium'
    return 'low'
  }, [])

  return {
    // State
    isProcessing,
    progress,
    error,
    duplicates,
    groups,
    fingerprints,
    
    // Actions
    generateFingerprint,
    findDuplicates,
    processBatch,
    createGroup,
    updateGroupStatus,
    loadGroups,
    clearResults,
    clearError,
    
    // Utilities
    compareFingerprints,
    formatSimilarity,
    getSimilarityLevel
  }
}