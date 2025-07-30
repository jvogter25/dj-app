import React, { useState, useCallback, useEffect } from 'react'
import { Search, Copy, Trash2, CheckCircle2, XCircle, AlertTriangle, FileAudio, Play, Pause } from 'lucide-react'
import { duplicateDetection, DuplicateMatch, DuplicateGroup, TrackFingerprint } from '../lib/duplicateDetection'
import { useAuth } from '../contexts/AuthContext'

interface DuplicateDetectorProps {
  trackId?: string
  onDuplicatesFound?: (duplicates: DuplicateMatch[]) => void
}

export const DuplicateDetector: React.FC<DuplicateDetectorProps> = ({
  trackId,
  onDuplicatesFound
}) => {
  const { user } = useAuth()
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([])
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [selectedMatch, setSelectedMatch] = useState<DuplicateMatch | null>(null)
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanType, setScanType] = useState<'single' | 'library'>('single')

  // Load existing duplicate groups
  useEffect(() => {
    if (user) {
      loadDuplicateGroups()
    }
  }, [user])

  const loadDuplicateGroups = async () => {
    if (!user) return

    try {
      const groups = await duplicateDetection.getDuplicateGroups(user.id)
      setDuplicateGroups(groups)
    } catch (err) {
      console.error('Error loading duplicate groups:', err)
    }
  }

  // Scan for duplicates
  const handleScan = useCallback(async () => {
    if (!user) {
      setError('User not authenticated')
      return
    }

    setIsScanning(true)
    setError(null)
    setScanProgress(0)

    try {
      if (scanType === 'single' && trackId) {
        // Scan single track for duplicates
        const matches = await duplicateDetection.findDuplicates(trackId, 0.8, user.id)
        setDuplicateMatches(matches)
        onDuplicatesFound?.(matches)
        
        if (matches.length > 0) {
          // Create duplicate group if matches found
          const trackIds = [trackId, ...matches.map(m => m.trackB)]
          await duplicateDetection.createDuplicateGroup(trackIds, trackId)
          await loadDuplicateGroups()
        }
      } else {
        // Scan entire library (placeholder - would need track list)
        setError('Library scan not implemented yet. Please select a specific track.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsScanning(false)
      setScanProgress(0)
    }
  }, [user, trackId, scanType, onDuplicatesFound])

  // Handle track playback (placeholder)
  const handlePlayTrack = useCallback((trackId: string) => {
    if (playingTrack === trackId) {
      setPlayingTrack(null)
    } else {
      setPlayingTrack(trackId)
      // In real implementation, would start audio playback
      setTimeout(() => setPlayingTrack(null), 3000) // Auto-stop after 3s for demo
    }
  }, [playingTrack])

  // Confirm duplicate group
  const handleConfirmGroup = useCallback(async (groupId: string) => {
    const success = await duplicateDetection.updateDuplicateGroupStatus(groupId, 'confirmed')
    if (success) {
      await loadDuplicateGroups()
    }
  }, [])

  // Dismiss duplicate group
  const handleDismissGroup = useCallback(async (groupId: string) => {
    const success = await duplicateDetection.updateDuplicateGroupStatus(groupId, 'dismissed')
    if (success) {
      await loadDuplicateGroups()
    }
  }, [])

  // Get similarity color
  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.95) return 'text-red-400'
    if (similarity >= 0.85) return 'text-orange-400'
    if (similarity >= 0.75) return 'text-yellow-400'
    return 'text-gray-400'
  }

  // Get similarity badge
  const getSimilarityBadge = (similarity: number) => {
    if (similarity >= 0.95) return 'bg-red-600'
    if (similarity >= 0.85) return 'bg-orange-600'
    if (similarity >= 0.75) return 'bg-yellow-600'
    return 'bg-gray-600'
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Copy className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-bold">Duplicate Detection</h2>
        </div>
        
        {/* Scan Type Selector */}
        <div className="flex bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setScanType('single')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              scanType === 'single' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Single Track
          </button>
          <button
            onClick={() => setScanType('library')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              scanType === 'library' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Full Library
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Scan Controls */}
      <div className="mb-6">
        <button
          onClick={handleScan}
          disabled={isScanning || (scanType === 'single' && !trackId)}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            isScanning || (scanType === 'single' && !trackId)
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          <Search className="w-5 h-5" />
          {isScanning ? 'Scanning...' : `Scan for Duplicates`}
        </button>

        {/* Progress Bar */}
        {isScanning && (
          <div className="mt-3">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Analyzing audio fingerprints... {scanProgress.toFixed(0)}%
            </p>
          </div>
        )}
      </div>

      {/* Duplicate Matches */}
      {duplicateMatches.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            Found {duplicateMatches.length} Potential Duplicate{duplicateMatches.length !== 1 ? 's' : ''}
          </h3>

          <div className="space-y-3">
            {duplicateMatches.map((match, index) => (
              <div
                key={index}
                className="bg-gray-700 rounded-lg p-4 border border-gray-600"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileAudio className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">Duplicate Match</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getSimilarityBadge(match.similarity)} text-white`}>
                        {formatPercentage(match.similarity)} similar
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-400 space-y-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-500">Algorithm:</p>
                          <p className="capitalize">{match.algorithm}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Confidence:</p>
                          <p>{formatPercentage(match.confidence)}</p>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-gray-500">Duration Difference:</p>
                        <p>{match.details.durationDiff.toFixed(1)}s</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePlayTrack(match.trackB)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                      title="Preview track"
                    >
                      {playingTrack === match.trackB ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => setSelectedMatch(match)}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate Groups */}
      {duplicateGroups.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Duplicate Groups</h3>
          
          <div className="space-y-4">
            {duplicateGroups.map((group) => (
              <div
                key={group.id}
                className={`bg-gray-700 rounded-lg p-4 border ${
                  group.status === 'confirmed' ? 'border-green-600' :
                  group.status === 'dismissed' ? 'border-gray-500' :
                  'border-orange-600'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      group.status === 'confirmed' ? 'bg-green-500' :
                      group.status === 'dismissed' ? 'bg-gray-500' :
                      'bg-orange-500'
                    }`} />
                    <span className="font-medium capitalize">{group.status}</span>
                    <span className="text-sm text-gray-400">
                      {group.tracks.length} tracks
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${getSimilarityColor(group.similarity)}`}>
                      {formatPercentage(group.similarity)} similar
                    </span>
                    
                    {group.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleConfirmGroup(group.id)}
                          className="p-1 text-green-400 hover:text-green-300 hover:bg-gray-600 rounded transition-colors"
                          title="Confirm as duplicate"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDismissGroup(group.id)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded transition-colors"
                          title="Dismiss as not duplicate"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-400">
                  <p>Detected: {group.detectedAt.toLocaleDateString()}</p>
                  <p>Primary track: {group.primaryTrack.slice(0, 8)}...</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Duplicates Message */}
      {!isScanning && duplicateMatches.length === 0 && duplicateGroups.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Copy className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No duplicates detected</p>
          <p className="text-sm mt-1">
            {scanType === 'single' 
              ? 'Select a track and click scan to check for duplicates' 
              : 'Click scan to analyze your entire library'
            }
          </p>
        </div>
      )}

      {/* Match Details Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Duplicate Details</h3>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded-lg p-3">
                  <h4 className="font-medium mb-2">Similarity Score</h4>
                  <div className={`text-2xl font-bold ${getSimilarityColor(selectedMatch.similarity)}`}>
                    {formatPercentage(selectedMatch.similarity)}
                  </div>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-3">
                  <h4 className="font-medium mb-2">Algorithm</h4>
                  <div className="text-lg capitalize">{selectedMatch.algorithm}</div>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-3">
                <h4 className="font-medium mb-2">Analysis Details</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Duration Diff</p>
                    <p>{selectedMatch.details.durationDiff.toFixed(1)}s</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Fingerprint Match</p>
                    <p>{formatPercentage(selectedMatch.details.fingerprintMatch)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Spectral Similarity</p>
                    <p>{formatPercentage(selectedMatch.details.spectralSimilarity)}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // Create duplicate group with these tracks
                    duplicateDetection.createDuplicateGroup([selectedMatch.trackA, selectedMatch.trackB])
                    setSelectedMatch(null)
                    loadDuplicateGroups()
                  }}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}