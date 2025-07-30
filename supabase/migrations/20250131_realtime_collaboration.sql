-- Supabase Migration: Real-time Collaboration Infrastructure
-- Create tables and functions for collaborative mix editing

-- Enable realtime for collaboration tables
BEGIN;

-- Collaboration events table for event sourcing
CREATE TABLE IF NOT EXISTS collaboration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mix_id UUID NOT NULL REFERENCES mixes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'track_added', 'track_removed', 'track_modified', 'track_reordered',
        'effect_applied', 'transition_changed', 'metadata_updated',
        'user_joined', 'user_left', 'cursor_moved', 'selection_changed', 'playback_sync'
    )),
    event_data JSONB NOT NULL DEFAULT '{}',
    conflict_resolution JSONB,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Index for efficient querying
    INDEX idx_collaboration_events_mix_id ON collaboration_events(mix_id),
    INDEX idx_collaboration_events_created_at ON collaboration_events(created_at),
    INDEX idx_collaboration_events_type ON collaboration_events(event_type)
);

-- Mix collaborators table for permissions and access control
CREATE TABLE IF NOT EXISTS mix_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mix_id UUID NOT NULL REFERENCES mixes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'viewer' CHECK (permission IN ('viewer', 'editor', 'admin')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    last_active TIMESTAMPTZ DEFAULT now(),
    is_online BOOLEAN DEFAULT false,
    
    -- Enhanced permission fields
    custom_permissions JSONB,
    expires_at TIMESTAMPTZ,
    action_count INTEGER DEFAULT 0,
    last_action_at TIMESTAMPTZ,
    
    -- Cursor and selection state for real-time collaboration
    cursor_position JSONB,
    selection_range JSONB,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint to prevent duplicate collaborators
    UNIQUE(mix_id, user_id),
    
    -- Index for efficient querying
    INDEX idx_mix_collaborators_mix_id ON mix_collaborators(mix_id),
    INDEX idx_mix_collaborators_user_id ON mix_collaborators(user_id),
    INDEX idx_mix_collaborators_online ON mix_collaborators(is_online) WHERE is_online = true,
    INDEX idx_mix_collaborators_expires ON mix_collaborators(expires_at) WHERE expires_at IS NOT NULL
);

-- Collaboration sessions table for active sessions
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mix_id UUID NOT NULL REFERENCES mixes(id) ON DELETE CASCADE,
    host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_name TEXT,
    is_active BOOLEAN DEFAULT true,
    max_collaborators INTEGER DEFAULT 10,
    current_collaborators INTEGER DEFAULT 0,
    
    -- Session configuration
    settings JSONB DEFAULT '{}',
    
    -- Auto-save configuration
    auto_save_enabled BOOLEAN DEFAULT true,
    auto_save_interval INTEGER DEFAULT 30, -- seconds
    last_auto_save TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    
    -- Index for efficient querying
    INDEX idx_collaboration_sessions_mix_id ON collaboration_sessions(mix_id),
    INDEX idx_collaboration_sessions_active ON collaboration_sessions(is_active) WHERE is_active = true
);

-- Conflict resolution table for handling edit conflicts
CREATE TABLE IF NOT EXISTS collaboration_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mix_id UUID NOT NULL REFERENCES mixes(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES collaboration_events(id) ON DELETE CASCADE,
    conflicting_event_id UUID NOT NULL REFERENCES collaboration_events(id) ON DELETE CASCADE,
    
    -- Conflict details
    conflict_type TEXT NOT NULL,
    resolution_strategy TEXT CHECK (resolution_strategy IN ('manual', 'last_write_wins', 'merge')),
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    
    -- Index for efficient querying
    INDEX idx_collaboration_conflicts_mix_id ON collaboration_conflicts(mix_id),
    INDEX idx_collaboration_conflicts_resolved ON collaboration_conflicts(resolved_at) WHERE resolved_at IS NULL
);

