// Production Profile Settings Component
// Comprehensive settings management for user profiles and privacy

import React, { useState, useEffect } from 'react'
import {
  Settings, Save, X, Eye, EyeOff, Bell, Lock,
  Globe, Shield, Trash2, AlertTriangle, Check,
  Mail, Phone, Key, CreditCard, Download,
  Upload, RefreshCw, Moon, Sun, Volume2,
  Headphones, Zap, Database, Wifi
} from 'lucide-react'
import { useSupabase } from '../hooks/useSupabase'

interface NotificationSettings {
  email: {
    newFollower: boolean
    mixLiked: boolean
    commentReceived: boolean
    collaborationInvite: boolean
    systemUpdates: boolean
    weeklyDigest: boolean
  }
  push: {
    newFollower: boolean
    mixLiked: boolean
    commentReceived: boolean
    liveEvents: boolean
  }
  sms: {
    securityAlerts: boolean
    importantUpdates: boolean
  }
}

interface AppearanceSettings {
  theme: 'dark' | 'light' | 'auto'
  accentColor: 'purple' | 'blue' | 'green' | 'red' | 'orange'
  compactMode: boolean
  animations: boolean
  highContrast: boolean
}

interface AudioSettings {
  defaultVolume: number
  crossfadeCurve: 'linear' | 'exponential' | 'logarithmic'
  autoGain: boolean
  realtimeAnalysis: boolean
  stemSeparation: boolean
  qualityPreset: 'battery' | 'balanced' | 'performance'
}

interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private'
  showRealName: boolean
  showLocation: boolean
  showLastActive: boolean
  showStats: boolean
  showEquipment: boolean
  allowFollowers: boolean
  allowCollaborations: boolean
  allowMentions: boolean
  dataSharing: boolean
}

