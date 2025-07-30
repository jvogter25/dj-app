import React, { useState, useCallback, useRef } from 'react'
import { Upload, Play, Pause, Scissors, Loader, CheckCircle2, AlertCircle, Music, FileAudio } from 'lucide-react'
import { demucsProcessor, StemSeparationProgress, DemucsConfig } from '../lib/demucsProcessor'
import { StemFile } from '../lib/cdnStorage'
import { StemManager } from './StemManager'

interface StemSeparationProps {
  trackId?: string
  trackName?: string
  onStemsGenerated?: (stems: StemFile[]) => void
}

export const StemSeparation: React.FC<StemSeparationProps> = ({
  trackId,
  trackName = 'Unknown Track',
  onStemsGenerated
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<StemSeparationProgress | null>(null)
  const [generatedStems, setGeneratedStems] = useState<StemFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [audioPreview, setAudioPreview] = useState<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [config, setConfig] = useState<DemucsConfig>({
    model: 'htdemucs',
    overlap: 0.25,
    splitSize: 256,
    shifts: 1,
    device: 'cpu'
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropzoneRef = useRef<HTMLDivElement>(null)

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (!file) return

    // Validate file type
    const supportedFormats = demucsProcessor.getSupportedFormats()
    if (!supportedFormats.includes(file.type)) {
      setError(`Unsupported file format. Supported formats: ${supportedFormats.join(', ')}`)
      return
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('File size too large. Maximum size is 100MB.')
      return
    }

    setSelectedFile(file)
    setError(null)
    setGeneratedStems([])

    // Create audio preview
    const audioUrl = URL.createObjectURL(file)
    const audio = new Audio(audioUrl)
    setAudioPreview(audio)
  }, [])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (dropzoneRef.current) {
      dropzoneRef.current.classList.add('border-purple-500', 'bg-purple-500/10')
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (dropzoneRef.current) {
      dropzoneRef.current.classList.remove('border-purple-500', 'bg-purple-500/10')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (dropzoneRef.current) {
      dropzoneRef.current.classList.remove('border-purple-500', 'bg-purple-500/10')
    }

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  // Handle audio preview playback
  const togglePreview = useCallback(() => {
    if (!audioPreview) return

    if (isPlaying) {
      audioPreview.pause()
      setIsPlaying(false)
    } else {
      audioPreview.play()
      setIsPlaying(true)
      
      audioPreview.onended = () => setIsPlaying(false)
      audioPreview.onerror = () => {
        setIsPlaying(false)
        setError('Error playing audio preview')
      }
    }
  }, [audioPreview, isPlaying])

  // Process stem separation
  const processStemSeparation = useCallback(async () => {
    if (!selectedFile || !trackId) {
      setError('Please select an audio file and ensure track ID is provided')
      return
    }

    if (!demucsProcessor.isAvailable()) {
      setError('Stem separation is not available in this browser')
      return
    }

    setIsProcessing(true)
    setError(null)
    setProgress(null)

    try {
      const result = await demucsProcessor.separateStems(
        selectedFile,
        trackId,
        config,
        (progressData) => {
          setProgress(progressData)
        }
      )

      if (result.success) {
        setGeneratedStems(result.stems)
        onStemsGenerated?.(result.stems)
        setProgress({
          stage: 'complete',
          progress: 100,
          message: `Successfully generated ${result.stems.length} stems in ${(result.processingTime / 1000).toFixed(1)}s`
        })
      } else {
        setError(result.error || 'Stem separation failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error occurred')
    } finally {
      setIsProcessing(false)
      // Clear progress after a delay
      setTimeout(() => setProgress(null), 5000)
    }
  }, [selectedFile, trackId, config, onStemsGenerated])

  // Get estimated processing time
  const getEstimatedTime = useCallback(() => {
    if (!selectedFile || !audioPreview) return null

    return demucsProcessor.estimateProcessingTime(audioPreview.duration)
  }, [selectedFile, audioPreview])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressColor = (stage: StemSeparationProgress['stage']) => {
    switch (stage) {
      case 'complete': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      case 'processing': return 'bg-purple-500'
      case 'uploading': return 'bg-blue-500'
      default: return 'bg-yellow-500'
    }
  }

  const getStageIcon = (stage: StemSeparationProgress['stage']) => {
    switch (stage) {
      case 'complete': return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />
      case 'processing': return <Scissors className="w-4 h-4 text-purple-400" />
      case 'uploading': return <Upload className="w-4 h-4 text-blue-400" />
      default: return <Loader className="w-4 h-4 animate-spin text-yellow-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Scissors className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-bold">Stem Separation</h2>
        </div>

        {/* Upload Dropzone */}
        <div
          ref={dropzoneRef}
          className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center transition-colors cursor-pointer hover:border-gray-500"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-300 mb-2">
            {selectedFile ? selectedFile.name : 'Drag and drop an audio file here, or click to browse'}
          </p>
          <p className="text-sm text-gray-500">
            Supported formats: WAV, MP3, FLAC, OGG, M4A (max 100MB)
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />
        </div>

        {/* Selected File Info */}
        {selectedFile && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileAudio className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="font-medium text-white">{selectedFile.name}</p>
                  <p className="text-sm text-gray-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    {audioPreview?.duration && ` • ${formatTime(audioPreview.duration)}`}
                  </p>
                </div>
              </div>
              
              {audioPreview && (
                <button
                  onClick={togglePreview}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>
            
            {getEstimatedTime() && (
              <div className="mt-2 text-xs text-gray-500">
                Estimated processing time: ~{Math.ceil(getEstimatedTime()! / 1000)}s
              </div>
            )}
          </div>
        )}

        {/* Configuration */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Model
            </label>
            <select
              value={config.model}
              onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value as DemucsConfig['model'] }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              disabled={isProcessing}
            >
              <option value="htdemucs">HT-Demucs (Balanced)</option>
              <option value="htdemucs_ft">HT-Demucs FT (High Quality)</option>
              <option value="mdx_extra">MDX Extra (Fast)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quality vs Speed
            </label>
            <select
              value={config.shifts}
              onChange={(e) => setConfig(prev => ({ ...prev, shifts: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              disabled={isProcessing}
            >
              <option value={1}>Fast (1 shift)</option>
              <option value={2}>Balanced (2 shifts)</option>
              <option value={4}>High Quality (4 shifts)</option>
            </select>
          </div>
        </div>

        {/* Process Button */}
        <div className="mt-6">
          <button
            onClick={processStemSeparation}
            disabled={!selectedFile || !trackId || isProcessing}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              !selectedFile || !trackId || isProcessing
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Scissors className="w-5 h-5" />
                Separate Stems
              </>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-600 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Progress Display */}
        {progress && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStageIcon(progress.stage)}
                <span className="text-sm font-medium text-white capitalize">
                  {progress.stage.replace('_', ' ')}
                </span>
              </div>
              <span className="text-sm text-gray-400">
                {progress.progress.toFixed(0)}%
              </span>
            </div>
            
            <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress.stage)}`}
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            
            <p className="text-sm text-gray-300">{progress.message}</p>
          </div>
        )}
      </div>

      {/* Generated Stems Display */}
      {(generatedStems.length > 0 || trackId) && (
        <StemManager
          trackId={trackId!}
          trackName={trackName}
          allowUpload={false}
          allowDelete={true}
        />
      )}
    </div>
  )
}