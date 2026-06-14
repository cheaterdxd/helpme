CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY NOT NULL,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  proposal_id TEXT, -- optional reference to ai_action_proposals.id
  created_at TEXT NOT NULL
);
