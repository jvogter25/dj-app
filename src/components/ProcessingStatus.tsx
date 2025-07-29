import React, { useState, useEffect } from 'react'
import { processedTracksService, ProcessingBatch, ProcessingQueueItem } from '../lib/processedTracksService'
import { Loader, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react'

export const ProcessingStatus: React.FC = () => {
  const [batches, setBatches] = useState<ProcessingBatch[]>([])
  const [queue, setQueue] = useState<ProcessingQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  
  const fetchStatus = async () => {
    try {
      const [batchesData, queueData] = await Promise.all([
        processedTracksService.getUserBatches(),
        processedTracksService.getUserQueue()
      ])
      
      setBatches(batchesData)
      setQueue(queueData)
    } catch (error) {
      console.error('Error fetching status:', error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchStatus()
    
    // Auto refresh every 10 seconds
    if (autoRefresh) {
      const interval = setInterval(fetchStatus, 10000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'processing':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500'
      case 'failed':
        return 'text-red-500'
      case 'processing':
        return 'text-blue-500'
      default:
        return 'text-gray-400'
    }
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }
  
  const calculateProgress = (batch: ProcessingBatch) => {
    if (batch.total_tracks === 0) return 0
    return Math.round((batch.processed_tracks / batch.total_tracks) * 100)
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Processing Status</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-400">Auto-refresh</span>
          </label>
          <button
            onClick={fetchStatus}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {batches.length === 0 && queue.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No processing jobs found</p>
          <p className="text-sm mt-2">Start by selecting playlists to process</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Batches */}
          {batches.filter(b => b.status !== 'completed').length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-gray-300">Active Batches</h3>
              <div className="space-y-3">
                {batches.filter(b => b.status !== 'completed').map(batch => (
                  <div key={batch.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(batch.status)}
                          <span className={`font-medium ${getStatusColor(batch.status)}`}>
                            {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          {batch.playlist_ids.length} playlists • {batch.total_tracks} tracks
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-400">
                        <p>Started: {batch.started_at ? formatDate(batch.started_at) : 'Queued'}</p>
                      </div>
                    </div>
                    
                    {batch.status === 'processing' && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-gray-300">
                            {batch.processed_tracks} / {batch.total_tracks} tracks
                          </span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${calculateProgress(batch)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Recent Queue Items */}
          {queue.filter(q => q.status !== 'completed').slice(0, 5).length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-gray-300">Processing Queue</h3>
              <div className="space-y-2">
                {queue.filter(q => q.status !== 'completed').slice(0, 5).map(item => (
                  <div key={item.id} className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(item.status)}
                      <div>
                        <p className="text-sm font-medium">Track ID: {item.spotify_track_id.slice(0, 8)}...</p>
                        {item.error_message && (
                          <p className="text-xs text-red-400 mt-1">{item.error_message}</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Completed Batches */}
          {batches.filter(b => b.status === 'completed').length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-gray-300">Completed</h3>
              <div className="space-y-2">
                {batches.filter(b => b.status === 'completed').slice(0, 3).map(batch => (
                  <div key={batch.id} className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(batch.status)}
                      <div>
                        <p className="text-sm">
                          {batch.total_tracks} tracks processed
                        </p>
                        <p className="text-xs text-gray-400">
                          Completed: {batch.completed_at ? formatDate(batch.completed_at) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}