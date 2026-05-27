-- Mix Management Database Tables
-- Comprehensive schema for storing mixes, tracks, and related metadata

-- Create mixes table for storing mix information
CREATE TABLE IF NOT EXISTS mixes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    audio_url TEXT,
    duration_seconds INTEGER DEFAULT 0,
    
    -- Mix metadata
    genre TEXT,
    mood TEXT,
    energy_level DECIMAL(3, 2) CHECK (energy_level >= 0 AND energy_level <= 1),
    bpm_range JSONB DEFAULT '{}', -- { "min": 120, "max": 130 }
    key_signatures TEXT[], -- Array of keys used
    
    -- Technical details
    sample_rate INTEGER DEFAULT 44100,
    bit_depth INTEGER DEFAULT 16,
    format TEXT DEFAULT 'mp3', -- mp3, wav, flac
    file_size_bytes BIGINT DEFAULT 0,
    
    -- Mix structure
    total_tracks INTEGER DEFAULT 0,
    transition_count INTEGER DEFAULT 0,
    avg_transition_quality DECIMAL(3, 2),
    mix_technique TEXT, -- 'live', 'studio', 'ai_assisted'
    
    -- Visibility and sharing
    is_public BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    allow_downloads BOOLEAN DEFAULT false,
    allow_remixes BOOLEAN DEFAULT true,
    
    -- Analytics
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    
    -- Content flags
    explicit_content BOOLEAN DEFAULT false,
    copyright_cleared BOOLEAN DEFAULT true,
    original_content BOOLEAN DEFAULT true,
    
    -- Status and lifecycle
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'published', 'archived', 'deleted')),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Tags and categorization
    tags TEXT[] DEFAULT '{}',
    categories TEXT[] DEFAULT '{}'
);

-- Create mix_tracks table for storing individual tracks within mixes
CREATE TABLE IF NOT EXISTS mix_tracks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mix_id UUID REFERENCES mixes(id) ON DELETE CASCADE NOT NULL,
    track_id TEXT NOT NULL, -- Spotify/SoundCloud track ID
    
    -- Position and timing
    position INTEGER NOT NULL, -- Order in the mix
    start_time_seconds DECIMAL(10, 3) NOT NULL, -- When track starts in mix
    end_time_seconds DECIMAL(10, 3) NOT NULL, -- When track ends in mix
    fade_in_seconds DECIMAL(6, 3) DEFAULT 0,
    fade_out_seconds DECIMAL(6, 3) DEFAULT 0,
    
    -- Track metadata (cached from source)
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    duration_seconds INTEGER NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('spotify', 'soundcloud', 'local', 'youtube')),
    source_url TEXT,
    
    -- Audio analysis (cached)
    bpm DECIMAL(6, 2),
    key_signature TEXT, -- Camelot key
    energy DECIMAL(3, 2),
    valence DECIMAL(3, 2),
    danceability DECIMAL(3, 2),
    instrumentalness DECIMAL(3, 2),
    acousticness DECIMAL(3, 2),
    
    -- Mix-specific settings
    volume_adjustment DECIMAL(4, 2) DEFAULT 0, -- dB adjustment
    pitch_adjustment DECIMAL(4, 2) DEFAULT 0, -- Semitones
    tempo_adjustment DECIMAL(4, 2) DEFAULT 0, -- Percentage change
    
    -- EQ settings
    eq_low DECIMAL(4, 2) DEFAULT 0,
    eq_mid DECIMAL(4, 2) DEFAULT 0,
    eq_high DECIMAL(4, 2) DEFAULT 0,
    
    -- Effects applied
    effects_applied JSONB DEFAULT '[]', -- Array of effect configurations
    
    -- Transition information
    transition_in JSONB DEFAULT '{}', -- Transition from previous track
    transition_out JSONB DEFAULT '{}', -- Transition to next track
    
    -- User annotations
    cue_points JSONB DEFAULT '[]', -- User-defined cue points
    notes TEXT, -- DJ notes for this track
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(mix_id, position),
    CHECK (start_time_seconds >= 0),
    CHECK (end_time_seconds > start_time_seconds)
);

-- Create mix_versions table for version control
CREATE TABLE IF NOT EXISTS mix_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mix_id UUID REFERENCES mixes(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    version_name TEXT,
    description TEXT,
    
    -- Version metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Audio file for this version
    audio_url TEXT,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    
    -- Version-specific stats
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    -- Status
    is_current BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    
    UNIQUE(mix_id, version_number)
);

-- Create mix_collaborators table for collaborative mixing
CREATE TABLE IF NOT EXISTS mix_collaborators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mix_id UUID REFERENCES mixes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Permission levels
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'contributor', 'viewer')),
    permissions JSONB DEFAULT '{}', -- Detailed permissions object
    
    -- Collaboration details
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(mix_id, user_id)
);

-- Create mix_likes table for tracking user likes
CREATE TABLE IF NOT EXISTS mix_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mix_id UUID REFERENCES mixes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(mix_id, user_id)
);

-- Create mix_plays table for tracking play statistics
CREATE TABLE IF NOT EXISTS mix_plays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mix_id UUID REFERENCES mixes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Can be anonymous
    
    -- Session information
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Play details
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_played_seconds INTEGER DEFAULT 0,
    completion_percentage DECIMAL(5, 2) DEFAULT 0,
    
    -- Context
    platform TEXT, -- 'web', 'mobile', 'embed'
    referrer TEXT,
    location_country TEXT,
    location_city TEXT
);

-- Create mix_downloads table for tracking downloads
CREATE TABLE IF NOT EXISTS mix_downloads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mix_id UUID REFERENCES mixes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Download details
    format TEXT NOT NULL, -- 'mp3', 'wav', 'flac'
    quality TEXT NOT NULL, -- '128', '320', 'lossless'
    file_size_bytes BIGINT,
    
    -- Timestamps
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Rate limiting
    UNIQUE(mix_id, user_id, format, downloaded_at::DATE)
);

-- Create mix_comments table for user comments
CREATE TABLE IF NOT EXISTS mix_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mix_id UUID REFERENCES mixes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Comment content
    content TEXT NOT NULL,
    timestamp_seconds DECIMAL(10, 3), -- Optional: comment at specific time
    
    -- Threading support
    parent_comment_id UUID REFERENCES mix_comments(id) ON DELETE CASCADE,
    reply_count INTEGER DEFAULT 0,
    
    -- Moderation
    is_edited BOOLEAN DEFAULT false,
    is_flagged BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mix_shares table for tracking shares
CREATE TABLE IF NOT EXISTS mix_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mix_id UUID REFERENCES mixes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Share details
    platform TEXT NOT NULL, -- 'twitter', 'facebook', 'instagram', 'link', 'embed'
    share_url TEXT,
    
    -- Timestamps
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_mixes_user_id ON mixes(user_id);
CREATE INDEX idx_mixes_status ON mixes(status);
CREATE INDEX idx_mixes_is_public ON mixes(is_public);
CREATE INDEX idx_mixes_created_at ON mixes(created_at DESC);
CREATE INDEX idx_mixes_play_count ON mixes(play_count DESC);
CREATE INDEX idx_mixes_like_count ON mixes(like_count DESC);
CREATE INDEX idx_mixes_genre ON mixes(genre);
CREATE INDEX idx_mixes_tags ON mixes USING GIN (tags);
CREATE INDEX idx_mixes_categories ON mixes USING GIN (categories);

CREATE INDEX idx_mix_tracks_mix_id ON mix_tracks(mix_id);
CREATE INDEX idx_mix_tracks_position ON mix_tracks(mix_id, position);
CREATE INDEX idx_mix_tracks_track_id ON mix_tracks(track_id);
CREATE INDEX idx_mix_tracks_source ON mix_tracks(source);
CREATE INDEX idx_mix_tracks_bpm ON mix_tracks(bpm);
CREATE INDEX idx_mix_tracks_key_signature ON mix_tracks(key_signature);

CREATE INDEX idx_mix_versions_mix_id ON mix_versions(mix_id);
CREATE INDEX idx_mix_versions_current ON mix_versions(mix_id, is_current) WHERE is_current = true;

CREATE INDEX idx_mix_collaborators_mix_id ON mix_collaborators(mix_id);
CREATE INDEX idx_mix_collaborators_user_id ON mix_collaborators(user_id);
CREATE INDEX idx_mix_collaborators_status ON mix_collaborators(status);

CREATE INDEX idx_mix_likes_mix_id ON mix_likes(mix_id);
CREATE INDEX idx_mix_likes_user_id ON mix_likes(user_id);
CREATE INDEX idx_mix_likes_created_at ON mix_likes(created_at DESC);

CREATE INDEX idx_mix_plays_mix_id ON mix_plays(mix_id);
CREATE INDEX idx_mix_plays_user_id ON mix_plays(user_id);
CREATE INDEX idx_mix_plays_played_at ON mix_plays(played_at DESC);
CREATE INDEX idx_mix_plays_completion ON mix_plays(completion_percentage);

CREATE INDEX idx_mix_downloads_mix_id ON mix_downloads(mix_id);
CREATE INDEX idx_mix_downloads_user_id ON mix_downloads(user_id);
CREATE INDEX idx_mix_downloads_downloaded_at ON mix_downloads(downloaded_at DESC);

