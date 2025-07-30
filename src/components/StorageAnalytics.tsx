import React, { useState, useEffect } from 'react'
import { BarChart3, HardDrive, FileAudio, TrendingUp, Archive } from 'lucide-react'
import { useCDNStorage } from '../hooks/useCDNStorage'

interface StorageStats {
  totalFiles: number
  totalSize: number
  sizeByType: Record<string, number>
}

export const StorageAnalytics: React.FC = () => {
  const { getStorageStats, formatFileSize } = useCDNStorage()
  const [stats, setStats] = useState<StorageStats>({
    totalFiles: 0,
    totalSize: 0,
    sizeByType: { drums: 0, bass: 0, vocals: 0, other: 0, full: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true)
      try {
        const storageStats = await getStorageStats()
        setStats(storageStats)
      } catch (error) {
        console.error('Error loading storage stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [getStorageStats])

  const getStemTypeColor = (stemType: string) => {
    const colors: Record<string, string> = {
      drums: 'bg-red-500',
      bass: 'bg-purple-500',
      vocals: 'bg-blue-500',
      other: 'bg-green-500',
      full: 'bg-yellow-500'
    }
    return colors[stemType] || 'bg-gray-500'
  }

  const getStemTypeLabel = (stemType: string) => {
    const labels: Record<string, string> = {
      drums: 'Drums',
      bass: 'Bass',
      vocals: 'Vocals',
      other: 'Other',
      full: 'Full Mix'
    }
    return labels[stemType] || stemType
  }

  const getUsagePercentage = (size: number) => {
    return stats.totalSize > 0 ? (size / stats.totalSize) * 100 : 0
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-700 rounded-lg p-4">
                <div className="h-4 bg-gray-600 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-600 rounded w-16"></div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-500" />
          Storage Analytics
        </h3>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileAudio className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-400">Total Files</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.totalFiles.toLocaleString()}
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-400">Total Size</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatFileSize(stats.totalSize)}
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-400">Avg File Size</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.totalFiles > 0 
              ? formatFileSize(stats.totalSize / stats.totalFiles)
              : '0 B'
            }
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Archive className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-gray-400">Storage Limit</span>
          </div>
          <div className="text-2xl font-bold text-white">
            10 GB
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {((stats.totalSize / (10 * 1024 * 1024 * 1024)) * 100).toFixed(1)}% used
          </div>
        </div>
      </div>

      {/* Storage by Type */}
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-4 text-gray-200">Storage by Stem Type</h4>
        <div className="space-y-3">
          {Object.entries(stats.sizeByType)
            .sort(([,a], [,b]) => b - a)
            .map(([stemType, size]) => {
              const percentage = getUsagePercentage(size)
              return (
                <div key={stemType} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getStemTypeColor(stemType)}`} />
                      <span className="font-medium text-white">
                        {getStemTypeLabel(stemType)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">
                        {formatFileSize(size)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getStemTypeColor(stemType)} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Storage Usage Bar */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-md font-semibold text-gray-200">Overall Storage Usage</h4>
          <span className="text-sm text-gray-400">
            {formatFileSize(stats.totalSize)} / 10 GB
          </span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-500"
            style={{ 
              width: `${Math.min(((stats.totalSize / (10 * 1024 * 1024 * 1024)) * 100), 100)}%` 
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0 GB</span>
          <span>5 GB</span>
          <span>10 GB</span>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-300 mb-2">Storage Tips</h4>
        <ul className="text-xs text-blue-200 space-y-1">
          <li>• Full mix stems are typically the largest files</li>
          <li>• Consider using MP3 format for preview stems to save space</li>
          <li>• Delete unused stems to free up storage</li>
          <li>• WAV format provides the best quality but uses more space</li>
        </ul>
      </div>
    </div>
  )
}