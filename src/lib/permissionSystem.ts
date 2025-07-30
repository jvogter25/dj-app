// Production Permission System
// Comprehensive role-based access control for collaborative mixes

import { createClient } from '@supabase/supabase-js'

export type UserRole = 'viewer' | 'editor' | 'admin' | 'owner'
export type ResourceType = 'mix' | 'track' | 'effect' | 'transition' | 'metadata' | 'collaborator' | 'version' | 'export'
export type ActionType = 'read' | 'write' | 'delete' | 'share' | 'export' | 'manage'

export interface Permission {
  resource: ResourceType
  action: ActionType
  allowed: boolean
  conditions?: PermissionCondition[]
}

export interface PermissionCondition {
  type: 'time_based' | 'count_based' | 'user_based' | 'content_based'
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  field: string
  value: any
}

export interface RoleDefinition {
  name: UserRole
  description: string
  permissions: Permission[]
  inherits?: UserRole[]
  restrictions?: RoleRestriction[]
}

export interface RoleRestriction {
  type: 'time_limit' | 'action_count' | 'resource_limit'
  value: number
  unit?: string
  message: string
}

export interface UserPermissions {
  userId: string
  mixId: string
  role: UserRole
  customPermissions?: Permission[]
  expiresAt?: string
  grantedBy?: string
  grantedAt?: string
}

// Default role definitions
const roleDefinitions: Record<UserRole, RoleDefinition> = {
  viewer: {
    name: 'viewer',
    description: 'Can view mix and playback, but cannot make changes',
    permissions: [
      { resource: 'mix', action: 'read', allowed: true },
      { resource: 'track', action: 'read', allowed: true },
      { resource: 'effect', action: 'read', allowed: true },
      { resource: 'transition', action: 'read', allowed: true },
      { resource: 'metadata', action: 'read', allowed: true },
      { resource: 'version', action: 'read', allowed: true },
      { resource: 'collaborator', action: 'read', allowed: true },
      // Explicitly deny write actions
      { resource: 'mix', action: 'write', allowed: false },
      { resource: 'track', action: 'write', allowed: false },
      { resource: 'effect', action: 'write', allowed: false },
      { resource: 'transition', action: 'write', allowed: false },
      { resource: 'metadata', action: 'write', allowed: false },
      { resource: 'collaborator', action: 'manage', allowed: false },
      { resource: 'export', action: 'export', allowed: false }
    ],
    restrictions: [
      {
        type: 'time_limit',
        value: 24,
        unit: 'hours',
        message: 'Viewer access expires after 24 hours'
      }
    ]
  },

  editor: {
    name: 'editor',
    description: 'Can edit mix content but cannot manage collaborators',
    inherits: ['viewer'],
    permissions: [
      { resource: 'track', action: 'write', allowed: true },
      { resource: 'track', action: 'delete', allowed: true },
      { resource: 'effect', action: 'write', allowed: true },
      { resource: 'effect', action: 'delete', allowed: true },
      { resource: 'transition', action: 'write', allowed: true },
      { resource: 'transition', action: 'delete', allowed: true },
      { resource: 'metadata', action: 'write', allowed: true },
      { resource: 'version', action: 'write', allowed: true },
      { resource: 'export', action: 'export', allowed: true },
      // Still cannot manage collaborators
      { resource: 'collaborator', action: 'manage', allowed: false },
      { resource: 'mix', action: 'delete', allowed: false }
    ],
    restrictions: [
      {
        type: 'action_count',
        value: 1000,
        message: 'Editors limited to 1000 actions per session'
      }
    ]
  },

  admin: {
    name: 'admin',
    description: 'Can manage all aspects except deleting the mix',
    inherits: ['editor'],
    permissions: [
      { resource: 'collaborator', action: 'manage', allowed: true },
      { resource: 'collaborator', action: 'write', allowed: true },
      { resource: 'collaborator', action: 'delete', allowed: true },
      { resource: 'mix', action: 'share', allowed: true },
      { resource: 'version', action: 'delete', allowed: true },
      // Still cannot delete the entire mix
      { resource: 'mix', action: 'delete', allowed: false }
    ]
  },

  owner: {
    name: 'owner',
    description: 'Full control over the mix and all collaborators',
    inherits: ['admin'],
    permissions: [
      { resource: 'mix', action: 'delete', allowed: true },
      // Owner has all permissions
      { resource: 'mix', action: 'manage', allowed: true },
      { resource: 'track', action: 'manage', allowed: true },
      { resource: 'effect', action: 'manage', allowed: true },
      { resource: 'transition', action: 'manage', allowed: true },
      { resource: 'metadata', action: 'manage', allowed: true },
      { resource: 'collaborator', action: 'manage', allowed: true },
      { resource: 'version', action: 'manage', allowed: true },
      { resource: 'export', action: 'manage', allowed: true }
    ]
  }
}

