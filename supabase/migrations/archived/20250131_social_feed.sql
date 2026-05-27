-- Supabase Migration: Social Feed & Discovery System
-- Create comprehensive tables for social features and content discovery

BEGIN;

-- User follows table for social graph
CREATE TABLE IF NOT EXISTS user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    followed_at TIMESTAMPTZ DEFAULT now(),
    
    -- Notification preferences
    notify_new_mix BOOLEAN DEFAULT true,
    notify_live_session BOOLEAN DEFAULT true,
    
    -- Prevent self-following
    CONSTRAINT check_not_self_follow CHECK (follower_id != following_id),
    -- Unique constraint to prevent duplicate follows
    UNIQUE(follower_id, following_id),
    
    -- Indexes for efficient querying
    INDEX idx_user_follows_follower ON user_follows(follower_id),
    INDEX idx_user_follows_following ON user_follows(following_id),
    INDEX idx_user_follows_followed_at ON user_follows(followed_at)
);

-- Feed items table for activity stream
CREATE TABLE IF NOT EXISTS feed_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN (
        'mix_published', 'mix_liked', 'mix_commented', 'mix_shared',
        'user_followed', 'collaboration_started', 'mix_version_released',
        'achievement_unlocked', 'contest_entry', 'live_session_started'
    )),
    
    -- Related entities
    mix_id UUID REFERENCES mixes(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    collaboration_id UUID REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    
    -- Item metadata
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Visibility and status
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
    is_featured BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    
    -- Engagement metrics
    view_count INTEGER DEFAULT 0,
    interaction_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    
    -- Indexes for efficient querying
    INDEX idx_feed_items_user_id ON feed_items(user_id),
    INDEX idx_feed_items_created_at ON feed_items(created_at DESC),
    INDEX idx_feed_items_type ON feed_items(item_type),
    INDEX idx_feed_items_mix_id ON feed_items(mix_id) WHERE mix_id IS NOT NULL,
    INDEX idx_feed_items_visibility ON feed_items(visibility) WHERE visibility = 'public',
    INDEX idx_feed_items_featured ON feed_items(is_featured) WHERE is_featured = true
);

-- Feed interactions table for tracking user engagement
CREATE TABLE IF NOT EXISTS feed_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feed_item_id UUID NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN (
        'view', 'click', 'share', 'hide', 'report'
    )),
    interaction_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint for certain interaction types
    UNIQUE(user_id, feed_item_id, interaction_type) WHERE interaction_type IN ('view', 'hide', 'report'),
    
    -- Indexes
    INDEX idx_feed_interactions_user ON feed_interactions(user_id),
    INDEX idx_feed_interactions_item ON feed_interactions(feed_item_id),
    INDEX idx_feed_interactions_type ON feed_interactions(interaction_type),
    INDEX idx_feed_interactions_created ON feed_interactions(created_at)
);

-- User interests table for personalization
CREATE TABLE IF NOT EXISTS user_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interest_type TEXT NOT NULL CHECK (interest_type IN (
        'genre', 'artist', 'bpm_range', 'mood', 'mix_length', 'technique'
    )),
    interest_value TEXT NOT NULL,
    weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
    source TEXT CHECK (source IN ('explicit', 'implicit', 'ml_derived')),
    
    -- Learning metrics
    positive_interactions INTEGER DEFAULT 0,
    negative_interactions INTEGER DEFAULT 0,
    last_interaction TIMESTAMPTZ DEFAULT now(),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint
    UNIQUE(user_id, interest_type, interest_value),
    
    -- Indexes
    INDEX idx_user_interests_user ON user_interests(user_id),
    INDEX idx_user_interests_type ON user_interests(interest_type),
    INDEX idx_user_interests_weight ON user_interests(weight DESC)
);

