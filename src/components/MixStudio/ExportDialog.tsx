import React, { useState } from 'react'
import { Download, X, FileAudio, Music } from 'lucide-react'

interface ExportDialogProps {
  projectName: string
  duration: number
  onExport: (format: 'mp3' | 'wav', quality: number) => void
  onClose: () => void
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  projectName,
  duration,
  onExport,
  onClose
}) => {
  const [format, setFormat] = useState<'mp3' | 'wav'>('mp3')
  const [quality, setQuality] = useState(192) // kbps for mp3
  const [isExporting, setIsExporting] = useState(false)

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getFileSize = () => {
    if (format === 'wav') {
      // WAV: 44.1kHz * 16bit * 2 channels / 8 / 1024 / 1024 * duration
      const sizeMB = (44100 * 16 * 2 / 8 / 1024 / 1024) * duration
      return `~${sizeMB.toFixed(1)} MB`
    } else {
      // MP3: bitrate * duration / 8 / 1024
      const sizeMB = (quality * duration / 8 / 1024)
      return `~${sizeMB.toFixed(1)} MB`
    }
  }

  const handleExport = () => {
    setIsExporting(true)
    onExport(format, quality)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Mix
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded"
            disabled={isExporting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Info */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Music className="w-8 h-8 text-purple-500" />
            <div>
              <h3 className="font-semibold">{projectName}</h3>
              <p className="text-sm text-gray-400">Duration: {formatDuration(duration)}</p>
            </div>
          </div>
        </div>

        {/* Format Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Export Format</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFormat('mp3')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                format === 'mp3'
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <FileAudio className="w-6 h-6 mx-auto mb-1" />
              <div className="font-medium">MP3</div>
              <div className="text-xs text-gray-400">Compressed</div>
            </button>
            <button
              onClick={() => setFormat('wav')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                format === 'wav'
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <FileAudio className="w-6 h-6 mx-auto mb-1" />
              <div className="font-medium">WAV</div>
              <div className="text-xs text-gray-400">Lossless</div>
            </button>
          </div>
        </div>

        {/* Quality Selection (MP3 only) */}
        {format === 'mp3' && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">
              Quality: {quality} kbps
            </label>
            <input
              type="range"
              min="128"
              max="320"
              step="64"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>128</span>
              <span>192</span>
              <span>256</span>
              <span>320</span>
            </div>
          </div>
        )}

        {/* File Size Estimate */}
        <div className="bg-gray-700 rounded-lg p-3 mb-6 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Estimated file size:</span>
            <span className="font-medium">{getFileSize()}</span>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            isExporting
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {isExporting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Export Mix</span>
            </>
          )}
        </button>

        {isExporting && (
          <div className="mt-4">
            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: '0%' }} />
            </div>
            <p className="text-center text-sm text-gray-400 mt-2">
              Processing audio...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}