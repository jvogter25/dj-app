import { useState, useCallback } from 'react'
import { notificationService } from '../lib/notificationService'
import { useAuth } from '../contexts/AuthContext'

export const useNotifications = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const sendNotification = useCallback(async (
    type: 'mix_complete' | 'collaboration_invite' | 'track_processed' | 'system_update',
    title: string,
    message: string,
    data?: Record<string, any>,
    channels: ('email' | 'sms' | 'push')[] = ['push']
  ) => {
    if (!user) return false

    setLoading(true)
    try {
      const result = await notificationService.sendNotification({
        userId: user.id,
        type,
        title,
        message,
        data,
        channels
      })
      return result
    } catch (error) {
      console.error('Error sending notification:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  // Helper methods for common notifications
  const notifyMixComplete = useCallback(async (mixName: string, mixUrl?: string) => {
    if (!user) return false
    return notificationService.notifyMixComplete(user.id, mixName, mixUrl)
  }, [user])

  const notifyCollaborationInvite = useCallback(async (inviterName: string, projectName: string, inviteUrl?: string) => {
    if (!user) return false
    return notificationService.notifyCollaborationInvite(user.id, inviterName, projectName, inviteUrl)
  }, [user])

  const notifyTrackProcessed = useCallback(async (trackName: string, trackUrl?: string) => {
    if (!user) return false
    return notificationService.notifyTrackProcessed(user.id, trackName, trackUrl)
  }, [user])

  // Request push notification permission
  const requestPushPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return { success: false, error: 'Push notifications not supported' }
    }

    if (Notification.permission === 'granted') {
      return { success: true, error: null }
    }

    if (Notification.permission === 'denied') {
      return { success: false, error: 'Push notifications are blocked. Please enable them in your browser settings.' }
    }

    try {
      const permission = await Notification.requestPermission()
      return { 
        success: permission === 'granted', 
        error: permission === 'denied' ? 'Permission denied' : null 
      }
    } catch (error) {
      return { success: false, error: 'Error requesting permission' }
    }
  }, [])

  // Show browser notification immediately (for testing)
  const showTestNotification = useCallback(() => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return false
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted')
      return false
    }

    new Notification('🎵 DJ Studio Test', {
      body: 'Your notification settings are working correctly!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'test-notification'
    })
    return true
  }, [])

  return {
    loading,
    sendNotification,
    notifyMixComplete,
    notifyCollaborationInvite,
    notifyTrackProcessed,
    requestPushPermission,
    showTestNotification,
    isSupported: 'Notification' in window,
    permission: 'Notification' in window ? Notification.permission : 'unsupported'
  }
}