-- Trending topics table for discovery
CREATE TABLE IF NOT EXISTS trending_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_type TEXT NOT NULL CHECK (topic_type IN (
        'genre', 'artist', 'technique', 'event', 'hashtag', 'challenge'
    )),
    topic_value TEXT NOT NULL,
    topic_display_name TEXT NOT NULL,
    
    -- Trending metrics
    score DECIMAL(10,2) DEFAULT 0,
    velocity DECIMAL(10,2) DEFAULT 0, -- Rate of change
    peak_score DECIMAL(10,2) DEFAULT 0,
    
    -- Time windows
    time_window TEXT NOT NULL DEFAULT 'day' CHECK (time_window IN ('hour', 'day', 'week', 'month')),
    start_trending_at TIMESTAMPTZ DEFAULT now(),
    peak_at TIMESTAMPTZ,
    
    -- Associated content
    related_mixes INTEGER DEFAULT 0,
    related_users INTEGER DEFAULT 0,
    sample_mix_ids UUID[] DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_promoted BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint
    UNIQUE(topic_type, topic_value, time_window),
    
    -- Indexes
    INDEX idx_trending_topics_score ON trending_topics(score DESC) WHERE is_active = true,
    INDEX idx_trending_topics_type ON trending_topics(topic_type),
    INDEX idx_trending_topics_window ON trending_topics(time_window),
    INDEX idx_trending_topics_created ON trending_topics(created_at)
);

-- Discovery categories for organizing content
CREATE TABLE IF NOT EXISTS discovery_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name TEXT NOT NULL UNIQUE,
    category_slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    banner_url TEXT,
    
    -- Display settings
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Filtering criteria
    filter_rules JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Indexes
    INDEX idx_discovery_categories_order ON discovery_categories(display_order),
    INDEX idx_discovery_categories_featured ON discovery_categories(is_featured) WHERE is_featured = true
);

-- Mix discovery metadata for enhanced search
CREATE TABLE IF NOT EXISTS mix_discovery_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mix_id UUID NOT NULL REFERENCES mixes(id) ON DELETE CASCADE UNIQUE,
    
    -- Enhanced searchable fields
    search_vector tsvector,
    hashtags TEXT[] DEFAULT '{}',
    mentions UUID[] DEFAULT '{}', -- User mentions
    
    -- Discovery scores
    popularity_score DECIMAL(10,2) DEFAULT 0,
    quality_score DECIMAL(10,2) DEFAULT 0,
    freshness_score DECIMAL(10,2) DEFAULT 0,
    engagement_score DECIMAL(10,2) DEFAULT 0,
    
    -- Categorization
    primary_genre TEXT,
    secondary_genres TEXT[] DEFAULT '{}',
    moods TEXT[] DEFAULT '{}',
    techniques TEXT[] DEFAULT '{}',
    
    -- Technical attributes for filtering
    bpm_range INT4RANGE,
    key_signatures TEXT[] DEFAULT '{}',
    energy_range NUMRANGE,
    duration_range INT4RANGE,
    
    -- Discovery flags
    is_beginner_friendly BOOLEAN DEFAULT false,
    is_tutorial BOOLEAN DEFAULT false,
    is_live_recording BOOLEAN DEFAULT false,
    is_collaboration BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Indexes
    INDEX idx_mix_discovery_search ON mix_discovery_metadata USING gin(search_vector),
    INDEX idx_mix_discovery_hashtags ON mix_discovery_metadata USING gin(hashtags),
    INDEX idx_mix_discovery_genres ON mix_discovery_metadata USING gin(secondary_genres),
    INDEX idx_mix_discovery_bpm ON mix_discovery_metadata USING gist(bpm_range),
    INDEX idx_mix_discovery_scores ON mix_discovery_metadata(popularity_score DESC, quality_score DESC)
);

