// Production Conflict Resolution System
// Advanced conflict detection and resolution for collaborative editing

import { CollaborationEvent, CollaboratorInfo } from './realtimeCollaboration'
import { MixState, MixTrack } from './mixManager'

export interface ConflictContext {
  mixId: string
  conflictingEvents: CollaborationEvent[]
  currentMixState: MixState
  collaborators: CollaboratorInfo[]
  timestamp: string
}

export interface ConflictResolution {
  strategy: 'auto' | 'manual' | 'merge' | 'user_choice'
  resolvedEvents: CollaborationEvent[]
  resultingState: Partial<MixState>
  confidence: number // 0-1
  reasoning: string
  requiresUserInput?: boolean
  alternatives?: ConflictResolution[]
}

export interface ConflictAnalysis {
  type: ConflictType
  severity: 'low' | 'medium' | 'high' | 'critical'
  affectedResources: string[]
  possibleResolutions: ConflictResolution[]
  recommendedResolution: ConflictResolution
  metadata: {
    conflictTime: string
    involvedUsers: string[]
    resourcePath: string[]
    changeTypes: string[]
  }
}

export enum ConflictType {
  TRACK_EDIT = 'track_edit',
  TRACK_ORDER = 'track_order',
  TRANSITION_OVERLAP = 'transition_overlap',
  EFFECT_CONFLICT = 'effect_conflict',
  METADATA_MISMATCH = 'metadata_mismatch',
  TIMING_CONFLICT = 'timing_conflict',
  PERMISSION_DENIED = 'permission_denied',
  STATE_DIVERGENCE = 'state_divergence'
}

export class ConflictResolver {
  private conflictAnalyzer: ConflictAnalyzer
  private mergeEngine: MergeEngine
  private userPreferenceStore: Map<string, ConflictResolutionPreference> = new Map()

  constructor() {
    this.conflictAnalyzer = new ConflictAnalyzer()
    this.mergeEngine = new MergeEngine()
  }

  // Main conflict resolution entry point
  async resolveConflict(context: ConflictContext): Promise<ConflictAnalysis> {
    const analysis = await this.conflictAnalyzer.analyzeConflict(context)
    
    // Generate possible resolutions
    const possibleResolutions = await this.generateResolutions(context, analysis)
    
    // Select recommended resolution based on context and user preferences
    const recommendedResolution = this.selectRecommendedResolution(
      possibleResolutions,
      context,
      analysis
    )

    return {
      ...analysis,
      possibleResolutions,
      recommendedResolution
    }
  }

  // Generate all possible resolution strategies
  private async generateResolutions(
    context: ConflictContext,
    analysis: ConflictAnalysis
  ): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = []

    // Last Write Wins
    resolutions.push(await this.createLastWriteWinsResolution(context))

    // First Write Wins
    resolutions.push(await this.createFirstWriteWinsResolution(context))

    // Intelligent Merge
    if (analysis.type !== ConflictType.PERMISSION_DENIED) {
      const mergeResolution = await this.createMergeResolution(context, analysis)
      if (mergeResolution) {
        resolutions.push(mergeResolution)
      }
    }

    // User-specific resolution based on permission hierarchy
    resolutions.push(await this.createPermissionBasedResolution(context))

    // Context-aware resolution
    resolutions.push(await this.createContextAwareResolution(context, analysis))