-- Add collaboration columns to existing mixes table
ALTER TABLE mixes ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT false;
ALTER TABLE mixes ADD COLUMN IF NOT EXISTS collaboration_enabled BOOLEAN DEFAULT true;
ALTER TABLE mixes ADD COLUMN IF NOT EXISTS max_collaborators INTEGER DEFAULT 5;
ALTER TABLE mixes ADD COLUMN IF NOT EXISTS collaboration_settings JSONB DEFAULT '{}';

-- Create updated_at trigger for collaboration tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_mix_collaborators_updated_at 
    BEFORE UPDATE ON mix_collaborators 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaboration_sessions_updated_at 
    BEFORE UPDATE ON collaboration_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update collaborator count in sessions
CREATE OR REPLACE FUNCTION update_collaboration_session_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE collaboration_sessions 
        SET current_collaborators = (
            SELECT COUNT(*) 
            FROM mix_collaborators 
            WHERE mix_id = NEW.mix_id AND is_online = true
        )
        WHERE mix_id = NEW.mix_id AND is_active = true;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE collaboration_sessions 
        SET current_collaborators = (
            SELECT COUNT(*) 
            FROM mix_collaborators 
            WHERE mix_id = OLD.mix_id AND is_online = true
        )
        WHERE mix_id = OLD.mix_id AND is_active = true;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language plpgsql;

CREATE TRIGGER update_session_collaborator_count
    AFTER INSERT OR UPDATE OR DELETE ON mix_collaborators
    FOR EACH ROW EXECUTE FUNCTION update_collaboration_session_count();

-- Function to automatically create collaboration session when mix becomes collaborative
CREATE OR REPLACE FUNCTION create_collaboration_session()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_collaborative = true AND (OLD.is_collaborative IS NULL OR OLD.is_collaborative = false) THEN
        INSERT INTO collaboration_sessions (mix_id, host_user_id, session_name)
        VALUES (NEW.id, NEW.user_id, NEW.title || ' - Collaboration Session');
        
        -- Add the mix owner as an admin collaborator
        INSERT INTO mix_collaborators (mix_id, user_id, permission, accepted_at)
        VALUES (NEW.id, NEW.user_id, 'admin', now())
        ON CONFLICT (mix_id, user_id) DO UPDATE SET
            permission = 'admin',
            accepted_at = COALESCE(mix_collaborators.accepted_at, now());
    END IF;
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER create_collaboration_session_trigger
    AFTER UPDATE ON mixes
    FOR EACH ROW EXECUTE FUNCTION create_collaboration_session();

-- Row Level Security (RLS) policies

-- Enable RLS on all collaboration tables
ALTER TABLE collaboration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mix_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_conflicts ENABLE ROW LEVEL SECURITY;

-- Collaboration events policies
CREATE POLICY "Users can view collaboration events for mixes they collaborate on" ON collaboration_events
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM mix_collaborators 
        WHERE mix_collaborators.mix_id = collaboration_events.mix_id 
        AND mix_collaborators.user_id = auth.uid()
        AND mix_collaborators.accepted_at IS NOT NULL
    )
    OR EXISTS (
        SELECT 1 FROM mixes 
        WHERE mixes.id = collaboration_events.mix_id 
        AND mixes.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert collaboration events for mixes they can edit" ON collaboration_events
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM mix_collaborators 
        WHERE mix_collaborators.mix_id = collaboration_events.mix_id 
        AND mix_collaborators.user_id = auth.uid()
        AND mix_collaborators.permission IN ('editor', 'admin')
        AND mix_collaborators.accepted_at IS NOT NULL
    )
    OR EXISTS (
        SELECT 1 FROM mixes 
        WHERE mixes.id = collaboration_events.mix_id 
        AND mixes.user_id = auth.uid()
    )
);

-- Mix collaborators policies
CREATE POLICY "Users can view collaborators for mixes they have access to" ON mix_collaborators
FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM mixes 
        WHERE mixes.id = mix_collaborators.mix_id 
        AND mixes.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM mix_collaborators mc2
        WHERE mc2.mix_id = mix_collaborators.mix_id 
        AND mc2.user_id = auth.uid()
        AND mc2.accepted_at IS NOT NULL
    )
);

