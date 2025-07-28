export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tracks: {
        Row: {
          id: string
          user_id: string
          spotify_id: string
          name: string
          artist: string
          album: string
          duration_ms: number
          bpm: number | null
          key: string | null
          energy: number | null
          preview_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          spotify_id: string
          name: string
          artist: string
          album: string
          duration_ms: number
          bpm?: number | null
          key?: string | null
          energy?: number | null
          preview_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          spotify_id?: string
          name?: string
          artist?: string
          album?: string
          duration_ms?: number
          bpm?: number | null
          key?: string | null
          energy?: number | null
          preview_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cue_points: {
        Row: {
          id: string
          track_id: string
          user_id: string
          position_ms: number
          color: string
          label: string | null
          created_at: string
        }
        Insert: {
          id?: string
          track_id: string
          user_id: string
          position_ms: number
          color: string
          label?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          track_id?: string
          user_id?: string
          position_ms?: number
          color?: string
          label?: string | null
          created_at?: string
        }
      }
      mixes: {
        Row: {
          id: string
          user_id: string
          name: string
          duration_ms: number
          recording_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          duration_ms: number
          recording_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          duration_ms?: number
          recording_url?: string | null
          created_at?: string
        }
      }
      mix_tracks: {
        Row: {
          id: string
          mix_id: string
          track_id: string
          position: number
          start_time_ms: number
          end_time_ms: number
          created_at: string
        }
        Insert: {
          id?: string
          mix_id: string
          track_id: string
          position: number
          start_time_ms: number
          end_time_ms: number
          created_at?: string
        }
        Update: {
          id?: string
          mix_id?: string
          track_id?: string
          position?: number
          start_time_ms?: number
          end_time_ms?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}