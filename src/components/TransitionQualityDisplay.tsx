// Production Transition Quality Display Component
// Shows ML predictions for transition success with detailed metrics

import React, { useState } from 'react'
import { PredictionResult } from '../lib/transitionQualityPredictor'
import { TransitionSuggestion } from '../lib/transitionSuggestionEngine'
import { AlertTriangle, TrendingUp, Users, Music, Zap, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react'

interface TransitionQualityDisplayProps {
  prediction: PredictionResult | null
  transition: TransitionSuggestion | null
  onImprove?: () => void
  isLoading?: boolean
}

export const TransitionQualityDisplay: React.FC<TransitionQualityDisplayProps> = ({
  prediction,
  transition,
  onImprove,
  isLoading
}) => {
  const [expanded, setExpanded] = useState(false)

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-center">
          <div className="animate-pulse flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            <span className="text-gray-400">Analyzing transition quality...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!prediction || !transition) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <div className="text-center text-gray-500">
          <BarChart3 className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>Select two tracks to see transition quality prediction</p>
        </div>
      </div>
    )
  }

  const getQualityColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-400'
    if (score >= 0.6) return 'text-yellow-400'
    if (score >= 0.4) return 'text-orange-400'
    return 'text-red-400'
  }

  const getQualityLabel = (score: number): string => {
    if (score >= 0.8) return 'Excellent'
    if (score >= 0.6) return 'Good'
    if (score >= 0.4) return 'Fair'
    return 'Challenging'
  }

  const getRiskColor = (risk: number): string => {
    if (risk < 0.3) return 'text-green-400'
    if (risk < 0.6) return 'text-yellow-400'
    return 'text-red-400'
  }

  const renderMetricBar = (label: string, value: number, icon: React.ReactNode) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-gray-400">{label}</span>
        </div>
        <span className={`font-medium ${getQualityColor(value)}`}>
          {Math.round(value * 100)}%
        </span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            value >= 0.8 ? 'bg-green-500' :
            value >= 0.6 ? 'bg-yellow-500' :
            value >= 0.4 ? 'bg-orange-500' :
            'bg-red-500'
          }`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  )

  const renderRiskItem = (label: string, risk: number) => {
    if (risk < 0.1) return null
    
    return (
      <div className="flex items-start gap-2">
        <AlertTriangle className={`h-4 w-4 mt-0.5 ${getRiskColor(risk)}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">{label}</span>
            <span className={`text-sm font-medium ${getRiskColor(risk)}`}>
              {Math.round(risk * 100)}%
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Transition Quality Prediction
            </h3>
            <p className="text-sm text-gray-400">
              ML-powered analysis of {transition.technique.name}
            </p>
          </div>
          
          <div className="text-right">
            <div className={`text-3xl font-bold ${getQualityColor(prediction.overallQuality)}`}>
              {Math.round(prediction.overallQuality * 100)}%
            </div>
            <div className={`text-sm ${getQualityColor(prediction.overallQuality)}`}>
              {getQualityLabel(prediction.overallQuality)}
            </div>
          </div>
        </div>
        
        {/* Confidence indicator */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-gray-500">Confidence:</span>
          <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500"
              style={{ width: `${prediction.confidence * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">
            {Math.round(prediction.confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Prediction Metrics */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Predictions</h4>
          
          {renderMetricBar(
            'Energy Maintenance',
            prediction.predictions.energyMaintenance,
            <TrendingUp className="h-4 w-4 text-gray-400" />
          )}
          
          {renderMetricBar(
            'Crowd Engagement',
            prediction.predictions.crowdEngagement,
            <Users className="h-4 w-4 text-gray-400" />
          )}
          
          {renderMetricBar(
            'Technical Success',
            prediction.predictions.technicalSuccess,
            <Zap className="h-4 w-4 text-gray-400" />
          )}
          
          {renderMetricBar(
            'Musical Coherence',
            prediction.predictions.musicalCoherence,
            <Music className="h-4 w-4 text-gray-400" />
          )}
        </div>

        {/* Risk Assessment */}
        {Object.values(prediction.risks).some(r => r > 0.1) && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Risk Factors</h4>
            
            <div className="space-y-2">
              {renderRiskItem('Energy Drop', prediction.risks.energyDrop)}
              {renderRiskItem('Beat Clash', prediction.risks.beatClash)}
              {renderRiskItem('Key Clash', prediction.risks.keyClash)}
              {renderRiskItem('Crowd Disengagement', prediction.risks.crowdDisengagement)}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Recommendations</h4>
          
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <p className="text-sm text-white font-medium mb-2">
              {prediction.recommendations.primary}
            </p>
            
            {prediction.recommendations.alternatives.length > 0 && (
              <div className="space-y-1 mt-3">
                {prediction.recommendations.alternatives.map((alt, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span className="text-sm text-gray-400">{alt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {prediction.recommendations.warnings.length > 0 && (
            <div className="p-3 bg-yellow-500/10 rounded border border-yellow-500/20">
              {prediction.recommendations.warnings.map((warning, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span className="text-yellow-200">{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feature Importance (Expandable) */}
        {prediction.featureImportance.size > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span>Feature Importance</span>
            </button>
            
            {expanded && (
              <div className="mt-3 space-y-2">
                {Array.from(prediction.featureImportance.entries())
                  .sort(([, a], [, b]) => b - a)
                  .map(([feature, importance]) => (
                    <div key={feature} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 capitalize">
                        {feature.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500"
                            style={{ width: `${importance * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-500 text-xs w-10 text-right">
                          {Math.round(importance * 100)}%
                        </span>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}

        {/* Improve Button */}
        {onImprove && prediction.overallQuality < 0.8 && (
          <div className="pt-4 border-t border-gray-700">
            <button
              onClick={onImprove}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Find Better Transition Options
            </button>
          </div>
        )}
      </div>
    </div>
  )
}