export class PermissionSystem {
  private supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL!,
    process.env.REACT_APP_SUPABASE_ANON_KEY!
  )

  private roleCache: Map<string, UserPermissions> = new Map()
  private permissionCache: Map<string, boolean> = new Map()

  // Check if user has permission to perform action
  async checkPermission(
    userId: string,
    mixId: string,
    resource: ResourceType,
    action: ActionType,
    context?: any
  ): Promise<boolean> {
    const cacheKey = `${userId}-${mixId}-${resource}-${action}`
    
    // Check cache first
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!
    }

    try {
      // Get user's role and permissions
      const userPermissions = await this.getUserPermissions(userId, mixId)
      if (!userPermissions) {
        this.permissionCache.set(cacheKey, false)
        return false
      }

      // Check if permission expired
      if (userPermissions.expiresAt && new Date(userPermissions.expiresAt) < new Date()) {
        this.permissionCache.set(cacheKey, false)
        return false
      }

      // Check permission
      const hasPermission = this.evaluatePermission(
        userPermissions,
        resource,
        action,
        context
      )

      // Cache result for 5 minutes
      this.permissionCache.set(cacheKey, hasPermission)
      setTimeout(() => this.permissionCache.delete(cacheKey), 5 * 60 * 1000)

      return hasPermission
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }

  // Get user's role and permissions for a mix
  async getUserPermissions(userId: string, mixId: string): Promise<UserPermissions | null> {
    const cacheKey = `${userId}-${mixId}`
    
    // Check cache
    if (this.roleCache.has(cacheKey)) {
      return this.roleCache.get(cacheKey)!
    }

    try {
      // Check if user is the owner
      const { data: mix } = await this.supabase
        .from('mixes')
        .select('user_id')
        .eq('id', mixId)
        .single()

      if (mix?.user_id === userId) {
        const ownerPermissions: UserPermissions = {
          userId,
          mixId,
          role: 'owner',
          grantedAt: new Date().toISOString()
        }
        this.roleCache.set(cacheKey, ownerPermissions)
        return ownerPermissions
      }

      // Get user's collaboration role
      const { data: collaborator } = await this.supabase
        .from('mix_collaborators')
        .select('*')
        .eq('mix_id', mixId)
        .eq('user_id', userId)
        .single()

      if (!collaborator) {
        return null
      }

      const permissions: UserPermissions = {
        userId,
        mixId,
        role: collaborator.permission as UserRole,
        customPermissions: collaborator.custom_permissions,
        expiresAt: collaborator.expires_at,
        grantedBy: collaborator.invited_by,
        grantedAt: collaborator.accepted_at || collaborator.invited_at
      }

      // Cache for 10 minutes
      this.roleCache.set(cacheKey, permissions)
      setTimeout(() => this.roleCache.delete(cacheKey), 10 * 60 * 1000)

      return permissions
    } catch (error) {
      console.error('Error getting user permissions:', error)
      return null
    }
  }

  // Evaluate if user has specific permission
  private evaluatePermission(
    userPermissions: UserPermissions,
    resource: ResourceType,
    action: ActionType,
    context?: any
  ): boolean {
    const roleDefinition = this.getRoleDefinition(userPermissions.role)
    if (!roleDefinition) return false

    // Get all permissions including inherited
    const allPermissions = this.getAllPermissions(roleDefinition)

    // Check custom permissions first
    if (userPermissions.customPermissions) {
      const customPerm = userPermissions.customPermissions.find(
        p => p.resource === resource && p.action === action
      )
      if (customPerm) {
        return this.evaluatePermissionWithConditions(customPerm, context)
      }
    }

    // Check role permissions
    const permission = allPermissions.find(
      p => p.resource === resource && p.action === action
    )

    if (!permission) {
      // Check for wildcard permissions
      const wildcardPermission = allPermissions.find(
        p => p.resource === resource && p.action === 'manage'
      )
      return wildcardPermission?.allowed || false
    }

    return this.evaluatePermissionWithConditions(permission, context)
  }

  // Evaluate permission with conditions
  private evaluatePermissionWithConditions(permission: Permission, context?: any): boolean {
    if (!permission.allowed) return false
    if (!permission.conditions || permission.conditions.length === 0) return true

    // Evaluate all conditions
    return permission.conditions.every(condition => 
      this.evaluateCondition(condition, context)
    )
  }

  // Evaluate a single condition
  private evaluateCondition(condition: PermissionCondition, context?: any): boolean {
    if (!context) return true

    const value = context[condition.field]
    if (value === undefined) return true

    switch (condition.operator) {
      case 'equals':
        return value === condition.value
      case 'not_equals':
        return value !== condition.value
      case 'greater_than':
        return value > condition.value
      case 'less_than':
        return value < condition.value
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value)
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value)
      default:
        return true
    }
  }

  // Get role definition with inheritance
  private getRoleDefinition(role: UserRole): RoleDefinition | null {
    return roleDefinitions[role] || null
  }

  // Get all permissions including inherited ones
  private getAllPermissions(roleDefinition: RoleDefinition): Permission[] {
    const permissions = [...roleDefinition.permissions]

    // Add inherited permissions
    if (roleDefinition.inherits) {
      roleDefinition.inherits.forEach(inheritedRole => {
        const inheritedDef = this.getRoleDefinition(inheritedRole as UserRole)
        if (inheritedDef) {
          permissions.push(...this.getAllPermissions(inheritedDef))
        }
      })
    }

    // Remove duplicates, keeping the most specific permission
    const uniquePermissions = new Map<string, Permission>()
    permissions.forEach(permission => {
      const key = `${permission.resource}-${permission.action}`
      uniquePermissions.set(key, permission)
    })

    return Array.from(uniquePermissions.values())
  }

  // Grant permission to user
  async grantPermission(
    grantorId: string,
    userId: string,
    mixId: string,
    role: UserRole,
    expiresIn?: number // hours
  ): Promise<boolean> {
    try {
      // Check if grantor has permission to manage collaborators
      const canManage = await this.checkPermission(grantorId, mixId, 'collaborator', 'manage')
      if (!canManage) {
        throw new Error('Insufficient permissions to manage collaborators')
      }

      // Calculate expiration
      const expiresAt = expiresIn 
        ? new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString()
        : null

      // Grant permission
      const { error } = await this.supabase
        .from('mix_collaborators')
        .upsert({
          mix_id: mixId,
          user_id: userId,
          permission: role,
          invited_by: grantorId,
          expires_at: expiresAt,
          invited_at: new Date().toISOString()
        })

      if (error) throw error

      // Clear cache
      this.roleCache.delete(`${userId}-${mixId}`)
      
      return true
    } catch (error) {
      console.error('Error granting permission:', error)
      return false
    }
  }

  // Revoke permission
  async revokePermission(
    revokerId: string,
    userId: string,
    mixId: string
  ): Promise<boolean> {
    try {
      // Check if revoker has permission to manage collaborators
      const canManage = await this.checkPermission(revokerId, mixId, 'collaborator', 'manage')
      if (!canManage) {
        throw new Error('Insufficient permissions to manage collaborators')
      }

      // Cannot revoke owner's permission
      const userPermissions = await this.getUserPermissions(userId, mixId)
      if (userPermissions?.role === 'owner') {
        throw new Error('Cannot revoke owner permissions')
      }

      // Revoke permission
      const { error } = await this.supabase
        .from('mix_collaborators')
        .delete()
        .eq('mix_id', mixId)
        .eq('user_id', userId)

      if (error) throw error

      // Clear cache
      this.roleCache.delete(`${userId}-${mixId}`)
      this.permissionCache.clear() // Clear all permission cache for safety
      
      return true
    } catch (error) {
      console.error('Error revoking permission:', error)
      return false
    }
  }

  // Update user role
  async updateUserRole(
    updaterId: string,
    userId: string,
    mixId: string,
    newRole: UserRole
  ): Promise<boolean> {
    try {
      // Check permissions
      const canManage = await this.checkPermission(updaterId, mixId, 'collaborator', 'manage')
      if (!canManage) {
        throw new Error('Insufficient permissions to manage collaborators')
      }

      // Cannot change owner's role
      const userPermissions = await this.getUserPermissions(userId, mixId)
      if (userPermissions?.role === 'owner') {
        throw new Error('Cannot change owner role')
      }

      // Update role
      const { error } = await this.supabase
        .from('mix_collaborators')
        .update({ permission: newRole })
        .eq('mix_id', mixId)
        .eq('user_id', userId)

      if (error) throw error

      // Clear cache
      this.roleCache.delete(`${userId}-${mixId}`)
      this.permissionCache.clear()
      
      return true
    } catch (error) {
      console.error('Error updating user role:', error)
      return false
    }
  }

  // Check multiple permissions at once
  async checkMultiplePermissions(
    userId: string,
    mixId: string,
    permissions: Array<{ resource: ResourceType, action: ActionType }>
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}

    await Promise.all(
      permissions.map(async ({ resource, action }) => {
        const key = `${resource}-${action}`
        results[key] = await this.checkPermission(userId, mixId, resource, action)
      })
    )

    return results
  }

  // Get all permissions for a user
  async getAllUserPermissions(userId: string, mixId: string): Promise<Permission[]> {
    const userPermissions = await this.getUserPermissions(userId, mixId)
    if (!userPermissions) return []

    const roleDefinition = this.getRoleDefinition(userPermissions.role)
    if (!roleDefinition) return []

    const allPermissions = this.getAllPermissions(roleDefinition)

    // Merge with custom permissions
    if (userPermissions.customPermissions) {
      userPermissions.customPermissions.forEach(customPerm => {
        const index = allPermissions.findIndex(
          p => p.resource === customPerm.resource && p.action === customPerm.action
        )
        if (index >= 0) {
          allPermissions[index] = customPerm
        } else {
          allPermissions.push(customPerm)
        }
      })
    }

    return allPermissions
  }

  // Get role restrictions
  getRestrictions(role: UserRole): RoleRestriction[] {
    const roleDefinition = this.getRoleDefinition(role)
    return roleDefinition?.restrictions || []
  }

  // Clear all caches
  clearCache(): void {
    this.roleCache.clear()
    this.permissionCache.clear()
  }

  // Export permission check results for UI
  async exportPermissionMatrix(userId: string, mixId: string): Promise<any> {
    const resources: ResourceType[] = ['mix', 'track', 'effect', 'transition', 'metadata', 'collaborator', 'version', 'export']
    const actions: ActionType[] = ['read', 'write', 'delete', 'share', 'export', 'manage']

    const matrix: any = {}

    for (const resource of resources) {
      matrix[resource] = {}
      for (const action of actions) {
        matrix[resource][action] = await this.checkPermission(userId, mixId, resource, action)
      }
    }

    return matrix
  }
}

// Export singleton instance
export const permissionSystem = new PermissionSystem()

// Export helper hooks for React components
export const usePermission = (resource: ResourceType, action: ActionType) => {
  // This would be implemented as a React hook
  // For now, just export the type
  return { hasPermission: false, loading: false }
}

// All types are already exported as interfaces above