import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Radio, Music, Upload, Play, Pause, SkipBack, Save, 
  Download, Settings, Plus, Trash2, Volume2, Clock,
  Layers, Scissors, Copy
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Timeline } from './MixStudio/Timeline'
import { AudioSourceBrowser } from './MixStudio/AudioSourceBrowser'
import { MixProject, AudioClip } from '../types/mixStudio'
import { mixProjectDB } from '../lib/mixProjectDatabase'
import { mixStudioAudioEngine } from '../lib/mixStudioAudioEngine'

export const MixStudio: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [project, setProject] = useState<MixProject>({
    id: crypto.randomUUID(),
    name: 'Untitled Mix',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    bpm: 128,
    duration: 300, // 5 minutes default
    tracks: [
      { id: '1', name: 'Track 1', clips: [], volume: 0.75, pan: 0, isMuted: false, isSolo: false, effects: [] },
      { id: '2', name: 'Track 2', clips: [], volume: 0.75, pan: 0, isMuted: false, isSolo: false, effects: [] },
      { id: '3', name: 'Track 3', clips: [], volume: 0.75, pan: 0, isMuted: false, isSolo: false, effects: [] },
    ],
    masterVolume: 1
  })
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [selectedTool, setSelectedTool] = useState<'select' | 'split' | 'fade'>('select')
  const [showSourceBrowser, setShowSourceBrowser] = useState(true)
  const [zoom, setZoom] = useState(1)
  const animationFrameRef = useRef<number | null>(null)
  
  // Initialize audio engine
  useEffect(() => {
    mixStudioAudioEngine.init()
    
    return () => {
      mixStudioAudioEngine.stop()
    }
  }, [])
  
  // Update time during playback
  useEffect(() => {
    if (isPlaying) {
      const updateTime = () => {
        const time = mixStudioAudioEngine.getCurrentTime()
        setCurrentTime(time)
        
        if (time < project.duration) {
          animationFrameRef.current = requestAnimationFrame(updateTime)
        } else {
          // Reached end
          setIsPlaying(false)
          mixStudioAudioEngine.stop()
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(updateTime)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, project.duration])
  
  // Update track settings in audio engine
  useEffect(() => {
    project.tracks.forEach(track => {
      mixStudioAudioEngine.updateTrackSettings(
        track.id,
        track.volume,
        track.pan || 0,
        track.isMuted,
        track.isSolo
      )
    })
  }, [project.tracks])
  
  // Update master volume
  useEffect(() => {
    mixStudioAudioEngine.setMasterVolume(project.masterVolume || 1)
  }, [project.masterVolume])
  
  // Transport controls
  const handlePlayPause = async () => {
    if (isPlaying) {
      mixStudioAudioEngine.pause()
    } else {
      await mixStudioAudioEngine.play(project, currentTime)
    }
    setIsPlaying(!isPlaying)
  }
  
  const handleStop = () => {
    mixStudioAudioEngine.stop()
    setIsPlaying(false)
    setCurrentTime(0)
  }
  
  const handleRewind = () => {
    mixStudioAudioEngine.seek(0)
    setCurrentTime(0)
  }
  
  // Project management
  const handleSaveProject = async () => {
    try {
      await mixProjectDB.saveProject(project)
      console.log('Project saved:', project.name)
    } catch (error) {
      console.error('Error saving project:', error)
    }
  }
  
  const handleNewProject = () => {
    if (window.confirm('Create new project? Unsaved changes will be lost.')) {
      setProject({
        id: crypto.randomUUID(),
        name: 'Untitled Mix',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        bpm: 128,
        duration: 300,
        tracks: [
          { id: '1', name: 'Track 1', clips: [], volume: 0.75, pan: 0, isMuted: false, isSolo: false, effects: [] },
          { id: '2', name: 'Track 2', clips: [], volume: 0.75, pan: 0, isMuted: false, isSolo: false, effects: [] },
          { id: '3', name: 'Track 3', clips: [], volume: 0.75, pan: 0, isMuted: false, isSolo: false, effects: [] },
        ],
        masterVolume: 1
      })
      setCurrentTime(0)
    }
  }
  
  // Timeline callbacks
  const handleClipAdd = (trackId: string, clip: AudioClip) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => 
        track.id === trackId 
          ? { ...track, clips: [...track.clips, clip] }
          : track
      ),
      updatedAt: Date.now()
    }))
  }
  
  const handleClipUpdate = (trackId: string, clipId: string, updates: Partial<AudioClip>) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => 
        track.id === trackId 
          ? {
              ...track,
              clips: track.clips.map(clip => 
                clip.id === clipId ? { ...clip, ...updates } : clip
              )
            }
          : track
      ),
      updatedAt: Date.now()
    }))
  }
  
  const handleClipDelete = (trackId: string, clipId: string) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => 
        track.id === trackId 
          ? { ...track, clips: track.clips.filter(clip => clip.id !== clipId) }
          : track
      ),
      updatedAt: Date.now()
    }))
  }
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 hover:text-purple-400 transition-colors"
            >
              <Radio className="w-5 h-5" />
              <span className="font-semibold">DJ Mode</span>
            </button>
            <div className="text-gray-500">|</div>
            <div className="flex items-center gap-2 text-purple-400">
              <Layers className="w-5 h-5" />
              <span className="font-semibold">Mix Studio</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewProject}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="New Project"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={handleSaveProject}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Save Project"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Export Mix"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      
      {/* Transport Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRewind}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={handlePlayPause}
              className="p-3 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            
            <div className="ml-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="font-mono text-sm">
                {formatTime(currentTime)} / {formatTime(project.duration)}
              </span>
            </div>
            
            <div className="ml-4 flex items-center gap-2">
              <span className="text-sm text-gray-400">BPM:</span>
              <input
                type="number"
                value={project.bpm}
                onChange={(e) => setProject(prev => ({ ...prev, bpm: parseInt(e.target.value) || 120 }))}
                className="w-16 px-2 py-1 bg-gray-700 rounded text-sm"
                min="60"
                max="200"
              />
            </div>
          </div>
          
          {/* Tools */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedTool('select')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'select' ? 'bg-purple-600' : 'hover:bg-gray-700'
              }`}
              title="Select Tool"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              </svg>
            </button>
            <button
              onClick={() => setSelectedTool('split')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'split' ? 'bg-purple-600' : 'hover:bg-gray-700'
              }`}
              title="Split Tool"
            >
              <Scissors className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedTool('fade')}
              className={`p-2 rounded transition-colors ${
                selectedTool === 'fade' ? 'bg-purple-600' : 'hover:bg-gray-700'
              }`}
              title="Fade Tool"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17h18v2H3zm0-7h3v7H3zm5 0h3v7H8zm5 0h3v7h-3zm5 0h3v7h-3z" opacity="0.5" />
              </svg>
            </button>
          </div>
          
          {/* Zoom */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Zoom:</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-24"
            />
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Timeline */}
        <div className="flex-1 flex flex-col">
          <Timeline
            project={project}
            currentTime={currentTime}
            zoom={zoom}
            selectedTool={selectedTool}
            isPlaying={isPlaying}
            onTimeUpdate={(time) => {
              setCurrentTime(time)
              if (!isPlaying) {
                mixStudioAudioEngine.seek(time)
              }
            }}
            onClipAdd={handleClipAdd}
            onClipUpdate={handleClipUpdate}
            onClipDelete={handleClipDelete}
            onTrackUpdate={(trackId, updates) => {
              setProject(prev => ({
                ...prev,
                tracks: prev.tracks.map(track => 
                  track.id === trackId ? { ...track, ...updates } : track
                )
              }))
            }}
          />
        </div>
        
        {/* Source Browser */}
        {showSourceBrowser && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold">Audio Sources</h3>
              <button
                onClick={() => setShowSourceBrowser(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <AudioSourceBrowser
              onTrackSelect={(source) => {
                console.log('Selected audio source:', source)
                // This will be handled by drag & drop to timeline
              }}
            />
          </div>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-1 text-xs text-gray-400">
        <div className="flex items-center justify-between">
          <span>Project: {project.name}</span>
          <span>Last saved: {new Date(project.updatedAt).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  )
}