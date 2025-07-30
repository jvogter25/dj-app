import { useState, useCallback, useRef } from 'react'
import { cdnStorage, StemFile, UploadProgress } from '../lib/cdnStorage'

export interface UseStorageReturn {
  // Upload operations
  uploadStem: (
    trackId: string,
    stemType: StemFile['stemType'],
    audioBuffer: ArrayBuffer,
    metadata: {
      fileName: string
      format: StemFile['format']
      duration: number
      sampleRate: number
      bitRate: number
    }
  ) => Promise<StemFile | null>
  
  uploadMultipleStems: (
    trackId: string,
    stems: Array<{
      stemType: StemFile['stemType']
      audioBuffer: ArrayBuffer
      metadata: {
        fileName: string
        format: StemFile['format']
        duration: number
        sampleRate: number
        bitRate: number
      }
    }>
  ) => Promise<StemFile[]>
  
  // Download operations
  getStems: (trackId: string) => Promise<StemFile[]>
  getStem: (stemId: string) => Promise<StemFile | null>
  getStemUrl: (filePath: string, expiresIn?: number) => Promise<string | null>
  downloadStem: (filePath: string) => Promise<ArrayBuffer | null>
  
  // Management operations
  deleteStem: (filePath: string) => Promise<boolean>
  getStorageStats: () => Promise<{
    totalFiles: number
    totalSize: number
    sizeByType: Record<StemFile['stemType'], number>
  }>
  
  // State
  uploadProgress: Record<string, UploadProgress>
  isUploading: boolean
  error: string | null
  
  // Utilities
  validateFile: (file: File) => { valid: boolean; error?: string }
  clearError: () => void
  formatFileSize: (bytes: number) => string
}

export const useCDNStorage = (): UseStorageReturn => {
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({})
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeUploads = useRef<Set<string>>(new Set())

  const handleUploadProgress = useCallback((fileName: string, progress: UploadProgress) => {
    setUploadProgress(prev => ({
      ...prev,
      [fileName]: progress
    }))
    
    if (progress.status === 'complete' || progress.status === 'error') {
      activeUploads.current.delete(fileName)
      if (activeUploads.current.size === 0) {
        setIsUploading(false)
      }
      
      // Clear completed uploads after a delay
      if (progress.status === 'complete') {
        setTimeout(() => {
          setUploadProgress(prev => {
            const updated = { ...prev }
            delete updated[fileName]
            return updated
          })
        }, 3000)
      }
    }
  }, [])

  const uploadStem = useCallback(async (
    trackId: string,
    stemType: StemFile['stemType'],
    audioBuffer: ArrayBuffer,
    metadata: {
      fileName: string
      format: StemFile['format']
      duration: number
      sampleRate: number
      bitRate: number
    }
  ): Promise<StemFile | null> => {
    try {
      setError(null)
      setIsUploading(true)
      activeUploads.current.add(metadata.fileName)
      
      const result = await cdnStorage.uploadStem(
        trackId,
        stemType,
        audioBuffer,
        metadata,
        (progress) => handleUploadProgress(metadata.fileName, progress)
      )
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)
      handleUploadProgress(metadata.fileName, {
        fileName: metadata.fileName,
        progress: 0,
        status: 'error',
        error: errorMessage
      })
      return null
    }
  }, [handleUploadProgress])

  const uploadMultipleStems = useCallback(async (
    trackId: string,
    stems: Array<{
      stemType: StemFile['stemType']
      audioBuffer: ArrayBuffer
      metadata: {
        fileName: string
        format: StemFile['format']
        duration: number
        sampleRate: number
        bitRate: number
      }
    }>
  ): Promise<StemFile[]> => {
    try {
      setError(null)
      setIsUploading(true)
      
      // Track all files being uploaded
      stems.forEach(stem => {
        activeUploads.current.add(stem.metadata.fileName)
      })
      
      const results = await cdnStorage.uploadMultipleStems(
        trackId,
        stems,
        (fileName, progress) => handleUploadProgress(fileName, progress)
      )
      
      return results
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Batch upload failed'
      setError(errorMessage)
      return []
    }
  }, [handleUploadProgress])

  const getStems = useCallback(async (trackId: string): Promise<StemFile[]> => {
    try {
      setError(null)
      return await cdnStorage.getStems(trackId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stems'
      setError(errorMessage)
      return []
    }
  }, [])

  const getStem = useCallback(async (stemId: string): Promise<StemFile | null> => {
    try {
      setError(null)
      return await cdnStorage.getStem(stemId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stem'
      setError(errorMessage)
      return null
    }
  }, [])

  const getStemUrl = useCallback(async (filePath: string, expiresIn?: number): Promise<string | null> => {
    try {
      setError(null)
      return await cdnStorage.getStemUrl(filePath, expiresIn)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get download URL'
      setError(errorMessage)
      return null
    }
  }, [])

  const downloadStem = useCallback(async (filePath: string): Promise<ArrayBuffer | null> => {
    try {
      setError(null)
      return await cdnStorage.downloadStem(filePath)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download stem'
      setError(errorMessage)
      return null
    }
  }, [])

  const deleteStem = useCallback(async (filePath: string): Promise<boolean> => {
    try {
      setError(null)
      return await cdnStorage.deleteStem(filePath)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete stem'
      setError(errorMessage)
      return false
    }
  }, [])

  const getStorageStats = useCallback(async () => {
    try {
      setError(null)
      return await cdnStorage.getStorageStats()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get storage stats'
      setError(errorMessage)
      return {
        totalFiles: 0,
        totalSize: 0,
        sizeByType: { drums: 0, bass: 0, vocals: 0, other: 0, full: 0 }
      }
    }
  }, [])

  const validateFile = useCallback((file: File) => {
    return cdnStorage.validateFile(file)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const formatFileSize = useCallback((bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB']
    const base = 1024
    
    if (bytes === 0) return '0 B'
    
    const exponent = Math.floor(Math.log(bytes) / Math.log(base))
    const size = bytes / Math.pow(base, exponent)
    const unit = units[exponent] || 'B'
    
    return `${size.toFixed(1)} ${unit}`
  }, [])

  return {
    uploadStem,
    uploadMultipleStems,
    getStems,
    getStem,
    getStemUrl,
    downloadStem,
    deleteStem,
    getStorageStats,
    uploadProgress,
    isUploading,
    error,
    validateFile,
    clearError,
    formatFileSize
  }
}