import React, { useState, useEffect } from 'react'
import { Replace, Search, Music, Check, X, Info, Upload } from 'lucide-react'
import { AudioSource } from '../../types/mixStudio'
import { audioFileDB } from '../../lib/audioFileDatabase'

interface PlaceholderReplacerProps {
  placeholder: AudioSource
  onReplace: (newSource: AudioSource) => void
  onClose: () => void
}

interface ReplacementCandidate {
  source: AudioSource
  matchScore: number
  matchReasons: string[]
}

export const PlaceholderReplacer: React.FC<PlaceholderReplacerProps> = ({
  placeholder,
  onReplace,
  onClose
}) => {
  const [localFiles, setLocalFiles] = useState<AudioSource[]>([])
  const [candidates, setCandidates] = useState<ReplacementCandidate[]>([])
  const [selectedFile, setSelectedFile] = useState<AudioSource | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadLocalFiles()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadLocalFiles = async () => {
    try {
      const storedFiles = await audioFileDB.getAllFiles()
      const audioSources = storedFiles.map(stored => stored.metadata)
      setLocalFiles(audioSources)
      findBestMatches(audioSources)
    } catch (error) {
      console.error('Error loading local files:', error)
    }
  }

  const findBestMatches = (files: AudioSource[]) => {
    const scored: ReplacementCandidate[] = files.map(file => {
      let score = 0
      const reasons: string[] = []

      // Duration similarity (20% tolerance)
      const durationDiff = Math.abs(file.duration - placeholder.duration) / placeholder.duration
      if (durationDiff < 0.2) {
        score += 30
        reasons.push(`Similar duration (${formatDuration(file.duration)})`)
      }

      // BPM similarity (if available)
      if (file.bpm && placeholder.metadata?.tempo) {
        const bpmDiff = Math.abs(file.bpm - placeholder.metadata.tempo) / placeholder.metadata.tempo
        if (bpmDiff < 0.05) {
          score += 40
          reasons.push(`Matching BPM (${file.bpm})`)
        } else if (bpmDiff < 0.1) {
          score += 20
          reasons.push(`Similar BPM (${file.bpm})`)
        }
      }

      // Key compatibility (if available)
      if (file.key && placeholder.metadata?.key !== undefined && typeof file.key === 'number' && typeof placeholder.metadata.key === 'number') {
        const keyDiff = Math.abs(file.key - placeholder.metadata.key)
        if (keyDiff === 0 || keyDiff === 7) { // Same key or perfect fifth
          score += 30
          reasons.push('Compatible key')
        }
      }

      // Name/artist similarity
      const placeholderText = `${placeholder.name} ${placeholder.artist}`.toLowerCase()
      const fileText = `${file.name} ${file.artist}`.toLowerCase()
      
      // Check for common words
      const placeholderWords = placeholderText.split(/\s+/).filter(w => w.length > 2)
      const fileWords = fileText.split(/\s+/).filter(w => w.length > 2)
      const commonWords = placeholderWords.filter(w => fileWords.includes(w))
      
      if (commonWords.length > 0) {
        score += commonWords.length * 10
        reasons.push(`Similar name/artist`)
      }

      return { source: file, matchScore: score, matchReasons: reasons }
    })

    // Sort by score and take top candidates
    const topCandidates = scored
      .filter(c => c.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10)

    setCandidates(topCandidates)
  }

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      findBestMatches(localFiles)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = localFiles.filter(file => 
      file.name.toLowerCase().includes(query) ||
      file.artist.toLowerCase().includes(query)
    )

    findBestMatches(filtered)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('audio/')) continue

      try {
        const audioUrl = URL.createObjectURL(file)
        const audio = new Audio(audioUrl)
        
        await new Promise((resolve) => {
          audio.addEventListener('loadedmetadata', resolve)
        })
        
        const audioSource: AudioSource = {
          id: crypto.randomUUID(),
          type: 'local',
          name: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Unknown Artist',
          duration: audio.duration,
          audioUrl: audioUrl,
          isEditable: true,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          }
        }
        
        await audioFileDB.saveFile(file, audioSource)
        
        // Refresh files list
        await loadLocalFiles()
        
        URL.revokeObjectURL(audioUrl)
        
        // Auto-select if it's a good match
        if (Math.abs(audio.duration - placeholder.duration) / placeholder.duration < 0.2) {
          setSelectedFile(audioSource)
        }
      } catch (error) {
        console.error('Error processing audio file:', error)
      }
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400'
    if (score >= 40) return 'text-yellow-400'
    return 'text-gray-400'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Replace className="w-5 h-5" />
              Replace Placeholder Track
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Find a local file to replace the Spotify placeholder
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Original Track Info */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-600 rounded flex items-center justify-center">
              <Music className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{placeholder.name}</h3>
              <p className="text-sm text-gray-400">{placeholder.artist}</p>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                <span>Duration: {formatDuration(placeholder.duration)}</span>
                {placeholder.metadata?.tempo && <span>BPM: {Math.round(placeholder.metadata.tempo)}</span>}
                {placeholder.metadata?.key !== undefined && <span>Key: {placeholder.metadata.key}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Search & Upload */}
        <div className="mb-4">
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search your local files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 pr-3 py-2 bg-gray-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors text-sm"
            >
              Search
            </button>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-sm flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>

          {showUpload && (
            <div className="bg-gray-700 rounded-lg p-3 mb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-6 border-2 border-dashed border-gray-600 rounded-lg hover:border-gray-500 transition-colors"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-400">Click to upload audio files</p>
                <p className="text-xs text-gray-500 mt-1">Files with similar duration will be auto-selected</p>
              </button>
            </div>
          )}
        </div>

        {/* Candidates List */}
        <div className="flex-1 overflow-y-auto">
          {candidates.length > 0 ? (
            <div className="space-y-2">
              {candidates.map((candidate) => (
                <div
                  key={candidate.source.id}
                  onClick={() => setSelectedFile(candidate.source)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedFile?.id === candidate.source.id
                      ? 'bg-purple-600 ring-2 ring-purple-400'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded flex items-center justify-center ${
                        selectedFile?.id === candidate.source.id ? 'bg-purple-700' : 'bg-gray-600'
                      }`}>
                        <Music className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium">{candidate.source.name}</div>
                        <div className="text-sm text-gray-400">{candidate.source.artist}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {candidate.matchReasons.map((reason, i) => (
                            <span key={i} className="text-xs bg-gray-600 px-2 py-0.5 rounded">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getMatchScoreColor(candidate.matchScore)}`}>
                        {candidate.matchScore}%
                      </div>
                      <div className="text-xs text-gray-400">match</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm mb-2">No matching files found</p>
              <p className="text-xs">Try uploading a file with similar duration</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedFile && onReplace(selectedFile)}
            disabled={!selectedFile}
            className={`px-4 py-2 rounded transition-colors flex items-center gap-2 ${
              selectedFile
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            Replace with Selected
          </button>
        </div>
      </div>
    </div>
  )
}