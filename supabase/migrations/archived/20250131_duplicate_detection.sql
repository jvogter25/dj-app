-- Create table for storing track fingerprints
CREATE TABLE IF NOT EXISTS track_fingerprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL,
  algorithm VARCHAR(20) NOT NULL CHECK (algorithm IN ('chromaprint', 'mfcc', 'spectral_hash')),
  fingerprint TEXT NOT NULL,
  duration FLOAT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.95,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_track_fingerprints_track_id ON track_fingerprints(track_id);
CREATE INDEX IF NOT EXISTS idx_track_fingerprints_algorithm ON track_fingerprints(algorithm);
CREATE INDEX IF NOT EXISTS idx_track_fingerprints_created_at ON track_fingerprints(created_at);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_track_fingerprints_track_algorithm ON track_fingerprints(track_id, algorithm);

-- Create table for duplicate groups
CREATE TABLE IF NOT EXISTS duplicate_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tracks UUID[] NOT NULL,
  primary_track UUID NOT NULL,
  similarity FLOAT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'dismissed')),
  user_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for duplicate groups
CREATE INDEX IF NOT EXISTS idx_duplicate_groups_primary_track ON duplicate_groups(primary_track);
CREATE INDEX IF NOT EXISTS idx_duplicate_groups_status ON duplicate_groups(status);
CREATE INDEX IF NOT EXISTS idx_duplicate_groups_detected_at ON duplicate_groups(detected_at);
CREATE INDEX IF NOT EXISTS idx_duplicate_groups_tracks ON duplicate_groups USING GIN(tracks);

-- Create table for storing duplicate comparisons (for caching)
CREATE TABLE IF NOT EXISTS duplicate_comparisons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_a UUID NOT NULL,
  track_b UUID NOT NULL,
  algorithm VARCHAR(20) NOT NULL,
  similarity FLOAT NOT NULL,
  confidence FLOAT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for duplicate comparisons
CREATE INDEX IF NOT EXISTS idx_duplicate_comparisons_tracks ON duplicate_comparisons(track_a, track_b);
CREATE INDEX IF NOT EXISTS idx_duplicate_comparisons_similarity ON duplicate_comparisons(similarity);
CREATE INDEX IF NOT EXISTS idx_duplicate_comparisons_algorithm ON duplicate_comparisons(algorithm);

-- Create unique constraint to prevent duplicate comparisons
CREATE UNIQUE INDEX IF NOT EXISTS idx_duplicate_comparisons_unique 
ON duplicate_comparisons(LEAST(track_a, track_b), GREATEST(track_a, track_b), algorithm);

-- Create function to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER track_fingerprints_updated_at
  BEFORE UPDATE ON track_fingerprints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER duplicate_groups_updated_at
  BEFORE UPDATE ON duplicate_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE track_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS policies for track_fingerprints
