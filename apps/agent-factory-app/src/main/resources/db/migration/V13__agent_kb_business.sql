-- Un negocio por defecto por cada tenant que ya tiene datos.
INSERT INTO businesses (id, tenant_id, name, slug, description, status, created_at, updated_at)
SELECT gen_random_uuid(), t.tenant_id, 'Negocio principal', 'negocio-principal', NULL, 'ACTIVE', now(), now()
FROM (
  SELECT tenant_id FROM agents
  UNION
  SELECT tenant_id FROM knowledge_bases
  UNION
  SELECT tenant_id FROM repository_bindings
) t
WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.tenant_id = t.tenant_id);

-- agents.business_id
ALTER TABLE agents ADD COLUMN IF NOT EXISTS business_id UUID;

UPDATE agents a
SET business_id = (SELECT b.id FROM businesses b WHERE b.tenant_id = a.tenant_id ORDER BY b.created_at LIMIT 1)
WHERE a.business_id IS NULL;

ALTER TABLE agents ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE agents ADD CONSTRAINT agents_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id);
ALTER TABLE agents DROP CONSTRAINT IF EXISTS uq_agents_tenant_name;
ALTER TABLE agents ADD CONSTRAINT uq_agents_business_name UNIQUE (business_id, name);
CREATE INDEX IF NOT EXISTS idx_agents_business_updated ON agents (business_id, updated_at DESC);

-- knowledge_bases.business_id
ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS business_id UUID;

UPDATE knowledge_bases kb
SET business_id = (SELECT b.id FROM businesses b WHERE b.tenant_id = kb.tenant_id ORDER BY b.created_at LIMIT 1)
WHERE kb.business_id IS NULL;

ALTER TABLE knowledge_bases ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE knowledge_bases ADD CONSTRAINT knowledge_bases_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id);
ALTER TABLE knowledge_bases DROP CONSTRAINT IF EXISTS uq_knowledge_base_tenant_name;
ALTER TABLE knowledge_bases ADD CONSTRAINT uq_knowledge_base_business_name UNIQUE (business_id, name);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_business_updated ON knowledge_bases (business_id, updated_at DESC);
