-- Enhanced Audio Analysis Database Schema
-- Stores comprehensive spectral analysis, fingerprinting, and AI insights

-- Create enhanced_analysis table for storing comprehensive audio analysis
CREATE TABLE IF NOT EXISTS enhanced_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    track_id UUID NOT NULL REFERENCES processed_tracks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic audio characteristics
    basic_features JSONB NOT NULL DEFAULT '{}',
    
    -- Comprehensive spectral analysis results
    spectral_features JSONB NOT NULL DEFAULT '{}',
    
    -- Mood detection and energy analysis
    mood_features JSONB NOT NULL DEFAULT '{}',
    
    -- Vocal analysis and characteristics
    vocal_features JSONB NOT NULL DEFAULT '{}',
    
    -- Genre classification results
    genre_analysis JSONB NOT NULL DEFAULT '{}',
    
    -- Audio fingerprinting for duplicate detection
    audio_fingerprint JSONB NOT NULL DEFAULT '{}',
    
    -- Stem separation results (optional)
    stem_separation JSONB DEFAULT NULL,
    
    -- Duplicate detection results
    duplicate_analysis JSONB NOT NULL DEFAULT '{}',
    
    -- Processing metadata
    processing_metadata JSONB NOT NULL DEFAULT '{}',
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version TEXT NOT NULL DEFAULT '1.0.0',
    
    -- Indexes for performance
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_track_id ON enhanced_analysis(track_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_user_id ON enhanced_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_analyzed_at ON enhanced_analysis(analyzed_at);

-- GIN indexes for JSONB columns to enable fast searches
CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_spectral_features ON enhanced_analysis USING GIN(spectral_features);
CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_mood_features ON enhanced_analysis USING GIN(mood_features);
CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_vocal_features ON enhanced_analysis USING GIN(vocal_features);
CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_genre_analysis ON enhanced_analysis USING GIN(genre_analysis);
CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_basic_features ON enhanced_analysis USING GIN(basic_features);
CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_fingerprint ON enhanced_analysis USING GIN(audio_fingerprint);

-- Create spectral_similarity table for efficient similarity searches
CREATE TABLE IF NOT EXISTS spectral_similarity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    track_a UUID NOT NULL REFERENCES processed_tracks(id) ON DELETE CASCADE,
    track_b UUID NOT NULL REFERENCES processed_tracks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Similarity metrics
    overall_similarity REAL NOT NULL CHECK (overall_similarity >= 0 AND overall_similarity <= 1),
    spectral_centroid_similarity REAL CHECK (spectral_centroid_similarity >= 0 AND spectral_centroid_similarity <= 1),
    mfcc_similarity REAL CHECK (mfcc_similarity >= 0 AND mfcc_similarity <= 1),
    chroma_similarity REAL CHECK (chroma_similarity >= 0 AND chroma_similarity <= 1),
    tempo_similarity REAL CHECK (tempo_similarity >= 0 AND tempo_similarity <= 1),
    energy_similarity REAL CHECK (energy_similarity >= 0 AND energy_similarity <= 1),
    harmonic_similarity REAL CHECK (harmonic_similarity >= 0 AND harmonic_similarity <= 1),
    
    -- Similar features array
    similar_features TEXT[] DEFAULT '{}',
    
    -- Confidence score for similarity calculation
    confidence REAL NOT NULL DEFAULT 0.0 CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Processing metadata
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    algorithm_version TEXT NOT NULL DEFAULT '1.0.0',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique pairs and prevent self-similarity
    CONSTRAINT unique_track_pair UNIQUE(track_a, track_b),
    CONSTRAINT no_self_similarity CHECK(track_a != track_b)
);

-- Indexes for spectral similarity searches
CREATE INDEX IF NOT EXISTS idx_spectral_similarity_track_a ON spectral_similarity(track_a);
CREATE INDEX IF NOT EXISTS idx_spectral_similarity_track_b ON spectral_similarity(track_b);
CREATE INDEX IF NOT EXISTS idx_spectral_similarity_user_id ON spectral_similarity(user_id);
CREATE INDEX IF NOT EXISTS idx_spectral_similarity_overall ON spectral_similarity(overall_similarity DESC);
CREATE INDEX IF NOT EXISTS idx_spectral_similarity_confidence ON spectral_similarity(confidence DESC);