-- Users can only access fingerprints for their own tracks
CREATE POLICY "Users can view fingerprints for their tracks" ON track_fingerprints
  FOR SELECT
  USING (
    track_id IN (
      SELECT id FROM processed_tracks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert fingerprints for their tracks" ON track_fingerprints
  FOR INSERT
  WITH CHECK (
    track_id IN (
      SELECT id FROM processed_tracks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update fingerprints for their tracks" ON track_fingerprints
  FOR UPDATE
  USING (
    track_id IN (
      SELECT id FROM processed_tracks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete fingerprints for their tracks" ON track_fingerprints
  FOR DELETE
  USING (
    track_id IN (
      SELECT id FROM processed_tracks WHERE user_id = auth.uid()
    )
  );

-- RLS policies for duplicate_groups
-- Users can only access duplicate groups containing their tracks
CREATE POLICY "Users can view their duplicate groups" ON duplicate_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM processed_tracks 
      WHERE processed_tracks.id = ANY(duplicate_groups.tracks) 
      AND processed_tracks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert duplicate groups for their tracks" ON duplicate_groups
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM processed_tracks 
      WHERE processed_tracks.id = ANY(duplicate_groups.tracks) 
      AND processed_tracks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their duplicate groups" ON duplicate_groups
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM processed_tracks 
      WHERE processed_tracks.id = ANY(duplicate_groups.tracks) 
      AND processed_tracks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their duplicate groups" ON duplicate_groups
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM processed_tracks 
      WHERE processed_tracks.id = ANY(duplicate_groups.tracks) 
      AND processed_tracks.user_id = auth.uid()
    )
  );

-- RLS policies for duplicate_comparisons (allow users to see comparisons involving their tracks)
CREATE POLICY "Users can view comparisons for their tracks" ON duplicate_comparisons
  FOR SELECT
  USING (
    track_a IN (SELECT id FROM processed_tracks WHERE user_id = auth.uid()) OR
    track_b IN (SELECT id FROM processed_tracks WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert comparisons for their tracks" ON duplicate_comparisons
  FOR INSERT
  WITH CHECK (
    track_a IN (SELECT id FROM processed_tracks WHERE user_id = auth.uid()) OR
    track_b IN (SELECT id FROM processed_tracks WHERE user_id = auth.uid())
  );

-- Create view for duplicate statistics
CREATE OR REPLACE VIEW duplicate_stats AS
SELECT 
  COUNT(*) as total_fingerprints,
  COUNT(DISTINCT track_id) as unique_tracks,
  algorithm,
  AVG(confidence) as avg_confidence,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as recent_fingerprints
FROM track_fingerprints
GROUP BY algorithm;

-- Grant access to the view
GRANT SELECT ON duplicate_stats TO authenticated;

-- Create function to find potential duplicates for a track
CREATE OR REPLACE FUNCTION find_track_duplicates(
  input_track_id UUID,
  similarity_threshold FLOAT DEFAULT 0.85,
  limit_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  candidate_track_id UUID,
  algorithm VARCHAR(20),
  similarity FLOAT,
  confidence FLOAT,
  track_name TEXT,
  track_artist TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    dc.track_b as candidate_track_id,
    dc.algorithm,
    dc.similarity,
    dc.confidence,
    pt.name as track_name,
    pt.artist as track_artist
  FROM duplicate_comparisons dc
  JOIN processed_tracks pt ON pt.id = dc.track_b
  WHERE dc.track_a = input_track_id
    AND dc.similarity >= similarity_threshold
    AND pt.user_id = auth.uid()
  
  UNION
  
  SELECT DISTINCT
    dc.track_a as candidate_track_id,
    dc.algorithm,
    dc.similarity,
    dc.confidence,
    pt.name as track_name,
    pt.artist as track_artist
  FROM duplicate_comparisons dc
  JOIN processed_tracks pt ON pt.id = dc.track_a
  WHERE dc.track_b = input_track_id
    AND dc.similarity >= similarity_threshold
    AND pt.user_id = auth.uid()
  
  ORDER BY similarity DESC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_track_duplicates(UUID, FLOAT, INTEGER) TO authenticated;

-- Create function to clean up old fingerprints and comparisons
CREATE OR REPLACE FUNCTION cleanup_old_duplicate_data()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete fingerprints for tracks that no longer exist
  DELETE FROM track_fingerprints 
  WHERE track_id NOT IN (SELECT id FROM processed_tracks);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete old comparisons (older than 30 days) with low similarity
  DELETE FROM duplicate_comparisons 
  WHERE computed_at < NOW() - INTERVAL '30 days' 
    AND similarity < 0.5;
  
  -- Delete duplicate groups that have been dismissed for more than 90 days
  DELETE FROM duplicate_groups 
  WHERE status = 'dismissed' 
    AND updated_at < NOW() - INTERVAL '90 days';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_old_duplicate_data() TO authenticated;

-- Create materialized view for duplicate detection analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS duplicate_detection_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  algorithm,
  COUNT(*) as fingerprints_generated,
  AVG(confidence) as avg_confidence,
  COUNT(DISTINCT track_id) as unique_tracks_processed
FROM track_fingerprints
GROUP BY DATE_TRUNC('day', created_at), algorithm
ORDER BY date DESC, algorithm;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_duplicate_analytics_date ON duplicate_detection_analytics(date);

-- Grant access to the materialized view
GRANT SELECT ON duplicate_detection_analytics TO authenticated;

-- Create function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_duplicate_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW duplicate_detection_analytics;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_duplicate_analytics() TO authenticated;

-- Create trigger function to automatically create comparisons when fingerprints are added
CREATE OR REPLACE FUNCTION auto_create_duplicate_comparisons()
RETURNS TRIGGER AS $$
DECLARE
  existing_fp RECORD;
  similarity_score FLOAT;
BEGIN
  -- For each existing fingerprint with the same algorithm, create a comparison
  FOR existing_fp IN 
    SELECT tf.* FROM track_fingerprints tf
    JOIN processed_tracks pt ON pt.id = tf.track_id
    WHERE tf.algorithm = NEW.algorithm 
      AND tf.track_id != NEW.track_id
      AND pt.user_id = (
        SELECT user_id FROM processed_tracks WHERE id = NEW.track_id
      )
  LOOP
    -- In a real implementation, this would call the similarity function
    -- For now, we'll create a placeholder that would be updated by the worker
    INSERT INTO duplicate_comparisons (
      track_a, 
      track_b, 
      algorithm, 
      similarity, 
      confidence,
      details
    ) VALUES (
      LEAST(NEW.track_id, existing_fp.track_id),
      GREATEST(NEW.track_id, existing_fp.track_id),
      NEW.algorithm,
      0.0, -- Placeholder - would be computed by worker
      LEAST(NEW.confidence, existing_fp.confidence),
      '{}'::jsonb
    ) ON CONFLICT DO NOTHING; -- Avoid duplicates
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create comparisons
CREATE TRIGGER auto_create_comparisons_trigger
  AFTER INSERT ON track_fingerprints
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_duplicate_comparisons();

-- Add some helpful comments
COMMENT ON TABLE track_fingerprints IS 'Stores audio fingerprints for duplicate detection using various algorithms';
COMMENT ON TABLE duplicate_groups IS 'Groups of tracks identified as potential duplicates';
COMMENT ON TABLE duplicate_comparisons IS 'Cached similarity comparisons between tracks';
COMMENT ON FUNCTION find_track_duplicates IS 'Finds potential duplicate tracks for a given track ID';
COMMENT ON FUNCTION cleanup_old_duplicate_data IS 'Cleans up old fingerprints and comparisons to save space';