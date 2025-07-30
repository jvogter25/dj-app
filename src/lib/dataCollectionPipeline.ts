// Production Data Collection and Feedback Pipeline
// Comprehensive system for collecting user interactions and improving AI models

import { TrackAnalysis } from './trackDatabase'
import { UserAction, PersonalityProfile } from './personalStyleLearning'
import { DJContext } from './contextAwareSystem'
import { RealtimeAnalysisResult } from './realtimeAudioAnalyzer'
import { useSupabase } from '../hooks/useSupabase'

// Data collection interfaces
interface SessionData {
  id: string
  userId: string
  startTime: number
  endTime?: number
  venue?: string
  context: DJContext
  tracks: TrackSession[]
  performance: SessionPerformance
  metadata: {
    deviceInfo: string
    appVersion: string
    features: string[]
  }
}

interface TrackSession {
  trackId: string
  startTime: number
  endTime?: number
  deck: 'A' | 'B'
  source: 'spotify' | 'soundcloud' | 'local'
  analysis: TrackAnalysis
  realtimeData?: RealtimeAnalysisResult[]
  userActions: UserAction[]
  transitionsFrom?: TransitionData[]
  transitionsTo?: TransitionData[]
}

interface TransitionData {
  id: string
  fromTrack: string
  toTrack: string
  timestamp: number
  technique: string
  parameters: {
    crossfaderPath: number[]
    eqChanges: { low: number[], mid: number[], high: number[] }
    effects: Array<{ type: string, parameters: any, timing: number }>
    duration: number
  }
  quality: {
    predicted: number
    actual?: number
    userRating?: number
    crowdResponse?: number
  }
  aiAssistance: {
    suggestionUsed: boolean
    suggestionId?: string
    modifications: string[]
  }
}

interface SessionPerformance {
  totalTracks: number
  totalTransitions: number
  avgTransitionQuality: number
  crowdResponseMetrics: {
    initial: number
    peak: number
    final: number
    variance: number
  }
  technicalMetrics: {
    mixingErrors: number
    beatMatchAccuracy: number
    keyCompatibilityScore: number
    energyFlowScore: number
  }
  aiUsageMetrics: {
    suggestionsOffered: number
    suggestionsAccepted: number
    automationUsed: number
    overridesApplied: number
  }
}

interface FeedbackData {
  id: string
  userId: string
  timestamp: number
  type: 'suggestion_rating' | 'bug_report' | 'feature_request' | 'performance_feedback' | 'ai_explanation'
  category: string
  content: {
    rating?: number // 1-5
    text?: string
    context?: any
    suggestions?: string[]
  }
  metadata: {
    sessionId?: string
    trackId?: string
    feature?: string
    severity?: 'low' | 'medium' | 'high' | 'critical'
  }
}

interface ModelPerformanceMetrics {
  modelId: string
  version: string
  timestamp: number
  metrics: {
    accuracy: number
    precision: number
    recall: number
    f1Score: number
    confidenceCalibration: number
    latency: number
    memoryUsage: number
  }
  testData: {
    sampleSize: number
    dataDistribution: { [key: string]: number }
    difficultyLevel: 'easy' | 'medium' | 'hard' | 'mixed'
  }
}

class ProductionDataCollectionPipeline {
  private currentSession: SessionData | null = null
  private sessionBuffer: SessionData[] = []
  private feedbackBuffer: FeedbackData[] = []
  private metricsBuffer: ModelPerformanceMetrics[] = []
  
  private readonly bufferSize = 100
  private readonly uploadInterval = 60000 // 1 minute
  private readonly batchSize = 20
  
  private uploadTimer: NodeJS.Timeout | null = null
  private isOnline = navigator.onLine
  
  constructor() {
    this.initializeDataCollection()
    this.setupNetworkMonitoring()
    this.startPeriodicUpload()
  }
  
  // Initialize data collection system
  private initializeDataCollection(): void {
    // Load any pending data from localStorage
    this.loadPendingData()
    
    // Setup beforeunload handler to save session
    window.addEventListener('beforeunload', () => {
      this.saveCurrentSession()
      this.savePendingData()
    })
    
    // Setup error tracking
    window.addEventListener('error', (event) => {
      this.recordError({
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        stack: event.error?.stack
      })
    })
    
    // Setup performance monitoring
    if ('PerformanceObserver' in window) {
      this.setupPerformanceMonitoring()
    }
  }
  
