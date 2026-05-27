-- Create stem_files table for CDN storage management
CREATE TABLE IF NOT EXISTS stem_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL,
  stem_type VARCHAR(20) NOT NULL CHECK (stem_type IN ('drums', 'bass', 'vocals', 'other', 'full')),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL UNIQUE,
  file_size BIGINT NOT NULL,
  duration FLOAT NOT NULL,
  sample_rate INTEGER NOT NULL,
  bit_rate INTEGER NOT NULL,
  format VARCHAR(10) NOT NULL CHECK (format IN ('wav', 'mp3', 'flac', 'ogg', 'm4a')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stem_files_track_id ON stem_files(track_id);
CREATE INDEX IF NOT EXISTS idx_stem_files_stem_type ON stem_files(stem_type);
CREATE INDEX IF NOT EXISTS idx_stem_files_created_at ON stem_files(created_at);
CREATE INDEX IF NOT EXISTS idx_stem_files_file_path ON stem_files(file_path);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_stem_files_track_stem ON stem_files(track_id, stem_type);

-- Create function to update the updated_at column
CREATE OR REPLACE FUNCTION update_stem_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER stem_files_updated_at
  BEFORE UPDATE ON stem_files
  FOR EACH ROW
  EXECUTE FUNCTION update_stem_files_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE stem_files ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access their own stems
-- Note: We need to join through processed_tracks or another user relation
CREATE POLICY "Users can view stems for their tracks" ON stem_files
  FOR SELECT 
  USING (
    track_id IN (
      SELECT id FROM processed_tracks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert stems for their tracks" ON stem_files
  FOR INSERT 
  WITH CHECK (
    track_id IN (
      SELECT id FROM processed_tracks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update stems for their tracks" ON stem_files
  FOR UPDATE 
  USING (
    track_id IN (
      SELECT id FROM processed_tracks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete stems for their tracks" ON stem_files
  FOR DELETE 
  USING (
    track_id IN (
      SELECT id FROM processed_tracks WHERE user_id = auth.uid()
    )
  );

-- Create storage bucket policies (these would be set via Supabase dashboard or JS)
-- The bucket 'stem-files' should be created with appropriate policies

-- Create view for stem statistics
CREATE OR REPLACE VIEW stem_stats AS
SELECT 
  track_id,
  COUNT(*) as total_stems,
  COUNT(CASE WHEN stem_type = 'drums' THEN 1 END) as has_drums,
  COUNT(CASE WHEN stem_type = 'bass' THEN 1 END) as has_bass,
  COUNT(CASE WHEN stem_type = 'vocals' THEN 1 END) as has_vocals,
  COUNT(CASE WHEN stem_type = 'other' THEN 1 END) as has_other,
  COUNT(CASE WHEN stem_type = 'full' THEN 1 END) as has_full,
  SUM(file_size) as total_size,
  AVG(file_size) as avg_file_size,
  MAX(created_at) as last_processed
FROM stem_files
GROUP BY track_id;

-- Grant access to the view
GRANT SELECT ON stem_stats TO authenticated;

-- Add RLS to the view
ALTER VIEW stem_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stem stats for their tracks" ON stem_stats
  FOR SELECT 
  USING (
    track_id IN (
      SELECT id FROM processed_tracks WHERE user_id = auth.uid()
    )
  );

-- Create function to get stem download URL with proper security
CREATE OR REPLACE FUNCTION get_stem_download_url(stem_id UUID)
RETURNS TEXT AS $$
DECLARE
  stem_path TEXT;
  user_owns_track BOOLEAN;
BEGIN
  -- Get the file path and check ownership
  SELECT sf.file_path,
         EXISTS(
           SELECT 1 FROM processed_tracks pt 
           WHERE pt.id = sf.track_id AND pt.user_id = auth.uid()
         )
  INTO stem_path, user_owns_track
  FROM stem_files sf
  WHERE sf.id = stem_id;

  -- Return null if user doesn't own the track or stem doesn't exist
  IF NOT user_owns_track OR stem_path IS NULL THEN
    RETURN NULL;
  END IF;

  -- Return the file path (the client will use this to create signed URL)
  RETURN stem_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_stem_download_url(UUID) TO authenticated;

-- Create function to clean up stems when a track is deleted
CREATE OR REPLACE FUNCTION cleanup_stems_on_track_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all stem files for the deleted track
  DELETE FROM stem_files WHERE track_id = OLD.id;
  
  -- Note: The actual files in storage should be cleaned up by the application
  -- or by a scheduled cleanup job
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to cleanup stems when a processed_track is deleted
CREATE TRIGGER cleanup_stems_on_track_delete
  AFTER DELETE ON processed_tracks
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_stems_on_track_delete();

-- Add constraint to ensure we don't have duplicate stem types per track
CREATE UNIQUE INDEX IF NOT EXISTS idx_stem_files_unique_track_stem 
ON stem_files(track_id, stem_type);

-- Create materialized view for storage analytics (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS stem_storage_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  stem_type,
  COUNT(*) as files_count,
  SUM(file_size) as total_bytes,
  AVG(file_size) as avg_file_size,
  AVG(duration) as avg_duration
FROM stem_files
GROUP BY DATE_TRUNC('day', created_at), stem_type
ORDER BY date DESC, stem_type;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_stem_analytics_date ON stem_storage_analytics(date);

-- Grant access to the materialized view
GRANT SELECT ON stem_storage_analytics TO authenticated;

-- Create function to refresh analytics (can be called by scheduled job)
CREATE OR REPLACE FUNCTION refresh_stem_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW stem_storage_analytics;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_stem_analytics() TO authenticated;