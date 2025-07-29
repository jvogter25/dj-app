import React, { useState, useEffect } from 'react'
import { FolderOpen, Plus, Trash2, Clock, Music } from 'lucide-react'
import { MixProject } from '../../types/mixStudio'
import { mixProjectDB } from '../../lib/mixProjectDatabase'

interface MixProjectManagerProps {
  onProjectOpen: (project: MixProject) => void
  onNewProject: () => void
  onClose: () => void
}

export const MixProjectManager: React.FC<MixProjectManagerProps> = ({
  onProjectOpen,
  onNewProject,
  onClose
}) => {
  const [projects, setProjects] = useState<MixProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const allProjects = await mixProjectDB.getAllProjects()
      setProjects(allProjects.sort((a, b) => b.updatedAt - a.updatedAt))
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await mixProjectDB.deleteProject(projectId)
        await loadProjects()
      } catch (error) {
        console.error('Error deleting project:', error)
      }
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Mix Projects</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New Project Button */}
        <button
          onClick={onNewProject}
          className="w-full p-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center justify-center gap-3 mb-6"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Create New Mix Project</span>
        </button>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No projects yet</p>
              <p className="text-sm text-gray-500">Create your first mix project to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 cursor-pointer transition-colors group"
                  onClick={() => onProjectOpen(project)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{project.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(project.duration)}
                        </span>
                        <span>{project.tracks.length} tracks</span>
                        <span>{project.tracks.reduce((acc, track) => acc + track.clips.length, 0)} clips</span>
                        <span>BPM: {project.bpm}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Last edited: {formatDate(project.updatedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onProjectOpen(project)
                        }}
                        className="p-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                        title="Open Project"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteProject(project.id)
                        }}
                        className="p-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}