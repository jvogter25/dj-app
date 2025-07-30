import React from 'react'
import { Volume2 } from 'lucide-react'
import { EnhancedSlider, EnhancedFader } from './EnhancedSlider'

interface MixerProps {
  crossfaderPosition: number
  onCrossfaderChange: (position: number) => void
  channelAVolume: number
  channelBVolume: number
  onChannelVolumeChange: (channel: 'A' | 'B', volume: number) => void
  masterVolume: number
  onMasterVolumeChange: (volume: number) => void
}

export const Mixer: React.FC<MixerProps> = ({
  crossfaderPosition,
  onCrossfaderChange,
  channelAVolume,
  channelBVolume,
  onChannelVolumeChange,
  masterVolume,
  onMasterVolumeChange
}) => {
  // Enhanced components handle gestures internally

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4 text-center">Mixer</h2>
      
      {/* Channel Faders */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Channel A */}
        <EnhancedFader
          min={0}
          max={100}
          value={channelAVolume}
          onChange={(value) => onChannelVolumeChange('A', Math.round(value))}
          sensitivity={0.5}
          height={160}
          color="blue"
          label="Channel A"
          title="Channel A volume - supports click-and-drag and trackpad gestures"
        />
        
        {/* Channel B */}
        <EnhancedFader
          min={0}
          max={100}
          value={channelBVolume}
          onChange={(value) => onChannelVolumeChange('B', Math.round(value))}
          sensitivity={0.5}
          height={160}
          color="green"
          label="Channel B"
          title="Channel B volume - supports click-and-drag and trackpad gestures"
        />
      </div>
      
      {/* Crossfader */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="mb-2 text-center text-white font-semibold">Crossfader</div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>A</span>
          <span>B</span>
        </div>
        <EnhancedSlider
          min={-50}
          max={50}
          value={crossfaderPosition}
          onChange={(value) => onCrossfaderChange(Math.round(value))}
          sensitivity={0.8}
          className="h-3"
          title="Crossfader - supports click-and-drag and trackpad gestures"
        />
      </div>
      
      {/* Master Output */}
      <div className="mt-4">
        <div className="flex items-center justify-center gap-2 text-white mb-2">
          <Volume2 className="w-5 h-5" />
          <span className="font-semibold">Master Output</span>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="max-w-xs mx-auto">
            <EnhancedSlider
              min={0}
              max={100}
              value={masterVolume}
              onChange={(value) => onMasterVolumeChange(Math.round(value))}
              sensitivity={0.5}
              className="h-3 mb-2"
              title="Master volume - supports click-and-drag and trackpad gestures"
            />
            <div className="text-center text-sm text-gray-400">{masterVolume}%</div>
          </div>
        </div>
      </div>
    </div>
  )
}