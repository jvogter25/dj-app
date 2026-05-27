/**
 * LibraryBrowser.tsx
 *
 * Displays the user's downloaded track library, organized by Spotify playlist.
 * Tracks can be loaded to Deck A or B with a click.
 *
 * Replaces the old TrackBrowser (live Spotify search) and SoundCloudBrowser (broken).
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, Search, Music, AlertCircle, Loader2,
  Play, Link2, ChevronDown, ChevronRight, Clock, Zap
} from 'lucide-react'
import {
  LibraryTrack, LibraryPlaylist,
  getUserPlaylists, getPlaylistTracks, getAllReadyTracks,
  getTrackAudioUrl, triggerSpotifySync, submitUrlForDownload,
  getQueueStats, QueueStats
} from '../lib/libraryService'
import { useAuth } from '../contexts/AuthContext'

interface LibraryBrowserProps {
  onTrackLoad: (track: LibraryTrack & { audioUrl: string }, deck: 'A' | 'B') => void
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function camelotColor(camelot: string | null): string {
  if (!camelot) return 'bg-gray-600'
  const letter = camelot.slice(-1)
  return letter === 'A' ? 'bg-blue-600' : 'bg-amber-600'
}

// ─── Track Row ────────────────────────────────────────────────────────────────

interface TrackRowProps {
  track: LibraryTrack
  onLoad: (deck: 'A' | 'B') => void
  isLoading: boolean
}

const TrackRow: React.FC<TrackRowProps> = ({ track, onLoad, isLoading }) => (
  <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-700 group transition-colors">
    {/* Art */}
    <div className="flex-shrink-0 w-10 h-10 bg-gray-700 rounded overflow-hidden">
      {track.album_art_url ? (
        <img src={track.album_art_url} alt={track.album} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Music className="w-4 h-4 text-gray-500" />
        </div>
      )}
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-white truncate">{track.title}</p>
      <p className="text-xs text-gray-400 truncate">{track.artist}</p>
    </div>

    {/* BPM */}
    {track.bpm && (
      <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
        {track.bpm} BPM
      </span>
    )}

    {/* Key */}
    {track.key_camelot && (
      <span className={`text-xs text-white px-1.5 py-0.5 rounded flex-shrink-0 hidden sm:block ${camelotColor(track.key_camelot)}`}>
        {track.key_camelot}
      </span>
    )}

    {/* Duration */}
    <span className="text-xs text-gray-500 flex-shrink-0 hidden md:block">
      {formatDuration(track.duration_ms)}
    </span>

    {/* Load buttons — shown on hover */}
    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
      {isLoading ? (
        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
      ) : (
        <>
          <button
            onClick={() => onLoad('A')}
            className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
            title="Load to Deck A"
          >
            A
          </button>
          <button
            onClick={() => onLoad('B')}
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            title="Load to Deck B"
          >
            B
          </button>
        </>
      )}
    </div>
  </div>
)

// ─── Pending Track Row ────────────────────────────────────────────────────────

