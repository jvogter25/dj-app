import React, { useState } from 'react'
import { X, Check, AlertCircle, Music, Radio, Headphones } from 'lucide-react'

interface SetupWizardProps {
  onClose: () => void
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0)
  
  const steps = [
    {
      title: "Welcome to DJ Studio!",
      icon: <Music className="w-12 h-12 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            DJ Studio connects to your Spotify account to let you mix and DJ your music library.
          </p>
          <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-3">
            <p className="text-yellow-400 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Spotify Premium is required for full playback functionality.</span>
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Prepare Spotify",
      icon: <Headphones className="w-12 h-12 text-green-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 font-semibold">Before loading tracks:</p>
          <ol className="space-y-3 ml-4">
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">1.</span>
              <div>
                <p className="text-gray-300">Pause Spotify on all other devices</p>
                <p className="text-gray-500 text-sm">Phone, computer, smart speakers, etc.</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">2.</span>
              <div>
                <p className="text-gray-300">Wait for deck status to show "Ready"</p>
                <p className="text-gray-500 text-sm">Check the settings panel for status</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">3.</span>
              <div>
                <p className="text-gray-300">Load a track to either deck</p>
                <p className="text-gray-500 text-sm">The player will activate automatically</p>
              </div>
            </li>
          </ol>
        </div>
      )
    },
    {
      title: "DJ Controls",
      icon: <Radio className="w-12 h-12 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">Key features:</p>
          <ul className="space-y-2 ml-4 text-gray-300">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span>Dual deck mixing with crossfader</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span>3-band EQ per deck (visual only for now)</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span>BPM detection and filtering</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span>Gesture controls for faders</span>
            </li>
            <li className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <span>Tempo control (coming soon)</span>
            </li>
            <li className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <span>Effects processing (coming soon)</span>
            </li>
          </ul>
        </div>
      )
    }
  ]
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Getting Started</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="flex justify-center mb-6">
            {steps[currentStep].icon}
          </div>
          
          <h3 className="text-lg font-semibold mb-4 text-center">
            {steps[currentStep].title}
          </h3>
          
          {steps[currentStep].content}
          
          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentStep === 0 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              disabled={currentStep === 0}
            >
              Previous
            </button>
            
            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep ? 'bg-purple-500' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Get Started!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}