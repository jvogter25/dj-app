-- Enhanced Profiles Table Migration
-- Adds comprehensive user profile fields for DJ-specific features

-- First, add new columns to the existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dj_stats JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(verified);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON profiles(last_active_at);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create user_skills table for DJ skills tracking
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    skill_category TEXT NOT NULL, -- 'mixing', 'effects', 'reading_crowd', 'technical', 'music_knowledge'
    skill_name TEXT NOT NULL,
    proficiency_level INTEGER CHECK (proficiency_level >= 1 AND proficiency_level <= 5) NOT NULL,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_practiced TIMESTAMP WITH TIME ZONE,
    practice_hours INTEGER DEFAULT 0,
    endorsements INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, skill_category, skill_name)
);

CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_category ON user_skills(skill_category);
CREATE INDEX idx_user_skills_proficiency ON user_skills(proficiency_level);

-- Create trigger for user_skills updated_at
CREATE TRIGGER update_user_skills_updated_at
    BEFORE UPDATE ON user_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    achievement_type TEXT NOT NULL, -- 'mix_count', 'hours_played', 'followers', 'likes_received', 'perfect_transitions'
    achievement_name TEXT NOT NULL,
    achievement_description TEXT,
    icon_url TEXT,
    requirements JSONB DEFAULT '{}',
    progress JSONB DEFAULT '{}',
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    points_awarded INTEGER DEFAULT 0,
    rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_type ON user_achievements(achievement_type);
CREATE INDEX idx_user_achievements_completed ON user_achievements(completed);
CREATE INDEX idx_user_achievements_rarity ON user_achievements(rarity);

-- Create trigger for user_achievements updated_at
CREATE TRIGGER update_user_achievements_updated_at
    BEFORE UPDATE ON user_achievements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create user_equipment table for DJ equipment tracking
CREATE TABLE IF NOT EXISTS user_equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    equipment_type TEXT NOT NULL, -- 'controller', 'mixer', 'speakers', 'headphones', 'software'
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    purchase_date DATE,
    condition TEXT DEFAULT 'good', -- 'excellent', 'good', 'fair', 'poor'
    notes TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_equipment_user_id ON user_equipment(user_id);
CREATE INDEX idx_user_equipment_type ON user_equipment(equipment_type);
CREATE INDEX idx_user_equipment_brand ON user_equipment(brand);
CREATE INDEX idx_user_equipment_is_primary ON user_equipment(is_primary);

-- Create trigger for user_equipment updated_at
CREATE TRIGGER update_user_equipment_updated_at
    BEFORE UPDATE ON user_equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create user_venues table for venue relationships
CREATE TABLE IF NOT EXISTS user_venues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    venue_name TEXT NOT NULL,
    venue_type TEXT NOT NULL, -- 'nightclub', 'bar', 'restaurant', 'private', 'festival', 'radio'
    location TEXT,
    relationship_type TEXT NOT NULL, -- 'resident', 'regular', 'guest', 'owner', 'booker'
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    description TEXT,
    contact_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_venues_user_id ON user_venues(user_id);
CREATE INDEX idx_user_venues_type ON user_venues(venue_type);
CREATE INDEX idx_user_venues_relationship ON user_venues(relationship_type);
CREATE INDEX idx_user_venues_current ON user_venues(is_current);

-- Create trigger for user_venues updated_at
CREATE TRIGGER update_user_venues_updated_at
    BEFORE UPDATE ON user_venues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create user_genres table for genre expertise
CREATE TABLE IF NOT EXISTS user_genres (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    genre TEXT NOT NULL,
    expertise_level INTEGER CHECK (expertise_level >= 1 AND expertise_level <= 5) NOT NULL,
    years_experience INTEGER DEFAULT 0,
    favorite_artists TEXT[],
    signature_tracks TEXT[],
    is_specialty BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, genre)
);

CREATE INDEX idx_user_genres_user_id ON user_genres(user_id);
CREATE INDEX idx_user_genres_genre ON user_genres(genre);
CREATE INDEX idx_user_genres_expertise ON user_genres(expertise_level);
CREATE INDEX idx_user_genres_specialty ON user_genres(is_specialty);

-- Create trigger for user_genres updated_at
CREATE TRIGGER update_user_genres_updated_at
    BEFORE UPDATE ON user_genres
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create user_following table for DJ network
CREATE TABLE IF NOT EXISTS user_following (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    relationship_type TEXT DEFAULT 'follow', -- 'follow', 'friend', 'mentor', 'student', 'collaborator'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK(follower_id != following_id)
);

CREATE INDEX idx_user_following_follower ON user_following(follower_id);
CREATE INDEX idx_user_following_following ON user_following(following_id);
CREATE INDEX idx_user_following_type ON user_following(relationship_type);

-- Create user_notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    notification_type TEXT NOT NULL, -- 'follow', 'like', 'comment', 'mix_shared', 'achievement', 'system'
    title TEXT NOT NULL,
    message TEXT,
    action_url TEXT,
    action_data JSONB DEFAULT '{}',
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_type ON user_notifications(notification_type);
CREATE INDEX idx_user_notifications_read ON user_notifications(read_at);
CREATE INDEX idx_user_notifications_created ON user_notifications(created_at);
CREATE INDEX idx_user_notifications_priority ON user_notifications(priority);

-- Create user_sessions table for analytics
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_type TEXT NOT NULL, -- 'practice', 'live', 'recording', 'streaming'
    venue_id UUID REFERENCES user_venues(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    tracks_played INTEGER DEFAULT 0,
    transitions_made INTEGER DEFAULT 0,
    average_transition_quality DECIMAL(3, 2),
    genres_played TEXT[],
    equipment_used JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    crowd_response JSONB DEFAULT '{}',
    notes TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_type ON user_sessions(session_type);
CREATE INDEX idx_user_sessions_venue ON user_sessions(venue_id);
CREATE INDEX idx_user_sessions_started ON user_sessions(started_at);
CREATE INDEX idx_user_sessions_public ON user_sessions(is_public);

-- Create trigger for user_sessions updated_at
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default achievements
INSERT INTO user_achievements (achievement_type, achievement_name, achievement_description, requirements, points_awarded, rarity) VALUES
    ('mix_count', 'First Mix', 'Create your first mix', '{"mixes_created": 1}', 100, 'common'),
    ('mix_count', 'Mix Master', 'Create 10 mixes', '{"mixes_created": 10}', 500, 'common'),
    ('mix_count', 'Prolific Creator', 'Create 50 mixes', '{"mixes_created": 50}', 2500, 'rare'),
    ('mix_count', 'Mix Legend', 'Create 100 mixes', '{"mixes_created": 100}', 5000, 'epic'),
    ('hours_played', 'Getting Started', 'Play for 1 hour total', '{"hours_played": 1}', 50, 'common'),
    ('hours_played', 'Dedicated DJ', 'Play for 10 hours total', '{"hours_played": 10}', 250, 'common'),
    ('hours_played', 'Professional', 'Play for 100 hours total', '{"hours_played": 100}', 2500, 'rare'),
    ('hours_played', 'Master DJ', 'Play for 500 hours total', '{"hours_played": 500}', 10000, 'legendary'),
    ('perfect_transitions', 'Smooth Operator', 'Make 10 perfect transitions', '{"perfect_transitions": 10}', 300, 'common'),
    ('perfect_transitions', 'Transition Master', 'Make 100 perfect transitions', '{"perfect_transitions": 100}', 1500, 'rare'),
    ('followers', 'Popular DJ', 'Get 100 followers', '{"followers_count": 100}', 1000, 'rare'),
    ('followers', 'Influencer', 'Get 1000 followers', '{"followers_count": 1000}', 5000, 'epic'),
    ('likes_received', 'Crowd Pleaser', 'Receive 100 likes on your mixes', '{"total_likes": 100}', 500, 'common'),
    ('likes_received', 'Fan Favorite', 'Receive 1000 likes on your mixes', '{"total_likes": 1000}', 2500, 'rare')
ON CONFLICT DO NOTHING;

-- Create RLS policies
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_following ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for user_skills
CREATE POLICY "Users can view their own skills" ON user_skills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own skills" ON user_skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own skills" ON user_skills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own skills" ON user_skills FOR DELETE USING (auth.uid() = user_id);

-- Policies for user_achievements
CREATE POLICY "Users can view their own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert achievements" ON user_achievements FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update achievements" ON user_achievements FOR UPDATE USING (true);

-- Policies for user_equipment
CREATE POLICY "Users can view their own equipment" ON user_equipment FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public equipment" ON user_equipment FOR SELECT USING (is_public = true);
CREATE POLICY "Users can insert their own equipment" ON user_equipment FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own equipment" ON user_equipment FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own equipment" ON user_equipment FOR DELETE USING (auth.uid() = user_id);

-- Policies for user_venues
CREATE POLICY "Users can view their own venues" ON user_venues FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own venues" ON user_venues FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own venues" ON user_venues FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own venues" ON user_venues FOR DELETE USING (auth.uid() = user_id);

-- Policies for user_genres
CREATE POLICY "Users can view their own genres" ON user_genres FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own genres" ON user_genres FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own genres" ON user_genres FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own genres" ON user_genres FOR DELETE USING (auth.uid() = user_id);

-- Policies for user_following
CREATE POLICY "Users can view their follows" ON user_following FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);
CREATE POLICY "Users can follow others" ON user_following FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON user_following FOR DELETE USING (auth.uid() = follower_id);

