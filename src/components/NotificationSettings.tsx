import React, { useState, useEffect } from 'react'
import { Bell, Mail, MessageSquare, Smartphone, Check, X } from 'lucide-react'
import { notificationService, NotificationPreferences } from '../lib/notificationService'
import { useAuth } from '../contexts/AuthContext'

export const NotificationSettings: React.FC = () => {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    sms: false,
    push: true,
    mixComplete: true,
    collaborationInvite: true,
    trackProcessed: false,
    systemUpdates: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    loadPreferences()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPreferences = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // This would normally fetch from the notification service
      // For now, we'll use the default preferences
      const defaultPrefs = {
        email: true,
        sms: false,
        push: true,
        mixComplete: true,
        collaborationInvite: true,
        trackProcessed: false,
        systemUpdates: true
      }
      setPreferences(defaultPrefs)
    } catch (error) {
      console.error('Error loading preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChannelToggle = (channel: 'email' | 'sms' | 'push') => {
    setPreferences(prev => ({
      ...prev,
      [channel]: !prev[channel]
    }))
  }

  const handleTypeToggle = (type: 'mixComplete' | 'collaborationInvite' | 'trackProcessed' | 'systemUpdates') => {
    setPreferences(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    setSaveStatus('idle')

    try {
      const success = await notificationService.updateUserPreferences(user.id, preferences)
      setSaveStatus(success ? 'success' : 'error')
      
      if (success) {
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const requestPushPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setPreferences(prev => ({ ...prev, push: true }))
      }
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-6 h-6 text-purple-500" />
        <h2 className="text-xl font-bold">Notification Settings</h2>
      </div>

      {/* Notification Channels */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Notification Channels</h3>
        <div className="space-y-4">
          {/* Email */}
          <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-400" />
              <div>
                <div className="font-medium">Email Notifications</div>
                <div className="text-sm text-gray-400">Receive notifications via email</div>
              </div>
            </div>
            <button
              onClick={() => handleChannelToggle('email')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.email ? 'bg-purple-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.email ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* SMS */}
          <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-green-400" />
              <div>
                <div className="font-medium">SMS Notifications</div>
                <div className="text-sm text-gray-400">Receive notifications via text message</div>
              </div>
            </div>
            <button
              onClick={() => handleChannelToggle('sms')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.sms ? 'bg-purple-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.sms ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Push */}
          <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-orange-400" />
              <div>
                <div className="font-medium">Push Notifications</div>
                <div className="text-sm text-gray-400">Receive browser push notifications</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!('Notification' in window) && (
                <span className="text-xs text-red-400">Not supported</span>
              )}
              {('Notification' in window) && Notification.permission === 'denied' && (
                <span className="text-xs text-red-400">Blocked</span>
              )}
              {('Notification' in window) && Notification.permission === 'default' && (
                <button
                  onClick={requestPushPermission}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Enable
                </button>
              )}
              <button
                onClick={() => handleChannelToggle('push')}
                disabled={!('Notification' in window) || Notification.permission === 'denied'}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.push && ('Notification' in window) && Notification.permission === 'granted'
                    ? 'bg-purple-600' 
                    : 'bg-gray-600'
                } ${
                  !('Notification' in window) || Notification.permission === 'denied' 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.push && ('Notification' in window) && Notification.permission === 'granted'
                      ? 'translate-x-6' 
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Types */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Notification Types</h3>
        <div className="space-y-3">
          {/* Mix Complete */}
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium">Mix Complete</div>
              <div className="text-sm text-gray-400">When your mix processing is finished</div>
            </div>
            <button
              onClick={() => handleTypeToggle('mixComplete')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.mixComplete ? 'bg-purple-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.mixComplete ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Collaboration Invite */}
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium">Collaboration Invites</div>
              <div className="text-sm text-gray-400">When someone invites you to collaborate</div>
            </div>
            <button
              onClick={() => handleTypeToggle('collaborationInvite')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.collaborationInvite ? 'bg-purple-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.collaborationInvite ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Track Processed */}
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium">Track Analysis</div>
              <div className="text-sm text-gray-400">When track analysis is complete</div>
            </div>
            <button
              onClick={() => handleTypeToggle('trackProcessed')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.trackProcessed ? 'bg-purple-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.trackProcessed ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* System Updates */}
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium">System Updates</div>
              <div className="text-sm text-gray-400">Important updates and announcements</div>
            </div>
            <button
              onClick={() => handleTypeToggle('systemUpdates')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.systemUpdates ? 'bg-purple-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.systemUpdates ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <>
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">Settings saved successfully</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <X className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">Error saving settings</span>
            </>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            saving
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Test Notification */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <button
          onClick={() => {
            if (user) {
              notificationService.sendNotification({
                userId: user.id,
                type: 'system_update',
                title: '🧪 Test Notification',
                message: 'This is a test notification to verify your settings are working correctly.',
                channels: ['push']
              })
            }
          }}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Send test notification
        </button>
      </div>
    </div>
  )
}