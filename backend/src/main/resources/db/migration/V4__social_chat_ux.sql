CREATE TABLE message_reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  reaction VARCHAR(24) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(message_id, user_id)
);
CREATE INDEX idx_message_reactions_message ON message_reactions(message_id, reaction);
