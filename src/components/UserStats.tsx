// Production User Statistics Component
// Comprehensive analytics and performance tracking for DJs

import React, { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp, Clock, Users, Music, Star, Award,
  Calendar, Target, Zap, Headphones, BarChart3,
  Activity, Disc, Heart, Play, Volume2, ChevronDown,
  ChevronUp, Filter, Download, Share2, RefreshCw
} from 'lucide-react'
import { useSupabase } from '../hooks/useSupabase'

interface UserStatsData {
  overview: {
    totalMixes: number
    totalPlaytime: number // in minutes
    totalTracks: number
    totalFollowers: number
    totalLikes: number
    averageRating: number
    joinDate: string
    lastActive: string
  }
  
  performance: {
    mixingAccuracy: number
    transitionQuality: number
    crowdResponse: number
    consistency: number
    improvement: number
    streakDays: number
  }
  
  activity: {
    mixesThisMonth: number
    hoursThisMonth: number
    mixesThisWeek: number
    hoursThisWeek: number
    bestDay: string
    mostActiveHour: number
  }
  
  musical: {
    topGenres: Array<{ genre: string; count: number; percentage: number }>
    averageBPM: number
    keySignatures: Array<{ key: string; count: number }>
    energyDistribution: Array<{ range: string; percentage: number }>
    moodAnalysis: Array<{ mood: string; percentage: number }>
  }
  
  social: {
    profileViews: number
    mixShares: number
    commentsReceived: number
    collaborations: number
    mentionsReceived: number
    followersGrowth: Array<{ date: string; count: number }>
  }
  
  achievements: Array<{
    id: string
    name: string
    description: string
    dateEarned: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
    icon: string
  }>
  
  goals: Array<{
    id: string
    title: string
    description: string
    progress: number
    target: number
    deadline?: string
    category: 'mixing' | 'social' | 'learning' | 'creative'
  }>
}

interface TimeRange {
  label: string
  value: 'week' | 'month' | 'quarter' | 'year' | 'all'
}

interface UserStatsProps {
  userId?: string
  isOwnProfile?: boolean
}

