-- Processed tracks for shared audio database
CREATE TABLE processed_tracks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  spotify_id text UNIQUE NOT NULL,
  title text NOT NULL,
  artist text NOT NULL,
  album text,
  duration_ms integer NOT NULL,
  processed_at timestamp with time zone DEFAULT now(),
  processing_version text DEFAULT '1.0',
  audio_features jsonb,
  metadata jsonb,
  is_public boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  updated_at timestamp with time zone DEFAULT now()
);

-- Track analysis data
CREATE TABLE track_analysis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id uuid REFERENCES processed_tracks(id) ON DELETE CASCADE,
  bpm numeric(5,2) NOT NULL,
  key text NOT NULL,
  camelot_key text NOT NULL,
  energy numeric(3,2),
  danceability numeric(3,2),
  valence numeric(3,2),
  loudness numeric(5,2),
  tempo_stability numeric(3,2),
  sections jsonb,
  beats jsonb,
  bars jsonb,
  segments jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Stem files stored on CDN
CREATE TABLE track_stems (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id uuid REFERENCES processed_tracks(id) ON DELETE CASCADE,
  stem_type text NOT NULL CHECK (stem_type IN ('vocals', 'drums', 'bass', 'other', 'instrumental')),
  file_url text NOT NULL,
  file_size_mb numeric(6,2),
  format text DEFAULT 'mp3',
  bitrate integer DEFAULT 192,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(track_id, stem_type)
);

-- User's processed library
CREATE TABLE user_tracks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  track_id uuid REFERENCES processed_tracks(id) ON DELETE CASCADE,
  spotify_playlist_id text,
  added_at timestamp with time zone DEFAULT now(),
  last_played timestamp with time zone,
  play_count integer DEFAULT 0,
  custom_tags text[],
  UNIQUE(user_id, track_id)
);

-- Processing queue
CREATE TABLE processing_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  spotify_track_id text NOT NULL,
  playlist_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority integer DEFAULT 0,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Processing batches
CREATE TABLE processing_batches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  playlist_ids text[],
  total_tracks integer NOT NULL,
  processed_tracks integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  notification_email text,
  notification_phone text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Waveform data (stored separately due to size)
CREATE TABLE track_waveforms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id uuid REFERENCES processed_tracks(id) ON DELETE CASCADE,
  resolution text NOT NULL CHECK (resolution IN ('low', 'medium', 'high')),
  data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(track_id, resolution)
);

-- Indexes for performance
CREATE INDEX idx_processed_tracks_spotify_id ON processed_tracks(spotify_id);
CREATE INDEX idx_processed_tracks_artist ON processed_tracks(artist);
CREATE INDEX idx_track_analysis_bpm ON track_analysis(bpm);
CREATE INDEX idx_track_analysis_key ON track_analysis(key);
CREATE INDEX idx_track_analysis_camelot ON track_analysis(camelot_key);
CREATE INDEX idx_user_tracks_user_id ON user_tracks(user_id);
CREATE INDEX idx_processing_queue_status ON processing_queue(status);
CREATE INDEX idx_processing_queue_user_id ON processing_queue(user_id);

-- RLS policies
ALTER TABLE processed_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_stems ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_waveforms ENABLE ROW LEVEL SECURITY;

-- Public tracks are readable by everyone
CREATE POLICY "Public tracks are viewable by everyone" ON processed_tracks
  FOR SELECT USING (is_public = true);

-- Users can insert their own processed tracks
CREATE POLICY "Users can insert their own tracks" ON processed_tracks
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Track analysis is viewable for public tracks
CREATE POLICY "Analysis viewable for public tracks" ON track_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM processed_tracks 
      WHERE processed_tracks.id = track_analysis.track_id 
      AND processed_tracks.is_public = true
    )
  );

-- Stems viewable for public tracks
CREATE POLICY "Stems viewable for public tracks" ON track_stems
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM processed_tracks 
      WHERE processed_tracks.id = track_stems.track_id 
      AND processed_tracks.is_public = true
    )
  );

-- Users can manage their own library
CREATE POLICY "Users can view their library" ON user_tracks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their library" ON user_tracks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their library" ON user_tracks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can remove from their library" ON user_tracks
  FOR DELETE USING (auth.uid() = user_id);

-- Users can manage their processing queue
CREATE POLICY "Users can view their queue" ON processing_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to queue" ON processing_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their queue" ON processing_queue
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can view their batches
CREATE POLICY "Users can view their batches" ON processing_batches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create batches" ON processing_batches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Waveforms viewable for public tracks
CREATE POLICY "Waveforms viewable for public tracks" ON track_waveforms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM processed_tracks 
      WHERE processed_tracks.id = track_waveforms.track_id 
      AND processed_tracks.is_public = true
    )
  );