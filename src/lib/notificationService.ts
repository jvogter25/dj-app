interface NotificationPreferences {
  email: boolean
  sms: boolean
  push: boolean
  mixComplete: boolean
  collaborationInvite: boolean
  trackProcessed: boolean
  systemUpdates: boolean
}

interface NotificationPayload {
  userId: string
  type: 'mix_complete' | 'collaboration_invite' | 'track_processed' | 'system_update'
  title: string
  message: string
  data?: Record<string, any>
  channels: ('email' | 'sms' | 'push')[]
}

interface EmailNotification {
  to: string
  subject: string
  html: string
  text?: string
}

interface SMSNotification {
  to: string
  message: string
}

class NotificationService {
  private readonly supabaseUrl = process.env.REACT_APP_SUPABASE_URL
  private readonly supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY
  private readonly twilioSid = process.env.REACT_APP_TWILIO_SID
  private readonly twilioToken = process.env.REACT_APP_TWILIO_TOKEN
  private readonly twilioPhone = process.env.REACT_APP_TWILIO_PHONE
  private readonly sendgridKey = process.env.REACT_APP_SENDGRID_KEY

  // Send notification through multiple channels
  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    console.log('Sending notification:', payload)
    
    try {
      // Get user preferences first
      const preferences = await this.getUserPreferences(payload.userId)
      
      // Filter channels based on user preferences
      const enabledChannels = this.filterChannelsByPreferences(payload.channels, payload.type, preferences)
      
      const results = await Promise.allSettled([
        ...enabledChannels.map(channel => {
          switch (channel) {
            case 'email':
              return this.sendEmailNotification(payload)
            case 'sms':
              return this.sendSMSNotification(payload)
            case 'push':
              return this.sendPushNotification(payload)
            default:
              return Promise.resolve(false)
          }
        })
      ])

      // Return true if at least one notification was sent successfully
      return results.some(result => result.status === 'fulfilled' && result.value === true)
    } catch (error) {
      console.error('Notification service error:', error)
      return false
    }
  }

  // Get user notification preferences
  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/user_preferences?user_id=eq.${userId}`, {
        headers: {
          'apikey': this.supabaseKey!,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user preferences')
      }

      const data = await response.json()
      return data[0]?.notification_preferences || this.getDefaultPreferences()
    } catch (error) {
      console.error('Error fetching user preferences:', error)
      return this.getDefaultPreferences()
    }
  }

  // Filter channels based on user preferences
  private filterChannelsByPreferences(
    channels: ('email' | 'sms' | 'push')[],
    type: NotificationPayload['type'],
    preferences: NotificationPreferences
  ): ('email' | 'sms' | 'push')[] {
    return channels.filter(channel => {
      // Check if channel is enabled
      if (!preferences[channel]) return false

      // Check if notification type is enabled
      switch (type) {
        case 'mix_complete':
          return preferences.mixComplete
        case 'collaboration_invite':
          return preferences.collaborationInvite
        case 'track_processed':
          return preferences.trackProcessed
        case 'system_update':
          return preferences.systemUpdates
        default:
          return true
      }
    })
  }

  // Send email notification using SendGrid
  private async sendEmailNotification(payload: NotificationPayload): Promise<boolean> {
    if (!this.sendgridKey) {
      console.warn('SendGrid API key not configured')
      return false
    }

    try {
      const userEmail = await this.getUserEmail(payload.userId)
      if (!userEmail) return false

      const emailData: EmailNotification = {
        to: userEmail,
        subject: payload.title,
        html: this.generateEmailHTML(payload),
        text: payload.message
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sendgridKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: emailData.to }],
            subject: emailData.subject
          }],
          from: { email: 'noreply@djstudio.app', name: 'DJ Studio' },
          content: [
            { type: 'text/plain', value: emailData.text },
            { type: 'text/html', value: emailData.html }
          ]
        })
      })

      return response.ok
    } catch (error) {
      console.error('Email notification error:', error)
      return false
    }
  }

  // Send SMS notification using Twilio
  private async sendSMSNotification(payload: NotificationPayload): Promise<boolean> {
    if (!this.twilioSid || !this.twilioToken || !this.twilioPhone) {
      console.warn('Twilio credentials not configured')
      return false
    }

    try {
      const userPhone = await this.getUserPhone(payload.userId)
      if (!userPhone) return false

      const smsData: SMSNotification = {
        to: userPhone,
        message: `${payload.title}\n\n${payload.message}`
      }

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${this.twilioSid}:${this.twilioToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: this.twilioPhone,
          To: smsData.to,
          Body: smsData.message
        })
      })

      return response.ok
    } catch (error) {
      console.error('SMS notification error:', error)
      return false
    }
  }

  // Send push notification (Web Push API)
  private async sendPushNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        console.warn('Push notifications not supported')
        return false
      }

      // Request permission if not granted
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return false
      }

      if (Notification.permission === 'granted') {
        new Notification(payload.title, {
          body: payload.message,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          data: payload.data
        })
        return true
      }

      return false
    } catch (error) {
      console.error('Push notification error:', error)
      return false
    }
  }

  // Get user email from database
  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
        headers: {
          'apikey': this.supabaseKey!,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) return null

      const data = await response.json()
      return data[0]?.email || null
    } catch (error) {
      console.error('Error fetching user email:', error)
      return null
    }
  }

  // Get user phone from database
  private async getUserPhone(userId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
        headers: {
          'apikey': this.supabaseKey!,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) return null

      const data = await response.json()
      return data[0]?.phone || null
    } catch (error) {
      console.error('Error fetching user phone:', error)
      return null
    }
  }

  // Generate HTML email template
  private generateEmailHTML(payload: NotificationPayload): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${payload.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎵 DJ Studio</h1>
          </div>
          <div class="content">
            <h2>${payload.title}</h2>
            <p>${payload.message}</p>
            ${payload.data?.actionUrl ? `
              <p style="text-align: center; margin-top: 30px;">
                <a href="${payload.data.actionUrl}" class="button">View in DJ Studio</a>
              </p>
            ` : ''}
          </div>
          <div class="footer">
            <p>You're receiving this because you have notifications enabled in your DJ Studio account.</p>
            <p><a href="https://djstudio.app/settings">Manage your notification preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Get default preferences
  private getDefaultPreferences(): NotificationPreferences {
    return {
      email: true,
      sms: false,
      push: true,
      mixComplete: true,
      collaborationInvite: true,
      trackProcessed: false,
      systemUpdates: true
    }
  }

  // Update user notification preferences
  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/user_preferences`, {
        method: 'UPSERT',
        headers: {
          'apikey': this.supabaseKey!,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          user_id: userId,
          notification_preferences: preferences,
          updated_at: new Date().toISOString()
        })
      })

      return response.ok
    } catch (error) {
      console.error('Error updating user preferences:', error)
      return false
    }
  }

  // Quick notification helpers
  async notifyMixComplete(userId: string, mixName: string, mixUrl?: string): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: 'mix_complete',
      title: '🎵 Your mix is ready!',
      message: `Your mix "${mixName}" has been processed and is ready to listen to.`,
      data: { mixName, actionUrl: mixUrl },
      channels: ['email', 'push']
    })
  }

  async notifyCollaborationInvite(userId: string, inviterName: string, projectName: string, inviteUrl?: string): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: 'collaboration_invite',
      title: '🤝 Collaboration invite',
      message: `${inviterName} has invited you to collaborate on "${projectName}".`,
      data: { inviterName, projectName, actionUrl: inviteUrl },
      channels: ['email', 'sms', 'push']
    })
  }

  async notifyTrackProcessed(userId: string, trackName: string, trackUrl?: string): Promise<boolean> {
    return this.sendNotification({
      userId,
      type: 'track_processed',
      title: '🎶 Track analysis complete',
      message: `"${trackName}" has been analyzed and is ready for mixing.`,
      data: { trackName, actionUrl: trackUrl },
      channels: ['push']
    })
  }
}

export const notificationService = new NotificationService()
export type { NotificationPreferences, NotificationPayload }