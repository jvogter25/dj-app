// Production Real-time Collaboration Hook
// React hook for managing collaborative mix editing

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  realtimeCollaboration,
  CollaborationSession,
  CollaboratorInfo,
  CollaborationEvent,
  CursorPosition,
  SelectionRange,
  CollaborationEventType
} from '../lib/realtimeCollaboration'
import { MixState } from '../lib/mixManager'
import { 
  conflictResolver,
  ConflictAnalysis,
  ConflictResolution,
  ConflictContext
} from '../lib/conflictResolver'
import { useSupabase } from './useSupabase'

interface UseRealtimeCollaborationProps {
  mixId: string
  permission?: CollaboratorInfo['permission']
  autoJoin?: boolean
}

interface UseRealtimeCollaborationReturn {
  // Session state
  session: CollaborationSession | null
  collaborators: CollaboratorInfo[]
  isConnected: boolean
  isHost: boolean
  
  // Mix state
  mixState: MixState | null
  pendingChanges: CollaborationEvent[]
  
  // Connection methods
  joinSession: () => Promise<void>
  leaveSession: () => Promise<void>
  
  // Collaboration methods
  broadcastChange: (eventType: CollaborationEventType, data: any) => Promise<void>
  updateCursor: (position: CursorPosition) => Promise<void>
  updateSelection: (selection: SelectionRange) => Promise<void>
  syncPlayback: (position: number, isPlaying: boolean) => Promise<void>
  
  // Event handlers
  addEventListener: (eventType: CollaborationEventType, handler: Function) => void
  removeEventListener: (eventType: CollaborationEventType, handler: Function) => void
  
  // Conflict resolution
  conflictEvents: CollaborationEvent[]
  conflictAnalysis: ConflictAnalysis | null
  resolveConflict: (eventId: string, resolution: 'accept' | 'reject' | 'merge') => Promise<void>
  resolveConflictWithResolution: (resolution: ConflictResolution) => Promise<void>
  
  // Permissions
  permissions: {
    canEdit: boolean
    canInvite: boolean
    canManagePermissions: boolean
    canExport: boolean
    canDelete: boolean
  }
  
  // Status
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  error: string | null
}

