// Enhanced Analysis Panel - Displays comprehensive audio analysis results
import React, { useState, useEffect, useMemo } from 'react'
import { 
  Music, BarChart3, Activity, Brain, Eye, TrendingUp, 
  Clock, Volume2, Zap, Headphones, Layers, Settings,
  ChevronDown, ChevronRight, Info, AlertCircle, CheckCircle,
  Mic, Radio, Users
} from 'lucide-react'
import { useEnhancedAnalysis } from '../hooks/useEnhancedAnalysis'
import { EnhancedAnalysisResult } from '../lib/enhancedAudioAnalysis'
import { SpectralFeatures } from '../lib/spectralAnalysis'
import { useCrowdResponse } from '../hooks/useCrowdResponse'
import { CrowdResponseDisplay } from './CrowdResponseDisplay'

interface EnhancedAnalysisPanelProps {
  trackId: string
  onSimilarTrackSelect?: (trackId: string) => void
  className?: string
}

export const EnhancedAnalysisPanel: React.FC<EnhancedAnalysisPanelProps> = ({
  trackId,
  onSimilarTrackSelect,
  className = ''
}) => {
  const {
    analysisResult,
    similarTracks,
    isAnalyzing,
    progress,
    error,
    getAnalysisResults,
    findSimilarTracks,
    clearError
  } = useEnhancedAnalysis()

  const {
    crowdResponse,
    crowdContext,
    predictCrowdResponse,
    updateContext
  } = useCrowdResponse()

  const [activeTab, setActiveTab] = useState<'overview' | 'spectral' | 'mood' | 'vocal' | 'genre' | 'similar' | 'crowd' | 'insights'>('overview')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']))

  // Load analysis results on mount
  useEffect(() => {
    if (trackId) {
      getAnalysisResults(trackId)
      findSimilarTracks(trackId)
      predictCrowdResponse(trackId)
    }
  }, [trackId, getAnalysisResults, findSimilarTracks, predictCrowdResponse])

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFrequency = (hz: number): string => {
    if (hz >= 1000) {
      return `${(hz / 1000).toFixed(1)}kHz`
    }
    return `${Math.round(hz)}Hz`
  }

  const getEnergyColor = (energy: number): string => {
    if (energy > 0.7) return 'text-red-400'
    if (energy > 0.4) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence > 0.8) return 'text-green-400'
    if (confidence > 0.6) return 'text-yellow-400'
    return 'text-red-400'
  }

  // Computed spectral insights
  const spectralInsights = useMemo(() => {
    if (!analysisResult?.spectralFeatures) return null

    const features = analysisResult.spectralFeatures
    const insights: Array<{ label: string; value: string; description: string }> = []

    // Average spectral centroid (brightness)
    if (features.spectralCentroid && features.spectralCentroid.length > 0) {
      const avgCentroid = features.spectralCentroid.reduce((sum, val) => sum + val, 0) / features.spectralCentroid.length
      insights.push({
        label: 'Brightness',
        value: formatFrequency(avgCentroid),
        description: avgCentroid > 3000 ? 'Bright, crisp sound' : avgCentroid > 1500 ? 'Balanced brightness' : 'Warm, dark sound'
      })
    }

    // Energy distribution analysis
    if (features.spectralBandEnergy) {
      const bass = features.spectralBandEnergy.bass?.reduce((sum, val) => sum + val, 0) || 0
      const mid = features.spectralBandEnergy.mid?.reduce((sum, val) => sum + val, 0) || 0
      const treble = features.spectralBandEnergy.presence?.reduce((sum, val) => sum + val, 0) || 0
      const total = bass + mid + treble

      if (total > 0) {
        const bassPercent = (bass / total) * 100
        const midPercent = (mid / total) * 100
        const treblePercent = (treble / total) * 100

        insights.push({
          label: 'Frequency Balance',
          value: `${bassPercent.toFixed(0)}% / ${midPercent.toFixed(0)}% / ${treblePercent.toFixed(0)}%`,
          description: 'Bass / Mid / Treble energy distribution'
        })
      }
    }

    // Harmonic content
    if (features.harmonicRatio && features.harmonicRatio.length > 0) {
      const avgHarmonic = features.harmonicRatio.reduce((sum, val) => sum + val, 0) / features.harmonicRatio.length
      insights.push({
        label: 'Harmonic Content',
        value: `${(avgHarmonic * 100).toFixed(0)}%`,
        description: avgHarmonic > 0.7 ? 'Highly tonal/musical' : avgHarmonic > 0.4 ? 'Mixed tonal/percussive' : 'Highly percussive'
      })
    }

    // Tempo confidence
    if (features.tempoConfidence !== undefined) {
      insights.push({
        label: 'Tempo Stability',
        value: `${(features.tempoConfidence * 100).toFixed(0)}%`,
        description: features.tempoConfidence > 0.8 ? 'Very stable tempo' : features.tempoConfidence > 0.6 ? 'Moderately stable' : 'Variable tempo'
      })
    }

    return insights
  }, [analysisResult])

  if (isAnalyzing) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
          <h3 className="text-lg font-semibold">Analyzing Track</h3>
        </div>
        
        {progress && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{progress.message}</span>
              <span className="text-purple-400">{Math.round(progress.progress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Analysis Error</h3>
        </div>
        <p className="text-gray-300 mb-4">{error}</p>
        <button
          onClick={clearError}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
        >
          Dismiss
        </button>
      </div>
    )
  }

  if (!analysisResult) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="text-center text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No analysis data available for this track</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gray-800 rounded-lg ${className}`}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-700">
        <div className="flex space-x-1 p-1">
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'spectral', label: 'Spectral', icon: Activity },
            { id: 'mood', label: 'Mood', icon: Brain },
            { id: 'vocal', label: 'Vocals', icon: Mic },
            { id: 'genre', label: 'Genre', icon: Radio },
            { id: 'similar', label: 'Similar', icon: TrendingUp },
            { id: 'crowd', label: 'Crowd', icon: Users },
            { id: 'insights', label: 'AI Insights', icon: Settings }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Basic Features */}
            <CollapsibleSection
              title="Basic Properties"
              icon={Music}
              isExpanded={expandedSections.has('basic')}
              onToggle={() => toggleSection('basic')}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Duration"
                  value={formatDuration(analysisResult.basicFeatures.duration)}
                  icon={Clock}
                />
                <MetricCard
                  label="Sample Rate"
                  value={`${(analysisResult.basicFeatures.sampleRate / 1000).toFixed(1)}kHz`}
                  icon={Volume2}
                />
                <MetricCard
                  label="Channels"
                  value={analysisResult.basicFeatures.channels === 2 ? 'Stereo' : 'Mono'}
                  icon={Headphones}
                />
                <MetricCard
                  label="Bitrate"
                  value={`${analysisResult.basicFeatures.bitrate} kbps`}
                  icon={Zap}
                />
              </div>
            </CollapsibleSection>

            {/* Audio Fingerprint */}
            <CollapsibleSection
              title="Audio Fingerprint"
              icon={Info}
              isExpanded={expandedSections.has('fingerprint')}
              onToggle={() => toggleSection('fingerprint')}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Confidence Score</span>
                  <span className={`font-mono ${getConfidenceColor(analysisResult.audioFingerprint.confidence)}`}>
                    {(analysisResult.audioFingerprint.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                
                {analysisResult.duplicateAnalysis.matches.length > 0 && (
                  <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 font-medium">Potential Duplicates Found</span>
                    </div>
                    <div className="space-y-2">
                      {analysisResult.duplicateAnalysis.matches.slice(0, 3).map((match, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-300">Track {match.trackId.slice(0, 8)}...</span>
                          <span className="text-yellow-400">{(match.similarity * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* Stem Separation */}
            {analysisResult.stemSeparation && (
              <CollapsibleSection
                title="Stem Separation"
                icon={Layers}
                isExpanded={expandedSections.has('stems')}
                onToggle={() => toggleSection('stems')}
              >
                {analysisResult.stemSeparation.available ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Quality</span>
                      <span className="text-green-400 capitalize">{analysisResult.stemSeparation.quality}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {analysisResult.stemSeparation.stems.map((stem) => (
                        <div key={stem.type} className="bg-gray-700 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="capitalize font-medium">{stem.type}</span>
                            <span className="text-xs text-gray-400">
                              {(stem.size / 1024 / 1024).toFixed(1)}MB
                            </span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-1">
                            <div className="bg-purple-600 h-1 rounded-full w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-4">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Stem separation not available</p>
                  </div>
                )}
              </CollapsibleSection>
            )}

            {/* Spectral Insights */}
            {spectralInsights && (
              <CollapsibleSection
                title="Audio Insights"
                icon={Brain}
                isExpanded={expandedSections.has('insights')}
                onToggle={() => toggleSection('insights')}
              >
                <div className="space-y-4">
                  {spectralInsights.map((insight, index) => (
                    <div key={index} className="border-l-2 border-purple-600 pl-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{insight.label}</span>
                        <span className="text-purple-400 font-mono">{insight.value}</span>
                      </div>
                      <p className="text-sm text-gray-400">{insight.description}</p>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </div>
        )}

        {/* Spectral Tab */}
        {activeTab === 'spectral' && (
          <SpectralAnalysisView features={analysisResult.spectralFeatures} />
        )}

        {/* Mood Tab */}
        {activeTab === 'mood' && (
          <div className="text-center text-gray-400 py-8">
            <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Mood analysis coming soon</p>
          </div>
        )}

        {/* Vocal Tab */}
        {activeTab === 'vocal' && (
          <div className="text-center text-gray-400 py-8">
            <Mic className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Vocal analysis coming soon</p>
          </div>
        )}

        {/* Genre Tab */}
        {activeTab === 'genre' && (
          <div className="text-center text-gray-400 py-8">
            <Radio className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Genre classification temporarily disabled during development</p>
          </div>
        )}

        {/* Similar Tracks Tab */}
        {activeTab === 'similar' && (
          <SimilarTracksView 
            tracks={similarTracks} 
            onTrackSelect={onSimilarTrackSelect}
          />
        )}

        {/* Crowd Response Tab */}
        {activeTab === 'crowd' && (
          <CrowdResponseDisplay
            analysisResult={analysisResult}
            crowdResponse={crowdResponse}
            crowdContext={crowdContext}
            onContextChange={(context) => {
              updateContext(context)
              predictCrowdResponse(trackId, context)
            }}
          />
        )}

        {/* AI Insights Tab */}
        {activeTab === 'insights' && (
          <div className="text-center text-gray-400 py-8">
            <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Advanced AI insights coming soon</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  children
}) => (
  <div className="border border-gray-700 rounded-lg">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-purple-400" />
        <span className="font-medium">{title}</span>
      </div>
      {isExpanded ? (
        <ChevronDown className="w-5 h-5 text-gray-400" />
      ) : (
        <ChevronRight className="w-5 h-5 text-gray-400" />
      )}
    </button>
    
    {isExpanded && (
      <div className="px-4 pb-4 border-t border-gray-700">
        <div className="pt-4">
          {children}
        </div>
      </div>
    )}
  </div>
)

// Metric Card Component
interface MetricCardProps {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  color?: string
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  label, 
  value, 
  icon: Icon, 
  color = 'text-gray-400' 
}) => (
  <div className="bg-gray-700 rounded-lg p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-sm text-gray-400">{label}</span>
    </div>
    <div className="text-lg font-semibold">{value}</div>
  </div>
)

// Spectral Analysis View Component
const SpectralAnalysisView: React.FC<{ features: SpectralFeatures }> = ({ features }) => (
  <div className="space-y-6">
    {/* Spectral Features Overview */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {features.spectralCentroid && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="font-medium mb-2">Spectral Centroid</h4>
          <div className="text-sm text-gray-400 mb-2">
            Avg: {(features.spectralCentroid.reduce((sum, val) => sum + val, 0) / features.spectralCentroid.length).toFixed(0)}Hz
          </div>
          <div className="h-16 bg-gray-600 rounded flex items-end">
            {features.spectralCentroid.slice(0, 50).map((value, index) => (
              <div
                key={index}
                className="bg-purple-400 flex-1 mx-px"
                style={{ height: `${(value / Math.max(...features.spectralCentroid)) * 100}%` }}
              />
            ))}
          </div>
        </div>
      )}

      {features.spectralRolloff && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="font-medium mb-2">Spectral Rolloff</h4>
          <div className="text-sm text-gray-400 mb-2">
            Avg: {(features.spectralRolloff.reduce((sum, val) => sum + val, 0) / features.spectralRolloff.length).toFixed(0)}Hz
          </div>
          <div className="h-16 bg-gray-600 rounded flex items-end">
            {features.spectralRolloff.slice(0, 50).map((value, index) => (
              <div
                key={index}
                className="bg-blue-400 flex-1 mx-px"
                style={{ height: `${(value / Math.max(...features.spectralRolloff)) * 100}%` }}
              />
            ))}
          </div>
        </div>
      )}

      {features.zeroCrossingRate && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="font-medium mb-2">Zero Crossing Rate</h4>
          <div className="text-sm text-gray-400 mb-2">
            Avg: {(features.zeroCrossingRate.reduce((sum, val) => sum + val, 0) / features.zeroCrossingRate.length).toFixed(3)}
          </div>
          <div className="h-16 bg-gray-600 rounded flex items-end">
            {features.zeroCrossingRate.slice(0, 50).map((value, index) => (
              <div
                key={index}
                className="bg-green-400 flex-1 mx-px"
                style={{ height: `${(value / Math.max(...features.zeroCrossingRate)) * 100}%` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Energy Distribution */}
    {features.spectralBandEnergy && (
      <div className="bg-gray-700 rounded-lg p-6">
        <h4 className="font-medium mb-4">Frequency Band Energy</h4>
        <div className="grid grid-cols-7 gap-2">
          {Object.entries(features.spectralBandEnergy).map(([band, values]) => {
            const avgEnergy = values.reduce((sum, val) => sum + val, 0) / values.length
            const maxEnergy = 1.0 // Normalized maximum
            
            return (
              <div key={band} className="text-center">
                <div className="h-32 bg-gray-600 rounded-lg mb-2 flex flex-col justify-end p-1">
                  <div
                    className="bg-gradient-to-t from-purple-600 to-purple-400 rounded"
                    style={{ height: `${(avgEnergy / maxEnergy) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 capitalize">{band}</div>
                <div className="text-xs font-mono text-purple-400">
                  {avgEnergy.toFixed(2)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )}
  </div>
)

// Similar Tracks View Component
const SimilarTracksView: React.FC<{
  tracks: Array<{ trackId: string; similarity: number; features: string[] }>
  onTrackSelect?: (trackId: string) => void
}> = ({ tracks, onTrackSelect }) => (
  <div className="space-y-4">
    {tracks.length === 0 ? (
      <div className="text-center text-gray-400 py-8">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No similar tracks found</p>
      </div>
    ) : (
      tracks.map((track, index) => (
        <div 
          key={track.trackId}
          className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer"
          onClick={() => onTrackSelect?.(track.trackId)}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Track {track.trackId.slice(0, 8)}...</span>
            <div className="flex items-center gap-2">
              <span className="text-purple-400 font-mono">
                {(track.similarity * 100).toFixed(1)}%
              </span>
              <div className="w-16 bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${track.similarity * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          {track.features.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {track.features.map((feature) => (
                <span 
                  key={feature}
                  className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded-full"
                >
                  {feature}
                </span>
              ))}
            </div>
          )}
        </div>
      ))
    )}
  </div>
)