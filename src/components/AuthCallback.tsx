import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { spotifyAuthPKCE } from '../lib/spotifyPKCE'

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // PKCE uses query params, not hash
        const queryString = window.location.search
        if (!queryString) {
          throw new Error('No authentication data received')
        }

        await spotifyAuthPKCE.handleCallback(queryString)
        navigate('/')
      } catch (err) {
        console.error('Authentication error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
        setError(errorMessage)
      }
    }

    handleCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Error</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                sessionStorage.clear()
                navigate('/')
              }}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Authenticating...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
      </div>
    </div>
  )
}