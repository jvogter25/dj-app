// Production Search Modal Component
// Full-screen search experience with keyboard navigation

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react'
import { AdvancedSearch } from './AdvancedSearch'
import { SearchResult } from '../../lib/searchService'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onResultSelect?: (result: SearchResult) => void
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onResultSelect
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose()
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-4xl animate-fade-in-up">
        <AdvancedSearch
          onClose={onClose}
          onResultClick={(result) => {
            onResultSelect?.(result)
            onClose()
          }}
          className="shadow-2xl"
        />
        
        {/* Keyboard shortcuts hint */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300">↑</kbd>
            <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300">↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300">Enter</kbd>
            <span>Select</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300">Esc</kbd>
            <span>Close</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Search trigger button component
interface SearchTriggerProps {
  onClick: () => void
  className?: string
}

export const SearchTrigger: React.FC<SearchTriggerProps> = ({ onClick, className = '' }) => {
  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onClick()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClick])

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors group ${className}`}
    >
      <Search className="h-5 w-5 text-gray-400 group-hover:text-white" />
      <span className="text-gray-300 group-hover:text-white">Search</span>
      <div className="ml-auto flex items-center gap-1 text-xs text-gray-500">
        <kbd className="px-1.5 py-0.5 bg-gray-600 rounded">⌘</kbd>
        <kbd className="px-1.5 py-0.5 bg-gray-600 rounded">K</kbd>
      </div>
    </button>
  )
}

export default SearchModal