CREATE INDEX idx_mix_comments_mix_id ON mix_comments(mix_id);
CREATE INDEX idx_mix_comments_user_id ON mix_comments(user_id);
CREATE INDEX idx_mix_comments_parent ON mix_comments(parent_comment_id);
CREATE INDEX idx_mix_comments_created_at ON mix_comments(created_at DESC);
CREATE INDEX idx_mix_comments_timestamp ON mix_comments(timestamp_seconds);

CREATE INDEX idx_mix_shares_mix_id ON mix_shares(mix_id);
CREATE INDEX idx_mix_shares_platform ON mix_shares(platform);
CREATE INDEX idx_mix_shares_shared_at ON mix_shares(shared_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_mixes_updated_at
    BEFORE UPDATE ON mixes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mix_tracks_updated_at
    BEFORE UPDATE ON mix_tracks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mix_collaborators_updated_at
    BEFORE UPDATE ON mix_collaborators
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mix_comments_updated_at
    BEFORE UPDATE ON mix_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger functions for maintaining counts
CREATE OR REPLACE FUNCTION update_mix_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update appropriate counter
        IF TG_TABLE_NAME = 'mix_likes' THEN
            UPDATE mixes SET like_count = like_count + 1 WHERE id = NEW.mix_id;
        ELSIF TG_TABLE_NAME = 'mix_comments' THEN
            UPDATE mixes SET comment_count = comment_count + 1 WHERE id = NEW.mix_id;
        ELSIF TG_TABLE_NAME = 'mix_shares' THEN
            UPDATE mixes SET share_count = share_count + 1 WHERE id = NEW.mix_id;
        ELSIF TG_TABLE_NAME = 'mix_downloads' THEN
            UPDATE mixes SET download_count = download_count + 1 WHERE id = NEW.mix_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update appropriate counter
        IF TG_TABLE_NAME = 'mix_likes' THEN
            UPDATE mixes SET like_count = like_count - 1 WHERE id = OLD.mix_id;
        ELSIF TG_TABLE_NAME = 'mix_comments' THEN
            UPDATE mixes SET comment_count = comment_count - 1 WHERE id = OLD.mix_id;
        ELSIF TG_TABLE_NAME = 'mix_shares' THEN
            UPDATE mixes SET share_count = share_count - 1 WHERE id = OLD.mix_id;
        ELSIF TG_TABLE_NAME = 'mix_downloads' THEN
            UPDATE mixes SET download_count = download_count - 1 WHERE id = OLD.mix_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for stat updates
CREATE TRIGGER update_mix_like_count
    AFTER INSERT OR DELETE ON mix_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_mix_stats();

CREATE TRIGGER update_mix_comment_count
    AFTER INSERT OR DELETE ON mix_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_mix_stats();

CREATE TRIGGER update_mix_share_count
    AFTER INSERT OR DELETE ON mix_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_mix_stats();

CREATE TRIGGER update_mix_download_count
    AFTER INSERT OR DELETE ON mix_downloads
    FOR EACH ROW
    EXECUTE FUNCTION update_mix_stats();

-- Create function to update mix track count
CREATE OR REPLACE FUNCTION update_mix_track_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE mixes SET total_tracks = total_tracks + 1 WHERE id = NEW.mix_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE mixes SET total_tracks = total_tracks - 1 WHERE id = OLD.mix_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mix_track_count_trigger
    AFTER INSERT OR DELETE ON mix_tracks
    FOR EACH ROW
    EXECUTE FUNCTION update_mix_track_count();

-- Enable Row Level Security
ALTER TABLE mixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mix_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mix_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mix_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE mix_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mix_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE mix_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mix_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mix_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mixes table
CREATE POLICY "Users can view public mixes" ON mixes
    FOR SELECT USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can view their own mixes" ON mixes
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view mixes they collaborate on" ON mixes
    FOR SELECT USING (
        id IN (
            SELECT mix_id FROM mix_collaborators 
            WHERE user_id = auth.uid() AND status = 'accepted'
        )
    );

CREATE POLICY "Users can create their own mixes" ON mixes
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own mixes" ON mixes
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Collaborators can update mixes" ON mixes
    FOR UPDATE USING (
        id IN (
            SELECT mix_id FROM mix_collaborators 
            WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('editor', 'owner')
        )
    );

CREATE POLICY "Users can delete their own mixes" ON mixes
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for mix_tracks table
CREATE POLICY "Users can view tracks from accessible mixes" ON mix_tracks
    FOR SELECT USING (
        mix_id IN (
            SELECT id FROM mixes WHERE is_public = true OR user_id = auth.uid()
            UNION
            SELECT mix_id FROM mix_collaborators WHERE user_id = auth.uid() AND status = 'accepted'
        )
    );

CREATE POLICY "Users can manage tracks in their mixes" ON mix_tracks
    FOR ALL USING (
        mix_id IN (
            SELECT id FROM mixes WHERE user_id = auth.uid()
            UNION
            SELECT mix_id FROM mix_collaborators 
            WHERE user_id = auth.uid() AND status = 'accepted' AND role IN ('editor', 'owner')
        )
    );

-- RLS Policies for mix_likes table
CREATE POLICY "Users can view all likes" ON mix_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their own likes" ON mix_likes FOR ALL USING (user_id = auth.uid());

-- RLS Policies for mix_comments table
CREATE POLICY "Users can view comments on accessible mixes" ON mix_comments
    FOR SELECT USING (
        mix_id IN (
            SELECT id FROM mixes WHERE is_public = true OR user_id = auth.uid()
            UNION
            SELECT mix_id FROM mix_collaborators WHERE user_id = auth.uid() AND status = 'accepted'
        )
    );

CREATE POLICY "Users can create comments on accessible mixes" ON mix_comments
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        mix_id IN (
            SELECT id FROM mixes WHERE is_public = true OR user_id = auth.uid()
            UNION
            SELECT mix_id FROM mix_collaborators WHERE user_id = auth.uid() AND status = 'accepted'
        )
    );

