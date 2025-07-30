import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Mic, Square, Pause, Play, Download, Save } from 'lucide-react'
import { MixRecorder as MixRecorderEngine, RecordingState, MixMetadata } from '../lib/mixRecorder'
import { usePlayer } from '../contexts/PlayerContext'
import { useNotifications } from '../hooks/useNotifications'

interface TracklistEntry {
  time: number
  trackName: string
  artist: string
}

export const MixRecorder: React.FC = () => {
  const { deckA, deckB } = usePlayer()
  const { notifyMixComplete } = useNotifications()
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    peakLevel: 0
  })
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [mixTitle, setMixTitle] = useState('')
  const [mixArtist, setMixArtist] = useState('DJ Studio Mix')
  const [tracklist, setTracklist] = useState<TracklistEntry[]>([])
  const [showExportDialog, setShowExportDialog] = useState(false)
  
  const recorderRef = useRef<MixRecorderEngine | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  
  // Initialize recorder
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      recorderRef.current = new MixRecorderEngine(audioContextRef.current)
      
      // Set up state monitoring
      recorderRef.current.onStateChanged((state) => {
        setRecordingState(state)
      })
      
      recorderRef.current.onDataReady((blob) => {
        setRecordedBlob(blob)
      })
    }
    
    return () => {
      if (recorderRef.current) {
        recorderRef.current.disconnect()
      }
    }
  }, [])
  
  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const hours = Math.floor(mins / 60)
    const displayMins = mins % 60
    
    if (hours > 0) {
      return `${hours}:${displayMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${displayMins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Start recording
  const handleStartRecording = async () => {
    if (!recorderRef.current || !audioContextRef.current) return
    
    try {
      // Clear previous recording
      setRecordedBlob(null)
      setTracklist([])
      
      // Connect to master output (this would need to be connected to the actual master bus)
      // For now, we'll create a dummy connection
      const masterGain = audioContextRef.current.createGain()
      recorderRef.current.connectSource(masterGain)
      
      // Start recording
      await recorderRef.current.startRecording({
        format: 'wav',
        quality: 0.9,
        normalizeAudio: true
      })
      
      // Add current tracks to tracklist if playing
      const currentTime = 0
      if (deckA.playerState.isPlaying && deckA.playerState.currentTrack) {
        setTracklist([{
          time: currentTime,
          trackName: deckA.playerState.currentTrack.name,
          artist: deckA.playerState.currentTrack.artists[0]?.name || 'Unknown'
        }])
      } else if (deckB.playerState.isPlaying && deckB.playerState.currentTrack) {
        setTracklist([{
          time: currentTime,
          trackName: deckB.playerState.currentTrack.name,
          artist: deckB.playerState.currentTrack.artists[0]?.name || 'Unknown'
        }])
      }
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }
  
  // Stop recording
  const handleStopRecording = async () => {
    if (!recorderRef.current) return
    
    try {
      const blob = await recorderRef.current.stopRecording()
      setRecordedBlob(blob)
      setShowExportDialog(true)
      
      // Send notification that mix is complete
      const mixName = mixTitle || `Mix ${new Date().toLocaleDateString()}`
      await notifyMixComplete(mixName)
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }
  }
  
  // Pause/Resume recording
  const handlePauseResume = () => {
    if (!recorderRef.current) return
    
    if (recordingState.isPaused) {
      recorderRef.current.resumeRecording()
    } else {
      recorderRef.current.pauseRecording()
    }
  }
  
  // Add track to tracklist
  const handleAddTrack = useCallback(() => {
    if (!recordingState.isRecording) return
    
    // Check which deck is playing
    let trackInfo: TracklistEntry | null = null
    
    if (deckA.playerState.isPlaying && deckA.playerState.currentTrack) {
      trackInfo = {
        time: recordingState.duration,
        trackName: deckA.playerState.currentTrack.name,
        artist: deckA.playerState.currentTrack.artists[0]?.name || 'Unknown'
      }
    } else if (deckB.playerState.isPlaying && deckB.playerState.currentTrack) {
      trackInfo = {
        time: recordingState.duration,
        trackName: deckB.playerState.currentTrack.name,
        artist: deckB.playerState.currentTrack.artists[0]?.name || 'Unknown'
      }
    }
    
    if (trackInfo) {
      setTracklist(prev => [...prev, trackInfo!])
    }
  }, [recordingState, deckA, deckB])
  
  // Export recording
  const handleExport = async () => {
    if (!recordedBlob || !recorderRef.current) return
    
    const metadata: MixMetadata = {
      title: mixTitle || `Mix ${new Date().toLocaleDateString()}`,
      artist: mixArtist,
      date: new Date(),
      tracklist
    }
    
    // Export with metadata
    const finalBlob = await recorderRef.current.exportRecording(recordedBlob, metadata, {
      format: 'wav',
      quality: 0.9,
      normalizeAudio: true
    })
    
    // Download
    const filename = recorderRef.current.generateFilename(metadata, 'wav')
    recorderRef.current.downloadRecording(finalBlob, filename)
    
    // Reset
    setShowExportDialog(false)
    setMixTitle('')
    setTracklist([])
  }
  
  // Calculate level meter width
  const levelWidth = recordingState.peakLevel * 100
  
  return (
    <>
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Mic className="w-5 h-5 text-red-500" />
          Mix Recorder
        </h3>
        
        {/* Recording Controls */}
        <div className="flex items-center gap-2 mb-4">
          {!recordingState.isRecording ? (
            <button
              onClick={handleStartRecording}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Mic className="w-4 h-4" />
              Record
            </button>
          ) : (
            <>
              <button
                onClick={handleStopRecording}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
              <button
                onClick={handlePauseResume}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                {recordingState.isPaused ? (
                  <><Play className="w-4 h-4" /> Resume</>
                ) : (
                  <><Pause className="w-4 h-4" /> Pause</>
                )}
              </button>
            </>
          )}
          
          {recordedBlob && !recordingState.isRecording && (
            <button
              onClick={() => setShowExportDialog(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}
        </div>
        
        {/* Recording Status */}
        {recordingState.isRecording && (
          <div className="space-y-3">
            {/* Timer */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Duration:</span>
              <span className="font-mono text-xl">
                {formatTime(recordingState.duration)}
              </span>
            </div>
            
            {/* Level Meter */}
            <div>
              <div className="text-sm text-gray-400 mb-1">Level:</div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all duration-100"
                  style={{ width: `${levelWidth}%` }}
                />
              </div>
            </div>
            
            {/* Add Track Button */}
            <button
              onClick={handleAddTrack}
              className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              Add Current Track to Tracklist
            </button>
          </div>
        )}
        
        {/* Tracklist Preview */}
        {tracklist.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-400 mb-2">Tracklist:</h4>
            <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {tracklist.map((track, index) => (
                <div key={index} className="text-gray-300">
                  {formatTime(track.time)} - {track.artist} - {track.trackName}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Export Dialog */}
      {showExportDialog && recordedBlob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Export Mix</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Mix Title</label>
                <input
                  type="text"
                  value={mixTitle}
                  onChange={(e) => setMixTitle(e.target.value)}
                  placeholder="My Awesome Mix"
                  className="w-full px-3 py-2 bg-gray-700 rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Artist/DJ Name</label>
                <input
                  type="text"
                  value={mixArtist}
                  onChange={(e) => setMixArtist(e.target.value)}
                  placeholder="DJ Name"
                  className="w-full px-3 py-2 bg-gray-700 rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Duration</label>
                <div className="text-white">{formatTime(recordingState.duration)}</div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Format</label>
                <div className="text-white">WAV (High Quality)</div>
              </div>
              
              {/* Tracklist */}
              {tracklist.length > 0 && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tracklist</label>
                  <div className="bg-gray-700 rounded-lg p-3 max-h-40 overflow-y-auto text-xs space-y-1">
                    {tracklist.map((track, index) => (
                      <div key={index} className="text-gray-300">
                        {formatTime(track.time)} - {track.artist} - {track.trackName}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleExport}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Mix
              </button>
              <button
                onClick={() => setShowExportDialog(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}