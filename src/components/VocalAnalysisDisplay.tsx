// Vocal Analysis Display Component - Shows comprehensive vocal analysis results
import React, { useMemo } from 'react'
import { 
  Mic, MicOff, Volume2, Activity, 
  Users, Music, MessageCircle, Clock, Zap
} from 'lucide-react'
import { VocalFeatures, VocalSegment } from '../lib/vocalAnalysis'

interface VocalAnalysisDisplayProps {
  vocalFeatures: VocalFeatures
  className?: string
}

export const VocalAnalysisDisplay: React.FC<VocalAnalysisDisplayProps> = ({
  vocalFeatures,
  className = ''
}) => {
  const vocalTypeColors: Record<VocalSegment['vocalType'], string> = {
    lead: 'bg-purple-500',
    harmony: 'bg-blue-500',
    backing: 'bg-green-500',
    rap: 'bg-orange-500',
    whisper: 'bg-gray-500',
    shout: 'bg-red-500'
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatPercent = (value: number): string => `${Math.round(value * 100)}%`

  const formatHz = (hz: number): string => {
    if (hz > 1000) {
      return `${(hz / 1000).toFixed(1)}kHz`
    }
    return `${Math.round(hz)}Hz`
  }

  // Prepare timeline visualization data
  const timelineData = useMemo(() => {
    if (!vocalFeatures.vocalSegments.length) return null

    const totalDuration = Math.max(
      ...vocalFeatures.vocalSegments.map(s => s.endTime),
      ...vocalFeatures.instrumentalSegments.map(s => s.endTime)
    )

    return {
      totalDuration,
      segments: vocalFeatures.vocalSegments,
      instrumental: vocalFeatures.instrumentalSegments
    }
  }, [vocalFeatures])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Vocal Detection Overview */}
      <div className="bg-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {vocalFeatures.hasVocals ? (
              <>
                <Mic className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-semibold">Vocals Detected</h3>
              </>
            ) : (
              <>
                <MicOff className="w-6 h-6 text-gray-400" />
                <h3 className="text-lg font-semibold">Instrumental Track</h3>
              </>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-400">
              {formatPercent(vocalFeatures.vocalConfidence)}
            </div>
            <div className="text-sm text-gray-400">Confidence</div>
          </div>
        </div>

        {vocalFeatures.hasVocals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-semibold text-blue-400">
                {formatPercent(vocalFeatures.vocalDensity)}
              </div>
              <div className="text-sm text-gray-400">Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-green-400">
                {vocalFeatures.vocalSegments.length}
              </div>
              <div className="text-sm text-gray-400">Segments</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-orange-400">
                {vocalFeatures.vocalOnsets.length}
              </div>
              <div className="text-sm text-gray-400">Onsets</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-cyan-400">
                {vocalFeatures.instrumentalSegments.length}
              </div>
              <div className="text-sm text-gray-400">Breaks</div>
            </div>
          </div>
        )}
      </div>

      {/* Vocal Characteristics */}
      {vocalFeatures.hasVocals && (
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h4 className="font-medium">Vocal Characteristics</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pitch Analysis */}
            <div className="space-y-4">
              <h5 className="font-medium text-purple-400">Pitch Analysis</h5>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Fundamental</span>
                  <span className="font-mono text-purple-400">
                    {formatHz(vocalFeatures.vocalCharacteristics.pitch.fundamental)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Range</span>
                  <span className="font-mono text-purple-400">
                    {vocalFeatures.vocalCharacteristics.pitch.range.toFixed(1)} semitones
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Stability</span>
                  <span className="font-mono text-purple-400">
                    {formatPercent(1 - vocalFeatures.vocalCharacteristics.pitch.variance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Formant Analysis */}
            <div className="space-y-4">
              <h5 className="font-medium text-blue-400">Formant Analysis</h5>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">F1 (Openness)</span>
                  <span className="font-mono text-blue-400">
                    {formatHz(vocalFeatures.vocalCharacteristics.formants.f1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">F2 (Frontness)</span>
                  <span className="font-mono text-blue-400">
                    {formatHz(vocalFeatures.vocalCharacteristics.formants.f2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">F3 (Clarity)</span>
                  <span className="font-mono text-blue-400">
                    {formatHz(vocalFeatures.vocalCharacteristics.formants.f3)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Vocal Quality Metrics */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-400">
                {formatPercent(vocalFeatures.vocalCharacteristics.harmonicToNoiseRatio)}
              </div>
              <div className="text-xs text-gray-400">Clarity</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-400">
                {formatHz(vocalFeatures.vocalCharacteristics.spectralCentroid)}
              </div>
              <div className="text-xs text-gray-400">Brightness</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-400">
                {formatPercent(vocalFeatures.vocalCharacteristics.roughness)}
              </div>
              <div className="text-xs text-gray-400">Roughness</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-400">
                {formatPercent(vocalFeatures.vocalCharacteristics.breathiness)}
              </div>
              <div className="text-xs text-gray-400">Breathiness</div>
            </div>
          </div>
        </div>
      )}

      {/* Vocal Segments Timeline */}
      {timelineData && (
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-green-400" />
            <h4 className="font-medium">Vocal Timeline</h4>
            <div className="ml-auto text-sm text-gray-400">
              Duration: {formatTime(timelineData.totalDuration)}
            </div>
          </div>

          {/* Timeline Visualization */}
          <div className="relative h-12 bg-gray-600 rounded-lg mb-4">
            {/* Instrumental segments (background) */}
            {timelineData.instrumental.map((segment, index) => (
              <div
                key={`inst-${index}`}
                className="absolute top-0 h-full bg-gray-500 rounded"
                style={{
                  left: `${(segment.startTime / timelineData.totalDuration) * 100}%`,
                  width: `${((segment.endTime - segment.startTime) / timelineData.totalDuration) * 100}%`
                }}
                title={`Instrumental: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
              />
            ))}

            {/* Vocal segments (foreground) */}
            {timelineData.segments.map((segment, index) => (
              <div
                key={`vocal-${index}`}
                className={`absolute top-1 h-10 rounded ${vocalTypeColors[segment.vocalType]} opacity-80`}
                style={{
                  left: `${(segment.startTime / timelineData.totalDuration) * 100}%`,
                  width: `${((segment.endTime - segment.startTime) / timelineData.totalDuration) * 100}%`
                }}
                title={`${segment.vocalType}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)} (${formatPercent(segment.confidence)} confidence)`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-sm">
            {Object.entries(vocalTypeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${color}`} />
                <span className="capitalize text-gray-300">{type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vocal Segments List */}
      {vocalFeatures.vocalSegments.length > 0 && (
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-purple-400" />
            <h4 className="font-medium">Vocal Segments</h4>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {vocalFeatures.vocalSegments.map((segment, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-600 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${vocalTypeColors[segment.vocalType]}`} />
                  <div>
                    <div className="font-medium capitalize">{segment.vocalType}</div>
                    <div className="text-sm text-gray-400">
                      {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-purple-400 font-mono">
                    {formatPercent(segment.confidence)}
                  </div>
                  <div className="text-xs text-gray-400">confidence</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Song Structure Analysis */}
      <div className="bg-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-5 h-5 text-indigo-400" />
          <h4 className="font-medium">Song Structure</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(vocalFeatures.breakdown).map(([section, data]) => (
            <div key={section} className="text-center">
              <div className="mb-2">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                  data.hasVocals ? 'bg-purple-600' : 'bg-gray-600'
                }`}>
                  {data.hasVocals ? (
                    <Mic className="w-8 h-8 text-white" />
                  ) : (
                    <Volume2 className="w-8 h-8 text-gray-400" />
                  )}
                </div>
              </div>
              <div className="font-medium capitalize">{section}</div>
              <div className="text-sm text-gray-400">
                {formatTime(data.duration)}
              </div>
              <div className="text-xs text-gray-500">
                {data.hasVocals ? 'Vocal' : 'Instrumental'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vocal Onsets */}
      {vocalFeatures.vocalOnsets.length > 0 && (
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h4 className="font-medium">Vocal Onsets</h4>
            <div className="ml-auto text-sm text-gray-400">
              {vocalFeatures.vocalOnsets.length} detected
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['phrase', 'word', 'syllable'].map(type => {
              const onsets = vocalFeatures.vocalOnsets.filter(o => o.type === type)
              return (
                <div key={type} className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {onsets.length}
                  </div>
                  <div className="text-sm text-gray-400 capitalize">{type}s</div>
                  {onsets.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Avg: {formatPercent(onsets.reduce((sum, o) => sum + o.confidence, 0) / onsets.length)} confidence
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}