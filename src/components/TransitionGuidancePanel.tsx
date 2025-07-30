// Production Transition Guidance Panel Component
// Provides step-by-step instructions for executing AI-recommended transitions

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, 
  Crosshair, Activity, Timer, Target, CheckCircle,
  AlertTriangle, Info, Zap, Settings, Brain,
  ArrowRight, ArrowDown, ArrowUp, RotateCcw,
  Sliders, Music, Gauge
} from 'lucide-react'

export interface TransitionStep {
  id: string
  type: 'timing' | 'crossfader' | 'eq' | 'effect' | 'tempo' | 'cue' | 'loop'
  timing: number // seconds from start of transition
  duration: number // how long this step should take
  title: string
  description: string
  instruction: string
  parameters?: {
    crossfader?: number // 0-1 position
    eqLow?: number // -1 to 1
    eqMid?: number // -1 to 1
    eqHigh?: number // -1 to 1
    effect?: string
    effectAmount?: number
    tempo?: number
    cuePoint?: number
    loopLength?: number
    volume?: number
  }
  critical: boolean
  automated?: boolean
  visualCue?: string
}

export interface TransitionGuidance {
  id: string
  transitionType: string
  difficulty: number
  totalDuration: number
  steps: TransitionStep[]
  preparation: {
    outPoint: number
    inPoint: number
    recommendations: string[]
    warnings: string[]
  }
  automation: {
    available: boolean
    confidence: number
    description: string
  }
  fallbackPlan: {
    description: string
    emergencySteps: string[]
  }
}

interface TransitionGuidancePanelProps {
  guidance: TransitionGuidance | null
  isActive: boolean
  currentTime: number
  onStepComplete: (stepId: string) => void
  onTransitionStart: () => void
  onTransitionAbort: () => void
  onParameterChange: (parameter: string, value: number) => void
  automationEnabled?: boolean
  showAdvanced?: boolean
}

export const TransitionGuidancePanel: React.FC<TransitionGuidancePanelProps> = ({
  guidance,
  isActive,
  currentTime,
  onStepComplete,
  onTransitionStart,
  onTransitionAbort,
  onParameterChange,
  automationEnabled = false,
  showAdvanced = false
}) => {
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [transitionStartTime, setTransitionStartTime] = useState<number | null>(null)
  const [showPreparation, setShowPreparation] = useState(true)
  const [practiceMode, setPracticeMode] = useState(false)
  const [selectedSpeed, setSelectedSpeed] = useState<'slow' | 'normal' | 'fast'>('normal')
  
  // Calculate current position in transition
  const transitionPosition = transitionStartTime 
    ? currentTime - transitionStartTime 
    : 0
  
  // Find active step based on timing
  const getActiveStep = useCallback((): TransitionStep | null => {
    if (!guidance || !isActive || transitionPosition < 0) return null
    
    const activeStep = guidance.steps.find(step => 
      transitionPosition >= step.timing && 
      transitionPosition < step.timing + step.duration
    )
    
    return activeStep || null
  }, [guidance, isActive, transitionPosition])
  
  const activeStep = getActiveStep()
  
  // Update current step
  useEffect(() => {
    if (activeStep?.id !== currentStep) {
      setCurrentStep(activeStep?.id || null)
    }
  }, [activeStep, currentStep])
  
  // Get upcoming steps
  const getUpcomingSteps = useCallback((lookahead: number = 10): TransitionStep[] => {
    if (!guidance || !isActive) return []
    
    return guidance.steps.filter(step => 
      step.timing > transitionPosition && 
      step.timing <= transitionPosition + lookahead
    ).slice(0, 3)
  }, [guidance, isActive, transitionPosition])
  
  // Handle step completion
  const handleStepComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set(prev).add(stepId))
    onStepComplete(stepId)
  }
  
  // Start transition
  const handleTransitionStart = () => {
    setTransitionStartTime(currentTime)
    setShowPreparation(false)
    setCompletedSteps(new Set())
    onTransitionStart()
  }
  
  // Get step icon
  const getStepIcon = (type: TransitionStep['type']) => {
    switch (type) {
      case 'timing': return <Timer className="h-4 w-4" />
      case 'crossfader': return <Sliders className="h-4 w-4" />
      case 'eq': return <Gauge className="h-4 w-4" />
      case 'effect': return <Zap className="h-4 w-4" />
      case 'tempo': return <Activity className="h-4 w-4" />
      case 'cue': return <Target className="h-4 w-4" />
      case 'loop': return <RotateCcw className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }
  
  // Get difficulty color
  const getDifficultyColor = (difficulty: number): string => {
    if (difficulty <= 2) return 'text-green-400'
    if (difficulty <= 3) return 'text-yellow-400'
    if (difficulty <= 4) return 'text-orange-400'
    return 'text-red-400'
  }
  
  // Render parameter control
  const renderParameterControl = (step: TransitionStep) => {
    if (!step.parameters) return null
    
    return (
      <div className="mt-3 space-y-2">
        {step.parameters.crossfader !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Crossfader:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-300">A</span>
              <div className="w-20 h-2 bg-gray-700 rounded-full relative">
                <div 
                  className="absolute h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${step.parameters.crossfader * 100}%` }}
                />
                <div 
                  className="absolute w-3 h-3 bg-white rounded-full -top-0.5 border-2 border-purple-500 transition-all"
                  style={{ left: `calc(${step.parameters.crossfader * 100}% - 6px)` }}
                />
              </div>
              <span className="text-xs text-gray-300">B</span>
            </div>
          </div>
        )}
        
        {(step.parameters.eqLow !== undefined || 
          step.parameters.eqMid !== undefined || 
          step.parameters.eqHigh !== undefined) && (
          <div className="space-y-1">
            <span className="text-xs text-gray-400">EQ Adjustments:</span>
            <div className="grid grid-cols-3 gap-2">
              {step.parameters.eqLow !== undefined && (
                <div className="text-center">
                  <div className="text-xs text-gray-500">LOW</div>
                  <div className="text-xs font-mono text-white">
                    {step.parameters.eqLow > 0 ? '+' : ''}{step.parameters.eqLow.toFixed(1)}
                  </div>
                </div>
              )}
              {step.parameters.eqMid !== undefined && (
                <div className="text-center">
                  <div className="text-xs text-gray-500">MID</div>
                  <div className="text-xs font-mono text-white">
                    {step.parameters.eqMid > 0 ? '+' : ''}{step.parameters.eqMid.toFixed(1)}
                  </div>
                </div>
              )}
              {step.parameters.eqHigh !== undefined && (
                <div className="text-center">
                  <div className="text-xs text-gray-500">HIGH</div>
                  <div className="text-xs font-mono text-white">
                    {step.parameters.eqHigh > 0 ? '+' : ''}{step.parameters.eqHigh.toFixed(1)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {step.parameters.effect && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Effect:</span>
            <div className="text-xs text-blue-300">
              {step.parameters.effect} ({Math.round((step.parameters.effectAmount || 0) * 100)}%)
            </div>
          </div>
        )}
      </div>
    )
  }
  
  // Render step card
  const renderStepCard = (step: TransitionStep, isActive: boolean, isCompleted: boolean, isUpcoming: boolean) => {
    const cardClasses = `
      p-3 rounded-lg border transition-all
      ${isActive 
        ? 'bg-purple-500/20 border-purple-400 ring-2 ring-purple-400/50' 
        : isCompleted
        ? 'bg-green-500/10 border-green-500/30'
        : isUpcoming
        ? 'bg-blue-500/10 border-blue-500/30'
        : 'bg-gray-900/50 border-gray-700'
      }
    `
    
    const timeUntil = step.timing - transitionPosition
    
    return (
      <div key={step.id} className={cardClasses}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStepIcon(step.type)}
            <h4 className="font-medium text-white text-sm">{step.title}</h4>
            {step.critical && (
              <AlertTriangle className="h-3 w-3 text-orange-400" />
            )}
            {step.automated && automationEnabled && (
              <Brain className="h-3 w-3 text-purple-400" />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isActive && (
              <div className="text-xs text-purple-300 font-mono">
                NOW
              </div>
            )}
            {isUpcoming && timeUntil > 0 && (
              <div className="text-xs text-blue-300 font-mono">
                -{Math.ceil(timeUntil)}s
              </div>
            )}
            {isCompleted && (
              <CheckCircle className="h-4 w-4 text-green-400" />
            )}
          </div>
        </div>
        
        <p className="text-sm text-gray-300 mb-2">{step.description}</p>
        
        <div className="text-xs text-gray-400 mb-2">
          <strong>Action:</strong> {step.instruction}
        </div>
        
        {step.visualCue && (
          <div className="text-xs text-yellow-300 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
            <strong>Visual Cue:</strong> {step.visualCue}
          </div>
        )}
        
        {renderParameterControl(step)}
        
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-gray-500">
            Duration: {step.duration}s
          </div>
          
          {isActive && !isCompleted && !step.automated && (
            <button
              onClick={() => handleStepComplete(step.id)}
              className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              Complete
            </button>
          )}
        </div>
      </div>
    )
  }
  
  if (!guidance) {
    return (
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 text-center">
        <Music className="h-8 w-8 mx-auto mb-3 text-gray-500" />
        <p className="text-gray-400">No transition guidance available</p>
        <p className="text-xs text-gray-500 mt-1">Select tracks to generate transition recommendations</p>
      </div>
    )
  }
  
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Transition Guide</h3>
            <span className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded text-xs">
              {guidance.transitionType}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`text-sm ${getDifficultyColor(guidance.difficulty)}`}>
              Difficulty: {guidance.difficulty}/5
            </div>
            <div className="text-sm text-gray-400">
              {guidance.totalDuration}s
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        {isActive && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Transition Progress</span>
              <span>{Math.round(transitionPosition)}s / {guidance.totalDuration}s</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 transition-all duration-1000"
                style={{ width: `${Math.min(100, (transitionPosition / guidance.totalDuration) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isActive ? (
              <button
                onClick={handleTransitionStart}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
              >
                <Play className="h-4 w-4" />
                Start Transition
              </button>
            ) : (
              <button
                onClick={onTransitionAbort}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                <Pause className="h-4 w-4" />
                Abort
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPracticeMode(!practiceMode)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                practiceMode 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Practice Mode
            </button>
            
            <select
              value={selectedSpeed}
              onChange={(e) => setSelectedSpeed(e.target.value as any)}
              className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1"
            >
              <option value="slow">0.5x Speed</option>
              <option value="normal">Normal</option>
              <option value="fast">1.5x Speed</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Preparation Phase */}
      {showPreparation && !isActive && (
        <div className="p-4 border-b border-gray-700">
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-400" />
            Preparation
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h5 className="text-sm font-medium text-gray-400 mb-2">Mix Points</h5>
              <div className="space-y-1 text-sm">
                <div>Out Point: {Math.round(guidance.preparation.outPoint)}s</div>
                <div>In Point: {Math.round(guidance.preparation.inPoint)}s</div>
              </div>
            </div>
            
            <div>
              <h5 className="text-sm font-medium text-gray-400 mb-2">Automation</h5>
              <div className="text-sm">
                {guidance.automation.available ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-green-300">
                      Available ({Math.round(guidance.automation.confidence * 100)}%)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                    <span className="text-orange-300">Manual Only</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {guidance.preparation.recommendations.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-400 mb-2">Recommendations</h5>
              <ul className="space-y-1">
                {guidance.preparation.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {guidance.preparation.warnings.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-yellow-400 mb-2">Warnings</h5>
              <ul className="space-y-1">
                {guidance.preparation.warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm text-yellow-200 flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Active Step */}
      {isActive && activeStep && (
        <div className="p-4 border-b border-gray-700">
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-400" />
            Current Step
          </h4>
          {renderStepCard(activeStep, true, completedSteps.has(activeStep.id), false)}
        </div>
      )}
      
      {/* Upcoming Steps */}
      {isActive && (
        <div className="p-4 border-b border-gray-700">
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <SkipForward className="h-4 w-4 text-blue-400" />
            Next Steps
          </h4>
          <div className="space-y-3">
            {getUpcomingSteps(15).map(step => 
              renderStepCard(step, false, false, true)
            )}
          </div>
        </div>
      )}
      
      {/* All Steps (when not active) */}
      {!isActive && (
        <div className="p-4">
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-400" />
            Transition Steps ({guidance.steps.length})
          </h4>
          <div className="space-y-3">
            {guidance.steps.map(step => 
              renderStepCard(step, false, completedSteps.has(step.id), false)
            )}
          </div>
        </div>
      )}
      
      {/* Fallback Plan */}
      {showAdvanced && guidance.fallbackPlan && (
        <div className="p-4 border-t border-gray-700">
          <h4 className="font-medium text-orange-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Emergency Fallback
          </h4>
          <p className="text-sm text-gray-300 mb-2">{guidance.fallbackPlan.description}</p>
          <ul className="space-y-1">
            {guidance.fallbackPlan.emergencySteps.map((step, idx) => (
              <li key={idx} className="text-sm text-orange-200 flex items-start gap-2">
                <span className="text-orange-400 font-mono text-xs mt-0.5">{idx + 1}.</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}