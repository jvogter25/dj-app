// Production Permission Hook
// React hook for checking and managing permissions

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  permissionSystem, 
  ResourceType, 
  ActionType, 
  UserRole, 
  Permission,
  UserPermissions
} from '../lib/permissionSystem'
import { useSupabase } from './useSupabase'

interface UsePermissionsProps {
  mixId: string
  autoRefresh?: boolean
  refreshInterval?: number // milliseconds
}

interface UsePermissionsReturn {
  // Permission checks
  hasPermission: (resource: ResourceType, action: ActionType, context?: any) => Promise<boolean>
  checkPermission: (resource: ResourceType, action: ActionType) => boolean
  
  // User info
  userRole: UserRole | null
  userPermissions: UserPermissions | null
  allPermissions: Permission[]
  
  // Permission management
  grantPermission: (userId: string, role: UserRole, expiresIn?: number) => Promise<boolean>
  revokePermission: (userId: string) => Promise<boolean>
  updateUserRole: (userId: string, newRole: UserRole) => Promise<boolean>
  
  // Permission matrix
  permissionMatrix: Record<ResourceType, Record<ActionType, boolean>>
  
  // Loading states
  isLoading: boolean
  error: string | null
  
  // Refresh
  refresh: () => Promise<void>
}

// Cache for synchronous permission checks
const permissionCache = new Map<string, boolean>()

export const usePermissions = ({ 
  mixId, 
  autoRefresh = false,
  refreshInterval = 60000 // 1 minute
}: UsePermissionsProps): UsePermissionsReturn => {
  const { user } = useSupabase()
  
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [permissionMatrix, setPermissionMatrix] = useState<Record<ResourceType, Record<ActionType, boolean>>>({} as any)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load user permissions
  const loadPermissions = useCallback(async () => {
    if (!user || !mixId) return

    setIsLoading(true)
    setError(null)

    try {
      // Get user permissions
      const permissions = await permissionSystem.getUserPermissions(user.id, mixId)
      
      if (permissions) {
        setUserPermissions(permissions)
        setUserRole(permissions.role)
        
        // Get all permissions for the role
        const allPerms = await permissionSystem.getAllUserPermissions(user.id, mixId)
        setAllPermissions(allPerms)
        
        // Build permission matrix
        const matrix = await permissionSystem.exportPermissionMatrix(user.id, mixId)
        setPermissionMatrix(matrix)
        
        // Cache permissions for synchronous checks
        Object.entries(matrix).forEach(([resource, actions]) => {
          Object.entries(actions as Record<ActionType, boolean>).forEach(([action, allowed]) => {
            const cacheKey = `${user.id}-${mixId}-${resource}-${action}`
            permissionCache.set(cacheKey, allowed)
          })
        })
      } else {
        // User has no permissions for this mix
        setUserRole(null)
        setAllPermissions([])
        setPermissionMatrix({} as any)
      }
    } catch (err) {
      console.error('Error loading permissions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load permissions')
    } finally {
      setIsLoading(false)
    }
  }, [user, mixId])

  // Initial load
  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadPermissions()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loadPermissions])

  // Async permission check
  const hasPermission = useCallback(async (
    resource: ResourceType, 
    action: ActionType,
    context?: any
  ): Promise<boolean> => {
    if (!user || !mixId) return false
    
    try {
      return await permissionSystem.checkPermission(user.id, mixId, resource, action, context)
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }, [user, mixId])

  // Synchronous permission check (uses cache)
  const checkPermission = useCallback((
    resource: ResourceType,
    action: ActionType
  ): boolean => {
    if (!user || !mixId) return false
    
    const cacheKey = `${user.id}-${mixId}-${resource}-${action}`
    return permissionCache.get(cacheKey) || false
  }, [user, mixId])

  // Grant permission to another user
  const grantPermission = useCallback(async (
    userId: string,
    role: UserRole,
    expiresIn?: number
  ): Promise<boolean> => {
    if (!user || !mixId) return false

    try {
      const success = await permissionSystem.grantPermission(user.id, userId, mixId, role, expiresIn)
      if (success) {
        // Refresh permissions if it's the current user
        if (userId === user.id) {
          await loadPermissions()
        }
      }
      return success
    } catch (error) {
      console.error('Error granting permission:', error)
      setError(error instanceof Error ? error.message : 'Failed to grant permission')
      return false
    }
  }, [user, mixId, loadPermissions])

  // Revoke permission from a user
  const revokePermission = useCallback(async (userId: string): Promise<boolean> => {
    if (!user || !mixId) return false

    try {
      const success = await permissionSystem.revokePermission(user.id, userId, mixId)
      if (success && userId === user.id) {
        // User revoked their own access
        setUserRole(null)
        setUserPermissions(null)
        setAllPermissions([])
        setPermissionMatrix({} as any)
        permissionCache.clear()
      }
      return success
    } catch (error) {
      console.error('Error revoking permission:', error)
      setError(error instanceof Error ? error.message : 'Failed to revoke permission')
      return false
    }
  }, [user, mixId])

  // Update user role
  const updateUserRole = useCallback(async (
    userId: string,
    newRole: UserRole
  ): Promise<boolean> => {
    if (!user || !mixId) return false

    try {
      const success = await permissionSystem.updateUserRole(user.id, userId, mixId, newRole)
      if (success && userId === user.id) {
        await loadPermissions()
      }
      return success
    } catch (error) {
      console.error('Error updating role:', error)
      setError(error instanceof Error ? error.message : 'Failed to update role')
      return false
    }
  }, [user, mixId, loadPermissions])

  // Refresh permissions manually
  const refresh = useCallback(async () => {
    permissionCache.clear()
    await loadPermissions()
  }, [loadPermissions])

  // Memoized return value
  return useMemo(() => ({
    // Permission checks
    hasPermission,
    checkPermission,
    
    // User info
    userRole,
    userPermissions,
    allPermissions,
    
    // Permission management
    grantPermission,
    revokePermission,
    updateUserRole,
    
    // Permission matrix
    permissionMatrix,
    
    // Loading states
    isLoading,
    error,
    
    // Refresh
    refresh
  }), [
    hasPermission,
    checkPermission,
    userRole,
    userPermissions,
    allPermissions,
    grantPermission,
    revokePermission,
    updateUserRole,
    permissionMatrix,
    isLoading,
    error,
    refresh
  ])
}

