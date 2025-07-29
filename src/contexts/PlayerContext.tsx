import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer'
import { useEnhancedPlayer } from '../hooks/useEnhancedPlayer'
import { CrossfaderEngine, CrossfaderCurve, TransitionType } from '../lib/crossfaderEngine'
import { MixRecorder } from '../lib/mixRecorder'

interface PlayerContextType {
  deckA: ReturnType<typeof useSpotifyPlayer>
  deckB: ReturnType<typeof useSpotifyPlayer>
  crossfaderPosition: number
  setCrossfaderPosition: (position: number) => void
  masterVolume: number
  setMasterVolume: (volume: number) => void
  channelAVolume: number
  setChannelAVolume: (volume: number) => void
  channelBVolume: number
  setChannelBVolume: (volume: number) => void
  setCrossfaderCurve: (curve: CrossfaderCurve) => void
  performTransition: (type: TransitionType, duration?: number) => Promise<void>
  getMixLevels: () => { deckA: number, deckB: number }
  mixRecorder: MixRecorder | null
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export const usePlayer = () => {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider')
  }
  return context
}

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deckA = useSpotifyPlayer('Deck A')
  const deckB = useSpotifyPlayer('Deck B')
  const [crossfaderPosition, setCrossfaderPosition] = useState(0)
  const [masterVolume, setMasterVolume] = useState(75)
  const [channelAVolume, setChannelAVolume] = useState(75)
  const [channelBVolume, setChannelBVolume] = useState(75)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const crossfaderEngineRef = useRef<CrossfaderEngine | null>(null)
  const mixRecorderRef = useRef<MixRecorder | null>(null)

  // Initialize crossfader engine and mix recorder
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      crossfaderEngineRef.current = new CrossfaderEngine(audioContextRef.current)
      mixRecorderRef.current = new MixRecorder(audioContextRef.current)
      
      // Connect mix recorder to the crossfader engine's master output
      if (crossfaderEngineRef.current && mixRecorderRef.current) {
        const masterOutput = crossfaderEngineRef.current.getMasterOutput()
        mixRecorderRef.current.connectSource(masterOutput)
      }
    }
    
    return () => {
      if (crossfaderEngineRef.current) {
        crossfaderEngineRef.current.disconnect()
      }
      if (mixRecorderRef.current) {
        mixRecorderRef.current.disconnect()
      }
    }
  }, [])
  
  // Apply crossfader and channel volume logic
  useEffect(() => {
    if (crossfaderEngineRef.current) {
      crossfaderEngineRef.current.setCrossfaderPosition(crossfaderPosition)
      crossfaderEngineRef.current.setChannelVolume('A', channelAVolume)
      crossfaderEngineRef.current.setChannelVolume('B', channelBVolume)
    }
    
    // For Spotify SDK players (without Web Audio integration)
    // Crossfader at -50 = full A, 0 = both, +50 = full B
    const crossfaderA = crossfaderPosition <= 0 ? 1 : Math.max(0, 1 - (crossfaderPosition / 50))
    const crossfaderB = crossfaderPosition >= 0 ? 1 : Math.max(0, 1 + (crossfaderPosition / 50))
    
    // Apply all volume controls: channel volume * crossfader * master
    const finalAVolume = (channelAVolume / 100) * crossfaderA * (masterVolume / 100) * 100
    const finalBVolume = (channelBVolume / 100) * crossfaderB * (masterVolume / 100) * 100
    
    console.log('Volume calculations:', { 
      channelAVolume, channelBVolume, crossfaderPosition, masterVolume,
      crossfaderA, crossfaderB, finalAVolume, finalBVolume 
    })
    
    deckA.setVolume(finalAVolume)
    deckB.setVolume(finalBVolume)
  }, [crossfaderPosition, masterVolume, channelAVolume, channelBVolume, deckA, deckB])
  
  // Crossfader control methods
  const setCrossfaderCurve = (curve: CrossfaderCurve) => {
    if (crossfaderEngineRef.current) {
      crossfaderEngineRef.current.setCrossfaderCurve(curve)
    }
  }
  
  const performTransition = async (type: TransitionType, duration?: number) => {
    if (crossfaderEngineRef.current) {
      await crossfaderEngineRef.current.performTransition(type, duration)
      // Update state to reflect new position
      const newPosition = crossfaderPosition > 0 ? -50 : 50
      setCrossfaderPosition(newPosition)
    }
  }
  
  const getMixLevels = () => {
    if (crossfaderEngineRef.current) {
      return crossfaderEngineRef.current.getMixLevels()
    }
    return { deckA: channelAVolume / 100, deckB: channelBVolume / 100 }
  }

  return (
    <PlayerContext.Provider value={{
      deckA,
      deckB,
      crossfaderPosition,
      setCrossfaderPosition,
      masterVolume,
      setMasterVolume,
      channelAVolume,
      setChannelAVolume,
      channelBVolume,
      setChannelBVolume,
      setCrossfaderCurve,
      performTransition,
      getMixLevels,
      mixRecorder: mixRecorderRef.current
    }}>
      {children}
    </PlayerContext.Provider>
  )
}