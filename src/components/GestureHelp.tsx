import React, { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

export const GestureHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-colors z-50"
        title="Gesture Controls Help"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Gesture Controls</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-700 rounded text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4 text-gray-300">
          <div className="border-b border-gray-600 pb-3">
            <h3 className="text-lg font-semibold text-purple-400 mb-2">Faders & Sliders</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong className="text-blue-400">Two-finger swipe:</strong> Control volume faders and crossfader
              </div>
              <div>
                <strong className="text-blue-400">Trackpad scroll:</strong> Fine adjustment of sliders
              </div>
              <div>
                <strong className="text-blue-400">Pinch gesture:</strong> Precise control with zoom-like motion
              </div>
            </div>
          </div>
          
          <div className="border-b border-gray-600 pb-3">
            <h3 className="text-lg font-semibold text-green-400 mb-2">Jog Wheels</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong className="text-green-400">Circular drag:</strong> Scratch and nudge tracks
              </div>
              <div>
                <strong className="text-green-400">Click & drag:</strong> Seek to specific position
              </div>
            </div>
          </div>
          
          <div className="border-b border-gray-600 pb-3">
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">Tempo Controls</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong className="text-yellow-400">Two-finger swipe:</strong> Adjust tempo/pitch
              </div>
              <div>
                <strong className="text-yellow-400">Horizontal scroll:</strong> Fine tempo adjustment
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-2">Tips</h3>
            <div className="space-y-2 text-sm">
              <div>• Use lighter touches for fine control</div>
              <div>• Horizontal gestures work best for sliders</div>
              <div>• Vertical gestures control volume faders</div>
              <div>• Hold and drag on jog wheels for scratching</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}