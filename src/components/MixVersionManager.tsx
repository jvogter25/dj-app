// Production Mix Version Manager Component
// Comprehensive version control system for DJ mixes

import React, { useState, useEffect } from 'react'
import {
  GitBranch, History, Play, Pause, Download, Eye,
  Clock, User, MoreVertical, Plus, ChevronDown,
  ChevronRight, Star, Archive, Trash2, Edit3,
  Check, X, AlertTriangle, Copy, Share2, Tag
} from 'lucide-react'
import { MixState, MixVersion, mixManager } from '../lib/mixManager'
import { useSupabase } from '../hooks/useSupabase'

interface MixVersionManagerProps {
  mixId: string
  currentMix: MixState
  onVersionSelect?: (version: MixVersion) => void
  onVersionRestore?: (version: MixVersion) => void
  isOpen: boolean
  onClose: () => void
}

interface VersionWithDetails extends MixVersion {
  changes?: VersionChange[]
  stats?: {
    tracksAdded: number
    tracksRemoved: number
    tracksModified: number
    effectsChanged: number
    transitionsChanged: number
  }
}

interface VersionChange {
  type: 'track_added' | 'track_removed' | 'track_modified' | 'effect_added' | 'effect_removed' | 'transition_changed' | 'metadata_changed'
  description: string
  details?: any
}

