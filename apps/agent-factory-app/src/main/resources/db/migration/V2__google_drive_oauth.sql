SET search_path TO agent_factory,public;

CREATE TABLE drive_connections (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE,
  account_email VARCHAR(320),
  encrypted_refresh_token TEXT NOT NULL,
  connected_by UUID,
  connected_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE drive_oauth_states (
  state_hash VARCHAR(64) PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,
  code_verifier VARCHAR(128) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_drive_oauth_states_expires_at ON drive_oauth_states(expires_at);
