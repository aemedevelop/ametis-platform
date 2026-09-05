create table if not exists agent_context_profiles (
  agent_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  persona VARCHAR(500),
  target_audience VARCHAR(300),
  tone VARCHAR(80),
  response_language VARCHAR(32),
  updated_at TIMESTAMPTZ NOT NULL
);

create index if not exists idx_agent_context_profiles_tenant ON agent_context_profiles(tenant_id);
