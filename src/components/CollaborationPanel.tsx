// Production Collaboration Panel Component
// Comprehensive real-time collaboration interface

import React, { useState, useEffect } from 'react'
import {
  Users, Settings, MessageSquare, Share2, Crown, Edit3, Eye,
  Wifi, WifiOff, UserPlus, AlertTriangle, Activity, Clock,
  Play, Pause, Volume2, MousePointer, Hand, Zap
} from 'lucide-react'
import { useRealtimeCollaboration } from '../hooks/useRealtimeCollaboration'
import { CollaborationManager } from './CollaborationManager'
import { ConflictResolutionDialog } from './ConflictResolutionDialog'
import { CollaboratorInfo, CursorPosition, SelectionRange } from '../lib/realtimeCollaboration'

interface CollaborationPanelProps {
  mixId: string
  isVisible: boolean
  onToggle: () => void
  currentPlaybackPosition?: number
  isPlaying?: boolean
  onPlaybackSync?: (position: number, isPlaying: boolean) => void
}

interface CollaboratorCursor {
  userId: string
  position: CursorPosition
  color: string
  displayName: string
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  mixId,
  isVisible,
  onToggle,
  currentPlaybackPosition = 0,
  isPlaying = false,
  onPlaybackSync
}) => {
  const {
    session,
    collaborators,
    isConnected,
    connectionStatus,
    conflictEvents,
    conflictAnalysis,
    permissions,
    broadcastChange,
    updateCursor,
    updateSelection,
    syncPlayback,
    resolveConflictWithResolution
  } = useRealtimeCollaboration({ mixId, autoJoin: true })

  const [showCollaborationManager, setShowCollaborationManager] = useState(false)
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [collaboratorCursors, setCollaboratorCursors] = useState<CollaboratorCursor[]>([])
  const [activeCollaborators, setActiveCollaborators] = useState<CollaboratorInfo[]>([])
  const [playbackSyncEnabled, setPlaybackSyncEnabled] = useState(true)
  const [cursorSyncEnabled, setCursorSyncEnabled] = useState(true)

  // User colors for visual distinction
  const userColors = [
    '#8B5CF6', '#EF4444', '#10B981', '#F59E0B', '#06B6D4',
    '#EC4899', '#84CC16', '#F97316', '#6366F1', '#14B8A6'
  ]

  // Update active collaborators
  useEffect(() => {
    setActiveCollaborators(collaborators.filter(c => c.isOnline))
  }, [collaborators])

  // Handle conflict detection
  useEffect(() => {
    if (conflictAnalysis && conflictEvents.length > 0) {
      setShowConflictDialog(true)
    }
  }, [conflictAnalysis, conflictEvents])

  // Sync playback position
  useEffect(() => {
    if (playbackSyncEnabled && isConnected) {
      const syncInterval = setInterval(() => {
        syncPlayback(currentPlaybackPosition, isPlaying)
      }, 5000) // Sync every 5 seconds

      return () => clearInterval(syncInterval)
    }
  }, [playbackSyncEnabled, isConnected, currentPlaybackPosition, isPlaying, syncPlayback])

  // Handle cursor updates
  const handleCursorMove = (timelinePosition: number, trackIndex?: number) => {
    if (cursorSyncEnabled && isConnected) {
      updateCursor({
        timelinePosition,
        trackIndex,
        component: 'timeline'
      })
    }
  }

  // Handle selection updates
  const handleSelectionChange = (startTime: number, endTime: number, trackIndex?: number) => {
    if (cursorSyncEnabled && isConnected) {
      updateSelection({
        startTime,
        endTime,
        trackIndex
      })
    }
  }

  // Get collaborator color
  const getCollaboratorColor = (userId: string, index: number) => {
    return userColors[index % userColors.length]
  }

  // Get connection status info
  const getConnectionStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <Wifi className="h-4 w-4 text-green-400" />,
          text: 'Connected',
          color: 'text-green-400'
        }
      case 'connecting':
        return {
          icon: <Clock className="h-4 w-4 text-yellow-400 animate-spin" />,
          text: 'Connecting...',
          color: 'text-yellow-400'
        }
      case 'error':
        return {
          icon: <WifiOff className="h-4 w-4 text-red-400" />,
          text: 'Connection Lost',
          color: 'text-red-400'
        }
      default:
        return {
          icon: <WifiOff className="h-4 w-4 text-gray-400" />,
          text: 'Disconnected',
          color: 'text-gray-400'
        }
    }
  }

  const connectionInfo = getConnectionStatusInfo()

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={onToggle}
          className={`p-3 rounded-full shadow-lg transition-all ${
            isConnected 
              ? 'bg-purple-600 hover:bg-purple-700' 
              : 'bg-gray-600 hover:bg-gray-700'
          } text-white`}
        >
          <div className="relative">
            <Users className="h-5 w-5" />
            {activeCollaborators.length > 0 && (
              <div className="absolute -top-2 -right-2 bg-green-400 text-black text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {activeCollaborators.length}
              </div>
            )}
            {conflictEvents.length > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-pulse" />
            )}
          </div>
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="fixed bottom-0 right-0 w-80 h-96 bg-gray-800 border-l border-t border-gray-700 shadow-xl z-40">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              <span className="font-medium text-white">Collaboration</span>
              {conflictEvents.length > 0 && (
                <div className="flex items-center gap-1 text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs">{conflictEvents.length}</span>
                </div>
              )}
            </div>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              ×
            </button>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {connectionInfo.icon}
              <span className={connectionInfo.color}>{connectionInfo.text}</span>
            </div>
            <div className="text-gray-400">
              {activeCollaborators.length} online
            </div>
          </div>
        </div>

        {/* Active Collaborators */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Active Users</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {activeCollaborators.map((collaborator, index) => (
              <div
                key={collaborator.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-900/50"
              >
                <div className="relative">
                  {collaborator.avatarUrl ? (
                    <img
                      src={collaborator.avatarUrl}
                      alt={collaborator.displayName}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: getCollaboratorColor(collaborator.userId, index) }}
                    >
                      {collaborator.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-800" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium truncate">
                      {collaborator.displayName}
                    </span>
                    {collaborator.permission === 'admin' && <Crown className="h-3 w-3 text-yellow-400" />}
                    {collaborator.permission === 'editor' && <Edit3 className="h-3 w-3 text-blue-400" />}
                    {collaborator.permission === 'viewer' && <Eye className="h-3 w-3 text-gray-400" />}
                  </div>
                  {collaborator.cursor && (
                    <div className="text-xs text-gray-400">
                      Working at {Math.round(collaborator.cursor.timelinePosition)}s
                    </div>
                  )}
                </div>

                {/* Activity indicator */}
                <div className="flex items-center gap-1">
                  {collaborator.cursor && (
                    <MousePointer 
                      className="h-3 w-3" 
                      style={{ color: getCollaboratorColor(collaborator.userId, index) }}
                    />
                  )}
                  {collaborator.selection && (
                    <Hand 
                      className="h-3 w-3" 
                      style={{ color: getCollaboratorColor(collaborator.userId, index) }}
                    />
                  )}
                </div>
              </div>
            ))}

            {activeCollaborators.length === 0 && (
              <div className="text-center py-4 text-gray-400 text-sm">
                No other users online
              </div>
            )}
          </div>
        </div>

        {/* Collaboration Controls */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Sync Settings</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-white">Playback Sync</span>
              </div>
              <button
                onClick={() => setPlaybackSyncEnabled(!playbackSyncEnabled)}
                className={`w-10 h-6 rounded-full transition-colors ${
                  playbackSyncEnabled ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  playbackSyncEnabled ? 'translate-x-5' : 'translate-x-1'
                } mt-1`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-white">Cursor Sync</span>
              </div>
              <button
                onClick={() => setCursorSyncEnabled(!cursorSyncEnabled)}
                className={`w-10 h-6 rounded-full transition-colors ${
                  cursorSyncEnabled ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  cursorSyncEnabled ? 'translate-x-5' : 'translate-x-1'
                } mt-1`} />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            {permissions.canInvite && (
              <button
                onClick={() => setShowCollaborationManager(true)}
                className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Invite</span>
              </button>
            )}

            {conflictEvents.length > 0 && (
              <button
                onClick={() => setShowConflictDialog(true)}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Resolve</span>
              </button>
            )}

            <button
              onClick={() => setShowCollaborationManager(true)}
              className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>

            {onPlaybackSync && (
              <button
                onClick={() => onPlaybackSync?.(currentPlaybackPosition, isPlaying)}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Zap className="h-4 w-4" />
                <span>Sync Now</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gray-900 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3" />
              <span>Real-time enabled</span>
            </div>
            {session && (
              <div>Session: {session.sessionId.slice(-6)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Collaboration Manager Modal */}
      <CollaborationManager
        mixId={mixId}
        isOpen={showCollaborationManager}
        onClose={() => setShowCollaborationManager(false)}
      />

      {/* Conflict Resolution Dialog */}
      {conflictAnalysis && (
        <ConflictResolutionDialog
          conflictAnalysis={conflictAnalysis}
          collaborators={collaborators}
          isOpen={showConflictDialog}
          onResolve={(resolution) => {
            resolveConflictWithResolution(resolution)
            setShowConflictDialog(false)
          }}
          onCancel={() => setShowConflictDialog(false)}
        />
      )}

      {/* Collaborator Cursors Overlay */}
      {cursorSyncEnabled && collaboratorCursors.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {collaboratorCursors.map((cursor, index) => (
            <div
              key={cursor.userId}
              className="absolute pointer-events-none"
              style={{
                left: `${(cursor.position.timelinePosition / 300) * 100}%`, // Assuming 5-minute timeline
                top: cursor.position.trackIndex ? `${cursor.position.trackIndex * 60 + 100}px` : '100px',
                transform: 'translate(-50%, -100%)'
              }}
            >
              <div className="flex flex-col items-center">
                <div 
                  className="px-2 py-1 rounded text-xs text-white font-medium shadow-lg"
                  style={{ backgroundColor: cursor.color }}
                >
                  {cursor.displayName}
                </div>
                <div 
                  className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                  style={{ borderTopColor: cursor.color }}
                />
                <div 
                  className="w-px h-10"
                  style={{ backgroundColor: cursor.color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default CollaborationPanel