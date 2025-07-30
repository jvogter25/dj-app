// Production Permission Manager Component
// UI for managing user roles and permissions

import React, { useState, useEffect } from 'react'
import {
  Shield, Users, Crown, Edit3, Eye, Settings,
  Lock, Unlock, Clock, AlertTriangle, Check, X,
  ChevronDown, ChevronRight, Info, UserMinus,
  UserCheck, Key, Calendar, Activity
} from 'lucide-react'
import { usePermissions } from '../hooks/usePermissions'
import { UserRole, ResourceType, ActionType } from '../lib/permissionSystem'
import { CollaboratorInfo } from '../lib/realtimeCollaboration'

interface PermissionManagerProps {
  mixId: string
  collaborators: CollaboratorInfo[]
  isOpen: boolean
  onClose: () => void
}

interface RoleCard {
  role: UserRole
  icon: React.ReactNode
  color: string
  description: string
  features: string[]
}

const roleCards: RoleCard[] = [
  {
    role: 'viewer',
    icon: <Eye className="h-5 w-5" />,
    color: 'bg-gray-600',
    description: 'Read-only access to view and play the mix',
    features: [
      'View mix and all tracks',
      'Play and preview mix',
      'See effects and transitions',
      'View version history'
    ]
  },
  {
    role: 'editor',
    icon: <Edit3 className="h-5 w-5" />,
    color: 'bg-blue-600',
    description: 'Full editing capabilities for mix content',
    features: [
      'All viewer permissions',
      'Edit tracks and transitions',
      'Apply effects and filters',
      'Create new versions',
      'Export mix'
    ]
  },
  {
    role: 'admin',
    icon: <Crown className="h-5 w-5" />,
    color: 'bg-purple-600',
    description: 'Manage collaborators and mix settings',
    features: [
      'All editor permissions',
      'Invite/remove collaborators',
      'Change user roles',
      'Delete versions',
      'Manage mix settings'
    ]
  }
]

export const PermissionManager: React.FC<PermissionManagerProps> = ({
  mixId,
  collaborators,
  isOpen,
  onClose
}) => {
  const {
    userRole,
    checkPermission,
    updateUserRole,
    revokePermission,
    permissionMatrix,
    refresh
  } = usePermissions({ mixId })

  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false)
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  // Check if current user can manage permissions
  const canManagePermissions = checkPermission('collaborator', 'manage')

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    if (!canManagePermissions) return

    setIsUpdating(true)
    setUpdateError(null)

    try {
      const success = await updateUserRole(userId, newRole)
      if (success) {
        await refresh()
      } else {
        setUpdateError('Failed to update role')
      }
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Error updating role')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRevokeAccess = async (userId: string) => {
    if (!canManagePermissions) return
    if (!confirm('Are you sure you want to revoke access for this user?')) return

    setIsUpdating(true)
    setUpdateError(null)

    try {
      const success = await revokePermission(userId)
      if (success) {
        await refresh()
      } else {
        setUpdateError('Failed to revoke access')
      }
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Error revoking access')
    } finally {
      setIsUpdating(false)
    }
  }

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
    }
    setExpandedUsers(newExpanded)
  }

  const getPermissionIcon = (allowed: boolean) => {
    return allowed ? (
      <Check className="h-4 w-4 text-green-400" />
    ) : (
      <X className="h-4 w-4 text-red-400" />
    )
  }

  const getRoleIcon = (role: UserRole) => {
    const card = roleCards.find(r => r.role === role)
    return card?.icon || <Eye className="h-5 w-5" />
  }

  const getRoleColor = (role: UserRole) => {
    const card = roleCards.find(r => r.role === role)
    return card?.color || 'bg-gray-600'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-purple-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">Permission Management</h2>
                <p className="text-gray-400">Manage roles and access for collaborators</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPermissionMatrix(!showPermissionMatrix)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Activity className="h-4 w-4" />
                {showPermissionMatrix ? 'Hide' : 'Show'} Matrix
              </button>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {updateError && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-red-300">{updateError}</span>
            </div>
          )}

          {!canManagePermissions && (
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg flex items-center gap-2">
              <Lock className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-300">You need admin permissions to manage collaborators</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Role Overview */}
          <div className="w-1/3 p-6 border-r border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">Role Overview</h3>
            
            <div className="space-y-4">
              {roleCards.map(card => (
                <div
                  key={card.role}
                  className={`p-4 rounded-lg border ${
                    userRole === card.role 
                      ? 'border-purple-500 bg-purple-500/10' 
                      : 'border-gray-600 bg-gray-900/30'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${card.color}`}>
                      {card.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-white capitalize">{card.role}</h4>
                      {userRole === card.role && (
                        <span className="text-xs text-purple-400">Your role</span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-300 mb-3">{card.description}</p>
                  
                  <ul className="space-y-1">
                    {card.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-400">
                        <Check className="h-3 w-3 text-green-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Collaborator List */}
          <div className="flex-1 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Collaborators</h3>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {collaborators.map(collaborator => (
                <div
                  key={collaborator.id}
                  className="border border-gray-600 rounded-lg bg-gray-900/30"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleUserExpansion(collaborator.userId)}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                        >
                          {expandedUsers.has(collaborator.userId) ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        
                        <div className="relative">
                          {collaborator.avatarUrl ? (
                            <img
                              src={collaborator.avatarUrl}
                              alt={collaborator.displayName}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                              <span className="text-white font-medium">
                                {collaborator.displayName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          {collaborator.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-800" />
                          )}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-white">{collaborator.displayName}</h4>
                            {getRoleIcon(collaborator.permission as UserRole)}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span className="capitalize">{collaborator.permission}</span>
                            {collaborator.isOnline ? (
                              <span className="text-green-400">Online</span>
                            ) : (
                              <span>Last active: {new Date(collaborator.lastActivity).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {canManagePermissions && (
                        <div className="flex items-center gap-2">
                          <select
                            value={collaborator.permission}
                            onChange={(e) => handleRoleUpdate(collaborator.userId, e.target.value as UserRole)}
                            disabled={isUpdating}
                            className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                          
                          <button
                            onClick={() => handleRevokeAccess(collaborator.userId)}
                            disabled={isUpdating}
                            className="p-1 hover:bg-red-600/20 rounded transition-colors"
                          >
                            <UserMinus className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {expandedUsers.has(collaborator.userId) && (
                    <div className="px-4 pb-4 border-t border-gray-700">
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-300 mb-3">Permission Details</h5>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {(['mix', 'track', 'effect', 'transition', 'export'] as ResourceType[]).map(resource => (
                            <div key={resource} className="text-sm">
                              <div className="font-medium text-gray-300 capitalize mb-1">{resource}</div>
                              <div className="space-y-1">
                                {(['read', 'write', 'delete'] as ActionType[]).map(action => {
                                  const hasPermission = permissionMatrix[resource]?.[action] || false
                                  return (
                                    <div key={action} className="flex items-center gap-2">
                                      {getPermissionIcon(hasPermission)}
                                      <span className="text-gray-400 capitalize">{action}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {collaborators.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No collaborators yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Permission Matrix */}
        {showPermissionMatrix && (
          <div className="p-6 border-t border-gray-700 bg-gray-900/50">
            <h3 className="text-lg font-medium text-white mb-4">Your Permission Matrix</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-2 text-gray-300">Resource</th>
                    {(['read', 'write', 'delete', 'share', 'export', 'manage'] as ActionType[]).map(action => (
                      <th key={action} className="text-center p-2 text-gray-300 capitalize">{action}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(['mix', 'track', 'effect', 'transition', 'metadata', 'collaborator', 'version', 'export'] as ResourceType[]).map(resource => (
                    <tr key={resource} className="border-b border-gray-700">
                      <td className="p-2 text-gray-300 capitalize">{resource}</td>
                      {(['read', 'write', 'delete', 'share', 'export', 'manage'] as ActionType[]).map(action => {
                        const hasPermission = permissionMatrix[resource]?.[action] || false
                        return (
                          <td key={action} className="text-center p-2">
                            {getPermissionIcon(hasPermission)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                <span>Allowed</span>
              </div>
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-400" />
                <span>Denied</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-400" />
                <span>Your role: {userRole}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PermissionManager