-- Create audio_insights table for ML-generated insights and recommendations
CREATE TABLE IF NOT EXISTS audio_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    track_id UUID NOT NULL REFERENCES processed_tracks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- AI-generated insights
    mood_analysis JSONB DEFAULT '{}', -- mood detection results
    energy_curve JSONB DEFAULT '{}', -- energy progression over time
    vocal_analysis JSONB DEFAULT '{}', -- vocal detection and characteristics
    genre_classification JSONB DEFAULT '{}', -- genre prediction with confidence
    crowd_response JSONB DEFAULT '{}', -- predicted crowd response
    
    -- Mix recommendations
    optimal_mix_points JSONB DEFAULT '{}', -- recommended mix in/out points
    transition_suggestions JSONB DEFAULT '{}', -- crossfade and EQ suggestions
    effects_recommendations JSONB DEFAULT '{}', -- suggested effects and settings
    
    -- Context-aware recommendations
    venue_suitability JSONB DEFAULT '{}', -- suitability for different venue types
    time_context JSONB DEFAULT '{}', -- best time/slot recommendations
    audience_predictions JSONB DEFAULT '{}', -- predicted audience response
    
    -- Machine learning metadata
    model_versions JSONB NOT NULL DEFAULT '{}',
    confidence_scores JSONB NOT NULL DEFAULT '{}',
    training_data_version TEXT,
    
    -- Timestamps
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- for cache invalidation
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audio insights
CREATE INDEX IF NOT EXISTS idx_audio_insights_track_id ON audio_insights(track_id);
CREATE INDEX IF NOT EXISTS idx_audio_insights_user_id ON audio_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_insights_generated_at ON audio_insights(generated_at);
CREATE INDEX IF NOT EXISTS idx_audio_insights_expires_at ON audio_insights(expires_at);

-- GIN indexes for JSONB insight data
CREATE INDEX IF NOT EXISTS idx_audio_insights_mood ON audio_insights USING GIN(mood_analysis);
CREATE INDEX IF NOT EXISTS idx_audio_insights_genre ON audio_insights USING GIN(genre_classification);
CREATE INDEX IF NOT EXISTS idx_audio_insights_recommendations ON audio_insights USING GIN(transition_suggestions);

-- Create analysis_queue table for processing queue management
CREATE TABLE IF NOT EXISTS analysis_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    track_id UUID NOT NULL REFERENCES processed_tracks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Queue metadata
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    
    -- Analysis configuration
    analysis_config JSONB NOT NULL DEFAULT '{}',
    
    -- Processing details
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    worker_id TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Progress tracking
    current_stage TEXT,
    progress_percentage REAL DEFAULT 0.0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for queue management
CREATE INDEX IF NOT EXISTS idx_analysis_queue_status ON analysis_queue(status);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_priority ON analysis_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_user_id ON analysis_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_created_at ON analysis_queue(created_at);

-- Create user_analysis_preferences table for personalized settings
CREATE TABLE IF NOT EXISTS user_analysis_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Default analysis settings
    default_spectral_analysis BOOLEAN DEFAULT true,
    default_stem_separation BOOLEAN DEFAULT false,
    default_duplicate_detection BOOLEAN DEFAULT true,
    
    -- Quality preferences
    preferred_stem_quality TEXT DEFAULT 'medium' CHECK (preferred_stem_quality IN ('fast', 'medium', 'high')),
    preferred_analysis_depth TEXT DEFAULT 'standard' CHECK (preferred_analysis_depth IN ('basic', 'standard', 'comprehensive')),
    
    -- AI insights preferences
    enable_mood_analysis BOOLEAN DEFAULT true,
    enable_genre_classification BOOLEAN DEFAULT true,
    enable_crowd_prediction BOOLEAN DEFAULT false,
    enable_transition_suggestions BOOLEAN DEFAULT true,
    
    -- Notification preferences
    notify_on_completion BOOLEAN DEFAULT true,
    notify_on_duplicates BOOLEAN DEFAULT true,
    notification_channels TEXT[] DEFAULT ARRAY['in_app'],
    
    -- Processing preferences
    auto_process_uploads BOOLEAN DEFAULT true,
    batch_processing_enabled BOOLEAN DEFAULT false,
    max_concurrent_analyses INTEGER DEFAULT 3,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create analysis_performance_metrics table for monitoring
