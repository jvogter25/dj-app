-- ============================================================
-- DJ App: Track Audio Library Schema
-- ============================================================
-- Tables:
--   library_tracks    — one row per downloaded track per user
--   library_playlists — mirrors user's Spotify playlists
--   playlist_tracks   — junction: which tracks are in each playlist
--
-- Storage:
--   track-audio bucket — MP3 files stored as {user_id}/{track_id}.mp3

-- ─── Storage bucket ────────────────────────────────────────────────────────────

-- Create the storage bucket for track audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'track-audio',
  'track-audio',
  false,          -- private bucket, access via signed URLs
  52428800,       -- 50MB max per file
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- ─── library_playlists ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS library_playlists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spotify_id      TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  cover_url       TEXT,
  track_count     INTEGER DEFAULT 0,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id, spotify_id)
);

CREATE INDEX IF NOT EXISTS idx_library_playlists_user_id ON library_playlists(user_id);

-- ─── library_tracks ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS library_tracks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Source identifiers
  spotify_id      TEXT,                              -- null for non-Spotify tracks
  source          TEXT NOT NULL DEFAULT 'spotify'    -- 'spotify' | 'soundcloud' | 'manual'
                  CHECK (source IN ('spotify', 'soundcloud', 'manual')),

  -- Track metadata
  title           TEXT NOT NULL,
  artist          TEXT NOT NULL,
  album           TEXT NOT NULL DEFAULT '',
  album_art_url   TEXT,
  duration_ms     INTEGER DEFAULT 0,

  -- Music theory (from Spotify audio features API)
  bpm             INTEGER,                           -- rounded tempo
  key_number      INTEGER CHECK (key_number BETWEEN 0 AND 11),  -- Spotify key 0-11
  key_camelot     TEXT,                              -- e.g. "8A", "5B"
  energy          REAL CHECK (energy BETWEEN 0 AND 1),
  danceability    REAL CHECK (danceability BETWEEN 0 AND 1),

  -- Storage
  storage_path    TEXT,                              -- path in track-audio bucket
  storage_url     TEXT,                              -- cached signed URL (regenerate on access)

  -- Sync state
  sync_status     TEXT NOT NULL DEFAULT 'pending'
                  CHECK (sync_status IN ('pending', 'downloading', 'ready', 'error')),
  error_message   TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  -- A user can have the same Spotify track once
  UNIQUE (user_id, spotify_id)
);

CREATE INDEX IF NOT EXISTS idx_library_tracks_user_id        ON library_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_library_tracks_sync_status    ON library_tracks(user_id, sync_status);
CREATE INDEX IF NOT EXISTS idx_library_tracks_spotify_id     ON library_tracks(user_id, spotify_id);
CREATE INDEX IF NOT EXISTS idx_library_tracks_artist_title   ON library_tracks(user_id, artist, title);

-- ─── playlist_tracks ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id     UUID NOT NULL REFERENCES library_playlists(id) ON DELETE CASCADE,
  track_id        UUID NOT NULL REFERENCES library_tracks(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL DEFAULT 0,
  added_at        TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (playlist_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track    ON playlist_tracks(track_id);

-- ─── Row-Level Security ─────────────────────────────────────────────────────────

ALTER TABLE library_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_tracks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks   ENABLE ROW LEVEL SECURITY;

-- library_playlists: users own their playlists
CREATE POLICY "Users manage own playlists"
  ON library_playlists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- library_tracks: users own their tracks
CREATE POLICY "Users manage own tracks"
  ON library_tracks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- playlist_tracks: accessible if the user owns the playlist
CREATE POLICY "Users manage tracks in own playlists"
  ON playlist_tracks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM library_playlists p
      WHERE p.id = playlist_tracks.playlist_id
        AND p.user_id = auth.uid()
    )
  );

-- Storage RLS: users can only access their own audio files
CREATE POLICY "Users access own audio files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'track-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'track-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── updated_at trigger ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER library_playlists_updated_at
  BEFORE UPDATE ON library_playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER library_tracks_updated_at
  BEFORE UPDATE ON library_tracks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