interface ProfileSettingsProps {
  onClose?: () => void
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onClose }) => {
  const { supabase, user } = useSupabase()
  const [activeTab, setActiveTab] = useState<'general' | 'privacy' | 'notifications' | 'appearance' | 'audio' | 'account'>('general')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Settings state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: {
      newFollower: true,
      mixLiked: true,
      commentReceived: true,
      collaborationInvite: true,
      systemUpdates: false,
      weeklyDigest: true
    },
    push: {
      newFollower: true,
      mixLiked: false,
      commentReceived: true,
      liveEvents: true
    },
    sms: {
      securityAlerts: true,
      importantUpdates: false
    }
  })

  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: 'dark',
    accentColor: 'purple',
    compactMode: false,
    animations: true,
    highContrast: false
  })

  const [audio, setAudio] = useState<AudioSettings>({
    defaultVolume: 0.7,
    crossfadeCurve: 'exponential',
    autoGain: true,
    realtimeAnalysis: true,
    stemSeparation: true,
    qualityPreset: 'balanced'
  })

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'public',
    showRealName: true,
    showLocation: true,
    showLastActive: true,
    showStats: true,
    showEquipment: true,
    allowFollowers: true,
    allowCollaborations: true,
    allowMentions: true,
    dataSharing: false
  })

  // Load settings
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferences, privacy_settings')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (data) {
        // Load settings from database
        const prefs = data.preferences || {}
        const privacySettings = data.privacy_settings || {}

        setNotifications(prefs.notifications || notifications)
        setAppearance(prefs.appearance || appearance)
        setAudio(prefs.audio || audio)
        setPrivacy(privacySettings)
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      setError('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!user?.id) return

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          preferences: {
            notifications,
            appearance,
            audio
          },
          privacy_settings: privacy
        })
        .eq('id', user.id)

      if (error) throw error

      setSuccessMessage('Settings saved successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const exportData = async () => {
    if (!user?.id) return

    try {
      // Get all user data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: mixes } = await supabase
        .from('mixes')
        .select('*')
        .eq('user_id', user.id)

      const exportData = {
        profile,
        mixes,
        settings: {
          notifications,
          appearance,
          audio,
          privacy
        },
        exportDate: new Date().toISOString()
      }

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dj-profile-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccessMessage('Data exported successfully!')
    } catch (err) {
      console.error('Error exporting data:', err)
      setError('Failed to export data')
    }
  }

  const deleteAccount = async () => {
    if (!user?.id || !confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    try {
      // Delete user data (would be implemented with proper cascade delete)
      const { error } = await supabase.auth.admin.deleteUser(user.id)
      if (error) throw error

      // Sign out
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error deleting account:', err)
      setError('Failed to delete account')
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Moon },
    { id: 'audio', label: 'Audio', icon: Headphones },
    { id: 'account', label: 'Account', icon: Shield }
  ] as const

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Settings</h2>
            <div className="flex items-center gap-3">
              {successMessage && (
                <div className="text-green-400 text-sm flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {successMessage}
                </div>
              )}
              {error && (
                <div className="text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
              )}
              <button
                onClick={saveSettings}
                disabled={isSaving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">General Preferences</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Language
                    </label>
                    <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Timezone
                    </label>
                    <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                      <option value="auto">Auto-detect</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">GMT</option>
                      <option value="Europe/Berlin">CET</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Settings */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Privacy & Visibility</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Profile Visibility
                    </label>
                    <select
                      value={privacy.profileVisibility}
                      onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value as any })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="public">Public - Anyone can see</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Private - Only you</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries({
                      showRealName: 'Show real name',
                      showLocation: 'Show location',
                      showLastActive: 'Show last active time',
                      showStats: 'Show DJ statistics',
                      showEquipment: 'Show equipment list',
                      allowFollowers: 'Allow followers',
                      allowCollaborations: 'Allow collaboration invites',
                      allowMentions: 'Allow mentions',
                      dataSharing: 'Share data for recommendations'
                    }).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-300">{label}</span>
                        <button
                          onClick={() => setPrivacy({ ...privacy, [key]: !privacy[key as keyof PrivacySettings] })}
                          className={`p-2 rounded-lg transition-colors ${
                            privacy[key as keyof PrivacySettings] ? 'bg-green-600' : 'bg-gray-600'
                          }`}
                        >
                          {privacy[key as keyof PrivacySettings] ? (
                            <Eye className="h-4 w-4 text-white" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-white" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Email Notifications</h3>
                <div className="space-y-3">
                  {Object.entries({
                    newFollower: 'New followers',
                    mixLiked: 'Mix likes and reactions',
                    commentReceived: 'Comments on your mixes',
                    collaborationInvite: 'Collaboration invites',
                    systemUpdates: 'System updates and maintenance',
                    weeklyDigest: 'Weekly activity digest'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                      <span className="text-gray-300">{label}</span>
                      <button
                        onClick={() => setNotifications({
                          ...notifications,
                          email: { ...notifications.email, [key]: !notifications.email[key as keyof typeof notifications.email] }
                        })}
                        className={`p-2 rounded-lg transition-colors ${
                          notifications.email[key as keyof typeof notifications.email] ? 'bg-green-600' : 'bg-gray-600'
                        }`}
                      >
                        {notifications.email[key as keyof typeof notifications.email] ? (
                          <Bell className="h-4 w-4 text-white" />
                        ) : (
                          <X className="h-4 w-4 text-white" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-4">Push Notifications</h3>
                <div className="space-y-3">
                  {Object.entries({
                    newFollower: 'New followers',
                    mixLiked: 'Mix likes',
                    commentReceived: 'New comments',
                    liveEvents: 'Live events and streams'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                      <span className="text-gray-300">{label}</span>
                      <button
                        onClick={() => setNotifications({
                          ...notifications,
                          push: { ...notifications.push, [key]: !notifications.push[key as keyof typeof notifications.push] }
                        })}
                        className={`p-2 rounded-lg transition-colors ${
                          notifications.push[key as keyof typeof notifications.push] ? 'bg-green-600' : 'bg-gray-600'
                        }`}
                      >
                        {notifications.push[key as keyof typeof notifications.push] ? (
                          <Bell className="h-4 w-4 text-white" />
                        ) : (
                          <X className="h-4 w-4 text-white" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Theme & Appearance</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Theme
                    </label>
                    <select
                      value={appearance.theme}
                      onChange={(e) => setAppearance({ ...appearance, theme: e.target.value as any })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Accent Color
                    </label>
                    <div className="flex gap-2">
                      {(['purple', 'blue', 'green', 'red', 'orange'] as const).map(color => (
                        <button
                          key={color}
                          onClick={() => setAppearance({ ...appearance, accentColor: color })}
                          className={`w-8 h-8 rounded-full ${
                            color === 'purple' ? 'bg-purple-500' :
                            color === 'blue' ? 'bg-blue-500' :
                            color === 'green' ? 'bg-green-500' :
                            color === 'red' ? 'bg-red-500' :
                            'bg-orange-500'
                          } ${appearance.accentColor === color ? 'ring-2 ring-white' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {Object.entries({
                    compactMode: 'Compact mode',
                    animations: 'Enable animations',
                    highContrast: 'High contrast mode'
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                      <span className="text-gray-300">{label}</span>
                      <button
                        onClick={() => setAppearance({ ...appearance, [key]: !appearance[key as keyof AppearanceSettings] })}
                        className={`p-2 rounded-lg transition-colors ${
                          appearance[key as keyof AppearanceSettings] ? 'bg-green-600' : 'bg-gray-600'
                        }`}
                      >
                        {appearance[key as keyof AppearanceSettings] ? (
                          <Check className="h-4 w-4 text-white" />
                        ) : (
                          <X className="h-4 w-4 text-white" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Audio Settings */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Audio Configuration</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Default Volume: {Math.round(audio.defaultVolume * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audio.defaultVolume}
                      onChange={(e) => setAudio({ ...audio, defaultVolume: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Crossfade Curve
                    </label>
                    <select
                      value={audio.crossfadeCurve}
                      onChange={(e) => setAudio({ ...audio, crossfadeCurve: e.target.value as any })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="linear">Linear</option>
                      <option value="exponential">Exponential</option>
                      <option value="logarithmic">Logarithmic</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Quality Preset
                    </label>
                    <select
                      value={audio.qualityPreset}
                      onChange={(e) => setAudio({ ...audio, qualityPreset: e.target.value as any })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="battery">Battery Saver</option>
                      <option value="balanced">Balanced</option>
                      <option value="performance">High Performance</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    {Object.entries({
                      autoGain: 'Automatic gain control',
                      realtimeAnalysis: 'Real-time audio analysis',
                      stemSeparation: 'Stem separation processing'
                    }).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-300">{label}</span>
                        <button
                          onClick={() => setAudio({ ...audio, [key]: !audio[key as keyof AudioSettings] })}
                          className={`p-2 rounded-lg transition-colors ${
                            audio[key as keyof AudioSettings] ? 'bg-green-600' : 'bg-gray-600'
                          }`}
                        >
                          {audio[key as keyof AudioSettings] ? (
                            <Volume2 className="h-4 w-4 text-white" />
                          ) : (
                            <X className="h-4 w-4 text-white" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account Settings */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Account Management</h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-900/50 rounded-lg">
                    <h4 className="font-medium text-white mb-2">Export Your Data</h4>
                    <p className="text-gray-400 text-sm mb-3">
                      Download all your profile data, mixes, and settings as a JSON file.
                    </p>
                    <button
                      onClick={exportData}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export Data
                    </button>
                  </div>

                  <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
                    <h4 className="font-medium text-red-300 mb-2">Danger Zone</h4>
                    <p className="text-gray-400 text-sm mb-3">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <button
                      onClick={deleteAccount}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfileSettings