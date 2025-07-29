import React from 'react'
import { Music, Cloud, HardDrive, Youtube, AlertCircle } from 'lucide-react'
import { AudioSource } from '../lib/enhancedAudioPlayer'

interface AudioSourceIndicatorProps {
  source?: AudioSource
  canManipulate?: boolean
  canExport?: boolean
}

export const AudioSourceIndicator: React.FC<AudioSourceIndicatorProps> = ({
  source,
  canManipulate = false,
  canExport = false
}) => {
  if (!source) return null
  
  const getSourceIcon = () => {
    switch (source) {
      case 'spotify':
        return <Music className="w-4 h-4" />
      case 'soundcloud':
        return <Cloud className="w-4 h-4" />
      case 'local':
        return <HardDrive className="w-4 h-4" />
      case 'youtube':
        return <Youtube className="w-4 h-4" />
      default:
        return <Music className="w-4 h-4" />
    }
  }
  
  const getSourceColor = () => {
    switch (source) {
      case 'spotify':
        return 'bg-green-600'
      case 'soundcloud':
        return 'bg-orange-600'
      case 'local':
        return 'bg-blue-600'
      case 'youtube':
        return 'bg-red-600'
      default:
        return 'bg-gray-600'
    }
  }
  
  const getSourceName = () => {
    switch (source) {
      case 'spotify':
        return 'Spotify'
      case 'soundcloud':
        return 'SoundCloud'
      case 'local':
        return 'Local File'
      case 'youtube':
        return 'YouTube'
      default:
        return 'Unknown'
    }
  }
  
  return (
    <div className="flex items-center gap-2">
      <div className={`${getSourceColor()} p-1 rounded flex items-center justify-center`}
           title={getSourceName()}>
        {getSourceIcon()}
      </div>
      
      <div className="flex gap-1">
        {!canManipulate && (
          <div className="bg-yellow-600/20 text-yellow-500 px-2 py-0.5 rounded text-xs flex items-center gap-1"
               title="This source doesn't support tempo control, effects, or waveform analysis">
            <AlertCircle className="w-3 h-3" />
            Limited
          </div>
        )}
        
        {!canExport && (
          <div className="bg-red-600/20 text-red-500 px-2 py-0.5 rounded text-xs"
               title="This source cannot be included in recorded mixes due to licensing">
            No Export
          </div>
        )}
      </div>
    </div>
  )
}