import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { soundCloudService } from '../lib/soundcloudService'
import { Loader } from 'lucide-react'

export const SoundCloudCallback: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')
      
      if (error) {
        setError('Authorization denied')
        setLoading(false)
        return
      }
      
      if (!code) {
        setError('No authorization code received')
        setLoading(false)
        return
      }
      
      try {
        // Exchange code for access token
        await soundCloudService.exchangeToken(code)
        
        // Redirect to main app
        navigate('/')
      } catch (err) {
        console.error('SoundCloud auth error:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
        setLoading(false)
      }
    }
    
    handleCallback()
  }, [searchParams, navigate])
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-white">Connecting to SoundCloud...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-4">Authentication Failed</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Return to App
          </button>
        </div>
      </div>
    )
  }
  
  return null
}