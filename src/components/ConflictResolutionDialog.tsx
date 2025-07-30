// Production Conflict Resolution Dialog
// UI for resolving collaborative editing conflicts

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle, Users, Clock, CheckCircle, XCircle,
  Merge, RotateCcw, User, Shield, Zap, Target,
  ChevronDown, ChevronRight, Info, Settings
} from 'lucide-react'
import { 
  ConflictAnalysis, 
  ConflictResolution, 
  ConflictType,
  conflictResolver,
  ConflictResolutionPreference
} from '../lib/conflictResolver'
import { CollaborationEvent, CollaboratorInfo } from '../lib/realtimeCollaboration'

interface ConflictResolutionDialogProps {
  conflictAnalysis: ConflictAnalysis
  collaborators: CollaboratorInfo[]
  isOpen: boolean
  onResolve: (resolution: ConflictResolution) => void
  onCancel: () => void
}

export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  conflictAnalysis,
  collaborators,
  isOpen,
  onResolve,
  onCancel
}) => {
  const [selectedResolution, setSelectedResolution] = useState<ConflictResolution | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState<ConflictResolutionPreference>({
    preferredStrategy: 'auto',
    autoResolveThreshold: 0.7,
    notificationPreferences: {
      onConflict: true,
      onResolution: true,
      onMergeSuccess: true
    }
  })

  useEffect(() => {
    if (conflictAnalysis?.recommendedResolution) {
      setSelectedResolution(conflictAnalysis.recommendedResolution)
    }
  }, [conflictAnalysis])

  const getConflictTypeIcon = (type: ConflictType) => {
    switch (type) {
      case ConflictType.TRACK_EDIT: return <Target className="h-5 w-5 text-blue-400" />
      case ConflictType.TRACK_ORDER: return <RotateCcw className="h-5 w-5 text-orange-400" />
      case ConflictType.TRANSITION_OVERLAP: return <Merge className="h-5 w-5 text-purple-400" />
      case ConflictType.EFFECT_CONFLICT: return <Zap className="h-5 w-5 text-yellow-400" />
      case ConflictType.PERMISSION_DENIED: return <Shield className="h-5 w-5 text-red-400" />
      default: return <AlertTriangle className="h-5 w-5 text-gray-400" />
    }
  }

  const getConflictTypeTitle = (type: ConflictType) => {
    switch (type) {
      case ConflictType.TRACK_EDIT: return 'Track Edit Conflict'
      case ConflictType.TRACK_ORDER: return 'Track Order Conflict'
      case ConflictType.TRANSITION_OVERLAP: return 'Transition Conflict'
      case ConflictType.EFFECT_CONFLICT: return 'Effect Conflict'
      case ConflictType.METADATA_MISMATCH: return 'Metadata Conflict'
      case ConflictType.TIMING_CONFLICT: return 'Timing Conflict'
      case ConflictType.PERMISSION_DENIED: return 'Permission Denied'
      case ConflictType.STATE_DIVERGENCE: return 'State Divergence'
      default: return 'Unknown Conflict'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-900/20 border-red-700'
      case 'high': return 'text-orange-400 bg-orange-900/20 border-orange-700'
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700'
      case 'low': return 'text-green-400 bg-green-900/20 border-green-700'
      default: return 'text-gray-400 bg-gray-900/20 border-gray-700'
    }
  }

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'auto': return <Zap className="h-4 w-4" />
      case 'merge': return <Merge className="h-4 w-4" />
      case 'manual': return <User className="h-4 w-4" />
      case 'user_choice': return <Users className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  const getCollaboratorName = (userId: string) => {
    const collaborator = collaborators.find(c => c.userId === userId)
    return collaborator?.displayName || 'Unknown User'
  }

  const handleResolve = () => {
    if (selectedResolution) {
      onResolve(selectedResolution)
    }
  }

  const handleQuickResolve = (resolution: ConflictResolution) => {
    setSelectedResolution(resolution)
    onResolve(resolution)
  }

  if (!isOpen || !conflictAnalysis) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            {getConflictTypeIcon(conflictAnalysis.type)}
            <div>
              <h2 className="text-xl font-semibold text-white">
                {getConflictTypeTitle(conflictAnalysis.type)}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs px-2 py-1 rounded border ${getSeverityColor(conflictAnalysis.severity)}`}>
                  {conflictAnalysis.severity.toUpperCase()}
                </span>
                <span className="text-gray-400 text-sm">
                  {conflictAnalysis.metadata.involvedUsers.length} users involved
                </span>
                <span className="text-gray-400 text-sm">
                  {new Date(conflictAnalysis.metadata.conflictTime).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Conflict Summary */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Affected Resources:</span>
                <div className="text-white mt-1">
                  {conflictAnalysis.affectedResources.join(', ')}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Change Types:</span>
                <div className="text-white mt-1">
                  {conflictAnalysis.metadata.changeTypes.join(', ')}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Users Involved:</span>
                <div className="text-white mt-1">
                  {conflictAnalysis.metadata.involvedUsers.map(userId => getCollaboratorName(userId)).join(', ')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resolution Options */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <h3 className="text-lg font-medium text-white mb-4">Resolution Options</h3>
          
          <div className="space-y-3">
            {conflictAnalysis.possibleResolutions.map((resolution, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedResolution === resolution
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-600 hover:border-gray-500 bg-gray-900/30'
                }`}
                onClick={() => setSelectedResolution(resolution)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStrategyIcon(resolution.strategy)}
                    <span className="font-medium text-white capitalize">
                      {resolution.strategy === 'user_choice' ? 'Manual Choice' : resolution.strategy}
                    </span>
                    {resolution === conflictAnalysis.recommendedResolution && (
                      <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-400">Confidence:</span>
                      <div className="w-20 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${resolution.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-white">
                        {Math.round(resolution.confidence * 100)}%
                      </span>
                    </div>
                    
                    {resolution.requiresUserInput && (
                      <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
                        User Input Required
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="text-gray-300 text-sm">{resolution.reasoning}</p>
                
                {resolution.alternatives && resolution.alternatives.length > 0 && (
                  <div className="mt-2 text-xs text-gray-400">
                    {resolution.alternatives.length} alternative{resolution.alternatives.length !== 1 ? 's' : ''} available
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Resolution Buttons */}
          {conflictAnalysis.severity !== 'critical' && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Quick Actions</h4>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleQuickResolve(conflictAnalysis.recommendedResolution)}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Apply Recommended
                </button>
                
                {conflictAnalysis.possibleResolutions.find(r => r.strategy === 'merge') && (
                  <button
                    onClick={() => handleQuickResolve(conflictAnalysis.possibleResolutions.find(r => r.strategy === 'merge')!)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                  >
                    <Merge className="h-4 w-4" />
                    Try Merge
                  </button>
                )}
                
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Info className="h-4 w-4" />
                  {showDetails ? 'Hide' : 'Show'} Details
                </button>
              </div>
            </div>
          )}

          {/* Detailed Information */}
          {showDetails && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-4"
              >
                {showDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-medium">Conflict Details</span>
              </button>
              
              <div className="bg-gray-900/50 rounded-lg p-4 space-y-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-300 mb-2">Resource Path:</h5>
                  <code className="text-xs text-purple-300 bg-gray-800 px-2 py-1 rounded">
                    {conflictAnalysis.metadata.resourcePath.join(' → ')}
                  </code>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium text-gray-300 mb-2">Timeline:</h5>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>Conflict detected: {new Date(conflictAnalysis.metadata.conflictTime).toLocaleString()}</div>
                    <div>Change types: {conflictAnalysis.metadata.changeTypes.join(', ')}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences */}
          {showPreferences && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Resolution Preferences</h4>
              <div className="bg-gray-900/50 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Preferred Strategy
                  </label>
                  <select
                    value={preferences.preferredStrategy}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      preferredStrategy: e.target.value as any
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="auto">Automatic</option>
                    <option value="merge">Always Try Merge</option>
                    <option value="manual">Always Manual</option>
                    <option value="user_choice">Ask Every Time</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Auto-resolve Threshold: {Math.round(preferences.autoResolveThreshold * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={preferences.autoResolveThreshold}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      autoResolveThreshold: parseFloat(e.target.value)
                    })}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Conflicts with confidence above this threshold will be resolved automatically
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Preferences
              </button>
              
              <div className="text-xs text-gray-400">
                Conflict ID: {conflictAnalysis.metadata.conflictTime.slice(-8)}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </button>
              
              <button
                onClick={handleResolve}
                disabled={!selectedResolution}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Apply Resolution
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConflictResolutionDialog