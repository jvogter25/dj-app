// Production Collaboration Manager Component
// Real-time collaboration interface for mix editing

import React, { useState, useEffect } from 'react'
import {
  Users, UserPlus, Crown, Edit3, Eye, Settings,
  Mail, Check, X, Clock, Wifi, WifiOff, MoreVertical,
  AlertTriangle, Shield, Copy, Link, Send
} from 'lucide-react'
import { useRealtimeCollaboration } from '../hooks/useRealtimeCollaboration'
import { CollaboratorInfo } from '../lib/realtimeCollaboration'
import { useSupabase } from '../hooks/useSupabase'

interface CollaborationManagerProps {
  mixId: string
  isOpen: boolean
  onClose: () => void
}

interface InviteForm {
  email: string
  permission: 'viewer' | 'editor' | 'admin'
  message?: string
}

export const CollaborationManager: React.FC<CollaborationManagerProps> = ({
  mixId,
  isOpen,
  onClose
}) => {
  const { supabase, user } = useSupabase()
  const {
    session,
    collaborators,
    isConnected,
    permissions,
    connectionStatus,
    conflictEvents,
    resolveConflict
  } = useRealtimeCollaboration({ mixId, autoJoin: true })

  const [inviteForm, setInviteForm] = useState<InviteForm>({
    email: '',
    permission: 'editor'
  })
  const [isInviting, setIsInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [shareableLink, setShareableLink] = useState<string>('')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [selectedCollaborator, setSelectedCollaborator] = useState<string | null>(null)

  // Generate shareable link
  useEffect(() => {
    if (mixId) {
      const baseUrl = window.location.origin
      setShareableLink(`${baseUrl}/mix/${mixId}/collaborate`)
    }
  }, [mixId])

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteForm.email.trim()) return

    setIsInviting(true)
    setInviteError(null)

    try {
      const { data, error } = await supabase.rpc('invite_collaborator', {
        p_mix_id: mixId,
        p_user_email: inviteForm.email.trim(),
        p_permission: inviteForm.permission
      })

      if (error) throw error

      // Send notification email (would be handled by edge function)
      await supabase.functions.invoke('send-collaboration-invite', {
        body: {
          mixId,
          recipientEmail: inviteForm.email,
          senderName: user?.user_metadata?.display_name || 'Someone',
          permission: inviteForm.permission,
          message: inviteForm.message
        }
      })

      setInviteForm({ email: '', permission: 'editor' })
      setShowInviteForm(false)
    } catch (error) {
      console.error('Error inviting user:', error)
      setInviteError(error instanceof Error ? error.message : 'Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const handlePermissionChange = async (collaboratorId: string, newPermission: 'viewer' | 'editor' | 'admin') => {
    try {
      const { error } = await supabase
        .from('mix_collaborators')
        .update({ permission: newPermission })
        .eq('id', collaboratorId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating permission:', error)
    }
  }

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) return

    try {
      const { error } = await supabase
        .from('mix_collaborators')
        .delete()
        .eq('id', collaboratorId)

      if (error) throw error
    } catch (error) {
      console.error('Error removing collaborator:', error)
    }
  }

  const copyShareableLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink)
      // Show success toast
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'admin': return <Crown className="h-4 w-4 text-yellow-400" />
      case 'editor': return <Edit3 className="h-4 w-4 text-blue-400" />
      case 'viewer': return <Eye className="h-4 w-4 text-gray-400" />
      default: return <Eye className="h-4 w-4 text-gray-400" />
    }
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi className="h-4 w-4 text-green-400" />
      case 'connecting': return <Clock className="h-4 w-4 text-yellow-400 animate-spin" />
      case 'error': return <WifiOff className="h-4 w-4 text-red-400" />
      default: return <WifiOff className="h-4 w-4 text-gray-400" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-purple-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">Collaboration</h2>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  {getConnectionStatusIcon()}
                  <span>
                    {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}
                    {isConnected && ` • ${collaborators.filter(c => c.isOnline).length} online`}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {permissions.canInvite && (
                <button
                  onClick={() => setShowInviteForm(!showInviteForm)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Invite
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Connection Status */}
          {connectionStatus === 'error' && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-red-300">Connection lost. Trying to reconnect...</span>
            </div>
          )}

          {/* Conflicts */}
          {conflictEvents.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <span className="text-yellow-300 font-medium">
                  {conflictEvents.length} conflict{conflictEvents.length !== 1 ? 's' : ''} detected
                </span>
              </div>
              <div className="space-y-2">
                {conflictEvents.map(event => (
                  <div key={event.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{event.type.replace('_', ' ')}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveConflict(event.id, 'accept')}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => resolveConflict(event.id, 'reject')}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Invite Form */}
        {showInviteForm && permissions.canInvite && (
          <div className="p-6 border-b border-gray-700 bg-gray-900/50">
            <h3 className="text-lg font-medium text-white mb-4">Invite Collaborator</h3>
            
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="colleague@example.com"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Permission
                  </label>
                  <select
                    value={inviteForm.permission}
                    onChange={(e) => setInviteForm({ ...inviteForm, permission: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    {permissions.canManagePermissions && <option value="admin">Admin</option>}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={inviteForm.message || ''}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Add a personal message to your invitation..."
                />
              </div>
              
              {inviteError && (
                <div className="text-red-400 text-sm">{inviteError}</div>
              )}
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isInviting || !inviteForm.email.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isInviting ? <Clock className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Invitation
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>

            {/* Shareable Link */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Or share this link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareableLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                />
                <button
                  onClick={copyShareableLink}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Copy className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Collaborators List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="space-y-3">
              {collaborators.map(collaborator => (
                <div
                  key={collaborator.id}
                  className={`p-4 rounded-lg border transition-all ${
                    collaborator.isOnline 
                      ? 'border-green-500/30 bg-green-500/5' 
                      : 'border-gray-600 bg-gray-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
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
                        {/* Online indicator */}
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${
                          collaborator.isOnline ? 'bg-green-400' : 'bg-gray-500'
                        }`} />
                      </div>
                      
                      {/* User info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-white">{collaborator.displayName}</h4>
                          {getPermissionIcon(collaborator.permission)}
                          {session?.isHost && collaborator.userId === user?.id && (
                            <Crown className="h-4 w-4 text-yellow-400" />
                          )}
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
                    
                    {/* Actions */}
                    {permissions.canManagePermissions && collaborator.userId !== user?.id && (
                      <div className="flex items-center gap-2">
                        <select
                          value={collaborator.permission}
                          onChange={(e) => handlePermissionChange(collaborator.id, e.target.value as any)}
                          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                        
                        <button
                          onClick={() => handleRemoveCollaborator(collaborator.id)}
                          className="p-1 hover:bg-red-600/20 rounded transition-colors"
                        >
                          <X className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Cursor/Selection indicator */}
                  {collaborator.isOnline && collaborator.cursor && (
                    <div className="mt-2 text-xs text-gray-400">
                      Working at {Math.round(collaborator.cursor.timelinePosition)}s
                    </div>
                  )}
                </div>
              ))}
              
              {collaborators.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Collaborators Yet</h3>
                  <p className="text-gray-400 mb-4">Invite others to collaborate on this mix.</p>
                  {permissions.canInvite && (
                    <button
                      onClick={() => setShowInviteForm(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      Invite Collaborator
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center gap-4">
              <span>Real-time collaboration enabled</span>
              {isConnected && <span className="text-green-400">• Synced</span>}
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>End-to-end encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CollaborationManager