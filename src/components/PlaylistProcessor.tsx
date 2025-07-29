import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { processedTracksService } from '../lib/processedTracksService'
import { Loader, CheckCircle, AlertCircle, Music, Clock, Mail, Phone } from 'lucide-react'

// Chrome extension API types
declare global {
  interface Window {
    chrome?: any
  }
}

interface Playlist {
  id: string
  name: string
  images: Array<{ url: string }>
  tracks: { total: number }
  selected: boolean
}

export const PlaylistProcessor: React.FC = () => {
  const { spotifyToken } = useAuth()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [estimatedTime, setEstimatedTime] = useState(0)
  
  useEffect(() => {
    if (spotifyToken) {
      fetchPlaylists()
    }
  }, [spotifyToken])
  
  const fetchPlaylists = async () => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
        headers: {
          'Authorization': `Bearer ${spotifyToken}`
        }
      })
      
      const data = await response.json()
      setPlaylists(data.items.map((p: any) => ({ ...p, selected: false })))
    } catch (error) {
      console.error('Error fetching playlists:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const togglePlaylist = (id: string) => {
    setPlaylists(prev => prev.map(p => 
      p.id === id ? { ...p, selected: !p.selected } : p
    ))
  }
  
  const calculateEstimatedTime = () => {
    const selectedPlaylists = playlists.filter(p => p.selected)
    const totalTracks = selectedPlaylists.reduce((sum, p) => sum + p.tracks.total, 0)
    const avgTimePerTrack = 3.5 // minutes
    const totalMinutes = totalTracks * avgTimePerTrack
    return totalMinutes
  }
  
  useEffect(() => {
    setEstimatedTime(calculateEstimatedTime())
  }, [playlists])
  
  const startProcessing = async () => {
    const selectedPlaylists = playlists.filter(p => p.selected)
    if (selectedPlaylists.length === 0) return
    
    setProcessing(true)
    
    try {
      // Create batch in database
      const batch = await processedTracksService.createBatch(
        selectedPlaylists.map(p => p.id),
        selectedPlaylists.reduce((sum, p) => sum + p.tracks.total, 0),
        email || undefined,
        phone || undefined
      )
      
      if (batch) {
        // Start extension batch processing if available
        if (typeof window.chrome !== 'undefined' && window.chrome.runtime?.sendMessage) {
          window.chrome.runtime.sendMessage('YOUR_EXTENSION_ID', {
            type: 'START_BATCH_PROCESSING',
            playlistIds: selectedPlaylists.map(p => p.id),
            batchId: batch.id
          }, (response: any) => {
            if (response?.success) {
              alert(`Processing started! ${email || phone ? 'You will be notified when complete.' : 'Check the processing status for updates.'}`)
            } else {
              alert('Failed to start extension processing: ' + (response?.error || 'Unknown error'))
            }
          })
        } else {
          // Fallback message when extension not available
          alert(`Processing queued! ${email || phone ? 'You will be notified when complete.' : 'Install the DJ Studio Chrome Extension for automatic processing.'}`)
        }
        
        // Also add tracks to database queue for fallback
        for (const playlist of selectedPlaylists) {
          // Fetch all tracks from playlist
          let offset = 0
          const limit = 100
          
          while (offset < playlist.tracks.total) {
            const response = await fetch(
              `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?offset=${offset}&limit=${limit}`,
              {
                headers: {
                  'Authorization': `Bearer ${spotifyToken}`
                }
              }
            )
            
            const data = await response.json()
            
            // Add each track to queue
            for (const item of data.items) {
              if (item.track && item.track.id) {
                await processedTracksService.addToQueue(item.track.id, playlist.id)
              }
            }
            
            offset += limit
          }
        }
      }
    } catch (error) {
      console.error('Error starting processing:', error)
      alert('Failed to start processing. Please try again.')
    } finally {
      setProcessing(false)
    }
  }
  
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Process Your Playlists</h2>
      
      <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-400 mb-1">How it works</p>
            <p className="text-sm text-yellow-200/80">
              We'll process your selected playlists in the background, extracting audio features,
              separating stems, and generating waveforms. This enables full DJ features like
              tempo control, effects, and stem mixing.
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
        {playlists.map(playlist => (
          <div
            key={playlist.id}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              playlist.selected 
                ? 'bg-purple-900/20 border-purple-600' 
                : 'bg-gray-700 border-gray-600 hover:border-gray-500'
            }`}
            onClick={() => togglePlaylist(playlist.id)}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                {playlist.images[0] ? (
                  <img src={playlist.images[0].url} alt={playlist.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{playlist.name}</h3>
                <p className="text-sm text-gray-400">{playlist.tracks.total} tracks</p>
              </div>
              
              <div className="flex-shrink-0">
                {playlist.selected && <CheckCircle className="w-6 h-6 text-purple-500" />}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {playlists.filter(p => p.selected).length > 0 && (
        <>
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-semibold">Estimated Processing Time</p>
                <p className="text-sm text-gray-400">
                  {formatTime(estimatedTime)} for {playlists.filter(p => p.selected).reduce((sum, p) => sum + p.tracks.total, 0)} tracks
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300 mb-1">
                  <Mail className="w-4 h-4" />
                  Email notification (optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 bg-gray-800 rounded-lg text-white placeholder-gray-500"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300 mb-1">
                  <Phone className="w-4 h-4" />
                  SMS notification (optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 bg-gray-800 rounded-lg text-white placeholder-gray-500"
                />
              </div>
            </div>
          </div>
          
          <button
            onClick={startProcessing}
            disabled={processing}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Starting Processing...
              </>
            ) : (
              <>
                Start Processing {playlists.filter(p => p.selected).length} Playlists
              </>
            )}
          </button>
        </>
      )}
    </div>
  )
}