const PendingTrackRow: React.FC<{ track: LibraryTrack }> = ({ track }) => (
  <div className="flex items-center gap-3 px-4 py-2 opacity-50">
    <div className="flex-shrink-0 w-10 h-10 bg-gray-700 rounded flex items-center justify-center">
      {track.sync_status === 'downloading' ? (
        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
      ) : track.sync_status === 'error' ? (
        <AlertCircle className="w-4 h-4 text-red-400" />
      ) : (
        <Clock className="w-4 h-4 text-gray-500" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-300 truncate">{track.title}</p>
      <p className="text-xs text-gray-500 truncate">
        {track.sync_status === 'error'
          ? `Error: ${track.error_message || 'Download failed'}`
          : track.sync_status === 'downloading'
          ? 'Downloading...'
          : 'Queued for download'}
      </p>
    </div>
  </div>
)

// ─── Playlist Section ─────────────────────────────────────────────────────────

interface PlaylistSectionProps {
  playlist: LibraryPlaylist
  onTrackLoad: (track: LibraryTrack & { audioUrl: string }, deck: 'A' | 'B') => void
}

const PlaylistSection: React.FC<PlaylistSectionProps> = ({ playlist, onTrackLoad }) => {
  const [expanded, setExpanded] = useState(false)
  const [tracks, setTracks] = useState<LibraryTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null)

  const loadTracks = useCallback(async () => {
    if (tracks.length > 0) return
    setLoading(true)
    try {
      const t = await getPlaylistTracks(playlist.id)
      setTracks(t)
    } catch (err) {
      console.error('Failed to load playlist tracks:', err)
    } finally {
      setLoading(false)
    }
  }, [playlist.id, tracks.length])

  const handleExpand = () => {
    setExpanded(prev => !prev)
    if (!expanded) loadTracks()
  }

  const handleLoad = async (track: LibraryTrack, deck: 'A' | 'B') => {
    if (!track.storage_path) return
    setLoadingTrackId(track.id)
    try {
      const audioUrl = await getTrackAudioUrl(track.storage_path)
      onTrackLoad({ ...track, audioUrl }, deck)
    } catch (err) {
      console.error('Failed to get audio URL:', err)
    } finally {
      setLoadingTrackId(null)
    }
  }

  const readyTracks = tracks.filter(t => t.sync_status === 'ready')
  const pendingTracks = tracks.filter(t => t.sync_status !== 'ready')

  return (
    <div className="border-b border-gray-700 last:border-0">
      <button
        onClick={handleExpand}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
        {playlist.cover_url && (
          <img
            src={playlist.cover_url}
            alt={playlist.name}
            className="w-8 h-8 rounded object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{playlist.name}</p>
          <p className="text-xs text-gray-400">
            {playlist.track_count} tracks
            {playlist.last_synced_at && (
              <> · Last synced {new Date(playlist.last_synced_at).toLocaleDateString()}</>
            )}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="bg-gray-850 border-t border-gray-700">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            </div>
          ) : tracks.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4">
              No tracks downloaded yet. Sync your library to get started.
            </p>
          ) : (
            <>
              {readyTracks.map(track => (
                <TrackRow
                  key={track.id}
                  track={track}
                  onLoad={(deck) => handleLoad(track, deck)}
                  isLoading={loadingTrackId === track.id}
                />
              ))}
              {pendingTracks.map(track => (
                <PendingTrackRow key={track.id} track={track} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── URL Import Panel ─────────────────────────────────────────────────────────

interface UrlImportProps {
  userId: string
  onImportStarted: () => void
}

const UrlImportPanel: React.FC<UrlImportProps> = ({ userId, onImportStarted }) => {
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setSubmitting(true)
    setMessage(null)

    try {
      await submitUrlForDownload({ userId, url: url.trim() })
      setUrl('')
      setMessage({ type: 'success', text: 'Download queued! Track will appear in your library shortly.' })
      onImportStarted()
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Import failed'
      setMessage({ type: 'error', text })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-4 py-3 border-b border-gray-700">
      <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
        <Link2 className="w-3 h-3" />
        Import from URL (SoundCloud, YouTube, etc.)
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Paste SoundCloud or YouTube URL..."
          className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={submitting || !url.trim()}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded transition-colors flex items-center gap-1"
        >
          {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
        </button>
      </form>
      {message && (
        <p className={`text-xs mt-1.5 ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}

// ─── Main LibraryBrowser ──────────────────────────────────────────────────────

export const LibraryBrowser: React.FC<LibraryBrowserProps> = ({ onTrackLoad }) => {
  const { user } = useAuth()
  const [tab, setTab] = useState<'playlists' | 'all' | 'search'>('playlists')
  const [playlists, setPlaylists] = useState<LibraryPlaylist[]>([])
  const [allTracks, setAllTracks] = useState<LibraryTrack[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<LibraryTrack[]>([])
  const [loadingPlaylist, setLoadingPlaylist] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null)
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null)

  const loadPlaylists = useCallback(async () => {
    setLoadingPlaylist(true)
    try {
      const p = await getUserPlaylists()
      setPlaylists(p)
    } catch (err) {
      console.error('Failed to load playlists:', err)
    } finally {
      setLoadingPlaylist(false)
    }
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const stats = await getQueueStats()
      setQueueStats(stats)
    } catch {
      // Non-fatal
    }
  }, [])

  useEffect(() => {
    loadPlaylists()
    loadStats()
    // Poll stats every 10s to catch download progress
    const interval = setInterval(loadStats, 10000)
    return () => clearInterval(interval)
  }, [loadPlaylists, loadStats])

  // Load all ready tracks when switching to "All Tracks" tab
  useEffect(() => {
    if (tab === 'all' && allTracks.length === 0) {
      getAllReadyTracks().then(setAllTracks).catch(console.error)
    }
  }, [tab, allTracks.length])

  // Search tracks
  useEffect(() => {
    if (tab !== 'search') return
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        getAllReadyTracks(searchQuery).then(setSearchResults).catch(console.error)
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, tab])

  const handleSync = async () => {
    if (!user?.id) return
    setSyncing(true)
    setSyncMessage('Syncing your Spotify library...')
    try {
      await triggerSpotifySync(user.id)
      setSyncMessage('Sync started! New tracks will download in the background.')
      setTimeout(() => {
        loadPlaylists()
        loadStats()
      }, 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed'
      setSyncMessage(`Error: ${msg}`)
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMessage(null), 8000)
    }
  }

  const handleDirectTrackLoad = async (track: LibraryTrack, deck: 'A' | 'B') => {
    if (!track.storage_path) return
    setLoadingTrackId(track.id)
    try {
      const audioUrl = await getTrackAudioUrl(track.storage_path)
      onTrackLoad({ ...track, audioUrl }, deck)
    } catch (err) {
      console.error('Failed to get audio URL:', err)
    } finally {
      setLoadingTrackId(null)
    }
  }

  const tracksForTab = tab === 'all' ? allTracks : tab === 'search' ? searchResults : []

  return (
    <div className="flex flex-col h-full">
      {/* Header: sync button + stats */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          {queueStats && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {queueStats.ready} ready
              </span>
              {queueStats.pending > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {queueStats.pending} pending
                </span>
              )}
              {queueStats.downloading > 0 && (
                <span className="flex items-center gap-1 text-purple-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {queueStats.downloading} downloading
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
          title="Sync Spotify library"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
          <span>Sync Library</span>
        </button>
      </div>

      {/* Sync status message */}
      {syncMessage && (
        <div className="px-4 py-2 bg-gray-700 border-b border-gray-600 flex-shrink-0">
          <p className="text-xs text-gray-300 flex items-center gap-2">
            <Zap className="w-3 h-3 text-purple-400" />
            {syncMessage}
          </p>
        </div>
      )}

      {/* URL Import */}
      {user?.id && (
        <UrlImportPanel
          userId={user.id}
          onImportStarted={() => {
            loadStats()
            setTimeout(loadStats, 5000)
          }}
        />
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-700 flex-shrink-0">
        {(['playlists', 'all', 'search'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === t
                ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-800'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'playlists' ? 'Playlists' : t === 'all' ? 'All Tracks' : 'Search'}
          </button>
        ))}
      </div>

      {/* Search input */}
      {tab === 'search' && (
        <div className="px-4 py-2 border-b border-gray-700 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search title or artist..."
              autoFocus
              className="w-full pl-9 pr-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'playlists' && (
          loadingPlaylist ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Music className="w-10 h-10 text-gray-600 mb-3" />
              <p className="text-gray-400 text-sm mb-1">No library synced yet</p>
              <p className="text-gray-500 text-xs">
                Click "Sync Library" to import your Spotify playlists
              </p>
            </div>
          ) : (
            playlists.map(playlist => (
              <PlaylistSection
                key={playlist.id}
                playlist={playlist}
                onTrackLoad={onTrackLoad}
              />
            ))
          )
        )}

        {(tab === 'all' || tab === 'search') && (
          tracksForTab.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Music className="w-10 h-10 text-gray-600 mb-3" />
              <p className="text-gray-400 text-sm">
                {tab === 'search' && searchQuery.length < 2
                  ? 'Type at least 2 characters to search'
                  : tab === 'search'
                  ? 'No tracks found'
                  : 'No downloaded tracks yet'}
              </p>
            </div>
          ) : (
            tracksForTab.map(track => (
              <TrackRow
                key={track.id}
                track={track}
                onLoad={(deck) => handleDirectTrackLoad(track, deck)}
                isLoading={loadingTrackId === track.id}
              />
            ))
          )
        )}
      </div>
    </div>
  )
}
