// Production User Profile Component
// Comprehensive profile management with avatar upload and DJ statistics

import React, { useState, useEffect, useCallback } from 'react'
import { 
  User, Camera, Upload, Edit3, Save, X, Star,
  MapPin, Calendar, Globe, Instagram, Twitter,
  Facebook, Youtube, Headphones, Mic, Award,
  TrendingUp, Users, Music, Clock, Target,
  Settings, Eye, EyeOff, ChevronDown, ChevronUp
} from 'lucide-react'
import { useSupabase } from '../hooks/useSupabase'

interface UserProfileData {
  id: string
  avatar_url?: string
  display_name?: string
  bio?: string
  location?: string
  website_url?: string
  social_links: {
    instagram?: string
    twitter?: string
    facebook?: string
    youtube?: string
    soundcloud?: string
    spotify?: string
  }
  dj_stats: {
    yearsExperience?: number
    totalMixes?: number
    totalHours?: number
    avgRating?: number
    specialties?: string[]
    achievements?: string[]
  }
  preferences: {
    preferredGenres?: string[]
    equipmentSetup?: string[]
    playingStyle?: string
    bookingAvailable?: boolean
    travelRadius?: number
  }
  privacy_settings: {
    profileVisibility: 'public' | 'friends' | 'private'
    showRealName: boolean
    showLocation: boolean
    showStats: boolean
    showEquipment: boolean
  }
  subscription_tier: 'free' | 'pro' | 'premium'
  verified: boolean
  last_active_at: string
  created_at: string
}

interface UserProfileProps {
  userId?: string
  isOwnProfile?: boolean
  onProfileUpdate?: (profile: UserProfileData) => void
}