export const UserStats: React.FC<UserStatsProps> = ({ 
  userId, 
  isOwnProfile = false 
}) => {
  const { supabase, user } = useSupabase()
  const [stats, setStats] = useState<UserStatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange['value']>('month')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'performance']))
  const [refreshing, setRefreshing] = useState(false)

  const timeRanges: TimeRange[] = [
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Quarter', value: 'quarter' },
    { label: 'This Year', value: 'year' },
    { label: 'All Time', value: 'all' }
  ]

  // Mock data for demonstration - in production this would come from Supabase
  const mockStats: UserStatsData = {
    overview: {
      totalMixes: 127,
      totalPlaytime: 18640, // ~310 hours
      totalTracks: 3420,
      totalFollowers: 892,
      totalLikes: 4256,
      averageRating: 4.3,
      joinDate: '2023-03-15',
      lastActive: new Date().toISOString()
    },
    
    performance: {
      mixingAccuracy: 87.5,
      transitionQuality: 91.2,
      crowdResponse: 78.9,
      consistency: 83.4,
      improvement: 12.3,
      streakDays: 7
    },
    
    activity: {
      mixesThisMonth: 12,
      hoursThisMonth: 34,
      mixesThisWeek: 3,
      hoursThisWeek: 8,
      bestDay: 'Saturday',
      mostActiveHour: 21
    },
    
    musical: {
      topGenres: [
        { genre: 'House', count: 456, percentage: 35.2 },
        { genre: 'Techno', count: 324, percentage: 25.1 },
        { genre: 'Progressive', count: 198, percentage: 15.3 },
        { genre: 'Trance', count: 156, percentage: 12.1 },
        { genre: 'Deep House', count: 134, percentage: 10.4 }
      ],
      averageBPM: 124.7,
      keySignatures: [
        { key: '6A', count: 89 },
        { key: '7A', count: 76 },
        { key: '8A', count: 67 },
        { key: '5A', count: 54 },
        { key: '9A', count: 43 }
      ],
      energyDistribution: [
        { range: 'Low (0-0.3)', percentage: 15.2 },
        { range: 'Medium (0.3-0.7)', percentage: 52.8 },
        { range: 'High (0.7-1.0)', percentage: 32.0 }
      ],
      moodAnalysis: [
        { mood: 'Energetic', percentage: 42.1 },
        { mood: 'Uplifting', percentage: 28.5 },
        { mood: 'Groovy', percentage: 18.3 },
        { mood: 'Chill', percentage: 11.1 }
      ]
    },
    
    social: {
      profileViews: 2847,
      mixShares: 456,
      commentsReceived: 234,
      collaborations: 8,
      mentionsReceived: 67,
      followersGrowth: [
        { date: '2024-01-01', count: 650 },
        { date: '2024-02-01', count: 712 },
        { date: '2024-03-01', count: 789 },
        { date: '2024-04-01', count: 834 },
        { date: '2024-05-01', count: 892 }
      ]
    },
    
    achievements: [
      {
        id: '1',
        name: 'Mix Master',
        description: 'Created 100 mixes',
        dateEarned: '2024-04-15',
        rarity: 'epic',
        icon: '🎵'
      },
      {
        id: '2',
        name: 'Crowd Pleaser',
        description: 'Received 1000 likes',
        dateEarned: '2024-03-22',
        rarity: 'rare',
        icon: '❤️'
      },
      {
        id: '3',
        name: 'Perfect Transition',
        description: 'Made 50 perfect transitions',
        dateEarned: '2024-02-10',
        rarity: 'rare',
        icon: '⚡'
      }
    ],
    
    goals: [
      {
        id: '1',
        title: 'Monthly Mix Goal',
        description: 'Create 15 mixes this month',
        progress: 12,
        target: 15,
        deadline: '2024-05-31',
        category: 'creative'
      },
      {
        id: '2',
        title: 'Follower Milestone',
        description: 'Reach 1000 followers',
        progress: 892,
        target: 1000,
        category: 'social'
      },
      {
        id: '3',
        title: 'Genre Explorer',
        description: 'Mix 5 different genres',
        progress: 5,
        target: 5,
        category: 'learning'
      }
    ]
  }

  useEffect(() => {
    loadStats()
  }, [userId, selectedTimeRange])

  const loadStats = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In production, this would make API calls to get real statistics
      // For now, we'll use mock data
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      setStats(mockStats)
    } catch (err) {
      console.error('Error loading stats:', err)
      setError('Failed to load statistics')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshStats = async () => {
    setRefreshing(true)
    await loadStats()
    setRefreshing(false)
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const exportStats = () => {
    if (!stats) return

    const exportData = {
      ...stats,
      exportDate: new Date().toISOString(),
      timeRange: selectedTimeRange
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dj-stats-${selectedTimeRange}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'legendary': return 'text-yellow-400 border-yellow-400'
      case 'epic': return 'text-purple-400 border-purple-400'
      case 'rare': return 'text-blue-400 border-blue-400'
      default: return 'text-gray-400 border-gray-400'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-400 mb-4">{error || 'Statistics not available'}</div>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">Statistics</h2>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as TimeRange['value'])}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshStats}
            disabled={refreshing}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportStats}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700">
        <button
          onClick={() => toggleSection('overview')}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Overview</h3>
          </div>
          {expandedSections.has('overview') ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {expandedSections.has('overview') && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Music className="h-5 w-5 text-purple-400" />
                  <span className="text-sm text-gray-400">Total Mixes</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.overview.totalMixes}</div>
              </div>

              <div className="p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-blue-400" />
                  <span className="text-sm text-gray-400">Total Playtime</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatTime(stats.overview.totalPlaytime)}
                </div>
              </div>

              <div className="p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-green-400" />
                  <span className="text-sm text-gray-400">Followers</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.overview.totalFollowers}</div>
              </div>

              <div className="p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-5 w-5 text-red-400" />
                  <span className="text-sm text-gray-400">Total Likes</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.overview.totalLikes}</div>
              </div>

              <div className="p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Disc className="h-5 w-5 text-yellow-400" />
                  <span className="text-sm text-gray-400">Tracks Played</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.overview.totalTracks}</div>
              </div>

              <div className="p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-orange-400" />
                  <span className="text-sm text-gray-400">Avg Rating</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.overview.averageRating}/5</div>
              </div>

              <div className="p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-indigo-400" />
                  <span className="text-sm text-gray-400">Member Since</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {new Date(stats.overview.joinDate).getFullYear()}
                </div>
              </div>

              <div className="p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-5 w-5 text-pink-400" />
                  <span className="text-sm text-gray-400">Streak</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.performance.streakDays} days</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700">
        <button
          onClick={() => toggleSection('performance')}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Performance</h3>
          </div>
          {expandedSections.has('performance') ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {expandedSections.has('performance') && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries({
                mixingAccuracy: { label: 'Mixing Accuracy', color: 'purple' },
                transitionQuality: { label: 'Transition Quality', color: 'blue' },
                crowdResponse: { label: 'Crowd Response', color: 'green' },
                consistency: { label: 'Consistency', color: 'yellow' },
                improvement: { label: 'Improvement', color: 'pink' }
              }).map(([key, config]) => {
                const value = stats.performance[key as keyof typeof stats.performance]
                return (
                  <div key={key} className="p-4 bg-gray-900/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">{config.label}</span>
                      <span className="text-lg font-bold text-white">{value}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full bg-${config.color}-500`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Musical Analysis */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700">
        <button
          onClick={() => toggleSection('musical')}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <Headphones className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Musical Analysis</h3>
          </div>
          {expandedSections.has('musical') ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {expandedSections.has('musical') && (
          <div className="px-4 pb-4 space-y-6">
            {/* Top Genres */}
            <div>
              <h4 className="text-white font-medium mb-3">Top Genres</h4>
              <div className="space-y-2">
                {stats.musical.topGenres.map((genre, index) => (
                  <div key={genre.genre} className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 w-12">#{index + 1}</span>
                    <span className="text-white flex-1">{genre.genre}</span>
                    <span className="text-gray-400 text-sm">{genre.count} tracks</span>
                    <div className="w-24 bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-purple-500"
                        style={{ width: `${genre.percentage}%` }}
                      />
                    </div>
                    <span className="text-white text-sm font-medium w-12">
                      {genre.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Energy & Mood Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-white font-medium mb-3">Energy Distribution</h4>
                <div className="space-y-2">
                  {stats.musical.energyDistribution.map((range) => (
                    <div key={range.range} className="flex items-center gap-3">
                      <span className="text-gray-300 flex-1">{range.range}</span>
                      <div className="w-20 bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${range.percentage}%` }}
                        />
                      </div>
                      <span className="text-white text-sm w-12">{range.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-3">Mood Analysis</h4>
                <div className="space-y-2">
                  {stats.musical.moodAnalysis.map((mood) => (
                    <div key={mood.mood} className="flex items-center gap-3">
                      <span className="text-gray-300 flex-1">{mood.mood}</span>
                      <div className="w-20 bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-green-500"
                          style={{ width: `${mood.percentage}%` }}
                        />
                      </div>
                      <span className="text-white text-sm w-12">{mood.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Achievements */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700">
        <button
          onClick={() => toggleSection('achievements')}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Achievements</h3>
            <span className="text-sm text-gray-400">({stats.achievements.length})</span>
          </div>
          {expandedSections.has('achievements') ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {expandedSections.has('achievements') && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-lg border-2 ${getRarityColor(achievement.rarity)} bg-gray-900/30`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{achievement.icon}</span>
                    <div>
                      <h4 className="font-medium text-white">{achievement.name}</h4>
                      <p className="text-xs text-gray-400 capitalize">{achievement.rarity}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{achievement.description}</p>
                  <p className="text-xs text-gray-500">
                    Earned {new Date(achievement.dateEarned).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Goals */}
      {isOwnProfile && (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700">
          <button
            onClick={() => toggleSection('goals')}
            className="w-full p-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Goals</h3>
            </div>
            {expandedSections.has('goals') ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {expandedSections.has('goals') && (
            <div className="px-4 pb-4">
              <div className="space-y-4">
                {stats.goals.map((goal) => (
                  <div key={goal.id} className="p-4 bg-gray-900/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">{goal.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        goal.category === 'mixing' ? 'bg-purple-500/20 text-purple-300' :
                        goal.category === 'social' ? 'bg-blue-500/20 text-blue-300' :
                        goal.category === 'learning' ? 'bg-green-500/20 text-green-300' :
                        'bg-orange-500/20 text-orange-300'
                      }`}>
                        {goal.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{goal.description}</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">
                        {goal.progress} / {goal.target}
                      </span>
                      <span className="text-sm text-gray-300">
                        {Math.round((goal.progress / goal.target) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-purple-500"
                        style={{ width: `${Math.min((goal.progress / goal.target) * 100, 100)}%` }}
                      />
                    </div>
                    {goal.deadline && (
                      <p className="text-xs text-gray-500 mt-2">
                        Due: {new Date(goal.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default UserStats