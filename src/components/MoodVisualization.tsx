// Mood Visualization Component - Displays mood analysis and energy curves
import React, { useMemo } from 'react'
import { 
  Heart, Zap, TrendingUp, Activity, Volume2, 
  Smile, Frown, Music, Sun, Moon,
  Wind, Mountain
} from 'lucide-react'
import { MoodFeatures, MoodType } from '../lib/moodAnalysis'

interface MoodVisualizationProps {
  moodFeatures: MoodFeatures
  className?: string
}

export const MoodVisualization: React.FC<MoodVisualizationProps> = ({
  moodFeatures,
  className = ''
}) => {
  const moodIconMap: Record<MoodType, React.ComponentType<{ className?: string }>> = {
    happy: Smile,
    sad: Frown,
    angry: Mountain,
    calm: Activity,
    energetic: Zap,
    melancholic: Moon,
    euphoric: Sun,
    aggressive: Mountain,
    peaceful: Wind,
    tense: Activity,
    romantic: Heart,
    mysterious: Moon,
    uplifting: TrendingUp,
    dark: Moon,
    playful: Sun,
    serious: Mountain,
    nostalgic: Heart,
    futuristic: Zap
  }

  const getMoodColor = (mood: MoodType): string => {
    const moodColors: Record<MoodType, string> = {
      happy: 'text-yellow-400',
      sad: 'text-blue-400',
      angry: 'text-red-400',
      calm: 'text-green-400',
      energetic: 'text-orange-400',
      melancholic: 'text-indigo-400',
      euphoric: 'text-pink-400',
      aggressive: 'text-red-500',
      peaceful: 'text-blue-300',
      tense: 'text-yellow-500',
      romantic: 'text-pink-300',
      mysterious: 'text-purple-400',
      uplifting: 'text-cyan-400',
      dark: 'text-gray-400',
      playful: 'text-green-300',
      serious: 'text-gray-500',
      nostalgic: 'text-amber-400',
      futuristic: 'text-cyan-300'
    }
    return moodColors[mood] || 'text-gray-400'
  }

  const getValenceLabel = (valence: number): { label: string; color: string } => {
    if (valence > 0.3) return { label: 'Positive', color: 'text-green-400' }
    if (valence < -0.3) return { label: 'Negative', color: 'text-red-400' }
    return { label: 'Neutral', color: 'text-gray-400' }
  }

  const getArousalLabel = (arousal: number): { label: string; color: string } => {
    if (arousal > 0.7) return { label: 'High Energy', color: 'text-orange-400' }
    if (arousal > 0.4) return { label: 'Medium Energy', color: 'text-yellow-400' }
    return { label: 'Low Energy', color: 'text-blue-400' }
  }

  // Prepare energy curve visualization data
  const energyVisualizationData = useMemo(() => {
    if (!moodFeatures.energyCurve?.energy) return null

    const { energy, timestamps, smoothedEnergy } = moodFeatures.energyCurve
    const maxDataPoints = 100 // Limit for visualization performance
    const step = Math.max(1, Math.floor(energy.length / maxDataPoints))
    
    return {
      timestamps: timestamps.filter((_, i) => i % step === 0),
      energy: energy.filter((_, i) => i % step === 0),
      smoothedEnergy: smoothedEnergy.filter((_, i) => i % step === 0)
    }
  }, [moodFeatures.energyCurve])

  // Format percentage
  const formatPercent = (value: number): string => `${Math.round(value * 100)}%`

  // Format confidence
  const formatConfidence = (confidence: number): string => {
    if (confidence > 0.8) return 'Very High'
    if (confidence > 0.6) return 'High' 
    if (confidence > 0.4) return 'Medium'
    return 'Low'
  }

  const PrimaryMoodIcon = moodIconMap[moodFeatures.primaryMood] || Music
  const SecondaryMoodIcon = moodFeatures.secondaryMood ? moodIconMap[moodFeatures.secondaryMood] : null

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Primary Mood Display */}
      <div className="bg-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Mood Analysis</h3>
          <div className="text-sm text-gray-400">
            Confidence: <span className="text-purple-400">{formatConfidence(moodFeatures.moodConfidence)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Primary Mood */}
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full bg-gray-600 ${getMoodColor(moodFeatures.primaryMood)}`}>
              <PrimaryMoodIcon className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xl font-semibold capitalize">{moodFeatures.primaryMood}</div>
              <div className="text-sm text-gray-400">Primary Mood</div>
            </div>
          </div>

          {/* Secondary Mood */}
          {moodFeatures.secondaryMood && SecondaryMoodIcon && (
            <>
              <div className="text-gray-500">+</div>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full bg-gray-600 ${getMoodColor(moodFeatures.secondaryMood)}`}>
                  <SecondaryMoodIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-lg font-medium capitalize">{moodFeatures.secondaryMood}</div>
                  <div className="text-sm text-gray-400">Secondary</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Emotional Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Valence */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-pink-400" />
            <span className="font-medium">Valence</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Pleasantness</span>
              <span className={`font-semibold ${getValenceLabel(moodFeatures.valence).color}`}>
                {getValenceLabel(moodFeatures.valence).label}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-red-500 via-gray-500 to-green-500 h-2 rounded-full relative"
              >
                <div 
                  className="absolute top-0 w-2 h-2 bg-white rounded-full border-2 border-gray-800 transform -translate-x-1"
                  style={{ left: `${((moodFeatures.valence + 1) / 2) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Negative</span>
              <span>Neutral</span>
              <span>Positive</span>
            </div>
          </div>
        </div>

        {/* Arousal */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-orange-400" />
            <span className="font-medium">Arousal</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Energy Level</span>
              <span className={`font-semibold ${getArousalLabel(moodFeatures.arousal).color}`}>
                {getArousalLabel(moodFeatures.arousal).label}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-orange-500 h-2 rounded-full"
                style={{ width: `${moodFeatures.arousal * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Calm</span>
              <span>Excited</span>
            </div>
          </div>
        </div>

        {/* Dominance */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Mountain className="w-5 h-5 text-gray-400" />
            <span className="font-medium">Dominance</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Power</span>
              <span className="font-semibold text-purple-400">
                {formatPercent(moodFeatures.dominance)}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-gray-400 to-purple-500 h-2 rounded-full"
                style={{ width: `${moodFeatures.dominance * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Submissive</span>
              <span>Dominant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Energy Curve Visualization */}
      {energyVisualizationData && (
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-green-400" />
            <h4 className="font-medium">Energy Curve</h4>
            <div className="ml-auto text-sm text-gray-400">
              Avg: {formatPercent(moodFeatures.energyCurve.avgEnergy)} | 
              Range: {formatPercent(moodFeatures.dynamicRange)}
            </div>
          </div>
          
          <div className="h-32 bg-gray-600 rounded-lg p-2 flex items-end">
            {energyVisualizationData.smoothedEnergy.map((energy, index) => {
              const height = Math.max(2, energy * 100)
              const isHighEnergy = energy > moodFeatures.energyCurve.avgEnergy * 1.2
              
              return (
                <div
                  key={index}
                  className={`flex-1 mx-px rounded-t transition-all duration-200 ${
                    isHighEnergy ? 'bg-orange-400' : 'bg-green-400'
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${Math.round(energyVisualizationData.timestamps[index])}s: ${formatPercent(energy)}`}
                />
              )
            })}
          </div>
          
          {/* Energy Pattern Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-400">
                {moodFeatures.energyCurve.buildups.length}
              </div>
              <div className="text-xs text-gray-400">Buildups</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-400">
                {moodFeatures.energyCurve.drops.length}
              </div>
              <div className="text-xs text-gray-400">Drops</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-400">
                {moodFeatures.energyCurve.peaks.length}
              </div>
              <div className="text-xs text-gray-400">Peaks</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-400">
                {moodFeatures.energyCurve.plateaus.length}
              </div>
              <div className="text-xs text-gray-400">Plateaus</div>
            </div>
          </div>
        </div>
      )}

      {/* Emotional Texture */}
      <div className="bg-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h4 className="font-medium">Emotional Texture</h4>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(moodFeatures.emotional_texture).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-2">
                <div className="absolute inset-0 bg-gray-600 rounded-full"></div>
                <div 
                  className="absolute inset-0 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-full"
                  style={{ 
                    clipPath: `inset(${100 - (value * 100)}% 0 0 0)`,
                    transition: 'clip-path 0.3s ease-in-out'
                  }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                  {formatPercent(value)}
                </div>
              </div>
              <div className="text-sm capitalize font-medium">{key}</div>
              <div className="text-xs text-gray-400">
                {value > 0.7 ? 'High' : value > 0.4 ? 'Medium' : 'Low'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Genre Emotional Markers */}
      <div className="bg-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-5 h-5 text-purple-400" />
          <h4 className="font-medium">Genre Characteristics</h4>
        </div>
        
        <div className="space-y-3">
          {Object.entries(moodFeatures.genreEmotionalMarkers).map(([key, value]) => {
            const getMarkerColor = (val: number): string => {
              if (val > 0.7) return 'bg-green-500'
              if (val > 0.4) return 'bg-yellow-500' 
              return 'bg-gray-500'
            }
            
            return (
              <div key={key} className="flex items-center gap-3">
                <div className="w-20 text-sm capitalize font-medium">{key}</div>
                <div className="flex-1 bg-gray-600 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getMarkerColor(value)}`}
                    style={{ width: `${value * 100}%` }}
                  />
                </div>
                <div className="w-12 text-sm text-right font-mono text-purple-400">
                  {formatPercent(value)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mood Progression Timeline */}
      {moodFeatures.moodProgression && moodFeatures.moodProgression.length > 0 && (
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <h4 className="font-medium">Mood Progression</h4>
          </div>
          
          <div className="space-y-2">
            {moodFeatures.moodProgression.map((segment, index) => {
              const MoodIcon = moodIconMap[segment.mood] || Music
              const duration = segment.endTime - segment.startTime
              const widthPercent = Math.max(10, (duration / moodFeatures.moodProgression[moodFeatures.moodProgression.length - 1].endTime) * 100)
              
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="text-xs text-gray-400 w-12">
                    {Math.round(segment.startTime)}s
                  </div>
                  <div 
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getMoodColor(segment.mood)} bg-gray-600`}
                    style={{ width: `${widthPercent}%` }}
                  >
                    <MoodIcon className="w-4 h-4" />
                    <span className="text-sm capitalize font-medium">{segment.mood}</span>
                    <span className="text-xs opacity-75">
                      {formatPercent(segment.confidence)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}