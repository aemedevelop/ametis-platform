-- Core multiproduct extensions
SET search_path TO core,public;

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS description VARCHAR(300),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN;

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