export const useRealtimeCollaboration = ({
  mixId,
  permission = 'editor',
  autoJoin = true
}: UseRealtimeCollaborationProps): UseRealtimeCollaborationReturn => {
  const { user } = useSupabase()
  
  // State
  const [session, setSession] = useState<CollaborationSession | null>(null)
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [mixState, setMixState] = useState<MixState | null>(null)
  const [pendingChanges, setPendingChanges] = useState<CollaborationEvent[]>([])
  const [conflictEvents, setConflictEvents] = useState<CollaborationEvent[]>([])
  const [conflictAnalysis, setConflictAnalysis] = useState<ConflictAnalysis | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [error, setError] = useState<string | null>(null)
  
  // Refs for event handlers
  const eventHandlersRef = useRef<Map<CollaborationEventType, Function[]>>(new Map())
  
  // Auto-join session on mount
  useEffect(() => {
    if (autoJoin && user && mixId) {
      joinSession()
    }
    
    return () => {
      if (isConnected) {
        leaveSession()
      }
    }
  }, [user, mixId, autoJoin])
  
  // Set up event listeners
  useEffect(() => {
    if (!isConnected) return
    
    const handleUserJoined = (event: CollaborationEvent) => {
      const newCollaborator = event.data.collaborator as CollaboratorInfo
      setCollaborators(prev => {
        const exists = prev.find(c => c.userId === newCollaborator.userId)
        if (exists) {
          return prev.map(c => c.userId === newCollaborator.userId ? newCollaborator : c)
        }
        return [...prev, newCollaborator]
      })
    }
    
    const handleUserLeft = (event: CollaborationEvent) => {
      const userId = event.data.userId
      setCollaborators(prev => prev.filter(c => c.userId !== userId))
    }
    
    const handleTrackAdded = (event: CollaborationEvent) => {
      setMixState(prev => {
        if (!prev) return prev
        return {
          ...prev,
          tracks: [...prev.tracks, event.data.track],
          totalTracks: prev.tracks.length + 1
        }
      })
    }
    
    const handleTrackRemoved = (event: CollaborationEvent) => {
      setMixState(prev => {
        if (!prev) return prev
        const newTracks = prev.tracks.filter(track => track.id !== event.data.trackId)
        return {
          ...prev,
          tracks: newTracks,
          totalTracks: newTracks.length
        }
      })
    }
    
    const handleTrackModified = (event: CollaborationEvent) => {
      setMixState(prev => {
        if (!prev) return prev
        const trackIndex = prev.tracks.findIndex(track => track.id === event.data.trackId)
        if (trackIndex >= 0) {
          const newTracks = [...prev.tracks]
          newTracks[trackIndex] = { ...newTracks[trackIndex], ...event.data.changes }
          return { ...prev, tracks: newTracks }
        }
        return prev
      })
    }
    
    const handleCursorMoved = (event: CollaborationEvent) => {
      setCollaborators(prev => prev.map(collaborator => 
        collaborator.userId === event.userId
          ? { ...collaborator, cursor: event.data.position }
          : collaborator
      ))
    }
    
    const handleSelectionChanged = (event: CollaborationEvent) => {
      setCollaborators(prev => prev.map(collaborator => 
        collaborator.userId === event.userId
          ? { ...collaborator, selection: event.data.selection }
          : collaborator
      ))
    }
    
    const handleConflictDetected = async (data: { event: CollaborationEvent, conflictingEvents: CollaborationEvent[] }) => {
      setConflictEvents(prev => [...prev.filter(e => e.id !== data.event.id), data.event])
      
      // Analyze the conflict
      if (data.conflictingEvents && mixState) {
        const context: ConflictContext = {
          mixId,
          conflictingEvents: data.conflictingEvents,
          currentMixState: mixState,
          collaborators,
          timestamp: new Date().toISOString()
        }
        
        try {
          const analysis = await conflictResolver.resolveConflict(context)
          setConflictAnalysis(analysis)
          
          // Auto-resolve if confidence is high enough
          if (analysis.recommendedResolution.confidence > 0.8 && analysis.recommendedResolution.strategy === 'auto') {
            await resolveConflictWithResolution(analysis.recommendedResolution)
          }
        } catch (error) {
          console.error('Error analyzing conflict:', error)
        }
      }
    }
    
    // Register event handlers
    realtimeCollaboration.addEventListener('user_joined', handleUserJoined)
    realtimeCollaboration.addEventListener('user_left', handleUserLeft)
    realtimeCollaboration.addEventListener('track_added', handleTrackAdded)
    realtimeCollaboration.addEventListener('track_removed', handleTrackRemoved)
    realtimeCollaboration.addEventListener('track_modified', handleTrackModified)
    realtimeCollaboration.addEventListener('cursor_moved', handleCursorMoved)
    realtimeCollaboration.addEventListener('selection_changed', handleSelectionChanged)
    realtimeCollaboration.addEventListener('conflict_detected' as CollaborationEventType, handleConflictDetected)
    
    return () => {
      // Cleanup event handlers
      realtimeCollaboration.removeEventListener('user_joined', handleUserJoined)
      realtimeCollaboration.removeEventListener('user_left', handleUserLeft)
      realtimeCollaboration.removeEventListener('track_added', handleTrackAdded)
      realtimeCollaboration.removeEventListener('track_removed', handleTrackRemoved)
      realtimeCollaboration.removeEventListener('track_modified', handleTrackModified)
      realtimeCollaboration.removeEventListener('cursor_moved', handleCursorMoved)
      realtimeCollaboration.removeEventListener('selection_changed', handleSelectionChanged)
      realtimeCollaboration.removeEventListener('conflict_detected' as CollaborationEventType, handleConflictDetected)
    }
  }, [isConnected])
  
  // Update session state when collaboration session changes
  useEffect(() => {
    const currentSession = realtimeCollaboration.getSession(mixId)
    if (currentSession) {
      setSession(currentSession)
      setMixState(currentSession.currentMixState)
      setPendingChanges(currentSession.pendingChanges)
      setCollaborators(currentSession.collaborators)
    }
  }, [mixId])
  
  // Join collaboration session
  const joinSession = useCallback(async () => {
    if (!user || !mixId) return
    
    try {
      setConnectionStatus('connecting')
      setError(null)
      
      const newSession = await realtimeCollaboration.initializeSession(
        mixId,
        user.id,
        permission
      )
      
      setSession(newSession)
      setMixState(newSession.currentMixState)
      setCollaborators(newSession.collaborators)
      setIsConnected(true)
      setConnectionStatus('connected')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join collaboration session'
      setError(errorMessage)
      setConnectionStatus('error')
    }
  }, [user, mixId, permission])
  
  // Leave collaboration session
  const leaveSession = useCallback(async () => {
    if (!user || !mixId) return
    
    try {
      await realtimeCollaboration.leaveSession(mixId, user.id)
      
      setSession(null)
      setMixState(null)
      setCollaborators([])
      setPendingChanges([])
      setIsConnected(false)
      setConnectionStatus('disconnected')
    } catch (err) {
      console.error('Error leaving collaboration session:', err)
    }
  }, [user, mixId])
  
  // Broadcast collaboration change
  const broadcastChange = useCallback(async (eventType: CollaborationEventType, data: any) => {
    if (!user || !mixId || !isConnected) return
    
    try {
      const event: CollaborationEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: eventType,
        mixId,
        userId: user.id,
        timestamp: new Date().toISOString(),
        data
      }
      
      await realtimeCollaboration.broadcastEvent(mixId, event)
    } catch (err) {
      console.error('Error broadcasting change:', err)
      setError(err instanceof Error ? err.message : 'Failed to broadcast change')
    }
  }, [user, mixId, isConnected])
  
  // Update cursor position
  const updateCursor = useCallback(async (position: CursorPosition) => {
    if (!user || !mixId || !isConnected) return
    
    try {
      await realtimeCollaboration.updateCursor(mixId, user.id, position)
    } catch (err) {
      console.error('Error updating cursor:', err)
    }
  }, [user, mixId, isConnected])
  
  // Update selection
  const updateSelection = useCallback(async (selection: SelectionRange) => {
    if (!user || !mixId || !isConnected) return
    
    try {
      await realtimeCollaboration.updateSelection(mixId, user.id, selection)
    } catch (err) {
      console.error('Error updating selection:', err)
    }
  }, [user, mixId, isConnected])
  
  // Sync playback position
  const syncPlayback = useCallback(async (position: number, isPlaying: boolean) => {
    if (!user || !mixId || !isConnected) return
    
    try {
      await realtimeCollaboration.syncPlayback(mixId, user.id, position, isPlaying)
    } catch (err) {
      console.error('Error syncing playback:', err)
    }
  }, [user, mixId, isConnected])
  
  // Add event listener
  const addEventListener = useCallback((eventType: CollaborationEventType, handler: Function) => {
    const handlers = eventHandlersRef.current.get(eventType) || []
    handlers.push(handler)
    eventHandlersRef.current.set(eventType, handlers)
    
    realtimeCollaboration.addEventListener(eventType, handler)
  }, [])
  
  // Remove event listener
  const removeEventListener = useCallback((eventType: CollaborationEventType, handler: Function) => {
    const handlers = eventHandlersRef.current.get(eventType) || []
    const index = handlers.indexOf(handler)
    if (index > -1) {
      handlers.splice(index, 1)
      eventHandlersRef.current.set(eventType, handlers)
    }
    
    realtimeCollaboration.removeEventListener(eventType, handler)
  }, [])
  
  // Resolve conflict (legacy method)
  const resolveConflict = useCallback(async (eventId: string, resolution: 'accept' | 'reject' | 'merge') => {
    const conflictEvent = conflictEvents.find(event => event.id === eventId)
    if (!conflictEvent) return
    
    try {
      switch (resolution) {
        case 'accept':
          // Apply the conflicting change
          await realtimeCollaboration.applyChange(mixId, conflictEvent)
          break
        case 'reject':
          // Ignore the conflicting change
          break
        case 'merge':
          // Attempt to merge changes (simplified implementation)
          await realtimeCollaboration.applyChange(mixId, {
            ...conflictEvent,
            conflictResolution: { strategy: 'merge', priority: 1 }
          })
          break
      }
      
      // Remove from conflict queue
      setConflictEvents(prev => prev.filter(event => event.id !== eventId))
      setConflictAnalysis(null)
    } catch (err) {
      console.error('Error resolving conflict:', err)
    }
  }, [conflictEvents, mixId])

  // Resolve conflict with full resolution object
  const resolveConflictWithResolution = useCallback(async (resolution: ConflictResolution) => {
    if (!mixState) return
    
    try {
      // Apply the resolution to the mix state
      if (resolution.resultingState) {
        setMixState(prev => prev ? { ...prev, ...resolution.resultingState } : prev)
      }
      
      // Apply each resolved event
      for (const event of resolution.resolvedEvents) {
        await realtimeCollaboration.applyChange(mixId, event)
      }
      
      // Clear conflicts
      setConflictEvents([])
      setConflictAnalysis(null)
      
      // Broadcast resolution to other collaborators
      if (user) {
        await broadcastChange('conflict_resolved' as CollaborationEventType, {
          resolution,
          resolvedBy: user.id,
          timestamp: new Date().toISOString()
        })
      }
    } catch (err) {
      console.error('Error applying conflict resolution:', err)
      setError(err instanceof Error ? err.message : 'Failed to apply resolution')
    }
  }, [mixState, mixId, user, broadcastChange])
  
  // Get permissions based on current user's role
  const permissions = session ? session.permissions : {
    canEdit: false,
    canInvite: false,
    canManagePermissions: false,
    canExport: false,
    canDelete: false
  }
  
  const isHost = session ? session.isHost : false
  
  return {
    // Session state
    session,
    collaborators,
    isConnected,
    isHost,
    
    // Mix state
    mixState,
    pendingChanges,
    
    // Connection methods
    joinSession,
    leaveSession,
    
    // Collaboration methods
    broadcastChange,
    updateCursor,
    updateSelection,
    syncPlayback,
    
    // Event handlers
    addEventListener,
    removeEventListener,
    
    // Conflict resolution
    conflictEvents,
    conflictAnalysis,
    resolveConflict,
    resolveConflictWithResolution,
    
    // Permissions
    permissions,
    
    // Status
    connectionStatus,
    error
  }
}

export default useRealtimeCollaboration