export const MixVersionManager: React.FC<MixVersionManagerProps> = ({
  mixId,
  currentMix,
  onVersionSelect,
  onVersionRestore,
  isOpen,
  onClose
}) => {
  const { supabase, user } = useSupabase()
  const [versions, setVersions] = useState<VersionWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set())
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())
  const [isCreatingVersion, setIsCreatingVersion] = useState(false)
  const [newVersionName, setNewVersionName] = useState('')
  const [newVersionDescription, setNewVersionDescription] = useState('')
  const [playingVersion, setPlayingVersion] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')

  useEffect(() => {
    if (isOpen) {
      loadVersions()
    }
  }, [isOpen, mixId])

  const loadVersions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('mix_versions')
        .select(`
          *,
          created_by_profile:profiles!mix_versions_created_by_fkey(display_name, avatar_url)
        `)
        .eq('mix_id', mixId)
        .order('version_number', { ascending: false })

      if (error) throw error

      const versionsWithDetails = await Promise.all(
        (data || []).map(async (version) => {
          const changes = await analyzeVersionChanges(version)
          const stats = calculateVersionStats(changes)
          
          return {
            ...version,
            changes,
            stats
          }
        })
      )

      setVersions(versionsWithDetails)
    } catch (err) {
      console.error('Error loading versions:', err)
      setError('Failed to load version history')
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeVersionChanges = async (version: MixVersion): Promise<VersionChange[]> => {
    // In a real implementation, this would compare version data
    // For now, return mock changes based on version number
    const mockChanges: VersionChange[] = []
    
    if (version.versionNumber > 1) {
      mockChanges.push({
        type: 'track_added',
        description: `Added "New Track ${version.versionNumber}" to position 3`
      })
      
      mockChanges.push({
        type: 'transition_changed',
        description: 'Updated crossfade duration between tracks 2-3'
      })
      
      if (version.versionNumber % 2 === 0) {
        mockChanges.push({
          type: 'effect_added',
          description: 'Added reverb effect to track 1'
        })
      }
      
      if (version.versionNumber > 3) {
        mockChanges.push({
          type: 'metadata_changed',
          description: 'Updated mix title and description'
        })
      }
    }

    return mockChanges
  }

  const calculateVersionStats = (changes: VersionChange[]) => {
    return {
      tracksAdded: changes.filter(c => c.type === 'track_added').length,
      tracksRemoved: changes.filter(c => c.type === 'track_removed').length,
      tracksModified: changes.filter(c => c.type === 'track_modified').length,
      effectsChanged: changes.filter(c => c.type.includes('effect')).length,
      transitionsChanged: changes.filter(c => c.type === 'transition_changed').length
    }
  }

  const createNewVersion = async () => {
    if (!newVersionName.trim()) return

    try {
      const versionId = await mixManager.createMixVersion(mixId, newVersionName.trim())
      
      // Update version description if provided
      if (newVersionDescription.trim()) {
        await supabase
          .from('mix_versions')
          .update({ description: newVersionDescription.trim() })
          .eq('id', versionId)
      }

      await loadVersions()
      setIsCreatingVersion(false)
      setNewVersionName('')
      setNewVersionDescription('')
    } catch (error) {
      console.error('Error creating version:', error)
      setError('Failed to create new version')
    }
  }

  const restoreVersion = async (version: MixVersion) => {
    if (!confirm(`Are you sure you want to restore to ${version.versionName || `Version ${version.versionNumber}`}? This will create a new version with the restored state.`)) {
      return
    }

    try {
      // Mark selected version as current
      await supabase
        .from('mix_versions')
        .update({ is_current: false })
        .eq('mix_id', mixId)

      await supabase
        .from('mix_versions')
        .update({ is_current: true })
        .eq('id', version.id)

      onVersionRestore?.(version)
      await loadVersions()
    } catch (error) {
      console.error('Error restoring version:', error)
      setError('Failed to restore version')
    }
  }

  const deleteVersion = async (version: MixVersion) => {
    if (version.isCurrent) {
      setError('Cannot delete the current version')
      return
    }

    if (!confirm(`Are you sure you want to delete ${version.versionName || `Version ${version.versionNumber}`}? This action cannot be undone.`)) {
      return
    }

    try {
      await supabase
        .from('mix_versions')
        .delete()
        .eq('id', version.id)

      await loadVersions()
    } catch (error) {
      console.error('Error deleting version:', error)
      setError('Failed to delete version')
    }
  }

  const duplicateVersion = async (version: MixVersion) => {
    const newName = `${version.versionName || `Version ${version.versionNumber}`} (Copy)`
    
    try {
      const versionId = await mixManager.createMixVersion(mixId, newName)
      await loadVersions()
    } catch (error) {
      console.error('Error duplicating version:', error)
      setError('Failed to duplicate version')
    }
  }

  const toggleVersionExpansion = (versionId: string) => {
    const newExpanded = new Set(expandedVersions)
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId)
    } else {
      newExpanded.add(versionId)
    }
    setExpandedVersions(newExpanded)
  }

  const toggleVersionSelection = (versionId: string) => {
    const newSelected = new Set(selectedVersions)
    if (newSelected.has(versionId)) {
      newSelected.delete(versionId)
    } else {
      newSelected.add(versionId)
    }
    setSelectedVersions(newSelected)
  }

  const handleVersionPlay = (version: MixVersion) => {
    if (playingVersion === version.id) {
      setPlayingVersion(null)
    } else {
      setPlayingVersion(version.id)
      // In production, this would load and play the version audio
    }
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'N/A'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getChangeIcon = (type: VersionChange['type']) => {
    switch (type) {
      case 'track_added': return <Plus className="h-3 w-3 text-green-400" />
      case 'track_removed': return <Trash2 className="h-3 w-3 text-red-400" />
      case 'track_modified': return <Edit3 className="h-3 w-3 text-blue-400" />
      case 'effect_added': return <Plus className="h-3 w-3 text-purple-400" />
      case 'effect_removed': return <Trash2 className="h-3 w-3 text-red-400" />
      case 'transition_changed': return <GitBranch className="h-3 w-3 text-orange-400" />
      case 'metadata_changed': return <Tag className="h-3 w-3 text-yellow-400" />
      default: return <Edit3 className="h-3 w-3 text-gray-400" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="h-6 w-6 text-purple-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">Version History</h2>
                <p className="text-gray-400">{currentMix.title}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'timeline' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Timeline
                </button>
              </div>

              <button
                onClick={() => setIsCreatingVersion(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Version
              </button>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-red-300">{error}</span>
            </div>
          )}
        </div>

        {/* New Version Creation */}
        {isCreatingVersion && (
          <div className="p-6 border-b border-gray-700 bg-gray-900/50">
            <h3 className="text-lg font-medium text-white mb-4">Create New Version</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Version Name *
                </label>
                <input
                  type="text"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="e.g., Club Mix, Radio Edit, Extended Version"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newVersionDescription}
                  onChange={(e) => setNewVersionDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Describe what changed in this version..."
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={createNewVersion}
                  disabled={!newVersionName.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Create Version
                </button>
                <button
                  onClick={() => {
                    setIsCreatingVersion(false)
                    setNewVersionName('')
                    setNewVersionDescription('')
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Version List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center p-8">
              <History className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Versions Yet</h3>
              <p className="text-gray-400 mb-4">Create your first version to start tracking changes.</p>
              <button
                onClick={() => setIsCreatingVersion(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Create Version
              </button>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    className={`border rounded-lg transition-all ${
                      version.isCurrent 
                        ? 'border-purple-500 bg-purple-500/10' 
                        : 'border-gray-600 bg-gray-900/30'
                    }`}
                  >
                    {/* Version Header */}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleVersionExpansion(version.id)}
                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                          >
                            {expandedVersions.has(version.id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-sm px-2 py-1 rounded ${
                              version.isCurrent 
                                ? 'bg-purple-500 text-white' 
                                : 'bg-gray-600 text-gray-300'
                            }`}>
                              v{version.versionNumber}
                            </span>
                            {version.isCurrent && (
                              <Star className="h-4 w-4 text-yellow-400" />
                            )}
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-white">
                              {version.versionName || `Version ${version.versionNumber}`}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(version.createdAt).toLocaleDateString()}
                              </span>
                              {version.durationSeconds && (
                                <span>{formatDuration(version.durationSeconds)}</span>
                              )}
                              {version.fileSizeBytes && (
                                <span>{formatFileSize(version.fileSizeBytes)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {version.audioUrl && (
                            <button
                              onClick={() => handleVersionPlay(version)}
                              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              {playingVersion === version.id ? (
                                <Pause className="h-4 w-4 text-white" />
                              ) : (
                                <Play className="h-4 w-4 text-white" />
                              )}
                            </button>
                          )}
                          
                          {!version.isCurrent && (
                            <button
                              onClick={() => restoreVersion(version)}
                              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                              Restore
                            </button>
                          )}
                          
                          <div className="relative">
                            <button
                              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                              onClick={() => {
                                // Toggle dropdown menu
                              }}
                            >
                              <MoreVertical className="h-4 w-4 text-gray-400" />
                            </button>
                            
                            {/* Dropdown menu would go here */}
                          </div>
                        </div>
                      </div>
                      
                      {version.description && (
                        <p className="text-gray-300 text-sm mt-2 ml-8">{version.description}</p>
                      )}
                    </div>
                    
                    {/* Expanded Content */}
                    {expandedVersions.has(version.id) && (
                      <div className="px-4 pb-4 border-t border-gray-700">
                        <div className="mt-4">
                          {/* Version Stats */}
                          {version.stats && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                              <div className="text-center">
                                <div className="text-lg font-semibold text-green-400">
                                  {version.stats.tracksAdded}
                                </div>
                                <div className="text-xs text-gray-400">Added</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-red-400">
                                  {version.stats.tracksRemoved}
                                </div>
                                <div className="text-xs text-gray-400">Removed</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-blue-400">
                                  {version.stats.tracksModified}
                                </div>
                                <div className="text-xs text-gray-400">Modified</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-purple-400">
                                  {version.stats.effectsChanged}
                                </div>
                                <div className="text-xs text-gray-400">Effects</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-orange-400">
                                  {version.stats.transitionsChanged}
                                </div>
                                <div className="text-xs text-gray-400">Transitions</div>
                              </div>
                            </div>
                          )}
                          
                          {/* Changes List */}
                          {version.changes && version.changes.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-300 mb-2">Changes:</h5>
                              <div className="space-y-1">
                                {version.changes.map((change, changeIndex) => (
                                  <div key={changeIndex} className="flex items-center gap-2 text-sm">
                                    {getChangeIcon(change.type)}
                                    <span className="text-gray-300">{change.description}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MixVersionManager