CREATE POLICY "Mix owners and admins can manage collaborators" ON mix_collaborators
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM mixes 
        WHERE mixes.id = mix_collaborators.mix_id 
        AND mixes.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM mix_collaborators mc2
        WHERE mc2.mix_id = mix_collaborators.mix_id 
        AND mc2.user_id = auth.uid()
        AND mc2.permission = 'admin'
        AND mc2.accepted_at IS NOT NULL
    )
);

CREATE POLICY "Users can update their own collaborator record" ON mix_collaborators
FOR UPDATE USING (user_id = auth.uid());

-- Collaboration sessions policies
CREATE POLICY "Users can view sessions for mixes they collaborate on" ON collaboration_sessions
FOR SELECT USING (
    host_user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM mix_collaborators 
        WHERE mix_collaborators.mix_id = collaboration_sessions.mix_id 
        AND mix_collaborators.user_id = auth.uid()
        AND mix_collaborators.accepted_at IS NOT NULL
    )
);

CREATE POLICY "Mix owners can manage collaboration sessions" ON collaboration_sessions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM mixes 
        WHERE mixes.id = collaboration_sessions.mix_id 
        AND mixes.user_id = auth.uid()
    )
);

-- Collaboration conflicts policies
CREATE POLICY "Users can view conflicts for mixes they collaborate on" ON collaboration_conflicts
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM mix_collaborators 
        WHERE mix_collaborators.mix_id = collaboration_conflicts.mix_id 
        AND mix_collaborators.user_id = auth.uid()
        AND mix_collaborators.accepted_at IS NOT NULL
    )
    OR EXISTS (
        SELECT 1 FROM mixes 
        WHERE mixes.id = collaboration_conflicts.mix_id 
        AND mixes.user_id = auth.uid()
    )
);

CREATE POLICY "Editors and admins can resolve conflicts" ON collaboration_conflicts
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM mix_collaborators 
        WHERE mix_collaborators.mix_id = collaboration_conflicts.mix_id 
        AND mix_collaborators.user_id = auth.uid()
        AND mix_collaborators.permission IN ('editor', 'admin')
        AND mix_collaborators.accepted_at IS NOT NULL
    )
    OR EXISTS (
        SELECT 1 FROM mixes 
        WHERE mixes.id = collaboration_conflicts.mix_id 
        AND mixes.user_id = auth.uid()
    )
);

-- Enable realtime for collaboration tables
ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_events;
ALTER PUBLICATION supabase_realtime ADD TABLE mix_collaborators;
ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_conflicts;

-- Permission audit log table
CREATE TABLE IF NOT EXISTS permission_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mix_id UUID NOT NULL REFERENCES mixes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('grant', 'revoke', 'update', 'expire', 'check')),
    resource_type TEXT,
    action_type TEXT,
    old_permission TEXT,
    new_permission TEXT,
    result BOOLEAN NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Index for efficient querying
    INDEX idx_permission_audit_mix_id ON permission_audit_log(mix_id),
    INDEX idx_permission_audit_user_id ON permission_audit_log(user_id),
    INDEX idx_permission_audit_created_at ON permission_audit_log(created_at)
);

