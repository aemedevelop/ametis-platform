SET search_path TO core,public;

INSERT INTO permissions (code, vertical, resource, action)
VALUES
  ('ia.documents.read', 'ia', 'documents', 'read'),
  ('ia.documents.manage', 'ia', 'documents', 'manage')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.code IN ('ia.documents.read', 'ia.documents.manage')
WHERE roles.code IN ('OWNER', 'ADMIN')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.code = 'ia.documents.read'
WHERE roles.code = 'MEMBER'
ON CONFLICT DO NOTHING;

INSERT INTO plan_features (plan_id, feature_code, enabled)
SELECT plans.id, features.code, TRUE
FROM plans
CROSS JOIN (VALUES ('ia.documents.read'), ('ia.documents.manage')) AS features(code)
ON CONFLICT (plan_id, feature_code) DO UPDATE SET enabled = TRUE;

INSERT INTO products (
  id, code, internal_name, public_name, description, is_standalone, show_platform_brand, subdomain, is_active, created_at
)
VALUES (
  uuid_generate_v4(),
  'agent-factory',
  'agent-factory',
  'Fábrica de Agentes',
  'Gestión documental y configuración de agentes AMETIS',
  TRUE,
  TRUE,
  'agents',
  TRUE,
  NOW()
)
ON CONFLICT (code) DO UPDATE SET
  public_name = EXCLUDED.public_name,
  description = EXCLUDED.description,
  is_active = TRUE;

INSERT INTO plan_products (id, plan_id, product_id, is_active)
SELECT uuid_generate_v4(), plans.id, products.id, TRUE
FROM plans
JOIN products ON products.code = 'agent-factory'
WHERE NOT EXISTS (
  SELECT 1 FROM plan_products
  WHERE plan_products.plan_id = plans.id
    AND plan_products.product_id = products.id
);

INSERT INTO user_product_access (id, user_id, tenant_id, product_id, role_id, status, granted_at)
SELECT uuid_generate_v4(), memberships.user_id, memberships.tenant_id, products.id, memberships.role_id, 'ACTIVE', NOW()
FROM user_tenants memberships
JOIN products ON products.code = 'agent-factory'
WHERE memberships.membership_status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1 FROM user_product_access access
    WHERE access.user_id = memberships.user_id
      AND access.tenant_id = memberships.tenant_id
      AND access.product_id = products.id
  );