export const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  isOwnProfile = false,
  onProfileUpdate
}) => {
  const { supabase, user } = useSupabase()
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']))

  // Form state for editing
  const [editForm, setEditForm] = useState<Partial<UserProfileData>>({})

  // Load profile data
  const loadProfile = useCallback(async () => {
    const targetUserId = userId || user?.id
    if (!targetUserId) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single()

      if (error) throw error

      if (data) {
        const profileData: UserProfileData = {
          ...data,
          social_links: data.social_links || {},
          dj_stats: data.dj_stats || {},
          preferences: data.preferences || {},
          privacy_settings: data.privacy_settings || {
            profileVisibility: 'public',
            showRealName: true,
            showLocation: true,
            showStats: true,
            showEquipment: true
          }
        }
        setProfile(profileData)
        setEditForm(profileData)
      }
    } catch (err) {
      console.error('Error loading profile:', err)
      setError('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }, [userId, user?.id, supabase])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user?.id) return

    setUploadingAvatar(true)
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}_${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath)

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Update local state
      if (profile) {
        const updatedProfile = { ...profile, avatar_url: publicUrl }
        setProfile(updatedProfile)
        setEditForm(updatedProfile)
        onProfileUpdate?.(updatedProfile)
      }
    } catch (err) {
      console.error('Error uploading avatar:', err)
      setError('Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Save profile changes
  const saveProfile = async () => {
    if (!user?.id || !editForm) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: editForm.display_name,
          bio: editForm.bio,
          location: editForm.location,
          website_url: editForm.website_url,
          social_links: editForm.social_links || {},
          dj_stats: editForm.dj_stats || {},
          preferences: editForm.preferences || {},
          privacy_settings: editForm.privacy_settings || {}
        })
        .eq('id', user.id)

      if (error) throw error

      setProfile(editForm as UserProfileData)
      setIsEditing(false)
      onProfileUpdate?.(editForm as UserProfileData)
    } catch (err) {
      console.error('Error saving profile:', err)
      setError('Failed to save profile')
    }
  }

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-400 mb-4">{error || 'Profile not found'}</div>
        <button
          onClick={loadProfile}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-gray-400" />
              )}
            </div>
            
            {isOwnProfile && (
              <label className="absolute -bottom-2 -right-2 p-2 bg-purple-600 hover:bg-purple-700 rounded-full cursor-pointer transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
                {uploadingAvatar ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <Camera className="h-4 w-4 text-white" />
                )}
              </label>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">
                {profile.display_name || 'DJ Profile'}
              </h1>
              {profile.verified && (
                <div className="p-1 bg-blue-500 rounded-full">
                  <Star className="h-4 w-4 text-white" />
                </div>
              )}
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                profile.subscription_tier === 'premium' ? 'bg-gold-500/20 text-gold-300' :
                profile.subscription_tier === 'pro' ? 'bg-purple-500/20 text-purple-300' :
                'bg-gray-500/20 text-gray-300'
              }`}>
                {profile.subscription_tier.toUpperCase()}
              </span>
            </div>

            {profile.bio && (
              <p className="text-gray-300 mb-3 max-w-2xl">{profile.bio}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-400">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Active {new Date(profile.last_active_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Social Links */}
            {Object.keys(profile.social_links).length > 0 && (
              <div className="flex items-center gap-3 mt-4">
                {profile.social_links.instagram && (
                  <a
                    href={`https://instagram.com/${profile.social_links.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <Instagram className="h-5 w-5 text-pink-400" />
                  </a>
                )}
                {profile.social_links.twitter && (
                  <a
                    href={`https://twitter.com/${profile.social_links.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <Twitter className="h-5 w-5 text-blue-400" />
                  </a>
                )}
                {profile.social_links.soundcloud && (
                  <a
                    href={profile.social_links.soundcloud}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <Music className="h-5 w-5 text-orange-400" />
                  </a>
                )}
                {profile.website_url && (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <Globe className="h-5 w-5 text-green-400" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Edit Button */}
          {isOwnProfile && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      {/* DJ Statistics */}
      {profile.privacy_settings.showStats && (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700">
          <button
            onClick={() => toggleSection('stats')}
            className="w-full p-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">DJ Statistics</h2>
            </div>
            {expandedSections.has('stats') ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {expandedSections.has('stats') && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">
                    {profile.dj_stats.yearsExperience || 0}
                  </div>
                  <div className="text-sm text-gray-400">Years Experience</div>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">
                    {profile.dj_stats.totalMixes || 0}
                  </div>
                  <div className="text-sm text-gray-400">Total Mixes</div>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">
                    {profile.dj_stats.totalHours || 0}h
                  </div>
                  <div className="text-sm text-gray-400">Hours Played</div>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">
                    {profile.dj_stats.avgRating || 0}/5
                  </div>
                  <div className="text-sm text-gray-400">Avg Rating</div>
                </div>
              </div>

              {profile.dj_stats.specialties && profile.dj_stats.specialties.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.dj_stats.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Preferences */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700">
        <button
          onClick={() => toggleSection('preferences')}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <Headphones className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Music Preferences</h2>
          </div>
          {expandedSections.has('preferences') ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {expandedSections.has('preferences') && (
          <div className="px-4 pb-4 space-y-4">
            {profile.preferences.preferredGenres && profile.preferences.preferredGenres.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Preferred Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.preferences.preferredGenres.map((genre, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.preferences.playingStyle && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Playing Style</h3>
                <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                  {profile.preferences.playingStyle}
                </span>
              </div>
            )}

            {profile.preferences.bookingAvailable && (
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-400" />
                <span className="text-green-300">Available for bookings</span>
                {profile.preferences.travelRadius && (
                  <span className="text-gray-400">
                    • {profile.preferences.travelRadius}km radius
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Form Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Edit Profile</h2>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={editForm.display_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        placeholder="Your DJ name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={editForm.bio || ''}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        placeholder="Tell us about yourself..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Location
                        </label>
                        <input
                          type="text"
                          value={editForm.location || ''}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                          placeholder="City, Country"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Website
                        </label>
                        <input
                          type="url"
                          value={editForm.website_url || ''}
                          onChange={(e) => setEditForm({ ...editForm, website_url: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Privacy Settings */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Privacy Settings</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Show statistics</span>
                      <button
                        onClick={() => setEditForm({
                          ...editForm,
                          privacy_settings: {
                            ...editForm.privacy_settings!,
                            showStats: !editForm.privacy_settings?.showStats
                          }
                        })}
                        className={`p-2 rounded-lg transition-colors ${
                          editForm.privacy_settings?.showStats ? 'bg-green-600' : 'bg-gray-600'
                        }`}
                      >
                        {editForm.privacy_settings?.showStats ? (
                          <Eye className="h-4 w-4 text-white" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveProfile}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserProfile