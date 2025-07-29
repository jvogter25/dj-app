import React from 'react'

export const DebugInfo: React.FC = () => {
  const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID
  const redirectUri = `${window.location.origin}/auth/callback`
  
  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 p-4 rounded-lg text-xs text-gray-300 max-w-md">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <p>Client ID: {clientId ? `${clientId.substring(0, 8)}...` : 'NOT SET'}</p>
      <p>Redirect URI: {redirectUri}</p>
      <p>Origin: {window.location.origin}</p>
    </div>
  )
}