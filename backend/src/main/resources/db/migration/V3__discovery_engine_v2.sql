CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE profiles
  ADD COLUMN last_active_at TIMESTAMPTZ;

UPDATE profiles
SET last_active_at = COALESCE(updated_at, created_at, NOW())
WHERE last_active_at IS NULL;

ALTER TABLE profiles
  ALTER COLUMN last_active_at SET NOT NULL,
  ALTER COLUMN last_active_at SET DEFAULT NOW();

CREATE INDEX idx_profiles_discovery_active
  ON profiles(discoverable, last_active_at DESC, updated_at DESC);

CREATE INDEX idx_profiles_location_gist
  ON profiles
  USING GIST ((ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography))
  WHERE longitude IS NOT NULL AND latitude IS NOT NULL;

ALTER TABLE interactions DROP CONSTRAINT IF EXISTS uq_interaction_pair;

CREATE INDEX idx_interactions_actor_created
  ON interactions(actor_id, created_at DESC);

CREATE INDEX idx_interactions_actor_target_created
  ON interactions(actor_id, target_id, created_at DESC);

-- Supporting indexes for behavior/safety queries used by the ranking context.
CREATE INDEX idx_messages_sender_conversation_sent
  ON messages(sender_id, conversation_id, sent_at DESC);

CREATE INDEX idx_reports_reporter_created
  ON reports(reporter_id, created_at DESC);

CREATE INDEX idx_reports_reported_reporter
  ON reports(reported_id, reporter_id);

CREATE INDEX idx_matches_user_a_unmatched
  ON matches(user_a, unmatched_at DESC)
  WHERE status = 'UNMATCHED';

CREATE INDEX idx_matches_user_b_unmatched
  ON matches(user_b, unmatched_at DESC)
  WHERE status = 'UNMATCHED';
