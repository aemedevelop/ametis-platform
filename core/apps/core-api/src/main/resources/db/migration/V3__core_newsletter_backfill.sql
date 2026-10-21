SET search_path TO core,public;

-- Core multiproduct tables (safe if they already exist).
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  internal_name VARCHAR(120) NOT NULL,
  public_name VARCHAR(120) NOT NULL,
  description VARCHAR(300),
  is_standalone BOOLEAN,
  show_platform_brand BOOLEAN,
  subdomain VARCHAR(120),
  is_active BOOLEAN,
  created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_branding (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  logo_url VARCHAR(400),
  theme_config TEXT,
  primary_color VARCHAR(20),
  favicon_url VARCHAR(400),
  domain_mode VARCHAR(40),
  custom_domain_enabled BOOLEAN
);

CREATE TABLE IF NOT EXISTS plan_products (
  id UUID PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES plans(id),
  product_id UUID NOT NULL REFERENCES products(id),
  is_active BOOLEAN
);

CREATE TABLE IF NOT EXISTS user_product_access (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  status VARCHAR(32) NOT NULL,
  granted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plan_products_plan ON plan_products(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_products_product ON plan_products(product_id);
CREATE INDEX IF NOT EXISTS idx_user_product_access_user ON user_product_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_product_access_tenant ON user_product_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_product_access_product ON user_product_access(product_id);

-- Ensure Newsletter product exists.
INSERT INTO products (
  id, code, internal_name, public_name, description, is_standalone, show_platform_brand, subdomain, is_active, created_at
)
VALUES (
  uuid_generate_v4(),
  'newsletter',
  'newsletter',
  'Newsletter App',
  'Newsletter product access',
  FALSE,
  TRUE,
  'newsletter',
  TRUE,
  NOW()
)
ON CONFLICT (code) DO UPDATE
SET
  internal_name = EXCLUDED.internal_name,
  public_name = EXCLUDED.public_name,
  description = EXCLUDED.description,
  is_active = TRUE;

-- Ensure FREE plan includes Newsletter product.
INSERT INTO plan_products (id, plan_id, product_id, is_active)
SELECT
  uuid_generate_v4(),
  pl.id,
  pr.id,
  TRUE
FROM plans pl
JOIN products pr ON pr.code = 'newsletter'
WHERE pl.code = 'FREE'
  AND NOT EXISTS (
    SELECT 1
    FROM plan_products pp
    WHERE pp.plan_id = pl.id
      AND pp.product_id = pr.id
  );

-- Create a default tenant for users without membership.
WITH users_without_tenant AS (
  SELECT u.id AS user_id, u.email, u.full_name
  FROM users u
  WHERE NOT EXISTS (
    SELECT 1
    FROM user_tenants ut
    WHERE ut.user_id = u.id
  )
),
created_tenants AS (
  INSERT INTO tenants (id, slug, name, business_profile, status)
  SELECT
    uuid_generate_v4(),
    'ws-' || SUBSTRING(REPLACE(user_id::text, '-', '') FROM 1 FOR 12),
    COALESCE(NULLIF(TRIM(full_name), ''), email) || ' Workspace',
    'PYME',
    'ACTIVE'
  FROM users_without_tenant
  RETURNING id, slug
),
ordered_users AS (
  SELECT
    uwt.user_id,
    ct.id AS tenant_id,
    ROW_NUMBER() OVER (ORDER BY uwt.user_id) AS rn_user
  FROM users_without_tenant uwt
  JOIN created_tenants ct ON TRUE
),
ordered_tenants AS (
  SELECT
    ct.id AS tenant_id,
    ROW_NUMBER() OVER (ORDER BY ct.id) AS rn_tenant
  FROM created_tenants ct
)
INSERT INTO user_tenants (user_id, tenant_id, role_id, membership_status)
SELECT
  ou.user_id,
  ot.tenant_id,
  r_owner.id,
  'ACTIVE'
FROM ordered_users ou
JOIN ordered_tenants ot ON ou.rn_user = ot.rn_tenant
JOIN roles r_owner ON r_owner.code = 'OWNER'
WHERE NOT EXISTS (
  SELECT 1
  FROM user_tenants ut
  WHERE ut.user_id = ou.user_id
    AND ut.tenant_id = ot.tenant_id
);

-- Ensure subscriptions exist for tenants.
INSERT INTO subscriptions (id, tenant_id, plan_id, status, starts_at, created_at, updated_at)
SELECT
  uuid_generate_v4(),
  t.id,
  pl.id,
  'ACTIVE',
  NOW(),
  NOW(),
  NOW()
FROM tenants t
JOIN plans pl ON pl.code = 'FREE'
WHERE NOT EXISTS (
  SELECT 1
  FROM subscriptions s
  WHERE s.tenant_id = t.id
);

-- Ensure all memberships have Newsletter product access.
INSERT INTO user_product_access (id, user_id, tenant_id, product_id, role_id, status, granted_at)
SELECT
  uuid_generate_v4(),
  ut.user_id,
  ut.tenant_id,
  pr.id,
  r_owner.id,
  'ACTIVE',
  NOW()
FROM user_tenants ut
JOIN products pr ON pr.code = 'newsletter'
JOIN roles r_owner ON r_owner.code = 'OWNER'
WHERE ut.membership_status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1
    FROM user_product_access upa
    WHERE upa.user_id = ut.user_id
      AND upa.tenant_id = ut.tenant_id
      AND upa.product_id = pr.id
  );
