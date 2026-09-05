CREATE TABLE businesses (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  description VARCHAR(500),
  status VARCHAR(32) NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_businesses_tenant_slug UNIQUE (tenant_id, slug)
);

CREATE UNIQUE INDEX uq_businesses_tenant_name ON businesses (tenant_id, lower(name));
CREATE INDEX idx_businesses_tenant_updated ON businesses (tenant_id, updated_at DESC);
