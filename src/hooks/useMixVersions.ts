// Production Hook for Mix Version Management
// React hook for managing mix versions and version-related operations

import { useState, useEffect, useCallback } from 'react'
import { MixVersion, mixManager } from '../lib/mixManager'
import { useSupabase } from './useSupabase'

interface UseMixVersionsProps {
  mixId: string
  autoLoad?: boolean
}

interface UseMixVersionsReturn {
  versions: MixVersion[]
  currentVersion: MixVersion | null
  isLoading: boolean
  error: string | null
  
  // Version operations
  createVersion: (name: string, description?: string, generateAudio?: boolean) => Promise<string>
  restoreVersion: (versionId: string) => Promise<void>
  deleteVersion: (versionId: string) => Promise<void>
  publishVersion: (versionId: string) => Promise<void>
  duplicateVersion: (versionId: string, newName: string) => Promise<string>
  
  // Version comparison
  compareVersions: (versionId1: string, versionId2: string) => Promise<VersionComparison | null>
  
  // Utilities
  refreshVersions: () => Promise<void>
  getVersionById: (versionId: string) => MixVersion | null
  getVersionChanges: (versionId: string) => Promise<VersionChange[]>
  
  // Auto-save functionality
  enableAutoVersioning: (enabled: boolean) => void
  isAutoVersioningEnabled: boolean
}

export interface VersionChange {
  type: 'track_added' | 'track_removed' | 'track_modified' | 'effect_added' | 'effect_removed' | 'transition_changed' | 'metadata_changed'
  description: string
  timestamp: string
  details?: {
    trackId?: string
    trackName?: string
    effectType?: string
    oldValue?: any
    newValue?: any
  }
}

export interface VersionComparison {
  version1: MixVersion
  version2: MixVersion
  differences: {
    tracks: {
      added: any[]
      removed: any[]
      modified: any[]
    }
    effects: {
      added: any[]
      removed: any[]
      modified: any[]
    }
    transitions: {
      changed: any[]
    }
    metadata: {
      changed: Array<{
        field: string
        oldValue: any
        newValue: any
      }>
    }
  }
  summary: {
    totalChanges: number
    majorChanges: number
    minorChanges: number
  }
}