// Higher-order component for permission-based rendering
export const withPermission = (
  Component: React.ComponentType<any>,
  resource: ResourceType,
  action: ActionType,
  fallback?: React.ComponentType
) => {
  return (props: any) => {
    const { checkPermission } = usePermissions({ mixId: props.mixId })
    const hasPermission = checkPermission(resource, action)

    if (!hasPermission && fallback) {
      const Fallback = fallback
      return <Fallback {...props} />
    }

    if (!hasPermission) {
      return null
    }

    return <Component {...props} />
  }
}

// Permission guard component
interface PermissionGuardProps {
  resource: ResourceType
  action: ActionType
  mixId: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  resource,
  action,
  mixId,
  fallback = null,
  children
}) => {
  const { checkPermission, isLoading } = usePermissions({ mixId })
  
  if (isLoading) {
    return <div className="animate-pulse">Loading permissions...</div>
  }

  const hasPermission = checkPermission(resource, action)
  
  if (!hasPermission) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Hook for checking multiple permissions
export const useMultiplePermissions = (
  mixId: string,
  permissions: Array<{ resource: ResourceType, action: ActionType }>
) => {
  const { permissionMatrix } = usePermissions({ mixId })
  
  return useMemo(() => {
    const results: Record<string, boolean> = {}
    
    permissions.forEach(({ resource, action }) => {
      const key = `${resource}-${action}`
      results[key] = permissionMatrix[resource]?.[action] || false
    })
    
    return results
  }, [permissionMatrix, permissions])
}

// Hook for role-based checks
export const useRole = (mixId: string) => {
  const { userRole, isLoading } = usePermissions({ mixId })
  
  return {
    role: userRole,
    isOwner: userRole === 'owner',
    isAdmin: userRole === 'admin' || userRole === 'owner',
    isEditor: userRole === 'editor' || userRole === 'admin' || userRole === 'owner',
    isViewer: userRole === 'viewer' || userRole === 'editor' || userRole === 'admin' || userRole === 'owner',
    isLoading
  }
}

export default usePermissions