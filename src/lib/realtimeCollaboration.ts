// Production Real-time Collaboration Service
// WebSocket infrastructure for collaborative mix editing

import { createClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { MixState, MixTrack } from './mixManager'

// Collaboration event types
export type CollaborationEventType = 
  | 'track_added'
  | 'track_removed'
  | 'track_modified'
  | 'track_reordered'
  | 'effect_applied'
  | 'transition_changed'
  | 'metadata_updated'
  | 'user_joined'
  | 'user_left'
  | 'cursor_moved'
  | 'selection_changed'
  | 'playback_sync'

export interface CollaborationEvent {
  id: string
  type: CollaborationEventType
  mixId: string
  userId: string
  timestamp: string
  data: any
  conflictResolution?: ConflictResolution
}

export interface ConflictResolution {
  strategy: 'last_write_wins' | 'merge' | 'manual'
  priority: number
  metadata?: any
}

export interface CollaboratorInfo {
  id: string
  userId: string
  displayName: string
  avatarUrl?: string
  permission: 'viewer' | 'editor' | 'admin'
  isOnline: boolean
  cursor?: CursorPosition
  selection?: SelectionRange
  lastActivity: string
}

export interface CursorPosition {
  timelinePosition: number
  trackIndex?: number
  component?: string
}

export interface SelectionRange {
  startTime: number
  endTime: number
  trackIndex?: number
}

export interface CollaborationSession {
  mixId: string
  sessionId: string
  collaborators: CollaboratorInfo[]
  currentMixState: MixState
  pendingChanges: CollaborationEvent[]
  isHost: boolean
  permissions: CollaboratorPermissions
}

export interface CollaboratorPermissions {
  canEdit: boolean
  canInvite: boolean
  canManagePermissions: boolean
  canExport: boolean
  canDelete: boolean
}

class RealtimeCollaborationService {
  private supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL!,
    process.env.REACT_APP_SUPABASE_ANON_KEY!
  )

  private channels: Map<string, RealtimeChannel> = new Map()
  private collaborationSessions: Map<string, CollaborationSession> = new Map()
  private eventHandlers: Map<CollaborationEventType, Function[]> = new Map()
  private conflictQueue: CollaborationEvent[] = []

  // Initialize collaboration session
  async initializeSession(
    mixId: string,
    userId: string,
    permission: CollaboratorInfo['permission'] = 'editor'
  ): Promise<CollaborationSession> {
    try {
      // Create or join channel
      const channelName = `mix_collaboration:${mixId}`
      let channel = this.channels.get(channelName)

      if (!channel) {
        channel = this.supabase.channel(channelName, {
          config: {
            broadcast: { self: true },
            presence: { key: userId }
          }
        })

        // Set up channel event handlers
        this.setupChannelHandlers(channel, mixId)
        
        // Subscribe to channel
        await new Promise((resolve, reject) => {
          channel!
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                resolve(status)
              } else if (status === 'CHANNEL_ERROR') {
                reject(new Error('Failed to subscribe to collaboration channel'))
              }
            })
        })

        this.channels.set(channelName, channel)
      }

      // Get user profile
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .single()

      // Create collaborator info
      const collaborator: CollaboratorInfo = {
        id: `${mixId}_${userId}`,
        userId,
        displayName: profile?.display_name || 'Unknown User',
        avatarUrl: profile?.avatar_url,
        permission,
        isOnline: true,
        lastActivity: new Date().toISOString()
      }

      // Join presence
      await channel.track(collaborator)

      // Get initial mix state
      const { data: mixData } = await this.supabase
        .from('mixes')
        .select('*')
        .eq('id', mixId)
        .single()

      if (!mixData) {
        throw new Error('Mix not found')
      }

      // Create collaboration session
      const session: CollaborationSession = {
        mixId,
        sessionId: `session_${mixId}_${Date.now()}`,
        collaborators: [collaborator],
        currentMixState: mixData as MixState,
        pendingChanges: [],
        isHost: true, // First user is host
        permissions: this.getPermissions(permission)
      }

      this.collaborationSessions.set(mixId, session)

      // Announce user joined
      this.broadcastEvent(mixId, {
        id: `event_${Date.now()}`,
        type: 'user_joined',
        mixId,
        userId,
        timestamp: new Date().toISOString(),
        data: { collaborator }
      })

      return session
    } catch (error) {
      console.error('Error initializing collaboration session:', error)
      throw new Error(`Failed to initialize collaboration: ${error}`)
    }
  }

  // Leave collaboration session
  async leaveSession(mixId: string, userId: string): Promise<void> {
    try {
      const channelName = `mix_collaboration:${mixId}`
      const channel = this.channels.get(channelName)

      if (channel) {
        // Announce user left
        this.broadcastEvent(mixId, {
          id: `event_${Date.now()}`,
          type: 'user_left',
          mixId,
          userId,
          timestamp: new Date().toISOString(),
          data: { userId }
        })

        // Untrack presence
        await channel.untrack()

        // Unsubscribe if no other users
        const session = this.collaborationSessions.get(mixId)
        if (session && session.collaborators.length <= 1) {
          await channel.unsubscribe()
          this.channels.delete(channelName)
          this.collaborationSessions.delete(mixId)
        }
      }
    } catch (error) {
      console.error('Error leaving collaboration session:', error)
    }
  }

  // Broadcast collaboration event
  async broadcastEvent(mixId: string, event: CollaborationEvent): Promise<void> {
    const channelName = `mix_collaboration:${mixId}`
    const channel = this.channels.get(channelName)

    if (!channel) {
      throw new Error('Collaboration channel not found')
    }

    // Add to pending changes
    const session = this.collaborationSessions.get(mixId)
    if (session) {
      session.pendingChanges.push(event)
    }

    // Broadcast to all collaborators
    await channel.send({
      type: 'broadcast',
      event: 'collaboration_event',
      payload: event
    })

    // Persist event to database
    await this.persistEvent(event)
  }

  // Apply collaborative change
  async applyChange(mixId: string, event: CollaborationEvent): Promise<void> {
    const session = this.collaborationSessions.get(mixId)
    if (!session) return

    try {
      // Check for conflicts
      const hasConflict = this.detectConflict(event, session.pendingChanges)
      
      if (hasConflict) {
        await this.resolveConflict(event, session)
        return
      }

      // Apply change to mix state
      const updatedMixState = await this.applyEventToMixState(session.currentMixState, event)
      session.currentMixState = updatedMixState

      // Remove from pending changes
      session.pendingChanges = session.pendingChanges.filter(e => e.id !== event.id)

      // Emit event to handlers
      this.emitEvent(event.type, event)

      // Auto-save periodically
      this.scheduleAutoSave(mixId)
    } catch (error) {
      console.error('Error applying collaborative change:', error)
    }
  }

  // Update cursor position
  async updateCursor(mixId: string, userId: string, position: CursorPosition): Promise<void> {
    const event: CollaborationEvent = {
      id: `cursor_${Date.now()}`,
      type: 'cursor_moved',
      mixId,
      userId,
      timestamp: new Date().toISOString(),
      data: { position }
    }

    await this.broadcastEvent(mixId, event)
  }

  // Update selection
  async updateSelection(mixId: string, userId: string, selection: SelectionRange): Promise<void> {
    const event: CollaborationEvent = {
      id: `selection_${Date.now()}`,
      type: 'selection_changed',
      mixId,
      userId,
      timestamp: new Date().toISOString(),
      data: { selection }
    }

    await this.broadcastEvent(mixId, event)
  }

  // Sync playback position
  async syncPlayback(mixId: string, userId: string, position: number, isPlaying: boolean): Promise<void> {
    const event: CollaborationEvent = {
      id: `playback_${Date.now()}`,
      type: 'playback_sync',
      mixId,
      userId,
      timestamp: new Date().toISOString(),
      data: { position, isPlaying }
    }

    await this.broadcastEvent(mixId, event)
  }

  // Event handlers
  addEventListener(eventType: CollaborationEventType, handler: Function): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, [])
    }
    this.eventHandlers.get(eventType)!.push(handler)
  }

  removeEventListener(eventType: CollaborationEventType, handler: Function): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  // Get current session
  getSession(mixId: string): CollaborationSession | null {
    return this.collaborationSessions.get(mixId) || null
  }

  // Get collaborators
  getCollaborators(mixId: string): CollaboratorInfo[] {
    const session = this.collaborationSessions.get(mixId)
    return session ? session.collaborators : []
  }

  // Private methods
  private setupChannelHandlers(channel: RealtimeChannel, mixId: string): void {
    // Handle incoming collaboration events
    channel.on('broadcast', { event: 'collaboration_event' }, (payload) => {
      const event = payload.payload as CollaborationEvent
      this.applyChange(mixId, event)
    })

    // Handle presence changes
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      this.updateCollaborators(mixId, state)
    })

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', key, newPresences)
    })

    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', key, leftPresences)
    })

    // Handle database changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'mixes',
        filter: `id=eq.${mixId}`
      },
      (payload: RealtimePostgresChangesPayload<any>) => {
        this.handleDatabaseChange(mixId, payload)
      }
    )
  }

  private updateCollaborators(mixId: string, presenceState: any): void {
    const session = this.collaborationSessions.get(mixId)
    if (!session) return

    const collaborators: CollaboratorInfo[] = []
    Object.entries(presenceState).forEach(([userId, presences]) => {
      const presence = (presences as any[])[0]
      if (presence) {
        collaborators.push({
          ...presence,
          isOnline: true,
          lastActivity: new Date().toISOString()
        })
      }
    })

    session.collaborators = collaborators
  }

  private async persistEvent(event: CollaborationEvent): Promise<void> {
    try {
      await this.supabase
        .from('collaboration_events')
        .insert({
          id: event.id,
          mix_id: event.mixId,
          user_id: event.userId,
          event_type: event.type,
          event_data: event.data,
          created_at: event.timestamp
        })
    } catch (error) {
      console.error('Error persisting collaboration event:', error)
    }
  }

  private detectConflict(event: CollaborationEvent, pendingChanges: CollaborationEvent[]): boolean {
    // Check if there are conflicting changes to the same resource
    return pendingChanges.some(pendingEvent => {
      if (pendingEvent.type === event.type && pendingEvent.userId !== event.userId) {
        // Check for specific conflicts based on event type
        switch (event.type) {
          case 'track_modified':
            return pendingEvent.data.trackId === event.data.trackId
          case 'transition_changed':
            return pendingEvent.data.trackIndex === event.data.trackIndex
          case 'metadata_updated':
            return pendingEvent.data.field === event.data.field
          default:
            return false
        }
      }
      return false
    })
  }

  private async resolveConflict(event: CollaborationEvent, session: CollaborationSession): Promise<void> {
    const strategy = event.conflictResolution?.strategy || 'last_write_wins'
    
    switch (strategy) {
      case 'last_write_wins':
        // Apply the most recent change
        this.conflictQueue.push(event)
        break
      case 'merge':
        // Attempt to merge changes
        await this.mergeChanges(event, session)
        break
      case 'manual':
        // Queue for manual resolution
        this.conflictQueue.push(event)
        this.emitEvent('conflict_detected' as CollaborationEventType, { event, session })
        break
    }
  }

  private async mergeChanges(event: CollaborationEvent, session: CollaborationSession): Promise<void> {
    // Implement merge logic based on event type
    // This is a simplified implementation
    console.log('Merging collaborative changes:', event)
    
    // For now, fall back to last write wins
    await this.applyEventToMixState(session.currentMixState, event)
  }

  private async applyEventToMixState(mixState: MixState, event: CollaborationEvent): Promise<MixState> {
    const newState = { ...mixState }

    switch (event.type) {
      case 'track_added':
        newState.tracks.push(event.data.track)
        newState.totalTracks = newState.tracks.length
        break
      
      case 'track_removed':
        newState.tracks = newState.tracks.filter(track => track.id !== event.data.trackId)
        newState.totalTracks = newState.tracks.length
        break
      
      case 'track_modified':
        const trackIndex = newState.tracks.findIndex(track => track.id === event.data.trackId)
        if (trackIndex >= 0) {
          newState.tracks[trackIndex] = { ...newState.tracks[trackIndex], ...event.data.changes }
        }
        break
      
      case 'track_reordered':
        const { fromIndex, toIndex } = event.data
        const [movedTrack] = newState.tracks.splice(fromIndex, 1)
        newState.tracks.splice(toIndex, 0, movedTrack)
        break
      
      case 'metadata_updated':
        Object.assign(newState, event.data.metadata)
        break
    }

    return newState
  }

  private handleDatabaseChange(mixId: string, payload: RealtimePostgresChangesPayload<any>): void {
    console.log('Database change detected:', payload)
    
    // Update local mix state based on database changes
    const session = this.collaborationSessions.get(mixId)
    if (session && payload.new) {
      session.currentMixState = { ...session.currentMixState, ...payload.new }
    }
  }

  private emitEvent(eventType: CollaborationEventType, data: any): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error('Error in event handler:', error)
        }
      })
    }
  }

  private scheduleAutoSave(mixId: string): void {
    // Debounced auto-save implementation
    clearTimeout((this as any)[`autoSaveTimer_${mixId}`])
    ;(this as any)[`autoSaveTimer_${mixId}`] = setTimeout(async () => {
      const session = this.collaborationSessions.get(mixId)
      if (session && session.pendingChanges.length === 0) {
        // Save current state to database
        await this.supabase
          .from('mixes')
          .update(session.currentMixState)
          .eq('id', mixId)
      }
    }, 2000) // Auto-save after 2 seconds of inactivity
  }

  private getPermissions(role: CollaboratorInfo['permission']): CollaboratorPermissions {
    switch (role) {
      case 'admin':
        return {
          canEdit: true,
          canInvite: true,
          canManagePermissions: true,
          canExport: true,
          canDelete: true
        }
      case 'editor':
        return {
          canEdit: true,
          canInvite: false,
          canManagePermissions: false,
          canExport: true,
          canDelete: false
        }
      case 'viewer':
        return {
          canEdit: false,
          canInvite: false,
          canManagePermissions: false,
          canExport: false,
          canDelete: false
        }
      default:
        return {
          canEdit: false,
          canInvite: false,
          canManagePermissions: false,
          canExport: false,
          canDelete: false
        }
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Close all channels and clean up resources
    for (const [channelName, channel] of Array.from(this.channels)) {
      await channel.unsubscribe()
    }
    this.channels.clear()
    this.collaborationSessions.clear()
    this.eventHandlers.clear()
    this.conflictQueue = []
  }
}

// Export singleton instance
export const realtimeCollaboration = new RealtimeCollaborationService()

// All types are already exported as interfaces above