import React, { useState, useEffect } from 'react'
import { 
  Users, Activity, Zap, Heart, AlertTriangle, TrendingUp,
  Music, Volume2, Mic, Clock, MapPin, Calendar
} from 'lucide-react'
import { CrowdResponse, CrowdContext } from '../lib/crowdResponsePredictor'
import { EnhancedAnalysisResult } from '../lib/enhancedAudioAnalysis'

interface CrowdResponseDisplayProps {
  analysisResult?: EnhancedAnalysisResult | null
  crowdResponse?: CrowdResponse | null
  crowdContext?: CrowdContext | null
  onContextChange?: (context: CrowdContext) => void
  className?: string
}

export const CrowdResponseDisplay: React.FC<CrowdResponseDisplayProps> = ({
  analysisResult,
  crowdResponse,
  crowdContext,
  onContextChange,
  className = ''
}) => {
  const [showContextEditor, setShowContextEditor] = useState(false)
  const [editedContext, setEditedContext] = useState<CrowdContext>(crowdContext || {
    venue: {
      type: 'club',
      capacity: 500,
      atmosphere: 'energetic'
    },
    timeOfDay: {
      hour: 23,
      dayOfWeek: 'saturday',
      isHoliday: false
    },
    audience: {
      estimatedSize: 300,
      energyLevel: 0.7,
      engagement: 0.8,
      demographics: {
        primaryAgeGroup: '25-34',
        musicPreference: 'underground'
      }
    },
    setPosition: {
      phase: 'peak',
      minutesPlayed: 60,
      minutesRemaining: 60
    }
  })

  useEffect(() => {
    if (crowdContext) {
      setEditedContext(crowdContext)
    }
  }, [crowdContext])

  const handleContextSave = () => {
    onContextChange?.(editedContext)
    setShowContextEditor(false)
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'jump': return '🙌'
      case 'intense_dance': return '💃'
      case 'sing_along': return '🎤'
      case 'bounce': return '🕺'
      case 'hands_up': return '🙋'
      case 'rest': return '😌'
      default: return '🎵'
    }
  }

  const getRiskColor = (risk: number): string => {
    if (risk > 0.7) return 'text-red-400'
    if (risk > 0.4) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getEngagementColor = (engagement: number): string => {
    if (engagement > 0.8) return 'bg-green-500'
    if (engagement > 0.6) return 'bg-blue-500'
    if (engagement > 0.4) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (!crowdResponse) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No crowd response data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gray-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-purple-500" />
            <h3 className="text-xl font-semibold">Crowd Response Prediction</h3>
          </div>
          <button
            onClick={() => setShowContextEditor(!showContextEditor)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-sm"
          >
            {showContextEditor ? 'Hide Context' : 'Edit Context'}
          </button>
        </div>
      </div>

      {/* Context Editor */}
      {showContextEditor && (
        <div className="p-6 bg-gray-900/50 border-b border-gray-700">
          <h4 className="font-medium mb-4">Crowd Context Settings</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Venue Settings */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-400">Venue</h5>
              <select
                value={editedContext.venue.type}
                onChange={(e) => setEditedContext({
                  ...editedContext,
                  venue: { ...editedContext.venue, type: e.target.value as any }
                })}
                className="w-full bg-gray-700 rounded px-3 py-2"
              >
                <option value="club">Club</option>
                <option value="festival">Festival</option>
                <option value="warehouse">Warehouse</option>
                <option value="bar">Bar</option>
                <option value="concert_hall">Concert Hall</option>
                <option value="outdoor">Outdoor</option>
                <option value="private">Private Party</option>
              </select>
              
              <input
                type="number"
                value={editedContext.venue.capacity}
                onChange={(e) => setEditedContext({
                  ...editedContext,
                  venue: { ...editedContext.venue, capacity: parseInt(e.target.value) }
                })}
                placeholder="Venue Capacity"
                className="w-full bg-gray-700 rounded px-3 py-2"
              />
            </div>

            {/* Time Settings */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-400">Time</h5>
              <select
                value={editedContext.timeOfDay.dayOfWeek}
                onChange={(e) => setEditedContext({
                  ...editedContext,
                  timeOfDay: { ...editedContext.timeOfDay, dayOfWeek: e.target.value as any }
                })}
                className="w-full bg-gray-700 rounded px-3 py-2"
              >
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
              </select>
              
              <input
                type="number"
                min="0"
                max="23"
                value={editedContext.timeOfDay.hour}
                onChange={(e) => setEditedContext({
                  ...editedContext,
                  timeOfDay: { ...editedContext.timeOfDay, hour: parseInt(e.target.value) }
                })}
                placeholder="Hour (0-23)"
                className="w-full bg-gray-700 rounded px-3 py-2"
              />
            </div>

            {/* Set Position */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-400">Set Position</h5>
              <select
                value={editedContext.setPosition.phase}
                onChange={(e) => setEditedContext({
                  ...editedContext,
                  setPosition: { ...editedContext.setPosition, phase: e.target.value as any }
                })}
                className="w-full bg-gray-700 rounded px-3 py-2"
              >
                <option value="opening">Opening</option>
                <option value="warmup">Warm-up</option>
                <option value="peak">Peak Time</option>
                <option value="cooldown">Cool-down</option>
                <option value="closing">Closing</option>
              </select>
              
              <input
                type="number"
                value={editedContext.setPosition.minutesPlayed}
                onChange={(e) => setEditedContext({
                  ...editedContext,
                  setPosition: { ...editedContext.setPosition, minutesPlayed: parseInt(e.target.value) }
                })}
                placeholder="Minutes Played"
                className="w-full bg-gray-700 rounded px-3 py-2"
              />
            </div>

            {/* Audience */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-400">Audience</h5>
              <input
                type="number"
                value={editedContext.audience.estimatedSize}
                onChange={(e) => setEditedContext({
                  ...editedContext,
                  audience: { ...editedContext.audience, estimatedSize: parseInt(e.target.value) }
                })}
                placeholder="Crowd Size"
                className="w-full bg-gray-700 rounded px-3 py-2"
              />
              
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Current Energy: {Math.round(editedContext.audience.energyLevel * 100)}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editedContext.audience.energyLevel * 100}
                  onChange={(e) => setEditedContext({
                    ...editedContext,
                    audience: { ...editedContext.audience, energyLevel: parseInt(e.target.value) / 100 }
                  })}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleContextSave}
            className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            Apply Context
          </button>
        </div>
      )}

      {/* Main Metrics */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Activity}
          label="Engagement"
          value={Math.round(crowdResponse.predictedEngagement * 100)}
          unit="%"
          color={getEngagementColor(crowdResponse.predictedEngagement)}
        />
        <MetricCard
          icon={Zap}
          label="Energy"
          value={Math.round(crowdResponse.predictedEnergy * 100)}
          unit="%"
          color={getEngagementColor(crowdResponse.predictedEnergy)}
        />
        <MetricCard
          icon={Music}
          label="Danceability"
          value={Math.round(crowdResponse.danceability * 100)}
          unit="%"
          color={getEngagementColor(crowdResponse.danceability)}
        />
        <MetricCard
          icon={Mic}
          label="Sing-Along"
          value={Math.round(crowdResponse.singAlongPotential * 100)}
          unit="%"
          color={getEngagementColor(crowdResponse.singAlongPotential)}
        />
      </div>

      {/* Crowd Movement */}
      <div className="px-6 pb-6">
        <div className="bg-gray-900/50 rounded-lg p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Predicted Crowd Movement
          </h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{getMovementIcon(crowdResponse.crowdMovement.type)}</span>
              <div>
                <p className="font-medium capitalize">{crowdResponse.crowdMovement.type.replace('_', ' ')}</p>
                <p className="text-sm text-gray-400">
                  Intensity: {Math.round(crowdResponse.crowdMovement.intensity * 100)}% | 
                  Sync: {Math.round(crowdResponse.crowdMovement.synchronization * 100)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emotional Response */}
      <div className="px-6 pb-6">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4" />
          Emotional Response
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(crowdResponse.emotionalResponse).map(([emotion, value]) => (
            <div key={emotion} className="bg-gray-900/50 rounded-lg p-3">
              <p className="text-xs text-gray-400 capitalize mb-1">{emotion}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${value * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono">{Math.round(value * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Factors */}
      {Object.values(crowdResponse.riskFactors).some(risk => risk > 0.3) && (
        <div className="px-6 pb-6">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Risk Assessment
          </h4>
          <div className="space-y-2">
            {Object.entries(crowdResponse.riskFactors).map(([risk, value]) => {
              if (value < 0.3) return null
              return (
                <div key={risk} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{risk.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className={`font-mono text-sm ${getRiskColor(value)}`}>
                    {Math.round(value * 100)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {crowdResponse.recommendations.length > 0 && (
        <div className="px-6 pb-6">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            AI Recommendations
          </h4>
          <div className="space-y-3">
            {crowdResponse.recommendations.map((rec, index) => (
              <div key={index} className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 w-2 h-2 rounded-full ${
                    rec.confidence > 0.8 ? 'bg-green-400' :
                    rec.confidence > 0.6 ? 'bg-yellow-400' : 'bg-gray-400'
                  }`} />
                  <div className="flex-1">
                    <p className="font-medium">{rec.action}</p>
                    <p className="text-sm text-gray-400 mt-1">{rec.reasoning}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Confidence: {Math.round(rec.confidence * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peak Moments */}
      {crowdResponse.peakMoments.length > 0 && (
        <div className="px-6 pb-6">
          <h4 className="font-medium mb-3">Peak Moments Timeline</h4>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-700" />
            {crowdResponse.peakMoments.map((peak, index) => (
              <div key={index} className="relative pl-6 pb-4">
                <div className="absolute left-0 top-1 w-2 h-2 bg-purple-500 rounded-full -translate-x-1/2" />
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{peak.type.replace('_', ' ')}</span>
                    <span className="text-sm text-gray-400">
                      {formatTime(peak.timestamp)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-400">Impact:</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-purple-500 h-1.5 rounded-full"
                        style={{ width: `${peak.expectedImpact * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono">{Math.round(peak.expectedImpact * 100)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper Components
interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  unit: string
  color: string
}

const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, label, value, unit, color }) => (
  <div className="bg-gray-900/50 rounded-lg p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4 text-gray-400" />
      <span className="text-sm text-gray-400">{label}</span>
    </div>
    <div className="flex items-end gap-1">
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-sm text-gray-400 mb-1">{unit}</span>
    </div>
    <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full transition-all duration-300`}
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
)

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}