    return resolutions.filter(Boolean)
  }

  // Last Write Wins resolution
  private async createLastWriteWinsResolution(context: ConflictContext): Promise<ConflictResolution> {
    const latestEvent = context.conflictingEvents.reduce((latest, event) => 
      new Date(event.timestamp) > new Date(latest.timestamp) ? event : latest
    )

    return {
      strategy: 'auto',
      resolvedEvents: [latestEvent],
      resultingState: await this.applyEventToState(context.currentMixState, latestEvent),
      confidence: 0.6,
      reasoning: `Applied the most recent change from ${this.getCollaboratorName(latestEvent.userId, context.collaborators)} at ${latestEvent.timestamp}`
    }
  }

  // First Write Wins resolution
  private async createFirstWriteWinsResolution(context: ConflictContext): Promise<ConflictResolution> {
    const earliestEvent = context.conflictingEvents.reduce((earliest, event) => 
      new Date(event.timestamp) < new Date(earliest.timestamp) ? event : earliest
    )

    return {
      strategy: 'auto',
      resolvedEvents: [earliestEvent],
      resultingState: await this.applyEventToState(context.currentMixState, earliestEvent),
      confidence: 0.5,
      reasoning: `Applied the first change from ${this.getCollaboratorName(earliestEvent.userId, context.collaborators)} at ${earliestEvent.timestamp}`
    }
  }

  // Intelligent Merge resolution
  private async createMergeResolution(
    context: ConflictContext,
    analysis: ConflictAnalysis
  ): Promise<ConflictResolution | null> {
    const mergeResult = await this.mergeEngine.mergeConflictingChanges(
      context.conflictingEvents,
      context.currentMixState,
      analysis.type
    )

    if (!mergeResult.success) return null

    return {
      strategy: 'merge',
      resolvedEvents: context.conflictingEvents,
      resultingState: mergeResult.mergedState || {},
      confidence: mergeResult.confidence,
      reasoning: mergeResult.explanation || 'Successfully merged conflicting changes'
    }
  }

  // Permission-based resolution
  private async createPermissionBasedResolution(context: ConflictContext): Promise<ConflictResolution> {
    // Sort events by user permission priority (admin > editor > viewer)
    const sortedEvents = context.conflictingEvents.sort((a, b) => {
      const userA = context.collaborators.find(c => c.userId === a.userId)
      const userB = context.collaborators.find(c => c.userId === b.userId)
      return this.getPermissionPriority(userB?.permission) - this.getPermissionPriority(userA?.permission)
    })

    const priorityEvent = sortedEvents[0]

    return {
      strategy: 'auto',
      resolvedEvents: [priorityEvent],
      resultingState: await this.applyEventToState(context.currentMixState, priorityEvent),
      confidence: 0.8,
      reasoning: `Applied change from user with highest permission level: ${this.getCollaboratorName(priorityEvent.userId, context.collaborators)}`
    }
  }

  // Context-aware resolution
  private async createContextAwareResolution(
    context: ConflictContext,
    analysis: ConflictAnalysis
  ): Promise<ConflictResolution> {
    // Implement context-specific logic based on conflict type
    switch (analysis.type) {
      case ConflictType.TRACK_EDIT:
        return this.resolveTrackEditConflict(context, analysis)
      case ConflictType.TRACK_ORDER:
        return this.resolveTrackOrderConflict(context, analysis)
      case ConflictType.TRANSITION_OVERLAP:
        return this.resolveTransitionConflict(context, analysis)
      case ConflictType.EFFECT_CONFLICT:
        return this.resolveEffectConflict(context, analysis)
      default:
        return this.createLastWriteWinsResolution(context)
    }
  }

  // Track edit conflict resolution
  private async resolveTrackEditConflict(
    context: ConflictContext,
    analysis: ConflictAnalysis
  ): Promise<ConflictResolution> {
    const trackEvents = context.conflictingEvents.filter(e => e.type === 'track_modified')
    
    if (trackEvents.length === 2) {
      // Try to merge non-overlapping properties
      const event1 = trackEvents[0]
      const event2 = trackEvents[1]
      
      const mergedChanges = this.mergeTrackChanges(event1.data.changes, event2.data.changes)
      
      if (mergedChanges.hasConflicts) {
        return {
          strategy: 'user_choice',
          resolvedEvents: trackEvents,
          resultingState: {},
          confidence: 0.3,
          reasoning: 'Track modifications conflict on the same properties. User decision required.',
          requiresUserInput: true
        }
      } else {
        const mergedEvent: CollaborationEvent = {
          ...event2,
          data: { ...event2.data, changes: mergedChanges.result }
        }
        
        return {
          strategy: 'merge',
          resolvedEvents: [mergedEvent],
          resultingState: await this.applyEventToState(context.currentMixState, mergedEvent),
          confidence: 0.9,
          reasoning: 'Successfully merged non-conflicting track modifications'
        }
      }
    }

    return this.createLastWriteWinsResolution(context)
  }

  // Track order conflict resolution
  private async resolveTrackOrderConflict(
    context: ConflictContext,
    analysis: ConflictAnalysis
  ): Promise<ConflictResolution> {
    // Use timestamp to determine order - earlier operations take precedence
    const sortedEvents = context.conflictingEvents.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    // Apply events in chronological order
    let resultingState = { ...context.currentMixState }
    for (const event of sortedEvents) {
      resultingState = { ...resultingState, ...await this.applyEventToState(resultingState, event) }
    }

    return {
      strategy: 'merge',
      resolvedEvents: sortedEvents,
      resultingState,
      confidence: 0.8,
      reasoning: 'Applied track reordering operations in chronological order'
    }
  }

  // Transition conflict resolution
  private async resolveTransitionConflict(
    context: ConflictContext,
    analysis: ConflictAnalysis
  ): Promise<ConflictResolution> {
    // For transition conflicts, prefer the transition with better quality score
    const transitionEvents = context.conflictingEvents.filter(e => e.type === 'transition_changed')
    
    if (transitionEvents.length === 2) {
      const event1Quality = this.calculateTransitionQuality(transitionEvents[0])
      const event2Quality = this.calculateTransitionQuality(transitionEvents[1])
      
      const betterEvent = event1Quality > event2Quality ? transitionEvents[0] : transitionEvents[1]
      
      return {
        strategy: 'auto',
        resolvedEvents: [betterEvent],
        resultingState: await this.applyEventToState(context.currentMixState, betterEvent),
        confidence: 0.7,
        reasoning: `Selected transition with better quality score (${Math.max(event1Quality, event2Quality).toFixed(2)})`
      }
    }

    return this.createLastWriteWinsResolution(context)
  }

  // Effect conflict resolution
  private async resolveEffectConflict(
    context: ConflictContext,
    analysis: ConflictAnalysis
  ): Promise<ConflictResolution> {
    // For effect conflicts, try to stack compatible effects
    const effectEvents = context.conflictingEvents.filter(e => e.type === 'effect_applied')
    
    const stackableEffects = this.findStackableEffects(effectEvents)
    
    if (stackableEffects.length > 0) {
      return {
        strategy: 'merge',
        resolvedEvents: stackableEffects,
        resultingState: await this.applyMultipleEvents(context.currentMixState, stackableEffects),
        confidence: 0.8,
        reasoning: 'Stacked compatible effects from multiple users'
      }
    }

    return this.createPermissionBasedResolution(context)
  }

  // Helper methods
  private selectRecommendedResolution(
    resolutions: ConflictResolution[],
    context: ConflictContext,
    analysis: ConflictAnalysis
  ): ConflictResolution {
    // Sort by confidence score and select the best one
    const sortedResolutions = resolutions.sort((a, b) => b.confidence - a.confidence)
    
    // Consider user preferences if available
    const userPrefs = this.getUserPreferences(context.mixId)
    if (userPrefs) {
      const preferredResolution = sortedResolutions.find(r => r.strategy === userPrefs.preferredStrategy)
      if (preferredResolution && preferredResolution.confidence > 0.5) {
        return preferredResolution
      }
    }

    return sortedResolutions[0]
  }

  private getPermissionPriority(permission?: string): number {
    switch (permission) {
      case 'admin': return 3
      case 'editor': return 2
      case 'viewer': return 1
      default: return 0
    }
  }

  private getCollaboratorName(userId: string, collaborators: CollaboratorInfo[]): string {
    const collaborator = collaborators.find(c => c.userId === userId)
    return collaborator?.displayName || 'Unknown User'
  }

  private async applyEventToState(state: MixState, event: CollaborationEvent): Promise<Partial<MixState>> {
    // Simplified state application - in production this would be more comprehensive
    switch (event.type) {
      case 'track_modified':
        const trackIndex = state.tracks.findIndex(t => t.id === event.data.trackId)
        if (trackIndex >= 0) {
          const newTracks = [...state.tracks]
          newTracks[trackIndex] = { ...newTracks[trackIndex], ...event.data.changes }
          return { tracks: newTracks }
        }
        break
      case 'track_added':
        return { tracks: [...state.tracks, event.data.track], totalTracks: state.tracks.length + 1 }
      case 'track_removed':
        const filteredTracks = state.tracks.filter(t => t.id !== event.data.trackId)
        return { tracks: filteredTracks, totalTracks: filteredTracks.length }
      case 'metadata_updated':
        return event.data.metadata
    }
    return {}
  }

  private async applyMultipleEvents(state: MixState, events: CollaborationEvent[]): Promise<Partial<MixState>> {
    let resultState = { ...state }
    for (const event of events) {
      const changes = await this.applyEventToState(resultState, event)
      resultState = { ...resultState, ...changes }
    }
    return resultState
  }

  private mergeTrackChanges(changes1: any, changes2: any): { result: any, hasConflicts: boolean } {
    const result = { ...changes1 }
    let hasConflicts = false

    for (const [key, value] of Object.entries(changes2)) {
      if (key in changes1 && changes1[key] !== value) {
        hasConflicts = true
      } else {
        result[key] = value
      }
    }

    return { result, hasConflicts }
  }

  private calculateTransitionQuality(event: CollaborationEvent): number {
    // Simplified quality calculation based on transition parameters
    const params = event.data.parameters || {}
    let quality = 0.5

    // Prefer shorter transitions for better mixing
    if (params.duration && params.duration < 10) quality += 0.2
    
    // Prefer crossfades over cuts
    if (event.data.type === 'crossfade') quality += 0.3
    
    return Math.min(quality, 1.0)
  }

  private findStackableEffects(events: CollaborationEvent[]): CollaborationEvent[] {
    // Simple check for stackable effects (not the same type)
    const effectTypes = new Set()
    const stackable: CollaborationEvent[] = []

    for (const event of events) {
      const effectType = event.data.effectType
      if (!effectTypes.has(effectType)) {
        effectTypes.add(effectType)
        stackable.push(event)
      }
    }

    return stackable
  }

  private getUserPreferences(mixId: string): ConflictResolutionPreference | null {
    return this.userPreferenceStore.get(mixId) || null
  }

  // Public methods for preference management
  setUserPreferences(mixId: string, preferences: ConflictResolutionPreference): void {
    this.userPreferenceStore.set(mixId, preferences)
  }

  clearUserPreferences(mixId: string): void {
    this.userPreferenceStore.delete(mixId)
  }
}