CREATE TABLE IF NOT EXISTS analysis_performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Metrics data
    analysis_type TEXT NOT NULL,
    processing_time_ms INTEGER NOT NULL,
    track_duration_seconds REAL NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    
    -- Performance ratios
    processing_ratio REAL GENERATED ALWAYS AS (processing_time_ms::REAL / (track_duration_seconds * 1000)) STORED,
    throughput_mbps REAL GENERATED ALWAYS AS ((file_size_bytes::REAL / 1024 / 1024) / (processing_time_ms::REAL / 1000)) STORED,
    
    -- Configuration context
    config_hash TEXT NOT NULL,
    worker_version TEXT NOT NULL,
    
    -- Resource usage
    memory_usage_mb REAL,
    cpu_usage_percent REAL,
    
    -- Success metrics
    success BOOLEAN NOT NULL,
    error_type TEXT,
    
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance monitoring
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON analysis_performance_metrics(analysis_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_measured_at ON analysis_performance_metrics(measured_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_success ON analysis_performance_metrics(success);

-- Row Level Security (RLS) Policies

-- Enhanced analysis RLS
ALTER TABLE enhanced_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enhanced analysis"
    ON enhanced_analysis FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own enhanced analysis"
    ON enhanced_analysis FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enhanced analysis"
    ON enhanced_analysis FOR UPDATE
    USING (auth.uid() = user_id);

-- Spectral similarity RLS
ALTER TABLE spectral_similarity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own similarity data"
    ON spectral_similarity FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own similarity data"
    ON spectral_similarity FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Audio insights RLS
ALTER TABLE audio_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audio insights"
    ON audio_insights FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audio insights"
    ON audio_insights FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audio insights"
    ON audio_insights FOR UPDATE
    USING (auth.uid() = user_id);

-- Analysis queue RLS
ALTER TABLE analysis_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analysis queue"
    ON analysis_queue FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queue items"
    ON analysis_queue FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue items"
    ON analysis_queue FOR UPDATE
    USING (auth.uid() = user_id);

-- Preferences RLS
ALTER TABLE user_analysis_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences"
    ON user_analysis_preferences FOR ALL
    USING (auth.uid() = user_id);

-- Functions and Triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_enhanced_analysis_updated_at BEFORE UPDATE ON enhanced_analysis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audio_insights_updated_at BEFORE UPDATE ON audio_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analysis_queue_updated_at BEFORE UPDATE ON analysis_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_analysis_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create similarity records
CREATE OR REPLACE FUNCTION create_similarity_record()
RETURNS TRIGGER AS $$
BEGIN
    -- This function will be called by background workers
    -- to compute similarity between tracks when new analysis is added
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to clean up expired insights
CREATE OR REPLACE FUNCTION cleanup_expired_insights()
RETURNS void AS $$
BEGIN
    DELETE FROM audio_insights 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ language 'plpgsql';

-- Views for common queries

-- View for track analysis summary
CREATE OR REPLACE VIEW track_analysis_summary AS
SELECT 
    pt.id as track_id,
    pt.name,
    pt.artist,
    pt.user_id,
    ea.basic_features->'duration' as duration,
    ea.basic_features->'sampleRate' as sample_rate,
    ea.spectral_features->'statistics'->'mean'->0 as avg_energy,
    ea.audio_fingerprint->'confidence' as fingerprint_confidence,
    ea.stem_separation->>'available' as stems_available,
    ea.duplicate_analysis->>'processed' as duplicate_checked,
    ai.mood_analysis->>'primary_mood' as primary_mood,
    ai.genre_classification->>'primary_genre' as predicted_genre,
    ea.analyzed_at,
    ea.version as analysis_version
FROM processed_tracks pt
LEFT JOIN enhanced_analysis ea ON pt.id = ea.track_id
LEFT JOIN audio_insights ai ON pt.id = ai.track_id;

-- View for similarity relationships
CREATE OR REPLACE VIEW track_similarity_view AS
SELECT 
    ss.track_a,
    ss.track_b,
    pt_a.name as track_a_name,
    pt_a.artist as track_a_artist,
    pt_b.name as track_b_name,
    pt_b.artist as track_b_artist,
    ss.overall_similarity,
    ss.similar_features,
    ss.confidence,
    ss.computed_at
FROM spectral_similarity ss
JOIN processed_tracks pt_a ON ss.track_a = pt_a.id
JOIN processed_tracks pt_b ON ss.track_b = pt_b.id;

-- Insert default preferences for existing users
INSERT INTO user_analysis_preferences (user_id)
SELECT DISTINCT user_id 
FROM processed_tracks 
WHERE user_id NOT IN (SELECT user_id FROM user_analysis_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE enhanced_analysis IS 'Comprehensive audio analysis results including spectral features, fingerprints, and AI insights';
COMMENT ON TABLE spectral_similarity IS 'Precomputed similarity scores between tracks for fast recommendations';
COMMENT ON TABLE audio_insights IS 'AI-generated insights, mood analysis, and mixing recommendations';
COMMENT ON TABLE analysis_queue IS 'Queue management for background audio analysis processing';
COMMENT ON TABLE user_analysis_preferences IS 'User preferences for analysis settings and notifications';
COMMENT ON TABLE analysis_performance_metrics IS 'Performance monitoring data for analysis operations';