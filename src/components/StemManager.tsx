import React, { useState, useEffect, useCallback } from 'react'
import { Upload, Download, Trash2, Play, Pause, Volume2, FileAudio, AlertCircle, CheckCircle2, Loader } from 'lucide-react'
import { useCDNStorage } from '../hooks/useCDNStorage'
import { StemFile } from '../lib/cdnStorage'

interface StemManagerProps {
  trackId: string
  trackName?: string
  onStemSelect?: (stem: StemFile) => void
  allowUpload?: boolean
  allowDelete?: boolean
}

export const StemManager: React.FC<StemManagerProps> = ({
  trackId,
  trackName = 'Unknown Track',
  onStemSelect,
  allowUpload = true,
  allowDelete = true
}) => {
  const {
    getStems,
    uploadStem,
    deleteStem,
    getStemUrl,
    uploadProgress,
    isUploading,
    error,
    validateFile,
    formatFileSize,
    clearError
  } = useCDNStorage()

  const [stems, setStems] = useState<StemFile[]>([])
  const [loading, setLoading] = useState(true)
  const [playingAudio, setPlayingAudio] = useState<{ stemId: string; audio: HTMLAudioElement } | null>(null)
  const [uploadDropzone, setUploadDropzone] = useState(false)

  // Load stems for the track
  const loadStems = useCallback(async () => {
    setLoading(true)
    try {
      const trackStems = await getStems(trackId)
      setStems(trackStems)
    } catch (err) {
      console.error('Error loading stems:', err)
    } finally {
      setLoading(false)
    }
  }, [trackId, getStems])

  useEffect(() => {
    loadStems()
  }, [loadStems])

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files)
    
    for (const file of fileArray) {
      const validation = validateFile(file)
      if (!validation.valid) {
        console.error(`Invalid file ${file.name}:`, validation.error)
        continue
      }

      try {
        // Determine stem type from filename
        const fileName = file.name.toLowerCase()
        let stemType: StemFile['stemType'] = 'other'
        
        if (fileName.includes('drum')) stemType = 'drums'
        else if (fileName.includes('bass')) stemType = 'bass'
        else if (fileName.includes('vocal')) stemType = 'vocals'
        else if (fileName.includes('full') || fileName.includes('master')) stemType = 'full'

        // Convert file to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()
        
        // Get audio metadata (simplified - in real implementation you'd use proper audio analysis)
        const audioContext = new AudioContext()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
        
        const metadata = {
          fileName: file.name,
          format: file.name.split('.').pop()?.toLowerCase() as StemFile['format'] || 'wav',
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          bitRate: 1411 // Default for WAV, could be calculated
        }

        const uploadedStem = await uploadStem(trackId, stemType, arrayBuffer, metadata)
        
        if (uploadedStem) {
          setStems(prev => [...prev, uploadedStem])
        }
      } catch (err) {
        console.error(`Error uploading ${file.name}:`, err)
      }
    }
  }, [trackId, validateFile, uploadStem])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setUploadDropzone(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setUploadDropzone(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setUploadDropzone(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [handleFileUpload])

  // Handle stem playback
  const toggleStemPlayback = useCallback(async (stem: StemFile) => {
    if (playingAudio && playingAudio.stemId === stem.id) {
      // Stop current playback
      playingAudio.audio.pause()
      playingAudio.audio.currentTime = 0
      setPlayingAudio(null)
      return
    }

    // Stop any currently playing audio
    if (playingAudio) {
      playingAudio.audio.pause()
      playingAudio.audio.currentTime = 0
    }

    try {
      const url = await getStemUrl(stem.filePath, 300) // 5 minute expiry
      if (url) {
        const audio = new Audio(url)
        audio.volume = 0.7
        
        audio.addEventListener('ended', () => {
          setPlayingAudio(null)
        })
        
        audio.addEventListener('error', () => {
          setPlayingAudio(null)
          console.error('Error playing stem audio')
        })
        
        await audio.play()
        setPlayingAudio({ stemId: stem.id, audio })
      }
    } catch (err) {
      console.error('Error playing stem:', err)
    }
  }, [playingAudio, getStemUrl])

  // Handle stem deletion
  const handleDeleteStem = useCallback(async (stem: StemFile) => {
    if (!window.confirm(`Are you sure you want to delete the ${stem.stemType} stem?`)) {
      return
    }

    const success = await deleteStem(stem.filePath)
    if (success) {
      setStems(prev => prev.filter(s => s.id !== stem.id))
    }
  }, [deleteStem])

  // Handle stem download
  const handleDownloadStem = useCallback(async (stem: StemFile) => {
    try {
      const url = await getStemUrl(stem.filePath, 3600) // 1 hour expiry for download
      if (url) {
        const link = document.createElement('a')
        link.href = url
        link.download = stem.fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err) {
      console.error('Error downloading stem:', err)
    }
  }, [getStemUrl])

  const getStemTypeColor = (stemType: StemFile['stemType']) => {
    const colors: Record<StemFile['stemType'], string> = {
      drums: 'bg-red-600',
      bass: 'bg-purple-600',
      vocals: 'bg-blue-600',
      other: 'bg-green-600',
      full: 'bg-yellow-600'
    }
    return colors[stemType] || 'bg-gray-600'
  }

  const getStemTypeIcon = (stemType: StemFile['stemType']) => {
    // All stem types use the same icon for consistency
    return <FileAudio className="w-4 h-4" />
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-purple-500" />
          <span className="ml-2 text-gray-400">Loading stems...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-purple-500" />
            Stem Files
          </h3>
          <p className="text-sm text-gray-400">{trackName}</p>
        </div>
        <div className="text-sm text-gray-400">
          {stems.length} stem{stems.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-red-300 text-sm">{error}</span>
          <button
            onClick={clearError}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="mb-4 space-y-2">
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">{fileName}</span>
                <div className="flex items-center gap-2">
                  {progress.status === 'complete' && (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  )}
                  {progress.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                  {progress.status === 'uploading' && (
                    <Loader className="w-4 h-4 animate-spin text-purple-400" />
                  )}
                  <span className="text-xs text-gray-400">
                    {progress.progress}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    progress.status === 'error' ? 'bg-red-500' :
                    progress.status === 'complete' ? 'bg-green-500' :
                    'bg-purple-500'
                  }`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              {progress.error && (
                <p className="text-xs text-red-400 mt-1">{progress.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Dropzone */}
      {allowUpload && (
        <div
          className={`mb-6 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            uploadDropzone
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-gray-600 hover:border-gray-500'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-400 mb-2">
            Drag and drop audio files here, or{' '}
            <label className="text-purple-400 hover:text-purple-300 cursor-pointer">
              browse files
              <input
                type="file"
                multiple
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileUpload(e.target.files)
                  }
                }}
              />
            </label>
          </p>
          <p className="text-xs text-gray-500">
            Supported formats: WAV, MP3, FLAC, OGG, M4A (max 100MB each)
          </p>
        </div>
      )}

      {/* Stem List */}
      <div className="space-y-3">
        {stems.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileAudio className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No stems available for this track</p>
            {allowUpload && (
              <p className="text-sm mt-1">Upload audio files to get started</p>
            )}
          </div>
        ) : (
          stems.map((stem) => (
            <div
              key={stem.id}
              className="bg-gray-700 rounded-lg p-4 flex items-center gap-4"
            >
              {/* Stem Type Badge */}
              <div className={`w-10 h-10 ${getStemTypeColor(stem.stemType)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                {getStemTypeIcon(stem.stemType)}
              </div>

              {/* Stem Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-white capitalize">
                    {stem.stemType}
                  </h4>
                  <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                    {stem.format.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-400 space-y-1">
                  <p className="truncate">{stem.fileName}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span>{Math.floor(stem.duration / 60)}:{(stem.duration % 60).toFixed(0).padStart(2, '0')}</span>
                    <span>{formatFileSize(stem.fileSize)}</span>
                    <span>{stem.sampleRate / 1000}kHz</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Play/Pause Button */}
                <button
                  onClick={() => toggleStemPlayback(stem)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                  title={playingAudio?.stemId === stem.id ? 'Stop' : 'Play'}
                >
                  {playingAudio?.stemId === stem.id ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>

                {/* Download Button */}
                <button
                  onClick={() => handleDownloadStem(stem)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>

                {/* Select Button */}
                {onStemSelect && (
                  <button
                    onClick={() => onStemSelect(stem)}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Use
                  </button>
                )}

                {/* Delete Button */}
                {allowDelete && (
                  <button
                    onClick={() => handleDeleteStem(stem)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Status */}
      {isUploading && (
        <div className="mt-4 p-3 bg-purple-900/50 border border-purple-600 rounded-lg flex items-center gap-2">
          <Loader className="w-4 h-4 animate-spin text-purple-400" />
          <span className="text-purple-300 text-sm">Uploading stems...</span>
        </div>
      )}
    </div>
  )
}