-- Recommendation queue for personalized content
CREATE TABLE IF NOT EXISTS recommendation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mix_id UUID NOT NULL REFERENCES mixes(id) ON DELETE CASCADE,
    
    -- Recommendation metadata
    algorithm_version TEXT NOT NULL,
    score DECIMAL(10,4) NOT NULL,
    reason_codes TEXT[] DEFAULT '{}',
    explanation_json JSONB DEFAULT '{}',
    
    -- User interaction
    is_seen BOOLEAN DEFAULT false,
    is_interacted BOOLEAN DEFAULT false,
    interaction_type TEXT,
    feedback TEXT CHECK (feedback IN ('positive', 'negative', 'neutral')),
    
    -- Queue management
    priority INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days',
    presented_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint to prevent duplicate recommendations
    UNIQUE(user_id, mix_id),
    
    -- Indexes
    INDEX idx_recommendation_queue_user ON recommendation_queue(user_id),
    INDEX idx_recommendation_queue_score ON recommendation_queue(score DESC) WHERE is_seen = false,
    INDEX idx_recommendation_queue_expires ON recommendation_queue(expires_at)
);

-- Functions for feed generation

-- Function to create feed item
CREATE OR REPLACE FUNCTION create_feed_item(
    p_user_id UUID,
    p_item_type TEXT,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_mix_id UUID DEFAULT NULL,
    p_target_user_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_feed_item_id UUID;
    v_thumbnail_url TEXT;
BEGIN
    -- Get thumbnail URL if mix is provided
    IF p_mix_id IS NOT NULL THEN
        SELECT cover_image_url INTO v_thumbnail_url
        FROM mixes WHERE id = p_mix_id;
    END IF;
    
    -- Insert feed item
    INSERT INTO feed_items (
        user_id, item_type, title, description,
        mix_id, target_user_id, thumbnail_url, metadata
    )
    VALUES (
        p_user_id, p_item_type, p_title, p_description,
        p_mix_id, p_target_user_id, v_thumbnail_url, p_metadata
    )
    RETURNING id INTO v_feed_item_id;
    
    RETURN v_feed_item_id;
END;
$$;

-- Function to follow/unfollow user
CREATE OR REPLACE FUNCTION toggle_follow(
    p_follower_id UUID,
    p_following_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_following BOOLEAN;
BEGIN
    -- Check if already following
    SELECT EXISTS(
        SELECT 1 FROM user_follows 
        WHERE follower_id = p_follower_id 
        AND following_id = p_following_id
    ) INTO v_is_following;
    
    IF v_is_following THEN
        -- Unfollow
        DELETE FROM user_follows 
        WHERE follower_id = p_follower_id 
        AND following_id = p_following_id;
        
        RETURN false;
    ELSE
        -- Follow
        INSERT INTO user_follows (follower_id, following_id)
        VALUES (p_follower_id, p_following_id);
        
        -- Create feed item
        PERFORM create_feed_item(
            p_follower_id,
            'user_followed',
            'Started following a new DJ',
            NULL,
            NULL,
            p_following_id,
            jsonb_build_object('action', 'follow')
        );
        
        RETURN true;
    END IF;
END;
$$;

-- Function to update user interests based on interactions
CREATE OR REPLACE FUNCTION update_user_interest(
    p_user_id UUID,
    p_interest_type TEXT,
    p_interest_value TEXT,
    p_is_positive BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO user_interests (
        user_id, interest_type, interest_value,
        positive_interactions, negative_interactions
    )
    VALUES (
        p_user_id, p_interest_type, p_interest_value,
        CASE WHEN p_is_positive THEN 1 ELSE 0 END,
        CASE WHEN NOT p_is_positive THEN 1 ELSE 0 END
    )
    ON CONFLICT (user_id, interest_type, interest_value) DO UPDATE SET
        positive_interactions = user_interests.positive_interactions + 
            CASE WHEN p_is_positive THEN 1 ELSE 0 END,
        negative_interactions = user_interests.negative_interactions + 
            CASE WHEN NOT p_is_positive THEN 1 ELSE 0 END,
        weight = CASE 
            WHEN (user_interests.positive_interactions + 1) > 
                 (user_interests.negative_interactions * 2) THEN
                LEAST(1.0, user_interests.weight + 0.1)
            ELSE
                GREATEST(0.0, user_interests.weight - 0.1)
        END,
        last_interaction = now(),
        updated_at = now();
END;
$$;

-- Function to update trending topics
CREATE OR REPLACE FUNCTION update_trending_topic(
    p_topic_type TEXT,
    p_topic_value TEXT,
    p_topic_display_name TEXT,
    p_increment DECIMAL DEFAULT 1.0
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_score DECIMAL;
    v_velocity DECIMAL;
BEGIN
    -- Get current score
    SELECT score INTO v_current_score
    FROM trending_topics
    WHERE topic_type = p_topic_type 
    AND topic_value = p_topic_value
    AND time_window = 'day'
    AND is_active = true;
    
    IF v_current_score IS NULL THEN
        -- Create new trending topic
        INSERT INTO trending_topics (
            topic_type, topic_value, topic_display_name,
            score, velocity
        )
        VALUES (
            p_topic_type, p_topic_value, p_topic_display_name,
            p_increment, p_increment
        );
    ELSE
        -- Update existing topic
        v_velocity := p_increment - (v_current_score * 0.1); -- Simple velocity calculation
        
        UPDATE trending_topics SET
            score = score + p_increment,
            velocity = v_velocity,
            peak_score = GREATEST(peak_score, score + p_increment),
            peak_at = CASE 
                WHEN score + p_increment > peak_score 
                THEN now() 
                ELSE peak_at 
            END,
            updated_at = now()
        WHERE topic_type = p_topic_type 
        AND topic_value = p_topic_value
        AND time_window = 'day'
        AND is_active = true;
    END IF;
END;
$$;

-- Function to get personalized feed for user
CREATE OR REPLACE FUNCTION get_user_feed(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    feed_item_id UUID,
    item_type TEXT,
    title TEXT,
    description TEXT,
    thumbnail_url TEXT,
    user_id UUID,
    user_display_name TEXT,
    user_avatar_url TEXT,
    mix_id UUID,
    created_at TIMESTAMPTZ,
    relevance_score DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH user_following AS (
        SELECT following_id
        FROM user_follows
        WHERE follower_id = p_user_id
    ),
    user_interests_weights AS (
        SELECT 
            interest_type,
            interest_value,
            weight
        FROM user_interests
        WHERE user_id = p_user_id
        AND weight > 0.3
    ),
    feed_scores AS (
        SELECT 
            fi.id,
            fi.item_type,
            fi.title,
            fi.description,
            fi.thumbnail_url,
            fi.user_id,
            p.display_name as user_display_name,
            p.avatar_url as user_avatar_url,
            fi.mix_id,
            fi.created_at,
            -- Calculate relevance score
            CASE
                -- Items from followed users get higher score
                WHEN fi.user_id IN (SELECT following_id FROM user_following) THEN 2.0
                -- Public items get base score
                WHEN fi.visibility = 'public' THEN 1.0
                ELSE 0.5
            END +
            -- Boost for matching interests
            COALESCE((
                SELECT SUM(ui.weight)
                FROM user_interests_weights ui
                WHERE 
                    (ui.interest_type = 'genre' AND ui.interest_value = m.genre) OR
                    (ui.interest_type = 'mood' AND ui.interest_value = ANY(mdm.moods))
            ), 0) +
            -- Recency boost (newer items score higher)
            CASE
                WHEN fi.created_at > now() - INTERVAL '1 hour' THEN 1.0
                WHEN fi.created_at > now() - INTERVAL '1 day' THEN 0.5
                WHEN fi.created_at > now() - INTERVAL '1 week' THEN 0.2
                ELSE 0.1
            END AS relevance_score
        FROM feed_items fi
        LEFT JOIN profiles p ON fi.user_id = p.id
        LEFT JOIN mixes m ON fi.mix_id = m.id
        LEFT JOIN mix_discovery_metadata mdm ON m.id = mdm.mix_id
        WHERE 
            fi.is_deleted = false
            AND fi.visibility IN ('public', 'followers')
            AND (fi.expires_at IS NULL OR fi.expires_at > now())
            AND (
                -- User's own items
                fi.user_id = p_user_id
                -- Items from followed users
                OR fi.user_id IN (SELECT following_id FROM user_following)
                -- Public items
                OR fi.visibility = 'public'
            )
    )
    SELECT 
        id,
        item_type,
        title,
        description,
        thumbnail_url,
        user_id,
        user_display_name,
        user_avatar_url,
        mix_id,
        created_at,
        relevance_score
    FROM feed_scores
    ORDER BY relevance_score DESC, created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Function to get trending content
CREATE OR REPLACE FUNCTION get_trending_content(
    p_topic_type TEXT DEFAULT NULL,
    p_time_window TEXT DEFAULT 'day',
    p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
    topic_id UUID,
    topic_type TEXT,
    topic_value TEXT,
    topic_display_name TEXT,
    score DECIMAL,
    velocity DECIMAL,
    related_mixes INTEGER,
    sample_mixes JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH trending_with_samples AS (
        SELECT 
            tt.id,
            tt.topic_type,
            tt.topic_value,
            tt.topic_display_name,
            tt.score,
            tt.velocity,
            tt.related_mixes,
            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', m.id,
                        'title', m.title,
                        'user_id', m.user_id,
                        'cover_image_url', m.cover_image_url,
                        'play_count', m.play_count
                    ) ORDER BY m.play_count DESC
                ) FILTER (WHERE m.id IS NOT NULL),
                '[]'::jsonb
            ) AS sample_mixes
        FROM trending_topics tt
        LEFT JOIN LATERAL (
            SELECT m.*
            FROM mixes m
            LEFT JOIN mix_discovery_metadata mdm ON m.id = mdm.mix_id
            WHERE 
                m.status = 'published'
                AND m.is_public = true
                AND (
                    (tt.topic_type = 'genre' AND (m.genre = tt.topic_value OR tt.topic_value = ANY(mdm.secondary_genres)))
                    OR (tt.topic_type = 'artist' AND tt.topic_value = ANY(m.tags))
                    OR (tt.topic_type = 'technique' AND tt.topic_value = ANY(mdm.techniques))
                    OR (tt.topic_type = 'hashtag' AND tt.topic_value = ANY(mdm.hashtags))
                )
            LIMIT 5
        ) m ON true
        WHERE 
            tt.is_active = true
            AND tt.time_window = p_time_window
            AND (p_topic_type IS NULL OR tt.topic_type = p_topic_type)
        GROUP BY 
            tt.id, tt.topic_type, tt.topic_value, tt.topic_display_name,
            tt.score, tt.velocity, tt.related_mixes
    )
    SELECT 
        id,
        topic_type,
        topic_value,
        topic_display_name,
        score,
        velocity,
        related_mixes,
        sample_mixes
    FROM trending_with_samples
    ORDER BY score DESC
    LIMIT p_limit;
END;
$$;

-- Trigger to update search vector for mix discovery
CREATE OR REPLACE FUNCTION update_mix_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE mix_discovery_metadata SET
        search_vector = to_tsvector('english', 
            COALESCE(NEW.title, '') || ' ' ||
            COALESCE(NEW.description, '') || ' ' ||
            COALESCE(NEW.genre, '') || ' ' ||
            COALESCE(array_to_string(NEW.tags, ' '), '')
        ),
        updated_at = now()
    WHERE mix_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mix_search_vector_trigger
    AFTER INSERT OR UPDATE ON mixes
    FOR EACH ROW EXECUTE FUNCTION update_mix_search_vector();

-- Trigger to create feed items for mix events
CREATE OR REPLACE FUNCTION create_mix_feed_items()
RETURNS TRIGGER AS $$
BEGIN
    -- Create feed item for published mixes
    IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
        PERFORM create_feed_item(
            NEW.user_id,
            'mix_published',
            'Published a new mix: ' || NEW.title,
            NEW.description,
            NEW.id,
            NULL,
            jsonb_build_object(
                'genre', NEW.genre,
                'duration', NEW.duration_seconds,
                'track_count', NEW.total_tracks
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_mix_feed_items_trigger
    AFTER INSERT OR UPDATE ON mixes
    FOR EACH ROW EXECUTE FUNCTION create_mix_feed_items();

-- Views for easier querying

-- User feed view
CREATE OR REPLACE VIEW user_feed AS
SELECT 
    fi.*,
    u.display_name as user_display_name,
    u.avatar_url as user_avatar_url,
    tu.display_name as target_user_display_name,
    tu.avatar_url as target_user_avatar_url,
    m.title as mix_title,
    m.genre as mix_genre,
    m.duration_seconds as mix_duration
FROM feed_items fi
LEFT JOIN profiles u ON fi.user_id = u.id
LEFT JOIN profiles tu ON fi.target_user_id = tu.id
LEFT JOIN mixes m ON fi.mix_id = m.id
WHERE fi.is_deleted = false;

-- Trending view with enriched data
CREATE OR REPLACE VIEW trending_now AS
SELECT 
    tt.*,
    COUNT(DISTINCT mdm.mix_id) as active_mixes,
    array_agg(DISTINCT m.title) FILTER (WHERE m.title IS NOT NULL) as sample_mix_titles
FROM trending_topics tt
LEFT JOIN mix_discovery_metadata mdm ON 
    (tt.topic_type = 'genre' AND tt.topic_value = mdm.primary_genre) OR
    (tt.topic_type = 'genre' AND tt.topic_value = ANY(mdm.secondary_genres))
LEFT JOIN mixes m ON mdm.mix_id = m.id
WHERE tt.is_active = true
GROUP BY tt.id;

-- Row Level Security

-- Enable RLS on all tables
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mix_discovery_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_queue ENABLE ROW LEVEL SECURITY;

-- User follows policies
CREATE POLICY "Users can view their own follows" ON user_follows
    FOR SELECT USING (follower_id = auth.uid() OR following_id = auth.uid());

CREATE POLICY "Users can manage their own follows" ON user_follows
    FOR ALL USING (follower_id = auth.uid());

-- Feed items policies
CREATE POLICY "Public feed items are visible to all" ON feed_items
    FOR SELECT USING (visibility = 'public' OR user_id = auth.uid());

CREATE POLICY "Users can create their own feed items" ON feed_items
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own feed items" ON feed_items
    FOR UPDATE USING (user_id = auth.uid());

-- Feed interactions policies
CREATE POLICY "Users can view their own interactions" ON feed_interactions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own interactions" ON feed_interactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- User interests policies
CREATE POLICY "Users can view their own interests" ON user_interests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own interests" ON user_interests
    FOR ALL USING (user_id = auth.uid());

-- Trending topics policies (public read)
CREATE POLICY "Trending topics are public" ON trending_topics
    FOR SELECT USING (true);

-- Discovery categories policies (public read)
CREATE POLICY "Discovery categories are public" ON discovery_categories
    FOR SELECT USING (is_active = true);

-- Mix discovery metadata policies
CREATE POLICY "Mix discovery data follows mix visibility" ON mix_discovery_metadata
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM mixes 
            WHERE mixes.id = mix_discovery_metadata.mix_id 
            AND (mixes.is_public = true OR mixes.user_id = auth.uid())
        )
    );

-- Recommendation queue policies
CREATE POLICY "Users can view their own recommendations" ON recommendation_queue
    FOR SELECT USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_feed_items_user_timeline ON feed_items(user_id, created_at DESC)
    WHERE is_deleted = false;

CREATE INDEX idx_mix_discovery_composite ON mix_discovery_metadata(
    popularity_score DESC,
    quality_score DESC,
    freshness_score DESC
);

-- Function to discover mixes by criteria
CREATE OR REPLACE FUNCTION discover_mixes(
    p_genres TEXT[] DEFAULT NULL,
    p_bpm_min INTEGER DEFAULT NULL,
    p_bpm_max INTEGER DEFAULT NULL,
    p_key_signatures TEXT[] DEFAULT NULL,
    p_moods TEXT[] DEFAULT NULL,
    p_min_duration INTEGER DEFAULT NULL,
    p_max_duration INTEGER DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'popularity',
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    mix_id UUID,
    title TEXT,
    description TEXT,
    user_id UUID,
    genre TEXT,
    bpm INTEGER,
    key_signature TEXT,
    duration_seconds INTEGER,
    cover_image_url TEXT,
    popularity_score DECIMAL,
    quality_score DECIMAL,
    match_score DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH scored_mixes AS (
        SELECT 
            m.id,
            m.title,
            m.description,
            m.user_id,
            m.genre,
            m.bpm,
            m.key_signature,
            m.duration_seconds,
            m.cover_image_url,
            mdm.popularity_score,
            mdm.quality_score,
            -- Calculate match score based on criteria
            (
                -- Genre match
                CASE 
                    WHEN p_genres IS NULL THEN 0
                    WHEN m.genre = ANY(p_genres) THEN 3.0
                    WHEN mdm.secondary_genres && p_genres THEN 2.0
                    ELSE 0
                END +
                -- BPM match
                CASE
                    WHEN p_bpm_min IS NULL AND p_bpm_max IS NULL THEN 0
                    WHEN m.bpm BETWEEN COALESCE(p_bpm_min, 0) AND COALESCE(p_bpm_max, 999) THEN 2.0
                    ELSE 0
                END +
                -- Key match
                CASE
                    WHEN p_key_signatures IS NULL THEN 0
                    WHEN m.key_signature = ANY(p_key_signatures) THEN 2.0
                    WHEN mdm.key_signatures && p_key_signatures THEN 1.0
                    ELSE 0
                END +
                -- Mood match
                CASE
                    WHEN p_moods IS NULL THEN 0
                    WHEN mdm.moods && p_moods THEN 1.5
                    ELSE 0
                END
            ) AS match_score
        FROM mixes m
        INNER JOIN mix_discovery_metadata mdm ON m.id = mdm.mix_id
        WHERE 
            m.status = 'published'
            AND m.is_public = true
            AND (
                -- Apply filters
                (p_genres IS NULL OR m.genre = ANY(p_genres) OR mdm.secondary_genres && p_genres)
                AND (p_bpm_min IS NULL OR m.bpm >= p_bpm_min)
                AND (p_bpm_max IS NULL OR m.bpm <= p_bpm_max)
                AND (p_key_signatures IS NULL OR m.key_signature = ANY(p_key_signatures) OR mdm.key_signatures && p_key_signatures)
                AND (p_moods IS NULL OR mdm.moods && p_moods)
                AND (p_min_duration IS NULL OR m.duration_seconds >= p_min_duration)
                AND (p_max_duration IS NULL OR m.duration_seconds <= p_max_duration)
            )
    )
    SELECT 
        mix_id,
        title,
        description,
        user_id,
        genre,
        bpm,
        key_signature,
        duration_seconds,
        cover_image_url,
        popularity_score,
        quality_score,
        match_score
    FROM scored_mixes
    ORDER BY
        CASE p_sort_by
            WHEN 'popularity' THEN popularity_score
            WHEN 'quality' THEN quality_score
            WHEN 'relevance' THEN match_score
            WHEN 'newest' THEN EXTRACT(EPOCH FROM (now() - created_at))
            ELSE popularity_score
        END DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Function to get user recommendations based on interests and behavior
CREATE OR REPLACE FUNCTION generate_recommendations(
    p_user_id UUID,
    p_algorithm_version TEXT DEFAULT 'v1',
    p_limit INTEGER DEFAULT 20
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_genres TEXT[];
    v_user_bpm_range INT4RANGE;
    v_user_moods TEXT[];
BEGIN
    -- Get user preferences
    SELECT 
        array_agg(DISTINCT interest_value) FILTER (WHERE interest_type = 'genre'),
        int4range(
            MIN(CASE WHEN interest_type = 'bpm_range' THEN interest_value::INTEGER END),
            MAX(CASE WHEN interest_type = 'bpm_range' THEN interest_value::INTEGER END)
        ),
        array_agg(DISTINCT interest_value) FILTER (WHERE interest_type = 'mood')
    INTO v_user_genres, v_user_bpm_range, v_user_moods
    FROM user_interests
    WHERE user_id = p_user_id
    AND weight > 0.5;
    
    -- Clear old recommendations
    DELETE FROM recommendation_queue
    WHERE user_id = p_user_id
    AND (expires_at < now() OR is_seen = true);
    
    -- Generate new recommendations
    INSERT INTO recommendation_queue (
        user_id,
        mix_id,
        algorithm_version,
        score,
        reason_codes,
        explanation_json,
        priority
    )
    SELECT 
        p_user_id,
        m.id,
        p_algorithm_version,
        -- Calculate recommendation score
        (
            COALESCE(mdm.quality_score, 0) * 0.3 +
            COALESCE(mdm.popularity_score, 0) * 0.2 +
            COALESCE(mdm.freshness_score, 0) * 0.2 +
            -- Genre match
            CASE 
                WHEN m.genre = ANY(v_user_genres) THEN 0.3
                WHEN mdm.secondary_genres && v_user_genres THEN 0.2
                ELSE 0
            END
        ) AS score,
        -- Reason codes
        ARRAY[
            CASE WHEN m.genre = ANY(v_user_genres) THEN 'genre_match' END,
            CASE WHEN mdm.bpm_range && v_user_bpm_range THEN 'bpm_match' END,
            CASE WHEN mdm.moods && v_user_moods THEN 'mood_match' END,
            CASE WHEN mdm.popularity_score > 0.7 THEN 'trending' END,
            CASE WHEN mdm.quality_score > 0.8 THEN 'high_quality' END
        ] FILTER (WHERE CASE IS NOT NULL) AS reason_codes,
        -- Explanation
        jsonb_build_object(
            'genre_match', m.genre = ANY(v_user_genres),
            'bpm_compatible', mdm.bpm_range && v_user_bpm_range,
            'mood_alignment', mdm.moods && v_user_moods,
            'popularity', mdm.popularity_score,
            'quality', mdm.quality_score
        ) AS explanation_json,
        -- Priority (higher scores get higher priority)
        CASE
            WHEN mdm.quality_score > 0.8 AND mdm.popularity_score > 0.7 THEN 3
            WHEN m.genre = ANY(v_user_genres) THEN 2
            ELSE 1
        END AS priority
    FROM mixes m
    INNER JOIN mix_discovery_metadata mdm ON m.id = mdm.mix_id
    WHERE 
        m.status = 'published'
        AND m.is_public = true
        AND m.user_id != p_user_id -- Don't recommend user's own mixes
        AND NOT EXISTS ( -- Don't recommend already queued
            SELECT 1 FROM recommendation_queue rq
            WHERE rq.user_id = p_user_id
            AND rq.mix_id = m.id
        )
        AND NOT EXISTS ( -- Don't recommend recently played
            SELECT 1 FROM mix_plays mp
            WHERE mp.user_id = p_user_id
            AND mp.mix_id = m.id
            AND mp.played_at > now() - INTERVAL '7 days'
        )
    ORDER BY score DESC
    LIMIT p_limit
    ON CONFLICT (user_id, mix_id) DO NOTHING;
END;
$$;

-- Periodic job to update trending topics (would be called by a cron job)
CREATE OR REPLACE FUNCTION update_all_trending_topics()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Decay existing scores
    UPDATE trending_topics
    SET score = score * 0.95,
        velocity = velocity * 0.9
    WHERE is_active = true;
    
    -- Deactivate topics with very low scores
    UPDATE trending_topics
    SET is_active = false
    WHERE score < 0.1
    AND is_active = true;
    
    -- Update trending genres
    INSERT INTO trending_topics (topic_type, topic_value, topic_display_name, score, time_window)
    SELECT 
        'genre',
        genre,
        genre,
        COUNT(*)::DECIMAL,
        'day'
    FROM mixes
    WHERE created_at > now() - INTERVAL '1 day'
    AND status = 'published'
    GROUP BY genre
    ON CONFLICT (topic_type, topic_value, time_window) DO UPDATE
    SET score = trending_topics.score + EXCLUDED.score,
        updated_at = now();
END;
$$;

COMMIT;