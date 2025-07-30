// Production Invitation System Component
// Advanced collaboration invitation management

import React, { useState, useEffect } from 'react'
import {
  Mail, Link, Copy, QrCode, Clock, Check, X, Send,
  UserPlus, Users, Share2, Settings, Calendar, MapPin,
  Globe, Lock, Eye, Edit3, Crown, AlertCircle
} from 'lucide-react'
import { useSupabase } from '../hooks/useSupabase'

interface InvitationSystemProps {
  mixId: string
  isOpen: boolean
  onClose: () => void
}

interface InvitationData {
  id: string
  email: string
  permission: 'viewer' | 'editor' | 'admin'
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  invitedAt: string
  expiresAt: string
  message?: string
  invitedBy: string
  acceptedAt?: string
}

interface InviteOptions {
  permission: 'viewer' | 'editor' | 'admin'
  expirationDays: number
  message: string
  allowForwarding: boolean
  requireApproval: boolean
  sessionType: 'temporary' | 'permanent'
}

export const InvitationSystem: React.FC<InvitationSystemProps> = ({
  mixId,
  isOpen,
  onClose
}) => {
  const { supabase, user } = useSupabase()
  const [invitations, setInvitations] = useState<InvitationData[]>([])
  const [inviteOptions, setInviteOptions] = useState<InviteOptions>({
    permission: 'editor',
    expirationDays: 7,
    message: '',
    allowForwarding: false,
    requireApproval: false,
    sessionType: 'permanent'
  })
  const [emailList, setEmailList] = useState<string>('')
  const [isInviting, setIsInviting] = useState(false)
  const [shareableLink, setShareableLink] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [inviteMethod, setInviteMethod] = useState<'email' | 'link' | 'qr'>('email')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Load existing invitations
  useEffect(() => {
    if (isOpen) {
      loadInvitations()
      generateShareableLink()
    }
  }, [isOpen, mixId])

  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('mix_collaborators')
        .select(`
          *,
          invited_by_profile:profiles!mix_collaborators_invited_by_fkey(display_name),
          user_profile:profiles!mix_collaborators_user_id_fkey(email, display_name)
        `)
        .eq('mix_id', mixId)
        .order('invited_at', { ascending: false })

      if (error) throw error

      const invitationList: InvitationData[] = (data || []).map(item => ({
        id: item.id,
        email: item.user_profile?.email || 'Unknown',
        permission: item.permission,
        status: item.accepted_at ? 'accepted' : 'pending',
        invitedAt: item.invited_at,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        invitedBy: item.invited_by_profile?.display_name || 'Unknown'
      }))

      setInvitations(invitationList)
    } catch (error) {
      console.error('Error loading invitations:', error)
    }
  }

  const generateShareableLink = () => {
    const baseUrl = window.location.origin
    const link = `${baseUrl}/mix/${mixId}/join?permission=${inviteOptions.permission}&expires=${Date.now() + (inviteOptions.expirationDays * 24 * 60 * 60 * 1000)}`
    setShareableLink(link)
    
    // Generate QR code URL (using a QR code service)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`
    setQrCodeUrl(qrUrl)
  }

  const handleEmailInvite = async () => {
    if (!emailList.trim()) return

    setIsInviting(true)
    try {
      const emails = emailList.split(/[,;\n]/).map(email => email.trim()).filter(Boolean)
      const results = []

      for (const email of emails) {
        try {
          // Create invitation record
          const { data: inviteData, error: inviteError } = await supabase.rpc('invite_collaborator', {
            p_mix_id: mixId,
            p_user_email: email,
            p_permission: inviteOptions.permission
          })

          if (inviteError) throw inviteError

          // Send email notification
          const { error: emailError } = await supabase.functions.invoke('send-collaboration-invite', {
            body: {
              mixId,
              recipientEmail: email,
              senderName: user?.user_metadata?.display_name || 'Someone',
              permission: inviteOptions.permission,
              message: inviteOptions.message,
              expirationDays: inviteOptions.expirationDays,
              joinLink: shareableLink
            }
          })

          if (emailError) {
            console.warn('Failed to send email notification:', emailError)
          }

          results.push({ email, success: true })
        } catch (error) {
          console.error(`Failed to invite ${email}:`, error)
          results.push({ email, success: false, error })
        }
      }

      // Show results
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      
      if (successful > 0) {
        // Show success message
      }
      if (failed > 0) {
        // Show error message
      }

      setEmailList('')
      await loadInvitations()
    } catch (error) {
      console.error('Error sending invitations:', error)
    } finally {
      setIsInviting(false)
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const invitation = invitations.find(inv => inv.id === invitationId)
      if (!invitation) return

      await supabase.functions.invoke('send-collaboration-invite', {
        body: {
          mixId,
          recipientEmail: invitation.email,
          senderName: user?.user_metadata?.display_name || 'Someone',
          permission: invitation.permission,
          message: 'Reminder: You have been invited to collaborate on this mix',
          joinLink: shareableLink
        }
      })

      // Update last sent timestamp
      await supabase
        .from('mix_collaborators')
        .update({ invited_at: new Date().toISOString() })
        .eq('id', invitationId)

      await loadInvitations()
    } catch (error) {
      console.error('Error resending invitation:', error)
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return

    try {
      await supabase
        .from('mix_collaborators')
        .delete()
        .eq('id', invitationId)

      await loadInvitations()
    } catch (error) {
      console.error('Error revoking invitation:', error)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Show success toast
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-green-400 bg-green-900/20'
      case 'pending': return 'text-yellow-400 bg-yellow-900/20'
      case 'declined': return 'text-red-400 bg-red-900/20'
      case 'expired': return 'text-gray-400 bg-gray-900/20'
      default: return 'text-gray-400 bg-gray-900/20'
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserPlus className="h-6 w-6 text-purple-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">Invite Collaborators</h2>
                <p className="text-gray-400">Share your mix and collaborate in real-time</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Invite Methods */}
          <div className="w-1/2 p-6 border-r border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">Invitation Method</h3>
            
            {/* Method Selection */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <button
                onClick={() => setInviteMethod('email')}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  inviteMethod === 'email'
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <Mail className="h-5 w-5 mx-auto mb-1" />
                <div className="text-sm font-medium">Email</div>
              </button>
              
              <button
                onClick={() => setInviteMethod('link')}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  inviteMethod === 'link'
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <Link className="h-5 w-5 mx-auto mb-1" />
                <div className="text-sm font-medium">Link</div>
              </button>
              
              <button
                onClick={() => setInviteMethod('qr')}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  inviteMethod === 'qr'
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <QrCode className="h-5 w-5 mx-auto mb-1" />
                <div className="text-sm font-medium">QR Code</div>
              </button>
            </div>

            {/* Email Method */}
            {inviteMethod === 'email' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Addresses
                  </label>
                  <textarea
                    value={emailList}
                    onChange={(e) => setEmailList(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="Enter email addresses (one per line or separated by commas)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Personal Message (Optional)
                  </label>
                  <textarea
                    value={inviteOptions.message}
                    onChange={(e) => setInviteOptions({ ...inviteOptions, message: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="Add a personal message to your invitation..."
                  />
                </div>
              </div>
            )}

            {/* Link Method */}
            {inviteMethod === 'link' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Shareable Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareableLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(shareableLink)}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                      <Copy className="h-4 w-4 text-white" />
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.share?.({ url: shareableLink, title: 'Join my mix collaboration' })}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                </div>
              </div>
            )}

            {/* QR Code Method */}
            {inviteMethod === 'qr' && (
              <div className="space-y-4">
                <div className="text-center">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="mx-auto rounded-lg border border-gray-600"
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    Scan this QR code to join the collaboration
                  </p>
                </div>
                
                <button
                  onClick={() => copyToClipboard(shareableLink)}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </button>
              </div>
            )}

            {/* Invitation Settings */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-sm text-gray-300 hover:text-white transition-colors mb-4"
              >
                <span>Advanced Settings</span>
                <Settings className="h-4 w-4" />
              </button>

              {showAdvanced && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Permission Level
                      </label>
                      <select
                        value={inviteOptions.permission}
                        onChange={(e) => setInviteOptions({ ...inviteOptions, permission: e.target.value as any })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Expires In
                      </label>
                      <select
                        value={inviteOptions.expirationDays}
                        onChange={(e) => setInviteOptions({ ...inviteOptions, expirationDays: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      >
                        <option value={1}>1 Day</option>
                        <option value={3}>3 Days</option>
                        <option value={7}>1 Week</option>
                        <option value={30}>1 Month</option>
                        <option value={0}>Never</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Allow forwarding</span>
                      <button
                        onClick={() => setInviteOptions({ ...inviteOptions, allowForwarding: !inviteOptions.allowForwarding })}
                        className={`w-10 h-6 rounded-full transition-colors ${
                          inviteOptions.allowForwarding ? 'bg-purple-600' : 'bg-gray-600'
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                          inviteOptions.allowForwarding ? 'translate-x-5' : 'translate-x-1'
                        } mt-1`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Require approval</span>
                      <button
                        onClick={() => setInviteOptions({ ...inviteOptions, requireApproval: !inviteOptions.requireApproval })}
                        className={`w-10 h-6 rounded-full transition-colors ${
                          inviteOptions.requireApproval ? 'bg-purple-600' : 'bg-gray-600'
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                          inviteOptions.requireApproval ? 'translate-x-5' : 'translate-x-1'
                        } mt-1`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Send Button */}
            {inviteMethod === 'email' && (
              <button
                onClick={handleEmailInvite}
                disabled={isInviting || !emailList.trim()}
                className="w-full mt-6 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
              >
                {isInviting ? (
                  <Clock className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                {isInviting ? 'Sending...' : 'Send Invitations'}
              </button>
            )}
          </div>

          {/* Existing Invitations */}
          <div className="w-1/2 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Pending Invitations</h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="p-4 bg-gray-900/50 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                        <Mail className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{invitation.email}</div>
                        <div className="text-sm text-gray-400">
                          Invited by {invitation.invitedBy}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getPermissionIcon(invitation.permission)}
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(invitation.status)}`}>
                        {invitation.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-400 mb-3">
                    <div>Sent: {new Date(invitation.invitedAt).toLocaleDateString()}</div>
                    <div>Expires: {new Date(invitation.expiresAt).toLocaleDateString()}</div>
                  </div>
                  
                  {invitation.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResendInvitation(invitation.id)}
                        className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        Resend
                      </button>
                      <button
                        onClick={() => handleRevokeInvitation(invitation.id)}
                        className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      >
                        Revoke
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {invitations.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No invitations sent yet</p>
                  <p className="text-sm">Start collaborating by inviting others!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvitationSystem