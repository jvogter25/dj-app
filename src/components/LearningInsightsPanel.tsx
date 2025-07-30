// Production Learning Insights Panel Component
// Displays DJ performance insights and learning statistics

import React, { useState } from 'react'
import { LearningInsight } from '../lib/djLearningSystem'
import { 
  Brain, TrendingUp, AlertCircle, Lightbulb, 
  BarChart3, Clock, Music, Zap, Users, 
  ChevronDown, ChevronUp, Download, Upload,
  RefreshCw
} from 'lucide-react'

interface LearningInsightsPanelProps {
  insights: LearningInsight[]
  stats: any
  sessionStats?: {
    trackCount: number
    transitionCount: number
  }
  onExport?: () => void
  onImport?: (data: string) => void
  onReset?: () => void
  onSync?: () => void
  isSyncing?: boolean
}

export const LearningInsightsPanel: React.FC<LearningInsightsPanelProps> = ({
  insights,
  stats,
  sessionStats,
  onExport,
  onImport,
  onReset,
  onSync,
  isSyncing
}) => {
  const [expanded, setExpanded] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [activeTab, setActiveTab] = useState<'insights' | 'stats' | 'preferences'>('insights')
  
  const getInsightIcon = (type: LearningInsight['type']) => {
    switch (type) {
      case 'preference':
        return <Brain className="h-4 w-4 text-purple-400" />
      case 'pattern':
        return <BarChart3 className="h-4 w-4 text-blue-400" />
      case 'improvement':
        return <TrendingUp className="h-4 w-4 text-green-400" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />
      default:
        return <Lightbulb className="h-4 w-4 text-gray-400" />
    }
  }
  
  const formatTime = (hour: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:00 ${period}`
  }
  
  const getSuccessColor = (rate: number): string => {
    if (rate >= 0.8) return 'text-green-400'
    if (rate >= 0.6) return 'text-yellow-400'
    return 'text-orange-400'
  }
  
  const handleImportClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file && onImport) {
        const text = await file.text()
        onImport(text)
      }
    }
    input.click()
  }
  
  if (!stats) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <div className="text-center text-gray-500">
          <Brain className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>Learning system not initialized</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">DJ Learning Insights</h3>
            {sessionStats && (
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{sessionStats.trackCount} tracks</span>
                <span>•</span>
                <span>{sessionStats.transitionCount} transitions</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onSync && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSync()
                }}
                className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                disabled={isSyncing}
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>
      </div>
      
      {expanded && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'insights'
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Insights
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'preferences'
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Preferences
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4">
            {activeTab === 'insights' && (
              <div className="space-y-3">
                {insights.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Lightbulb className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p>No insights yet. Keep mixing to learn your style!</p>
                  </div>
                ) : (
                  insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg"
                    >
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <p className="text-sm text-gray-300">{insight.message}</p>
                        {insight.data && showDetails && (
                          <pre className="mt-2 text-xs text-gray-500 overflow-x-auto">
                            {JSON.stringify(insight.data, null, 2)}
                          </pre>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {Math.round(insight.confidence * 100)}%
                      </span>
                    </div>
                  ))
                )}
                
                {insights.length > 0 && (
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    {showDetails ? 'Hide' : 'Show'} details
                  </button>
                )}
              </div>
            )}
            
            {activeTab === 'stats' && (
              <div className="space-y-4">
                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Music className="h-4 w-4 text-purple-400" />
                      <span className="text-xs text-gray-400">Sessions</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {stats.totalSessions}
                    </div>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      <span className="text-xs text-gray-400">Transitions</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {stats.totalTransitions}
                    </div>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                      <span className="text-xs text-gray-400">Success Rate</span>
                    </div>
                    <div className={`text-2xl font-bold ${getSuccessColor(stats.successRate)}`}>
                      {Math.round(stats.successRate * 100)}%
                    </div>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <span className="text-xs text-gray-400">Avg Length</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {Math.round(stats.averageSessionLength)}m
                    </div>
                  </div>
                </div>
                
                {/* Top Genres */}
                {stats.topGenres && stats.topGenres.length > 0 && (
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Top Genres</h4>
                    <div className="space-y-2">
                      {stats.topGenres.slice(0, 5).map((genre: string, idx: number) => (
                        <div key={genre} className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">{idx + 1}. {genre}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Venue Performance */}
                {stats.venueStats && stats.venueStats.length > 0 && (
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Venue Performance</h4>
                    <div className="space-y-2">
                      {stats.venueStats.map(([venue, data]: [string, any]) => (
                        <div key={venue} className="flex items-center justify-between">
                          <span className="text-sm text-gray-400 capitalize">{venue}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span>{data.sessions} sessions</span>
                            <span className={getSuccessColor(data.avgSuccess)}>
                              {Math.round(data.avgSuccess * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'preferences' && (
              <div className="space-y-4">
                {/* Preferred Time */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Preferred Playing Time</h4>
                  <p className="text-lg text-white">{formatTime(Math.round(stats.preferredTime))}</p>
                </div>
                
                {/* Top Transitions */}
                {stats.topTransitions && stats.topTransitions.length > 0 && (
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Favorite Transitions</h4>
                    <div className="space-y-2">
                      {stats.topTransitions.map((transition: any) => (
                        <div key={transition.key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">{transition.key}</span>
                          <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500"
                              style={{ width: `${(transition.value / stats.topTransitions[0].value) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Data Management */}
                <div className="pt-4 border-t border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {onExport && (
                      <button
                        onClick={onExport}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </button>
                    )}
                    {onImport && (
                      <button
                        onClick={handleImportClick}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Import
                      </button>
                    )}
                  </div>
                  {onReset && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to reset all learning data?')) {
                          onReset()
                        }
                      }}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm transition-colors"
                    >
                      Reset Data
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}