export const useMixVersions = ({ 
  mixId, 
  autoLoad = true 
}: UseMixVersionsProps): UseMixVersionsReturn => {
  const { supabase, user } = useSupabase()
  const [versions, setVersions] = useState<MixVersion[]>([])
  const [currentVersion, setCurrentVersion] = useState<MixVersion | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAutoVersioningEnabled, setIsAutoVersioningEnabled] = useState(false)

  // Load versions from database
  const loadVersions = useCallback(async () => {
    if (!mixId) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('mix_versions')
        .select(`
          *,
          created_by_profile:profiles!mix_versions_created_by_fkey(display_name, avatar_url)
        `)
        .eq('mix_id', mixId)
        .order('version_number', { ascending: false })

      if (queryError) throw queryError

      const versionList = data || []
      setVersions(versionList)
      
      // Find current version
      const current = versionList.find(v => v.is_current)
      setCurrentVersion(current || null)

    } catch (err) {
      console.error('Error loading versions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load versions')
    } finally {
      setIsLoading(false)
    }
  }, [mixId, supabase])

  // Auto-load versions when component mounts
  useEffect(() => {
    if (autoLoad && mixId) {
      loadVersions()
    }
  }, [autoLoad, mixId, loadVersions])

  // Create new version
  const createVersion = useCallback(async (
    name: string, 
    description?: string, 
    generateAudio = false
  ): Promise<string> => {
    try {
      setError(null)
      
      const versionId = await mixManager.createMixVersion(mixId, name, generateAudio)
      
      // Update description if provided
      if (description) {
        await supabase
          .from('mix_versions')
          .update({ description })
          .eq('id', versionId)
      }

      // Reload versions to get updated list
      await loadVersions()
      
      return versionId
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create version'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [mixId, supabase, loadVersions])

  // Restore version (make it current)
  const restoreVersion = useCallback(async (versionId: string): Promise<void> => {
    try {
      setError(null)

      // First, mark all versions as not current
      await supabase
        .from('mix_versions')
        .update({ is_current: false })
        .eq('mix_id', mixId)

      // Then mark the selected version as current
      await supabase
        .from('mix_versions')
        .update({ is_current: true })
        .eq('id', versionId)

      // Reload versions
      await loadVersions()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore version'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [mixId, supabase, loadVersions])

  // Delete version
  const deleteVersion = useCallback(async (versionId: string): Promise<void> => {
    const version = versions.find(v => v.id === versionId)
    if (version?.isCurrent) {
      throw new Error('Cannot delete the current version')
    }

    try {
      setError(null)

      await supabase
        .from('mix_versions')
        .delete()
        .eq('id', versionId)

      // Reload versions
      await loadVersions()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete version'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [versions, supabase, loadVersions])

  // Publish version
  const publishVersion = useCallback(async (versionId: string): Promise<void> => {
    try {
      setError(null)

      await supabase
        .from('mix_versions')
        .update({ is_published: true })
        .eq('id', versionId)

      // Reload versions
      await loadVersions()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish version'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [supabase, loadVersions])

  // Duplicate version
  const duplicateVersion = useCallback(async (versionId: string, newName: string): Promise<string> => {
    try {
      setError(null)

      // Get the original version
      const originalVersion = versions.find(v => v.id === versionId)
      if (!originalVersion) {
        throw new Error('Version not found')
      }

      // Create new version with duplicated content
      const newVersionId = await createVersion(newName, `Duplicated from ${originalVersion.versionName || `Version ${originalVersion.versionNumber}`}`)
      
      return newVersionId
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate version'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [versions, createVersion])

  // Compare two versions
  const compareVersions = useCallback(async (
    versionId1: string, 
    versionId2: string
  ): Promise<VersionComparison | null> => {
    try {
      setError(null)

      const version1 = versions.find(v => v.id === versionId1)
      const version2 = versions.find(v => v.id === versionId2)

      if (!version1 || !version2) {
        throw new Error('One or both versions not found')
      }

      // In a real implementation, this would analyze the actual mix data
      // For now, return a mock comparison
      const comparison: VersionComparison = {
        version1,
        version2,
        differences: {
          tracks: {
            added: [],
            removed: [],
            modified: []
          },
          effects: {
            added: [],
            removed: [],
            modified: []
          },
          transitions: {
            changed: []
          },
          metadata: {
            changed: []
          }
        },
        summary: {
          totalChanges: 0,
          majorChanges: 0,
          minorChanges: 0
        }
      }

      return comparison
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to compare versions'
      setError(errorMessage)
      return null
    }
  }, [versions])

  // Get version changes
  const getVersionChanges = useCallback(async (versionId: string): Promise<VersionChange[]> => {
    try {
      setError(null)

      // In a real implementation, this would load actual change data
      // For now, return mock changes
      const mockChanges: VersionChange[] = [
        {
          type: 'track_added',
          description: 'Added new track at position 3',
          timestamp: new Date().toISOString(),
          details: {
            trackName: 'Example Track'
          }
        },
        {
          type: 'effect_added',
          description: 'Added reverb effect to track 1',
          timestamp: new Date().toISOString(),
          details: {
            effectType: 'reverb'
          }
        }
      ]

      return mockChanges
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get version changes'
      setError(errorMessage)
      return []
    }
  }, [])

  // Refresh versions
  const refreshVersions = useCallback(async (): Promise<void> => {
    await loadVersions()
  }, [loadVersions])

  // Get version by ID
  const getVersionById = useCallback((versionId: string): MixVersion | null => {
    return versions.find(v => v.id === versionId) || null
  }, [versions])

  // Enable/disable auto-versioning
  const enableAutoVersioning = useCallback((enabled: boolean) => {
    setIsAutoVersioningEnabled(enabled)
    
    // Store preference in localStorage
    localStorage.setItem(`auto_versioning_${mixId}`, enabled.toString())
  }, [mixId])

  // Load auto-versioning preference on mount
  useEffect(() => {
    const saved = localStorage.getItem(`auto_versioning_${mixId}`)
    if (saved !== null) {
      setIsAutoVersioningEnabled(saved === 'true')
    }
  }, [mixId])

  // Auto-versioning logic (simplified)
  useEffect(() => {
    if (!isAutoVersioningEnabled || !mixId) return

    // In a real implementation, this would watch for mix changes
    // and automatically create versions based on significant changes
    const autoVersionInterval = setInterval(() => {
      // Check for changes and create version if needed
      // This is a simplified example
    }, 30000) // Check every 30 seconds

    return () => clearInterval(autoVersionInterval)
  }, [isAutoVersioningEnabled, mixId])

  return {
    versions,
    currentVersion,
    isLoading,
    error,
    
    // Operations
    createVersion,
    restoreVersion,
    deleteVersion,
    publishVersion,
    duplicateVersion,
    
    // Comparison
    compareVersions,
    
    // Utilities
    refreshVersions,
    getVersionById,
    getVersionChanges,
    
    // Auto-save
    enableAutoVersioning,
    isAutoVersioningEnabled
  }
}

export default useMixVersions