-- Policies for user_notifications
CREATE POLICY "Users can view their own notifications" ON user_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON user_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their notifications" ON user_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their notifications" ON user_notifications FOR DELETE USING (auth.uid() = user_id);

-- Policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public sessions" ON user_sessions FOR SELECT USING (is_public = true);
CREATE POLICY "Users can insert their own sessions" ON user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON user_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sessions" ON user_sessions FOR DELETE USING (auth.uid() = user_id);

-- Create functions for common operations
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_mixes', COALESCE((SELECT COUNT(*) FROM mixes WHERE user_id = user_uuid), 0),
        'total_sessions', COALESCE((SELECT COUNT(*) FROM user_sessions WHERE user_id = user_uuid), 0),
        'total_hours', COALESCE((SELECT SUM(duration_minutes) FROM user_sessions WHERE user_id = user_uuid AND ended_at IS NOT NULL), 0),
        'avg_transition_quality', COALESCE((SELECT AVG(average_transition_quality) FROM user_sessions WHERE user_id = user_uuid AND average_transition_quality IS NOT NULL), 0),
        'followers_count', COALESCE((SELECT COUNT(*) FROM user_following WHERE following_id = user_uuid), 0),
        'following_count', COALESCE((SELECT COUNT(*) FROM user_following WHERE follower_id = user_uuid), 0),
        'achievements_count', COALESCE((SELECT COUNT(*) FROM user_achievements WHERE user_id = user_uuid AND completed = true), 0),
        'total_points', COALESCE((SELECT SUM(points_awarded) FROM user_achievements WHERE user_id = user_uuid AND completed = true), 0)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(user_uuid UUID)
RETURNS void AS $$
DECLARE
    user_stats JSON;
    achievement RECORD;
