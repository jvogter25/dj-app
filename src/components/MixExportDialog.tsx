// Production Mix Export Dialog Component
// User interface for exporting mixes in various formats

import React, { useState, useCallback } from 'react'
import {
  Download, Settings, Play, Pause, X, AlertCircle,
  FileAudio, Music, Headphones, Clock, HardDrive,
  Check, Loader, Volume2, Zap, Tag, ChevronDown
} from 'lucide-react'
import { MixState } from '../lib/mixManager'
import { 
  mixExporter, 
  ProductionMixExporter,
  ExportOptions, 
  ExportProgress, 
  ExportResult 
} from '../lib/mixExporter'

interface MixExportDialogProps {
  mix: MixState
  isOpen: boolean
  onClose: () => void
  onExportComplete?: (result: ExportResult) => void
}

export const MixExportDialog: React.FC<MixExportDialogProps> = ({
  mix,
  isOpen,
  onClose,
  onExportComplete
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>(
    ProductionMixExporter.getDefaultExportOptions()
  )
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  const [exportResult, setExportResult] = useState<ExportResult | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const formatSizes = {
    mp3: { low: 0.8, medium: 1.2, high: 1.8, lossless: 2.5 },
    wav: { low: 8, medium: 10, high: 12, lossless: 15 },
    flac: { low: 4, medium: 5, high: 6, lossless: 8 }
  }

  const estimatedSize = (() => {
    const duration = mix.tracks.reduce((total, track) => total + track.durationSeconds, 0) / 60 // minutes
    const multiplier = formatSizes[exportOptions.format][exportOptions.quality]
    return Math.round(duration * multiplier * 10) / 10 // MB
  })()

  const estimatedTime = (() => {
    const baseTime = mix.tracks.length * 2 // 2 seconds per track base
    const formatMultiplier = exportOptions.format === 'wav' ? 1 : exportOptions.format === 'flac' ? 1.5 : 2
    const qualityMultiplier = exportOptions.quality === 'lossless' ? 2 : exportOptions.quality === 'high' ? 1.5 : 1
    return Math.round(baseTime * formatMultiplier * qualityMultiplier)
  })()

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    setExportProgress(null)
    setExportResult(null)

    try {
      const result = await mixExporter.exportMix(
        mix,
        exportOptions,
        (progress) => setExportProgress(progress)
      )

      setExportResult(result)
      onExportComplete?.(result)

      if (result.success && result.audioUrl) {
        // Auto-download
        const link = document.createElement('a')
        link.href = result.audioUrl
        link.download = `${mix.title}.${exportOptions.format}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Export failed:', error)
      setExportResult({
        success: false,
        duration: 0,
        fileSize: 0,
        format: exportOptions.format,
        error: error instanceof Error ? error.message : 'Export failed'
      })
    } finally {
      setIsExporting(false)
    }
  }, [mix, exportOptions, onExportComplete])

  const handleCancel = () => {
    if (isExporting) {
      mixExporter.cancelExport()
      setIsExporting(false)
      setExportProgress(null)
    }
  }

  const handlePreview = () => {
    if (exportResult?.audioUrl) {
      if (isPlaying && previewAudio) {
        previewAudio.pause()
        setIsPlaying(false)
      } else {
        if (!previewAudio) {
          const audio = new Audio(exportResult.audioUrl)
          audio.addEventListener('ended', () => setIsPlaying(false))
          setPreviewAudio(audio)
        }
        previewAudio?.play()
        setIsPlaying(true)
      }
    }
  }

  const handleQualityChange = (quality: ExportOptions['quality']) => {
    const preset = ProductionMixExporter.getQualityPreset(quality)
    setExportOptions({ ...exportOptions, quality, ...preset })
  }

  const handleClose = () => {
    if (previewAudio) {
      previewAudio.pause()
      setIsPlaying(false)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="h-6 w-6 text-purple-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">Export Mix</h2>
                <p className="text-gray-400">{mix.title}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Export Status */}
          {exportProgress && (
            <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader className="h-4 w-4 animate-spin text-purple-400" />
                  <span className="font-medium text-white">
                    {exportProgress.stage === 'preparing' && 'Preparing...'}
                    {exportProgress.stage === 'loading' && 'Loading tracks...'}
                    {exportProgress.stage === 'processing' && 'Processing audio...'}
                    {exportProgress.stage === 'encoding' && 'Encoding...'}
                    {exportProgress.stage === 'finalizing' && 'Finalizing...'}
                    {exportProgress.stage === 'complete' && 'Complete!'}
                    {exportProgress.stage === 'error' && 'Error'}
                  </span>
                </div>
                {isExporting && (
                  <button
                    onClick={handleCancel}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress.progress}%` }}
                />
              </div>
              
              <div className="flex justify-between text-sm text-gray-400">
                <span>{exportProgress.message}</span>
                <span>{exportProgress.progress}%</span>
              </div>
              
              {exportProgress.currentTrack && (
                <p className="text-sm text-gray-300 mt-1">
                  Current: {exportProgress.currentTrack}
                </p>
              )}
            </div>
          )}

          {/* Export Result */}
          {exportResult && (
            <div className={`mb-6 p-4 rounded-lg border ${
              exportResult.success 
                ? 'bg-green-900/20 border-green-700' 
                : 'bg-red-900/20 border-red-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {exportResult.success ? (
                  <Check className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                )}
                <h3 className={`font-medium ${
                  exportResult.success ? 'text-green-300' : 'text-red-300'
                }`}>
                  {exportResult.success ? 'Export Successful!' : 'Export Failed'}
                </h3>
              </div>
              
              {exportResult.success ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-white ml-2">
                        {Math.floor(exportResult.duration / 60)}:{Math.floor(exportResult.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Size:</span>
                      <span className="text-white ml-2">
                        {(exportResult.fileSize / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Format:</span>
                      <span className="text-white ml-2 uppercase">
                        {exportResult.format}
                      </span>
                    </div>
                  </div>
                  
                  {exportResult.audioUrl && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handlePreview}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {isPlaying ? 'Pause' : 'Preview'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-red-300">{exportResult.error}</p>
              )}
            </div>
          )}

          {/* Export Options */}
          {!isExporting && !exportResult && (
            <div className="space-y-6">
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Audio Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['mp3', 'wav', 'flac'] as const).map(format => (
                    <button
                      key={format}
                      onClick={() => setExportOptions({ ...exportOptions, format })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        exportOptions.format === format
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <FileAudio className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-sm font-medium text-white uppercase">
                        {format}
                      </div>
                      <div className="text-xs text-gray-400">
                        {format === 'mp3' && 'Compressed'}
                        {format === 'wav' && 'Uncompressed'}
                        {format === 'flac' && 'Lossless'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Quality
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['low', 'medium', 'high', 'lossless'] as const).map(quality => (
                    <button
                      key={quality}
                      onClick={() => handleQualityChange(quality)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        exportOptions.quality === quality
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-sm font-medium text-white capitalize mb-1">
                        {quality}
                      </div>
                      <div className="text-xs text-gray-400">
                        {quality === 'low' && '128 kbps'}
                        {quality === 'medium' && '192 kbps'}
                        {quality === 'high' && '320 kbps'}
                        {quality === 'lossless' && 'Full quality'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Export Info */}
              <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-600">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Estimated size:</span>
                    <span className="text-white font-medium">{estimatedSize} MB</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Estimated time:</span>
                    <span className="text-white font-medium">{estimatedTime}s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Tracks:</span>
                    <span className="text-white font-medium">{mix.tracks.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Channels:</span>
                    <span className="text-white font-medium capitalize">{exportOptions.channels}</span>
                  </div>
                </div>
              </div>

              {/* Advanced Options */}
              <div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Advanced Options
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4 p-4 bg-gray-900/50 rounded-lg border border-gray-600">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Sample Rate
                        </label>
                        <select
                          value={exportOptions.sampleRate}
                          onChange={(e) => setExportOptions({
                            ...exportOptions,
                            sampleRate: parseInt(e.target.value) as any
                          })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        >
                          <option value={44100}>44.1 kHz</option>
                          <option value={48000}>48 kHz</option>
                          <option value={96000}>96 kHz</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Bit Depth
                        </label>
                        <select
                          value={exportOptions.bitDepth}
                          onChange={(e) => setExportOptions({
                            ...exportOptions,
                            bitDepth: parseInt(e.target.value) as any
                          })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        >
                          <option value={16}>16-bit</option>
                          <option value={24}>24-bit</option>
                          <option value={32}>32-bit</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {Object.entries({
                        normalize: 'Normalize audio',
                        includeMetadata: 'Include metadata',
                        chapterMarkers: 'Add chapter markers for each track'
                      }).map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-gray-300">{label}</span>
                          <button
                            onClick={() => setExportOptions({
                              ...exportOptions,
                              [key]: !exportOptions[key as keyof ExportOptions]
                            })}
                            className={`p-2 rounded-lg transition-colors ${
                              exportOptions[key as keyof ExportOptions] ? 'bg-green-600' : 'bg-gray-600'
                            }`}
                          >
                            <Check className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Export Button */}
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Download className="h-5 w-5" />
                  Export Mix
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* New Export Button after completion */}
          {exportResult && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setExportResult(null)
                  setExportProgress(null)
                }}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Download className="h-5 w-5" />
                Export Again
              </button>
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MixExportDialog