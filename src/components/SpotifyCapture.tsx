import React, { useState, useEffect, useRef } from 'react'
import { Chrome, AlertCircle, Loader, CheckCircle, Radio } from 'lucide-react'
import { extensionBridge } from '../lib/extensionBridge'

interface SpotifyCaptureProps {
  onStreamReady: (stream: MediaStream, tabId: number) => void
}

export const SpotifyCapture: React.FC<SpotifyCaptureProps> = ({ onStreamReady }) => {
  const [isExtensionInstalled, setIsExtensionInstalled] = useState<boolean | null>(null)
  const [spotifyTabs, setSpotifyTabs] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<number | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Check if extension is installed
  useEffect(() => {
    checkExtension()
  }, [])
  
  const checkExtension = async () => {
    const installed = await extensionBridge.isExtensionInstalled()
    setIsExtensionInstalled(installed)
    
    if (installed) {
      // Set up audio stream callback
      extensionBridge.onAudioStream((stream, tabId) => {
        console.log('Audio stream received for tab:', tabId)
        setIsCapturing(true)
        setActiveTab(tabId)
        onStreamReady(stream, tabId)
      })
      
      // Get Spotify tabs
      const tabs = await extensionBridge.getSpotifyTabs()
      setSpotifyTabs(tabs)
    }
  }
  
  const handleInstallExtension = () => {
    // Open extension installation page
    window.open('/dj-studio-extension.zip', '_blank')
  }
  
  const handleRefresh = () => {
    checkExtension()
  }
  
  // Not installed
  if (isExtensionInstalled === false) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <Chrome className="w-12 h-12 text-purple-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Install DJ Studio Extension</h3>
        <p className="text-sm text-gray-400 mb-4">
          To capture and process Spotify audio, you need to install our Chrome extension.
        </p>
        
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-left text-sm">
              <p className="font-semibold text-yellow-400 mb-1">Personal Use Only</p>
              <p className="text-yellow-200/80">
                This tool captures audio for personal mixing and analysis only. 
                Do not distribute or share any recorded content from streaming services.
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleInstallExtension}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors inline-flex items-center gap-2"
        >
          <Chrome className="w-5 h-5" />
          Download Extension
        </button>
        
        <div className="mt-4 text-xs text-gray-500">
          After installing, click the extension icon and refresh this page
        </div>
      </div>
    )
  }
  
  // Checking...
  if (isExtensionInstalled === null) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <Loader className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-400">Checking for DJ Studio extension...</p>
      </div>
    )
  }
  
  // Extension installed
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-600 rounded-lg">
          <Chrome className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold">Spotify Audio Capture</h3>
          <p className="text-sm text-gray-400">Extension connected</p>
        </div>
        <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
      </div>
      
      {isCapturing && activeTab ? (
        <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-green-500 animate-pulse" />
            <div className="flex-1">
              <p className="font-semibold text-green-400">Capturing Audio</p>
              <p className="text-sm text-green-300/80">
                Processing Spotify audio stream from tab {activeTab}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            <p className="text-sm text-gray-400 mb-2">Available Spotify tabs:</p>
            {spotifyTabs.length > 0 ? (
              spotifyTabs.map(tab => (
                <div
                  key={tab.id}
                  className={`p-3 bg-gray-700 rounded-lg flex items-center justify-between ${
                    tab.isCapturing ? 'ring-2 ring-purple-500' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{tab.title}</p>
                    <p className="text-xs text-gray-400">Tab ID: {tab.id}</p>
                  </div>
                  {tab.isCapturing && (
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <Radio className="w-4 h-4 animate-pulse" />
                      Capturing
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No Spotify tabs found</p>
                <p className="text-sm mt-2">Open Spotify Web Player in a new tab</p>
              </div>
            )}
          </div>
          
          <button
            onClick={handleRefresh}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
          >
            Refresh Tabs
          </button>
        </>
      )}
      
      <div className="mt-4 p-3 bg-yellow-900/20 rounded-lg">
        <p className="text-xs text-yellow-400 text-center">
          ⚠️ Audio capture active - For personal use only
        </p>
      </div>
    </div>
  )
}