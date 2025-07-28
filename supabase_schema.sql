-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tracks table
CREATE TABLE tracks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  spotify_id TEXT NOT NULL,
  name TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  bpm REAL,
  key TEXT,
  energy REAL,
  preview_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, spotify_id)
);

-- Create cue_points table
CREATE TABLE cue_points (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  position_ms INTEGER NOT NULL,
  color TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mixes table
CREATE TABLE mixes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  recording_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mix_tracks table
CREATE TABLE mix_tracks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mix_id UUID REFERENCES mixes(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  start_time_ms INTEGER NOT NULL,
  end_time_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_tracks_user_id ON tracks(user_id);
CREATE INDEX idx_tracks_spotify_id ON tracks(spotify_id);
CREATE INDEX idx_cue_points_track_id ON cue_points(track_id);
CREATE INDEX idx_mix_tracks_mix_id ON mix_tracks(mix_id);

-- Enable Row Level Security (RLS)
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cue_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE mixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mix_tracks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tracks" ON tracks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracks" ON tracks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracks" ON tracks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracks" ON tracks
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own cue points" ON cue_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own cue points" ON cue_points
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own mixes" ON mixes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own mixes" ON mixes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view mix tracks for their mixes" ON mix_tracks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mixes
      WHERE mixes.id = mix_tracks.mix_id
      AND mixes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage mix tracks for their mixes" ON mix_tracks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM mixes
      WHERE mixes.id = mix_tracks.mix_id
      AND mixes.user_id = auth.uid()
    )
  );