CREATE POLICY "Users can update their own comments" ON mix_comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON mix_comments
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for other tables (similar pattern)
CREATE POLICY "Users can view their collaborations" ON mix_collaborators
    FOR SELECT USING (user_id = auth.uid() OR mix_id IN (SELECT id FROM mixes WHERE user_id = auth.uid()));

CREATE POLICY "Mix owners can manage collaborators" ON mix_collaborators
    FOR ALL USING (mix_id IN (SELECT id FROM mixes WHERE user_id = auth.uid()));

-- Allow public read access to plays for analytics
CREATE POLICY "Allow public play tracking" ON mix_plays FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Users can view play stats" ON mix_plays FOR SELECT TO authenticated USING (true);

-- Create helper functions
CREATE OR REPLACE FUNCTION get_mix_with_tracks(mix_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'mix', row_to_json(m),
        'tracks', (
            SELECT json_agg(row_to_json(t) ORDER BY t.position)
            FROM mix_tracks t
            WHERE t.mix_id = mix_uuid
        ),
        'collaborators', (
            SELECT json_agg(
                json_build_object(
                    'user_id', c.user_id,
                    'role', c.role,
                    'status', c.status,
                    'profile', (
                        SELECT json_build_object('display_name', p.display_name, 'avatar_url', p.avatar_url)
                        FROM profiles p WHERE p.id = c.user_id
                    )
                )
            )
            FROM mix_collaborators c
            WHERE c.mix_id = mix_uuid AND c.status = 'accepted'
        ),
        'stats', json_build_object(
            'like_count', m.like_count,
            'play_count', m.play_count,
            'comment_count', m.comment_count,
            'share_count', m.share_count,
            'download_count', m.download_count
        )
    ) INTO result
    FROM mixes m
    WHERE m.id = mix_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_mixes(user_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', m.id,
            'title', m.title,
            'description', m.description,
            'cover_image_url', m.cover_image_url,
            'duration_seconds', m.duration_seconds,
            'genre', m.genre,
            'is_public', m.is_public,
            'created_at', m.created_at,
            'stats', json_build_object(
                'play_count', m.play_count,
                'like_count', m.like_count,
                'comment_count', m.comment_count
            )
        ) ORDER BY m.created_at DESC
    ) INTO result
    FROM mixes m
    WHERE m.user_id = user_uuid AND m.status = 'published'
    LIMIT limit_count;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE mixes IS 'Main table for storing DJ mixes with metadata and analytics';
COMMENT ON TABLE mix_tracks IS 'Individual tracks within mixes with timing and effects';
COMMENT ON TABLE mix_versions IS 'Version control for mix iterations';
COMMENT ON TABLE mix_collaborators IS 'Collaborative mixing permissions and roles';
COMMENT ON TABLE mix_likes IS 'User likes/favorites for mixes';
COMMENT ON TABLE mix_plays IS 'Play tracking and analytics for mixes';
COMMENT ON TABLE mix_downloads IS 'Download tracking with format and quality info';
COMMENT ON TABLE mix_comments IS 'User comments on mixes with optional timestamps';
COMMENT ON TABLE mix_shares IS 'Social sharing tracking across platforms';

COMMENT ON FUNCTION get_mix_with_tracks(UUID) IS 'Returns complete mix data with tracks and collaborators';
COMMENT ON FUNCTION get_user_mixes(UUID, INTEGER) IS 'Returns user mixes with basic stats';
COMMENT ON FUNCTION update_mix_stats() IS 'Maintains denormalized counts for mix statistics';