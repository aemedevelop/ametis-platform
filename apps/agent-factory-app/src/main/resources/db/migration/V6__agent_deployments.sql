CREATE TABLE agent_deployments (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  channel_type VARCHAR(32) NOT NULL,
  deployment_slug VARCHAR(80) NOT NULL,
  status VARCHAR(32) NOT NULL,
  public_url VARCHAR(500),
  api_key VARCHAR(120),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_agent_deployments_tenant_slug UNIQUE (tenant_id, deployment_slug)
);

CREATE INDEX idx_agent_deployments_tenant_updated ON agent_deployments(tenant_id, updated_at DESC);
CREATE INDEX idx_agent_deployments_agent ON agent_deployments(agent_id);