// Conflict Analyzer
class ConflictAnalyzer {
  async analyzeConflict(context: ConflictContext): Promise<ConflictAnalysis> {
    const conflictType = this.identifyConflictType(context.conflictingEvents)
    const severity = this.assessSeverity(context.conflictingEvents, conflictType)
    const affectedResources = this.identifyAffectedResources(context.conflictingEvents)
    
    return {
      type: conflictType,
      severity,
      affectedResources,
      possibleResolutions: [], // Will be filled later
      recommendedResolution: null as any, // Will be filled later
      metadata: {
        conflictTime: new Date().toISOString(),
        involvedUsers: Array.from(new Set(context.conflictingEvents.map(e => e.userId))),
        resourcePath: this.buildResourcePath(context.conflictingEvents),
        changeTypes: Array.from(new Set(context.conflictingEvents.map(e => e.type)))
      }
    }
  }

  private identifyConflictType(events: CollaborationEvent[]): ConflictType {
    const eventTypes = new Set(events.map(e => e.type))
    
    if (eventTypes.has('track_modified')) return ConflictType.TRACK_EDIT
    if (eventTypes.has('track_reordered')) return ConflictType.TRACK_ORDER
    if (eventTypes.has('transition_changed')) return ConflictType.TRANSITION_OVERLAP
    if (eventTypes.has('effect_applied')) return ConflictType.EFFECT_CONFLICT
    if (eventTypes.has('metadata_updated')) return ConflictType.METADATA_MISMATCH
    
    return ConflictType.STATE_DIVERGENCE
  }