BEGIN
    -- Get current user stats
    SELECT get_user_stats(user_uuid) INTO user_stats;
    
    -- Check mix count achievements
    FOR achievement IN 
        SELECT * FROM user_achievements 
        WHERE achievement_type = 'mix_count' 
        AND user_id = user_uuid 
        AND completed = false
    LOOP
        IF (user_stats->>'total_mixes')::INTEGER >= (achievement.requirements->>'mixes_created')::INTEGER THEN
            UPDATE user_achievements 
            SET completed = true, completed_at = NOW(), progress = json_build_object('current', user_stats->>'total_mixes')
            WHERE id = achievement.id;
        END IF;
    END LOOP;
    
    -- Check hours played achievements
    FOR achievement IN 
        SELECT * FROM user_achievements 
        WHERE achievement_type = 'hours_played' 
        AND user_id = user_uuid 
        AND completed = false
    LOOP
        IF ((user_stats->>'total_hours')::INTEGER / 60) >= (achievement.requirements->>'hours_played')::INTEGER THEN
            UPDATE user_achievements 
            SET completed = true, completed_at = NOW(), progress = json_build_object('current', (user_stats->>'total_hours')::INTEGER / 60)
            WHERE id = achievement.id;
        END IF;
    END LOOP;
    
    -- Check followers achievements
    FOR achievement IN 
        SELECT * FROM user_achievements 
        WHERE achievement_type = 'followers' 
        AND user_id = user_uuid 
        AND completed = false
    LOOP
        IF (user_stats->>'followers_count')::INTEGER >= (achievement.requirements->>'followers_count')::INTEGER THEN
            UPDATE user_achievements 
            SET completed = true, completed_at = NOW(), progress = json_build_object('current', user_stats->>'followers_count')
            WHERE id = achievement.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user profile with stats
CREATE OR REPLACE FUNCTION get_complete_user_profile(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    profile_data JSON;
BEGIN
    SELECT json_build_object(
        'profile', row_to_json(p),
        'stats', get_user_stats(user_uuid),
        'skills', (
            SELECT json_agg(row_to_json(s)) 
            FROM user_skills s 
            WHERE s.user_id = user_uuid
        ),
        'achievements', (
            SELECT json_agg(row_to_json(a)) 
            FROM user_achievements a 
            WHERE a.user_id = user_uuid AND a.completed = true
        ),
        'genres', (
            SELECT json_agg(row_to_json(g)) 
            FROM user_genres g 
            WHERE g.user_id = user_uuid
        ),
        'equipment', (
            SELECT json_agg(row_to_json(e)) 
            FROM user_equipment e 
            WHERE e.user_id = user_uuid AND e.is_public = true
        ),
        'venues', (
            SELECT json_agg(row_to_json(v)) 
            FROM user_venues v 
            WHERE v.user_id = user_uuid AND v.is_current = true
        )
    ) INTO profile_data
    FROM profiles p
    WHERE p.id = user_uuid;
    
    RETURN profile_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance on JSONB columns
CREATE INDEX IF NOT EXISTS idx_profiles_social_links ON profiles USING GIN (social_links);
CREATE INDEX IF NOT EXISTS idx_profiles_dj_stats ON profiles USING GIN (dj_stats);
CREATE INDEX IF NOT EXISTS idx_profiles_preferences ON profiles USING GIN (preferences);
CREATE INDEX IF NOT EXISTS idx_user_achievements_requirements ON user_achievements USING GIN (requirements);
CREATE INDEX IF NOT EXISTS idx_user_achievements_progress ON user_achievements USING GIN (progress);
CREATE INDEX IF NOT EXISTS idx_user_sessions_equipment ON user_sessions USING GIN (equipment_used);
CREATE INDEX IF NOT EXISTS idx_user_sessions_metrics ON user_sessions USING GIN (performance_metrics);

-- Add comments for documentation
COMMENT ON TABLE profiles IS 'Enhanced user profiles with DJ-specific features';
COMMENT ON TABLE user_skills IS 'DJ skills and proficiency levels';
COMMENT ON TABLE user_achievements IS 'Gamification achievements and progress tracking';
COMMENT ON TABLE user_equipment IS 'DJ equipment inventory and setup information';
COMMENT ON TABLE user_venues IS 'Venue relationships and booking history';
COMMENT ON TABLE user_genres IS 'Genre expertise and specializations';
COMMENT ON TABLE user_following IS 'DJ network and social connections';
COMMENT ON TABLE user_notifications IS 'In-app notifications and alerts';
COMMENT ON TABLE user_sessions IS 'DJ session tracking and analytics';

COMMENT ON FUNCTION get_user_stats(UUID) IS 'Returns comprehensive user statistics as JSON';
COMMENT ON FUNCTION check_and_award_achievements(UUID) IS 'Checks progress and awards completed achievements';
COMMENT ON FUNCTION get_complete_user_profile(UUID) IS 'Returns complete user profile with all related data';