import React, { useState, useRef } from 'react'
import { Upload, Music, Cloud, Folder, Search } from 'lucide-react'
import { AudioSource } from '../../types/mixStudio'
import { audioFileDB } from '../../lib/audioFileDatabase'

interface AudioSourceBrowserProps {
  onTrackSelect: (source: AudioSource) => void
}

export const AudioSourceBrowser: React.FC<AudioSourceBrowserProps> = ({ onTrackSelect }) => {
  const [activeTab, setActiveTab] = useState<'local' | 'soundcloud' | 'spotify'>('local')
  const [localFiles, setLocalFiles] = useState<AudioSource[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('audio/')) continue
      
      try {
        // Create audio element to get duration
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
        
        // Save to IndexedDB
        await audioFileDB.saveFile(file, audioSource)
        
        // Add to local state
        setLocalFiles(prev => [...prev, audioSource])
        
        // Clean up
        URL.revokeObjectURL(audioUrl)
      } catch (error) {
        console.error('Error processing audio file:', error)
      }
    }
  }
  
  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Handle drag start
  const handleDragStart = (e: React.DragEvent, source: AudioSource) => {
    e.dataTransfer.setData('audio-source', JSON.stringify(source))
    e.dataTransfer.effectAllowed = 'copy'
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('local')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'local' 
              ? 'bg-gray-700 text-white border-b-2 border-purple-500' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Folder className="w-4 h-4 mx-auto mb-1" />
          Local
        </button>
        <button
          onClick={() => setActiveTab('soundcloud')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'soundcloud' 
              ? 'bg-gray-700 text-white border-b-2 border-orange-500' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Cloud className="w-4 h-4 mx-auto mb-1" />
          SoundCloud
        </button>
        <button
          onClick={() => setActiveTab('spotify')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'spotify' 
              ? 'bg-gray-700 text-white border-b-2 border-green-500' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Music className="w-4 h-4 mx-auto mb-1" />
          Spotify
        </button>
      </div>
      
      {/* Search */}
      <div className="p-3 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'local' && (
          <div className="space-y-3">
            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-8 border-2 border-dashed border-gray-600 rounded-lg hover:border-gray-500 transition-colors flex flex-col items-center gap-2"
            >
              <Upload className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-400">Click to upload audio files</span>
              <span className="text-xs text-gray-500">MP3, WAV, FLAC supported</span>
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {/* Local Files List */}
            <div className="space-y-2">
              {localFiles.map((file) => (
                <div
                  key={file.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, file)}
                  className="p-3 bg-gray-700 rounded hover:bg-gray-600 cursor-move transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{file.name}</div>
                      <div className="text-xs text-gray-400">{file.artist}</div>
                    </div>
                    <div className="text-xs text-gray-400 ml-2">
                      {formatDuration(file.duration)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'soundcloud' && (
          <div className="text-center py-8 text-gray-500">
            <Cloud className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">SoundCloud integration coming soon</p>
            <p className="text-xs mt-2">Connect your SoundCloud account to access your tracks</p>
          </div>
        )}
        
        {activeTab === 'spotify' && (
          <div className="text-center py-8 text-gray-500">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Spotify tracks for reference only</p>
            <p className="text-xs mt-2">Due to licensing, Spotify tracks cannot be edited</p>
            <p className="text-xs mt-1">Use them as placeholders and replace with local files</p>
          </div>
        )}
      </div>
    </div>
  )
}