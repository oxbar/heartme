CREATE TABLE user_accounts (
  id UUID PRIMARY KEY,
  email VARCHAR(320) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'USER',
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  replaced_by_hash VARCHAR(64) NULL,
  device_info VARCHAR(500) NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES user_accounts(id) ON DELETE CASCADE,
  display_name VARCHAR(80) NOT NULL,
  bio VARCHAR(1000) NULL,
  birth_date DATE NOT NULL,
  gender VARCHAR(40) NOT NULL,
  city VARCHAR(120) NULL,
  state VARCHAR(120) NULL,
  country VARCHAR(120) NULL,
  latitude DOUBLE PRECISION NULL,
  longitude DOUBLE PRECISION NULL,
  min_age INTEGER NOT NULL DEFAULT 18,
  max_age INTEGER NOT NULL DEFAULT 99,
  max_distance_km INTEGER NOT NULL DEFAULT 100,
  discoverable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_profiles_discovery ON profiles(discoverable, birth_date, gender);

CREATE TABLE profile_interests (
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  interest VARCHAR(80) NOT NULL,
  PRIMARY KEY(user_id, interest)
);
CREATE TABLE profile_looking_for (
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  gender VARCHAR(40) NOT NULL,
  PRIMARY KEY(user_id, gender)
);

CREATE TABLE photos (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  url VARCHAR(1000) NOT NULL,
  storage_key VARCHAR(500) NOT NULL UNIQUE,
  position INTEGER NOT NULL,
  status VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_photos_user_position ON photos(user_id, position);

CREATE TABLE interactions (
  id UUID PRIMARY KEY,
  actor_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_interaction_pair UNIQUE(actor_id, target_id),
  CONSTRAINT ck_interaction_not_self CHECK(actor_id <> target_id)
);
CREATE INDEX idx_interactions_target_actor ON interactions(target_id, actor_id, type);

CREATE TABLE matches (
  id UUID PRIMARY KEY,
  user_a UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  status VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  unmatched_at TIMESTAMPTZ NULL,
  CONSTRAINT uq_match_pair UNIQUE(user_a, user_b),
  CONSTRAINT ck_match_order CHECK(user_a::text < user_b::text)
);
CREATE INDEX idx_matches_user_a ON matches(user_a, status);
CREATE INDEX idx_matches_user_b ON matches(user_b, status);

CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  user_a UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL,
  last_message_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_conversations_user_a ON conversations(user_a, last_message_at DESC);
CREATE INDEX idx_conversations_user_b ON conversations(user_b, last_message_at DESC);

CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  content VARCHAR(4000) NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  read_at TIMESTAMPTZ NULL
);
CREATE INDEX idx_messages_conversation_cursor ON messages(conversation_id, sent_at DESC, id DESC);

CREATE TABLE blocks (
  id UUID PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_block_pair UNIQUE(blocker_id, blocked_id),
  CONSTRAINT ck_block_not_self CHECK(blocker_id <> blocked_id)
);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id, blocker_id);

CREATE TABLE reports (
  id UUID PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  reason VARCHAR(80) NOT NULL,
  details VARCHAR(1000) NULL,
  status VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_reports_status_created ON reports(status, created_at);

CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  plan VARCHAR(40) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(40) NOT NULL,
  provider VARCHAR(80) NOT NULL,
  provider_reference VARCHAR(255) NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  plan VARCHAR(40) NOT NULL,
  status VARCHAR(40) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  payment_id UUID NULL REFERENCES payments(id),
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_subscriptions_user_active ON subscriptions(user_id, status, ends_at DESC);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(160) NOT NULL,
  body VARCHAR(500) NOT NULL,
  data_json TEXT NULL,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  aggregate_type VARCHAR(120) NOT NULL,
  aggregate_id VARCHAR(120) NOT NULL,
  event_type VARCHAR(180) NOT NULL,
  topic VARCHAR(180) NOT NULL,
  message_key VARCHAR(180) NOT NULL,
  payload_json TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ NULL,
  status VARCHAR(40) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error VARCHAR(1000) NULL
);
CREATE INDEX idx_outbox_pending ON outbox_events(status, occurred_at);

CREATE TABLE processed_events (
  id VARCHAR(300) PRIMARY KEY,
  event_id UUID NOT NULL,
  consumer_name VARCHAR(180) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_processed_event_consumer UNIQUE(event_id, consumer_name)
);