-- Function to log permission actions
CREATE OR REPLACE FUNCTION log_permission_action(
    p_mix_id UUID,
    p_user_id UUID,
    p_target_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_action_type TEXT DEFAULT NULL,
    p_old_permission TEXT DEFAULT NULL,
    p_new_permission TEXT DEFAULT NULL,
    p_result BOOLEAN DEFAULT true,
    p_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO permission_audit_log (
        mix_id, user_id, target_user_id, action, resource_type, action_type,
        old_permission, new_permission, result, reason, metadata
    )
    VALUES (
        p_mix_id, p_user_id, p_target_user_id, p_action, p_resource_type, p_action_type,
        p_old_permission, p_new_permission, p_result, p_reason, p_metadata
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Function to increment action count for rate limiting
CREATE OR REPLACE FUNCTION increment_action_count(p_collaborator_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_action_count INTEGER;
BEGIN
    UPDATE mix_collaborators
    SET action_count = action_count + 1,
        last_action_at = now()
    WHERE id = p_collaborator_id
    RETURNING action_count INTO v_action_count;
    
    RETURN v_action_count;
END;
$$;

-- Function to check and expire permissions
CREATE OR REPLACE FUNCTION check_and_expire_permissions()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if permission has expired
    IF NEW.expires_at IS NOT NULL AND NEW.expires_at < now() THEN
        -- Log the expiration
        PERFORM log_permission_action(
            NEW.mix_id,
            NEW.user_id,
            NEW.user_id,
            'expire',
            NULL,
            NULL,
            NEW.permission,
            NULL,
            true,
            'Permission expired',
            jsonb_build_object('expired_at', NEW.expires_at)
        );
        
        -- Remove the expired permission
        DELETE FROM mix_collaborators WHERE id = NEW.id;
        RETURN NULL;
    END IF;
    
    RETURN NEW;
END;
$$ language plpgsql;

-- Trigger to check permission expiration on access
CREATE TRIGGER check_permission_expiration
    BEFORE UPDATE OF last_active ON mix_collaborators
    FOR EACH ROW EXECUTE FUNCTION check_and_expire_permissions();

-- Utility functions for collaboration management

-- Function to invite a user to collaborate on a mix
CREATE OR REPLACE FUNCTION invite_collaborator(
    p_mix_id UUID,
    p_user_email TEXT,
    p_permission TEXT DEFAULT 'editor'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invited_user_id UUID;
    v_collaborator_id UUID;
BEGIN
    -- Get user ID from email
    SELECT id INTO v_invited_user_id
    FROM auth.users
    WHERE email = p_user_email;
    
    IF v_invited_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', p_user_email;
    END IF;
    
    -- Check if user is authorized to invite
    IF NOT EXISTS (
        SELECT 1 FROM mixes 
        WHERE id = p_mix_id AND user_id = auth.uid()
    ) AND NOT EXISTS (
        SELECT 1 FROM mix_collaborators
        WHERE mix_id = p_mix_id 
        AND user_id = auth.uid() 
        AND permission IN ('admin')
        AND accepted_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Not authorized to invite collaborators to this mix';
    END IF;
    
    -- Insert or update collaborator invitation
    INSERT INTO mix_collaborators (mix_id, user_id, permission, invited_by)
    VALUES (p_mix_id, v_invited_user_id, p_permission, auth.uid())
    ON CONFLICT (mix_id, user_id) DO UPDATE SET
        permission = p_permission,
        invited_by = auth.uid(),
        invited_at = now()
    RETURNING id INTO v_collaborator_id;
    
    RETURN v_collaborator_id;
END;
$$;

-- Function to accept collaboration invitation
CREATE OR REPLACE FUNCTION accept_collaboration_invitation(p_collaborator_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE mix_collaborators
    SET accepted_at = now(),
        is_online = true,
        last_active = now()
    WHERE id = p_collaborator_id 
    AND user_id = auth.uid()
    AND accepted_at IS NULL;
    
    RETURN FOUND;
END;
$$;

-- Function to get collaboration statistics
CREATE OR REPLACE FUNCTION get_collaboration_stats(p_mix_id UUID)
RETURNS TABLE (
    total_collaborators INTEGER,
    online_collaborators INTEGER,
    total_events INTEGER,
    recent_events INTEGER,
    unresolved_conflicts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM mix_collaborators WHERE mix_id = p_mix_id AND accepted_at IS NOT NULL),
        (SELECT COUNT(*)::INTEGER FROM mix_collaborators WHERE mix_id = p_mix_id AND is_online = true),
        (SELECT COUNT(*)::INTEGER FROM collaboration_events WHERE mix_id = p_mix_id),
        (SELECT COUNT(*)::INTEGER FROM collaboration_events WHERE mix_id = p_mix_id AND created_at > now() - INTERVAL '1 hour'),
        (SELECT COUNT(*)::INTEGER FROM collaboration_conflicts WHERE mix_id = p_mix_id AND resolved_at IS NULL);
END;
$$;

COMMIT;