  private assessSeverity(events: CollaborationEvent[], type: ConflictType): 'low' | 'medium' | 'high' | 'critical' {
    if (type === ConflictType.PERMISSION_DENIED) return 'critical'
    if (type === ConflictType.STATE_DIVERGENCE) return 'high'
    if (events.length > 3) return 'high'
    if (events.length > 2) return 'medium'
    return 'low'
  }

  private identifyAffectedResources(events: CollaborationEvent[]): string[] {
    const resources = new Set<string>()
    
    events.forEach(event => {
      switch (event.type) {
        case 'track_modified':
        case 'track_removed':
          resources.add(`track:${event.data.trackId}`)
          break
        case 'track_added':
          resources.add(`tracks`)
          break
        case 'transition_changed':
          resources.add(`transition:${event.data.trackIndex}`)
          break
        case 'effect_applied':
          resources.add(`effects:${event.data.trackId}`)
          break
        case 'metadata_updated':
          resources.add('metadata')
          break
      }
    })
    
    return Array.from(resources)
  }

  private buildResourcePath(events: CollaborationEvent[]): string[] {
    return events.map(event => {
      switch (event.type) {
        case 'track_modified':
          return `tracks[${event.data.trackIndex || 'unknown'}]`
        case 'transition_changed':
          return `transitions[${event.data.trackIndex}]`
        case 'effect_applied':
          return `effects[${event.data.effectType}]`
        default:
          return event.type
      }
    })
  }
}

