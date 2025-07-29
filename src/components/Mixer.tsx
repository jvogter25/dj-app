import React from 'react'
import { Volume2 } from 'lucide-react'
import { useGestureControls } from '../hooks/useGestureControls'

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
  // Gesture controls for faders
  const channelAGestures = useGestureControls({
    min: 0,
    max: 100,
    value: channelAVolume,
    onChange: (value) => onChannelVolumeChange('A', value),
    sensitivity: 0.5
  })

  const channelBGestures = useGestureControls({
    min: 0,
    max: 100,
    value: channelBVolume,
    onChange: (value) => onChannelVolumeChange('B', value),
    sensitivity: 0.5
  })

  const crossfaderGestures = useGestureControls({
    min: -50,
    max: 50,
    value: crossfaderPosition,
    onChange: onCrossfaderChange,
    sensitivity: 0.8
  })

  const masterVolumeGestures = useGestureControls({
    min: 0,
    max: 100,
    value: masterVolume,
    onChange: onMasterVolumeChange,
    sensitivity: 0.5
  })

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4 text-center">Mixer</h2>
      
      {/* Channel Faders */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Channel A */}
        <div className="text-center">
          <div className="mb-2">
            <span className="text-blue-400 font-semibold">Channel A</span>
          </div>
          <div className="bg-gray-700 rounded-lg p-2 h-40 relative touch-none" {...channelAGestures()}>
            <input
              type="range"
              min="0"
              max="100"
              value={channelAVolume}
              onChange={(e) => onChannelVolumeChange('A', parseInt(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
            />
            <div className="h-full bg-gray-600 rounded relative pointer-events-none">
              <div 
                className="absolute bottom-0 w-full bg-blue-500 rounded transition-all"
                style={{ height: `${channelAVolume}%` }}
              />
              <div 
                className="absolute w-full h-4 bg-gray-300 rounded"
                style={{ bottom: `${channelAVolume}%`, transform: 'translateY(50%)' }}
              />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-400">{channelAVolume}%</div>
        </div>
        
        {/* Channel B */}
        <div className="text-center">
          <div className="mb-2">
            <span className="text-green-400 font-semibold">Channel B</span>
          </div>
          <div className="bg-gray-700 rounded-lg p-2 h-40 relative touch-none" {...channelBGestures()}>
            <input
              type="range"
              min="0"
              max="100"
              value={channelBVolume}
              onChange={(e) => onChannelVolumeChange('B', parseInt(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
            />
            <div className="h-full bg-gray-600 rounded relative pointer-events-none">
              <div 
                className="absolute bottom-0 w-full bg-green-500 rounded transition-all"
                style={{ height: `${channelBVolume}%` }}
              />
              <div 
                className="absolute w-full h-4 bg-gray-300 rounded"
                style={{ bottom: `${channelBVolume}%`, transform: 'translateY(50%)' }}
              />
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-400">{channelBVolume}%</div>
        </div>
      </div>
      
      {/* Crossfader */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="mb-2 text-center text-white font-semibold">Crossfader</div>
        <div className="relative touch-none" {...crossfaderGestures()}>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>A</span>
            <span>B</span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            value={crossfaderPosition}
            onChange={(e) => onCrossfaderChange(parseInt(e.target.value))}
            className="w-full h-3 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, 
                rgb(59, 130, 246) 0%, 
                rgb(59, 130, 246) ${50 + crossfaderPosition}%, 
                rgb(34, 197, 94) ${50 + crossfaderPosition}%, 
                rgb(34, 197, 94) 100%)`
            }}
          />
        </div>
      </div>
      
      {/* Master Output */}
      <div className="mt-4">
        <div className="flex items-center justify-center gap-2 text-white mb-2">
          <Volume2 className="w-5 h-5" />
          <span className="font-semibold">Master Output</span>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="max-w-xs mx-auto">
            <div className="touch-none" {...masterVolumeGestures()}>
              <input
                type="range"
                min="0"
                max="100"
                value={masterVolume}
                onChange={(e) => onMasterVolumeChange(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, 
                    rgb(168, 85, 247) 0%, 
                    rgb(168, 85, 247) ${masterVolume}%, 
                    rgb(75, 85, 99) ${masterVolume}%, 
                    rgb(75, 85, 99) 100%)`
                }}
              />
            </div>
            <div className="text-center mt-2 text-sm text-gray-400">{masterVolume}%</div>
          </div>
        </div>
      </div>
    </div>
  )
}