  // Setup network status monitoring
  private setupNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.uploadPendingData()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }
  
  // Setup performance monitoring
  private setupPerformanceMonitoring(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        if (entry.entryType === 'navigation') {
          this.recordPerformanceMetric('page_load', entry.duration)
        } else if (entry.entryType === 'measure') {
          this.recordPerformanceMetric(entry.name, entry.duration)
        }
      })
    })
    
    observer.observe({ entryTypes: ['navigation', 'measure'] })
  }
  
  // Start a new DJ session
  async startSession(userId: string, context: DJContext): Promise<string> {
    // End current session if exists
    if (this.currentSession) {
      await this.endSession()
    }
    
    const sessionId = `session_${userId}_${Date.now()}`
    
    this.currentSession = {
      id: sessionId,
      userId,
      startTime: Date.now(),
      context,
      tracks: [],
      performance: {
        totalTracks: 0,
        totalTransitions: 0,
        avgTransitionQuality: 0,
        crowdResponseMetrics: {
          initial: 0,
          peak: 0,
          final: 0,
          variance: 0
        },
        technicalMetrics: {
          mixingErrors: 0,
          beatMatchAccuracy: 0,
          keyCompatibilityScore: 0,
          energyFlowScore: 0
        },
        aiUsageMetrics: {
          suggestionsOffered: 0,
          suggestionsAccepted: 0,
          automationUsed: 0,
          overridesApplied: 0
        }
      },
      metadata: {
        deviceInfo: this.getDeviceInfo(),
        appVersion: this.getAppVersion(),
        features: this.getEnabledFeatures()
      }
    }
    
    console.log(`Started DJ session: ${sessionId}`)
    return sessionId
  }
  
  // End current session
  async endSession(): Promise<void> {
    if (!this.currentSession) return
    
    this.currentSession.endTime = Date.now()
    
    // Calculate final performance metrics
    this.calculateSessionMetrics()
    
    // Add to buffer for upload
    this.sessionBuffer.push(this.currentSession)
    
    console.log(`Ended DJ session: ${this.currentSession.id}`)
    this.currentSession = null
    
    // Trigger upload if buffer is full
    if (this.sessionBuffer.length >= this.bufferSize) {
      await this.uploadPendingData()
    }
  }
  
  // Record track loading
  recordTrackLoad(
    trackId: string,
    deck: 'A' | 'B',
    source: 'spotify' | 'soundcloud' | 'local',
    analysis: TrackAnalysis
  ): void {
    if (!this.currentSession) return
    
    const trackSession: TrackSession = {
      trackId,
      startTime: Date.now(),
      deck,
      source,
      analysis,
      userActions: [],
      transitionsFrom: [],
      transitionsTo: []
    }
    
    this.currentSession.tracks.push(trackSession)
    this.currentSession.performance.totalTracks++
  }
  
  // Record user action
  recordUserAction(action: UserAction): void {
    if (!this.currentSession) return
    
    // Find relevant track session
    const trackSession = this.currentSession.tracks.find(t => 
      t.trackId === action.context.currentTrack?.id || 
      t.trackId === action.context.targetTrack?.id
    )
    
    if (trackSession) {
      trackSession.userActions.push(action)
    }
    
    // Update AI usage metrics
    if (action.type === 'track_select' && action.action.selectedFromSuggestions) {
      this.currentSession.performance.aiUsageMetrics.suggestionsAccepted++
    }
  }
  
  // Record transition
  recordTransition(transitionData: TransitionData): void {
    if (!this.currentSession) return
    
    // Find source and target track sessions
    const fromTrack = this.currentSession.tracks.find(t => t.trackId === transitionData.fromTrack)
    const toTrack = this.currentSession.tracks.find(t => t.trackId === transitionData.toTrack)
    
    if (fromTrack) {
      fromTrack.transitionsFrom = fromTrack.transitionsFrom || []
      fromTrack.transitionsFrom.push(transitionData)
      fromTrack.endTime = transitionData.timestamp
    }
    
    if (toTrack) {
      toTrack.transitionsTo = toTrack.transitionsTo || []
      toTrack.transitionsTo.push(transitionData)
    }
    
    // Update performance metrics
    this.currentSession.performance.totalTransitions++
    
    if (transitionData.quality.actual !== undefined) {
      const currentAvg = this.currentSession.performance.avgTransitionQuality
      const count = this.currentSession.performance.totalTransitions
      this.currentSession.performance.avgTransitionQuality = 
        (currentAvg * (count - 1) + transitionData.quality.actual) / count
    }
    
    if (transitionData.aiAssistance.suggestionUsed) {
      this.currentSession.performance.aiUsageMetrics.suggestionsAccepted++
    }
  }
  
  // Record real-time analysis data
  recordRealtimeData(trackId: string, analysisResult: RealtimeAnalysisResult): void {
    if (!this.currentSession) return
    
    const trackSession = this.currentSession.tracks.find(t => t.trackId === trackId)
    if (trackSession) {
      trackSession.realtimeData = trackSession.realtimeData || []
      trackSession.realtimeData.push(analysisResult)
      
      // Keep only recent data to manage memory
      if (trackSession.realtimeData.length > 1000) {
        trackSession.realtimeData = trackSession.realtimeData.slice(-500)
      }
    }
  }
  
  // Record user feedback
  async recordFeedback(feedback: Omit<FeedbackData, 'id' | 'timestamp'>): Promise<string> {
    const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const feedbackData: FeedbackData = {
      id: feedbackId,
      timestamp: Date.now(),
      ...feedback
    }
    
    this.feedbackBuffer.push(feedbackData)
    
    // Immediate upload for critical feedback
    if (feedback.metadata?.severity === 'critical') {
      await this.uploadFeedback([feedbackData])
    }
    
    return feedbackId
  }
  
  // Record model performance metrics
  recordModelMetrics(metrics: ModelPerformanceMetrics): void {
    this.metricsBuffer.push(metrics)
  }
  
  // Record performance metric
  private recordPerformanceMetric(name: string, duration: number): void {
    if (!this.currentSession) return
    
    // Track specific performance events
    if (name.includes('ai_suggestion')) {
      this.currentSession.performance.aiUsageMetrics.suggestionsOffered++
    }
  }
  
  // Record error
  private recordError(error: {
    type: string
    message: string
    filename?: string
    line?: number
    stack?: string
  }): void {
    // Create error feedback entry
    this.recordFeedback({
      userId: this.currentSession?.userId || 'anonymous',
      type: 'bug_report',
      category: 'runtime_error',
      content: {
        text: error.message,
        context: {
          type: error.type,
          filename: error.filename,
          line: error.line,
          stack: error.stack,
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      },
      metadata: {
        sessionId: this.currentSession?.id,
        severity: 'medium'
      }
    })
  }
  
  // Calculate session-level metrics
  private calculateSessionMetrics(): void {
    if (!this.currentSession) return
    
    const session = this.currentSession
    const tracks = session.tracks
    
    if (tracks.length === 0) return
    
    // Calculate technical metrics
    let totalKeyScore = 0
    let totalEnergyScore = 0
    let transitionCount = 0
    
    tracks.forEach(track => {
      if (track.transitionsFrom) {
        track.transitionsFrom.forEach(transition => {
          transitionCount++
          // Add key compatibility and energy flow calculations here
          totalKeyScore += 0.8 // Placeholder
          totalEnergyScore += 0.7 // Placeholder
        })
      }
    })
    
    if (transitionCount > 0) {
      session.performance.technicalMetrics.keyCompatibilityScore = totalKeyScore / transitionCount
      session.performance.technicalMetrics.energyFlowScore = totalEnergyScore / transitionCount
    }
    
    // Calculate crowd response metrics from real-time data
    const crowdResponses: number[] = []
    tracks.forEach(track => {
      if (track.realtimeData) {
        track.realtimeData.forEach(data => {
          // Skip crowd response for now until it's implemented in RealtimeAnalysisResult
          // if (data.crowdResponse !== undefined) {
          //   crowdResponses.push(data.crowdResponse)
          // }
        })
      }
    })
    
    if (crowdResponses.length > 0) {
      session.performance.crowdResponseMetrics.initial = crowdResponses[0]
      session.performance.crowdResponseMetrics.final = crowdResponses[crowdResponses.length - 1]
      session.performance.crowdResponseMetrics.peak = Math.max(...crowdResponses)
      
      const mean = crowdResponses.reduce((sum, val) => sum + val, 0) / crowdResponses.length
      const variance = crowdResponses.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / crowdResponses.length
      session.performance.crowdResponseMetrics.variance = variance
    }
  }
  
  // Upload data to server
  private async uploadPendingData(): Promise<void> {
    if (!this.isOnline || 
        (this.sessionBuffer.length === 0 && this.feedbackBuffer.length === 0 && this.metricsBuffer.length === 0)) {
      return
    }
    
    try {
      // Upload sessions
      if (this.sessionBuffer.length > 0) {
        const sessionsToUpload = this.sessionBuffer.splice(0, this.batchSize)
        await this.uploadSessions(sessionsToUpload)
      }
      
      // Upload feedback
      if (this.feedbackBuffer.length > 0) {
        const feedbackToUpload = this.feedbackBuffer.splice(0, this.batchSize)
        await this.uploadFeedback(feedbackToUpload)
      }
      
      // Upload metrics
      if (this.metricsBuffer.length > 0) {
        const metricsToUpload = this.metricsBuffer.splice(0, this.batchSize)
        await this.uploadMetrics(metricsToUpload)
      }
      
      console.log('Successfully uploaded data to server')
    } catch (error) {
      console.error('Failed to upload data:', error)
      // Data remains in buffers for retry
    }
  }
  
  // Upload sessions to Supabase
  private async uploadSessions(sessions: SessionData[]): Promise<void> {
    // In a real implementation, this would use Supabase client
    // For now, we'll simulate the upload
    
    const payload = {
      type: 'session_data',
      data: sessions.map(session => ({
        ...session,
        // Compress real-time data for storage
        tracks: session.tracks.map(track => ({
          ...track,
          realtimeData: this.compressRealtimeData(track.realtimeData || [])
        }))
      }))
    }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log(`Uploaded ${sessions.length} sessions`)
  }
  
  // Upload feedback to Supabase
  private async uploadFeedback(feedback: FeedbackData[]): Promise<void> {
    const payload = {
      type: 'feedback_data',
      data: feedback
    }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    console.log(`Uploaded ${feedback.length} feedback entries`)
  }
  
  // Upload metrics to Supabase
  private async uploadMetrics(metrics: ModelPerformanceMetrics[]): Promise<void> {
    const payload = {
      type: 'model_metrics',
      data: metrics
    }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    console.log(`Uploaded ${metrics.length} metric entries`)
  }
  
  // Compress real-time data for efficient storage
  private compressRealtimeData(data: RealtimeAnalysisResult[]): any {
    if (data.length === 0) return null
    
    // Sample data points (keep every 10th point for long sessions)
    const sampledData = data.filter((_, index) => index % 10 === 0 || index === data.length - 1)
    
    return {
      sampleRate: 10,
      totalPoints: data.length,
      samples: sampledData.map(point => ({
        timestamp: point.timestamp,
        energy: point.rms, // Map rms to energy
        tempo: point.tempo,
        key: 0, // Default key value since key detection isn't in realtime yet
        crowdResponse: 0 // Default value since crowdResponse doesn't exist yet
      }))
    }
  }
  
  // Start periodic upload
  private startPeriodicUpload(): void {
    this.uploadTimer = setInterval(() => {
      this.uploadPendingData()
    }, this.uploadInterval)
  }
  
  // Save current session to localStorage
  private saveCurrentSession(): void {
    if (this.currentSession) {
      localStorage.setItem('dj_current_session', JSON.stringify(this.currentSession))
    }
  }
  
  // Save pending data to localStorage
  private savePendingData(): void {
    const pendingData = {
      sessions: this.sessionBuffer,
      feedback: this.feedbackBuffer,
      metrics: this.metricsBuffer
    }
    
    localStorage.setItem('dj_pending_data', JSON.stringify(pendingData))
  }
  
  // Load pending data from localStorage
  private loadPendingData(): void {
    try {
      const savedData = localStorage.getItem('dj_pending_data')
      if (savedData) {
        const data = JSON.parse(savedData)
        this.sessionBuffer = data.sessions || []
        this.feedbackBuffer = data.feedback || []
        this.metricsBuffer = data.metrics || []
        
        localStorage.removeItem('dj_pending_data')
      }
      
      // Load interrupted session
      const savedSession = localStorage.getItem('dj_current_session')
      if (savedSession) {
        this.currentSession = JSON.parse(savedSession)
        localStorage.removeItem('dj_current_session')
      }
    } catch (error) {
      console.error('Failed to load pending data:', error)
    }
  }
  
  // Get device information
  private getDeviceInfo(): string {
    return JSON.stringify({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      }
    })
  }
  
  // Get app version
  private getAppVersion(): string {
    return process.env.REACT_APP_VERSION || '1.0.0'
  }
  
  // Get enabled features
  private getEnabledFeatures(): string[] {
    return [
      'smart_queue',
      'ai_suggestions',
      'transition_guidance',
      'personal_learning',
      'real_time_analysis'
    ]
  }
  
  // Get current session
  getCurrentSession(): SessionData | null {
    return this.currentSession
  }
  
  // Get data collection statistics
  getCollectionStats(): {
    currentSessionId: string | null
    pendingSessions: number
    pendingFeedback: number
    pendingMetrics: number
    isOnline: boolean
    lastUpload: number | null
  } {
    return {
      currentSessionId: this.currentSession?.id || null,
      pendingSessions: this.sessionBuffer.length,
      pendingFeedback: this.feedbackBuffer.length,
      pendingMetrics: this.metricsBuffer.length,
      isOnline: this.isOnline,
      lastUpload: null // Would track in real implementation
    }
  }
  
  // Force upload of pending data
  async forceUpload(): Promise<void> {
    await this.uploadPendingData()
  }
  
  // Clean up resources
  cleanup(): void {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer)
      this.uploadTimer = null
    }
    
    this.saveCurrentSession()
    this.savePendingData()
  }
}

// Export singleton instance
export const dataCollectionPipeline = new ProductionDataCollectionPipeline()

// Export types
export type { 
  SessionData, 
  TrackSession, 
  TransitionData, 
  FeedbackData, 
  ModelPerformanceMetrics,
  SessionPerformance
}