// Merge Engine
class MergeEngine {
  async mergeConflictingChanges(
    events: CollaborationEvent[],
    currentState: MixState,
    conflictType: ConflictType
  ): Promise<{ success: boolean, mergedState?: Partial<MixState>, confidence: number, explanation?: string }> {
    
    switch (conflictType) {
      case ConflictType.TRACK_EDIT:
        return this.mergeTrackEdits(events, currentState)
      case ConflictType.EFFECT_CONFLICT:
        return this.mergeEffectChanges(events, currentState)
      case ConflictType.METADATA_MISMATCH:
        return this.mergeMetadata(events, currentState)
      default:
        return { success: false, confidence: 0 }
    }
  }

  private async mergeTrackEdits(
    events: CollaborationEvent[],
    currentState: MixState
  ): Promise<{ success: boolean, mergedState?: Partial<MixState>, confidence: number, explanation?: string }> {
    if (events.length !== 2) return { success: false, confidence: 0 }

    const [event1, event2] = events
    const changes1 = event1.data.changes
    const changes2 = event2.data.changes

    // Check for conflicting properties
    const conflictingKeys = Object.keys(changes1).filter(key => 
      key in changes2 && changes1[key] !== changes2[key]
    )

    if (conflictingKeys.length > 0) {
      return { success: false, confidence: 0.2, explanation: `Conflicting changes on: ${conflictingKeys.join(', ')}` }
    }

    // Merge non-conflicting changes
    const mergedChanges = { ...changes1, ...changes2 }
    const trackIndex = currentState.tracks.findIndex(t => t.id === event1.data.trackId)
    
    if (trackIndex >= 0) {
      const newTracks = [...currentState.tracks]
      newTracks[trackIndex] = { ...newTracks[trackIndex], ...mergedChanges }
      
      return {
        success: true,
        mergedState: { tracks: newTracks },
        confidence: 0.9,
        explanation: 'Successfully merged non-conflicting track changes'
      }
    }

    return { success: false, confidence: 0 }
  }

  private async mergeEffectChanges(
    events: CollaborationEvent[],
    currentState: MixState
  ): Promise<{ success: boolean, mergedState?: Partial<MixState>, confidence: number, explanation?: string }> {
    // Check if effects can be stacked
    const effectTypes = events.map(e => e.data.effectType)
    const uniqueTypes = new Set(effectTypes)
    
    if (uniqueTypes.size === effectTypes.length) {
      // All different effect types - can be stacked
      return {
        success: true,
        confidence: 0.8,
        explanation: 'Stacked multiple compatible effects'
      }
    }

    return { success: false, confidence: 0.3, explanation: 'Cannot stack effects of the same type' }
  }

  private async mergeMetadata(
    events: CollaborationEvent[],
    currentState: MixState
  ): Promise<{ success: boolean, mergedState?: Partial<MixState>, confidence: number, explanation?: string }> {
    const mergedMetadata = {}
    
    // Merge all metadata changes
    events.forEach(event => {
      Object.assign(mergedMetadata, event.data.metadata)
    })

    return {
      success: true,
      mergedState: mergedMetadata,
      confidence: 0.7,
      explanation: 'Merged metadata from all users'
    }
  }
}

// User preferences interface
export interface ConflictResolutionPreference {
  preferredStrategy: 'auto' | 'manual' | 'merge' | 'user_choice'
  autoResolveThreshold: number // 0-1, confidence threshold for auto-resolution
  notificationPreferences: {
    onConflict: boolean
    onResolution: boolean
    onMergeSuccess: boolean
  }
}

// Export singleton
export const conflictResolver = new ConflictResolver()